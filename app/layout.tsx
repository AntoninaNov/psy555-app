import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLO Perception Study",
  description: "Research tool for studying how students perceive structural integration of Program Learning Outcomes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className="min-h-full flex flex-col"
        style={{ backgroundColor: "var(--bg, #F5F2EC)" }}
      >
        {children}
      </body>
    </html>
  );
}
