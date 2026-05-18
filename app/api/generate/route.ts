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
    let imagePrompt = prompt;

    if (imageBase64 && imageMediaType) {
      // Ask gpt-4o to describe the room so Pollinations can recreate it in the new style
      const description = await client.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${imageMediaType};base64,${imageBase64}` },
              },
              {
                type: "text",
                text: "Опиши эту комнату максимально подробно на английском: размер, планировка, мебель, цвета, освещение. Только описание, без лишних слов.",
              },
            ],
          },
        ],
      });

      const roomDescription = description.choices[0]?.message?.content || "";
      imagePrompt = `${roomDescription}, redesigned in style: ${prompt}`;
    }

    const fullPrompt = `Interior design photo: ${imagePrompt}. Photorealistic, 8k quality, professional interior photography, natural lighting.`;
    const encoded = encodeURIComponent(fullPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true&seed=${Date.now()}`;

    // Fetch the image to ensure it's generated before returning the URL
    const response = await fetch(imageUrl);
    if (!response.ok) throw new Error("Image generation failed");

    // Convert to base64 to avoid browser CORS/timing issues
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({ imageUrl: dataUrl });
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
