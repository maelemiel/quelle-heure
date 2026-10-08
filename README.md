# QuelleHeure™

Site parodique « troll mais sérieux » : on paie pour connaître l'heure.

## Concept

- 1,00 € l'heure, 1,00 € les minutes, 1,00 € les secondes
- Pack Intégral H + M + S : 2,50 € (au lieu de 3,00 €)
- Ville au choix : 1,00 €. Sinon : roulette animée sur tous les fuseaux horaires IANA
- L'heure achetée est figée à l'instant de l'achat. L'actualiser coûte 2,50 €
- Achats persistés en localStorage, aucune donnée envoyée nulle part

## Lancer (mode démo)

```bash
python3 -m http.server 8123
# http://127.0.0.1:8123
```

Ou double-clic sur `index.html` (aucune dépendance, aucun build).

## Structure

- `index.html` : page unique (hero, tarifs, coffre, avis, FAQ)
- `style.css` : thème navy/or, serif horloger
- `app.js` : état, coffre, roulette, checkout démo, autocomplétion ville
- `config.js` : prix + Stripe Payment Links

## Paiements réels (Stripe Payment Links, ~5 min)

1. Dashboard Stripe > Payment Links : créer 5 liens (heure 1 €, minutes 1 €, secondes 1 €, pack 2,50 €, ville 1 €)
2. Sur chaque lien, « After payment » > Redirect vers `https://VOTRE_DOMAINE/?unlock=hour|minutes|seconds|pack|city`
3. Coller les 5 URLs dans `config.js` et passer `demo` à `false`

Le déverrouillage se fait au retour via le paramètre `?unlock=`. Le lien `pack` sert aussi au bouton « Actualiser l'heure ».

## Déploiement

Statique, sans build : Vercel, Netlify, GitHub Pages ou nginx.

## Accessibilité

- Contrastes vérifiés avec l'outil RGAA : or sur fond 9,82:1 (AAA), texte secondaire 8,72:1 (AAA), texte sur bouton or 9,41:1 (AAA)
- `prefers-reduced-motion` respecté (roulette instantanée, horloge figée)
- Navigation clavier complète, focus visibles, `aria-live` (roulette, toasts), dialogues `aria-modal`
- Combobox ville : rôles listbox/option, flèches, Entrée, Échap

## Avertissement

Parodie. En mode démo, aucun paiement réel n'est traité et aucune donnée n'est collectée.
