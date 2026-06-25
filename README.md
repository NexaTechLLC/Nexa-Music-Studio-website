# NEXAStudios™ Music Website

A modern Next.js website for NEXAStudios™ Music. The existing HTML/CSS/JS pages are served through Next.js pages, and the admin/media APIs run through App Router API routes.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Vercel deployment

Connect this GitHub repository in Vercel and use the default Next.js settings:

- Framework preset: `Next.js`
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `.next`

The project no longer uses a custom root `server.js`; Next.js handles pages, `/api/*`, and `/media/*`.

Set these Vercel environment variables for admin bootstrap:

```bash
ADMIN_EMAIL=nexastudiosmusic@gmail.com
ADMIN_PASSWORD=<admin password>
ADMIN_EMAILS=nexastudiosmusic@gmail.com
```

Runtime uploads use `/tmp/nexa-storage` on Vercel so serverless functions do not crash on filesystem writes. `/tmp` is not durable storage; use Vercel Blob or another external storage service before relying on admin-uploaded audio/video as permanent production media.
