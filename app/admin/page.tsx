"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  LayoutDashboard,
  Users,
  Vote,
  BarChart3,
  QrCode,
  Settings,
  Image,
  Monitor,
  LogOut,
  Ticket,
  CheckCircle2,
} from "lucide-react";
import {
  Couple,
  defaults,
  Settings as SettingsType,
  Program,
  defaultProgram,
} from "@/lib/db";
import { PageTitle } from "@/components/shared";
import { QRTools } from "@/components/qr";
import { api, command, uploadPhoto, useBackend } from "@/lib/api";
const tabLabels: Record<string, string> = {
  Dashboard: "Басқару тақтасы",
  "Couple Applications": "Жұптардың өтінімдері",
  "Approved Couples": "Мақұлданған жұптар",
  "Voting Management": "Дауыс беруді басқару",
  "Voting Results": "Дауыс беру нәтижелері",
  "QR Generator": "QR-код жасау",
  "Event Settings": "Кеш баптаулары",
  "Screen Presentation": "Зал экраны",
  "Photo Gallery": "Фотогалерея",
};
const statusLabel = (status: string) =>
  ({
    open: "АШЫҚ",
    closed: "ЖАБЫҚ",
    paused: "УАҚЫТША ТОҚТАТЫЛҒАН",
    pending: "Күтуде",
    approved: "Мақұлданған",
    rejected: "Қабылданбаған",
  })[status] || status;
