import type { Metadata, Viewport } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { NextIntlClientProvider } from "next-intl";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "@/shared/styles/global.css";
import { routing } from "@/i18n/routing";
import { type Locale, locales, defaultLocale } from "@/i18n/config";

const OG_LOCALE_MAP: Record<Locale, string> = {
  ko: "ko_KR",
  en: "en_US",
  ja: "ja_JP",
  zh: "zh_CN",
};

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

const SITE_URL = "https://recursive-ochre.vercel.app";
const SITE_NAME = "Recursive";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f0f13",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: "%s | Recursive",
    },
    description: t("description"),
    keywords: [
      "algorithm visualizer",
      "recursion tree",
      "code tracing",
      "javascript debugger",
      "typescript",
    ],
    authors: [{ name: "oilater", url: "https://github.com/oilater" }],
    openGraph: {
      type: "website",
      locale:
        locale in OG_LOCALE_MAP
          ? OG_LOCALE_MAP[locale as Locale]
          : OG_LOCALE_MAP[defaultLocale],
      url: SITE_URL,
      siteName: SITE_NAME,
      title: t("title"),
      description: t("description"),
      images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [`${SITE_URL}/og.png`],
      title: t("title"),
      description: t("description"),
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: SITE_URL,
      languages: Object.fromEntries(
        locales.map((code) => [
          code,
          code === defaultLocale ? SITE_URL : `${SITE_URL}/${code}`,
        ]),
      ),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${geistMono.variable} ${plusJakarta.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <NextIntlClientProvider>
          {children}
        </NextIntlClientProvider>
        <Analytics />
      </body>
    </html>
  );
}
