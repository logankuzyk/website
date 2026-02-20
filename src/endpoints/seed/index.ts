import type { CollectionSlug, GlobalSlug, Payload, PayloadRequest } from 'payload'

import { contactForm as contactFormData } from './contact-form'
import { contact as contactPageData } from './contact-page'
import { home } from './home'
import { image1 } from './image-1'
import { image2 } from './image-2'
import { imageHero1 } from './image-hero-1'
import { post1 } from './post-1'
import { post2 } from './post-2'
import { post3 } from './post-3'

const collections: CollectionSlug[] = [
  'categories',
  'media',
  'pages',
  'posts',
  'projects',
  'career',
  'forms',
  'form-submissions',
  'search',
  'tags',
]

const globals: GlobalSlug[] = ['header', 'footer']

const categories = ['Technology', 'News', 'Finance', 'Design', 'Software', 'Engineering']

// Next.js revalidation errors are normal when seeding the database without a server running
// i.e. running `yarn seed` locally instead of using the admin UI within an active app
// The app is not running to revalidate the pages and so the API routes are not available
// These error messages can be ignored: `Error hitting revalidate route for...`
export const seed = async ({
  payload,
  req,
}: {
  payload: Payload
  req: PayloadRequest
}): Promise<void> => {
  payload.logger.info('Seeding database...')

  // we need to clear the media directory before seeding
  // as well as the collections and globals
  // this is because while `yarn seed` drops the database
  // the custom `/api/seed` endpoint does not
  payload.logger.info(`— Clearing collections and globals...`)

  // clear the database
  await Promise.all(
    globals.map((global) =>
      payload.updateGlobal({
        slug: global,
        data: {
          navItems: [],
        },
        depth: 0,
        context: {
          disableRevalidate: true,
        },
      }),
    ),
  )

  await Promise.all(
    collections
      .filter((c) => payload.collections[c])
      .map((collection) => payload.db.deleteMany({ collection, req, where: {} })),
  )


  await Promise.all(
    collections
      .filter((collection) => Boolean(payload.collections[collection].config.versions))
      .map((collection) => payload.db.deleteVersions({ collection, req, where: {} })),
  )

  payload.logger.info(`— Seeding author...`)

  await payload.delete({
    collection: 'users',
    depth: 0,
    where: {
      email: {
        equals: 'author@example.com',
      },
    },
    req,
  })

  payload.logger.info(`— Seeding media...`)

  const [image1Buffer, image2Buffer, image3Buffer, hero1Buffer] = await Promise.all([
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post1.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post2.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-post3.webp',
    ),
    fetchFileByURL(
      'https://raw.githubusercontent.com/payloadcms/payload/refs/heads/main/templates/website/src/endpoints/seed/image-hero1.webp',
    ),
  ])

  // Media creates must run sequentially - they share req.file which gets overwritten when parallel
  const demoAuthor = await payload.create({
    collection: 'users',
    data: {
      name: 'Author',
      email: 'author@example.com',
      password: 'password',
    },
    req,
  })

  const image1Doc = await payload.create({
    collection: 'media',
    data: image1,
    file: image1Buffer,
    req,
  })
  const image2Doc = await payload.create({
    collection: 'media',
    data: image2,
    file: image2Buffer,
    req,
  })
  const image3Doc = await payload.create({
    collection: 'media',
    data: image2,
    file: image3Buffer,
    req,
  })
  const imageHomeDoc = await payload.create({
    collection: 'media',
    data: imageHero1,
    file: hero1Buffer,
    req,
  })

  // Categories can run in parallel (no file upload)
  await Promise.all(
    categories.map((category) =>
      payload.create({
        collection: 'categories',
        data: { title: category, slug: category },
        req,
      }),
    ),
  )

  payload.logger.info(`— Seeding posts...`)

  // Do not create posts with `Promise.all` because we want the posts to be created in order
  // This way we can sort them by `createdAt` or `publishedAt` and they will be in the expected order
  const post1Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    context: { disableRevalidate: true },
    data: post1({ heroImage: image1Doc, blockImage: image2Doc, author: demoAuthor }),
    req,
  })

  const post2Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    context: { disableRevalidate: true },
    data: post2({ heroImage: image2Doc, blockImage: image3Doc, author: demoAuthor }),
    req,
  })

  const post3Doc = await payload.create({
    collection: 'posts',
    depth: 0,
    context: { disableRevalidate: true },
    data: post3({ heroImage: image3Doc, blockImage: image1Doc, author: demoAuthor }),
    req,
  })

  await payload.update({
    id: post1Doc.id,
    collection: 'posts',
    data: { relatedPosts: [post2Doc.id, post3Doc.id] },
    req,
  })
  await payload.update({
    id: post2Doc.id,
    collection: 'posts',
    data: { relatedPosts: [post1Doc.id, post3Doc.id] },
    req,
  })
  await payload.update({
    id: post3Doc.id,
    collection: 'posts',
    data: { relatedPosts: [post1Doc.id, post2Doc.id] },
    req,
  })

  payload.logger.info(`— Seeding contact form...`)

  const contactForm = await payload.create({
    collection: 'forms',
    depth: 0,
    data: contactFormData,
    req,
  })

  payload.logger.info(`— Creating tags...`)

  const [tagLandscape, tagNature, tagPortrait] = await Promise.all([
    payload.create({
      collection: 'tags',
      data: { name: 'Landscape', slug: 'landscape' },
      depth: 0,
      draft: false,
      req,
    }),
    payload.create({
      collection: 'tags',
      data: { name: 'Nature', slug: 'nature' },
      depth: 0,
      draft: false,
      req,
    }),
    payload.create({
      collection: 'tags',
      data: { name: 'Portrait', slug: 'portrait' },
      depth: 0,
      draft: false,
      req,
    }),
  ])

  payload.logger.info(`— Creating photos folder...`)

  const photosFolder = await payload.create({
    collection: 'payload-folders',
    depth: 0,
    data: { name: 'photos', folderType: ['media'] },
    req,
  })

  await payload.update({
    collection: 'media',
    id: image1Doc.id,
    data: { folder: photosFolder.id, displayOrder: 0, tags: [tagLandscape.id, tagNature.id] },
    req,
  })
  await payload.update({
    collection: 'media',
    id: image2Doc.id,
    data: { folder: photosFolder.id, displayOrder: 1, tags: [tagNature.id] },
    req,
  })
  await payload.update({
    collection: 'media',
    id: image3Doc.id,
    data: { folder: photosFolder.id, displayOrder: 2, tags: [tagLandscape.id, tagPortrait.id] },
    req,
  })

  payload.logger.info(`— Seeding projects and career...`)

  await payload.create({
    collection: 'projects',
    depth: 0,
    context: { disableRevalidate: true },
    req,
    data: {
      _status: 'published',
      title: 'Sample Project',
      slug: 'sample-project',
      description: 'A sample project. Add your own projects in the admin.',
      featuredImage: image1Doc.id,
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Replace this with your project content.',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              textFormat: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      displayOrder: 0,
    },
  })

  await payload.create({
    collection: 'career',
    depth: 0,
    context: { disableRevalidate: true },
    req,
    data: {
      _status: 'published',
      jobTitle: 'Job Title',
      company: 'Company Name',
      startDate: '2024-01-01',
      endDate: null,
      description: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [
                {
                  type: 'text',
                  detail: 0,
                  format: 0,
                  mode: 'normal',
                  style: '',
                  text: 'Add your role description here.',
                  version: 1,
                },
              ],
              direction: 'ltr',
              format: '',
              indent: 0,
              textFormat: 0,
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      },
      displayOrder: 0,
    },
  })

  payload.logger.info(`— Seeding pages...`)

  const [contactPage, , photosPage] = await Promise.all([
    payload.create({
      collection: 'pages',
      depth: 0,
      data: contactPageData({ contactForm: contactForm }),
      req,
    }),
    payload.create({
      collection: 'pages',
      depth: 0,
      data: {
        slug: 'career',
        title: 'Career',
        template: 'career',
        hero: { type: 'none' },
        _status: 'published',
        layout: [],
        meta: { title: 'Career', description: 'Professional experience and work history' },
      },
      req,
    }),
    payload.create({
      collection: 'pages',
      depth: 0,
      data: {
        slug: 'photography',
        title: 'Photos',
        template: 'photos',
        photosFolder: photosFolder.id,
        photosTags: [tagLandscape.id, tagNature.id],
        hero: { type: 'none' },
        _status: 'published',
        layout: [],
        meta: { title: 'Photos', description: 'Photo gallery' },
      },
      req,
    }),
  ])

  await payload.create({
    collection: 'pages',
    depth: 0,
    data: home({
      heroImage: imageHomeDoc,
      metaImage: image2Doc,
      photosPageId: photosPage.id,
      photosPreviewItems: [
        { photoId: image1Doc.id, tagId: tagLandscape.id },
        { photoId: image2Doc.id, tagId: tagNature.id },
        { photoId: image3Doc.id, tagId: tagPortrait.id },
      ],
    }),
    req,
  })

  payload.logger.info(`— Seeding globals...`)

  await Promise.all([
    payload.updateGlobal({
      slug: 'header',
      context: { disableRevalidate: true },
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'Home',
              url: '/',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Career',
              url: '/career',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Projects',
              url: '/projects',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Photos',
              url: '/photography',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Posts',
              url: '/posts',
            },
          },
          {
            link: {
              type: 'reference',
              label: 'Contact',
              reference: {
                relationTo: 'pages',
                value: contactPage.id,
              },
            },
          },
        ],
      },
    }),
    payload.updateGlobal({
      slug: 'footer',
      context: { disableRevalidate: true },
      data: {
        navItems: [
          {
            link: {
              type: 'custom',
              label: 'Home',
              url: '/',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Career',
              url: '/career',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Projects',
              url: '/projects',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Photos',
              url: '/photography',
            },
          },
          {
            link: {
              type: 'custom',
              label: 'Admin',
              url: '/admin',
            },
          },
        ],
      },
    }),
  ])

  payload.logger.info('Seeded database successfully!')
}

async function fetchFileByURL(url: string): Promise<{ name: string; data: Buffer; mimetype: string; size: number }> {
  const res = await fetch(url, {
    credentials: 'include',
    method: 'GET',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch file from ${url}, status: ${res.status}`)
  }

  const data = await res.arrayBuffer()
  const ext = url.split('.').pop() || 'webp'
  const mimetype = ext === 'webp' ? 'image/webp' : `image/${ext}`

  return {
    name: url.split('/').pop() || `file-${Date.now()}`,
    data: Buffer.from(data),
    mimetype,
    size: data.byteLength,
  }
}
