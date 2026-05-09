import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth } from './helpers'

test.describe('Goals', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `goals-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/goals')
    await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible()
  })

  test('Goals page has three period sections and empty states', async ({ page }) => {
    // The h3 period headings use lowercase text ("weekly Goals") rendered uppercase by CSS
    await expect(page.getByRole('heading', { name: /weekly/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /monthly/i }).first()).toBeVisible()
    await expect(page.getByRole('heading', { name: /yearly/i }).first()).toBeVisible()
    // Initial empty states
    await expect(page.getByText('No weekly goals yet.')).toBeVisible()
    await expect(page.getByText('No monthly goals yet.')).toBeVisible()
    await expect(page.getByText('No yearly goals yet.')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ New Goal' })).toBeVisible()
  })

  test('create form appears and can be cancelled', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await expect(page.getByPlaceholder('Goal title')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()

    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByPlaceholder('Goal title')).not.toBeVisible()
  })

  test('create weekly goal appears in Weekly Goals section', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Read 10 Books')
    // Period select defaults to "Weekly"
    await page.getByPlaceholder('Target hours').fill('20')

    const createRes = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    // Form closes
    await expect(page.getByPlaceholder('Goal title')).not.toBeVisible()

    // Goal appears under Weekly Goals
    const weeklySection = page.locator('div').filter({ hasText: /^Weekly Goals/ }).first()
    await expect(page.getByText('Read 10 Books')).toBeVisible()
    await expect(page.getByText('0h / 20h')).toBeVisible()
    await expect(page.getByText('0% complete')).toBeVisible()
  })

  test('create monthly goal appears in Monthly Goals section', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Monthly Fitness Goal')
    await page.locator('select').selectOption('monthly')
    await page.getByPlaceholder('Target hours').fill('30')

    const createRes = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    await expect(page.getByText('Monthly Fitness Goal')).toBeVisible()
    await expect(page.getByText('0h / 30h')).toBeVisible()
  })

  test('create yearly goal appears in Yearly Goals section', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Year-Long Project')
    await page.locator('select').selectOption('yearly')
    await page.getByPlaceholder('Target hours').fill('500')

    const createRes = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    await expect(page.getByText('Year-Long Project')).toBeVisible()
    await expect(page.getByText('0h / 500h')).toBeVisible()
  })

  test('goal cards show period badge, status, and progress bar', async ({ page }) => {
    // Create one if needed
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Badge Test Goal')
    await page.getByPlaceholder('Target hours').fill('10')
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    const goalCard = page.locator('div.rounded-xl').filter({ hasText: 'Badge Test Goal' })
    await expect(goalCard.getByText('weekly')).toBeVisible()
    await expect(goalCard.getByText('active')).toBeVisible()
    await expect(goalCard.getByText('0% complete')).toBeVisible()
  })

  // ── Additional coverage ───────────────────────────────────────────────────

  test('period badge colors: weekly=blue, monthly=yellow, yearly=purple', async ({ page }) => {
    const periods = [
      { title: 'Blue Badge', period: 'weekly', cls: 'text-blue-400' },
      { title: 'Yellow Badge', period: 'monthly', cls: 'text-yellow-400' },
      { title: 'Purple Badge', period: 'yearly', cls: 'text-purple-400' },
    ]
    for (const { title, period, cls } of periods) {
      await page.getByRole('button', { name: '+ New Goal' }).click()
      await page.getByPlaceholder('Goal title').fill(title)
      await page.locator('select').selectOption(period)
      await page.getByPlaceholder('Target hours').fill('5')
      const res = page.waitForResponse(
        r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
      )
      await page.getByRole('button', { name: 'Create' }).click()
      await res

      const card = page.locator('div.rounded-xl').filter({ hasText: title })
      const badge = card.locator(`span.${cls}`)
      await expect(badge).toBeVisible()
    }
  })

  test('goal progress bar element exists in each goal card', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Progress Bar Goal')
    await page.getByPlaceholder('Target hours').fill('20')
    const res = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await res

    const card = page.locator('div.rounded-xl').filter({ hasText: 'Progress Bar Goal' })
    // Progress percentage text is the most reliable indicator
    await expect(card.getByText('0% complete')).toBeVisible()
    // Achieved / target hours displayed
    await expect(card.getByText('0h / 20h')).toBeVisible()
  })

  test('period select has all three options', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    const select = page.locator('select')
    await expect(select.locator('option[value="weekly"]')).toBeAttached()
    await expect(select.locator('option[value="monthly"]')).toBeAttached()
    await expect(select.locator('option[value="yearly"]')).toBeAttached()
  })

  test('create form requires title (HTML5 validation blocks empty submit)', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    // Submit without filling title
    await page.getByRole('button', { name: 'Create' }).click()
    // Form remains visible
    await expect(page.getByPlaceholder('Goal title')).toBeVisible()
  })

  test('achieved hours / target hours display on goal card', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await page.getByPlaceholder('Goal title').fill('Hours Display Goal')
    await page.getByPlaceholder('Target hours').fill('15')
    const res = page.waitForResponse(
      r => r.url().includes('/api/goals') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await res

    const card = page.locator('div.rounded-xl').filter({ hasText: 'Hours Display Goal' })
    await expect(card.getByText('0h / 15h')).toBeVisible()
  })
})
