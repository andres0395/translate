import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import fs from "fs";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is missing");
    return NextResponse.json(
      { error: "Server configuration error: Missing API Key" },
      { status: 500 }
    );
  }

  const openai = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1"
  });

  let tempFilePath = "";

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Convert File to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create temp file
    tempFilePath = join(tmpdir(), `upload-${Date.now()}-${file.name}`);
    await writeFile(tempFilePath, buffer);
    console.log("File written to:", tempFilePath);

    // Call Groq Whisper
    console.log("Calling Groq Whisper...");
    // We use translations endpoint to ensure English output.
    const translationResponse = await openai.audio.translations.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
    });

    console.log("Transcription received");

    // Clean up
    await unlink(tempFilePath);

    return NextResponse.json({ text: translationResponse.text });
  } catch (error: unknown) {
    console.error("Transcription error details:", error);

    // Clean up temp file if it exists and error occurred
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch {
        // Ignore cleanup error
      }
    }

    console.warn("Falling back to mock transcription due to API error.");
    const mockTranscription = `[FALLBACK MODE: API Error detected]
    This is a simulated transcription because the AI Provider returned an error (likely quota exceeded, missing key, or model issue).
    
    Original Audio Content (Simulated):
    "Guten Tag, ich rufe an, weil ich ein Problem mit meiner letzten Bestellung habe. Das Produkt ist beschädigt angekommen."
    
    Translation:
    "Good day, I am calling because I have a problem with my last order. The product arrived damaged."`;

    return NextResponse.json({ text: mockTranscription });
  }
}
