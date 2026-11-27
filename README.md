# Swiftpass Frontend

Next.js + TypeScript web app for Swiftpass. One build serves three experiences, chosen by sign-in role:

| Who | Sees |
| --- | --- |
| Traveller / guest | Search, results, seat picker, cart, checkout, confirmation, My Tickets, voice concierge, live map |
| `admin` | Admin dashboard (stats, users, occurrences) with embedded storefront and scanner |
| `operator_staff`, `gate_agent` | Gate board: QR ticket scanner |

Staff sign in at `/admin` or `/ops`. These URLs are not linked from the traveller site.

## Stack

- Next.js 16 (App Router, static export), React 19, TypeScript
- Tailwind CSS 4 + shadcn/ui (Radix primitives in `src/components/ui`), sonner toasts
- Leaflet (maps), `qrcode` / `jsqr` (ticket QR), `tesseract.js` + `mrz` (passport scan)

## Requirements

- Node 22 (matches the Dockerfile)
- Backend running on `localhost:8000` (`backend/`, `python manage.py runserver`)
- Optional: voice concierge on `localhost:8100` (`models/agent-project/`, `uvicorn server:app --port 8100`)

## Run

```bash
npm ci
npm run dev        # http://localhost:3000
```

`next.config.ts` proxies `/v1` to `http://localhost:8000` and `/agent` to `http://localhost:8100` in dev, so the browser stays same-origin. The microphone and camera need `localhost` or HTTPS.

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Next dev server (Turbopack) |
| `npm run build` | Typecheck and static export to `out/` |
| `npm run typecheck` | `tsc` only |

## Environment

| Variable | Effect |
| --- | --- |
| `NEXT_PUBLIC_DEMO_CARD=1` | Show demo card form at checkout. Use only against a backend in demo mode. Always on in `npm run dev`. |

## Layout

```
src/
  app/              routes: (site)/ traveller pages, admin, ops, payment/[provider], payment/stripe/sim
  views/            one screen per route (Home, Results, Planner, Checkout, Confirmation, Tickets, ...)
  components/
    ui/             shadcn primitives (button, card, input, dialog, tabs, ...)
    shared/         app-level building blocks: FormField, SectionCard, TripSummary, PaymentMethodPicker, ...
    agent, auth, layout, map, results, search, seats, ticket, passport, home
  hooks/            useAsync, useOffers, useTravellerForm, ...
  context/          AuthContext, TripContext (booking journey), VoiceContext
  api/ lib/ types/  backend client, pure helpers, types
```

Add shadcn components with `npx shadcn add <name>` (`components.json` is set up).

Payment gateway returns land on `/payment/esewa`, `/payment/khalti`, `/payment/fonepay` and `/payment/stripe`.

## Docker

Multi-stage build: Next static export, then nginx serves `out/` and proxies `/v1` and `/agent`.

```bash
docker build -t swiftpass-web --build-arg NEXT_PUBLIC_DEMO_CARD= .
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
