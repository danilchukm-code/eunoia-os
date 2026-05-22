import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EUNOIA OS — Cognitive Operating System",
  description: "Твоя когнитивная операционная система. Думай вслух. Исследуй. Создавай.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body className="h-full" style={{ margin: 0, padding: 0, background: '#1a1714', color: '#e8e2d8' }}>
        {children}
      </body>
    </html>
  );
}
