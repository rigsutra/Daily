import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth, API_URL } from './helpers'

test.describe('Calendar', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `calendar-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/calendar')
    // Wait for the calendar grid to appear (day headers)
    await expect(page.getByText('Sun')).toBeVisible()
  })

  // ── Layout ────────────────────────────────────────────────────────────────

  test('shows week day headers Sun–Sat', async ({ page }) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    for (const day of days) {
      await expect(page.getByText(day, { exact: true })).toBeVisible()
    }
  })

  test('shows the current month and year in the header', async ({ page }) => {
    const now = new Date()
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })
    const year = now.getFullYear().toString()
    // The header shows e.g. "May 2026"
    await expect(page.getByText(new RegExp(`${monthName}.*${year}`))).toBeVisible()
  })

  test('shows navigation buttons: prev, next, Today', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    // Prev/Next are single-char arrows
    const prevBtn = page.getByRole('button', { name: '‹' })
    const nextBtn = page.getByRole('button', { name: '›' })
    await expect(prevBtn).toBeVisible()
    await expect(nextBtn).toBeVisible()
  })

  test('today\'s date cell has a blue ring highlight', async ({ page }) => {
    const today = new Date().getDate().toString()
    // Find all cells with the day number text and pick the one with ring-blue-500
    const todayCell = page.locator('div.ring-2.ring-blue-500')
    await expect(todayCell).toBeVisible()
    await expect(todayCell).toContainText(today)
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('clicking prev month navigates to previous month', async ({ page }) => {
    const now = new Date()
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevMonth = prevDate.toLocaleDateString('en-US', { month: 'long' })
    const prevYear = prevDate.getFullYear().toString()

    await page.getByRole('button', { name: '‹' }).click()
    await expect(page.getByText(new RegExp(`${prevMonth}.*${prevYear}`))).toBeVisible()
  })

  test('clicking next month navigates to next month', async ({ page }) => {
    const now = new Date()
    const nextDate = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const nextMonth = nextDate.toLocaleDateString('en-US', { month: 'long' })
    const nextYear = nextDate.getFullYear().toString()

    await page.getByRole('button', { name: '›' }).click()
    await expect(page.getByText(new RegExp(`${nextMonth}.*${nextYear}`))).toBeVisible()
  })

  test('Today button returns to current month after navigating away', async ({ page }) => {
    const now = new Date()
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })
    const year = now.getFullYear().toString()

    // Go forward two months
    await page.getByRole('button', { name: '›' }).click()
    await page.getByRole('button', { name: '›' }).click()

    // Return with Today
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page.getByText(new RegExp(`${monthName}.*${year}`))).toBeVisible()
  })

  // ── Date selection ────────────────────────────────────────────────────────

  test('clicking a day shows the task panel for that date', async ({ page }) => {
    // Click the 1st of the current month (always visible in the grid)
    const today = new Date()
    // Locate a current-month day cell — they're "cursor-pointer rounded p-2" divs
    const dayCells = page.locator('div.cursor-pointer.rounded')
    const count = await dayCells.count()
    expect(count).toBeGreaterThan(0)

    // Click the first current-month day
    const firstCell = dayCells.first()
    await firstCell.click()

    // Task panel heading should appear: "Tasks for ..."
    await expect(page.getByRole('heading', { name: /Tasks for/ })).toBeVisible()
  })

  test('task panel shows Completed, Not Completed, Mandatory Tasks columns', async ({ page }) => {
    const dayCells = page.locator('div.cursor-pointer.rounded')
    await dayCells.first().click()

    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('Not Completed')).toBeVisible()
    await expect(page.getByText('Mandatory Tasks')).toBeVisible()
  })

  test('navigating to next month clears selected date panel', async ({ page }) => {
    // Select a date to show the panel
    const dayCells = page.locator('div.cursor-pointer.rounded')
    await dayCells.first().click()
    await expect(page.getByRole('heading', { name: /Tasks for/ })).toBeVisible()

    // Navigate to next month — panel should disappear
    await page.getByRole('button', { name: '›' }).click()
    await expect(page.getByRole('heading', { name: /Tasks for/ })).not.toBeVisible()
  })

  // ── With data ─────────────────────────────────────────────────────────────

  test('completed task appears in Completed column after being logged', async ({ page }) => {
    // Create a task via API
    const ctx = await apiRequest.newContext()
    const taskRes = await ctx.post(`${API_URL}/api/tasks`, {
      data: { title: 'Calendar Task', target: 1, unit: 'times' },
      headers: { Authorization: `Bearer ${authToken}` },
    })
    expect(taskRes.ok()).toBe(true)
    const task = await taskRes.json()

    // Log completion for today
    const today = new Date().toISOString().split('T')[0]
    await ctx.post(`${API_URL}/api/tasks/${task.id}/complete`, {
      data: { achieved: 1 },
      headers: { Authorization: `Bearer ${authToken}` },
    })
    await ctx.dispose()

    // Navigate to calendar and click today
    const todayCell = page.locator('div.ring-2.ring-blue-500')
    const completeRes = page.waitForResponse(
      r => r.url().includes('/completions/date') && r.status() === 200
    )
    await todayCell.click()
    await completeRes

    // The task should appear in the Completed column
    await expect(page.getByText('Calendar Task')).toBeVisible()
  })
})
