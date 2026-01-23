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
 * Multi-language tokenization utilities with CJK support.
 * Follows Google's Python LangExtract tokenizer for consistent behavior.
 */

import { TokenizedText, TokenInterval, CharInterval } from "../types";
import {
  detectLanguage,
  isCJKCharacter,
  getScriptType,
  CJK_PATTERN,
  CJK_UNIFIED,
  CJK_EXT_A,
  HIRAGANA,
  KATAKANA,
  KATAKANA_HALF,
  HANGUL,
  HANGUL_JAMO,
  HANGUL_COMPAT,
} from "./patterns";

// Re-export pattern utilities
export {
  detectLanguage,
  isCJKCharacter,
  getScriptType,
  CJK_PATTERN,
  CJK_UNIFIED,
  CJK_EXT_A,
  HIRAGANA,
  KATAKANA,
  KATAKANA_HALF,
  HANGUL,
  HANGUL_JAMO,
  HANGUL_COMPAT,
} from "./patterns";

/**
 * Tokenizer configuration options.
 */
export interface TokenizerOptions {
  /** Tokenization strategy: 'auto' detects language, 'cjk' forces CJK mode, 'latin' forces word-based */
  strategy?: "auto" | "cjk" | "latin" | "mixed";
  /** Whether to normalize tokens (lowercase, trim) */
  normalize?: boolean;
  /** Custom token pattern (overrides built-in patterns) */
  customPattern?: RegExp;
}

/**
 * Tokenizes text into words/characters and tracks character positions.
 * Supports CJK languages (Chinese, Japanese, Korean) where each character is a token.
 *
 * @param text - The text to tokenize
 * @param options - Tokenization options
 * @returns TokenizedText with tokens, token intervals, and character intervals
 */
export function tokenize(text: string, options: TokenizerOptions = {}): TokenizedText {
  const { strategy = "auto", normalize = false, customPattern } = options;

  const tokens: string[] = [];
  const tokenIntervals: TokenInterval[] = [];
  const charIntervals: CharInterval[] = [];

  if (!text || text.length === 0) {
    return { tokens, tokenIntervals, charIntervals };
  }

  // Determine tokenization strategy
  const effectiveStrategy = strategy === "auto" ? detectLanguage(text) : strategy;

  // Use custom pattern if provided, otherwise use strategy-based pattern
  if (customPattern) {
    return tokenizeWithPattern(text, customPattern, normalize);
  }

  // Use multi-language aware tokenization
  return tokenizeMultiLanguage(text, effectiveStrategy, normalize);
}

/**
 * Tokenizes text using a specific regex pattern.
 */
function tokenizeWithPattern(text: string, pattern: RegExp, normalize: boolean): TokenizedText {
  const tokens: string[] = [];
  const tokenIntervals: TokenInterval[] = [];
  const charIntervals: CharInterval[] = [];

  // Reset regex state
  pattern.lastIndex = 0;

  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    let token = match[0];
    const startPos = match.index;
    const endPos = startPos + token.length;

    if (normalize) {
      token = normalizeToken(token);
    }

    tokens.push(token);
    tokenIntervals.push({
      startToken: tokenIndex,
      endToken: tokenIndex + 1,
    });
    charIntervals.push({
      startPos,
      endPos,
    });

    tokenIndex++;

    // Prevent infinite loop on zero-width matches
    if (match[0].length === 0) {
      pattern.lastIndex++;
    }
  }

  return { tokens, tokenIntervals, charIntervals };
}

/**
 * Multi-language aware tokenization that handles script boundaries.
 * CJK characters are tokenized individually, while Latin words are kept together.
 */
function tokenizeMultiLanguage(
  text: string,
  strategy: "cjk" | "latin" | "mixed",
  normalize: boolean
): TokenizedText {
  const tokens: string[] = [];
  const tokenIntervals: TokenInterval[] = [];
  const charIntervals: CharInterval[] = [];

  let tokenIndex = 0;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const scriptType = getScriptType(char);

    // Skip whitespace
    if (scriptType === "whitespace") {
      i++;
      continue;
    }

    // Handle CJK characters individually
    if (scriptType === "cjk") {
      let token = char;
      const startPos = i;

      if (normalize) {
        token = normalizeToken(token);
      }

      tokens.push(token);
      tokenIntervals.push({
        startToken: tokenIndex,
        endToken: tokenIndex + 1,
      });
      charIntervals.push({
        startPos,
        endPos: startPos + 1,
      });

      tokenIndex++;
      i++;
      continue;
    }

    // Handle punctuation individually
    if (scriptType === "punctuation") {
      let token = char;
      const startPos = i;

      tokens.push(token);
      tokenIntervals.push({
        startToken: tokenIndex,
        endToken: tokenIndex + 1,
      });
      charIntervals.push({
        startPos,
        endPos: startPos + 1,
      });

      tokenIndex++;
      i++;
      continue;
    }

    // Handle Latin/Cyrillic/Arabic words - group consecutive characters of same script
    const startPos = i;
    const currentScript = scriptType;
    let tokenChars = [char];
    i++;

    // Continue while we have the same script type (not CJK, punctuation, or whitespace)
    while (i < text.length) {
      const nextChar = text[i];
      const nextScript = getScriptType(nextChar);

      // Stop at script boundaries, whitespace, punctuation, or CJK
      if (
        nextScript === "whitespace" ||
        nextScript === "punctuation" ||
        nextScript === "cjk" ||
        (nextScript !== currentScript && nextScript !== "other")
      ) {
        break;
      }

      // Include numbers within words (e.g., "test123")
      if (/\d/.test(nextChar) || nextScript === currentScript || nextScript === "other") {
        tokenChars.push(nextChar);
        i++;
      } else {
        break;
      }
    }

    let token = tokenChars.join("");
    const endPos = startPos + token.length;

    if (normalize) {
      token = normalizeToken(token);
    }

    tokens.push(token);
    tokenIntervals.push({
      startToken: tokenIndex,
      endToken: tokenIndex + 1,
    });
    charIntervals.push({
      startPos,
      endPos,
    });

    tokenIndex++;
  }

  return { tokens, tokenIntervals, charIntervals };
}

/**
 * Normalizes a token for comparison (lowercase, trim).
 * @param token - The token to normalize
 * @returns Normalized token
 */
export function normalizeToken(token: string): string {
  return token.toLowerCase().trim();
}

/**
 * Tokenizes text with lowercase normalization.
 * @param text - The text to tokenize
 * @returns Array of normalized tokens
 */
export function tokenizeWithLowercase(text: string): string[] {
  return tokenize(text, { normalize: true }).tokens;
}

/**
 * Validates that character intervals can reconstruct the original text.
 * Useful for debugging tokenization issues.
 *
 * @param text - Original text
 * @param result - Tokenization result
 * @returns true if intervals are valid
 */
export function validateTokenization(text: string, result: TokenizedText): boolean {
  for (let i = 0; i < result.tokens.length; i++) {
    const interval = result.charIntervals[i];
    if (interval.startPos === undefined || interval.endPos === undefined) {
      return false;
    }

    const extracted = text.substring(interval.startPos, interval.endPos);
    // For normalized tokens, compare against the original character span
    if (extracted !== result.tokens[i] && extracted.toLowerCase() !== result.tokens[i]) {
      // Allow for the case where the token was not normalized
      if (extracted.toLowerCase().trim() !== result.tokens[i].toLowerCase().trim()) {
        return false;
      }
    }
  }
  return true;
}
