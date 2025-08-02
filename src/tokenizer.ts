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
 * Simple tokenization utilities.
 */

import { TokenizedText, TokenInterval, CharInterval } from "./types";

/**
 * Tokenizes text into words and tracks character positions.
 * This is a simplified tokenizer that splits on whitespace and punctuation.
 */
export function tokenize(text: string): TokenizedText {
  const tokens: string[] = [];
  const tokenIntervals: TokenInterval[] = [];
  const charIntervals: CharInterval[] = [];

  // Simple tokenization: split on whitespace and punctuation
  const tokenRegex = /\b\w+\b|[^\w\s]/g;
  let match;
  let tokenIndex = 0;

  while ((match = tokenRegex.exec(text)) !== null) {
    const token = match[0];
    const startPos = match.index;
    const endPos = startPos + token.length;

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

  return {
    tokens,
    tokenIntervals,
    charIntervals,
  };
}

/**
 * Normalizes a token for comparison (lowercase, trim).
 */
export function normalizeToken(token: string): string {
  return token.toLowerCase().trim();
}

/**
 * Tokenizes text with lowercase normalization.
 */
export function tokenizeWithLowercase(text: string): string[] {
  return tokenize(text).tokens.map(normalizeToken);
}
