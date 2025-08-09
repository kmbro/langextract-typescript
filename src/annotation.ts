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
 * Provides functionality for annotating text using a language model.
 */

import { v4 as uuidv4 } from "uuid";
import { Document, AnnotatedDocument, Extraction, FormatType } from "./types";
import { BaseLanguageModel } from "./inference";
import { PromptTemplateStructured, QAPromptGeneratorImpl } from "./prompting";
import { AbstractResolver } from "./resolver";
import { tokenize } from "./tokenizer";

export class DocumentRepeatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentRepeatError";
  }
}

const ATTRIBUTE_SUFFIX = "_attributes";

function mergeNonOverlappingExtractions(allExtractions: Extraction[][]): Extraction[] {
  if (allExtractions.length === 0) {
    return [];
  }

  if (allExtractions.length === 1) {
    return allExtractions[0];
  }

  const mergedExtractions = [...allExtractions[0]];

  for (let i = 1; i < allExtractions.length; i++) {
    for (const extraction of allExtractions[i]) {
      let overlaps = false;
      if (extraction.charInterval) {
        for (const existingExtraction of mergedExtractions) {
          if (existingExtraction.charInterval) {
            if (extractionsOverlap(extraction, existingExtraction)) {
              overlaps = true;
              break;
            }
          }
        }
      }

      if (!overlaps) {
        mergedExtractions.push(extraction);
      }
    }
  }

  return mergedExtractions;
}

function extractionsOverlap(extraction1: Extraction, extraction2: Extraction): boolean {
  if (!extraction1.charInterval || !extraction2.charInterval) {
    return false;
  }

  const start1 = extraction1.charInterval.startPos ?? 0;
  const end1 = extraction1.charInterval.endPos ?? 0;
  const start2 = extraction2.charInterval.startPos ?? 0;
  const end2 = extraction2.charInterval.endPos ?? 0;

  return start1 < end2 && start2 < end1;
}

export interface AnnotatorOptions {
  formatType?: FormatType;
  attributeSuffix?: string;
  fenceOutput?: boolean;
  maxTokens?: number;
}

interface DocumentWithGuaranteedId extends Document {
  documentId: string;
}

export class Annotator {
  private languageModel: BaseLanguageModel;
  private promptGenerator: QAPromptGeneratorImpl;
  private maxTokens?: number;

  constructor(languageModel: BaseLanguageModel, promptTemplate: PromptTemplateStructured, options: AnnotatorOptions = {}) {
    this.languageModel = languageModel;
    this.promptGenerator = new QAPromptGeneratorImpl(promptTemplate);
    this.promptGenerator.formatType = options.formatType ?? FormatType.YAML;
    this.promptGenerator.attributeSuffix = options.attributeSuffix ?? ATTRIBUTE_SUFFIX;
    this.promptGenerator.fenceOutput = options.fenceOutput ?? false;
    this.maxTokens = options.maxTokens;
  }

  private guaranteeDocumentIds(documents: Document[]): DocumentWithGuaranteedId[] {
    for (const document of documents) {
      if (!document.documentId) {
        document.documentId = `doc_${Math.random().toString(36).substring(2, 8)}`;
      }
    }
    return documents as DocumentWithGuaranteedId[];
  }

  async annotateDocuments(
    documents: Document[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer?: number;
      batchLength?: number;
      debug?: boolean;
      extractionPasses?: number;
    } = {}
  ): Promise<AnnotatedDocument[]> {
    const documentsWithId = this.guaranteeDocumentIds(documents);
    const { maxCharBuffer = 200, batchLength = 1, debug = true, extractionPasses = 1 } = options;

    if (extractionPasses === 1) {
      return this.annotateDocumentsSinglePass(documentsWithId, resolver, {
        maxCharBuffer,
        batchLength,
        debug,
      });
    } else {
      return this.annotateDocumentsSequentialPasses(documentsWithId, resolver, {
        maxCharBuffer,
        batchLength,
        debug,
        extractionPasses,
      });
    }
  }

  async annotateText(
    text: string,
    resolver: AbstractResolver,
    options: {
      maxCharBuffer?: number;
      batchLength?: number;
      additionalContext?: string;
      debug?: boolean;
      extractionPasses?: number;
    } = {}
  ): Promise<AnnotatedDocument> {
    const { additionalContext, ...rest } = options;

    const document: Document = {
      text,
      additionalContext,
    };

    const documents = await this.annotateDocuments([document], resolver, rest);
    return documents[0];
  }

