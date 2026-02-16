import PageTemplate, { generateMetadata } from './[slug]/page'

// force-dynamic: home uses Payload; build runs without MongoDB
export const dynamic = 'force-dynamic'

export default PageTemplate

export { generateMetadata }
