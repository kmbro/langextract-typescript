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
 * Core data types for the annotation pipeline.
 */

export enum AlignmentStatus {
  MATCH_EXACT = "match_exact",
  MATCH_GREATER = "match_greater",
  MATCH_LESSER = "match_lesser",
  MATCH_FUZZY = "match_fuzzy",
}

export enum FormatType {
  YAML = "yaml",
  JSON = "json",
}

export interface CharInterval {
  startPos?: number;
  endPos?: number;
}

export interface TokenInterval {
  startToken: number;
  endToken: number;
}

export interface TokenizedText {
  tokens: string[];
  tokenIntervals: TokenInterval[];
  charIntervals: CharInterval[];
}

export interface Extraction {
  extractionClass: string;
  extractionText: string;
  charInterval?: CharInterval;
  alignmentStatus?: AlignmentStatus;
  extractionIndex?: number;
  groupIndex?: number;
  description?: string;
  attributes?: Record<string, string | string[]>;
  tokenInterval?: TokenInterval;
}

export interface Document {
  text: string;
  documentId?: string;
  additionalContext?: string;
  tokenizedText?: TokenizedText;
}

export interface AnnotatedDocument {
  documentId?: string;
  extractions?: Extraction[];
  text?: string;
  tokenizedText?: TokenizedText;
}

export interface ExampleData {
  text: string;
  extractions: Extraction[];
}

export interface ScoredOutput {
  score?: number;
  output?: string;
}

export interface ExtractionValueType {
  [key: string]: string | string[] | Record<string, any>;
}

export interface ExtractionData {
  [key: string]: string | Record<string, any>;
}

export interface ExtractionsData {
  extractions: ExtractionData[];
}
