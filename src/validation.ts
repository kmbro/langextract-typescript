/**
 * Copyright 2025 kmbro.
 *
 * Prompt validation module for langextract.
 * Validates examples to ensure extraction text is grounded in source text.
 */

import { ExampleData, Extraction } from "./types";

/**
 * Validation modes.
 */
export type ValidationMode = "strict" | "warn" | "skip";

/**
 * Validation result for a single extraction.
 */
export interface ExtractionValidationResult {
  valid: boolean;
  extraction: Extraction;
  message?: string;
}

/**
 * Validation result for a single example.
 */
export interface ExampleValidationResult {
  valid: boolean;
  example: ExampleData;
  extractionResults: ExtractionValidationResult[];
  messages: string[];
}

/**
 * Full validation result.
 */
export interface ValidationResult {
  valid: boolean;
  exampleResults: ExampleValidationResult[];
  messages: string[];
}

/**
 * Configuration for validation.
 */
export interface ValidationConfig {
  /** How to handle validation failures: throw, warn, or skip */
  mode: ValidationMode;
  /** Fuzzy matching threshold (0-1). 1.0 = exact match required */
  fuzzyThreshold: number;
  /** Whether to warn about examples with no extractions */
  warnOnEmptyExtractions: boolean;
}

/**
 * Default validation configuration.
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  mode: "warn",
  fuzzyThreshold: 1.0, // Exact match by default
  warnOnEmptyExtractions: true,
};

/**
 * Normalize text for comparison (lowercase, collapse whitespace).
 */
function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Calculate similarity between two strings using Levenshtein distance.
 * Returns a value between 0 and 1, where 1 is an exact match.
 */
function calculateSimilarity(a: string, b: string): number {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);

  if (normalizedA === normalizedB) return 1;
  if (normalizedA.length === 0 || normalizedB.length === 0) return 0;

  // Check if one contains the other
  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    return 0.9;
  }

  // Levenshtein distance for fuzzy matching
  const matrix: number[][] = [];
  const len1 = normalizedA.length;
  const len2 = normalizedB.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = normalizedA[i - 1] === normalizedB[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Find the best fuzzy match for extraction text within source text.
 * Uses a sliding window approach to find similar substrings.
 */
function findBestFuzzyMatch(sourceText: string, extractionText: string): number {
  const extractionLen = extractionText.length;
  const sourceLen = sourceText.length;

  if (extractionLen > sourceLen) {
    return calculateSimilarity(extractionText, sourceText);
  }

  let bestSimilarity = 0;

  // Slide a window of varying sizes over the source text
  const minWindow = Math.max(1, extractionLen - 2);
  const maxWindow = Math.min(sourceLen, extractionLen + 5);

  for (let windowSize = minWindow; windowSize <= maxWindow; windowSize++) {
    for (let i = 0; i <= sourceLen - windowSize; i++) {
      const substring = sourceText.slice(i, i + windowSize);
      const similarity = calculateSimilarity(extractionText, substring);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
      }
      // Early exit if we found a very good match
      if (bestSimilarity >= 0.95) {
        return bestSimilarity;
      }
    }
  }

  return bestSimilarity;
}

/**
 * Check if extraction text is grounded in source text.
 */
function isExtractionGrounded(
  sourceText: string,
  extractionText: string,
  fuzzyThreshold: number
): boolean {
  const normalizedSource = normalizeText(sourceText);
  const normalizedExtraction = normalizeText(extractionText);

  // Exact substring match
  if (normalizedSource.includes(normalizedExtraction)) {
    return true;
  }

  // If threshold is less than 1.0, try fuzzy matching against substrings
  if (fuzzyThreshold < 1.0) {
    const similarity = findBestFuzzyMatch(normalizedSource, normalizedExtraction);
    return similarity >= fuzzyThreshold;
  }

  return false;
}

/**
 * Validate a single extraction against its source text.
 */
function validateExtraction(
  sourceText: string,
  extraction: Extraction,
  fuzzyThreshold: number
): ExtractionValidationResult {
  const extractionText = extraction.extractionText;

  if (!extractionText) {
    return {
      valid: true,
      extraction,
      message: undefined,
    };
  }

  if (isExtractionGrounded(sourceText, extractionText, fuzzyThreshold)) {
    return {
      valid: true,
      extraction,
      message: undefined,
    };
  }

  return {
    valid: false,
    extraction,
    message: `Extraction text "${extractionText}" not found in source text`,
  };
}

/**
 * Validate a single example.
 */
function validateExample(
  example: ExampleData,
  config: ValidationConfig
): ExampleValidationResult {
  const messages: string[] = [];
  const extractionResults: ExtractionValidationResult[] = [];
  let valid = true;

  // Check for empty extractions
  if (!example.extractions || example.extractions.length === 0) {
    if (config.warnOnEmptyExtractions) {
      messages.push(`Example has no extractions`);
    }
    return {
      valid: true, // Empty extractions is valid, just a warning
      example,
      extractionResults: [],
      messages,
    };
  }

  // Validate each extraction
  for (const extraction of example.extractions) {
    const result = validateExtraction(example.text, extraction, config.fuzzyThreshold);
    extractionResults.push(result);

    if (!result.valid) {
      valid = false;
      if (result.message) {
        messages.push(result.message);
      }
    }
  }

  return {
    valid,
    example,
    extractionResults,
    messages,
  };
}

/**
 * Validate examples to ensure extractions are grounded in source text.
 */
export function validateExamples(
  examples: ExampleData[],
  config: Partial<ValidationConfig> = {}
): ValidationResult {
  const fullConfig: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  };

  const exampleResults: ExampleValidationResult[] = [];
  const messages: string[] = [];
  let allValid = true;

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const result = validateExample(example, fullConfig);
    exampleResults.push(result);

    if (!result.valid) {
      allValid = false;
    }

    for (const msg of result.messages) {
      messages.push(`Example ${i + 1}: ${msg}`);
    }
  }

  return {
    valid: allValid,
    exampleResults,
    messages,
  };
}

/**
 * Handle validation result based on mode.
 * @throws Error if mode is "strict" and validation fails
 */
export function handleValidationResult(
  result: ValidationResult,
  mode: ValidationMode
): void {
  if (result.valid) {
    return;
  }

  switch (mode) {
    case "strict":
      throw new Error(`Example validation failed:\n${result.messages.join("\n")}`);
    case "warn":
      for (const msg of result.messages) {
        console.warn(`[langextract validation] ${msg}`);
      }
      break;
    case "skip":
      // Do nothing
      break;
  }
}

/**
 * Validate examples and handle the result based on mode.
 * Returns true if validation passed or mode is "skip".
 */
export function validateAndHandle(
  examples: ExampleData[],
  config: Partial<ValidationConfig> = {}
): boolean {
  const fullConfig: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...config,
  };

  if (fullConfig.mode === "skip") {
    return true;
  }

  const result = validateExamples(examples, fullConfig);
  handleValidationResult(result, fullConfig.mode);

  return result.valid;
}
