import type { Metadata } from "next";
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Preparation — project documents before the first line of code",
  description:
    "Turn an idea into PRD.md, design.md, schema.md and rules.md. Drop them in your repo so your coding agent stays in scope.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${instrument.variable} ${jakarta.variable} ${mono.variable} antialiased`}
      >
        <div className="grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
