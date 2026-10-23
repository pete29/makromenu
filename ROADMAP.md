# Roadmap

An app for planning a weekly menu from a recipe collection. The plan is shared by two people, and portions are scaled to each person's calorie target. A shopping list is generated from the plan.

**Stack:** React + Vite + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), vite-plugin-pwa, Vitest. Hosting on Vercel or GitHub Pages.

Legend: `[x]` done · `[~]` in progress · `[ ]` to do

## Decisions

**Users and goal**
- Private use: me and my girlfriend. The project also goes on GitHub as a portfolio piece.
- Inspiration: Respo, but with my own implementation.

**Platform**
- iPhone via **PWA** ("Add to Home Screen"), no App Store.
- Why not native (Expo/React Native): I work on Windows. My brother-in-law's Mac would do (Xcode), but with a free Apple account the app signature expires after 7 days, and a developer account costs $99 a year. A PWA is free, works permanently and gives a clickable portfolio demo.
- The logic (scaling, shopping list) is plain TS, so it can be moved to Expo if needed.

**Plan model**
- **One shared menu** for both people, but **each has their own calorie target**. We cook once and each person serves their own portion.
- Default: 1500 kcal per day. Calorie target and number of meals are configurable per person.
- When the calorie gap is large and a recipe doesn't stretch sensibly for both, the app suggests e.g. an extra snack instead of scaling dinner ×2.

**Calories and portions**
- Calories come from ingredient weights, and weights are scaled to the calorie target.
- "Keep it sensible": scaling limits, rounding of pieces and grams, spices are not scaled.
- In the PDF, for recipes with `porcje: N` (servings) the ingredients are given for the whole recipe, while kcal and macros are per serving.

