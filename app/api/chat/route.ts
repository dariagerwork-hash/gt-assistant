import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { fal } from "@fal-ai/client";
import { addMessage, getLead } from "@/lib/db";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number];
function isAllowedMediaType(t: string): t is AllowedMediaType {
  return ALLOWED_MEDIA_TYPES.includes(t as AllowedMediaType);
}

// Keywords that indicate the user wants image transformation (not just analysis)
const TRANSFORM_KEYWORDS = [
  "сделай", "примени", "переделай", "преобразуй", "измени", "покажи как будет",
  "стиль", "japandi", "скандинавский", "loft", "лофт", "минимализм", "бохо", "boho",
  "классика", "современный", "перестановку", "перестановка", "убери", "добавь",
  "светлее", "темнее", "цвет", "переделать", "как выглядел бы", "визуализируй",
];

function isTransformRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSFORM_KEYWORDS.some((kw) => lower.includes(kw));
}

async function generateRestyle(imageBase64: string, imageMediaType: string, prompt: string): Promise<string | null> {
  if (!process.env.FAL_KEY) return null;
  try {
    fal.config({ credentials: process.env.FAL_KEY });
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
    return result?.images?.[0]?.url ?? null;
  } catch (err) {
    console.error("fal.ai error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { leadId, message, imageBase64, imageMediaType, history } = await req.json();

  if (!leadId || !message) {
    return NextResponse.json({ error: "Не указан leadId или сообщение" }, { status: 400 });
  }

  const lead = await getLead(leadId);
  if (!lead) return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });

  await addMessage(leadId, {
    role: "user",
    content: message,
    imageUrl: imageBase64 ? "uploaded" : undefined,
  });

  // If image + transformation intent → generate restyle in parallel with Claude response
  const hasImage = imageBase64 && imageMediaType && isAllowedMediaType(imageMediaType);
  const wantsTransform = hasImage && isTransformRequest(message);

  // Build Claude messages
  const messages: MessageParam[] = (history || []).slice(-20).map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );

  const userContent = hasImage
    ? [
        { type: "image" as const, source: { type: "base64" as const, media_type: imageMediaType as AllowedMediaType, data: imageBase64 } },
        { type: "text" as const, text: message },
      ]
    : message;

  if (messages.length > 0 && messages[messages.length - 1].role === "user") {
    messages[messages.length - 1] = { role: "user", content: userContent };
  } else {
    messages.push({ role: "user", content: userContent });
  }

  try {
    // Run Claude + fal.ai in parallel if transform is needed
    const [claudeResponse, restyledImageUrl] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages,
      }),
      wantsTransform ? generateRestyle(imageBase64, imageMediaType, message) : Promise.resolve(null),
    ]);

    const assistantText = claudeResponse.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    await addMessage(leadId, { role: "assistant", content: assistantText });

    return NextResponse.json({
      reply: assistantText,
      restyledImageUrl: restyledImageUrl ?? undefined,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Ошибка. Попробуй ещё раз." }, { status: 500 });
  }
}
