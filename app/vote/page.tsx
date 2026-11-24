"use client";
import { useState, useEffect } from "react";
import { Crown, CheckCircle2, X } from "lucide-react";
import { Header, Footer, PageTitle, useSettings } from "@/components/shared";
import { Couple, photo } from "@/lib/db";
import { api, useBackend } from "@/lib/api";
export default function Vote() {
  const s = useSettings();
  const configured = useBackend();
  const [couples, setCouples] = useState<Couple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [selected, setSelected] = useState<Couple | null>(null);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [results, setResults] = useState<
    { couple_id: string; votes: number }[]
  >([]);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api<Couple[]>("couples")
        .then((data) => {
          if (active) setCouples(data);
        })
        .catch((e) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (s.results_published)
      api<{ couple_id: string; votes: number }[]>("results")
        .then(setResults)
        .catch((e) => setError(e.message));
  }, [s.results_published]);
  useEffect(() => {
    if (!selected) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setSelected(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selected, busy]);
  async function vote() {
    setBusy(true);
    setError("");
    try {
      await api("vote", {
        method: "POST",
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          couple: selected!.id,
        }),
      });
      setSuccess(true);
      setSelected(null);
      setCode("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Дауыс жіберілмеді. Қайта көріңіз.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header />
      <main className="page-shell">
        <PageTitle
          eyebrow="КЕШТІҢ ҮЗДІК ЖҰБЫН ӨЗІҢ ТАҢДА"
          title="KING & QUEEN"
          sub="Кештің KING & QUEEN атағына лайық жұпқа дауыс бер."
        />
        {success ? (
          <div className="empty notice success">
            <CheckCircle2 size={48} />
            <h2>Your vote is in!</h2>
            <p>Дауысыңыз қабылданды. Қатысқаныңызға рақмет!</p>
          </div>
        ) : (
          <>
            {!configured && (
              <div className="empty">
                <Crown />
                <h3>The royal line-up is on its way.</h3>
                <p>
                  Ұйымдастырушы тіркелу мен дауыс беруді дайындап жатыр.
                  Кейінірек қайта кіріңіз.
                </p>
              </div>
            )}
            {configured && s.voting_status !== "open" && (
              <div
                className="notice"
                style={{
                  maxWidth: 700,
                  margin: "20px auto",
                  textAlign: "center",
                }}
              >
                {s.voting_status === "paused"
                  ? "Дауыс беру уақытша тоқтатылды."
                  : "Дауыс беру жабық."}{" "}
                {s.voting_status === "paused"
                  ? "Ұйымдастырушы дауыс беруді жақында жалғастырады."
                  : "Ұйымдастырушының хабарландыруын күтіңіз."}
              </div>
            )}
            {configured && s.voting_status === "open" && (
              <div className="vote-code">
                <label htmlFor="guest-code">
                  ҚОНАҚТЫҢ БІР РЕТТІК КОДЫ
                  <input
                    id="guest-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="МЫСАЛЫ: A7K3"
                    minLength={4}
                    maxLength={20}
                    autoCapitalize="characters"
                    spellCheck={false}
                    autoComplete="off"
                  />
                </label>
                <p className="fine">
                  Ұйымдастырушы берген 4 таңбалы кодты енгізіңіз, фотосуреттен
                  жұпты таңдап, дауысыңызды растаңыз. Дауыс қабылданғаннан кейін
                  код жарамсыз болады.
                </p>
              </div>
            )}
            {loading && <p className="fine">Жұптар тізімі жүктелуде…</p>}
            {configured && !loading && !couples.length && (
              <div className="empty">
                <Crown />
                <h3>The stage awaits its couples.</h3>
                <p>Мақұлданған жұптар осы жерде көрсетіледі.</p>
              </div>
            )}
            <div className="couples-grid">
              {couples.map((c) => (
                <article className="couple" key={c.id}>
                  {c.photo_path && (
                    <img
                      src={photo(c.photo_path)}
                      alt={`${c.first_name} and ${c.second_name}`}
                    />
                  )}
                  <p className="eyebrow">
                    ЖҰП №{String(c.number).padStart(2, "0")}
                  </p>
                  <h3>
                    {c.first_name} & {c.second_name}
                  </h3>
                  <p>{c.group_name}</p>
                  {s.results_published && (
                    <p>
                      {results.find((r) => r.couple_id === c.id)?.votes || 0}{" "}
                      расталған дауыс
                    </p>
                  )}
                  <button
                    className="button"
                    disabled={
                      s.voting_status !== "open" ||
                      !/^(?:[A-Z0-9]{4}|[A-F0-9]{20})$/.test(code.trim())
                    }
                    onClick={() => {
                      setError("");
                      setSelected(c);
                    }}
                  >
                    ДАУЫС БЕРУ <Crown size={15} />
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        {error && !selected && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
      </main>
      <Footer />
      {selected && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
        >
          <div className="dialog">
            <Crown size={40} />
            <h2 id="confirm-title">Your royal choice</h2>
            <p>Осы жұпқа дауыс бергіңіз келетініне сенімдісіз бе?</p>
            <h3>
              {selected.first_name} & {selected.second_name}
            </h3>
            <p>
              Дауысты өзгерту мүмкін емес. Қонақ коды бір рет қана қолданылады.
            </p>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button
              autoFocus
              className="button filled"
              disabled={busy}
              onClick={vote}
            >
              {busy ? "ЖІБЕРІЛУДЕ…" : "ДАУЫСТЫ РАСТАУ"}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              БАС ТАРТУ
            </button>
          </div>
        </div>
      )}
    </>
  );
}
