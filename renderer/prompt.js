// The prompt users paste into an AI (Claude, ChatGPT, ...) together with a strat.
window.AI_PROMPT = `Convert the Tower Defense Simulator strategy below into a StratOverlay strat file.
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
`;
