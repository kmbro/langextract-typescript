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
 * Google Gemini language model provider.
 */

import axios, { AxiosResponse } from "axios";

import { ScoredOutput, FormatType } from "../types";
import { Constraint, GeminiSchema } from "../schema";
import { BaseLanguageModel, InferenceOptions } from "./base";
import { ProviderMetadata, ProviderConfig, ProviderRegistry } from "./registry";

export const GEMINI_METADATA: ProviderMetadata = {
  name: "gemini",
  displayName: "Google Gemini",
  priority: 100,
  supportsSchema: true,
  requiresApiKey: true,
  defaultModel: "gemini-2.5-flash",
};

export interface GeminiConfig {
  modelId: string;
  apiKey: string;
  geminiSchema?: GeminiSchema;
  formatType: FormatType;
  temperature: number;
  maxWorkers: number;
  modelUrl?: string;
  maxTokens?: number;
  timeout?: number;
}

export class GeminiLanguageModel implements BaseLanguageModel {
  readonly providerName = "gemini";
  readonly supportsSchema = true;

  private config: GeminiConfig;
  private constraint: Constraint;

  constructor(config: Partial<GeminiConfig | ProviderConfig> = {}) {
    this.config = {
      modelId: (config as ProviderConfig).modelId || "gemini-2.5-flash",
      apiKey: config.apiKey || "",
      formatType: (config as GeminiConfig).formatType || FormatType.JSON,
      temperature: config.temperature ?? 0.0,
      maxWorkers: config.maxWorkers ?? 10,
      maxTokens: config.maxTokens ?? 2048,
      timeout: config.timeout ?? 30000,
      modelUrl: config.modelUrl,
      geminiSchema: config.geminiSchema,
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
      maxOutputTokens: options.maxDecodeSteps ?? this.config.maxTokens ?? 2048,
      ...options,
    };

    try {
      const response = await this.callGeminiAPI(prompt, config);
      return {
        score: 1.0,
        output: response,
      };
    } catch (error) {
      throw new Error(`Failed to get response from Gemini: ${error}`);
    }
  }

  private async callGeminiAPI(prompt: string, config: any): Promise<string> {
    const baseUrl = this.config.modelUrl || "https://generativelanguage.googleapis.com";
    const url = `${baseUrl}/v1beta/models/${this.config.modelId}:generateContent`;

    const requestBody: any = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxOutputTokens,
      },
    };

    // Add schema if available
    if (this.config.geminiSchema) {
      requestBody.generationConfig.responseSchema = this.config.geminiSchema.schemaDict;
    }

    try {
      const response: AxiosResponse = await axios.post(url, requestBody, {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.config.apiKey,
        },
        timeout: this.config.timeout,
      });

      if (response.data.candidates && response.data.candidates[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
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

// Register the Gemini provider
const geminiFactory = {
  metadata: GEMINI_METADATA,
  createModel: (config: ProviderConfig) => new GeminiLanguageModel(config),
};

// Only register if not already registered (for hot-reloading scenarios)
if (!ProviderRegistry.has("gemini")) {
  ProviderRegistry.register(geminiFactory);
}
