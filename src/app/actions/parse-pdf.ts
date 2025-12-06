'use server';

/**
 * Server Action for PDF parsing
 * Uses Server Actions body size limit (50MB) instead of API route limit (10MB)
 */

import { extractText, getDocumentProxy, getMeta } from "unpdf";
import { generateText } from "ai";
import { getDocAnalysisModel } from "@/lib/aiProvider";

export interface ParsePdfResult {
  success: boolean;
  text?: string;
  metadata?: {
    fileName: string;
    fileSize: number;
    numPages: number | string;
    textLength: number;
    parseTimeMs: number;
    method?: string;
  };
  error?: string;
}

export async function parsePdfAction(formData: FormData): Promise<ParsePdfResult> {
  try {
    const file = formData.get("file") as File | null;
    const forceOcr = formData.get("forceOcr") === "true";

    if (!file) {
      return { success: false, error: "No file provided" };
    }

    // Validate file type
    if (!file.type.includes("pdf")) {
      return { success: false, error: "File must be a PDF" };
    }

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return { 
        success: false, 
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 50MB.` 
      };
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);
    const startTime = Date.now();

    let text = "";
    let totalPages = 0;
    let method = "unpdf";
    let info: Record<string, unknown> = {};

    // Try native text extraction first (unless forceOcr is true)
    if (!forceOcr) {
      try {
        const uint8Array = new Uint8Array(pdfBuffer);
        const pdf = await getDocumentProxy(uint8Array);
        const result = await extractText(pdf, { mergePages: true });
        const metaResult = await getMeta(pdf);

        text = result.text;
        totalPages = result.totalPages;
        info = metaResult.info || {};

        console.log("[PDF Parse] Native extraction got", text.length, "chars");
      } catch (e) {
        console.log("[PDF Parse] Native extraction failed:", e);
      }
    }

    // If no text extracted or forced OCR, use Gemini vision
    if (!text || text.trim().length < 50 || forceOcr) {
      console.log("[PDF Parse] Using Gemini OCR...");
      method = "gemini-ocr";

      try {
        const model = getDocAnalysisModel();

        const { text: ocrText } = await generateText({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "file",
                  data: pdfBuffer,
                  mediaType: "application/pdf",
                },
                {
                  type: "text",
                  text: `Extract ALL text content from this PDF document. 

Instructions:
- Extract every word, number, and piece of text visible in the document
- Preserve the structure and formatting as much as possible
- Include headers, footers, tables, and any other text elements
- If there are multiple pages, separate them clearly
- Do NOT summarize - extract the complete raw text

Output the extracted text only, no additional commentary.`,
                },
              ],
            },
          ],
          maxOutputTokens: 8000,
        });

        text = ocrText;
        console.log("[PDF Parse] Gemini OCR extracted", text.length, "chars");
      } catch (ocrError) {
        console.error("[PDF Parse] Gemini OCR failed:", ocrError);
        return {
          success: false,
          error: `Failed to extract text using Gemini OCR: ${ocrError instanceof Error ? ocrError.message : "Unknown error"}`,
        };
      }
    }

    const parseTimeMs = Date.now() - startTime;

    return {
      success: true,
      text,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        numPages: totalPages || "unknown",
        textLength: text.length,
        parseTimeMs,
        method,
      },
    };
  } catch (error) {
    console.error("PDF parsing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to parse PDF",
    };
  }
}

