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
