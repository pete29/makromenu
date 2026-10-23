# Roadmapa

Apka do układania tygodniowego jadłospisu z bazy przepisów. Plan jest wspólny dla dwóch osób, a porcje są przeliczane pod kaloryczność każdej z nich. Z planu generuje się lista zakupów.

**Stack:** React + Vite + TypeScript, Tailwind CSS 4, Dexie (IndexedDB), vite-plugin-pwa, Vitest. Hosting na Vercelu albo GitHub Pages.

Legenda: `[x]` zrobione · `[~]` w trakcie · `[ ]` do zrobienia

## Ustalenia

**Użytkownicy i cel**
- Prywatny użytek: ja i moja dziewczyna. Projekt idzie też na GitHuba jako portfolio.
- Inspiracja: Respo, ale własna implementacja.

**Platforma**
- iPhone przez **PWA** („Dodaj do ekranu początkowego”), bez App Store'a.
- Dlaczego nie natywnie (Expo/React Native): pracuję na Windowsie. Mac szwagra by wystarczył (Xcode), ale na darmowym koncie Apple podpis apki wygasa po 7 dniach, a konto deweloperskie kosztuje 99 $ rocznie. PWA jest darmowe, działa na stałe i daje klikalne demo do portfolio.
- Logika (przeliczanie, lista zakupów) jest w czystym TS, więc w razie czego da się ją przenieść do Expo.

**Model planu**
- **Jeden wspólny jadłospis** dla obu osób, ale **każda ma swoją kaloryczność**. Gotujemy raz, a każde nakłada swoją porcję.
- Domyślnie 1500 kcal dziennie. Cel kcal i liczba posiłków są konfigurowalne dla każdej osoby.
- Przy dużej różnicy kalorii, gdy przepis nie rozciąga się sensownie dla obu, apka proponuje np. dodatkową przekąskę zamiast skalować obiad ×2.

**Kalorie i porcje**
- Kalorie wynikają z gramatury składników, a gramatury skalują się pod cel kcal.
- „Zachować sens”: limity skalowania, zaokrąglanie sztuk i gramów, przyprawy się nie skalują.
- W PDF-ie przy `porcje: N` składniki są podane na cały przepis, a kcal i makro na jedną porcję.

**Przepisy**
- Źródło: `Przepisy.pdf` (99 przepisów z planów od dietetyka).
- **Sekcje z PDF-a (śniadania/obiady/kolacje/przekąski) ignorujemy**, bo są ułożone na rympał. Typ posiłku przypisujemy według tego, czym danie faktycznie jest. Jeden przepis może pasować do kilku posiłków, np. zupa na obiad albo na kolację.
- Godziny z PDF-a (np. 7:00–10:00) pomijamy.
- **Przepisy nie trafiają do publicznego repo** (prawa autorskie dietetyka). W repo jest kod i kilka przykładowych przepisów, a prawdziwa baza jest w pliku z `.gitignore`.

**Lista zakupów**
- Wybieram zakres dni i dostaję łączne gramatury dla obu osób, pogrupowane po działach sklepu.
- Później: przeliczanie na opakowania („2 × kostka masła 200 g”).

**Sposób pracy**
- Commit po każdym kroku, żeby zmiany były widoczne w Source Control.

---

## Faza 0: Setup projektu

- [x] Szkielet Vite (React + TS)
- [x] Zależności: dexie, dexie-react-hooks, vite-plugin-pwa, vitest
- [x] Nazwa apki: **Makromenu**
- [ ] Zmiana nazwy folderu `jadlospis` → `makromenu` (ręcznie, przy zamkniętym VS Code)
- [x] `git init`, `.gitignore` (w tym prywatne dane z przepisami), pierwszy commit
- [ ] Repo na GitHubie
- [x] Wyczyszczenie domyślnego szablonu Vite
- [x] Tailwind CSS 4 (`@tailwindcss/vite`)

## Faza 1: Import przepisów z PDF

- [x] Wyciągnięcie tekstu z PDF-a (`pdftotext -enc UTF-8 -layout`; bez `-enc UTF-8` na Windowsie znikają polskie znaki)
- [x] Parser [scripts/import-pdf.mjs](scripts/import-pdf.mjs): tekst → JSON (99/99 przepisów, 1005 składników)
  - [x] nazwa, kcal, B/W/T, czas, liczba porcji
  - [x] składniki: gramatura + miara domowa („2 sztuki (140 g)”)
  - [x] grupy składników (Sos, Sałatka, Do podania…)
  - [x] kroki przygotowania
  - [x] gramatura przeniesiona do następnej linii („Mięso z piersi kurczaka –” / „250 g”)
  - [x] nazwa składnika w jednej linii, „– 120 g” w następnej
  - [x] „Rosół”, który ma kcal w innym miejscu niż reszta (cel: 99/99 przepisów)
  - [x] składniki wklejone w PDF-ie w środek kroku (przenoszone do składników z ostrzeżeniem)
  - [x] nagłówek grupy rozbity na dwie linie („Do” / „podania”)
  - [x] zero ostrzeżeń parsera
