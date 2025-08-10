# LangExtract TypeScript

A TypeScript translation of the original Python LangExtract library by Google LLC. This library provides structured information extraction from text using Large Language Models (LLMs) with full TypeScript support, comprehensive visualization tools, and a powerful CLI interface.

**Original Repository**: [google/langextract](https://github.com/google/langextract)

## Features

- **Structured Information Extraction**: Extract entities, relationships, and structured data from text
- **Multiple LLM Support**: Works with Google Gemini, OpenAI, Ollama, and other LLM providers
- **Schema Generation**: Automatically generates JSON schemas from examples for better extraction
- **Text Alignment**: Aligns extracted information with original text positions
- **Interactive Visualization**: Built-in HTML visualization with animations and controls
- **Command Line Interface**: CLI tool for easy visualization generation
- **Batch Processing**: Process multiple documents efficiently
- **TypeScript Support**: Full TypeScript types and interfaces
- **Flexible Output Formats**: Support for JSON and YAML output formats
- **Error Handling**: Robust error handling and validation

## Installation

```bash
# Install from npm
npm install langextract

# Or install from source
git clone https://github.com/kmbro/langextract.git
cd langextract/typescript
npm install
npm run build
```

## Quick Start

### Basic Extraction

````typescript
import { extract, ExampleData } from "langextract";

// Define examples to guide the extraction
const examples: ExampleData[] = [
  {
    text: "John Smith is 30 years old and works at Google.",
    extractions: [
      {
        extractionClass: "person",
        extractionText: "John Smith",
        attributes: {
          age: "30",
          employer: "Google",
        },
      },
    ],
  },
];

// Extract information from text using Gemini
async function extractPersonInfo() {
  const result = await extract("Alice Johnson is 25 and works at Microsoft.", {
    promptDescription: "Extract person information including name, age, and employer",
    examples: examples,
    modelType: "gemini",
    apiKey: "your-gemini-api-key",
    modelId: "gemini-2.5-flash",
  });

  console.log(result.extractions);
  // Output: [
  //   {
  //     extractionClass: "person",
  //     extractionText: "Alice Johnson",
  //     attributes: {
  //       age: "25",
  //       employer: "Microsoft"
  //     },
  //     charInterval: { startPos: 0, endPos: 13 },
  //     alignmentStatus: "match_exact"
  //   }
  // ]
}

// Extract information from text using OpenAI
async function extractPersonInfoWithOpenAI() {
  const result = await extract("Alice Johnson is 25 and works at Microsoft.", {
    promptDescription: "Extract person information including name, age, and employer",
    examples: examples,
    modelType: "openai",
    apiKey: "your-openai-api-key",
    modelId: "gpt-4o-mini",
    temperature: 0.1,
  });

  console.log(result.extractions);
}

### Quick Visualization

```typescript
import { visualize, saveVisualizationPage } from "langextract";

// Generate and save visualization
saveVisualizationPage(result, "./extraction-viz.html", {
  animationSpeed: 1.0,
  showLegend: true,
  gifOptimized: true
});
````

## API Reference

### Main Functions

#### `extract(textOrDocuments, options)`

The main function for extracting structured information from text.

**Parameters:**

- `textOrDocuments`: `string | Document | Document[]` - Text or document(s) to process
- `options`: Extraction options object

**Returns:** `Promise<AnnotatedDocument | AnnotatedDocument[]>`

**Options:**

- `promptDescription`: `string` - Instructions for what to extract
- `examples`: `ExampleData[]` - Training examples to guide extraction
- `modelId`: `string` - LLM model ID (default: "gemini-2.5-flash")
- `modelType`: `"gemini" | "openai" | "ollama"` - LLM provider type (default: "gemini"). For `"ollama"`, `apiKey` is not used.
- `apiKey`: `string` - API key for cloud-hosted LLM services (required for `"gemini"` and `"openai"`). Not applicable for `"ollama"`.
- `formatType`: `FormatType` - Output format (JSON or YAML)
- `maxCharBuffer`: `number` - Maximum characters per chunk (default: 1000)
- `temperature`: `number` - Sampling temperature (default: 0.5)
- `fenceOutput`: `boolean` - Whether to expect fenced output (default: false)
- `useSchemaConstraints`: `boolean` - Use schema constraints (default: true)
- `batchLength`: `number` - Documents per batch (default: 10)
- `maxWorkers`: `number` - Maximum parallel workers (default: 10)
- `additionalContext`: `string` - Additional context for extraction
- `debug`: `boolean` - Enable debug mode (default: true)
- `modelUrl`: `string` - Custom model URL (for Gemini optional; for Ollama required, e.g., `http://localhost:11434`)
- `baseURL`: `string` - Custom base URL (for OpenAI)
- `extractionPasses`: `number` - Number of extraction passes (default: 1)
- `maxTokens`: `number` - Maximum tokens in the response (default: 2048)

### Core Types

#### `ExampleData`

```typescript
interface ExampleData {
  text: string;
  extractions: Extraction[];
}
```

#### `CharInterval`

```typescript
interface CharInterval {
  startPos?: number;
  endPos?: number;
}
```

#### `Extraction`

```typescript
interface Extraction {
  extractionClass: string;
  extractionText: string;
  charInterval?: CharInterval;
  alignmentStatus?: AlignmentStatus;
  extractionIndex?: number;
  groupIndex?: number;
  description?: string;
  attributes?: Record<string, string | string[]>;
  tokenInterval?: TokenInterval;
}
```

#### `Document`

```typescript
interface Document {
  text: string;
  documentId?: string;
  additionalContext?: string;
  tokenizedText?: TokenizedText;
}
```

#### `AnnotatedDocument`

```typescript
interface AnnotatedDocument {
  documentId?: string;
  extractions?: Extraction[];
  text?: string;
  tokenizedText?: TokenizedText;
}
```

### Visualization Functions

#### `visualize(dataSource, options)`

Generate interactive HTML visualization from extractions.

**Parameters:**

- `dataSource`: `AnnotatedDocument | string` - Document or file path
- `options`: `VisualizationOptions` - Visualization configuration

**Returns:** `string` - HTML content

#### `saveVisualizationPage(dataSource, outputPath, options)`

Save complete HTML page with visualization.

**Parameters:**

- `dataSource`: `AnnotatedDocument | string` - Document or file path
- `outputPath`: `string` - Output file path
- `options`: `VisualizationOptions` - Visualization configuration

## Advanced Usage

### Model Configuration

#### Google Gemini

```typescript
import { GeminiLanguageModel } from "langextract";

const model = new GeminiLanguageModel({
  modelId: "gemini-2.5-flash",
  apiKey: "your-api-key",
  temperature: 0.3,
});
```

#### OpenAI

```typescript
import { OpenAILanguageModel } from "langextract";

const model = new OpenAILanguageModel({
  model: "gpt-4o-mini", // or "gpt-4", "gpt-3.5-turbo", etc.
  apiKey: "your-openai-api-key",
  temperature: 0.3,
  baseURL: "https://api.openai.com/v1", // Optional: for custom endpoints
});
```

#### Ollama (Local Models)

```typescript
import { OllamaLanguageModel, extract } from "langextract";

// Using the model class directly
const model = new OllamaLanguageModel({
  model: "gemma2:latest",
  modelUrl: "http://localhost:11434",
});

// Or via extract()
await extract("Some text", {
  modelType: "ollama",
  modelId: "gemma2:latest",
  modelUrl: "http://localhost:11434",
  examples: [
    { text: "John is 30.", extractions: [{ extractionClass: "person", extractionText: "John", attributes: { age: "30" } }] },
  ],
});
```

### Response Control

#### Limiting Response Length with maxTokens

You can control the maximum number of tokens in the model's response using the `maxTokens` option:

```typescript
// Limit Gemini response to 100 tokens
const result = await extract("Extract person information from this text.", {
  examples: examples,
  apiKey: "your-api-key",
  maxTokens: 100, // Short, concise responses
});

// Limit OpenAI response to 200 tokens
const result = await extract("Extract person information from this text.", {
  examples: examples,
  modelType: "openai",
  apiKey: "your-openai-api-key",
  maxTokens: 200, // Moderate response length
});

// Limit Ollama response to 150 tokens
const result = await extract("Extract person information from this text.", {
  examples: examples,
  modelType: "ollama",
  modelUrl: "http://localhost:11434",
  maxTokens: 150, // Local model with token limit
});
```

#### Custom Model URLs

You can override the default API endpoints for custom deployments:

```typescript
// Use custom Gemini endpoint (useful for self-hosted instances)
const result = await extract("Extract person information from this text.", {
  examples: examples,
  apiKey: "your-api-key",
  modelType: "gemini",
  modelUrl: "https://your-custom-gemini-endpoint.com", // Custom URL
  maxTokens: 500,
});

// Use custom OpenAI endpoint
const result = await extract("Extract person information from this text.", {
  examples: examples,
  modelType: "openai",
  apiKey: "your-openai-api-key",
  baseURL: "https://your-custom-openai-endpoint.com", // Custom base URL
  maxTokens: 300,
});

// Use custom Ollama endpoint
const result = await extract("Extract person information from this text.", {
  examples: examples,
  modelType: "ollama",
  modelUrl: "http://your-custom-ollama-server:11434", // Custom Ollama server
  maxTokens: 200,
});
```

### Prompt Engineering

#### Custom Prompt Templates

```typescript
import { PromptTemplateStructured, QAPromptGeneratorImpl } from "langextract";

const template: PromptTemplateStructured = {
  description: "Extract medical entities from clinical text",
  examples: [
    {
      text: "Patient has diabetes and hypertension",
      extractions: [
        {
          extractionClass: "condition",
          extractionText: "diabetes",
        },
        {
          extractionClass: "condition",
          extractionText: "hypertension",
        },
      ],
    },
  ],
};

const generator = new QAPromptGeneratorImpl(template);
const prompt = generator.render("Patient shows signs of asthma");
```

### Output Processing

#### Custom Resolvers

```typescript
import { Resolver, FormatType } from "langextract";

const resolver = new Resolver({
  fenceOutput: true,
  formatType: FormatType.YAML,
  extractionAttributesSuffix: "_attrs",
});
```

#### Schema Enforcement

OpenAI models support JSON schema enforcement through function calling. When you provide a schema, the model will be forced to return responses that conform to the specified structure:

```typescript
import { OpenAILanguageModel, GeminiSchemaImpl } from "langextract";

// Create a custom schema
const bookSchema = new GeminiSchemaImpl({
  type: "object",
  properties: {
    title: { type: "string" },
    author: { type: "string" },
    publication_year: { type: "number" },
    genre: { type: "string" },
  },
  required: ["title", "author"],
});

const model = new OpenAILanguageModel({
  model: "gpt-4o-mini",
  apiKey: "your-openai-api-key",
  openAISchema: bookSchema, // This enforces the schema
  formatType: FormatType.JSON,
  temperature: 0.0,
});
```

### Performance Optimization

#### Batch Processing

```typescript
import { Document } from "langextract";

const documents: Document[] = [
  { text: "First document text", documentId: "doc1" },
  { text: "Second document text", documentId: "doc2" },
];

const results = await extract(documents, {
  examples: examples,
  apiKey: "your-api-key",
  batchLength: 5,
});
```

## Examples

### Use Cases

#### Medical Entity Extraction

```typescript
const medicalExamples: ExampleData[] = [
  {
    text: "The patient has diabetes mellitus type 2 and hypertension.",
    extractions: [
      {
        extractionClass: "condition",
        extractionText: "diabetes mellitus type 2",
        attributes: {
          severity: "moderate",
          type: "type 2",
        },
      },
      {
        extractionClass: "condition",
        extractionText: "hypertension",
        attributes: {
          severity: "mild",
        },
      },
    ],
  },
];

const result = await extract("Patient diagnosed with asthma and obesity.", {
  promptDescription: "Extract medical conditions and their attributes",
  examples: medicalExamples,
  apiKey: "your-api-key",
});
```

#### Named Entity Recognition

```typescript
const nerExamples: ExampleData[] = [
  {
    text: "Apple Inc. was founded by Steve Jobs in Cupertino, California.",
    extractions: [
      {
        extractionClass: "organization",
        extractionText: "Apple Inc.",
        attributes: {
          type: "company",
        },
      },
      {
        extractionClass: "person",
        extractionText: "Steve Jobs",
        attributes: {
          role: "founder",
        },
      },
      {
        extractionClass: "location",
        extractionText: "Cupertino, California",
        attributes: {
          type: "city",
        },
      },
    ],
  },
];
```

## Visualization

LangExtract provides powerful visualization capabilities to help you understand and analyze your extractions. The visualization creates interactive HTML that highlights extracted entities with animations and controls.

### Features

- **Interactive Controls**: Play/pause, next/previous, and progress slider
- **Color-coded Highlights**: Each extraction class gets a unique color
- **Attribute Display**: Shows extraction attributes in a side panel
- **Smooth Animations**: Automatic highlighting with configurable speed
- **GIF Optimization**: Special styling for video capture and screenshots
- **Responsive Design**: Works on different screen sizes
- **File Support**: Load from JSONL files or AnnotatedDocument objects

### Basic Visualization

```typescript
import { visualize, saveVisualizationPage } from "langextract";

// Create a visualization from an AnnotatedDocument
const html = visualize(result, {
  animationSpeed: 1.0, // Seconds between extractions
  showLegend: true, // Show color legend
  gifOptimized: true, // Optimize for video capture
});

// Save as a complete HTML page
saveVisualizationPage(result, "./extraction-visualization.html", {
  animationSpeed: 1.5,
  showLegend: true,
  gifOptimized: false,
});
```

### Visualization Options

```typescript
interface VisualizationOptions {
  animationSpeed?: number; // Animation speed in seconds (default: 1.0)
  showLegend?: boolean; // Show color legend (default: true)
  gifOptimized?: boolean; // Optimize for GIFs (default: true)
  contextChars?: number; // Context characters around extractions (default: 150)
}
```

### Loading from Files

```typescript
// Visualize extractions from a JSONL file
const html = visualize("./extractions.jsonl", {
  animationSpeed: 0.8,
  showLegend: true,
});
```

### Command Line Interface

LangExtract provides a CLI tool for easy visualization generation:

```bash
# Basic usage
npx ts-node bin/visualize.ts input.jsonl output.html

# With custom options
npx ts-node bin/visualize.ts input.jsonl output.html --speed 1.5 --gif-optimized

# Hide legend
npx ts-node bin/visualize.ts input.jsonl output.html --no-legend

# Using npm script
npm run visualize -- input.jsonl output.html --speed 0.8
```

**CLI Options:**

- `--speed <number>`: Animation speed in seconds (default: 1.0)
- `--no-legend`: Hide the color legend
- `--gif-optimized`: Optimize styling for GIF/video capture
- `--context <number>`: Context characters around extractions (default: 150)
- `--help`: Show help message

### Examples

```bash
# Create a fast animation for GIF capture
npx ts-node bin/visualize.ts extractions.jsonl demo.html --speed 0.5 --gif-optimized

# Create a presentation-friendly version
npx ts-node bin/visualize.ts extractions.jsonl presentation.html --speed 2.0 --no-legend

# Process multiple files
for file in *.jsonl; do
  npx ts-node bin/visualize.ts "$file" "${file%.jsonl}.html"
done
```

## Error Handling

LangExtract provides comprehensive error handling for various scenarios:

```typescript
try {
  const result = await extract(text, {
    examples: examples,
    apiKey: "your-api-key",
  });
} catch (error) {
  if (error instanceof Error) {
    console.error("Extraction failed:", error.message);
  }
}
```

### Common Error Types

- **Missing API Key**: Ensure your API key is provided via parameter or environment variable
- **Invalid Examples**: Examples array must contain valid ExampleData objects
- **Model Errors**: Check model ID and API key for the specified provider
- **File Not Found**: Verify file paths for JSONL input files
- **Invalid Character Positions**: Ensure charInterval positions are within text bounds

## Configuration

### Environment Variables

Set your API key as an environment variable:

```bash
export LANGEXTRACT_API_KEY="your-api-key"
```

### TypeScript Configuration

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

### Development Setup

```bash
# Clone and setup
git clone https://github.com/kmbro/langextract.git
cd langextract/typescript

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run specific integration tests (requires API key)
OPENAI_API_KEY=your-api-key npm test -- medical-extraction.test.ts

# Run visualization CLI
npm run visualize -- sample-extractions.jsonl output.html
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

Apache 2.0 License - see LICENSE file for details.

## Support

For issues and questions, please open an issue on the GitHub repository.
