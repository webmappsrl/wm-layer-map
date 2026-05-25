import Map from 'https://esm.sh/ol@9.2.4/Map';
import View from 'https://esm.sh/ol@9.2.4/View';
import { defaults as defaultControls, FullScreen } from 'https://esm.sh/ol@9.2.4/control';
import TileLayer from 'https://esm.sh/ol@9.2.4/layer/Tile';
import XYZ from 'https://esm.sh/ol@9.2.4/source/XYZ';
import { transformExtent } from 'https://esm.sh/ol@9.2.4/proj';
import VectorTileLayer from 'https://esm.sh/ol@9.2.4/layer/VectorTile';
import VectorTileSource from 'https://esm.sh/ol@9.2.4/source/VectorTile';
import MVT from 'https://esm.sh/ol@9.2.4/format/MVT';
import LineString from 'https://esm.sh/ol@9.2.4/geom/LineString';
import Point from 'https://esm.sh/ol@9.2.4/geom/Point';
import { buffer as bufferExtent, containsCoordinate } from 'https://esm.sh/ol@9.2.4/extent';
import Style from 'https://esm.sh/ol@9.2.4/style/Style';
import Stroke from 'https://esm.sh/ol@9.2.4/style/Stroke';
import Fill from 'https://esm.sh/ol@9.2.4/style/Fill';
import Text from 'https://esm.sh/ol@9.2.4/style/Text';
import RegularShape from 'https://esm.sh/ol@9.2.4/style/RegularShape';
import CircleStyle from 'https://esm.sh/ol@9.2.4/style/Circle';
import Feature from 'https://esm.sh/ol@9.2.4/Feature';
import VectorLayer from 'https://esm.sh/ol@9.2.4/layer/Vector';
import VectorSource from 'https://esm.sh/ol@9.2.4/source/Vector';
import { fromLonLat } from 'https://esm.sh/ol@9.2.4/proj';
import { Chart, registerables } from 'https://esm.sh/chart.js@4.4.7';

Chart.register(...registerables);

const SLOPE_CHART_SLOPE_EASY = [67, 227, 9];
const SLOPE_CHART_SLOPE_MEDIUM_EASY = [195, 255, 0];
const SLOPE_CHART_SLOPE_MEDIUM = [255, 239, 10];
const SLOPE_CHART_SLOPE_MEDIUM_HARD = [255, 174, 0];
const SLOPE_CHART_SLOPE_HARD = [196, 30, 4];

const ESlopeChartSurface = {
  ASPHALT: 'asphalt',
  CONCRETE: 'concrete',
  DIRT: 'dirt',
  GRASS: 'grass',
  GRAVEL: 'gravel',
  PAVED: 'paved',
  SAND: 'sand',
};

const SLOPE_CHART_SURFACE = {
  [ESlopeChartSurface.ASPHALT]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.CONCRETE]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.DIRT]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.GRASS]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.GRAVEL]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.PAVED]: { backgroundColor: '220, 220, 200' },
  [ESlopeChartSurface.SAND]: { backgroundColor: '220, 220, 200' },
};

const SURFACE_VALUES = Object.values(ESlopeChartSurface);

