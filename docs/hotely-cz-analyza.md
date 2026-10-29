# Analýza portálu Hotely.cz

Podklad na vybudovanie podobného rezervačného portálu. Stav k 29. 10. 2026.

## 0. Ako vznikla a čo z nej neplynie

- **Zdroj:** jedna stiahnutá úvodná stránka `https://www.hotely.cz/` (HTML, hlavičky,
  `robots.txt`) a verejné články nájdené vyhľadávaním.
- **Web sme necrawlovali.** `robots.txt` obsahuje `User-Agent: ClaudeBot / Disallow: /`,
  prevádzkovateľ teda automatizovaný prístup Claude výslovne nechce. Výsledky
  vyhľadávania, detail ubytovania, rezervačný proces ani zákaznícky účet sme preto
  nevideli. Kapitola 9 popisuje, čo v takom portáli zvyčajne býva. Je to **odvodené**,
  nie overené. Ak ich treba overiť, nech si ich človek preklikne ručne v prehliadači.
- **Replikovať funkcie a štruktúru je v poriadku. Kopírovať obsah nie.** Texty, fotky
  ubytovaní, recenzie, logo, značka „Hotely.cz“ ani dáta o hoteloch sa preberať
  nesmú. Patria Szallas Group a hotelom.

### Dôležité: Hotely.cz končí

Úvodná stránka zobrazuje banner a modal:

> **Hotely.cz končí. Vaše rezervace platí dál.** Od 30. října 2026 již nebude možné na
> Hotely.cz vytvářet nové rezervace. Vaše stávající rezervace zůstávají platné a můžete je
> i nadále prohlížet a spravovat v této aplikaci. Plánujete další dovolenou nebo víkendový
> pobyt? Inspirujte se na Spa.cz.

Na stránke je aj nápis „ZAVÍRÁME DALŠÍ POBYTY NA SPA.CZ“. Návštevnosť a hotelieri
zo značky Hotely.cz sa tak presúvajú na Spa.cz, ktoré skupine zostáva. Pre nás to môže
byť príležitosť: na českom trhu sa uvoľňuje miesto pre lokálny portál. Rovnako to však
môže byť signál, že lokálny OTA portál sa ani so silným vlastníkom neuživil. Vyhľadávanie
uzavretie zatiaľ nepotvrdilo v žiadnom článku. Jediným zdrojom je samotný web.

## 1. Firma a ekosystém

| Položka | Hodnota |
|---|---|
| Prevádzkovateľ | **Szallas Group Zrt.**, Régi Posta utca 9., 3525 Miskolc, HU, IČ DPH HU32362903 |
| Materská firma | **Wirtualna Polska Holding SA** (kúpila skupinu v roku 2022 asi za 82 mil. EUR) |
| Kontakt | `rezervace@hotely.cz` (zákaznícka podpora v češtine) |
| História | Od 2008. V marci 2025 sa pod značkou Hotely.cz zlúčili české portály (Hotel.cz a ďalšie). Spa.cz zostalo samostatné. |
| Sesterské weby (hreflang) | noclegi.pl (pl), szallas.hu (hu), travelminit.ro (ro), revngo.com (en, de, sk, hr) |
| Ďalšie značky skupiny | nocowanie.pl, maiutazas.hu, szallasguru.hu, litoralulromanesc.ro, spa.cz |
| Mobilné aplikácie | Android `cz.hotely.app`, iOS `id6749220233` |
| Ponuka | 3 300+ ubytovaní v ČR, 100 000+ v okolitých krajinách (CZ, SK, HU, HR, AT, PL, RO) |
| Recenzie | Uvádzajú 3+ milióny overených recenzií (zdieľané v rámci skupiny) |

**Pozorovanie:** dáta ubytovaní sú spoločné pre celú skupinu. Karty majú
`data-partner-source="Szallas.hu"` a cenu aj v HUF (`data-price-in-huf`). Jeden
inventár sa teda predáva cez viac lokálnych značiek.

## 2. Obchodný model

