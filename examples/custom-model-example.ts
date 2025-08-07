/**
 * Example demonstrating how to use a custom language model implementation with LangExtract.
 * 
 * This example shows how to create a custom language model that implements the BaseLanguageModel interface
 * and use it with the extract function.
 */

import { extract, BaseLanguageModel, InferenceOptions, ScoredOutput, ExampleData } from "../src/index";

/**
 * Example custom language model implementation.
 * This is a simple mock implementation for demonstration purposes.
 * In a real-world scenario, you would implement your own inference logic
 * that calls your actual language model service.
 */
class CustomLanguageModel implements BaseLanguageModel {
  private modelName: string;
  private customConfig: any;

  constructor(config: { modelName?: string; [key: string]: any } = {}) {
    this.modelName = config.modelName || "my-custom-model";
    this.customConfig = config;
  }

  async infer(batchPrompts: string[], options: InferenceOptions = {}): Promise<ScoredOutput[][]> {
    console.log(`Custom model ${this.modelName} processing ${batchPrompts.length} prompts`);
    
    const results: ScoredOutput[][] = [];

    for (const prompt of batchPrompts) {
      try {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 100));

        // This is where you would implement your actual model inference
        // For example, calling your custom API, local model, or other service
        const response = await this.customInference(prompt, options);

        results.push([{
          score: 1.0,
          output: response
        }]);
      } catch (error) {
        console.error("Error in custom model inference:", error);
        results.push([{
          score: 0.0,
          output: undefined
        }]);
      }
    }

    return results;
  }

  /**
   * Your custom inference implementation would go here.
   * This is just a mock implementation that returns a structured JSON response.
   */
  private async customInference(prompt: string, options: InferenceOptions): Promise<string> {
    // Mock response - in reality, you would call your model here
    // The response should be in JSON format matching the expected extraction format
    
    // Simple pattern matching for demonstration
    if (prompt.toLowerCase().includes("person") || prompt.toLowerCase().includes("name")) {
      return JSON.stringify({
        extractions: [
          {
            extractionClass: "person",
            extractionText: "John Doe",
            description: "A person mentioned in the text"
          }
        ]
      });
    } else if (prompt.toLowerCase().includes("date") || prompt.toLowerCase().includes("time")) {
      return JSON.stringify({
        extractions: [
          {
            extractionClass: "date",
            extractionText: "2024-01-15",
            description: "A date mentioned in the text"
          }
        ]
      });
    } else {
      return JSON.stringify({
        extractions: []
      });
    }
  }
}

/**
 * Example usage of custom language model with LangExtract
 */
async function demonstrateCustomModel() {
  console.log("🚀 Starting custom language model demonstration...\n");

  // Create your custom language model instance
  const customModel = new CustomLanguageModel({
    modelName: "demo-custom-model",
    customParameter: "example-value"
  });

  // Define examples to guide the extraction
  const examples: ExampleData[] = [
    {
      text: "John Smith visited the office on January 15th, 2024.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "John Smith"
        },
        {
          extractionClass: "date", 
          extractionText: "January 15th, 2024"
        }
      ]
    }
  ];

  // Text to extract information from
  const textToAnalyze = "Sarah Johnson met with the team on March 3rd, 2024 to discuss the project timeline.";

  try {
    console.log("📝 Analyzing text:", textToAnalyze);
    console.log("\n🔍 Using custom language model for extraction...\n");

    // Use the custom model with LangExtract
    const result = await extract(textToAnalyze, {
      languageModel: customModel,  // 👈 Pass your custom model here
      promptDescription: "Extract people and dates from the text",
      examples: examples,
      formatType: "json" as any,
      debug: true
    });

    console.log("✅ Extraction completed!");
    console.log("\n📊 Results:");
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error("❌ Error during extraction:", error);
  }
}

/**
 * Example showing how to integrate with a real language model service
 */
class ExternalAPILanguageModel implements BaseLanguageModel {
  private apiKey: string;
  private baseUrl: string;

  constructor(config: { apiKey: string; baseUrl: string }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
  }

  async infer(batchPrompts: string[], options: InferenceOptions = {}): Promise<ScoredOutput[][]> {
    // Example integration with external API
    // Replace this with your actual API integration
    
    const results: ScoredOutput[][] = [];

    for (const prompt of batchPrompts) {
      try {
        // Example API call structure
        const response = await fetch(`${this.baseUrl}/v1/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            prompt: prompt,
            max_tokens: options.maxDecodeSteps || 1000,
            temperature: options.temperature || 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        const output = data.choices?.[0]?.text || data.response || "";

        results.push([{
          score: 1.0,
          output: output
        }]);

      } catch (error) {
        console.error("API call failed:", error);
        results.push([{
          score: 0.0,
          output: undefined
        }]);
      }
    }

    return results;
  }
}

// Run the demonstration
if (require.main === module) {
  demonstrateCustomModel().catch(console.error);
}

export { CustomLanguageModel, ExternalAPILanguageModel };