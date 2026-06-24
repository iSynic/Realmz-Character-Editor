# Realmz Character Editor

A static web editor for standalone Realmz character files.

The editor opens the 872-byte character files used by Realmz, lets you change the parts of the character record that are practical to edit, validates the result, and downloads a new 872-byte file. Everything happens in the browser. There is no server upload step and no backend.

The live build is here: https://isynic.github.io/Realmz-Character-Editor/

## What It Can Edit

- Identity, race, caste, gender, age, and native-style level ups.
- Base stats, combat stats, movement, stamina, spell points, money, saves, counters, and victory points.
- Spell selections, gated by the character's caste progression and current level.
- Conditions, including a conservative "Clear Bad Effects" action.
- Special abilities and success percentage fields.
- Inventory, item identity, charges, item previews, load recalculation, and equipment cleanup when items are removed.
- Portrait and combat icon selection using extracted Realmz assets.

## File Handling

The app accepts only exact 872-byte Realmz character files in the supported character format. It parses the packed native record, preserves raw bytes that the editor does not own, refreshes the Realmz verification fields after edits, and disables download when blocking validation errors remain.

Downloaded files are named from the character's internal name. The app does not edit parties, saved games, scenarios, or Realmz installation files.

## Development

Install dependencies and start Vite:

```powershell
npm ci
npm run dev
```

Some tests use real character fixtures from a local Realmz checkout. By default the project looks for `F:\Realmz`; set `REALMZ_ROOT` to point somewhere else. Fixture-dependent tests skip cleanly when those files are not available.

## GitHub Pages

This repository deploys through GitHub Actions Pages. Repository Settings -> Pages should use `GitHub Actions` as the source.

The Vite base path is configured for project Pages:

```text
/Realmz-Character-Editor/
```

If the project moves to a custom domain, change the Vite `base` setting back to `/`. Do not commit `dist`; the deploy workflow builds it.

## Realmz Material

Generated metadata and assets are derived from Realmz game resources. See `NOTICE.md` for attribution and license notes.
