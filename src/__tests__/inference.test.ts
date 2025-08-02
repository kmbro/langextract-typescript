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

import { GeminiLanguageModel, OpenAILanguageModel, OllamaLanguageModel } from "../inference";
import { FormatType } from "../types";
import { GeminiSchemaImpl } from "../schema";

// Mock axios
jest.mock("axios");
const axios = require("axios");

describe("Language Models", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GeminiLanguageModel", () => {
    it("should create with default config", () => {
      const model = new GeminiLanguageModel();
      expect(model).toBeDefined();
    });

    it("should create with custom config", () => {
      const model = new GeminiLanguageModel({
        modelId: "custom-model",
        apiKey: "test-key",
        temperature: 0.8,
      });
      expect(model).toBeDefined();
    });

    it("should handle successful inference", async () => {
      const mockResponse = {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: '{"result": "success"}' }],
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const model = new GeminiLanguageModel({ apiKey: "test-key" });
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(1.0);
      expect(result[0][0].output).toBe('{"result": "success"}');
    });

    it("should handle API errors", async () => {
      axios.post.mockRejectedValue(new Error("API Error"));

      const model = new GeminiLanguageModel({ apiKey: "test-key" });
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(0);
      expect(result[0][0].output).toBeUndefined();
    });
  });

  describe("OpenAILanguageModel", () => {
    it("should create with default config", () => {
      const model = new OpenAILanguageModel();
      expect(model).toBeDefined();
    });

    it("should create with custom config", () => {
      const model = new OpenAILanguageModel({
        model: "gpt-4",
        apiKey: "test-key",
        temperature: 0.8,
        baseURL: "https://custom.openai.com/v1",
      });
      expect(model).toBeDefined();
    });

    it("should handle successful inference with JSON response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '{"result": "success"}',
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const model = new OpenAILanguageModel({ apiKey: "test-key" });
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(1.0);
      expect(result[0][0].output).toBe('{"result": "success"}');
    });

    it("should handle successful inference with function call response", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      arguments: '{"result": "success"}',
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const model = new OpenAILanguageModel({
        apiKey: "test-key",
        openAISchema: new GeminiSchemaImpl({ type: "object" }),
      });
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(1.0);
      expect(result[0][0].output).toBe('{"result": "success"}');
    });

    it("should handle API errors", async () => {
      axios.post.mockRejectedValue(new Error("API Error"));

      const model = new OpenAILanguageModel({ apiKey: "test-key" });
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(0);
      expect(result[0][0].output).toBeUndefined();
    });

    it("should add JSON response format when schema is provided", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '{"result": "success"}',
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const schema = new GeminiSchemaImpl({ type: "object" });
      const model = new OpenAILanguageModel({
        apiKey: "test-key",
        openAISchema: schema,
      });

      await model.infer(["test prompt"]);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          response_format: { type: "json_object" },
          tools: expect.arrayContaining([
            expect.objectContaining({
              type: "function",
              function: expect.objectContaining({
                name: "extract_data",
                parameters: schema.schemaDict,
              }),
            }),
          ]),
          tool_choice: {
            type: "function",
            function: { name: "extract_data" },
          },
        }),
        expect.any(Object)
      );
    });

    it("should add JSON response format when formatType is JSON", async () => {
      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: '{"result": "success"}',
              },
            },
          ],
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const model = new OpenAILanguageModel({
        apiKey: "test-key",
        formatType: FormatType.JSON,
      });

      await model.infer(["test prompt"]);

      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          response_format: { type: "json_object" },
        }),
        expect.any(Object)
      );
    });
  });

  describe("OllamaLanguageModel", () => {
    it("should create with default config", () => {
      const model = new OllamaLanguageModel();
      expect(model).toBeDefined();
    });

    it("should create with custom config", () => {
      const model = new OllamaLanguageModel({
        model: "custom-model",
        modelUrl: "http://localhost:8080",
        temperature: 0.8,
      });
      expect(model).toBeDefined();
    });

    it("should handle successful inference", async () => {
      const mockResponse = {
        data: {
          response: '{"result": "success"}',
        },
      };

      axios.post.mockResolvedValue(mockResponse);

      const model = new OllamaLanguageModel();
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(1.0);
      expect(result[0][0].output).toBe('{"result": "success"}');
    });

    it("should handle API errors", async () => {
      axios.post.mockRejectedValue(new Error("API Error"));

      const model = new OllamaLanguageModel();
      const result = await model.infer(["test prompt"]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
      expect(result[0][0].score).toBe(0);
      expect(result[0][0].output).toBeUndefined();
    });
  });
});
