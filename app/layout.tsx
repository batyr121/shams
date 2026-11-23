import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "The Grand Ball — An Evening to Remember",
    template: "%s | The Grand Ball",
  },
  description:
    "You are invited. Join The Grand Ball on November 26, 2026 for an evening of elegance, magic and memories.",
  robots: { index: true, follow: true },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
