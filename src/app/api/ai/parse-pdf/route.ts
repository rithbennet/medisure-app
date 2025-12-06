/**
 * PDF Document Parsing API
 * Extracts text from uploaded PDF files
 * - First tries unpdf for native text extraction
 * - Falls back to Gemini OCR for scanned documents
 */

import { NextResponse } from "next/server";
import { extractText, getDocumentProxy, getMeta } from "unpdf";
import { generateText } from "ai";
import { getDocAnalysisModel } from "@/lib/aiProvider";

// Route segment config for larger file uploads
export const runtime = "nodejs";
export const maxDuration = 60; // 60 seconds for Gemini OCR

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("docType") as string | null;
    const forceOcr = formData.get("forceOcr") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.includes("pdf")) {
      return NextResponse.json(
        { error: "File must be a PDF" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    // Create a copy of the buffer to avoid detachment issues
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
        return NextResponse.json(
          {
            error: "Failed to extract text from PDF using Gemini OCR.",
            details:
              ocrError instanceof Error ? ocrError.message : "Unknown error",
          },
          { status: 500 }
        );
      }
    }

    const parseTimeMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      text,
      metadata: {
        fileName: file.name,
        fileSize: file.size,
        numPages: totalPages || "unknown",
        title: info?.Title || null,
        author: info?.Author || null,
        creationDate: info?.CreationDate || null,
        parseTimeMs,
        textLength: text.length,
        docType: docType || "unknown",
        method, // "unpdf" or "gemini-ocr"
      },
    });
  } catch (error) {
    console.error("PDF parsing error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse PDF",
      },
      { status: 500 }
    );
  }
}
