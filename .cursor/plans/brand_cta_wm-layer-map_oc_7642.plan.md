---
name: Brand CTA wm-layer-map
overview: Valutazione UX/UI del bottone brand/store in `wm-layer-map` con priorità chiare su quali best practice applicare davvero. Il focus è separare brand app, CTA di download e conformità ai badge ufficiali degli store senza appesantire la UI.
todos:
  - id: audit-current-cta
    content: Confermare il ruolo del CTA principale tra brand entry point e download action
    status: completed
  - id: separate-store-badges
    content: Progettare badge store ufficiali separati dal chip brand
    status: completed
  - id: accessibility-copy
    content: Definire copy, focus states e nome accessibile coerenti con la destinazione
    status: completed
isProject: false
---

# Piano Per Brand CTA e Store Download

Riferimento ticket: [`oc_7642`](https://orchestrator.maphub.it/resources/developer-stories/7642)

## Stato attuale

Il componente usa un unico link top-bar in [`/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js`](/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js):

- il blocco visuale `#app-link` mostra logo, nome app e subtitle
- la destinazione è dinamica tramite `getAppLinkUrl()`
- su mobile punta allo store (`androidStore` / `iosStore`), su desktop alla web app
- la label secondaria cambia con `getAppLinkSubtitle()`

Questo approccio è valido come CTA compatta, ma oggi mescola in un solo elemento:

- identità del brand
- call to action di navigazione
- call to action di download store

## Best Practice Da Applicare

### 1. Separare brand e store CTA

In UI/UX il blocco brand dovrebbe identificare l'app (`logo + nome`), mentre il download dovrebbe usare badge ufficiali separati quando si vuole promuovere App Store / Google Play.

Da applicare in [`/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js`](/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js):

- mantenere il brand chip come entry point all'app/web app
- aggiungere badge store ufficiali solo quando gli URL store esistono
- non simulare i badge store con testo custom dentro la pill

### 2. Usare badge ufficiali non reinterpretati

Le linee guida Apple e Google richiedono badge ufficiali non modificati per promuovere download dagli store.

Da applicare:

- usare asset ufficiali App Store / Google Play
- non ridisegnare badge con font, colori o icone custom
- rispettare ordine, clear space, contrasto e dimensioni minime

### 3. Chiarezza del messaggio

Il testo deve far capire subito se l'azione apre l'app, apre la web app o porta allo store.

Da applicare:

- se resta un solo CTA, testo esplicito come `Apri app` o `Scarica app`
- se ci sono due CTA, usare gerarchia chiara: brand card + badge store
- evitare subtitle ambigue quando il comportamento cambia tra desktop e mobile

### 4. Coerenza del comportamento cross-device

Il cambio automatico destinazione per piattaforma è utile, ma UX migliore se l'utente capisce dove finirà.

Da applicare:

- su mobile: prioritizzare lo store corretto o deep link app
- su desktop: mostrare web app e, se serve, badge store separati
- evitare che lo stesso identico elemento cambi semantica senza segnali visivi

### 5. Accessibilità e touch ergonomics

Il CTA è già abbastanza grande, ma vanno curati semantica e focus visibile.

Da applicare:

- target tattile minimo almeno `44x44`
- `alt` significativo sul logo se informativo, altrimenti decorativo coerente
- focus ring visibile, non solo rimozione `outline`
- nome accessibile del link che spieghi la destinazione

### 6. Gerarchia visiva e densità

La top bar deve restare secondaria rispetto alla mappa e non rubare attenzione.

Da applicare:

- mantenere CTA compatta e non dominante
- evitare troppe varianti tipografiche nella pill
- su mobile preferire stack verticale ordinato oppure una card singola + badge sotto

### 7. Fiducia del brand

Un brand CTA efficace deve trasmettere affidabilità e appartenenza all'ecosistema prodotto.

Da applicare:

- usare logo app nitido e sempre quadrato/safe area corretta
- usare nome app come testo principale
- mantenere eventuale nome layer separato, come già fa `#layer-badge`
- se utile, aggiungere microcopy tipo `Apri in Webmapp` solo se coerente col brand reale dell'istanza

## Best Practice Opzionali

- rilevare installazione PWA/app e sostituire il CTA con `Apri l'app`
- mostrare QR code su desktop per passare facilmente al mobile download
- A/B test su copy del CTA principale
- fallback multilanguage oltre a `.it`

## Priorità Consigliata

1. Separare visivamente il brand CTA dai badge store ufficiali
2. Rendere esplicita la destinazione del CTA principale
3. Correggere accessibilità (`focus`, nome accessibile, semantica del logo)
4. Migliorare il layout responsive della top bar
5. Valutare enhancement come QR o rilevamento installazione

## Decisione UX Consigliata

Per questo componente consiglierei:

- `Brand chip`: logo + nome app + azione `Apri app` / `Apri web app`
- `Store badges`: App Store e Google Play mostrati come badge ufficiali, sotto o accanto, solo quando presenti
- `Layer badge`: resta separato come contesto editoriale del contenuto

Questa soluzione è la più corretta perché preserva il brand dell'app, evita di “fingere” badge store con UI custom, chiarisce la destinazione e resta conforme alle linee guida di Apple/Google.