- **OTA s províziou** zo zrealizovaných rezervácií. Presnú sadzbu sme vo verejných
  zdrojoch nenašli.
- **„Zaplaťte v hoteli“:** hosť platí až na mieste, portál zarába na provízii od hotela.
  Je to hlavný sľub v meta popise spolu s „garantované najlepšie ceny“.
- **VIP vernostný program:** registrácia je zdarma, členovia majú zľavu aspoň 10 %.
  Podľa podmienok szallas.hu sa hotel zapája dobrovoľne na jednej z troch úrovní a
  VIP zľavy môže pozastaviť najviac na 30 dní v roku. Program je hlavný nástroj na
  získavanie registrácií: CTA „Registrovat se“ je na viacerých miestach úvodnej stránky
  (`sitePoint=homepage:loyBanner`).
- **Zľavy z dennej ceny:** karty ukazujú pôvodnú cenu, zľavu v % a „Sleva z denní ceny“.
- **Pre partnerov:** registrácia ubytovacieho zariadenia, extranet na
  `https://admin.hotely.cz/login` a samostatné VOP pre ubytovateľov. Napojenie cez
  channel manager existuje, napríklad Channex má integráciu „Hotely“.
- **Newsletter:** `POST /ajax/newsletter/subscribe.json`.

## 3. Informačná architektúra a URL

Ploché, SEO orientované URL bez prefixov:

| Typ stránky | Príklad | Poznámka |
|---|---|---|
| Krajina | `/ceska-republika`, `/slovensko`, `/chorvatsko`, `/rakousko`, `/madarsko`, `/polsko`, `/rumunsko` | |
| Región | `/sumava`, `/krkonose-1168`, `/jizni-morava`, `/region-vysoke-tatry`, `/tirolsko` | pri kolízii názvu sa pridáva číselné ID |
| Mesto | `/praha-3067696`, `/brno`, `/cesky-krumlov-3077889`, `/mikulov-3070720` | ID pripomína GeoNames |
| Krajina + typ | `/ceska-republika/hotely`, `/penziony`, `/apartmany`, `/rekreacni-domy`, `/hostince`, `/vila`, `/hostely`, `/rekreacni-strediska`, `/motely` | landing stránky podľa typu |
| Detail ubytovania | `/aparthotel-dks` | slug z názvu priamo v koreni |
| Účet | `/prihlaseni`, `/registrace`, `/vip` | |
| Právne | `/vop`, `/podminky-pouzivani`, `/ochrana-udaju`, `/prohlaseni-o-pristupnosti`, `/zasady-vyrizovani-stiznosti`, `/o-spolecnosti` | |

**Parametre vyhľadávania** (z `data-urlparams` na kartách):

```
?adults=2&checkin=2026-11-01&checkout=2026-11-02&rooms=1
?adults=2&rooms=1&default_search=1&sort=discount
```

Formulár ďalej posiela `destination`, `dates`, `guests` a `childAges` (vek každého dieťaťa).

**Neverejné cesty z robots.txt** napovedajú, aké moduly backend má:
`/ajax`, `/room_reservation/`, `/package_reservation/` (balíčky/pobyty),
`/settlement/`, `/spa/`, `/spa_gallery/`, `/reservation-register`, `/cobrand/`
(white-label pre partnerov), `/affiliate-search-box`, `/affiliate-banner/` (affiliate
program), `/plugin/`.

Sitemap: `https://www.hotely.cz/sitemaps/cs-new-index.xml` (neotvárali sme ju).

## 4. Úvodná stránka, sekcie v poradí

1. **Hlavička:** logo, „Přihlásit se“, menu profilu (login cez Facebook, Google, Apple,
   odkaz na registráciu), menu destinácií v modale s podúrovňami Destinace → Města →
   Ubytování podle typu a zahraničím.
2. **Hero s vyhľadávaním.** Desktop má jeden riadok (výška 72 px, elevated shadow),
   mobil má vertikálny formulár. Polia:
   - *Kam cestujete?* s autocomplete destinácií aj ubytovaní,
   - *Kdy cestujete?* s dvojmesačným kalendárom, predvolene „Libovolný termín“,
   - *Hosté a pokoje* s predvolenou hodnotou „2 dospělí, 1 pokoj“. Stepper počíta
     dospelých, deti a izby, pri každom dieťati sa vyberá vek (až 10 selectov).
