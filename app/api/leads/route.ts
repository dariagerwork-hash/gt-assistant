import { NextRequest, NextResponse } from "next/server";
import { getLeads } from "@/lib/db";

export async function GET(req: NextRequest) {
  const adminKey = req.nextUrl.searchParams.get("key");
  if (adminKey !== process.env.ADMIN_KEY) {
    return NextResponse.json({ error: "Доступ запрещён" }, { status: 401 });
  }
  const leads = await getLeads();
  return NextResponse.json(leads);
}
