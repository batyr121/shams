"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Volume2, VolumeX, Music2 } from "lucide-react";
const preferenceKey = "shamshi-music";
function preference() {
  try {
    return localStorage.getItem(preferenceKey);
  } catch {
    return null;
  }
}
function remember(value: string) {
  try {
    localStorage.setItem(preferenceKey, value);
  } catch {}
}
export function MusicPlayer() {
  const pathname = usePathname();
  const protectedPage =
    pathname.startsWith("/admin") || pathname.startsWith("/screen");
  const audio = useRef<HTMLAudioElement>(null);
  const allowed = useRef(!protectedPage);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const play = useCallback(async () => {
    const media = audio.current;
    if (!media || !allowed.current) return;
    setError("");
    setLoading(true);
    media.volume = 0.18;
    try {
      await media.play();
      if (!allowed.current) media.pause();
    } catch (e) {
      if (
        allowed.current &&
        (!(e instanceof DOMException) || e.name !== "AbortError")
      )
        setError("Әуен қосылмады. Қайта басып көріңіз.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    allowed.current = !protectedPage;
    if (protectedPage) {
      audio.current?.pause();
      setLoading(false);
    }
  }, [protectedPage]);
  useEffect(() => {
    const enter = () => {
      if (preference() !== "muted") void play();
    };
    window.addEventListener("shamshi:enter", enter);
    return () => {
      window.removeEventListener("shamshi:enter", enter);
      audio.current?.pause();
    };
  }, [play]);
  function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused) {
      audio.current.pause();
      remember("muted");
      return;
    }
    remember("enabled");
    void play();
  }
  return (
    <>
      <audio
        ref={audio}
        src="/audio/bakyt-qushagynda.mp3"
        preload="none"
        loop
        onPlaying={() => {
          setPlaying(true);
          setLoading(false);
        }}
        onPause={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setLoading(false);
          if (allowed.current)
            setError("Әуен уақытша қолжетімсіз. Қайта көріңіз.");
        }}
      />
      {!protectedPage && (
        <div className="music-player">
          <button
            type="button"
            className={playing ? "music-toggle is-playing" : "music-toggle"}
            onClick={toggle}
            disabled={loading}
            aria-pressed={playing}
            aria-busy={loading}
            aria-label={playing ? "Музыканы өшіру" : "Музыканы қосу"}
            title="Бақыт құшағында · Шәмші Қалдаяқов & Расул Жармағамбетов"
          >
            {playing ? <Volume2 size={19} /> : <VolumeX size={19} />}
            <span>
              <strong>
                {loading
                  ? "Әуен жүктелуде…"
                  : playing
                    ? "Бақыт құшағында"
                    : "Әуенді қосу"}
              </strong>
              <small>{playing ? "МУЗЫКАНЫ ӨШІРУ" : "ШӘМШІ ӘУЕНІМЕН"}</small>
            </span>
            {playing ? (
              <span className="music-bars" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            ) : (
              <Music2 size={16} className="music-note" />
            )}
          </button>
          {error && (
            <p className="music-error" role="status">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
