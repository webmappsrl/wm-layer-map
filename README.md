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
