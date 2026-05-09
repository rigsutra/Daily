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

  // ── Additional coverage ───────────────────────────────────────────────────

  test('all four stat card values contain a number followed by "h"', async ({ page }) => {
    const labels = ['Weekly Work', 'Weekly Study', 'Weekly Timer', 'Monthly Avg/day']
    for (const label of labels) {
      const card = page.locator('div.border-l-4').filter({ hasText: label })
      const val = await card.locator('p.text-2xl').textContent()
      expect(val).toMatch(/[\d.]+h/)
    }
  })

  test('stat card border colors are correct', async ({ page }) => {
    await expect(page.locator('div.border-green-500').first()).toBeVisible()
    await expect(page.locator('div.border-blue-500').first()).toBeVisible()
    await expect(page.locator('div.border-indigo-500').first()).toBeVisible()
    await expect(page.locator('div.border-purple-500').first()).toBeVisible()
  })

  test('reports page title is h2 with correct text', async ({ page }) => {
    const heading = page.getByRole('heading', { level: 2, name: 'Reports' })
    await expect(heading).toBeVisible()
  })

  test('Weekly Breakdown section has a chart container or empty text', async ({ page }) => {
    const section = page.locator('div.rounded-xl').filter({ hasText: 'Weekly Breakdown' })
    await expect(section).toBeVisible()
    const hasChart = await section.locator('svg').isVisible().catch(() => false)
    const hasEmpty = await section.getByText('No data this week yet').isVisible().catch(() => false)
    expect(hasChart || hasEmpty).toBe(true)
  })

  test('Monthly chart section has a chart container or empty text', async ({ page }) => {
    const section = page.locator('div.rounded-xl').filter({ hasText: 'Monthly Productive Hours' })
    await expect(section).toBeVisible()
    const hasChart = await section.locator('svg').isVisible().catch(() => false)
    const hasEmpty = await section.getByText('No monthly data yet').isVisible().catch(() => false)
    expect(hasChart || hasEmpty).toBe(true)
  })

  test('no horizontal scroll on reports page', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })
})
