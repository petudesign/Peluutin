import type { ExerciseDraft } from "./exerciseTypes";

export function createExerciseShareDraft(draft: ExerciseDraft, withoutPlayerNames = true): ExerciseDraft {
  return {
    ...draft,
    markers: draft.markers.map((marker, index) => ({
      ...marker,
      number: withoutPlayerNames && marker.kind === "player" ? undefined : marker.number,
      name: withoutPlayerNames && marker.kind === "player" ? `Pelaaja ${index + 1}` : marker.name,
    })),
  };
}

const SHARE_PREFIX = "#harjoite=";
const MAX_ENCODED_LENGTH = 100_000;
// A gzip link of 100 kB could otherwise inflate to gigabytes in the recipient's tab.
const MAX_DECODED_BYTES = 1_000_000;
const MAX_MARKERS = 100;
const MAX_PATHS = 250;
const MAX_ANNOTATIONS = 250;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function encodeExerciseShare(draft: ExerciseDraft) {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, draft }));
  return bytesToBase64Url(bytes);
}

export async function encodeExerciseShareCompressed(draft: ExerciseDraft) {
  if (!("CompressionStream" in globalThis)) return encodeExerciseShare(draft);
  const source = new TextEncoder().encode(JSON.stringify({ version: 1, draft }));
  const stream = new Blob([source]).stream().pipeThrough(new CompressionStream("gzip"));
  return `g.${bytesToBase64Url(new Uint8Array(await new Response(stream).arrayBuffer()))}`;
}

async function gunzipWithLimit(bytes: Uint8Array<ArrayBuffer>, limit: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip")).getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

// Shared links come from other people, so compressed and plain links pass the same checks.
function readSharedDraft(payload: unknown): ExerciseDraft | null {
  if (!isRecord(payload) || payload.version !== 1) return null;
  const draft = payload.draft;
  if (!isRecord(draft)
    || !Array.isArray(draft.markers) || !Array.isArray(draft.paths) || !Array.isArray(draft.annotations)
    || draft.markers.length > MAX_MARKERS || draft.paths.length > MAX_PATHS || draft.annotations.length > MAX_ANNOTATIONS
    || ![...draft.markers, ...draft.paths, ...draft.annotations].every(isRecord)) return null;
  return draft as unknown as ExerciseDraft;
}

export async function decodeExerciseShare(hash: string): Promise<ExerciseDraft | null> {
  try {
    const encoded = hash.startsWith(SHARE_PREFIX) ? hash.slice(SHARE_PREFIX.length) : "";
    if (!encoded || encoded.length > MAX_ENCODED_LENGTH) return null;
    const compressed = encoded.startsWith("g."), data = compressed ? encoded.slice(2) : encoded;
    const padded = data.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(data.length / 4) * 4, "=");
    const binary = atob(padded);
    let bytes: Uint8Array<ArrayBuffer> | null = Uint8Array.from(binary, character => character.charCodeAt(0));
    if (compressed) {
      if (!("DecompressionStream" in globalThis)) return null;
      bytes = await gunzipWithLimit(bytes, MAX_DECODED_BYTES);
      if (!bytes) return null;
    }
    return readSharedDraft(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}
