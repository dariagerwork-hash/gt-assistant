import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export async function POST(req: NextRequest) {
  const { imageBase64, imageMediaType, prompt } = await req.json();

  if (!imageBase64 || !prompt || !imageMediaType) {
    return NextResponse.json({ error: "Нет изображения или описания" }, { status: 400 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY не настроен" }, { status: 500 });
  }

  fal.config({ credentials: process.env.FAL_KEY });

  const fullPrompt = `Interior design: ${prompt}. Photorealistic, 8k quality, interior photography.`;

  try {
    const dataUrl = `data:${imageMediaType};base64,${imageBase64}`;

    const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
      input: {
        image_url: dataUrl,
        prompt: fullPrompt,
        strength: 0.75,
        num_inference_steps: 28,
        guidance_scale: 3.5,
      },
    }) as { images?: Array<{ url: string }> };

    const imageUrl = result?.images?.[0]?.url;
    if (!imageUrl) throw new Error("No image returned");

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("fal.ai error:", err);
    return NextResponse.json({ error: "Ошибка генерации. Попробуй ещё раз." }, { status: 500 });
  }
}
