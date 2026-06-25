# NEXAStudios™ Music Website

A modern Next.js website for NEXAStudios™ Music. The existing HTML/CSS/JS pages are served through Next.js route handlers, and the admin/media APIs run through App Router API routes.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Hostinger / Next.js deployment

Use these commands in the hosting panel:

```bash
npm install
npm run build
npm start
```

The project no longer uses a custom root `server.js`; Next.js handles pages, `/api/*`, and `/media/*`. The repo includes a conventional `pages/index.js` entry so hosting providers can detect it as a standard Next.js project.
