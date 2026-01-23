/**
 * Copyright 2025 kmbro.
 *
 * Tests for error classes.
 */

import {
  LangExtractError,
  ProviderError,
  RateLimitError,
  TimeoutError,
  AuthenticationError,
  ResolverParsingError,
  ValidationError,
  ProviderNotFoundError,
  ConfigurationError,
} from "../errors";

describe("Error Classes", () => {
  describe("LangExtractError", () => {
    it("should be an instance of Error", () => {
      const error = new LangExtractError("test message");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(LangExtractError);
    });

    it("should have correct name", () => {
      const error = new LangExtractError("test");
      expect(error.name).toBe("LangExtractError");
    });

    it("should have correct message", () => {
      const error = new LangExtractError("test message");
      expect(error.message).toBe("test message");
    });
  });

  describe("ProviderError", () => {
    it("should include provider name", () => {
      const error = new ProviderError("Test error", "gemini");
      expect(error.provider).toBe("gemini");
    });

    it("should include status code when provided", () => {
      const error = new ProviderError("Test error", "gemini", 500);
      expect(error.statusCode).toBe(500);
    });

    it("should include response when provided", () => {
      const response = { error: "details" };
      const error = new ProviderError("Test error", "gemini", 500, response);
      expect(error.response).toEqual(response);
    });

    it("should be instance of LangExtractError", () => {
      const error = new ProviderError("Test", "gemini");
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("RateLimitError", () => {
    it("should have status code 429", () => {
      const error = new RateLimitError("openai");
      expect(error.statusCode).toBe(429);
    });

    it("should include retryAfterMs when provided", () => {
      const error = new RateLimitError("openai", 60000);
      expect(error.retryAfterMs).toBe(60000);
    });

    it("should have descriptive message with retry time", () => {
      const error = new RateLimitError("openai", 60000);
      expect(error.message).toContain("Rate limit exceeded");
      expect(error.message).toContain("openai");
      expect(error.message).toContain("60000ms");
    });

    it("should have descriptive message without retry time", () => {
      const error = new RateLimitError("openai");
      expect(error.message).toContain("Rate limit exceeded");
      expect(error.message).toContain("openai");
    });

    it("should be instance of ProviderError", () => {
      const error = new RateLimitError("openai");
      expect(error).toBeInstanceOf(ProviderError);
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("TimeoutError", () => {
    it("should include timeout duration", () => {
      const error = new TimeoutError("gemini", 30000);
      expect(error.timeoutMs).toBe(30000);
    });

    it("should have descriptive message", () => {
      const error = new TimeoutError("gemini", 30000);
      expect(error.message).toContain("timed out");
      expect(error.message).toContain("gemini");
      expect(error.message).toContain("30000ms");
    });

    it("should be instance of ProviderError", () => {
      const error = new TimeoutError("gemini", 30000);
      expect(error).toBeInstanceOf(ProviderError);
    });
  });

  describe("AuthenticationError", () => {
    it("should have status code 401", () => {
      const error = new AuthenticationError("gemini");
      expect(error.statusCode).toBe(401);
    });

    it("should have default message", () => {
      const error = new AuthenticationError("gemini");
      expect(error.message).toContain("Authentication failed");
      expect(error.message).toContain("API key");
    });

    it("should use custom message when provided", () => {
      const error = new AuthenticationError("gemini", "Custom auth message");
      expect(error.message).toBe("Custom auth message");
    });

    it("should be instance of ProviderError", () => {
      const error = new AuthenticationError("gemini");
      expect(error).toBeInstanceOf(ProviderError);
    });
  });

  describe("ResolverParsingError", () => {
    it("should include raw output for debugging", () => {
      const error = new ResolverParsingError("Failed to parse", '{"invalid json');
      expect(error.rawOutput).toBe('{"invalid json');
    });

    it("should include parse error when provided", () => {
      const parseError = new SyntaxError("Unexpected end of JSON");
      const error = new ResolverParsingError("Failed to parse", '{"invalid', parseError);
      expect(error.parseError).toBe(parseError);
    });

    it("should generate detailed string", () => {
      const parseError = new SyntaxError("Unexpected end");
      const error = new ResolverParsingError("Failed to parse", '{"invalid', parseError);

      const detailed = error.toDetailedString();
      expect(detailed).toContain("Failed to parse");
      expect(detailed).toContain('{"invalid');
      expect(detailed).toContain("Unexpected end");
    });

    it("should truncate long raw output in detailed string", () => {
      const longOutput = "x".repeat(300);
      const error = new ResolverParsingError("Failed", longOutput);

      const detailed = error.toDetailedString();
      expect(detailed).toContain("...");
      expect(detailed.length).toBeLessThan(longOutput.length + 100);
    });

    it("should be instance of LangExtractError", () => {
      const error = new ResolverParsingError("Failed");
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("ValidationError", () => {
    it("should include field name", () => {
      const error = new ValidationError("Invalid value", "apiKey");
      expect(error.field).toBe("apiKey");
    });

    it("should include value when provided", () => {
      const error = new ValidationError("Invalid value", "temperature", 2.5);
      expect(error.value).toBe(2.5);
    });

    it("should be instance of LangExtractError", () => {
      const error = new ValidationError("Invalid", "field");
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("ProviderNotFoundError", () => {
    it("should list available providers", () => {
      const error = new ProviderNotFoundError("unknown", ["gemini", "openai", "ollama"]);
      expect(error.message).toContain("unknown");
      expect(error.message).toContain("gemini");
      expect(error.message).toContain("openai");
      expect(error.message).toContain("ollama");
    });

    it("should handle empty provider list", () => {
      const error = new ProviderNotFoundError("unknown", []);
      expect(error.message).toContain("none");
    });

    it("should be instance of LangExtractError", () => {
      const error = new ProviderNotFoundError("unknown", []);
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("ConfigurationError", () => {
    it("should include config key when provided", () => {
      const error = new ConfigurationError("Invalid config", "maxTokens");
      expect(error.configKey).toBe("maxTokens");
    });

    it("should work without config key", () => {
      const error = new ConfigurationError("Invalid config");
      expect(error.configKey).toBeUndefined();
    });

    it("should be instance of LangExtractError", () => {
      const error = new ConfigurationError("Invalid");
      expect(error).toBeInstanceOf(LangExtractError);
    });
  });

  describe("instanceof checks", () => {
    it("should work across the error hierarchy", () => {
      const rate = new RateLimitError("provider");
      const timeout = new TimeoutError("provider", 1000);
      const auth = new AuthenticationError("provider");
      const resolver = new ResolverParsingError("message");
      const validation = new ValidationError("message", "field");

      // All should be LangExtractError
      expect(rate).toBeInstanceOf(LangExtractError);
      expect(timeout).toBeInstanceOf(LangExtractError);
      expect(auth).toBeInstanceOf(LangExtractError);
      expect(resolver).toBeInstanceOf(LangExtractError);
      expect(validation).toBeInstanceOf(LangExtractError);

      // Provider errors should be ProviderError
      expect(rate).toBeInstanceOf(ProviderError);
      expect(timeout).toBeInstanceOf(ProviderError);
      expect(auth).toBeInstanceOf(ProviderError);
      expect(resolver).not.toBeInstanceOf(ProviderError);
      expect(validation).not.toBeInstanceOf(ProviderError);

      // All should be Error
      expect(rate).toBeInstanceOf(Error);
      expect(timeout).toBeInstanceOf(Error);
      expect(auth).toBeInstanceOf(Error);
      expect(resolver).toBeInstanceOf(Error);
      expect(validation).toBeInstanceOf(Error);
    });
  });
});
