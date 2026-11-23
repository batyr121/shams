"use client";
import { useState, useEffect } from "react";
import { Crown, CheckCircle2, Upload } from "lucide-react";
import { Header, Footer, PageTitle, useSettings } from "@/components/shared";
import { api, useBackend } from "@/lib/api";
export default function Register() {
  const s = useSettings();
  const configured = useBackend();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    setError("");
    if (!selected) {
      setFile(null);
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setFile(null);
      event.target.value = "";
      setError(
        "Көлемі 5 МБ-тан аспайтын JPG, PNG немесе WebP фотосуретін таңдаңыз.",
      );
      return;
    }
    setFile(selected);
  }
  const closed =
    !s.registration_open || new Date(s.registration_deadline) < new Date();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = new FormData(e.currentTarget);
      if (!file) throw Error("Жұптың фотосуретін таңдаңыз.");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024
      )
        throw Error(
          "Көлемі 5 МБ-тан аспайтын JPG, PNG немесе WebP фотосуретін таңдаңыз.",
        );
      d.set("photo", file);
      await api("register", { method: "POST", body: d });
      setSuccess(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Өтінім жіберілмеді. Қайта көріңіз.",
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
          eyebrow="СІЗДІҢ ТАРИХЫҢЫЗ ОСЫНДАН БАСТАЛАДЫ"
          title="Couple Registration"
          sub="Екі жүрек, бір ерекше кеш. Үздік жұп байқауына бірге қатысыңыз."
        />
        <div className="form-panel">
          {success ? (
            <div className="notice success">
              <CheckCircle2 size={45} />
              <h2>Application received!</h2>
              <p>
                Өтінімді ұйымдастырушы тексереді. Фотосурет мақұлданғаннан кейін
                ғана жарияланады.
              </p>
            </div>
          ) : (
            <>
              {!configured && (
                <div className="notice">
                  Тіркелу қызметі дайындалып жатыр. Біраз уақыттан кейін қайта
                  кіріңіз.
                </div>
              )}
              {closed ? (
                <div className="empty">
                  <Crown />
                  <h3>Registration closed</h3>
                  <p>Қызығушылығыңызға рақмет. Ұйымдастырушыға хабарласыңыз.</p>
                </div>
              ) : (
                <form onSubmit={submit}>
                  <div className="form-grid">
                    <label className="form-field">
                      Бірінші қатысушының аты-жөні
                      <input
                        name="first"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Аты-жөніңіз"
                      />
                    </label>
                    <label className="form-field">
                      Екінші қатысушының аты-жөні
                      <input
                        name="second"
                        required
                        minLength={2}
                        maxLength={80}
                        placeholder="Аты-жөніңіз"
                      />
                    </label>
                    <label className="form-field">
                      Сынып немесе топ
                      <input
                        name="group"
                        required
                        maxLength={40}
                        placeholder="Мысалы: 11 А"
                      />
                    </label>
                    <label className="form-field">
                      Жұптың атауы (міндетті емес)
                      <input
                        name="name"
                        maxLength={80}
                        placeholder="Жұбыңыздың атауы"
                      />
                    </label>
                    <label className="form-field full">
                      Байланыс деректері
                      <input
                        name="contact"
                        required
                        maxLength={160}
                        placeholder="Email немесе телефон · тек ұйымдастырушы көреді"
                      />
                    </label>
                    <div className="photo-upload full">
                      <label
                        htmlFor="couple-photo"
                        className="photo-upload-label"
                      >
                        <Upload size={28} />
                        <strong>Жұбыңыздың фотосуретін жүктеңіз</strong>
                        <span>
                          Фотосурет ұйымдастырушы мақұлдағаннан кейін дауыс беру
                          бетінде жарияланады.
                        </span>
                        <span className="photo-formats">
                          JPG, PNG, WebP · 5 МБ-қа дейін
                        </span>
                      </label>
                      <input
                        className="photo-file-input"
                        id="couple-photo"
                        name="photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        required
                        onChange={selectPhoto}
                      />
                      {preview && (
                        <div className="photo-preview">
                          <img
                            src={preview}
                            alt="Жұбыңыздың фотосуретін алдын ала қарау"
                          />
                          <div>
                            <strong>{file?.name}</strong>
                            <span>
                              {file ? (file.size / 1024 / 1024).toFixed(2) : 0}{" "}
                              МБ · фотосурет таңдалды
                            </span>
                            <label className="text-link" htmlFor="couple-photo">
                              БАСҚА ФОТОСУРЕТ ТАҢДАУ
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <label className="check">
                    <input name="rules" type="checkbox" required />
                    <span>
                      Байқау ережелерімен келісеміз. Әр қонақ бір рет дауыс
                      береді. Ең көп расталған дауыс жинаған жұп жеңеді. Дауыс
                      тең болса, ұйымдастырушы қосымша шешім тәртібін
                      жарияламаса, атақ ортақ беріледі.
                    </span>
                  </label>
                  <label className="check">
                    <input name="consent" type="checkbox" required />
                    <span>
                      Екі қатысушы да фотосуреті мен аты-жөнін жариялауға
                      келіседі. Қажет жағдайда ата-ананың немесе қамқоршының
                      рұқсаты алынды. Бұл фотосуретті жариялауға құқығымыз бар.
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
                    {busy ? "ӨТІНІМ ЖІБЕРІЛУДЕ…" : "ӨТІНІМ ЖІБЕРУ"}
                    <Crown size={16} />
                  </button>
                  <p className="fine">
                    Өтінім жарияланар алдында тексеріледі. Байланыс деректеріңіз
                    құпия сақталады.
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
