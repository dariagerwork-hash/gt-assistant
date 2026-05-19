import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const maxDuration = 60;

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openai.bothub.chat/v1",
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt, imageBase64, imageMediaType } = await req.json();
  console.log("[generate] called, hasImage:", !!imageBase64, "promptLen:", prompt?.length);

  if (!prompt) {
    return NextResponse.json({ error: "Не указан prompt" }, { status: 400 });
  }

  try {
    let imageUrl: string;

    if (imageBase64) {
      const buffer = Buffer.from(imageBase64, "base64");
      const imageFile = await toFile(buffer, "room.jpg", { type: imageMediaType || "image/jpeg" });

      const result = await client.images.edit({
        model: "nano-banana-2",
        image: imageFile,
        prompt: `Interior design: ${prompt}. Photorealistic, high quality, professional interior photography.`,
        n: 1,
        size: "1024x1024",
      });

      const img = result.data[0];
      imageUrl = img.b64_json
        ? `data:image/png;base64,${img.b64_json}`
        : (img.url ?? "");
    } else {
      const result = await client.images.generate({
        model: "nano-banana-2",
        prompt: `Interior design: ${prompt}. Photorealistic, 4K quality, professional interior photography, natural lighting.`,
        n: 1,
        size: "1024x1024",
      });

      const img = result.data[0];
      imageUrl = img.b64_json
        ? `data:image/png;base64,${img.b64_json}`
        : (img.url ?? "");
    }

    if (!imageUrl) throw new Error("No image in response");
    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Generate error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
