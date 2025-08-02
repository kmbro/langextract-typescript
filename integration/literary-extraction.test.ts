/**
 * Literary extraction integration test
 * Tests extraction from literary text similar to the Romeo and Juliet example
 */

import { extract, ExampleData, FormatType } from "../src/index";
import { getDocument } from "./test-helpers";

describe("Literary Extraction Integration Tests", () => {
  // Test data for literary character and emotion extraction
  const literaryExamples: ExampleData[] = [
    {
      text: "ROMEO. But soft! What light through yonder window breaks?\nIt is the east, and Juliet is the sun.\nJULIET. O Romeo, Romeo! Wherefore art thou Romeo?",
      extractions: [
        {
          extractionClass: "character",
          extractionText: "ROMEO",
          attributes: { emotional_state: "wonder" },
        },
        {
          extractionClass: "emotion",
          extractionText: "But soft!",
          attributes: { feeling: "gentle awe", character: "Romeo" },
        },
        {
          extractionClass: "relationship",
          extractionText: "Juliet is the sun",
          attributes: { type: "metaphor", character_1: "Romeo", character_2: "Juliet" },
        },
        {
          extractionClass: "character",
          extractionText: "JULIET",
          attributes: { emotional_state: "yearning" },
        },
        {
          extractionClass: "emotion",
          extractionText: "Wherefore art thou Romeo?",
          attributes: { feeling: "longing question", character: "Juliet" },
        },
      ],
    },
  ];

  // Sample literary text for testing
  const sampleLiteraryText = `
    HAMLET. To be, or not to be, that is the question:
    Whether 'tis nobler in the mind to suffer
    The slings and arrows of outrageous fortune,
    Or to take arms against a sea of troubles,
    And by opposing end them. To die, to sleep;
    No more; and by a sleep to say we end
    The heart-ache and the thousand natural shocks
    That flesh is heir to, 'tis a consummation
    Devoutly to be wish'd. To die, to sleep;
    To sleep: perchance to dream: ay, there's the rub;
    For in that sleep of death what dreams may come
    When we have shuffled off this mortal coil,
    Must give us pause: there's the respect
    That makes calamity of so long life;
  `;

  it("should extract characters from literary text", async () => {
    const result = await extract(sampleLiteraryText, {
      promptDescription:
        "Extract characters, emotions, and relationships from the given text. Provide meaningful attributes for every entity to add context and depth. Use exact text from the input for extraction_text. Do not paraphrase.",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(0);

    // Should find Hamlet character
    const characterExtractions = document.extractions!.filter((e: any) => e.extractionClass === "character");
    expect(characterExtractions.length).toBeGreaterThan(0);

    const hamletExtraction = characterExtractions.find((e: any) => e.extractionText.includes("HAMLET"));
    expect(hamletExtraction).toBeDefined();
  });

  it("should extract emotions and philosophical concepts", async () => {
    const result = await extract(sampleLiteraryText, {
      promptDescription:
        "Extract characters, emotions, philosophical concepts, and relationships from the given text. Focus on the emotional and philosophical content.",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Should find emotions and philosophical concepts
    const emotionExtractions = document.extractions!.filter((e: any) => e.extractionClass === "emotion");
    expect(emotionExtractions.length).toBeGreaterThan(0);

    // Check for philosophical content
    const philosophicalContent = document.extractions!.filter(
      (e: any) =>
        e.extractionClass === "emotion" ||
        e.extractionText.toLowerCase().includes("question") ||
        e.extractionText.toLowerCase().includes("death") ||
        e.extractionText.toLowerCase().includes("sleep")
    );
    expect(philosophicalContent.length).toBeGreaterThan(0);
  });

  it("should handle longer text with multiple extraction passes", async () => {
    const longerText = `
      ACT I, SCENE I. Elsinore. A platform before the castle.

      FRANCISCO at his post. Enter to him BERNARDO.

      BERNARDO. Who's there?
      FRANCISCO. Nay, answer me: stand, and unfold yourself.
      BERNARDO. Long live the king!
      FRANCISCO. Bernardo?
      BERNARDO. He.
      FRANCISCO. You come most carefully upon your hour.
      BERNARDO. 'Tis now struck twelve; get thee to bed, Francisco.
      FRANCISCO. For this relief much thanks: 'tis bitter cold,
      And I am sick at heart.
      BERNARDO. Have you had quiet guard?
      FRANCISCO. Not a mouse stirring.
      BERNARDO. Well, good night.
      If you do meet Horatio and Marcellus,
      The rivals of my watch, bid them make haste.
    `;

    const result = await extract(longerText, {
      promptDescription: "Extract characters, emotions, and relationships from the given text. Focus on character interactions and emotional states.",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
      extractionPasses: 2,
      maxCharBuffer: 500,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();
    expect(document.extractions!.length).toBeGreaterThan(0);

    // Should find multiple characters
    const characters = document.extractions!.filter((e: any) => e.extractionClass === "character");
    expect(characters.length).toBeGreaterThanOrEqual(2);

    // Should find emotions
    const emotions = document.extractions!.filter((e: any) => e.extractionClass === "emotion");
    expect(emotions.length).toBeGreaterThan(0);
  });

  it("should extract relationships between characters", async () => {
    const dialogueText = `
      HAMLET. Good friends, go in, and taste some wine with me;
      And we, as soon as thou shalt make an end
      To this business, will to supper.

      HORATIO. My lord, I came to see your father's funeral.
      HAMLET. I pray thee, do not mock me, fellow-student;
      I think it was to see my mother's wedding.
    `;

    const result = await extract(dialogueText, {
      promptDescription: "Extract characters, emotions, and relationships from the given text. Pay special attention to relationships between characters.",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(result).toBeDefined();
    const document = getDocument(result);
    expect(document.extractions).toBeDefined();

    // Should find relationship between Hamlet and Horatio
    const relationships = document.extractions!.filter((e: any) => e.extractionClass === "relationship");
    const characterMentions = document.extractions!.filter((e: any) => e.extractionClass === "character");

    expect(characterMentions.length).toBeGreaterThanOrEqual(2);
    expect(characterMentions.some((e: any) => e.extractionText.includes("HAMLET"))).toBe(true);
    expect(characterMentions.some((e: any) => e.extractionText.includes("HORATIO"))).toBe(true);
  });

  it("should handle different format types", async () => {
    const shortText = "HAMLET. To be, or not to be, that is the question.";

    // Test with JSON format
    const jsonResult = await extract(shortText, {
      promptDescription: "Extract characters and emotions from the text",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.3,
    });

    expect(jsonResult).toBeDefined();
    const jsonDocument = getDocument(jsonResult);
    expect(jsonDocument.extractions).toBeDefined();

    // Test with YAML format
    const yamlResult = await extract(shortText, {
      promptDescription: "Extract characters and emotions from the text",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.YAML,
      temperature: 0.3,
    });

    expect(yamlResult).toBeDefined();
    const yamlDocument = getDocument(yamlResult);
    expect(yamlDocument.extractions).toBeDefined();
  });

  it("should handle temperature variations for different extraction styles", async () => {
    const text = "HAMLET. Alas, poor Yorick! I knew him, Horatio.";

    // Test with low temperature (more deterministic)
    const lowTempResult = await extract(text, {
      promptDescription: "Extract characters and emotions from the text",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.1,
    });

    // Test with higher temperature (more creative)
    const highTempResult = await extract(text, {
      promptDescription: "Extract characters and emotions from the text",
      examples: literaryExamples,
      apiKey: process.env.LANGEXTRACT_API_KEY || "test-api-key",
      modelId: "gemini-2.5-flash",
      formatType: FormatType.JSON,
      temperature: 0.7,
    });

    expect(lowTempResult).toBeDefined();
    expect(highTempResult).toBeDefined();
    const lowTempDocument = getDocument(lowTempResult);
    const highTempDocument = getDocument(highTempResult);
    expect(lowTempDocument.extractions).toBeDefined();
    expect(highTempDocument.extractions).toBeDefined();
  });
});
