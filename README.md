# 🏒 Slapshot — NHL Hockey

A fast, arcade-style NHL hockey game that runs entirely in the browser. No
build step, no dependencies, no assets to download — just open `index.html`.

![gameplay](https://img.shields.io/badge/canvas-HTML5-blue) ![deps](https://img.shields.io/badge/dependencies-none-brightgreen)

## Play

Open **`index.html`** in any modern browser (Chrome, Firefox, Safari, Edge).

Or serve it locally:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

- **All 24 teams** with authentic color palettes — pick any home/away matchup.
- **Real NHL rink** drawn to scale: blue lines, red line, faceoff circles,
  creases, and nets.
- **Full-team play** — 5 skaters + a goalie per side, each with role-based AI
  (forwards drive the net, defensemen hold the blue line, goalies cut the angle).
- **Skating physics** with acceleration, momentum, and gliding on the ice.
- **Shooting** with a hold-to-charge power meter, **passing** with lead targeting,
  **body checks**, steals, and goalie saves.
- **Faceoffs, three periods, and sudden-death overtime**, with a live scoreboard
  and game clock.
- **Fully synthesized audio** (Web Audio API): goal horn, whistle, crowd,
  stick clacks, boards, and body checks — no audio files.
- **Four difficulty levels**: Rookie, Pro, All-Star, Legend.

## Controls

| Action | Keys |
| --- | --- |
| Skate | `W A S D` or Arrow keys |
| Shoot | Hold `Space` to charge, release to fire |
| Pass | `Shift` |
| Body check | `C` |
| Switch player | `L` (control auto-switches to whoever's nearest the puck) |
| Pause | `P` or `Esc` |

## Project layout

```
index.html          entry point + team-select menu
assets/style.css    menu / UI styling
src/
  util.js           math helpers
  teams.js          NHL team data (names, colors)
  audio.js          Web Audio sound engine
  input.js          keyboard handling
  rink.js           rink geometry + rendering
  entities.js       Puck and Skater physics
  ai.js             CPU skater + goalie decision-making
  render.js         skater / puck / particle drawing
  game.js           engine: state machine, rules, scoring
  hud.js            scoreboard + overlays + render loop
  main.js           menu wiring and bootstrap
```

All scripts are plain, dependency-free JavaScript loaded in order — nothing to
install or compile.
