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
 * OpenAI language model provider.
 */

import axios, { AxiosResponse } from "axios";

import { ScoredOutput, FormatType } from "../types";
import { Constraint, GeminiSchema } from "../schema";
import { BaseLanguageModel, InferenceOptions } from "./base";
import { ProviderMetadata, ProviderConfig, ProviderRegistry } from "./registry";

export const OPENAI_METADATA: ProviderMetadata = {
  name: "openai",
  displayName: "OpenAI",
  priority: 90,
  supportsSchema: true,
  requiresApiKey: true,
  defaultModel: "gpt-4o-mini",
};

export interface OpenAIConfig {
  model: string;
  apiKey: string;
  openAISchema?: GeminiSchema; // Reusing GeminiSchema for consistency
  formatType: FormatType;
  temperature: number;
  maxWorkers: number;
  baseURL?: string;
  maxTokens?: number;
  timeout?: number;
}

export class OpenAILanguageModel implements BaseLanguageModel {
  readonly providerName = "openai";
  readonly supportsSchema = true;

  private config: OpenAIConfig;
  private constraint: Constraint;

  constructor(config: Partial<OpenAIConfig | ProviderConfig> = {}) {
    this.config = {
      model: (config as ProviderConfig).modelId || (config as OpenAIConfig).model || "gpt-4o-mini",
      apiKey: config.apiKey || "",
      formatType: (config as OpenAIConfig).formatType || FormatType.JSON,
      temperature: config.temperature ?? 0.0,
      maxWorkers: config.maxWorkers ?? 10,
      baseURL: config.baseURL || "https://api.openai.com/v1",
      maxTokens: config.maxTokens ?? 2048,
      timeout: config.timeout ?? 30000,
      openAISchema: (config as OpenAIConfig).openAISchema || (config as ProviderConfig).geminiSchema,
    };
    this.constraint = { constraintType: "none" as any };
  }

  async infer(batchPrompts: string[], options: InferenceOptions = {}): Promise<ScoredOutput[][]> {
    // Use parallel processing for batches larger than 1
    if (batchPrompts.length > 1 && this.config.maxWorkers > 1) {
      const promises: Promise<ScoredOutput[]>[] = [];

      for (const prompt of batchPrompts) {
        promises.push(
          this.processSinglePrompt(prompt, options)
            .then((result) => [result])
            .catch(() => {
              return [{ score: 0, output: undefined }];
            })
        );
      }

      // Process all prompts concurrently
      return await Promise.all(promises);
    } else {
      // Sequential processing for single prompt or when maxWorkers is 1
      const results: ScoredOutput[][] = [];

      for (const prompt of batchPrompts) {
        try {
          const result = await this.processSinglePrompt(prompt, options);
          results.push([result]);
        } catch {
          results.push([{ score: 0, output: undefined }]);
        }
      }

      return results;
    }
  }

  private async processSinglePrompt(prompt: string, options: InferenceOptions): Promise<ScoredOutput> {
    const config = {
      temperature: options.temperature ?? this.config.temperature,
      maxTokens: options.maxDecodeSteps ?? this.config.maxTokens ?? 2048,
      ...options,
    };

    try {
      const response = await this.callOpenAIAPI(prompt, config);
      return {
        score: 1.0,
        output: response,
      };
    } catch (error) {
      throw new Error(`Failed to get response from OpenAI: ${error}`);
    }
  }

  private async callOpenAIAPI(prompt: string, config: any): Promise<string> {
    const url = `${this.config.baseURL}/chat/completions`;

    const requestBody: any = {
      model: this.config.model,
      messages: [
        {
          role: "user",
          content: prompt + "\n\n" + "Return the response in JSON format.",
        },
      ],
      temperature: config.temperature,
      max_tokens: config.maxTokens,
    };

    // Add JSON response format when formatType is JSON
    // OpenAI requires the word "json" in the prompt when using response_format: { type: "json_object" }
    if (this.config.formatType === FormatType.JSON) {
      requestBody.response_format = { type: "json_object" };
    }

    // Add function calling for schema enforcement if schema is available
    if (this.config.openAISchema) {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "extract_data",
            description: "Extract structured data from the text according to the schema",
            parameters: this.config.openAISchema.schemaDict,
          },
        },
      ];
      requestBody.tool_choice = {
        type: "function",
        function: { name: "extract_data" },
      };
    }

    try {
      const response: AxiosResponse = await axios.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        timeout: this.config.timeout,
      });

      if (response.data.choices && response.data.choices[0]?.message?.content) {
        return response.data.choices[0].message.content;
      } else if (response.data.choices && response.data.choices[0]?.message?.tool_calls) {
        // Handle function call response
        const toolCall = response.data.choices[0].message.tool_calls[0];
        if (toolCall && toolCall.function && toolCall.function.arguments) {
          return toolCall.function.arguments;
        }
      }

      throw new Error("Invalid response format from OpenAI API");
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error as Error;
    }
  }

  parseOutput(output: string): any {
    try {
      if (this.config.formatType === FormatType.JSON) {
        return JSON.parse(output);
      } else {
        // For YAML, you would need a YAML parser
        // For now, return the raw output
        return output;
      }
    } catch (error) {
      throw new Error(`Failed to parse output: ${error}`);
    }
  }
}

// Register the OpenAI provider
const openaiFactory = {
  metadata: OPENAI_METADATA,
  createModel: (config: ProviderConfig) => new OpenAILanguageModel(config),
};

// Only register if not already registered (for hot-reloading scenarios)
if (!ProviderRegistry.has("openai")) {
  ProviderRegistry.register(openaiFactory);
}
