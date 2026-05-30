import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eval | Video Comparison Intelligence",
  description:
    "Frontend prototype for an AI-powered social video comparison and RAG analysis workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
