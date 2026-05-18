import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { prompt, imageBase64, imageMediaType } = await req.json();

  if (!prompt) {
    return NextResponse.json({ error: "Не указан prompt" }, { status: 400 });
  }

  if (!process.env.FAL_KEY) {
    return NextResponse.json({ error: "FAL_KEY не настроен" }, { status: 500 });
  }

  fal.config({ credentials: process.env.FAL_KEY });

  try {
    if (imageBase64 && imageMediaType) {
      const dataUrl = `data:${imageMediaType};base64,${imageBase64}`;
      const result = await fal.subscribe("fal-ai/flux/dev/image-to-image", {
        input: {
          image_url: dataUrl,
          prompt: `Interior design: ${prompt}. Photorealistic, 8k quality, interior photography.`,
          strength: 0.75,
          num_inference_steps: 28,
          guidance_scale: 3.5,
        },
      }) as { images?: Array<{ url: string }> };
      return NextResponse.json({ imageUrl: result?.images?.[0]?.url ?? null });
    } else {
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: `Interior design photo: ${prompt}. Photorealistic, 8k quality, professional interior photography, natural lighting.`,
          num_inference_steps: 4,
          num_images: 1,
        },
      }) as { images?: Array<{ url: string }> };
      return NextResponse.json({ imageUrl: result?.images?.[0]?.url ?? null });
    }
  } catch (err) {
    console.error("fal.ai error:", err);
    return NextResponse.json({ error: "Ошибка генерации изображения" }, { status: 500 });
  }
}
