"use client";
import { useState, useEffect } from "react";
import QRCode from "qrcode";
export function QRTools({ screen = false }: { screen?: boolean }) {
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const u = window.location.origin + "/vote";
    setUrl(u);
    Promise.all([
      QRCode.toDataURL(u, {
        width: 1200,
        margin: 3,
        errorCorrectionLevel: "M",
      }),
      QRCode.toString(u, { type: "svg", margin: 3, errorCorrectionLevel: "M" }),
    ])
      .then(([p, s]) => {
        setPng(p);
        setSvg(s);
      })
      .catch(() => setError("QR generation failed. Please reload."));
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
          alt="Scan to open the Grand Ball voting page"
        />
      )}
      {!screen && (
        <>
          <p style={{ textAlign: "center", wordBreak: "break-all" }}>{url}</p>
          <div className="actions">
            <a className="button" href={png} download="grand-ball-vote.png">
              DOWNLOAD PNG
            </a>
            <button className="button" onClick={downloadSvg}>
              DOWNLOAD SVG
            </button>
            <a
              className="button"
              href="/screen/qr"
              target="_blank"
              rel="noreferrer"
            >
              OPEN PRESENTATION
            </a>
            <button className="button" onClick={() => window.print()}>
              PRINT QR POSTER
            </button>
          </div>
          {url.startsWith("http:") && (
            <p className="notice">
              Local preview QR. Deploy on HTTPS to generate the guest-facing QR.
            </p>
          )}
        </>
      )}
    </>
  );
}
