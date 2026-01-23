/**
 * Copyright 2025 kmbro.
 *
 * Configuration module for langextract.
 * Supports environment variables and runtime configuration.
 */

/**
 * Environment variable names used by langextract.
 */
export const ENV_VARS = {
  API_KEY: "LANGEXTRACT_API_KEY",
  DEBUG: "LANGEXTRACT_DEBUG",
  MODEL_TYPE: "LANGEXTRACT_MODEL_TYPE",
  GEMINI_API_KEY: "GEMINI_API_KEY",
  GOOGLE_API_KEY: "GOOGLE_API_KEY",
  OPENAI_API_KEY: "OPENAI_API_KEY",
  OLLAMA_URL: "OLLAMA_URL",
} as const;

/**
 * Configuration interface for langextract.
 */
export interface LangExtractConfig {
  /** API key for the model provider */
  apiKey?: string;
  /** Enable debug logging */
  debug: boolean;
  /** Default model type */
  modelType?: string;
}

/**
 * Get a string environment variable.
 */
export function getEnvString(key: string, defaultValue?: string): string | undefined {
  const value = process.env[key];
  return value !== undefined ? value : defaultValue;
}

/**
 * Get a boolean environment variable.
 */
export function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Get the API key from environment variables.
 * Checks multiple possible environment variable names.
 */
export function getApiKeyFromEnv(modelType?: string): string | undefined {
  // First check LANGEXTRACT_API_KEY
  let apiKey = getEnvString(ENV_VARS.API_KEY);
  if (apiKey) return apiKey;

  // Then check provider-specific keys based on model type
  if (modelType) {
    if (modelType.toLowerCase().includes("gemini")) {
      apiKey = getEnvString(ENV_VARS.GEMINI_API_KEY) || getEnvString(ENV_VARS.GOOGLE_API_KEY);
      if (apiKey) return apiKey;
    }
    if (modelType.toLowerCase().includes("openai") || modelType.toLowerCase().includes("gpt")) {
      apiKey = getEnvString(ENV_VARS.OPENAI_API_KEY);
      if (apiKey) return apiKey;
    }
  }

  // Fallback to checking all provider-specific keys
  return (
    getEnvString(ENV_VARS.GEMINI_API_KEY) ||
    getEnvString(ENV_VARS.GOOGLE_API_KEY) ||
    getEnvString(ENV_VARS.OPENAI_API_KEY)
  );
}

/**
 * Get the default configuration from environment variables.
 */
export function getDefaultConfig(): LangExtractConfig {
  return {
    apiKey: getApiKeyFromEnv(),
    debug: getEnvBool(ENV_VARS.DEBUG, false),
    modelType: getEnvString(ENV_VARS.MODEL_TYPE),
  };
}

/**
 * Merge user-provided config with environment defaults.
 * User-provided values take precedence.
 */
export function mergeWithEnvConfig(userConfig: Partial<LangExtractConfig>): LangExtractConfig {
  const envConfig = getDefaultConfig();
  return {
    apiKey: userConfig.apiKey ?? envConfig.apiKey,
    debug: userConfig.debug ?? envConfig.debug,
    modelType: userConfig.modelType ?? envConfig.modelType,
  };
}