function getDistanceBetweenPoints(point1, point2) {
  const R = 6371e3;
  const lat1 = (point1.latitude * Math.PI) / 180;
  const lat2 = (point2.latitude * Math.PI) / 180;
  const lon1 = (point1.longitude * Math.PI) / 180;
  const lon2 = (point2.longitude * Math.PI) / 180;
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const a =
    Math.sin(dlat / 2) * Math.sin(dlat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) * Math.sin(dlon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getTrackGeometry(track) {
  if (track?.geometry) return track.geometry;
  if (track?.geojson?.geometry) return track.geojson.geometry;
  if (track?.geojson?.type === 'LineString') return track.geojson;
  return null;
}

function getTrackCoordinates(track) {
  const geometry = getTrackGeometry(track);
  return geometry?.coordinates ?? null;
}

function is3dGeometry(geometry) {
  if (geometry == null || geometry.type !== 'LineString') return false;
  return geometry.coordinates.some(coord => coord.length === 3 && coord[2] !== 0);
}

function getSlopeGradientColor(value) {
  let min;
  let max;
  let proportion = 0;
  const step = 15 / 4;

  value = Math.abs(value);

  if (value <= 0) {
    min = SLOPE_CHART_SLOPE_EASY;
    max = SLOPE_CHART_SLOPE_EASY;
  } else if (value < step) {
    min = SLOPE_CHART_SLOPE_EASY;
    max = SLOPE_CHART_SLOPE_MEDIUM_EASY;
    proportion = value / step;
  } else if (value < 2 * step) {
    min = SLOPE_CHART_SLOPE_MEDIUM_EASY;
    max = SLOPE_CHART_SLOPE_MEDIUM;
    proportion = (value - step) / step;
  } else if (value < 3 * step) {
    min = SLOPE_CHART_SLOPE_MEDIUM;
    max = SLOPE_CHART_SLOPE_MEDIUM_HARD;
    proportion = (value - 2 * step) / step;
  } else if (value < 4 * step) {
    min = SLOPE_CHART_SLOPE_MEDIUM_HARD;
    max = SLOPE_CHART_SLOPE_HARD;
    proportion = (value - 3 * step) / step;
  } else {
    min = SLOPE_CHART_SLOPE_HARD;
    max = SLOPE_CHART_SLOPE_HARD;
    proportion = 1;
  }

  const result = ['0', '0', '0'];
  result[0] = Math.abs(Math.round(min[0] + (max[0] - min[0]) * proportion)).toString(16);
  result[1] = Math.abs(Math.round(min[1] + (max[1] - min[1]) * proportion)).toString(16);
  result[2] = Math.abs(Math.round(min[2] + (max[2] - min[2]) * proportion)).toString(16);

  return (
    '#' +
    (result[0].length < 2 ? '0' : '') +
    result[0] +
    (result[1].length < 2 ? '0' : '') +
    result[1] +
    (result[2].length < 2 ? '0' : '') +
    result[2]
  );
}

function setSurfaceValue(surface, value, locations, values) {
  const oldSurface = values?.[values.length - 1]?.surface;

  if (oldSurface === surface) {
    values[values.length - 1].values.push(value);
    if (values[values.length - 1].locations.length > 0) {
      values[values.length - 1].locations.splice(-1, 1);
    }
    values[values.length - 1].locations.push(...locations);
  } else {
    const nullElements = [];
    if (values?.[values.length - 1]?.values) {
      nullElements.length = values[values.length - 1].values.length;
      values[values.length - 1].values.push(value);
    }
    values.push({
      surface,
      values: [...nullElements, value],
      locations,
    });
  }

  return values;
}

function buildChartData(route) {
  const coordinates = getTrackCoordinates(route);
  if (!coordinates?.length) return null;

  let surfaceValues = [];
  const slopeValues = [];
  const labels = [0];
  const steps = 100;
  let trackLength = 0;
  let currentDistance = 0;
  const chartValues = [];

  let currentLocation = {
    longitude: coordinates[0][0],
    latitude: coordinates[0][1],
    altitude: coordinates[0][2] ?? 0,
  };
  chartValues.push(currentLocation);
  let maxAlt = currentLocation.altitude;
  let minAlt = currentLocation.altitude;

  let surface = SURFACE_VALUES[0];
  surfaceValues = setSurfaceValue(surface, coordinates[0][2] ?? 0, [currentLocation], surfaceValues);
  slopeValues.push([coordinates[0][2] ?? 0, 0]);

  for (let i = 1; i < coordinates.length; i++) {
    const previousLocation = currentLocation;
    currentLocation = {
      longitude: coordinates[i][0],
      latitude: coordinates[i][1],
      altitude: coordinates[i][2] ?? 0,
    };
    trackLength += getDistanceBetweenPoints(previousLocation, currentLocation);
    if (maxAlt < currentLocation.altitude) maxAlt = currentLocation.altitude;
    if (minAlt > currentLocation.altitude) minAlt = currentLocation.altitude;
  }

  let step = 1;
  let locations = [];
  currentLocation = {
    longitude: coordinates[0][0],
    latitude: coordinates[0][1],
    altitude: coordinates[0][2] ?? 0,
  };

  for (let i = 1; i < coordinates.length && step <= steps; i++) {
    locations.push(currentLocation);
    const previousLocation = currentLocation;
    currentLocation = {
      longitude: coordinates[i][0],
      latitude: coordinates[i][1],
      altitude: coordinates[i][2] ?? 0,
    };
    const localDistance = getDistanceBetweenPoints(previousLocation, currentLocation);
    currentDistance += localDistance;

    while (currentDistance >= (trackLength / steps) * step) {
      const difference = localDistance - (currentDistance - (trackLength / steps) * step);
      const deltaLongitude = currentLocation.longitude - previousLocation.longitude;
      const deltaLatitude = currentLocation.latitude - previousLocation.latitude;
      const deltaAltitude = currentLocation.altitude - previousLocation.altitude;
      const longitude =
        previousLocation.longitude + (deltaLongitude * difference) / localDistance;
      const latitude =
        previousLocation.latitude + (deltaLatitude * difference) / localDistance;
      const altitude = Math.round(
        previousLocation.altitude + (deltaAltitude * difference) / localDistance,
      );
      surface =
        SURFACE_VALUES[Math.round(step / 10) % (Object.keys(ESlopeChartSurface).length - 2)];
      const slope = parseFloat(
        (
          ((altitude - chartValues[chartValues.length - 1].altitude) * 100) /
          (trackLength / steps)
        ).toPrecision(1),
      );

      const intermediateLocation = { longitude, latitude, altitude };
      chartValues.push(intermediateLocation);
      locations.push(intermediateLocation);
      surfaceValues = setSurfaceValue(surface, altitude, locations, surfaceValues);
      locations = [intermediateLocation];
      slopeValues.push([altitude, slope]);
      labels.push(parseFloat(((step * trackLength) / (steps * 1000)).toFixed(1)));
      step++;
    }
  }

  return { labels, trackLength, maxAlt, minAlt, surfaceValues, slopeValues, chartValues };
}

function getSlopeChartSlopeDataset(slopeValues) {
  const values = slopeValues.map(value => value[0]);
  const slopes = slopeValues.map(value => value[1]);

  return [
    {
      fill: false,
      cubicInterpolationMode: 'monotone',
      tension: 0.3,
      backgroundColor: 'rgba(0, 0, 0, 0)',
      borderColor: context => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return null;
        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
        for (let i = 0; i < slopes.length; i++) {
          gradient.addColorStop(i / slopes.length, getSlopeGradientColor(slopes[i]));
        }
        return gradient;
      },
      borderWidth: 3,
      pointRadius: 0,
      pointHoverBackgroundColor: '#000000',
      pointHoverBorderColor: '#FFFFFF',
      pointHoverRadius: 6,
      pointHoverBorderWidth: 2,
      data: values,
      spanGaps: false,
    },
    {
      fill: false,
      cubicInterpolationMode: 'monotone',
      tension: 0.3,
      borderColor: 'rgba(255, 255, 255, 1)',
      borderWidth: 8,
      pointRadius: 0,
      data: values,
      spanGaps: false,
      tooltip: { enabled: false },
    },
  ];
}

function getSlopeChartSurfaceDataset(values, surface) {
  return {
    fill: true,
    cubicInterpolationMode: 'monotone',
    tension: 0.3,
    backgroundColor: `rgb(${SLOPE_CHART_SURFACE[surface].backgroundColor})`,
    borderColor: 'rgba(255, 199, 132, 0)',
    pointRadius: 0,
    data: values,
    spanGaps: false,
    tooltip: { enabled: false },
  };
}

class PanelSlopeChart {
  constructor(sectionEl) {
    this._section = sectionEl;
    this._canvas = sectionEl?.querySelector('.webmapp-slopechart-canvas');
    this._selectedContainer = sectionEl?.querySelector('.webmapp-slopechart-legend-slope-selected-container');
    this._selectedText = sectionEl?.querySelector('.webmapp-slopechart-legend-slope-selected-text');
    this._chart = null;
    this._onHover = null;
    this._labels = [];
    this._slopeValues = [];
    this._surfaceValues = [];
    this._chartValues = [];
  }

  setOnHover(fn) {
    this._onHover = fn;
  }

  destroy() {
    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }
    if (this._section) this._section.hidden = true;
    this._updateSlopeLegend(undefined);
    if (this._onHover) this._onHover(undefined);
  }

  render(track) {
    if (!this._section || !this._canvas) return;

    const geometry = getTrackGeometry(track);
    if (!is3dGeometry(geometry)) {
      this.destroy();
      return;
    }

    const data = buildChartData(track);
    if (!data) {
      this.destroy();
      return;
    }

    const { labels, trackLength, maxAlt, minAlt, surfaceValues, slopeValues, chartValues } = data;
    this._labels = labels;
    this._slopeValues = slopeValues;
    this._surfaceValues = surfaceValues;
    this._chartValues = chartValues;

    this._section.hidden = false;
    this._createChart(labels, trackLength, maxAlt, minAlt, surfaceValues, slopeValues);
  }

  _updateSlopeLegend(slopeValue) {
    if (!this._selectedContainer || !this._selectedText) return;
    if (slopeValue === undefined) {
      this._selectedContainer.hidden = true;
      return;
    }
    this._selectedContainer.hidden = false;
    this._selectedText.textContent = `${slopeValue}%`;
    const percentage = (Math.min(15, Math.max(0, Math.abs(slopeValue))) * 100) / 15;
    this._selectedContainer.style.left = `${percentage}%`;
  }

  _createChart(labels, length, maxAltitude, minAltitude, surfaceValues, slopeValues) {
    const delta = (maxAltitude - minAltitude) * 0.1;
    const surfaceDatasets = surfaceValues.map(sv =>
      getSlopeChartSurfaceDataset(sv.values, sv.surface),
    );

    if (this._chart) this._chart.destroy();

    const chartValues = this._chartValues;
    const onHover = this._onHover;

    this._chart = new Chart(this._canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [...getSlopeChartSlopeDataset(slopeValues), ...surfaceDatasets],
      },
      options: {
        events: ['mousemove', 'click', 'touchstart', 'touchmove', 'pointermove'],
        layout: { padding: { top: 40 } },
        maintainAspectRatio: false,
        hover: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            intersect: false,
            mode: 'index',
            displayColors: false,
            cornerRadius: 8,
            caretPadding: 150,
            xAlign: 'center',
            yAlign: 'bottom',
            titleMarginBottom: 0,
            filter: item => item.datasetIndex === 0,
            callbacks: {
              title(items) {
                let result = `${items[0].raw} m`;
                if (typeof slopeValues?.[items[0].dataIndex]?.[1] === 'number') {
                  result += ` / ${slopeValues[items[0].dataIndex][1]}%`;
                }
                return result;
              },
              label() {
                return null;
              },
            },
          },
        },
        scales: {
          y: {
            title: { display: false },
            max: Math.round(maxAltitude + delta),
            min: Math.round(minAltitude - delta),
            border: { display: false },
            ticks: {
              maxTicksLimit: 2,
              maxRotation: 0,
              includeBounds: true,
              z: 10,
              align: 'end',
              callback(tickValue) {
                return `${tickValue} m`;
              },
            },
            grid: {
              drawOnChartArea: true,
              drawTicks: false,
              drawBorder: false,
              color(ctx) {
                const ticks = ctx.chart.scales.y.ticks;
                return ctx.index === ticks.length - 1 ? 'transparent' : '#D2D2D2';
              },
            },
          },
          x: {
            title: { display: false },
            max: length,
            min: 0,
            ticks: {
              maxTicksLimit: 4,
              maxRotation: 0,
              includeBounds: true,
              callback(tickValue, index) {
                return `${labels[index]} km`;
              },
            },
            grid: {
              color: '#D2D2D2',
              drawOnChartArea: false,
              drawTicks: true,
              drawBorder: true,
              tickLength: 10,
            },
          },
        },
      },
      plugins: [
        {
          id: 'wmSlopeDashedTopLine',
          beforeDatasetsDraw(chart) {
            const yScale = chart.scales.y;
            const ticks = yScale?.ticks;
            if (!ticks?.length) return;
            const { ctx, chartArea } = chart;
            const y = yScale.getPixelForValue(ticks[ticks.length - 1].value);
            ctx.save();
            ctx.strokeStyle = '#D2D2D2';
            ctx.lineWidth = 1;
            ctx.setLineDash([10, 10]);
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y);
            ctx.lineTo(chartArea.right, y);
            ctx.stroke();
            ctx.restore();
          },
        },
        {
          id: 'webmappTooltipPlugin',
          beforeTooltipDraw: chart => {
            const tooltip = chart.tooltip;
            if (tooltip?._active?.length > 0) {
              const activePoint = tooltip._active[0];
              const ctx = chart.ctx;
              const x = activePoint.element.x;
              const topY = chart.scales.y.top - 15;
              const bottomY = chart.scales.y.bottom + 10;

              ctx.save();
              ctx.beginPath();
              ctx.moveTo(x, topY);
              ctx.lineTo(x, bottomY);
              ctx.lineWidth = 1;
              ctx.strokeStyle = '#000000';
              ctx.stroke();

              const dataIndex = tooltip._tooltipItems?.[0]?.dataIndex;
              if (dataIndex >= 0 && labels[dataIndex] !== undefined) {
                const distance = `${labels[dataIndex]} km`;
                const measure = ctx.measureText(distance);
                const minX = Math.max(0, Math.min(chart.width - measure.width, x - measure.width / 2));
                const minY = bottomY;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(minX - 4, minY, measure.width + 8, 20);
                ctx.fillStyle = '#000000';
                ctx.fillText(distance, minX, bottomY + 14);
              }
              ctx.restore();

              const selectedSlope = slopeValues[tooltip._tooltipItems?.[0]?.dataIndex]?.[1];
              this._updateSlopeLegend(selectedSlope);

              const index = tooltip._tooltipItems[0].dataIndex;
              let locations = [];
              let surfaceColor;

              for (const sv of surfaceValues) {
                if (sv.values[index]) {
                  locations = sv.locations;
                  const surfaceStyle = SLOPE_CHART_SURFACE[sv.surface];
                  if (surfaceStyle) surfaceColor = surfaceStyle.backgroundColor;
                  break;
                }
              }

              const location = chartValues[index];
              if (onHover && location) {
                const coordinates = locations.map(loc => [loc.longitude, loc.latitude]);
                onHover({
                  location,
                  track: coordinates.length
                    ? {
                        type: 'Feature',
                        geometry: { type: 'LineString', coordinates },
                        properties: { color: surfaceColor ? `rgb(${surfaceColor})` : undefined },
                      }
                    : undefined,
                });
              }
            } else {
              this._updateSlopeLegend(undefined);
              if (onHover) onHover(undefined);
            }
          },
        },
      ],
    });
  }
}

