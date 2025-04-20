import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Link from "next/link";
import { DisplayModeButton } from "@/components/DisplayModeButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "이승우의 블로그",
  description: "Notion 기반 모던 블로그",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* 네비게이션 바 */}
          <nav className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur flex items-center justify-between px-6 py-3">
            <Link href="/" className="text-xl font-bold tracking-tight">
              이승우의 블로그
            </Link>
            <DisplayModeButton />
          </nav>
          <main className="max-w-3xl mx-auto w-full px-4 py-10">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
