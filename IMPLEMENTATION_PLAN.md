# LangExtract TypeScript - Upstream Sync Implementation Plan

This document provides detailed, executable specifications for syncing the TypeScript implementation with the Python [google/langextract](https://github.com/google/langextract) repository (127 commits, v1.1.1).

**Current TypeScript Version:** 1.2.0
**Target Python Version:** 1.1.1

---

## Table of Contents

1. [Phase 1: Provider Plugin Architecture](#phase-1-provider-plugin-architecture)
2. [Phase 2: Multi-Language Tokenizer](#phase-2-multi-language-tokenizer)
3. [Phase 3: Retry & Error Handling](#phase-3-retry--error-handling)
4. [Phase 4: Configuration & Defaults](#phase-4-configuration--defaults)
5. [Phase 5: Prompt Validation](#phase-5-prompt-validation)
6. [Phase 6: Cross-Chunk Context](#phase-6-cross-chunk-context)
7. [Phase 7: Vertex AI Provider](#phase-7-vertex-ai-provider)
8. [Phase 8: Batch API Support](#phase-8-batch-api-support)
9. [Phase 9: Documentation & Tooling](#phase-9-documentation--tooling)

---

## Phase 1: Provider Plugin Architecture

**Goal:** Refactor the hardcoded provider system into an extensible plugin architecture with a registry pattern.

### 1.1 Create Provider Registry

**File:** `src/providers/registry.ts`

```typescript
// Interface specification for registry.ts

export interface ProviderConfig {
  apiKey?: string;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  maxWorkers?: number;
  timeout?: number;
  [key: string]: any;
}

export interface ProviderMetadata {
  name: string;
  displayName: string;
  priority: number;  // Higher priority = preferred when multiple match
  supportsSchema: boolean;
  requiresApiKey: boolean;
  defaultModel: string;
}

export interface ProviderFactory {
  metadata: ProviderMetadata;
  createModel(config: ProviderConfig): BaseLanguageModel;
  getSchemaClass?(): typeof GeminiSchemaImpl | null;
}

export class ProviderRegistry {
  private static providers: Map<string, ProviderFactory> = new Map();

  static register(factory: ProviderFactory): void;
  static get(name: string): ProviderFactory | undefined;
  static list(): ProviderMetadata[];
  static createModel(name: string, config: ProviderConfig): BaseLanguageModel;
  static getByPriority(): ProviderFactory[];
}

// Decorator for registering providers
export function registerProvider(metadata: ProviderMetadata): ClassDecorator;
```

### 1.2 Create Base Provider Interface

**File:** `src/providers/base.ts`

```typescript
// Interface specification for base.ts

export interface BaseLanguageModel {
  readonly providerName: string;
  readonly supportsSchema: boolean;

  infer(batchPrompts: string[], options?: InferenceOptions): Promise<ScoredOutput[][]>;

  // Optional methods for providers that support them
  inferWithSchema?(batchPrompts: string[], schema: GeminiSchema, options?: InferenceOptions): Promise<ScoredOutput[][]>;
}

export interface InferenceOptions {
  temperature?: number;
  maxDecodeSteps?: number;
  timeout?: number;
  retryConfig?: RetryConfig;
  [key: string]: any;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}
```

### 1.3 Refactor Existing Providers

**File:** `src/providers/gemini.ts`

Move `GeminiLanguageModel` from `inference.ts` and implement the new interface:

```typescript
import { registerProvider, ProviderConfig, ProviderMetadata } from './registry';
import { BaseLanguageModel, InferenceOptions } from './base';

const GEMINI_METADATA: ProviderMetadata = {
  name: 'gemini',
  displayName: 'Google Gemini',
  priority: 100,
  supportsSchema: true,
  requiresApiKey: true,
  defaultModel: 'gemini-2.5-flash',
};

@registerProvider(GEMINI_METADATA)
export class GeminiLanguageModel implements BaseLanguageModel {
  readonly providerName = 'gemini';
  readonly supportsSchema = true;

  // ... existing implementation with updates
}
```

**File:** `src/providers/openai.ts`

Move `OpenAILanguageModel` from `inference.ts`:

```typescript
const OPENAI_METADATA: ProviderMetadata = {
  name: 'openai',
  displayName: 'OpenAI',
  priority: 90,
  supportsSchema: true,
  requiresApiKey: true,
  defaultModel: 'gpt-4o-mini',
};

@registerProvider(OPENAI_METADATA)
export class OpenAILanguageModel implements BaseLanguageModel {
  // ... implementation
}
```

**File:** `src/providers/ollama.ts`

Move `OllamaLanguageModel` from `inference.ts`:

```typescript
const OLLAMA_METADATA: ProviderMetadata = {
  name: 'ollama',
  displayName: 'Ollama (Local)',
  priority: 50,
  supportsSchema: false,
  requiresApiKey: false,
  defaultModel: 'llama2:latest',
};

@registerProvider(OLLAMA_METADATA)
export class OllamaLanguageModel implements BaseLanguageModel {
  // ... implementation
}
```

### 1.4 Create Provider Index

**File:** `src/providers/index.ts`

```typescript
// Export all providers and registry
export * from './registry';
export * from './base';
export * from './gemini';
export * from './openai';
export * from './ollama';

// Auto-register built-in providers on import
import './gemini';
import './openai';
import './ollama';
```

### 1.5 Update Main Extract Function

**File:** `src/index.ts` (modifications)

```typescript
import { ProviderRegistry } from './providers';

export async function extract(
  textOrDocuments: string | Document | Document[],
  options: ExtractOptions = {}
): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  // ... existing code ...

  // Replace switch statement with registry lookup
  const provider = ProviderRegistry.get(modelType);
  if (!provider) {
    throw new Error(`Unknown model type: ${modelType}. Available: ${ProviderRegistry.list().map(p => p.name).join(', ')}`);
  }

  const languageModel = provider.createModel({
    modelId,
    apiKey,
    temperature,
    maxWorkers,
    maxTokens,
    // ... other config
  });

  // ... rest of implementation
}
```

### 1.6 Tests for Phase 1

**File:** `src/__tests__/providers/registry.test.ts`

```typescript
describe('ProviderRegistry', () => {
  beforeEach(() => {
    // Reset registry between tests
    ProviderRegistry['providers'].clear();
  });

  describe('register', () => {
    it('should register a provider factory', () => {
      const mockFactory: ProviderFactory = {
        metadata: {
          name: 'test-provider',
          displayName: 'Test Provider',
          priority: 10,
          supportsSchema: false,
          requiresApiKey: false,
          defaultModel: 'test-model',
        },
        createModel: jest.fn(),
      };

      ProviderRegistry.register(mockFactory);
      expect(ProviderRegistry.get('test-provider')).toBe(mockFactory);
    });

    it('should throw on duplicate registration', () => {
      const factory = createMockFactory('duplicate');
      ProviderRegistry.register(factory);
      expect(() => ProviderRegistry.register(factory)).toThrow();
    });
  });

  describe('createModel', () => {
    it('should create model with correct config', () => {
      const createModelMock = jest.fn().mockReturnValue({});
      ProviderRegistry.register({
        metadata: { name: 'test', displayName: 'Test', priority: 1, supportsSchema: false, requiresApiKey: false, defaultModel: 'x' },
        createModel: createModelMock,
      });

      ProviderRegistry.createModel('test', { apiKey: 'key123', temperature: 0.5 });
      expect(createModelMock).toHaveBeenCalledWith({ apiKey: 'key123', temperature: 0.5 });
    });

    it('should throw for unknown provider', () => {
      expect(() => ProviderRegistry.createModel('unknown', {})).toThrow('Unknown provider: unknown');
    });
  });

  describe('list', () => {
    it('should return all registered provider metadata', () => {
      ProviderRegistry.register(createMockFactory('a', 10));
      ProviderRegistry.register(createMockFactory('b', 20));

      const list = ProviderRegistry.list();
      expect(list).toHaveLength(2);
      expect(list.map(m => m.name)).toContain('a');
      expect(list.map(m => m.name)).toContain('b');
    });
  });

  describe('getByPriority', () => {
    it('should return providers sorted by priority descending', () => {
      ProviderRegistry.register(createMockFactory('low', 10));
      ProviderRegistry.register(createMockFactory('high', 100));
      ProviderRegistry.register(createMockFactory('mid', 50));

      const sorted = ProviderRegistry.getByPriority();
      expect(sorted[0].metadata.name).toBe('high');
      expect(sorted[1].metadata.name).toBe('mid');
      expect(sorted[2].metadata.name).toBe('low');
    });
  });
});
```

**File:** `src/__tests__/providers/gemini.test.ts`

```typescript
describe('GeminiLanguageModel', () => {
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockAxios = axios as jest.Mocked<typeof axios>;
  });

  it('should have correct provider metadata', () => {
    const model = new GeminiLanguageModel({ apiKey: 'test' });
    expect(model.providerName).toBe('gemini');
    expect(model.supportsSchema).toBe(true);
  });

  it('should use custom modelUrl when provided', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{"extractions":[]}' }] } }] }
    });

    const model = new GeminiLanguageModel({
      apiKey: 'test',
      modelUrl: 'https://custom.endpoint.com',
    });

    await model.infer(['test prompt']);
    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('custom.endpoint.com'),
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should include schema in request when provided', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });

    const schema = GeminiSchemaImpl.fromExamples([{
      text: 'test',
      extractions: [{ extractionClass: 'person', extractionText: 'John' }]
    }]);

    const model = new GeminiLanguageModel({ apiKey: 'test', geminiSchema: schema });
    await model.infer(['prompt']);

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseSchema: expect.any(Object)
        })
      }),
      expect.any(Object)
    );
  });
});
```

### 1.7 Verification Steps

1. Run `npm test -- --testPathPattern=providers` - all provider tests pass
2. Run `npm test` - all existing tests still pass (no regressions)
3. Integration test: Extract with each provider type works
4. Verify backward compatibility: existing `modelType: "gemini"` still works

---

## Phase 2: Multi-Language Tokenizer

**Goal:** Replace the simple whitespace/punctuation tokenizer with a Unicode-aware, multi-language tokenizer supporting CJK characters.

### 2.1 Create Token Patterns Module

**File:** `src/tokenizer/patterns.ts`

```typescript
// Language-specific tokenization patterns

export interface TokenPattern {
  name: string;
  pattern: RegExp;
  priority: number;
}

// CJK character ranges
const CJK_UNIFIED = '\\u4E00-\\u9FFF';        // CJK Unified Ideographs
const CJK_EXT_A = '\\u3400-\\u4DBF';          // CJK Unified Ideographs Extension A
const HIRAGANA = '\\u3040-\\u309F';           // Hiragana
const KATAKANA = '\\u30A0-\\u30FF';           // Katakana
const HANGUL = '\\uAC00-\\uD7AF';             // Hangul Syllables
const HANGUL_JAMO = '\\u1100-\\u11FF';        // Hangul Jamo

export const TOKEN_PATTERNS: TokenPattern[] = [
  // CJK: Each character is a token
  {
    name: 'cjk',
    pattern: new RegExp(`[${CJK_UNIFIED}${CJK_EXT_A}${HIRAGANA}${KATAKANA}${HANGUL}${HANGUL_JAMO}]`, 'gu'),
    priority: 100,
  },
  // Words: ASCII and extended Latin
  {
    name: 'word',
    pattern: /[\p{L}\p{M}]+/gu,
    priority: 50,
  },
  // Numbers
  {
    name: 'number',
    pattern: /\d+(?:\.\d+)?/g,
    priority: 40,
  },
  // Punctuation
  {
    name: 'punctuation',
    pattern: /[^\s\p{L}\p{M}\p{N}]/gu,
    priority: 30,
  },
];

export function detectLanguage(text: string): 'cjk' | 'latin' | 'mixed' {
  const cjkPattern = new RegExp(`[${CJK_UNIFIED}${CJK_EXT_A}${HIRAGANA}${KATAKANA}${HANGUL}]`, 'u');
  const latinPattern = /[a-zA-Z]/;

  const hasCjk = cjkPattern.test(text);
  const hasLatin = latinPattern.test(text);

  if (hasCjk && hasLatin) return 'mixed';
  if (hasCjk) return 'cjk';
  return 'latin';
}
```

### 2.2 Rewrite Tokenizer

**File:** `src/tokenizer/index.ts` (replaces `src/tokenizer.ts`)

```typescript
import { TokenizedText, TokenInterval, CharInterval } from '../types';
import { TOKEN_PATTERNS, detectLanguage } from './patterns';

export interface TokenizerOptions {
  /** Strategy: 'auto' detects language, 'cjk' forces CJK mode, 'latin' forces word-based */
  strategy?: 'auto' | 'cjk' | 'latin' | 'mixed';
  /** Whether to normalize tokens (lowercase, trim) */
  normalize?: boolean;
  /** Custom token pattern (overrides built-in patterns) */
  customPattern?: RegExp;
}

export interface Token {
  text: string;
  normalizedText: string;
  startPos: number;
  endPos: number;
  type: string;
}

export function tokenize(text: string, options: TokenizerOptions = {}): TokenizedText {
  const { strategy = 'auto', normalize = false, customPattern } = options;

  const tokens: string[] = [];
  const tokenIntervals: TokenInterval[] = [];
  const charIntervals: CharInterval[] = [];

  // Determine tokenization strategy
  const effectiveStrategy = strategy === 'auto' ? detectLanguage(text) : strategy;

  // Get pattern based on strategy
  const pattern = customPattern ?? getPatternForStrategy(effectiveStrategy);

  let match: RegExpExecArray | null;
  let tokenIndex = 0;

  // Reset regex state
  pattern.lastIndex = 0;

  while ((match = pattern.exec(text)) !== null) {
    const token = match[0];
    const startPos = match.index;
    const endPos = startPos + token.length;

    tokens.push(normalize ? normalizeToken(token) : token);
    tokenIntervals.push({
      startToken: tokenIndex,
      endToken: tokenIndex + 1,
    });
    charIntervals.push({
      startPos,
      endPos,
    });

    tokenIndex++;
  }

  return { tokens, tokenIntervals, charIntervals };
}

function getPatternForStrategy(strategy: 'cjk' | 'latin' | 'mixed'): RegExp {
  switch (strategy) {
    case 'cjk':
      // Each CJK character + punctuation as tokens
      return /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]|[^\s\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]+/gu;
    case 'latin':
      // Word-based tokenization
      return /\b\w+\b|[^\w\s]/g;
    case 'mixed':
    default:
      // Combined: CJK chars individually + Latin words + punctuation
      return /[\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]|\b[\p{L}\p{M}]+\b|\d+(?:\.\d+)?|[^\s\p{L}\p{M}\p{N}]/gu;
  }
}

export function normalizeToken(token: string): string {
  return token.toLowerCase().trim();
}

export function tokenizeWithLowercase(text: string): string[] {
  return tokenize(text, { normalize: true }).tokens;
}

// Re-export for backward compatibility
export { detectLanguage } from './patterns';
```

### 2.3 Tests for Phase 2

**File:** `src/__tests__/tokenizer/multilang.test.ts`

```typescript
describe('Multi-language Tokenizer', () => {
  describe('CJK tokenization', () => {
    it('should tokenize Chinese characters individually', () => {
      const result = tokenize('你好世界');
      expect(result.tokens).toEqual(['你', '好', '世', '界']);
    });

    it('should preserve correct char intervals for Chinese', () => {
      const result = tokenize('你好');
      expect(result.charIntervals[0]).toEqual({ startPos: 0, endPos: 1 });
      expect(result.charIntervals[1]).toEqual({ startPos: 1, endPos: 2 });
    });

    it('should tokenize Japanese hiragana individually', () => {
      const result = tokenize('こんにちは');
      expect(result.tokens).toHaveLength(5);
    });

    it('should tokenize Japanese katakana individually', () => {
      const result = tokenize('コンピュータ');
      expect(result.tokens).toHaveLength(6);
    });

    it('should tokenize Korean hangul individually', () => {
      const result = tokenize('안녕하세요');
      expect(result.tokens).toHaveLength(5);
    });

    it('should handle mixed CJK and punctuation', () => {
      const result = tokenize('你好，世界！');
      expect(result.tokens).toEqual(['你', '好', '，', '世', '界', '！']);
    });
  });

  describe('Mixed language tokenization', () => {
    it('should handle Chinese with English', () => {
      const result = tokenize('Hello你好World世界');
      expect(result.tokens).toContain('Hello');
      expect(result.tokens).toContain('你');
      expect(result.tokens).toContain('好');
      expect(result.tokens).toContain('World');
      expect(result.tokens).toContain('世');
      expect(result.tokens).toContain('界');
    });

    it('should correctly position tokens in mixed text', () => {
      const text = 'Hi你好';
      const result = tokenize(text);

      // Verify we can reconstruct the original text
      let reconstructed = '';
      let lastEnd = 0;
      for (const interval of result.charIntervals) {
        reconstructed += text.substring(lastEnd, interval.startPos);
        reconstructed += text.substring(interval.startPos!, interval.endPos);
        lastEnd = interval.endPos!;
      }
      reconstructed += text.substring(lastEnd);

      expect(reconstructed).toBe(text);
    });
  });

  describe('detectLanguage', () => {
    it('should detect CJK text', () => {
      expect(detectLanguage('你好世界')).toBe('cjk');
      expect(detectLanguage('こんにちは')).toBe('cjk');
      expect(detectLanguage('안녕하세요')).toBe('cjk');
    });

    it('should detect Latin text', () => {
      expect(detectLanguage('Hello World')).toBe('latin');
      expect(detectLanguage('Bonjour le monde')).toBe('latin');
    });

    it('should detect mixed text', () => {
      expect(detectLanguage('Hello你好')).toBe('mixed');
      expect(detectLanguage('Test テスト')).toBe('mixed');
    });
  });

  describe('Backward compatibility', () => {
    it('should produce same results for English text as old tokenizer', () => {
      const text = 'John Smith is 30 years old.';
      const result = tokenize(text);

      expect(result.tokens).toContain('John');
      expect(result.tokens).toContain('Smith');
      expect(result.tokens).toContain('30');
      expect(result.tokens).toContain('.');
    });

    it('should work with tokenizeWithLowercase', () => {
      const result = tokenizeWithLowercase('Hello World');
      expect(result).toEqual(['hello', 'world']);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = tokenize('');
      expect(result.tokens).toEqual([]);
    });

    it('should handle whitespace only', () => {
      const result = tokenize('   \t\n   ');
      expect(result.tokens).toEqual([]);
    });

    it('should handle emojis', () => {
      const result = tokenize('Hello 👋 World 🌍');
      expect(result.tokens).toContain('Hello');
      expect(result.tokens).toContain('World');
      // Emoji handling depends on implementation
    });
  });
});
```

### 2.4 Verification Steps

1. Run `npm test -- --testPathPattern=tokenizer` - all tokenizer tests pass
2. Run integration tests with Chinese text samples
3. Verify `char_interval` accuracy for CJK text (issue #289 fix)
4. Benchmark tokenization speed vs. old implementation

---

## Phase 3: Retry & Error Handling

**Goal:** Add exponential backoff retry for transient errors (429, 503, timeouts) and improve error handling.

### 3.1 Create Retry Utility

**File:** `src/utils/retry.ts`

```typescript
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
  jitter: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
  jitter: true,
};

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

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

  throw new RetryError(
    `Operation failed after ${maxRetries + 1} attempts`,
    maxRetries + 1,
    lastError!
  );
}

function isRetryable(error: unknown, retryableStatusCodes: number[]): boolean {
  // Axios error with status code
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status && retryableStatusCodes.includes(status)) {
      return true;
    }
    // Network errors (no response)
    if (!error.response && error.code === 'ECONNABORTED') {
      return true;
    }
  }

  // Timeout errors
  if (error instanceof Error && error.message.includes('timeout')) {
    return true;
  }

  return false;
}

function isAxiosError(error: unknown): error is { response?: { status: number }; code?: string } {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}

function calculateDelay(attempt: number, baseDelayMs: number, maxDelayMs: number, jitter: boolean): number {
  // Exponential backoff: base * 2^attempt
  let delay = baseDelayMs * Math.pow(2, attempt);

  // Add jitter (±25%)
  if (jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay *= jitterFactor;
  }

  return Math.min(delay, maxDelayMs);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### 3.2 Integrate Retry into Providers

**File:** `src/providers/gemini.ts` (modifications)

```typescript
import { withRetry, RetryConfig, DEFAULT_RETRY_CONFIG } from '../utils/retry';

export interface GeminiConfig {
  // ... existing fields ...
  retryConfig?: Partial<RetryConfig>;
  timeout?: number;  // Timeout per request in ms
}

export class GeminiLanguageModel implements BaseLanguageModel {
  private retryConfig: RetryConfig;
  private timeout: number;

  constructor(config: Partial<GeminiConfig> = {}) {
    // ... existing code ...
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config.retryConfig };
    this.timeout = config.timeout ?? 120000;  // 120s default (up from 30s)
  }

  private async callGeminiAPI(prompt: string, config: any): Promise<string> {
    return withRetry(async () => {
      const response = await axios.post(url, requestBody, {
        headers: { /* ... */ },
        timeout: this.timeout,
      });
      // ... process response ...
    }, this.retryConfig);
  }
}
```

### 3.3 Enhanced Error Classes

**File:** `src/errors.ts`

```typescript
export class LangExtractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LangExtractError';
  }
}

export class ProviderError extends LangExtractError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number,
    public readonly response?: unknown
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class RateLimitError extends ProviderError {
  constructor(
    provider: string,
    public readonly retryAfterMs?: number
  ) {
    super(`Rate limit exceeded for ${provider}`, provider, 429);
    this.name = 'RateLimitError';
  }
}

export class TimeoutError extends ProviderError {
  constructor(provider: string, timeoutMs: number) {
    super(`Request to ${provider} timed out after ${timeoutMs}ms`, provider);
    this.name = 'TimeoutError';
  }
}

export class ResolverParsingError extends LangExtractError {
  constructor(
    message: string,
    public readonly rawOutput?: string,
    public readonly parseError?: Error
  ) {
    super(message);
    this.name = 'ResolverParsingError';
  }
}

export class ValidationError extends LangExtractError {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 3.4 Graceful Empty Chunk Handling

**File:** `src/resolver.ts` (modifications)

```typescript
export interface ResolveOptions {
  suppressParseErrors?: boolean;
  allowEmptyExtractions?: boolean;  // New option
  [key: string]: any;
}

export class Resolver implements AbstractResolver {
  resolve(inputText: string, options: ResolveOptions = {}): Extraction[] {
    const { suppressParseErrors = false, allowEmptyExtractions = true } = options;

    // Handle empty/whitespace input gracefully
    if (!inputText || !inputText.trim()) {
      if (allowEmptyExtractions) {
        return [];
      }
      throw new ResolverParsingError('Empty input text');
    }

    try {
      const extractionData = this.stringToExtractionData(inputText);

      // Handle empty extractions array
      if (!extractionData || extractionData.length === 0) {
        return [];  // Graceful return instead of error
      }

      return this.extractOrderedExtractions(extractionData);
    } catch (error) {
      if (suppressParseErrors) {
        console.warn('Parse error suppressed:', error);
        return [];
      }
      throw new ResolverParsingError(
        `Failed to resolve input text: ${error}`,
        inputText,
        error as Error
      );
    }
  }
}
```

### 3.5 Tests for Phase 3

**File:** `src/__tests__/utils/retry.test.ts`

```typescript
describe('withRetry', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    const result = await withRetry(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 error', async () => {
    const error = { isAxiosError: true, response: { status: 429 } };
    const operation = jest.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = withRetry(operation, { maxRetries: 3 });

    // Fast-forward through delays
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should retry on 503 error', async () => {
    const error = { isAxiosError: true, response: { status: 503 } };
    const operation = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = withRetry(operation);
    await jest.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries exceeded', async () => {
    const error = { isAxiosError: true, response: { status: 503 } };
    const operation = jest.fn().mockRejectedValue(error);

    const promise = withRetry(operation, { maxRetries: 2 });
    await jest.runAllTimersAsync();

    await expect(promise).rejects.toThrow(RetryError);
    expect(operation).toHaveBeenCalledTimes(3);  // initial + 2 retries
  });

  it('should not retry on 400 error', async () => {
    const error = { isAxiosError: true, response: { status: 400 } };
    const operation = jest.fn().mockRejectedValue(error);

    await expect(withRetry(operation)).rejects.toEqual(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use exponential backoff', async () => {
    const error = { isAxiosError: true, response: { status: 503 } };
    const operation = jest.fn().mockRejectedValue(error);

    const promise = withRetry(operation, {
      maxRetries: 3,
      baseDelayMs: 1000,
      jitter: false
    });

    // First retry after ~1000ms
    await jest.advanceTimersByTimeAsync(1000);
    expect(operation).toHaveBeenCalledTimes(2);

    // Second retry after ~2000ms more
    await jest.advanceTimersByTimeAsync(2000);
    expect(operation).toHaveBeenCalledTimes(3);

    // Third retry after ~4000ms more
    await jest.advanceTimersByTimeAsync(4000);
    expect(operation).toHaveBeenCalledTimes(4);

    await expect(promise).rejects.toThrow();
  });

  it('should respect maxDelayMs', async () => {
    const error = { isAxiosError: true, response: { status: 503 } };
    const operation = jest.fn().mockRejectedValue(error);

    const promise = withRetry(operation, {
      maxRetries: 5,
      baseDelayMs: 10000,
      maxDelayMs: 15000,
      jitter: false,
    });

    // Even with exponential backoff, delay should cap at 15000ms
    await jest.runAllTimersAsync();
    await expect(promise).rejects.toThrow();
  });
});
```

**File:** `src/__tests__/errors.test.ts`

```typescript
describe('Error classes', () => {
  describe('ProviderError', () => {
    it('should include provider and status code', () => {
      const error = new ProviderError('Test error', 'gemini', 500);
      expect(error.provider).toBe('gemini');
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ProviderError');
    });
  });

  describe('RateLimitError', () => {
    it('should include retry-after', () => {
      const error = new RateLimitError('openai', 60000);
      expect(error.retryAfterMs).toBe(60000);
      expect(error.statusCode).toBe(429);
    });
  });

  describe('ResolverParsingError', () => {
    it('should include raw output for debugging', () => {
      const error = new ResolverParsingError(
        'Failed to parse',
        '{"invalid json',
        new SyntaxError('Unexpected end')
      );
      expect(error.rawOutput).toBe('{"invalid json');
      expect(error.parseError).toBeInstanceOf(SyntaxError);
    });
  });
});
```

### 3.6 Verification Steps

1. Run `npm test -- --testPathPattern=retry` - all retry tests pass
2. Run `npm test -- --testPathPattern=errors` - all error tests pass
3. Manual test: Mock 429 response and verify retry behavior
4. Manual test: Mock timeout and verify retry behavior
5. Verify graceful handling when LLM returns empty extractions

---

## Phase 4: Configuration & Defaults

**Goal:** Update default values and add configuration options to match Python implementation.

### 4.1 Update Default Values

**File:** `src/index.ts` (modifications)

```typescript
export async function extract(
  textOrDocuments: string | Document | Document[],
  options: ExtractOptions = {}
): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  const {
    // ... existing options ...
    debug = false,              // Changed from true to false
    // ... rest ...
  } = options;

  // ... implementation
}
```

**File:** `src/providers/ollama.ts` (modifications)

```typescript
export interface OllamaConfig {
  model: string;
  modelUrl: string;
  structuredOutputFormat: string;
  temperature: number;
  maxTokens?: number;
  timeout?: number;      // New: configurable timeout
  keepAlive?: string;    // New: keep_alive parameter
}

export class OllamaLanguageModel implements BaseLanguageModel {
  constructor(config: Partial<OllamaConfig> = {}) {
    this.config = {
      model: 'llama2:latest',
      modelUrl: 'http://localhost:11434',
      structuredOutputFormat: 'json',
      temperature: 0.8,
      maxTokens: 2048,
      timeout: 120000,    // Changed from 30000 to 120000
      keepAlive: '5m',    // New default
      ...config,
    };
  }

  private async ollamaQuery(prompt: string, options: InferenceOptions = {}): Promise<any> {
    const requestBody = {
      model: this.config.model,
      prompt,
      temperature: options.temperature ?? this.config.temperature,
      stream: false,
      format: this.config.structuredOutputFormat,
      num_predict: options.maxDecodeSteps ?? this.config.maxTokens ?? 2048,
      keep_alive: this.config.keepAlive,  // New field
    };

    const response = await axios.post(
      `${this.config.modelUrl}/api/generate`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: this.config.timeout,  // Use configurable timeout
      }
    );

    return response.data;
  }
}
```

### 4.2 Add Environment Variable Support

**File:** `src/config.ts`

```typescript
export interface EnvConfig {
  apiKey?: string;
  debug?: boolean;
  defaultProvider?: string;
  defaultModel?: string;
}

export function loadEnvConfig(): EnvConfig {
  return {
    apiKey: process.env.LANGEXTRACT_API_KEY,
    debug: process.env.LANGEXTRACT_DEBUG === 'true',
    defaultProvider: process.env.LANGEXTRACT_PROVIDER,
    defaultModel: process.env.LANGEXTRACT_MODEL,
  };
}

export function warnOnEnvConflict(
  paramName: string,
  paramValue: unknown,
  envValue: unknown
): void {
  if (paramValue !== undefined && envValue !== undefined && paramValue !== envValue) {
    console.warn(
      `Warning: ${paramName} parameter value "${paramValue}" overrides ` +
      `environment variable value "${envValue}"`
    );
  }
}
```

### 4.3 Add resolver_params Support

**File:** `src/index.ts` (modifications)

```typescript
export interface ExtractOptions {
  // ... existing options ...

  /** Parameters passed directly to the resolver */
  resolverParams?: {
    suppressParseErrors?: boolean;
    extractionAttributesSuffix?: string;
    allowEmptyExtractions?: boolean;
    enableFuzzyAlignment?: boolean;
    fuzzyAlignmentThreshold?: number;
  };
}

export async function extract(/* ... */): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  // ... existing code ...

  const resolver = new Resolver({
    fenceOutput,
    formatType,
    extractionAttributesSuffix: resolverParams?.extractionAttributesSuffix ?? '_attributes',
    // Pass through resolver params
    ...resolverParams,
  });

  // ... rest
}
```

### 4.4 Tests for Phase 4

**File:** `src/__tests__/config.test.ts`

```typescript
describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadEnvConfig', () => {
    it('should load API key from environment', () => {
      process.env.LANGEXTRACT_API_KEY = 'test-key-123';
      const config = loadEnvConfig();
      expect(config.apiKey).toBe('test-key-123');
    });

    it('should parse debug flag', () => {
      process.env.LANGEXTRACT_DEBUG = 'true';
      const config = loadEnvConfig();
      expect(config.debug).toBe(true);
    });

    it('should return undefined for unset variables', () => {
      delete process.env.LANGEXTRACT_API_KEY;
      const config = loadEnvConfig();
      expect(config.apiKey).toBeUndefined();
    });
  });

  describe('warnOnEnvConflict', () => {
    it('should warn when param overrides env', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      warnOnEnvConflict('apiKey', 'param-value', 'env-value');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('overrides')
      );
      warnSpy.mockRestore();
    });

    it('should not warn when values match', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      warnOnEnvConflict('apiKey', 'same-value', 'same-value');
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Default values', () => {
    it('should default debug to false', async () => {
      // Mock the extract function to capture options
      // Verify debug defaults to false
    });

    it('should default Ollama timeout to 120000', () => {
      const model = new OllamaLanguageModel({});
      expect(model['config'].timeout).toBe(120000);
    });
  });
});
```

### 4.5 Verification Steps

1. Run `npm test -- --testPathPattern=config` - all config tests pass
2. Verify `debug` defaults to `false` in extract()
3. Verify Ollama timeout is 120000ms
4. Test environment variable loading
5. Test resolver_params passthrough

---

## Phase 5: Prompt Validation

**Goal:** Add validation that few-shot examples align with their source text.

### 5.1 Create Validation Module

**File:** `src/validation.ts`

```typescript
import { ExampleData, Extraction } from './types';
import { tokenize, normalizeToken } from './tokenizer';

export type ValidationMode = 'strict' | 'warn' | 'skip';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  exampleIndex: number;
  extractionIndex: number;
  message: string;
  extractionText: string;
  expectedInText: string;
}

export interface ValidationWarning {
  exampleIndex: number;
  message: string;
}

export interface ValidateExamplesOptions {
  mode: ValidationMode;
  fuzzyThreshold?: number;
}

/**
 * Validates that extraction texts in examples can be found in their source texts.
 */
export function validateExamples(
  examples: ExampleData[],
  options: ValidateExamplesOptions = { mode: 'warn' }
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    const sourceTokens = tokenize(example.text).tokens.map(normalizeToken);

    for (let j = 0; j < example.extractions.length; j++) {
      const extraction = example.extractions[j];
      const extractionTokens = tokenize(extraction.extractionText).tokens.map(normalizeToken);

      // Check if extraction text exists in source
      const found = findTokenSequence(extractionTokens, sourceTokens, options.fuzzyThreshold ?? 0.75);

      if (!found) {
        errors.push({
          exampleIndex: i,
          extractionIndex: j,
          message: `Extraction text "${extraction.extractionText}" not found in example text`,
          extractionText: extraction.extractionText,
          expectedInText: example.text.substring(0, 100) + (example.text.length > 100 ? '...' : ''),
        });
      }
    }

    // Warn about examples with no extractions
    if (example.extractions.length === 0) {
      warnings.push({
        exampleIndex: i,
        message: 'Example has no extractions',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function findTokenSequence(
  needle: string[],
  haystack: string[],
  fuzzyThreshold: number
): boolean {
  if (needle.length === 0) return true;
  if (needle.length > haystack.length) return false;

  for (let i = 0; i <= haystack.length - needle.length; i++) {
    let matches = 0;
    for (let j = 0; j < needle.length; j++) {
      if (haystack[i + j] === needle[j]) {
        matches++;
      }
    }

    const similarity = matches / needle.length;
    if (similarity >= fuzzyThreshold) {
      return true;
    }
  }

  return false;
}

/**
 * Throws or warns based on validation results and mode.
 */
export function handleValidationResult(
  result: ValidationResult,
  mode: ValidationMode
): void {
  if (mode === 'skip') {
    return;
  }

  // Log warnings
  for (const warning of result.warnings) {
    console.warn(`[Validation Warning] Example ${warning.exampleIndex}: ${warning.message}`);
  }

  if (!result.valid) {
    const errorMessages = result.errors.map(e =>
      `Example ${e.exampleIndex}, Extraction ${e.extractionIndex}: ${e.message}`
    ).join('\n');

    if (mode === 'strict') {
      throw new Error(`Example validation failed:\n${errorMessages}`);
    } else if (mode === 'warn') {
      console.warn(`[Validation Warning] Some extractions not found in example text:\n${errorMessages}`);
    }
  }
}
```

### 5.2 Integrate Validation into Extract

**File:** `src/index.ts` (modifications)

```typescript
import { validateExamples, handleValidationResult, ValidationMode } from './validation';

export interface ExtractOptions {
  // ... existing options ...

  /** Validation mode for examples: 'strict' throws, 'warn' logs, 'skip' disables */
  validateExamples?: ValidationMode;
}

export async function extract(/* ... */): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  const {
    // ... existing options ...
    validateExamples: validationMode = 'warn',
  } = options;

  // Validate examples before processing
  if (examples && examples.length > 0 && validationMode !== 'skip') {
    const validationResult = validateExamples(examples, { mode: validationMode });
    handleValidationResult(validationResult, validationMode);
  }

  // ... rest of implementation
}
```

### 5.3 Tests for Phase 5

**File:** `src/__tests__/validation.test.ts`

```typescript
describe('Example Validation', () => {
  describe('validateExamples', () => {
    it('should pass when extraction text is in source', () => {
      const examples: ExampleData[] = [{
        text: 'John Smith works at Google.',
        extractions: [{
          extractionClass: 'person',
          extractionText: 'John Smith',
        }],
      }];

      const result = validateExamples(examples, { mode: 'strict' });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when extraction text is not in source', () => {
      const examples: ExampleData[] = [{
        text: 'Alice works at Microsoft.',
        extractions: [{
          extractionClass: 'person',
          extractionText: 'John Smith',  // Not in text
        }],
      }];

      const result = validateExamples(examples, { mode: 'strict' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].extractionText).toBe('John Smith');
    });

    it('should use fuzzy matching', () => {
      const examples: ExampleData[] = [{
        text: 'Dr. John Smith, MD works here.',
        extractions: [{
          extractionClass: 'person',
          extractionText: 'John Smith',  // Subset of actual text
        }],
      }];

      const result = validateExamples(examples, { mode: 'strict', fuzzyThreshold: 0.5 });
      expect(result.valid).toBe(true);
    });

    it('should warn about examples with no extractions', () => {
      const examples: ExampleData[] = [{
        text: 'Some text here.',
        extractions: [],
      }];

      const result = validateExamples(examples, { mode: 'warn' });
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].message).toContain('no extractions');
    });

    it('should validate multiple examples', () => {
      const examples: ExampleData[] = [
        {
          text: 'John works at Google.',
          extractions: [{ extractionClass: 'person', extractionText: 'John' }],
        },
        {
          text: 'Alice works at Microsoft.',
          extractions: [{ extractionClass: 'person', extractionText: 'Bob' }],  // Wrong
        },
      ];

      const result = validateExamples(examples, { mode: 'strict' });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].exampleIndex).toBe(1);
    });
  });

  describe('handleValidationResult', () => {
    it('should throw in strict mode on errors', () => {
      const result: ValidationResult = {
        valid: false,
        errors: [{ exampleIndex: 0, extractionIndex: 0, message: 'Not found', extractionText: 'x', expectedInText: 'y' }],
        warnings: [],
      };

      expect(() => handleValidationResult(result, 'strict')).toThrow();
    });

    it('should warn in warn mode', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result: ValidationResult = {
        valid: false,
        errors: [{ exampleIndex: 0, extractionIndex: 0, message: 'Not found', extractionText: 'x', expectedInText: 'y' }],
        warnings: [],
      };

      handleValidationResult(result, 'warn');
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should do nothing in skip mode', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const result: ValidationResult = {
        valid: false,
        errors: [{ exampleIndex: 0, extractionIndex: 0, message: 'Not found', extractionText: 'x', expectedInText: 'y' }],
        warnings: [],
      };

      handleValidationResult(result, 'skip');
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
```

### 5.4 Verification Steps

1. Run `npm test -- --testPathPattern=validation` - all validation tests pass
2. Test with valid examples - should pass silently
3. Test with misaligned examples in 'strict' mode - should throw
4. Test with misaligned examples in 'warn' mode - should log warning
5. Test with misaligned examples in 'skip' mode - should not warn

---

## Phase 6: Cross-Chunk Context

**Goal:** Pass context between chunks to improve extraction quality for documents with references across chunk boundaries.

### 6.1 Update Annotator for Cross-Chunk Context

**File:** `src/annotation.ts` (modifications)

```typescript
export interface AnnotatorOptions {
  // ... existing options ...

  /** Enable cross-chunk context awareness */
  contextAwareness?: boolean;
  /** Number of previous extractions to include as context */
  contextWindowSize?: number;
}

export interface AnnotationOptions {
  maxCharBuffer?: number;
  batchLength?: number;
  debug?: boolean;
  extractionPasses?: number;

  /** Enable cross-chunk context for coreference resolution */
  contextAwareness?: boolean;
  /** Number of previous chunk extractions to include as context */
  contextWindowSize?: number;
}

export class Annotator {
  private contextAwareness: boolean;
  private contextWindowSize: number;

  constructor(languageModel: BaseLanguageModel, promptTemplate: PromptTemplateStructured, options: AnnotatorOptions = {}) {
    // ... existing code ...
    this.contextAwareness = options.contextAwareness ?? false;
    this.contextWindowSize = options.contextWindowSize ?? 5;
  }

  private async annotateDocumentsSinglePass(
    documents: DocumentWithGuaranteedId[],
    resolver: AbstractResolver,
    options: AnnotationInternalOptions
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, batchLength, contextAwareness = false, contextWindowSize = 5 } = options;

    // ... existing chunk collection code ...

    // Track previous extractions for context
    const documentContexts = new Map<string, Extraction[]>();

    for (let i = 0; i < allChunks.length; i += batchLength) {
      const chunkBatch = allChunks.slice(i, i + batchLength);

      // Build prompts with context if enabled
      const batchPrompts = chunkBatch.map(item => {
        let context = item.document.additionalContext || '';

        if (contextAwareness) {
          const prevExtractions = documentContexts.get(item.document.documentId) || [];
          const contextExtractions = prevExtractions.slice(-contextWindowSize);

          if (contextExtractions.length > 0) {
            const contextSummary = this.buildContextSummary(contextExtractions);
            context = context ? `${context}\n\n${contextSummary}` : contextSummary;
          }
        }

        return this.promptGenerator.render(item.chunk.text, context);
      });

      const batchModelOutputs = await this.languageModel.infer(batchPrompts, {
        maxDecodeSteps: this.maxTokens,
      });

      // Process results and update context
      for (let j = 0; j < chunkBatch.length; j++) {
        const { chunk, document } = chunkBatch[j];
        const modelOutputs = batchModelOutputs[j];

        if (modelOutputs.length > 0 && modelOutputs[0].output) {
          const output = modelOutputs[0].output;
          const extractions = resolver.resolve(output);
          const alignedExtractions = resolver.align(extractions, chunk.text, chunk.tokenOffset, chunk.charOffset);

          // Update document extractions
          if (!documentExtractions.has(document.documentId)) {
            documentExtractions.set(document.documentId, []);
          }
          documentExtractions.get(document.documentId)!.push(...alignedExtractions);

          // Update context for next chunks
          if (contextAwareness) {
            if (!documentContexts.has(document.documentId)) {
              documentContexts.set(document.documentId, []);
            }
            documentContexts.get(document.documentId)!.push(...alignedExtractions);
          }
        }
      }
    }

    // ... rest of implementation
  }

  private buildContextSummary(extractions: Extraction[]): string {
    if (extractions.length === 0) return '';

    const summary = extractions.map(e => {
      let entry = `- ${e.extractionClass}: "${e.extractionText}"`;
      if (e.attributes && Object.keys(e.attributes).length > 0) {
        const attrs = Object.entries(e.attributes)
          .map(([k, v]) => `${k}=${Array.isArray(v) ? v.join(',') : v}`)
          .join(', ');
        entry += ` (${attrs})`;
      }
      return entry;
    }).join('\n');

    return `Previously extracted entities in this document:\n${summary}`;
  }
}
```

### 6.2 Update Extract Function

**File:** `src/index.ts` (modifications)

```typescript
export interface ExtractOptions {
  // ... existing options ...

  /** Enable cross-chunk context for coreference resolution */
  contextAwareness?: boolean;
  /** Number of previous extractions to include as context (default: 5) */
  contextWindowSize?: number;
}

export async function extract(/* ... */): Promise<AnnotatedDocument | AnnotatedDocument[]> {
  const {
    // ... existing options ...
    contextAwareness = false,
    contextWindowSize = 5,
  } = options;

  // ... existing code ...

  const annotator = new Annotator(languageModel, promptTemplate, {
    formatType,
    fenceOutput,
    maxTokens,
    contextAwareness,
    contextWindowSize,
  });

  // Pass context options to annotateDocuments
  if (typeof textOrDocuments === 'string') {
    return await annotator.annotateText(textOrDocuments, resolver, {
      maxCharBuffer,
      batchLength,
      additionalContext,
      debug,
      extractionPasses,
      contextAwareness,
      contextWindowSize,
    });
  }
  // ... similar for other branches
}
```

### 6.3 Tests for Phase 6

**File:** `src/__tests__/annotation/context.test.ts`

```typescript
describe('Cross-Chunk Context', () => {
  let mockLanguageModel: jest.Mocked<BaseLanguageModel>;
  let mockResolver: jest.Mocked<AbstractResolver>;

  beforeEach(() => {
    mockLanguageModel = {
      infer: jest.fn(),
    } as any;

    mockResolver = {
      resolve: jest.fn(),
      align: jest.fn(),
      fenceOutput: false,
      formatType: FormatType.JSON,
    } as any;
  });

  it('should not include context when contextAwareness is false', async () => {
    mockLanguageModel.infer.mockResolvedValue([[{ score: 1, output: '{"extractions":[]}' }]]);
    mockResolver.resolve.mockReturnValue([]);
    mockResolver.align.mockReturnValue([]);

    const annotator = new Annotator(mockLanguageModel, { description: 'test', examples: [] }, {
      contextAwareness: false,
    });

    await annotator.annotateText('First chunk. Second chunk.', mockResolver, {
      maxCharBuffer: 15,
      batchLength: 1,
    });

    // Verify prompts don't include "Previously extracted"
    const calls = mockLanguageModel.infer.mock.calls;
    for (const call of calls) {
      expect(call[0][0]).not.toContain('Previously extracted');
    }
  });

  it('should include previous extractions when contextAwareness is true', async () => {
    // First chunk returns an extraction
    mockLanguageModel.infer
      .mockResolvedValueOnce([[{ score: 1, output: '{"extractions":[{"person":"John"}]}' }]])
      .mockResolvedValueOnce([[{ score: 1, output: '{"extractions":[]}' }]]);

    mockResolver.resolve
      .mockReturnValueOnce([{ extractionClass: 'person', extractionText: 'John' }])
      .mockReturnValueOnce([]);

    mockResolver.align.mockImplementation((extractions) => extractions);

    const annotator = new Annotator(mockLanguageModel, { description: 'test', examples: [] }, {
      contextAwareness: true,
      contextWindowSize: 5,
    });

    await annotator.annotateText('John works at Google. He is a good engineer.', mockResolver, {
      maxCharBuffer: 25,
      batchLength: 1,
    });

    // Second chunk should include context about John
    const secondCallPrompt = mockLanguageModel.infer.mock.calls[1][0][0];
    expect(secondCallPrompt).toContain('Previously extracted');
    expect(secondCallPrompt).toContain('person');
    expect(secondCallPrompt).toContain('John');
  });

  it('should limit context to contextWindowSize', async () => {
    // Return multiple extractions
    mockLanguageModel.infer.mockResolvedValue([[{ score: 1, output: '{}' }]]);

    const manyExtractions = Array.from({ length: 10 }, (_, i) => ({
      extractionClass: 'item',
      extractionText: `Item${i}`,
    }));

    mockResolver.resolve.mockReturnValue(manyExtractions);
    mockResolver.align.mockImplementation((extractions) => extractions);

    const annotator = new Annotator(mockLanguageModel, { description: 'test', examples: [] }, {
      contextAwareness: true,
      contextWindowSize: 3,
    });

    // Process document with multiple chunks
    const longText = 'A'.repeat(100) + 'B'.repeat(100) + 'C'.repeat(100);
    await annotator.annotateText(longText, mockResolver, {
      maxCharBuffer: 100,
      batchLength: 1,
    });

    // Last chunk's prompt should only have last 3 extractions
    const lastCall = mockLanguageModel.infer.mock.calls[mockLanguageModel.infer.mock.calls.length - 1];
    const prompt = lastCall[0][0];

    // Should contain Item7, Item8, Item9 (last 3)
    // Should NOT contain Item0, Item1, etc.
    expect(prompt).toContain('Item9');
    expect(prompt).not.toContain('Item0');
  });

  describe('buildContextSummary', () => {
    it('should format extractions with attributes', () => {
      const annotator = new Annotator(
        mockLanguageModel,
        { description: 'test', examples: [] },
        { contextAwareness: true }
      );

      const extractions: Extraction[] = [
        {
          extractionClass: 'person',
          extractionText: 'John',
          attributes: { age: '30', role: 'engineer' },
        },
      ];

      const summary = annotator['buildContextSummary'](extractions);
      expect(summary).toContain('person');
      expect(summary).toContain('John');
      expect(summary).toContain('age=30');
      expect(summary).toContain('role=engineer');
    });

    it('should return empty string for no extractions', () => {
      const annotator = new Annotator(
        mockLanguageModel,
        { description: 'test', examples: [] },
        { contextAwareness: true }
      );

      const summary = annotator['buildContextSummary']([]);
      expect(summary).toBe('');
    });
  });
});
```

### 6.4 Verification Steps

1. Run `npm test -- --testPathPattern=context` - all context tests pass
2. Test with long document containing pronouns - verify context improves resolution
3. Verify context is document-specific (not shared across documents in batch)
4. Verify contextWindowSize limits context length

---

## Phase 7: Vertex AI Provider

**Goal:** Add support for Vertex AI as an enterprise deployment option.

### 7.1 Create Vertex AI Provider

**File:** `src/providers/vertexai.ts`

```typescript
import axios from 'axios';
import { registerProvider, ProviderConfig, ProviderMetadata } from './registry';
import { BaseLanguageModel, InferenceOptions } from './base';
import { ScoredOutput, FormatType } from '../types';
import { GeminiSchema } from '../schema';
import { withRetry, DEFAULT_RETRY_CONFIG } from '../utils/retry';

const VERTEXAI_METADATA: ProviderMetadata = {
  name: 'vertexai',
  displayName: 'Google Vertex AI',
  priority: 95,
  supportsSchema: true,
  requiresApiKey: false,  // Uses ADC or service account
  defaultModel: 'gemini-1.5-pro',
};

export interface VertexAIConfig extends ProviderConfig {
  projectId: string;
  location?: string;
  modelId?: string;
  credentials?: string | object;  // Service account key or path
  accessToken?: string;           // Direct access token
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  geminiSchema?: GeminiSchema;
}

@registerProvider(VERTEXAI_METADATA)
export class VertexAILanguageModel implements BaseLanguageModel {
  readonly providerName = 'vertexai';
  readonly supportsSchema = true;

  private config: Required<Pick<VertexAIConfig, 'projectId' | 'location' | 'modelId' | 'temperature' | 'maxTokens' | 'timeout'>> & VertexAIConfig;
  private accessToken?: string;

  constructor(config: VertexAIConfig) {
    if (!config.projectId) {
      throw new Error('projectId is required for Vertex AI');
    }

    this.config = {
      location: 'us-central1',
      modelId: 'gemini-1.5-pro',
      temperature: 0.0,
      maxTokens: 2048,
      timeout: 120000,
      ...config,
    };

    this.accessToken = config.accessToken;
  }

  async infer(batchPrompts: string[], options: InferenceOptions = {}): Promise<ScoredOutput[][]> {
    const results: ScoredOutput[][] = [];

    for (const prompt of batchPrompts) {
      try {
        const response = await this.callVertexAI(prompt, options);
        results.push([{ score: 1.0, output: response }]);
      } catch (error) {
        results.push([{ score: 0, output: undefined }]);
      }
    }

    return results;
  }

  private async callVertexAI(prompt: string, options: InferenceOptions): Promise<string> {
    const { projectId, location, modelId, temperature, maxTokens, timeout } = this.config;

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:generateContent`;

    const requestBody: any = {
      contents: [{
        parts: [{ text: prompt }],
      }],
      generationConfig: {
        temperature: options.temperature ?? temperature,
        maxOutputTokens: options.maxDecodeSteps ?? maxTokens,
      },
    };

    // Add schema if available
    if (this.config.geminiSchema) {
      requestBody.generationConfig.responseSchema = this.config.geminiSchema.schemaDict;
    }

    const token = await this.getAccessToken();

    return withRetry(async () => {
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        timeout,
      });

      if (response.data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return response.data.candidates[0].content.parts[0].text;
      }

      throw new Error('Invalid response format from Vertex AI');
    }, DEFAULT_RETRY_CONFIG);
  }

  private async getAccessToken(): Promise<string> {
    // If token provided directly, use it
    if (this.accessToken) {
      return this.accessToken;
    }

    // If credentials provided, use them to get token
    if (this.config.credentials) {
      return this.getTokenFromCredentials(this.config.credentials);
    }

    // Fall back to Application Default Credentials (ADC)
    return this.getTokenFromADC();
  }

  private async getTokenFromCredentials(credentials: string | object): Promise<string> {
    // Load service account credentials and generate JWT
    // This is a simplified implementation - real implementation would use google-auth-library
    throw new Error('Service account credentials not yet implemented. Use accessToken or ADC.');
  }

  private async getTokenFromADC(): Promise<string> {
    // Get token from metadata server (when running on GCP)
    try {
      const response = await axios.get(
        'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
        {
          headers: { 'Metadata-Flavor': 'Google' },
          timeout: 5000,
        }
      );
      return response.data.access_token;
    } catch {
      throw new Error(
        'Failed to get access token. Provide accessToken, credentials, or run on GCP with ADC.'
      );
    }
  }
}
```

### 7.2 Update Extract Function

**File:** `src/index.ts` (modifications)

```typescript
export type ModelType = 'gemini' | 'openai' | 'ollama' | 'vertexai';

export interface ExtractOptions {
  // ... existing options ...

  /** GCP project ID for Vertex AI */
  projectId?: string;
  /** GCP region for Vertex AI (default: us-central1) */
  location?: string;
  /** Vertex AI access token */
  accessToken?: string;
}
```

### 7.3 Tests for Phase 7

**File:** `src/__tests__/providers/vertexai.test.ts`

```typescript
describe('VertexAILanguageModel', () => {
  let mockAxios: jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockAxios = axios as jest.Mocked<typeof axios>;
    mockAxios.post.mockReset();
    mockAxios.get.mockReset();
  });

  it('should throw if projectId is missing', () => {
    expect(() => new VertexAILanguageModel({} as any)).toThrow('projectId is required');
  });

  it('should have correct provider metadata', () => {
    const model = new VertexAILanguageModel({ projectId: 'test-project', accessToken: 'token' });
    expect(model.providerName).toBe('vertexai');
    expect(model.supportsSchema).toBe(true);
  });

  it('should use correct endpoint URL', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });

    const model = new VertexAILanguageModel({
      projectId: 'my-project',
      location: 'us-east1',
      modelId: 'gemini-1.5-flash',
      accessToken: 'test-token',
    });

    await model.infer(['test prompt']);

    expect(mockAxios.post).toHaveBeenCalledWith(
      'https://us-east1-aiplatform.googleapis.com/v1/projects/my-project/locations/us-east1/publishers/google/models/gemini-1.5-flash:generateContent',
      expect.any(Object),
      expect.any(Object)
    );
  });

  it('should use provided access token', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });

    const model = new VertexAILanguageModel({
      projectId: 'my-project',
      accessToken: 'my-access-token',
    });

    await model.infer(['test']);

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-access-token',
        }),
      })
    );
  });

  it('should fallback to ADC on GCP', async () => {
    // Mock metadata server response
    mockAxios.get.mockResolvedValueOnce({
      data: { access_token: 'adc-token' }
    });

    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });

    const model = new VertexAILanguageModel({ projectId: 'my-project' });
    await model.infer(['test']);

    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('metadata.google.internal'),
      expect.any(Object)
    );
  });

  it('should include schema in request', async () => {
    mockAxios.post.mockResolvedValueOnce({
      data: { candidates: [{ content: { parts: [{ text: '{}' }] } }] }
    });

    const schema = GeminiSchemaImpl.fromExamples([{
      text: 'test',
      extractions: [{ extractionClass: 'person', extractionText: 'John' }]
    }]);

    const model = new VertexAILanguageModel({
      projectId: 'my-project',
      accessToken: 'token',
      geminiSchema: schema,
    });

    await model.infer(['test']);

    expect(mockAxios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        generationConfig: expect.objectContaining({
          responseSchema: expect.any(Object),
        }),
      }),
      expect.any(Object)
    );
  });
});
```

### 7.4 Verification Steps

1. Run `npm test -- --testPathPattern=vertexai` - all tests pass
2. Integration test with real Vertex AI project (requires GCP setup)
3. Verify ADC works when running on GCP
4. Verify direct access token works

---

## Phase 8: Batch API Support

**Goal:** Add support for Vertex AI Batch API for cost-effective large-scale processing.

### 8.1 Create Batch Processing Module

**File:** `src/batch/types.ts`

```typescript
export interface BatchJobConfig {
  projectId: string;
  location: string;
  modelId: string;
  inputGcsUri?: string;   // GCS path for input
  outputGcsUri?: string;  // GCS path for output
  accessToken: string;
}

