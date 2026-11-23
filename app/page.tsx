"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  Crown,
  MapPin,
  CalendarDays,
  Sparkles,
  ChevronDown,
  Ticket,
  Music2,
  Camera,
  X,
} from "lucide-react";
import {
  Header,
  Footer,
  Ornament,
  Countdown,
  useSettings,
} from "@/components/shared";
import { db, defaultProgram, Program } from "@/lib/db";
export default function Home() {
  const [entered, setEntered] = useState(false);
  const [intro, setIntro] = useState(false);
  const [gallery, setGallery] = useState<
    { id: string; url: string; caption: string }[]
  >([]);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [program, setProgram] = useState<Program[]>(defaultProgram);
  const reduced = useReducedMotion();
  const curtains = useRef<HTMLDivElement>(null);
  const s = useSettings();
  useEffect(() => {
    setIntro(
      !sessionStorage.getItem("ball-entered") &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>(".reveal")
        .forEach((el) =>
          gsap.fromTo(
            el,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 1,
              scrollTrigger: { trigger: el, start: "top 92%" },
            },
          ),
        );
    });
    if (db) {
      db.from("event_program")
        .select("*")
        .order("sort_order")
        .then(({ data }) => {
          if (data?.length) setProgram(data);
        });
      db.from("gallery_images")
        .select("*")
        .order("sort_order")
        .then(({ data }) => {
          if (data)
            setGallery(
              data.map((x) => ({
                ...x,
                url: process.env.NEXT_PUBLIC_SUPABASE_URL + x.url,
              })),
            );
        });
    }
    return () => ctx.revert();
  }, []);
  function enter() {
    setEntered(true);
    sessionStorage.setItem("ball-entered", "1");
    gsap.to(".curtain.left", {
      xPercent: -105,
      duration: 1.9,
      ease: "power3.inOut",
    });
    gsap.to(".curtain.right", {
      xPercent: 105,
      duration: 1.9,
      ease: "power3.inOut",
    });
    setTimeout(() => setIntro(false), 1900);
  }
  return (
    <>
      <Header />
      {intro && (
        <div className="intro" ref={curtains}>
          <div className="curtain left" />
          <div className="curtain right" />
          <button
            className="skip"
            onClick={() => {
              sessionStorage.setItem("ball-entered", "1");
              setIntro(false);
            }}
          >
            Skip introduction
          </button>
          <motion.div
            animate={{ opacity: entered ? 0 : 1 }}
            className="invitation"
          >
            <Crown size={45} />
            <p className="eyebrow">YOU ARE INVITED</p>
            <h1>
              THE
              <br />
              GRAND BALL
            </h1>
            <Ornament />
            <p>A night beyond the ordinary.</p>
            <button className="button filled" onClick={enter}>
              ENTER THE BALL <Sparkles size={16} />
            </button>
          </motion.div>
        </div>
      )}
      <main>
        <section className="hero">
          <div className="hero-image" />
          <div className="hero-shade" />
          <div className="spotlight one" />
          <div className="spotlight two" />
          <div className="hero-velvet left" />
          <div className="hero-velvet right" />
          <div className="particles" aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => (
              <i
                key={i}
                style={{
                  left: `${(i * 37) % 100}%`,
                  top: `${(i * 23) % 100}%`,
                  animationDelay: `${i % 7}s`,
                  animationDuration: `${6 + (i % 6)}s`,
                }}
              />
            ))}
          </div>
          <div className="hero-content">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5 }}
            >
              <div className="edition">
                <span /> A ROYAL NIGHT. AN UNFORGETTABLE STORY. <span />
              </div>
              <Crown className="hero-crown" strokeWidth={1} />
              <h1>
                <span>THE</span>GRAND BALL
              </h1>
              <Ornament />
              <p className="hero-subtitle">
                An Evening of Elegance, Magic & Memories
              </p>
              <div className="hero-date">
                <span>
                  {new Date(s.starts_at)
                    .toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "Asia/Aqtau",
                    })
                    .toUpperCase()}
                </span>
                <b>✦</b>
                <span>
                  {new Date(s.starts_at)
                    .toLocaleDateString("en-GB", {
                      weekday: "long",
                      timeZone: "Asia/Aqtau",
                    })
                    .toUpperCase()}{" "}
                  ·{" "}
                  {new Date(s.starts_at).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Aqtau",
                  })}
                </span>
              </div>
              <div className="hero-actions">
                <Link href="/register-couple" className="button filled">
                  <Ticket size={17} /> РЕГИСТРАЦИЯ ПАР
                </Link>
                <Link href="/vote" className="button">
                  <Crown size={17} /> ГОЛОСОВАТЬ ЗА ЛУЧШУЮ ПАРУ
                </Link>
                <a href="#program" className="button">
                  <Music2 size={17} /> ПРОГРАММА БАЛА
                </a>
              </div>
            </motion.div>
          </div>
          <a href="#countdown" className="scroll-cue">
            LET THE EVENING UNFOLD
            <ChevronDown size={18} />
          </a>
          <span className="hero-side">EST. 2026 · MADE FOR MEMORIES</span>
        </section>
        <section id="countdown" className="countdown-section reveal">
          <p className="eyebrow">THE WAIT IS PART OF THE MAGIC</p>
          <h2>A night worth counting down to.</h2>
          <Countdown />
          <div className="event-meta">
            <span>
              <CalendarDays size={16} />
              {new Date(s.starts_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "Asia/Aqtau",
              })}
            </span>
            <span>
              <MapPin size={16} />
              {s.location}
            </span>
            <span>
              {new Date(s.starts_at).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Aqtau",
              })}{" "}
              · AQTAU TIME
            </span>
          </div>
        </section>
        <section id="about" className="about section">
          <div className="about-art reveal">
            <img
              src="/images/ballroom.jpg"
              alt="An elegant reception hall illuminated by golden chandeliers"
            />
            <div className="image-border" />
            <span className="image-caption">
              A LITTLE GRANDEUR. A LOT OF MAGIC.
            </span>
          </div>
          <div className="about-copy reveal">
            <p className="eyebrow">MORE THAN JUST AN EVENING</p>
            <h2>
              Some nights are
              <br />
              simply <em>unforgettable.</em>
            </h2>
            <Ornament />
            <p>
              Beyond the everyday, an extraordinary evening awaits. Under the
              glow of chandeliers, we come together to celebrate friendship,
              elegance, and the moments that make our school years remarkable.
            </p>
            <p>
              {s.description} Dress your finest. Bring your people. Let the
              night become your story.
            </p>
            <a href="#program" className="text-link">
              DISCOVER THE EVENING <span>✧</span>
            </a>
          </div>
        </section>
        <section className="dress-section reveal">
          <span className="deco">✧</span>
          <div>
            <p className="eyebrow">DRESS FOR THE MEMORY</p>
            <h2>{s.dress_code}</h2>
            <p>A touch of gold. A little mystery. Your own kind of elegance.</p>
          </div>
          <Crown size={58} strokeWidth={0.7} />
        </section>
        <section id="program" className="section program">
          <div className="section-heading reveal">
            <p className="eyebrow">EVERY MOMENT, BEAUTIFULLY PLANNED</p>
            <h2>
              The evening <em>unfolds.</em>
            </h2>
            <Ornament />
            <p>From the first hello to the final dance.</p>
          </div>
          <div className="timeline">
            {program.map((p, i) => (
              <div className="timeline-row reveal" key={i}>
                <time>{p.time}</time>
                <span className="timeline-dot">✧</span>
                <div>
                  <h3>{p.title}</h3>
                  <p>{p.description}</p>
                </div>
                <span className="timeline-icon">
                  {i === 0 ? (
                    <Ticket />
                  ) : i === 4 || i === 5 ? (
                    <Crown />
                  ) : (
                    <Music2 />
                  )}
                </span>
              </div>
            ))}
          </div>
          <p className="fine">
            Program times are in Asia/Aqtau (UTC+5). The evening may hold a few
            surprises.
          </p>
        </section>
        <section className="competition">
          <div className="competition-glow" />
          <div className="reveal">
            <Crown size={49} strokeWidth={1} />
            <p className="eyebrow">TWO HEARTS. ONE ROYAL MOMENT.</p>
            <h2>
              Who will wear
              <br />
              the <em>crown?</em>
            </h2>
            <p>
              The dance. The chemistry. The unforgettable presence.
              <br />
              Celebrate the couple who makes the evening their own.
            </p>
            <div className="hero-actions">
              <Link className="button filled" href="/register-couple">
                REGISTER AS A COUPLE <Sparkles size={16} />
              </Link>
              <Link className="button" href="/vote">
                MEET THE COUPLES <Crown size={16} />
              </Link>
            </div>
            <span className="fine">
              YOUR EVENING. YOUR CHOICE. YOUR ROYAL COUPLE.
            </span>
          </div>
        </section>
        <section id="gallery" className="section gallery">
          <div className="section-heading reveal">
            <p className="eyebrow">MOMENTS THAT WILL STAY</p>
            <h2>
              A glimpse of <em>the magic.</em>
            </h2>
            <Ornament />
          </div>
          {gallery.length ? (
            <div className="gallery-grid">
              {gallery.map((g) => (
                <button onClick={() => setLightbox(g.url)} key={g.id}>
                  <img src={g.url} alt={g.caption} />
                  <span>{g.caption}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="gallery-preview reveal">
              <img
                src="/images/ballroom.jpg"
                alt="Chandeliers and candlelit tables — inspiration for the evening"
              />
              <div>
                <Camera size={32} />
                <h3>
                  The best moments
                  <br />
                  are still to come.
                </h3>
                <p>
                  Our evening’s photographs will appear here
                  <br />
                  after the ball, with participant permission.
                </p>
              </div>
              <span>THE ATMOSPHERE · A PREVIEW</span>
            </div>
          )}
        </section>
        <section className="closing reveal">
          <Ornament />
          <p className="eyebrow">YOUR INVITATION TO SOMETHING EXTRAORDINARY</p>
          <h2>
            Shall we <em>dance?</em>
          </h2>
          <p>
            {new Date(s.starts_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Asia/Aqtau",
            })}{" "}
            · {s.location}
          </p>
          <Link className="button filled" href="/register-couple">
            BE PART OF THE MAGIC <Sparkles size={16} />
          </Link>
        </section>
      </main>
      <Footer />
      {lightbox && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Gallery photograph"
          onClick={() => setLightbox(null)}
        >
          <button className="icon close" aria-label="Close photograph">
            <X />
          </button>
          <img className="lightbox" src={lightbox} alt="Ball photograph" />
        </div>
      )}
    </>
  );
}
