import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist_Mono } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@/shared/styles/global.css";
import { PostHogProvider } from "@/shared/lib/PostHogProvider";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://recursive-ochre.vercel.app";
const SITE_NAME = "Recursive";
const SITE_DESCRIPTION =
  "코드를 붙여넣기만 하면 실행 흐름을 한 줄씩 따라갈 수 있어요. 재귀라면 호출 트리까지 한눈에. JS / TS 지원.";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f13",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Recursive — Track Your Algorithms",
    template: "%s | Recursive",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "algorithm visualizer",
    "recursion tree",
    "code tracing",
    "javascript debugger",
    "typescript",
    "알고리즘 시각화",
    "재귀 시각화",
    "코딩테스트",
  ],
  authors: [{ name: "oilater", url: "https://github.com/oilater" }],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Recursive — Track Your Algorithms",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Recursive — Track Your Algorithms",
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={geistMono.variable}>
      <body>
        <PostHogProvider>
          {children}
        </PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
