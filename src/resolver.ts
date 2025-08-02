/**
 * Copyright 2025 kmbro.
 *
 * This is a TypeScript translation of the original Python LangExtract library
 * by Google LLC (https://github.com/google/langextract).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Library for resolving LLM output.
 */

import * as yaml from "js-yaml";
import { Extraction, FormatType, AlignmentStatus, CharInterval, ExtractionData, ExtractionsData } from "./types";
import { Constraint } from "./schema";
import { tokenize, normalizeToken } from "./tokenizer";

const FUZZY_ALIGNMENT_MIN_THRESHOLD = 0.75;

export class ResolverParsingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolverParsingError";
  }
}

export interface AbstractResolver {
  fenceOutput: boolean;
  formatType: FormatType;
  resolve(inputText: string, options?: ResolveOptions): Extraction[];
  align(
    extractions: Extraction[],
    sourceText: string,
    tokenOffset: number,
    charOffset?: number,
    enableFuzzyAlignment?: boolean,
    fuzzyAlignmentThreshold?: number,
    acceptMatchLesser?: boolean
  ): Extraction[];
}

export interface ResolveOptions {
  suppressParseErrors?: boolean;
  [key: string]: any;
}

export class Resolver implements AbstractResolver {
  private _fenceOutput: boolean;
  private _constraint: Constraint;
  private _formatType: FormatType;
  private extractionIndexSuffix?: string;
  private extractionAttributesSuffix: string;

  constructor(
    options: {
      fenceOutput?: boolean;
      extractionIndexSuffix?: string;
      extractionAttributesSuffix?: string;
      constraint?: Constraint;
      formatType?: FormatType;
    } = {}
  ) {
    this._fenceOutput = options.fenceOutput ?? true;
    this._constraint = options.constraint ?? { constraintType: "none" as any };
    this._formatType = options.formatType ?? FormatType.JSON;
    this.extractionIndexSuffix = options.extractionIndexSuffix;
    this.extractionAttributesSuffix = options.extractionAttributesSuffix ?? "_attributes";
  }

  get fenceOutput(): boolean {
    return this._fenceOutput;
  }

  set fenceOutput(value: boolean) {
    this._fenceOutput = value;
  }

  get formatType(): FormatType {
    return this._formatType;
  }

  set formatType(value: FormatType) {
    this._formatType = value;
  }

  resolve(inputText: string, options: ResolveOptions = {}): Extraction[] {
    try {
      const extractionData = this.stringToExtractionData(inputText);
      return this.extractOrderedExtractions(extractionData);
    } catch (error) {
      if (options.suppressParseErrors) {
        console.warn("Parse error suppressed:", error);
        return [];
      }
      throw new ResolverParsingError(`Failed to resolve input text: ${error}`);
    }
  }

  align(
    extractions: Extraction[],
    sourceText: string,
    tokenOffset: number,
    charOffset: number = 0,
    enableFuzzyAlignment: boolean = true,
    fuzzyAlignmentThreshold: number = FUZZY_ALIGNMENT_MIN_THRESHOLD
  ): Extraction[] {
    const alignedExtractions: Extraction[] = [];
    const sourceTokens = tokenize(sourceText).tokens;

    for (const extraction of extractions) {
      const alignedExtraction = this.alignSingleExtraction(
        extraction,
        sourceTokens,
        sourceText,
        tokenOffset,
        charOffset,
        enableFuzzyAlignment,
        fuzzyAlignmentThreshold
      );

      if (alignedExtraction) {
        alignedExtractions.push(alignedExtraction);
      }
    }

    return alignedExtractions;
  }

  private extractAndParseContent(inputString: string): ExtractionsData | ExtractionData[] {
    let content = inputString.trim();

    // Remove fence markers if present
    if (this._fenceOutput) {
      const fenceRegex = /```(?:json|yaml|yml)\n?([\s\S]*?)\n?```/;
      const match = content.match(fenceRegex);
      if (match) {
        content = match[1].trim();
      }
    }

    try {
      if (this._formatType === FormatType.JSON) {
        return JSON.parse(content);
      } else if (this._formatType === FormatType.YAML) {
        return yaml.load(content) as any;
      } else {
        throw new Error(`Unsupported format type: ${this._formatType}`);
      }
    } catch (error) {
      throw new Error(`Failed to parse content as ${this._formatType}: ${error}`);
    }
  }

