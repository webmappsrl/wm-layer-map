> Ticket: oc:8191

# Mockup WebApp — layout overlay mappa

## Cosa cambia

Gli elementi UI sopra la mappa in `wm-layer-map` vengono riposizionati per allinearsi ai mockup desktop e mobile del cliente:

- **Desktop:** badge app e badge layer affiancati in alto a sinistra; badge store in basso a sinistra (orizzontali) sopra la scale bar.
- **Mobile:** badge app in alto a sinistra, badge layer in alto a destra (prima del controllo fullscreen); badge store in basso a sinistra (verticali) sopra la scale bar.

## Perché

Il cliente (Cammini d'Italia) ha fornito mockup con layout specifico per la webapp embeddabile. Il posizionamento precedente (layer a destra, store sotto l'app in alto) non corrispondeva al design approvato.

## Requisiti

- [x] Desktop: `#app-link` e `#layer-badge` affiancati in alto a sinistra
- [x] Mobile: `#app-link` alto sinistra, `#layer-badge` alto destra (spazio per fullscreen)
- [x] Desktop: badge store orizzontali in basso a sinistra sopra la scale
- [x] Mobile: badge store verticali in basso a sinistra sopra la scale
- [x] Scale bar sotto i badge store
- [x] `hide-cta` nasconde app-link e store, non il layer badge
- [x] Nessuna regressione su pannello, zoom, fullscreen, attribution

## Rischi

- Sovrapposizione elementi in basso su viewport molto stretti — mitigato con `gap` e `left: 16px`.
- Fullscreen OL può sovrapporsi al layer badge su mobile — mitigato con `right: 64px` sulla top bar.

## Out of scope

- Icona nel badge layer
- Commit, PR, aggiornamento ticket Orchestrator
- Modifica posizione controlli zoom
- Nuovi attributi HTML del componente

## Moduli toccati

- `src/wm-layer-map.js` — template, CSS, rimozione `_updateAppCtaGroupVisibility`
- `README.md` — CSS parts aggiornati
