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
 * LangExtract TypeScript: A TypeScript library for extracting structured and grounded information from text using LLMs.
 * Translated from the original Python implementation by Google LLC.
 */

// Core types and enums
export * from "./types";

// Schema definitions
export * from "./schema";

// Tokenization utilities
export * from "./tokenizer";

// Prompt generation
export * from "./prompting";

// Language model inference
export * from "./inference";

// Output resolution
export * from "./resolver";

// Annotation pipeline
export * from "./annotation";

// Visualization utilities
export * from "./visualization";

// Main extraction function
import { Document, AnnotatedDocument, ExampleData, FormatType } from "./types";
import { GeminiLanguageModel, OllamaLanguageModel, OpenAILanguageModel, BaseLanguageModel } from "./inference";
import { PromptTemplateStructured } from "./prompting";
import { Resolver } from "./resolver";
import { Annotator } from "./annotation";
import { GeminiSchemaImpl } from "./schema";

export type ModelType = "gemini" | "openai" | "ollama";

/**
 * Main extraction function that provides a high-level API for extracting structured information from text.
 * 
 * @param textOrDocuments - The input text(s) to extract information from
 * @param options - Configuration options for the extraction
 * @param options.languageModel - Optional custom language model implementation. If provided, this will be used instead of creating a built-in model.
 *                                 Must implement the BaseLanguageModel interface with an `infer` method that takes batch prompts and returns ScoredOutput[][].
 * @param options.promptDescription - Description of what to extract
 * @param options.examples - Example extractions to guide the model
 * @param options.modelType - Type of built-in model to use when languageModel is not provided ("gemini" | "openai" | "ollama")
 * @param options.apiKey - API key for cloud models (required when using built-in models)
 * @returns Promise resolving to annotated document(s) with extracted information
 * 
 * @example
 * // Using a custom language model
 * const customModel: BaseLanguageModel = {
 *   async infer(prompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]> {
 *     // Your custom implementation here
 *     return prompts.map(prompt => [{ score: 1.0, output: "your response" }]);
 *   }
 * };
 * 
 * const result = await extract("Some text to analyze", {
 *   languageModel: customModel,
 *   examples: [{ text: "example", extractions: [] }]
 * });
 */
export async function extract(
  textOrDocuments: string | Document | Document[],
  options: {
    promptDescription?: string;
    examples?: ExampleData[];
    modelId?: string;
    modelType?: ModelType;
    apiKey?: string;
    formatType?: FormatType;
    maxCharBuffer?: number;
    temperature?: number;
    fenceOutput?: boolean;
    useSchemaConstraints?: boolean;
    batchLength?: number;
    maxWorkers?: number;
    additionalContext?: string;
    debug?: boolean;
    modelUrl?: string;
    baseURL?: string;
    extractionPasses?: number;
    maxTokens?: number;
    languageModel?: BaseLanguageModel;
  } = {}
): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  const {
    promptDescription = "Extract structured information from the text",
    examples = [],
    modelId = "gemini-2.5-flash",
    modelType = "gemini",
    apiKey,
    formatType = FormatType.JSON,
    maxCharBuffer = 1000,
    temperature = 0.5,
    fenceOutput = false,
    useSchemaConstraints = true,
    batchLength = 10,
    maxWorkers = 10,
    additionalContext,
    debug = true,
    modelUrl,
    baseURL,
    extractionPasses = 1,
    maxTokens,
    languageModel,
  } = options;

  if (!examples || examples.length === 0) {
    throw new Error("Examples are required for reliable extraction. Please provide at least one ExampleData object with sample extractions.");
  }

  // Create prompt template
  const promptTemplate: PromptTemplateStructured = {
    description: promptDescription,
    examples,
  };

  // Generate schema constraints if enabled
  let geminiSchema;
  if (useSchemaConstraints) {
    geminiSchema = GeminiSchemaImpl.fromExamples(examples);
  }

  // Create language model - use custom model if provided, otherwise create based on modelType
  let languageModelInstance: BaseLanguageModel;

  if (languageModel) {
    // Use the provided custom language model
    languageModelInstance = languageModel;
  } else {
    // Validate API key requirement for built-in models
    if (!apiKey) {
      throw new Error("API key must be provided for cloud-hosted models via the apiKey parameter or the LANGEXTRACT_API_KEY environment variable");
    }

    // Create language model based on modelType

    switch (modelType) {
      case "openai":
        languageModelInstance = new OpenAILanguageModel({
          model: modelId,
          apiKey,
          openAISchema: geminiSchema,
          formatType,
          temperature,
          maxWorkers,
          baseURL,
          maxTokens,
        });
        break;
      case "ollama":
        languageModelInstance = new OllamaLanguageModel({
          model: modelId,
          modelUrl: modelUrl || "http://localhost:11434",
          structuredOutputFormat: formatType === FormatType.JSON ? "json" : "yaml",
          temperature,
          maxTokens,
        });
        break;
      case "gemini":
      default:
        languageModelInstance = new GeminiLanguageModel({
          modelId,
          apiKey,
          geminiSchema,
          formatType,
          temperature,
          maxWorkers,
          modelUrl,
          maxTokens,
        });
        break;
    }
  }

  // Create resolver
  const resolver = new Resolver({
    fenceOutput,
    formatType,
    extractionAttributesSuffix: "_attributes",
  });

  // Create annotator
  const annotator = new Annotator(languageModelInstance, promptTemplate, {
    formatType,
    fenceOutput,
    maxTokens,
  });

  // Process input
  if (typeof textOrDocuments === "string") {
    return await annotator.annotateText(textOrDocuments, resolver, {
      maxCharBuffer,
      batchLength,
      additionalContext,
      debug,
      extractionPasses,
    });
  } else if (Array.isArray(textOrDocuments)) {
    return await annotator.annotateDocuments(textOrDocuments, resolver, {
      maxCharBuffer,
      batchLength,
      debug,
      extractionPasses,
    });
  } else {
    return await annotator.annotateDocuments([textOrDocuments], resolver, {
      maxCharBuffer,
      batchLength,
      debug,
      extractionPasses,
    });
  }
}

// Export convenience functions
export { extract as lx };

// Export default
export default {
  extract,
  lx: extract,
};
