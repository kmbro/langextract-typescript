# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
