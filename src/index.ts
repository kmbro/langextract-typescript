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

// Discriminated union for extract options to enforce API key for cloud models
export type BaseExtractOptions = {
  promptDescription?: string;
  examples?: ExampleData[];
  modelId?: string;
  formatType?: FormatType;
  maxCharBuffer?: number;
  temperature?: number;
  fenceOutput?: boolean;
  useSchemaConstraints?: boolean;
  batchLength?: number;
  maxWorkers?: number;
  additionalContext?: string;
  debug?: boolean;
  extractionPasses?: number;
  maxTokens?: number;
};

export type CloudModelOptions = BaseExtractOptions & {
  modelType?: "gemini" | "openai"; // optional so that default (gemini) still enforces apiKey
  apiKey: string; // required for cloud models
  modelUrl?: string; // optional override for Gemini
  baseURL?: string; // optional override for OpenAI
};

export type OllamaModelOptions = BaseExtractOptions & {
  modelType: "ollama";
  apiKey?: never; // prohibit apiKey for Ollama
  modelUrl: string; // required for Ollama
  baseURL?: never;
};

export type ExtractOptions = CloudModelOptions | OllamaModelOptions;

/**
 * Main extraction function that provides a high-level API for extracting structured information from text.
 */
export async function extract(
  textOrDocuments: string | Document | Document[],
  options: ExtractOptions
): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  const {
    promptDescription = "Extract structured information from the text",
    examples = [],
    modelId = "gemini-2.5-flash",
    // If modelType omitted, default to gemini (cloud)
    modelType = "gemini",
    // apiKey is required for cloud, prohibited for ollama (by types); at runtime may be undefined for ollama branch
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
  } = options as any;

  if (!examples || examples.length === 0) {
    throw new Error("Examples are required for reliable extraction. Please provide at least one ExampleData object with sample extractions.");
  }

  // Require API key for cloud-hosted models only
  if (modelType !== "ollama" && !apiKey) {
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
        maxTokens,
      });
      break;
    case "ollama":
      languageModel = new OllamaLanguageModel({
        model: modelId,
        modelUrl: (modelUrl as string) || "http://localhost:11434",
        structuredOutputFormat: formatType === FormatType.JSON ? "json" : "yaml",
        temperature,
        maxTokens,
      });
      break;
    case "gemini":
    default:
      languageModel = new GeminiLanguageModel({
        modelId,
        apiKey: apiKey as string,
        geminiSchema,
        formatType,
        temperature,
        maxWorkers,
        modelUrl,
        maxTokens,
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
