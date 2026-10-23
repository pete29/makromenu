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
- [ ] Private data in `data/recipes.local.json` (outside git)
- [ ] A few sample recipes in the repo so the demo works without private data
- [ ] Assign meal types based on the dish, not the PDF section (a recipe can have several types, e.g. soup = lunch or dinner)
- [ ] Manual review of the output

## Phase 2: Ingredient database

- [x] List of unique ingredients (210) and merging of duplicates: `ALIASES` map in the parser (only products with the same nutritional values are merged)
- [ ] Values per 100 g: kcal, protein, fat, carbohydrates
- [ ] Piece weight for ingredients counted in pieces (egg, slice of bread, tortilla, garlic clove)
- [ ] "Don't scale" flag (salt, pepper, spices, water)
- [ ] Store section (vegetables, dairy, meat, dry goods, spices…)
- [ ] Quality check: kcal calculated from ingredients vs kcal from the PDF (±10% tolerance)

## Phase 3: Scaling engine (plain TS + tests)

- [ ] Person profile: calorie target (default 1500), number of meals, percentage split across meals
- [ ] With a large calorie gap between people: an extra snack instead of extreme scaling
- [ ] Meal calorie target = daily target × meal share
- [ ] Scaling factor = meal target ÷ kcal per serving (accounting for `porcje: N`)
- [ ] Common-sense rules:
  - [ ] scaling limit (e.g. 0.6–1.6×); outside it, suggest another recipe or a snack
  - [ ] pieces rounded to whole or half units
  - [ ] "don't scale" ingredients unchanged
  - [ ] grams rounded to 5 or 10 g
  - [ ] recalculate real kcal after rounding and show the difference from the target
- [ ] Portions for two people from one recipe: "per plate" for each person + "to cook" combined
- [ ] Daily summary: kcal and macros per person
- [ ] Shopping list: sum of weights over the selected range of days for both people, grouped by section
- [ ] Unit tests (Vitest)

## Phase 4: App data layer

- [ ] Dexie schema: `ingredients`, `recipes`, `profiles`, `mealPlan`, `shoppingChecks`
- [ ] Import recipes and ingredients from JSON on first launch
- [ ] Backup export/import to a file

## Phase 5: User interface

- [ ] Mobile layout + bottom navigation
- [ ] **Recipes:** list, search, filter by meal type, recipe details
- [ ] **Settings:** profiles (name, kcal, number of meals, % split)
- [ ] **Weekly planner:**
  - [ ] days × meals grid
  - [ ] manual recipe selection and swapping
  - [ ] auto-fill the week (matching meal type, few repeats, recipes that scale well)
  - [ ] "cook once, eat for 2 days" for multi-serving recipes
- [ ] **Day view:** meals with portions for each person, "per plate" / "to cook" toggle, total kcal and macros
- [ ] **Shopping list:** pick a range of days, weights by section, check-off
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
