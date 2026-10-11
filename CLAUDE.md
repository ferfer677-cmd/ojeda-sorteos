# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Ojeda Sorteos": a raffle (sorteo) website in Spanish (Argentina). It is a static site in plain HTML, CSS and vanilla JS ES modules, with **no build step, no package.json, no tests and no linter**. Firebase (Firestore + Storage) is the only backend. The Firebase SDK v12.14.0 loads straight from `https://www.gstatic.com/firebasejs/12.14.0/...` inside each module. Keep that version the same in every file.

## Commands

- Run locally: serve the repo root over HTTP, because ES modules don't work from `file://`. For example `npx serve .`, `python -m http.server`, or `firebase serve`. Local runs use the **production** Firebase project. There is no emulator config.
- Deploy: `firebase deploy --only hosting`. The project is `ojeda-sorteos` (`.firebaserc`), and `firebase.json` publishes the repo root (`public: "."`). Every file in the root gets published, including the admin and utility pages.
- Cache busting: `index.html` links `style.css` and `script.js` without a version query string. A past commit ("Actualizar version CSS") used one, so add or bump `?v=` if users must see a CSS or JS change right away.

## Architecture

Each HTML page loads its own module. Everything shares `firebase.js`, which exports `db` and `storage`.

| Page | Module | Purpose |
|---|---|---|
| `index.html` | `script.js` | Public landing page: countdown, pack selection, promo codes, receipt upload, purchase form, live "someone bought" notifications, gallery, ranking |
| `admin.html` | `admin.js` | Admin panel: list, approve, edit and delete participants, assign raffle numbers, Excel export (SheetJS from CDN) |
| `consultar.html` | `consultar.js` | Participants look up their numbers by DNI |
| `afiliados.html` | `afiliados.js` | Affiliate (referrer) login and stats by DNI, checked against the `afiliados` collection |
| `afiliados-admin.html` | `afiliados-admin.js` | Admin view of affiliate commissions; marks them as paid |
| `mis-comisiones.html` | `mis-comisiones.js` | An affiliate's own commissions (`where("referido", "==", dni)`) |
| `detectar_comprobantes_duplicados.html` | inline module | Standalone tool that scans Storage `comprobantes/` for duplicate receipt files |

Helpers: `firestore.js` has `guardarParticipante()`, which defines the participant document shape. `storage.js` has `subirComprobante()`, a resumable upload to `comprobantes/<timestamp>_<name>` with a progress callback.

### Data model and purchase flow

1. **Purchase on `index.html`.** The buyer picks a pack (1/3/10/30/50/100 chances) and uploads a payment receipt to Storage. A doc is then added to the `participantes` collection with `estado: "Esperando"`, `dni` plus `dniNormalizado` (digits only), `pack`, `chancesBase`/`chancesFinales`, `codigoPromo`, `precioFinal`, `comprobanteURL`/`comprobantePath` and `referido` (the affiliate's DNI).
2. **Admin approval in `admin.js`.** The admin sets `estado: "Pagado"`, generates unique 6-digit `numeros`, and increments the `ranking/{dniNormalizado}` doc (`chances: increment(n)`, merge). Uniqueness works by reading **every** participant and collecting the used numbers on the client, so there is no transaction or server-side check.
3. **Affiliates.** `afiliados/{dni}` docs exist. Commissions are computed from `participantes` fields: `referido`, `comisionAfiliado` and `comisionPagada`. Nothing in the repo currently writes `comisionAfiliado`, so check how it is set before you rely on it.

### Business logic is duplicated

Pricing and pack logic are hardcoded in several places that are **not** in sync:
- `script.js`: `preciosNormales` / `preciosConDescuento` (keyword `PALABRA_DESCUENTO = "MITAD"`), plus the "ENTERO" secret-offer packs (20/50 chances) defined in `index.html` and handled in `script.js`.
- `admin.js`: `cantidadPorPack()` (parses chance counts out of the `pack` string) and `precioPorChances()`. These use different prices from `script.js`.

When you change packs or prices, update every location. `cantidadPorPack` matches substrings like `"10 CHANCE"`, so new pack labels must keep that format.

### Security notes

- Admin "auth" happens only on the client. `admin.js` checks a hardcoded password (`CONTRASENA_ADMIN`) and stores `localStorage.adminLogueado = "si"`. No Firebase Auth is used, and there are no Firestore/Storage rules files in the repo (rules are managed in the Firebase console).
- `index.html` includes a Meta Pixel snippet.

## Conventions

- All UI text, identifiers and comments are in Spanish. Code is split into sections with `// ====...` banner comments. Keep that style.
- `style.css` (about 4.5k lines) styles the public site. `admin.css` and `consultar.css` are page-specific. Some pages also include inline `<style>` blocks (for example the ENTERO offer at the end of `index.html`).
- `assets/` holds images. `Nueva carpeta/` is an empty leftover folder.
