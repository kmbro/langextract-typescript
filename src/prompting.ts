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
 * Library for building prompts.
 */

import * as yaml from "js-yaml";
import { ExampleData, FormatType } from "./types";
import { EXTRACTIONS_KEY } from "./schema";

export class PromptBuilderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptBuilderError";
  }
}

export class ParseError extends PromptBuilderError {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

export interface PromptTemplateStructured {
  description: string;
  examples: ExampleData[];
}

/**
 * Reads a structured prompt template from a file.
 */
export function readPromptTemplateStructuredFromFile(promptPath: string): PromptTemplateStructured {
  try {
    // In a real implementation, you would read from file system
    // For now, we'll throw an error as this would require Node.js fs module
    throw new Error("File reading not implemented in this version");
  } catch (error) {
    throw new ParseError(`Failed to parse prompt template from file: ${promptPath}`);
  }
}

export interface QAPromptGenerator {
  template: PromptTemplateStructured;
  formatType: FormatType;
  attributeSuffix: string;
  examplesHeading: string;
  questionPrefix: string;
  answerPrefix: string;
  fenceOutput: boolean;
}

export class QAPromptGeneratorImpl implements QAPromptGenerator {
  template: PromptTemplateStructured;
  formatType: FormatType = FormatType.YAML;
  attributeSuffix: string = "_attributes";
  examplesHeading: string = "Examples";
  questionPrefix: string = "Q: ";
  answerPrefix: string = "A: ";
  fenceOutput: boolean = true;

  constructor(template: PromptTemplateStructured) {
    this.template = template;
  }

  formatExampleAsText(example: ExampleData): string {
    const question = example.text;

    // Build a dictionary for serialization
    const dataDict: Record<string, any[]> = { [EXTRACTIONS_KEY]: [] };

    for (const extraction of example.extractions) {
      const dataEntry: Record<string, any> = {
        [extraction.extractionClass]: extraction.extractionText,
        [`${extraction.extractionClass}${this.attributeSuffix}`]: extraction.attributes || {},
      };
      dataDict[EXTRACTIONS_KEY].push(dataEntry);
    }

    let answer: string;
    if (this.formatType === FormatType.YAML) {
      const formattedContent = yaml.dump(dataDict, {
        flowLevel: -1,
        sortKeys: false,
      });
      if (this.fenceOutput) {
        answer = `\`\`\`yaml\n${formattedContent.trim()}\n\`\`\``;
      } else {
        answer = formattedContent.trim();
      }
    } else if (this.formatType === FormatType.JSON) {
      const formattedContent = JSON.stringify(dataDict, null, 2);
      if (this.fenceOutput) {
        answer = `\`\`\`json\n${formattedContent.trim()}\n\`\`\``;
      } else {
        answer = formattedContent.trim();
      }
    } else {
      throw new Error(`Unsupported format type: ${this.formatType}`);
    }

    return [`${this.questionPrefix}${question}`, `${this.answerPrefix}${answer}\n`].join("\n");
  }

  render(question: string, additionalContext?: string): string {
    const promptLines: string[] = [`${this.template.description}\n`];

    if (additionalContext) {
      promptLines.push(`${additionalContext}\n`);
    }

    if (this.template.examples.length > 0) {
      promptLines.push(this.examplesHeading);
      for (const ex of this.template.examples) {
        promptLines.push(this.formatExampleAsText(ex));
      }
    }

    // Add format instruction for OpenAI compatibility
    if (this.formatType === FormatType.JSON) {
      promptLines.push("Please respond with a JSON object.");
    }

    promptLines.push(`${this.questionPrefix}${question}`);
    promptLines.push(this.answerPrefix);
    return promptLines.join("\n");
  }

  toString(): string {
    return this.render("");
  }
}
