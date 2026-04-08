import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidgetLazy } from "@/components/chat/ChatWidgetLazy";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  display: "swap",
  variable: "--font-pretendard",
  weight: "45 920",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.seung-woo.me"),
  title: {
    default: "이승우의 블로그",
    template: "%s — 이승우의 블로그",
  },
  description: "개발, 여행, 일상 — 기록하고 싶은 모든 것을 담는 블로그",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "이승우의 블로그",
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "A8QWU7_lH7Q2hozdMPJPUV2rJoLWqmVZZyJ4PX2rs7w",
    other: {
      "naver-site-verification": "a3c48e64fb06aa857b03e575bb07f33459bfcd9f",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="alternate"
          type="application/rss+xml"
          title="이승우의 블로그 RSS"
          href="/feed.xml"
        />
      </head>
      <body
        className={`${pretendard.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "이승우의 블로그",
              url: "https://www.seung-woo.me",
              description: "개발, 여행, 일상 — 기록하고 싶은 모든 것을 담는 블로그",
              inLanguage: "ko-KR",
              author: {
                "@type": "Person",
                name: "이승우",
                url: "https://www.seung-woo.me/about",
              },
            }),
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
          >
            메인 콘텐츠로 이동
          </a>
          <Header />
          <main id="main" className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl overflow-x-hidden px-4 py-10 sm:px-6">
            {children}
          </main>
          <Footer />
          <ChatWidgetLazy />
        </ThemeProvider>
      </body>
    </html>
  );
}
