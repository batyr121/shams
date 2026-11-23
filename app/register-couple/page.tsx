"use client";
import { useState } from "react";
import { Crown, CheckCircle2, Upload } from "lucide-react";
import { Header, Footer, PageTitle, useSettings } from "@/components/shared";
import { client, configured } from "@/lib/db";
export default function Register() {
  const s = useSettings();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const closed =
    !s.registration_open || new Date(s.registration_deadline) < new Date();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = new FormData(e.currentTarget);
      if (!file) throw Error("Please select a couple photograph.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw Error("Choose a JPG, PNG or WebP image under 5 MB.");
      const sup = client();
      const { data, error } = await sup.rpc("submit_application", {
        p_first: String(d.get("first")),
        p_second: String(d.get("second")),
        p_group: String(d.get("group")),
        p_name: String(d.get("name") || ""),
        p_contact: String(d.get("contact")),
        p_consent: d.get("consent") === "on",
        p_mime: file.type,
        p_size: file.size,
      });
      if (error) throw error;
      const res = await sup.storage
        .from("application-photos")
        .upload(
          `${data.id}/${data.upload_token}.${file.type.split("/")[1]}`,
          file,
          { contentType: file.type, upsert: false },
        );
      if (res.error) throw res.error;
      const final = await sup.rpc("complete_application", {
        p_id: data.id,
        p_token: data.upload_token,
        p_path: res.data.path,
      });
      if (final.error) throw final.error;
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not submit application. Please try again.",
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
          eyebrow="YOUR STORY STARTS HERE"
          title="РЕГИСТРАЦИЯ НА ЛУЧШУЮ ПАРУ БАЛА"
          sub="Two people. One unforgettable evening. Enter the competition together."
        />
        <div className="form-panel">
          {success ? (
            <div className="notice success">
              <CheckCircle2 size={45} />
              <h2>Ваша заявка принята!</h2>
              <p>
                The organizer will review your application. Your photo appears
                publicly only after approval.
              </p>
            </div>
          ) : (
            <>
              {!configured && (
                <div className="notice">
                  Registration will be available when the organizer connects the
                  event database.
                </div>
              )}
              {closed ? (
                <div className="empty">
                  <Crown />
                  <h3>Registration is closed</h3>
                  <p>
                    Thank you for your interest. Please contact the organizer.
                  </p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="form-grid">
                    <label className="form-field">
                      First participant’s name
                      <input
                        name="first"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="First & last name"
                      />
                    </label>
                    <label className="form-field">
                      Second participant’s name
                      <input
                        name="second"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="First & last name"
                      />
                    </label>
                    <label className="form-field">
                      Class or group
                      <input
                        name="group"
                        required
                        maxLength={40}
                        placeholder="e.g. 11 A"
                      />
                    </label>
                    <label className="form-field">
                      Couple name (optional)
                      <input
                        name="name"
                        maxLength={80}
                        placeholder="Your name for the evening"
                      />
                    </label>
                    <label className="form-field full">
                      Contact information
                      <input
                        name="contact"
                        required
                        maxLength={160}
                        placeholder="Email or phone · visible only to organizers"
                      />
                    </label>
                    <label className="form-field full">
                      Couple photograph · JPG, PNG, WebP · max. 5 MB
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>
                  <label className="check">
                    <input name="rules" type="checkbox" required />
                    <span>
                      We agree to participate respectfully. Each authorized
                      guest may cast one vote. The couple with the most
                      validated votes wins; tied couples share the title unless
                      the organizer announces a tie-break.
                    </span>
                  </label>
                  <label className="check">
                    <input name="consent" type="checkbox" required />
                    <span>
                      Both participants consent to publishing this photograph
                      and our names for the competition. We have permission from
                      a parent or guardian where required, and the right to
                      share this image.
                    </span>
                  </label>
                  {error && (
                    <div className="notice error" role="alert">
                      {error}
                    </div>
                  )}
                  <button
                    className="button filled"
                    disabled={busy || !configured}
                  >
                    {busy ? "SUBMITTING APPLICATION…" : "SUBMIT APPLICATION"}
                    <Crown size={16} />
                  </button>
                  <p className="fine">
                    Applications are reviewed before publication. Your contact
                    details remain private.
                  </p>
                </form>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
