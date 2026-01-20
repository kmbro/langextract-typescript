# LangExtract TypeScript - Upstream Sync Required Changes

**Analysis Date:** 2026-01-20
**Upstream Version:** 1.1.1 (Python)
**Current TypeScript Version:** 1.2.0
**Upstream Commits Since Fork:** ~127 commits

---

## Executive Summary

The upstream Python repository has evolved significantly with 127 commits adding major features, architectural improvements, and enhanced functionality. This document outlines all changes needed to bring the TypeScript port to feature parity with the Python version.

---

## 1. Architecture & Code Organization

### 1.1 Core Module Reorganization
**Status:** 🔴 Not Implemented
**Priority:** HIGH

The Python version has reorganized code into a `core/` directory with better separation of concerns:

**New Structure Needed:**
```
src/
  core/
    base_model.ts        - BaseLanguageModel interface
    data.ts              - Core data structures
    types.ts             - Type definitions
    schema.ts            - Schema generation
    tokenizer.ts         - Tokenization
    format_handler.ts    - Format handling
    exceptions.ts        - Exception hierarchy
    debug_utils.ts       - Debug utilities
```

**Changes Required:**
- Move core types and interfaces to `core/` directory
- Maintain backward compatibility with re-exports from root level
- Update all imports throughout codebase

**Upstream Commits:**
- Multiple refactoring commits for core organization

---

### 1.2 Plugin System & Provider Registry
**Status:** 🔴 Not Implemented
**Priority:** HIGH

The Python version includes a complete plugin system for extensible provider support.

**Components Needed:**
- `plugins.ts` - Plugin discovery and registration
- `registry.ts` - Provider registry management
- `factory.ts` - Factory pattern for model creation
- Entry point system for third-party providers

**Key Features:**
```typescript
// Plugin registration via decorator or manual registration
@registerProvider('custom-provider')
class CustomProvider implements BaseLanguageModel {
  // Implementation
}

// Automatic discovery of installed provider packages
// Built-in vs optional vs third-party provider handling
// Priority and override system
```

**Benefits:**
- Allow third-party provider plugins
- Cleaner separation of provider code
- Dynamic provider discovery
- Better extensibility

**Upstream Commits:**
- Provider plugin system implementation
- Registry management additions

---

## 2. Language Model Providers

### 2.1 Vertex AI Batch API Support
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

Batch processing support for cost-effective large-scale extraction.

**New File:** `src/providers/gemini_batch.ts`

**Components:**
```typescript
interface BatchConfig {
  enabled: boolean;
  threshold: number;          // Min prompts to trigger batch
  pollingIntervalSeconds: number;
  timeoutMinutes: number;
  maxPromptsPerJob: number;
}

class GCSBatchCache {
  // GCS-based result caching with SHA256 keys
  // Multi-threaded get/set operations
  // Lifecycle management for auto-deletion
}

async function inferBatch(
  prompts: string[],
  config: BatchConfig
): Promise<ScoredOutput[][]>
```

**Features:**
- Upload JSONL to GCS
- Submit batch jobs to Vertex AI
- Poll for completion
- Cache results in GCS
- Automatic fallback to real-time for small batches

