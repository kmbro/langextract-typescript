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
 * Utility functions for visualizing LangExtract extractions in web browsers and Node.js environments.
 */

import { AnnotatedDocument, Extraction } from "./types";
import * as fs from "fs";
import * as path from "path";

// CSS styles for visualization
const VISUALIZATION_CSS = `
<style>
.lx-highlight {
  position: relative;
  border-radius: 3px;
  padding: 1px 2px;
  border: 1px solid rgba(0,0,0,0.1);
}
.lx-highlight .lx-tooltip {
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
  background: #333;
  color: #fff;
  text-align: left;
  border-radius: 4px;
  padding: 6px 8px;
  position: absolute;
  z-index: 1000;
  bottom: 125%;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  max-width: 240px;
  white-space: normal;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.lx-highlight:hover .lx-tooltip {
  visibility: visible;
  opacity: 1;
}
.lx-animated-wrapper {
  max-width: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  margin: 20px;
}
.lx-controls {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.lx-button-row {
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 16px;
}
.lx-control-btn {
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 10px 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.lx-control-btn:hover {
  background: #0056b3;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
}
.lx-progress-container {
  margin-bottom: 12px;
}
.lx-progress-slider {
  width: 100%;
  margin: 0;
  appearance: none;
  height: 8px;
  background: #e9ecef;
  border-radius: 4px;
  outline: none;
  cursor: pointer;
}
.lx-progress-slider::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.lx-progress-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #007bff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
.lx-status-text {
  text-align: center;
  font-size: 13px;
  color: #6c757d;
  margin-top: 8px;
  font-weight: 500;
}
.lx-text-window {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  white-space: pre-wrap;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 16px;
  line-height: 1.7;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.lx-attributes-panel {
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 12px;
  font-size: 14px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}
.lx-current-highlight {
  text-decoration: underline;
  text-decoration-color: #dc3545;
  text-decoration-thickness: 3px;
  font-weight: bold;
  animation: lx-pulse 1.5s ease-in-out infinite;
  box-shadow: 0 0 8px rgba(220, 53, 69, 0.3);
}
@keyframes lx-pulse {
  0% {
    text-decoration-color: #dc3545;
    box-shadow: 0 0 8px rgba(220, 53, 69, 0.3);
  }
  50% {
    text-decoration-color: #c82333;
    box-shadow: 0 0 12px rgba(220, 53, 69, 0.5);
  }
  100% {
    text-decoration-color: #dc3545;
    box-shadow: 0 0 8px rgba(220, 53, 69, 0.3);
  }
}
.lx-legend {
  font-size: 13px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #dee2e6;
  font-weight: 600;
  color: #495057;
}
.lx-label {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  margin-right: 8px;
  margin-bottom: 4px;
  color: #000;
  font-weight: 500;
  font-size: 12px;
  border: 1px solid rgba(0,0,0,0.1);
}
.lx-attr-key {
  font-weight: 600;
  color: #007bff;
  letter-spacing: 0.3px;
}
.lx-attr-value {
  font-weight: 400;
  color: #495057;
  letter-spacing: 0.2px;
}

/* Add optimizations with larger fonts and better readability for GIFs */
.lx-gif-optimized .lx-text-window {
  font-size: 18px;
  line-height: 1.8;
  padding: 20px;
}
.lx-gif-optimized .lx-attributes-panel {
  font-size: 16px;
  padding: 16px 20px;
}
.lx-gif-optimized .lx-current-highlight {
  text-decoration-thickness: 4px;
}
.lx-gif-optimized .lx-legend {
  font-size: 15px;
}
.lx-gif-optimized .lx-label {
  font-size: 14px;
  padding: 6px 10px;
}
</style>`;

enum TagType {
  START = "start",
  END = "end",
}

interface SpanPoint {
  position: number;
  tagType: TagType;
  spanIdx: number;
  extraction: Extraction;
}

interface ExtractionData {
  index: number;
  class: string;
  text: string;
  color: string;
  startPos: number;
  endPos: number;
  beforeText: string;
  extractionText: string;
  afterText: string;
  attributesHtml: string;
}

interface VisualizationOptions {
  animationSpeed?: number;
  showLegend?: boolean;
  gifOptimized?: boolean;
  contextChars?: number;
}

/**
 * Assigns a background color to each extraction class.
 */
