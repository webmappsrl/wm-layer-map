import Map from 'https://esm.sh/ol/Map';
import View from 'https://esm.sh/ol/View';
import { defaults as defaultControls, FullScreen } from 'https://esm.sh/ol/control';
import TileLayer from 'https://esm.sh/ol/layer/Tile';
import XYZ from 'https://esm.sh/ol/source/XYZ';
import { transformExtent } from 'https://esm.sh/ol/proj';
import VectorTileLayer from 'https://esm.sh/ol/layer/VectorTile';
import VectorTileSource from 'https://esm.sh/ol/source/VectorTile';
import MVT from 'https://esm.sh/ol/format/MVT';
import LineString from 'https://esm.sh/ol/geom/LineString';
import Point from 'https://esm.sh/ol/geom/Point';
import { containsCoordinate } from 'https://esm.sh/ol/extent';
import Style from 'https://esm.sh/ol/style/Style';
import Stroke from 'https://esm.sh/ol/style/Stroke';
import Fill from 'https://esm.sh/ol/style/Fill';
import Text from 'https://esm.sh/ol/style/Text';
import RegularShape from 'https://esm.sh/ol/style/RegularShape';

const TEMPLATE = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/ol@9.2.4/ol.css');
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
    --wm-color-dark: #323031;
    --wm-color-light: #ffffff;
    --wm-color-light-rgb: 255, 255, 255;
    --wm-font-sm: 0.875rem;
    --ol-background-color: #ffffff;
    --ol-foreground-color: #323031;
    --ol-subtle-foreground-color: #666666;
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
  #map .ol-zoom {
    position: absolute;
    top: 50%;
    right: 16px;
    left: auto;
    display: flex;
    flex-direction: column;
    gap: 3px;
    width: fit-content;
    height: auto;
    padding: 0;
    background: transparent;
    border-radius: 0;
    box-shadow: none;
    overflow: visible;
    transform: translateY(-50%);
    z-index: 1;
  }
  #map .ol-zoom button {
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
    font-size: 28px;
    line-height: 1;
    font-weight: 700;
    font-family: inherit;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
    border: none;
    border-radius: 50%;
    box-shadow: 0 2px 20px 0 rgba(0, 0, 0, 0.1);
  }
  #map .ol-zoom .ol-zoom-in,
  #map .ol-zoom .ol-zoom-out {
    border-radius: 50%;
  }
  #map .ol-zoom button:hover,
  #map .ol-zoom button:focus {
    outline: none;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
  }
  #map .ol-full-screen {
    position: absolute;
    top: 16px;
    right: 16px;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }
  #map .ol-full-screen button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 40px;
    width: 40px;
    margin: 0;
    padding: 0;
    font-size: 22px;
    font-weight: 700;
    font-family: inherit;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
    border: none;
    border-radius: 50%;
    box-shadow: 0 2px 20px 0 rgba(0, 0, 0, 0.1);
  }
  #map .ol-full-screen button:hover,
  #map .ol-full-screen button:focus {
    outline: none;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
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
const DEF_LINE_COLOR = 'red';
const TRACK_HIGHLIGHT_COLOR = '#CA1551';
const TRACK_SELECT_COLOR = '#caaf15';
const SELECT_STROKE_WIDTH = 6;
const TRACK_ZINDEX = 490;
const DEF_MAP_MIN_ZOOM = 1;
const DEF_MAP_MAX_ZOOM = 16;
const DEF_MAP_ZOOM = 10;

function getMapZoomConfig(mapConfig) {
  return {
    minZoom: mapConfig?.minZoom ?? DEF_MAP_MIN_ZOOM,
    maxZoom: mapConfig?.maxZoom ?? DEF_MAP_MAX_ZOOM,
    defZoom: mapConfig?.defZoom ?? DEF_MAP_ZOOM,
  };
}

function getTrackStrokeColor(layer, feature) {
  const props = feature.getProperties();
  let featureStrokeColor =
    props.stroke_color && props.stroke_color !== '' ? props.stroke_color : null;
  if (props.strokecolor != null) featureStrokeColor = props.strokecolor;
  if (featureStrokeColor) return featureStrokeColor;
  return layer?.style?.color ?? DEF_LINE_COLOR;
}

