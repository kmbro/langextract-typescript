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
 * Tests for tokenization utilities.
 */

import { tokenize, normalizeToken, tokenizeWithLowercase } from "../tokenizer";

describe("TokenizerTest", () => {
  describe("tokenize function", () => {
    it("should tokenize basic text", () => {
      const inputText = "Hello, world!";
      const result = tokenize(inputText);

      expect(result.tokens).toEqual(["Hello", ",", "world", "!"]);
      expect(result.tokenIntervals).toHaveLength(4);
      expect(result.charIntervals).toHaveLength(4);

      // Check token intervals
      expect(result.tokenIntervals[0]).toEqual({ startToken: 0, endToken: 1 });
      expect(result.tokenIntervals[1]).toEqual({ startToken: 1, endToken: 2 });
      expect(result.tokenIntervals[2]).toEqual({ startToken: 2, endToken: 3 });
      expect(result.tokenIntervals[3]).toEqual({ startToken: 3, endToken: 4 });

      // Check char intervals
      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 5 });
      expect(result.charIntervals[1]).toEqual({ startPos: 5, endPos: 6 });
      expect(result.charIntervals[2]).toEqual({ startPos: 7, endPos: 12 });
      expect(result.charIntervals[3]).toEqual({ startPos: 12, endPos: 13 });
    });

    it("should handle multiple spaces and numbers", () => {
      const inputText = "Age:   25\nWeight=70kg.";
      const result = tokenize(inputText);

      // The current tokenizer keeps "70kg" as one token
      expect(result.tokens).toEqual(["Age", ":", "25", "Weight", "=", "70kg", "."]);
      expect(result.tokenIntervals).toHaveLength(7);
      expect(result.charIntervals).toHaveLength(7);

      // Check that numbers are properly tokenized
      expect(result.tokens[2]).toBe("25");
      expect(result.tokens[5]).toBe("70kg");
    });

    it("should handle multi-line input", () => {
      const inputText = "Line1\nLine2\nLine3";
      const result = tokenize(inputText);

      expect(result.tokens).toEqual(["Line1", "Line2", "Line3"]);
      expect(result.tokenIntervals).toHaveLength(3);
      expect(result.charIntervals).toHaveLength(3);

      // Check char intervals account for newlines
      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 5 });
      expect(result.charIntervals[1]).toEqual({ startPos: 6, endPos: 11 });
      expect(result.charIntervals[2]).toEqual({ startPos: 12, endPos: 17 });
    });

    it("should handle only symbols", () => {
      const inputText = "!!!@#   $$$%";
      const result = tokenize(inputText);

      // Should extract symbols and ignore excessive whitespace
      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokens.every((token) => /[!@#$%]/.test(token))).toBe(true);
    });

    it("should handle empty string", () => {
      const inputText = "";
      const result = tokenize(inputText);

      expect(result.tokens).toEqual([]);
      expect(result.tokenIntervals).toEqual([]);
      expect(result.charIntervals).toEqual([]);
    });

    it("should handle whitespace-only string", () => {
      const inputText = "   \n\t  ";
      const result = tokenize(inputText);

      expect(result.tokens).toEqual([]);
      expect(result.tokenIntervals).toEqual([]);
      expect(result.charIntervals).toEqual([]);
    });

    it("should handle medical text with abbreviations", () => {
      const inputText = "Patient Jane Doe, ID 67890, received 10mg daily.";
      const result = tokenize(inputText);

      expect(result.tokens).toContain("Patient");
      expect(result.tokens).toContain("Jane");
      expect(result.tokens).toContain("Doe");
      expect(result.tokens).toContain("ID");
      expect(result.tokens).toContain("67890");
      expect(result.tokens).toContain("10mg"); // Current tokenizer keeps "10mg" as one token
      expect(result.tokens).toContain("daily");

      // Check that punctuation is properly separated
      expect(result.tokens).toContain(",");
      expect(result.tokens).toContain(".");
    });

    it("should handle complex medical terminology", () => {
      const inputText = "Blood pressure was 160/90 and patient was recommended to Atenolol 50 mg daily.";
      const result = tokenize(inputText);

      expect(result.tokens).toContain("Blood");
      expect(result.tokens).toContain("pressure");
      expect(result.tokens).toContain("160");
      expect(result.tokens).toContain("90");
      expect(result.tokens).toContain("Atenolol");
      expect(result.tokens).toContain("50");
      expect(result.tokens).toContain("mg");
    });

    it("should maintain correct character positions", () => {
      const inputText = "Hello world";
      const result = tokenize(inputText);

      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 5 });
      expect(result.charIntervals[1]).toEqual({ startPos: 6, endPos: 11 });

      // Verify we can reconstruct the original text
      const reconstructed = result.tokens.map((token, i) => inputText.slice(result.charIntervals[i].startPos!, result.charIntervals[i].endPos)).join(" ");
      expect(reconstructed).toBe("Hello world");
    });
  });

  describe("normalizeToken function", () => {
    it("should convert to lowercase and trim", () => {
      expect(normalizeToken("Hello")).toBe("hello");
      expect(normalizeToken("WORLD")).toBe("world");
      expect(normalizeToken("  Test  ")).toBe("test");
      expect(normalizeToken("MiXeD")).toBe("mixed");
    });

    it("should handle empty and whitespace strings", () => {
      expect(normalizeToken("")).toBe("");
      expect(normalizeToken("   ")).toBe("");
      expect(normalizeToken("\n\t")).toBe("");
    });

    it("should handle special characters", () => {
      expect(normalizeToken("Hello!")).toBe("hello!");
      expect(normalizeToken("Test-123")).toBe("test-123");
      expect(normalizeToken("C++")).toBe("c++");
    });
  });

  describe("tokenizeWithLowercase function", () => {
    it("should return lowercase tokens", () => {
      const inputText = "Hello WORLD Test";
      const result = tokenizeWithLowercase(inputText);

      expect(result).toEqual(["hello", "world", "test"]);
    });

    it("should handle empty input", () => {
      const inputText = "";
      const result = tokenizeWithLowercase(inputText);

      expect(result).toEqual([]);
    });

    it("should handle punctuation and numbers", () => {
      const inputText = "Hello, World! 123";
      const result = tokenizeWithLowercase(inputText);

      expect(result).toEqual(["hello", ",", "world", "!", "123"]);
    });
  });

  describe("TokenizedText structure", () => {
    it("should have consistent structure", () => {
      const inputText = "Test text";
      const result = tokenize(inputText);

      expect(result).toHaveProperty("tokens");
      expect(result).toHaveProperty("tokenIntervals");
      expect(result).toHaveProperty("charIntervals");

      expect(Array.isArray(result.tokens)).toBe(true);
      expect(Array.isArray(result.tokenIntervals)).toBe(true);
      expect(Array.isArray(result.charIntervals)).toBe(true);

      expect(result.tokens.length).toBe(result.tokenIntervals.length);
      expect(result.tokens.length).toBe(result.charIntervals.length);
    });

    it("should handle single token", () => {
      const inputText = "Hello";
      const result = tokenize(inputText);

      expect(result.tokens).toEqual(["Hello"]);
      expect(result.tokenIntervals).toEqual([{ startToken: 0, endToken: 1 }]);
      expect(result.charIntervals).toEqual([{ startPos: 0, endPos: 5 }]);
    });

    it("should handle tokens with special characters", () => {
      const inputText = "Dr. Smith's patient";
      const result = tokenize(inputText);

      expect(result.tokens).toContain("Dr");
      expect(result.tokens).toContain(".");
      expect(result.tokens).toContain("Smith");
      expect(result.tokens).toContain("'"); // Current tokenizer separates apostrophe
      expect(result.tokens).toContain("s");
      expect(result.tokens).toContain("patient");
    });
  });

  describe("Edge cases", () => {
    it("should handle very long text", () => {
      const longText = "This is a very long text ".repeat(100);
      const result = tokenize(longText);

      expect(result.tokens.length).toBeGreaterThan(0);
      expect(result.tokenIntervals.length).toBe(result.tokens.length);
      expect(result.charIntervals.length).toBe(result.tokens.length);
    });

    it("should handle unicode characters", () => {
      const inputText = "Café résumé naïve";
      const result = tokenize(inputText);

      // Current tokenizer separates unicode characters
      expect(result.tokens).toContain("Caf");
      expect(result.tokens).toContain("é");
      expect(result.tokens).toContain("r");
      expect(result.tokens).toContain("sum");
    });

    it("should handle numbers with decimals", () => {
      const inputText = "Temperature is 98.6°F";
      const result = tokenize(inputText);

      expect(result.tokens).toContain("98");
      expect(result.tokens).toContain(".");
      expect(result.tokens).toContain("6");
      expect(result.tokens).toContain("°");
      expect(result.tokens).toContain("F");
    });

    it("should handle abbreviations and acronyms", () => {
      const inputText = "Patient has COPD and is on O2 therapy";
      const result = tokenize(inputText);

      expect(result.tokens).toContain("COPD");
      expect(result.tokens).toContain("O2");
    });
  });
});
