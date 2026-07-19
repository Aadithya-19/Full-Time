// Server-side Firestore proxy. Runs on Vercel as a serverless function.
// The Firebase API key lives ONLY here, as environment variables you set in the
// Vercel dashboard (Project Settings -> Environment Variables) — it is never sent
// to the browser and never committed to the repo.
//
// Required env vars:
//   FIREBASE_PROJECT_ID   e.g. "bracket-proj"
//   FIREBASE_API_KEY      the Firebase web API key

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.length) {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default async function handler(req, res) {
  const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
  const API_KEY = process.env.FIREBASE_API_KEY;

  // Health check: GET /api/db?action=health
  if (req.method === "GET" && req.query.action === "health") {
    return res.status(200).json({
      ok: true,
      hasProjectId: !!PROJECT_ID,
      hasApiKey: !!API_KEY,
      projectIdPreview: PROJECT_ID ? PROJECT_ID.slice(0, 4) + "…" : null,
    });
  }

  if (!PROJECT_ID || !API_KEY) {
    return res.status(500).json({ error: "missing_env", detail: "Server is missing FIREBASE_PROJECT_ID / FIREBASE_API_KEY environment variables in Vercel." });
  }
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  try {
    if (req.method === "GET") {
      const { action, shared, key, prefix } = req.query;
      const coll = shared === "true" ? "ftl_shared" : "ftl_private";

      if (action === "list") {
        const r = await fetch(`${BASE}/${coll}?key=${API_KEY}&pageSize=300`);
        if (!r.ok) {
          const detail = await r.text();
          return res.status(200).json({ keys: [], error: "firestore_list_failed", status: r.status, detail: detail.slice(0, 400) });
        }
        const data = await r.json();
        const keys = (data.documents || [])
          .map((d) => decodeURIComponent(d.name.split("/").pop()))
          .filter((k) => !prefix || k.startsWith(prefix));
        return res.status(200).json({ keys });
      }

      if (!key) return res.status(400).json({ error: "missing_key" });
      const r = await fetch(`${BASE}/${coll}/${encodeURIComponent(key)}?key=${API_KEY}`);
      if (r.status === 404) return res.status(200).json({ value: null });
      if (!r.ok) {
        const detail = await r.text();
        return res.status(200).json({ value: null, error: "firestore_get_failed", status: r.status, detail: detail.slice(0, 400) });
      }
      const doc = await r.json();
      const raw = doc?.fields?.data?.stringValue;
      return res.status(200).json({ value: raw ?? null });
    }

    if (req.method === "POST") {
      const { shared, key, value } = await readBody(req);
      if (!key) return res.status(400).json({ ok: false, error: "missing_key" });
      const coll = shared ? "ftl_shared" : "ftl_private";
      const body = { fields: { data: { stringValue: JSON.stringify(value) } } };
      const r = await fetch(
        `${BASE}/${coll}/${encodeURIComponent(key)}?key=${API_KEY}&updateMask.fieldPaths=data`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!r.ok) {
        const detail = await r.text();
        return res.status(200).json({ ok: false, error: "firestore_write_failed", status: r.status, detail: detail.slice(0, 400) });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "proxy_exception", detail: String(e && e.message || e).slice(0, 400) });
  }
}
