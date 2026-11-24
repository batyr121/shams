"use client";
import Link from "next/link";
import Image from "next/image";
import { Crown, Menu, X, Instagram, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { defaults, Settings } from "@/lib/db";
import { api } from "@/lib/api";
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaults);
  useEffect(() => {
    const refresh = () =>
      api<Settings>("event")
        .then(setSettings)
        .catch(() => {});
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => clearInterval(timer);
  }, []);
  return settings;
}
export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="header">
      <Link href="/" className="brand">
        <Crown size={25} />
        <span>
          Шәмші Қайырымдылық Балы 2026<small>ЕСТЕ ҚАЛАР ЕРЕКШЕ КЕШ</small>
        </span>
      </Link>
      <nav className={open ? "open" : ""} aria-label="Негізгі мәзір">
        <Link onClick={() => setOpen(false)} href="/#about">
          Кеш туралы
        </Link>
        <Link onClick={() => setOpen(false)} href="/#program">
          Бағдарлама
        </Link>
        <Link href="/vote">Үздік жұп</Link>
        <Link onClick={() => setOpen(false)} href="/#gallery">
          Фотогалерея
        </Link>
      </nav>
      <Link className="button small header-cta" href="/register-couple">
        КЕШКЕ ҚАТЫСУ <span>✧</span>
      </Link>
      <button
        className="menu icon"
        aria-label="Мәзірді ашу немесе жабу"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
export function Footer() {
  return (
    <>
      <section className="organizers" aria-labelledby="organizers-title">
        <p className="eyebrow">КЕШТІ ҰЙЫМДАСТЫРУШЫЛАР</p>
        <h2 id="organizers-title">The people behind the magic</h2>
        <div className="organizer-logos">
          <figure>
            <div className="organizer-logo council-logo">
              <Image
                src="/images/student-council.jpg"
                alt="NIS Student Council"
                width={1354}
                height={1536}
                sizes="(max-width: 600px) 280px, 320px"
              />
            </div>
            <figcaption>Student Council</figcaption>
          </figure>
          <figure>
            <div className="organizer-logo ministry-logo">
              <Image
                src="/images/digital-ai-ministry.png"
                alt="NIS Aktau Digital And AI Ministry"
                width={1254}
                height={1254}
                sizes="(max-width: 600px) 280px, 320px"
              />
            </div>
            <figcaption>Digital &amp; AI Ministry</figcaption>
          </figure>
        </div>
      </section>
      <footer>
        <Link className="brand" href="/">
          <Crown />
          <span>
            Шәмші Қайырымдылық Балы 2026<small>ЕСТЕ ҚАЛАР ЕРЕКШЕ КЕШ</small>
          </span>
        </Link>
        <p>
          Кейбір кештер естелікке айналады.
          <br />
          Ал бұл кеш өз тарихын жазады.
        </p>
        <div>
          <Link href="/admin">Ұйымдастырушыға кіру</Link>
          <span>© 2026 Шәмші Қайырымдылық Балы 2026</span>
        </div>
      </footer>
    </>
  );
}
export function Ornament() {
  return (
    <div className="ornament">
      <span />✧<span />
    </div>
  );
}
export function Countdown() {
  const s = useSettings();
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    const tick = () =>
      setN(Math.max(0, new Date(s.starts_at).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [s.starts_at]);
  if (n === 0) return <h3 className="begun">THE BALL HAS BEGUN</h3>;
  const values =
    n === null
      ? ["—", "—", "—", "—"]
      : [
          Math.floor(n / 86400000),
          Math.floor(n / 3600000) % 24,
          Math.floor(n / 60000) % 60,
          Math.floor(n / 1000) % 60,
        ];
  return (
    <div className="countdown">
      {values.map((v, i) => (
        <div key={i}>
          <strong>{String(v).padStart(2, "0")}</strong>
          <span>{["КҮН", "САҒАТ", "МИНУТ", "СЕКУНД"][i]}</span>
        </div>
      ))}
    </div>
  );
}
export function PageTitle({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="page-title">
      <Crown size={34} />
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <Ornament />
      <p>{sub}</p>
    </div>
  );
}
