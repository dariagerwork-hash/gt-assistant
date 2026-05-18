import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 60;

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openai.bothub.chat/v1",
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt, imageBase64, imageMediaType } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Не указан prompt" }, { status: 400 });
  }

  try {
    const fullPrompt = imageBase64
      ? `Interior design photo, restyled: ${prompt}. Photorealistic, 8k quality, professional interior photography.`
      : `Interior design photo: ${prompt}. Photorealistic, 8k quality, professional interior photography, natural lighting.`;

    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: fullPrompt,
      n: 1,
      size: "1024x1024",
    });

    const imageUrl = response.data[0]?.url ?? null;
    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("DALL-E error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
