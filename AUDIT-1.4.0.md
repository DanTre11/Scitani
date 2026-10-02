# Audit v1.4 – závěrečný přehled sčítače (1. října 2026)

Rozsah změn: pouze `Develop-1.4.0`. Produkční `main` ani stabilní v1.3 se nemění.

## Výsledek

- Závěrečná obrazovka uvádí pracovní dobu, hodinovou sazbu, odměnu a způsob ukončení.
- Sdílený výpočet `work-summary.js` používají závěrečný přehled, administrace, Excel a odpověď serveru. Odměna se počítá z nezaokrouhlené doby; hodiny a odměna se zobrazují na dvě desetinná místa.
- Začátek účasti, poslední přijatá aktivita a konec pocházejí ze serveru. Čas telefonu se nepoužívá k určení konečné odměny.
- Ruční ukončení a ukončení správcem jsou opakovatelné bez přepsání původního konce či důvodu. Dříve dokončenému sčítači správce nezmění výsledek.
- Nečinnost: upozornění po 10 minutách, ukončení po 20 minutách. Server vyhodnocuje nečinnost při požadavcích i každých 15 sekund; zapisuje přesný termín poslední serverové aktivity + 20 minut.
- Offline ukončení čeká na potvrzení. Souhrn neprezentuje místní čas jako konečný výsledek; potvrzené údaje se doplní po obnovení spojení a přehled se obnoví i po načtení stránky.
- Zachována asynchronní práce s úložištěm a tokeny. Potvrzené ukončení se zapíše do místní kopie před odstraněním čekajícího požadavku.
- Opraven veřejný přístup k interním souborům: webový server vydává pouze explicitně povolené součásti aplikace.
- PWA cache zahrnuje nový výpočet a skript aplikace; má nový identifikátor.

## Ověření

`npm test`: 10 úspěšných testů. Testují skutečné HTTP API nad oddělenou dočasnou databází, generovaný XML obsah Excelu, vykreslení závěrečného přehledu a frontu offline ukončení.

Pokryto: ruční ukončení, opakování požadavku, hranice 10/20 minut, potvrzení přítomnosti, nečinnost bez heartbeat, ukončení správcem, chybný čas telefonu, opakovaný záznam, oprávnění, ochrana interních souborů, zaokrouhlení, nulová sazba, chybějící čas, shoda Excelu a obrazovky a obnova synchronizace.

`npm run check` a `git diff --check`: bez chyb.

Volitelný scénář `tests/browser-smoke.cjs` vyžaduje Playwright a nainstalované Chromium. V pracovním prostředí nebylo možné stáhnout platný archiv Chromia, proto tento scénář není vykázán jako úspěšně provedený. Testovací nasazení: https://scitani-1-4-test.onrender.com/. Následné ověření přes vzdálený prohlížeč je popsáno níže.

## Provozní hranice

- Při dlouhém výpadku server nemůže potvrdit aktivitu telefonu. Po 20 minutách od poslední přijaté aktivity účast ukončí. Záznamy odmítnuté po uzavření zůstávají ve frontě zařízení a indikátor synchronizace hlásí problém; nejde o serverem potvrzené průjezdy.
- Stávající uložení v `data.json` vyžaduje trvalý disk pro skutečný provoz. Tento audit nemění infrastrukturu ani jiné větve.
- Úspěšná kontrola zdrojů a automatických scénářů není potvrzením fyzických vibrací telefonu ani zátěžovým testem produkce.

## Ověření živého nasazení (1. října 2026, večer)

Testována implementace commitu `764927035a915c00401fa66e84baf96b0f691b02`. Soubory `index.html`, `app.bundle.js` a `work-summary.js` stažené z testovacího webu byly porovnány s commitem a shodovaly se.

- V prohlížeči vytvořeno samostatné testovací sčítání se dvěma směry a sazbou 200 Kč/h. Započítáno osobní auto a kamion, ověřeno otevření spodního panelu.
- Ruční ukončení přes potvrzovací dialog zobrazilo nejprve čekání na server, následně serverem potvrzenou dobu 0,01 h, sazbu 200 Kč/h, odměnu 1,28 Kč a důvod „Ukončeno sčítačem“.
- API potvrdilo začátek `2026-10-01T18:02:25.879Z`, konec `2026-10-01T18:02:48.870Z` a důvod `manual`. Odměna 1,28 Kč odpovídá 22,991 sekundám. Po obnovení stránky zůstaly všechny hodnoty stejné.
- Následné ukončení celého testu správcem zachovalo původní čas i důvod již dokončeného sčítače.
- Nad stejnými živými daty byl spuštěn skutečný exportér z aplikace a výsledný XLSX otevřen pomocí openpyxl. List „Pracovní doba a odměny“ obsahoval hodnoty `0.01`, `200`, `1.28`, `Ukončeno sčítačem`, shodné s obrazovkou.
- Stažení přes tlačítko ve vzdáleném prohlížeči dvakrát nedokončilo událost download; tato část se proto nepovažuje za úspěšně ověřenou. Nebyla nalezena související chyba JavaScriptu aplikace. Generování a obsah XLSX ověřeny samostatně podle předchozího bodu.
- Druhý test použil samostatného správce přes API a sčítače v prohlížeči bez správcovského tokenu. Po ukončení správcem se aktivní sčítač automaticky přepnul na finální obrazovku: 0,01 h, 180 Kč/h, 1,12 Kč, „Ukončeno správcem“. Čas konce odpovídal serverovému `endedAt` / `finishedAt` `2026-10-01T18:07:31.346Z`, důvod `session-ended`.
- Skutečných 20 minut nečinnosti nebylo při tomto živém testu vyčkáváno. Přesné hranice 10/20 minut a výsledek nečinnosti pokrývají automatické testy HTTP serveru.

Snímek ověřeného přehledu: [zaverecna-obrazovka.jpg](tests/evidence/zaverecna-obrazovka.jpg).
