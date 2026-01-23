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
 * Language-specific tokenization patterns for multi-language support.
 * Follows Google's Python LangExtract tokenizer patterns for CJK and Unicode handling.
 */

// CJK Unicode ranges
export const CJK_UNIFIED = "\u4E00-\u9FFF"; // CJK Unified Ideographs
export const CJK_EXT_A = "\u3400-\u4DBF"; // CJK Unified Ideographs Extension A
export const CJK_EXT_B = "\u{20000}-\u{2A6DF}"; // CJK Unified Ideographs Extension B
export const HIRAGANA = "\u3040-\u309F"; // Hiragana
export const KATAKANA = "\u30A0-\u30FF"; // Katakana
export const KATAKANA_HALF = "\uFF65-\uFF9F"; // Katakana Half-Width
export const HANGUL = "\uAC00-\uD7AF"; // Hangul Syllables
export const HANGUL_JAMO = "\u1100-\u11FF"; // Hangul Jamo
export const HANGUL_COMPAT = "\u3130-\u318F"; // Hangul Compatibility Jamo

// Combined CJK pattern (for detection)
export const CJK_PATTERN = `[${CJK_UNIFIED}${CJK_EXT_A}${HIRAGANA}${KATAKANA}${KATAKANA_HALF}${HANGUL}${HANGUL_JAMO}${HANGUL_COMPAT}]`;

// Cyrillic range
export const CYRILLIC = "\u0400-\u04FF";

// Arabic range
export const ARABIC = "\u0600-\u06FF";

// Thai range
export const THAI = "\u0E00-\u0E7F";

/**
 * Detects the primary language type of the given text.
 * @param text - The text to analyze
 * @returns 'cjk' for CJK-heavy text, 'latin' for Latin-heavy, or 'mixed' for mixed scripts
 */
export function detectLanguage(text: string): "cjk" | "latin" | "mixed" {
  if (!text || text.length === 0) {
    return "latin";
  }

  const cjkRegex = new RegExp(CJK_PATTERN, "u");
  const latinRegex = /[a-zA-Z]/;

  const hasCjk = cjkRegex.test(text);
  const hasLatin = latinRegex.test(text);

  if (hasCjk && hasLatin) {
    return "mixed";
  }
  if (hasCjk) {
    return "cjk";
  }
  return "latin";
}

/**
 * Checks if a character is a CJK character.
 * @param char - Single character to check
 * @returns true if the character is CJK
 */
export function isCJKCharacter(char: string): boolean {
  if (!char || char.length === 0) return false;
  const cjkRegex = new RegExp(CJK_PATTERN, "u");
  return cjkRegex.test(char);
}

/**
 * Checks if a character is a script boundary character (whitespace, punctuation).
 * @param char - Single character to check
 * @returns true if the character is a boundary
 */
export function isScriptBoundary(char: string): boolean {
  if (!char || char.length === 0) return true;
  // Whitespace or common punctuation
  return /[\s\p{P}\p{S}]/u.test(char);
}

/**
 * Gets the script type of a character.
 * @param char - Single character to analyze
 * @returns The script type
 */
export function getScriptType(
  char: string
): "cjk" | "latin" | "cyrillic" | "arabic" | "thai" | "punctuation" | "whitespace" | "other" {
  if (!char || char.length === 0) return "other";

  if (/\s/.test(char)) return "whitespace";
  if (/[\p{P}\p{S}]/u.test(char)) return "punctuation";

  const cjkRegex = new RegExp(CJK_PATTERN, "u");
  if (cjkRegex.test(char)) return "cjk";

  if (/[a-zA-Z\u00C0-\u00FF\u0100-\u017F]/.test(char)) return "latin"; // Latin + Extended Latin
  if (new RegExp(`[${CYRILLIC}]`).test(char)) return "cyrillic";
  if (new RegExp(`[${ARABIC}]`).test(char)) return "arabic";
  if (new RegExp(`[${THAI}]`).test(char)) return "thai";

  return "other";
}

/**
 * Token pattern configuration
 */
export interface TokenPattern {
  name: string;
  pattern: RegExp;
  priority: number;
}

/**
 * Default tokenization patterns in priority order.
 * Higher priority patterns are matched first.
 */
export const TOKEN_PATTERNS: TokenPattern[] = [
  // CJK: Each character is a token
  {
    name: "cjk",
    pattern: new RegExp(CJK_PATTERN, "gu"),
    priority: 100,
  },
  // Words: ASCII and extended Latin
  {
    name: "word",
    pattern: /[a-zA-Z\u00C0-\u00FF\u0100-\u017F]+/gu,
    priority: 50,
  },
  // Numbers
  {
    name: "number",
    pattern: /\d+(?:\.\d+)?/g,
    priority: 40,
  },
  // Punctuation (as individual tokens)
  {
    name: "punctuation",
    pattern: /[\p{P}\p{S}]/gu,
    priority: 30,
  },
];
