// Emos Stimme (Stimme B): eine echte deutsche Stimme (Piper „Ramona“), die direkt auf
// dem Handy spricht – danach höher, schneller und mit leichtem Roboter-Schimmer wie EMO.
const ORT = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.18.0/dist/";
const PHON = "https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@1.0.0/build/piper_phonemize";
importScripts(ORT + "ort.min.js", PHON + ".js");
ort.env.wasm.wasmPaths = ORT;
ort.env.wasm.numThreads = 1;

let session = null, cfg = null;

// Einmal laden, danach aus dem Speicher des Handys.
async function getCached(url, progress) {
  let cache = null;
  try { cache = await caches.open("emo-stimme-v1"); } catch (e) {}
  if (cache) {
    const hit = await cache.match(url);
    if (hit) return await hit.arrayBuffer();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status + " " + url);
  const total = +res.headers.get("content-length") || 0;
  let buf;
  if (res.body && total && progress) {
    const reader = res.body.getReader(), parts = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value); got += value.length; progress(got, total);
    }
    const all = new Uint8Array(got);
    let o = 0; for (const p of parts) { all.set(p, o); o += p.length; }
    buf = all.buffer;
  } else {
    buf = await res.arrayBuffer();
  }
  if (cache) { try { await cache.put(url, new Response(buf.slice(0))); } catch (e) {} }
  return buf;
}

async function load(model) {
  cfg = JSON.parse(new TextDecoder().decode(await getCached(model + ".json")));
  const bytes = await getCached(model, (loaded, total) => postMessage({ type: "progress", loaded, total }));
  session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  postMessage({ type: "ready" });
}

// Laute → Zahlen mit der Liste genau dieser Stimme (wie Piper es macht).
function toIds(phonemes) {
  const map = cfg.phoneme_id_map, pad = map["_"];
  const ids = [...map["^"], ...pad];
  for (const ch of phonemes.join("").normalize("NFC")) {
    const v = map[ch];
    if (v) ids.push(...v, ...pad);
  }
  ids.push(...map["$"]);
  return ids;
}

// Text → Laute (eSpeak), so wie Piper es braucht.
function phonemize(text) {
  return new Promise((resolve, reject) => {
    let done = false;
    createPiperPhonemize({
      print: line => {
        if (done) return;
        done = true;
        try { resolve(toIds(JSON.parse(line).phonemes)); } catch (e) { reject(e); }
      },
      printErr: () => {},
      locateFile: f => f.endsWith(".wasm") ? PHON + ".wasm" : f.endsWith(".data") ? PHON + ".data" : f,
    }).then(m => {
      m.callMain(["-l", cfg.espeak.voice, "--input", JSON.stringify([{ text }]), "--espeak_data", "/espeak-ng-data"]);
    }).catch(reject);
  });
}

async function say(d) {
  const ids = await phonemize(d.text);
  const feeds = {
    input: new ort.Tensor("int64", BigInt64Array.from(ids, BigInt), [1, ids.length]),
    input_lengths: new ort.Tensor("int64", BigInt64Array.from([BigInt(ids.length)]), [1]),
    scales: new ort.Tensor("float32", Float32Array.from([cfg.inference.noise_scale, cfg.inference.length_scale, cfg.inference.noise_w]), [3]),
  };
  if (cfg.num_speakers > 1) feeds.sid = new ort.Tensor("int64", BigInt64Array.from([0n]), [1]);
  const out = await session.run(feeds);
  const src = out.output.data, srcRate = cfg.audio.sample_rate;
  // EMO-Klang: schneller abspielen (= höher) und ein bisschen Ring-Modulation.
  const step = d.rate * srcRate / d.outRate;
  const n = Math.max(1, Math.floor(src.length / step));
  const y = new Float32Array(n);
  let peak = 1e-6;
  for (let i = 0; i < n; i++) {
    const p = i * step, a = Math.floor(p), f = p - a;
    const v = (src[a] || 0) * (1 - f) + (src[a + 1] || 0) * f;
    const ring = v * Math.sin(2 * Math.PI * d.ringHz * i / d.outRate);
    y[i] = v * (1 - d.ring) + ring * d.ring * 1.6;
    if (Math.abs(y[i]) > peak) peak = Math.abs(y[i]);
  }
  const g = 0.9 / peak;
  for (let i = 0; i < n; i++) y[i] *= g;
  postMessage({ type: "audio", id: d.id, pcm: y, rate: d.outRate }, [y.buffer]);
}

let queue = Promise.resolve();
onmessage = e => {
  const d = e.data;
  if (d.type === "load") {
    load(d.model).catch(err => postMessage({ type: "error", message: String(err && err.message || err) }));
  } else if (d.type === "say") {
    queue = queue.then(() => session ? say(d) : Promise.reject(new Error("noch nicht geladen")))
      .catch(err => postMessage({ type: "audio", id: d.id, pcm: null, error: String(err && err.message || err) }));
  }
};