3. **USP:** Sleva 10 % pro VIP členy · Široký výběr · Zákaznická podpora v češtině ·
   3 miliony reálných recenzí.
4. **Nejoblíbenější destinace Čechů:** dlaždice (Chorvatsko, Krkonoše, Jižní Morava,
   Praha, Český Krumlov).
5. **Karusely ubytovaní:** Nejvýhodnější nabídky (`sort=discount`), Nejoblíbenější
   hotely, Nejoblíbenější apartmány a chaty. Každý má odkaz „Zobrazit vše“.
6. **Banner VIP / registrácia.**
7. **Banner aplikácie** s odkazmi do App Store a Google Play (smart link).
8. **Newsletter:** „Získejte jako první nejlepší nabídky na cestování!“
9. **SEO blok odkazov** „Oblíbená místa v Česku“: regióny, mestá a typy.
10. **Pätička:** kontakt, reklamácie, O nás, podmienky, cookies, nahlásenie nezákonného
    obsahu (DSA), whistleblowing, pre partnerov, inšpirácia, sociálne siete (FB, IG).

## 5. Karta ubytovania a dátový model

Atribúty karty v karuseli prezrádzajú, čo má entita „ponuka“:

```
hotel_id            1568777
name                "aparthotel DKS ***"
category            "apartment ***"           (typ + hviezdičky)
country             "Česká republika"         (item-category2)
city                "Chomutov"                (item-category3)
room_type           "standard"                (item-category4)
board               "Bez stravy"              (item-category5: strava)
price / currency    2218 CZK                  (+ price_in_huf pre skupinu)
original_price      3650 CZK, discount -39 %
average_rating      10   rating_count 1
is_loyalty          false                     (zapojenie do VIP)
partner_source      "Szallas.hu"
image               i.wpimg.pl/500x500/.../hotels/{id}/original/{photo}.webp
price label         "2 os., 1 noc, bez stravy" + termín "1. - 2. listopadu"
```

Na karte je fotka, názov, hviezdičky, odznak hodnotenia (číslo 0–10 na farebnom pozadí
s textom „Na základě N hodnocení“), chip so zľavou, tooltip s podrobnosťami akcie,
preškrtnutá pôvodná cena, výsledná cena a popis obsadenosti, termínu a stravy.

**Návrh minimálnej schémy pre repliku:**

```
property(id, slug, name, type, stars, address, city_id, lat, lng, description,
         amenities[], check_in_from, check_out_to, policies, is_loyalty, status)
city(id, slug, name, region_id) · region(id, slug, name, country_id) · country(...)
photo(id, property_id, url, order)
room_type(id, property_id, name, capacity_adults, capacity_children, beds, size_m2)
rate_plan(id, room_type_id, board, cancellation_policy, prepayment, min_stay)
daily_rate(rate_plan_id, date, price, original_price, allotment, closed)
reservation(id, code, property_id, room_type_id, rate_plan_id, checkin, checkout,
            adults, child_ages[], price_total, commission, status, guest_*, user_id)
review(id, property_id, reservation_id, score_0_10, sub_scores, text, created_at)
user(id, email, social_ids, vip_level, newsletter_opt_in)
```

## 6. Technológie (pozorované)

