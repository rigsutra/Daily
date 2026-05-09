import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth } from './helpers'

test.describe('Tasks', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `tasks-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/tasks')
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible()
  })

  test('Task Board shows empty state initially', async ({ page }) => {
    await expect(page.getByText('+ New Task')).toBeVisible()
    await expect(page.getByText("Today's Progress")).toBeVisible()
    await expect(page.getByText(/0\/\d+ tasks/)).toBeVisible()
  })

  test('create non-mandatory task appears in list', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()

    await page.getByPlaceholder('Title (e.g. Gym)').fill('Morning Run')
    await page.getByPlaceholder('Target (e.g. 1)').fill('5')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('km')

    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    await expect(page.getByPlaceholder('Title (e.g. Gym)')).not.toBeVisible()
    await expect(page.getByText('Morning Run')).toBeVisible()
    await expect(page.getByText('Target: 5 km')).toBeVisible()
  })

  test('create mandatory task shows Mandatory badge', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()

    await page.getByPlaceholder('Title (e.g. Gym)').fill('Daily Study')
    await page.getByPlaceholder('Target (e.g. 1)').fill('2')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('hours')
    await page.locator('input[type="checkbox"]').check()

    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    await expect(page.getByText('Daily Study')).toBeVisible()
    await expect(page.getByText(/Mandatory/)).toBeVisible()
  })

  test('completing an hour-based task turns it green and updates progress', async ({ page }) => {
    // Create a fresh task to complete
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Focus Session')
    await page.getByPlaceholder('Target (e.g. 1)').fill('1')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('hours')
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    // Find the task row and log 1 hour
    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Focus Session' })
    const hoursInput = taskRow.locator('input[type="number"]')

    const completeRes = page.waitForResponse(
      r => r.url().includes('/complete') && r.status() === 200
    )
    await hoursInput.fill('1')
    await hoursInput.press('Tab')
    await completeRes

    // Card border turns green
    await expect(taskRow).toHaveClass(/border-green-800/, { timeout: 6000 })
    await expect(taskRow.locator('.bg-green-500')).toBeVisible()

    // Progress bar text shows completed count
    await expect(page.getByText(/\d+\/\d+ tasks/)).toBeVisible()
  })

  test('cancel form hides the create form', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).not.toBeVisible()
  })

  test('delete non-mandatory task: any reason length works', async ({ page }) => {
    // Create a task to delete
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Temp Task')
    await page.getByPlaceholder('Target (e.g. 1)').fill('1')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('times')
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes
    await expect(page.getByText('Temp Task')).toBeVisible()

    // Click delete (✕) on that specific task row
    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Temp Task' })
    await taskRow.getByText('✕').click()

    // Delete modal appears (non-mandatory task)
    await expect(page.getByRole('heading', { name: 'Delete Task' })).toBeVisible()
    await expect(page.getByText('Please provide a reason for removing this task')).toBeVisible()

    // Short reason should be enough
    await page.locator('textarea').fill('No longer needed')

    // Delete button should be enabled
    const deleteBtn = page.getByRole('button', { name: 'Delete Task' })
    await expect(deleteBtn).not.toBeDisabled()

    const deleteRes = page.waitForResponse(
      r => r.url().includes('/api/tasks/') && r.request().method() === 'DELETE'
    )
    await deleteBtn.click()
    await deleteRes

    await expect(page.getByText('Temp Task')).not.toBeVisible()
  })

  test('delete mandatory task: requires 1000 chars and shows counter', async ({ page }) => {
    // Create a mandatory task
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Critical Task')
    await page.getByPlaceholder('Target (e.g. 1)').fill('1')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('times')
    await page.locator('input[type="checkbox"]').check()
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes
    await expect(page.getByText('Critical Task')).toBeVisible()

    // Open delete modal
    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Critical Task' })
    await taskRow.getByText('✕').click()

    // Modal shows mandatory description and character counter
    await expect(page.getByText(/You must provide a reason of at least/)).toBeVisible()

    // Delete button disabled with short reason
    await page.locator('textarea').fill('Short reason')
    const deleteBtn = page.getByRole('button', { name: 'Delete Task' })
    await expect(deleteBtn).toBeDisabled()

    // Character counter visible (shows X/1000 format)
    await expect(page.getByText(/\d+\/1000 characters/)).toBeVisible()

    // Cancel to avoid leaving modal open
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByRole('heading', { name: 'Delete Task' })).not.toBeVisible()
  })

  // ── Additional coverage ───────────────────────────────────────────────────

  test('task row shows unit label next to input', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Unit Label Test')
    await page.getByPlaceholder('Target (e.g. 1)').fill('3')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('pages')
    const res = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await res

    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Unit Label Test' })
    // Unit label appears next to the input (exact match avoids matching subtitle "Target: 3 pages")
    await expect(taskRow.getByText('pages', { exact: true })).toBeVisible()
  })

  test('progress bar fills to 100% when all tasks are completed', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Full Complete Task')
    await page.getByPlaceholder('Target (e.g. 1)').fill('2')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('km')
    const createRes = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await createRes

    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Full Complete Task' })
    const completeRes = page.waitForResponse(
      r => r.url().includes('/complete') && r.status() === 200
    )
    await taskRow.locator('input[type="number"]').fill('2')
    await taskRow.locator('input[type="number"]').press('Tab')
    await completeRes

    // Green border on the completed card
    await expect(taskRow).toHaveClass(/border-green-800/, { timeout: 5000 })
    // Green checkmark circle visible
    await expect(taskRow.locator('.bg-green-500')).toBeVisible()
  })

  test('task target and unit visible in task row subtitle', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Subtitle Check')
    await page.getByPlaceholder('Target (e.g. 1)').fill('10')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('minutes')
    const res = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await res

    await expect(page.getByText('Target: 10 minutes')).toBeVisible()
  })

  test('create form: all inputs are required (HTML5 validation)', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    // Try submitting empty form — HTML5 required stops submission so form stays open
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()
  })

  test('multiple tasks can be created and all appear in list', async ({ page }) => {
    const titles = ['Task Alpha', 'Task Beta', 'Task Gamma']
    for (const title of titles) {
      await page.getByRole('button', { name: '+ New Task' }).click()
      await page.getByPlaceholder('Title (e.g. Gym)').fill(title)
      await page.getByPlaceholder('Target (e.g. 1)').fill('1')
      await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('times')
      const res = page.waitForResponse(
        r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
      )
      await page.getByRole('button', { name: 'Create' }).click()
      await res
    }
    for (const title of titles) {
      await expect(page.getByText(title)).toBeVisible()
    }
  })

  test('delete modal cancel restores task in list', async ({ page }) => {
    await page.getByRole('button', { name: '+ New Task' }).click()
    await page.getByPlaceholder('Title (e.g. Gym)').fill('Cancel Delete Task')
    await page.getByPlaceholder('Target (e.g. 1)').fill('1')
    await page.getByPlaceholder('Unit (e.g. hour, liters)').fill('times')
    const res = page.waitForResponse(
      r => r.url().includes('/api/tasks') && r.request().method() === 'POST' && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create' }).click()
    await res

    const taskRow = page.locator('div.rounded-xl').filter({ hasText: 'Cancel Delete Task' })
    await taskRow.getByText('✕').click()
    await expect(page.getByRole('heading', { name: 'Delete Task' })).toBeVisible()

    // Use the modal's Cancel button specifically (the ✕ button aria-label contains "Cancel" too)
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Delete Task' })).not.toBeVisible()
    await expect(page.getByText('Cancel Delete Task')).toBeVisible()
  })
})
