# Sčítání dopravy 1.5.0

Vývojová větev `Develop-1.5.0`, založená na produkčním main `67f58e1e507f807dc2540aa5ab8758baccd04865`. Bez změny produkčního nasazení.

## Funkce a data

- Kategorie určuje zadavatel při vytvoření. Registr v `traffic-stats.js` obsahuje stabilní ID, český název, ikonu a typ dopravy. Nová kategorie se přidává do registru; žádný pevný počet sloupců nebo tlačítek.
- Chybějící `categories` u v1.4 znamená `car`, `truck`, `lorry`, `bus`. Tramvaj se automaticky nepřidává. Původní názvy kategorií v záznamech zůstávají čitelné; nové serverové záznamy mají i `categoryId`.
- Směr má `mode: road | tram`; chybějící hodnota znamená silniční dopravu. Tramvajový směr má vlastní sčítací obrazovku s velkým tlačítkem TRAMVAJ. Kategorie i směry jsou po vytvoření neměnné.
- Server odmítne vypnutou kategorii nebo kategorii neslučitelnou se směrem. Tramvaje používají stejnou frontu, synchronizaci, undo, přítomnost a ukončování jako silniční doprava.
- Administrace načítá živý výsledek každých 10 sekund z autorizovaného serverového `/manage`. Lokální nepotvrzené průjezdy se do živého panelu nepřimíchávají. Bez spojení je panel označen jako nedostupný.

## Metodika

Intenzita = skutečný počet / doba pozorování v hodinách. Doba pozorování je sjednocení serverově potvrzených intervalů účasti sčítačů (`joined` až `finishedAt`, případně `endedAt` nebo `serverNow`). Překryvy více zařízení se nesčítají; mezery bez účastníka se nezahrnují. Pro směr se použijí jen jeho účastníci. Osobní výsledek a osobní export používají dobu daného účastníka. Bez platné nebo kladné doby je intenzita nedostupná, nikoli nekonečná. Jde o průměr za pozorování, nikoli klouzavou poslední hodinu. Při rozdílných dobách pozorování směrů se celková intenzita nemusí rovnat součtu intenzit směrů.

15min intervaly zachovávají skutečný počet a samostatný sloupec přepočtu `počet × 4` voz/h. Také právě rozpracovaný interval používá pevný násobek 4; nejde o tvrzení, že celý interval již uplynul. Intervaly se zobrazují v místním časovém pásmu zařízení jako v1.4.

Procenta zahrnují pouze aktivní kategorie. Největší zbytky rozdělují desetiny procent tak, aby nenulový vzorek dal 100,0 %. Prázdný vzorek má 0 %. Směrové přehledy zahrnují jen kategorie příslušného typu dopravy.

Excel zachovává první čtyři listy: Souhrn, Průjezdy, 15min intervaly, Pracovní doba a odměny. Přidány jsou Intenzita a skladba a Metodika. Výpočty sdílí s administrací a výsledky. Pracovní čas a odměny nadále používají nezměněný `work-summary.js`.

## Budoucí školní vizuál

Žádné školní logo nebo barvy nejsou vymyšleny. Současnou paletu zachovávají proměnné `--brand-accent`, `--brand-background`, `--brand-surface`, `--brand-text`, `--brand-font` v `modern.css`. Připraven je skrytý `#schoolLogo` a hlavička `[data-brand-slot=header]`. Jednotlivé plochy lze stylovat přes `#home`, `#setup`, `#accountPanel` (včetně přihlášení), `#admin`, `#finishUser`, `#finishAdmin`. Excel má centrální `styles.xml` a generátor listů `sheetXml` v `buildExcel`, kde lze později doplnit styl exportu.

PWA: shell obsahuje nový modul statistik, novou verzi cache a zapojenou registraci service workeru i manifest. Haptika zůstává v původní platformní vrstvě; fyzické vibrace vyžadují test na zařízení.

## Ověření

```
node --test tests/*.test.js
node --check server.js
node --check app.bundle.js
node --check traffic-stats.js
node --check work-summary.js
node --check sw.js
node tests/browser-smoke.cjs
node tests/browser-v1.5.cjs
```

Pro prohlížečové testy je potřeba Playwright. Volitelná proměnná `BROWSER_CHANNEL=msedge` použije instalovaný Edge. `NODE_PATH` může odkazovat na sdílenou instalaci balíčků. Testy používají izolované lokální databáze a nezapisují do produkce.

Výsledek 2. 10. 2026: všech 18 regresních testů prošlo, syntaxe všech pěti aplikačních JS souborů i obou prohlížečových testů je platná, `git diff --check` bez chyb. Oba prohlížečové testy prošly v Edge přes Playwright: původní v1.4 scénáře, nový dashboard a tramvaje, offline fronta a undo, XLSX, mobilní šířka, PWA offline načtení, sčítání pouze osobních aut i sčítání pouze tramvají. Test 10/20 minut používá řízené serverové časové údaje; fyzický dvacetiminutový test na telefonu zůstává součástí manuálního převzetí.

## Manuální převzetí

1. Dva skutečné telefony: silniční sčítač a tramvajový sčítač, směry Centrum / Motol, odpojení, opětovné připojení a undo.
2. Vytvořit pouze vybrané silniční kategorie a ověřit nepřítomnost ostatních; samostatně pouze tramvaje.
3. Porovnat správu, konečné výsledky a Excel; ověřit směry a odbočení i přítomnost 10/20 minut.
4. Otevřít staré sčítání bez categories; zkontrolovat čtyři původní kategorie.
5. Ověřit instalaci PWA a fyzickou haptiku na cílových telefonech.

V repozitáři ani dostupných stavech commitu nebyla nalezena adresa odděleného testovacího Renderu. Žádné nasazení nebylo spuštěno. Manuální vzdálený test vyžaduje samostatnou službu sledující Develop-1.5.0 a oddělené datové úložiště. Stávající `render.yaml` nebyl změněn.
