/**
 * Copyright 2025 kmbro.
 *
 * Tests for configuration module.
 */

import {
  ENV_VARS,
  getEnvString,
  getEnvBool,
  getApiKeyFromEnv,
  getDefaultConfig,
  mergeWithEnvConfig,
} from "../config";

describe("Configuration Module", () => {
  // Store original env values
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear relevant env vars before each test
    delete process.env[ENV_VARS.API_KEY];
    delete process.env[ENV_VARS.DEBUG];
    delete process.env[ENV_VARS.MODEL_TYPE];
    delete process.env[ENV_VARS.GEMINI_API_KEY];
    delete process.env[ENV_VARS.GOOGLE_API_KEY];
    delete process.env[ENV_VARS.OPENAI_API_KEY];
    delete process.env[ENV_VARS.OLLAMA_URL];
  });

  afterAll(() => {
    // Restore original env
    process.env = originalEnv;
  });

  describe("ENV_VARS", () => {
    it("should have expected environment variable names", () => {
      expect(ENV_VARS.API_KEY).toBe("LANGEXTRACT_API_KEY");
      expect(ENV_VARS.DEBUG).toBe("LANGEXTRACT_DEBUG");
      expect(ENV_VARS.MODEL_TYPE).toBe("LANGEXTRACT_MODEL_TYPE");
      expect(ENV_VARS.GEMINI_API_KEY).toBe("GEMINI_API_KEY");
      expect(ENV_VARS.GOOGLE_API_KEY).toBe("GOOGLE_API_KEY");
      expect(ENV_VARS.OPENAI_API_KEY).toBe("OPENAI_API_KEY");
      expect(ENV_VARS.OLLAMA_URL).toBe("OLLAMA_URL");
    });
  });

  describe("getEnvString", () => {
    it("should return env value when set", () => {
      process.env.TEST_VAR = "test_value";
      expect(getEnvString("TEST_VAR")).toBe("test_value");
      delete process.env.TEST_VAR;
    });

    it("should return undefined when not set", () => {
      expect(getEnvString("NONEXISTENT_VAR")).toBeUndefined();
    });

    it("should return default value when not set", () => {
      expect(getEnvString("NONEXISTENT_VAR", "default")).toBe("default");
    });

    it("should prefer env value over default", () => {
      process.env.TEST_VAR = "env_value";
      expect(getEnvString("TEST_VAR", "default")).toBe("env_value");
      delete process.env.TEST_VAR;
    });
  });

  describe("getEnvBool", () => {
    it("should return default when not set", () => {
      expect(getEnvBool("NONEXISTENT_VAR", false)).toBe(false);
      expect(getEnvBool("NONEXISTENT_VAR", true)).toBe(true);
    });

    it("should return true for 'true'", () => {
      process.env.TEST_BOOL = "true";
      expect(getEnvBool("TEST_BOOL", false)).toBe(true);
      delete process.env.TEST_BOOL;
    });

    it("should return true for 'TRUE' (case insensitive)", () => {
      process.env.TEST_BOOL = "TRUE";
      expect(getEnvBool("TEST_BOOL", false)).toBe(true);
      delete process.env.TEST_BOOL;
    });

    it("should return true for '1'", () => {
      process.env.TEST_BOOL = "1";
      expect(getEnvBool("TEST_BOOL", false)).toBe(true);
      delete process.env.TEST_BOOL;
    });

    it("should return false for 'false'", () => {
      process.env.TEST_BOOL = "false";
      expect(getEnvBool("TEST_BOOL", true)).toBe(false);
      delete process.env.TEST_BOOL;
    });

    it("should return false for '0'", () => {
      process.env.TEST_BOOL = "0";
      expect(getEnvBool("TEST_BOOL", true)).toBe(false);
      delete process.env.TEST_BOOL;
    });

    it("should return false for empty string", () => {
      process.env.TEST_BOOL = "";
      expect(getEnvBool("TEST_BOOL", true)).toBe(false);
      delete process.env.TEST_BOOL;
    });
  });

  describe("getApiKeyFromEnv", () => {
    it("should return LANGEXTRACT_API_KEY first", () => {
      process.env[ENV_VARS.API_KEY] = "langextract_key";
      process.env[ENV_VARS.GEMINI_API_KEY] = "gemini_key";
      expect(getApiKeyFromEnv()).toBe("langextract_key");
    });

    it("should fallback to GEMINI_API_KEY for gemini model", () => {
      process.env[ENV_VARS.GEMINI_API_KEY] = "gemini_key";
      expect(getApiKeyFromEnv("gemini")).toBe("gemini_key");
    });

    it("should fallback to GOOGLE_API_KEY for gemini model", () => {
      process.env[ENV_VARS.GOOGLE_API_KEY] = "google_key";
      expect(getApiKeyFromEnv("gemini")).toBe("google_key");
    });

    it("should fallback to OPENAI_API_KEY for openai model", () => {
      process.env[ENV_VARS.OPENAI_API_KEY] = "openai_key";
      expect(getApiKeyFromEnv("openai")).toBe("openai_key");
    });

    it("should fallback to OPENAI_API_KEY for gpt model", () => {
      process.env[ENV_VARS.OPENAI_API_KEY] = "openai_key";
      expect(getApiKeyFromEnv("gpt-4")).toBe("openai_key");
    });

    it("should return undefined when no keys are set", () => {
      expect(getApiKeyFromEnv()).toBeUndefined();
    });

    it("should fallback to any available key without model type", () => {
      process.env[ENV_VARS.OPENAI_API_KEY] = "openai_key";
      expect(getApiKeyFromEnv()).toBe("openai_key");
    });
  });

  describe("getDefaultConfig", () => {
    it("should return default config when no env vars set", () => {
      const config = getDefaultConfig();
      expect(config.apiKey).toBeUndefined();
      expect(config.debug).toBe(false);
      expect(config.modelType).toBeUndefined();
    });

    it("should load debug from env", () => {
      process.env[ENV_VARS.DEBUG] = "true";
      const config = getDefaultConfig();
      expect(config.debug).toBe(true);
    });

    it("should load apiKey from env", () => {
      process.env[ENV_VARS.API_KEY] = "test_key";
      const config = getDefaultConfig();
      expect(config.apiKey).toBe("test_key");
    });

    it("should load modelType from env", () => {
      process.env[ENV_VARS.MODEL_TYPE] = "openai";
      const config = getDefaultConfig();
      expect(config.modelType).toBe("openai");
    });
  });

  describe("mergeWithEnvConfig", () => {
    it("should prefer user config over env config", () => {
      process.env[ENV_VARS.API_KEY] = "env_key";
      process.env[ENV_VARS.DEBUG] = "true";

      const merged = mergeWithEnvConfig({
        apiKey: "user_key",
        debug: false,
      });

      expect(merged.apiKey).toBe("user_key");
      expect(merged.debug).toBe(false);
    });

    it("should fallback to env config when user config missing", () => {
      process.env[ENV_VARS.API_KEY] = "env_key";
      process.env[ENV_VARS.DEBUG] = "true";

      const merged = mergeWithEnvConfig({});

      expect(merged.apiKey).toBe("env_key");
      expect(merged.debug).toBe(true);
    });

    it("should handle partial user config", () => {
      process.env[ENV_VARS.API_KEY] = "env_key";
      process.env[ENV_VARS.DEBUG] = "true";

      const merged = mergeWithEnvConfig({
        apiKey: "user_key",
        // debug not specified - should use env
      });

      expect(merged.apiKey).toBe("user_key");
      expect(merged.debug).toBe(true);
    });
  });

  describe("Default values", () => {
    it("debug should default to false", () => {
      const config = getDefaultConfig();
      expect(config.debug).toBe(false);
    });
  });
});
