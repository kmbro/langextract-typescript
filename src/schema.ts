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
 * Schema definitions and abstractions for structured prompt outputs.
 */

import { ExampleData } from "./types";

export enum ConstraintType {
  NONE = "none",
}

export interface Constraint {
  constraintType: ConstraintType;
}

export const EXTRACTIONS_KEY = "extractions";

export interface BaseSchema {
  fromExamples(examplesData: ExampleData[], attributeSuffix?: string): GeminiSchema;
}

export interface GeminiSchema extends BaseSchema {
  schemaDict: Record<string, any>;
}

export class GeminiSchemaImpl implements GeminiSchema {
  private _schemaDict: Record<string, any>;

  constructor(schemaDict: Record<string, any>) {
    this._schemaDict = schemaDict;
  }

  get schemaDict(): Record<string, any> {
    return this._schemaDict;
  }

  set schemaDict(schemaDict: Record<string, any>) {
    this._schemaDict = schemaDict;
  }

  static fromExamples(examplesData: ExampleData[], attributeSuffix: string = "_attributes"): GeminiSchema {
    // Track attribute types for each category
    const extractionCategories: Record<string, Record<string, Set<string>>> = {};

    for (const example of examplesData) {
      for (const extraction of example.extractions) {
        const category = extraction.extractionClass;
        if (!extractionCategories[category]) {
          extractionCategories[category] = {};
        }

        if (extraction.attributes) {
          for (const [attrName, attrValue] of Object.entries(extraction.attributes)) {
            if (!extractionCategories[category][attrName]) {
              extractionCategories[category][attrName] = new Set();
            }
            extractionCategories[category][attrName].add(Array.isArray(attrValue) ? "array" : "string");
          }
        }
      }
    }

    const extractionProperties: Record<string, Record<string, any>> = {};

    for (const [category, attrs] of Object.entries(extractionCategories)) {
      extractionProperties[category] = { type: "string" };

      const attributesField = `${category}${attributeSuffix}`;
      const attrProperties: Record<string, any> = {};

      // If no attributes were found for this category, add a default property
      if (Object.keys(attrs).length === 0) {
        attrProperties["_unused"] = { type: "string" };
      } else {
        for (const [attrName, attrTypes] of Object.entries(attrs)) {
          // If we see array type, use array of strings
          if (attrTypes.has("array")) {
            attrProperties[attrName] = {
              type: "array",
              items: { type: "string" },
            };
          } else {
            attrProperties[attrName] = { type: "string" };
          }
        }
      }

      extractionProperties[attributesField] = {
        type: "object",
        properties: attrProperties,
        nullable: true,
      };
    }

    const extractionSchema = {
      type: "object",
      properties: extractionProperties,
    };

    const schemaDict = {
      type: "object",
      properties: {
        [EXTRACTIONS_KEY]: {
          type: "array",
          items: extractionSchema,
        },
      },
      required: [EXTRACTIONS_KEY],
    };

    return new GeminiSchemaImpl(schemaDict);
  }

  fromExamples(examplesData: ExampleData[], attributeSuffix: string = "_attributes"): GeminiSchema {
    return GeminiSchemaImpl.fromExamples(examplesData, attributeSuffix);
  }
}
