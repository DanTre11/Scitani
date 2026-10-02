# Školní vizuál SPŠ dopravní

Implementace na Develop-1.5.0, 2. 10. 2026. Původní dodané dokumenty slouží pouze jako zdroje vizuální identity a nebyly upraveny ani zveřejněny v repozitáři.

## Zdroje

- `Hlavičkový papír_aktuální oficiální.docx`: původní logo z `word/media/image1.png`, uložené beze změny jako `brand/school-logo.png`. Inline SVG v záhlaví pouze omezuje prázdné okraje původního plátna; logo i jeho poměr stran, barvy a text zůstávají stejné. Logo leží na bílém podkladu.
- `SPSD_grafický manuál.pdf`, strany 7–9: použití loga, RGB paleta a Roboto. Strany 10 a 15: proporcionální použití oborových ikon.
- `SPŠD Prezentace nové logo Vzor.pptx`: `ppt/media/image2.png` jako původní obrazový panel na přihlášení, `brand/school-pattern.png`. Použit celý, bez přebarvení nebo deformace.
- `SPSD_ikony_modre_rgb_PROVOZ A EKONOMIKA DOPRAVY.png` ze stejné dodané složky: originál `brand/traffic-study.png`, použit na úvodu, jako favicon a ikona PWA. Prohlížeč škáluje původní čtvercový obrázek; soubor nebyl překreslen.
- Roboto: [oficiální distribuce Google Fonts](https://github.com/google/fonts/tree/main/ofl/roboto), proměnné písmo `Roboto[wdth,wght].ttf`, vlastní hostování v `brand/Roboto.ttf`; licence SIL OFL v `brand/OFL.txt`. Písmo se při používání aplikace nestahuje od třetí strany.

## Paleta a rozhraní

Základní modrá `#002B4F`, oranžová `#EB5D43`, červená `#FF0033` odpovídají číselným RGB hodnotám v manuálu. Původní rastrová loga mají vlastní dodané barevné hodnoty a nejsou přebarvena. Základ rozhraní tvoří modrá a bílá; oranžová zvýrazňuje výsledek a fokus klávesnice. Tmavší červená destruktivních tlačítek zajišťuje kontrast bílého textu, není variantou loga.

Veškeré školní styly jsou v `school.css`, načteném po původních funkčních stylech. Záhlaví, úvod, přihlášení, formuláře, organizátor, správa, silniční a tramvajové sčítání, výsledky a patička sdílejí stejnou typografii a paletu. Aktivní počty zůstávají během sčítání skryté. Původní velká tlačítka, potvrzení ukončení a barevně odlišená stavová upozornění zůstávají zachována.

XLSX používá bílé záhlaví na tmavě modré výplni a Roboto, bez změny dat, pořadí listů nebo adres buněk. Pokud čtečka XLSX Roboto nemá, použije své náhradní písmo; font není do XLSX vložen.

PWA ukládá lokálně také font, školní styly a obrázky. Nové soubory jsou explicitně povoleny na serveru; přístup k interním souborům zůstává uzavřený.

## Ověření

`node --test tests/*.test.js`, syntax check všech aplikačních JS souborů a prohlížečové scénáře `tests/browser-smoke.cjs`, `tests/browser-v1.5.cjs`, `tests/branding.cjs`. Vizuální test kontroluje logo, načtení Roboto, školní modrou, nulový vodorovný přesah v šířkách 320/390/1440 px, přihlášení, správce, dashboard, tramvaj a závěrečný výsledek. Volitelné `SCREENSHOT_DIR` ukládá náhledy mimo repozitář.

Produkční větev main ani nasazení nejsou součástí této změny. Instalaci PWA a fyzickou haptiku je ještě nutné ověřit na cílových telefonech.
