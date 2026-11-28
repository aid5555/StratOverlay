# StratOverlay

A small overlay for **Roblox Tower Defense Simulator** that shows your strategy one step at a time, with the placement map, while you play. Works on **Mac** and **Windows**.

- See-through, always-on-top overlay you can drag anywhere, or **Fullscreen** mode on a second screen
- **Next / Previous** with hotkeys that work while Roblox is focused
- Placement map, tower loadout with the current step's towers highlighted, tips and notes
- Multiplayer strats with a **Player 1 / 2 / 3** picker, and variant pickers (e.g. DJ or Commander)
- Collapse it to a small bar when you only need the current step
- Remembers which step you're on for every strat

StratOverlay only shows information. It never reads or touches the Roblox game.

## Download

Get the latest version from the [Releases page](https://github.com/aid5555/StratOverlay/releases/latest):

- **Windows:** `StratOverlay-Setup-x.y.z.exe` (installer) or `StratOverlay-x.y.z-portable.exe` (no install, just run it)
- **Mac:** `StratOverlay-x.y.z-mac.dmg`. Open it and drag StratOverlay into Applications.

The apps aren't signed with a paid developer certificate, so the first launch shows a warning:

- **Windows:** "Windows protected your PC" → click **More info** → **Run anyway**.
- **Mac:** if it says the app "is damaged" or "can't be opened", open Terminal and run
  `xattr -cr /Applications/StratOverlay.app`, then open it again. (Or right-click the app → **Open** → **Open**.)

## Run from source

1. Install **Node.js** (the LTS version) from [nodejs.org](https://nodejs.org).
2. Download this repo: green **Code** button → **Download ZIP**, then unzip it (or `git clone` it).
3. Open a terminal in the folder:
   - **Mac:** right-click the folder in Finder → *New Terminal at Folder*.
   - **Windows:** open the folder, click the address bar, type `cmd`, press Enter.
4. Run:

```bash
npm install
npm start
```

Next time, only `npm start` is needed.

## Adding strats

The app ships without strats. On first launch it shows a screen to add one (you can always get back to it with the **+** button):

1. Press **Copy AI prompt** and paste it into Claude, ChatGPT or another AI.
2. Paste the strat text from the strat doc under the prompt and send it.
3. Paste the AI's answer into the app, paste a screenshot of the placement map (⌘V / Ctrl+V) or choose an image file, and press **Save strat**.

To add or replace the map of a strat you already have, copy a screenshot and press ⌘V / Ctrl+V while it's open. In multiplayer strats this sets the map for the selected player.

You can also import a `.json` strat file, or drop files into the strats folder (**Open strats folder** in the app). The file format is described in [docs/STRAT_FORMAT.md](docs/STRAT_FORMAT.md).

## Controls

| Key | What it does |
|---|---|
| Alt + → | Next step |
| Alt + ← | Previous step |
| Alt + ↑ | Back to step 1 |
| Alt + M | Show / hide the map |
| Alt + C | Collapse / expand the overlay |
| Alt + H | Hide / show the overlay |
| Alt + O | Switch between Overlay and Fullscreen |
| Esc | Leave Fullscreen |

On Mac, Alt is the **Option** key. Arrow keys and Space also work when the StratOverlay window itself is focused.

## Project layout

```
main.js          Electron main process: window, hotkeys, strat files
.github/         GitHub Actions: builds the Mac and Windows apps when the version changes
preload.js       Bridge between the window and the main process
renderer/        The overlay UI (HTML, CSS, JS) and the AI prompt
docs/            Strat file format
```

## Making a release

1. Bump `version` in `package.json` and push it to `main`.
2. GitHub Actions builds the Mac `.dmg`/`.zip` and Windows `.exe` files and publishes them as Release `v<version>`.
   (You can also run the *Build and release* workflow by hand from the Actions tab.)
