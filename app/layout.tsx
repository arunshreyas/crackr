import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crackr — Practice smarter. Crack more.",
  description: "Focused question practice engine designed specifically for candidates preparing for high-stakes examinations.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#080a0e] text-[#f1f5f9] selection:bg-[#ff9e4f]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
