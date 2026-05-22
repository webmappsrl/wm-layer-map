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
import CircleStyle from 'https://esm.sh/ol/style/Circle';
import Feature from 'https://esm.sh/ol/Feature';
import VectorLayer from 'https://esm.sh/ol/layer/Vector';
import VectorSource from 'https://esm.sh/ol/source/Vector';
import { fromLonLat } from 'https://esm.sh/ol/proj';
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
    font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
    --wm-color-dark: #323031;
    --wm-color-primary: #ca1551;
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
  .panel-section:not([hidden]) + .panel-section:not([hidden]) {
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
<div id="map-wrap">
  <div id="map"></div>
  <div id="webmapp-map-attribution-container" hidden>
    <div class="webmapp-map-attribution" id="attribution-content"></div>
  </div>
</div>
<div id="panel">
  <button id="panel-close">✕</button>
  <div id="panel-title"></div>
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
  connectedCallback() {
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.innerHTML = TEMPLATE;
    this._init();
    const sr = this.shadowRoot;
    this._slopeChart = new PanelSlopeChart(sr.getElementById('panel-slope-section'));
    this._slopeChart.setOnHover(elements => this._onSlopeChartHover(elements));

    sr.getElementById('panel-close').addEventListener('click', () => {
      sr.getElementById('panel').classList.remove('open');
      this._closeLightbox();
      this._slopeChart?.destroy();
      this._clearSlopeHoverMarker();
      this._selectedId = null;
      if (this._pbfLayer) this._pbfLayer.changed();
    });
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

  _applyTheme(config) {
    const primary = getThemePrimaryColor(config);
    if (primary) this.style.setProperty('--wm-color-primary', primary);
  }

  async _init() {
    const shard = this.getAttribute('shard');
    const appId = this.getAttribute('app-id');
    const layerId = Number(this.getAttribute('layer-id'));

    const configUrl = `https://wmfe.s3.eu-central-1.amazonaws.com/${shard}/${appId}/config.json`;
    const config = await fetch(configUrl).then(r => r.json());
    this._applyTheme(config);
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
      this._openPanel(track);
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

  _openPanel(track) {
    const sr = this.shadowRoot;
    const props = track?.properties ?? track;

    sr.getElementById('panel-title').textContent = props.name?.it ?? '';
    this._clearSlopeHoverMarker();
    this._slopeChart?.render(track);
    sr.getElementById('detail-from').textContent = props.from ?? '';
    sr.getElementById('detail-to').textContent = props.to ?? '';
    sr.getElementById('detail-distance').textContent = props.distance ? `${props.distance} km` : '';
    sr.getElementById('detail-ascent').textContent = props.ascent ? `${props.ascent} m` : '';
    sr.getElementById('detail-descent').textContent = props.descent ? `${props.descent} m` : '';

    this._renderGallery(props.image_gallery);

    sr.getElementById('panel-description').textContent = props.description?.it ?? '';

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

customElements.define('wm-layer-map', WmLayerMap);
