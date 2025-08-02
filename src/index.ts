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
  } = options;

  if (!examples || examples.length === 0) {
    throw new Error("Examples are required for reliable extraction. Please provide at least one ExampleData object with sample extractions.");
  }

  if (!apiKey) {
    throw new Error("API key must be provided for cloud-hosted models via the apiKey parameter or the LANGEXTRACT_API_KEY environment variable");
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

  // Create language model based on modelType
  let languageModel: BaseLanguageModel;

  switch (modelType) {
    case "openai":
      languageModel = new OpenAILanguageModel({
        model: modelId,
        apiKey,
        openAISchema: geminiSchema,
        formatType,
        temperature,
        maxWorkers,
        baseURL,
      });
      break;
    case "ollama":
      languageModel = new OllamaLanguageModel({
        model: modelId,
        modelUrl: modelUrl || "http://localhost:11434",
        structuredOutputFormat: formatType === FormatType.JSON ? "json" : "yaml",
        temperature,
      });
      break;
    case "gemini":
    default:
      languageModel = new GeminiLanguageModel({
        modelId,
        apiKey,
        geminiSchema,
        formatType,
        temperature,
        maxWorkers,
        modelUrl,
      });
      break;
  }

  // Create resolver
  const resolver = new Resolver({
    fenceOutput,
    formatType,
    extractionAttributesSuffix: "_attributes",
  });

  // Create annotator
  const annotator = new Annotator(languageModel, promptTemplate, {
    formatType,
    fenceOutput,
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
