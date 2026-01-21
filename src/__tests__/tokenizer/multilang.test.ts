/**
 * Copyright 2025 kmbro.
 *
 * Multi-language tokenization tests following Google's Python LangExtract patterns.
 */

import {
  tokenize,
  normalizeToken,
  tokenizeWithLowercase,
  validateTokenization,
  detectLanguage,
} from "../../tokenizer";

describe("Multi-Language Tokenizer", () => {
  describe("CJK tokenization", () => {
    it.each([
      ["你好世界", ["你", "好", "世", "界"]], // Chinese
      ["中国", ["中", "国"]], // Chinese
      ["日本語", ["日", "本", "語"]], // Japanese Kanji
    ])('should tokenize Chinese/Kanji "%s" as individual characters', (input, expected) => {
      const result = tokenize(input);
      expect(result.tokens).toEqual(expected);
    });

    it.each([
      ["こんにちは", ["こ", "ん", "に", "ち", "は"]], // Hiragana
      ["ひらがな", ["ひ", "ら", "が", "な"]], // Hiragana
    ])('should tokenize Japanese Hiragana "%s" as individual characters', (input, expected) => {
      const result = tokenize(input);
      expect(result.tokens).toEqual(expected);
    });

    it.each([
      ["コンピュータ", ["コ", "ン", "ピ", "ュ", "ー", "タ"]], // Katakana
      ["カタカナ", ["カ", "タ", "カ", "ナ"]], // Katakana
    ])('should tokenize Japanese Katakana "%s" as individual characters', (input, expected) => {
      const result = tokenize(input);
      expect(result.tokens).toEqual(expected);
    });

    it.each([
      ["안녕하세요", ["안", "녕", "하", "세", "요"]], // Korean greeting
      ["한국어", ["한", "국", "어"]], // Korean language
    ])('should tokenize Korean Hangul "%s" as individual characters', (input, expected) => {
      const result = tokenize(input);
      expect(result.tokens).toEqual(expected);
    });

    it("should handle CJK with punctuation", () => {
      const result = tokenize("你好，世界！");
      expect(result.tokens).toEqual(["你", "好", "，", "世", "界", "！"]);
    });

    it("should preserve correct char intervals for Chinese", () => {
      const text = "你好";
      const result = tokenize(text);

      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 1 });
      expect(result.charIntervals[1]).toEqual({ startPos: 1, endPos: 2 });

      // Verify reconstruction
      expect(text.substring(result.charIntervals[0].startPos!, result.charIntervals[0].endPos!)).toBe(
        "你"
      );
      expect(text.substring(result.charIntervals[1].startPos!, result.charIntervals[1].endPos!)).toBe(
        "好"
      );
    });

    it("should preserve correct char intervals for Japanese", () => {
      const text = "こんにちは";
      const result = tokenize(text);

      expect(result.tokens).toHaveLength(5);
      for (let i = 0; i < result.tokens.length; i++) {
        expect(result.charIntervals[i]).toEqual({ startPos: i, endPos: i + 1 });
      }
    });
  });

  describe("Mixed script tokenization", () => {
    it("should handle Chinese with English", () => {
      const result = tokenize("Hello你好World世界");
      expect(result.tokens).toContain("Hello");
      expect(result.tokens).toContain("你");
      expect(result.tokens).toContain("好");
      expect(result.tokens).toContain("World");
      expect(result.tokens).toContain("世");
      expect(result.tokens).toContain("界");
    });

    it("should handle script boundaries correctly", () => {
      const result = tokenize("Test测试");
      expect(result.tokens).toEqual(["Test", "测", "试"]);
    });

    it("should handle English-Japanese mix", () => {
      const result = tokenize("Hello こんにちは World");
      expect(result.tokens[0]).toBe("Hello");
      // Japanese characters should be individual tokens
      expect(result.tokens).toContain("こ");
      expect(result.tokens).toContain("World");
    });

    it("should handle Cyrillic script boundaries", () => {
      const result = tokenize("HelloПривет");
      // Should split at script boundary
      expect(result.tokens).toContain("Hello");
      expect(result.tokens).toContain("Привет");
    });

    it("should correctly position tokens in mixed text", () => {
      const text = "Hi你好";
      const result = tokenize(text);

      // Verify we can reconstruct the tokens from the original text
      for (let i = 0; i < result.tokens.length; i++) {
        const interval = result.charIntervals[i];
        const extracted = text.substring(interval.startPos!, interval.endPos!);
        expect(extracted).toBe(result.tokens[i]);
      }
    });

    it("should handle spaces between scripts correctly", () => {
      const result = tokenize("Hello 世界 Test");
      expect(result.tokens).toEqual(["Hello", "世", "界", "Test"]);
    });
  });

  describe("Latin text tokenization", () => {
    it("should tokenize English words correctly", () => {
      const result = tokenize("Hello World");
      expect(result.tokens).toEqual(["Hello", "World"]);
    });

    it("should handle punctuation", () => {
      const result = tokenize("Hello, World!");
      expect(result.tokens).toEqual(["Hello", ",", "World", "!"]);
    });

    it("should handle numbers", () => {
      const result = tokenize("test123 456");
      // Numbers can be grouped with adjacent text
      expect(result.tokens).toContain("test123");
      expect(result.tokens).toContain("456");
    });

    it("should handle multiple spaces", () => {
      const result = tokenize("Hello    World");
      expect(result.tokens).toEqual(["Hello", "World"]);
    });

    it("should preserve char intervals for English", () => {
      const text = "Hello World";
      const result = tokenize(text);

      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 5 });
      expect(result.charIntervals[1]).toEqual({ startPos: 6, endPos: 11 });
    });
  });

  describe("Backward compatibility", () => {
    it("should produce same results for simple English text as old tokenizer", () => {
      const text = "John Smith is 30 years old.";
      const result = tokenize(text);

      expect(result.tokens).toContain("John");
      expect(result.tokens).toContain("Smith");
      expect(result.tokens).toContain("is");
      expect(result.tokens).toContain("30");
      expect(result.tokens).toContain(".");
    });

    it("should work with tokenizeWithLowercase", () => {
      const result = tokenizeWithLowercase("Hello World");
      expect(result).toEqual(["hello", "world"]);
    });

    it("should work with normalizeToken", () => {
      expect(normalizeToken("HELLO")).toBe("hello");
      expect(normalizeToken("  World  ")).toBe("world");
      expect(normalizeToken("Test123")).toBe("test123");
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string", () => {
      const result = tokenize("");
      expect(result.tokens).toEqual([]);
      expect(result.charIntervals).toEqual([]);
      expect(result.tokenIntervals).toEqual([]);
    });

    it("should handle whitespace only", () => {
      const result = tokenize("   \t\n   ");
      expect(result.tokens).toEqual([]);
    });

    it("should handle single character", () => {
      expect(tokenize("a").tokens).toEqual(["a"]);
      expect(tokenize("你").tokens).toEqual(["你"]);
    });

    it("should handle newlines correctly", () => {
      const result = tokenize("Hello\nWorld");
      expect(result.tokens).toEqual(["Hello", "World"]);
    });

    it("should handle tabs correctly", () => {
      const result = tokenize("Hello\tWorld");
      expect(result.tokens).toEqual(["Hello", "World"]);
    });
  });

  describe("Tokenizer options", () => {
    it("should normalize tokens when normalize: true", () => {
      const result = tokenize("HELLO World", { normalize: true });
      expect(result.tokens).toEqual(["hello", "world"]);
    });

    it("should force CJK mode when strategy: cjk", () => {
      // Even Latin text should use CJK-aware tokenization
      const result = tokenize("Hello 你好", { strategy: "cjk" });
      expect(result.tokens).toContain("Hello");
      expect(result.tokens).toContain("你");
      expect(result.tokens).toContain("好");
    });

    it("should use custom pattern when provided", () => {
      const result = tokenize("Hello World", { customPattern: /\w+/g });
      expect(result.tokens).toEqual(["Hello", "World"]);
    });
  });

  describe("char_interval accuracy (Issue #289)", () => {
    it("should correctly position CJK characters", () => {
      const text = "你好世界";
      const result = tokenize(text);

      // Each CJK character should have correct interval
      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 1 });
      expect(result.charIntervals[1]).toEqual({ startPos: 1, endPos: 2 });
      expect(result.charIntervals[2]).toEqual({ startPos: 2, endPos: 3 });
      expect(result.charIntervals[3]).toEqual({ startPos: 3, endPos: 4 });
    });

    it("should correctly position mixed CJK and Latin", () => {
      const text = "A你B好C";
      const result = tokenize(text);

      // Verify each token's position is accurate
      for (let i = 0; i < result.tokens.length; i++) {
        const interval = result.charIntervals[i];
        const extracted = text.substring(interval.startPos!, interval.endPos!);
        expect(extracted).toBe(result.tokens[i]);
      }
    });

    it("should validate tokenization", () => {
      const text = "Hello 世界 Test";
      const result = tokenize(text);
      expect(validateTokenization(text, result)).toBe(true);
    });

    it("should validate CJK tokenization", () => {
      const text = "你好世界";
      const result = tokenize(text);
      expect(validateTokenization(text, result)).toBe(true);
    });

    it("should validate mixed script tokenization", () => {
      const text = "Test测试123こんにちは";
      const result = tokenize(text);
      expect(validateTokenization(text, result)).toBe(true);
    });
  });

  describe("detectLanguage integration", () => {
    it("should detect CJK text", () => {
      expect(detectLanguage("你好世界")).toBe("cjk");
      expect(detectLanguage("こんにちは")).toBe("cjk");
      expect(detectLanguage("안녕하세요")).toBe("cjk");
    });

    it("should detect Latin text", () => {
      expect(detectLanguage("Hello World")).toBe("latin");
      expect(detectLanguage("Bonjour le monde")).toBe("latin");
    });

    it("should detect mixed text", () => {
      expect(detectLanguage("Hello你好")).toBe("mixed");
      expect(detectLanguage("Test テスト")).toBe("mixed");
    });
  });
});