const TEMPLATE = `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
  @import url('https://cdn.jsdelivr.net/npm/ol@9.2.4/ol.css');
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    font-family: var(--wm-font-family, 'Montserrat', system-ui, -apple-system, sans-serif);
    --wm-color-dark: #323031;
    --wm-color-primary: #ca1551;
    --wm-color-light: #ffffff;
    --wm-color-light-rgb: 255, 255, 255;
    --wm-font-sm: 0.875rem;
    --wm-font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
    --wm-panel-width: 360px;
    --wm-control-size: 40px;
    --wm-surface-radius: 20px;
    --wm-surface-shadow: 0 2px 20px 0 rgba(0, 0, 0, 0.1);
    --ol-background-color: #ffffff;
    --ol-foreground-color: #323031;
    --ol-subtle-foreground-color: #666666;
  }
  :host([hidden]) {
    display: none;
  }
  #map-wrap {
    width: 100%;
    height: 100%;
    position: relative;
  }
  #map-wrap:fullscreen {
    width: 100%;
    height: 100%;
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
    width: var(--wm-control-size);
    height: var(--wm-control-size);
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
    border: none;
    border-radius: 50%;
    box-shadow: var(--wm-surface-shadow);
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
    height: var(--wm-control-size);
    width: var(--wm-control-size);
    margin: 0;
    padding: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
    border: none;
    border-radius: 50%;
    box-shadow: var(--wm-surface-shadow);
  }
  #map .ol-full-screen button:hover,
  #map .ol-full-screen button:focus {
    outline: none;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
  }
  #map-top-bar {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 64px;
    z-index: 2;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    pointer-events: none;
    box-sizing: border-box;
  }
  #map-top-bar > * {
    pointer-events: auto;
  }
  #app-cta-group {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 0;
    max-width: min(320px, 100%);
  }
  #app-cta-group[hidden] {
    display: none;
  }
  #app-link {
    position: static;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 1 auto;
    min-width: 0;
    max-width: 100%;
    min-height: 44px;
    padding: 6px 14px 6px 6px;
    box-sizing: border-box;
    font-family: inherit;
    color: var(--wm-color-dark);
    text-decoration: none;
    background-color: var(--wm-color-light);
    border: none;
    border-radius: var(--wm-surface-radius);
    box-shadow: var(--wm-surface-shadow);
  }
  #app-link-icon {
    width: 28px;
    height: 28px;
    flex-shrink: 0;
    border-radius: 6px;
    object-fit: cover;
  }
  #app-link-icon[hidden] {
    display: none;
  }
  .app-link-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1px;
    min-width: 0;
    line-height: 1.2;
  }
  #app-link-label {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  #app-link-subtitle {
    font-size: 11px;
    font-weight: 500;
    color: var(--ol-subtle-foreground-color, #666666);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  #app-link:hover,
  #app-link:focus {
    outline: none;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
  }
  #app-link:focus-visible {
    outline: 3px solid rgba(50, 48, 49, 0.35);
    outline-offset: 3px;
  }
  #app-link[hidden] {
    display: none;
  }
  #app-store-links {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    min-height: 40px;
  }
  #app-store-links[hidden] {
    display: none;
  }
  .store-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    border-radius: 10px;
    line-height: 0;
  }
  .store-badge-image {
    display: block;
    width: auto;
    height: 40px;
  }
  .store-badge:focus-visible {
    outline: 3px solid rgba(50, 48, 49, 0.35);
    outline-offset: 3px;
  }
  #layer-badge {
    position: static;
    display: inline-flex;
    align-items: center;
    flex: 0 1 auto;
    min-width: 0;
    width: fit-content;
    max-width: min(260px, 100%);
    margin-left: auto;
    min-height: 40px;
    padding: 6px 14px;
    box-sizing: border-box;
    font-family: inherit;
    color: var(--wm-color-dark);
    background-color: var(--wm-color-light);
    border: none;
    border-radius: var(--wm-surface-radius);
    box-shadow: var(--wm-surface-shadow);
    pointer-events: none;
  }
  #layer-badge-label {
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    line-height: 1.2;
  }
  #layer-badge[hidden] {
    display: none;
  }
  @media (max-width: 600px) {
    #map-top-bar {
      flex-direction: column;
      align-items: center;
      right: 16px;
    }
    #app-cta-group,
    #app-link,
    #layer-badge {
      max-width: calc(100% - 48px);
    }
    #app-cta-group {
      width: 100%;
      align-items: center;
    }
    #app-link,
    #layer-badge {
      align-self: center;
    }
    #app-store-links {
      justify-content: center;
    }
    #layer-badge {
      margin-left: 0;
    }
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
    width: var(--wm-panel-width);
    height: 100%;
    background: var(--wm-color-light);
    box-shadow: -2px 0 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    overflow-y: auto;
    z-index: 100;
    box-sizing: border-box;
    padding: 1px 10px 10px 10px;
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
    margin: 16px 40px 8px 0px;
    color: #111;
  }
  .panel-section.panel-section-spaced {
    margin-top: 20px;
    padding-top: 20px;
  }
  #panel-slope-section[hidden] { display: none; }
  #panel-slope-section {
    text-align: center;
    margin: 0 16px;
  }
  .webmapp-slopechart-canvas-container {
    margin: 0 auto;
    width: 100%;
    height: 180px;
  }
  .webmapp-slopechart-canvas {
    margin: 0 auto;
    width: 100% !important;
  }
  .webmapp-slopechart-legend-slope-container {
    margin: 15px 0 10px;
    width: 100%;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    padding-right: 15px;
  }
  .webmapp-slopechart-legend-slope-label {
    flex-grow: 1;
    font-size: 14px;
    color: #333;
  }
  .webmapp-slopechart-legend-slope-label::first-letter {
    text-transform: uppercase;
  }
  .webmapp-slopechart-legend-slope-bar {
    height: 4px;
    flex-grow: 10;
    background: linear-gradient(
      to right,
      rgb(67, 227, 9) 0%,
      rgb(195, 255, 0) 25%,
      rgb(255, 239, 10) 50%,
      rgb(255, 174, 0) 75%,
      rgb(196, 30, 4) 100%
    );
    overflow: visible;
    position: relative;
  }
  .webmapp-slopechart-legend-slope-selected-container {
    position: absolute;
    bottom: -5px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    transform: translateX(-50%);
    transition: left 500ms;
  }
  .webmapp-slopechart-legend-slope-selected-container[hidden] {
    display: none;
  }
  .webmapp-slopechart-legend-slope-selected-text {
    font-size: 12px;
    color: #333;
    margin-bottom: 2px;
  }
  .webmapp-slopechart-legend-slope-selected-dot {
    width: 14px;
    height: 14px;
    border-radius: 10px;
    border: 2px solid #fff;
    background: #000;
  }
  .section-title {
    font-size: 14px;
    font-weight: 700;
    color: #111;
  }
  .panel-section-details .detail-row:last-child {
    border-bottom: none;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    color: var(--wm-color-primary);
  }
  .detail-icon-svg {
    width: 18px;
    height: 18px;
    display: block;
  }
  .detail-value {
    color: #555;
    font-size: 13px;
  }
  #panel-gallery-section[hidden] { display: none; }
  #panel-gallery-section .section-title {
    margin-bottom: 10px;
  }
  .panel-gallery-wrap {
    position: relative;
    margin: 0;
  }
  .panel-gallery {
    display: flex;
    gap: 12px;
    padding: 10px 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .panel-gallery::-webkit-scrollbar { display: none; }
  .panel-gallery.single {
    overflow-x: hidden;
  }
  .panel-gallery-slide {
    flex: 0 0 auto;
    width: 250px;
    scroll-snap-align: start;
  }
  .panel-gallery.single .panel-gallery-slide {
    width: 100%;
  }
  .panel-gallery-slide img {
    width: 100%;
    height: 150px;
    object-fit: cover;
    display: block;
    border-radius: 15px;
    cursor: pointer;
  }
  .wm-ion-icon {
    width: 24px;
    height: 24px;
    display: block;
  }
  .panel-gallery-nav {
    display: none;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 2;
    width: 45px;
    height: 45px;
    border: none;
    border-radius: 50%;
    background: #f0f0f0;
    color: #000;
    cursor: pointer;
    padding: 0;
  }
  .panel-gallery-nav:hover { background: #e4e4e4; }
  .panel-gallery-nav.left { left: 15px; }
  .panel-gallery-nav.right { right: 15px; }
  @media (min-width: 601px) {
    .panel-gallery-nav:not([hidden]) {
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
  .panel-lightbox {
    position: absolute;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.92);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .panel-lightbox[hidden] { display: none; }
  #panel-lightbox-img {
    max-width: calc(100% - 120px);
    max-height: calc(100% - 48px);
    object-fit: contain;
    pointer-events: none;
    position: relative;
    z-index: 1;
  }
  #panel-lightbox-close {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: #fff;
    font-size: 20px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 4px;
    line-height: 1;
  }
  .panel-lightbox-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3;
    background: rgba(255, 255, 255, 0.15);
    border: none;
    color: #fff;
    cursor: pointer;
    padding: 12px 16px;
    line-height: 1;
  }
  .panel-lightbox-nav .wm-ion-icon {
    width: 28px;
    height: 28px;
  }
  .panel-lightbox-nav.prev { left: 8px; }
  .panel-lightbox-nav.next { right: 8px; }
  .panel-lightbox-nav[hidden] { display: none; }
  .panel-lightbox-counter {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    color: #fff;
    font-size: 14px;
    pointer-events: none;
  }
  #panel-description {
    font-size: 13px;
    line-height: 1.6;
    color: #444;
    margin-top: 10px;
    white-space: pre-line;
  }
  .panel-section-description {
    padding-bottom: 24px;
  }
  @media (max-width: 600px) {
    #panel { width: 100%; }
  }
</style>
<div id="map-wrap" part="map-wrap">
  <div id="map-top-bar" part="top-bar">
    <div id="app-cta-group" hidden>
      <a id="app-link" part="app-link" hidden target="_blank" rel="noopener noreferrer">
        <img id="app-link-icon" alt="" hidden>
        <span class="app-link-text">
          <span id="app-link-label"></span>
          <span id="app-link-subtitle"></span>
        </span>
      </a>
      <div id="app-store-links" part="store-links" hidden role="group" aria-label="Scarica l'app dagli store"></div>
    </div>
    <div id="layer-badge" part="layer-badge" hidden>
      <span id="layer-badge-label"></span>
    </div>
  </div>
  <div id="map" part="map"></div>
  <div id="webmapp-map-attribution-container" part="attribution" hidden>
    <div class="webmapp-map-attribution" id="attribution-content"></div>
  </div>
  <div id="panel" part="panel">
  <button id="panel-close" part="panel-close">✕</button>
  <div id="panel-title" part="panel-title"></div>
  <div id="panel-slope-section" class="panel-section" hidden>
    <div class="webmapp-slopechart-canvas-container">
      <canvas class="webmapp-slopechart-canvas"></canvas>
    </div>
    <div class="webmapp-slopechart-legend-container">
      <div class="webmapp-slopechart-legend-slope-container">
        <div class="webmapp-slopechart-legend-slope-label">Pendenza</div>
        <div class="webmapp-slopechart-legend-slope-bar">
          <div class="webmapp-slopechart-legend-slope-selected-container" hidden>
            <div class="webmapp-slopechart-legend-slope-selected-text"></div>
            <div class="webmapp-slopechart-legend-slope-selected-dot"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div class="panel-section panel-section-details">
  <div class="section-title">Dettagli tecnici</div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon" aria-hidden="true"><svg class="detail-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.6"/></svg></span>Partenza</span>
    <span class="detail-value" id="detail-from"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon" aria-hidden="true"><svg class="detail-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3v18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M5 4h11l-2.5 3.2L16 11H5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Arrivo</span>
    <span class="detail-value" id="detail-to"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon" aria-hidden="true"><svg class="detail-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 9v6M20 9v6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 12h10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M7 12 5 10M7 12 5 14M17 12l2-2M17 12l2 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Distanza</span>
    <span class="detail-value" id="detail-distance"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon" aria-hidden="true"><svg class="detail-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 16 8 12l4 2 4-6 4-2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 8l2-2v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Dislivello positivo</span>
    <span class="detail-value" id="detail-ascent"></span>
  </div>
  <div class="detail-row">
    <span class="detail-label"><span class="detail-icon" aria-hidden="true"><svg class="detail-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8 8 12l4-2 4 6 4 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 16l2 2v-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>Dislivello negativo</span>
    <span class="detail-value" id="detail-descent"></span>
  </div>
  </div>
  <div id="panel-gallery-section" class="panel-section" hidden>
    <div class="section-title">Galleria</div>
    <div class="panel-gallery-wrap">
      <button type="button" class="panel-gallery-nav left" hidden aria-label="Immagine precedente">
        <svg class="wm-ion-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/></svg>
      </button>
      <div id="panel-gallery" class="panel-gallery"></div>
      <button type="button" class="panel-gallery-nav right" hidden aria-label="Immagine successiva">
        <svg class="wm-ion-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M268 112l144 144-144 144M392 256H100"/></svg>
      </button>
    </div>
  </div>
  <div class="panel-section panel-section-description">
  <div class="section-title">Descrizione</div>
  <div id="panel-description"></div>
  </div>
  </div>
  <div id="panel-lightbox" class="panel-lightbox" hidden>
    <button type="button" id="panel-lightbox-close" aria-label="Chiudi">✕</button>
    <button type="button" class="panel-lightbox-nav prev" hidden aria-label="Immagine precedente">
      <svg class="wm-ion-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M244 400L100 256l144-144M120 256h292"/></svg>
    </button>
    <img id="panel-lightbox-img" src="" alt="">
    <button type="button" class="panel-lightbox-nav next" hidden aria-label="Immagine successiva">
      <svg class="wm-ion-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="48" d="M268 112l144 144-144 144M392 256H100"/></svg>
    </button>
    <span id="panel-lightbox-counter" class="panel-lightbox-counter" hidden></span>
  </div>
</div>
`;

