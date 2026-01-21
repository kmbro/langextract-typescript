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
 * Provider registry for managing language model providers.
 */

import { BaseLanguageModel } from "./base";
import type { GeminiSchema } from "../schema";

/**
 * Configuration options passed to provider factories.
 */
export interface ProviderConfig {
  apiKey?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  maxWorkers?: number;
  timeout?: number;
  modelUrl?: string;
  baseURL?: string;
  geminiSchema?: GeminiSchema;
  [key: string]: any;
}

/**
 * Metadata describing a provider's capabilities.
 */
export interface ProviderMetadata {
  /** Unique name for the provider (e.g., 'gemini', 'openai') */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Priority for auto-selection (higher = preferred) */
  priority: number;
  /** Whether this provider supports schema-based output constraints */
  supportsSchema: boolean;
  /** Whether this provider requires an API key */
  requiresApiKey: boolean;
  /** Default model ID for this provider */
  defaultModel: string;
}

/**
 * Factory interface for creating language model instances.
 */
export interface ProviderFactory {
  metadata: ProviderMetadata;
  createModel(config: ProviderConfig): BaseLanguageModel;
  getSchemaClass?(): any;
}

/**
 * Central registry for managing language model providers.
 * Providers are registered with their metadata and factories.
 */
export class ProviderRegistry {
  private static providers: Map<string, ProviderFactory> = new Map();

  /**
   * Register a provider factory.
   * @param factory The provider factory to register
   * @throws Error if a provider with the same name is already registered
   */
  static register(factory: ProviderFactory): void {
    const name = factory.metadata.name;
    if (this.providers.has(name)) {
      throw new Error(`Provider '${name}' is already registered`);
    }
    this.providers.set(name, factory);
  }

  /**
   * Get a provider factory by name.
   * @param name The provider name
   * @returns The provider factory, or undefined if not found
   */
  static get(name: string): ProviderFactory | undefined {
    return this.providers.get(name);
  }

  /**
   * Check if a provider is registered.
   * @param name The provider name
   * @returns true if the provider is registered
   */
  static has(name: string): boolean {
    return this.providers.has(name);
  }

  /**
   * List all registered provider metadata.
   * @returns Array of provider metadata
   */
  static list(): ProviderMetadata[] {
    return Array.from(this.providers.values()).map((f) => f.metadata);
  }

  /**
   * Get all provider names.
   * @returns Array of provider names
   */
  static names(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Create a language model instance from a registered provider.
   * @param name The provider name
   * @param config Configuration for the model
   * @returns The created language model instance
   * @throws Error if the provider is not found
   */
  static createModel(name: string, config: ProviderConfig): BaseLanguageModel {
    const factory = this.providers.get(name);
    if (!factory) {
      const available = this.names().join(", ");
      throw new Error(`Unknown provider: ${name}. Available providers: ${available || "none"}`);
    }
    return factory.createModel(config);
  }

  /**
   * Get all provider factories sorted by priority (highest first).
   * @returns Array of provider factories sorted by priority
   */
  static getByPriority(): ProviderFactory[] {
    return Array.from(this.providers.values()).sort((a, b) => b.metadata.priority - a.metadata.priority);
  }

  /**
   * Clear all registered providers.
   * Primarily used for testing.
   */
  static clear(): void {
    this.providers.clear();
  }

  /**
   * Unregister a specific provider.
   * @param name The provider name to unregister
   * @returns true if the provider was unregistered, false if not found
   */
  static unregister(name: string): boolean {
    return this.providers.delete(name);
  }
}

/**
 * Decorator for registering a provider class.
 * @param metadata The provider metadata
 */
export function registerProvider(metadata: ProviderMetadata) {
  return function <T extends { new (...args: any[]): BaseLanguageModel }>(constructor: T) {
    const factory: ProviderFactory = {
      metadata,
      createModel: (config: ProviderConfig) => new constructor(config),
    };
    ProviderRegistry.register(factory);
    return constructor;
  };
}
