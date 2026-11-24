# SEMS - Sistemi Elektronik për Menaxhimin e Studimeve

SEMS është një aplikacion web për menaxhimin e materialeve mësimore dhe orareve të provimeve. Profesorët publikojnë PDF dhe menaxhojnë njoftimet e provimeve. Studentët shfletojnë e shkarkojnë materialet, verifikojnë integritetin e tyre në blockchain dhe shohin orarin e provimeve.

## Veçoritë

- Regjistrim, hyrje dhe dalje për përdoruesit me role profesor/student.
- Ngarkim i materialeve PDF në Supabase Storage dhe ruajtje e të dhënave në databazë.
- Shkarkim dhe fshirje e materialeve nga paneli i profesorit.
- Regjistrim i identifikuesit, titullit dhe hash-it të skedarit në kontratën Solidity.
- Verifikim nga studenti që rekordi në blockchain përputhet me titullin dhe hash-in e PDF-së.
- Publikim, ndryshim dhe fshirje e orareve/njoftimeve të provimeve.
- Shfaqje e materialeve dhe orarit të provimeve në panelin e studentit.

## Teknologjitë

- Frontend: React 19, Vite 8, JavaScript dhe CSS i zakonshëm.
- Backend, autentikim, databazë dhe ruajtje skedarësh: Supabase.
- Blockchain: Solidity, Hardhat 3, ethers.js 6 dhe MetaMask.
- Rrjeti i përdorur për demonstrim: Polygon Amoy Testnet.

Projekti përdor CSS të zakonshëm, jo Tailwind CSS. Integrimi blockchain përdor ethers.js; viem nuk është përdorur.

## Arkitektura

    React + Vite
      ├── Supabase Auth
      ├── Supabase Database (profiles, materials, exams)
      ├── Supabase Storage (PDF-të, bucket: materials)
      └── ethers.js → MetaMask → Polygon Amoy
                                      └── SEMSMaterialRegistry.sol

PDF-të ruhen në Supabase Storage. Blockchain ruan të dhënat e verifikimit, jo përmbajtjen e PDF-së. Studenti shkarkon PDF-në nga Supabase, llogarit hash-in dhe e krahason me rekordin e kontratës.

## Struktura e projektit

    SEMS/
    ├── frontend/                         React/Vite dhe integrimi Supabase/ethers
    │   └── src/
    │       ├── lib/supabaseClient.js
    │       ├── lib/materialRegistry.js
    │       ├── ProfessorDashboard.jsx
    │       └── StudentDashboard.jsx
    ├── blockchain/                       Hardhat 3 dhe kontratat Solidity
    │   ├── contracts/SEMSMaterialRegistry.sol
    │   ├── ignition/modules/SEMSMaterialRegistry.ts
    │   └── hardhat.config.ts
    ├── database_exams_update_delete_policies.sql
    └── README.md

Dosjet smart-contracts/ dhe database/ nuk janë pjesë e strukturës aktuale të projektit.

## Kërkesat paraprake

- Node.js (version LTS që mbështetet nga Vite 8) dhe npm.
- Projekt Supabase.
- MetaMask në shfletues.
- POL testues në Amoy për tarifat e transaksioneve.

## Instalimi dhe nisja

Frontend-i dhe projekti Hardhat kanë secili package.json dhe instalohen veçmas.

### 1. Instalimi i frontend-it

Nga dosja rrënjë e SEMS:

    cd frontend
    npm install

Krijo frontend/.env.local dhe vendos kredencialet e projektit Supabase:

    VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
    VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY

Nise frontend-in:

    npm run dev

Hape URL-në që shfaq Vite në terminal, zakonisht http://localhost:5173. Nëse ky port është i zënë, Vite mund të zgjedhë një port tjetër. Mos e ndrysho pjesën tjetër të URL-së gjatë përdorimit.

Për të krijuar build-in e frontend-it:

    npm run build

### 2. Instalimi dhe kompajlimi i kontratës

Nga terminal i ri, në dosjen rrënjë të SEMS:

    cd blockchain
    npm install
    npx hardhat compile

Për të nisur rrjetin lokal Hardhat kur testohet lokalisht:

    npx hardhat node

Mbaje terminalin e nyjës lokale hapur për testet që përdorin Hardhat Local. Për kontratën e publikuar, MetaMask dhe aplikacioni duhet të jenë në Polygon Amoy Testnet.

## Konfigurimi i Supabase

Klienti i frontend-it lexon këto dy variabla nga frontend/.env.local:

- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Struktura që përdor kodi:

- profiles: id, full_name, role. Roli përdoret për panelin profesor/student.
- materials: id, professor_id, title, description, file_path, created_at.
- exams: id, professor_id, subject_name, exam_date, exam_time, exam_location, description.
- Storage bucket: materials. PDF-të ruhen në një shteg që fillon me ID-në e profesorit.