export interface BatchJob {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  inputCount: number;
  outputCount?: number;
  error?: string;
}

export interface BatchRequest {
  prompts: string[];
  jobName?: string;
}

export interface BatchResult {
  job: BatchJob;
  results: Array<{
    promptIndex: number;
    output?: string;
    error?: string;
  }>;
}
```

**File:** `src/batch/manager.ts`

```typescript
import axios from 'axios';
import { BatchJobConfig, BatchJob, BatchRequest, BatchResult } from './types';

export class BatchManager {
  private config: BatchJobConfig;

  constructor(config: BatchJobConfig) {
    this.config = config;
  }

  /**
   * Submit a batch job to Vertex AI.
   */
  async submitBatch(request: BatchRequest): Promise<BatchJob> {
    // Implementation would:
    // 1. Upload prompts to GCS as JSONL
    // 2. Create batch prediction job
    // 3. Return job metadata
    throw new Error('Batch API not yet implemented');
  }

  /**
   * Check status of a batch job.
   */
  async getJobStatus(jobId: string): Promise<BatchJob> {
    throw new Error('Batch API not yet implemented');
  }

  /**
   * Wait for job completion with polling.
   */
  async waitForCompletion(jobId: string, pollIntervalMs: number = 30000): Promise<BatchJob> {
    throw new Error('Batch API not yet implemented');
  }

