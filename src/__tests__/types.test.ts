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
 * Tests for core data types and structures.
 */

import {
  AlignmentStatus,
  FormatType,
  CharInterval,
  TokenInterval,
  TokenizedText,
  Extraction,
  Document,
  AnnotatedDocument,
  ExampleData,
  ScoredOutput,
} from "../types";

describe("Types and Data Structures", () => {
  describe("Enums", () => {
    it("should have correct AlignmentStatus values", () => {
      expect(AlignmentStatus.MATCH_EXACT).toBe("match_exact");
      expect(AlignmentStatus.MATCH_GREATER).toBe("match_greater");
      expect(AlignmentStatus.MATCH_LESSER).toBe("match_lesser");
      expect(AlignmentStatus.MATCH_FUZZY).toBe("match_fuzzy");
    });

    it("should have correct FormatType values", () => {
      expect(FormatType.YAML).toBe("yaml");
      expect(FormatType.JSON).toBe("json");
    });
  });

  describe("CharInterval", () => {
    it("should create CharInterval with optional properties", () => {
      const interval: CharInterval = {
        startPos: 0,
        endPos: 10,
      };
      expect(interval.startPos).toBe(0);
      expect(interval.endPos).toBe(10);
    });

    it("should allow undefined properties", () => {
      const interval: CharInterval = {};
      expect(interval.startPos).toBeUndefined();
      expect(interval.endPos).toBeUndefined();
    });
  });

  describe("TokenInterval", () => {
    it("should create TokenInterval with required properties", () => {
      const interval: TokenInterval = {
        startToken: 0,
        endToken: 5,
      };
      expect(interval.startToken).toBe(0);
      expect(interval.endToken).toBe(5);
    });
  });

  describe("TokenizedText", () => {
    it("should create TokenizedText with all properties", () => {
      const tokenized: TokenizedText = {
        tokens: ["Hello", "world"],
        tokenIntervals: [
          { startToken: 0, endToken: 1 },
          { startToken: 1, endToken: 2 },
        ],
        charIntervals: [
          { startPos: 0, endPos: 5 },
          { startPos: 6, endPos: 11 },
        ],
      };

      expect(tokenized.tokens).toEqual(["Hello", "world"]);
      expect(tokenized.tokenIntervals).toHaveLength(2);
      expect(tokenized.charIntervals).toHaveLength(2);
    });
  });

  describe("Extraction", () => {
    it("should create Extraction with required properties", () => {
      const extraction: Extraction = {
        extractionClass: "person",
        extractionText: "John Doe",
      };

      expect(extraction.extractionClass).toBe("person");
      expect(extraction.extractionText).toBe("John Doe");
    });

    it("should create Extraction with all optional properties", () => {
      const extraction: Extraction = {
        extractionClass: "medication",
        extractionText: "Aspirin",
        charInterval: { startPos: 10, endPos: 17 },
        alignmentStatus: AlignmentStatus.MATCH_EXACT,
        extractionIndex: 1,
        groupIndex: 0,
        description: "Pain reliever",
        attributes: {
          dosage: "100mg",
          frequency: "daily",
        },
        tokenInterval: { startToken: 2, endToken: 3 },
      };

      expect(extraction.extractionClass).toBe("medication");
      expect(extraction.extractionText).toBe("Aspirin");
      expect(extraction.charInterval).toEqual({ startPos: 10, endPos: 17 });
      expect(extraction.alignmentStatus).toBe(AlignmentStatus.MATCH_EXACT);
      expect(extraction.extractionIndex).toBe(1);
      expect(extraction.groupIndex).toBe(0);
      expect(extraction.description).toBe("Pain reliever");
      expect(extraction.attributes).toEqual({
        dosage: "100mg",
        frequency: "daily",
      });
      expect(extraction.tokenInterval).toEqual({ startToken: 2, endToken: 3 });
    });

    it("should handle array attributes", () => {
      const extraction: Extraction = {
        extractionClass: "symptoms",
        extractionText: "fever, cough",
        attributes: {
          symptoms: ["fever", "cough"],
          severity: "mild",
        },
      };

      expect(extraction.attributes!.symptoms).toEqual(["fever", "cough"]);
      expect(extraction.attributes!.severity).toBe("mild");
    });
  });

  describe("Document", () => {
    it("should create Document with required properties", () => {
      const document: Document = {
        text: "Patient has diabetes.",
      };

      expect(document.text).toBe("Patient has diabetes.");
    });

    it("should create Document with all optional properties", () => {
      const document: Document = {
        text: "Patient has diabetes.",
        documentId: "doc123",
        additionalContext: "Medical record",
        tokenizedText: {
          tokens: ["Patient", "has", "diabetes"],
          tokenIntervals: [
            { startToken: 0, endToken: 1 },
            { startToken: 1, endToken: 2 },
            { startToken: 2, endToken: 3 },
          ],
          charIntervals: [
            { startPos: 0, endPos: 7 },
            { startPos: 8, endPos: 11 },
            { startPos: 12, endPos: 20 },
          ],
        },
      };

      expect(document.text).toBe("Patient has diabetes.");
      expect(document.documentId).toBe("doc123");
      expect(document.additionalContext).toBe("Medical record");
      expect(document.tokenizedText).toBeDefined();
      expect(document.tokenizedText!.tokens).toEqual(["Patient", "has", "diabetes"]);
    });
  });

  describe("AnnotatedDocument", () => {
    it("should create AnnotatedDocument with extractions", () => {
      const annotatedDoc: AnnotatedDocument = {
        documentId: "doc123",
        text: "Patient has diabetes.",
        extractions: [
          {
            extractionClass: "condition",
            extractionText: "diabetes",
            charInterval: { startPos: 12, endPos: 20 },
            alignmentStatus: AlignmentStatus.MATCH_EXACT,
          },
        ],
        tokenizedText: {
          tokens: ["Patient", "has", "diabetes"],
          tokenIntervals: [
            { startToken: 0, endToken: 1 },
            { startToken: 1, endToken: 2 },
            { startToken: 2, endToken: 3 },
          ],
          charIntervals: [
            { startPos: 0, endPos: 7 },
            { startPos: 8, endPos: 11 },
            { startPos: 12, endPos: 20 },
          ],
        },
      };

      expect(annotatedDoc.documentId).toBe("doc123");
      expect(annotatedDoc.text).toBe("Patient has diabetes.");
      expect(annotatedDoc.extractions).toHaveLength(1);
      expect(annotatedDoc.extractions![0].extractionClass).toBe("condition");
      expect(annotatedDoc.extractions![0].extractionText).toBe("diabetes");
      expect(annotatedDoc.tokenizedText).toBeDefined();
    });

    it("should allow empty extractions", () => {
      const annotatedDoc: AnnotatedDocument = {
        documentId: "doc123",
        text: "No extractions in this text.",
        extractions: [],
      };

      expect(annotatedDoc.extractions).toEqual([]);
    });
  });

  describe("ExampleData", () => {
    it("should create ExampleData with extractions", () => {
      const example: ExampleData = {
        text: "Patient has diabetes and hypertension.",
        extractions: [
          {
            extractionClass: "condition",
            extractionText: "diabetes",
            attributes: {
              severity: "moderate",
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
      };

      expect(example.text).toBe("Patient has diabetes and hypertension.");
      expect(example.extractions).toHaveLength(2);
      expect(example.extractions[0].extractionClass).toBe("condition");
      expect(example.extractions[0].extractionText).toBe("diabetes");
      expect(example.extractions[1].extractionClass).toBe("condition");
      expect(example.extractions[1].extractionText).toBe("hypertension");
    });

    it("should allow empty extractions", () => {
      const example: ExampleData = {
        text: "No extractions in this example.",
        extractions: [],
      };

      expect(example.extractions).toEqual([]);
    });
  });

  describe("ScoredOutput", () => {
    it("should create ScoredOutput with score and output", () => {
      const scoredOutput: ScoredOutput = {
        score: 0.95,
        output: "Extracted information",
      };

      expect(scoredOutput.score).toBe(0.95);
      expect(scoredOutput.output).toBe("Extracted information");
    });

    it("should allow optional properties", () => {
      const scoredOutput: ScoredOutput = {};

      expect(scoredOutput.score).toBeUndefined();
      expect(scoredOutput.output).toBeUndefined();
    });
  });

  describe("Type compatibility", () => {
    it("should allow type conversions between related interfaces", () => {
      const extraction: Extraction = {
        extractionClass: "person",
        extractionText: "John Doe",
        attributes: {
          age: "30",
          occupation: "doctor",
        },
      };

      // Should be able to use in ExampleData
      const example: ExampleData = {
        text: "John Doe is a doctor.",
        extractions: [extraction],
      };

      expect(example.extractions[0]).toBe(extraction);
    });

    it("should handle complex nested structures", () => {
      const complexExtraction: Extraction = {
        extractionClass: "medication",
        extractionText: "Aspirin 100mg",
        attributes: {
          components: ["aspirin", "coating"],
          dosage: "100mg",
          frequency: ["daily", "as needed"],
        },
      };

      expect(complexExtraction.attributes!.components).toEqual(["aspirin", "coating"]);
      expect(complexExtraction.attributes!.frequency).toEqual(["daily", "as needed"]);
    });
  });
});
