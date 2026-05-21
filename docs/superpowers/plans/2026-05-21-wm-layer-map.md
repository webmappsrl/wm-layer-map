# wm-layer-map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare il Web Component `<wm-layer-map>` che mostra le tracce di un layer su mappa OpenLayers con pannello laterale di dettaglio al click.

**Architecture:** Web Component vanilla JS (Custom Elements v1 + Shadow DOM) in un singolo file `wm-layer-map.js`. OpenLayers caricato da CDN ESM. Nessun bundler, nessun framework — embeddabile con un solo `<script type="module">`.

**Tech Stack:** OpenLayers 9.x (CDN ESM), Vanilla JS ES2020, Web Components API, HTML/CSS

---

## File Structure

```
wm-layer-map/
├── src/
│   └── wm-layer-map.js       # Custom element completo (mappa + pannello)
├── test/
│   └── index.html             # Pagina di test manuale
├── docs/
│   └── superpowers/
│       ├── specs/2026-05-21-wm-layer-map-design.md
│       └── plans/2026-05-21-wm-layer-map.md
└── README.md
```

---

### Task 1: Setup progetto e pagina di test

**Files:**
- Create: `src/wm-layer-map.js`
- Create: `test/index.html`

- [ ] **Step 1: Crea la struttura cartelle**

```bash
mkdir -p /Users/bongiu/Documents/wm-layer-map/src
mkdir -p /Users/bongiu/Documents/wm-layer-map/test
cd /Users/bongiu/Documents/wm-layer-map
git init
```

- [ ] **Step 2: Crea `test/index.html` — pagina di test**

```html
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>wm-layer-map test</title>
  <style>
    body { margin: 0; padding: 20px; font-family: sans-serif; }
    wm-layer-map { display: block; width: 100%; height: 600px; }
  </style>
</head>
<body>
  <h1>wm-layer-map test</h1>
  <wm-layer-map shard="camminiditalia" app-id="1" layer-id="5"></wm-layer-map>
  <script type="module" src="../src/wm-layer-map.js"></script>
</body>
</html>
```

- [ ] **Step 3: Crea `src/wm-layer-map.js` con lo scheletro minimo del custom element**

```js
const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: sans-serif;
  }
  #map {
    width: 100%;
    height: 100%;
  }
</style>
<div id="map"></div>
`;

class WmLayerMap extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    console.log('wm-layer-map connected', {
      shard: this.getAttribute('shard'),
      appId: this.getAttribute('app-id'),
      layerId: this.getAttribute('layer-id'),
    });
  }
}

customElements.define('wm-layer-map', WmLayerMap);
```

- [ ] **Step 4: Apri `test/index.html` in un browser e verifica la console**

Apri il file con un server locale (es. `npx serve .` dalla cartella `wm-layer-map`) e naviga su `http://localhost:3000/test/`.

Atteso nella console: `wm-layer-map connected {shard: "camminiditalia", appId: "1", layerId: "5"}`

- [ ] **Step 5: Commit**

```bash
cd /Users/bongiu/Documents/wm-layer-map
git add .
git commit -m "feat: scaffold wm-layer-map custom element"
```

---

### Task 2: Fetch config e inizializzazione mappa OpenLayers

**Files:**
- Modify: `src/wm-layer-map.js`

OpenLayers viene importato da CDN ESM. Il config JSON ha la struttura:
```json
{
  "layers": [
    { "id": 5, "bbox": [17.004559, 40.88477, 17.179717, 41.009711], "name": "...", ... }
  ]
}
```
Il `bbox` è `[minLon, minLat, maxLon, maxLat]` in EPSG:4326. OpenLayers lavora in EPSG:3857, quindi va trasformato con `transformExtent`.

- [ ] **Step 1: Aggiorna `src/wm-layer-map.js` — aggiungi import OL e fetch config**

Sostituisci l'intero contenuto del file con:

