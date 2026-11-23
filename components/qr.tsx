"use client";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { api } from "@/lib/api";
export function QRTools({ screen = false }: { screen?: boolean }) {
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function generate() {
      let u = window.location.origin + "/vote";
      try {
        const event = await api<{ voting_url: string }>("event");
        if (event.voting_url) u = event.voting_url;
      } catch {}
      const [p, s] = await Promise.all([
        QRCode.toDataURL(u, {
          width: 1200,
          margin: 4,
          errorCorrectionLevel: "M",
        }),
        QRCode.toString(u, {
          type: "svg",
          margin: 4,
          errorCorrectionLevel: "M",
        }),
      ]);
      if (active) {
        setUrl(u);
        setPng(p);
        setSvg(s);
      }
    }
    generate().catch(() => {
      if (active) setError("QR-код жасалмады. Бетті жаңартыңыз.");
    });
    return () => {
      active = false;
    };
  }, []);
  function downloadSvg() {
    const u = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const a = document.createElement("a");
    a.href = u;
    a.download = "grand-ball-vote.svg";
    a.click();
    setTimeout(() => URL.revokeObjectURL(u), 1000);
  }
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {png && (
        <img
          className={screen ? "qr-image" : "qr-preview"}
          src={png}
          alt="Дауыс беруге арналған QR-код — Шәмші Қайырымдылық Балы 2026"
        />
      )}
      {screen && url && (
        <span className="qr-destination">{new URL(url).host}/vote</span>
      )}
      {!screen && (
        <>
          <p style={{ textAlign: "center", wordBreak: "break-all" }}>{url}</p>
          <div className="actions">
            <a className="button" href={png} download="grand-ball-vote.png">
              PNG ЖҮКТЕУ
            </a>
            <button className="button" onClick={downloadSvg}>
              SVG ЖҮКТЕУ
            </button>
            <a
              className="button"
              href="/screen/qr"
              target="_blank"
              rel="noreferrer"
            >
              ЭКРАНДЫ АШУ
            </a>
            <button className="button" onClick={() => window.print()}>
              QR-КОДТЫ БАСЫП ШЫҒАРУ
            </button>
          </div>
          {url.startsWith("http:") && (
            <p className="notice">
              Жергілікті QR-кодты ашу үшін телефонды компьютермен бір Wi-Fi
              желісіне қосыңыз. Басқа желідегі қонақтар үшін сайтты HTTPS
              доменінде жариялау қажет.
            </p>
          )}
        </>
      )}
    </>
  );
}
