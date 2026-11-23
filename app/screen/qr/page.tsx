"use client";
import { useEffect, useState } from "react";
import { Crown, Maximize, Monitor, WifiOff } from "lucide-react";
import { QRTools } from "@/components/qr";
import { api } from "@/lib/api";
import { ScreenData, photo } from "@/lib/db";
import { EVENT_NAME } from "@/lib/brand";
export default function Screen() {
  const [data, setData] = useState<ScreenData | null>(null);
  const [error, setError] = useState("");
  const [fullscreenError, setFullscreenError] = useState("");
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api<ScreenData>("screen")
        .then((d) => {
          if (active) {
            setData(d);
            setError("");
          }
        })
        .catch(() => {
          if (active)
            setError("Сервермен байланыс үзілді. Нәтижелер жаңартылуда…");
        });
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const leader = data?.leaders[0];
  const tied = data?.leaders.filter((c) => c.rank === 1) || [];
  return (
    <main className="projection-shell">
      <div className="screen-controls no-print">
        <button
          className="button"
          onClick={() => {
            setFullscreenError("");
            if (document.fullscreenElement) {
              document
                .exitFullscreen()
                .catch(() =>
                  setFullscreenError("Шығу үшін Esc пернесін басыңыз."),
                );
              return;
            }
            document.documentElement
              .requestFullscreen?.()
              .catch(() =>
                setFullscreenError(
                  "Толық экран режимі қолжетімсіз. F11 пернесін пайдаланыңыз.",
                ),
              );
          }}
        >
          <Maximize size={16} /> ТОЛЫҚ ЭКРАН
        </button>
        <button className="button" onClick={() => window.print()}>
          QR-КОДТЫ БАСЫП ШЫҒАРУ
        </button>
        {fullscreenError && <span role="status">{fullscreenError}</span>}
      </div>
      <section className="projection-stage" aria-label="Дауыс беру экраны 16:9">
        <div className="spotlight one" />
        <div className="spotlight two" />
        <header className="projection-brand">
          <Crown />
          <span>{EVENT_NAME}</span>
          <span className="projection-format">ТІКЕЛЕЙ КӨРСЕТІЛІМ · 16:9</span>
        </header>
        <div className="projection-columns">
          <section className="projection-ranking">
            <p className="eyebrow">КЕШТІҢ ҮЗДІК ЖҰБЫ</p>
            <h1>
              {data?.voting_status === "closed"
                ? "Royal Rankings"
                : tied.length > 1
                  ? "Sharing the Crown"
                  : "The Next KING & QUEEN"}
            </h1>
            {error ? (
              <div className="projection-empty" role="status">
                <WifiOff />
                <h2>Updating the Rankings</h2>
                <p>{error}</p>
              </div>
            ) : !data ? (
              <div className="projection-empty">
                <Crown />
                <h2>The Crown Awaits…</h2>
              </div>
            ) : !data.visible ? (
              <div className="projection-empty">
                <Crown />
                <h2>The Royal Reveal Awaits</h2>
                <p>Ұйымдастырушы осы экранда көшбасшыларды көрсетуді қосады.</p>
              </div>
            ) : !leader ? (
              <div className="projection-empty">
                <Crown />
                <h2>The Crown Awaits</h2>
                <p>Алғашқы расталған дауыстан кейін рейтинг көрсетіледі.</p>
              </div>
            ) : (
              <>
                <div className="projected-leader">
                  {leader.photo_path && (
                    <img
                      src={photo(leader.photo_path)}
                      alt={`${leader.first_name} и ${leader.second_name}`}
                    />
                  )}
                  <div className="projected-leader-copy">
                    <span className="leader-badge">
                      <Crown size={18} />
                      {tied.length > 1
                        ? "БІРІНШІ ОРЫНДЫ БӨЛІСЕДІ"
                        : "ДАУЫС БЕРУ КӨШБАСШЫСЫ"}
                    </span>
                    <p className="eyebrow">
                      ЖҰП №{String(leader.number).padStart(2, "0")}
                    </p>
                    <h2>
                      {leader.first_name}
                      <span>&</span>
                      {leader.second_name}
                    </h2>
                    <p>{leader.group_name}</p>
                    <div className="projected-total">
                      <strong>{leader.votes}</strong>
                      <span>дауыс · {leader.percentage}%</span>
                    </div>
                  </div>
                </div>
                <div className="projected-runners">
                  {data.leaders.slice(1).map((c) => (
                    <div className="projected-runner" key={c.id}>
                      <span className="runner-rank">
                        {c.rank === 1 ? (
                          <Crown size={18} />
                        ) : (
                          String(c.rank).padStart(2, "0")
                        )}
                      </span>
                      {c.photo_path && <img src={photo(c.photo_path)} alt="" />}
                      <div>
                        <strong>
                          {c.first_name} & {c.second_name}
                        </strong>
                        <span>
                          Жұп №{String(c.number).padStart(2, "0")} ·{" "}
                          {c.group_name}
                        </span>
                      </div>
                      <b>
                        {c.votes}
                        <small>дауыс</small>
                      </b>
                    </div>
                  ))}
                </div>
                <p className="projection-caption">
                  Аралық рейтинг · барлығы {data.total_votes} расталған дауыс
                </p>
              </>
            )}
          </section>
          <aside className="projection-qr">
            <div className="projection-qr-title">
              <Crown size={24} />
              <p className="eyebrow">СЕНІҢ ДАУЫСЫҢ МАҢЫЗДЫ</p>
              <h2>
                {data?.voting_status === "open"
                  ? "Voting Is Open"
                  : data?.voting_status === "paused"
                    ? "Voting Is Paused"
                    : "Choose Your KING & QUEEN"}
              </h2>
            </div>
            <QRTools screen />
            <p className="projection-instruction">
              Телефон камерасын QR-кодқа
              <br />
              бағыттап, үздік жұпты таңда
            </p>
            <span className="projection-code-note">
              Дауыс беру үшін қонақтың жеке коды қажет
            </span>
          </aside>
        </div>
        <footer className="projection-footer">
          <span>ӘН. ІЗГІЛІК. ҰМЫТЫЛМАС КЕШ.</span>
          <span>
            26 ҚАРАША 2026 <b>✦</b> ШӘМШІ БАЛЫ
          </span>
        </footer>
      </section>
    </main>
  );
}
