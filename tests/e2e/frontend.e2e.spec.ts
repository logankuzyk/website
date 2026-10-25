import { test, expect, Page } from '@playwright/test'

test.describe('Frontend', () => {
  let page: Page

  test.beforeAll(async ({ browser }, testInfo) => {
    const context = await browser.newContext()
    page = await context.newPage()
  })

  test('can load homepage', async ({ page }) => {
    await page.goto('http://localhost:3000')
    await expect(page).toHaveTitle(/Logan Kuzyk/)
    const heading = page.locator('h1').first()
    await expect(heading).toHaveText('Logan Kuzyk')
  })
})

// Needs seeded data (`npm run seed`): the "Sample Project" has five tags, a live URL and a repo.
test.describe('Projects page', () => {
  const overlayShown = (card: ReturnType<Page['locator']>) =>
    expect(card.getByTestId('project-card-overlay')).toHaveCSS('opacity', '1')
  const overlayHidden = (card: ReturnType<Page['locator']>) =>
    expect(card.getByTestId('project-card-overlay')).toHaveCSS('opacity', '0')

  test('loads with the Projects banner heading', async ({ page }) => {
    await page.goto('http://localhost:3000/projects')
    await expect(page.locator('h1').first()).toHaveText('Projects')
    await expect(page.getByTestId('project-card').first()).toBeVisible()
  })

  test('a card shows the title, at most 3 tag chips and a +N chip', async ({ page }) => {
    await page.goto('http://localhost:3000/projects')
    const card = page.getByTestId('project-card').first()
    await expect(card.getByRole('link', { name: 'Sample Project' }).first()).toHaveAttribute(
      'href',
      '/projects/sample-project',
    )
    for (const tag of ['Next.js', 'Payload', 'TypeScript']) {
      await expect(card.getByText(tag, { exact: true })).toBeVisible()
    }
    await expect(card.getByText('MongoDB', { exact: true })).toHaveCount(0)
    await expect(card.getByText('+2', { exact: true })).toBeVisible()
  })

  test('hovering reveals the overlay with the expected links', async ({ page }) => {
    await page.goto('http://localhost:3000/projects')
    const card = page.getByTestId('project-card').first()
    await overlayHidden(card)

    await card.hover()
    await overlayShown(card)
    const overlay = card.getByTestId('project-card-overlay')
    await expect(overlay.getByRole('link', { name: 'View live' })).toHaveAttribute('target', '_blank')
    await expect(overlay.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/logankuzyk/website',
    )
    await expect(overlay.getByRole('link', { name: 'Read more' })).toHaveAttribute(
      'href',
      '/projects/sample-project',
    )
  })

  test('keyboard focus within the card reveals the overlay', async ({ page }) => {
    await page.goto('http://localhost:3000/projects')
    const card = page.getByTestId('project-card').first()
    await card.getByRole('link', { name: 'Sample Project' }).first().focus()
    await overlayShown(card)
  })

  test.describe('touch', () => {
    test.use({ hasTouch: true, viewport: { width: 390, height: 844 } })

    test('the first tap reveals the overlay; a second tap on a button navigates', async ({ page }) => {
      await page.goto('http://localhost:3000/projects')
      const card = page.getByTestId('project-card').first()
      await overlayHidden(card)

      // Tap the title: swallowed, so it reveals the overlay instead of navigating.
      await card.getByRole('link', { name: 'Sample Project' }).first().tap()
      await overlayShown(card)
      await expect(page).toHaveURL('http://localhost:3000/projects')

      await card.getByTestId('project-card-overlay').getByRole('link', { name: 'Read more' }).tap()
      await expect(page).toHaveURL(/\/projects\/sample-project$/)
    })
  })
})
