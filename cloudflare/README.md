# Sčítání dopravy 1.6.0 – DOD Candidate

Vývojová větev `Develop-1.6.0` vychází z funkčního zdroje `Develop-1.5.0`. Produkční `main` nebyl změněn a tento kandidát nebyl nasazen.

## Změny

- Nečinnost 10/20 minut zůstává podle poslední aktivity. Záznam vozidla, potvrzení přítomnosti a aktivita mají oddělené časy.
- Kontroly bez vozidla se opakují po 10 minutách od posledního vozidla. Vozidlo resetuje počitadlo. Třetí kontrola u rozšířeného režimu vyžádá účet a nové GPS ověření.
- Rozšířený režim vyžaduje přihlášený účet. Heslo se nikde neukládá do aplikace ani místního úložiště.
- GPS se čte při připojení a kontrolách. Server vyhodnocuje vzdálenost, přesnost, varování a ukončení po dvou kvalitních odlehlých měřeních. Přesná historie je dostupná jen správci daného sčítání a lze ji odstranit přes autorizované `DELETE /api/sessions/:code/locations`.
- Administrace má živou mapu OpenStreetMap s automatickým načtením po 15 sekundách a textovým seznamem. Veřejný prezentační režim zde používá přihlášenou správcovskou relaci; anonymizuje jména v zobrazení.
- Verze webu, serveru, PWA a Android metadat je `1.6.0` (Android `versionCode 10600`).

## Ověření

- `npm test` – 22 testů Node prošlo.
- `npm run test:cloudflare` – Cloudflare Worker s izolovanou SQLite/D1 testovací databází prošel.
- `npm run check` – syntaxe serveru, aplikace, statistiky, PWA a sdílených modulů prošla.
- Prohlížečové testy se v tomto prostředí nepodařilo spustit: Playwright nemá kompatibilní headless Chromium; nainstalované systémové Chromium selhalo při startu v omezeném prostředí.
- Fyzický test dvou telefonů, oprávnění GPS, opětovného přihlášení a Android APK sestavení zůstává před vydáním k provedení na cílových telefonech. Není tvrzeno, že tento test proběhl.

## Nasazení

Před jakýmkoli Cloudflare deployem je nutné nakonfigurovat oddělené kandidátní D1 úložiště a nahradit záměrný placeholder jeho ID. Konfigurace záměrně neukazuje na produkční databázi. Lokální testy používají vlastní databázi a do produkční D1 nezapisují. `main` a produkční služby nebyly nasazeny ani upraveny.
