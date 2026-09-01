import type { ExerciseDraft } from "./exerciseTypes";

interface ExerciseImageSection {
  title: string;
  text: string;
}

export function getExerciseImageSections(draft: ExerciseDraft): ExerciseImageSection[] {
  return [
    { title: "Teema", text: draft.exerciseTheme?.trim() || "" },
    { title: "Kuvaus ja säännöt", text: draft.notes.trim() },
    { title: "Valmennuspisteet", text: draft.coachingPoints?.trim() || "" },
    { title: "Avainkysymykset", text: draft.keyQuestions?.trim() || "" },
  ].filter(section => section.text);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  return text.split("\n").flatMap(paragraph => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [""];
    const lines: string[] = [];
    let line = words[0];
    words.slice(1).forEach(word => {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) line = candidate;
      else { lines.push(line); line = word; }
    });
    lines.push(line);
    return lines;
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Kuvan lataaminen epäonnistui."));
    image.src = source;
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Kuvan luominen epäonnistui.")), "image/png"));
}

function safeFileName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || "harjoite";
}

export async function downloadExerciseImage(draft: ExerciseDraft, teamName: string, pitchCanvas: HTMLCanvasElement): Promise<void> {
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (!pitchCanvas.width || !pitchCanvas.height) throw new Error("Kenttäkuvaa ei voitu lukea.");

  const width = 1600, margin = 100, contentWidth = width - margin * 2;
  const scratch = document.createElement("canvas").getContext("2d");
  if (!scratch) throw new Error("Kuvan luominen ei onnistu tässä selaimessa.");
  scratch.font = "34px Arial, sans-serif";
  const sections = getExerciseImageSections(draft).map(section => ({ ...section, lines: wrapText(scratch, section.text, contentWidth) }));
  const fieldHeight = Math.round(contentWidth * Math.min(.7, pitchCanvas.height / pitchCanvas.width));
  const textHeight = sections.reduce((total, section) => total + 62 + section.lines.length * 48 + 34, 0);
  const height = Math.max(1800, 260 + fieldHeight + textHeight + 120);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Kuvan luominen ei onnistu tässä selaimessa.");

  context.fillStyle = "#f7faf9";
  context.fillRect(0, 0, width, height);
  try {
    const logo = await loadImage("/assets/peluutin-logo.svg");
    context.drawImage(logo, margin, 62, 246, 64);
  } catch { /* The export remains usable if branding cannot be loaded. */ }
  context.fillStyle = "#607984";
  context.font = "700 24px Arial, sans-serif";
  context.textAlign = "right";
  context.fillText(teamName, width - margin, 100);
  context.textAlign = "left";
  context.fillStyle = "#17303a";
  context.font = "800 52px Arial, sans-serif";
  context.fillText(draft.name.trim() || "Nimetön harjoite", margin, 200);

  const fieldTop = 240;
  context.fillStyle = "#e6edef";
  context.fillRect(margin - 2, fieldTop - 2, contentWidth + 4, fieldHeight + 4);
  context.drawImage(pitchCanvas, 0, 0, pitchCanvas.width, pitchCanvas.height, margin, fieldTop, contentWidth, fieldHeight);

  let y = fieldTop + fieldHeight + 82;
  sections.forEach(section => {
    context.fillStyle = "#1769aa";
    context.font = "800 25px Arial, sans-serif";
    context.fillText(section.title.toLocaleUpperCase("fi-FI"), margin, y);
    y += 45;
    context.fillStyle = "#17303a";
    context.font = "34px Arial, sans-serif";
    section.lines.forEach(line => { context.fillText(line, margin, y); y += 48; });
    y += 34;
  });

  context.strokeStyle = "#d8e2e5";
  context.beginPath();
  context.moveTo(margin, height - 72);
  context.lineTo(width - margin, height - 72);
  context.stroke();
  context.fillStyle = "#607984";
  context.font = "22px Arial, sans-serif";
  context.fillText("Luotu Peluuttimella", margin, height - 34);

  const blob = await canvasBlob(canvas), url = URL.createObjectURL(blob), link = document.createElement("a");
  link.href = url;
  link.download = `${safeFileName(draft.name)}.png`;
  link.click();
  URL.revokeObjectURL(url);
}
