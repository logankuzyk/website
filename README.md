# Logan Kuzyk Website

Personal website built with [Payload CMS](https://payloadcms.com) and [Next.js](https://nextjs.org). Includes a blog, projects, career timeline, photo gallery, and contact form.

## Tech Stack

- **CMS**: Payload CMS 3.x
- **Database**: MongoDB
- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui
- **Media**: Local storage (`public/media`) or Cloudflare R2 when configured

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Docker)

### Development

1. Clone the repo and install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables and configure:

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your `DATABASE_URL`, `PAYLOAD_SECRET`, and `NEXT_PUBLIC_SERVER_URL`.

3. Start MongoDB (if using Docker):

   ```bash
   docker compose up mongo -d
   ```

4. Run the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000). Use the admin panel at `/admin` to create your first user and manage content.

### Seed Database

To populate the site with sample content, use the "Seed database" link in the admin panel (or hit `/api/seed`). This **replaces all existing data** with generic placeholder content.

## Project Structure

| Path | Description |
|------|-------------|
| `src/collections/` | Payload collections (Pages, Posts, Media, Career, Projects, Tags, etc.) |
| `src/heros/` | Hero components (Landing, High/Medium/Low Impact) |
| `src/blocks/` | Layout blocks (Content, Media, CallToAction, Archive, Form) |
| `src/app/(frontend)/` | Next.js pages and routes |
| `src/components/` | React components |

## Features

- **Pages**: Flexible layouts with hero types (Landing, High/Medium/Low Impact), block-based content, and templates (Default, Career, Photos)
- **Posts**: Blog with categories, related posts, and rich content
- **Projects**: Project showcase with grid layout
- **Career**: Timeline of work experience
- **Photos**: Masonry gallery with folder/tag filtering and fullscreen carousel
- **Drafts & Live Preview**: Preview content before publishing
- **SEO**: Meta titles, descriptions, and Open Graph images
- **Search**: Full-text search across posts
- **Redirects**: Manage URL redirects from the admin

## Environment & CMS Reference

See **[CMS.md](./CMS.md)** for environment variables and a full reference of collections, globals, and data structures.

## Production

1. Build:

   ```bash
   npm run build
   ```

2. Start:

   ```bash
   npm start
   ```

For production, ensure `DATABASE_URL` points to your MongoDB instance. Optionally configure [Cloudflare R2](https://developers.cloudflare.com/r2/) for media storage by setting `R2_BUCKET` and related env vars.

## Docker

Run the full stack (MongoDB + app) with Docker:

```bash
docker compose --profile prod up
```

The compose file uses `.env` for configuration. See `docker-compose.yml` for service details.
