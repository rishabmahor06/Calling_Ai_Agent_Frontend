# CallPilot Dashboard (Frontend)

Next.js 16 (App Router) dashboard for the CallPilot AI bulk calling agent. Backend: [Calling_Ai_Agent_Backend](https://github.com/rishabmahor06/Calling_Ai_Agent_Backend).

Pages: dashboard, Excel upload, campaigns, live calls, call history, contacts, AI agent settings, knowledge base, WhatsApp, support, analytics (voice performance) and settings.

## Run locally

```bash
cp .env.example .env.local   # BACKEND_URL and NEXT_PUBLIC_BACKEND_URL
npm install
npm run dev                  # http://localhost:3000
```

- `/api/*` is proxied to `BACKEND_URL` through Next.js rewrites, so the session cookie stays first-party.
- Socket.io connects from the browser straight to `NEXT_PUBLIC_BACKEND_URL` for live call updates.
- No secrets live in the frontend. All API keys stay in the backend `.env`.
