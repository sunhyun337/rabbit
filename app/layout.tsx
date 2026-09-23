import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "토끼전 말하기 연습",
  description: "한국어 4급 학습자를 위한 『토끼전』 말하기 도우미 AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
