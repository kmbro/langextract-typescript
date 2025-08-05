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
 * Provides functionality for annotating text using a language model.
 */

import { v4 as uuidv4 } from "uuid";
import { Document, AnnotatedDocument, Extraction, FormatType } from "./types";
import { BaseLanguageModel } from "./inference";
import { PromptTemplateStructured } from "./prompting";
import { AbstractResolver } from "./resolver";
import { tokenize } from "./tokenizer";

export class DocumentRepeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentRepeatError";
  }
}

const ATTRIBUTE_SUFFIX = "_attributes";

function mergeNonOverlappingExtractions(allExtractions: Extraction[][]): Extraction[] {
  if (allExtractions.length === 0) {
    return [];
  }

  if (allExtractions.length === 1) {
    return allExtractions[0];
  }

  const mergedExtractions = [...allExtractions[0]];

  for (let i = 1; i < allExtractions.length; i++) {
    for (const extraction of allExtractions[i]) {
      let overlaps = false;
      if (extraction.charInterval) {
        for (const existingExtraction of mergedExtractions) {
          if (existingExtraction.charInterval) {
            if (extractionsOverlap(extraction, existingExtraction)) {
              overlaps = true;
              break;
            }
          }
        }
      }

      if (!overlaps) {
        mergedExtractions.push(extraction);
      }
    }
  }

  return mergedExtractions;
}

function extractionsOverlap(extraction1: Extraction, extraction2: Extraction): boolean {
  if (!extraction1.charInterval || !extraction2.charInterval) {
    return false;
  }

  const start1 = extraction1.charInterval.startPos ?? 0;
  const end1 = extraction1.charInterval.endPos ?? 0;
  const start2 = extraction2.charInterval.startPos ?? 0;
  const end2 = extraction2.charInterval.endPos ?? 0;

  return start1 < end2 && start2 < end1;
}

export interface AnnotatorOptions {
  formatType?: FormatType;
  attributeSuffix?: string;
  fenceOutput?: boolean;
  maxTokens?: number;
}

export class Annotator {
  private languageModel: BaseLanguageModel;
  private promptTemplate: PromptTemplateStructured;
  private formatType: FormatType;
  private attributeSuffix: string;
  private fenceOutput: boolean;
  private maxTokens?: number;

  constructor(languageModel: BaseLanguageModel, promptTemplate: PromptTemplateStructured, options: AnnotatorOptions = {}) {
    this.languageModel = languageModel;
    this.promptTemplate = promptTemplate;
    this.formatType = options.formatType ?? FormatType.YAML;
    this.attributeSuffix = options.attributeSuffix ?? ATTRIBUTE_SUFFIX;
    this.fenceOutput = options.fenceOutput ?? false;
    this.maxTokens = options.maxTokens;
  }

