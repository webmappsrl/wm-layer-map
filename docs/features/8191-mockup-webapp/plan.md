> Ticket: oc:8191

# Piano — Mockup WebApp layout overlay

## Stato: implementato (branch `oc_8191`)

### 1. Layout overlay base

- [x] Ristrutturare template: `#map-top-bar-left` / `#map-top-bar-right` + `#map-bottom-left` con store e scale
- [x] CSS top bar: desktop badge affiancati (`justify-content: flex-start`), mobile `space-between`
- [x] CSS bottom-left: store row (desktop) / column (mobile) sopra scale
- [x] Rimuovere `#app-cta-group` e `_updateAppCtaGroupVisibility`
- [x] Aggiungere controllo OpenLayers `ScaleLine` con target `#webmapp-map-scale-line-container`
- [x] Aggiornare README CSS parts (`bottom-left`, `scale-line`)

### 2. Fix overlap scale / store

- [x] Stack flex `#map-bottom-left` con store sopra scale
- [x] Override `.ol-scale-line` → `position: relative` nel container
- [x] `z-index` store (2) sopra scale (1)

### 3. Fullscreen su mobile

- [x] `#map .ol-full-screen { display: none }` in `@media (max-width: 600px)`
- [x] `#map-top-bar { right: 16px }` su mobile (libera angolo destro per layer badge)

### 4. Ridimensionamento badge

- [x] App link: min-height 38px, padding `4px 10px 4px 4px`, icona 24px, label 12px, subtitle 10px, radius 16px
- [x] Layer badge: min-height 36px, padding `4px 10px`, label 12px, radius 16px
- [x] Store badge: altezza immagine 32px

### 5. Layer badge — wrap 2 righe

- [x] `#layer-badge-label`: `-webkit-line-clamp: 2`, `overflow-wrap: anywhere`
- [x] `#map-top-bar-right`: `max-width: min(320px, 100%)` (allineato al box app)

## Verifica

```bash
npx serve .
# http://localhost:PORT/test/index.html
```

| Scenario | Atteso |
|----------|--------|
| Desktop (>600px) | App + layer a sinistra; store orizzontali sopra scale; fullscreen visibile |
| Mobile (≤600px) | App sx, layer dx; store verticali sopra scale; fullscreen nascosto |
| `hide-cta` | Spariscono link e store, layer resta |
| Nome layer lungo | Wrap fino a 2 righe, poi ellipsis |
| Viewport stretto | Nessuna sovrapposizione store/scale/attribution |

## Follow-up opzionale (non implementato)

- Vincolo dinamico larghezza layer badge ≤ larghezza effettiva `#app-link` via `ResizeObserver`
