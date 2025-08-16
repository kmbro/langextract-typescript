# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-01-XX

### Added

- **Parallel processing for batch operations**: Enhanced inference layer with concurrent processing capabilities
  - Added `Promise.all()` implementation for batch prompts when `maxWorkers > 1`
  - Automatic fallback to sequential processing for single prompts or when `maxWorkers = 1`
  - Applied consistently across all language models (Gemini, OpenAI, Ollama)
- **Chunk-level batching**: Improved batching strategy from document-level to chunk-level processing
  - More efficient utilization of the `maxWorkers` configuration parameter
  - Better performance for large document collections
- **Guaranteed document ID generation**: Added automatic document ID generation for consistency
  - Ensures all documents have unique IDs throughout the processing lifecycle
  - Prevents potential issues with document identification across processing passes

### Changed

- **QAPromptGenerator integration**: Replaced simplified `generatePrompt()` method with proper `QAPromptGeneratorImpl.render()`
  - Eliminated code duplication in prompt generation
  - Better separation of concerns and maintainability
- **Batch processing architecture**: Consolidated and streamlined batch processing methods
  - Unified processing flow for both single-pass and multi-pass workflows
  - Improved Map-based data management for better performance
  - Cleaner, more maintainable code structure

### Performance

- **Significantly improved throughput** for batch operations through parallel processing
- **Better resource utilization** with chunk-level batching strategy
- **Reduced processing time** for large document collections
- **Optimized memory usage** with improved data structures

### Technical

- **Internal refactoring**: No breaking changes to public API
- **Enhanced error handling**: Consistent error handling across all language models
- **Improved type safety**: Better TypeScript interfaces and type guarantees
- **Code quality**: Eliminated duplication and improved maintainability

Thanks to [tomquist](https://github.com/tomquist) for the contributions!

## [1.1.0] - 2025-01-XX

### Added

- **maxTokens option**: Added support for controlling the maximum number of tokens in model responses
  - Works with all supported models (Gemini, OpenAI, Ollama)
  - Default value: 2048 tokens
  - Can be set via the `maxTokens` parameter in the `extract` function
- **Custom URL support for Gemini**: Enhanced `modelUrl` parameter to work with Gemini models
  - Allows using custom Gemini endpoints (useful for self-hosted instances)
  - Maintains backward compatibility with existing Ollama usage
- **Response Control section**: Added comprehensive documentation for controlling response length and custom endpoints
- **Example file**: Created `examples/max-tokens-example.ts` demonstrating the new features

### Changed

- Updated OpenAI JSON response format logic to work with `formatType` instead of just schema presence
- Enhanced documentation with new "Response Control" and "Custom Model URLs" sections
- Updated package description to mention new features

### Fixed

- Fixed failing OpenAI test by correcting JSON response format logic

## [1.0.0] - 2025-01-XX

### Added

- Initial release of LangExtract TypeScript
- Structured information extraction from text using LLMs
- Support for Google Gemini, OpenAI, and Ollama models
- Schema generation and enforcement
- Text alignment and visualization tools
- Command line interface for visualization
- Full TypeScript support with comprehensive types
- Batch processing capabilities
- JSON and YAML output format support
