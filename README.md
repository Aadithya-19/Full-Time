# Full Time — prediction league

## Run locally
npm install
npm run dev

## Deploy (free) — Vercel
1. Push this folder to a new GitHub repo.
2. Go to vercel.com, sign in with GitHub, "Add New Project", pick the repo.
3. Framework preset: Vite. Leave build command/output as detected. Deploy.
4. You get a live URL (e.g. full-time-yourname.vercel.app) instantly, and every
   push to GitHub auto-redeploys.

## Data storage
Match data, accounts, and predictions are stored in Firestore (project: bracket-proj).
Make sure Firestore's rules allow read/write — see the note in the main chat.