const tabs = [
  ["Dashboard", LayoutDashboard],
  ["Couple Applications", Users],
  ["Approved Couples", Crown],
  ["Voting Management", Vote],
  ["Voting Results", BarChart3],
  ["QR Generator", QrCode],
  ["Event Settings", Settings],
  ["Screen Presentation", Monitor],
  ["Photo Gallery", Image],
] as const;
export default function Admin() {
  const configured = useBackend();
  const [auth, setAuth] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState("Dashboard");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [couples, setCouples] = useState<Couple[]>([]);
  const [settings, setSettings] = useState<SettingsType>(defaults);
  const [results, setResults] = useState<
    { couple_id: string; votes: number }[]
  >([]);
  const [tickets, setTickets] = useState<
    { id: string; used_at: string | null; revoked: boolean }[]
  >([]);
  const [codes, setCodes] = useState<string[]>([]);
  const [program, setProgram] = useState<Program[]>([]);
  const [gallery, setGallery] = useState<
    { id: string; url: string; caption: string }[]
  >([]);
  const [editing, setEditing] = useState<Couple | null>(null);
  const [add, setAdd] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const refresh = useCallback(async (full = true) => {
    const data = await api<{
      couples: Couple[];
      settings: SettingsType;
      results: { couple_id: string; votes: number }[];
      tickets: { id: string; used_at: string | null; revoked: boolean }[];
      program: Program[];
      gallery: { id: string; url: string; caption: string }[];
    }>("admin/data");
    setCouples(data.couples);
    setSettings(data.settings);
    setResults(data.results);
    setTickets(data.tickets);
    if (full) setProgram(data.program);
    setGallery(data.gallery);
  }, []);
  const verify = useCallback(async () => {
    try {
      const data = await api<{ user: { id: string; email: string } | null }>(
        "auth/session",
      );
      setAuth(Boolean(data.user));
    } catch {
      setAuth(false);
    } finally {
      setChecking(false);
    }
  }, []);
  useEffect(() => {
    verify();
  }, [verify]);
  useEffect(() => {
    if (!auth) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => refresh(false).catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [auth, refresh]);
  useEffect(() => {
    if (window.location.pathname.includes("results")) setTab("Voting Results");
  }, []);
  async function action(
    fn: () => Promise<unknown>,
    msg = "Өзгерістер сақталды.",
  ) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
      setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Әрекет орындалмады.");
    } finally {
      setBusy(false);
    }
  }
  async function rpc<T = unknown>(
    name: string,
    args: Record<string, unknown> = {},
  ) {
    return command<T>(name, args);
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(f.get("email")),
          password: String(f.get("password")),
        }),
      });
      await verify();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Кіру мүмкін болмады.");
    } finally {
      setBusy(false);
    }
  }
  const total = results.reduce((a, r) => a + Number(r.votes), 0);
  const approved = couples.filter((c) => c.status === "approved");
  const pending = couples.filter((c) => c.status === "pending");
  function status(value: string) {
    action(() => rpc("set_event_state", { p_patch: { voting_status: value } }));
  }
  async function saveCouple(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    await action(async () => {
      await rpc("admin_save_couple", {
        p_id: editing?.id || null,
        p_data: {
          first_name: f.get("first"),
          second_name: f.get("second"),
          group_name: f.get("group"),
          couple_name: f.get("name"),
          contact: f.get("contact"),
          sort_order: Number(f.get("order")),
          photo_path: editing?.photo_path || "",
          status: editing?.status || "pending",
        },
      });
      setEditing(null);
      setAdd(false);
    });
  }
  if (checking)
    return (
      <main className="screen">
        <p> Ұйымдастырушының рұқсаты тексерілуде… </p>
      </main>
    );
  if (!auth)
    return (
      <main className="page-shell">
        <PageTitle
          eyebrow="ҰЙЫМДАСТЫРУШЫЛАРҒА АРНАЛҒАН"
          title="Organizer Access"
          sub="Кешті, қатысушыларды және дауыс беруді басқару."
        />
        <div className="form-panel">
          {!configured && (
            <div className="notice">
              {" "}
              Ұйымдастырушы бөліміне кіру үшін сервердің дерекқорға қосылуын
              тексеріңіз.{" "}
            </div>
          )}
          <form onSubmit={login}>
            <label className="form-field">
              {" "}
              Email мекенжайы{" "}
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label className="form-field" style={{ marginTop: 20 }}>
              {" "}
              Құпиясөз{" "}
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                minLength={8}
                required
              />
            </label>
            {error && (
              <div className="notice error" role="alert">
                {error}
              </div>
            )}
            <button className="button filled" disabled={!configured || busy}>
              {busy ? "КІРУДЕ…" : "КІРУ"}
            </button>
          </form>
          <p className="admin-login-help">
            Ұйымдастырушының email мекенжайы мен құпиясөзін енгізіңіз.
            Жергілікті іске қосу деректері құпия файлда сақталған:{" "}
            <code>.env.local</code> жоба қалтасында.
          </p>
          <Link className="text-link" href="/">
            {" "}
            САЙТҚА ОРАЛУ{" "}
          </Link>
        </div>
      </main>
    );
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <Crown />
          <span>
            Шәмші Қайырымдылық Балы 2026<small> ҰЙЫМДАСТЫРУШЫ БӨЛІМІ </small>
          </span>
        </Link>
        <nav>
          {tabs.map(([name, Icon]) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setMessage("");
                setError("");
              }}
            >
              <Icon />
              {tabLabels[name] || name}
            </button>
          ))}
          <button
            onClick={async () => {
              try {
                await api("auth/logout", { method: "POST" });
                setAuth(false);
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Шығу мүмкін болмады.",
                );
              }
            }}
          >
            <LogOut /> Шығу{" "}
          </button>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">
              Шәмші Қайырымдылық Балы 2026 · ҰЙЫМДАСТЫРУШЫ БӨЛІМІ
            </p>
            <h1>{tab}</h1>
            <p>
              {" "}
              {new Date(settings.starts_at).toLocaleString("kk-KZ", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Aqtau",
              })}{" "}
              · Ақтау уақыты{" "}
            </p>
          </div>
          <span className="button small">
            {" "}
            ДАУЫС БЕРУ {statusLabel(settings.voting_status)}
          </span>
        </div>
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        <fieldset
          disabled={busy}
          style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        >
          {tab === "Dashboard" && (
            <>
              <div className="stats">
                {[
                  [couples.length, "БАРЛЫҚ ЖҰПТАР"],
                  [pending.length, "КҮТУДЕГІ ӨТІНІМДЕР"],
                  [approved.length, "МАҚҰЛДАНҒАН ЖҰПТАР"],
                  [total, "РАСТАЛҒАН ДАУЫСТАР"],
                ].map(([n, label]) => (
                  <div className="stat" key={label}>
                    <strong>{n}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
              <div className="admin-panel">
                <h2>An extraordinary evening, under control.</h2>
                <p>
                  {" "}
                  Өтінімдерді тексеріп, қонақтарға жеке код таратыңыз және кеш
                  басталғанда дауыс беруді ашыңыз.{" "}
                </p>
                <div className="actions">
                  <button
                    className="button"
                    onClick={() => setTab("Couple Applications")}
                  >
                    {" "}
                    ТЕКСЕРУ: {pending.length} ӨТІНІМ{" "}
                  </button>
                  <button
                    className="button"
                    onClick={() => setTab("Voting Management")}
                  >
                    {" "}
                    ДАУЫС БЕРУДІ БАСҚАРУ{" "}
                  </button>
                  <Link className="button" href="/screen/qr" target="_blank">
                    {" "}
                    ЭКРАН 16:9{" "}
                  </Link>
                </div>
                <p>
                  {" "}
                  Қонақ билеттері: {tickets.length} берілді ·{" "}
                  {tickets.filter((t) => t.used_at).length} қолданылды ·{" "}
                  {tickets.filter((t) => t.revoked).length} қайтарып
                  алынды.{" "}
                </p>
              </div>
            </>
          )}
          {(tab === "Couple Applications" || tab === "Approved Couples") && (
            <div className="admin-panel">
              <div className="actions">
                <button
                  className="button filled"
                  onClick={() => {
                    setAdd(true);
                    setEditing(null);
                  }}
                >
                  {" "}
                  ЖҰПТЫ ҚОЛМЕН ҚОСУ{" "}
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th> ЖҰП </th>
                      <th> СЫНЫП </th>
                      <th> МӘРТЕБЕ </th>
                      <th> БАЙЛАНЫС </th>
                      <th> ӘРЕКЕТТЕР </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tab === "Approved Couples" ? approved : couples).map(
                      (c) => (
                        <tr key={c.id}>
                          <td>
                            #{c.number || "—"} {c.first_name} & {c.second_name}
                          </td>
                          <td>{c.group_name}</td>
                          <td>{statusLabel(c.status)}</td>
                          <td>{c.contact}</td>
                          <td>
                            {c.status !== "approved" && (
                              <button
                                onClick={() =>
                                  action(async () => {
                                    await rpc("moderate_couple", {
                                      p_id: c.id,
                                      p_status: "approved",
                                    });
                                  }, "Жұп мақұлданып, жарияланды.")
                                }
                              >
                                {" "}
                                Мақұлдау{" "}
                              </button>
                            )}
                            {c.photo_path && (
                              <button
                                onClick={() =>
                                  action(async () => {
                                    setPhotoPreview(
                                      "/api/media/" + c.photo_path,
                                    );
                                  }, "Жеке фотосурет тек жүйеге кірген ұйымдастырушыға көрінеді.")
                                }
                              >
                                {" "}
                                Фотосуретті қарау{" "}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(c);
                                setAdd(true);
                              }}
                            >
                              {" "}
                              Өзгерту{" "}
                            </button>
                            <button
                              onClick={() =>
                                action(() =>
                                  rpc("moderate_couple", {
                                    p_id: c.id,
                                    p_status: "rejected",
                                  }),
                                )
                              }
                            >
                              {" "}
                              Қабылдамау{" "}
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Осы өтінімді жою керек пе? Дауыс жиналған жұптарды жою мүмкін емес.",
                                  )
                                )
                                  action(() =>
                                    rpc("delete_couple", { p_id: c.id }),
                                  );
                              }}
                            >
                              {" "}
                              Жою{" "}
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {!couples.length && <p> Әзірге өтінім жоқ. </p>}
            </div>
          )}
          {tab === "Voting Management" && (
            <>
              <div className="admin-panel">
                <h2>The voting floor</h2>
                <p>
                  {" "}
                  Дауыс беруді ашыңыз, үзіліс жасаңыз немесе жабыңыз.
                  Жеңімпаздарды жариялар алдында дауыс беруді жабу қажет.{" "}
                </p>
                <p role="status">
                  Қазіргі мәртебе: {statusLabel(settings.voting_status)}
                </p>
                <div className="actions">
                  <button
                    className="button filled"
                    disabled={busy || settings.voting_status === "open"}
                    onClick={() => status("open")}
                  >
                    {settings.voting_status === "paused"
                      ? "ДАУЫС БЕРУДІ ЖАЛҒАСТЫРУ"
                      : "ДАУЫС БЕРУДІ АШУ"}
                  </button>
                  <button
                    className="button"
                    disabled={busy || settings.voting_status !== "open"}
                    onClick={() => status("paused")}
                  >
                    {" "}
                    УАҚЫТША ТОҚТАТУ{" "}
                  </button>
                  <button
                    className="button"
                    disabled={busy || settings.voting_status === "closed"}
                    onClick={() => status("closed")}
                  >
                    {" "}
                    ДАУЫС БЕРУДІ ЖАБУ{" "}
                  </button>
                </div>
              </div>
              <div className="admin-panel">
                <h2>One code. One vote.</h2>
                <p>
                  {" "}
                  Әр код 4 таңбадан тұрады: латын әріптері мен сандар. Кодтар
                  қайталанбайды. Қонақ дауысын растағаннан кейін код жарамсыз
                  болады. Кодтар тек жасалған кезде көрсетіледі — оларды бірден
                  жүктеп алыңыз.{" "}
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(async () => {
                      setCodes(
                        await rpc<string[]>("generate_tickets", {
                          p_count: Number(f.get("count")),
                        }),
                      );
                    }, "4 таңбалы кодтар жасалды. Оларды қазір сақтап алыңыз.");
                  }}
                >
                  <div className="actions">
                    <input
                      name="count"
                      aria-label="Жасалатын кодтар саны"
                      type="number"
                      min={1}
                      max={500}
                      defaultValue={50}
                      style={{ maxWidth: 120 }}
                      required
                    />
                    <button className="button filled" disabled={busy}>
                      {busy ? "ЖАСАЛУДА…" : "4 ТАҢБАЛЫ КОДТАР ЖАСАУ"}
                    </button>
                  </div>
                </form>
                <p>
                  {tickets.filter((t) => t.used_at).length} қолданылды, барлығы{" "}
                  {tickets.length} билет.{" "}
                </p>
                {codes.length > 0 && (
                  <>
                    <div className="actions">
                      <button
                        className="button"
                        onClick={() => {
                          const a = document.createElement("a");
                          a.href = URL.createObjectURL(
                            new Blob(["code\n" + codes.join("\n")], {
                              type: "text/csv",
                            }),
                          );
                          a.download = "grand-ball-private-tickets.csv";
                          a.click();
                          URL.revokeObjectURL(a.href);
                        }}
                      >
                        {" "}
                        КОДТАРДЫ CSV ТҮРІНДЕ ЖҮКТЕУ{" "}
                      </button>
                      <button className="button" onClick={() => window.print()}>
                        {" "}
                        БИЛЕТТЕРДІ БАСЫП ШЫҒАРУ{" "}
                      </button>
                    </div>
                    <div className="ticket-sheet">
                      {codes.map((c) => (
                        <div className="ticket" key={c}>
                          <Crown style={{ margin: "auto" }} size={20} />
                          <small>
                            Шәмші Қайырымдылық Балы 2026 · БІР ҚОНАҚ — БІР ДАУЫС
                          </small>
                          <strong>{c}</strong>
                          <small>
                            {" "}
                            Кештің QR-кодын сканерлеңіз немесе мына сілтемеге
                            кіріңіз:{" "}
                            {typeof window !== "undefined"
                              ? window.location.origin + "/vote"
                              : ""}{" "}
                            . Бұл кодты ешкімге бермеңіз.{" "}
                          </small>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th> БИЛЕТ ID </th>
                        <th> МӘРТЕБЕ </th>
                        <th> ӘРЕКЕТ </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td>{t.id.slice(0, 8)}</td>
                          <td>
                            {t.used_at
                              ? "Қолданылған"
                              : t.revoked
                                ? "Қайтарылған"
                                : "Қолданылмаған"}
                          </td>
                          <td>
                            {!t.used_at && !t.revoked && (
                              <button
                                onClick={() =>
                                  action(() =>
                                    rpc("revoke_ticket", { p_id: t.id }),
                                  )
                                }
                              >
                                {" "}
                                Қайтарып алу{" "}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          {tab === "Voting Results" && (
            <div className="admin-panel">
              <h2>The evening’s royal ranking</h2>
              <p>
                {total} расталған дауыс · {approved.length} жұп · әр 5 секунд
                сайын жаңартылады{" "}
              </p>
              {[...results]
                .sort((a, b) => b.votes - a.votes)
                .map((r, i) => {
                  const c = couples.find((c) => c.id === r.couple_id);
                  return (
                    <div className="bar-row" key={r.couple_id}>
                      <div>
                        <span>
                          {i + 1}. {c?.first_name} & {c?.second_name}
                        </span>
                        <span>
                          {r.votes} дауыс ·{" "}
                          {total ? Math.round((r.votes / total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="bar">
                        <i
                          style={{
                            width: `${total ? (r.votes / total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              {total === 0 && <p> Әзірге дауыс берілген жоқ. </p>}
              <div className="actions">
                <button
                  className="button"
                  onClick={() =>
                    action(() =>
                      rpc("set_event_state", {
                        p_patch: {
                          results_published: !settings.results_published,
                        },
                      }),
                    )
                  }
                >
                  {settings.results_published
                    ? "НӘТИЖЕЛЕРДІ ЖАСЫРУ"
                    : "НӘТИЖЕЛЕРДІ ЖАРИЯЛАУ"}
                </button>
                <button
                  className="button filled"
                  disabled={settings.voting_status !== "closed" || total === 0}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Расталған нәтижелерді жариялап, жеңімпазды көрсету керек пе?",
                      )
                    )
                      action(
                        () => rpc("announce_winners"),
                        "Жеңімпазды көрсету басталды.",
                      );
                  }}
                >
                  ЖЕҢІМПАЗДАРДЫ ЖАРИЯЛАУ
                </button>
              </div>
              <p>
                {" "}
                Дауыстар тең болса, атақ ортақ беріледі. Қосымша шешім қажет
                болса, оның жарияланған тәртібін жазып, дауысы тең жұптардың
                бірін таңдаңыз.{" "}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  action(() =>
                    rpc("set_tiebreak", {
                      p_couple: f.get("couple"),
                      p_reason: f.get("reason"),
                    }),
                  );
                }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    {" "}
                    Қосымша шешім бойынша жеңімпаз{" "}
                    <select name="couple" required>
                      <option value="">Дауысы тең жұпты таңдаңыз</option>
                      {results
                        .filter(
                          (r) =>
                            r.votes ===
                              Math.max(...results.map((x) => x.votes)) &&
                            r.votes > 0,
                        )
                        .map((r) => {
                          const c = couples.find((c) => c.id === r.couple_id);
                          return (
                            <option key={r.couple_id} value={r.couple_id}>
                              {c?.first_name} & {c?.second_name}
                            </option>
                          );
                        })}
                    </select>
                  </label>
                  <label className="form-field">
                    {" "}
                    Жарияланған қосымша шешім тәртібі{" "}
                    <input
                      name="reason"
                      minLength={15}
                      required
                      placeholder="Мысалы: қонақтарға жарияланған қазылар шешімі"
                    />
                  </label>
                </div>
                <button className="button"> ҚОСЫМША ШЕШІМДІ САҚТАУ </button>
              </form>
            </div>
          )}
          {tab === "QR Generator" && (
            <div className="admin-panel">
              <h2>QR Code Generator</h2>
              <p>
                {" "}
                Бұл QR-код дауыс беру бетін ашады. Дауыс беру үшін әр қонаққа
                жеке билет коды қажет.{" "}
              </p>
              <QRTools />
            </div>
          )}
          {tab === "Event Settings" && (
            <>
              <div className="admin-panel">
                <h2>The details that make the evening</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(() =>
                      rpc("set_event_state", {
                        p_patch: {
                          starts_at: String(f.get("starts")) + ":00+05:00",
                          location: f.get("location"),
                          description: f.get("description"),
                          dress_code: f.get("dress"),
                          registration_deadline:
                            String(f.get("deadline")) + ":00+05:00",
                          registration_open: f.get("open") === "on",
                        },
                      }),
                    );
                  }}
                >
                  <div className="form-grid">
                    <label className="form-field">
                      {" "}
                      Басталу уақыты · Ақтау (UTC+5){" "}
                      <input
                        name="starts"
                        type="datetime-local"
                        required
                        defaultValue={new Date(
                          new Date(settings.starts_at).getTime() + 18000000,
                        )
                          .toISOString()
                          .slice(0, 16)}
                      />
                    </label>
                    <label className="form-field">
                      {" "}
                      Тіркелудің соңғы уақыты · Ақтау{" "}
                      <input
                        name="deadline"
                        type="datetime-local"
                        required
                        defaultValue={new Date(
                          new Date(settings.registration_deadline).getTime() +
                            18000000,
                        )
                          .toISOString()
                          .slice(0, 16)}
                      />
                    </label>
                    <label className="form-field">
                      {" "}
                      Өтетін орын{" "}
                      <input
                        name="location"
                        defaultValue={settings.location}
                        required
                        maxLength={200}
                      />
                    </label>
                    <label className="form-field">
                      {" "}
                      Киім үлгісі{" "}
                      <input
                        name="dress"
                        defaultValue={settings.dress_code}
                        required
                        maxLength={200}
                      />
                    </label>
                    <label className="form-field full">
                      {" "}
                      Сипаттама{" "}
                      <textarea
                        name="description"
                        defaultValue={settings.description}
                        required
                        maxLength={2000}
                      />
                    </label>
                  </div>
                  <label className="check">
                    <input
                      name="open"
                      type="checkbox"
                      defaultChecked={settings.registration_open}
                    />{" "}
                    Тіркелу ашық{" "}
                  </label>
                  <button className="button filled">
                    {" "}
                    БАПТАУЛАРДЫ САҚТАУ{" "}
                  </button>
                </form>
              </div>
              <div className="admin-panel">
                <h2>Evening program</h2>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(() =>
                      rpc("save_program", {
                        p_items: program.map((p, i) => ({
                          time: f.get("time" + i),
                          end_time: f.get("end" + i) || null,
                          title: f.get("title" + i),
                          description: f.get("desc" + i),
                          sort_order: i,
                        })),
                      }),
                    );
                  }}
                >
                  {program.map((p, i) => (
                    <div
                      className="form-grid"
                      key={i}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        paddingBottom: 20,
                      }}
                    >
                      <label className="form-field">
                        {" "}
                        Басталу уақыты{" "}
                        <input
                          name={"time" + i}
                          type="time"
                          defaultValue={p.time}
                          required
                        />
                      </label>
                      <label className="form-field">
                        Аяқталу уақыты
                        <input
                          name={"end" + i}
                          type="time"
                          defaultValue={p.end_time || ""}
                        />
                      </label>
                      <label className="form-field">
                        {" "}
                        Іс-шара{" "}
                        <input
                          name={"title" + i}
                          defaultValue={p.title}
                          required
                          maxLength={100}
                        />
                      </label>
                      <label className="form-field full">
                        {" "}
                        Сипаттама{" "}
                        <input
                          name={"desc" + i}
                          defaultValue={p.description}
                          maxLength={500}
                        />
                      </label>
                      <button
                        type="button"
                        className="button"
                        onClick={() =>
                          setProgram(program.filter((_, j) => i !== j))
                        }
                      >
                        {" "}
                        ІС-ШАРАНЫ ЖОЮ{" "}
                      </button>
                    </div>
                  ))}
                  <div className="actions">
                    <button
                      type="button"
                      className="button"
                      onClick={() =>
                        setProgram([
                          ...program,
                          {
                            time: "21:30",
                            title: "Жаңа іс-шара",
                            description: "",
                            sort_order: program.length,
                          },
                        ])
                      }
                    >
                      {" "}
                      ІС-ШАРА ҚОСУ{" "}
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setProgram(defaultProgram)}
                    >
                      {" "}
                      НЕГІЗГІ БАҒДАРЛАМАНЫ ҚОЮ{" "}
                    </button>
                    <button className="button filled">
                      {" "}
                      БАҒДАРЛАМАНЫ САҚТАУ{" "}
                    </button>
                  </div>
                </form>
              </div>
            </>
          )}
          {tab === "Screen Presentation" && (
            <div className="admin-panel">
              <h2>The Ballroom Screen · 16:9</h2>
              <p>
                {" "}
                Сол жақта көшбасшының фотосуреті мен жұптардың рейтингі
                көрсетіледі. Оң жақтағы QR-код арқылы қонақтар жұптардың
                фотосуреттерін көріп, дауыс бере алады.{" "}
              </p>
              <div className="notice">
                {settings.screen_results_visible
                  ? "Қазіргі көшбасшылар зал экранында көрсетіліп тұр."
                  : "Көшбасшылар жасырылған. QR-код қолжетімді болып қалады."}{" "}
                Дауыс беру бетіндегі қорытынды нәтижелер бөлек жарияланады.{" "}
              </div>
              <div className="actions">
                <button
                  className="button filled"
                  onClick={() =>
                    action(
                      () =>
                        rpc("set_event_state", {
                          p_patch: {
                            screen_results_visible:
                              !settings.screen_results_visible,
                          },
                        }),
                      settings.screen_results_visible
                        ? "Экрандағы рейтинг жасырылды."
                        : "Экрандағы рейтинг қосылды.",
                    )
                  }
                >
                  {settings.screen_results_visible
                    ? "КӨШБАСШЫЛАРДЫ ЖАСЫРУ"
                    : "КӨШБАСШЫЛАРДЫ КӨРСЕТУ"}
                </button>
                <Link className="button" href="/screen/qr" target="_blank">
                  {" "}
                  ЭКРАНДЫ АШУ · 16:9{" "}
                </Link>
                <Link className="button" href="/screen/winner" target="_blank">
                  {" "}
                  ЖЕҢІМПАЗДЫ ЖАРИЯЛАУ{" "}
                </Link>
              </div>
              <p>
                {" "}
                Рейтинг әр 5 секунд сайын жаңартылады. Бұл — аралық нәтижелер.
                Жеңімпазды жариялау «Дауыс беру нәтижелері» бөлімінен іске
                қосылады.{" "}
              </p>
            </div>
          )}
          {tab === "Photo Gallery" && (
            <div className="admin-panel">
              <h2>Moments to remember</h2>
              <p>
                {" "}
                Фотосуреттегі қатысушылардың рұқсаты алынған суреттерді ғана
                жүктеңіз.{" "}
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  action(async () => {
                    const file = f.get("photo") as File;
                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 5 * 1024 * 1024
                    )
                      throw Error(
                        "Көлемі 5 МБ-тан аспайтын JPG, PNG немесе WebP таңдаңыз.",
                      );
                    const { path } = await uploadPhoto("gallery", file);
                    await rpc("add_gallery", {
                      p_path: path,
                      p_caption: f.get("caption"),
                    });
                  });
                }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    {" "}
                    Фотосурет{" "}
                    <input
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </label>
                  <label className="form-field">
                    {" "}
                    Жазба <input name="caption" maxLength={200} required />
                  </label>
                </div>
                <label className="check">
                  <input type="checkbox" required /> Бұл фотосуретті жариялауға
                  рұқсатым бар.{" "}
                </label>
                <button className="button filled">
                  {" "}
                  ФОТОСУРЕТТІ ЖҮКТЕУ ЖӘНЕ ЖАРИЯЛАУ{" "}
                </button>
              </form>
              <div className="gallery-grid" style={{ marginTop: 30 }}>
                {gallery.map((g) => (
                  <div key={g.id}>
                    <img src={g.url} alt={g.caption} />
                    <p>{g.caption}</p>
                    <button
                      className="button"
                      onClick={() =>
                        action(() => rpc("delete_gallery", { p_id: g.id }))
                      }
                    >
                      {" "}
                      ЖОЮ{" "}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </fieldset>
      </main>
      {photoPreview && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Өтінімнің жеке фотосуреті"
          onClick={() => setPhotoPreview("")}
        >
          <button className="button close" onClick={() => setPhotoPreview("")}>
            {" "}
            АЛДЫН АЛА ҚАРАУДЫ ЖАБУ{" "}
          </button>
          <img
            className="lightbox"
            src={photoPreview}
            alt="Жұптың өтініміндегі жеке фотосурет"
          />
        </div>
      )}
      {add && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-label="Edit couple"
        >
          <div
            className="dialog"
            style={{
              maxWidth: 650,
              textAlign: "left",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <h2>{editing ? "Edit couple" : "Add a Couple"}</h2>
            <form onSubmit={saveCouple}>
              <div className="form-grid" style={{ marginTop: 25 }}>
                {[
                  ["first", "Бірінші қатысушы", editing?.first_name],
                  ["second", "Екінші қатысушы", editing?.second_name],
                  ["group", "Сынып немесе топ", editing?.group_name],
                  ["name", "Жұптың атауы", editing?.couple_name],
                  ["contact", "Байланыс деректері", editing?.contact],
                  ["order", "Көрсету реті", editing?.sort_order ?? 0],
                ].map(([name, label, value]) => (
                  <label className="form-field" key={String(name)}>
                    {label}
                    <input
                      name={String(name)}
                      defaultValue={value}
                      required={[
                        "first",
                        "second",
                        "group",
                        "contact",
                      ].includes(String(name))}
                      type={name === "order" ? "number" : "text"}
                      maxLength={160}
                    />
                  </label>
                ))}
              </div>
              <p style={{ fontSize: 12, margin: "20px 0" }}>
                {" "}
                Жұпты қосу үшін екі қатысушының рұқсаты қажет. Сақтағаннан кейін
                фотосуретін жүктеңіз.{" "}
              </p>
              <label className="check">
                <input type="checkbox" required /> Қатысушылардың рұқсаты
                алынды.{" "}
              </label>
              <button className="button filled" disabled={busy}>
                {" "}
                ЖҰПТЫ САҚТАУ{" "}
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setAdd(false);
                  setEditing(null);
                }}
              >
                {" "}
                БАС ТАРТУ{" "}
              </button>
            </form>
            {editing && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  action(async () => {
                    const file = f.get("image") as File;
                    if (
                      !["image/jpeg", "image/png", "image/webp"].includes(
                        file.type,
                      ) ||
                      file.size > 5 * 1024 * 1024
                    )
                      throw Error(
                        "Көлемі 5 МБ-тан аспайтын JPG, PNG немесе WebP таңдаңыз.",
                      );
                    await uploadPhoto("couple", file, editing.id);
                    setAdd(false);
                    setEditing(null);
                  });
                }}
                style={{ marginTop: 20 }}
              >
                <label className="form-field">
                  {" "}
                  Жұптың жарияланатын фотосуреті{" "}
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <button className="button" disabled={busy}>
                  {" "}
                  ФОТОСУРЕТТІ ЖҮКТЕУ{" "}
                </button>
              </form>
            )}
            {error && <p role="alert">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
