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

Volitelný scénář `tests/browser-smoke.cjs` vyžaduje Playwright a nainstalované Chromium. V pracovním prostředí nebylo možné stáhnout platný archiv Chromia, proto tento scénář není vykázán jako úspěšně provedený. Testovací nasazení: https://scitani-1-4-test.onrender.com/ (kontrola dostupnosti a úvodní obrazovky úspěšná před nasazením tohoto commitu).

## Provozní hranice

- Při dlouhém výpadku server nemůže potvrdit aktivitu telefonu. Po 20 minutách od poslední přijaté aktivity účast ukončí. Záznamy odmítnuté po uzavření zůstávají ve frontě zařízení a indikátor synchronizace hlásí problém; nejde o serverem potvrzené průjezdy.
- Stávající uložení v `data.json` vyžaduje trvalý disk pro skutečný provoz. Tento audit nemění infrastrukturu ani jiné větve.
- Úspěšná kontrola zdrojů a automatických scénářů není potvrzením fyzických vibrací telefonu ani zátěžovým testem produkce.
