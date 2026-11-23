"use client";
import Link from "next/link";
import { Crown, Menu, X, Instagram, Music2 } from "lucide-react";
import { useState, useEffect } from "react";
import { db, defaults, Settings } from "@/lib/db";
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(defaults);
  useEffect(() => {
    if (!db) return;
    const refresh = () => {
      db!
        .from("public_event_settings")
        .select("*")
        .eq("id", 1)
        .single()
        .then(({ data }) => {
          if (data) setSettings(data);
        });
    };
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
          THE GRAND BALL<small>AN EVENING TO REMEMBER</small>
        </span>
      </Link>
      <nav className={open ? "open" : ""} aria-label="Main navigation">
        <Link onClick={() => setOpen(false)} href="/#about">
          The evening
        </Link>
        <Link onClick={() => setOpen(false)} href="/#program">
          The program
        </Link>
        <Link href="/vote">Best couple</Link>
        <Link onClick={() => setOpen(false)} href="/#gallery">
          Gallery
        </Link>
      </nav>
      <Link className="button small header-cta" href="/register-couple">
        BE PART OF THE MAGIC <span>✧</span>
      </Link>
      <button
        className="menu icon"
        aria-label="Toggle navigation"
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
export function Footer() {
  return (
    <footer>
      <Link className="brand" href="/">
        <Crown />
        <span>
          THE GRAND BALL<small>AN EVENING TO REMEMBER</small>
        </span>
      </Link>
      <p>
        Some nights become memories.
        <br />
        This one becomes a story.
      </p>
      <div>
        <Link href="/admin">Organizer access</Link>
        <span>© 2026 THE GRAND BALL</span>
      </div>
    </footer>
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
          <span>{["DAYS", "HOURS", "MINUTES", "SECONDS"][i]}</span>
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
