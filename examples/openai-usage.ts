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
 * Example demonstrating OpenAI integration with LangExtract.
 *
 * This example shows how to use OpenAI models (like GPT-4) for structured
 * information extraction with JSON schema enforcement.
 */

import { extract, OpenAILanguageModel, FormatType, ExampleData } from "../src";

// Example 1: Basic OpenAI usage with the main extract function
async function basicOpenAIExtraction() {
  console.log("=== Basic OpenAI Extraction ===");

  const examples: ExampleData[] = [
    {
      text: "John Smith is a doctor at City Hospital. He specializes in cardiology.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "John Smith",
          description: "A person mentioned in the text",
          attributes: {
            profession: "doctor",
            workplace: "City Hospital",
            specialty: "cardiology",
          },
        },
      ],
    },
    {
      text: "Dr. Sarah Johnson works as a pediatrician at Children's Medical Center.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "Sarah Johnson",
          description: "A person mentioned in the text",
          attributes: {
            profession: "pediatrician",
            workplace: "Children's Medical Center",
          },
        },
      ],
    },
  ];

  const text = "Dr. Michael Brown is a neurologist at Memorial Hospital. He has been practicing for 15 years.";

  try {
    const result = await extract(text, {
      promptDescription: "Extract information about medical professionals mentioned in the text",
      examples,
      modelType: "openai",
      modelId: "gpt-4o-mini", // or "gpt-4", "gpt-3.5-turbo", etc.
      apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key",
      formatType: FormatType.JSON,
      temperature: 0.1,
      useSchemaConstraints: true,
      debug: true,
    });

    console.log("Extraction result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Extraction failed:", error);
  }
}

// Example 2: Direct OpenAI language model usage
async function directOpenAIModelUsage() {
  console.log("\n=== Direct OpenAI Model Usage ===");

  const model = new OpenAILanguageModel({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key",
    formatType: FormatType.JSON,
    temperature: 0.0,
    baseURL: "https://api.openai.com/v1", // Optional: for custom endpoints
  });

  const prompt = `Extract the following information from this text in JSON format:

Text: "Apple Inc. was founded by Steve Jobs and Steve Wozniak in 1976. The company is headquartered in Cupertino, California."

Please extract:
- Company name
- Founders
- Founded year
- Headquarters location

Respond with a JSON object containing these fields.`;

  try {
    const results = await model.infer([prompt]);
    console.log("Raw model response:", results[0][0].output);

    // Parse the JSON response
    const parsed = model.parseOutput(results[0][0].output!);
    console.log("Parsed result:", parsed);
  } catch (error) {
    console.error("Model inference failed:", error);
  }
}

// Example 3: OpenAI with custom schema
async function openAIWithCustomSchema() {
  console.log("\n=== OpenAI with Custom Schema ===");

  const { GeminiSchemaImpl } = await import("../src/schema");

  // Create a custom schema for book information
  const bookSchema = new GeminiSchemaImpl({
    type: "object",
    properties: {
      title: { type: "string" },
      author: { type: "string" },
      publication_year: { type: "number" },
      genre: { type: "string" },
      isbn: { type: "string" },
    },
    required: ["title", "author"],
  });

  const model = new OpenAILanguageModel({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key",
    openAISchema: bookSchema,
    formatType: FormatType.JSON,
    temperature: 0.0,
  });

  const prompt = `Extract book information from this text:

"To Kill a Mockingbird by Harper Lee was published in 1960. This classic novel is categorized as Southern Gothic fiction and has the ISBN 978-0-06-112008-4."`;

  try {
    const results = await model.infer([prompt]);
    console.log("Schema-enforced response:", results[0][0].output);

    const parsed = model.parseOutput(results[0][0].output!);
    console.log("Parsed with schema:", parsed);
  } catch (error) {
    console.error("Schema-based extraction failed:", error);
  }
}

// Example 4: Batch processing with OpenAI
async function openAIBatchProcessing() {
  console.log("\n=== OpenAI Batch Processing ===");

  const model = new OpenAILanguageModel({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY || "your-openai-api-key",
    formatType: FormatType.JSON,
    temperature: 0.0,
  });

  const prompts = [
    "Extract the company name from: Microsoft Corporation is a technology company.",
    "Extract the company name from: Google LLC provides search services.",
    "Extract the company name from: Amazon.com Inc. is an e-commerce giant.",
  ];

  try {
    const results = await model.infer(prompts);

    console.log("Batch processing results:");
    results.forEach((result, index) => {
      console.log(`Prompt ${index + 1}:`, result[0].output);
    });
  } catch (error) {
    console.error("Batch processing failed:", error);
  }
}

// Example 5: Error handling with OpenAI
async function openAIErrorHandling() {
  console.log("\n=== OpenAI Error Handling ===");

  const model = new OpenAILanguageModel({
    model: "gpt-4o-mini",
    apiKey: "invalid-api-key", // This will cause an error
    formatType: FormatType.JSON,
    temperature: 0.0,
  });

  try {
    const results = await model.infer(["Test prompt"]);
    console.log("Unexpected success:", results);
  } catch (error) {
    console.log("Expected error caught:", error instanceof Error ? error.message : error);
  }
}

// Run all examples
async function runAllExamples() {
  console.log("OpenAI Integration Examples\n");

  await basicOpenAIExtraction();
  await directOpenAIModelUsage();
  await openAIWithCustomSchema();
  await openAIBatchProcessing();
  await openAIErrorHandling();

  console.log("\n=== Examples Complete ===");
}

// Export for use in other files
export { basicOpenAIExtraction, directOpenAIModelUsage, openAIWithCustomSchema, openAIBatchProcessing, openAIErrorHandling, runAllExamples };

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
