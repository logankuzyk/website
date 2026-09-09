# Environment & CMS Data Structures

This document describes the environment variables and Payload CMS data structures used in this project.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | MongoDB connection string. Local dev: `mongodb://127.0.0.1:27017/your-database-name`. Docker: `mongodb://mongo:27017/your-database-name` |
| `PAYLOAD_SECRET` | Yes | Used to encrypt JWT tokens. Generate a secure random string. |
| `NEXT_PUBLIC_SERVER_URL` | Yes | Canonical base URL for the site (no trailing slash). e.g. `http://localhost:3000` or `https://example.com`. In production, production builds issue a 301 from the alternate host (`www` vs apex) to this URL; set DNS for both hosts to point at the app. |
| `CRON_SECRET` | No | Authenticates cron jobs. Required for scheduled publish when running outside admin. |
| `PREVIEW_SECRET` | No | Validates draft preview requests. |
| `R2_BUCKET` | No | When set, media uploads go to Cloudflare R2 instead of local storage. |
| `R2_ACCESS_KEY_ID` | No | R2 access key (required if R2_BUCKET is set). |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key (required if R2_BUCKET is set). |
| `R2_ENDPOINT` | No | R2 endpoint URL. Format: `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_REGION` | No | Typically `auto` for R2. |
| `STORAGE_URL` | No | Public URL for R2 (e.g. `https://media.example.com`). No trailing slash. |
| `NEXT_PUBLIC_STORAGE_URL` | No | Same as `STORAGE_URL`. Exposed to the browser so images load directly from the CDN instead of proxying through Next.js. |

### Storage Behavior

- **Without R2**: Uploads are stored locally in `public/media`. Files are served at `/media/...`.
- **With R2**: When `R2_BUCKET` is set, the S3 storage plugin is enabled and uploads go to Cloudflare R2. Local storage is disabled.

---

## Collections

### Pages

Slug: `pages` · Drafts: Yes · Versions: 50

| Field | Type | Description |
|-------|------|-------------|
| title | text | Page title (required) |
| hero | group | Hero section (type, content, media) |
| hero.type | select | `none`, `landing`, `highImpact`, `mediumImpact`, `lowImpact` |
| hero.name | text | Name (Landing only) |
| hero.role | text | Role/title (Landing only) |
| hero.bio | textarea | Short bio (Landing only) |
| hero.profileImage | upload → media | Profile image (Landing only) |
| hero.scrollLink | link | Scroll link below hero (Landing only) |
| hero.richText | richText | Hero content (non-Landing) |
| hero.media | upload → media | Hero image (High/Medium Impact) |
| hero.links | linkGroup | CTA links (non-Landing) |
| template | select | `default`, `career`, `photos` |
| photosFolder | relationship → payload-folders | Media folder for Photos template |
| photosTags | relationship → tags | Filter media by tags (Photos template) |
| layout | blocks | Content blocks (Default template only): CallToAction, Content, MediaBlock, Archive, FormBlock |
| publishedAt | date | Publication date |
| slug | text | URL slug (auto-generated) |
| meta | group | SEO: title, description, image |

### Posts

Slug: `posts` · Drafts: Yes · Versions: 50

| Field | Type | Description |
|-------|------|-------------|
| title | text | Post title (required) |
| heroImage | upload → media | Hero/banner image |
| content | richText | Main content (Lexical with Banner, Code, MediaBlock) |
| relatedPosts | relationship → posts | Related posts |
| categories | relationship → categories | Post categories |
| meta | group | SEO: title, description, image |
| slug | text | URL slug (auto-generated) |

### Media

Slug: `media` · Folders: Yes

| Field | Type | Description |
|-------|------|-------------|
| tags | relationship → tags | Tags for photo gallery filtering |
| displayOrder | number | Order in photos gallery (lower = earlier) |
| alt | text | Alt text for accessibility |
| caption | richText | Image caption |
| (upload) | — | File upload with focal point, image sizes: thumbnail, square, small, medium, large, xlarge, og |

**Image sizes**: thumbnail (300), square (500×500), small (600), medium (900), large (1400), xlarge (1920), og (1200×630).

**Image pipeline** (`src/collections/Photos.ts`):

- **Input**: any raster photo format is accepted, including AVIF and HEIC/HEIF. SVG is rejected. Max upload size is 75 MB (`config.upload.limits.fileSize` in `payload.config.ts`; a reverse proxy in front of the app needs a matching body limit).
  - **Decode depends on the Docker image's *system* libvips** (`Dockerfile` installs `vips`/`vips-heif` and builds `sharp` from source against it). The npm-bundled `sharp` binary can't decode 10-bit/HDR AVIF or HEVC HEIC. `payload.config.ts`'s `onInit` probes both at boot and logs `[media] cannot decode …` if the image is misbuilt; the `media` CI job builds the image and asserts the same.
  - **HEIC/HEIF is transcoded to JPEG on ingest** (`transcodeHeicUpload` `beforeOperation` hook) because Payload's `canResizeImage` skips those types — otherwise the file would be stored raw with no renditions. Trade-off: the stored "original" for a HEIC upload is the JPEG transcode (mozjpeg q92), not the source HEIC.
