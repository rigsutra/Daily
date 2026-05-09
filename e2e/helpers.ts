import { APIRequestContext, Page } from '@playwright/test'

export const API_URL = 'http://localhost:3001'

export async function registerViaApi(request: APIRequestContext, suffix?: string) {
  const s = suffix ?? `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = `e2e-${s}@test.com`
  const password = 'Test1234!'
  const name = 'E2E User'
  const res = await request.post(`${API_URL}/api/auth/register`, {
    data: { name, email, password },
  })
  if (!res.ok()) throw new Error(`Register failed: ${await res.text()}`)
  const data = await res.json()
  return {
    user: data.user as { id: number; name: string; email: string },
    token: data.token as string,
    email,
    password,
    name,
  }
}

// Injects auth token into localStorage before any page navigation.
// Must be called before page.goto() to take effect.
export async function injectAuth(page: Page, user: object, token: string) {
  await page.context().addInitScript(
    ({ userJson, tok }: { userJson: string; tok: string }) => {
      localStorage.setItem('user', userJson)
      localStorage.setItem('token', tok)
    },
    { userJson: JSON.stringify(user), tok: token }
  )
}

export async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('/')
}
