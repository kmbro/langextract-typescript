/**
 * Copyright 2025 kmbro.
 *
 * Tests for retry utilities.
 */

import {
  withRetry,
  RetryError,
  isRetryable,
  calculateDelay,
  getRetryAfterMs,
  DEFAULT_RETRY_CONFIG,
} from "../../utils/retry";

describe("Retry Utilities", () => {
  describe("withRetry", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should succeed on first attempt", async () => {
      const operation = jest.fn().mockResolvedValue("success");
      const result = await withRetry(operation);

      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should retry on 429 rate limit error", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 429 },
        code: undefined,
      };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue("success");

      const promise = withRetry(operation, { maxRetries: 3 });

      // Fast-forward through delays
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it("should retry on 503 service unavailable", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

      const promise = withRetry(operation);
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on 500 internal server error", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 500 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

      const promise = withRetry(operation);
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on timeout error", async () => {
      const error = new Error("Request timeout");
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

      const promise = withRetry(operation);
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should retry on ECONNABORTED (axios timeout)", async () => {
      const error = {
        isAxiosError: true,
        code: "ECONNABORTED",
        response: undefined,
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValue("success");

      const promise = withRetry(operation);
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe("success");
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it("should NOT retry on 400 bad request", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should NOT retry on 401 unauthorized", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 401 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should NOT retry on 403 forbidden", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 403 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should NOT retry on 404 not found", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 404 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation)).rejects.toEqual(error);
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it("should throw RetryError after max retries exceeded", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      // Start the operation and store the rejection
      let thrownError: Error | undefined;
      const promise = withRetry(operation, { maxRetries: 2, jitter: false }).catch((e) => {
        thrownError = e as Error;
      });

      // Run all timers and let the promise settle
      await jest.runAllTimersAsync();
      await promise;

      expect(thrownError).toBeInstanceOf(RetryError);
      expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("should include attempt count in RetryError", async () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 },
        code: undefined,
      };
      const operation = jest.fn().mockRejectedValue(error);

      // Start the operation and capture the rejection
      let thrownError: Error | undefined;
      const promise = withRetry(operation, { maxRetries: 2, jitter: false }).catch((e) => {
        thrownError = e as Error;
      });

      // Run all timers and let the promise settle
      await jest.runAllTimersAsync();
      await promise;

      expect(thrownError).toBeInstanceOf(RetryError);
      expect((thrownError as RetryError).attempts).toBe(3);
      expect((thrownError as RetryError).lastError).toEqual(error);
    });
  });

  describe("isRetryable", () => {
    it("should return true for 429", () => {
      const error = {
        isAxiosError: true,
        response: { status: 429 },
        code: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return true for 503", () => {
      const error = {
        isAxiosError: true,
        response: { status: 503 },
        code: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return true for ECONNABORTED", () => {
      const error = {
        isAxiosError: true,
        code: "ECONNABORTED",
        response: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return true for ETIMEDOUT", () => {
      const error = {
        isAxiosError: true,
        code: "ETIMEDOUT",
        response: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return true for ECONNREFUSED", () => {
      const error = {
        isAxiosError: true,
        code: "ECONNREFUSED",
        response: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return true for timeout message", () => {
      const error = new Error("Request timed out");
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(true);
    });

    it("should return false for 400", () => {
      const error = {
        isAxiosError: true,
        response: { status: 400 },
        code: undefined,
      };
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(false);
    });

    it("should return false for non-axios errors without timeout", () => {
      const error = new Error("Some other error");
      expect(isRetryable(error, DEFAULT_RETRY_CONFIG.retryableStatusCodes)).toBe(false);
    });
  });

  describe("calculateDelay", () => {
    it("should use exponential backoff", () => {
      // Without jitter
      expect(calculateDelay(0, 1000, 30000, false)).toBe(1000); // 1000 * 2^0
      expect(calculateDelay(1, 1000, 30000, false)).toBe(2000); // 1000 * 2^1
      expect(calculateDelay(2, 1000, 30000, false)).toBe(4000); // 1000 * 2^2
      expect(calculateDelay(3, 1000, 30000, false)).toBe(8000); // 1000 * 2^3
    });

    it("should respect maxDelayMs", () => {
      expect(calculateDelay(10, 1000, 15000, false)).toBe(15000);
      expect(calculateDelay(5, 1000, 5000, false)).toBe(5000);
    });

    it("should add jitter when enabled", () => {
      // With jitter, delay should be between 75% and 125% of base
      const baseDelay = 1000;
      const delays: number[] = [];

      for (let i = 0; i < 100; i++) {
        delays.push(calculateDelay(0, baseDelay, 30000, true));
      }

      // All delays should be within jitter range
      const minExpected = baseDelay * 0.75;
      const maxExpected = baseDelay * 1.25;

      for (const delay of delays) {
        expect(delay).toBeGreaterThanOrEqual(minExpected);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      }

      // There should be some variation (not all the same)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);
    });
  });

  describe("getRetryAfterMs", () => {
    it("should return undefined for non-axios errors", () => {
      const error = new Error("test");
      expect(getRetryAfterMs(error)).toBeUndefined();
    });

    it("should return undefined for axios errors without response", () => {
      const error = {
        isAxiosError: true,
        response: undefined,
      };
      expect(getRetryAfterMs(error)).toBeUndefined();
    });

    it("should return undefined for axios errors without retry-after header", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {},
        },
      };
      expect(getRetryAfterMs(error)).toBeUndefined();
    });

    it("should parse numeric retry-after header (seconds)", () => {
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {
            "retry-after": "60",
          },
        },
      };
      expect(getRetryAfterMs(error)).toBe(60000);
    });

    it("should parse date retry-after header", () => {
      const futureDate = new Date(Date.now() + 30000);
      const error = {
        isAxiosError: true,
        response: {
          status: 429,
          headers: {
            "retry-after": futureDate.toUTCString(),
          },
        },
      };

      const result = getRetryAfterMs(error);
      expect(result).toBeDefined();
      // Should be approximately 30 seconds (with some tolerance for test execution time)
      expect(result).toBeGreaterThan(28000);
      expect(result).toBeLessThan(32000);
    });
  });

  describe("DEFAULT_RETRY_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000);
      expect(DEFAULT_RETRY_CONFIG.jitter).toBe(true);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(429);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(500);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(502);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(503);
      expect(DEFAULT_RETRY_CONFIG.retryableStatusCodes).toContain(504);
    });
  });
});