```js
import Map from 'https://cdn.jsdelivr.net/npm/ol@9/Map.js';
import View from 'https://cdn.jsdelivr.net/npm/ol@9/View.js';
import TileLayer from 'https://cdn.jsdelivr.net/npm/ol@9/layer/Tile.js';
import XYZ from 'https://cdn.jsdelivr.net/npm/ol@9/source/XYZ.js';
import { transformExtent } from 'https://cdn.jsdelivr.net/npm/ol@9/proj.js';

const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: sans-serif;
  }
  #map {
    width: 100%;
    height: 100%;
  }
</style>
<div id="map"></div>
`;

class WmLayerMap extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._init();
  }

  async _init() {
    const shard = this.getAttribute('shard');
    const appId = this.getAttribute('app-id');
    const layerId = Number(this.getAttribute('layer-id'));

    const configUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/config.json`;
    const config = await fetch(configUrl).then(r => r.json());
    const layer = config.layers.find(l => l.id === layerId);
    if (!layer) {
      console.error(`wm-layer-map: layer id ${layerId} not found`);
      return;
    }

    const extent3857 = transformExtent(layer.bbox, 'EPSG:4326', 'EPSG:3857');

    const mapEl = this.shadowRoot.getElementById('map');
    this._map = new Map({
      target: mapEl,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png',
          }),
        }),
      ],
      view: new View({
        projection: 'EPSG:3857',
      }),
    });

    this._map.getView().fit(extent3857, { padding: [40, 40, 40, 40] });
  }
}

customElements.define('wm-layer-map', WmLayerMap);
```

- [ ] **Step 2: Ricarica `test/index.html` e verifica**

Atteso: la mappa si centra sull'area del layer (Puglia/Molise per layer 5). I tile raster devono caricarsi.

Se la mappa appare bianca: apri DevTools → Network → verifica che la richiesta a `config.json` vada a buon fine (200 OK).

- [ ] **Step 3: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: init OL map with raster tiles and bbox fit from config"
```

---

### Task 3: Layer PBF (VectorTile) con stile tracce

**Files:**
- Modify: `src/wm-layer-map.js`

I PBF sono serviti da `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/{appId}/pbf/{z}/{x}/{y}.pbf`. OpenLayers li legge con `VectorTileLayer` + `VectorTileSource` in formato MVT.

- [ ] **Step 1: Aggiungi import VectorTile e Stroke in cima al file**

Aggiungi dopo gli import esistenti:

```js
import VectorTileLayer from 'https://cdn.jsdelivr.net/npm/ol@9/layer/VectorTile.js';
import VectorTileSource from 'https://cdn.jsdelivr.net/npm/ol@9/source/VectorTile.js';
import MVT from 'https://cdn.jsdelivr.net/npm/ol@9/format/MVT.js';
import Style from 'https://cdn.jsdelivr.net/npm/ol@9/style/Style.js';
import Stroke from 'https://cdn.jsdelivr.net/npm/ol@9/style/Stroke.js';
```

- [ ] **Step 2: Aggiungi il layer PBF dentro `_init()`, dopo `this._map = new Map(...)`**

Aggiungi queste righe prima di `this._map.getView().fit(...)`:

```js
const pbfSource = new VectorTileSource({
  format: new MVT(),
  url: `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/pbf/{z}/{x}/{y}.pbf`,
});

const trackStyle = new Style({
  stroke: new Stroke({ color: '#E84B2A', width: 3 }),
});

this._pbfLayer = new VectorTileLayer({
  source: pbfSource,
  style: trackStyle,
});

this._map.addLayer(this._pbfLayer);
```

- [ ] **Step 3: Ricarica e verifica**

Atteso: le tracce appaiono come linee arancio/rosse sopra i tile raster. Fai zoom in/out — le tracce devono ricaricarsi ai vari livelli di zoom.

Se non appaiono: apri Network e verifica che le richieste `.pbf` tornino 200 con `Content-Type: application/x-protobuf`.

- [ ] **Step 4: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: add PBF vector tile layer with track style"
```

---

### Task 4: Click su traccia → fetch dettagli

**Files:**
- Modify: `src/wm-layer-map.js`

Al click sulla mappa, OpenLayers usa `map.forEachFeatureAtPixel()` per trovare la feature PBF sotto il cursore. Le properties della feature contengono `id` (numero intero). Il dettaglio si trova a `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/tracks/{id}.json`.

- [ ] **Step 1: Aggiungi il listener click in `_init()`, dopo `this._map.getView().fit(...)`**

```js
this._map.on('click', async (evt) => {
  const feature = this._map.forEachFeatureAtPixel(evt.pixel, f => f, {
    layerFilter: l => l === this._pbfLayer,
  });

  if (!feature) return;

  const trackId = feature.getProperties().id;
  if (!trackId) return;

  const trackUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/tracks/${trackId}.json`;
  const track = await fetch(trackUrl).then(r => r.json());
  this._openPanel(track.properties);
});
```

- [ ] **Step 2: Aggiungi il metodo stub `_openPanel` nella classe, dopo `_init()`**

```js
_openPanel(properties) {
  console.log('track properties:', properties);
}
```

- [ ] **Step 3: Ricarica, clicca su una traccia e verifica la console**

Atteso: compare in console un oggetto con `name`, `from`, `to`, `distance`, `ascent`, `descent`, `description`, `feature_image`.

Se il click non funziona: assicurati di cliccare esattamente sopra una linea (le tracce sono sottili — prova ad aumentare il `width` a `8` temporaneamente per facilitare il click durante il test).

- [ ] **Step 4: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: click on track fetches track detail JSON"
```

