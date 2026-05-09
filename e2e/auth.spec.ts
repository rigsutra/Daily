import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi } from './helpers'

test.describe('Authentication', () => {
  let sharedEmail: string
  let sharedPassword: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const { email, password } = await registerViaApi(ctx, `auth-${Date.now()}`)
    sharedEmail = email
    sharedPassword = password
    await ctx.dispose()
  })

  test('visiting protected route without auth redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('register via UI auto-logs in and lands on Dashboard', async ({ page }) => {
    const uniqueEmail = `ui-reg-${Date.now()}@test.com`
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: 'Register' })).toBeVisible()

    // Inputs rendered in a loop with no for/id → select by type
    await page.locator('input[type="text"]').fill('New E2E User')
    await page.locator('input[type="email"]').fill(uniqueEmail)
    await page.locator('input[type="password"]').fill('Test1234!')

    const registerRes = page.waitForResponse(
      r => r.url().includes('/api/auth/register') && r.status() === 201
    )
    await page.getByRole('button', { name: 'Create Account' }).click()
    await registerRes

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()
  })

  test('login page shows correct UI elements', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Daily')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible()
  })

  test('login with wrong password shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(sharedEmail)
    await page.locator('input[type="password"]').fill('WrongPassword!')
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page.getByText(/Invalid credentials|Login failed/i)).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('login with valid credentials lands on Dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(sharedEmail)
    await page.locator('input[type="password"]').fill(sharedPassword)
    const loginRes = page.waitForResponse(
      r => r.url().includes('/api/auth/login') && r.status() === 200
    )
    await page.getByRole('button', { name: 'Sign In' }).click()
    await loginRes
    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()
  })

  test('logout redirects to /login and clears session', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill(sharedEmail)
    await page.locator('input[type="password"]').fill(sharedPassword)
    await page.getByRole('button', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/')

    // Click logout in sidebar
    await page.getByText('Logout').click()
    await expect(page).toHaveURL('/login')

    // Navigating to protected route now redirects again
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('register page has link to sign in', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible()
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL('/login')
  })
})
