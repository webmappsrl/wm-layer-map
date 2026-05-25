# wm-layer-map

Web Component vanilla per visualizzare le tracce di un layer su mappa OpenLayers.

## Integrazione

Il componente include gia` il proprio markup interno e il proprio style nello Shadow DOM. Dall'esterno devi solo:

1. caricare lo script ES module;
2. inserire il tag `<wm-layer-map>`;
3. assegnare una dimensione al tag, inline oppure via CSS della pagina.

```html
<wm-layer-map
  shard="camminiditalia"
  app-id="1"
  layer-id="117"
  style="display:block;width:100%;height:600px"
></wm-layer-map>

<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/webmappsrl/wm-layer-map@main/src/wm-layer-map.js"
></script>
```

Se preferisci, la dimensione puo` anche stare nel CSS della tua pagina invece che nell'attributo `style`, ma una `height` esplicita e` comunque necessaria per rendere visibile la mappa.

Per ambienti di produzione e` consigliato sostituire `@main` con un tag versionato, ad esempio `@v1.0.0`.

Se usi jsDelivr e devi forzare l'aggiornamento di una URL gia` in cache, puoi usare il tool ufficiale di purge cache di jsDelivr: [Purge CDN cache - jsDelivr](https://www.jsdelivr.com/tools/purge).

## Attributi

Attributi obbligatori:

- `shard`: shard S3 dell'istanza, ad esempio `camminiditalia`.
- `app-id`: ID applicazione, ad esempio `1`.
- `layer-id`: ID numerico del layer da mostrare.

Attributi opzionali:

- `cta-label`: etichetta del link CTA in alto a sinistra.
- `cta-url`: URL custom della CTA; se assente usa la web app calcolata da `shard` e `app-id`.
- `app-icon-url`: URL custom dell'icona app mostrata nella CTA.
- `ios-store-url`: URL custom App Store.
- `android-store-url`: URL custom Google Play.
- `hide-cta`: nasconde CTA e badge store.
- `lang`: forza la lingua usata per label e contenuti localizzati; se assente usa `document.documentElement.lang` e poi fallback `it`.

## Eventi

Il componente emette eventi DOM custom, bubbled e `composed`, quindi ascoltabili anche fuori dallo Shadow DOM:

- `ready`: emesso quando configurazione, layer e mappa sono pronti.
- `track-selected`: emesso quando l'utente clicca una traccia e vengono caricati i dettagli.
- `error`: emesso in caso di errore di configurazione, caricamento layer o caricamento traccia.

Esempio:

```js
const mapEl = document.querySelector('wm-layer-map');

mapEl.addEventListener('ready', (event) => {
  console.log('Layer pronto:', event.detail);
});

mapEl.addEventListener('track-selected', (event) => {
  console.log('Traccia selezionata:', event.detail.trackId);
});

mapEl.addEventListener('error', (event) => {
  console.error('wm-layer-map error:', event.detail);
});
```

## Theming

Lo style principale rimane interno al componente. Per personalizzarlo dall'esterno usa CSS custom properties sul tag host:

- `--wm-color-primary`
- `--wm-color-dark`
- `--wm-color-light`
- `--wm-color-light-rgb`
- `--wm-font-sm`
- `--wm-font-family`
- `--wm-panel-width`
- `--wm-control-size`
- `--wm-surface-radius`
- `--wm-surface-shadow`

Esempio:

```css
wm-layer-map {
  display: block;
  height: 600px;
  --wm-color-primary: #0a7f5a;
  --wm-color-dark: #1f2937;
  --wm-panel-width: 420px;
}
```

## CSS Parts

Per styling mirato di elementi interni esposti pubblicamente puoi usare `::part(...)`:

- `map-wrap`
- `top-bar`
- `app-link`
- `store-links`
- `layer-badge`
- `map`
- `attribution`
- `panel`
- `panel-close`
- `panel-title`

Esempio:

```css
wm-layer-map::part(panel) {
  border-left: 1px solid rgba(0, 0, 0, 0.08);
}
```

## Compatibilita`

- Richiede browser moderni con supporto a ES modules, Custom Elements e Shadow DOM.
- OpenLayers, Chart.js, `ol.css` e font Montserrat sono caricati automaticamente dal componente via CDN.
- Gli asset locali referenziati dal modulo vengono risolti automaticamente anche quando il file JS e` servito via jsdelivr.
- Se una URL jsDelivr sembra servire ancora una versione precedente, puoi invalidarne la cache con [Purge CDN cache - jsDelivr](https://www.jsdelivr.com/tools/purge).