---

### Task 5: Pannello laterale — HTML e CSS

**Files:**
- Modify: `src/wm-layer-map.js`

Il pannello è nascosto di default (`transform: translateX(100%)`), slide-in quando si apre. Larghezza fissa 360px su desktop, 100% su mobile.

- [ ] **Step 1: Aggiorna `TEMPLATE` con il pannello laterale**

Sostituisci la costante `TEMPLATE` con:

```js
const TEMPLATE = `
<style>
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: sans-serif;
  }
  #map {
    width: 100%;
    height: 100%;
  }
  #panel {
    position: absolute;
    top: 0;
    right: 0;
    width: 360px;
    height: 100%;
    background: #fff;
    box-shadow: -2px 0 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    z-index: 100;
    box-sizing: border-box;
  }
  #panel.open {
    transform: translateX(0);
  }
  #panel-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #333;
    line-height: 1;
    padding: 4px 8px;
  }
  #panel-close:hover { color: #000; }
  #panel-title {
    font-size: 16px;
    font-weight: 700;
    line-height: 1.3;
    margin: 16px 40px 16px 16px;
    color: #111;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #111;
    margin: 16px 16px 8px;
  }
  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-bottom: 1px solid #f0f0f0;
    font-size: 14px;
    color: #333;
  }
  .detail-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 500;
  }
  .detail-icon {
    font-size: 16px;
    width: 20px;
    text-align: center;
  }
  .detail-value {
    color: #555;
    font-size: 13px;
  }
  #panel-image {
    width: 100%;
    height: 180px;
    object-fit: cover;
    display: block;
    margin: 8px 0;
  }
  #panel-image[src=""] { display: none; }
  #panel-description {
    font-size: 13px;
    line-height: 1.6;
    color: #444;
    padding: 0 16px 24px;
    white-space: pre-line;
  }
  @media (max-width: 600px) {
    #panel { width: 100%; }
  }
