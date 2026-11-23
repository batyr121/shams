// The event uses fixed Aqtau time (UTC+5). Explicit names keep SSR and browser
// output identical even when their ICU locale data versions differ.
const months = [
  "қаңтар",
  "ақпан",
  "наурыз",
  "сәуір",
  "мамыр",
  "маусым",
  "шілде",
  "тамыз",
  "қыркүйек",
  "қазан",
  "қараша",
  "желтоқсан",
];
const weekdays = [
  "жексенбі",
  "дүйсенбі",
  "сейсенбі",
  "сәрсенбі",
  "бейсенбі",
  "жұма",
  "сенбі",
];
function aqtau(iso: string) {
  const date = new Date(new Date(iso).getTime() + 5 * 60 * 60 * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}
export function eventDate(iso: string) {
  const d = aqtau(iso);
  return d
    ? `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`
    : "—";
}
export function eventWeekday(iso: string) {
  const d = aqtau(iso);
  return d ? weekdays[d.getUTCDay()] : "—";
}
export function eventTime(iso: string) {
  const d = aqtau(iso);
  return d
    ? `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`
    : "—";
}
