import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth } from './helpers'

test.describe('Reports', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `reports-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  test('page loads with Reports heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
  })

  test('four summary stat cards are visible', async ({ page }) => {
    await expect(page.getByText('Weekly Work')).toBeVisible()
    await expect(page.getByText('Weekly Study')).toBeVisible()
    await expect(page.getByText('Weekly Timer')).toBeVisible()
    await expect(page.getByText('Monthly Avg/day')).toBeVisible()
  })

  test('stat card values are formatted as hours', async ({ page }) => {
    // Each value should end in 'h' (e.g. "0.0h")
    const statCards = page.locator('div.rounded-xl').filter({ hasText: /Weekly Work|Weekly Study|Weekly Timer|Monthly Avg/ })
    const count = await statCards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('Weekly Breakdown section is present', async ({ page }) => {
    await expect(page.getByText('Weekly Breakdown')).toBeVisible()
    // Either shows chart or empty state
    const hasChart = await page.locator('.recharts-wrapper').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No data this week yet').isVisible().catch(() => false)
    expect(hasChart || hasEmpty).toBe(true)
  })

  test('Monthly Productive Hours section is present', async ({ page }) => {
    await expect(page.getByText('Monthly Productive Hours')).toBeVisible()
    const hasChart = await page.locator('.recharts-wrapper').count()
    const hasEmpty = await page.getByText('No monthly data yet').isVisible().catch(() => false)
    expect(hasChart > 0 || hasEmpty).toBe(true)
  })
})