  /**
   * Download and parse results from completed job.
   */
  async getResults(jobId: string): Promise<BatchResult> {
    throw new Error('Batch API not yet implemented');
  }

  /**
   * Cancel a running batch job.
   */
  async cancelJob(jobId: string): Promise<void> {
    throw new Error('Batch API not yet implemented');
  }
}
```

**Note:** Full batch API implementation requires GCS integration and is marked as future work. The interface is defined here for planning purposes.

### 8.2 Add Batch Option to Extract

**File:** `src/index.ts` (modifications)

```typescript
export interface ExtractOptions {
  // ... existing options ...

  /** Batch processing configuration */
  batch?: {
    enabled: boolean;
    gcsInputPath?: string;
    gcsOutputPath?: string;
  };
}
```

### 8.3 Tests for Phase 8

**File:** `src/__tests__/batch/manager.test.ts`

```typescript
describe('BatchManager', () => {
  it('should be instantiable with config', () => {
    const manager = new BatchManager({
      projectId: 'test-project',
      location: 'us-central1',
      modelId: 'gemini-1.5-pro',
      accessToken: 'token',
    });

    expect(manager).toBeInstanceOf(BatchManager);
  });

  // Placeholder tests for future implementation
  it.todo('should submit batch job to Vertex AI');
  it.todo('should poll for job completion');
  it.todo('should download results from GCS');
  it.todo('should handle job failures gracefully');
  it.todo('should support job cancellation');
});
```

### 8.4 Verification Steps

1. Run `npm test -- --testPathPattern=batch` - placeholder tests pass
2. Document batch API as "coming soon" in README
3. Ensure batch config doesn't break existing functionality

---

## Phase 9: Documentation & Tooling

**Goal:** Update documentation, add tooling, and improve developer experience.

### 9.1 Update README

Add sections for:
- New provider plugin system
- Multi-language tokenization
- Retry configuration
- Prompt validation
- Cross-chunk context
- Vertex AI provider
- Migration guide from 1.2.0

### 9.2 Add CONTRIBUTING.md

**File:** `CONTRIBUTING.md`

```markdown
# Contributing to LangExtract TypeScript

## Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Build: `npm run build`

## Adding a New Provider

1. Create a new file in `src/providers/`
2. Implement `BaseLanguageModel` interface
3. Register with `@registerProvider` decorator
4. Add tests in `src/__tests__/providers/`
5. Update documentation

## Code Style

- Use TypeScript strict mode
- Follow existing patterns
- Add JSDoc comments for public APIs
- Maintain 100% test coverage for new code

## Pull Request Process

1. Create a feature branch
2. Make changes with tests
3. Run `npm test` and `npm run lint`
4. Submit PR with description of changes
```

### 9.3 Add CITATION.cff

**File:** `CITATION.cff`

```yaml
cff-version: 1.2.0
message: "If you use this software, please cite it as below."
authors:
  - name: "kmbro"
title: "LangExtract TypeScript"
version: "2.0.0"
date-released: "2026-01-01"
url: "https://github.com/kmbro/langextract-typescript"
repository-code: "https://github.com/kmbro/langextract-typescript"
license: Apache-2.0
keywords:
  - nlp
  - information-extraction
  - llm
  - typescript
references:
  - type: software
    authors:
      - name: "Google LLC"
    title: "LangExtract"
    url: "https://github.com/google/langextract"
```

### 9.4 Add Pre-commit Configuration

**File:** `.pre-commit-config.yaml`

```yaml
repos:
  - repo: local
    hooks:
      - id: lint
        name: ESLint
        entry: npm run lint
        language: system
        types: [typescript]
        pass_filenames: false

      - id: test
        name: Jest Tests
        entry: npm test -- --passWithNoTests
        language: system
        pass_filenames: false
        stages: [commit]

      - id: build
        name: TypeScript Build
        entry: npm run build
        language: system
        pass_filenames: false
        stages: [push]
