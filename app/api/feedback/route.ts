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
      
      Evaluate the call based on the following criteria and their weights:
      1. The agent introduced themself and the correct product name (5%)
      2. The agent accurately identified the customer in the system and retrieved the correct account (8%)
      3. The agent took ownership of the issue along with a professional, and confident attitude (8%)
      4. The agent accurately answered the customer's questions (8%)
      5. The agent used an appropriate pace and tone (5%)
      6. The agent followed company policies such as Hold Process, Escalation Process, Refund Process, GDPR/CCPA, Account Documentation, and all that might apply. (10%)
      7. The agent asked accurate probing questions (8%)
      8. The agent created value by discussing features and benefits based on the customer's needs (Guided Script) (8%)
      9. The agent negotiated a refund for a Save (10%)
      10. The agent identified when a retention effort applies by overcoming objections (8%)
      11. The agent provided a proper recap of all actions taken within the call and offered relevant information to guarantee a One Call Resolution (10%)
      12. The agent offered a survey when applicable (7%)
      13. The agent offered to assist with anything else, thanking the customer for calling (5%)

      Generate a detailed quality feedback report in JSON format with the following fields (ALL VALUES MUST BE IN SPANISH):
      - summary: A brief summary of the call (max 2 sentences).
      - sentiment: The overall sentiment of the customer (e.g., "Frustrado", "Satisfecho", "Neutral").
      - keyPoints: An array of 3-5 bullet points highlighting the main topics discussed.
      - qualityScore: A number between 0 and 100 representing the total score based on the criteria met.
      - criteriaBreakdown: An array of objects for each criterion, containing:
        - criterion: The name/description of the criterion.
        - met: boolean (true if met, false if not).
        - score: The score awarded (equal to the weight if met, 0 if not).
        - maxScore: The maximum possible score for this criterion.
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
      criteriaBreakdown: [
        { criterion: "Introducción y nombre del producto", met: true, score: 5, maxScore: 5 },
        { criterion: "Identificación del cliente", met: true, score: 8, maxScore: 8 },
        { criterion: "Propiedad y actitud", met: true, score: 8, maxScore: 8 },
        { criterion: "Respuestas precisas", met: true, score: 8, maxScore: 8 },
        { criterion: "Ritmo y tono", met: true, score: 5, maxScore: 5 },
        { criterion: "Políticas de la compañía", met: true, score: 10, maxScore: 10 },
        { criterion: "Preguntas de sondeo", met: true, score: 8, maxScore: 8 },
        { criterion: "Creación de valor", met: false, score: 0, maxScore: 8 },
        { criterion: "Negociación de reembolso", met: true, score: 10, maxScore: 10 },
        { criterion: "Esfuerzo de retención", met: false, score: 0, maxScore: 8 },
        { criterion: "Recapitulación y Resolución", met: true, score: 10, maxScore: 10 },
        { criterion: "Oferta de encuesta", met: false, score: 0, maxScore: 7 },
        { criterion: "Cierre y agradecimiento", met: true, score: 5, maxScore: 5 }
      ],
      recommendations: [
        "Verificar cuota/facturación de API Groq.",
        "Disculparse con el cliente por el daño.",
        "Iniciar proceso de reemplazo inmediatamente."
      ]
    };

    return NextResponse.json(mockFeedback);
  }
}