function assignColors(extractions: Extraction[]): Record<string, string> {
  const classes = new Set<string>();
  extractions.forEach((e) => {
    if (e.charInterval && e.charInterval.startPos !== undefined && e.charInterval.endPos !== undefined) {
      classes.add(e.extractionClass);
    }
  });

  const colorMap: Record<string, string> = {};
  const sortedClasses = Array.from(classes).sort();

  // Use a more predictable color assignment
  const colors = [
    "#D2E3FC", // Light Blue
    "#C8E6C9", // Light Green
    "#FEF0C3", // Light Yellow
    "#F9DEDC", // Light Red
    "#FFDDBE", // Light Orange
    "#EADDFF", // Light Purple
    "#C4E9E4", // Light Teal
    "#FCE4EC", // Light Pink
    "#E8EAED", // Light Grey
    "#DDE8E8", // Pale Cyan
  ];

  sortedClasses.forEach((cls, index) => {
    colorMap[cls] = colors[index % colors.length];
  });

  return colorMap;
}

/**
 * Filters extractions to only include those with valid char intervals.
 */
function filterValidExtractions(extractions: Extraction[]): Extraction[] {
  return extractions.filter(
    (e) => e.charInterval && e.charInterval.startPos !== undefined && e.charInterval.endPos !== undefined && e.charInterval.startPos < e.charInterval.endPos
  );
}

/**
 * Escapes HTML special characters.
 */
function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Returns text with <span> highlights inserted, supporting nesting.
 */
function buildHighlightedText(text: string, extractions: Extraction[], colorMap: Record<string, string>): string {
  const points: SpanPoint[] = [];
  const spanLengths: Record<number, number> = {};

  extractions.forEach((extraction, index) => {
    if (
      !extraction.charInterval ||
      extraction.charInterval.startPos === undefined ||
      extraction.charInterval.endPos === undefined ||
      extraction.charInterval.startPos >= extraction.charInterval.endPos
    ) {
      return;
    }

    const startPos = extraction.charInterval.startPos;
    const endPos = extraction.charInterval.endPos;

    points.push({
      position: startPos,
      tagType: TagType.START,
      spanIdx: index,
      extraction,
    });

    points.push({
      position: endPos,
      tagType: TagType.END,
      spanIdx: index,
      extraction,
    });

    spanLengths[index] = endPos - startPos;
  });

  // Sort points for proper HTML nesting
  points.sort((a, b) => {
    const spanLengthA = spanLengths[a.spanIdx] || 0;
    const spanLengthB = spanLengths[b.spanIdx] || 0;

    if (a.position !== b.position) {
      return a.position - b.position;
    }

    if (a.tagType === TagType.END && b.tagType === TagType.END) {
      return spanLengthA - spanLengthB;
    }

    if (a.tagType === TagType.START && b.tagType === TagType.START) {
      return spanLengthB - spanLengthA;
    }

    return a.tagType === TagType.END ? -1 : 1;
  });

  const htmlParts: string[] = [];
  let cursor = 0;

  points.forEach((point) => {
    if (point.position > cursor) {
      htmlParts.push(escapeHtml(text.slice(cursor, point.position)));
    }

    if (point.tagType === TagType.START) {
      const color = colorMap[point.extraction.extractionClass] || "#ffff8d";
      const highlightClass = point.spanIdx === 0 ? " lx-current-highlight" : "";

      htmlParts.push(`<span class="lx-highlight${highlightClass}" data-idx="${point.spanIdx}" style="background-color:${color};">`);
    } else {
      htmlParts.push("</span>");
    }

    cursor = point.position;
  });

  if (cursor < text.length) {
    htmlParts.push(escapeHtml(text.slice(cursor)));
  }

  return htmlParts.join("");
}

/**
 * Builds legend HTML showing extraction classes and their colors.
 */
function buildLegendHtml(colorMap: Record<string, string>): string {
  if (Object.keys(colorMap).length === 0) {
    return "";
  }

  const legendItems = Object.entries(colorMap).map(
    ([extractionClass, color]) => `<span class="lx-label" style="background-color:${color};">${escapeHtml(extractionClass)}</span>`
  );

  return `<div class="lx-legend">Highlights Legend: ${legendItems.join(" ")}</div>`;
}

/**
 * Formats attributes as a single-line string.
 */
function formatAttributes(attributes?: Record<string, string | string[]>): string {
  if (!attributes) {
    return "{}";
  }

  const validAttrs = Object.entries(attributes).filter(([, value]) => value !== null && value !== undefined && value !== "" && value !== "null");

  if (validAttrs.length === 0) {
    return "{}";
  }

  const attrsParts = validAttrs.map(([key, value]) => {
    let valueStr: string;
    if (Array.isArray(value)) {
      valueStr = value.join(", ");
    } else {
      valueStr = String(value);
    }

    return `<span class="lx-attr-key">${escapeHtml(key)}</span>: <span class="lx-attr-value">${escapeHtml(valueStr)}</span>`;
  });

  return "{" + attrsParts.join(", ") + "}";
}

