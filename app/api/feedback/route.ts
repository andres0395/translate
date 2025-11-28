import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

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

  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const systemPrompt = `
      You are an expert QA Analyst for a customer support call center.
      Your task is to analyze the following customer call transcript (which is in Spanish).
      
      Generate a detailed quality feedback report in JSON format with the following fields (ALL VALUES MUST BE IN SPANISH):
      - summary: A brief summary of the call (max 2 sentences).
      - sentiment: The overall sentiment of the customer (e.g., "Frustrado", "Satisfecho", "Neutral").
      - keyPoints: An array of 3-5 bullet points highlighting the main topics discussed.
      - qualityScore: A number between 0 and 100 rating the interaction quality (from the perspective of a successful resolution/interaction).
      - recommendations: An array of 3 actionable recommendations for the agent or business.

      Return ONLY the JSON object.
    `;

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;

    if (!content) {
      throw new Error("No content received from Groq");
    }

    const feedback = JSON.parse(content);

    return NextResponse.json(feedback);
  } catch (error: unknown) {
    console.error("Feedback generation error:", error);

    console.warn("Falling back to mock feedback due to API error.");
    const mockFeedback = {
      summary: "El cliente reportó la entrega de un producto dañado (Modo de Respaldo).",
      sentiment: "Frustrado pero Educado",
      keyPoints: [
        "El producto llegó dañado.",
        "El cliente solicita una resolución.",
        "Error de cuota/API activó la respuesta de respaldo."
      ],
      qualityScore: 75,
      recommendations: [
        "Verificar cuota/facturación de API Groq.",
        "Disculparse con el cliente por el daño.",
        "Iniciar proceso de reemplazo inmediatamente."
      ]
    };

    return NextResponse.json(mockFeedback);
  }
}
