> Ticket: oc:8191

# Piano — Mockup WebApp layout overlay

## Task

1. Ristrutturare template: `#map-top-bar-left` / `#map-top-bar-right` + `#map-bottom-left` con store e scale
2. CSS top bar: desktop badge affiancati (`justify-content: flex-start`), mobile `space-between`
3. CSS bottom-left: store row (desktop) / column (mobile) sopra scale
4. Rimuovere `#app-cta-group` e `_updateAppCtaGroupVisibility`
5. Aggiornare README CSS parts (`bottom-left`, `scale-line`)
6. Verifica manuale `test/index.html` desktop e mobile

## Verifica

```bash
npx serve .
# http://localhost:PORT/test/index.html
```

- Desktop: app + layer a sinistra, store orizzontali sopra scale
- Mobile (<600px): app sx, layer dx, store verticali sopra scale
- `hide-cta`: spariscono link e store, layer resta
