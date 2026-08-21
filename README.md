# Marge

Plateforme de blog où les lecteurs proposent des modifications aux articles, que
l'auteur accepte ou refuse — comme des épreuves d'imprimerie annotées dans la
marge, pas comme Git. **L'unité de contribution est le bloc, pas la ligne.**

Next.js 15 · TypeScript · Supabase (Postgres, Auth, RLS, Realtime) · Tailwind v4 ·
Tiptap · framer-motion · Zod.

## Démarrage

```bash
npm install
cp .env.example .env.local      # puis renseigner les clés Supabase
node scripts/apply-migrations.mjs   # schéma + RLS + fonctions
node scripts/seed.mjs               # article de démo + 2 suggestions
npm run dev                     # http://localhost:4321
```

## Documentation

- [`SETUP.md`](SETUP.md) — configuration Supabase + OAuth pas à pas
- [`docs/PROJET.md`](docs/PROJET.md) — architecture, modèle de données, RLS, flux, tests
- [`CLAUDE.md`](CLAUDE.md) — conventions et pièges du dépôt

## Scripts

```bash
npm run build && npm start          # production locale
npm run test                        # tests unitaires (diff, périmé)
node scripts/test-accept.mjs        # tests d'intégration accept_suggestion
node scripts/reassign-demo.mjs <email>   # devenir auteur de l'article de démo
```


## Tests

`npm run test` (60 tests : diff, périmé, révisions, RSS, recherche, focus, mentions, import Markdown) et
`node scripts/test-accept.mjs` (9 assertions : acceptation atomique, autorisation,
anti-périmé, concurrence).
