import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { addMessage, getLead } from "@/lib/db";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";

export const maxDuration = 30;

const client = new OpenAI({
  baseURL: process.env.OPENAI_BASE_URL || "https://openai.bothub.chat/v1",
  apiKey: process.env.OPENAI_API_KEY!,
});

const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMediaType = typeof ALLOWED_MEDIA_TYPES[number];
function isAllowedMediaType(t: string): t is AllowedMediaType {
  return ALLOWED_MEDIA_TYPES.includes(t as AllowedMediaType);
}

const TRANSFORM_KEYWORDS = [
  "сделай", "примени", "переделай", "преобразуй", "измени", "покажи как будет",
  "стиль", "japandi", "скандинавский", "loft", "лофт", "минимализм", "бохо", "boho",
  "классика", "современный", "перестановку", "перестановка", "убери", "добавь",
  "светлее", "темнее", "цвет", "переделать", "как выглядел бы", "визуализируй",
];

const GENERATE_KEYWORDS = [
  "покажи", "нарисуй", "сгенерируй", "визуализируй", "создай изображение",
  "как выглядит", "как выглядел бы", "пример интерьера", "пример дизайна",
  "интерьер в стиле", "дизайн в стиле", "покажи пример",
];

function isTransformRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return TRANSFORM_KEYWORDS.some((kw) => lower.includes(kw));
}

function isGenerateRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return GENERATE_KEYWORDS.some((kw) => lower.includes(kw));
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

  const hasImage = imageBase64 && imageMediaType && isAllowedMediaType(imageMediaType);
  const wantsTransform = hasImage && (isTransformRequest(message) || isGenerateRequest(message));
  const wantsGenerate = !hasImage && isGenerateRequest(message);

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history || []).slice(-20).map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  if (hasImage) {
    messages.push({
      role: "user",
      content: [
        { type: "image_url", image_url: { url: `data:${imageMediaType};base64,${imageBase64}` } },
        { type: "text", text: message },
      ],
    });
  } else {
    messages.push({ role: "user", content: message });
  }

  try {
    let assistantText = "";

    const chatResponse = await client.chat.completions.create({
      model: "gpt-5.2",
      max_tokens: 1500,
      messages,
    });
    assistantText = chatResponse.choices[0]?.message?.content || "";

    if (!assistantText && hasImage) {
      const textOnlyMessages = messages.map((m) =>
        m.role === "user" && Array.isArray(m.content)
          ? { ...m, content: message }
          : m
      );
      const fallback = await client.chat.completions.create({
        model: "gpt-5.2",
        max_tokens: 1500,
        messages: textOnlyMessages,
      });
      assistantText = fallback.choices[0]?.message?.content || "";
    }

    await addMessage(leadId, { role: "assistant", content: assistantText });

    return NextResponse.json({
      reply: assistantText,
      generatePrompt: wantsGenerate ? message : undefined,
      transformRequest: wantsTransform ? { imageBase64, imageMediaType, prompt: message } : undefined,
    });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Ошибка. Попробуй ещё раз." }, { status: 500 });
  }
}
