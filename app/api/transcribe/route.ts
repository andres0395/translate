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
    // We use transcriptions to get the original text, then translate to Spanish.
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
    });

    const originalText = transcriptionResponse.text;
    console.log("Original transcription received:", originalText.substring(0, 50) + "...");

    // Translate to Spanish using Llama
    const translationCompletion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the following text into Spanish. Return ONLY the translated text, nothing else."
        },
        {
          role: "user",
          content: originalText
        }
      ],
    });

    const spanishText = translationCompletion.choices[0].message.content;

    console.log("Transcription received");

    // Clean up
    await unlink(tempFilePath);

    return NextResponse.json({ text: spanishText });
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
    
    "Good day, I am calling because I have a problem with my last order. The product arrived damaged."
    
    Translation (Spanish):
    "Buenos días, llamo porque tengo un problema con mi último pedido. El producto llegó dañado."`;

    return NextResponse.json({ text: mockTranscription });
  }
}
