import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth } from './helpers'

test.describe('Settings', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string
  let userName: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `settings-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    userName = result.name
    await ctx.dispose()
  })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('Settings heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
  })

  test('Profile section shows Name and Email fields', async ({ page }) => {
    await expect(page.getByText('Profile')).toBeVisible()
    await expect(page.getByText('Name', { exact: true })).toBeVisible()
    await expect(page.getByText('Email', { exact: true })).toBeVisible()
  })

  test('Name field is pre-filled with user name', async ({ page }) => {
    // The name input is enabled and pre-filled
    const nameInput = page.locator('input').first()
    await expect(nameInput).toHaveValue(userName)
  })

  test('Email field is pre-filled and disabled', async ({ page }) => {
    // The email input is disabled
    const emailInput = page.locator('input[disabled]')
    await expect(emailInput).toHaveValue(authUser.email)
    await expect(emailInput).toBeDisabled()
  })

  test('Save Changes button shows confirmation feedback', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    await page.getByRole('button', { name: 'Save Changes' }).click()
    // Shows "✓ Saved" temporarily
    await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible()
    // Reverts to "Save Changes" after 2s
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({ timeout: 4000 })
  })

  test('Mobile Sync API section is visible', async ({ page }) => {
    await expect(page.getByText('Mobile Sync API')).toBeVisible()
    await expect(page.getByText(/POST \/api\/mobile-usage\/sync/)).toBeVisible()
  })

  test('Sidebar shows user name', async ({ page }) => {
    await expect(page.getByText(userName)).toBeVisible()
  })

  // ── Additional coverage ───────────────────────────────────────────────────

  test('Name field can be edited', async ({ page }) => {
    const nameInput = page.locator('input').first()
    await nameInput.clear()
    await nameInput.fill('Updated Name')
    await expect(nameInput).toHaveValue('Updated Name')
  })

  test('Mobile Sync API pre block contains userId', async ({ page }) => {
    const preBlock = page.locator('pre')
    await expect(preBlock).toBeVisible()
    const content = await preBlock.textContent()
    expect(content).toContain(`"userId": ${authUser.id}`)
  })

  test('Mobile Sync API code block shows POST endpoint', async ({ page }) => {
    const codeEl = page.locator('code')
    await expect(codeEl).toBeVisible()
    const content = await codeEl.textContent()
    expect(content).toContain('POST /api/mobile-usage/sync')
  })

  test('profile section has dark-themed card', async ({ page }) => {
    const card = page.locator('div.bg-gray-900').filter({ hasText: 'Profile' })
    await expect(card).toBeVisible()
  })

  test('Save Changes reverts label to "Save Changes" after 2 seconds', async ({ page }) => {
    await page.getByRole('button', { name: 'Save Changes' }).click()
    await expect(page.getByRole('button', { name: /Saved/ })).toBeVisible()
    // After ~2s it should revert
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible({ timeout: 4000 })
  })

  test('no horizontal scroll on settings page', async ({ page }) => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow).toBe(false)
  })
})
