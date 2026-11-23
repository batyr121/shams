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
  client,
  db,
  configured,
  Couple,
  defaults,
  Settings as SettingsType,
  Program,
  defaultProgram,
} from "@/lib/db";
import { PageTitle } from "@/components/shared";
import { QRTools } from "@/components/qr";
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
    if (!db) return;
    const [c, s, r, t, p, g] = await Promise.all([
      db
        .from("couple_applications")
        .select(
          "id,first_name,second_name,group_name,couple_name,photo_path,status,number,sort_order,contact",
        )
        .neq("status", "uploading")
        .order("sort_order"),
      db.from("event_settings").select("*").eq("id", 1).single(),
      db.rpc("admin_results"),
      db.from("voting_tickets").select("id,used_at,revoked"),
      db.from("event_program").select("*").order("sort_order"),
      db.from("gallery_images").select("*").order("sort_order"),
    ]);
    if (c.error) throw c.error;
    setCouples(c.data || []);
    if (s.data) setSettings(s.data);
    setResults(r.data || []);
    setTickets(t.data || []);
    if (full) setProgram(p.data || []);
    setGallery(
      (g.data || []).map((x) => ({
        ...x,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL + x.url,
      })),
    );
  }, []);
  useEffect(() => {
    if (!db) {
      setChecking(false);
      return;
    }
    let alive = true;
    const verify = async () => {
      const { data } = await db!.auth.getUser();
      if (!data.user) {
        if (alive) {
          setAuth(false);
          setChecking(false);
        }
        return;
      }
      const { data: ok, error } = await db!.rpc("is_admin");
      if (alive) {
        setAuth(ok === true && !error);
        setChecking(false);
        if (!ok) setError("This account does not have an administrator role.");
      }
    };
    verify();
    const { data } = db.auth.onAuthStateChange(() => {
      setTimeout(verify, 0);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (!auth) return;
    refresh().catch((e) => setError(e.message));
    const timer = setInterval(() => refresh(false).catch(() => {}), 5000);
    return () => clearInterval(timer);
  }, [auth, refresh]);
  useEffect(() => {
    if (window.location.pathname.includes("results")) setTab("Voting Results");
  }, []);
  async function action(fn: () => Promise<unknown>, msg = "Changes saved.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      await refresh();
      setMessage(msg);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed.");
    } finally {
      setBusy(false);
    }
  }
  async function rpc(name: string, args: Record<string, unknown> = {}) {
    const { data, error } = await client().rpc(name, args);
    if (error) throw error;
    return data;
  }
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const { error } = await client().auth.signInWithPassword({
        email: String(f.get("email")),
        password: String(f.get("password")),
      });
      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign in failed");
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
        <p>Verifying administrator access…</p>
      </main>
    );
  if (!auth)
    return (
      <main className="page-shell">
        <PageTitle
          eyebrow="FOR THE PEOPLE BEHIND THE MAGIC"
          title="Organizer access"
          sub="Secure administration for The Grand Ball."
        />
        <div className="form-panel">
          {!configured && (
            <div className="notice">
              Connect Supabase using the deployment instructions to enable
              secure organizer access.
            </div>
          )}
          <form onSubmit={login}>
            <label className="form-field">
              Email
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </label>
            <label className="form-field" style={{ marginTop: 20 }}>
              Password
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
              {busy ? "SIGNING IN…" : "SIGN IN SECURELY"}
            </button>
          </form>
          <Link className="text-link" href="/">
            RETURN TO THE BALL
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
            THE GRAND BALL<small>ORGANIZER CONSOLE</small>
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
              {name}
            </button>
          ))}
          <button onClick={() => db!.auth.signOut()}>
            <LogOut />
            Sign out
          </button>
        </nav>
      </aside>
      <main className="admin-main">
        <div className="admin-heading">
          <div>
            <p className="eyebrow">THE GRAND BALL · ORGANIZER CONSOLE</p>
            <h1>{tab}</h1>
            <p>26 November 2026 · Asia/Aqtau</p>
          </div>
          <span className="button small">
            VOTING {settings.voting_status.toUpperCase()}
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
                  [couples.length, "TOTAL COUPLES"],
                  [pending.length, "PENDING APPLICATIONS"],
                  [approved.length, "APPROVED COUPLES"],
                  [total, "VALIDATED VOTES"],
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
                  Review applications, distribute guest tickets, and open voting
                  when the ballroom is ready.
                </p>
                <div className="actions">
                  <button
                    className="button"
                    onClick={() => setTab("Couple Applications")}
                  >
                    REVIEW {pending.length} APPLICATIONS
                  </button>
                  <button
                    className="button"
                    onClick={() => setTab("Voting Management")}
                  >
                    MANAGE VOTING
                  </button>
                  <Link className="button" href="/screen/qr" target="_blank">
                    OPEN QR SCREEN
                  </Link>
                </div>
                <p>
                  Guest tickets: {tickets.length} issued ·{" "}
                  {tickets.filter((t) => t.used_at).length} redeemed ·{" "}
                  {tickets.filter((t) => t.revoked).length} revoked.
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
                  ADD COUPLE MANUALLY
                </button>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>COUPLE</th>
                      <th>CLASS</th>
                      <th>STATUS</th>
                      <th>CONTACT</th>
                      <th>ACTIONS</th>
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
                          <td>{c.status}</td>
                          <td>{c.contact}</td>
                          <td>
                            {c.status !== "approved" && (
                              <button
                                onClick={() =>
                                  action(async () => {
                                    if (c.photo_path) {
                                      const sup = client();
                                      const { data, error } = await sup.storage
                                        .from("application-photos")
                                        .download(c.photo_path);
                                      if (error) throw error;
                                      const path =
                                        c.id +
                                        "/" +
                                        crypto.randomUUID() +
                                        "." +
                                        c.photo_path.split(".").pop();
                                      const upload = await sup.storage
                                        .from("couple-photos")
                                        .upload(path, data, {
                                          contentType: data.type,
                                        });
                                      if (upload.error) throw upload.error;
                                      await rpc("update_couple_photo", {
                                        p_id: c.id,
                                        p_path: path,
                                      });
                                    }
                                    await rpc("moderate_couple", {
                                      p_id: c.id,
                                      p_status: "approved",
                                    });
                                  }, "Couple approved and published.")
                                }
                              >
                                Approve
                              </button>
                            )}
                            {c.photo_path && (
                              <button
                                onClick={() =>
                                  action(async () => {
                                    const { data, error } = await client()
                                      .storage.from("application-photos")
                                      .createSignedUrl(c.photo_path, 60);
                                    if (error) throw error;
                                    setPhotoPreview(data.signedUrl);
                                  }, "Private photo preview is valid for 60 seconds.")
                                }
                              >
                                Review photo
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(c);
                                setAdd(true);
                              }}
                            >
                              Edit
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
                              Reject
                            </button>
                            <button
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Delete this application? Couples with votes cannot be deleted.",
                                  )
                                )
                                  action(() =>
                                    rpc("delete_couple", { p_id: c.id }),
                                  );
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
              {!couples.length && <p>No applications yet.</p>}
            </div>
          )}
          {tab === "Voting Management" && (
            <>
              <div className="admin-panel">
                <h2>The voting floor</h2>
                <p>
                  Open, pause, resume, or close voting. Closing is required
                  before announcing winners.
                </p>
                <div className="actions">
                  <button
                    className="button filled"
                    onClick={() => status("open")}
                  >
                    {settings.voting_status === "paused"
                      ? "RESUME VOTING"
                      : "OPEN VOTING"}
                  </button>
                  <button className="button" onClick={() => status("paused")}>
                    PAUSE VOTING
                  </button>
                  <button className="button" onClick={() => status("closed")}>
                    CLOSE VOTING
                  </button>
                </div>
              </div>
              <div className="admin-panel">
                <h2>One guest. One ticket. One vote.</h2>
                <p>
                  Codes are securely generated on the server. Plaintext codes
                  are shown only once; download them immediately.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    action(async () => {
                      setCodes(
                        await rpc("generate_tickets", {
                          p_count: Number(f.get("count")),
                        }),
                      );
                    }, "Tickets generated. Save your codes now.");
                  }}
                >
                  <div className="actions">
                    <input
                      name="count"
                      type="number"
                      min={1}
                      max={500}
                      defaultValue={50}
                      style={{ maxWidth: 120 }}
                      required
                    />
                    <button className="button filled">GENERATE TICKETS</button>
                  </div>
                </form>
                <p>
                  {tickets.filter((t) => t.used_at).length} used of{" "}
                  {tickets.length} tickets.
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
                        DOWNLOAD CODES CSV
                      </button>
                      <button className="button" onClick={() => window.print()}>
                        PRINT VOTING TICKETS
                      </button>
                    </div>
                    <div className="ticket-sheet">
                      {codes.map((c) => (
                        <div className="ticket" key={c}>
                          <Crown style={{ margin: "auto" }} size={20} />
                          <small>THE GRAND BALL · ONE GUEST VOTE</small>
                          <strong>{c}</strong>
                          <small>
                            Scan the event QR or visit{" "}
                            {typeof window !== "undefined"
                              ? window.location.origin + "/vote"
                              : ""}
                            . Keep this code private.
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
                        <th>TICKET ID</th>
                        <th>STATE</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tickets.map((t) => (
                        <tr key={t.id}>
                          <td>{t.id.slice(0, 8)}</td>
                          <td>
                            {t.used_at
                              ? "Redeemed"
                              : t.revoked
                                ? "Revoked"
                                : "Unused"}
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
                                Revoke
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
                {total} validated votes · {approved.length} couples · updates
                every 5 seconds
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
                          {r.votes} votes ·{" "}
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
              {total === 0 && <p>No votes have been cast.</p>}
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
                    ? "HIDE PUBLIC RESULTS"
                    : "PUBLISH RESULTS"}
                </button>
                <button
                  className="button filled"
                  disabled={settings.voting_status !== "closed" || total === 0}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Publish the validated results and start the winner presentation?",
                      )
                    )
                      action(
                        () => rpc("announce_winners"),
                        "Winner presentation started.",
                      );
                  }}
                >
                  ОБЪЯВИТЬ ПОБЕДИТЕЛЕЙ
                </button>
              </div>
              <p>
                Ties share the crown by default. To select a tie-break winner,
                record a procedure below and choose one of the tied couples.
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
                    Tie-break winner
                    <select name="couple" required>
                      <option value="">Select tied couple</option>
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
                    Announced tie-break procedure
                    <input
                      name="reason"
                      minLength={15}
                      required
                      placeholder="e.g. Jury dance-off, announced to guests"
                    />
                  </label>
                </div>
                <button className="button">RECORD TIE-BREAK</button>
              </form>
            </div>
          )}
          {tab === "QR Generator" && (
            <div className="admin-panel">
              <h2>СГЕНЕРИРОВАТЬ QR-КОД</h2>
              <p>
                This code opens this deployment’s voting page. Guests still need
                their individual tickets to submit a vote.
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
                      Start · Aqtau (UTC+5)
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
                      Registration deadline · Aqtau
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
                      Location
                      <input
                        name="location"
                        defaultValue={settings.location}
                        required
                        maxLength={200}
                      />
                    </label>
                    <label className="form-field">
                      Dress code
                      <input
                        name="dress"
                        defaultValue={settings.dress_code}
                        required
                        maxLength={200}
                      />
                    </label>
                    <label className="form-field full">
                      Description
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
                    />
                    Registration is open
                  </label>
                  <button className="button filled">SAVE EVENT SETTINGS</button>
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
                        Time
                        <input
                          name={"time" + i}
                          type="time"
                          defaultValue={p.time}
                          required
                        />
                      </label>
                      <label className="form-field">
                        Activity
                        <input
                          name={"title" + i}
                          defaultValue={p.title}
                          required
                          maxLength={100}
                        />
                      </label>
                      <label className="form-field full">
                        Description
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
                        REMOVE ACTIVITY
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
                            title: "New activity",
                            description: "",
                            sort_order: program.length,
                          },
                        ])
                      }
                    >
                      ADD ACTIVITY
                    </button>
                    <button
                      type="button"
                      className="button"
                      onClick={() => setProgram(defaultProgram)}
                    >
                      LOAD SUGGESTED PROGRAM
                    </button>
                    <button className="button filled">SAVE PROGRAM</button>
                  </div>
                </form>
              </div>
            </>
          )}
          {tab === "Screen Presentation" && (
            <div className="admin-panel">
              <h2>Made for the big screen</h2>
              <p>
                Open a presentation in a separate browser tab, then use its
                fullscreen control. Winner reveal is triggered only from Voting
                Results.
              </p>
              <div className="actions">
                <Link
                  className="button filled"
                  href="/screen/qr"
                  target="_blank"
                >
                  QR PRESENTATION
                </Link>
                <Link className="button" href="/screen/winner" target="_blank">
                  WINNER PRESENTATION
                </Link>
              </div>
            </div>
          )}
          {tab === "Photo Gallery" && (
            <div className="admin-panel">
              <h2>Moments to remember</h2>
              <p>
                Upload only photographs with permission from all identifiable
                participants.
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
                      throw Error("Use JPG, PNG or WebP under 5 MB.");
                    const path =
                      crypto.randomUUID() + "." + file.type.split("/")[1];
                    const { error } = await client()
                      .storage.from("gallery")
                      .upload(path, file);
                    if (error) throw error;
                    await rpc("add_gallery", {
                      p_path: path,
                      p_caption: f.get("caption"),
                    });
                  });
                }}
              >
                <div className="form-grid">
                  <label className="form-field">
                    Image
                    <input
                      name="photo"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </label>
                  <label className="form-field">
                    Caption
                    <input name="caption" maxLength={200} required />
                  </label>
                </div>
                <label className="check">
                  <input type="checkbox" required />I have permission to publish
                  this image.
                </label>
                <button className="button filled">
                  UPLOAD & PUBLISH PHOTO
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
                      REMOVE
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
          aria-label="Private application photograph"
          onClick={() => setPhotoPreview("")}
        >
          <button className="button close" onClick={() => setPhotoPreview("")}>
            CLOSE PREVIEW
          </button>
          <img
            className="lightbox"
            src={photoPreview}
            alt="Private couple application photograph"
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
            <h2>{editing ? "Edit couple" : "Add couple"}</h2>
            <form onSubmit={saveCouple}>
              <div className="form-grid" style={{ marginTop: 25 }}>
                {[
                  ["first", "First name", editing?.first_name],
                  ["second", "Second name", editing?.second_name],
                  ["group", "Class / group", editing?.group_name],
                  ["name", "Couple name", editing?.couple_name],
                  ["contact", "Private contact", editing?.contact],
                  ["order", "Display order", editing?.sort_order ?? 0],
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
                Manually added couples must have participant permission. Add
                their image after saving.
              </p>
              <label className="check">
                <input type="checkbox" required />
                Participant permission has been obtained.
              </label>
              <button className="button filled" disabled={busy}>
                SAVE COUPLE
              </button>
              <button
                className="button"
                type="button"
                onClick={() => {
                  setAdd(false);
                  setEditing(null);
                }}
              >
                CANCEL
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
                      throw Error("Use a JPG, PNG or WebP under 5 MB.");
                    const path =
                      editing.id +
                      "/" +
                      crypto.randomUUID() +
                      "." +
                      file.type.split("/")[1];
                    const { error } = await client()
                      .storage.from("couple-photos")
                      .upload(path, file);
                    if (error) throw error;
                    await rpc("update_couple_photo", {
                      p_id: editing.id,
                      p_path: path,
                    });
                    setAdd(false);
                    setEditing(null);
                  });
                }}
                style={{ marginTop: 20 }}
              >
                <label className="form-field">
                  Replace approved public photo
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <button className="button" disabled={busy}>
                  UPLOAD PHOTO
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
