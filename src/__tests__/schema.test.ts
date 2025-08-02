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
 * Tests for schema generation functionality.
 */

import { GeminiSchemaImpl, EXTRACTIONS_KEY, ConstraintType } from "../schema";
import { ExampleData } from "../types";

describe("GeminiSchemaTest", () => {
  describe("fromExamples", () => {
    it("should handle empty extractions", () => {
      const examplesData: ExampleData[] = [];
      const expectedSchema = {
        type: "object",
        properties: {
          [EXTRACTIONS_KEY]: {
            type: "array",
            items: {
              type: "object",
              properties: {},
            },
          },
        },
        required: [EXTRACTIONS_KEY],
      };

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      expect(actualSchema).toEqual(expectedSchema);
    });

    it("should handle single extraction with no attributes", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has diabetes.",
          extractions: [
            {
              extractionClass: "condition",
              extractionText: "diabetes",
            },
          ],
        },
      ];

      const expectedSchema = {
        type: "object",
        properties: {
          [EXTRACTIONS_KEY]: {
            type: "array",
            items: {
              type: "object",
              properties: {
                condition: { type: "string" },
                condition_attributes: {
                  type: "object",
                  properties: {
                    _unused: { type: "string" },
                  },
                  nullable: true,
                },
              },
            },
          },
        },
        required: [EXTRACTIONS_KEY],
      };

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      expect(actualSchema).toEqual(expectedSchema);
    });

    it("should handle single extraction with attributes", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has diabetes.",
          extractions: [
            {
              extractionClass: "condition",
              extractionText: "diabetes",
              attributes: { chronicity: "chronic" },
            },
          ],
        },
      ];

      const expectedSchema = {
        type: "object",
        properties: {
          [EXTRACTIONS_KEY]: {
            type: "array",
            items: {
              type: "object",
              properties: {
                condition: { type: "string" },
                condition_attributes: {
                  type: "object",
                  properties: {
                    chronicity: { type: "string" },
                  },
                  nullable: true,
                },
              },
            },
          },
        },
        required: [EXTRACTIONS_KEY],
      };

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      expect(actualSchema).toEqual(expectedSchema);
    });

    it("should handle multiple extraction classes", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has diabetes.",
          extractions: [
            {
              extractionClass: "condition",
              extractionText: "diabetes",
              attributes: { chronicity: "chronic" },
            },
          ],
        },
        {
          text: "Patient is John Doe",
          extractions: [
            {
              extractionClass: "patient",
              extractionText: "John Doe",
              attributes: { id: "12345" },
            },
          ],
        },
      ];

      const expectedSchema = {
        type: "object",
        properties: {
          [EXTRACTIONS_KEY]: {
            type: "array",
            items: {
              type: "object",
              properties: {
                condition: { type: "string" },
                condition_attributes: {
                  type: "object",
                  properties: {
                    chronicity: { type: "string" },
                  },
                  nullable: true,
                },
                patient: { type: "string" },
                patient_attributes: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                  },
                  nullable: true,
                },
              },
            },
          },
        },
        required: [EXTRACTIONS_KEY],
      };

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      expect(actualSchema).toEqual(expectedSchema);
    });

    it("should handle array attributes", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has symptoms: fever, cough, fatigue.",
          extractions: [
            {
              extractionClass: "symptoms",
              extractionText: "fever, cough, fatigue",
              attributes: {
                symptom_list: ["fever", "cough", "fatigue"],
                severity: "mild",
              },
            },
          ],
        },
      ];

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      // Check that array attributes are properly typed
      const symptomsAttributes = actualSchema.properties[EXTRACTIONS_KEY].items.properties.symptoms_attributes;
      expect(symptomsAttributes.properties.symptom_list.type).toBe("array");
      expect(symptomsAttributes.properties.symptom_list.items.type).toBe("string");
      expect(symptomsAttributes.properties.severity.type).toBe("string");
    });

    it("should handle mixed string and array attributes", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient takes multiple medications.",
          extractions: [
            {
              extractionClass: "medication",
              extractionText: "aspirin, ibuprofen",
              attributes: {
                medications: ["aspirin", "ibuprofen"],
                dosage: "100mg",
                frequency: ["daily", "as needed"],
              },
            },
          ],
        },
      ];

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      const medicationAttributes = actualSchema.properties[EXTRACTIONS_KEY].items.properties.medication_attributes;
      expect(medicationAttributes.properties.medications.type).toBe("array");
      expect(medicationAttributes.properties.medications.items.type).toBe("string");
      expect(medicationAttributes.properties.dosage.type).toBe("string");
      expect(medicationAttributes.properties.frequency.type).toBe("array");
      expect(medicationAttributes.properties.frequency.items.type).toBe("string");
    });

    it("should handle custom attribute suffix", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has diabetes.",
          extractions: [
            {
              extractionClass: "condition",
              extractionText: "diabetes",
              attributes: { severity: "moderate" },
            },
          ],
        },
      ];

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData, "_props");
      const actualSchema = geminiSchema.schemaDict;

      // Check that custom suffix is used
      expect(actualSchema.properties[EXTRACTIONS_KEY].items.properties).toHaveProperty("condition_props");
      expect(actualSchema.properties[EXTRACTIONS_KEY].items.properties).not.toHaveProperty("condition_attributes");
    });

    it("should handle multiple extractions of same class", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient has diabetes and hypertension.",
          extractions: [
            {
              extractionClass: "condition",
              extractionText: "diabetes",
              attributes: { severity: "moderate" },
            },
            {
              extractionClass: "condition",
              extractionText: "hypertension",
              attributes: { severity: "mild" },
            },
          ],
        },
      ];

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      // Should merge attributes from both extractions
      const conditionAttributes = actualSchema.properties[EXTRACTIONS_KEY].items.properties.condition_attributes;
      expect(conditionAttributes.properties.severity.type).toBe("string");
    });

    it("should handle empty attributes object", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Patient is resting.",
          extractions: [
            {
              extractionClass: "status",
              extractionText: "resting",
              attributes: {},
            },
          ],
        },
      ];

      const geminiSchema = GeminiSchemaImpl.fromExamples(examplesData);
      const actualSchema = geminiSchema.schemaDict;

      // Should still create attributes object with _unused property
      const statusAttributes = actualSchema.properties[EXTRACTIONS_KEY].items.properties.status_attributes;
      expect(statusAttributes.properties._unused.type).toBe("string");
    });
  });

  describe("GeminiSchemaImpl", () => {
    it("should allow setting and getting schema dictionary", () => {
      const schemaDict = {
        type: "object",
        properties: {
          test: { type: "string" },
        },
      };

      const geminiSchema = new GeminiSchemaImpl(schemaDict);
      expect(geminiSchema.schemaDict).toEqual(schemaDict);

      const newSchemaDict = {
        type: "object",
        properties: {
          updated: { type: "string" },
        },
      };

      geminiSchema.schemaDict = newSchemaDict;
      expect(geminiSchema.schemaDict).toEqual(newSchemaDict);
    });

    it("should implement BaseSchema interface", () => {
      const examplesData: ExampleData[] = [
        {
          text: "Test",
          extractions: [
            {
              extractionClass: "test",
              extractionText: "test",
            },
          ],
        },
      ];

      const geminiSchema = new GeminiSchemaImpl({});
      const result = geminiSchema.fromExamples(examplesData);

      expect(result).toBeInstanceOf(GeminiSchemaImpl);
      expect(result.schemaDict).toBeDefined();
    });
  });

  describe("Constants", () => {
    it("should export correct constants", () => {
      expect(EXTRACTIONS_KEY).toBe("extractions");
      expect(ConstraintType.NONE).toBe("none");
    });
  });
});
