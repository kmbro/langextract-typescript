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
 *
 * This module provides backward compatibility with the original inference API.
 * New code should prefer importing directly from './providers'.
 *
 * @deprecated Import from './providers' instead for the new plugin-based architecture.
 */

// Re-export all providers for backward compatibility
export {
  BaseLanguageModel,
  InferenceOptions,
  GeminiLanguageModel,
  GeminiConfig,
  OpenAILanguageModel,
  OpenAIConfig,
  OllamaLanguageModel,
  OllamaConfig,
} from "./providers";

/**
 * Error thrown when inference output is invalid or unparseable.
 */
export class InferenceOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InferenceOutputError";
  }
}