Skedari database_exams_update_delete_policies.sql përmban politikat për ndryshimin dhe fshirjen e provimeve të profesorit. Politikat e tjera të SELECT/INSERT dhe Storage duhet të jenë gjithashtu të konfiguruara në Supabase sipas roleve të aplikacionit. Aktivizo dhe testo Row Level Security (RLS); mos u mbështet vetëm te fshehja e butonave në frontend.

## Kontrata dhe Polygon Amoy

Kontrata SEMSMaterialRegistry është publikuar dhe testuar në Polygon Amoy Testnet:

- Rrjeti: Polygon Amoy Testnet.
- Chain ID: 80002 (hex: 0x13882).
- Monedha për tarifat: POL testues.
- Adresa e kontratës: 0xb33d53c2bd2c92dabc255f273d651fe498ff1dc8.
- Explorer i kontratës: https://amoy.polygonscan.com/address/0xb33d53c2bd2c92dabc255f273d651fe498ff1dc8.
- Një transaksion prove i suksesshëm: https://amoy.polygonscan.com/tx/0x3424ef8e300ead04c1a792c6070d4afd4f5bcce9c9968d120c546ae98ccad6c.

Frontend-i përdor ethers.js BrowserProvider dhe Contract për t'u lidhur me MetaMask. ABI-ja dhe adresa e kontratës në frontend/src/lib/materialRegistry.js duhet të përputhen me versionin e publikuar. Ky konfigurim përdor chain ID 80002.

### Funksionet e kontratës

SEMSMaterialRegistry ruan për çdo material:

- materialId: bytes32.
- title: titulli i materialit.
- contentHash: bytes32, hash-i i skedarit.
- professor: adresa e profesorit që e regjistroi.
- createdAt: koha e regjistrimit.
- exists: tregon nëse rekordi gjendet.

Funksionet dhe event-i kryesor:

    registerMaterial(bytes32 materialId, string title, bytes32 contentHash)
    getMaterial(bytes32 materialId)
    MaterialRegistered(...)

materialId llogaritet nga ID-ja e materialit në Supabase, ndërsa contentHash llogaritet nga bajtet e PDF-së. Kontrata refuzon materialId të përsëritur.

### Keystore dhe deploy në Amoy

Konfigurimi i Hardhat-it lexon POLYGON_AMOY_RPC_URL dhe POLYGON_AMOY_PRIVATE_KEY përmes keystore-it. Nga dosja blockchain, vlerat mund të vendosen lokalisht me:

    npx hardhat keystore set POLYGON_AMOY_RPC_URL
    npx hardhat keystore set POLYGON_AMOY_PRIVATE_KEY

Hardhat kërkon vlerat në terminal. Mos i shkruaj në README, në frontend ose në GitHub. Mos dërgo private key, fjalëkalimin e keystore-it ose seed phrase te askush.

Komanda e përdorur për deploy-in e testimit ishte:

    npx hardhat ignition deploy ignition/modules/SEMSMaterialRegistry.ts --network polygonAmoy --deployment-id sems-amoy-account3

Kontrata është publikuar tashmë; mos e ekzekuto këtë komandë përsëri pa pasur arsye. Nëse ndryshon llogaria deployer, përdor një deployment ID të ri dhe përditëso adresën e kontratës në frontend.

## Rrjedha e përdorimit

### Profesori

1. Hyr me llogarinë profesor.
2. Lidh MetaMask. SEMS kërkon Polygon Amoy (Chain ID 80002).
3. Plotëso titullin/përshkrimin dhe zgjidh një PDF.
4. Aplikacioni ngarkon PDF-në në Supabase Storage dhe ruan rreshtin në tabelën materials.
5. MetaMask nënshkruan transaksionin që regjistron materialId, titullin dhe contentHash në kontratë.
6. Hash-i i transaksionit shfaqet në SEMS dhe mund të kontrollohet në Amoy Explorer.
7. Te Provimet, profesori mund të shtojë, ndryshojë dhe fshijë njoftime.

### Studenti

1. Hyr me llogarinë student.
2. Shiko materialet dhe shkarko PDF-të.
3. Kliko Verifiko në blockchain.
4. Aplikacioni merr PDF-në nga Supabase, llogarit hash-in dhe kontrollon rekordet në kontratë.
5. Shiko orarin e provimeve te seksioni Orari i provimeve.

## Siguria

- Mos publiko frontend/.env.local ose çfarëdo private key-je.
- Mos vendos Supabase service_role key në frontend; përdor vetëm publishable key dhe siguro RLS.
- Kufizo lejet në tabelat dhe Storage sipas rolit dhe pronësisë.
- POL i Amoy është token testues pa vlerë reale.
- Për projektin aktual përdoret Amoy Testnet, jo Polygon Mainnet. Mainnet kërkon POL real dhe një vendim të veçantë për deploy.

## Dëshmi testimi

Transaksioni i listuar më sipër u konfirmua si Success në Polygon Amoy. Materiali u verifikua me sukses nga paneli i studentit. Ky është rezultat testimi në testnet dhe nuk duhet përshkruar si publikim në Mainnet.
