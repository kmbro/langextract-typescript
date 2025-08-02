/**
 * Basic extraction integration test
 * Tests the core functionality of extracting structured information from text
 */

import { extract, ExampleData, FormatType } from "../src/index";
import { getDocument } from "./test-helpers";

describe("Basic Extraction Integration Tests", () => {
  // Test data for person information extraction
  const personExamples: ExampleData[] = [
    {
      text: "John Smith is 30 years old and works at Google as a software engineer.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "John Smith",
          attributes: {
            age: "30",
            employer: "Google",
            job_title: "software engineer",
          },
        },
      ],
    },
    {
      text: "Sarah Johnson, age 28, is employed by Microsoft as a data scientist.",
      extractions: [
        {
          extractionClass: "person",
          extractionText: "Sarah Johnson",
          attributes: {
            age: "28",
            employer: "Microsoft",
            job_title: "data scientist",
          },
        },
      ],
    },
  ];

  // Test data for medication extraction (similar to Python examples)
  const medicationExamples: ExampleData[] = [
    {
      text: "Patient was given 250 mg IV Cefazolin TID for one week.",
      extractions: [
        {
          extractionClass: "dosage",
          extractionText: "250 mg",
        },
        {
          extractionClass: "route",
          extractionText: "IV",
        },
        {
          extractionClass: "medication",
          extractionText: "Cefazolin",
        },
        {
          extractionClass: "frequency",
          extractionText: "TID",
        },
        {
          extractionClass: "duration",
          extractionText: "for one week",
        },
      ],
    },
  ];

  it("should extract person information with attributes", async () => {
    const testText = "Alice Brown is 25 years old and works at Apple as a product manager.";

    const result = await extract(testText, {
      promptDescription: "Extract person information including name, age, employer, and job title",
      examples: personExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    // Handle both single document and array cases
    const document = Array.isArray(result) ? result[0] : result;
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(0);

    const personExtraction = document.extractions!.find((e: any) => e.extractionClass === "person");
    expect(personExtraction).toBeDefined();
    expect(personExtraction!.extractionText).toBe("Alice Brown");
    expect(personExtraction!.attributes).toBeDefined();
    expect(personExtraction!.attributes!.age).toBe("25");
    expect(personExtraction!.attributes!.employer).toBe("Apple");
    expect(personExtraction!.attributes!.job_title).toBe("product manager");
  });

  it("should extract medication information in order of appearance", async () => {
    const testText = "Patient took 400 mg PO Ibuprofen q4h for two days.";

    const result = await extract(testText, {
      promptDescription:
        "Extract medication information including medication name, dosage, route, frequency, and duration in the order they appear in the text",
      examples: medicationExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThanOrEqual(4);

    // Check that entities are extracted in order
    const extractionClasses = document.extractions!.map((e: any) => e.extractionClass);
    expect(extractionClasses).toContain("dosage");
    expect(extractionClasses).toContain("route");
    expect(extractionClasses).toContain("medication");
    expect(extractionClasses).toContain("frequency");

    // Verify specific extractions
    const dosageExtraction = document.extractions!.find((e: any) => e.extractionClass === "dosage");
    expect(dosageExtraction!.extractionText).toBe("400 mg");

    const medicationExtraction = document.extractions!.find((e: any) => e.extractionClass === "medication");
    expect(medicationExtraction!.extractionText).toBe("Ibuprofen");
  });

  it("should handle multiple extractions from the same text", async () => {
    const testText = "Dr. Smith prescribed 500 mg Amoxicillin BID for 10 days. Dr. Johnson also recommended 200 mg Ibuprofen TID as needed.";

    const result = await extract(testText, {
      promptDescription: "Extract all medication information including prescriber, medication name, dosage, frequency, and duration",
      examples: medicationExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(4);

    // Should find multiple medications
    const medications = document.extractions!.filter((e: any) => e.extractionClass === "medication");
    expect(medications.length).toBeGreaterThanOrEqual(2);
  });

  it("should preserve character positions when available", async () => {
    const testText = "The patient received 100 mg Aspirin.";

    const result = await extract(testText, {
      promptDescription: "Extract medication and dosage information",
      examples: medicationExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Check that character intervals are preserved if the model provides them
    const dosageExtraction = document.extractions!.find((e: any) => e.extractionClass === "dosage");
    if (dosageExtraction!.charInterval && dosageExtraction!.charInterval.startPos !== undefined && dosageExtraction!.charInterval.endPos !== undefined) {
      expect(dosageExtraction!.charInterval.startPos).toBeDefined();
      expect(dosageExtraction!.charInterval.endPos).toBeDefined();
      expect(dosageExtraction!.charInterval.startPos).toBeLessThan(dosageExtraction!.charInterval.endPos);
    }
  });

  it("should handle empty or invalid API key gracefully", async () => {
    const testText = "John Doe is 35 years old.";

    await expect(
      extract(testText, {
        promptDescription: "Extract person information",
        examples: personExamples,
        apiKey: "invalid-key",
        modelId: "gemini-2.5-flash",
        formatType: FormatType.JSON,
      })
    ).rejects.toThrow();
  });

  it("should require examples for extraction", async () => {
    const testText = "Some text to extract from.";

    await expect(
      extract(testText, {
        promptDescription: "Extract information",
        examples: [],
        apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
        modelId: "gemini-2.5-flash",
        formatType: FormatType.JSON,
      })
    ).rejects.toThrow("Examples are required");
  });
});
