import Map from 'https://esm.sh/ol/Map';
import View from 'https://esm.sh/ol/View';
import { defaults as defaultControls } from 'https://esm.sh/ol/control';
import TileLayer from 'https://esm.sh/ol/layer/Tile';
import XYZ from 'https://esm.sh/ol/source/XYZ';
import { transformExtent } from 'https://esm.sh/ol/proj';
import VectorTileLayer from 'https://esm.sh/ol/layer/VectorTile';
import VectorTileSource from 'https://esm.sh/ol/source/VectorTile';
import MVT from 'https://esm.sh/ol/format/MVT';
import Style from 'https://esm.sh/ol/style/Style';
import Stroke from 'https://esm.sh/ol/style/Stroke';

const TEMPLATE = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    --wm-color-dark: #323031;
    --wm-color-light-rgb: 255, 255, 255;
    --wm-font-sm: 0.875rem;
  }
  #map-wrap {
    width: 100%;
    height: 100%;
    position: relative;
  }
  #map {
    width: 100%;
    height: 100%;
  }
  #webmapp-map-attribution-container {
    position: absolute;
    bottom: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px 10px;
    border-radius: 5px 0 0 0;
    transition: bottom 500ms;
    z-index: 1;
    background: rgba(var(--wm-color-light-rgb), 0.75);
    box-shadow: -1px -1px 5px -3px var(--wm-color-dark);
  }
  #webmapp-map-attribution-container[hidden] {
    display: none;
  }
  .webmapp-map-attribution {
    display: inline-block;
    font-size: var(--wm-font-sm);
    font-weight: 700;
    line-height: 1.4;
    color: var(--wm-color-dark);
  }
  .webmapp-map-attribution-link {
    color: var(--wm-color-dark);
    text-decoration: none;
  }
  .webmapp-map-attribution-link.ion-margin-start {
    margin-left: 6px;
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
<div id="map-wrap">
  <div id="map"></div>
  <div id="webmapp-map-attribution-container" hidden>
    <div class="webmapp-map-attribution" id="attribution-content"></div>
  </div>
</div>
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

const TILE_URL = 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png';
const WEBMAPP_URL = 'https://webmapp.it/';
const OSM_ABOUT_URL = 'https://www.openstreetmap.org/about/';

function localizedLabel(label, lang = 'it') {
  if (label == null) return '';
  if (typeof label === 'string') return label;
  return label[lang] ?? label.it ?? Object.values(label).find(v => typeof v === 'string') ?? '';
}

function findTileConfig(mapConfig) {
  const tiles = mapConfig?.controls?.tiles ?? [];
  return tiles.find(t => t.type === 'button' && (t.name === 'webmapp' || t.url === TILE_URL))
    ?? tiles.find(t => t.type === 'button');
}

function featureBelongsToLayer(feature, layerId) {
  const raw = feature.get('layers');
  if (raw == null) return false;
  try {
    const ids = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(ids) && ids.includes(layerId);
  } catch {
    return false;
  }
}

class WmLayerMap extends HTMLElement {
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._init();
    this.shadowRoot.getElementById('panel-close').addEventListener('click', () => {
      this.shadowRoot.getElementById('panel').classList.remove('open');
      this._selectedId = null;
      if (this._pbfLayer) this._pbfLayer.changed();
    });
  }

  async _init() {
    const shard = this.getAttribute('shard');
    const appId = this.getAttribute('app-id');
    const layerId = Number(this.getAttribute('layer-id'));

    const configUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/config.json`;
    const config = await fetch(configUrl).then(r => r.json());
    const mapConfig = config.MAP ?? config;
    const layer = (mapConfig.layers ?? []).find(l => l.id === layerId);
    if (!layer) {
      console.error(`wm-layer-map: layer id ${layerId} not found`);
      return;
    }

    const extent3857 = transformExtent(layer.bbox, 'EPSG:4326', 'EPSG:3857');

    const mapEl = this.shadowRoot.getElementById('map');
    this._setupAttribution(mapConfig);

    this._map = new Map({
      target: mapEl,
      controls: defaultControls({ attribution: false }),
      layers: [
        new TileLayer({
          source: new XYZ({ url: TILE_URL }),
        }),
      ],
      view: new View({
        projection: 'EPSG:3857',
      }),
    });

    const pbfSource = new VectorTileSource({
      format: new MVT(),
      url: `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/pbf/{z}/{x}/{y}.pbf`,
    });

    this._selectedId = null;

    this._pbfLayer = new VectorTileLayer({
      source: pbfSource,
      style: (feature) => {
        if (!featureBelongsToLayer(feature, layerId)) return null;
        const isSelected = feature.getProperties().id === this._selectedId;
        return new Style({
          stroke: new Stroke({
            color: isSelected ? '#FFD700' : '#E84B2A',
            width: isSelected ? 5 : 3,
          }),
        });
      },
    });

    this._map.addLayer(this._pbfLayer);
    this._map.getView().fit(extent3857, { padding: [40, 40, 40, 40] });

    this._map.on('click', async (evt) => {
      const feature = this._map.forEachFeatureAtPixel(evt.pixel, f => f, {
        layerFilter: l => l === this._pbfLayer,
      });

      if (!feature || !featureBelongsToLayer(feature, layerId)) return;

      const trackId = feature.getProperties().id;
      if (!trackId) return;

      this._selectedId = trackId;
      this._pbfLayer.changed();

      const trackUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/tracks/${trackId}.json`;
      const track = await fetch(trackUrl).then(r => r.json());
      this._openPanel(track.properties);
    });

    this._map.on('pointermove', (evt) => {
      const hit = this._map.hasFeatureAtPixel(evt.pixel, {
        layerFilter: l => l === this._pbfLayer,
      });
      this._map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });
  }

  _setupAttribution(mapConfig) {
    const container = this.shadowRoot.getElementById('webmapp-map-attribution-container');
    const content = this.shadowRoot.getElementById('attribution-content');
    if (!container || !content) return;

    if (mapConfig?.attribution === false) {
      container.hidden = true;
      return;
    }

    container.hidden = false;

    if (typeof mapConfig?.attribution === 'string') {
      content.innerHTML = mapConfig.attribution;
      return;
    }

    const tile = findTileConfig(mapConfig);
    const tileLabel = localizedLabel(tile?.label) || 'Webmapp';
    const isWebmappTile = !tile || tile.name === 'webmapp' || tile.url === TILE_URL;
    const tileLink = tile?.link ?? (isWebmappTile ? WEBMAPP_URL : null);

    let html = '';
    if (tileLabel) {
      if (tileLink) {
        html += `<a class="wm-clickable webmapp-map-attribution-link" href="${tileLink}" target="_blank" rel="noopener noreferrer">© ${tileLabel}</a>`;
      } else {
        html += `<span>© ${tileLabel}</span>`;
      }
    }
    html += `<a class="wm-clickable webmapp-map-attribution-link ion-margin-start" href="${OSM_ABOUT_URL}" target="_blank" rel="noopener noreferrer"> © OpenStreetMap</a>`;
    content.innerHTML = html;
  }

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
}

customElements.define('wm-layer-map', WmLayerMap);
