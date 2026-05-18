"use client";
import { useState, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface Lead {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  lastActive: string;
  tags: string[];
  messages: Message[];
}

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function fetchLeads(k: string) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/leads?key=${k}`);
      if (!res.ok) throw new Error("Неверный ключ");
      const data = await res.json();
      setLeads(data);
      setAuthed(true);
    } catch {
      setError("Неверный ключ доступа");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authed) return;
    const interval = setInterval(() => fetchLeads(key), 30000);
    return () => clearInterval(interval);
  }, [authed, key]);

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6b8f71", textTransform: "uppercase", marginBottom: 16 }}>
            Город Талантов
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "#1b1d24", marginBottom: 8 }}>Панель лидов</h1>
          <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 28 }}>Введите ключ доступа</p>
          <input
            type="password"
            placeholder="Ключ администратора"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchLeads(key)}
            style={{
              width: "100%", padding: "14px 16px",
              border: "1px solid #c4c8d8", borderRadius: 12,
              fontSize: 15, color: "#1b1d24", outline: "none",
              fontFamily: "inherit", marginBottom: 16,
            }}
          />
          {error && <p style={{ color: "#e53e3e", fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button
            onClick={() => fetchLeads(key)}
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              borderRadius: 100, border: "none",
              background: "#4e6e55", color: "#fff",
              fontSize: 15, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {loading ? "Загрузка..." : "Войти"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff" }}>
      {/* Leads list */}
      <div style={{
        width: 320,
        borderRight: "1px solid #e2e5ed",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e5ed" }}>
          <h2 style={{ fontWeight: 800, fontSize: 16, color: "#1b1d24", marginBottom: 4 }}>
            Лиды · {leads.length}
          </h2>
          <button
            onClick={() => fetchLeads(key)}
            style={{
              background: "none", border: "none",
              color: "#6b8f71", fontSize: 12, cursor: "pointer",
              padding: 0, fontFamily: "inherit",
            }}
          >
            Обновить
          </button>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {leads.length === 0 && (
            <p style={{ padding: 20, color: "#9ca3af", fontSize: 13 }}>Пока нет лидов</p>
          )}
          {[...leads].reverse().map((lead) => (
            <div
              key={lead.id}
              onClick={() => setSelected(lead)}
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid #f2f3f5",
                cursor: "pointer",
                background: selected?.id === lead.id ? "#eef3ef" : "transparent",
                transition: "background 0.1s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "#1b1d24" }}>{lead.name}</span>
                <span style={{ fontSize: 11, color: "#9ca3af" }}>{formatDate(lead.lastActive)}</span>
              </div>
              <p style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>{lead.phone}</p>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {lead.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, padding: "2px 8px",
                    background: "#eef3ef", color: "#4e6e55",
                    borderRadius: 100, fontWeight: 600,
                  }}>
                    {tag}
                  </span>
                ))}
                <span style={{
                  fontSize: 10, padding: "2px 8px",
                  background: "#f2f3f5", color: "#6b7280",
                  borderRadius: 100,
                }}>
                  {lead.messages.length} сообщений
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lead detail */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {!selected ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Выберите лида слева</p>
          </div>
        ) : (
          <>
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e2e5ed",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: "#1b1d24", marginBottom: 2 }}>{selected.name}</h3>
                <p style={{ fontSize: 13, color: "#6b7280" }}>{selected.phone} · Регистрация {formatDate(selected.createdAt)}</p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {selected.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: 11, padding: "4px 10px",
                    background: "#eef3ef", color: "#4e6e55",
                    borderRadius: 100, fontWeight: 600,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {selected.messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 12,
                }}>
                  <div style={{
                    maxWidth: "75%",
                    padding: "10px 14px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user" ? "#4e6e55" : "#f2f3f5",
                    color: msg.role === "user" ? "#fff" : "#1b1d24",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}>
                    {msg.content}
                  </div>
                  <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 3, padding: "0 4px" }}>
                    {formatDate(msg.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