**Recipes**
- Source: `Przepisy.pdf` (99 recipes from dietitian plans).
- **PDF sections (breakfasts/lunches/dinners/snacks) are ignored**, because they are arranged haphazardly. The meal type is assigned based on what the dish actually is. One recipe can fit several meals, e.g. soup for lunch or dinner.
- Time windows from the PDF (e.g. 7:00–10:00) are skipped.
- **Recipes do not go into the public repo** (the dietitian's copyright). The repo contains the code and a few sample recipes; the real database lives in a gitignored file.

**Shopping list**
- I pick a range of days and get total weights for both people, grouped by store section.
- Later: conversion to packages ("2 × 200 g butter block").

**Way of working**
- Commit after every step so changes are visible in Source Control.
- Commit messages and documentation in English; the app UI is in Polish.

---

## Phase 0: Project setup

- [x] Vite scaffold (React + TS)
- [x] Dependencies: dexie, dexie-react-hooks, vite-plugin-pwa, vitest
- [x] App name: **Makromenu**
- [ ] Rename folder `jadlospis` → `makromenu` (manually, with VS Code closed)
- [x] `git init`, `.gitignore` (including private recipe data), first commit
- [ ] GitHub repo
- [x] Clean up the default Vite template
- [x] Tailwind CSS 4 (`@tailwindcss/vite`)

## Phase 1: Recipe import from PDF

- [x] Extract text from the PDF (`pdftotext -enc UTF-8 -layout`; without `-enc UTF-8` Polish characters are lost on Windows)
- [x] Parser [scripts/import-pdf.mjs](scripts/import-pdf.mjs): text → JSON (99/99 recipes, 1005 ingredients)
  - [x] name, kcal, protein/carbs/fat, time, number of servings
  - [x] ingredients: weight + household measure ("2 sztuki (140 g)")
  - [x] ingredient groups (Sos, Sałatka, Do podania…)
  - [x] preparation steps
  - [x] weight wrapped to the next line ("Mięso z piersi kurczaka –" / "250 g")
  - [x] ingredient name on one line, "– 120 g" on the next
  - [x] "Rosół", which has kcal in a different place than the rest (goal: 99/99 recipes)
  - [x] ingredients embedded in the middle of a step in the PDF (moved to ingredients with a warning)
  - [x] group header split across two lines ("Do" / "podania")
  - [x] zero parser warnings
- [x] Private data in `data/private/recipes.json` (outside git), imported into the app from Settings
- [x] A few sample recipes in the repo so the demo works without private data ([src/data/samples.json](src/data/samples.json), made up, not from the PDF)
- [x] Assign meal types based on the dish, not the PDF section (a recipe can have several types, e.g. soup = lunch or dinner): guessed from kcal and name ([src/engine/mealTypes.ts](src/engine/mealTypes.ts)), corrected by hand in the recipe view; manual types survive re-import
- [ ] Manual review of the output

## Phase 2: Ingredient database

- [x] List of unique ingredients (210) and merging of duplicates: `ALIASES` map in the parser (only products with the same nutritional values are merged)
- [ ] Values per 100 g: kcal, protein, fat, carbohydrates
- [ ] Piece weight for ingredients counted in pieces (egg, slice of bread, tortilla, garlic clove)
- [ ] "Don't scale" flag (salt, pepper, spices, water)
- [ ] Store section (vegetables, dairy, meat, dry goods, spices…)
- [ ] Quality check: kcal calculated from ingredients vs kcal from the PDF (±10% tolerance)

## Phase 3: Scaling engine (plain TS + tests)

Scaling works on recipe-level kcal from the PDF: calories are linear in ingredient weights, so a portion's factor is target ÷ kcal per serving. The ingredient database (Phase 2) is only needed for exact kcal after rounding and for store sections.

- [x] Person profile: calorie target (default 1500), meals with percentage split ([src/engine/profile.ts](src/engine/profile.ts))
- [x] With a large calorie gap between people: an extra snack for one person; its weight is added to their day, so their other meals get smaller ([src/engine/plan.ts](src/engine/plan.ts))
- [x] Meal targets are relative to the profile's full day, so they stay the same while the day is being filled in
- [x] Meal calorie target = daily target × meal share
- [x] Scaling factor = meal target ÷ kcal per serving (accounting for `porcje: N`) ([src/engine/scaling.ts](src/engine/scaling.ts))
- [~] Common-sense rules:
  - [x] scaling limit 0.6–1.6× flagged as `inRange: false` (suggesting another recipe or a snack: in the planner)
  - [x] household units rounded to halves (glasses to quarters), never down to zero
  - [x] pinches (salt, pepper) are not scaled; other spices and water still scale
  - [x] grams rounded to 1 / 5 / 10 g depending on size
  - [ ] recalculate real kcal after rounding and show the difference from the target (needs Phase 2)
- [x] Portions for two people from one recipe: one pot "to cook" for the sum of portions + each person's share and kcal/macros "per plate"
- [x] Polish unit inflection: 1 sztuka, 2 sztuki, 5 sztuk, 1.5 sztuki ([src/engine/units.ts](src/engine/units.ts))
- [x] Daily summary: kcal and macros per person
- [x] Shopping list: sum of weights over the selected meals for both people, merged by name, household units summed when they match, water and ice skipped
  - [~] grouped by store section: keyword rules for now ([src/engine/sections.ts](src/engine/sections.ts)), per-product section with Phase 2
- [~] Unit tests (Vitest), on made-up sample recipes (`npm test`)

## Phase 4: App data layer

- [~] Dexie schema ([src/data/db.ts](src/data/db.ts)): `recipes`, `profiles`, `mealPlan` done; `ingredients`, `shoppingChecks` later
- [x] Sample recipes and two 1500 kcal profiles seeded on first launch
- [x] Recipe import from a JSON file picked in Settings, validated with readable errors; replaces the samples
- [ ] Backup export/import to a file

## Phase 5: User interface

- [x] Mobile layout + bottom navigation (safe-area aware)
- [x] **Recipes:** list, search by name or ingredient (diacritics-insensitive), filter by meal type, recipe details with editable meal types
- [x] **Settings:** profiles (name, daily kcal, % split per meal with kcal preview; 0% = doesn't eat that meal), saved as you type
- [~] **Weekly planner** ([src/screens/PlanScreen.tsx](src/screens/PlanScreen.tsx)):
  - [x] week navigation + day strip, meals of the selected day by type
  - [x] manual recipe selection and swapping; the picker sorts recipes by how well they fit the meal's kcal targets and flags poor fits
  - [x] per-meal "who eats it" toggles (extra snack for one person) and kcal per person
  - [x] day totals: kcal / target and macros per person
  - [x] auto-fill the week from today on (matching meal type, few repeats, none on neighbouring days, recipes that scale well), keeping planned meals ([src/engine/autofill.ts](src/engine/autofill.ts)); clear the week
  - [ ] "cook once, eat for 2 days" for multi-serving recipes
- [x] **Meal view** (tap a meal in the planner, [src/screens/MealDetail.tsx](src/screens/MealDetail.tsx)): "to cook" for the whole pot with steps, and per person: % of the finished dish, kcal/macros and ingredients for a plate assembled separately
  - [x] plates add up exactly to the pot: rounded one by one, the last plate gets the remainder
- [x] **Shopping list** ([src/screens/ShoppingScreen.tsx](src/screens/ShoppingScreen.tsx)): range presets or custom dates, items grouped by store section, kitchen measures shown as grams, check-off saved on the device
- [ ] Shopping list: conversion to packages (later)

## Phase 6: PWA and deployment

- [ ] Manifest, icons, theme color
- [ ] Offline support (service worker)
- [ ] Deploy to Vercel or GitHub Pages
- [ ] Test on iPhone: "Add to Home Screen"

## Phase 7: Sync (optional)

- [ ] Supabase: shared plan and shopping list on two phones
- [ ] Login (magic link)
- [ ] Conflict resolution (last write wins)

## Phase 8: Portfolio

- [ ] README: description, screenshots, demo link, how scaling works
- [ ] GitHub Actions: lint + tests + build
- [ ] Demo on sample recipes
