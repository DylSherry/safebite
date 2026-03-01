import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "@google/generative-ai";

// Load Gemini API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

// Configure Gemini
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Helper: Convert file buffer to base64
function bufferToBase64(buffer: Buffer | ArrayBuffer) {
  if (buffer instanceof Buffer) {
    return buffer.toString("base64");
  } else {
    return Buffer.from(new Uint8Array(buffer)).toString("base64");
  }
}

export async function POST(req: NextRequest) {
  try {
    // Accept multipart/form-data or JSON with base64 image
    const contentType = req.headers.get("content-type") || "";
    let imageBase64: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      imageBase64 = body.imageBase64;
    } else if (contentType.includes("multipart/form-data")) {
      // Parse multipart form
      const formData = await req.formData();
      const file = formData.get("file");
      if (file && typeof file === "object" && "arrayBuffer" in file) {
        const buffer = await file.arrayBuffer();
        imageBase64 = bufferToBase64(buffer);
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Prepare Gemini prompt
    const prompt =
      "Look at this ingredient label. List all ingredients and identify if any of the following allergens are present: [Peanuts, Dairy, Gluten, Soy]. Return the result in JSON format with keys: ingredients (array of strings), allergensFound (array of strings).";

    // Use Gemini multimodal model (latest public vision model)
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent([
      { text: prompt },
      { inlineData: { data: imageBase64, mimeType: "image/jpeg" } },
    ], {
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const response = await result.response;
    const text = response.text();

    // Try to parse JSON from the response
    let jsonResult = null;
    try {
      // Find first JSON block in the text
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        jsonResult = JSON.parse(match[0]);
      } else {
        jsonResult = { raw: text };
      }
    } catch (e) {
      jsonResult = { raw: text };
    }

    return NextResponse.json(jsonResult);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}