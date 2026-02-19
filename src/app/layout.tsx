import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";

import { AppShell } from "@/components/shell/app-shell";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dino Stream",
  description: "Mobile-first virtualized video player with smooth gestures.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://www.google.com" />
      </head>
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
