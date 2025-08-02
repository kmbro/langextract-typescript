#!/usr/bin/env node

/**
 * Copyright 2025 kmbro.
 *
 * This is a TypeScript translation of the original Python LangExtract library
 * by Google LLC (https://github.com/google/langextract).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * CLI tool for LangExtract visualization.
 *
 * Usage:
 *   npx ts-node bin/visualize.ts input.jsonl output.html
 *   npx ts-node bin/visualize.ts input.jsonl output.html --speed 1.5 --no-legend
 *   npx ts-node bin/visualize.ts input.jsonl output.html --gif-optimized
 */

import { visualize, saveVisualizationPage } from "../src/visualization";
import { AnnotatedDocument } from "../src/types";
import * as fs from "fs";
import * as path from "path";

interface CliOptions {
  input: string;
  output: string;
  animationSpeed?: number;
  showLegend?: boolean;
  gifOptimized?: boolean;
  contextChars?: number;
  help?: boolean;
}

function printUsage() {
  console.log(`
LangExtract Visualization CLI

Usage:
  npx ts-node bin/visualize.ts <input> <output> [options]

Arguments:
  input     Input file path (JSONL file with extractions) or JSON string
  output    Output HTML file path

Options:
  --speed <number>        Animation speed in seconds (default: 1.0)
  --no-legend            Hide the color legend
  --gif-optimized        Optimize styling for GIF/video capture
  --context <number>     Context characters around extractions (default: 150)
  --help                 Show this help message

Examples:
  npx ts-node bin/visualize.ts extractions.jsonl visualization.html
  npx ts-node bin/visualize.ts extractions.jsonl output.html --speed 0.8 --gif-optimized
  npx ts-node bin/visualize.ts extractions.jsonl output.html --no-legend --context 200
`);
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    input: "",
    output: "",
    animationSpeed: 1.0,
    showLegend: true,
    gifOptimized: false,
    contextChars: 150,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--help":
      case "-h":
        options.help = true;
        break;
      case "--speed":
        options.animationSpeed = parseFloat(args[++i]);
        break;
      case "--no-legend":
        options.showLegend = false;
        break;
      case "--gif-optimized":
        options.gifOptimized = true;
        break;
      case "--context":
        options.contextChars = parseInt(args[++i]);
        break;
      default:
        if (!options.input) {
          options.input = arg;
        } else if (!options.output) {
          options.output = arg;
        } else {
          console.error(`Unknown argument: ${arg}`);
          process.exit(1);
        }
    }
  }

  return options;
}

function validateOptions(options: CliOptions): void {
  if (options.help) {
    printUsage();
    process.exit(0);
  }

  if (!options.input) {
    console.error("Error: Input file is required");
    printUsage();
    process.exit(1);
  }

  if (!options.output) {
    console.error("Error: Output file is required");
    printUsage();
    process.exit(1);
  }

  if (options.animationSpeed && (options.animationSpeed <= 0 || options.animationSpeed > 10)) {
    console.error("Error: Animation speed must be between 0.1 and 10 seconds");
    process.exit(1);
  }

  if (options.contextChars && (options.contextChars < 0 || options.contextChars > 1000)) {
    console.error("Error: Context characters must be between 0 and 1000");
    process.exit(1);
  }
}

function loadInput(input: string): AnnotatedDocument | string {
  // Check if input is a JSON string (starts with {)
  if (input.trim().startsWith("{")) {
    try {
      return JSON.parse(input) as AnnotatedDocument;
    } catch (error) {
      console.error("Error: Invalid JSON input");
      process.exit(1);
    }
  }

  // Check if input is a file path
  const inputPath = path.resolve(input);
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  return inputPath;
}

function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  try {
    validateOptions(options);

    console.log("LangExtract Visualization CLI");
    console.log("==============================");

    const input = loadInput(options.input);
    const outputPath = path.resolve(options.output);

    console.log(`Input: ${typeof input === "string" ? input : "JSON object"}`);
    console.log(`Output: ${outputPath}`);
    console.log(`Animation Speed: ${options.animationSpeed}s`);
    console.log(`Show Legend: ${options.showLegend}`);
    console.log(`GIF Optimized: ${options.gifOptimized}`);
    console.log(`Context Chars: ${options.contextChars}`);
    console.log();

    // Generate visualization
    console.log("Generating visualization...");
    const startTime = Date.now();

    saveVisualizationPage(input, outputPath, {
      animationSpeed: options.animationSpeed,
      showLegend: options.showLegend,
      gifOptimized: options.gifOptimized,
      contextChars: options.contextChars,
    });

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    console.log(`✅ Visualization saved successfully!`);
    console.log(`📁 File: ${outputPath}`);
    console.log(`⏱️  Generated in ${duration.toFixed(2)}s`);
    console.log();
    console.log("🌐 Open the HTML file in your web browser to view the interactive visualization!");
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run the CLI if this file is executed directly
if (require.main === module) {
  main();
}