</style>
<div id="map"></div>
<div id="panel">
  <button id="panel-close">✕</button>
  <div id="panel-title"></div>
  <div class="section-title">Dettagli tecnici</div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon">📍</span>Partenza</span>
    <span class="detail-value" id="detail-from"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon">🏁</span>Arrivo</span>
    <span class="detail-value" id="detail-to"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon">↔</span>Distanza</span>
    <span class="detail-value" id="detail-distance"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon">↗</span>Dislivello positivo</span>
    <span class="detail-value" id="detail-ascent"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon">↘</span>Dislivello negativo</span>
    <span class="detail-value" id="detail-descent"></span>
  </div>
  <div class="section-title">Galleria</div>
  <img id="panel-image" src="" alt="">
  <div class="section-title">Descrizione</div>
  <div id="panel-description"></div>
</div>
`;
```

- [ ] **Step 2: Ricarica e verifica che il pannello non sia visibile**

Atteso: la mappa occupa tutto lo spazio, nessun pannello visibile. Nessun errore in console.

- [ ] **Step 3: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: add side panel HTML and CSS structure"
```

---

### Task 6: Collega `_openPanel` al DOM del pannello

**Files:**
- Modify: `src/wm-layer-map.js`

- [ ] **Step 1: Sostituisci il metodo stub `_openPanel` con l'implementazione completa**

```js
_openPanel(props) {
  const sr = this.shadowRoot;

  sr.getElementById('panel-title').textContent = props.name?.it ?? '';
  sr.getElementById('detail-from').textContent = props.from ?? '';
  sr.getElementById('detail-to').textContent = props.to ?? '';
  sr.getElementById('detail-distance').textContent = props.distance ? `${props.distance} km` : '';
  sr.getElementById('detail-ascent').textContent = props.ascent ? `${props.ascent} m` : '';
  sr.getElementById('detail-descent').textContent = props.descent ? `${props.descent} m` : '';

  const imgEl = sr.getElementById('panel-image');
  const imgUrl = props.feature_image?.sizes?.['400x200'] ?? '';
  imgEl.src = imgUrl;
  imgEl.alt = props.name?.it ?? '';

  sr.getElementById('panel-description').textContent = props.description?.it ?? '';

  sr.getElementById('panel').classList.add('open');
}
```

- [ ] **Step 2: Aggiungi il listener per il bottone chiudi in `connectedCallback()`, dopo `this.attachShadow`**

Aggiungi queste righe alla fine di `connectedCallback()`, dopo `this._init()`:

```js
this.shadowRoot.getElementById('panel-close').addEventListener('click', () => {
  this.shadowRoot.getElementById('panel').classList.remove('open');
});
```

**Nota:** il pannello viene aggiunto al DOM da `TEMPLATE` dentro `connectedCallback()` prima di `_init()`, quindi `getElementById` trova l'elemento al momento del bind.

- [ ] **Step 3: Ricarica, clicca su una traccia e verifica il pannello**

Atteso:
- Il pannello scorre in da destra
- Mostra nome, partenza, arrivo, distanza, dislivelli
- L'immagine si carica (thumbnail 400x200)
- La descrizione è leggibile
- Il bottone ✕ chiude il pannello

- [ ] **Step 4: Verifica su mobile (DevTools → toggle device)**

Atteso: il pannello occupa il 100% della larghezza su schermi < 600px.

- [ ] **Step 5: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: populate side panel with track details on click"
```

---

### Task 7: Cursore pointer e highlight traccia selezionata

**Files:**
- Modify: `src/wm-layer-map.js`

Due miglioramenti UX: il cursore diventa `pointer` sopra una traccia, e la traccia cliccata viene evidenziata in giallo.

- [ ] **Step 1: Aggiungi listener `pointermove` in `_init()` dopo il listener `click`**

```js
this._map.on('pointermove', (evt) => {
  const hit = this._map.hasFeatureAtPixel(evt.pixel, {
    layerFilter: l => l === this._pbfLayer,
  });
  this._map.getTargetElement().style.cursor = hit ? 'pointer' : '';
});
```