- [ ] Dane prywatne w `data/recipes.local.json` (poza gitem)
- [ ] Kilka przykładowych przepisów w repo, żeby demo działało bez prywatnych danych
- [ ] Przypisanie typów posiłków według dania, nie według sekcji w PDF-ie (przepis może mieć kilka typów, np. zupa = obiad lub kolacja)
- [ ] Ręczny przegląd wyniku

## Faza 2: Baza składników

- [x] Lista unikalnych składników (210) i ujednolicenie duplikatów: mapa `ALIASES` w parserze (scalamy tylko produkty o tych samych wartościach odżywczych)
- [ ] Wartości na 100 g: kcal, białko, tłuszcz, węglowodany
- [ ] Waga sztuki dla składników liczonych w sztukach (jajko, kromka, tortilla, ząbek)
- [ ] Flaga „nie skaluj” (sól, pieprz, przyprawy, woda)
- [ ] Dział sklepowy (warzywa, nabiał, mięso, suche, przyprawy…)
- [ ] Kontrola jakości: kcal wyliczone ze składników vs kcal z PDF-a (odchyłka ±10%)

## Faza 3: Silnik przeliczania (czysty TS + testy)

- [ ] Profil osoby: cel kcal (domyślnie 1500), liczba posiłków, podział procentowy na posiłki
- [ ] Przy dużej różnicy kcal między osobami: dodatkowa przekąska zamiast skrajnego skalowania
- [ ] Cel kcal posiłku = cel dzienny × udział posiłku
- [ ] Współczynnik skalowania = cel posiłku ÷ kcal porcji (z uwzględnieniem `porcje: N`)
- [ ] Reguły „zdrowego rozsądku”:
  - [ ] limit skalowania (np. 0,6–1,6×), poza nim sugestia innego przepisu lub przekąski
  - [ ] sztuki zaokrąglane do całości lub połówek
  - [ ] składniki „nie skaluj” bez zmian
  - [ ] gramy zaokrąglane do 5 lub 10 g
  - [ ] przeliczenie realnych kcal po zaokrągleniach i pokazanie różnicy od celu
- [ ] Porcje dla dwóch osób z jednego przepisu: „na talerz” dla każdej osoby + „do ugotowania” razem
- [ ] Podsumowanie dnia: kcal i makro dla każdej osoby
- [ ] Lista zakupów: suma gramatur z wybranego zakresu dni dla obu osób, pogrupowana po działach
- [ ] Testy jednostkowe (Vitest)

## Faza 4: Warstwa danych w apce

- [ ] Schemat Dexie: `ingredients`, `recipes`, `profiles`, `mealPlan`, `shoppingChecks`
- [ ] Import przepisów i składników z JSON-a przy pierwszym uruchomieniu
- [ ] Eksport/import backupu do pliku

## Faza 5: Interfejs

- [ ] Layout mobilny + dolna nawigacja
- [ ] **Przepisy:** lista, wyszukiwarka, filtr po typie posiłku, szczegóły przepisu
- [ ] **Ustawienia:** profile (imię, kcal, liczba posiłków, podział %)
- [ ] **Planer tygodnia:**
  - [ ] siatka dni × posiłki
  - [ ] ręczny wybór i zamiana przepisu
  - [ ] automatyczne wypełnienie tygodnia (pasujący typ posiłku, mało powtórzeń, przepisy, które dobrze się skalują)
  - [ ] „ugotuj raz, jedz 2 dni” dla przepisów wieloporcjowych
- [ ] **Widok dnia:** posiłki z porcjami dla każdej osoby, przełącznik „na talerz” / „do ugotowania”, suma kcal i makro
- [ ] **Lista zakupów:** wybór zakresu dni, gramatury po działach, odhaczanie
- [ ] Lista zakupów: przeliczanie na opakowania (później)

## Faza 6: PWA i wdrożenie

- [ ] Manifest, ikony, kolor motywu
- [ ] Działanie offline (service worker)
- [ ] Deploy na Vercel lub GitHub Pages
- [ ] Test na iPhonie: „Dodaj do ekranu początkowego”

## Faza 7: Synchronizacja (opcjonalnie)

- [ ] Supabase: wspólny plan i lista zakupów na dwóch telefonach
- [ ] Logowanie (magic link)
- [ ] Rozwiązywanie konfliktów (ostatni zapis wygrywa)

## Faza 8: Portfolio

- [ ] README: opis, zrzuty ekranu, link do demo, jak działa przeliczanie
- [ ] GitHub Actions: lint + testy + build
- [ ] Demo na przykładowych przepisach
