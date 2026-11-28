# SEMS — Sistemi Elektronik për Menaxhimin e Studimeve

SEMS është aplikacion web për menaxhimin e materialeve mësimore dhe njoftimeve të provimeve. Profesorët mund të publikojnë PDF dhe të menaxhojnë provimet, ndërsa studentët mund të shfletojnë e shkarkojnë materialet, të shohin oraret dhe të verifikojnë integritetin e materialeve në blockchain.

> **Integrimet e projektit:** aplikacioni përdor Supabase për autentikim, databazë dhe skedarë; Polygon Amoy Testnet për regjistrim/verifikim të hash-it të materialit; dhe Compellio Registry API për regjistrim përmes një Supabase Edge Function. Këto shërbime kanë role të ndryshme në aplikacion.

## Përmbajtja

- [Veçoritë](#veçoritë)
- [Teknologjitë](#teknologjitë)
- [Struktura e projektit](#struktura-e-projektit)
- [Kërkesat](#kërkesat)
- [Instalimi dhe nisja](#instalimi-dhe-nisja)
- [Konfigurimi i Supabase](#konfigurimi-i-supabase)
- [Integrimi me Compellio](#integrimi-me-compellio)
- [Kontrata dhe Polygon Amoy](#kontrata-dhe-polygon-amoy)
- [Rrjedha e përdorimit](#rrjedha-e-përdorimit)
- [Siguria](#siguria)
- [Ndryshimet e integrimit Compellio](#ndryshimet-e-integrimit-compellio)

## Veçoritë

- Regjistrim, hyrje dhe dalje për përdorues me role profesor/student.
- Ngarkim i materialeve PDF në Supabase Storage dhe ruajtje e të dhënave të tyre në tabelën `materials`.
- Shkarkim dhe fshirje e materialeve nga paneli i profesorit.
- Publikim dhe menaxhim i orareve/njoftimeve të provimeve.
- Regjistrim në kontratën Solidity i identifikuesit të materialit, titullit dhe hash-it të skedarit.
- Verifikim nga studenti që PDF-ja përputhet me hash-in e ruajtur në kontratë.
- Regjistrim opsional i materialit te Compellio nga paneli i profesorit.
- Ruajtje në Supabase e statusit, hash-it SHA-256 dhe referencave që kthen Compellio.

## Teknologjitë

| Pjesa | Teknologjitë |
|---|---|
| Frontend | React, Vite, JavaScript, CSS i zakonshëm |
| Autentikim dhe backend | Supabase Auth, PostgreSQL, Storage, Edge Functions |
| Integrimi blockchain | Solidity, Hardhat, ethers.js, MetaMask |
| Rrjeti blockchain për demonstrim | Polygon Amoy Testnet |
| Regjistri shtesë | Compellio Registry API |

Ndërfaqja përdor CSS të zakonshëm, jo Tailwind CSS. Komunikimi me kontratën bëhet me ethers.js; për lidhjen e wallet-it përdoret MetaMask.

## Arkitektura

```text
React + Vite
├── Supabase Auth
├── Supabase Database
│   ├── profiles
│   ├── materials
│   ├── exams
│   └── material_verifications
├── Supabase Storage (PDF-të)
├── Supabase Edge Function: compellio-register
│   └── Compellio Registry API
└── ethers.js → MetaMask → Polygon Amoy
    └── SEMSMaterialRegistry.sol
```

Supabase ruan llogaritë, të dhënat e aplikacionit dhe PDF-të. Kontrata ruan të dhënat e nevojshme për verifikim, jo vetë PDF-në. Compellio thirret nga server-side Edge Function, në mënyrë që kredencialet e Gateway të mos vendosen në frontend.

## Struktura e projektit

```text
SEMS/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabaseClient.js
│   │   │   ├── materialRegistry.js
│   │   │   └── compellio.js
│   │   ├── ProfessorDashboard.jsx
│   │   └── StudentDashboard.jsx
│   ├── .env.local                 # krijohet lokalisht; mos e publiko
│   └── package.json
├── blockchain/
│   ├── contracts/SEMSMaterialRegistry.sol
│   ├── ignition/modules/SEMSMaterialRegistry.ts
│   ├── hardhat.config.ts
│   └── package.json
├── supabase/
│   ├── config.toml
│   └── functions/compellio-register/index.ts
├── database_compellio.sql
├── database_exams_update_delete_policies.sql
└── README.md
```

## Kërkesat

- Node.js dhe npm.
- Një projekt Supabase me Auth, databazë dhe Storage.
- MetaMask në shfletues për funksionet që përdorin blockchain.
- POL testues në Polygon Amoy për pagesën e tarifave të transaksioneve.
- Për regjistrim real në Compellio: llogari dhe kredenciale të vlefshme të Compellio Gateway.

## Instalimi dhe nisja

### Frontend

Nga dosja kryesore e projektit:

```bash
cd frontend
npm install
```

Krijo `frontend/.env.local` me URL-në dhe çelësin publik të projektit Supabase:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

Nise aplikacionin:

```bash
npm run dev
```

Hape adresën lokale që shfaq Vite në terminal, zakonisht `http://localhost:5173`. Nëse porti është i zënë, Vite mund të zgjedhë një port tjetër.

Për të krijuar build-in:

```bash
npm run build
```

### Kontrata/Hardhat

Në terminal të ri, nga dosja kryesore:

```bash
cd blockchain
npm install
npx hardhat compile
```

Konfigurimi Hardhat përfshin rrjetet lokale, Sepolia dhe Polygon Amoy. Për të nisur një nyje lokale Hardhat gjatë zhvillimit:

```bash
npx hardhat node
```

Kontrata për aplikacionin është publikuar në Amoy. Deploy-i i saj nuk kërkohet për ta nisur frontend-in dhe nuk duhet përsëritur pa arsye.

## Konfigurimi i Supabase

### Variablat e frontend-it

Frontend-i lexon `VITE_SUPABASE_URL` dhe `VITE_SUPABASE_PUBLISHABLE_KEY` nga `frontend/.env.local`. Mos përdor çelësin `service_role` në frontend.

### Tabelat dhe Storage

Aplikacioni përdor këto tabela kryesore:

- `profiles`: profili dhe roli i përdoruesit, për shembull `professor` ose `student`.
- `materials`: materiali, profesori pronar, titulli, përshkrimi dhe shtegu i PDF-së.
- `exams`: të dhënat e provimeve dhe profesori që i menaxhon.
- `material_verifications`: rezultatet/referencat e verifikimit të materialeve nga studentët.

PDF-të ruhen në bucket-in `materials` të Supabase Storage. Politikat RLS dhe Storage duhet të kufizojnë veprimet sipas përdoruesit, rolit dhe pronësisë. Kontrolli i butonave në frontend nuk e zëvendëson RLS.

### Ndryshimet e databazës për Compellio

Skedari [`database_compellio.sql`](database_compellio.sql) përmban:

- `compellio_status` — statusi, me vlerë fillestare `pending`.
- `compellio_sha256` — hash-i SHA-256 i PDF-së.
- `compellio_response` — përgjigjja JSON e API-së.
- `compellio_registered_at` — koha e regjistrimit.
- `compellio_error` — gabimi i fundit, nëse regjistrimi dështon.
- Politikën RLS që lejon profesorin të përditësojë statusin e materialit të vet.

Kolonat `registry_tar_id`, `registry_receipt_id` dhe `registry_tar_version`, si dhe tabela `material_verifications` me politikat e saj, u krijuan me SQL-in paraprak të projektit. Sigurohu që edhe këto janë aplikuar në databazën ku po teston.

Skedari `database_exams_update_delete_policies.sql` përmban politikat për ndryshimin dhe fshirjen e provimeve të profesorit. Politikat e leximit/krijimit dhe ato të Storage duhet të konfigurohen gjithashtu sipas nevojave të projektit.

## Integrimi me Compellio

### Rrjedha e regjistrimit

1. Profesori shtyp **Regjistro me Compellio** pranë një materiali.
2. Frontendi dërgon ID-në e materialit te funksioni `compellio-register`.
3. Edge Function verifikon sesionin dhe kontrollon që materiali i përket profesorit që e kërkon regjistrimin.
4. Funksioni lexon PDF-në nga bucket-i `materials` dhe llogarit hash-in SHA-256.
5. Funksioni merr token nga Compellio Gateway dhe dërgon titullin dhe hash-in te endpoint-i TAR.
6. Përgjigjja ruhet te `materials`, përfshirë statusin, hash-in, referencat TAR dhe përgjigjen e API-së.
7. Frontendi shfaq statusin **Në pritje** ose **Regjistruar**, bashkë me referencën/hash-in kur është i disponueshëm.

PDF-ja nuk dërgohet në Compellio nga ky funksion; dërgohen titulli dhe hash-i. PDF-ja mbetet në Supabase Storage.

### Skedarët e integrimit

- `frontend/src/lib/compellio.js` — thërret Edge Function nga frontend-i dhe përpunon gabimet e kthyera.
- `supabase/functions/compellio-register/index.ts` — verifikon përdoruesin/pronësinë, shkarkon PDF-në, llogarit hash-in, komunikon me Gateway dhe ruan rezultatin.
- `supabase/config.toml` — konfigurimi lokal i funksionit; `verify_jwt = true` kërkon përdorues të autentikuar.
- `database_compellio.sql` — kolonat e statusit dhe politika e përditësimit në databazë.
- `frontend/src/ProfessorDashboard.jsx` — veprimi dhe shfaqja e statusit në panelin e profesorit.

### Secrets në Supabase

Në Supabase Dashboard hape **Edge Functions → Secrets** dhe shto secrets me emrat e saktë:

| Emri | Përmbajtja |
|---|---|
| `COMPELLIO_API_BASE_URL` ose `COMPELLIO_API_URL` | URL-ja bazë e API-së, pa `/api/v1/Token` ose `/api/v1/TAR` |
| `COMPELLIO_EMAIL` | Email-i i llogarisë Compellio Gateway |
| `COMPELLIO_PASSWORD` | Fjalëkalimi i llogarisë Compellio Gateway |

URL-ja e API-së nuk është emri i secret-it. Emri duhet të jetë si në tabelë, ndërsa URL-ja vendoset si vlera e tij. Kredencialet nuk vendosen në `.env.local`, kodin React apo GitHub.

### Publikimi dhe kufijtë e integrimit

Edge Function duhet të jetë publikuar në projektin e duhur Supabase me emrin `compellio-register`. Pas ndryshimit të kodit, publiko versionin e ri të funksionit.

Kodi aktual përdor endpoint-et `/api/v1/Token` dhe `/api/v1/TAR`. Sjellja e saktë e API-së varet nga specifikimi/konfigurimi i Compellio Gateway, përfshirë emrat e fushave që kthen përgjigjja. Regjistrimi real kërkon kredenciale të vlefshme. Në rast gabimi, shiko **Supabase → Edge Functions → Logs** dhe mesazhin e kthyer nga funksioni.

## Kontrata dhe Polygon Amoy

Kontrata `SEMSMaterialRegistry` regjistron të dhëna për verifikimin e materialeve. Ajo nuk ruan skedarin PDF.

- Rrjeti: Polygon Amoy Testnet.
- Chain ID: `80002` (hexadecimal `0x13882`).
- Adresa e kontratës: `0xb33d53c2bd2c92dabc255f273d651fe498ff1dc8`.
- [Kontrata në Amoy Polygonscan](https://amoy.polygonscan.com/address/0xb33d53c2bd2c92dabc255f273d651fe498ff1dc8).
- [Transaksion prove i suksesshëm](https://amoy.polygonscan.com/tx/0x3424ef8e300ead04c1a792c6070d4afd4f5bcce9c9968d120c546ae98ccad6c).

Frontend-i lidhet me MetaMask përmes ethers.js. Kodi që përmban adresën, Chain ID dhe ABI-në ndodhet te `frontend/src/lib/materialRegistry.js`. Aplikacioni kërkon Polygon Amoy dhe kontrollon që kontrata ekziston në rrjetin e zgjedhur.

### Të dhënat në kontratë

Për çdo material, kontrata ruan:

- `materialId` — identifikues unik `bytes32` i nxjerrë nga ID-ja e materialit në Supabase.
- `title` — titulli i materialit.
- `contentHash` — hash `bytes32` i PDF-së.
- `professor` — adresa e wallet-it që dërgoi transaksionin.
- `createdAt` — koha e regjistrimit në blockchain.
- `exists` — tregon nëse materiali është regjistruar.

Funksionet kryesore janë `registerMaterial(...)` për regjistrim dhe `getMaterial(...)` për lexim/verifikim. Event-i `MaterialRegistered` emetohet kur regjistrimi kryhet. Një `materialId` nuk mund të regjistrohet dy herë në këtë kontratë.

### Rrjeti dhe tarifat

Transaksionet në Amoy kërkojnë POL testues në wallet. Nëse MetaMask raporton tarifë gazi shumë të ulët, transaksioni mund të dështojë dhe duhet provuar sërish me parametrat që sugjeron rrjeti/wallet-i. Ngarkimi i PDF-së në Supabase dhe regjistrimi në blockchain janë hapa të veçantë: dështimi i transaksionit nuk do të thotë automatikisht që PDF-ja nuk u ruajt.

Ky projekt përdor Polygon Amoy Testnet, jo Polygon Mainnet. Mainnet kërkon kontratë të publikuar veçmas, konfigurim të ri të aplikacionit dhe POL real.

### Keystore i Hardhat-it

Konfigurimi i Hardhat-it përdor variablat `POLYGON_AMOY_RPC_URL` dhe `POLYGON_AMOY_PRIVATE_KEY` për veprimet e deploy-it. Nëse nevojitet deploy ose veprim administrativ, vlerat mund të ruhen lokalisht në Hardhat keystore:

```bash
npx hardhat keystore set POLYGON_AMOY_RPC_URL
npx hardhat keystore set POLYGON_AMOY_PRIVATE_KEY
```

Mos i shkruaj këto vlera në README, frontend ose repository publik. Mos dërgo private key, seed phrase apo fjalëkalimin e keystore-it.

## Rrjedha e përdorimit

### Profesori

1. Hyn në SEMS me llogarinë e profesorit.
2. Për veprimet blockchain, lidh MetaMask dhe zgjedh Polygon Amoy.
3. Plotëson titullin/përshkrimin dhe zgjedh PDF-në.
4. Aplikacioni ngarkon PDF-në në Supabase Storage dhe ruan të dhënat në `materials`.
5. Për regjistrim blockchain, profesori nënshkruan transaksionin në MetaMask. Hash-i i transaksionit mund të kontrollohet në Amoy Explorer.
6. Për regjistrim Compellio, shtyp butonin përkatës. Kjo thërret Edge Function dhe përdor secrets e Gateway në Supabase.
7. Te seksioni i provimeve, profesori mund të menaxhojë njoftimet/oraret sipas lejeve të databazës.

### Studenti

1. Hyn në SEMS me llogarinë student.
2. Shikon dhe shkarkon materialet e publikuara.
3. Për verifikim blockchain, aplikacioni lexon PDF-në nga Supabase, llogarit hash-in dhe e krahason me rekordin e kontratës.
4. Rezultati i verifikimit dhe referencat përkatëse mund të ruhen në `material_verifications`, sipas politikave RLS.
5. Shikon oraret e provimeve në panelin e studentit.

## Siguria

- Mos publiko `frontend/.env.local`, kredencialet Compellio, private key ose seed phrase.
- Mos vendos Supabase `service_role` key në frontend.
- Mbaji kredencialet Compellio vetëm në Supabase Edge Function Secrets.
- Aktivizo dhe kontrollo RLS për tabelat dhe politikat për Storage.
- Edge Function verifikon JWT-në dhe pronësinë e materialit përpara regjistrimit.
- POL i Polygon Amoy është token testues pa vlerë si POL në Mainnet.
- Përdorimi i Mainnet-it nuk është pjesë e konfigurimit aktual.

## Ndryshimet e integrimit Compellio

Për ta lidhur projektin me Compellio u shtuan ose u përditësuan këto pjesë:

1. **Edge Function e re** `supabase/functions/compellio-register/index.ts` që kryen kërkesën server-side, llogarit SHA-256 dhe ruan përgjigjen.
2. **Ndihmësi i frontend-it** `frontend/src/lib/compellio.js` që thërret funksionin Supabase.
3. **Ndërfaqja e profesorit** u përditësua për butonin “Regjistro me Compellio”, gjendjen gjatë kërkesës dhe statusin/identifikuesin e regjistrimit.
4. **Databaza** u zgjerua me fushat `compellio_status`, `compellio_sha256`, `compellio_response`, `compellio_registered_at` dhe `compellio_error`.
5. **RLS** u shtua për të lejuar profesorin të përditësojë statusin/referencat e materialit të vet.
6. **Konfigurimi i funksionit** u shtua te `supabase/config.toml` me verifikimin JWT të aktivizuar.
7. **Secrets të kërkuara** dokumentohen më sipër; ato ruhen në Supabase dhe nuk janë pjesë e kodit të repository-t.

Integrimi është ndërtuar për përdorim përmes Compellio Gateway API-së. Që regjistrimi real të përfundojë me sukses, projekti Supabase duhet të ketë URL-në e saktë të API-së dhe kredencialet e vlefshme të Gateway. Përgjigjja e API-së dhe skema e saj duhet të përputhen me dokumentacionin e shërbimit.
