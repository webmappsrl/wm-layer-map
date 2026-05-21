import Map from 'https://esm.sh/ol/Map';
import View from 'https://esm.sh/ol/View';
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
    const layer = (config.MAP?.layers ?? config.layers ?? []).find(l => l.id === layerId);
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

    const pbfSource = new VectorTileSource({
      format: new MVT(),
      url: `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/pbf/{z}/{x}/{y}.pbf`,
    });

    this._selectedId = null;

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

    this._map.addLayer(this._pbfLayer);
    this._map.getView().fit(extent3857, { padding: [40, 40, 40, 40] });

    this._map.on('click', async (evt) => {
      const feature = this._map.forEachFeatureAtPixel(evt.pixel, f => f, {
        layerFilter: l => l === this._pbfLayer,
      });

      if (!feature) return;

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
