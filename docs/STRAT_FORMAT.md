# Strat file format

A strat is one `.json` file. The app keeps your strats in its own folder (use **Open strats folder** in the app to find it). Map images go in a `maps/` folder next to the strat files.

## Single-player strat

```json
{
  "formatVersion": 1,
  "name": "Fallen Solo NST",
  "mode": "Fallen",
  "map": "Simplicity",
  "difficulty": "Easy",
  "placementMap": "maps/fallen-simplicity.png",
  "notes": ["Join the Paradoxum Games group for +$100 starting cash."],
  "loadout": [
    { "tower": "Assassin" },
    { "tower": "DPS", "options": ["Juggernaut (bottom path)", "Turret"] }
  ],
  "steps": [
    { "text": "Place 2 Lv 0 Assassins, then upgrade them to Lv 2, 1 by 1", "towers": ["Assassin"], "wave": "1-4", "tip": "Map spots 1 and 2" }
  ]
}
```

| Field | Required | What it is |
|---|---|---|
| `name` | yes | Shown in the strat picker |
| `steps` | yes | The steps, in order |
| `steps[].text` | yes | The instruction shown big on screen |
| `steps[].towers` | no | Loadout towers this step is about. They light up and get colored in the text |
| `steps[].wave` | no | Wave or wave range, shown next to the step number |
| `steps[].tip` | no | Extra advice, shown in a yellow box |
| `loadout` | no | Up to 5 towers. `options` lists alternatives for that slot |
| `notes` | no | General rules, shown under the steps |
| `placementMap` | no | Path to the map image, relative to the strat file |
| `mode`, `map`, `difficulty` | no | Shown under the strat name |

## Variants (choices)

Some strats let you pick between towers, like *DJ Booth or Commander*. Add `choices`, and the app shows a picker for each one.

```json
{
  "choices": [
    { "id": "support", "label": "Support", "options": ["DJ Booth", "Commander"] }
  ],
  "loadout": [ { "tower": "Support", "choice": "support" } ],
  "steps": [
    { "text": "Place a {support}", "towers": ["Support"] },
    { "text": "Place 3 Lv 2 Commanders", "towers": ["Support"], "if": { "support": "Commander" } },
    { "text": "Max the DJ Booth", "towers": ["Support"], "if": { "support": "DJ Booth" } }
  ]
}
```

- `{id}` in `text`, `tip` or `notes` is replaced with the picked option.
- A step with `if` only shows when every listed choice matches.
- A loadout slot with `choice` shows the picked tower's name.

## Multiplayer strat

Leave out the top-level `loadout`, `steps` and `placementMap`, and add a `players` list. The app then shows a Player 1 / Player 2 / ... picker.

```json
{
  "formatVersion": 1,
  "name": "Trio strat",
  "notes": ["Shared notes for everyone"],
  "players": [
    { "name": "Player 1", "placementMap": "maps/trio-p1.png", "loadout": [ ... ], "steps": [ ... ] },
    { "name": "Player 2", "placementMap": "maps/trio-p2.png", "loadout": [ ... ], "steps": [ ... ] }
  ]
}
```

## AI prompt

This is the prompt behind the **Copy AI prompt** button. Paste it into any AI, put the strat text under it, and paste the answer into the app.

```text
Convert the Tower Defense Simulator strategy below into a StratOverlay strat file.
Reply with ONLY the JSON, no explanation.

Format:
{
  "formatVersion": 1,
  "name": "Short strat name",
  "mode": "Gamemode, e.g. Fallen",
  "map": "Map name",
  "difficulty": "Easy / Medium / Hard (if given)",
  "notes": ["General rules and tips that apply to the whole game"],
  "loadout": [ { "tower": "Assassin" }, { "tower": "DPS", "options": ["Juggernaut (bottom path)", "Turret"] } ],
  "steps": [
    { "text": "Place 2 Lv 0 Assassins, then upgrade them to Lv 2, 1 by 1", "towers": ["Assassin"], "wave": "1-4", "tip": "Map spots 1 and 2" }
  ]
}

Rules:
- One action per step, written as a short instruction. Split "A -> B -> C" chains into separate steps in order.
- "towers" lists which loadout towers the step is about, spelled exactly like the "tower" names in the loadout.
- "wave" is optional: only add it when the strat says which wave(s) the step happens on.
- Put advice (targeting, abilities, DJ track, where on the map) in "tip", not in "text".
- If the strat offers alternatives (e.g. "DJ / Commander", "Sabo / Engi", "A ⇆ B"), add
  "choices": [ { "id": "support", "label": "Support", "options": ["DJ Booth", "Commander"] } ],
  give that loadout slot "choice": "support", write {support} in text where the picked tower goes,
  and give steps that only apply to one option "if": { "support": "Commander" }.
- If the strat has a separate plan per player, leave out the top-level "loadout" and "steps" and use
  "players": [ { "name": "Player 1", "loadout": [...], "steps": [...] }, ... ] instead.
- Keep tower names and level numbers exactly as in the strat. Don't invent steps.

Strategy:
<paste the strat here>
```
