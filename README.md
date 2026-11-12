# 🎲 GAME — the app

| File | Who | What |
|---|---|---|
| **`DnD_Game_DM.html`** | **You** | Open this. Games (save slots), characters at levels 1–20, the item catalog, shops, loot, scenarios, combat, monster workshop, prepared fights |
| **`DnD_Game_PLAYERS.html`** | **Your friends** | Send it on Discord. They make a level 1 hero, roll on their sheet, track HP and uses, add XP and level up, buy in your shops and load your loot. No combat screen and no save slots |
| `_engine/` | Nobody | The app's code and rules data. Claude edits it, then rebuilds the player file with `_engine/make_player_file.ps1` |

Works offline in Chrome or Edge, with no install and no account.

## Language
**EN / RU** next to the title switches the whole app between English and Russian (each person picks their own; default is Russian). Characters, saves and files stay the same in both languages. Translations live in `_engine/data/ru/`.

## What helps new players
- **Class step:** all 20 levels written out: every class and subclass power with its explanation, ability score improvements, new spell levels.
- **Subclasses:** all 48 from the 2024 Player's Handbook (4 per class), written short in our own words in `_engine/data/subclasses.js`. Each power shows the level it unlocks. The app counts the numbers itself where it can: Eldritch Knight / Arcane Trickster wizard magic, Valor bard's 2 attacks and martial weapons, Dance bard's AC, Gloom Stalker initiative, attack buttons for Psychic Blades / the beast companion / the Starry archer, subclass spells that unlock by level. Battle Master picks maneuvers and Circle of the Land picks its land in step 6.
- **Everything in the 2024 Player's Handbook is choosable:** all 390 spells (`data/spells.js`, `spells2.js`, `spells3.js`, `spells4.js` — damage, saves and healing are counted where there is a number), 10 species including Aasimar, all general feats, Fighting Style feats and Epic Boons, all 28 Eldritch Invocations (`data/options.js`). Feats and invocations that give spells, armor or weapon training, extra attacks (Thirsting Blade) or CHA attacks (Pact of the Blade) are counted by the app.
- **Equipment step:** pick ONE option, either a starting kit or only gold. The ✔ column only means "wearing / holding it"; it never gives new items.
- **Sheet → ⚡ Right now:** spell slots, uses and Hit Dice left, in plain words ("1 of 2 left, back on a Long Rest"). Cast buttons turn off when you're out of slots.
- **Armor Class:** the line under the number shows how it's made (e.g. "Chain Mail (16) + Shield 2").
- **🎲 Dice animation:** a 1-second roll on screen. With Advantage / Disadvantage you see **two d20s**: the one that counts is marked ✓, the other is crossed out. Switch the animation off in the dice panel or in ⚙️.
- **Sound (top bar):** 🎵 calm background music, 🔊 mute, ⚙️ settings with volume sliders (all, effects, music). Everything is made by the app, with no audio files, and it's quiet by default. Each person sets their own.
- **Spell cards:** what the spell does is on top. The **Costs:** row at the bottom shows the action, the slot (and how many are left) and Concentration.
- **Advantage / Disadvantage** works for **any** die in the dice panel (d4–d100 and typed rolls like 2d6+3): two rolls, the higher / lower counts.
- **Combat:** every action button shows the **chance to hit** (or that the target fails its save) and the **average damage ≈**. The log writes each step: "🎲 14 +4 = 18 ≥ AC 15 → HIT → 💥 7 → HP 10 → 3".
- **Monsters:** about 330 D&D monsters from CR 0 to CR 30 (the whole free list: beasts, all dragons incl. wyrmlings and metallic ones, demons, devils, fey, giants, NPCs, undead...), grouped by CR. **Filter** (in Fight, Prepared fights and the workshop): CR from–to, type (🐉 dragon, 💀 undead, 😈 fiend...), source (📖 standard D&D, 📜 the active scenario, ★ my monsters) and live search. Every CR says what it means ("a fair fight for 4 heroes of level 5"; 1/2 is shown as "(0.5)"). Open any monster, pick another CR and see the balanced stats; add it to a fight at that CR (the fight screen has a CR list too). ＋ New monster shows a live preview. **⚖️ Balance to this CR** re-does it at any time.
- **Prepared fights** (and the Fight tab) show the **difficulty** for your party: Low / Moderate / High / Deadly.

## Top bar (DM)
**🎲 Game name** → your games list · **🧙 Characters** · **🎒 Equipment** (Catalog / Shops / Loot) · **⚔️ Combat** (Fight / Monsters / Prepared fights) · **❓ How to use** · 🎵 🔊 ⚙️ (music, sound, settings + scenario)

## Levels 1–20
- Sheet → **⭐ Experience**: type the XP you give → **＋ Add XP**. When the bar is full, **⬆ Level up** appears. You (DM) also have **⬆ Level N** without XP (milestone levelling).
- Level up shows what changed (HP, slots, attacks, new powers) and the choices to make (subclass at 3, **+2 to abilities or a feat** at 4/8/12/16, Epic Boon at 19, new spells). It has **↩ Undo**.
- Players can level up a hero that is "managed by DM", but only make the new choices. Then they **📤 Send to DM** and you **📥 Import**: the app shows what changed and asks before it replaces your copy.

