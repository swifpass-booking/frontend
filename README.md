# Swiftpass Frontend

React + TypeScript web app for Swiftpass. One build serves three experiences, chosen by sign-in role:

| Who | Sees |
| --- | --- |
| Traveller / guest | Search, results, seat picker, cart, checkout, confirmation, My Tickets, voice concierge, live map |
| `admin` | Admin dashboard (stats, users, occurrences) with embedded storefront and scanner |
| `operator_staff`, `gate_agent` | Gate board: QR ticket scanner |

Staff sign in at `/admin` or `/ops`. These URLs are not linked from the traveller site.

## Stack

- React 18, TypeScript, Vite 6
- Tailwind CSS 3
- Leaflet (maps), `qrcode` / `jsqr` (ticket QR), `tesseract.js` + `mrz` (passport scan)

## Requirements

- Node 22 (matches the Dockerfile)
- Backend running on `localhost:8000` (`backend/`, `python manage.py runserver`)
- Optional: voice concierge on `localhost:8100` (`models/agent-project/`, `uvicorn server:app --port 8100`)

## Run

```bash
npm ci
npm run dev
```

Dev server: `https://localhost:5173`. It uses a self-signed cert (`@vitejs/plugin-basic-ssl`), so accept the browser warning once.

The server binds to all interfaces. To test the camera scanner on a phone, open `https://<your-lan-ip>:5173/ops` on the same Wi-Fi. Browsers allow camera access only on HTTPS or `localhost`.

### Dev proxy

Set in `vite.config.ts`. The browser stays same-origin.

| Path | Target |
| --- | --- |
| `/v1` | `http://localhost:8000` (Django API) |
| `/agent` | `http://localhost:8100` (voice concierge, WebSocket enabled, `/agent` prefix stripped) |

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run typecheck` | `tsc` only |

## Environment

| Variable | Effect |
| --- | --- |
| `VITE_DEMO_CARD=1` | Show demo card form at checkout. Use only against a backend in demo mode. Always on in `npm run dev`. |

## Layout

```
src/
  App.tsx          role router (admin / staff / traveller)
  pages/           Home, Results, Planner, Checkout, PaymentReturn, Confirmation,
                   MyTickets, GateBoard, AdminDashboard, StaffLogin
  components/      agent (voice UI), auth, map, results, search, seats, layout, icons,
                   PassportScanner
  api/             rest.ts (backend client), voiceAgent.ts (voice concierge client)
  context/         AuthContext, VoiceContext
  lib/             format, offers, passport, payment, voiceStream
  types/           admin, agent, auth
```

Payment gateway returns land on `/payment/esewa`, `/payment/khalti` and `/payment/fonepay`.

## Docker

Multi-stage build: Vite build, then nginx serves `dist/` and proxies `/v1` and `/agent`.

```bash
docker build -t swiftpass-web --build-arg VITE_DEMO_CARD= .
docker run -p 8080:80 \
  -e API_UPSTREAM=http://backend:8000 \
  -e AGENT_UPSTREAM=http://agent:8100 \
  swiftpass-web
```

| Variable | Default |
| --- | --- |
| `API_UPSTREAM` | `http://backend:8000` |
| `AGENT_UPSTREAM` | `http://agent:8100` |
| `PORT` | `80` |

Nginx config template: `docker/nginx.conf.template`.
