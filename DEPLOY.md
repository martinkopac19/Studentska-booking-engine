# Nasadenie na Hetzner VPS

Projekt beží ako **samostatný compose projekt** v `~/studentskaprague`, vedľa
`redmine` a `kopacovci`. Aktualizácia tohto projektu nereštartuje ostatné.

```
Internet → Caddy (existujúci stack) → studentskaprague:8080 (tento kontajner)
                                        ├── statický frontend (Vite build)
                                        ├── /api/*  (Fastify)
                                        └── SQLite v /data (docker volume)
```

Kontajner **nepublikuje žiadny port na hostiteľovi** — Caddy ho oslovuje menom
cez zdieľanú externú Docker sieť.

---

## 1. Predpoklady

### Resend

1. Založ účet na [resend.com](https://resend.com).
2. **Domains → Add domain** → `studentskaprague.cz`.
3. Resend vypíše DNS záznamy (DKIM `TXT`, SPF `TXT`, prípadne `MX` pre návratovú
   adresu). Zadaj ich vo Websupporte a počkaj na overenie.
4. **API Keys** → vytvor kľúč s právom *Sending access* → `RESEND_API_KEY`.

> Bez overenej domény Resend odmietne odosielať a maily skončia v DLQ.

### DNS (Websupport)

`studentskaprague.cz` aj `www` teraz mieria na Lovable (`185.158.133.1`).
Prepínajú sa až v kroku 5.

---

## 2. Príprava adresára na serveri

```bash
mkdir -p ~/studentskaprague/data
cd ~/studentskaprague
```

Skopíruj `docker-compose.yml` a `.env.example` z repozitára a vytvor `.env`:

```bash
cp .env.example .env
$EDITOR .env
```

Zisti meno existujúcej proxy siete a doplň ho do `PROXY_NETWORK`:

```bash
docker network ls
```

Do `.env` patria aj obe iCal URL — nájdeš ich v git histórii pred migráciou
(`git show 583e680:supabase/functions/get-availability/index.ts`). **Obsahujú
tajné tokeny**, preto sú teraz v konfigurácii a nie v zdrojáku.

---

## 3. Prihlásenie do GHCR a spustenie

Obraz sa buildí v GitHub Actions; server ho len ťahá.

```bash
echo <GITHUB_PAT_s_read:packages> | docker login ghcr.io -u martinkopac19 --password-stdin
docker compose pull
docker compose up -d
docker compose logs -f
```

Overenie zvnútra siete (kontajner nemá port na hostiteľovi):

```bash
docker exec studentskaprague node -e "fetch('http://127.0.0.1:8080/api/health').then(r=>r.json()).then(console.log)"
```

Očakávaný výstup: `{ status: 'ok', queued: 0 }`

---

## 4. Caddy

Obsah `deploy/Caddyfile.snippet` pridaj do Caddyfile existujúceho stacku.
**Najprv validuj, až potom reloadni** — pri chybe zostane pôvodná konfigurácia
a redmine ani kopacovci nespadnú:

```bash
docker exec <caddy_kontajner> caddy validate --config /etc/caddy/Caddyfile
docker exec <caddy_kontajner> caddy reload --config /etc/caddy/Caddyfile
```

Caddy si vyžiada certifikát až keď doména mieri na tento server — teda po kroku 5.

---

## 5. Prepnutie DNS

Vo Websupporte prepíš `A` záznamy:

| Záznam | Zo starého | Na nové |
|---|---|---|
| `studentskaprague.cz` | `185.158.133.1` | `46.225.187.86` |
| `www.studentskaprague.cz` | `185.158.133.1` | `46.225.187.86` |

Pred prepnutím zníž TTL (napr. na 300 s), nech je prípadný návrat rýchly.

Po prejavení zmeny:

```bash
curl -I https://studentskaprague.cz
curl -s https://studentskaprague.cz/api/health
```

---

## 6. Webhook pre bounces a sťažnosti

V Resende **Webhooks → Add endpoint**:

- URL: `https://studentskaprague.cz/api/webhooks/resend`
- Udalosti: `email.bounced`, `email.complained`

Signing secret (`whsec_…`) daj do `.env` ako `RESEND_WEBHOOK_SECRET` a reštartuj:

```bash
docker compose up -d
```

Endpoint overuje Svix podpis; bez správneho secretu vráti 401.

---

## 7. Prevádzka

**Aktualizácia po merge do `main`** (GitHub Actions dovtedy pushne obraz):

```bash
cd ~/studentskaprague && docker compose pull && docker compose up -d
```

**Záloha** — celý stav je jeden SQLite súbor:

```bash
docker exec studentskaprague node -e "require('better-sqlite3')('/data/app.db').backup('/data/backup.db')" \
  && cp ~/studentskaprague/data/backup.db ~/zalohy/studentskaprague-$(date +%F).db
```

**Prehľad dopytov:**

```bash
sqlite3 ~/studentskaprague/data/app.db \
  "SELECT created_at, guest_name, guest_email, check_in, check_out FROM reservation_inquiries ORDER BY created_at DESC LIMIT 20;"
```

**Neodoslané maily (DLQ):**

```bash
sqlite3 ~/studentskaprague/data/app.db \
  "SELECT dead_lettered_at, reason, json_extract(payload,'\$.to') FROM email_queue_dlq;"
```

**Stav odosielania:**

```bash
sqlite3 ~/studentskaprague/data/app.db \
  "SELECT created_at, status, recipient_email, error_message FROM email_send_log ORDER BY created_at DESC LIMIT 20;"
```

---

## 8. Návrat na Lovable

Kým Lovable projekt nezrušíš, návrat je len prepnutie `A` záznamov späť na
`185.158.133.1`. Preto Lovable **nerušte skôr**, než web na Hetzneri odbehne
aspoň pár dní vrátane doručeného testovacieho mailu.

---

## Pozor: neodhlás sa z vlastných notifikácií

Notifikačný mail obsahuje `List-Unsubscribe` hlavičku, takže Gmail či Seznam
ponúknu tlačidlo „Odhlásiť sa". Ak ho klikneš, adresa sa dostane do
`suppressed_emails` a **notifikácie ti prestanú chodiť** — formulár bude
hosťom naďalej hlásiť úspech a dopyty sa budú ukladať do databázy, len sa o nich
nedozvieš mailom.

Vrátenie späť:

```bash
sqlite3 ~/studentskaprague/data/app.db \
  "DELETE FROM suppressed_emails WHERE email='kopacmartin@email.cz';
   UPDATE email_unsubscribe_tokens SET used_at=NULL WHERE email='kopacmartin@email.cz';"
docker compose restart
```
