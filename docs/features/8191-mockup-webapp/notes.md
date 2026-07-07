> Ticket: oc:8191

# Notes — Mockup WebApp layout overlay

## Deviazioni dal piano

- **Fullscreen mobile:** inizialmente il piano mobile prevedeva il layer badge "a sinistra del fullscreen"; in seguito il fullscreen è stato nascosto del tutto su mobile (`display: none`), liberando l'angolo destro.
- **Larghezza layer vs app:** il requisito "box layer max largo come box app" è stato implementato con lo stesso `max-width` di contenitore (`min(320px, 100%)`), non con match dinamico della larghezza renderizzata. Su viewport stretti il layer può risultare più largo del box app se il testo è lungo.

## Bug trovati

- **Scale sopra store:** OpenLayers posiziona `.ol-scale-line` in `absolute` rispetto al contenitore padre — risolto forzando `position: relative` sul container scale dentro `#map-bottom-left`.

## Decisioni

- Badge app/layer e store ridotti in iterazioni successive al layout base, senza ticket separati.
- `-webkit-line-clamp: 2` scelto per il layer label: supporto browser adeguato per il target del web component.

## Follow-up

- Eventuale `ResizeObserver` per cappare `#layer-badge` alla larghezza effettiva di `#app-link` se il cliente richiede match pixel-perfect.