```

### 9.5 Update package.json

**File:** `package.json` (modifications)

```json
{
  "name": "langextract",
  "version": "2.0.0",
  "description": "TypeScript library for extracting structured information from text using LLMs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./providers": {
      "import": "./dist/providers/index.js",
      "require": "./dist/providers/index.js",
      "types": "./dist/providers/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run clean && npm run build && npm test",
    "visualize": "npx ts-node bin/visualize.ts"
  },
  "keywords": [
    "nlp",
    "information-extraction",
    "llm",
    "ai",
    "typescript",
    "gemini",
    "openai",
    "vertexai",
    "ollama"
  ]
}
```

### 9.6 Verification Steps

1. All documentation is accurate and up-to-date
2. CONTRIBUTING.md covers the development workflow
3. Pre-commit hooks work correctly
4. Package exports work for both CommonJS and ESM
5. All tests pass with `npm test`
6. Build succeeds with `npm run build`

---

## Summary: Implementation Order

| Phase | Description | Dependencies | Estimated Tests |
|-------|-------------|--------------|-----------------|
| 1 | Provider Plugin Architecture | None | 25 |
| 2 | Multi-Language Tokenizer | None | 30 |
| 3 | Retry & Error Handling | None | 20 |
| 4 | Configuration & Defaults | None | 15 |
| 5 | Prompt Validation | Phase 2 (tokenizer) | 15 |
| 6 | Cross-Chunk Context | None | 20 |
| 7 | Vertex AI Provider | Phase 1, 3 | 15 |
| 8 | Batch API Support | Phase 7 | 10 (stubs) |
| 9 | Documentation & Tooling | All phases | N/A |

**Total New Tests:** ~150

**Recommended execution order:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

Each phase can be completed and tested independently before moving to the next.
