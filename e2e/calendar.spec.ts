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
    await expect(page.getByText('Sun', { exact: true })).toBeVisible()
  })

  // ── Layout ────────────────────────────────────────────────────────────────

  test('shows week day headers Sun–Sat', async ({ page }) => {
    for (const day of ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']) {
      await expect(page.getByText(day, { exact: true })).toBeVisible()
    }
  })

  test('shows the current month and year in the header', async ({ page }) => {
    const now = new Date()
    const monthName = now.toLocaleDateString('en-US', { month: 'long' })
    const year = now.getFullYear().toString()
    await expect(page.getByText(new RegExp(`${monthName}.*${year}`))).toBeVisible()
  })

  test('shows navigation buttons: prev, next, Today', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: '‹' })).toBeVisible()
    await expect(page.getByRole('button', { name: '›' })).toBeVisible()
  })

  test("today's date cell has an indigo ring highlight", async ({ page }) => {
    const today = new Date().getDate().toString()
    const todayCell = page.locator('div.ring-2.ring-indigo-500')
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

    await page.getByRole('button', { name: '›' }).click()
    await page.getByRole('button', { name: '›' }).click()
    await page.getByRole('button', { name: 'Today' }).click()
    await expect(page.getByText(new RegExp(`${monthName}.*${year}`))).toBeVisible()
  })

  // ── Date selection ────────────────────────────────────────────────────────

  test('clicking a day shows the task panel for that date', async ({ page }) => {
    // All current-month cells are h-12 grid cells with cursor-pointer
    const dayCells = page.locator('div.cursor-pointer.h-12')
    await expect(dayCells.first()).toBeVisible()
    await dayCells.first().click()
    await expect(page.getByRole('heading', { name: /Tasks for/ })).toBeVisible()
  })

  test('task panel shows Completed, Not Completed, Mandatory Tasks columns', async ({ page }) => {
    const dayCells = page.locator('div.cursor-pointer.h-12')
    await dayCells.first().click()
    // Use color-coded h4 headings to avoid strict-mode collision with "Not Completed"
    await expect(page.locator('h4.text-green-400')).toBeVisible()
    await expect(page.locator('h4.text-red-400')).toBeVisible()
    await expect(page.locator('h4.text-amber-400')).toBeVisible()
  })

  test('empty day shows None in each column', async ({ page }) => {
    // Click the first cell — fresh user has no completions, all three columns show "None"
    const dayCells = page.locator('div.cursor-pointer.h-12')
    await dayCells.first().click()
    const noneCells = page.getByText('None')
    await expect(noneCells.first()).toBeVisible()
  })

  test('navigating to next month clears selected date panel', async ({ page }) => {
    const dayCells = page.locator('div.cursor-pointer.h-12')
    await dayCells.first().click()
    await expect(page.getByRole('heading', { name: /Tasks for/ })).toBeVisible()

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
    await ctx.post(`${API_URL}/api/tasks/${task.id}/complete`, {
      data: { achieved: 1 },
      headers: { Authorization: `Bearer ${authToken}` },
    })
    await ctx.dispose()

    // Click today's ring cell
    const todayCell = page.locator('div.ring-2.ring-indigo-500')
    const responsePromise = page.waitForResponse(
      r => r.url().includes('/completions/date') && r.status() === 200
    )
    await todayCell.click()
    await responsePromise

    await expect(page.getByText('Calendar Task')).toBeVisible()
  })

  test('selected day cell gets indigo background highlight', async ({ page }) => {
    // Click today's cell (always a current-month cell)
    const todayCell = page.locator('div.ring-2.ring-indigo-500')
    await todayCell.click()
    // After selection the cell transitions from ring to solid indigo-600 background
    await expect(page.locator('div.bg-indigo-600')).toBeVisible()
  })
})
