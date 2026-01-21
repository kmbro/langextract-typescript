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
 * Base interfaces for language model providers.
 */

import { ScoredOutput } from "../types";

/**
 * Configuration for retry behavior on transient errors.
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

/**
 * Options for inference operations.
 */
export interface InferenceOptions {
  temperature?: number;
  maxDecodeSteps?: number;
  timeout?: number;
  retryConfig?: RetryConfig;
  [key: string]: any;
}

/**
 * Base interface that all language model providers must implement.
 */
export interface BaseLanguageModel {
  /** The name of the provider (e.g., 'gemini', 'openai', 'ollama') */
  readonly providerName: string;

  /** Whether this provider supports schema-based output constraints */
  readonly supportsSchema: boolean;

  /**
   * Perform inference on a batch of prompts.
   * @param batchPrompts Array of prompts to process
   * @param options Optional inference configuration
   * @returns Array of scored outputs for each prompt
   */
  infer(batchPrompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]>;
}
