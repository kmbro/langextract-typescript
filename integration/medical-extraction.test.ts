/**
 * Medical extraction integration test
 * Tests extraction of medical information similar to the medication examples
 */

import { extract, ExampleData, FormatType } from "../src/index";
import { getDocument } from "./test-helpers";

describe("Medical Extraction Integration Tests", () => {
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
    {
      text: "Prescribed 500 mg Amoxicillin PO BID for 10 days.",
      extractions: [
        {
          extractionClass: "dosage",
          extractionText: "500 mg",
        },
        {
          extractionClass: "route",
          extractionText: "PO",
        },
        {
          extractionClass: "medication",
          extractionText: "Amoxicillin",
        },
        {
          extractionClass: "frequency",
          extractionText: "BID",
        },
        {
          extractionClass: "duration",
          extractionText: "for 10 days",
        },
      ],
    },
  ];

  // Test data for patient information extraction
  const patientExamples: ExampleData[] = [
    {
      text: "Patient ID: 12345, Name: John Doe, Age: 45, Diagnosis: Hypertension, BP: 140/90 mmHg.",
      extractions: [
        {
          extractionClass: "patient_id",
          extractionText: "12345",
        },
        {
          extractionClass: "patient_name",
          extractionText: "John Doe",
        },
        {
          extractionClass: "age",
          extractionText: "45",
        },
        {
          extractionClass: "diagnosis",
          extractionText: "Hypertension",
        },
        {
          extractionClass: "vital_sign",
          extractionText: "140/90 mmHg",
          attributes: { type: "blood_pressure" },
        },
      ],
    },
  ];

  it("should extract medication information in order of appearance", async () => {
    const testText = "Patient took 400 mg PO Ibuprofen q4h for two days.";

    const result: any = await extract(testText, {
      promptDescription:
        "Extract medication information including medication name, dosage, route, frequency, and duration in the order they appear in the text",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
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

  it("should extract patient information with attributes", async () => {
    const testText = "Patient ID: 67890, Name: Jane Smith, Age: 32, Diagnosis: Diabetes Type 2, BP: 120/80 mmHg.";

    const result: any = await extract(testText, {
      promptDescription: "Extract patient information including ID, name, age, diagnosis, and vital signs",
      examples: patientExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(0);

    // Check for patient information
    const patientIdExtraction = document.extractions!.find((e: any) => e.extractionClass === "patient_id");
    expect(patientIdExtraction!.extractionText).toBe("67890");

    const patientNameExtraction = document.extractions!.find((e: any) => e.extractionClass === "patient_name");
    expect(patientNameExtraction!.extractionText).toBe("Jane Smith");

    const diagnosisExtraction = document.extractions!.find((e: any) => e.extractionClass === "diagnosis");
    expect(diagnosisExtraction!.extractionText).toBe("Diabetes Type 2");
  });

  it("should handle complex medical scenarios with multiple medications", async () => {
    const testText = "Dr. Smith prescribed 500 mg Amoxicillin BID for 10 days. Dr. Johnson also recommended 200 mg Ibuprofen TID as needed for pain.";

    const result: any = await extract(testText, {
      promptDescription: "Extract all medication information including prescriber, medication name, dosage, frequency, and duration",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(6);

    // Should find multiple medications
    const medications = document.extractions!.filter((e: any) => e.extractionClass === "medication");
    expect(medications.length).toBeGreaterThanOrEqual(2);
    expect(medications.some((e: any) => e.extractionText === "Amoxicillin")).toBe(true);
    expect(medications.some((e: any) => e.extractionText === "Ibuprofen")).toBe(true);

    // Should find multiple dosages
    const dosages = document.extractions!.filter((e: any) => e.extractionClass === "dosage");
    expect(dosages.length).toBeGreaterThanOrEqual(2);
  });

  it("should extract vital signs with attributes", async () => {
    const testText = "Patient vital signs: BP 140/90 mmHg, HR 85 bpm, Temp 98.6°F, O2 Sat 98%.";

    const result: any = await extract(testText, {
      promptDescription: "Extract vital signs including blood pressure, heart rate, temperature, and oxygen saturation",
      examples: patientExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Should find vital signs
    const vitalSigns = document.extractions!.filter((e: any) => e.extractionClass === "vital_sign");
    expect(vitalSigns.length).toBeGreaterThan(0);

    // Check for specific vital signs
    const bpExtraction = vitalSigns.find((e: any) => e.extractionText.includes("140/90"));
    expect(bpExtraction).toBeDefined();
  });

  it("should handle medical abbreviations and terminology", async () => {
    const testText = "Rx: ASA 81mg PO QD, Metformin 500mg PO BID, Lisinopril 10mg PO QD.";

    const result: any = await extract(testText, {
      promptDescription: "Extract medication information including medication names, dosages, routes, and frequencies. Handle medical abbreviations.",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Should find medications including abbreviations
    const medications = document.extractions!.filter((e: any) => e.extractionClass === "medication");
    expect(medications.length).toBeGreaterThan(0);

    // Should find frequencies including abbreviations
    const frequencies = document.extractions!.filter((e: any) => e.extractionClass === "frequency");
    expect(frequencies.length).toBeGreaterThan(0);
  });

  it("should extract medical procedures and interventions", async () => {
    const testText = "Patient underwent appendectomy on 2024-01-15. Post-op care includes IV fluids and pain management.";

    const procedureExamples: ExampleData[] = [
      {
        text: "Patient had cardiac catheterization on 2024-01-10.",
        extractions: [
          {
            extractionClass: "procedure",
            extractionText: "cardiac catheterization",
            attributes: { date: "2024-01-10" },
          },
        ],
      },
    ];

    const result: any = await extract(testText, {
      promptDescription: "Extract medical procedures, dates, and post-operative care information",
      examples: procedureExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Should find procedure
    const procedures = document.extractions!.filter((e: any) => e.extractionClass === "procedure");
    expect(procedures.length).toBeGreaterThan(0);
  });

  it("should handle different format types for medical data", async () => {
    const testText = "Patient received 100 mg Aspirin PO QD.";

    // Test with JSON format
    const jsonResult: any = await extract(testText, {
      promptDescription: "Extract medication information",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(jsonResult).toBeDefined();
    expect(jsonResult.extractions).toBeDefined();

    // Test with YAML format
    const yamlResult: any = await extract(testText, {
      promptDescription: "Extract medication information",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.YAML,
      temperature: 0.3,
    });

    expect(yamlResult).toBeDefined();
    expect(yamlResult.extractions).toBeDefined();
  });

  it("should handle temperature variations for medical extraction", async () => {
    const testText = "Patient prescribed 250 mg Cephalexin PO TID for 7 days.";

    // Test with low temperature (more deterministic)
    const lowTempResult: any = await extract(testText, {
      promptDescription: "Extract medication information",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.1,
    });

    // Test with higher temperature (more creative)
    const highTempResult: any = await extract(testText, {
      promptDescription: "Extract medication information",
      examples: medicationExamples,
      modelType: "openai",
      apiKey: process.env.OPENAI_API_KEY || "test-api-key",
      modelId: "gpt-4o-mini",
      baseURL: "https://api.openai.com/v1",
      formatType: FormatType.JSON,
      temperature: 0.7,
    });

    expect(lowTempResult).toBeDefined();
    expect(highTempResult).toBeDefined();
    expect(lowTempResult.extractions).toBeDefined();
    expect(highTempResult.extractions).toBeDefined();
  });
});