- [ ] **Step 2: Aggiungi lo stato `_selectedId` e aggiorna lo stile PBF per highlight**

Aggiungi nella classe, come proprietà inizializzata in `_init()` prima del listener click:

```js
this._selectedId = null;
```

Aggiorna lo stile del `_pbfLayer` per evidenziare la feature selezionata. Sostituisci la riga `style: trackStyle` con una funzione di stile:

```js
this._pbfLayer = new VectorTileLayer({
  source: pbfSource,
  style: (feature) => {
    const isSelected = feature.getProperties().id === this._selectedId;
    return new Style({
      stroke: new Stroke({
        color: isSelected ? '#FFD700' : '#E84B2A',
        width: isSelected ? 5 : 3,
      }),
    });
  },
});
```

- [ ] **Step 3: Aggiorna il listener click per impostare `_selectedId` e forzare il re-render**

Sostituisci il listener `click` esistente con:

```js
this._map.on('click', async (evt) => {
  const feature = this._map.forEachFeatureAtPixel(evt.pixel, f => f, {
    layerFilter: l => l === this._pbfLayer,
  });

  if (!feature) return;

  const trackId = feature.getProperties().id;
  if (!trackId) return;

  this._selectedId = trackId;
  this._pbfLayer.changed();

  const trackUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/tracks/${trackId}.json`;
  const track = await fetch(trackUrl).then(r => r.json());
  this._openPanel(track.properties);
});
```

- [ ] **Step 4: Aggiorna `_openPanel` per resettare l'highlight quando il pannello viene chiuso**

Aggiorna il listener del bottone chiudi (già presente in `connectedCallback`):

```js
this.shadowRoot.getElementById('panel-close').addEventListener('click', () => {
  this.shadowRoot.getElementById('panel').classList.remove('open');
  this._selectedId = null;
  this._pbfLayer.changed();
});
```

- [ ] **Step 5: Ricarica e verifica**

Atteso:
- Il cursore diventa mano sopra una traccia
- La traccia cliccata diventa gialla/spessa
- Chiudendo il pannello la traccia torna al colore normale

- [ ] **Step 6: Commit**

```bash
git add src/wm-layer-map.js
git commit -m "feat: pointer cursor and selected track highlight"
```

---

### Task 8: README e verifica finale

**Files:**
- Create: `README.md`

- [ ] **Step 1: Crea `README.md`**

```markdown
# wm-layer-map

Web Component per visualizzare le tracce di un layer su mappa OpenLayers.

## Utilizzo

```html
<script type="module" src="wm-layer-map.js"></script>
<wm-layer-map shard="camminiditalia" app-id="1" layer-id="5"></wm-layer-map>
```

## Attributi

| Attributo  | Descrizione                            |
|------------|----------------------------------------|
| `shard`    | Nome shard S3 (es. `camminiditalia`)   |
| `app-id`   | ID applicazione (es. `1`)              |
| `layer-id` | ID layer da visualizzare (es. `5`)     |

## Dimensioni

Il componente si adatta al contenitore. Imposta `width` e `height` via CSS:

```css
wm-layer-map { width: 100%; height: 600px; }
```
```

- [ ] **Step 2: Checklist test finale**

Apri `test/index.html` e verifica:

- [ ] La mappa si carica e si centra sull'area del layer
- [ ] I tile raster appaiono (sfondo cartografico)
- [ ] Le tracce PBF appaiono come linee rosse
- [ ] Hover su traccia → cursore pointer
- [ ] Click su traccia → traccia diventa gialla + pannello si apre
- [ ] Il pannello mostra nome, dettagli, immagine, descrizione
- [ ] Bottone ✕ chiude il pannello e resetta highlight
- [ ] Su mobile (DevTools < 600px) il pannello è full-width

- [ ] **Step 3: Commit finale**

```bash
git add README.md
git commit -m "docs: add README with usage instructions"
```
