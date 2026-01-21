/**
 * Copyright 2025 kmbro.
 *
 * Tests for prompt validation module.
 */

import {
  validateExamples,
  handleValidationResult,
  validateAndHandle,
  DEFAULT_VALIDATION_CONFIG,
  ValidationResult,
} from "../validation";
import { ExampleData } from "../types";

describe("Prompt Validation", () => {
  describe("validateExamples", () => {
    it("should pass when extraction text is in source text", () => {
      const examples: ExampleData[] = [
        {
          text: "John works at Google in Mountain View.",
          extractions: [
            { extractionClass: "person", extractionText: "John" },
            { extractionClass: "company", extractionText: "Google" },
            { extractionClass: "location", extractionText: "Mountain View" },
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });

    it("should fail when extraction text is NOT in source text", () => {
      const examples: ExampleData[] = [
        {
          text: "John works at Google.",
          extractions: [
            { extractionClass: "person", extractionText: "Jane" }, // Not in text
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(false);
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("Jane");
      expect(result.messages[0]).toContain("not found");
    });

    it("should handle case-insensitive matching", () => {
      const examples: ExampleData[] = [
        {
          text: "JOHN works at google.",
          extractions: [
            { extractionClass: "person", extractionText: "john" },
            { extractionClass: "company", extractionText: "GOOGLE" },
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });

    it("should handle whitespace variations", () => {
      const examples: ExampleData[] = [
        {
          text: "John  works   at   Google.",
          extractions: [
            { extractionClass: "person", extractionText: "John" },
            { extractionClass: "company", extractionText: "Google" },
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });

    it("should use fuzzy matching with configurable threshold", () => {
      const examples: ExampleData[] = [
        {
          text: "John Smith works at Google.",
          extractions: [
            { extractionClass: "person", extractionText: "Jon Smith" }, // Slightly different
          ],
        },
      ];

      // Strict matching should fail
      const strictResult = validateExamples(examples, { fuzzyThreshold: 1.0 });
      expect(strictResult.valid).toBe(false);

      // Fuzzy matching should pass (with lower threshold)
      const fuzzyResult = validateExamples(examples, { fuzzyThreshold: 0.7 });
      expect(fuzzyResult.valid).toBe(true);
    });

    it("should warn about examples with no extractions", () => {
      const examples: ExampleData[] = [
        {
          text: "This is some text.",
          extractions: [],
        },
      ];

      const result = validateExamples(examples, { warnOnEmptyExtractions: true });
      expect(result.valid).toBe(true); // Still valid, just a warning
      expect(result.messages.length).toBeGreaterThan(0);
      expect(result.messages[0]).toContain("no extractions");
    });

    it("should not warn about empty extractions when disabled", () => {
      const examples: ExampleData[] = [
        {
          text: "This is some text.",
          extractions: [],
        },
      ];

      const result = validateExamples(examples, { warnOnEmptyExtractions: false });
      expect(result.valid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });

    it("should validate multiple examples and report all errors", () => {
      const examples: ExampleData[] = [
        {
          text: "John works at Google.",
          extractions: [{ extractionClass: "person", extractionText: "Jane" }],
        },
        {
          text: "Alice works at Microsoft.",
          extractions: [{ extractionClass: "company", extractionText: "Amazon" }],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(false);
      expect(result.messages.length).toBe(2);
      expect(result.messages[0]).toContain("Example 1");
      expect(result.messages[1]).toContain("Example 2");
    });

    it("should handle extractions with empty extractionText", () => {
      const examples: ExampleData[] = [
        {
          text: "Some text here.",
          extractions: [
            { extractionClass: "entity", extractionText: "" }, // Empty extractionText
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });
  });

  describe("handleValidationResult", () => {
    const failedResult: ValidationResult = {
      valid: false,
      exampleResults: [],
      messages: ["Error 1", "Error 2"],
    };

    const passedResult: ValidationResult = {
      valid: true,
      exampleResults: [],
      messages: [],
    };

    describe("strict mode", () => {
      it("should throw Error on validation failure", () => {
        expect(() => handleValidationResult(failedResult, "strict")).toThrow();
      });

      it("should include all error messages in thrown error", () => {
        expect(() => handleValidationResult(failedResult, "strict")).toThrow(/Error 1/);
      });

      it("should not throw on validation success", () => {
        expect(() => handleValidationResult(passedResult, "strict")).not.toThrow();
      });
    });

    describe("warn mode", () => {
      const originalWarn = console.warn;
      let warnMock: jest.Mock;

      beforeEach(() => {
        warnMock = jest.fn();
        console.warn = warnMock;
      });

      afterEach(() => {
        console.warn = originalWarn;
      });

      it("should console.warn on validation failure", () => {
        handleValidationResult(failedResult, "warn");
        expect(warnMock).toHaveBeenCalledTimes(2);
        expect(warnMock).toHaveBeenCalledWith(expect.stringContaining("Error 1"));
        expect(warnMock).toHaveBeenCalledWith(expect.stringContaining("Error 2"));
      });

      it("should NOT throw", () => {
        expect(() => handleValidationResult(failedResult, "warn")).not.toThrow();
      });

      it("should not warn on success", () => {
        handleValidationResult(passedResult, "warn");
        expect(warnMock).not.toHaveBeenCalled();
      });
    });

    describe("skip mode", () => {
      const originalWarn = console.warn;
      let warnMock: jest.Mock;

      beforeEach(() => {
        warnMock = jest.fn();
        console.warn = warnMock;
      });

      afterEach(() => {
        console.warn = originalWarn;
      });

      it("should not warn or throw", () => {
        expect(() => handleValidationResult(failedResult, "skip")).not.toThrow();
        expect(warnMock).not.toHaveBeenCalled();
      });
    });
  });

  describe("validateAndHandle", () => {
    it("should validate by default (warn mode)", () => {
      const originalWarn = console.warn;
      const warnMock = jest.fn();
      console.warn = warnMock;

      const examples: ExampleData[] = [
        {
          text: "John works here.",
          extractions: [{ extractionClass: "person", extractionText: "Jane" }],
        },
      ];

      const result = validateAndHandle(examples);
      expect(result).toBe(false);
      expect(warnMock).toHaveBeenCalled();

      console.warn = originalWarn;
    });

    it("should skip validation when mode is skip", () => {
      const examples: ExampleData[] = [
        {
          text: "John works here.",
          extractions: [{ extractionClass: "person", extractionText: "Jane" }],
        },
      ];

      const result = validateAndHandle(examples, { mode: "skip" });
      expect(result).toBe(true);
    });

    it("should throw when mode is strict and invalid", () => {
      const examples: ExampleData[] = [
        {
          text: "John works here.",
          extractions: [{ extractionClass: "person", extractionText: "Jane" }],
        },
      ];

      expect(() => validateAndHandle(examples, { mode: "strict" })).toThrow();
    });

    it("should return true for valid examples", () => {
      const examples: ExampleData[] = [
        {
          text: "John works here.",
          extractions: [{ extractionClass: "person", extractionText: "John" }],
        },
      ];

      const result = validateAndHandle(examples, { mode: "strict" });
      expect(result).toBe(true);
    });
  });

  describe("DEFAULT_VALIDATION_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_VALIDATION_CONFIG.mode).toBe("warn");
      expect(DEFAULT_VALIDATION_CONFIG.fuzzyThreshold).toBe(1.0);
      expect(DEFAULT_VALIDATION_CONFIG.warnOnEmptyExtractions).toBe(true);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty examples array", () => {
      const result = validateExamples([]);
      expect(result.valid).toBe(true);
      expect(result.messages).toHaveLength(0);
    });

    it("should handle example with undefined extractions", () => {
      const examples: ExampleData[] = [
        {
          text: "Some text.",
          extractions: undefined as any,
        },
      ];

      // Should not throw
      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });

    it("should handle substring matches", () => {
      const examples: ExampleData[] = [
        {
          text: "The pharmaceutical company Pfizer announced new vaccines.",
          extractions: [
            { extractionClass: "company", extractionText: "Pfizer" },
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });

    it("should handle multi-word extractions", () => {
      const examples: ExampleData[] = [
        {
          text: "John Smith works at New York City Hospital.",
          extractions: [
            { extractionClass: "person", extractionText: "John Smith" },
            { extractionClass: "organization", extractionText: "New York City Hospital" },
          ],
        },
      ];

      const result = validateExamples(examples);
      expect(result.valid).toBe(true);
    });
  });
});
