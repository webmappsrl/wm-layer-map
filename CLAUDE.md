# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`wm-layer-map` è un Web Component vanilla (no bundler, no framework) che visualizza tracce GPS di un layer su una mappa OpenLayers. Le dipendenze OL vengono importate direttamente da `esm.sh` come ES modules.

## Come testare

Non c'è build step né test runner. Per sviluppare, apri `test/index.html` in un browser con un server locale:

```bash
npx serve .
# oppure
python3 -m http.server
```

Poi visita `http://localhost:PORT/test/index.html`.

## Architettura

Il componente è interamente in `src/wm-layer-map.js` — un singolo file, nessuna dipendenza locale.

**Flusso di inizializzazione:**
1. `connectedCallback` attacca un Shadow DOM e chiama `_init()`
2. `_init()` legge gli attributi `shard`, `app-id`, `layer-id` e scarica `config.json` da S3 (`https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/{appId}/config.json`)
3. Trova il layer in `config.MAP.layers` tramite `layer-id`, usa il suo `bbox` per centrare la mappa
4. Carica i tile vettoriali PBF da `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/{appId}/pbf/{z}/{x}/{y}.pbf`
5. Al click su una traccia, scarica i dettagli da `https://wmfe.s3.eu-central-1.amazonaws.com/{shard}/tracks/{trackId}.json` e apre il pannello laterale

**Pannello dettagli:**
- Slide-in da destra, larghezza 360px (100% su mobile)
- Popola: titolo, from/to, distanza, dislivello, immagine, descrizione
- I testi localizzati usano `.it` come lingua (es. `props.name?.it`)

## Attributi del componente

| Attributo  | Tipo   | Esempio          |
|------------|--------|------------------|
| `shard`    | string | `camminiditalia` |
| `app-id`   | string | `1`              |
| `layer-id` | number | `5`              |
