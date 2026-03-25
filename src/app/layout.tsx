import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ChatWidget } from "@/components/chat/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    card: "summary",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": "/feed.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="mx-auto min-h-[calc(100vh-8rem)] max-w-4xl overflow-x-hidden px-4 py-10 sm:px-6">
            {children}
          </main>
          <Footer />
          <ChatWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
