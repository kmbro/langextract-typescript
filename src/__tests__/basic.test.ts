/**
 * Basic tests for LangExtract TypeScript
 */

import {
  extract,
  ExampleData,
  FormatType,
  AlignmentStatus,
  GeminiLanguageModel,
  OllamaLanguageModel,
  Resolver,
  Annotator,
  PromptTemplateStructured,
} from "../index";

describe("LangExtract TypeScript", () => {
  const mockExamples: ExampleData[] = [
    {
      text: "John Smith is 30 years old.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "John Smith",
          attributes: {
            age: "30",
          },
        },
      ],
    },
  ];

  describe("Types and Interfaces", () => {
    test("should export all necessary types", () => {
      expect(FormatType.JSON).toBe("json");
      expect(FormatType.YAML).toBe("yaml");
      expect(AlignmentStatus.MATCH_EXACT).toBe("match_exact");
      expect(AlignmentStatus.MATCH_FUZZY).toBe("match_fuzzy");
    });

    test("should create ExampleData correctly", () => {
      const example: ExampleData = {
        text: "Test text",
        extractions: [],
      };
      expect(example.text).toBe("Test text");
      expect(example.extractions).toEqual([]);
    });
  });

  describe("Language Models", () => {
    test("should create GeminiLanguageModel", () => {
      const model = new GeminiLanguageModel({
        modelId: "test-model",
        apiKey: "test-key",
      });
      expect(model).toBeInstanceOf(GeminiLanguageModel);
    });

    test("should create OllamaLanguageModel", () => {
      const model = new OllamaLanguageModel({
        model: "test-model",
        modelUrl: "http://localhost:11434",
      });
      expect(model).toBeInstanceOf(OllamaLanguageModel);
    });
  });

  describe("Resolver", () => {
    test("should create Resolver with default options", () => {
      const resolver = new Resolver();
      expect(resolver.fenceOutput).toBe(true);
      expect(resolver.formatType).toBe(FormatType.JSON);
    });

    test("should create Resolver with custom options", () => {
      const resolver = new Resolver({
        fenceOutput: false,
        formatType: FormatType.YAML,
      });
      expect(resolver.fenceOutput).toBe(false);
      expect(resolver.formatType).toBe(FormatType.YAML);
    });

    test("should resolve JSON output", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = '{"extractions":[{"person":"John Smith","person_attributes":{"age":"30"}}]}';
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].attributes).toEqual({ age: "30" });
    });
  });

  describe("Annotator", () => {
    test("should create Annotator", () => {
      const model = new GeminiLanguageModel({ apiKey: "test" });
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [],
      };

      const annotator = new Annotator(model, template);
      expect(annotator).toBeInstanceOf(Annotator);
    });
  });

  describe("Extract Function", () => {
    test("should validate required parameters", async () => {
      await expect(extract("test", { examples: [] } as any)).rejects.toThrow("Examples are required for reliable extraction");
    });

    test("should validate API key", async () => {
      await expect(extract("test", { examples: mockExamples } as any)).rejects.toThrow("API key must be provided for cloud-hosted models");
    });
  });

  describe("Integration", () => {
    test("should handle basic extraction workflow", () => {
      // This test would require a mock API or real API key
      // For now, we just test that the types work together
      const model = new GeminiLanguageModel({ apiKey: "test" });
      const template: PromptTemplateStructured = {
        description: "Test",
        examples: mockExamples,
      };
      const resolver = new Resolver();
      const annotator = new Annotator(model, template);

      expect(model).toBeDefined();
      expect(template).toBeDefined();
      expect(resolver).toBeDefined();
      expect(annotator).toBeDefined();
    });
  });
});
