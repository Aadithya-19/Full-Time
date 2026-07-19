# Full Time — prediction league

## Run locally
npm install
npm run dev
(This runs the frontend only. The /api/db function needs `vercel dev` to run locally — see below.)

## Deploy (free) — Vercel
1. Push this folder to a new GitHub repo.
   IMPORTANT: do NOT put real Firebase credentials in any committed file. There are none in this
   repo — the API key is set as a Vercel environment variable instead (next step).
2. Go to vercel.com, sign in with GitHub, "Add New Project", pick the repo.
3. Before the first deploy (or right after), go to Project -> Settings -> Environment Variables
   and add:
     FIREBASE_PROJECT_ID = bracket-proj
     FIREBASE_API_KEY    = <your Firebase web API key>
   Apply to Production, Preview, and Development.
4. Deploy. You get a live URL (e.g. full-time-yourname.vercel.app), and every push to GitHub
   auto-redeploys.

## How data storage works
The browser never talks to Firestore directly and never sees the Firebase key. It calls this
app's own serverless function at /api/db (see api/db.js), which reads the key from the server-side
environment variables above and proxies the request to Firestore. This keeps the key out of the
GitHub repo and out of the browser's dev tools / view-source entirely.

Local testing of /api routes requires the Vercel CLI:
  npm i -g vercel
  vercel dev
(plain `npm run dev` only serves the frontend — API calls will fail gracefully and the app will
fall back to session-only storage, which is fine for quick UI checks.)

Make sure Firestore's rules allow read/write (see the security note from chat) — the proxy calls
Firestore as an unauthenticated request, so an open or app-check-protected rule is still required.
