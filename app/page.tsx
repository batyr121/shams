"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
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
  X,
} from "lucide-react";
import {
  Header,
  Footer,
  Ornament,
  Countdown,
  useSettings,
} from "@/components/shared";
import { defaultProgram, Program } from "@/lib/db";
import { api } from "@/lib/api";
import { eventDate, eventTime, eventWeekday } from "@/lib/event-time";
const eventPhotos = [
  {
    id: "shamshi-dance-floor",
    url: "/images/shamshi-dance-floor.jpg",
    caption: "Кеш ырғағы",
  },
  {
    id: "shamshi-evening",
    url: "/images/shamshi-evening.jpg",
    caption: "Шәмші Балының сәттері",
  },
];
export default function Home() {
  const [entered, setEntered] = useState(false);
  const [intro, setIntro] = useState(false);
  const [gallery, setGallery] =
    useState<{ id: string; url: string; caption: string }[]>(eventPhotos);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [program, setProgram] = useState<Program[]>(defaultProgram);
  const curtains = useRef<HTMLDivElement>(null);
  const s = useSettings();
  useEffect(() => {
    setIntro(
      !sessionStorage.getItem("ball-entered") &&
        !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".reveal").forEach((el) =>
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
    api<Program[]>("program")
      .then((data) => {
        if (data.length) setProgram(data);
      })
      .catch(() => {});
    api<{ id: string; url: string; caption: string }[]>("gallery")
      .then((data) =>
        setGallery([
          ...eventPhotos,
          ...data.filter(
            (item) => !eventPhotos.some((photo) => photo.url === item.url),
          ),
        ]),
      )
      .catch(() => {});
    return () => ctx.revert();
  }, []);
  useEffect(() => {
    if (!lightbox) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [lightbox]);
  function enter() {
    setEntered(true);
    window.dispatchEvent(new Event("shamshi:enter"));
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
            Кіріспені өткізу
          </button>
          <motion.div
            animate={{ opacity: entered ? 0 : 1 }}
            className="invitation"
          >
            <Crown size={45} />
            <p className="eyebrow">СІЗДІ БАЛҒА ШАҚЫРАМЫЗ</p>
            <h1>
              <span>Шәмші</span>
              Қайырымдылық Балы
              <small>2026</small>
            </h1>
            <Ornament />
            <p>Әдеттегіден ерекше кеш.</p>
            <button className="button filled" onClick={enter}>
              БАЛҒА ҚОШ КЕЛДІҢІЗ <Sparkles size={16} />
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
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.5 }}
            >
              <div className="edition">
                <span /> САЛТАНАТТЫ КЕШ. ҰМЫТЫЛМАС ЕСТЕЛІК. <span />
              </div>
              <Crown className="hero-crown" strokeWidth={1} />
              <h1>
                <span>Шәмші</span>Қайырымдылық Балы<small>2026</small>
              </h1>
              <Ornament />
              <p className="hero-subtitle">
                An Evening of Elegance, Magic & Memories
              </p>
              <div className="hero-date">
                <span>{eventDate(s.starts_at).toUpperCase()}</span>
                <b>✦</b>
                <span>
                  {eventWeekday(s.starts_at).toUpperCase()} ·{" "}
                  {eventTime(s.starts_at)}
                </span>
              </div>
              <div className="hero-actions">
                <Link href="/register-couple" className="button filled">
                  <Ticket size={17} /> ЖҰП БОЛЫП ТІРКЕЛУ
                </Link>
                <Link href="/vote" className="button">
                  <Crown size={17} /> ҮЗДІК ЖҰПҚА ДАУЫС БЕРУ
                </Link>
                <a href="#program" className="button">
                  <Music2 size={17} /> КЕШ БАҒДАРЛАМАСЫ
                </a>
              </div>
            </motion.div>
          </div>
          <a href="#countdown" className="scroll-cue">
            КЕШПЕН ТАНЫСЫҢЫЗ
            <ChevronDown size={18} />
          </a>
          <span className="hero-side">2026 · ЕСТЕ ҚАЛАР СӘТТЕР</span>
        </section>
        <section id="countdown" className="countdown-section reveal">
          <p className="eyebrow">ЕРЕКШЕ КЕШКЕ АЗ ҚАЛДЫ</p>
          <h2>A night worth counting down to.</h2>
          <Countdown />
          <div className="event-meta">
            <span>
              <CalendarDays size={16} />
              {eventDate(s.starts_at)}
            </span>
            <span>
              <MapPin size={16} />
              {s.location}
            </span>
            <span>{eventTime(s.starts_at)} · АҚТАУ УАҚЫТЫ</span>
          </div>
        </section>
        <section id="about" className="about section">
          <div className="about-art reveal">
            <img
              src="/images/shamshi-evening.jpg"
              alt="Шәмші Балының қонақтары би алаңында"
              loading="lazy"
              decoding="async"
            />
            <div className="image-border" />
            <span className="image-caption">
              САЛТАНАТ ПЕН ШАБЫТҚА ТОЛЫ СӘТТЕР.
            </span>
          </div>
          <div className="about-copy reveal">
            <p className="eyebrow">ЖАЙ ҒАНА КЕШ ЕМЕС</p>
            <h2>
              Some nights are
              <br />
              simply <em>unforgettable.</em>
            </h2>
            <Ornament />
            <p>
              Алда — достықты, ізгілікті және әсемдікті тоғыстыратын ерекше кеш.
              Бірге билеп, мектеп жылдарының ең жарқын сәттерін бірге жасайық.
            </p>
            <p>
              {s.description} Сәнді киініп, достарыңызбен келіңіз. Бұл кеш
              сіздің тарихыңызға айналсын.
            </p>
            <a href="#program" className="text-link">
              БАҒДАРЛАМАНЫ ҚАРАУ <span>✧</span>
            </a>
          </div>
        </section>
        <section className="dress-section reveal">
          <span className="deco">✧</span>
          <div>
            <p className="eyebrow">ЕРЕКШЕ КЕШКЕ — ЕРЕКШЕ КИІМ</p>
            <h2>{s.dress_code}</h2>
            <p>Салтанатты киім, алтын реңк және өзіңізге тән әсемдік.</p>
          </div>
          <Crown size={58} strokeWidth={0.7} />
        </section>
        <section id="program" className="section program">
          <div className="section-heading reveal">
            <p className="eyebrow">ӘР СӘТІ ОЙЛАСТЫРЫЛҒАН БАҒДАРЛАМА</p>
            <h2>
              The evening <em>unfolds.</em>
            </h2>
            <Ornament />
            <p>Алғашқы вальстен соңғы биге дейін.</p>
          </div>
          <div className="timeline">
            {program.map((p, i) => (
              <div className="timeline-row reveal" key={i}>
                <time>
                  {p.time}
                  {p.end_time && <>–{p.end_time}</>}
                </time>
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
            Уақыт Ақтау қаласының уақыт белдеуімен көрсетілген (UTC+5).
          </p>
        </section>
        <section className="competition">
          <div className="competition-glow" />
          <div className="reveal">
            <Crown size={49} strokeWidth={1} />
            <p className="eyebrow">ЕКІ ЖҮРЕК. БІР ЕРЕКШЕ СӘТ.</p>
            <h2>
              Who will be the next
              <br />
              <em>KING &amp; QUEEN?</em>
            </h2>
            <p>
              Әсем би. Жарасымды жұп. Ұмытылмас әсер.
              <br />
              Кештің KING & QUEEN атағына лайық жұпты бірге таңдайық.
            </p>
            <div className="hero-actions">
              <Link className="button filled" href="/register-couple">
                ЖҰП БОЛЫП ТІРКЕЛУ <Sparkles size={16} />
              </Link>
              <Link className="button" href="/vote">
                ЖҰПТАРДЫ ҚАРАУ <Crown size={16} />
              </Link>
            </div>
            <span className="fine">
              СЕНІҢ КЕШІҢ. СЕНІҢ ТАҢДАУЫҢ. СЕНІҢ ҮЗДІК ЖҰБЫҢ.
            </span>
          </div>
        </section>
        <section id="gallery" className="section gallery">
          <div className="section-heading reveal">
            <p className="eyebrow">ЕСТЕ ҚАЛАР СӘТТЕР</p>
            <h2>
              A glimpse of <em>the magic.</em>
            </h2>
            <Ornament />
          </div>
          <div className="gallery-grid event-gallery">
            {gallery.map((g) => (
              <button
                key={g.id}
                onClick={() => setLightbox(g.url)}
                aria-label={"Фотосуретті ашу:  " + g.caption}
              >
                <img
                  src={g.url}
                  alt={g.caption}
                  loading="lazy"
                  decoding="async"
                />
                <span>{g.caption}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="closing reveal">
          <Ornament />
          <p className="eyebrow">ЕРЕКШЕ КЕШКЕ ШАҚЫРАМЫЗ</p>
          <h2>
            Shall we <em>dance?</em>
          </h2>
          <p>
            {eventDate(s.starts_at)} · {s.location}
          </p>
          <Link className="button filled" href="/register-couple">
            КЕШКЕ ҚАТЫСУ <Sparkles size={16} />
          </Link>
        </section>
      </main>
      <Footer />
      {lightbox && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Фотогалерея"
          onClick={() => setLightbox(null)}
        >
          <button className="icon close" aria-label="Фотосуретті жабу">
            <X />
          </button>
          <img
            className="lightbox"
            src={lightbox}
            alt="Балдан естелік фотосурет"
          />
        </div>
      )}
    </>
  );
}
