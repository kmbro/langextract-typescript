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
 * Retry utilities with exponential backoff for handling transient errors.
 */

import { AxiosError } from "axios";

/**
 * Configuration for retry behavior.
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes: number[];
  /** Whether to add jitter to delays (default: true) */
  jitter: boolean;
}

/**
 * Default retry configuration.
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  jitter: true,
};

/**
 * Error thrown when all retry attempts have been exhausted.
 */
export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = "RetryError";
  }
}

/**
 * Executes an operation with retry logic and exponential backoff.
 *
 * @param operation - The async operation to execute
 * @param config - Retry configuration (uses defaults if not provided)
 * @returns The result of the operation
 * @throws RetryError if all retries are exhausted
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const { maxRetries, baseDelayMs, maxDelayMs, retryableStatusCodes, jitter } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      if (!isRetryable(error, retryableStatusCodes)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, baseDelayMs, maxDelayMs, jitter);
        await sleep(delay);
      }
    }
  }

  throw new RetryError(`Operation failed after ${maxRetries + 1} attempts`, maxRetries + 1, lastError!);
}

/**
 * Checks if an error should trigger a retry.
 */
export function isRetryable(error: unknown, retryableStatusCodes: number[]): boolean {
  // Check for Axios errors with status codes
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && retryableStatusCodes.includes(status)) {
      return true;
    }
    // Network errors (no response) - connection refused, timeout, etc.
    if (!error.response) {
      // ECONNABORTED is axios timeout
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.code === "ECONNREFUSED") {
        return true;
      }
    }
  }

  // Check for timeout errors by message
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    if (message.includes("timeout") || message.includes("timed out") || message.includes("econnaborted")) {
      return true;
    }
  }

  return false;
}

/**
 * Type guard for Axios errors.
 */
export function isAxiosError(error: unknown): error is AxiosError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isAxiosError" in error &&
    (error as { isAxiosError: boolean }).isAxiosError === true
  );
}

/**
 * Calculates the delay for a retry attempt using exponential backoff.
 *
 * @param attempt - The current attempt number (0-indexed)
 * @param baseDelayMs - The base delay in milliseconds
 * @param maxDelayMs - The maximum delay in milliseconds
 * @param jitter - Whether to add random jitter
 * @returns The delay in milliseconds
 */
export function calculateDelay(
  attempt: number,
  baseDelayMs: number,
  maxDelayMs: number,
  jitter: boolean
): number {
  // Exponential backoff: base * 2^attempt
  let delay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter (±25%)
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay *= jitterFactor;
  }

  return Math.min(delay, maxDelayMs);
}

/**
 * Sleep for a specified number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extracts the Retry-After header value from an error response.
 *
 * @param error - The error to check
 * @returns The retry delay in milliseconds, or undefined if not available
 */
export function getRetryAfterMs(error: unknown): number | undefined {
  if (!isAxiosError(error) || !error.response) {
    return undefined;
  }

  const retryAfter = error.response.headers?.["retry-after"];
  if (!retryAfter) {
    return undefined;
  }

  // Retry-After can be a number (seconds) or a date string
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }

  // Try parsing as a date
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return undefined;
}
