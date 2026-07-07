> Ticket: oc:8191

# Mockup WebApp — layout overlay mappa

## Cosa cambia

Gli elementi UI sopra la mappa in `wm-layer-map` sono stati riposizionati e rifiniti per allinearsi ai mockup desktop e mobile del cliente:

- **Desktop:** badge app e badge layer affiancati in alto a sinistra; badge store in basso a sinistra (orizzontali) sopra la scale bar; pulsante fullscreen visibile in alto a destra.
- **Mobile:** badge app in alto a sinistra, badge layer in alto a destra; badge store in basso a sinistra (verticali) sopra la scale bar; pulsante fullscreen **nascosto**.

Ulteriori rifiniture UI rispetto al layout base:

- Badge app e layer ridotti (~12–15%): padding, font e border-radius compatti.
- Badge store ridotti a 32px di altezza.
- Scale bar posizionata sotto i badge store senza sovrapposizione (override `position` su `.ol-scale-line`).
- Nome layer con wrap fino a 2 righe, poi ellipsis (`-webkit-line-clamp: 2`).

## Perché

Il cliente (Cammini d'Italia) ha fornito mockup con layout specifico per la webapp embeddabile. Il posizionamento precedente (layer a destra, store sotto l'app in alto) non corrispondeva al design approvato.

## Requisiti

### Layout (completati)

- [x] Desktop: `#app-link` e `#layer-badge` affiancati in alto a sinistra
- [x] Mobile: `#app-link` alto sinistra, `#layer-badge` alto destra
- [x] Desktop: badge store orizzontali in basso a sinistra sopra la scale
- [x] Mobile: badge store verticali in basso a sinistra sopra la scale
- [x] Scale bar sotto i badge store, senza overlap
- [x] `hide-cta` nasconde app-link e store, non il layer badge
- [x] Nessuna regressione su pannello, zoom, attribution

### Rifiniture successive (completate)

- [x] Mobile: nascondere controllo fullscreen (`.ol-full-screen { display: none }`)
- [x] Ridurre dimensioni badge app e layer (min-height, padding, font, icona 24px, radius 16px)
- [x] Ridurre badge store (altezza 32px)
- [x] Layer badge: wrap a 2 righe poi ellipsis; `max-width` contenitore allineato al box app (`min(320px, 100%)`)

## Rischi

- Sovrapposizione elementi in basso su viewport molto stretti — mitigato con `gap`, `left: 16px` e stack flex in `#map-bottom-left`.
- Su mobile il layer badge può risultare leggermente più largo del box app quando il nome è lungo (stesso `max-width` di contenitore, non match pixel-perfect dinamico).

## Out of scope

- Icona nel badge layer
- Match dinamico JS della larghezza layer rispetto al box app (ResizeObserver)
- Commit, PR, aggiornamento ticket Orchestrator
- Modifica posizione controlli zoom
- Nuovi attributi HTML del componente

## Moduli toccati

- `src/wm-layer-map.js` — template, CSS, controllo `ScaleLine`, rimozione `_updateAppCtaGroupVisibility`
- `README.md` — CSS parts `bottom-left`, `scale-line`
- `test/index.html` — pagina di test locale (layer-id=58, script locale)

## Decisioni architetturali

- **DOM top bar:** `#map-top-bar-left` (app) + `#map-top-bar-right` (layer); store e scale in `#map-bottom-left`.
- **Fullscreen mobile:** nascosto via CSS nel breakpoint `600px`, non rimosso da `_init()` — nessun listener resize necessario.
- **Scale OL:** `.ol-scale-line` forzato a `position: relative` nel container dedicato per evitare overlap con i badge store.
- **Layer label:** `-webkit-line-clamp: 2` al posto di `white-space: nowrap`.
