# Sčítání dopravy – Android a iPhone 1.4.0

Aplikace používá https://scitanidopravnihoproudu.org a jeho databázi D1.
Identifikátor: org.scitanidopravnihoproudu.app. Verze 1.4.0, sestavení 10400.
Rozhraní je součástí aplikace. Nativní funkce: místní souborové úložiště se záložní kopií, vibrace, kopírování kódu a sdílení Excelu. Při připojení se záznamy synchronizují. V aplikaci jsou stejná pravidla nečinnosti 10/20 minut jako na webu.

## Sestavení

Node 22+, JDK 21, Android SDK 36 (build-tools 36.0.0). Pro iOS macOS a Xcode 26+.
Z této složky: npm ci, npm run sync.
Android: scripts/build-android.sh. Výstup APK a AAB je nejprve nepodepsaný.
Podpis: scripts/sign-android.sh s proměnnými SCITANI_KEYSTORE, SCITANI_PASSWORD_FILE a ANDROID_HOME.
iPhone: scripts/build-ios.sh pro simulátor; pro zařízení v Xcode vybrat svůj vývojářský tým a Product > Archive.

Při změně rozhraní se používají soubory v nadřazené složce repozitáře. Mobilní příprava opravuje volbu API serveru na Androidu (interní https://localhost se nesmí použít jako produkční API).
Test: node scripts/test-native.cjs po npm run prepare:web.

## Distribuce

APK je pro přímou instalaci do Androidu. Na telefonu povolte instalaci pro prohlížeč, ze kterého stahujete. APK i AAB musí pro budoucí aktualizace zachovat identifikátor a podpisový klíč. Soukromá záloha podpisového klíče nepatří na web ani GitHub.
AAB patří do Google Play Console, do telefonu se přímo neinstaluje. Při aktivaci Play App Signing použijte pro instalace aktualizovatelné mezi webem a Google Play stejný aplikační podpisový klíč; výchozí jiný klíč od Google kompatibilitu nezachová.

iPhone: web lze nyní přidat ze Safari na plochu jako webovou aplikaci. Projekt iOS není podepsaný IPA. App Store/TestFlight vyžaduje Apple Developer účet, podpis, testování a kontrolu Apple.

## Před vydáním do obchodů

Doplnit skutečnou zásadu ochrany osobních údajů (provozovatel, kontakt, doby uchování), formuláře Data safety/App privacy, podporu odstranění účtu a souvisejících osobních údajů, snímky z reálných zařízení a přístup pro recenzenta. Aktuální server registraci účtu má, samostatné odstranění účtu dosud nemá. To je blokující bod pro podání do obchodů, ne hotová funkce.
Nové osobní účty Google Play mohou mít povinné uzavřené testování. Podmínky ověřit ve vlastní Play Console.
Aplikace nevyžaduje polohu, fotoaparát, mikrofon ani kontakty. Účet, jméno sčítače, záznamy a pracovní doba jsou zpracovávaná data, která je třeba uvést v zásadách.

## Stav ověření

Ověřeno: příprava platformních projektů a automatický test nativní vrstvy se simulovanými pluginy (25 zápisů, obnova, formát API požadavku, vibrace).
Reálné telefony, přihlášení přes nativní HTTP a export do cílových aplikací je nutné ověřit před veřejným vydáním. iOS se v linuxovém prostředí nesestavuje.
