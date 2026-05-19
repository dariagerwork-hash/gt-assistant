import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const maxDuration = 60;

// VERSION: 2026-05-19-v3-chat-completions

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openai.bothub.chat/v1",
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt, imageBase64, imageMediaType } = await req.json();
  console.log("[generate v3] called, hasImage:", !!imageBase64, "promptLen:", prompt?.length);

  if (!prompt) {
    return NextResponse.json({ error: "Не указан prompt" }, { status: 400 });
  }

  try {
    let imageUrl: string | undefined;

    if (imageBase64) {
      // Try image edit via images API first
      try {
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
          : img.url ?? undefined;
        console.log("[generate v3] images.edit result:", !!imageUrl, "b64:", !!img.b64_json, "url:", img.url?.slice(0, 60));
      } catch (editErr) {
        console.log("[generate v3] images.edit failed, trying chat completions:", editErr instanceof Error ? editErr.message : editErr);
        // Fallback: use chat completions with image input for nano-banana-2
        const chatResult = await client.chat.completions.create({
          model: "nano-banana-2",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${imageMediaType || "image/jpeg"};base64,${imageBase64}` },
                },
                {
                  type: "text",
                  text: `Transform this room interior in this style: ${prompt}. Generate a photorealistic image.`,
                },
              ],
            },
          ],
        } as Parameters<typeof client.chat.completions.create>[0]);

        const content = chatResult.choices[0]?.message?.content || "";
        console.log("[generate v3] chat completions result length:", content.length);
        // If it returns a URL or base64
        if (content.startsWith("http")) {
          imageUrl = content.trim();
        } else if (content.startsWith("data:")) {
          imageUrl = content.trim();
        }
      }
    } else {
      // Try image generation via images API first
      try {
        const result = await client.images.generate({
          model: "nano-banana-2",
          prompt: `Interior design: ${prompt}. Photorealistic, 4K quality, professional interior photography, natural lighting.`,
          n: 1,
          size: "1024x1024",
        });

        const img = result.data[0];
        imageUrl = img.b64_json
          ? `data:image/png;base64,${img.b64_json}`
          : img.url ?? undefined;
        console.log("[generate v3] images.generate result:", !!imageUrl, "b64:", !!img.b64_json, "url:", img.url?.slice(0, 60));
      } catch (genErr) {
        console.log("[generate v3] images.generate failed, trying gpt-image-1:", genErr instanceof Error ? genErr.message : genErr);
        // Fallback to gpt-image-1
        const result = await client.images.generate({
          model: "gpt-image-1",
          prompt: `Interior design: ${prompt}. Photorealistic, 4K quality, professional interior photography, natural lighting.`,
          n: 1,
          size: "1024x1024",
        });

        const img = result.data[0];
        imageUrl = img.b64_json
          ? `data:image/png;base64,${img.b64_json}`
          : img.url ?? undefined;
        console.log("[generate v3] gpt-image-1 result:", !!imageUrl);
      }
    }

    if (!imageUrl) throw new Error("No image in response");
    return NextResponse.json({ imageUrl });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[generate v3] error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
