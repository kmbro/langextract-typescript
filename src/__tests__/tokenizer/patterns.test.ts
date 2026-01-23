/**
 * Copyright 2025 kmbro.
 *
 * Tests for tokenizer pattern utilities.
 */

import {
  detectLanguage,
  isCJKCharacter,
  getScriptType,
  CJK_PATTERN,
} from "../../tokenizer/patterns";

describe("Tokenizer Patterns", () => {
  describe("detectLanguage", () => {
    it("should detect pure CJK text as cjk", () => {
      expect(detectLanguage("你好世界")).toBe("cjk");
      expect(detectLanguage("こんにちは")).toBe("cjk");
      expect(detectLanguage("안녕하세요")).toBe("cjk");
      expect(detectLanguage("コンピュータ")).toBe("cjk");
    });

    it("should detect pure Latin text as latin", () => {
      expect(detectLanguage("Hello World")).toBe("latin");
      expect(detectLanguage("Bonjour le monde")).toBe("latin");
      expect(detectLanguage("test123")).toBe("latin");
    });

    it("should detect mixed CJK and Latin as mixed", () => {
      expect(detectLanguage("Hello你好")).toBe("mixed");
      expect(detectLanguage("Test テスト")).toBe("mixed");
      expect(detectLanguage("Hello 世界 123")).toBe("mixed");
    });

    it("should handle empty string as latin", () => {
      expect(detectLanguage("")).toBe("latin");
    });

    it("should handle numbers-only as latin", () => {
      expect(detectLanguage("12345")).toBe("latin");
    });

    it("should handle punctuation-only as latin", () => {
      expect(detectLanguage("...!?")).toBe("latin");
    });
  });

  describe("isCJKCharacter", () => {
    it("should return true for Chinese characters", () => {
      expect(isCJKCharacter("你")).toBe(true);
      expect(isCJKCharacter("好")).toBe(true);
      expect(isCJKCharacter("世")).toBe(true);
      expect(isCJKCharacter("界")).toBe(true);
    });

    it("should return true for Japanese hiragana", () => {
      expect(isCJKCharacter("あ")).toBe(true);
      expect(isCJKCharacter("い")).toBe(true);
      expect(isCJKCharacter("う")).toBe(true);
    });

    it("should return true for Japanese katakana", () => {
      expect(isCJKCharacter("ア")).toBe(true);
      expect(isCJKCharacter("イ")).toBe(true);
      expect(isCJKCharacter("ウ")).toBe(true);
    });

    it("should return true for Korean hangul", () => {
      expect(isCJKCharacter("가")).toBe(true);
      expect(isCJKCharacter("나")).toBe(true);
      expect(isCJKCharacter("다")).toBe(true);
    });

    it("should return false for Latin characters", () => {
      expect(isCJKCharacter("a")).toBe(false);
      expect(isCJKCharacter("Z")).toBe(false);
    });

    it("should return false for numbers", () => {
      expect(isCJKCharacter("1")).toBe(false);
      expect(isCJKCharacter("9")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isCJKCharacter("")).toBe(false);
    });
  });

  describe("getScriptType", () => {
    it("should identify CJK characters", () => {
      expect(getScriptType("你")).toBe("cjk");
      expect(getScriptType("あ")).toBe("cjk");
      expect(getScriptType("가")).toBe("cjk");
    });

    it("should identify Latin characters", () => {
      expect(getScriptType("a")).toBe("latin");
      expect(getScriptType("Z")).toBe("latin");
      expect(getScriptType("é")).toBe("latin"); // Extended Latin
    });

    it("should identify Cyrillic characters", () => {
      expect(getScriptType("а")).toBe("cyrillic");
      expect(getScriptType("Б")).toBe("cyrillic");
      expect(getScriptType("я")).toBe("cyrillic");
    });

    it("should identify whitespace", () => {
      expect(getScriptType(" ")).toBe("whitespace");
      expect(getScriptType("\t")).toBe("whitespace");
      expect(getScriptType("\n")).toBe("whitespace");
    });

    it("should identify punctuation", () => {
      expect(getScriptType(".")).toBe("punctuation");
      expect(getScriptType(",")).toBe("punctuation");
      expect(getScriptType("!")).toBe("punctuation");
      expect(getScriptType("?")).toBe("punctuation");
      expect(getScriptType("。")).toBe("punctuation"); // CJK full stop
      expect(getScriptType("，")).toBe("punctuation"); // CJK comma
    });

    it("should return other for unknown characters", () => {
      expect(getScriptType("")).toBe("other");
    });
  });

  describe("CJK_PATTERN regex", () => {
    it("should match Chinese characters", () => {
      const regex = new RegExp(CJK_PATTERN, "u");
      expect(regex.test("中")).toBe(true);
      expect(regex.test("国")).toBe(true);
    });

    it("should match Japanese characters", () => {
      const regex = new RegExp(CJK_PATTERN, "u");
      expect(regex.test("日")).toBe(true);
      expect(regex.test("本")).toBe(true);
      expect(regex.test("あ")).toBe(true);
      expect(regex.test("ア")).toBe(true);
    });

    it("should match Korean characters", () => {
      const regex = new RegExp(CJK_PATTERN, "u");
      expect(regex.test("한")).toBe(true);
      expect(regex.test("국")).toBe(true);
    });

    it("should not match Latin characters", () => {
      const regex = new RegExp(CJK_PATTERN, "u");
      expect(regex.test("a")).toBe(false);
      expect(regex.test("Z")).toBe(false);
    });
  });
});