| Vrstva | Zistenie |
|---|---|
| Server | `nginx`, hlavička `x-backend: nop_go`, teda backend pravdepodobne v Go (cesta `/wsngo/`) |
| Renderovanie | **server-side HTML + htmx** (`hx-get`, `hx-target`, `Vary: HX-Request`, rozšírenie `idiomorph`) a **Alpine.js** na lokálnu interaktivitu |
| CSS | vlastný design system „new-ds“ (`/wsngo/css/new-ds.css`), utility triedy v štýle Tailwindu s vlastnými tokenmi (`bg-szallas-surface-*`, `gap-ds-2xs`, `rounded-ds-m`, `shadow-ds-elevated`, `type-body-5-bold`) |
| Fonty | **Outfit** (nadpisy) a **DM Sans** (text), self-hosted woff2 |
| JS | malé samostatné moduly s `defer` (`nds-calendar.js`, `nds-stepper.js`, `nds-search-popovers.js`, `nds-destinations-modal.js`, `nds-login.js`, `nds-newsletter.js` …), žiadny SPA framework |
| Ikony | inline SVG sprite (`<symbol id="nds-i-…">`) |
| Obrázky | CDN `i.wpimg.pl` (WP Holding) so zmenou veľkosti cez URL (`/500x500/`) a formátom WebP |
| Prihlásenie | Facebook, Google (vrátane One Tap so súhlasom podľa consent), Apple, e-mail. Modal sa načítava cez htmx z `/ajax/profile/login_modal?sitePoint=…` |
| Analytika | GA4 e-commerce dataLayer (`item_brand`, `item_category1–5` na kartách), vlastné `visitor-events.js`, skript WP (`wp.pl` modulepreload), cookie `__wph_statid` |
| Testovateľnosť | systematické `data-test="nds-…"` atribúty (950× na úvodnej stránke) |
| Bezpečnosť | HSTS s `includeSubDomains`, Client Hints (`Accept-CH`) |
| A11y | `role="search"`, `aria-label`, focus ring, vyhlásenie o prístupnosti |

## 7. SEO

- `<title>` a OG: „Ubytování v Česku, Slovensku, Maďarsku a Chorvatsku! | Hotely.cz“
- Meta description je postavená na „garantované nejlepší ceny“, „zaplaťte v hotelu“ a
  „jedinečné slevy“.
- JSON-LD `@graph`: `WebSite`, `WebPage`, `Organization` (`Corporation` + `Brand`,
  legalName, vatID, LEI, adresa, contactPoint, `parentOrganization`) a 2×
  `MobileApplication`.
- `hreflang` na sesterské domény, `canonical`, `robots: index, follow`.
- Tisíce landing stránok podľa krajiny, regiónu, mesta a typu, prepojených interným
  blokom odkazov.

## 8. Právne a regulačné prvky (CZ/EU)

Toto bude potrebovať aj replika:

- VOP pre hostí, zvlášť VOP pre ubytovateľov, podmienky používania, GDPR, cookie lišta
  s nastavením.
- **Reklamačný poriadok:** odpoveď do 30 dní, odkaz na ČOI, ADR (mimosúdne riešenie
  sporov) a platformu EU ODR.
- **DSA:** formulár na nahlásenie nezákonného alebo urážlivého obsahu
  (`/ajax/offensive-content-modal`).
- **Whistleblowing:** „Nahlášení pochybení“.
- Vyhlásenie o prístupnosti (European Accessibility Act platí od 6/2025).
- **eTurista:** pripravovaná povinná registrácia ubytovacích zariadení v ČR. Platformy
  budú pravdepodobne smieť zobrazovať len zariadenia s registračným číslom, preto treba
  mať v dátach pole pre registračné číslo.

## 9. Čo sme nevideli: typický rozsah OTA (odvodené)

Treba overiť ručným prekliknutím:

- **Výsledky vyhľadávania:** zoznam a mapa, filtre (cena, typ, hviezdičky, hodnotenie,
  strava, wellness, vybavenie, parkovanie, zvieratá, bezplatné storno, VIP), triedenie
  (odporúčané, cena, zľava, hodnotenie, vzdialenosť), stránkovanie, prázdne termíny.
- **Detail ubytovania:** galéria, popis, vybavenie, mapa, izby a cenové plány s
  dostupnosťou na zvolený termín, storno podmienky, recenzie s čiastkovými hodnoteniami,
  podobné ubytovania. Pobytové balíčky (wellness, polpenzia) naznačuje cesta
  `/package_reservation/`.
- **Rezervácia:** výber izby → údaje hosťa → (voliteľne) platba alebo záloha →
  potvrdzujúci e-mail → správa rezervácie (zmena, storno).