**Upstream Commits:**
- `848d5aa` - feat: Add Vertex AI Batch API support with real-time fallback (#279)
- `0ca4843` - Fix: Pass project parameter correctly to storage.Client (#286)

---

### 2.2 Enhanced Provider Configuration
**Status:** 🟡 Partially Implemented
**Priority:** MEDIUM

**Changes Needed:**

1. **Environment Variable Auto-Detection:**
```typescript
// Auto-resolve API keys from environment
const geminiKey = process.env.GEMINI_API_KEY ||
                  process.env.LANGEXTRACT_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY ||
                  process.env.LANGEXTRACT_API_KEY;
```

2. **Model Identifier Resolution:**
```typescript
// Automatically determine provider from model ID
resolveProvider('gemini-2.5-flash') // -> GeminiLanguageModel
resolveProvider('gpt-4o') // -> OpenAILanguageModel
```

3. **Provider-Specific Defaults:**
- Model-specific default parameters
- Automatic project/location detection for Vertex AI
- Better error messages for missing credentials

---

## 3. Tokenization

### 3.1 Multi-Language Unicode Tokenizer
**Status:** 🔴 Not Implemented
**Priority:** HIGH

The current TypeScript implementation uses a simple regex tokenizer. The Python version has a sophisticated multi-language tokenizer.

**New File:** `src/core/tokenizer.ts`

**Tokenizer Classes:**

```typescript
abstract class BaseTokenizer {
  abstract tokenize(text: string): TokenizedText;
}

class RegexTokenizer extends BaseTokenizer {
  // Current implementation - fast for English
  // Uses simple regex patterns
}

class UnicodeTokenizer extends BaseTokenizer {
  // NEW: UAX #29 compliant tokenizer
  // Handles grapheme clusters correctly
  // Multi-language support:
  //   - CJK (Chinese, Japanese, Korean)
  //   - Thai, Lao, Khmer, Myanmar
  //   - Arabic, Hebrew, Devanagari
  //   - Greek, Cyrillic, Latin
  // Preserves exact character indices
  // No normalization to preserve positions
}
```

**Features:**
- Grapheme cluster detection (emojis, combining characters)
- Script-aware tokenization
- Character-level fragmentation for CJK
- Type classification (WORD, NUMBER, PUNCTUATION)
- Newline-adjacent token detection for sentence boundaries

**Implementation Requirements:**
- Use Unicode regex library (XRegExp or similar)
- Implement `\X` pattern for grapheme clusters
- Script detection using Unicode properties
- State machine for token merging logic

**Upstream Commits:**
- `0c1af87` - refactor: Multi-language tokenizer support (Unicode & Regex) (#284)
- Added Japanese extraction example

---

## 4. Format Handling

### 4.1 FormatHandler Class
**Status:** 🔴 Not Implemented
**Priority:** HIGH

Centralized format handling for model outputs.

**New File:** `src/core/format_handler.ts`

```typescript
class FormatHandler {
  constructor(
    formatType: FormatType,
    useWrapper: boolean = true,
    wrapperKey: string = 'extractions',
    strict: boolean = false
  )

  // Convert extractions to prompt examples
  formatExamples(extractions: Extraction[]): string

  // Parse model output (with fence detection)
  parseOutput(output: string): any[]

  // Validate output structure
  validateOutput(data: any, strict?: boolean): void

  // Strip reasoning tags (<think>...</think>)
  stripReasoningTags(output: string): string
}
```

**Features:**
- Automatic fence detection and removal (```json, ```yaml)
- Wrapper object handling
- Schema validation
- Support for reasoning models (DeepSeek-R1, QwQ)
- Accepts top-level lists when models omit wrapper
- Multi-layered validation

**Benefits:**
- Cleaner resolver code
- Better error messages
- Support for more model types
- Centralized format logic

**Upstream Commits:**
- `895afe9` - feat: Add FormatHandler and schema validation framework (#239)
- `4882369` - fix: Handle non-Gemini model output parsing edge cases (#300)

---

## 5. Document Processing

### 5.1 Dedicated Chunking Module
**Status:** 🟡 Partially Implemented
**Priority:** MEDIUM

Current TypeScript implementation has basic chunking in `annotation.ts`. Python has a dedicated module.

**New File:** `src/chunking.ts`

```typescript
interface TextChunk {
  text: string;
  tokenInterval: TokenInterval;
  sourceDocumentId: string;
  additionalContext?: string;
  // Computed properties:
  charInterval: CharInterval;
  sanitizedText: string;
}

class SentenceIterator {
  // Traverse tokenized document sentence-by-sentence
  constructor(
    tokenizedText: TokenizedText,
    startTokenPos: number = 0
  )

  *[Symbol.iterator](): Iterator<TokenInterval>
}

class ChunkIterator {
  // Combine sentences into chunks respecting max_char_buffer
  constructor(
    document: Document,
    maxCharBuffer: number,
    tokenizerImpl: BaseTokenizer
  )

  *[Symbol.iterator](): Iterator<TextChunk>
}

function makeBatchesOfTextChunk(
  chunks: TextChunk[],
  batchLength: number
): TextChunk[][]
```

**Features:**
- Whole sentence grouping
- Sentence splitting at newlines when needed
- Token preservation (no discarding oversized tokens)
- Metadata preservation through pipeline
- Iterator-based for memory efficiency

**Benefits:**
- Better separation of concerns
- More testable code
- Reusable chunking logic
- Memory efficient with iterators

---

### 5.2 Cross-Chunk Context Awareness
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

Support for passing context between chunks to resolve coreferences.

**Parameter Addition:**
```typescript
interface ExtractOptions {
  // ... existing options
  contextWindowChars?: number;  // NEW
}
```

**Implementation:**
```typescript
// When processing chunks, pass trailing text from previous chunk
// as context for the next chunk
const previousContext = previousChunk.text.slice(-contextWindowChars);
const currentPrompt = buildPromptWithContext(
  currentChunk,
  previousContext
);
```

**Use Case:**
```
Chunk 1: "Dr. Sarah Johnson is a cardiologist..."
Chunk 2: "She graduated from Harvard..."
         ^-- "She" refers to "Dr. Sarah Johnson" from Chunk 1
```

**Upstream Commits:**
- `3638fe4` - feat: Add cross-chunk context awareness for coreference resolution (#306)

---

### 5.3 Lazy Document Streaming
**Status:** 🔴 Not Implemented
**Priority:** LOW

Reduce memory usage from O(documents) to O(batch_size).

**Changes:**
- Use iterators/generators instead of loading all documents
- Process documents in streaming fashion
- Only keep current batch in memory

**Upstream Commits:**
- `fe18abe` - fix: streamline annotation layer with lazy streaming (#276)

---

## 6. Input/Output

### 6.1 URL Loading Support
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

The Python version can load text from URLs.

**New Functions in `io.ts`:**

```typescript
function isUrl(input: string): boolean {
  // Validate http/https URLs
  // Check scheme, netloc, hostname
  // Support IP addresses, localhost, domains
}

async function downloadTextFromUrl(
  url: string,
  showProgress: boolean = true
): Promise<string> {
  // Stream download with progress bar
  // Multiple encoding fallbacks (UTF-8, Latin-1, ASCII, UTF-16)
  // Content-Type checking
  // Character/word count reporting
}
```

**Usage:**
```typescript
// Accept URLs directly in extract()
const result = await extract('https://example.com/article.txt', {
  examples: examples,
  apiKey: apiKey
});
```

---

### 6.2 Dataset Class & CSV Support
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

**New Class:**
```typescript
class Dataset {
  constructor(
    inputPath: string,
    textColumn: string = 'text',
    documentIdColumn?: string,
    delimiter: string = ','
  )

  *load(): Generator<Document> {
    // Load from CSV files
    // Support custom delimiters
    // Auto-generate document IDs if needed
    // Yield documents one at a time
  }
}
```

**Usage:**
```typescript
const dataset = new Dataset('documents.csv', 'content', 'id');
const results = await extract(dataset.load(), options);
```

**Future Extensions:**
- JSON/JSONL support
- Parquet support
- Excel support
- Database connections

---

### 6.3 Enhanced JSONL I/O
**Status:** 🟡 Partially Implemented
**Priority:** LOW

**Improvements Needed:**
- Progress bars during load/save
- Better error handling
- Streaming support for large files
- Output directory auto-creation (already done)

---

## 7. User Experience

### 7.1 Progress Tracking System
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

Comprehensive progress bar system with colored output.

**New File:** `src/progress.ts`

```typescript
// Using cli-progress or similar library

function createDownloadProgressBar(url: string): ProgressBar
function createExtractionProgressBar(
  iterable: any,
  modelInfo?: string,
  disable?: boolean
): ProgressBar
function createSaveProgressBar(filePath: string): ProgressBar
function createLoadProgressBar(filePath: string): ProgressBar
function createPassProgressBar(
  totalPasses: number,
  disable?: boolean
): ProgressBar

function printCompletionMessage(
  operation: string,
  details?: string
): void

function printSummary(
  extractionCount: number,
  uniqueTypes: string[],
  elapsedTime?: number,
  processingSpeed?: number,
  chunkCount?: number
): void
```

**Features:**
- Colored output (blue, green, cyan)
- ANSI escape codes
- Styled formatting with checkmarks
- URL truncation for display
- Elapsed time and speed metrics
- Configurable via `show_progress` parameter

**Dependencies:**
- `cli-progress` or `progress` library
- `chalk` for colors

**Upstream Commits:**
- `51bded6` - feat: Add show_progress parameter for independent progress bar control (#227)

---

### 7.2 Independent Progress Control
**Status:** 🔴 Not Implemented
**Priority:** LOW

**New Parameter:**
```typescript
interface ExtractOptions {
  // ... existing
  debug?: boolean;      // Existing
  showProgress?: boolean; // NEW - independent of debug
}
```

**Behavior:**
- `showProgress=true, debug=false` → Show progress bars only
- `showProgress=false, debug=true` → Show debug logs only
- Both can be enabled/disabled independently

---

### 7.3 Enhanced Error Hierarchy
**Status:** 🟡 Partially Implemented
**Priority:** LOW

**Current TypeScript:**
- `InferenceOutputError`

**Python Has:**
```typescript
// Base
class LangExtractError extends Error {}

// Inference
class InferenceError extends LangExtractError {}
class InferenceConfigError extends InferenceError {}
class InferenceRuntimeError extends InferenceError {}
class InferenceOutputError extends InferenceError {}

// Provider
class ProviderError extends LangExtractError {}

// Schema
class SchemaError extends LangExtractError {}
```

**Benefits:**
- Better error categorization
- Easier error handling in user code
- More specific error messages

---

## 8. Prompt Engineering

### 8.1 Prompt Validation Module
**Status:** 🔴 Not Implemented
**Priority:** LOW

**New File:** `src/prompt_validation.ts`

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validatePromptTemplate(
  template: PromptTemplateStructured
): ValidationResult {
  // Check examples are well-formed
  // Validate extraction schema
  // Check for common mistakes
  // Provide helpful warnings
}

function validateExamples(
  examples: ExampleData[]
): ValidationResult {
  // Ensure examples have required fields
  // Check for inconsistent schemas
  // Validate attribute types
  // Check for empty extractions
}
```

**Upstream Commits:**
- `7d592bf` - docs: Clarify best practices for few-shot examples (#302)
- Prompt validation module additions

---

## 9. Examples & Documentation

### 9.1 Missing Examples
**Status:** 🔴 Not Implemented
**Priority:** MEDIUM

**New Examples Needed:**

1. **Custom Provider Plugin** (`examples/custom_provider_plugin/`)
   - How to create a custom provider
   - Registration and discovery
   - Implementation guidelines

2. **Notebooks** (`examples/notebooks/`)
   - Jupyter/Observable notebooks
   - Interactive tutorials
   - Step-by-step guides

3. **Ollama Examples** (`examples/ollama/`)
   - Local model usage
   - Configuration examples
   - Performance optimization

4. **Multi-Language Examples**
   - Japanese text extraction
   - Arabic text processing
   - Chinese NER
   - Demonstrates Unicode tokenizer

5. **Batch Processing Example**
   - Vertex AI Batch API usage
   - Cost optimization strategies
   - Large-scale extraction

6. **URL Loading Example**
   - Extract from web pages
   - Handle different encodings
   - Error handling

---

## 10. Testing & Quality

### 10.1 Benchmark Suite
**Status:** 🔴 Not Implemented
**Priority:** LOW

**New Directory:** `benchmarks/`

```typescript
// Tokenization benchmarks
- Performance across text types
- Multi-language tokenization quality
- Memory usage profiling
- Speed comparisons

// Extraction benchmarks
- Accuracy metrics
- Processing speed
- Memory efficiency
- Batch vs single processing
```

**Upstream Commits:**
- `bd1e3d2` - Add diverse text type benchmark with tokenization quality metrics (#272)

---

### 10.2 Enhanced CI/CD
**Status:** 🟡 Partially Implemented
**Priority:** MEDIUM

**Improvements:**
- Security hardening for fork PRs
- Automated testing across providers
- Pre-commit hooks setup
- Code formatting enforcement
- Linting standards

**Upstream Commits:**
- `7df9044` - Internal: Strengthen CI/CD security for fork PR validation (#248)
- `5c780e4` - fix: Apply autoformatting, update pre-commit config (#280)

---

## 11. Configuration & Environment

### 11.1 Environment Variable Handling
**Status:** 🟡 Partially Implemented
**Priority:** MEDIUM

**Enhancements:**

```typescript
import dotenv from 'dotenv';

// Load .env file with override
dotenv.config({ override: true });

// Warn on key conflicts
function checkApiKeyConflicts() {
  const envKeys = [
    'GEMINI_API_KEY',
    'OPENAI_API_KEY',
    'LANGEXTRACT_API_KEY'
  ];

  // Warn if multiple keys are set
  // Provide clear guidance on precedence
}
```

**Upstream Commits:**
- `59e9ab8` - chore: enforce dotenv override and warn on key conflict (#282)

---

### 11.2 Suppress Parse Errors Parameter
**Status:** 🟡 Partially Implemented
**Priority:** LOW

**Fix Needed:**
```typescript
interface ResolverParams {
  // ... existing
  suppressParseErrors?: boolean; // Ensure this is passed through
}

// Ensure parameter is in ALIGNMENT_PARAM_KEYS equivalent
```

**Upstream Commits:**
- `6e36c37` - Fix: Enable suppress_parse_errors parameter in resolver_params (#261)

---

## 12. Dependencies

### 12.1 New Dependencies Needed

**Required:**
- `xregexp` - Unicode regex support for tokenizer
- `cli-progress` or `progress` - Progress bars
- `chalk` - Colored terminal output
- `csv-parse` - CSV file parsing
- `@google-cloud/storage` - GCS support for batch API (optional)
- `@google-cloud/aiplatform` - Vertex AI batch (optional)

**Dev Dependencies:**
- Pre-commit hooks framework
- Additional linting tools
- Benchmark utilities

---

## 13. Breaking Changes to Consider

### 13.1 Module Reorganization

Moving to `core/` directory will require import changes:

**Old:**
```typescript
import { Extraction } from 'langextract';
```

**New (with backward compatibility):**
```typescript
// Both should work
import { Extraction } from 'langextract';
import { Extraction } from 'langextract/core';
```

### 13.2 Tokenizer Selection

**Default Tokenizer Change:**
- Keep RegexTokenizer as default for backward compatibility
- Provide UnicodeTokenizer as opt-in
- Document performance tradeoffs

```typescript
extract(text, {
  tokenizerType: 'unicode', // or 'regex' (default)
  // ...
});
```

---

## 14. Implementation Priority Matrix

### Phase 1: Critical (High Impact, Foundation)
1. ✅ **Plugin System & Registry** - Enables extensibility
2. ✅ **FormatHandler Class** - Better output parsing
3. ✅ **Unicode Tokenizer** - Multi-language support
4. ✅ **Core Module Reorganization** - Better architecture
5. ✅ **Enhanced Exception Hierarchy** - Better errors

### Phase 2: Important (High Value)
6. ⚠️ **Progress Tracking System** - Better UX
7. ⚠️ **Dedicated Chunking Module** - Cleaner code
8. ⚠️ **URL Loading** - Useful feature
9. ⚠️ **Cross-Chunk Context** - Better accuracy
10. ⚠️ **Provider Factory** - Cleaner initialization

### Phase 3: Valuable (Medium Priority)
11. 📋 **Vertex AI Batch API** - Cost optimization
12. 📋 **Dataset Class & CSV Support** - More input formats
13. 📋 **show_progress Parameter** - Independent control
14. 📋 **Enhanced Provider Config** - Better defaults
15. 📋 **Examples** - Better documentation

### Phase 4: Nice to Have (Low Priority)
16. 💡 **Lazy Document Streaming** - Memory optimization
17. 💡 **Prompt Validation** - Helpful but not critical
18. 💡 **Benchmark Suite** - Performance tracking
19. 💡 **Enhanced CI/CD** - Process improvements

---

## 15. Estimated Effort

**Total Estimated Effort:** ~4-6 weeks (1 developer)

### Breakdown by Phase:

**Phase 1 (Critical):** ~2 weeks
- Plugin system: 3 days
- FormatHandler: 2 days
- Unicode tokenizer: 4 days
- Module reorganization: 2 days
- Exception hierarchy: 1 day

**Phase 2 (Important):** ~1.5 weeks
- Progress tracking: 2 days
- Chunking module: 2 days
- URL loading: 1 day
- Cross-chunk context: 2 days
- Provider factory: 1 day

**Phase 3 (Valuable):** ~1.5 weeks
- Batch API: 4 days
- Dataset/CSV: 2 days
- Examples: 2 days

**Phase 4 (Nice to Have):** ~1 week
- Streaming: 2 days
- Validation: 1 day
- Benchmarks: 2 days

---

## 16. Testing Strategy

For each new feature:

1. **Unit Tests**
   - Test individual functions/classes
   - Mock external dependencies
   - Edge case coverage

2. **Integration Tests**
   - Test with real LLM APIs (use test keys)
   - Multi-language text samples
   - Various file formats

3. **Regression Tests**
   - Ensure existing functionality still works
   - Backward compatibility checks
   - Performance benchmarks

4. **Documentation**
   - Update README
   - Add example code
   - Update API reference
   - Add migration guide

---

## 17. Migration Guide for Users

When releasing these changes, provide a migration guide:

### For v2.0.0 Release:

**Breaking Changes:**
- Module imports may change (with backward compatibility)
- Default tokenizer remains the same
- Existing code should work without changes

**New Features:**
- Multi-language support with Unicode tokenizer
- Plugin system for custom providers
- Progress bars (opt-in)
- URL loading
- Batch processing (Vertex AI)

**Deprecations:**
- None initially, but mark old import paths as deprecated

**Upgrade Path:**
```bash
npm install langextract@2.0.0

# Update imports if using direct imports from submodules
# Old: import { Extraction } from 'langextract/types'
# New: import { Extraction } from 'langextract/core/types'
#      or just: import { Extraction } from 'langextract'
```

---

## 18. Community Provider Registry

The Python version mentions community providers:

**Documented Community Providers:**
- vLLM - Local and distributed model serving
- Outlines - Structured generation
- Custom providers

**Action Items:**
1. Create provider template/boilerplate
2. Document provider interface clearly
3. Set up community provider registry
4. Add examples of third-party providers

---

## Conclusion

This document outlines all major changes needed to bring the TypeScript port to feature parity with the upstream Python repository. The changes represent significant improvements in:

- **Architecture** - Better code organization and extensibility
- **Functionality** - Multi-language support, batch processing, URL loading
- **User Experience** - Progress bars, better errors, richer examples
- **Maintainability** - Cleaner code separation, better testing

The recommended approach is to implement changes in phases, starting with critical architectural improvements that enable other features.

---

## References

- Upstream Repository: https://github.com/google/langextract
- Current TypeScript Port: https://github.com/kmbro/langextract-typescript
- Upstream Version: 1.1.1
- Last Analyzed Commit: `3638fe4` (2025-12-29)
