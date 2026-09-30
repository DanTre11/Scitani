SČÍTÁNÍ DOPRAVY 1.4.0 – VÝVOJOVÁ VERZE

Základ:
- backend 1.3.0 z produkční větve main (commit d986411)
- frontend 1.3.0 z ověřené mobilní aplikace/APK

Novinky 1.4.0:
1. Kontrola přítomnosti po 15 minutách bez započítání vozidla.
   - zobrazí se dotaz „Jste stále na stanovišti?“
   - potvrzení obnoví aktivitu bez ukončení sčítání
2. Automatické ukončení účasti sčítače po 30 minutách bez aktivity.
   - ukončí se pouze daný sčítač, nikoli celé společné sčítání
3. Ochrana ručního ukončení.
   - první stisk aktivuje 5sekundový cooldown
   - po něm je nutné ukončení znovu potvrdit
4. Evidence pracovní doby.
   - začátek = zahájení účasti
   - konec = ruční/automatické ukončení nebo ukončení celé akce
5. Hodinová sazba a odměna.
   - organizátor zadá Kč/h při vytvoření sčítání
   - správa zobrazuje dobu a průběžnou odměnu
6. Excel.
   - list „Pracovní doba a odměny“ obsahuje začátek, konec, dobu, sazbu, odměnu a způsob ukončení

DŮLEŽITÉ:
- Toto je vývojový balíček. Nenahrávat přímo do produkční větve main.
- Doporučená větev: develop-1.4.0
- Před produkčním nasazením otestovat na dvou telefonech stejně jako verzi 1.3.