- **Conversion**: every aspect-preserving rendition (thumbnail…xlarge) is re-encoded to **WebP** (quality 70→82, rising with size). `og` is re-encoded to **progressive JPEG** for link-unfurler compatibility. Renditions are never upscaled past the source, so smaller uploads produce a sparse `sizes` set.
- **Original**: the uploaded file is stored untouched (JPEG/PNG/WebP/AVIF; HEIC becomes a JPEG per above) — it remains the archival copy and the source for the planned "download other formats" gallery feature. This relies on the upload config setting **neither** a top-level `formatOptions` **nor** `resizeOptions`; either one makes Payload re-run the original through `sharp` (re-encode + EXIF strip).
- **Undecodable uploads**: a `sharp` decode failure surfaces in the admin as a per-file error (drawer stays open) rather than a false "Successfully saved" — `config.hooks.afterError` (`fileUploadErrorResponse`) re-shapes Payload's bare `FileUploadError` into the field-error shape `@payloadcms/ui` BulkUpload counts.
- **Delivery**: `ImageMedia` builds a real `srcSet` from `sizes.*` even when images are served straight from the CDN (`NEXT_PUBLIC_STORAGE_URL`), via a Next.js image `loader` that maps each requested width to the closest rendition. Callers that render into a known box (e.g. `PhotoGrid` tiles) pass an explicit `size`. The rendition ladder is capped at `xlarge` (1920px WebP); only `priority` (LCP) images may fall back to the raw original, so a missing/inaccurate `size` can never silently serve a multi-MB file.
- **Backfill**: existing photos are reprocessed with `npm run reprocess:photos` (`-- --dry-run` / `-- --limit N` / `-- --force` / `-- --continue-on-error`). It re-downloads each original, has Payload rebuild `sizes.*`, then verifies every object resolves from storage before moving on and stops on the first failure. AVIF/HEIC sources decode slowly, so large batches take time. Run it against the local MinIO mock (`npm run dev:r2`) first and confirm bucket object counts before pointing it at R2.

### Categories

Slug: `categories`

| Field | Type | Description |
|-------|------|-------------|
| title | text | Category name (required) |
| slug | text | URL slug (auto-generated from title) |

Nested via Nested Docs plugin (e.g. News > Technology).

### Tags

Slug: `tags`

| Field | Type | Description |
|-------|------|-------------|
| name | text | Tag name (required) |
| slug | text | URL slug (auto-generated from name) |

Used for filtering media in photo galleries.

### Users

Slug: `users` · Auth: Yes

| Field | Type | Description |
|-------|------|-------------|
| name | text | Display name |
| email | text | Login email |
| password | — | Hashed (auth) |

### Projects

Slug: `projects` · Drafts: Yes · Versions: 50

| Field | Type | Description |
|-------|------|-------------|
| title | text | Project title (required) |
| description | text | Short summary for cards (required) |
| featuredImage | upload → media | Card thumbnail (required) |
| content | richText | Full project details |
| technologies | array | `{ technology: text }` |
| startDate | date | Project start |
| endDate | date | Project end |
| externalUrl | text | Optional external link |
| displayOrder | number | Sort order (lower = first) |
| slug | text | URL slug (auto-generated) |

### Career

Slug: `career` · Drafts: Yes · Versions: 50

| Field | Type | Description |
|-------|------|-------------|
| jobTitle | text | Job title (required) |
| company | text | Company name (required) |
| startDate | date | Start date (required) |
| endDate | date | End date (empty = current) |
| description | richText | Role description (required) |
| location | text | Location |
| logo | upload → media | Company logo |
| displayOrder | number | Timeline order (lower = higher) |

---

## Globals

### Header

Slug: `header`

| Field | Type | Description |
|-------|------|-------------|
| navItems | array | Nav links (max 6). Each: link (reference or custom URL), label, newTab |

### Footer

Slug: `footer`

| Field | Type | Description |
|-------|------|-------------|
| navItems | array | Footer links (max 6). Same structure as Header. |

---

## Layout Blocks (Pages, Posts)

| Block | Description |
|-------|-------------|
| CallToAction | CTA section with rich text and links |
| Content | Rich text block |
| MediaBlock | Single media item |
| Archive | Filterable archive of posts |
| FormBlock | Embedded form (Form Builder) |
| Banner | Info/warning banner (Posts content) |
| Code | Code snippet with syntax highlighting (Posts content) |

---

## Page Templates

| Template | Behavior |
|----------|----------|
| default | Renders layout blocks (CallToAction, Content, etc.) |
| career | Renders CareerTimeline with published career entries |
| photos | Renders PhotoGrid with individual photos (folder/tags) or photo collections |

---

## Plugin Collections

- **payload-folders**: Media folders (used by Media collection)
- **forms** / **form-submissions**: Form Builder plugin
- **redirects**: Redirects plugin
- **search**: Search plugin (posts)
