# Sčítání dopravy 1.6.0 – oprava povinného opětovného ověření

Po třetím potvrzení přítomnosti bez vozidla server trvale zamkne účastníka (`reauthRequired`). Nové záznamy včetně zpětně datované offline fronty vracejí HTTP 409 `reauth_required`. Další potvrzování přítomnosti zámek neodstraní ani neprodlužuje čas poslední aktivity. Platí dosavadní ukončení po 20 minutách.

`POST /api/sessions/:code/users/:id/reauth` vyžaduje participant token a heslo původního účtu. Používá existující ověření hesla a omezení počtu pokusů. Vydá krátkodobé potvrzení svázané s konkrétním účastníkem a kontrolním cyklem; server ukládá jen jeho hash. Následné `location` s `eventType: reauth` musí obsahovat `reauthProof`, platné přihlášení stejného účtu a kvalitní GPS na stanovišti. Pouze tento krok zámek odstraní a důkaz spotřebuje. Staré přihlášení, jiný účet, nejistá GPS, prošlé nebo znovu použité potvrzení nestačí.

Telefon zobrazí „Sčítání pozastaveno“, zakáže tlačítka vozidel, uchová zámek po obnovení stránky a při zrušení dialogu. Heslo je maskované a neukládá se. Odmítnuté položky offline fronty zůstávají zachované. Po ověření začne nový desetiminutový cyklus, ale čas posledního skutečného vozidla se nepřepisuje.

Změny jsou v Node backendu i Cloudflare D1. D1 zápisy používají podmíněné aktualizace uvnitř transakcí, aby souběžné vozidlo nebo GPS nepřepsaly zámek. Mapový proxy endpoint, dlaždice a fallback zůstávají zachované. PWA má nový identifikátor cache; číslo verze zůstává 1.6.0.

## Automatické ověření

- `npm run check`
- `npm test`: Node API, skutečné funkce UI v izolovaném JS prostředí, offline fronta, předchozí regresní testy včetně Excelu a odměn.
- `npm run test:cloudflare`: dosavadní Worker regrese a nový `cloudflare/test-reauth.mjs`.
- 20 samostatných přihlášených účtů, participant tokenů a GPS; silniční i tramvajové směry; 400 souběžných zápisů = přesně 400 uložených vozidel; deduplikace; 20 mapových záznamů; heartbeat; přístupová práva.
- Zrušení ověření, přímé volání vozidla, staré přihlášení, špatné heslo a účet, nejistá GPS, svázání a expirace potvrzení, opakované použití, nový kontrolní cyklus, deset souběhů třetí kontroly/vozidla/GPS a zachování 20minutového ukončení.

## Zbývající ověření před DOD Stable

Plný test Chromium (`tests/browser-reauth.cjs`) je připraven, ale zdejší prostředí zakazuje potřebný systémový socket, takže nebyl dokončen. UI funkce byly otestovány automaticky bez vykreslování prohlížeče. Simulace není test fyzických telefonů ani produkční D1. Před označením DOD Stable ověřit dva skutečné telefony: třetí kontrola → zrušení → nemožnost přidat vozidlo → obnovení stránky → heslo + GPS → pokračování; také mapu a offline synchronizaci.

Mobilní sestavení přebírá opravený společný bundle přes `mobile/scripts/prepare-web.mjs`; nová podepsaná APK zde nebyla sestavena ani distribuována. Starý klient bez nového ověřovacího postupu bude serverem po třetí kontrole správně blokován, ale musí se aktualizovat, aby mohl kontrolu dokončit. Nasazovat společně nový web/PWA a backend; samostatně distribuovanou APK aktualizovat před jejím použitím v tomto režimu.