/**
 * Prepares JavaScript data for extractions.
 */
function prepareExtractionData(text: string, extractions: Extraction[], colorMap: Record<string, string>, contextChars: number = 150): ExtractionData[] {
  return extractions.map((extraction) => {
    if (!extraction.charInterval || extraction.charInterval.startPos === undefined || extraction.charInterval.endPos === undefined) {
      throw new Error("Invalid extraction: missing char interval");
    }

    const startPos = extraction.charInterval.startPos;
    const endPos = extraction.charInterval.endPos;

    const contextStart = Math.max(0, startPos - contextChars);
    const contextEnd = Math.min(text.length, endPos + contextChars);

    const beforeText = text.slice(contextStart, startPos);
    const extractionText = text.slice(startPos, endPos);
    const afterText = text.slice(endPos, contextEnd);

    const color = colorMap[extraction.extractionClass] || "#ffff8d";

    // Build attributes display
    let attributesHtml = `<div><strong>class:</strong> ${escapeHtml(extraction.extractionClass)}</div>`;
    attributesHtml += `<div><strong>attributes:</strong> ${formatAttributes(extraction.attributes)}</div>`;

    return {
      index: 0, // Using 0 since we're not using the index
      class: extraction.extractionClass,
      text: extraction.extractionText,
      color,
      startPos,
      endPos,
      beforeText: escapeHtml(beforeText),
      extractionText: escapeHtml(extractionText),
      afterText: escapeHtml(afterText),
      attributesHtml,
    };
  });
}

/**
 * Builds the complete visualization HTML.
 */
function buildVisualizationHtml(text: string, extractions: Extraction[], colorMap: Record<string, string>, options: VisualizationOptions = {}): string {
  const { animationSpeed = 1.0, showLegend = true, contextChars = 150 } = options;

  if (extractions.length === 0) {
    return '<div class="lx-animated-wrapper"><p>No extractions to animate.</p></div>';
  }

  // Sort extractions by position for proper HTML nesting
  const sortedExtractions = [...extractions].sort((a, b) => {
    if (!a.charInterval || !b.charInterval) return 0;
    const startA = a.charInterval.startPos || 0;
    const startB = b.charInterval.startPos || 0;
    if (startA !== startB) return startA - startB;

    const endA = a.charInterval.endPos || 0;
    const endB = b.charInterval.endPos || 0;
    return endB - startB - (endA - startA); // longer spans first
  });

  const highlightedText = buildHighlightedText(text, sortedExtractions, colorMap);
  const extractionData = prepareExtractionData(text, sortedExtractions, colorMap, contextChars);
  const legendHtml = showLegend ? buildLegendHtml(colorMap) : "";

  const jsData = JSON.stringify(extractionData);

  // Get position info for first extraction
  const firstExtraction = extractions[0];
  const posInfoStr = firstExtraction.charInterval ? `[${firstExtraction.charInterval.startPos}-${firstExtraction.charInterval.endPos}]` : "[0-0]";

  return `
    <div class="lx-animated-wrapper">
      <div class="lx-attributes-panel">
        ${legendHtml}
        <div id="attributesContainer"></div>
      </div>
      <div class="lx-text-window" id="textWindow">
        ${highlightedText}
      </div>
      <div class="lx-controls">
        <div class="lx-button-row">
          <button class="lx-control-btn" onclick="playPause()">▶️ Play</button>
          <button class="lx-control-btn" onclick="prevExtraction()">⏮ Previous</button>
          <button class="lx-control-btn" onclick="nextExtraction()">⏭ Next</button>
        </div>
        <div class="lx-progress-container">
          <input type="range" id="progressSlider" class="lx-progress-slider"
                 min="0" max="${extractions.length - 1}" value="0"
                 onchange="jumpToExtraction(this.value)">
        </div>
        <div class="lx-status-text">
          Entity <span id="entityInfo">1/${extractions.length}</span> |
          Pos <span id="posInfo">${posInfoStr}</span>
        </div>
      </div>
    </div>

    <script>
      (function() {
        const extractions = ${jsData};
        let currentIndex = 0;
        let isPlaying = false;
        let animationInterval = null;
        let animationSpeed = ${animationSpeed};

        function updateDisplay() {
          const extraction = extractions[currentIndex];
          if (!extraction) return;

          document.getElementById('attributesContainer').innerHTML = extraction.attributesHtml;
          document.getElementById('entityInfo').textContent = (currentIndex + 1) + '/' + extractions.length;
          document.getElementById('posInfo').textContent = '[' + extraction.startPos + '-' + extraction.endPos + ']';
          document.getElementById('progressSlider').value = currentIndex;

          const playBtn = document.querySelector('.lx-control-btn');
          if (playBtn) playBtn.textContent = isPlaying ? '⏸ Pause' : '▶️ Play';

          const prevHighlight = document.querySelector('.lx-text-window .lx-current-highlight');
          if (prevHighlight) prevHighlight.classList.remove('lx-current-highlight');
          const currentSpan = document.querySelector('.lx-text-window span[data-idx="' + currentIndex + '"]');
          if (currentSpan) {
            currentSpan.classList.add('lx-current-highlight');
            currentSpan.scrollIntoView({block: 'center', behavior: 'smooth'});
          }
        }

        function nextExtraction() {
          currentIndex = (currentIndex + 1) % extractions.length;
          updateDisplay();
        }

        function prevExtraction() {
          currentIndex = (currentIndex - 1 + extractions.length) % extractions.length;
          updateDisplay();
        }

        function jumpToExtraction(index) {
          currentIndex = parseInt(index);
          updateDisplay();
        }

        function playPause() {
          if (isPlaying) {
            clearInterval(animationInterval);
            isPlaying = false;
          } else {
            animationInterval = setInterval(nextExtraction, animationSpeed * 1000);
            isPlaying = true;
          }
          updateDisplay();
        }

        window.playPause = playPause;
        window.nextExtraction = nextExtraction;
        window.prevExtraction = prevExtraction;
        window.jumpToExtraction = jumpToExtraction;

        updateDisplay();
      })();
    </script>`;
}