  async annotateDocuments(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer?: number;
      batchLength?: number;
      debug?: boolean;
      extractionPasses?: number;
    } = {}
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer = 200, batchLength = 1, debug = true, extractionPasses = 1 } = options;

    if (extractionPasses === 1) {
      return this.annotateDocumentsSinglePass(documents, resolver, {
        maxCharBuffer,
        batchLength,
        debug,
      });
    } else {
      return this.annotateDocumentsSequentialPasses(documents, resolver, {
        maxCharBuffer,
        batchLength,
        debug,
        extractionPasses,
      });
    }
  }

  async annotateText(
    text: string,
    resolver: AbstractResolver,
    options: {
      maxCharBuffer?: number;
      batchLength?: number;
      additionalContext?: string;
      debug?: boolean;
      extractionPasses?: number;
    } = {}
  ): Promise<AnnotatedDocument> {
    const { maxCharBuffer = 200, batchLength = 1, additionalContext, debug = true, extractionPasses = 1 } = options;

    const document: Document = {
      text,
      additionalContext,
      documentId: `doc_${uuidv4().substring(0, 8)}`,
    };

    const documents = await this.annotateDocuments([document], resolver, {
      maxCharBuffer,
      batchLength,
      debug,
      extractionPasses,
    });

    return documents[0];
  }

  private async annotateDocumentsSinglePass(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      batchLength: number;
      debug: boolean;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, batchLength, debug } = options;
    const results: AnnotatedDocument[] = [];

    // Process documents in batches
    for (let i = 0; i < documents.length; i += batchLength) {
      const batch = documents.slice(i, i + batchLength);
      const batchResults = await this.processDocumentBatch(batch, resolver, {
        maxCharBuffer,
        debug,
      });
      results.push(...batchResults);
    }

    return results;
  }

  private async annotateDocumentsSequentialPasses(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      batchLength: number;
      debug: boolean;
      extractionPasses: number;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, batchLength, debug, extractionPasses } = options;
    const results: AnnotatedDocument[] = [];

    // Process documents in batches
    for (let i = 0; i < documents.length; i += batchLength) {
      const batch = documents.slice(i, i + batchLength);
      const batchResults = await this.processDocumentBatchSequentialPasses(batch, resolver, {
        maxCharBuffer,
        debug,
        extractionPasses,
      });
      results.push(...batchResults);
    }

    return results;
  }

  private async processDocumentBatch(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      debug: boolean;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer } = options;
    const results: AnnotatedDocument[] = [];

    for (const document of documents) {
      const chunks = this.chunkDocument(document, maxCharBuffer);
      const allExtractions: Extraction[] = [];

      for (const chunk of chunks) {
        const prompt = this.generatePrompt(chunk.text, document.additionalContext);
        const modelOutputs = await this.languageModel.infer([prompt], {
          maxDecodeSteps: this.maxTokens,
        });

        if (modelOutputs.length > 0 && modelOutputs[0].length > 0) {
          const output = modelOutputs[0][0].output;
          if (output) {
            const extractions = resolver.resolve(output);
            const alignedExtractions = resolver.align(extractions, chunk.text, chunk.tokenOffset, chunk.charOffset);
            allExtractions.push(...alignedExtractions);
          }
        }
      }

      const annotatedDocument: AnnotatedDocument = {
        documentId: document.documentId,
        text: document.text,
        extractions: allExtractions,
        tokenizedText: document.tokenizedText ?? tokenize(document.text),
      };

      results.push(annotatedDocument);
    }

    return results;
  }

  private async processDocumentBatchSequentialPasses(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      debug: boolean;
      extractionPasses: number;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, extractionPasses } = options;
    const results: AnnotatedDocument[] = [];

    for (const document of documents) {
      const chunks = this.chunkDocument(document, maxCharBuffer);
      const allPassExtractions: Extraction[][] = [];

      // Perform multiple extraction passes
      for (let pass = 0; pass < extractionPasses; pass++) {
        const passExtractions: Extraction[] = [];

        for (const chunk of chunks) {
          const prompt = this.generatePrompt(chunk.text, document.additionalContext);
          const modelOutputs = await this.languageModel.infer([prompt], {
            maxDecodeSteps: this.maxTokens,
          });

          if (modelOutputs.length > 0 && modelOutputs[0].length > 0) {
            const output = modelOutputs[0][0].output;
            if (output) {
              const extractions = resolver.resolve(output);
              const alignedExtractions = resolver.align(extractions, chunk.text, chunk.tokenOffset, chunk.charOffset);
              passExtractions.push(...alignedExtractions);
            }
          }
        }

        allPassExtractions.push(passExtractions);
      }

      // Merge extractions from all passes
      const mergedExtractions = mergeNonOverlappingExtractions(allPassExtractions);

      const annotatedDocument: AnnotatedDocument = {
        documentId: document.documentId,
        text: document.text,
        extractions: mergedExtractions,
        tokenizedText: document.tokenizedText ?? tokenize(document.text),
      };

      results.push(annotatedDocument);
    }

    return results;
  }

  private chunkDocument(
    document: Document,
    maxCharBuffer: number
  ): Array<{
    text: string;
    tokenOffset: number;
    charOffset: number;
  }> {
    const text = document.text;
    const chunks: Array<{
      text: string;
      tokenOffset: number;
      charOffset: number;
    }> = [];

    let currentPos = 0;
    let tokenOffset = 0;

    while (currentPos < text.length) {
      const chunkEnd = Math.min(currentPos + maxCharBuffer, text.length);
      const chunkText = text.substring(currentPos, chunkEnd);

      chunks.push({
        text: chunkText,
        tokenOffset,
        charOffset: currentPos,
      });

      currentPos = chunkEnd;
      tokenOffset += tokenize(chunkText).tokens.length;
    }

    return chunks;
  }

  private generatePrompt(text: string, additionalContext?: string): string {
    // This is a simplified prompt generation
    // In a real implementation, you'd use the QAPromptGenerator
    const promptLines: string[] = [this.promptTemplate.description];

    if (additionalContext) {
      promptLines.push(additionalContext);
    }

    if (this.promptTemplate.examples.length > 0) {
      promptLines.push("Examples:");
      for (const example of this.promptTemplate.examples) {
        promptLines.push(`Q: ${example.text}`);
        promptLines.push(`A: ${JSON.stringify({ extractions: example.extractions })}`);
      }
    }

    promptLines.push(`Q: ${text}`);
    promptLines.push("A:");

    return promptLines.join("\n");
  }
}