function strokeWidthForZoom(zoom, mapConfig) {
  const minZoom = mapConfig?.minZoom ?? 0;
  const maxZoom = mapConfig?.maxZoom ?? 20;
  const minStrokeWidth = (mapConfig?.minStrokeWidth ?? 3) + 1;
  const maxStrokeWidth = mapConfig?.maxStrokeWidth ?? 6;
  const span = maxZoom - minZoom || 1;
  const delta = (zoom - minZoom) / span;
  return minStrokeWidth + (maxStrokeWidth - minStrokeWidth) * delta;
}

function trackHoverStyles(width, color) {
  const mainWidth = width + 2;
  const lineCap = 'round';
  return [
    new Style({
      stroke: new Stroke({
        color: '#ffffff',
        width: mainWidth + 4,
        lineCap,
      }),
    }),
    new Style({
      stroke: new Stroke({
        color,
        width: mainWidth,
        lineCap,
      }),
    }),
  ];
}

function getTrackSelectColor(layer) {
  const color = layer?.style?.color;
  if (color?.startsWith('#') || (color && !color.startsWith('#'))) return color;
  return TRACK_SELECT_COLOR;
}

function trackSelectStyles(color) {
  let strokeColor = color;
  if (color.startsWith('#')) {
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(3, 5), 16);
    const b = parseInt(color.substring(5, 7), 16);
    strokeColor = `rgba(${r}, ${g}, ${b}, 1)`;
  }
  const lineCap = 'round';
  return [
    new Style({
      stroke: new Stroke({
        color: 'rgba(255, 255, 255, 0.9)',
        width: SELECT_STROKE_WIDTH * 2,
        lineCap,
      }),
    }),
    new Style({
      stroke: new Stroke({
        color: strokeColor,
        width: SELECT_STROKE_WIDTH,
        lineCap,
      }),
    }),
  ];
}

function getTrackEdge(layer, trackId) {
  const edges = layer?.edges;
  if (!edges || trackId == null) return null;
  return edges[trackId] ?? edges[String(trackId)] ?? null;
}