/**
 * Loads annotated documents from a JSONL file.
 */
function loadAnnotatedDocumentsJsonl(filePath: string): AnnotatedDocument[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    return lines.map((line) => JSON.parse(line));
  } catch (error) {
    throw new Error(`Failed to load JSONL file: ${error}`);
  }
}

/**
 * Visualizes extraction data as animated highlighted HTML.
 */
export function visualize(dataSource: AnnotatedDocument | string, options: VisualizationOptions = {}): string {
  const { animationSpeed = 1.0, showLegend = true, gifOptimized = true } = options;

  let annotatedDoc: AnnotatedDocument;

  // Load document if it's a file path
  if (typeof dataSource === "string") {
    const filePath = path.resolve(dataSource);
    if (!fs.existsSync(filePath)) {
      throw new Error(`JSONL file not found: ${filePath}`);
    }

    const documents = loadAnnotatedDocumentsJsonl(filePath);
    if (documents.length === 0) {
      throw new Error(`No documents found in JSONL file: ${filePath}`);
    }

    annotatedDoc = documents[0]; // Use first document
  } else {
    annotatedDoc = dataSource;
  }

  if (!annotatedDoc || !annotatedDoc.text) {
    throw new Error("annotatedDoc must contain text to visualize.");
  }

  if (!annotatedDoc.extractions) {
    throw new Error("annotatedDoc must contain extractions to visualize.");
  }

  // Filter valid extractions
  const validExtractions = filterValidExtractions(annotatedDoc.extractions);

  if (validExtractions.length === 0) {
    const emptyHtml = '<div class="lx-animated-wrapper"><p>No valid extractions to animate.</p></div>';
    return VISUALIZATION_CSS + emptyHtml;
  }

  const colorMap = assignColors(validExtractions);

  const visualizationHtml = buildVisualizationHtml(annotatedDoc.text, validExtractions, colorMap, { animationSpeed, showLegend });

  let fullHtml = VISUALIZATION_CSS + visualizationHtml;

  // Apply GIF optimizations if requested
  if (gifOptimized) {
    fullHtml = fullHtml.replace('class="lx-animated-wrapper"', 'class="lx-animated-wrapper lx-gif-optimized"');
  }

  return fullHtml;
}

/**
 * Saves visualization HTML to a file.
 */
export function saveVisualization(dataSource: AnnotatedDocument | string, outputPath: string, options: VisualizationOptions = {}): void {
  const html = visualize(dataSource, options);
  fs.writeFileSync(outputPath, html, "utf-8");
}

/**
 * Creates a simple HTML page with the visualization.
 */
export function createVisualizationPage(dataSource: AnnotatedDocument | string, options: VisualizationOptions = {}): string {
  const visualizationHtml = visualize(dataSource, options);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LangExtract Visualization</title>
</head>
<body>
    ${visualizationHtml}
</body>
</html>`;
}

/**
 * Saves a complete HTML page with the visualization.
 */
export function saveVisualizationPage(dataSource: AnnotatedDocument | string, outputPath: string, options: VisualizationOptions = {}): void {
  const html = createVisualizationPage(dataSource, options);
  fs.writeFileSync(outputPath, html, "utf-8");
}
