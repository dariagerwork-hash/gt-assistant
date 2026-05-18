"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Paperclip, ArrowUp, X, Home, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  role: "user" | "assistant";
  content: string;
  imagePreview?: string;
  restyledImage?: string;
  loading?: boolean;
  generatingImage?: boolean;
}

const GT_INFO = [
  {
    title: "О проекте",
    body: "Город Талантов — креативный кластер на 10 000 жителей в Кемерово. Рядом с рекой, вокруг нового городского университета компактного формата. Архитектура разработана бюро Megabudka (ТОП-30 Forbes).",
  },
  {
    title: "Тёплая улица",
    body: "Главная фишка: отапливаемый пешеходный маршрут через весь квартал на 2-м этаже. Соединяет все 5 корпусов, бизнес-центр и инфраструктуру. Идеально для сибирской зимы.",
  },
  {
    title: "Инфраструктура",
    body: "Коворкинг, фаб-коворкинг, кафе в парке, фермерский рынок, детсад на 240 мест, школа, музей/культурный центр, спортивная и детская площадки, подземный паркинг на 312 мест.",
  },
  {
    title: "Архитектура",
    body: "Концепция «Дома в свитерах» — архитектура отображает сибирскую идентичность: образы угля, советский модернизм, деревянные наличники, активное озеленение. Кластерная расстановка корпусов, проницаемый двор.",
  },
  {
    title: "Параметры",
    body: "5 корпусов (10–22 этажа), 682 квартиры, 40 285 м² продаваемой площади. Студии, евро-1к, евро-2к, евро-3к. Подземный паркинг, коммерция на первых этажах.",
  },
];

const QUICK_PROMPTS = [
  "Чем отличается евро от классической планировки",
  "Хочу сделать перестановку",
  "Как получить семейную ипотеку",
  "Помоги определиться с дизайном квартиры",
  "Расскажи про Город Талантов",
  "Оцени планировку",
];

