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
})
