# Studentská Prague

Ubytovací sprievodca a rezervačný dopytový formulár pre **studentskaprague.cz**
(Backyard Dejvice).

## Architektúra

Jeden Docker obraz obsahuje statický frontend aj API — všetko je same-origin,
takže netreba riešiť CORS ani API kľúče v prehliadači.

| Časť | Technológia | Kde |
|---|---|---|
| Frontend | Vite + React + TypeScript + Tailwind (shadcn/ui) | `src/` |
| API a odosielanie mailov | Node 22 + Fastify + SQLite | `server/` |
| Nasadenie | Docker → GHCR → Hetzner VPS za Caddy | `Dockerfile`, `docker-compose.yml` |

### API

| Endpoint | Načo |
|---|---|
| `GET /api/availability` | Obsadené termíny zlúčené z iCal kalendárov Airbnb a Booking.com |
| `POST /api/inquiry` | Prijme dopyt, uloží ho a zaradí notifikačný mail |
| `GET,POST /api/unsubscribe` | Overenie a spracovanie odhlásenia (aj RFC 8058 one-click) |
| `POST /api/webhooks/resend` | Bounces a sťažnosti od Resendu (overené Svix podpisom) |
| `GET /api/health` | Stav služby a hĺbka fronty |

### Odosielanie mailov

Notifikácia sa neposiela synchrónne — vyrenderuje sa a uloží do fronty v SQLite,
ktorú spracúva worker v tom istom procese. Fronta má visibility timeout, rozpočet
opakovaní, TTL, DLQ a backoff pri rate limite, takže pomalý alebo nedostupný
poskytovateľ nikdy nezablokuje odoslanie formulára hosťom.

## Vývoj

```bash
npm install
npm run dev          # frontend na :8080, /api sa proxuje na :8081
```

V druhom termináli:

```bash
cd server
npm install
npm run build && DATA_DIR=./data PORT=8081 STATIC_DIR=/nonexistent npm start
```

Premenné prostredia pre server sú popísané v [.env.example](.env.example).
Bez `RESEND_API_KEY` server funguje normálne, maily sa len hromadia vo fronte.

```bash
npm run lint         # frontend
npm test             # frontend (vitest)
cd server && npm run typecheck
```

## Nasadenie

Postup krok za krokom vrátane Caddy, DNS a Resendu: **[DEPLOY.md](DEPLOY.md)**.

## História

Projekt pôvodne bežal na Lovable so Supabase backendom (edge funkcie, Postgres,
`pgmq` fronta, mailovanie cez Lovable API). Migráciou na vlastný server odpadli
obe závislosti; funkcionalita vrátane odhlasovania a suppression listu zostala
zachovaná.