  private stringToExtractionData(inputString: string): ExtractionData[] {
    const parsed = this.extractAndParseContent(inputString);

    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed && typeof parsed === "object" && "extractions" in parsed) {
      return (parsed as ExtractionsData).extractions;
    } else {
      throw new Error("Invalid extraction data format");
    }
  }

  private extractOrderedExtractions(extractionData: ExtractionData[]): Extraction[] {
    const extractions: Extraction[] = [];

    for (let i = 0; i < extractionData.length; i++) {
      const data = extractionData[i];

      for (const [key, value] of Object.entries(data)) {
        if (key === this.extractionAttributesSuffix || key.endsWith(this.extractionAttributesSuffix)) {
          continue; // Skip attribute fields
        }

        if (typeof value === "string") {
          const extraction: Extraction = {
            extractionClass: key,
            extractionText: value,
            extractionIndex: i,
          };

          // Add attributes if available
          const attributesKey = `${key}${this.extractionAttributesSuffix}`;
          if (data[attributesKey] && typeof data[attributesKey] === "object") {
            extraction.attributes = data[attributesKey] as Record<string, string | string[]>;
          }

          extractions.push(extraction);
        }
      }
    }

    return extractions;
  }

  private alignSingleExtraction(
    extraction: Extraction,
    sourceTokens: string[],
    sourceText: string,
    tokenOffset: number,
    charOffset: number,
    enableFuzzyAlignment: boolean,
    fuzzyAlignmentThreshold: number
  ): Extraction | null {
    const extractionTokens = tokenize(extraction.extractionText).tokens;

    // Try exact match first
    const exactMatch = this.findExactMatch(extractionTokens, sourceTokens, tokenOffset);
    if (exactMatch) {
      return {
        ...extraction,
        charInterval: this.tokenToCharInterval(exactMatch.start, exactMatch.end, sourceText, charOffset),
        alignmentStatus: AlignmentStatus.MATCH_EXACT,
      };
    }

    // Try fuzzy alignment if enabled
    if (enableFuzzyAlignment) {
      const fuzzyMatch = this.findFuzzyMatch(extractionTokens, sourceTokens, tokenOffset, fuzzyAlignmentThreshold);
      if (fuzzyMatch) {
        return {
          ...extraction,
          charInterval: this.tokenToCharInterval(fuzzyMatch.start, fuzzyMatch.end, sourceText, charOffset),
          alignmentStatus: AlignmentStatus.MATCH_FUZZY,
        };
      }
    }

    return null;
  }

  private findExactMatch(extractionTokens: string[], sourceTokens: string[], tokenOffset: number): { start: number; end: number } | null {
    const normalizedExtraction = extractionTokens.map(normalizeToken);

    for (let i = tokenOffset; i <= sourceTokens.length - normalizedExtraction.length; i++) {
      let match = true;
      for (let j = 0; j < normalizedExtraction.length; j++) {
        if (normalizeToken(sourceTokens[i + j]) !== normalizedExtraction[j]) {
          match = false;
          break;
        }
      }
      if (match) {
        return { start: i, end: i + normalizedExtraction.length };
      }
    }

    return null;
  }

  private findFuzzyMatch(extractionTokens: string[], sourceTokens: string[], tokenOffset: number, threshold: number): { start: number; end: number } | null {
    // Simplified fuzzy matching - in a real implementation, you'd use more sophisticated algorithms
    const normalizedExtraction = extractionTokens.map(normalizeToken);

    for (let i = tokenOffset; i <= sourceTokens.length - normalizedExtraction.length; i++) {
      let matches = 0;
      for (let j = 0; j < normalizedExtraction.length; j++) {
        if (normalizeToken(sourceTokens[i + j]) === normalizedExtraction[j]) {
          matches++;
        }
      }

      const similarity = matches / normalizedExtraction.length;
      if (similarity >= threshold) {
        return { start: i, end: i + normalizedExtraction.length };
      }
    }

    return null;
  }

  private tokenToCharInterval(startToken: number, endToken: number, sourceText: string, charOffset: number): CharInterval {
    const tokens = tokenize(sourceText);
    let startPos = charOffset;
    let endPos = charOffset;

    if (startToken < tokens.charIntervals.length) {
      startPos += tokens.charIntervals[startToken].startPos ?? 0;
    }

    if (endToken <= tokens.charIntervals.length) {
      endPos += tokens.charIntervals[endToken - 1].endPos ?? sourceText.length;
    } else {
      endPos += sourceText.length;
    }

    return { startPos, endPos };
  }
}
