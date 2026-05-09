import { test, expect, request as apiRequest } from '@playwright/test'

const BASE_URL = 'http://localhost:5173'
const API_URL = 'http://localhost:3001'

// Unique test user per run to avoid conflicts with existing data
const TEST_EMAIL = `e2e-${Date.now()}@test.com`
const TEST_PASSWORD = 'Test1234!'
const TEST_NAME = 'E2E Test User'

// Register test user via API — faster than going through the register UI
test.beforeAll(async () => {
  const ctx = await apiRequest.newContext()
  const res = await ctx.post(`${API_URL}/api/auth/register`, {
    data: { name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD },
  })
  expect(res.ok(), `Register failed: ${await res.text()}`).toBe(true)
  await ctx.dispose()
})

test('add a task, log hours, then verify progress on dashboard', async ({ page }) => {
  // ── Step 1: Login ─────────────────────────────────────────────────────────
  await page.goto(`${BASE_URL}/login`)

  // Labels are not linked to inputs via for/id, so use placeholder selectors
  await page.getByPlaceholder('you@example.com').fill(TEST_EMAIL)
  await page.locator('input[type="password"]').fill(TEST_PASSWORD)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await expect(page).toHaveURL(`${BASE_URL}/`)
  await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()

  // ── Step 2: Navigate to Tasks ─────────────────────────────────────────────
  await page.getByRole('link', { name: 'Tasks' }).click()
  await expect(page).toHaveURL(`${BASE_URL}/tasks`)
  await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible()

  // ── Step 3: Create a new task ─────────────────────────────────────────────
  await page.getByRole('button', { name: '+ New Task' }).click()
  await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()

  await page.getByPlaceholder('Title (e.g. Gym)').fill('Deep Focus Work')
  await page.getByPlaceholder('Target (e.g. 1)').fill('2')
  await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('hours')

  // Wait for the create API call to finish so the task list refreshes
  const createResponse = page.waitForResponse(
    r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
  )
  await page.getByRole('button', { name: 'Create' }).click()
  await createResponse

  // Form closes; task appears in the list
  await expect(page.getByPlaceholder('Title (e.g. Gym)')).not.toBeVisible()
  await expect(page.getByText('Deep Focus Work')).toBeVisible()
  await expect(page.getByText('Target: 2 hours')).toBeVisible()

  // Progress summary starts at 0/1 tasks · 0%
  await expect(page.getByText(/0\/1 tasks/)).toBeVisible()

  // ── Step 4: Log hours to complete the task ────────────────────────────────
  // Locate the number input in the task row for "Deep Focus Work"
  const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Deep Focus Work' })
  const hoursInput = taskRow.locator('input[type="number"]')

  // Wait for the complete API call before asserting UI changes
  const completeResponse = page.waitForResponse(
    r => r.url().includes('/complete') && r.status() === 200
  )
  await hoursInput.click()
  await hoursInput.fill('2')
  await hoursInput.press('Tab') // ensure onChange fires
  await completeResponse

  // Task card border turns green (done = true → border-green-800)
  await expect(taskRow).toHaveClass(/border-green-800/, { timeout: 6000 })

  // Green checkmark circle is visible inside the row
  await expect(taskRow.locator('.bg-green-500')).toBeVisible()

  // Progress bar updates to 1/1 tasks · 100%
  await expect(page.getByText(/1\/1 tasks/)).toBeVisible()
  await expect(page.getByText('100%')).toBeVisible()

  // ── Step 5: Navigate back to Dashboard ───────────────────────────────────
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await expect(page).toHaveURL(`${BASE_URL}/`)
  await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()

  // ── Step 6: Verify dashboard stat cards reflect the completed task ─────────

  // "Tasks" stat card → value "1/1", sub-label "completed"
  const tasksCard = page.locator('div.rounded-xl').filter({ hasText: 'Tasks' }).filter({ hasText: 'completed' })
  await expect(tasksCard.getByText('1/1')).toBeVisible()

  // "Productivity Score" stat card → value "100%"
  const scoreCard = page.locator('div.rounded-xl').filter({ hasText: 'Productivity Score' })
  await expect(scoreCard.getByText('100%')).toBeVisible()

  // Hours-used progress bar footer: task unit is "hours" + achieved=2 → hoursUsed ≥ 2
  // Dashboard shows "Xh used" at the bottom of the progress bar
  const hoursUsedText = await page.getByText(/h used/).textContent()
  const hoursUsed = parseFloat(hoursUsedText ?? '0')
  expect(hoursUsed, `Expected hoursUsed ≥ 2, got ${hoursUsed}`).toBeGreaterThanOrEqual(2)
})
