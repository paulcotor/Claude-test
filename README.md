# ⛵ Corabia Piratului

Joc puzzle pentru copii (~5-7 ani) inspirat dintr-un challenge desenat în nisip:
copilul alege punctul de pornire al corabiei astfel încât, după ce e împins de
curenții de vânt, să aterizeze pe insula cu comoară.

## Cum se joacă

1. Copilul vede mai multe râuri paralele cu săgeți care arată direcția vântului.
2. Trebuie să apese pe căsuța de pe malul de jos de unde să pornească corabia.
3. Apasă **🚀 PORNEȘTE** — corabia urcă rând cu rând și e împinsă lateral de
   fiecare curent.
4. Dacă ajunge pe insula cu palmier 🏝️, câștigă! Dacă nu, vede traseul și
   reîncearcă.

## Mecanici

- `➤`  curent simplu (împinge 1 căsuță)
- `➤➤` curent puternic (împinge 2)
- `➤➤➤` curent foarte puternic (împinge 3)
- `·`  apă liniștită (nu te mișcă)
- 🪨  stâncă (nu poți ateriza pe ea)

## Funcționalități

- **12 niveluri** cu progresie graduală (introduc câte o mecanică nouă)
- **Editor** unde copilul își creează propriile hărți
- **Sistem de stele** ⭐⭐⭐ (3 stele = rezolvat din prima încercare)
- **Salvare progres** în `localStorage` (nimic nu se pierde)
- **Sunete generate** (Web Audio API — fără fișiere)
- **Confetti** la victorie 🎉
- **Mod fantomă** la eșec — vede unde a ajuns
- **Touch + mouse** — funcționează pe tabletă, telefon, laptop

## Cum se rulează

Zero build, zero instalare. Două variante:

### Direct din browser
Deschide `index.html` în Chrome / Safari / Firefox.

### Cu un server local (recomandat — module JS au nevoie de HTTP)
```bash
npx http-server -p 8080
# sau
python3 -m http.server 8080
```
Apoi deschide `http://localhost:8080/`.

## Structură

```
.
├── index.html          # ecranul principal
├── style.css           # stiluri + animații
└── js/
    ├── main.js         # routing + glue logic
    ├── game.js         # simulator pentru mișcarea corabiei
    ├── render.js       # desenare grid + animație ship
    ├── levels.js       # cele 12 niveluri predefinite
    ├── editor.js       # editor de niveluri custom
    ├── storage.js      # localStorage (progres + hărți custom)
    └── audio.js        # sunete generate procedural
```

## Pentru părinți

- Țineți apăsat lung (1.2s) pe o hartă custom pentru a o șterge.
- Progresul e salvat per-browser. Nu există cont, nu există date trimise.
- Codul e pur HTML/CSS/JS — copilul mai mare poate explora și modifica.
