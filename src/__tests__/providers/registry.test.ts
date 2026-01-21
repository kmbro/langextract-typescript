/**
 * Copyright 2025 kmbro.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */

import { ProviderRegistry, ProviderFactory, ProviderMetadata, ProviderConfig, BaseLanguageModel } from "../../providers";
import { ScoredOutput } from "../../types";

// Helper function to create a mock factory
function createMockFactory(name: string, priority: number = 10): ProviderFactory {
  const metadata: ProviderMetadata = {
    name,
    displayName: `Mock ${name}`,
    priority,
    supportsSchema: false,
    requiresApiKey: false,
    defaultModel: "mock-model",
  };

  const mockModel: BaseLanguageModel = {
    providerName: name,
    supportsSchema: false,
    infer: jest.fn().mockResolvedValue([[{ score: 1, output: "mock output" }]]),
  };

  return {
    metadata,
    createModel: jest.fn().mockReturnValue(mockModel),
  };
}

describe("ProviderRegistry", () => {
  // Save the original state and restore after tests
  let originalProviders: Map<string, ProviderFactory>;

  beforeEach(() => {
    // Store current registered providers
    originalProviders = new Map(ProviderRegistry["providers"]);
    // Clear registry for test isolation
    ProviderRegistry.clear();
  });

  afterEach(() => {
    // Restore original providers
    ProviderRegistry.clear();
    for (const [name, factory] of originalProviders) {
      if (!ProviderRegistry.has(name)) {
        ProviderRegistry.register(factory);
      }
    }
  });

  describe("register", () => {
    it("should register a provider factory", () => {
      const factory = createMockFactory("test-provider");

      ProviderRegistry.register(factory);

      expect(ProviderRegistry.get("test-provider")).toBe(factory);
    });

    it("should throw on duplicate registration", () => {
      const factory = createMockFactory("duplicate");

      ProviderRegistry.register(factory);

      expect(() => ProviderRegistry.register(factory)).toThrow("Provider 'duplicate' is already registered");
    });
  });

  describe("get", () => {
    it("should return factory for registered provider", () => {
      const factory = createMockFactory("test-get");
      ProviderRegistry.register(factory);

      const result = ProviderRegistry.get("test-get");

      expect(result).toBe(factory);
    });

    it("should return undefined for unknown provider", () => {
      const result = ProviderRegistry.get("nonexistent");

      expect(result).toBeUndefined();
    });
  });

  describe("has", () => {
    it("should return true for registered provider", () => {
      const factory = createMockFactory("test-has");
      ProviderRegistry.register(factory);

      expect(ProviderRegistry.has("test-has")).toBe(true);
    });

    it("should return false for unknown provider", () => {
      expect(ProviderRegistry.has("nonexistent")).toBe(false);
    });
  });

  describe("createModel", () => {
    it("should create model with correct config", () => {
      const factory = createMockFactory("test-create");
      ProviderRegistry.register(factory);

      const config: ProviderConfig = { apiKey: "key123", temperature: 0.5 };
      const model = ProviderRegistry.createModel("test-create", config);

      expect(factory.createModel).toHaveBeenCalledWith(config);
      expect(model.providerName).toBe("test-create");
    });

    it("should throw for unknown provider", () => {
      expect(() => ProviderRegistry.createModel("unknown", {})).toThrow("Unknown provider: unknown");
    });

    it("should list available providers in error message", () => {
      ProviderRegistry.register(createMockFactory("provider-a"));
      ProviderRegistry.register(createMockFactory("provider-b"));

      expect(() => ProviderRegistry.createModel("unknown", {})).toThrow(/Available providers: provider-a, provider-b/);
    });
  });

  describe("list", () => {
    it("should return all registered provider metadata", () => {
      ProviderRegistry.register(createMockFactory("list-a", 10));
      ProviderRegistry.register(createMockFactory("list-b", 20));

      const list = ProviderRegistry.list();

      expect(list).toHaveLength(2);
      expect(list.map((m) => m.name)).toContain("list-a");
      expect(list.map((m) => m.name)).toContain("list-b");
    });

    it("should return empty array when no providers registered", () => {
      const list = ProviderRegistry.list();

      expect(list).toEqual([]);
    });
  });

  describe("names", () => {
    it("should return all provider names", () => {
      ProviderRegistry.register(createMockFactory("names-a"));
      ProviderRegistry.register(createMockFactory("names-b"));

      const names = ProviderRegistry.names();

      expect(names).toContain("names-a");
      expect(names).toContain("names-b");
    });
  });

  describe("getByPriority", () => {
    it("should return providers sorted by priority descending", () => {
      ProviderRegistry.register(createMockFactory("low", 10));
      ProviderRegistry.register(createMockFactory("high", 100));
      ProviderRegistry.register(createMockFactory("mid", 50));

      const sorted = ProviderRegistry.getByPriority();

      expect(sorted[0].metadata.name).toBe("high");
      expect(sorted[1].metadata.name).toBe("mid");
      expect(sorted[2].metadata.name).toBe("low");
    });
  });

  describe("unregister", () => {
    it("should remove a registered provider", () => {
      ProviderRegistry.register(createMockFactory("to-remove"));

      expect(ProviderRegistry.has("to-remove")).toBe(true);

      const result = ProviderRegistry.unregister("to-remove");

      expect(result).toBe(true);
      expect(ProviderRegistry.has("to-remove")).toBe(false);
    });

    it("should return false for unknown provider", () => {
      const result = ProviderRegistry.unregister("nonexistent");

      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("should remove all registered providers", () => {
      ProviderRegistry.register(createMockFactory("clear-a"));
      ProviderRegistry.register(createMockFactory("clear-b"));

      ProviderRegistry.clear();

      expect(ProviderRegistry.list()).toHaveLength(0);
    });
  });
});

describe("Built-in Providers", () => {
  // Import providers module to ensure providers are registered
  beforeAll(async () => {
    // Dynamic import to ensure registration happens
    await import("../../providers");
  });

  it("should have Gemini provider registered", () => {
    expect(ProviderRegistry.has("gemini")).toBe(true);
    const factory = ProviderRegistry.get("gemini");
    expect(factory?.metadata.displayName).toBe("Google Gemini");
    expect(factory?.metadata.supportsSchema).toBe(true);
  });

  it("should have OpenAI provider registered", () => {
    expect(ProviderRegistry.has("openai")).toBe(true);
    const factory = ProviderRegistry.get("openai");
    expect(factory?.metadata.displayName).toBe("OpenAI");
    expect(factory?.metadata.supportsSchema).toBe(true);
  });

  it("should have Ollama provider registered", () => {
    expect(ProviderRegistry.has("ollama")).toBe(true);
    const factory = ProviderRegistry.get("ollama");
    expect(factory?.metadata.displayName).toBe("Ollama (Local)");
    expect(factory?.metadata.supportsSchema).toBe(false);
  });

  it("should have Gemini as highest priority", () => {
    const sorted = ProviderRegistry.getByPriority();
    // Filter to only built-in providers
    const builtIn = sorted.filter((f) => ["gemini", "openai", "ollama"].includes(f.metadata.name));

    expect(builtIn[0].metadata.name).toBe("gemini");
  });
});
