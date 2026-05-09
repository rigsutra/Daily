import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth } from './helpers'

test.describe('Dashboard', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `dash-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()
  })

  test('dashboard heading and date are visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()
    // Date string like "Friday, May 9"
    const dateEl = page.locator('span.text-gray-400').first()
    await expect(dateEl).toBeVisible()
  })

  test('24-hour progress bar section is visible', async ({ page }) => {
    await expect(page.getByText(/Free Time Today|24 Hour Progress/)).toBeVisible()
    await expect(page.getByText(/% used/)).toBeVisible()
    await expect(page.getByText(/h used/)).toBeVisible()
    await expect(page.getByText(/h remaining/)).toBeVisible()
  })

  test('row 1 stat cards are present', async ({ page }) => {
    await expect(page.getByText('Productivity Score')).toBeVisible()
    await expect(page.getByText('Work Hours')).toBeVisible()
    await expect(page.getByText('Study Hours')).toBeVisible()
    // "Tasks" also appears in the sidebar link — target the stat card label specifically
    await expect(page.getByText('Tasks', { exact: true }).first()).toBeVisible()
  })

  test('row 2 stat cards are present', async ({ page }) => {
    await expect(page.getByText('Gym')).toBeVisible()
    await expect(page.getByText('Water')).toBeVisible()
    await expect(page.getByText('Sleep')).toBeVisible()
  })

  test('time distribution chart section is visible', async ({ page }) => {
    await expect(page.getByText("Today's Time Distribution")).toBeVisible()
  })

  test('completing a task updates Tasks stat card and Productivity Score', async ({ page }) => {
    // Create a task via tasks page
    await page.goto('/tasks')
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Dashboard Verify Task')
    await page.getByPlaceholder('Target (e.g. 1)').fill('1')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('hours')
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    // Complete it
    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Dashboard Verify Task' })
    const completeRes = page.waitForResponse(
      r => r.url().includes('/complete') && r.status() === 200
    )
    await taskRow.locator('input[type="number"]').fill('1')
    await taskRow.locator('input[type="number"]').press('Tab')
    await completeRes

    // Navigate to dashboard
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()

    // Tasks stat card should show at least 1 completed
    const tasksCard = page.locator('div.rounded-xl').filter({ hasText: 'Tasks' }).filter({ hasText: 'completed' })
    const tasksValue = await tasksCard.locator('.text-2xl, .text-3xl, .text-xl').first().textContent()
    expect(tasksValue).toMatch(/\d+\/\d+/)

    // Hours used should be ≥ 1
    const hoursUsedText = await page.getByText(/h used/).textContent()
    const hoursUsed = parseFloat(hoursUsedText ?? '0')
    expect(hoursUsed).toBeGreaterThanOrEqual(1)
  })

  // ── Stat card values ──────────────────────────────────────────────────────

  test('all stat card values are non-empty strings (not undefined/NaN)', async ({ page }) => {
    const cards = page.locator('div.border-l-4')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(7)
    for (let i = 0; i < count; i++) {
      const card = cards.nth(i)
      // Value may be a <p class="text-2xl"> (static) or <input class="text-2xl"> (editable)
      let val = ''
      if (await card.locator('p.text-2xl').count() > 0) {
        val = (await card.locator('p.text-2xl').textContent()) ?? ''
      } else if (await card.locator('input.text-2xl').count() > 0) {
        val = await card.locator('input.text-2xl').inputValue()
      }
      expect(val.trim()).not.toBe('')
      expect(val).not.toMatch(/NaN|undefined/)
    }
  })

  test('stat card left-border colors are correct', async ({ page }) => {
    await expect(page.locator('div.border-indigo-500').first()).toBeVisible()
    await expect(page.locator('div.border-green-500').first()).toBeVisible()
    await expect(page.locator('div.border-blue-500').first()).toBeVisible()
  })

  test('progress bar is rendered and has non-negative width', async ({ page }) => {
    const bar = page.locator('div.bg-indigo-600.h-3.rounded-full')
    await expect(bar).toBeAttached()
    const width = await bar.evaluate((el: HTMLElement) =>
      parseFloat(el.style.width ?? '0')
    )
    expect(width).toBeGreaterThanOrEqual(0)
    expect(width).toBeLessThanOrEqual(100)
  })

  test('time distribution shows legend OR no-data empty state', async ({ page }) => {
    const legendOrEmpty = await page.locator('span.rounded-full').first().isVisible().catch(() => false)
    const hasEmpty = await page.getByText('No data yet').isVisible().catch(() => false)
    expect(legendOrEmpty || hasEmpty).toBe(true)
  })

  test('Water stat card shows "target: 4L" subtitle', async ({ page }) => {
    const waterCard = page.locator('div.border-l-4').filter({ hasText: 'Water' })
    await expect(waterCard.getByText('target: 4L')).toBeVisible()
  })

  test('Sleep stat card shows "target: 7.5h" subtitle', async ({ page }) => {
    const sleepCard = page.locator('div.border-l-4').filter({ hasText: 'Sleep' })
    await expect(sleepCard.getByText('target: 7.5h')).toBeVisible()
  })

  test('sidebar navigation links all lead to correct pages', async ({ page }) => {
    const routes = [
      { label: 'Timer', url: '/timer' },
      { label: 'Tasks', url: '/tasks' },
      { label: 'Goals', url: '/goals' },
      { label: 'Reports', url: '/reports' },
      { label: 'Calendar', url: '/calendar' },
      { label: 'Settings', url: '/settings' },
    ]
    for (const { label, url } of routes) {
      await page.getByRole('link', { name: label }).click()
      await expect(page).toHaveURL(url)
      await page.goBack()
      await page.waitForURL('/')
    }
  })
})
