/**
 * Helper functions for integration tests
 */

import { AnnotatedDocument } from "../src/types";

/**
 * Helper function to handle the extract function return type
 * which can be either a single AnnotatedDocument or an array of AnnotatedDocument[]
 */
export function getDocument(result: AnnotatedDocument | AnnotatedDocument[]): AnnotatedDocument {
  return Array.isArray(result) ? result[0] : result;
}

/**
 * Helper function to get all documents when expecting an array
 */
export function getDocuments(result: AnnotatedDocument | AnnotatedDocument[]): AnnotatedDocument[] {
  return Array.isArray(result) ? result : [result];
}

/**
 * Helper function to check if result is an array
 */
export function isArrayResult(result: AnnotatedDocument | AnnotatedDocument[]): result is AnnotatedDocument[] {
  return Array.isArray(result);
}
