import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@/shared/styles/global.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "재귀 시각화 - Recursion Visualizer",
  description: "재귀 알고리즘의 호출 흐름을 시각적으로 학습하세요",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geistMono.variable}>
      <body>{children}</body>
    </html>
  );
}
