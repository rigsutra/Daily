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
    // Sidebar shows the user's name
    await expect(page.getByText(userName)).toBeVisible()
  })
})
