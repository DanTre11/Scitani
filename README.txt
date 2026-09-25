Sčítání dopravy v1.0.1 – PWA Release Candidate

Obsah:
- instalovatelná PWA (manifest + ikony 192/512 px)
- standalone režim a základní podpora iOS Add to Home Screen
- offline cache aplikačního rozhraní
- offline fronta průjezdů + automatická synchronizace po návratu internetu
- viditelný stav Online / Offline / Synchronizace a počet čekajících záznamů
- idempotentní ID záznamů proti duplicitám na serveru
- aktualizační mechanismus service workeru
- zachování aktivního sčítání v local/session storage při aktualizaci
- oddělitelná adresa API přes window.SCITANI_API_BASE nebo localStorage trafficApiBase
- Node.js server pro společné sčítání více zařízení

Lokální test:
1) nainstalujte Node.js 18+
2) ve složce spusťte: npm start
3) otevřete http://localhost:8080

Pro instalaci do telefonu a test dvou zařízení je potřeba nasadit tuto složku na veřejnou HTTPS adresu.
Pro produkční nasazení doporučujeme nahradit data.json skutečnou databází a doplnit autentizaci správce.

BEZPEČNOST v1.0.1: Ukončení celého sčítání vyžaduje náhodný administrátorský token uložený pouze na zařízení správce. Mazání posledního záznamu je omezeno na uživatele, který záznam vytvořil.
