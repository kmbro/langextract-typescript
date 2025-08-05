import { extract } from "../src/index";

async function demonstrateMaxTokensAndUrlOverride() {
  console.log("=== LangExtract Max Tokens and URL Override Example ===\n");

  // Example data for extraction
  const examples = [
    {
      text: "John Smith is a software engineer at Google. He has 5 years of experience.",
      extractions: [
        {
          name: "John Smith",
          role: "software engineer",
          company: "Google",
          experience: "5 years",
        },
      ],
    },
  ];

  try {
    // Example 1: Using maxTokens to limit response length
    console.log("1. Extraction with maxTokens=100 (limited response):");
    const result1 = await extract("Alice Johnson works as a data scientist at Microsoft for 3 years.", {
      examples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "your-api-key-here",
      maxTokens: 100, // Limit response to 100 tokens
      debug: true,
    });
    console.log("Result:", JSON.stringify(result1, null, 2));
    console.log("\n");

    // Example 2: Using custom URL for Gemini (useful for self-hosted instances)
    console.log("2. Extraction with custom Gemini URL:");
    const result2 = await extract("Bob Wilson is a product manager at Apple with 7 years of experience.", {
      examples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "your-api-key-here",
      modelType: "gemini",
      modelUrl: "https://your-custom-gemini-endpoint.com", // Custom URL
      maxTokens: 500,
      debug: true,
    });
    console.log("Result:", JSON.stringify(result2, null, 2));
    console.log("\n");

    // Example 3: Using OpenAI with maxTokens
    console.log("3. Extraction with OpenAI and maxTokens:");
    const result3 = await extract("Carol Davis is a UX designer at Facebook for 4 years.", {
      examples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "your-api-key-here",
      modelType: "openai",
      modelId: "gpt-4o-mini",
      maxTokens: 200, // Limit OpenAI response to 200 tokens
      debug: true,
    });
    console.log("Result:", JSON.stringify(result3, null, 2));
    console.log("\n");

    // Example 4: Using Ollama with maxTokens
    console.log("4. Extraction with Ollama and maxTokens:");
    const result4 = await extract("David Brown is a DevOps engineer at Amazon for 6 years.", {
      examples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "your-api-key-here",
      modelType: "ollama",
      modelId: "llama3.1:8b",
      modelUrl: "http://localhost:11434", // Local Ollama instance
      maxTokens: 150,
      debug: true,
    });
    console.log("Result:", JSON.stringify(result4, null, 2));
  } catch (error) {
    console.error("Error during extraction:", error);
  }
}

// Run the example
if (require.main === module) {
  demonstrateMaxTokensAndUrlOverride();
}

export { demonstrateMaxTokensAndUrlOverride };
