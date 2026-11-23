"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Maximize } from "lucide-react";
import { useSettings, Ornament } from "@/components/shared";
import { photo, Couple } from "@/lib/db";
import { api } from "@/lib/api";
export default function Winner() {
  const s = useSettings();
  const [count, setCount] = useState<number | null>(null);
  const [winners, setWinners] = useState<Couple[]>([]);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    if (!s.results_published || !s.reveal_at) return;
    let stopped = false;
    api<Couple[]>("winners")
      .then((data) => {
        if (stopped || !data?.length) return;
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
      })
      .catch(() => {});
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
          <Maximize size={15} /> ТОЛЫҚ ЭКРАН
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
                ? "ОРТАҚ ТӘЖ · ДАУЫСТАР ТЕҢ"
                : "КЕШТІҢ KING & QUEEN ЖҰБЫ · 2026"}
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
            <p className="eyebrow">ҚҰТТЫҚТАЙМЫЗ!</p>
          </motion.div>
        ) : (
          <>
            <Crown size={55} style={{ margin: "auto", color: "var(--gold)" }} />
            <p className="eyebrow">КӨПТЕН КҮТКЕН СӘТ КЕЛДІ</p>
            <h1>Шәмші Қайырымдылық Балы 2026</h1>
            <Ornament />
            <p>Кештің KING & QUEEN жұбын бірге қарсы алайық.</p>
          </>
        )}
      </div>
    </main>
  );
}