- **Účet:** moje rezervácie, obľúbené, VIP úroveň, nastavenie newslettera.
- **Po pobyte:** e-mail so žiadosťou o recenziu. Hodnotiť môže len ten, kto u nich
  pobýval („ověřené recenze“).
- **Extranet pre hotely:** ceny a dostupnosť, fotky, rezervácie, faktúry provízií,
  odpovede na recenzie, napojenie na channel managery.

## 10. Odporúčanie pre repliku

Tento repozitár je dnes **direct booking pre jedno ubytovanie** (Studentská Prague):
React + Fastify + SQLite, PMS proxy, iCal z Airbnb/Booking, cena, kupóny, mestský
poplatok, potvrdenie a e-mailová fronta. To je v podstate „detail ubytovania +
rezervácia“ jedného hotela. Portál typu Hotely.cz je **marketplace**, teda o rád
väčší projekt.

Navrhované etapy:

1. **MVP katalóg (multi-property):** entity `property / room_type / rate_plan /
   daily_rate`, SEO stránky krajina → región → mesto → typ, detail ubytovania a
   vyhľadávanie s parametrami `checkin, checkout, adults, child_ages, rooms`.
   Ponuku plníme ručne alebo importom od prvých partnerov, nie scrapingom.
2. **Rezervácia „platba v hoteli“:** znovu použiť existujúci quote, booking,
   potvrdenie a e-mailovú frontu zo `server/` a rozšíriť ich o `property_id` a
   províziu.
3. **Extranet pre ubytovateľov:** správa cien a dostupnosti, iCal/ARI import (máme
   `server/src/ical.ts`), neskôr napojenie channel managera (Channex a pod.).
4. **Účty a vernosť:** social login, VIP zľava ako príznak na cenovom pláne,
   newsletter s double opt-in (odhlasovanie a suppression list už máme).
5. **Recenzie viazané na rezerváciu**, výpočet priemeru a počtu.
6. **Právny balík:** VOP pre oboch, reklamačný poriadok, DSA, GDPR a cookies.

**Technológie:** Ak chceme rýchle SEO stránky, server-side rendering (ako Hotely.cz
cez Go + htmx) je výhodnejší než čistý SPA. Pri našom stacku to znamená buď SSR
React (napr. Vite SSR alebo Next.js), alebo Fastify so šablónami a htmx. Súčasný
SPA prístup stačí na detail a rezerváciu, na tisíce indexovateľných landing stránok
nie.

## Zdroje

- Úvodná stránka a `robots.txt` hotely.cz (stiahnuté 29. 10. 2026, jedna požiadavka)
- [Forbes CZ: „Nechceme být další Booking“](https://forbes.cz/nechceme-byt-dalsi-booking-hotely-cz-sili-sazeji-na-znalost-trhu-i-lokalni-servis/)
- [ČTK / České noviny: Nový portál Hotely.cz chce konkurovat Bookingu](https://www.ceskenoviny.cz/zpravy/novy-portal-hotelycz-chce-v-cesku-konkurovat-bookingu/2649988)
- [CzechCrunch: Hotel.cz a Spa.cz se spojují se Szallas](https://cc.cz/ceske-rezervacni-portaly-hotel-cz-a-spa-cz-se-spojuji-s-madarskou-jednickou-v-online-ubytovani/)
- [Deloitte: Szallas Group 2022 (predaj WP)](https://www2.deloitte.com/hu/en/pages/mergers-and-acquisitions/articles/transactions/szallas-group-2022.html)
- [Szallas.hu: VIP Hűségprogram – FAQ](https://szallas.hu/gyik-husegprogram) a [doplnkové podmienky](https://szallas.hu/vip20250702)
- [Channex: integrácia Hotely.cz](https://channex.io/integrations/hotely)
- [Podnikatel.cz: eTurista](https://www.podnikatel.cz/clanky/ubytovavate-v-hotelu-nebo-pres-airbnb-budete-se-muset-registrovat-do-eturisty/)
