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
 * Simple library for performing language model inference.
 */

import axios, { AxiosResponse } from "axios";

import { ScoredOutput, FormatType } from "./types";
import { Constraint, GeminiSchema } from "./schema";

export class InferenceOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InferenceOutputError";
  }
}

/**
 * Base interface for language model implementations.
 * Custom language models must implement this interface to be compatible with LangExtract.
 * 
 * @example
 * // Custom language model implementation
 * class MyCustomModel implements BaseLanguageModel {
 *   async infer(batchPrompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]> {
 *     const results: ScoredOutput[][] = [];
 *     for (const prompt of batchPrompts) {
 *       // Your custom inference logic here
 *       const response = await myModelCall(prompt);
 *       results.push([{ score: 1.0, output: response }]);
 *     }
 *     return results;
 *   }
 * }
 */
export interface BaseLanguageModel {
  /**
   * Perform inference on a batch of prompts.
   * 
   * @param batchPrompts - Array of prompt strings to process
   * @param options - Optional inference parameters like temperature and maxDecodeSteps
   * @returns Promise resolving to an array of arrays of ScoredOutput objects.
   *          The outer array corresponds to each prompt, the inner array contains
   *          one or more scored responses for that prompt.
   */
  infer(batchPrompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]>;
}

export interface InferenceOptions {
  temperature?: number;
  maxDecodeSteps?: number;
  [key: string]: any;
}

export interface GeminiConfig {
  modelId: string;
  apiKey: string;
  geminiSchema?: GeminiSchema;
  formatType: FormatType;
  temperature: number;
  maxWorkers: number;
  modelUrl?: string;
  maxTokens?: number;
}

export interface OpenAIConfig {
  model: string;
  apiKey: string;
  openAISchema?: GeminiSchema; // Reusing GeminiSchema for consistency
  formatType: FormatType;
  temperature: number;
  maxWorkers: number;
  baseURL?: string;
  maxTokens?: number;
}

export class GeminiLanguageModel implements BaseLanguageModel {
  private config: GeminiConfig;
  private constraint: Constraint;

  constructor(config: Partial<GeminiConfig> = {}) {
    this.config = {
      modelId: "gemini-2.5-flash",
      apiKey: "",
      formatType: FormatType.JSON,
      temperature: 0.0,
      maxWorkers: 10,
      maxTokens: 2048,
      ...config,
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
            .then(result => [result])
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
      throw new InferenceOutputError(`Failed to get response from Gemini: ${error}`);
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
        timeout: 30000,
      });

      if (response.data.candidates && response.data.candidates[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("Invalid response format from Gemini API");
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
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

export class OpenAILanguageModel implements BaseLanguageModel {
  private config: OpenAIConfig;
  private constraint: Constraint;

  constructor(config: Partial<OpenAIConfig> = {}) {
    this.config = {
      model: "gpt-4o-mini",
      apiKey: "",
      formatType: FormatType.JSON,
      temperature: 0.0,
      maxWorkers: 10,
      baseURL: "https://api.openai.com/v1",
      maxTokens: 2048,
      ...config,
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
            .then(result => [result])
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
      throw new InferenceOutputError(`Failed to get response from OpenAI: ${error}`);
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
        timeout: 30000,
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
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
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

export interface OllamaConfig {
  model: string;
  modelUrl: string;
  structuredOutputFormat: string;
  temperature: number;
  maxTokens?: number;
}

export class OllamaLanguageModel implements BaseLanguageModel {
  private config: OllamaConfig;
  private constraint: Constraint;

  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      model: "gemma2:latest",
      modelUrl: "http://localhost:11434",
      structuredOutputFormat: "json",
      temperature: 0.8,
      maxTokens: 2048,
      ...config,
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
            .then(result => [{ score: 1.0, output: result.response }])
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
    };

    try {
      const response: AxiosResponse = await axios.post(`${this.config.modelUrl}/api/generate`, requestBody, {
        headers: { "Content-Type": "application/json" },
        timeout: 30000,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Ollama API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }
}