const TILE_URL = 'https://api.webmapp.it/tiles/{z}/{x}/{y}.png';
const WEBMAPP_URL = 'https://webmapp.it/';
const BRAND_APP_ICON_FALLBACK_SRC = new URL(
  '../assets/branding/default-icon-fallback.png',
  import.meta.url,
).href;
const APP_STORE_BADGE_SRC = new URL(
  '../assets/store-badges/app-store-badge-en.png',
  import.meta.url,
).href;
const GOOGLE_PLAY_BADGE_SRC = new URL(
  '../assets/store-badges/google-play-badge-en.png',
  import.meta.url,
).href;

const WEBAPP_URL_BY_SHARD = {
  camminiditalia: (appId) => `https://${appId}.camminiditalia.webmapp.it/`,
  geohub: (appId) => `https://${appId}.app.geohub.webmapp.it/`,
  maphub: (appId) => `https://${appId}.maphub.it/`,
  osm2cai: (appId) => `https://${appId}.osm2cai.cai.it/`,
};
const APP_API_ORIGIN_BY_SHARD = {
  camminiditalia: 'https://camminiditalia.maphub.it',
  geohub: 'https://geohub.webmapp.it',
  maphub: 'https://maphub.it',
  osm2cai: 'https://osm2cai.cai.it',
};
const CONFIG_ATTRIBUTES = ['shard', 'app-id', 'layer-id'];
const CTA_ATTRIBUTES = [
  'cta-label',
  'cta-url',
  'app-icon-url',
  'ios-store-url',
  'android-store-url',
  'hide-cta',
];
const OBSERVED_ATTRIBUTES = [...CONFIG_ATTRIBUTES, ...CTA_ATTRIBUTES];

