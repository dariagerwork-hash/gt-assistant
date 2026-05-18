"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function formatPhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    let formatted = "+7";
    if (digits.length > 1) formatted += " (" + digits.slice(1, 4);
    if (digits.length >= 4) formatted += ") " + digits.slice(4, 7);
    if (digits.length >= 7) formatted += "-" + digits.slice(7, 9);
    if (digits.length >= 9) formatted += "-" + digits.slice(9, 11);
    return formatted;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Введите ваше имя");
    if (phone.replace(/\D/g, "").length < 11) return setError("Введите корректный номер телефона");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("gt_user_id", data.id);
      localStorage.setItem("gt_user_name", data.name);
      router.push("/chat");
    } catch {
      setError("Что-то пошло не так. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{
        padding: "16px 24px",
        borderBottom: "1px solid #e2e5ed",
        display: "flex",
        alignItems: "center",
      }}>
        <span style={{ fontWeight: 600, fontSize: 15, color: "#1b1d24" }}>Город Талантов</span>
      </header>

      {/* Progress bar */}
      <div style={{ height: 3, background: "#f2f3f5" }}>
        <div style={{ height: "100%", width: "33%", background: "#4e6e55", borderRadius: 2 }} />
      </div>

      {/* Content */}
      <main style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 480 }}>
          {/* Eyebrow */}
          <p style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            color: "#6b8f71",
            textTransform: "uppercase",
            marginBottom: 24,
          }}>
            Город Талантов · AI-ассистент
          </p>

          <h1 style={{
            fontSize: "clamp(28px, 6vw, 46px)",
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#1b1d24",
            marginBottom: 24,
            fontFamily: "var(--font-lora), Georgia, serif",
          }}>
            Ваш личный консультант<br />по жилью
          </h1>

          <div style={{
            borderLeft: "3px solid #4e6e55",
            paddingLeft: 16,
            marginBottom: 40,
          }}>
            <p style={{ color: "#6b7280", fontSize: 15, lineHeight: 1.6 }}>
              Анализ планировок, советы по интерьеру, ответы на вопросы по ипотеке и рынку города Кемерово.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "#1b1d24",
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                Имя *
              </label>
              <input
                type="text"
                placeholder="Ваше имя"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid #c4c8d8",
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#1b1d24",
                  outline: "none",
                  transition: "border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4e6e55")}
                onBlur={(e) => (e.target.style.borderColor = "#c4c8d8")}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{
                display: "block",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.06em",
                color: "#1b1d24",
                textTransform: "uppercase",
                marginBottom: 8,
              }}>
                Телефон *
              </label>
              <input
                type="tel"
                placeholder="+7 (___) ___-__-__"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  border: "1px solid #c4c8d8",
                  borderRadius: 12,
                  fontSize: 16,
                  color: "#1b1d24",
                  outline: "none",
                  transition: "border-color 0.15s",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#4e6e55")}
                onBlur={(e) => (e.target.style.borderColor = "#c4c8d8")}
              />
            </div>

            {error && (
              <p style={{ color: "#e53e3e", fontSize: 14, marginBottom: 16 }}>{error}</p>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: loading ? "#9ab89f" : "#4e6e55",
                  color: "#fff",
                  border: "none",
                  borderRadius: 100,
                  padding: "14px 32px",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: loading ? "default" : "pointer",
                  transition: "background 0.15s",
                  fontFamily: "inherit",
                }}
              >
                {loading ? "Загружаем..." : "Начать →"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
