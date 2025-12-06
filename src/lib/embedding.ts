import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { embed } from "ai";
import { env } from "@/env";

/**
 * Generate an embedding for text using Google's text-embedding-004 model
 * This model produces 768-dimensional vectors
 *
 * @param text - The text to embed
 * @returns Array of numbers representing the embedding
 */
export async function embedText(text: string): Promise<number[]> {
	const google = createGoogleGenerativeAI({
		apiKey: env.GOOGLE_API_KEY,
	});
	const { embedding } = await embed({
		model: google.textEmbeddingModel("text-embedding-004"),
		value: text,
	});
	return embedding;
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * @param texts - Array of texts to embed
 * @returns Array of embeddings
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
	const results = await Promise.all(texts.map((text) => embedText(text)));
	return results;
}

/**
 * Split text into chunks for embedding
 * Simple sentence-aware chunking
 *
 * @param text - Full text to chunk
 * @param maxChunkSize - Maximum characters per chunk (default 1000)
 * @param overlap - Characters to overlap between chunks (default 100)
 * @returns Array of text chunks
 */
export function chunkText(
	text: string,
	maxChunkSize = 1000,
	overlap = 100,
): string[] {
	const chunks: string[] = [];

	// Split into paragraphs first
	const paragraphs = text.split(/\n\n+/);
	let currentChunk = "";

	for (const paragraph of paragraphs) {
		// If adding this paragraph would exceed max size, save current chunk
		if (
			currentChunk.length + paragraph.length > maxChunkSize &&
			currentChunk.length > 0
		) {
			chunks.push(currentChunk.trim());
			// Start new chunk with overlap from previous
			const overlapText = currentChunk.slice(-overlap);
			currentChunk = `${overlapText} ${paragraph}`;
		} else {
			currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
		}
	}

	// Don't forget the last chunk
	if (currentChunk.trim()) {
		chunks.push(currentChunk.trim());
	}

	return chunks;
}
