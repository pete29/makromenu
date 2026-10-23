# Makromenu

A weekly meal planner for two people who eat the same meals but need different amounts. You plan one shared menu, and every recipe is scaled to each person's calorie target: one pot to cook, a different plate for each person. The plan turns into a shopping list.

The app is in Polish and runs on the phone as an installable PWA that works offline.

**Demo:** https://pete29.github.io/makromenu/ (with made-up sample recipes)

## What it does

- **Weekly planner.** Pick a recipe for each meal of the day or let the app fill the week: recipes matching the meal type, close to the calorie target, with no repeats on neighbouring days.
- **One pot, two plates.** For every meal the app shows what to cook for everyone together and what each person's plate is: share of the finished dish, kcal and macros, or ingredients for a plate assembled separately.
- **Calorie targets per person.** Each person has a daily target and a split across meals. A large gap between people is handled with an extra snack for one of them instead of an extreme portion.
- **Shopping list.** Sums ingredients over any range of days, grouped by store section, with check-off.
- **Recipes.** Imported from a JSON file, searchable by name or ingredient, filterable by meal type.
- **Offline and private.** All data stays in the browser (IndexedDB). Backup and restore through a file.

## How scaling works

Recipes come with kcal and macros per serving. Calories are linear in ingredient weights, so a person's portion factor is simply their meal target divided by the recipe's kcal per serving. The pot is cooked for the sum of everyone's factors and split by share.

Common-sense rules keep portions practical:

- household units are rounded to halves (glasses to quarters) and never to zero,
- grams are rounded to 1, 5 or 10 g depending on size,
- pinches of salt and pepper are not scaled,
- portions outside 0.6–1.6× of a serving are flagged,
- plates are rounded one by one and the last plate gets the remainder, so they add up to the pot.

Meal targets are relative to the person's full day (e.g. breakfast 30%, lunch 35%, snack 10%, dinner 25%), so they don't change while a day is being planned, and a complete day adds up exactly to the daily target.

## Recipes and privacy

The recipes I use come from a dietitian and are not part of this repository. The app ships with a few made-up sample recipes; real ones are imported in Settings from a JSON file. `scripts/import-pdf.mjs` turns the text of a recipe PDF (`pdftotext -enc UTF-8 -layout`) into that JSON.

## Stack

React 19, TypeScript, Vite, Tailwind CSS 4, Dexie (IndexedDB), vite-plugin-pwa, Vitest. Deployed to GitHub Pages by GitHub Actions after lint, tests and build pass.

The scaling and planning logic lives in [`src/engine`](src/engine) as plain TypeScript with unit tests, independent of React.

## Development

```sh
npm install
npm run dev      # http://localhost:5173
npm test
npm run lint
npm run build    # production build with service worker
npm run preview  # http://localhost:4173/makromenu/
```

See [ROADMAP.md](ROADMAP.md) for decisions and progress.
