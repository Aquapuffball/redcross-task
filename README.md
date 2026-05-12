# Røde Kors – kapasitetsplanlegging for innvandring

Next.js (App Router) prosjekt som kombinerer:

- **Innvandringsdata per kommune og år** (SSB, manuelt nedlastet CSV — APIet krever pålogging)
- **Fritids-/aktivitetssentre per kommune og år** (SSB tabell 12063, hentet automatisk via PxWeb API)
- **Lokale Røde Kors-avdelinger, kontakter og aktiviteter** (snapshot fra Røde Kors' organisasjons-API, lagret som JSON-fil)

Frontenden viser et sammendrag per kommune (`/`) der man velger kommune + år og får innvandringstall, lokal Røde Kors-kontakt og hvilke aktiviteter avdelingen kjører.

Tech stack: **Next.js 16** (App Router, Turbopack) · **React 19** · **Prisma 7** (Postgres) · **rk-designsystem** + **Tailwind v4** (bundet til DS-tokens).

---

## Førstegangsoppsett

### Forutsetninger

- Node.js (v20+ anbefalt)
- En Postgres-database (lokal eller cloud, f.eks. Prisma Postgres)
- `git`

### 1. Klon og installer

```bash
git clone <repo-url>
cd redcross-task
npm install
```

`postinstall` kjører `prisma generate` automatisk.

### 2. Sett opp `.env`

Opprett en `.env`-fil i prosjektroten med din Postgres connection string:

```bash
DATABASE_URL="postgres://USER:PASSWORD@HOST:5432/DBNAME?sslmode=require"
```

> Prosjektet bruker Prisma 7s Postgres driver-adapter, og leser `DATABASE_URL` via `dotenv/config` i `prisma.config.ts` og i hvert importskript.

### 3. Opprett databaseskjemaet

Hvis databasen er helt ny (ingen tabeller):

```bash
npx prisma migrate dev --name init
```

Hvis du allerede har en database med skjema men er på en annen maskin:

```bash
npx prisma migrate deploy
```

### 4. Last inn alle datasett (én kommando)

Datafilene som ligger i repoet:

- `befolkning_innvandringsgrunn_kommuner.csv` – innvandringsdata (CSV)
- `api-getOrganizations-output-21apr26.json` – Røde Kors-organisasjon (JSON)
- SSB 12063 fritidssentere – hentes automatisk

Bootstrap hele datalaget med:

```bash
npm run data:bootstrap
```

Dette kjører i rekkefølge:

1. For hvert år i `2022 2023 2024 2025`:
   - `fetch:ssb:12063 -- <år>` – henter SSB-tabell 12063 for året til `data/ssb/12063-<år>.json`
   - `import:ssb:12063 -- <år>` – fyller `Municipality` (kommune + fylkesnavn fra SSB Klass 104) og `MunicipalityLeisureCenterStat`
2. `import:immigration -- ./befolkning_innvandringsgrunn_kommuner.csv` – fyller / oppdaterer `MunicipalityImmigrationStat` (alle år som finnes i CSV-en)
3. `import:organizations` – fyller `OrganizationBranch`, `BranchContact`, `BranchActivity` fra JSON-snapshotet

Året-spennet 2022–2025 dekker visningsårene (`COMPARISON_YEARS = [2025, 2024, 2023]`) pluss året før hvert visningsår (brukes til å beregne endring i innvandringssammendraget).

Rekkefølgen er viktig: SSB **først** så kommuner får riktig fylkesnavn, deretter innvandring, deretter organisasjoner (slik at avdelinger kan kobles til riktig kommune-id).

Importene er idempotente og trygge å kjøre på nytt.

> Bootstrap-kommandoen bruker en `for`-løkke i `sh` og fungerer på macOS/Linux. Trenger du å kjøre på Windows uten WSL, bruk istedet enkeltkommandoene under.

### 5. (Valgfritt) normaliser kommuner

Hvis du ser duplikate kommunerader eller manglende navn etter import:

```bash
npm run municipalities:normalize           # dry-run, rapporterer hva som ville endres
npm run municipalities:normalize -- --apply  # utfør sammenslåing/normalisering
```

### Kjøre enkeltsteg fra bootstrap manuelt

Hvis du heller vil kjøre stegene individuelt (f.eks. når du oppdaterer ett datasett, eller du er på Windows uten WSL):

```bash
# SSB fritidssentere – ett år av gangen (gjenta for hvert år du trenger)
npm run fetch:ssb:12063 -- 2022
npm run import:ssb:12063 -- 2022
npm run fetch:ssb:12063 -- 2023
npm run import:ssb:12063 -- 2023
npm run fetch:ssb:12063 -- 2024
npm run import:ssb:12063 -- 2024
npm run fetch:ssb:12063 -- 2025
npm run import:ssb:12063 -- 2025

# Innvandrings-CSV (importerer alle år som finnes i fila)
npm run import:immigration -- ./befolkning_innvandringsgrunn_kommuner.csv

# Røde Kors-organisasjoner
npm run import:organizations
# Valgfritt: bytt JSON-fil
npm run import:organizations -- ./path/to/file.json
```

---

## Utvikling

Start utviklingsserveren (Turbopack):

```bash
npm run dev
```

Åpne [http://localhost:3000](http://localhost:3000).

Andre nyttige kommandoer:

```bash
npm run lint        # eslint
npm run build       # prod build (next build)
npm run start       # serve prod build
npm run prisma:generate
```

---

## Test API-ene

Alle endepunktene er Next.js Route Handlers under `app/api/**/route.ts` og kjører dynamisk (`force-dynamic`). De forventer at databasen er populert via stegene over.

Eksemplene under bruker kommunenummer `0301` (Oslo) og år `2025`. Du kan også oppgi en kommunes `id` (cuid fra `Municipality.id`) i stedet for kommunenummer i `municipality`-parameteret.

### 1. `GET /api/kommuner` — alle kommuner (id, kode, navn, fylke)

```bash
curl -s "http://localhost:3000/api/kommuner" | head -c 800
```

Åpne i nettleser: <http://localhost:3000/api/kommuner>

### 2. `GET /api/immigrering` — innvandringsstatistikk

Krever minst én av `year` (1990–2100) eller `municipality`.

```bash
curl -s "http://localhost:3000/api/immigrering?year=2025&municipality=0301"
```

Åpne i nettleser: <http://localhost:3000/api/immigrering?year=2025&municipality=0301>

### 3. `GET /api/fritidssentere` — SSB 12063 fritidssentere

Samme parametre som `/api/immigrering`.

```bash
curl -s "http://localhost:3000/api/fritidssentere?year=2025&municipality=0301"
```

Åpne i nettleser: <http://localhost:3000/api/fritidssentere?year=2025&municipality=0301>

### 4. `GET /api/organisasjon/aktiviteter` — Røde Kors-aktiviteter i kommunen

Krever `municipality`. Returnerer en sortert, unik liste over aktivitetsnavn (lokalt navn foretrekkes, faller tilbake på globalt).

```bash
curl -s "http://localhost:3000/api/organisasjon/aktiviteter?municipality=0301"
```

Åpne i nettleser: <http://localhost:3000/api/organisasjon/aktiviteter?municipality=0301>

### 5. `GET /api/organisasjon/lokal-kontakt` — primær avdeling + kontakter

Krever `municipality`. Plukker primær avdeling for kommunen og returnerer kontakter sortert med Leder først, så Nestleder, så øvrige.

```bash
curl -s "http://localhost:3000/api/organisasjon/lokal-kontakt?municipality=0301"
```

Åpne i nettleser: <http://localhost:3000/api/organisasjon/lokal-kontakt?municipality=0301>


---

## Datakilder og kobling til database

| Sannhetskilde | Hvordan lastes | Importeres til | Brukes av endepunkt |
|---|---|---|---|
| CSV: `befolkning_innvandringsgrunn_kommuner.csv` (manuelt nedlastet — SSB-APIet krever pålogging) | `npm run import:immigration` | `MunicipalityImmigrationStat` | `/api/immigrering` |
| JSON: `api-getOrganizations-output-21apr26.json` (snapshot fra Røde Kors org-API) | `npm run import:organizations` | `OrganizationBranch`, `BranchContact`, `BranchActivity` | `/api/organisasjon/aktiviteter`, `/api/organisasjon/lokal-kontakt`, `/api/tjenester/[id]` |
| SSB Tabell 12063 (hentes automatisk via PxWeb) | `npm run fetch:ssb:12063` + `npm run import:ssb:12063` | `Municipality`, `MunicipalityLeisureCenterStat` | `/api/fritidssentere`, `/api/kommuner` |