  private async annotateDocumentsSinglePass(
    documents: DocumentWithGuaranteedId[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      batchLength: number;
      debug: boolean;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, batchLength } = options;

    // Collect all chunks from all documents (matching Python _document_chunk_iterator)
    const allChunks: Array<{
      chunk: {
        text: string;
        tokenOffset: number;
        charOffset: number;
      };
      document: DocumentWithGuaranteedId;
    }> = [];

    for (const document of documents) {
      const chunks = this.chunkDocument(document, maxCharBuffer);
      for (const chunk of chunks) {
        allChunks.push({ chunk, document });
      }
    }

    // Process chunks in batches of batchLength (matching Python make_batches_of_textchunk)
    const results: AnnotatedDocument[] = [];
    const documentExtractions = new Map<string, Extraction[]>();

    for (let i = 0; i < allChunks.length; i += batchLength) {
      const chunkBatch = allChunks.slice(i, i + batchLength);
      
      // Process this batch of chunks
      const batchPrompts = chunkBatch.map(item => 
        this.promptGenerator.render(item.chunk.text, item.document.additionalContext)
      );

      const batchModelOutputs = await this.languageModel.infer(batchPrompts, {
        maxDecodeSteps: this.maxTokens,
      });

      // Process results and group by document
      for (let j = 0; j < chunkBatch.length; j++) {
        const { chunk, document } = chunkBatch[j];
        const modelOutputs = batchModelOutputs[j];

        if (modelOutputs.length > 0 && modelOutputs[0].output) {
          const output = modelOutputs[0].output;
          const extractions = resolver.resolve(output);
          const alignedExtractions = resolver.align(extractions, chunk.text, chunk.tokenOffset, chunk.charOffset);
          
          if (!documentExtractions.has(document.documentId)) {
            documentExtractions.set(document.documentId, []);
          }
          const docExtractions = documentExtractions.get(document.documentId);
          if (docExtractions) {
            docExtractions.push(...alignedExtractions);
          }
        }
      }
    }

    // Create annotated documents
    for (const document of documents) {
      const extractions = documentExtractions.get(document.documentId) || [];
      const annotatedDocument: AnnotatedDocument = {
        documentId: document.documentId,
        text: document.text || "",
        extractions,
        tokenizedText: document.tokenizedText ?? tokenize(document.text || ""),
      };
      results.push(annotatedDocument);
    }

    return results;
  }

  private async annotateDocumentsSequentialPasses(
    documents: DocumentWithGuaranteedId[],
    resolver: AbstractResolver,
    options: {
      maxCharBuffer: number;
      batchLength: number;
      debug: boolean;
      extractionPasses: number;
    }
  ): Promise<AnnotatedDocument[]> {
    const { maxCharBuffer, batchLength, extractionPasses } = options;

    // Collect all chunks from all documents
    const allChunks: Array<{
      chunk: {
        text: string;
        tokenOffset: number;
        charOffset: number;
      };
      document: DocumentWithGuaranteedId;
    }> = [];

    for (const document of documents) {
      const chunks = this.chunkDocument(document, maxCharBuffer);
      for (const chunk of chunks) {
        allChunks.push({ chunk, document });
      }
    }

    const documentPassExtractions = new Map<string, Extraction[][]>();

    // Initialize extraction arrays for each document
    for (const document of documents) {
      documentPassExtractions.set(document.documentId, []);
    }

    // Perform multiple extraction passes
    for (let pass = 0; pass < extractionPasses; pass++) {
      const passDocumentExtractions = new Map<string, Extraction[]>();

      // Process chunks in batches of batchLength (matching Python behavior)
      for (let i = 0; i < allChunks.length; i += batchLength) {
        const chunkBatch = allChunks.slice(i, i + batchLength);
        
        // Process this batch of chunks
        const batchPrompts = chunkBatch.map(item => 
          this.promptGenerator.render(item.chunk.text, item.document.additionalContext)
        );

        const batchModelOutputs = await this.languageModel.infer(batchPrompts, {
          maxDecodeSteps: this.maxTokens,
        });

        // Process results and group by document for this pass
        for (let j = 0; j < chunkBatch.length; j++) {
          const { chunk, document } = chunkBatch[j];
          const modelOutputs = batchModelOutputs[j];

          if (modelOutputs.length > 0 && modelOutputs[0].output) {
            const output = modelOutputs[0].output;
            const extractions = resolver.resolve(output);
            const alignedExtractions = resolver.align(extractions, chunk.text, chunk.tokenOffset, chunk.charOffset);
            
            if (!passDocumentExtractions.has(document.documentId)) {
              passDocumentExtractions.set(document.documentId, []);
            }
            const passDocExtractions = passDocumentExtractions.get(document.documentId);
            if (passDocExtractions) {
              passDocExtractions.push(...alignedExtractions);
            }
          }
        }
      }

      // Store pass results for each document
      for (const document of documents) {
        const passExtractions = passDocumentExtractions.get(document.documentId) || [];
        const docPassExtractions = documentPassExtractions.get(document.documentId);
        if (docPassExtractions) {
          docPassExtractions.push(passExtractions);
        }
      }
    }

    // Create annotated documents with merged extractions
    const results: AnnotatedDocument[] = [];
    for (const document of documents) {
      const allPassExtractions = documentPassExtractions.get(document.documentId) || [];
      const mergedExtractions = mergeNonOverlappingExtractions(allPassExtractions);

      const annotatedDocument: AnnotatedDocument = {
        documentId: document.documentId,
        text: document.text || "",
        extractions: mergedExtractions,
        tokenizedText: document.tokenizedText ?? tokenize(document.text || ""),
      };

      results.push(annotatedDocument);
    }

    return results;
  }

  private chunkDocument(
    document: Document,
    maxCharBuffer: number
  ): Array<{
    text: string;
    tokenOffset: number;
    charOffset: number;
  }> {
    const text = document.text;
    const chunks: Array<{
      text: string;
      tokenOffset: number;
      charOffset: number;
    }> = [];

    let currentPos = 0;
    let tokenOffset = 0;

    while (currentPos < text.length) {
      const chunkEnd = Math.min(currentPos + maxCharBuffer, text.length);
      const chunkText = text.substring(currentPos, chunkEnd);

      chunks.push({
        text: chunkText,
        tokenOffset,
        charOffset: currentPos,
      });

      currentPos = chunkEnd;
      tokenOffset += tokenize(chunkText).tokens.length;
    }

    return chunks;
  }


}
