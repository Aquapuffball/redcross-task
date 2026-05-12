This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## The idea - capacity planning for immigration

By combining data about activity centers in counties, together with immigration data per year per county, and the available activites Red Cross has per county, this project will present the data giving key information about where it has good capacity to handle immigration or it needs more activities/ spots for planned immigration. Focusing on refugees and family immigrants, as presumeably work and study immigrants might have less needs for humiterrian help.

## Flow:

Create backend to get data from immigration api by county (csv download for now), SSB activity centers by county, json file provided from red cross organistations. Create database model based on these, and new tables to connect them for the case of my task.

Create nextjs api to connect to the database and routes for different outputs.

Create frontend, and connect the data in here.

## Import organizations JSON into Prisma

1. Install dependencies:

```bash
npm install
```

2. Generate Prisma client and apply migrations (required before imports — otherwise tables are missing):

```bash
npm run prisma:generate
npx prisma migrate dev --name init-organizations
```

Database scripts (`import:*`) use Prisma 7’s Postgres driver adapter; connection string is read via `DATABASE_URL` in `.env` (see `scripts/create-script-prisma.ts`).

3. Import organizations from the default file:

```bash
npm run import:organizations
```

Optional: import from another file path:

```bash
npm run import:organizations -- ./path/to/file.json
```

### SSB fritidsdata (PxWeb JSON-stat) + kommuner som sannhetskilde

1. Hent snapshot (samme POST som før):

```bash
npm run fetch:ssb:12063 -- 2025
```

Lagrer til `data/ssb/12063-2025.json`.

2. Last inn kommuner (+ fylkesnavn via SSB klass 104) og fritidsstatistikker:

```bash
npm run import:ssb:12063 -- 2025
```

Valgfri egen JSON-fil: `npm run import:ssb:12063 -- 2025 ./sti/til/ssb.json`

Tabell **12063** gir ikke norsk «statsregion»; `Municipality.region` settes ikke her (kan fylles senere). `Municipality.county` settes fra Klass 104 ut fra de to første sifrene i kommunenummeret.

### Immigration CSV (befolkning_innvandringsgrunn_kommuner.csv)

Oppretter manglende `Municipality` med navn fra CSV om kode ikke finnes (overskriver **ikke** eksisterende rader fra SSB). Deretter erstatter alle `MunicipalityImmigrationStat`-rader for årene som finnes i filen og bulk-inserter på nytt (idempotent re-importer):

```bash
npm run import:immigration -- ./befolkning_innvandringsgrunn_kommuner.csv
```

Anbefalt rekkefølge: først `import:ssb:12063`, deretter `import:immigration`, deretter `import:organizations` (slik avdelinger får koblet `county`/navn fra SSB ved treff på kommunenavn).

## How have i used AI for this task?

- I provided the raw structure of what is (immigration data, organizations data from Red Cross and activity centers), and had it suggest a prisma model stucture of each one of these. These kind of tasks where its to look at data, and extract into something known is something AI is very strong in and saves alot of time.

## What i would have done if i had more time.

- Connect immigration data directly to the API, here i needed a user to get the spesific data endpoint i wanted, and had problems creating a user. As a tempfix here i downloaded the available data manually, and imported through this file.

## What is missing:

- Fix presentation, and maybe add some feature to show how well a municipality is prepared for immigrating new people
- Fix responsive design
- Clean up code
- Deploy to vercel
- Test on other computer
- Fix readme
