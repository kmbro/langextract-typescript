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
 * Tests for output resolution functionality.
 */

import { Resolver, ResolverParsingError } from "../resolver";
import { FormatType, AlignmentStatus } from "../types";

describe("ResolverTest", () => {
  describe("constructor", () => {
    it("should create resolver with default options", () => {
      const resolver = new Resolver();
      expect(resolver.fenceOutput).toBe(true);
      expect(resolver.formatType).toBe(FormatType.JSON);
    });

    it("should create resolver with custom options", () => {
      const resolver = new Resolver({
        fenceOutput: false,
        formatType: FormatType.YAML,
        extractionAttributesSuffix: "_props",
      });

      expect(resolver.fenceOutput).toBe(false);
      expect(resolver.formatType).toBe(FormatType.YAML);
    });
  });

  describe("resolve function", () => {
    it("should resolve JSON output without fences", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = '{"extractions":[{"person":"John Smith","person_attributes":{"age":"30"}}]}';
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].attributes).toEqual({ age: "30" });
      expect(result[0].extractionIndex).toBe(0);
    });

    it("should resolve JSON output with fences", () => {
      const resolver = new Resolver({ fenceOutput: true });
      const jsonOutput = '```json\n{"extractions":[{"person":"John Smith","person_attributes":{"age":"30"}}]}\n```';
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].attributes).toEqual({ age: "30" });
    });

    it("should resolve YAML output", () => {
      const resolver = new Resolver({ fenceOutput: false, formatType: FormatType.YAML });
      const yamlOutput = `extractions:
- person: John Smith
  person_attributes:
    age: "30"
    occupation: doctor`;
      const result = resolver.resolve(yamlOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].attributes).toEqual({ age: "30", occupation: "doctor" });
    });

    it("should resolve YAML output with fences", () => {
      const resolver = new Resolver({ fenceOutput: true, formatType: FormatType.YAML });
      const yamlOutput = `\`\`\`yaml
extractions:
- person: John Smith
  person_attributes:
    age: "30"
\`\`\``;
      const result = resolver.resolve(yamlOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
    });

    it("should handle multiple extractions", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = `{"extractions":[
        {"person":"John Smith","person_attributes":{"age":"30"}},
        {"medication":"Aspirin","medication_attributes":{"dosage":"100mg"}}
      ]}`;
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(2);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[1].extractionClass).toBe("medication");
      expect(result[1].extractionText).toBe("Aspirin");
    });

    it("should handle extractions without attributes", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = '{"extractions":[{"condition":"diabetes"}]}';
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("condition");
      expect(result[0].extractionText).toBe("diabetes");
      expect(result[0].attributes).toBeUndefined();
    });

    it("should handle array attributes", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = `{"extractions":[{"symptoms":"fever, cough","symptoms_attributes":{"symptom_list":["fever","cough"]}}]}`;
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("symptoms");
      expect(result[0].extractionText).toBe("fever, cough");
      expect(result[0].attributes).toEqual({ symptom_list: ["fever", "cough"] });
    });

    it("should handle custom attribute suffix", () => {
      const resolver = new Resolver({
        fenceOutput: false,
        extractionAttributesSuffix: "_props",
      });
      const jsonOutput = '{"extractions":[{"person":"John Smith","person_props":{"age":"30"}}]}';
      const result = resolver.resolve(jsonOutput);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].attributes).toEqual({ age: "30" });
    });

    it("should throw error for invalid JSON", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const invalidJson = '{"extractions":[{"person":"John Smith"';

      expect(() => {
        resolver.resolve(invalidJson);
      }).toThrow(ResolverParsingError);
    });

    it("should throw error for invalid YAML", () => {
      const resolver = new Resolver({ fenceOutput: false, formatType: FormatType.YAML });
      const invalidYaml = "extractions:\n- person: John Smith\n  invalid: yaml: format";

      expect(() => {
        resolver.resolve(invalidYaml);
      }).toThrow(ResolverParsingError);
    });

    it("should suppress parse errors when requested", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const invalidJson = '{"extractions":[{"person":"John Smith"';

      const result = resolver.resolve(invalidJson, { suppressParseErrors: true });
      expect(result).toEqual([]);
    });

    it("should handle empty extractions array", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = '{"extractions":[]}';
      const result = resolver.resolve(jsonOutput);

      expect(result).toEqual([]);
    });

    it("should handle missing extractions key", () => {
      const resolver = new Resolver({ fenceOutput: false });
      const jsonOutput = '{"other_key":"value"}';

      expect(() => {
        resolver.resolve(jsonOutput);
      }).toThrow("Invalid extraction data format");
    });
  });

  describe("align function", () => {
    it("should align extractions with exact matches", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "person",
          extractionText: "John Smith",
        },
      ];
      const sourceText = "Patient John Smith has diabetes.";

      const result = resolver.align(extractions, sourceText, 0);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
      expect(result[0].extractionText).toBe("John Smith");
      expect(result[0].alignmentStatus).toBe(AlignmentStatus.MATCH_EXACT);
      expect(result[0].charInterval).toEqual({ startPos: 8, endPos: 18 });
    });

    it("should align extractions with fuzzy matches", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "medication",
          extractionText: "Aspirin",
        },
      ];
      const sourceText = "Patient takes Aspirin 100mg daily.";

      const result = resolver.align(extractions, sourceText, 0, 0, true, 0.7);

      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("medication");
      expect(result[0].extractionText).toBe("Aspirin");
      // Since "Aspirin" is an exact match in the text, it should be MATCH_EXACT, not MATCH_FUZZY
      expect(result[0].alignmentStatus).toBe(AlignmentStatus.MATCH_EXACT);
      expect(result[0].charInterval).toBeDefined();
    });

    it("should handle no matches", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "medication",
          extractionText: "NonExistentMedication",
        },
      ];
      const sourceText = "Patient takes Aspirin 100mg daily.";

      const result = resolver.align(extractions, sourceText, 0);

      expect(result).toHaveLength(0);
    });

    it("should handle token offset", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "medication",
          extractionText: "Aspirin",
        },
      ];
      const sourceText = "Patient takes Aspirin 100mg daily.";

      const result = resolver.align(extractions, sourceText, 2); // Skip first 2 tokens

      expect(result).toHaveLength(1);
      expect(result[0].charInterval).toBeDefined();
    });

    it("should handle char offset", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "medication",
          extractionText: "Aspirin",
        },
      ];
      const sourceText = "Patient takes Aspirin 100mg daily.";

      const result = resolver.align(extractions, sourceText, 0, 10); // Add 10 char offset

      expect(result).toHaveLength(1);
      expect(result[0].charInterval!.startPos).toBeGreaterThanOrEqual(10);
    });

    it("should disable fuzzy alignment", () => {
      const resolver = new Resolver();
      const extractions = [
        {
          extractionClass: "medication",
          extractionText: "Aspirin",
        },
      ];
      const sourceText = "Patient takes Aspirin 100mg daily.";

      const result = resolver.align(extractions, sourceText, 0, 0, false);

      expect(result).toHaveLength(1);
      expect(result[0].alignmentStatus).toBe(AlignmentStatus.MATCH_EXACT);
    });
  });

  describe("property setters", () => {
    it("should allow setting fenceOutput", () => {
      const resolver = new Resolver();
      expect(resolver.fenceOutput).toBe(true);

      resolver.fenceOutput = false;
      expect(resolver.fenceOutput).toBe(false);
    });

    it("should allow setting formatType", () => {
      const resolver = new Resolver();
      expect(resolver.formatType).toBe(FormatType.JSON);

      resolver.formatType = FormatType.YAML;
      expect(resolver.formatType).toBe(FormatType.YAML);
    });
  });

  describe("error handling", () => {
    it("should handle malformed fence markers", () => {
      const resolver = new Resolver({ fenceOutput: true });
      const malformedOutput = '```json\n{"extractions":[{"person":"John"}]}\n```extra';

      const result = resolver.resolve(malformedOutput);
      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
    });

    it("should handle mixed content in fences", () => {
      const resolver = new Resolver({ fenceOutput: true });
      const mixedOutput = '```json\n{"extractions":[{"person":"John"}]}\n```\nSome extra text';

      const result = resolver.resolve(mixedOutput);
      expect(result).toHaveLength(1);
      expect(result[0].extractionClass).toBe("person");
    });
  });
});
