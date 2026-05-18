import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Не указан prompt" }, { status: 400 });
  }

  try {
    const fullPrompt = `Interior design photo: ${prompt}. Photorealistic, 8k quality, professional interior photography, natural lighting.`;
    const encoded = encodeURIComponent(fullPrompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&enhance=true`;

    // Verify the image is accessible
    const check = await fetch(imageUrl, { method: "HEAD" });
    if (!check.ok) throw new Error("Image generation failed");

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("Pollinations error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
