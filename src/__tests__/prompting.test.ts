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
 * Tests for prompt generation functionality.
 */

import { QAPromptGeneratorImpl, PromptTemplateStructured } from "../prompting";
import { FormatType } from "../types";
import { EXTRACTIONS_KEY } from "../schema";

describe("QAPromptGeneratorTest", () => {
  describe("generate prompt", () => {
    it("should generate complete prompt with examples", () => {
      const promptTemplateStructured: PromptTemplateStructured = {
        description: `You are an assistant specialized in extracting key extractions from text.
Identify and extract important extractions such as people, places, organizations, dates, and medical conditions mentioned in the text.
**Please ensure that the extractions are extracted in the same order as they appear in the source text.**
Provide the extracted extractions in a structured YAML format.`,
        examples: [
          {
            text: "The patient was diagnosed with hypertension and diabetes.",
            extractions: [
              {
                extractionClass: "medical_condition",
                extractionText: "hypertension",
                attributes: {
                  chronicity: "chronic",
                  system: "cardiovascular",
                },
              },
              {
                extractionClass: "medical_condition",
                extractionText: "diabetes",
                attributes: {
                  chronicity: "chronic",
                  system: "endocrine",
                },
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(promptTemplateStructured);
      promptGenerator.formatType = FormatType.YAML;
      promptGenerator.examplesHeading = "";
      promptGenerator.questionPrefix = "";
      promptGenerator.answerPrefix = "";

      const actualPromptText = promptGenerator.render("The patient reports chest pain and shortness of breath.");

      // Check that the prompt contains the expected components
      expect(actualPromptText).toContain("You are an assistant specialized in extracting key extractions from text");
      expect(actualPromptText).toContain("The patient was diagnosed with hypertension and diabetes");
      expect(actualPromptText).toContain("The patient reports chest pain and shortness of breath");
      expect(actualPromptText).toContain("```yaml");
      expect(actualPromptText).toContain(EXTRACTIONS_KEY);
      expect(actualPromptText).toContain("medical_condition: hypertension");
      expect(actualPromptText).toContain("medical_condition: diabetes");
    });
  });

  describe("format example", () => {
    it("should format JSON example correctly", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Patient has diabetes and is prescribed insulin.",
            extractions: [
              {
                extractionClass: "medical_condition",
                extractionText: "diabetes",
                attributes: { chronicity: "chronic" },
              },
              {
                extractionClass: "medication",
                extractionText: "insulin",
                attributes: { prescribed: "prescribed" },
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.JSON;

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("Patient has diabetes and is prescribed insulin");
      expect(formattedExample).toContain("```json");
      expect(formattedExample).toContain(EXTRACTIONS_KEY);
      expect(formattedExample).toContain("medical_condition");
      expect(formattedExample).toContain("medication");
    });

    it("should format YAML example correctly", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Patient has diabetes and is prescribed insulin.",
            extractions: [
              {
                extractionClass: "medical_condition",
                extractionText: "diabetes",
                attributes: { chronicity: "chronic" },
              },
              {
                extractionClass: "medication",
                extractionText: "insulin",
                attributes: { prescribed: "prescribed" },
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.YAML;

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("Patient has diabetes and is prescribed insulin");
      expect(formattedExample).toContain("```yaml");
      expect(formattedExample).toContain(EXTRACTIONS_KEY);
      expect(formattedExample).toContain("medical_condition");
      expect(formattedExample).toContain("medication");
    });

    it("should handle custom attribute suffix", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Patient has a fever.",
            extractions: [
              {
                extractionClass: "symptom",
                extractionText: "fever",
                attributes: { severity: "mild" },
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.YAML;
      promptGenerator.attributeSuffix = "_props";

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("symptom_props");
      expect(formattedExample).not.toContain("symptom_attributes");
    });

    it("should handle empty extractions", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Text with no extractions.",
            extractions: [],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.YAML;

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("Text with no extractions");
      expect(formattedExample).toContain(`${EXTRACTIONS_KEY}: []`);
    });

    it("should handle empty attributes", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Patient is resting comfortably.",
            extractions: [
              {
                extractionClass: "person",
                extractionText: "Patient",
                attributes: {},
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.YAML;

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("Patient is resting comfortably");
      expect(formattedExample).toContain("person_attributes: {}");
    });

    it("should handle multiple extractions of same class", () => {
      const template: PromptTemplateStructured = {
        description: "Test description",
        examples: [
          {
            text: "Patient has multiple medications: aspirin and lisinopril.",
            extractions: [
              {
                extractionClass: "medication",
                extractionText: "aspirin",
                attributes: { dosage: "81mg" },
              },
              {
                extractionClass: "medication",
                extractionText: "lisinopril",
                attributes: { dosage: "10mg" },
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.YAML;

      const formattedExample = promptGenerator.formatExampleAsText(template.examples[0]);

      expect(formattedExample).toContain("aspirin");
      expect(formattedExample).toContain("lisinopril");
      expect(formattedExample).toContain("dosage: 81mg");
      expect(formattedExample).toContain("dosage: 10mg");
    });
  });

  describe("render function", () => {
    it("should render prompt with description only", () => {
      const template: PromptTemplateStructured = {
        description: "Extract medical entities from text.",
        examples: [],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      const result = promptGenerator.render("Patient has diabetes.");

      expect(result).toContain("Extract medical entities from text");
      expect(result).toContain("Q: Patient has diabetes");
      expect(result).toContain("A:");
      expect(result).not.toContain("Examples");
    });

    it("should render prompt with examples", () => {
      const template: PromptTemplateStructured = {
        description: "Extract medical entities from text.",
        examples: [
          {
            text: "Patient has diabetes.",
            extractions: [
              {
                extractionClass: "condition",
                extractionText: "diabetes",
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      const result = promptGenerator.render("Patient has hypertension.");

      expect(result).toContain("Extract medical entities from text");
      expect(result).toContain("Examples");
      expect(result).toContain("Q: Patient has diabetes");
      expect(result).toContain("Q: Patient has hypertension");
      expect(result).toContain("A:");
    });

    it("should render prompt with additional context", () => {
      const template: PromptTemplateStructured = {
        description: "Extract medical entities from text.",
        examples: [],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      const result = promptGenerator.render("Patient has diabetes.", "This is a medical record.");

      expect(result).toContain("Extract medical entities from text");
      expect(result).toContain("This is a medical record");
      expect(result).toContain("Q: Patient has diabetes");
    });

    it("should handle empty additional context", () => {
      const template: PromptTemplateStructured = {
        description: "Extract medical entities from text.",
        examples: [],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      const result = promptGenerator.render("Patient has diabetes.", "");

      expect(result).toContain("Extract medical entities from text");
      expect(result).not.toContain("This is a medical record");
      expect(result).toContain("Q: Patient has diabetes");
    });
  });

  describe("toString function", () => {
    it("should return prompt with empty question", () => {
      const template: PromptTemplateStructured = {
        description: "Extract medical entities from text.",
        examples: [
          {
            text: "Patient has diabetes.",
            extractions: [
              {
                extractionClass: "condition",
                extractionText: "diabetes",
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      const result = promptGenerator.toString();

      expect(result).toContain("Extract medical entities from text");
      expect(result).toContain("Examples");
      expect(result).toContain("Q: Patient has diabetes");
      expect(result).toContain("Q: ");
      expect(result).toContain("A:");
    });
  });

  describe("configuration", () => {
    it("should use default configuration", () => {
      const template: PromptTemplateStructured = {
        description: "Test",
        examples: [],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);

      expect(promptGenerator.formatType).toBe(FormatType.YAML);
      expect(promptGenerator.attributeSuffix).toBe("_attributes");
      expect(promptGenerator.examplesHeading).toBe("Examples");
      expect(promptGenerator.questionPrefix).toBe("Q: ");
      expect(promptGenerator.answerPrefix).toBe("A: ");
      expect(promptGenerator.fenceOutput).toBe(true);
    });

    it("should allow custom configuration", () => {
      const template: PromptTemplateStructured = {
        description: "Test",
        examples: [],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = FormatType.JSON;
      promptGenerator.attributeSuffix = "_props";
      promptGenerator.examplesHeading = "Samples";
      promptGenerator.questionPrefix = "Input: ";
      promptGenerator.answerPrefix = "Output: ";
      promptGenerator.fenceOutput = false;

      expect(promptGenerator.formatType).toBe(FormatType.JSON);
      expect(promptGenerator.attributeSuffix).toBe("_props");
      expect(promptGenerator.examplesHeading).toBe("Samples");
      expect(promptGenerator.questionPrefix).toBe("Input: ");
      expect(promptGenerator.answerPrefix).toBe("Output: ");
      expect(promptGenerator.fenceOutput).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle unsupported format type", () => {
      const template: PromptTemplateStructured = {
        description: "Test",
        examples: [
          {
            text: "Test",
            extractions: [
              {
                extractionClass: "test",
                extractionText: "test",
              },
            ],
          },
        ],
      };

      const promptGenerator = new QAPromptGeneratorImpl(template);
      promptGenerator.formatType = "invalid" as any;

      expect(() => {
        promptGenerator.formatExampleAsText(template.examples[0]);
      }).toThrow("Unsupported format type: invalid");
    });
  });
});
