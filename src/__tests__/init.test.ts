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
 * Tests for the main package functions in index.ts.
 */

import { extract, ExampleData, FormatType } from "../index";
import { GeminiLanguageModel } from "../inference";

// Mock the GeminiLanguageModel
jest.mock("../inference", () => ({
  GeminiLanguageModel: jest.fn().mockImplementation(() => ({
    infer: jest.fn(),
  })),
}));

describe("InitTest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("extract function", () => {
    it("should extract information with proper configuration", async () => {
      const inputText = "Patient takes Aspirin 100mg every morning.";

      // Mock the language model's response
      const mockInfer = jest.fn().mockResolvedValue([
        [
          {
            output: `\`\`\`json
{
  "extractions": [
    {
      "entity": "Aspirin",
      "entity_attributes": {
        "class": "medication"
      }
    },
    {
      "entity": "100mg",
      "entity_attributes": {
        "frequency": "every morning",
        "class": "dosage"
      }
    }
  ]
}
\`\`\``,
            score: 0.9,
          },
        ],
      ]);

      (GeminiLanguageModel as jest.MockedClass<typeof GeminiLanguageModel>).mockImplementation(
        () =>
          ({
            infer: mockInfer,
          } as any)
      );

      const mockDescription = "Extract medication and dosage information in order of occurrence.";

      const mockExamples: ExampleData[] = [
        {
          text: "Patient takes Tylenol 500mg daily.",
          extractions: [
            {
              extractionClass: "entity",
              extractionText: "Tylenol",
              attributes: {
                type: "analgesic",
                class: "medication",
              },
            },
          ],
        },
      ];

      const result = await extract(inputText, {
        promptDescription: mockDescription,
        examples: mockExamples,
        apiKey: "some_api_key",
        fenceOutput: true,
        useSchemaConstraints: false,
      } as any);

      // Verify the result structure - result is a single AnnotatedDocument
      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
      expect("text" in result).toBe(true);
      expect("extractions" in result).toBe(true);

      const annotatedDoc = result as any;
      expect(annotatedDoc.text).toBe(inputText);
      expect(annotatedDoc.extractions).toBeDefined();
      expect(annotatedDoc.extractions!.length).toBeGreaterThan(0);

      // Verify the language model was called with correct parameters
      expect(GeminiLanguageModel).toHaveBeenCalledWith({
        modelId: "gemini-2.5-flash",
        apiKey: "some_api_key",
        geminiSchema: undefined, // Should be undefined when useSchemaConstraints is false
        formatType: FormatType.JSON,
        temperature: 0.5,
        maxWorkers: 10,
        modelUrl: undefined,
      });

      expect(mockInfer).toHaveBeenCalled();
    });

    it("should use schema constraints when enabled", async () => {
      const inputText = "Patient takes Aspirin 100mg every morning.";

      const mockInfer = jest.fn().mockResolvedValue([
        [
          {
            output: `{"extractions": [{"entity": "Aspirin"}]}`,
            score: 0.9,
          },
        ],
      ]);

      (GeminiLanguageModel as jest.MockedClass<typeof GeminiLanguageModel>).mockImplementation(
        () =>
          ({
            infer: mockInfer,
          } as any)
      );

      const mockExamples: ExampleData[] = [
        {
          text: "Patient takes Tylenol 500mg daily.",
          extractions: [
            {
              extractionClass: "entity",
              extractionText: "Tylenol",
              attributes: {
                class: "medication",
              },
            },
          ],
        },
      ];

      await extract(inputText, {
        promptDescription: "Extract medication information",
        examples: mockExamples,
        apiKey: "some_api_key",
        useSchemaConstraints: true,
      } as any);

      // Verify schema was created and passed to the language model
      expect(GeminiLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({
          geminiSchema: expect.any(Object), // Should have a schema when useSchemaConstraints is true
        })
      );
    });

    it("should handle different format types", async () => {
      const inputText = "Patient takes Aspirin 100mg every morning.";

      const mockInfer = jest.fn().mockResolvedValue([
        [
          {
            output: `extractions:
- entity: Aspirin
  entity_attributes:
    class: medication`,
            score: 0.9,
          },
        ],
      ]);

      (GeminiLanguageModel as jest.MockedClass<typeof GeminiLanguageModel>).mockImplementation(
        () =>
          ({
            infer: mockInfer,
          } as any)
      );

      const mockExamples: ExampleData[] = [
        {
          text: "Patient takes Tylenol 500mg daily.",
          extractions: [
            {
              extractionClass: "entity",
              extractionText: "Tylenol",
              attributes: {
                class: "medication",
              },
            },
          ],
        },
      ];

      await extract(inputText, {
        promptDescription: "Extract medication information",
        examples: mockExamples,
        apiKey: "some_api_key",
        formatType: FormatType.YAML,
      } as any);

      expect(GeminiLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({
          formatType: FormatType.YAML,
        })
      );
    });

    it("should handle batch processing of multiple documents", async () => {
      const documents = [
        { text: "Patient takes Aspirin 100mg.", documentId: "doc1" },
        { text: "Patient takes Tylenol 500mg.", documentId: "doc2" },
      ];

      const mockInfer = jest.fn().mockResolvedValue([
        [
          {
            output: `{"extractions": [{"entity": "Aspirin"}]}`,
            score: 0.9,
          },
        ],
        [
          {
            output: `{"extractions": [{"entity": "Tylenol"}]}`,
            score: 0.9,
          },
        ],
      ]);

      (GeminiLanguageModel as jest.MockedClass<typeof GeminiLanguageModel>).mockImplementation(
        () =>
          ({
            infer: mockInfer,
          } as any)
      );

      const mockExamples: ExampleData[] = [
        {
          text: "Patient takes medication.",
          extractions: [
            {
              extractionClass: "entity",
              extractionText: "medication",
            },
          ],
        },
      ];

      const results = await extract(documents, {
        promptDescription: "Extract medication information",
        examples: mockExamples,
        apiKey: "some_api_key",
        batchLength: 2,
      } as any);

      // Verify results is an array of AnnotatedDocument
      expect(Array.isArray(results)).toBe(true);
      expect((results as any[]).length).toBe(2);

      const resultsArray = results as any[];
      expect(resultsArray[0].documentId).toBe("doc1");
      expect(resultsArray[1].documentId).toBe("doc2");
    });

    it("should validate required parameters", async () => {
      await expect(extract("test", { examples: [] } as any)).rejects.toThrow("Examples are required for reliable extraction");
    });

    it("should validate API key", async () => {
      const mockExamples: ExampleData[] = [
        {
          text: "test",
          extractions: [
            {
              extractionClass: "test",
              extractionText: "test",
            },
          ],
        },
      ];

      await expect(extract("test", { examples: mockExamples } as any)).rejects.toThrow("API key must be provided for cloud-hosted models");
    });

    it("should handle custom temperature and other parameters", async () => {
      const inputText = "Patient takes Aspirin 100mg every morning.";

      const mockInfer = jest.fn().mockResolvedValue([
        [
          {
            output: `{"extractions": [{"entity": "Aspirin"}]}`,
            score: 0.9,
          },
        ],
      ]);

      (GeminiLanguageModel as jest.MockedClass<typeof GeminiLanguageModel>).mockImplementation(
        () =>
          ({
            infer: mockInfer,
          } as any)
      );

      const mockExamples: ExampleData[] = [
        {
          text: "Patient takes Tylenol 500mg daily.",
          extractions: [
            {
              extractionClass: "entity",
              extractionText: "Tylenol",
            },
          ],
        },
      ];

      await extract(inputText, {
        promptDescription: "Extract medication information",
        examples: mockExamples,
        apiKey: "some_api_key",
        temperature: 0.3,
        maxCharBuffer: 500,
        batchLength: 5,
        maxWorkers: 5,
        extractionPasses: 2,
      } as any);

      expect(GeminiLanguageModel).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.3,
          maxWorkers: 5,
        })
      );
    });
  });
});
