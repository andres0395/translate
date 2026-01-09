import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import fs from "fs";
import { compressAudio } from "../../lib/audio";

export const runtime = "nodejs";

// Add interface for the expected JSON response structure to ensure type safety in logic if needed, 
// though here we mainly parse and return.

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
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
  let compressedFilePath = "";

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

    let transcriptionFilePath = tempFilePath;

    // Check if file size is greater than 19MB (GROQ limit is 25MB, safety margin)
    const stats = await fs.promises.stat(tempFilePath);
    if (stats.size > 19 * 1024 * 1024) {
      console.log("File is larger than 19MB, compressing...");
      try {
        compressedFilePath = await compressAudio(tempFilePath);
        transcriptionFilePath = compressedFilePath;
        console.log("Compression successful, using:", transcriptionFilePath);
      } catch (compressionError) {
        console.error("Compression failed, attempting with original file:", compressionError);
        // Fallback to original file if compression fails
      }
    }

    // 1. Transcription with Whisper
    console.log("Calling Groq Whisper...");
    const transcriptionResponse = await openai.audio.transcriptions.create({
      file: fs.createReadStream(transcriptionFilePath),
      model: "whisper-large-v3",
    });

    const originalText = transcriptionResponse.text;
    console.log("Original transcription received:", originalText.substring(0, 50) + "...");

    // 2. Analysis and Translation with Llama
    const systemPrompt = `
      Role: Act as a Senior Quality Assurance (QA) Analyst expert in subscription services for resumes and cover letters for the German and Portuguese markets.

      Objective: Analyze a call transcript in Portuguese or German, translate it entirely into Spanish, and rate the agent's performance strictly based on the provided corporate policies.

      1. Transcription and Context
      Transcript for Analysis:
      ${originalText}

      Original Language: [Auto-detect or specify: Portuguese/German]

      Brand Identified: [Identify: Meu Currículo Perfeito, Zety, LiveCareer, or Mein Perfekter Lebenslauf]

      2. Evaluation Protocol (Checklist)
      Evaluate the following points by assigning COMPLIANT / NON-COMPLIANT / NOT APPLICABLE and provide a brief observation for each:

      Opening (10s): Cordial greeting, correct brand name (PT: Meu Currículo Perfeito, Zety, LiveCareer | DE: Mein Perfekter Lebenslauf, LiveCarrer, Zety), agent’s name, and "How can I help you?"

      Empathy: Active listening and a specific empathy phrase after the customer’s request.

      Account Validation: Must ask for Email. If not found: PayPal email or Credit Card (last 4 digits + cardholder name). If still not found: first 6 digits.

      Customer Education: (If applicable) Explain the 14-day trial period and the subsequent monthly subscription fee.

      Retention Probing: Ask questions to identify the profile (Student, unemployed, employed seeking new opportunities, newly hired in probation, or hired through us).

      Value Creation & Offers (Portugal): Adapt benefits to the profile. Offers allowed: MCP (13.99 BRL / 6.99 BRL) or LiveCareer (17 BRL / 11.45 BRL / 6 BRL).

      Value Creation & Offers (Germany): Adapt benefits. GOLDEN RULE: Maximum 1 offer per call. Two offers are strictly prohibited (Auto-Fail).

      Threat Management: If the customer mentions "Police, Lawyer, Bank/Rights, Justice, Social Media," the agent must stop retention and proceed with immediate cancellation and refund.

      Cancellation Process: Confirm cancellation, provide cancellation number, expiration date, and inform that resumes remain saved.

      Refund Policy (Abuse): Deny refund if the customer has 3+ refunds within 12 months.

      Refund Policy (Standard): Process the refund as allowed by the system.

      Refund Policy (Threats): Must process a full refund (or escalate to a supervisor if the system only allows partial). Inform 7–14 days processing time.

      Final Summary: Include cancellation info, refund details (if any), and the next billing date for accepted retention offers.

      Closing & Survey: "Any further questions?", promote the CSAT survey (scale 1-5), and say goodbye using the brand name.

      Proactive Retention (Prohibited): Agents cannot offer discounts if the customer did not ask for cancellation/refund (e.g., technical support calls).

      3. Fraud and Auto-Fail Section (Critical Failures)
      If any of the following is detected, the final score is 0%:

      False Save: Retention applied without consent, proactive refund to push an offer, or conditioning a refund on accepting an offer.

      Cancel Avoidance: Intentionally disconnecting, redirecting to another channel/website when the user wants to cancel now, or telling them to call back later.

      Behavior: Mistreating the customer or speaking ill of the company/brand.

      Security: Sharing screenshots of internal systems (Salesforce, Agent Portal, etc.).

      Germany Rule: Making more than one offer in the same call.

      4. Required Output Format
      You MUST return a JSON object with the following structure:

      {
        "spanishTranslation": "(Full fluent translation of the conversation to Spanish)",
        "summary": "...",
        "sentiment": "...",
        "keyPoints": ["..."],
        "qualityScore": number (0-100),
        "recommendations": ["..."],
        "criteriaBreakdown": [
          {
            "criterion": "...",
            "met": boolean,
            "score": number,
            "maxScore": number
          }
        ]
      }

      Return ONLY the JSON object.
    `;

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        // We put the text in the system prompt above or here. 
        // Since we embedded originalText in systemPrompt, we can just send a "start" user message or empty.
        // But usually it's cleaner to separate. Let's keep the user message for structure.
        { role: "user", content: "Analyze the transcript." },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new Error("No content received from Groq");
    }

    const feedback = JSON.parse(content);

    // Clean up
    await unlink(tempFilePath);
    if (compressedFilePath) {
      await unlink(compressedFilePath);
    }

    return NextResponse.json(feedback);

  } catch (error: unknown) {
    console.error("Feedback generation error:", error);

    // Clean up temp file if it exists and error occurred
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch { /* ignore */ }
    }
    if (compressedFilePath) {
      try {
        await unlink(compressedFilePath);
      } catch { /* ignore */ }
    }

    console.warn("Falling back to mock feedback due to API error.");
    const mockFeedback = {
      spanishTranslation: "[ERR: API Error] Aquí aparecería la traducción de la llamada. (Modo de Respaldo)",
      summary: "El cliente reportó la entrega de un producto dañado (Modo de Respaldo).",
      sentiment: "Frustrado pero Educado",
      keyPoints: [
        "El producto llegó dañado.",
        "El cliente solicita una resolución.",
        "Error de cuota/API activó la respuesta de respaldo."
      ],
      qualityScore: 75,
      criteriaBreakdown: [
        { criterion: "Introducción y nombre del producto", met: true, score: 5, maxScore: 5 },
        { criterion: "Identificación del cliente", met: true, score: 8, maxScore: 8 },
        // ... (truncated for brevity, keeping essential structure)
        { criterion: "Resolución", met: true, score: 10, maxScore: 10 }
      ],
      recommendations: [
        "Verificar cuota/facturación de API Groq.",
        "Disculparse con el cliente por el daño.",
      ]
    };

    return NextResponse.json(mockFeedback);
  }
}
