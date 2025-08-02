/**
 * Basic usage example for LangExtract TypeScript
 */

import { extract, ExampleData } from "../src/index";

async function basicExample() {
  // Define examples to guide the extraction
  const examples: ExampleData[] = [
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

  try {
    // Extract information from text
    const result = await extract("Alice Brown is 25 years old and works at Apple as a product manager.", {
      promptDescription: "Extract person information including name, age, employer, and job title",
      examples: examples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "your-api-key-here",
      modelId: "gemini-2.5-flash",
      formatType: "json" as any,
      temperature: 0.3,
    });

    console.log("Extraction Result:");
    console.log(JSON.stringify(result, null, 2));

    if (result.extractions) {
      console.log("\nExtracted Entities:");
      result.extractions.forEach((extraction, index) => {
        console.log(`${index + 1}. ${extraction.extractionClass}: ${extraction.extractionText}`);
        if (extraction.attributes) {
          console.log(`   Attributes:`, extraction.attributes);
        }
        if (extraction.charInterval) {
          console.log(`   Position: ${extraction.charInterval.startPos}-${extraction.charInterval.endPos}`);
        }
      });
    }
  } catch (error) {
    console.error("Extraction failed:", error);
  }
}

// Run the example
if (require.main === module) {
  basicExample();
}

export { basicExample };
