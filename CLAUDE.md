# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A traditional Japanese-style digital scoreboard for Kendo matches. Pure vanilla HTML/CSS/JS with zero dependencies — no npm, no build system, no framework. Open `index.html` in a browser to run.

## Architecture

**Multi-page application** with 4 HTML pages, each self-contained:

| Page | Script | Purpose |
|---|---|---|
| `index.html` | (none) | Main menu — links to match types |
| `team-match.html` | `script.js` | 5-man team match (Senpo, Jiho, Chuken, Fukusho, Taisho) |
| `team-match-3man.html` | `script-3man.js` | 3-man team match (Senpo, Chuken, Taisho) |
| `individual-match.html` | `script-individual.js` | 8 independent individual matches |

All pages share `style.css`. The only external resource is Google Fonts (Noto Serif JP).

### Core Pattern: KendoScoreboard Class

Each script file defines its own `KendoScoreboard` class instantiated as `window.scoreboard`. The classes are independent (no shared base class). `script.js` and `script-3man.js` are ~95% identical — they differ only in the positions array and match count.

### State Management

All match data lives in `this.state.matches[]`, each containing:
- `timer` — per-match countdown (minutes, seconds, isRunning, intervalId)
- `red` / `white` — `{ ippons: [], hansoku: 0 }`
- `result`, `winType`, `history[]` (undo stack, max 20 entries via JSON deep copy)

Team match scripts also have `this.state.daihyosha` for the representative tiebreaker match. Individual match script uses `encho` (overtime) flag per match instead.

`this.dom` caches all DOM references gathered in the constructor — no repeated `querySelector` calls.

### Rendering

Imperative DOM manipulation. `renderRows()` rebuilds match rows via innerHTML, then re-attaches event listeners. Score updates call `renderMatchScores()` for targeted re-renders. No reactivity system.

### Scoring Rules

- **Ippon types**: M (Men), K (Kote), D (Do), T (Tsuki) — stored in `ippons[]`
- **Hansoku**: 2 penalties = 1 ippon awarded to opponent
- **Fusen-gachi**: Walkover win — fills ippons with empty strings
- **Winner calc** (team): most match wins → most total ippons → hikiwaki (draw)
- **Red team** points display right-to-left (traditional orientation via `marks.reverse()`)

### CSS Conventions

CSS custom properties for theming (`--bg-color`, `--text-color`, `--red-color`). Key layout: `.main-container` (100vh flex), `.scoreboard-table` (flex column), `.match-row` (min-height 100px to prevent layout shifts). Active row highlighted with `--highlight-color`. Visual marks use `.mark-ippon`, `.mark-hansoku`, `.mark-hikiwaki`, `.mark-encho` classes.

## Development

No build, lint, or test commands exist. To develop:
1. Edit HTML/CSS/JS files directly
2. Open/refresh the relevant HTML file in a browser
3. Space bar toggles the match timer (when focus is not on an input)

Data is not persisted — refreshing the page loses all match state.

## Git Conventions

This project uses conventional commits (`feat:`, `fix:`, `docs:`, etc.).
