// Emos Ohren: Spracherkennung (Whisper) direkt auf dem Handy.
// Läuft in einem eigenen Worker, damit die Augen dabei nicht ruckeln.
import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5/dist/transformers.min.js";

env.allowLocalModels = false;
let asr = null;

async function load(model) {
  asr = await pipeline("automatic-speech-recognition", model, {
    dtype: "q8",
    device: "wasm",
    progress_callback: p => {
      if (p.status === "progress" && p.total) self.postMessage({ type: "progress", file: p.file, loaded: p.loaded, total: p.total });
    },
  });
  self.postMessage({ type: "ready" });
}

self.onmessage = async e => {
  const d = e.data;
  if (d.type === "load") {
    try { await load(d.model); }
    catch (err) { self.postMessage({ type: "error", message: String(err && err.message || err) }); }
  } else if (d.type === "hear" && asr) {
    try {
      const out = await asr(d.audio, { language: "german", task: "transcribe", max_new_tokens: 64 });
      self.postMessage({ type: "text", text: (out && out.text || "").trim() });
    } catch (err) {
      self.postMessage({ type: "text", text: "", error: String(err && err.message || err) });
    }
  }
};
