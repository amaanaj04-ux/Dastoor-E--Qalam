# Dastoor-E-Qalam

A static shop website for **customised Arabic calligraphy** — frames, keychains, and bookmarks. Built for [GitHub Pages](https://pages.github.com/).

## Features

- Elegant catalogue with category filters (Frames, Keychains, Bookmarks)
- Each product shows a **label** (name) and **price** in Rs.
- **Owner-only admin** — sign in with Google; only `amaanaj04@gmail.com` can add, edit, or remove products
- Edit label and price from product cards or the full admin form
- Export / import catalogue as JSON for backup and deployment

## Quick start (local)

1. Open `index.html` in a browser, or run:

   ```bash
   npx serve .
   ```

2. Visitors can browse the shop immediately. Admin editing requires Google sign-in setup (below).

## Deploy on GitHub

1. Create a repository named **`Dastoor-E-Qalam`** on GitHub.
2. Upload everything in this folder to the repository root.
3. Go to **Settings → Pages**:
   - **Source:** Deploy from a branch
   - **Branch:** `main` → `/ (root)`
4. Your site will be live at:

   `https://YOUR_USERNAME.github.io/Dastoor-E-Qalam/`

## Google sign-in setup (required for admin)

Only **amaanaj04@gmail.com** can manage the catalogue. You need a free Google OAuth Client ID:

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (e.g. `Dastoor-E-Qalam`).
3. **APIs & Services → OAuth consent screen** — choose **External**, add your email as a test user if the app is in testing mode.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** (add both):
     - `http://localhost` (and `http://localhost:3000` if you use `npx serve`)
     - `https://YOUR_USERNAME.github.io`
   - No redirect URI needed for this sign-in button flow.
5. Copy the **Client ID** and paste it in `config.js`:

   ```js
   window.DASTOOR_CONFIG = {
     GOOGLE_CLIENT_ID: "123456789-xxxx.apps.googleusercontent.com"
   };
   ```

6. Commit and push. Sign in via **Owner sign in** in the site navigation.

> The Client ID is public in the browser; security comes from Google verifying the account and this site only accepting `amaanaj04@gmail.com`.

## Managing products (owner)

1. Click **Owner sign in** and sign in with `amaanaj04@gmail.com`.
2. Open **Manage catalogue → Add product** to add items (label, category, price, photo).
3. On any product card, use **Edit label & price** for quick updates, or double-click a card to open the full edit form.
4. Use **Export catalogue** to download JSON before switching browsers.
5. After exporting on your machine, you can **Import catalogue** on another device, or ship the JSON with your site if you later add a shared data file.

### Note on GitHub Pages visitors

Products are stored in **each visitor’s browser** (localStorage). Export your final catalogue from your admin session and keep the JSON safe. For a single catalogue visible to all visitors without a backend, you would need to embed products in a `catalogue.json` file — contact the developer if you want that upgrade.

## Files

| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `styles.css` | Styling |
| `script.js` | Catalogue and Google-gated admin |
| `config.js` | Google OAuth Client ID |
| `config.example.js` | Template for `config.js` |

No build step required — ideal for GitHub Pages.

## Licence

© Dastoor-E-Qalam. All rights reserved.
