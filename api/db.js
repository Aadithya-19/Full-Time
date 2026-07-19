// Server-side Firestore proxy. Runs on Vercel as a serverless function.
// The Firebase API key lives ONLY here, as environment variables you set in the
// Vercel dashboard (Project Settings -> Environment Variables) — it is never sent
// to the browser and never committed to the repo.
//
// Required env vars:
//   FIREBASE_PROJECT_ID   e.g. "bracket-proj"
//   FIREBASE_API_KEY      the Firebase web API key

export default async function handler(req, res) {
  const PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
  const API_KEY = process.env.FIREBASE_API_KEY;
  if (!PROJECT_ID || !API_KEY) {
    return res.status(500).json({ error: "Server missing FIREBASE_PROJECT_ID / FIREBASE_API_KEY env vars" });
  }
  const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

  try {
    if (req.method === "GET") {
      const { action, shared, key, prefix } = req.query;
      const coll = shared === "true" ? "ftl_shared" : "ftl_private";

      if (action === "list") {
        const r = await fetch(`${BASE}/${coll}?key=${API_KEY}&pageSize=300`);
        if (!r.ok) return res.status(200).json({ keys: [] });
        const data = await r.json();
        const keys = (data.documents || [])
          .map((d) => decodeURIComponent(d.name.split("/").pop()))
          .filter((k) => !prefix || k.startsWith(prefix));
        return res.status(200).json({ keys });
      }

      // action === "get"
      if (!key) return res.status(400).json({ error: "missing key" });
      const r = await fetch(`${BASE}/${coll}/${encodeURIComponent(key)}?key=${API_KEY}`);
      if (!r.ok) return res.status(200).json({ value: null }); // not found / unreachable
      const doc = await r.json();
      const raw = doc?.fields?.data?.stringValue;
      return res.status(200).json({ value: raw ?? null });
    }

    if (req.method === "POST") {
      const { shared, key, value } = req.body || {};
      if (!key) return res.status(400).json({ error: "missing key" });
      const coll = shared ? "ftl_shared" : "ftl_private";
      const body = { fields: { data: { stringValue: JSON.stringify(value) } } };
      const r = await fetch(
        `${BASE}/${coll}/${encodeURIComponent(key)}?key=${API_KEY}&updateMask.fieldPaths=data`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      return res.status(200).json({ ok: r.ok });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: "proxy failed" });
  }
}
