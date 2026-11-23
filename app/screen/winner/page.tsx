"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Maximize } from "lucide-react";
import { useSettings, Ornament } from "@/components/shared";
import { db, photo, Couple } from "@/lib/db";
export default function Winner() {
  const s = useSettings();
  const [count, setCount] = useState<number | null>(null);
  const [winners, setWinners] = useState<Couple[]>([]);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!s.results_published || !s.reveal_at || !db) return;
    let stopped = false;
    db.rpc("public_winners").then(({ data, error }) => {
      if (error || stopped || !data?.length) return;
      setWinners(data);
      let n = 3;
      setCount(n);
      const timer = setInterval(() => {
        if (stopped) {
          clearInterval(timer);
          return;
        }
        n--;
        setCount(n);
        if (n === 0) {
          clearInterval(timer);
          setRevealed(true);
        }
      }, 1000);
    });
    return () => {
      stopped = true;
    };
  }, [s.results_published, s.reveal_at]);
  return (
    <main className="screen">
      <div className="screen-controls">
        <button
          className="button"
          onClick={() =>
            document.documentElement.requestFullscreen?.().catch(() => {})
          }
        >
          <Maximize size={15} /> FULLSCREEN
        </button>
      </div>
      <div className="spotlight one" />
      <div className="spotlight two" />
      {revealed && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 70 }, (_, i) => (
            <i
              key={i}
              style={{
                left: `${(i * 37) % 100}%`,
                animationDelay: `${(i % 7) * 0.4}s`,
                opacity: 0.3 + (i % 5) / 10,
              }}
            />
          ))}
        </div>
      )}
      <div className="screen-content">
        {count !== null && count > 0 ? (
          <motion.div
            key={count}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="count-number"
          >
            {count}
          </motion.div>
        ) : revealed ? (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.5 }}
          >
            <Crown size={65} style={{ margin: "auto", color: "var(--gold)" }} />
            <p className="eyebrow">
              {winners.length > 1
                ? "A SHARED CROWN · TIED WINNERS"
                : "ЛУЧШАЯ ПАРА БАЛА 2026"}
            </p>
            {winners.map((c) => (
              <div key={c.id}>
                {c.photo_path && (
                  <img
                    className="winner-photo"
                    src={photo(c.photo_path)}
                    alt={`${c.first_name} & ${c.second_name}`}
                  />
                )}
                <h1>
                  {c.first_name} & {c.second_name}
                </h1>
                <p>{c.group_name}</p>
              </div>
            ))}
            <Ornament />
            <p className="eyebrow">CONGRATULATIONS!</p>
          </motion.div>
        ) : (
          <>
            <Crown size={55} style={{ margin: "auto", color: "var(--gold)" }} />
            <p className="eyebrow">THE MOMENT HAS ARRIVED</p>
            <h1>THE GRAND BALL</h1>
            <Ornament />
            <p>The crown awaits.</p>
          </>
        )}
      </div>
    </main>
  );
}
