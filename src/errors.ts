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
 * Enhanced error classes for LangExtract.
 */

/**
 * Base error class for all LangExtract errors.
 */
export class LangExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LangExtractError";
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error from a language model provider.
 */
export class ProviderError extends LangExtractError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Error when rate limit is exceeded (HTTP 429).
 */
export class RateLimitError extends ProviderError {
  constructor(provider: string, public readonly retryAfterMs?: number) {
    const message = retryAfterMs
      ? `Rate limit exceeded for ${provider}. Retry after ${retryAfterMs}ms`
      : `Rate limit exceeded for ${provider}`;
    super(message, provider, 429);
    this.name = "RateLimitError";
  }
}

/**
 * Error when a request times out.
 */
export class TimeoutError extends ProviderError {
  constructor(provider: string, public readonly timeoutMs: number) {
    super(`Request to ${provider} timed out after ${timeoutMs}ms`, provider);
    this.name = "TimeoutError";
  }
}

/**
 * Error when authentication fails (HTTP 401/403).
 */
export class AuthenticationError extends ProviderError {
  constructor(provider: string, message?: string) {
    super(message || `Authentication failed for ${provider}. Check your API key.`, provider, 401);
    this.name = "AuthenticationError";
  }
}

/**
 * Error when parsing resolver output fails.
 */
export class ResolverParsingError extends LangExtractError {
  constructor(
    message: string,
    public readonly rawOutput?: string,
    public readonly parseError?: Error
  ) {
    super(message);
    this.name = "ResolverParsingError";
  }

  /**
   * Creates a detailed error message for debugging.
   */
  toDetailedString(): string {
    let details = this.message;
    if (this.rawOutput) {
      const truncated =
        this.rawOutput.length > 200 ? this.rawOutput.substring(0, 200) + "..." : this.rawOutput;
      details += `\nRaw output: ${truncated}`;
    }
    if (this.parseError) {
      details += `\nParse error: ${this.parseError.message}`;
    }
    return details;
  }
}

/**
 * Error when input validation fails.
 */
export class ValidationError extends LangExtractError {
  constructor(message: string, public readonly field: string, public readonly value?: unknown) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Error when a provider is not found in the registry.
 */
export class ProviderNotFoundError extends LangExtractError {
  constructor(providerName: string, availableProviders: string[]) {
    const available = availableProviders.length > 0 ? availableProviders.join(", ") : "none";
    super(`Provider '${providerName}' not found. Available providers: ${available}`);
    this.name = "ProviderNotFoundError";
  }
}

/**
 * Error when configuration is invalid.
 */
export class ConfigurationError extends LangExtractError {
  constructor(message: string, public readonly configKey?: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}