## 🎒 Equipment, shops, loot
- **📚 Catalog (DM only)**: about 490 items: weapons, armor, gear, tools (all artisan tools and instruments), vehicles, potions, about 300 magic items (the whole free D&D list plus new homebrew ones). Each has a **tier** (⚪ Common, 🔵 Rare, 🟣 Epic, 🟠 Legendary, 🌟 Divine) and a **level** (from which hero level it fits). Click ✎ on a card to set your own price, level and tier for this game (↺ = default). **Stats grow with the item level**: weapon/armor bonus and small bonuses +1 per step (levels 1–4, 5–8, 9–12, 13–16, 17–20, max +5), speed +5 ft, dice and healing grow too. The special power in the text never changes. You can also set the level in a shop, or on an item a hero already has (✎ in the bag). Players only see 🛒 Shops.
- **🛒 Shops**: ＋ New shop → add items from the catalog (weapons and armor can get +1/+2/+3) → set prices and stock → **📤 Export for players** → `<Shop>.shop.json` on Discord. Players load it in 🎒 Equipment and buy with their gold. Selling gives half the book price.
- **🎁 Loot**: put items and gold in the bag → choose the hero → **Give + 📤 file**. It's added to your copy and a small `.loot.json` file downloads for that player. Loading the same loot file twice does nothing.

## 📜 Scenarios (add-ons for one campaign)
One file `<Name>.scenario.json` laid on top of normal D&D: new items, species, subclasses, spells, feats, monsters, a shop and house rules (English text + Russian in `ru`). With a scenario active you can show only its content: the 📜 source filter in the catalog and the monster filter, and "Show: only from the scenario" at the top of the character builder (species, backgrounds, subclasses, spells, feats). Example: `Campaigns/Practice/Example.scenario.json`.
- You: ⚙️ → **Scenario** → 📥 load the file → pick it for this game (each game can have its own). 📤 sends the file to players.
- Players: 📥 load the same file → ⚙️ → pick it. "Normal D&D" = no additions.
- Tell Claude what you want ("a new species that…", "a sword that…"), and Claude writes and balances the file.

## Saving
| What | Where it goes |
|---|---|
| Every click (characters, HP, monsters, prepared fights, the fight in progress) | Saved automatically **in the browser**, inside the game that is open |
| **💾 Save file** (🎲 page or Characters page) | One file `<Game>.game.json` in Downloads → move it to `Campaigns/<Game>/` |
| **📥 Load game from file** (🎲 page) | Brings a game back. If that game already exists, it asks before replacing it |
| 📤 Export for player / 📤 Send to DM | One character file, sent over Discord |
| 📤 Export shop / 🎁 Give + file / 📤 scenario | `.shop.json` / `.loot.json` / `.scenario.json`, sent over Discord; players load them in 🎒 Equipment (scenario: ⚙️) |

The DM version and the player version keep **separate** data, even on the same computer.
If browser data is cleared, or you use another computer or browser, the browser copy is gone. That's why you **💾 Save file** after every evening.

## Character files between you and players
```
Player builds hero ──📤 Send to DM──► Discord ──► DM: 🧙 Characters → 📥 Import
DM changes it (loot, level up) ──📤 Export for player──► Discord ──► Player: 📥 Import file from DM
```
After you export a hero, the player's copy is **🔒 managed by DM**. They can still play it, but they can't change the build.

## Limits
No multiclassing and no live sync yet (files go through Discord). Levels 4–20: the most important numbers are automatic (HP, slots, extra attacks, cantrip damage, feature uses). Rarer high-level powers are written out, and you apply them yourself. Spells of levels 3–9 are a selection (about 60), not every spell.

## Online: Owlbear Rodeo extension (GitHub Pages)
- `index.html` = the online version. Inside an Owlbear Rodeo room it opens as the **D&D Table** extension panel; the Owlbear role decides the version (GM → DM version, player → player version). Opened directly in a browser it asks "DM or player" once.
- It loads the same app scripts as `DnD_Game_DM.html` (it reads that file's script list), plus `_engine/app/online.js` (Owlbear bridge: role tag, ⇤/⇥ narrow / wide panel). The Owlbear SDK comes from jsdelivr, pinned to `@owlbear-rodeo/sdk@3.1.0`.
- `manifest.json` + `icon.svg` describe the extension. `.nojekyll` makes GitHub Pages serve the `_engine` folder.
- Data inside Owlbear is saved in the browser separately from the offline files: move a game once with 💾 Save file → 🎲 Load game from file.
- This folder is a git repository. Publish it with GitHub Desktop (public repo) and turn on Settings → Pages → branch `main`, folder `/ (root)`. Extension link: `https://<user>.github.io/<repo>/manifest.json`.
- Coming next: sync between players, token cards (click a token → card), music for everyone.
