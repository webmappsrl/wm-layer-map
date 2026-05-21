# wm-layer-map Design Spec

## Goal

Web Component embeddabile che mostra le tracce di un layer su una mappa OpenLayers, con pannello laterale di dettaglio al click.

## Utilizzo

```html
<script src="wm-layer-map.js"></script>
<wm-layer-map shard="camminiditalia" app-id="1" layer-id="5"></wm-layer-map>
```

## Attributi

| Attributo  | Tipo   | Descrizione                                      |
|------------|--------|--------------------------------------------------|
| `shard`    | string | Nome dello shard S3 (es. `camminiditalia`)       |
| `app-id`   | string | ID applicazione (es. `1`)                        |
| `layer-id` | string | ID del layer da visualizzare (es. `5`)           |

## URL Pattern

- Config:  `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/{app_id}/config.json`
- Tiles raster: `https://api.webmapp.it/tiles/{z}/{x}/{y}.png`
- PBF vector: `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/{app_id}/pbf/{z}/{x}/{y}.pbf`
- Track detail: `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/tracks/{id}.json`

## Flusso dati

1. Al mount del componente, fetch `config.json`
2. Trova il layer con `id === layer-id` nell'array `layers`
3. Usa `bbox` del layer per il fit iniziale della mappa (`map.getView().fit()`)
4. Aggiunge layer raster (XYZ) come base map
5. Aggiunge layer PBF (VectorTile) con stile linea colorata
6. Al click su una feature PBF, legge `feature.getProperties().id`
7. Fetch `tracks/{id}.json`
8. Apre pannello laterale destro con i dettagli

## Layout

```
+------------------------------------------+----------+
|                                          |  [✕]     |
|                                          |  Nome    |
|           MAPPA OpenLayers               |  traccia |
|                                          |          |
|                                          | Dettagli |
|                                          | tecnici  |
|                                          |          |
|                                          | Galleria |
|                                          |          |
|                                          | Descriz. |
+------------------------------------------+----------+
```

Il pannello è chiuso di default; si apre/chiude via click sulla feature o bottone ✕.

## Pannello laterale — campi visualizzati

Da `tracks/{id}.json` → `properties`:

- **Nome**: `name.it`
- **Dettagli tecnici**:
  - Partenza: `from`
  - Arrivo: `to`
  - Distanza: `distance` km
  - Dislivello positivo: `ascent` m
  - Dislivello negativo: `descent` m
- **Galleria**: immagine da `feature_image.sizes["400x200"]`
- **Descrizione**: `description.it`

## Architettura

- **`wm-layer-map.js`** — custom element unico file, include tutto
  - Registra `<wm-layer-map>` via `customElements.define()`
  - Shadow DOM per CSS isolato
  - OpenLayers caricato via CDN (`esm.sh` o `cdn.jsdelivr.net`)
  - Nessun framework, nessun bundler richiesto
- **CSS** — iniettato nel shadow DOM come `<style>` inline nel JS

## Tecnologie

- OpenLayers 9.x (CDN ESM)
- Vanilla JS ES2020
- Web Components (Custom Elements v1 + Shadow DOM)
- Nessuna dipendenza di build

## Testing

- Test manuale in un file `index.html` locale con `<wm-layer-map>` configurato
- Verifica: fit bbox, render tracce PBF, click → pannello, chiusura pannello
