# KITARecycle admin and scale API

Next.js 16 app that receives weighings from the IoT scale and lets SWM/UTM staff manage them.
Live at https://kitarecycle.ghgcope.com (Coolify, Dockerfile in this folder, SQLite on the `/data` volume).

## Pages

| Path | Who | What |
|---|---|---|
| `/login` | anyone | Sign-in. "Keep me signed in" = 30-day cookie, otherwise until the browser closes |
| `/` | admin | Overview for a month: total vs target, daily or running-total chart, materials, top accounts, latest weighings (refreshes every 5 s), scales |
| `/accounts` | admin | Search, create accounts (`SWMM` + 8 digits), QR label sheet; `/accounts/<no>/label` prints one |
| `/rates` | admin | Edit RP per kg. Weighings keep the rate they were made with, so changes apply from the next weighing |
| `/cards` | admin | Printable QR cards: `CMD:OK`, `CMD:BATAL`, `CMD:ZERO` and `CAT:1`…`CAT:15` |
| `/funrun-board.html` | public | Event big-screen board (polls `/api/board`) |
| `/game`, `/game/board` | public | Laser target game; `/game/admin` is admin |
| `/api/device/*` | scales | Authenticated with `X-Device-Id` / `X-Device-Key` |

## Environment

| Variable | Needed | Notes |
|---|---|---|
| `ADMIN_USER` | no | Defaults to `admin` |
| `ADMIN_PASSWORD` | **yes, in production** | Without it the server answers 503 on admin pages. Locally (unset) any login works |
| `DEVICE_KEY` | **yes, in production** | Seeds scale `SCALE-01` on first start; must match the firmware's `DEVICE_KEY` |
| `SESSION_SECRET` | no | Signs the session cookie; falls back to `ADMIN_PASSWORD`. Changing either signs everyone out |
| `MONTHLY_TARGET_KG` | no | Overview target, default 1500 |
| `DATA_DIR` | no | SQLite folder; `/data` in the Docker image, `./data` locally |

## Run locally

```bash
npm install
npm run dev -- -p 3100
```

Checks: `npx tsc --noEmit`, `npx eslint app lib proxy.ts`, `npm run build`.

Admin pages use IBM Plex (scoped to `.adm` in `app/globals.css`); `/game` keeps the default Geist font.
