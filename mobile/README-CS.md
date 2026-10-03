# Sčítání dopravy – Android 1.5.0

Podepsané APK pro přímou instalaci. Android 7.0+, versionCode 10500.
Identifikátor samostatné instalace: org.scitanidopravnihoproudu.mobile.
Název v telefonu: Sčítání dopravy 1.5.

Uživatel schválil instalaci vedle APK 1.4, protože původní podpisový klíč nebyl dostupný. Nová aplikace nepřebírá starou místní offline frontu. Původní aplikaci neodinstalovávat před synchronizací rozpracovaných záznamů. Účty a serverová sčítání zůstávají společná na https://scitanidopravnihoproudu.org.

Rozhraní 1.5, statistiky, odměny a školní podklady jsou zabalené v APK. Nativní funkce: souborové offline úložiště se záložní kopií, HTTP, vibrace, kopírování a sdílení XLSX. Webová produkce se tímto sestavením nemění.

## Sestavení

Node 22+, JDK 21, Android SDK 36/build-tools 36.0.0. Z této složky: npm ci, npm run prepare:web, npx cap sync android, node scripts/test-native.cjs. Poté v android: gradlew assembleRelease. Alternativně pnpm install a node node_modules/@capacitor/cli/bin/capacitor sync android.

APK musí být podepsané privátním klíčem mimo repozitář. Pro aktualizace tohoto samostatného balíčku zachovat stejný podpis a identifikátor. Certifikát SHA-256: a163389b9370dcebfdbb2288e306bd6dba0717146da92dce0aede775b8b29635.
Proměnné podpisového skriptu: SCITANI_KEYSTORE, SCITANI_PASSWORD_FILE, SCITANI_KEY_ALIAS (výchozí scitani-upload), ANDROID_HOME. Skript pro APK+AAB předpokládá sestavení obou balíčků. Klíče a hesla nikdy nepublikovat.

## Ověření

- Release sestavení a kontrola podpisů APK v2/v3 prošly.
- Metadata potvrzují 1.5.0/10500, nový identifikátor, Android 7+ a spouštěcí aktivitu.
- Nativní test: 25 zápisů a obnova, JSON požadavky na produkční server, omezení cílové adresy a vibrace.
- Všechny zabalené webové soubory odpovídají připravenému rozhraní včetně fontu, loga, statistik a odměn.
- Fyzický Android ani emulátor nebyl použit. Na telefonu ověřit přihlášení, haptiku a systémové sdílení Excelu.

Adresáře iOS a store pocházejí z projektu 1.4; nejsou novým vydáním iPhone ani publikací v obchodech. Toto vydání dodává pouze Android APK 1.5.
