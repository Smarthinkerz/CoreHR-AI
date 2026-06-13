# Self-Hosting CoreHR AI

CoreHR AI is a single Node.js service: Express serves both the REST API **and**
the built React frontend on one port. You only need a Node runtime and a
PostgreSQL database.

There are two supported paths:

- **Option A — Docker Compose (recommended).** One command brings up the app
  *and* a PostgreSQL database together. Best for a VPS or your own computer.
- **Option B — Bare metal / VPS without Docker.** Run Node directly against a
  PostgreSQL you provide (managed or installed).

---

## Database driver note (important)

By default the app uses the **Neon serverless driver** (works on Replit/Neon).
To connect to a **standard PostgreSQL** (Docker, RDS, Supabase, a local
install, etc.), set:

```
DATABASE_DRIVER=pg
```

- Docker Compose (Option A) sets this for you automatically.
- For Option B with a normal Postgres, set `DATABASE_DRIVER=pg` yourself.
- If you use a **Neon** database, leave `DATABASE_DRIVER` unset.

---

## Option A — Docker Compose (recommended)

**Requirements:** Docker + Docker Compose (Docker Desktop on Mac/Windows, or
Docker Engine on Linux).

### 1. Get the code
```bash
git clone https://github.com/Smarthinkerz/CoreHR.git
cd CoreHR
```

### 2. Create your `.env`
```bash
cp .env.example .env
```
Edit `.env` and set at minimum:
- `SESSION_SECRET` — generate one: `openssl rand -hex 32`
- `POSTGRES_PASSWORD` — pick a strong password (used by the bundled database)
- Any feature keys you use: `OPENAI_API_KEY`, `RESEND_API_KEY`, etc.

> Do **not** set `DATABASE_URL` in `.env` for Option A — Compose points the app
> at the bundled `db` service automatically.

### 3. Start everything
```bash
docker compose up -d --build
```
This will:
1. Start PostgreSQL (`db`) and wait until it's healthy.
2. Run `migrate` once to create all tables.
3. Start the `app` on **http://localhost:5000**.

### 4. Verify
```bash
curl http://localhost:5000/api/health
# → {"status":"ok","database":{"status":"connected", ...}}
```
Open http://localhost:5000 and log in with the demo account
(`sarah.johnson` / `Welcome1!`) or register a new user.

### Useful commands
```bash
docker compose logs -f app      # tail app logs
docker compose down             # stop (keeps data)
docker compose down -v          # stop and DELETE the database volume
docker compose up -d --build    # rebuild after pulling new code
```

---

## Option B — VPS / bare metal (no Docker)

**Requirements:** Node.js 20 LTS, npm, and a PostgreSQL database you can reach.

### 1. Get the code & install
```bash
git clone https://github.com/Smarthinkerz/CoreHR.git
cd CoreHR
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```
Set in `.env`:
- `DATABASE_URL` — your Postgres connection string
- `DATABASE_DRIVER=pg` — **unless** you're using Neon
- `SESSION_SECRET` — `openssl rand -hex 32`
- `NODE_ENV=production`
- feature keys as needed (`OPENAI_API_KEY`, `RESEND_API_KEY`, …)

### 3. Create the schema, build, run
```bash
npm run db:push     # create tables
npm run build       # bundle client + server into dist/
npm run start       # starts on PORT (default 5000)
```

### 4. Keep it running (recommended)
Use a process manager so it restarts on crash/reboot:
```bash
npm i -g pm2
pm2 start "npm run start" --name corehr
pm2 save && pm2 startup
```

### 5. Put HTTPS in front (recommended)
Use Nginx or Caddy as a reverse proxy on ports 80/443 forwarding to
`localhost:5000`. Caddy example (`Caddyfile`):
```
your-domain.com {
    reverse_proxy localhost:5000
}
```

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (auto-set in Compose) |
| `DATABASE_DRIVER` | for standard Postgres | set to `pg`; leave unset for Neon |
| `SESSION_SECRET` | yes (production) | app refuses to start in production without it |
| `NODE_ENV` | recommended | `production` |
| `PORT` | no | defaults to `5000` |
| `OPENAI_API_KEY` | optional | enables AI features |
| `GOOGLE_API_KEY` | optional | alternative AI provider |
| `RESEND_API_KEY` | optional | transactional email (or use Mailtrap SMTP) |
| `MAILTRAP_USERNAME` / `MAILTRAP_PASSWORD` | optional | SMTP email in dev |
| `SLACK_API_TOKEN` | optional | Slack integration |
| `ZOOM_API_KEY` / `ZOOM_API_SECRET` | optional | Zoom integration |
| `TAP_SECRET_KEY` / `TAP_WEBHOOK_SECRET` | optional | payments + webhook verification |

See `.env.example` for the full list.

---

## Notes

- **One port, one service.** Express serves the API and the React build together
  — don't split the frontend onto a separate host (they share an origin/cookies).
- **Sessions live in Postgres** — no Redis needed.
- **Demo data** auto-seeds on first boot when the database is empty.
- **Payments webhook.** If you use Tap payments, `/api/tap-payments/webhook`
  must be reachable from the public internet and `TAP_WEBHOOK_SECRET` must be set.
- **Backups.** For Option A, the database lives in the `pgdata` Docker volume —
  back it up with `docker compose exec db pg_dump -U corehr corehr > backup.sql`.