function parseTappaNumber(ref) {
  if (ref == null || ref === '') return null;
  const match = String(ref).match(/Tappa\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

function shouldShowEndIcon(trackId, layer, props, maxTappaNumber) {
  const edge = getTrackEdge(layer, trackId);
  if (edge) return !edge.next?.length;

  const tappa = parseTappaNumber(props.ref);
  if (tappa != null) {
    return maxTappaNumber != null && tappa === maxTappaNumber;
  }

  // Senza edges né ref numerato: come webmapp, rosso disegnato ma coperto dal verde (zIndex).
  return true;
}

function buildStartEndIcons(flatCoordinates, showEnd) {
  if (!flatCoordinates || flatCoordinates.length < 4) return [];

  const start = [flatCoordinates[0], flatCoordinates[1]];
  const end = [
    flatCoordinates[flatCoordinates.length - 2],
    flatCoordinates[flatCoordinates.length - 1],
  ];

  const styles = [
    new Style({
      geometry: new Point(start),
      image: new RegularShape({
        fill: new Fill({ color: 'green' }),
        stroke: new Stroke({ color: 'white' }),
        points: 6,
        radius: 6,
      }),
      zIndex: TRACK_ZINDEX + 2,
    }),
  ];

  if (showEnd) {
    styles.push(
      new Style({
        geometry: new Point(end),
        image: new RegularShape({
          fill: new Fill({ color: 'red' }),
          stroke: new Stroke({ color: 'white' }),
          points: 6,
          radius: 10,
          angle: 0,
        }),
        zIndex: TRACK_ZINDEX + 1,
      }),
    );
  }

  return styles;
}

function calculatePointsDistance(coord1, coord2) {
  const dx = coord1[0] - coord2[0];
  const dy = coord1[1] - coord2[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function getLineStringFromRenderFeature(feature) {
  const lineString = new LineString([]);
  lineString.setFlatCoordinates('XY', feature.getFlatCoordinates());
  return lineString;
}

function splitLineString(geometry, minSegmentLength, options) {
  const calculateAngle = (startNode, nextNode, alwaysUp) => {
    const x = nextNode[0] - startNode[0];
    const y = nextNode[1] - startNode[1];
    let angle = Math.atan2(y, x);
    if (!alwaysUp) {
      angle =
        y < 0 && x < 0
          ? angle * -1
          : y < 0 && x === 0
            ? Math.PI * 2 - angle
            : y < 0 && x > 0
              ? angle * -1
              : angle * -1;
    }
    return angle;
  };

  const splitPoints = [];
  const coords = geometry.getCoordinates();
  if (coords.length === 0) return splitPoints;

  let coordIndex = 0;
  let startPoint = coords[coordIndex];
  let nextPoint = coords[coordIndex + 1];
  let angle = options.vertices || calculateAngle(startPoint, nextPoint, options.alwaysUp);

  const n = Math.ceil(geometry.getLength() / minSegmentLength);
  const segmentLength = geometry.getLength() / n;
  const midPoints = options.midPoints && !options.vertices;
  let currentSegmentLength = midPoints ? segmentLength / 2 : segmentLength;

  for (let i = 0; i <= n; i++) {
    const distanceBetweenPoints = calculatePointsDistance(startPoint, nextPoint);
    currentSegmentLength += distanceBetweenPoints;

    if (currentSegmentLength < segmentLength) {
      coordIndex++;
      if (coordIndex < coords.length - 1) {
        startPoint = coords[coordIndex];
        nextPoint = coords[coordIndex + 1];
        angle = options.vertices || calculateAngle(startPoint, nextPoint, options.alwaysUp);
        if (
          options.vertices &&
          (!options.extent || containsCoordinate(options.extent, startPoint))
        ) {
          splitPoints.push(startPoint);
        }
        i--;
        continue;
      }
      if (!midPoints) {
        let splitPointCoords = nextPoint;
        if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
          if (!options.vertices) splitPointCoords = [...splitPointCoords, angle];
          splitPoints.push(splitPointCoords);
        }
      }
      break;
    }

    let splitPointCoords = nextPoint;
    if (!options.extent || containsCoordinate(options.extent, splitPointCoords)) {
      if (!options.vertices) splitPointCoords = [...splitPointCoords, angle];
      splitPoints.push(splitPointCoords);
    }
    currentSegmentLength = 0;
  }

  return splitPoints;
}

function buildRefStyles(lineString, map, strokeColor) {
  const size = 450;
  const styles = [];
  const mapSize = map.getSize();
  if (!mapSize) return styles;

  const properties = lineString.getProperties();
  const refText = properties.ref != null ? String(properties.ref) : '';
  if (!refText) return styles;

  const resolution = map.getView().getResolution();
  const extent = map.getView().calculateExtent([mapSize[0] + size * 2, mapSize[1] + size * 2]);
  let splitPoints;
  try {
    splitPoints = splitLineString(lineString, size * resolution, {
      alwaysUp: false,
      midPoints: true,
      extent,
    });
  } catch {
    return styles;
  }

  splitPoints.forEach(point => {
    if (point[2] != null && Math.abs(point[2]) > Math.PI / 2) point[2] += Math.PI;
    styles.push(
      new Style({
        geometry: new Point([point[0], point[1]]),
        text: new Text({
          font: 'bold 14px "Open Sans", "Arial Unicode MS", "sans-serif"',
          placement: 'point',
          rotateWithView: false,
          rotation: 0,
          text: refText,
          overflow: false,
          fill: new Fill({ color: strokeColor }),
          stroke: new Stroke({ color: '#fff', width: 4 }),
        }),
      }),
    );
  });

  return styles;
}

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
    const zoomConfig = getMapZoomConfig(mapConfig);

    const mapEl = this.shadowRoot.getElementById('map');
    const mapWrap = this.shadowRoot.getElementById('map-wrap');
    this._setupAttribution(mapConfig);

    const controls = defaultControls({ attribution: false, rotate: false }).extend([
      new FullScreen({ source: mapWrap }),
    ]);

    this._map = new Map({
      target: mapEl,
      controls,
      layers: [
        new TileLayer({
          source: new XYZ({ url: TILE_URL }),
        }),
      ],
      view: new View({
        projection: 'EPSG:3857',
        minZoom: zoomConfig.minZoom,
        maxZoom: zoomConfig.maxZoom,
        zoom: zoomConfig.defZoom,
        extent: extent3857,
        constrainOnlyCenter: true,
        showFullExtent: true,
      }),
    });

    const pbfSource = new VectorTileSource({
      format: new MVT(),
      url: `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/pbf/{z}/{x}/{y}.pbf`,
    });

    this._hoveredId = null;
    this._selectedId = null;
    this._maxTappaNumber = null;

    this._pbfLayer = new VectorTileLayer({
      source: pbfSource,
      style: (feature) => {
        if (!featureBelongsToLayer(feature, layerId)) return null;
        const props = feature.getProperties();
        const featureId = props.id;
        const isSelected = featureId === this._selectedId;
        const isHovered = featureId === this._hoveredId;
        const zoom = this._map.getView().getZoom();
        const baseWidth = strokeWidthForZoom(zoom, mapConfig);
        const lineCap = 'round';

        let styles;
        if (isSelected) {
          styles = trackSelectStyles(getTrackSelectColor(layer));
        } else if (isHovered) {
          styles = trackHoverStyles(baseWidth, TRACK_HIGHLIGHT_COLOR);
        } else {
          styles = [
            new Style({
              stroke: new Stroke({
                color: getTrackStrokeColor(layer, feature),
                width: baseWidth,
                lineCap,
              }),
            }),
          ];
        }

        const geomType = feature.getGeometry()?.getType();
        const isLineGeometry =
          geomType === 'LineString' || geomType === 'MultiLineString';

        if (isLineGeometry) {
          const tappa = parseTappaNumber(props.ref);
          if (tappa != null && (this._maxTappaNumber == null || tappa > this._maxTappaNumber)) {
            this._maxTappaNumber = tappa;
            queueMicrotask(() => this._pbfLayer?.changed());
          }

          const flatCoordinates = feature.getFlatCoordinates();
          const showEnd = shouldShowEndIcon(featureId, layer, props, this._maxTappaNumber);
          styles.push(...buildStartEndIcons(flatCoordinates, showEnd));

          if (props.ref != null && props.ref !== '') {
            try {
              const lineString = getLineStringFromRenderFeature(feature);
              lineString.setProperties(props);
              const refColor = isSelected
                ? getTrackSelectColor(layer)
                : getTrackStrokeColor(layer, feature);
              styles.push(...buildRefStyles(lineString, this._map, refColor));
            } catch (_) {}
          }
        }

        return styles;
      },
    });

    this._map.addLayer(this._pbfLayer);
    const view = this._map.getView();
    view.fit(extent3857, {
      padding: [40, 40, 40, 40],
      maxZoom: zoomConfig.maxZoom,
    });
    const fittedZoom = view.getZoom();
    if (fittedZoom != null) {
      view.setMinZoom(Math.max(zoomConfig.minZoom, fittedZoom));
    }

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
      let hoveredId = null;
      const hoveredFeature = this._map.forEachFeatureAtPixel(evt.pixel, f => f, {
        layerFilter: l => l === this._pbfLayer,
        hitTolerance: 10,
      });

      if (hoveredFeature && featureBelongsToLayer(hoveredFeature, layerId)) {
        hoveredId = hoveredFeature.getProperties().id ?? null;
      }

      if (hoveredId !== this._hoveredId) {
        this._hoveredId = hoveredId;
        this._pbfLayer.changed();
      }

      this._map.getTargetElement().style.cursor = hoveredId ? 'pointer' : '';
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
