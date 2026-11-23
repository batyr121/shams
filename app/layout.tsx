import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Шәмші Қайырымдылық Балы 2026",
    template: "%s | Шәмші Қайырымдылық Балы 2026",
  },
  description:
    "Шәмші Қайырымдылық Балы 2026 — ізгілік, музыка және ұмытылмас естеліктер кеші. 26 қараша, сағат 16:00.",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="kk" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
