/**
 * Tests for custom language model functionality
 */

import { extract, BaseLanguageModel, InferenceOptions, ScoredOutput, ExampleData } from "../index";

// Mock custom language model for testing
class MockCustomLanguageModel implements BaseLanguageModel {
  private responses: string[];
  private callCount: number = 0;

  constructor(responses: string[] = []) {
    this.responses = responses;
  }

  async infer(batchPrompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]> {
    const results: ScoredOutput[][] = [];

    for (const prompt of batchPrompts) {
      // Use the options for potential temperature or other parameters
      const temperature = options?.temperature || 0.0;
      
      // Use the prompt in the response or for logging
      const response = this.responses[this.callCount] || JSON.stringify({
        extractions: [
          {
            extractionClass: "test",
            extractionText: `mock response for prompt: ${prompt.substring(0, 20)}...`,
            attributes: {
              temperature: temperature.toString()
            }
          }
        ]
      });
      
      results.push([{
        score: 1.0,
        output: response
      }]);
      
      this.callCount++;
    }

    return results;
  }

  getCallCount(): number {
    return this.callCount;
  }
}

describe("Custom Language Model Integration", () => {
  const mockExamples: ExampleData[] = [
    {
      text: "John Smith visited the office.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "John Smith"
        }
      ]
    }
  ];

  it("should accept a custom language model", async () => {
    const customModel = new MockCustomLanguageModel([
      JSON.stringify({
        extractions: [
          {
            extractionClass: "person",
            extractionText: "Custom Person"
          }
        ]
      })
    ]);

    const result = await extract("Test text", {
      languageModel: customModel,
      examples: mockExamples,
      promptDescription: "Extract people"
    });

    expect(result).toBeDefined();
    expect(customModel.getCallCount()).toBeGreaterThan(0);
  });

  it("should not require apiKey when using custom model", async () => {
    const customModel = new MockCustomLanguageModel();

    // This should not throw an error about missing API key
    await expect(extract("Test text", {
      languageModel: customModel,
      examples: mockExamples
    })).resolves.toBeDefined();
  });

  it("should still require apiKey when not using custom model", async () => {
    await expect(extract("Test text", {
      modelType: "gemini",
      examples: mockExamples
    })).rejects.toThrow("API key must be provided");
  });

  it("should pass options to custom model infer method", async () => {
    const customModel = new MockCustomLanguageModel();
    const originalInfer = customModel.infer;
    const mockInfer = jest.fn().mockImplementation(originalInfer.bind(customModel));
    customModel.infer = mockInfer;

    await extract("Test text", {
      languageModel: customModel,
      examples: mockExamples,
      temperature: 0.8,
      maxTokens: 1024
    });

    expect(mockInfer).toHaveBeenCalled();
    const [, options] = mockInfer.mock.calls[0];
    expect(options).toEqual({
      maxDecodeSteps: 1024
    });
  });

  it("should handle custom model errors gracefully", async () => {
    class ErrorModel implements BaseLanguageModel {
      async infer(): Promise<ScoredOutput[][]> {
        // Custom models should handle their own errors and return appropriate ScoredOutput
        return [
          [{ score: 0, output: undefined }]
        ];
      }
    }

    const errorModel = new ErrorModel();
    
    const result = await extract("Test text", {
      languageModel: errorModel,
      examples: mockExamples
    });

    expect(result).toBeDefined();
    // Result should have empty extractions due to the error response
    if ('extractions' in result) {
      expect(result.extractions).toEqual([]);
    }
  });

  it("should propagate unhandled custom model errors", async () => {
    class UnhandledErrorModel implements BaseLanguageModel {
      async infer(): Promise<ScoredOutput[][]> {
        throw new Error("Unhandled custom model error");
      }
    }

    const errorModel = new UnhandledErrorModel();
    
    // Unhandled errors should propagate up
    await expect(extract("Test text", {
      languageModel: errorModel,
      examples: mockExamples
    })).rejects.toThrow("Unhandled custom model error");
  });

  it("should work with custom model returning empty responses", async () => {
    const customModel = new MockCustomLanguageModel([
      JSON.stringify({ extractions: [] })
    ]);

    const result = await extract("Test text", {
      languageModel: customModel,
      examples: mockExamples
    });

    expect(result).toBeDefined();
    if ('extractions' in result) {
      expect(result.extractions).toEqual([]);
    }
  });

  it("should prioritize custom model over modelType when both provided", async () => {
    const customModel = new MockCustomLanguageModel([
      JSON.stringify({
        extractions: [
          {
            extractionClass: "custom",
            extractionText: "from custom model"
          }
        ]
      })
    ]);

    const result = await extract("Test text", {
      languageModel: customModel,
      modelType: "gemini", // This should be ignored
      apiKey: "dummy-key", // This should be ignored
      examples: mockExamples
    });

    expect(result).toBeDefined();
    expect(customModel.getCallCount()).toBeGreaterThan(0);
  });
});