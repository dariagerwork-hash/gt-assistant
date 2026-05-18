import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin", "cyrillic"], variable: "--font-lora", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "AI-ассистент по жилью — Город Талантов",
  description: "Персональный консультант по жилью, планировкам и интерьеру",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${lora.variable} h-full`}>
      <body className="h-full" style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