export default function ChatPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "gt">("chat");
  const [uploadedImage, setUploadedImage] = useState<{ base64: string; mediaType: string; preview: string } | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [userPhone, setUserPhone] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const id = localStorage.getItem("gt_user_id");
    const name = localStorage.getItem("gt_user_name");
    if (!id) { router.push("/"); return; }
    setUserId(id);
    setUserName(name || "");
    fetch(`/api/auth?id=${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.phone) setUserPhone(data.phone);
        if (data.messages) {
          setMessages(data.messages.map((m: { role: "user" | "assistant"; content: string }) => ({
            role: m.role,
            content: m.content,
          })));
        }
      })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fileToBase64 = (file: File): Promise<{ base64: string; mediaType: string; preview: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const img = new Image();
        img.onload = () => {
          const MAX = 1024;
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressed = canvas.toDataURL("image/jpeg", 0.82);
          resolve({ base64: compressed.split(",")[1], mediaType: "image/jpeg", preview: compressed });
        };
        img.onerror = reject;
        img.src = result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const sendMessage = useCallback(async (text?: string, img?: typeof uploadedImage) => {
    const imageData = img !== undefined ? img : uploadedImage;
    const messageText = text || input.trim() || (imageData ? "Проанализируй это фото" : "");
    if (!messageText || loading || !userId) return;
    setInput("");
    setUploadedImage(null);
    setLoading(true);
    abortControllerRef.current = new AbortController();

    setMessages((prev) => [
      ...prev,
      { role: "user", content: messageText, imagePreview: imageData?.preview },
      { role: "assistant", content: "", loading: true },
    ]);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortControllerRef.current.signal,
        body: JSON.stringify({
          leadId: userId,
          message: messageText,
          imageBase64: imageData?.base64,
          imageMediaType: imageData?.mediaType,
          history,
        }),
      });
      const data = await res.json();

      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          role: "assistant",
          content: data.reply || data.error || "Ошибка",
          generatingImage: !!(data.generatePrompt || data.transformRequest),
        },
      ]);

      if (data.generatePrompt || data.transformRequest) {
        const genBody = data.transformRequest
          ? { prompt: data.transformRequest.prompt, imageBase64: data.transformRequest.imageBase64, imageMediaType: data.transformRequest.imageMediaType }
          : { prompt: data.generatePrompt };

        const genRes = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(genBody),
        });
        const genData = await genRes.json();

        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === "assistant") {
            updated[updated.length - 1] = { ...last, generatingImage: false, restyledImage: genData.imageUrl ?? undefined };
          }
          return updated;
        });
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setMessages((prev) => prev.slice(0, -1));
      } else {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Что-то пошло не так. Попробуй ещё раз." },
        ]);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, loading, userId, uploadedImage, messages]);

  const handleStop = () => {
    abortControllerRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleLogout = () => {
    localStorage.removeItem("gt_user_id");
    localStorage.removeItem("gt_user_name");
    router.push("/");
  };

  const formatText = (text: string) =>
    text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^### (.+)$/gm, "<h3>$1</h3>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[^]*?<\/li>)+/g, (m) => `<ul>${m}</ul>`)
      .replace(/\n\n/g, "</p><p>")
      .replace(/\n/g, "<br/>");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#fff" }}>
      {/* Header */}
      <header style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 56, borderBottom: "1px solid #e2e5ed", flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#1b1d24" }}>Город Талантов</span>
        <button
          onClick={() => setActiveTab(activeTab === "gt" ? "chat" : "gt")}
          style={{
            padding: "6px 16px", borderRadius: 100, border: "none",
            background: activeTab === "gt" ? "#4e6e55" : "#f2f3f5",
            color: activeTab === "gt" ? "#fff" : "#6b7280",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          {activeTab === "gt" ? "← Назад" : "О Городе Талантов"}
        </button>
      </header>

      {/* GT Tab */}
      {activeTab === "gt" && (
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px", maxWidth: 720, margin: "0 auto", width: "100%" }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#6b8f71", textTransform: "uppercase", marginBottom: 16 }}>
            Город Талантов · Кемерово
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: "#1b1d24", marginBottom: 8, lineHeight: 1.1, fontFamily: "var(--font-lora), Georgia, serif" }}>
            Новый центр города
          </h1>
          <p style={{ color: "#6b7280", fontSize: 15, marginBottom: 40, lineHeight: 1.6 }}>
            Креативный кластер на 10 000 жителей. Архитектура с характером, тёплая улица, сообщество и университет нового формата.
          </p>
          {GT_INFO.map((item) => (
            <div key={item.title} style={{ borderLeft: "3px solid #4e6e55", paddingLeft: 20, marginBottom: 32 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: "#1b1d24", marginBottom: 8 }}>{item.title}</h3>
              <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.7 }}>{item.body}</p>
            </div>
          ))}
          <button onClick={() => setActiveTab("chat")} style={{
            background: "#4e6e55", color: "#fff", border: "none", borderRadius: 100,
            padding: "12px 28px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>
            Задать вопрос ассистенту →
          </button>
        </div>
      )}

      {/* Chat Tab */}
      {activeTab === "chat" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", paddingTop: 48, paddingBottom: 32 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, background: "#eef3ef",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 20px",
                  }}>
                    <Home size={24} color="#4e6e55" />
                  </div>
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#1b1d24", marginBottom: 8, fontFamily: "var(--font-lora), Georgia, serif" }}>
                    {userName ? `Привет, ${userName}!` : "Привет!"}
                  </h2>
                  <p style={{ color: "#6b7280", fontSize: 14, lineHeight: 1.6, maxWidth: 380, margin: "0 auto 32px" }}>
                    Помогу с выбором жилья, анализом планировок, ипотекой и дизайном интерьера.
                    Загружай фото — разберём вместе.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxWidth: 480, margin: "0 auto", justifyContent: "center" }}>
                    {QUICK_PROMPTS.map((p) => (
                      <button key={p} onClick={() => sendMessage(p)} style={{
                        background: "#f2f3f5", border: "none", borderRadius: 100,
                        padding: "10px 16px", fontSize: 13, color: "#1b1d24",
                        cursor: "pointer", textAlign: "center", fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                        onMouseOver={(e) => (e.currentTarget.style.background = "#e5ebe6")}
                        onMouseOut={(e) => (e.currentTarget.style.background = "#f2f3f5")}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} style={{
                  display: "flex", flexDirection: "column",
                  alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                  marginBottom: 16,
                }}>
                  {msg.imagePreview && (
                    <img src={msg.imagePreview} alt="uploaded" style={{
                      maxWidth: 260, borderRadius: 12, marginBottom: 8, objectFit: "cover",
                    }} />
                  )}
                  <div style={{
                    maxWidth: "85%",
                    padding: msg.role === "user" ? "10px 16px" : "14px 18px",
                    borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                    background: msg.role === "user" ? "#4e6e55" : "#f2f3f5",
                    color: msg.role === "user" ? "#fff" : "#1b1d24",
                    fontSize: 14, lineHeight: 1.6,
                  }}>
                    {msg.loading ? (
                      <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
                        {[0, 1, 2].map((n) => (
                          <div key={n} style={{
                            width: 6, height: 6, borderRadius: "50%", background: "#9ab89f",
                            animation: `bounce 1s ${n * 0.2}s infinite`,
                          }} />
                        ))}
                      </div>
                    ) : (
                      <div className="prose" dangerouslySetInnerHTML={{ __html: formatText(msg.content) }} />
                    )}
                  </div>
                  {msg.generatingImage && (
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, color: "#6b7280", fontSize: 13 }}>
                      {[0, 1, 2].map((n) => (
                        <div key={n} style={{ width: 6, height: 6, borderRadius: "50%", background: "#9ab89f", animation: `bounce 1s ${n * 0.2}s infinite` }} />
                      ))}
                      <span>Генерирую изображение...</span>
                    </div>
                  )}
                  {msg.restyledImage && (
                    <div style={{ marginTop: 12, maxWidth: "85%" }}>
                      <img src={msg.restyledImage} alt="restyled" style={{ width: "100%", borderRadius: 16 }} />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input */}
          <div style={{ borderTop: "1px solid #e2e5ed", padding: "12px 24px 16px", flexShrink: 0 }}>
            <div style={{ maxWidth: 720, margin: "0 auto" }}>
              {uploadedImage && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 10, marginBottom: 10,
                  padding: "8px 12px", background: "#f2f3f5", borderRadius: 12,
                }}>
                  <img src={uploadedImage.preview} alt="upload" style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                  <span style={{ fontSize: 13, color: "#6b7280", flex: 1 }}>Фото прикреплено</span>
                  <button
                    onClick={() => setUploadedImage(null)}
                    aria-label="Удалить фото"
                    style={{
                      background: "none", border: "none", color: "#6b7280", cursor: "pointer",
                      padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
                      borderRadius: 6, transition: "color 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.color = "#1b1d24")}
                    onMouseOut={(e) => (e.currentTarget.style.color = "#6b7280")}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Прикрепить планировку или фото интерьера"
                  title="Прикрепить планировку или фото интерьера"
                  style={{
                    width: 44, height: 44, borderRadius: 12, border: "1px solid #c4c8d8",
                    background: "#fff", cursor: "pointer", display: "flex",
                    alignItems: "center", justifyContent: "center", flexShrink: 0,
                    transition: "border-color 0.15s, background 0.15s",
                    color: "#6b7280",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "#4e6e55"; e.currentTarget.style.color = "#4e6e55"; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "#c4c8d8"; e.currentTarget.style.color = "#6b7280"; }}
                >
                  <Paperclip size={18} />
                </button>

                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Спросите про планировки, ипотеку, интерьер... или загрузите фото"
                  rows={1}
                  style={{
                    flex: 1, padding: "12px 14px", border: "1px solid #c4c8d8", borderRadius: 12,
                    fontSize: 14, color: "#1b1d24", resize: "none", outline: "none",
                    fontFamily: "inherit", lineHeight: 1.5, minHeight: 44, maxHeight: 120, overflowY: "auto",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#4e6e55")}
                  onBlur={(e) => (e.target.style.borderColor = "#c4c8d8")}
                />

                {loading ? (
                  <button
                    onClick={handleStop}
                    aria-label="Остановить"
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: "none",
                      background: "#f2f3f5", color: "#1b1d24",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", flexShrink: 0, transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.background = "#e2e5ed")}
                    onMouseOut={(e) => (e.currentTarget.style.background = "#f2f3f5")}
                  >
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: "#1b1d24" }} />
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() && !uploadedImage}
                    aria-label="Отправить сообщение"
                    style={{
                      width: 44, height: 44, borderRadius: 12, border: "none",
                      background: !input.trim() && !uploadedImage ? "#f2f3f5" : "#4e6e55",
                      color: !input.trim() && !uploadedImage ? "#9ca3af" : "#fff",
                      cursor: !input.trim() && !uploadedImage ? "default" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, transition: "background 0.15s",
                    }}
                  >
                    <ArrowUp size={18} />
                  </button>
                )}
              </div>

              <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, textAlign: "center" }}>
                Загрузи планировку или фото интерьера — напиши что сделать, получишь анализ или визуализацию
              </p>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          if (e.target.files?.[0]) {
            const data = await fileToBase64(e.target.files[0]);
            setUploadedImage(data);
          }
        }}
      />

      {/* Account widget — bottom left */}
      <div style={{ position: "fixed", bottom: 20, left: 20, zIndex: 40 }}>
        {showAccount && (
          <div style={{
            position: "absolute", bottom: 52, left: 0,
            background: "#fff", borderRadius: 16, padding: "16px 20px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)", minWidth: 220,
            border: "1px solid #e2e5ed",
          }}>
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 15, color: "#1b1d24", marginBottom: 2 }}>{userName}</p>
              {userPhone && <p style={{ fontSize: 13, color: "#6b7280" }}>{userPhone}</p>}
            </div>
            <div style={{ height: 1, background: "#e2e5ed", marginBottom: 12 }} />
            <button onClick={handleLogout} style={{
              width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
              background: "#f2f3f5", color: "#1b1d24", fontSize: 13, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit", textAlign: "center",
            }}>
              Выйти
            </button>
          </div>
        )}
        <button
          onClick={() => setShowAccount((v) => !v)}
          style={{
            width: 40, height: 40, borderRadius: "50%",
            background: showAccount ? "#4e6e55" : "#1b1d24",
            border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 15, fontWeight: 700, fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "background 0.15s",
          }}
        >
          {userName ? userName[0].toUpperCase() : "?"}
        </button>
      </div>

      {/* Close account on outside click */}
      {showAccount && (
        <div
          onClick={() => setShowAccount(false)}
          style={{ position: "fixed", inset: 0, zIndex: 39 }}
        />
      )}

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}
