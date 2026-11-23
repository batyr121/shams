"use client";
import { Crown, Maximize } from "lucide-react";
import { QRTools } from "@/components/qr";
import { useSettings } from "@/components/shared";
export default function Screen() {
  const s = useSettings();
  return (
    <main className="screen">
      <div className="spotlight one" />
      <div className="spotlight two" />
      <div className="screen-controls">
        <button
          className="button"
          onClick={() =>
            document.documentElement.requestFullscreen?.().catch(() => {})
          }
        >
          <Maximize size={15} /> FULLSCREEN
        </button>
        <button className="button" onClick={() => window.print()}>
          PRINT POSTER
        </button>
      </div>
      <div className="screen-content">
        <Crown style={{ margin: "auto", color: "var(--gold)" }} size={35} />
        <p className="eyebrow">THE GRAND BALL · 2026</p>
        <h1>
          {s.voting_status === "open"
            ? "ГОЛОСОВАНИЕ ОТКРЫТО"
            : s.voting_status === "paused"
              ? "ГОЛОСОВАНИЕ ПРИОСТАНОВЛЕНО"
              : "ГОТОВЬТЕСЬ ГОЛОСОВАТЬ"}
        </h1>
        <h2>ВЫБЕРИ ЛУЧШУЮ ПАРУ БАЛА</h2>
        <QRTools screen />
        <p>Отсканируй QR-код камерой телефона и проголосуй!</p>
        <p className="eyebrow">USE YOUR PERSONAL ONE-TIME GUEST CODE</p>
      </div>
    </main>
  );
}
