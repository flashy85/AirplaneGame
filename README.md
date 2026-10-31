# Airplane Game

Ein kleines Spiel zum Lernen der Regelungstechnik.

## Aufbau

- `src/main.ts` verbindet DOM und Module.
- `src/game.ts` verwaltet Spielzustand und Hauptschleife.
- `src/controls.ts` kapselt Eingaben und Bedienung.
- `src/rendering.ts` zeichnet die Canvas-Szene.
- `src/simulation.ts` enthält die unabhängigen Simulationsfunktionen.

Die Oberfläche bleibt zunächst bei HTML und Canvas; React ist für die aktuelle
UI nicht erforderlich.

## Entwicklung

```sh
npm install
npm run dev
```

## Prüfen und bauen

```sh
npm run typecheck
npm test
npm run build
```

## Veröffentlichung mit GitHub Pages

Der Workflow in `.github/workflows/deploy.yml` veröffentlicht das Spiel bei
jedem Push auf `main` und kann außerdem manuell gestartet werden. In den
Repository-Einstellungen unter **Settings → Pages** muss als Build-Quelle
**GitHub Actions** ausgewählt sein.

Nach dem ersten erfolgreichen Deployment ist das Spiel unter
<https://flashy85.github.io/AirplaneGame/> erreichbar. Der lokale
Entwicklungsserver verwendet weiterhin den Root-Pfad.
