# Sčítání dopravy 1.6.0 – produkční vydání

Produkční Worker zůstává `scitani-dopravy-candidate-v130` a používá stávající D1 databázi `scitani-dopravy-candidate-v130`. Zachovejte binding, databázové ID, proměnné prostředí a vlastní domény spravované v Cloudflare.

## Změny 1.6.0

- Ověření přítomnosti a opětovné ověření účtu s kontrolou polohy telefonu.
- Serverové posuzování vzdálenosti a přesnosti; automatické ukončení až po dvou po sobě jdoucích kvalitních měřeních mimo stanoviště.
- Historie poloh, živá administrátorská mapa a textový přehled; poloha se čte pouze při důležitých událostech.
- Záznamy zůstávají v datech sčítání; nedochází ke změně schématu D1. Starší data zůstávají čitelná.
- Odstraněna duplicitní potvrzovací hláška při výběru směru. Systémové oprávnění a ověření polohy zůstávají zachované.
- Verze aplikace, serveru, PWA a Android metadat je 1.6.0.

## Nasazení a ověření

Workers Builds používá větev `cloudflare-1.4.0`. Build připraví `cloudflare/worker-release-1.6.0.mjs` skriptem `node cloudflare/prepare-deploy.mjs`.

Ověřeno před vydáním: `npm test` (22/22), `npm run test:cloudflare` a `npm run check`. Testovací web 1.6.0 byl ručně ověřen; po produkčním nasazení je nutná kontrola `/health` a ověření aplikace na hlavní doméně.

## Návrat

Při provozním problému obnovte předchozí verzi Workeru přes Cloudflare rollback. Předchozí produkční commit 1.5.0: `a4c9812001696577f86cd4ad6d2fa75cd96776c0`.