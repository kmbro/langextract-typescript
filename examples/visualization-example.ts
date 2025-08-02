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
 * Example demonstrating LangExtract visualization functionality.
 */

import { AnnotatedDocument } from "../src/types";
import { saveVisualizationPage, visualize } from "../src/visualization";

// Sample annotated document with extractions
const sampleDocument: AnnotatedDocument = {
  text: "John Smith is a software engineer at Google. He lives in San Francisco, California. His email is john.smith@google.com and his phone number is (555) 123-4567.",
  extractions: [
    {
      extractionClass: "PERSON",
      extractionText: "John Smith",
      charInterval: { startPos: 0, endPos: 10 },
      attributes: {
        role: "software engineer",
        company: "Google",
      },
    },
    {
      extractionClass: "LOCATION",
      extractionText: "San Francisco, California",
      charInterval: { startPos: 57, endPos: 82 },
      attributes: {
        city: "San Francisco",
        state: "California",
      },
    },
    {
      extractionClass: "EMAIL",
      extractionText: "john.smith@google.com",
      charInterval: { startPos: 97, endPos: 118 },
      attributes: {
        domain: "google.com",
      },
    },
    {
      extractionClass: "PHONE",
      extractionText: "(555) 123-4567",
      charInterval: { startPos: 143, endPos: 158 },
      attributes: {
        area_code: "555",
      },
    },
    {
      extractionClass: "ORGANIZATION",
      extractionText: "Google",
      charInterval: { startPos: 37, endPos: 43 },
      attributes: {
        type: "technology company",
      },
    },
  ],
};

async function runVisualizationExample() {
  console.log("LangExtract Visualization Example");
  console.log("==================================");

  // Generate visualization HTML
  const html = visualize(sampleDocument, {
    animationSpeed: 1.5,
    showLegend: true,
    gifOptimized: true,
  });

  console.log("Generated visualization HTML (first 500 chars):");
  console.log(html.substring(0, 500) + "...");
  console.log();

  // Save as a complete HTML page
  const outputPath = "./visualization-output.html";
  saveVisualizationPage(sampleDocument, outputPath, {
    animationSpeed: 1.0,
    showLegend: true,
    gifOptimized: false,
  });

  console.log(`Visualization saved to: ${outputPath}`);
  console.log("Open this file in a web browser to see the interactive visualization!");
  console.log();

  // Demonstrate different options
  console.log("Creating visualization with different options...");

  const fastHtml = visualize(sampleDocument, {
    animationSpeed: 0.5,
    showLegend: false,
    gifOptimized: true,
  });

  console.log("Fast animation visualization created (no legend, GIF optimized)");
  console.log();

  // Show extraction statistics
  console.log("Extraction Statistics:");
  console.log(`- Total extractions: ${sampleDocument.extractions?.length || 0}`);
  console.log(`- Text length: ${sampleDocument.text?.length || 0} characters`);

  if (sampleDocument.extractions) {
    const classCounts: Record<string, number> = {};
    sampleDocument.extractions.forEach((extraction) => {
      classCounts[extraction.extractionClass] = (classCounts[extraction.extractionClass] || 0) + 1;
    });

    console.log("- Extraction classes:");
    Object.entries(classCounts).forEach(([className, count]) => {
      console.log(`  * ${className}: ${count}`);
    });
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runVisualizationExample().catch(console.error);
}

export { runVisualizationExample, sampleDocument };
