import { NextRequest, NextResponse } from "next/server";
import { createLead, getLead } from "@/lib/db";

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json();
  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Имя и телефон обязательны" }, { status: 400 });
  }
  const lead = await createLead(name.trim(), phone.trim());
  return NextResponse.json({ id: lead.id, name: lead.name });
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Не указан ID" }, { status: 400 });
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Не найден" }, { status: 404 });
  return NextResponse.json({ id: lead.id, name: lead.name, phone: lead.phone, messages: lead.messages });
}
