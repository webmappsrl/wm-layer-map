---
name: Brand CTA gap check
overview: Valutazione dei punti ancora necessari per considerare il branding CTA davvero allineato alle best practice nel web component `wm-layer-map`, escludendo documentazione e aspetti iframe. Il focus è distinguere ciò che è già coperto da ciò che richiede ancora una decisione o un piccolo intervento di prodotto/UI.
todos:
  - id: confirm-brand-source
    content: Definire se il brand chip usa sempre una label/logo unici o continua a derivare dal backend
    status: completed
  - id: define-logo-fallback
    content: Decidere e descrivere il fallback reale del logo brand in caso di errore asset
    status: completed
  - id: complete-visual-qa
    content: Validare leggibilità e gerarchia CTA su viewport e basemap diversi
    status: completed
isProject: false
---

# Piano Per Verifica Gap Branding CTA

Riferimento ticket: [`oc_7642`](https://orchestrator.maphub.it/resources/developer-stories/7642)

## Già In Linea

Nel componente attuale [`/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js`](/Users/rubensgarofalo/Sites/Webmapp/wm-layer-map/src/wm-layer-map.js) risultano già coperti questi aspetti:

- `Hosting asset logo`: il logo app viene già recuperato da backend tramite `getAppIconUrl()` e `APP_API_ORIGIN_BY_SHARD`.
- `URL destinazione per shard`: la web app è già costruita per shard con `WEBAPP_URL_BY_SHARD` e `getWebappUrl()`.
- `Responsive desktop/mobile`: nel web component non servono due snippet HTML separati; il layout è già responsivo via CSS (`#map-top-bar`, `#app-cta-group`, media query mobile).
- `Store CTA`: i badge store sono ufficiali, separati dal brand chip, e su mobile viene mostrato un solo store coerente con la piattaforma.
- `Accessibilità base`: esistono `aria-label`, `focus-visible` e target touch adeguati.

## Gap Reali Da Chiudere

### 1. Decidere la vera fonte del brand visibile

Se il requisito è davvero `uno solo "Cammini d'Italia app"`, oggi non è ancora blindato al 100%.

Attualmente il testo visibile del chip usa `localizedLabel(app?.name)`, quindi dipende dal config app. Va deciso se:

- il brand resta derivato dal backend/app config
- oppure si forza una label unica di prodotto, indipendente dall'app

Se vuoi un branding davvero unico cross-shard, conviene rendere esplicita questa regola in codice invece di affidarla implicitamente al backend.

### 2. Gestire il fallback reale del logo brand

Hai detto che il logo è già hostato dal backend, ma il comportamento corrente non implementa un fallback grafico vero: se l'icona fallisce, viene solo nascosta.

Da chiudere:

- fallback PNG o seconda URL se l'asset primario non carica
- decisione se mostrare placeholder brand oppure solo testo quando il logo manca

### 3. Chiarire la gerarchia CTA

Oggi il chip brand apre la web app (`Apri la web app`), mentre i badge aprono gli store. Questa è una soluzione sensata, ma va confermata come decisione di prodotto.

Serve fissare una regola chiara:

- `brand chip = web app`
- `store badge = installazione`

oppure, se il goal primario è installare l'app mobile, va rivalutata la priorità su mobile.

### 4. Completare la verifica visuale vera

Le screenshot mostrano che la direzione è buona, ma la verifica visuale non è ancora completa rispetto alla checklist.

Resta da verificare in modo esplicito:

- viewport `375`, `768`, `1440`
- mappe con contrasto differente (`verde`, `grigio`, `satellite`)
- nomi lunghi dell'app/layer
- comportamento con badge singolo e doppio

## Punto Da Considerare Ma Non Critico

### Cache/versioning dell'asset brand

Se il logo continua a essere servito dal backend, per una distribuzione embed robusta conviene prevedere:

- URL stabile
- caching corretto
- eventualmente versione asset per invalidazione cache

Non è un blocker UX, ma è una best practice tecnica utile per partner e embed pubblici.

## Decisione Consigliata

Per considerare il task davvero "in linea", io chiuderei questi 3 punti minimi:

1. confermare se il testo/logo del chip deve essere davvero fisso `Cammini d'Italia app` oppure derivato dal backend
2. aggiungere un fallback reale del logo brand
3. fare una verifica visuale strutturata sui viewport e sui diversi basemap

Il resto, per come l'hai circoscritto, è già sostanzialmente allineato.
