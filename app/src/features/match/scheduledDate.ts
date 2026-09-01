export function formatScheduledDate(date: Date) {
  return [date.getDate(), date.getMonth() + 1, date.getFullYear()]
    .map((part, index) => index < 2 ? String(part).padStart(2, "0") : String(part))
    .join("/");
}

export function scheduledDateToInputValue(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : "";
}

export function scheduledDateFromInputValue(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

export function formatScheduledDateTime(value: string) {
  const date = new Date(value);
  return `${formatScheduledDate(date)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function parseScheduledDate(dateValue: string, timeValue: string) {
  const dateMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateValue);
  const timeMatch = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(timeValue);
  if (!dateMatch || !timeMatch) return null;

  const [, day, month, year] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);
  const date = new Date(year, month - 1, day, hours, minutes);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

export function scheduledStartError(
  scheduledAt: Date | null,
  teamId: string,
  matches: ReadonlyArray<{ teamId: string; scheduledAt: string }>,
  now = new Date(),
) {
  if (!scheduledAt) return "Käytä muotoa pp/kk/vvvv ja 24 tunnin kellonaikaa, esimerkiksi 16:00.";
  if (scheduledAt.getTime() <= now.getTime()) return "Tulevan pelin ajankohdan pitää olla myöhemmin kuin nyt.";
  if (matches.some((match) => match.teamId === teamId && Date.parse(match.scheduledAt) === scheduledAt.getTime())) {
    return "Tälle joukkueelle on jo tallennettu peli samaan ajankohtaan.";
  }
  return "";
}

export function isScheduledMatchVisible(
  match: { id: string; scheduledAt: string },
  activeScheduledMatchId?: string,
  now = new Date(),
) {
  if (match.id === activeScheduledMatchId) return true;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Date.parse(match.scheduledAt) >= startOfToday;
}
