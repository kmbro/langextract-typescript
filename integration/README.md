# LangExtract TypeScript Integration Tests

[This is a work in progress.]
This directory contains some integration tests for the LangExtract TypeScript library. These tests demonstrate real-world usage scenarios and validate that the library works correctly with actual API calls.

## Overview

The integration tests are designed to:

1. **Test Real API Integration**: Make actual calls to the Gemini API to ensure the library works end-to-end
2. **Validate Core Functionality**: Test the main extraction capabilities with various types of content
3. **Demonstrate Usage Patterns**: Show how to use the library for different use cases
4. **Test Advanced Features**: Validate complex scenarios like batch processing and multiple extraction passes

## Test Categories

### 1. Basic Extraction Tests (`basic-extraction.test.ts`)

Tests fundamental extraction capabilities:

- Person information extraction with attributes
- Medication information extraction in order of appearance
- Multiple extractions from the same text
- Character position preservation
- Error handling for invalid API keys
- Validation of required examples

### 2. Literary Extraction Tests (`literary-extraction.test.ts`)

Tests extraction from literary and dramatic texts:

- Character extraction from Shakespeare and other literary works
- Emotion and philosophical concept extraction
- Relationship extraction between characters
- Handling of longer texts with multiple extraction passes
- Different format types (JSON/YAML)
- Temperature variations for different extraction styles

### 3. Medical Extraction Tests (`medical-extraction.test.ts`)

Tests medical information extraction:

- Medication information extraction (dosage, route, frequency, duration)
- Patient information extraction with attributes
- Complex medical scenarios with multiple medications
- Vital signs extraction with attributes
- Medical abbreviations and terminology handling
- Medical procedures and interventions
- Different format types for medical data

### 4. Advanced Features Tests (`advanced-features.test.ts`)

Tests advanced functionality:

- Multiple extraction passes for improved recall
- Batch processing of multiple documents
- Different model configurations (Flash vs Pro)
- Variable buffer sizes for text processing
- Schema constraints (enabled/disabled)
- Fence output format
- Additional context for extraction
- Debug mode functionality
- Different batch lengths for processing
- YAML format output

## Setup

### Prerequisites

1. **API Key**: You need a valid Gemini API key to run these tests
2. **Dependencies**: Install the required dependencies

### Installation

```bash
# Navigate to the integration directory
cd typescript/integration

# Install dependencies
npm install

# Install the parent library (if not already built)
cd ..
npm install
npm run build
cd integration
```

### Environment Configuration

Set your Gemini API key as an environment variable:

```bash
export LANGEXTRACT_API_KEY="your-gemini-api-key-here"
```

Or create a `.env` file in the integration directory:

```
LANGEXTRACT_API_KEY=your-gemini-api-key-here
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test Categories

```bash
# Run only basic extraction tests
npm test -- --testNamePattern="Basic Extraction"

# Run only medical extraction tests
npm test -- --testNamePattern="Medical Extraction"

# Run only literary extraction tests
npm test -- --testNamePattern="Literary Extraction"

# Run only advanced features tests
npm test -- --testNamePattern="Advanced Features"
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

## Test Configuration

### Jest Configuration

The tests use Jest with the following configuration:

- **Timeout**: 30 seconds per test (for API calls)
- **Environment**: Node.js
- **Coverage**: Enabled for all TypeScript files
- **Setup**: Custom setup file for console output management

### Test Data

Each test category includes:

- **Example Data**: Structured examples that guide the extraction
- **Test Cases**: Various scenarios to validate functionality
- **Expected Outcomes**: Assertions to verify correct behavior

## Example Usage

Here's a simple example of how the integration tests demonstrate library usage:

```typescript
import { extract, ExampleData, FormatType } from "../src/index";

// Define examples to guide extraction
const examples: ExampleData[] = [
  {
    text: "John Smith is 30 years old and works at Google as a software engineer.",
    extractions: [
      {
        extractionClass: "person",
        extractionText: "John Smith",
        attributes: {
          age: "30",
          employer: "Google",
          job_title: "software engineer",
        },
      },
    ],
  },
];

// Extract information from text
const result = await extract("Alice Brown is 25 years old and works at Apple as a product manager.", {
  promptDescription: "Extract person information including name, age, employer, and job title",
  examples: examples,
  apiKey: process.env.LANGEXTRACT_API_KEY,
  modelId: "gemini-2.5-flash",
  formatType: FormatType.JSON,
  temperature: 0.3,
});

console.log("Extraction Result:", result);
```

## Cost Considerations

⚠️ **Important**: These tests make actual API calls to Gemini, which will incur costs. Consider:

1. **API Quotas**: Monitor your Gemini API usage and quotas
2. **Test Frequency**: Don't run tests unnecessarily in CI/CD
3. **Cost Optimization**: Use smaller models (Flash vs Pro) for testing when possible
4. **Rate Limiting**: Tests include delays to respect rate limits

## Troubleshooting

### Common Issues

1. **API Key Not Set**: Ensure `LANGEXTRACT_API_KEY` environment variable is set
2. **Rate Limiting**: Tests may fail if you hit API rate limits
3. **Network Issues**: Ensure stable internet connection for API calls
4. **Model Availability**: Some models may not be available in all regions

### Debug Mode

Enable debug mode in tests to see detailed logging:

```typescript
const result = await extract(text, {
  // ... other options
  debug: true,
});
```

## Contributing

When adding new integration tests:

1. **Follow Naming Convention**: Use descriptive test names
2. **Include Examples**: Provide realistic example data
3. **Test Edge Cases**: Include error scenarios and boundary conditions
4. **Document Changes**: Update this README when adding new test categories
5. **Consider Costs**: Minimize API calls in tests when possible

## Related Documentation

- [LangExtract TypeScript README](../README.md)
- [Python Examples](../../docs/examples/)
- [API Documentation](https://ai.google.dev/gemini-api/docs)