function getAppIconUrl(shard, appId) {
  const origin = APP_API_ORIGIN_BY_SHARD[shard];
  if (!origin) return null;
  return `${origin}/api/app/webmapp/${appId}/resources/icon.png`;
}

function getTrimmedStringValue(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function getMobilePlatform() {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  return null;
}

function getWebappUrl(shard, appId, layerId = null) {
  const build = WEBAPP_URL_BY_SHARD[shard];
  if (!build) return null;
  const url = build(appId);
  if (layerId == null || layerId === '' || Number.isNaN(Number(layerId))) return url;
  return `${url}?layer=${layerId}`;
}

function getStoreUrl(platform, app) {
  const url = platform === 'android' ? app?.androidStore : platform === 'ios' ? app?.iosStore : null;
  const trimmed = typeof url === 'string' ? url.trim() : '';
  return trimmed || null;
}

function getAppLinkSubtitle() {
  return 'Apri la web app';
}

function getAppLinkAriaLabel(name) {
  return `Apri la web app ${name}`;
}

function getStoreBadges(app, appName) {
  const platform = getMobilePlatform();
  const badges = [];
  const iosStore = getStoreUrl('ios', app);
  const androidStore = getStoreUrl('android', app);

  if (iosStore && (!platform || platform === 'ios')) {
    badges.push({
      href: iosStore,
      src: APP_STORE_BADGE_SRC,
      alt: 'Scarica su App Store',
      ariaLabel: `Scarica ${appName} su App Store`,
    });
  }

  if (androidStore && (!platform || platform === 'android')) {
    badges.push({
      href: androidStore,
      src: GOOGLE_PLAY_BADGE_SRC,
      alt: 'Scarica su Google Play',
      ariaLabel: `Scarica ${appName} su Google Play`,
    });
  }

  return badges;
}
const OSM_ABOUT_URL = 'https://www.openstreetmap.org/about/';
const DEF_LINE_COLOR = 'red';
const TRACK_HIGHLIGHT_COLOR = '#CA1551';
const TRACK_SELECT_COLOR = '#caaf15';
const SELECT_STROKE_WIDTH = 6;
const TRACK_ZINDEX = 490;
const DEF_MAP_MIN_ZOOM = 1;
const DEF_MAP_MAX_ZOOM = 16;
const DEF_MAP_ZOOM = 10;
const LAYER_EXTENT_BUFFER_RATIO = 0.12;
const LAYER_EXTRA_ZOOM_OUT_LEVELS = 1;

function expandLayerExtent(extent, ratio = LAYER_EXTENT_BUFFER_RATIO) {
  const width = extent[2] - extent[0];
  const height = extent[3] - extent[1];
  const pad = Math.max(width, height) * ratio;
  return bufferExtent(extent, pad);
}

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

function getThemePrimaryColor(config) {
  return config?.THEME?.primary ?? null;
}

function getGalleryImageUrl(image) {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url ?? image.sizes?.['400x200'] ?? '';
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
  static observedAttributes = OBSERVED_ATTRIBUTES;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._config = null;
    this._renderToken = 0;
    this._galleryImages = [];
    this._lightboxIndex = 0;
    this._uiBound = false;
    this._selectedId = null;
    this._hoveredId = null;
    this._maxTappaNumber = null;
    this._slopeChart = new PanelSlopeChart(this.shadowRoot.getElementById('panel-slope-section'));
    this._slopeChart.setOnHover(elements => this._onSlopeChartHover(elements));
  }

  get shard() {
    return this.getAttribute('shard') ?? '';
  }

  set shard(value) {
    this._setStringAttribute('shard', value);
  }

  get appId() {
    return this.getAttribute('app-id') ?? '';
  }

  set appId(value) {
    this._setStringAttribute('app-id', value);
  }

  get layerId() {
    const rawValue = getTrimmedStringValue(this.getAttribute('layer-id'));
    if (rawValue == null) return null;
    const value = Number(rawValue);
    return Number.isNaN(value) ? null : value;
  }

  set layerId(value) {
    if (value == null || value === '') {
      this.removeAttribute('layer-id');
      return;
    }
    this.setAttribute('layer-id', String(value));
  }

  get ctaLabel() {
    return getTrimmedStringValue(this.getAttribute('cta-label'));
  }

  set ctaLabel(value) {
    this._setStringAttribute('cta-label', value);
  }

  get ctaUrl() {
    return getTrimmedStringValue(this.getAttribute('cta-url'));
  }

  set ctaUrl(value) {
    this._setStringAttribute('cta-url', value);
  }

  get appIconUrl() {
    return getTrimmedStringValue(this.getAttribute('app-icon-url'));
  }

  set appIconUrl(value) {
    this._setStringAttribute('app-icon-url', value);
  }

  get iosStoreUrl() {
    return getTrimmedStringValue(this.getAttribute('ios-store-url'));
  }

  set iosStoreUrl(value) {
    this._setStringAttribute('ios-store-url', value);
  }

  get androidStoreUrl() {
    return getTrimmedStringValue(this.getAttribute('android-store-url'));
  }

  set androidStoreUrl(value) {
    this._setStringAttribute('android-store-url', value);
  }

  get hideCta() {
    return this.hasAttribute('hide-cta');
  }

  set hideCta(value) {
    this.toggleAttribute('hide-cta', Boolean(value));
  }

  connectedCallback() {
    this._bindUiEvents();
    this._upgradeProperty('shard');
    this._upgradeProperty('appId');
    this._upgradeProperty('layerId');
    this._upgradeProperty('ctaLabel');
    this._upgradeProperty('ctaUrl');
    this._upgradeProperty('appIconUrl');
    this._upgradeProperty('iosStoreUrl');
    this._upgradeProperty('androidStoreUrl');
    this._upgradeProperty('hideCta');
    this.refresh();
  }

  disconnectedCallback() {
    this._slopeChart?.destroy();
    this._teardownMap();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    if (CONFIG_ATTRIBUTES.includes(name)) {
      this.refresh();
      return;
    }
    this._renderAuxiliaryUi();
  }

  refresh() {
    this._render();
  }

  closePanel() {
    const panel = this.shadowRoot.getElementById('panel');
    panel?.classList.remove('open');
    this._closeLightbox();
    this._slopeChart?.destroy();
    this._clearSlopeHoverMarker();
    this._selectedId = null;
    if (this._pbfLayer) this._pbfLayer.changed();
  }

  _setStringAttribute(name, value) {
    const normalized = value == null ? null : String(value);
    if (normalized == null || normalized.trim() === '') {
      this.removeAttribute(name);
      return;
    }
    this.setAttribute(name, normalized);
  }

  _upgradeProperty(prop) {
    if (!Object.prototype.hasOwnProperty.call(this, prop)) return;
    const value = this[prop];
    delete this[prop];
    this[prop] = value;
  }

  _bindUiEvents() {
    if (this._uiBound) return;
    this._uiBound = true;
    const sr = this.shadowRoot;

    sr.getElementById('panel-close')?.addEventListener('click', () => this.closePanel());
    sr.querySelector('.panel-gallery-nav.left')?.addEventListener('click', () => this._scrollGallery(-1));
    sr.querySelector('.panel-gallery-nav.right')?.addEventListener('click', () => this._scrollGallery(1));
    sr.getElementById('panel-lightbox')?.addEventListener('click', (evt) => {
      if (evt.target.closest('#panel-lightbox-close')) {
        evt.preventDefault();
        this._closeLightbox();
        return;
      }
      if (evt.target.closest('.panel-lightbox-nav.prev')) {
        evt.preventDefault();
        this._lightboxStep(-1);
        return;
      }
      if (evt.target.closest('.panel-lightbox-nav.next')) {
        evt.preventDefault();
        this._lightboxStep(1);
        return;
      }
      if (evt.target.id === 'panel-lightbox') this._closeLightbox();
    });
  }

  async _render() {
    const shard = this.shard;
    const appId = this.appId;
    const layerId = this.layerId;
    const renderToken = ++this._renderToken;

    this._teardownMap();
    this._resetUi();

    if (!shard || !appId || layerId == null) {
      this._handleError(
        'config',
        new Error('Gli attributi `shard`, `app-id` e `layer-id` sono obbligatori.'),
        { shard, appId, layerId },
      );
      return;
    }

    await this._init({ renderToken, shard, appId, layerId });
  }

  _resetUi() {
    const sr = this.shadowRoot;
    this._config = null;
    this._galleryImages = [];
    this._lightboxIndex = 0;
    this._selectedId = null;
    this._hoveredId = null;
    this._maxTappaNumber = null;
    sr.getElementById('app-link-label').textContent = '';
    sr.getElementById('app-link-subtitle').textContent = '';
    sr.getElementById('app-link').hidden = true;
    sr.getElementById('app-link-icon').hidden = true;
    sr.getElementById('app-store-links').replaceChildren();
    sr.getElementById('app-store-links').hidden = true;
    sr.getElementById('app-cta-group').hidden = true;
    sr.getElementById('layer-badge-label').textContent = '';
    sr.getElementById('layer-badge').hidden = true;
    sr.getElementById('attribution-content').replaceChildren();
    sr.getElementById('webmapp-map-attribution-container').hidden = true;
    sr.getElementById('panel-title').textContent = '';
    sr.getElementById('panel-description').textContent = '';
    sr.getElementById('detail-from').textContent = '';
    sr.getElementById('detail-to').textContent = '';
    sr.getElementById('detail-distance').textContent = '';
    sr.getElementById('detail-ascent').textContent = '';
    sr.getElementById('detail-descent').textContent = '';
    sr.getElementById('panel-gallery').replaceChildren();
    sr.getElementById('panel-gallery-section').hidden = true;
    this.closePanel();
  }

  _teardownMap() {
    this._hoverSource?.clear();
    this._hoverSource = null;
    this._hoverLayer = null;
    this._pbfLayer = null;
    if (this._map) {
      this._map.setTarget(null);
      this._map = null;
    }
  }

  _getLocale() {
    const hostLang = getTrimmedStringValue(this.getAttribute('lang'));
    if (hostLang) return hostLang;
    const documentLang = getTrimmedStringValue(document.documentElement.lang);
    return documentLang ?? 'it';
  }

  _emitComponentEvent(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  _handleError(stage, error, extra = {}) {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    console.error(`wm-layer-map: ${stage}`, normalizedError);
    this._emitComponentEvent('error', {
      stage,
      message: normalizedError.message,
      error: normalizedError,
      ...extra,
    });
  }

  _renderAuxiliaryUi() {
    if (!this._config) {
      this._updateAppCtaGroupVisibility();
      return;
    }
    this._setupAppLink(this._config, this.shard, this.appId, this.layerId);
    this._setupStoreBadges(this._config);
  }

  _applyTheme(config) {
    const primary = getThemePrimaryColor(config);
    if (primary) {
      this.style.setProperty('--wm-color-primary', primary);
      return;
    }
    this.style.removeProperty('--wm-color-primary');
  }

  _updateAppCtaGroupVisibility() {
    const group = this.shadowRoot.getElementById('app-cta-group');
    const link = this.shadowRoot.getElementById('app-link');
    const storeLinks = this.shadowRoot.getElementById('app-store-links');
    if (!group || !link || !storeLinks) return;
    group.hidden = link.hidden && storeLinks.hidden;
  }

  _setupAppLink(config, shard, appId, layerId) {
    const link = this.shadowRoot.getElementById('app-link');
    const label = this.shadowRoot.getElementById('app-link-label');
    const subtitle = this.shadowRoot.getElementById('app-link-subtitle');
    const icon = this.shadowRoot.getElementById('app-link-icon');
    const name = this.ctaLabel ?? localizedLabel(config?.APP?.name, this._getLocale()) ?? 'Webmapp';
    const url = this.ctaUrl ?? getWebappUrl(shard, appId, layerId);
    const iconUrl = this.appIconUrl ?? getAppIconUrl(shard, appId);

    if (this.hideCta) {
      link.hidden = true;
      icon.hidden = true;
      this._updateAppCtaGroupVisibility();
      return;
    }

    if (!name || !url) {
      link.hidden = true;
      icon.hidden = true;
      this._updateAppCtaGroupVisibility();
      return;
    }

    label.textContent = name;
    subtitle.textContent = getAppLinkSubtitle();
    link.href = url;
    link.setAttribute('aria-label', getAppLinkAriaLabel(name));
    link.title = getAppLinkAriaLabel(name);
    icon.alt = '';
    icon.setAttribute('aria-hidden', 'true');
    if (!iconUrl) {
      icon.hidden = true;
      icon.removeAttribute('src');
    } else {
      icon.dataset.fallbackApplied = 'false';
      icon.onerror = () => {
        if (icon.dataset.fallbackApplied !== 'true') {
          icon.dataset.fallbackApplied = 'true';
          icon.src = BRAND_APP_ICON_FALLBACK_SRC;
          return;
        }
        icon.hidden = true;
      };
      icon.src = iconUrl;
      icon.hidden = false;
    }
    link.hidden = false;
    this._updateAppCtaGroupVisibility();
  }

  _setupStoreBadges(config) {
    const app = {
      ...config?.APP,
      iosStore: this.iosStoreUrl ?? config?.APP?.iosStore,
      androidStore: this.androidStoreUrl ?? config?.APP?.androidStore,
    };
    const container = this.shadowRoot.getElementById('app-store-links');
    if (!container) return;

    if (this.hideCta) {
      container.replaceChildren();
      container.hidden = true;
      this._updateAppCtaGroupVisibility();
      return;
    }

    const appName = this.ctaLabel ?? localizedLabel(app?.name, this._getLocale()) ?? "l'app";
    const badges = getStoreBadges(app, appName);

    if (!badges.length) {
      container.replaceChildren();
      container.hidden = true;
      this._updateAppCtaGroupVisibility();
      return;
    }

    container.replaceChildren(...badges.map((badge) => {
      const link = document.createElement('a');
      link.className = 'store-badge';
      link.href = badge.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', badge.ariaLabel);
      link.title = badge.ariaLabel;

      const img = document.createElement('img');
      img.className = 'store-badge-image';
      img.src = badge.src;
      img.alt = badge.alt;
      img.loading = 'lazy';
      img.decoding = 'async';

      img.onerror = () => {
        if (badge.fallbackSrc && badge.fallbackSrc !== badge.src && img.dataset.fallbackApplied !== 'true') {
          img.dataset.fallbackApplied = 'true';
          img.src = badge.fallbackSrc;
          return;
        }
        link.remove();
        this._updateAppCtaGroupVisibility();
      };

      link.appendChild(img);
      return link;
    }));
    container.setAttribute(
      'aria-label',
      badges.length === 1 ? 'Scarica l\'app dallo store disponibile' : 'Scarica l\'app dagli store',
    );
    container.hidden = false;
    this._updateAppCtaGroupVisibility();
  }

  _setupLayerBadge(layer) {
    const badge = this.shadowRoot.getElementById('layer-badge');
    const label = this.shadowRoot.getElementById('layer-badge-label');
    const name = localizedLabel(layer?.title ?? layer?.name, this._getLocale());
    if (!name) {
      badge.hidden = true;
      label.textContent = '';
      return;
    }

    label.textContent = name;
    badge.hidden = false;
  }

  async _init({ renderToken, shard, appId, layerId }) {
    const configUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/config.json`;
    let configResponse;
    try {
      configResponse = await fetch(configUrl);
    } catch (error) {
      this._handleError('config', error, { shard, appId, layerId, url: configUrl });
      return;
    }
    if (!configResponse.ok) {
      this._handleError(
        'config',
        new Error(`Impossibile caricare ${configUrl} (${configResponse.status})`),
        { shard, appId, layerId, url: configUrl },
      );
      return;
    }
    const config = await configResponse.json();
    if (renderToken !== this._renderToken) return;
    this._config = config;
    this._applyTheme(config);
    this._setupAppLink(config, shard, appId, layerId);
    this._setupStoreBadges(config);
    const mapConfig = config.MAP ?? config;
    const layer = (mapConfig.layers ?? []).find(l => l.id === layerId);
    if (!layer) {
      this._handleError(
        'layer',
        new Error(`Layer id ${layerId} non trovato in ${configUrl}`),
        { shard, appId, layerId, url: configUrl },
      );
      return;
    }

    this._setupLayerBadge(layer);

    const extent3857 = transformExtent(layer.bbox, 'EPSG:4326', 'EPSG:3857');
    const constrainExtent3857 = expandLayerExtent(extent3857);
    const zoomConfig = getMapZoomConfig(mapConfig);

    const mapEl = this.shadowRoot.getElementById('map');
    const mapWrap = this.shadowRoot.getElementById('map-wrap');
    this._setupAttribution(mapConfig);

    const controls = defaultControls({ attribution: false, rotate: false }).extend([
      new FullScreen({ source: mapWrap }),
    ]);

    this._hoverSource = new VectorSource();
    this._hoverLayer = new VectorLayer({
      source: this._hoverSource,
      zIndex: TRACK_ZINDEX + 10,
      style: new Style({
        image: new CircleStyle({
          radius: 6,
          fill: new Fill({ color: '#000000' }),
          stroke: new Stroke({ color: '#ffffff', width: 2 }),
        }),
      }),
    });

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
        extent: constrainExtent3857,
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
              styles.push(
                ...buildRefStyles(
                  lineString,
                  this._map,
                  getTrackStrokeColor(layer, feature),
                ),
              );
            } catch (_) {}
          }
        }

        return styles;
      },
    });

    this._map.addLayer(this._pbfLayer);
    this._map.addLayer(this._hoverLayer);
    const view = this._map.getView();
    view.fit(extent3857, {
      padding: [40, 40, 40, 40],
      maxZoom: zoomConfig.maxZoom,
    });
    const fittedZoom = view.getZoom();
    if (fittedZoom != null) {
      view.setMinZoom(
        Math.max(zoomConfig.minZoom, fittedZoom - LAYER_EXTRA_ZOOM_OUT_LEVELS),
      );
    }

    this._emitComponentEvent('ready', {
      shard,
      appId,
      layerId,
      layer: {
        id: layer.id,
        name: localizedLabel(layer?.title ?? layer?.name, this._getLocale()),
      },
    });

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
      let trackResponse;
      try {
        trackResponse = await fetch(trackUrl);
      } catch (error) {
        this._handleError('track', error, { shard, appId, layerId, trackId, url: trackUrl });
        return;
      }
      if (!trackResponse.ok) {
        this._handleError(
          'track',
          new Error(`Impossibile caricare ${trackUrl} (${trackResponse.status})`),
          { shard, appId, layerId, trackId, url: trackUrl },
        );
        return;
      }
      const track = await trackResponse.json();
      this._openPanel(track);
      this._emitComponentEvent('track-selected', {
        shard,
        appId,
        layerId,
        trackId,
        track,
      });
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

  _onSlopeChartHover(elements) {
    this._clearSlopeHoverMarker();
    if (!elements?.location || !this._hoverSource) return;
    const { longitude, latitude } = elements.location;
    this._hoverSource.addFeature(
      new Feature({ geometry: new Point(fromLonLat([longitude, latitude])) }),
    );
  }

  _clearSlopeHoverMarker() {
    this._hoverSource?.clear();
  }

  _syncPanelSectionSpacing() {
    const sections = Array.from(this.shadowRoot.querySelectorAll('#panel > .panel-section'));
    let seenVisible = false;
    for (const section of sections) {
      const visible = !section.hidden;
      section.classList.toggle('panel-section-spaced', visible && seenVisible);
      if (visible) seenVisible = true;
    }
  }

  _openPanel(track) {
    const sr = this.shadowRoot;
    const props = track?.properties ?? track;
    const locale = this._getLocale();

    sr.getElementById('panel-title').textContent = localizedLabel(props.name, locale);
    this._clearSlopeHoverMarker();
    this._slopeChart?.render(track);
    sr.getElementById('detail-from').textContent = props.from ?? '';
    sr.getElementById('detail-to').textContent = props.to ?? '';
    sr.getElementById('detail-distance').textContent = props.distance ? `${props.distance} km` : '';
    sr.getElementById('detail-ascent').textContent = props.ascent ? `${props.ascent} m` : '';
    sr.getElementById('detail-descent').textContent = props.descent ? `${props.descent} m` : '';

    this._renderGallery(props.image_gallery);

    sr.getElementById('panel-description').textContent = localizedLabel(props.description, locale);

    this._syncPanelSectionSpacing();
    sr.getElementById('panel').classList.add('open');
  }

  _renderGallery(images) {
    const sr = this.shadowRoot;
    const section = sr.getElementById('panel-gallery-section');
    const gallery = sr.getElementById('panel-gallery');
    const navLeft = sr.querySelector('.panel-gallery-nav.left');
    const navRight = sr.querySelector('.panel-gallery-nav.right');
    const list = Array.isArray(images) ? images.filter(img => getGalleryImageUrl(img)) : [];

    this._galleryImages = list;
    this._closeLightbox();

    if (!list.length) {
      section.hidden = true;
      gallery.replaceChildren();
      navLeft.hidden = true;
      navRight.hidden = true;
      this._syncPanelSectionSpacing();
      return;
    }

    section.hidden = false;
    const single = list.length === 1;
    gallery.className = single ? 'panel-gallery single' : 'panel-gallery';
    gallery.replaceChildren(...list.map((image, idx) => {
      const slide = document.createElement('div');
      slide.className = 'panel-gallery-slide';
      const img = document.createElement('img');
      img.src = getGalleryImageUrl(image);
      img.alt = localizedLabel(image?.name) || localizedLabel(image?.caption) || '';
      img.loading = 'lazy';
      img.addEventListener('click', () => this._openLightbox(idx));
      slide.appendChild(img);
      return slide;
    }));

    const showNav = !single && window.matchMedia('(min-width: 601px)').matches;
    navLeft.hidden = !showNav;
    navRight.hidden = !showNav;
    this._syncPanelSectionSpacing();
  }

  _scrollGallery(direction) {
    const gallery = this.shadowRoot.getElementById('panel-gallery');
    const slide = gallery?.querySelector('.panel-gallery-slide');
    if (!slide) return;
    gallery.scrollBy({ left: direction * (slide.offsetWidth + 12), behavior: 'smooth' });
  }

  _openLightbox(index) {
    const images = this._galleryImages;
    if (!images?.length || index < 0 || index >= images.length) return;

    this._lightboxIndex = index;
    const sr = this.shadowRoot;
    const lightbox = sr.getElementById('panel-lightbox');
    const img = sr.getElementById('panel-lightbox-img');
    const counter = sr.getElementById('panel-lightbox-counter');
    const image = images[index];
    const multi = images.length > 1;

    const url = getGalleryImageUrl(image);
    img.alt = localizedLabel(image?.name) || localizedLabel(image?.caption) || '';
    if (img.src !== url) {
      img.src = url;
    } else {
      img.removeAttribute('src');
      img.src = url;
    }

    sr.querySelector('.panel-lightbox-nav.prev').hidden = !multi;
    sr.querySelector('.panel-lightbox-nav.next').hidden = !multi;
    counter.hidden = !multi;
    counter.textContent = `${index + 1} di ${images.length}`;
    lightbox.hidden = false;
  }

  _closeLightbox() {
    const lightbox = this.shadowRoot.getElementById('panel-lightbox');
    if (lightbox) lightbox.hidden = true;
  }

  _lightboxStep(delta) {
    const n = this._galleryImages?.length ?? 0;
    if (n <= 1) return;
    const current = Number(this._lightboxIndex) || 0;
    const next = (current + delta + n) % n;
    this._openLightbox(next);
  }
}

if (!customElements.get('wm-layer-map')) {
  customElements.define('wm-layer-map', WmLayerMap);
}

export { WmLayerMap };
