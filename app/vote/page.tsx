"use client";
import { useState, useEffect } from "react";
import { Crown, CheckCircle2, X } from "lucide-react";
import { Header, Footer, PageTitle, useSettings } from "@/components/shared";
import { db, client, Couple, photo, configured } from "@/lib/db";
export default function Vote() {
  const s = useSettings();
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
    if (!db) {
      setLoading(false);
      return;
    }
    db.from("approved_couples")
      .select("*")
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setCouples(data || []);
        setLoading(false);
      });
  }, []);
  useEffect(() => {
    if (s.results_published && db)
      db.rpc("public_results").then(({ data }) => setResults(data || []));
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
      const { error } = await client().rpc("cast_vote", {
        p_code: code.trim().toUpperCase(),
        p_couple: selected!.id,
      });
      if (error) throw error;
      setSuccess(true);
      setSelected(null);
      setCode("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your vote could not be submitted.",
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
          eyebrow="THE CROWN IS IN YOUR HANDS"
          title="ЛУЧШАЯ ПАРА БАЛА"
          sub="Выбери пару, которая заслуживает короны вечера"
        />
        {success ? (
          <div className="empty notice success">
            <CheckCircle2 size={48} />
            <h2>ВАШ ГОЛОС УЧТЁН!</h2>
            <p>Thank you for being part of the magic.</p>
          </div>
        ) : (
          <>
            {!configured && (
              <div className="empty">
                <Crown />
                <h3>The royal line-up is on its way.</h3>
                <p>
                  The organizer is preparing registrations and voting. Please
                  check back soon.
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
                Voting is {s.voting_status}.{" "}
                {s.voting_status === "paused"
                  ? "The organizer will resume voting shortly."
                  : "Please wait for the organizer’s announcement."}
              </div>
            )}
            {configured && s.voting_status === "open" && (
              <div className="vote-code">
                <label htmlFor="guest-code">
                  YOUR ONE-TIME GUEST CODE
                  <input
                    id="guest-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="ENTER YOUR TICKET CODE"
                    minLength={12}
                    maxLength={64}
                    autoComplete="off"
                  />
                </label>
                <p className="fine">
                  Find your personal code on your guest ticket. One guest. One
                  vote.
                </p>
              </div>
            )}
            {loading && <p className="fine">Preparing the royal line-up…</p>}
            {configured && !loading && !couples.length && (
              <div className="empty">
                <Crown />
                <h3>The stage awaits its couples.</h3>
                <p>Approved entries will appear here.</p>
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
                    COUPLE №{String(c.number).padStart(2, "0")}
                  </p>
                  <h3>
                    {c.first_name} & {c.second_name}
                  </h3>
                  <p>{c.group_name}</p>
                  {s.results_published && (
                    <p>
                      {results.find((r) => r.couple_id === c.id)?.votes || 0}{" "}
                      validated votes
                    </p>
                  )}
                  <button
                    className="button"
                    disabled={
                      s.voting_status !== "open" || code.trim().length < 12
                    }
                    onClick={() => {
                      setError("");
                      setSelected(c);
                    }}
                  >
                    ГОЛОСОВАТЬ <Crown size={15} />
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
            <p>Вы уверены, что хотите проголосовать за эту пару?</p>
            <h3>
              {selected.first_name} & {selected.second_name}
            </h3>
            <p>This vote is final. Your guest code can be used only once.</p>
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
              {busy ? "SUBMITTING…" : "Подтвердить голос"}
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </>
  );
}
