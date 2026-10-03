import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "신영동 214 일대 | 주택·동의 현황",
  description: "지번별 조사대장과 세대별 동의 현황",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
