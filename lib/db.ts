import { kv } from "@vercel/kv";
import { v4 as uuidv4 } from "uuid";

export interface Lead {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lastActive: string;
  tags: string[];
  messages: Message[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
  timestamp: string;
}

export async function getLeads(): Promise<Lead[]> {
  const ids = await kv.smembers<string[]>("leads:ids");
  if (!ids.length) return [];
  const leads = await Promise.all(ids.map((id) => kv.get<Lead>(`lead:${id}`)));
  return (leads.filter(Boolean) as Lead[]).sort(
    (a, b) => new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  );
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const lead = await kv.get<Lead>(`lead:${id}`);
  return lead ?? undefined;
}

export async function createLead(name: string, phone: string): Promise<Lead> {
  const existingId = await kv.get<string>(`phone:${phone}`);
  if (existingId) {
    const existing = await getLead(existingId);
    if (existing) return existing;
  }

  const lead: Lead = {
    id: uuidv4(),
    name,
    phone,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    tags: [],
    messages: [],
  };

  await kv.set(`lead:${lead.id}`, lead);
  await kv.set(`phone:${phone}`, lead.id);
  await kv.sadd("leads:ids", lead.id);

  return lead;
}

export async function addMessage(leadId: string, msg: Omit<Message, "timestamp">): Promise<void> {
  const lead = await getLead(leadId);
  if (!lead) return;

  lead.messages.push({ ...msg, timestamp: new Date().toISOString() });
  lead.lastActive = new Date().toISOString();

  const text = msg.content.toLowerCase();
  if ((text.includes("город талантов") || text.includes("гт ")) && !lead.tags.includes("интересуется ГТ")) {
    lead.tags.push("интересуется ГТ");
  }
  if ((text.includes("планировк") || text.includes("квартир")) && !lead.tags.includes("анализ планировок")) {
    lead.tags.push("анализ планировок");
  }
  if ((text.includes("ипотек") || text.includes("маткапитал")) && !lead.tags.includes("финансы")) {
    lead.tags.push("финансы");
  }
  if ((text.includes("интерьер") || text.includes("дизайн")) && !lead.tags.includes("интерьер")) {
    lead.tags.push("интерьер");
  }

  await kv.set(`lead:${leadId}`, lead);
}
