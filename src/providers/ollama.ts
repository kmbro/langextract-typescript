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
 * Ollama language model provider for local models.
 */

import axios, { AxiosResponse } from "axios";

import { ScoredOutput } from "../types";
import { Constraint } from "../schema";
import { BaseLanguageModel, InferenceOptions } from "./base";
import { ProviderMetadata, ProviderConfig, ProviderRegistry } from "./registry";

export const OLLAMA_METADATA: ProviderMetadata = {
  name: "ollama",
  displayName: "Ollama (Local)",
  priority: 50,
  supportsSchema: false,
  requiresApiKey: false,
  defaultModel: "llama2:latest",
};

export interface OllamaConfig {
  model: string;
  modelUrl: string;
  structuredOutputFormat: string;
  temperature: number;
  maxTokens?: number;
  timeout?: number;
  keepAlive?: string;
}

export class OllamaLanguageModel implements BaseLanguageModel {
  readonly providerName = "ollama";
  readonly supportsSchema = false;

  private config: OllamaConfig;
  private constraint: Constraint;

  constructor(config: Partial<OllamaConfig | ProviderConfig> = {}) {
    this.config = {
      model: (config as ProviderConfig).modelId || (config as OllamaConfig).model || "gemma2:latest",
      modelUrl: config.modelUrl || "http://localhost:11434",
      structuredOutputFormat: (config as OllamaConfig).structuredOutputFormat || "json",
      temperature: config.temperature ?? 0.8,
      maxTokens: config.maxTokens ?? 2048,
      timeout: config.timeout ?? 120000, // 120s default for local models
      keepAlive: (config as OllamaConfig).keepAlive || "5m",
    };
    this.constraint = { constraintType: "none" as any };
  }

  async infer(batchPrompts: string[], options: InferenceOptions = {}): Promise<ScoredOutput[][]> {
    // Note: Ollama typically runs locally, so we don't need as much parallelism as cloud APIs
    // but we still implement it for consistency
    if (batchPrompts.length > 1) {
      const promises: Promise<ScoredOutput[]>[] = [];

      for (const prompt of batchPrompts) {
        promises.push(
          this.ollamaQuery(prompt, options)
            .then((result) => [{ score: 1.0, output: result.response }])
            .catch(() => {
              return [{ score: 0, output: undefined }];
            })
        );
      }

      // Process all prompts concurrently
      return await Promise.all(promises);
    } else {
      // Sequential processing for single prompt
      const results: ScoredOutput[][] = [];

      for (const prompt of batchPrompts) {
        try {
          const result = await this.ollamaQuery(prompt, options);
          results.push([{ score: 1.0, output: result.response }]);
        } catch {
          results.push([{ score: 0, output: undefined }]);
        }
      }

      return results;
    }
  }

  private async ollamaQuery(prompt: string, options: InferenceOptions = {}): Promise<any> {
    const requestBody = {
      model: this.config.model,
      prompt,
      temperature: options.temperature ?? this.config.temperature,
      stream: false,
      format: this.config.structuredOutputFormat,
      num_predict: options.maxDecodeSteps ?? this.config.maxTokens ?? 2048,
      keep_alive: this.config.keepAlive,
    };

    try {
      const response: AxiosResponse = await axios.post(`${this.config.modelUrl}/api/generate`, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: this.config.timeout,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.response?.data?.error || error.message}`);
      }
      throw error as Error;
    }
  }
}

// Register the Ollama provider
const ollamaFactory = {
  metadata: OLLAMA_METADATA,
  createModel: (config: ProviderConfig) => new OllamaLanguageModel(config),
};

// Only register if not already registered (for hot-reloading scenarios)
if (!ProviderRegistry.has("ollama")) {
  ProviderRegistry.register(ollamaFactory);
}
