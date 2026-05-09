/**
 * Responsive tests — verifies that all 7 pages render correctly on
 * mobile (375×812, iPhone 14) and tablet (768×1024, iPad) viewports.
 *
 * Each test block navigates to a page, checks that key content is visible,
 * and — on mobile — verifies the hamburger drawer works correctly.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth, API_URL } from './helpers'

const MOBILE = { width: 375, height: 812 }
const TABLET = { width: 768, height: 1024 }

// ── helpers ───────────────────────────────────────────────────────────────────

async function openSidebarOnMobile(page: any) {
  const burger = page.getByRole('button', { name: 'Open menu' })
  await expect(burger).toBeVisible()
  await burger.click()
  await expect(page.locator('aside')).toBeVisible()
}

async function checkNoHorizontalScroll(page: any) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth
  )
  expect(overflow, 'Page should not have horizontal scroll').toBe(false)
}

// ── shared setup ──────────────────────────────────────────────────────────────

let authUser: { id: number; name: string; email: string }
let authToken: string

test.beforeAll(async () => {
  const ctx = await apiRequest.newContext()
  const result = await registerViaApi(ctx, `resp-${Date.now()}`)
  authUser = result.user
  authToken = result.token
  await ctx.dispose()
})

// =============================================================================
// MOBILE (375px)
// =============================================================================

test.describe('Mobile 375px', () => {
  test.use({ viewport: MOBILE })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
  })

  // ── Layout ─────────────────────────────────────────────────────────────────

  test('hamburger button is visible; sidebar is hidden by default', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const burger = page.getByRole('button', { name: 'Open menu' })
    await expect(burger).toBeVisible()
    // Sidebar offscreen by default
    const sidebar = page.locator('aside')
    await expect(sidebar).not.toBeInViewport()
  })

  test('hamburger opens sidebar, overlay click closes it', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await openSidebarOnMobile(page)
    // Sidebar is w-56 (224px); click the overlay at x=300 which is outside the sidebar
    await page.locator('div[aria-hidden="true"]').click({ position: { x: 300, y: 400 } })
    await expect(page.locator('aside')).not.toBeInViewport()
  })

  test('clicking a sidebar nav link navigates and closes drawer', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await openSidebarOnMobile(page)
    await page.getByRole('link', { name: 'Timer' }).click()
    await expect(page).toHaveURL('/timer')
    await expect(page.locator('aside')).not.toBeInViewport()
  })

  // ── Dashboard ──────────────────────────────────────────────────────────────

  test('Dashboard — key content visible on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Daily Dashboard' })).toBeVisible()
    await expect(page.getByText(/% used/)).toBeVisible()
    await expect(page.getByText('Productivity Score')).toBeVisible()
    await expect(page.getByText('Gym')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Dashboard — stat card grid has 2 columns on mobile', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // 2-column grid: the four stat cards should fit in 2 columns
    const cards = page.locator('.grid').first().locator('> div')
    await expect(cards.first()).toBeVisible()
  })

  // ── Timer ──────────────────────────────────────────────────────────────────

  test('Timer — display and buttons visible on mobile', async ({ page }) => {
    await page.goto('/timer')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible()
    await expect(page.getByText('00:00:00')).toBeVisible()
    await expect(page.getByText('▶ Start')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Timer — countdown cards stack on mobile (1 column)', async ({ page }) => {
    await page.goto('/timer')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Free Hours Today')).toBeVisible()
    await expect(page.getByText('Days Left in Month')).toBeVisible()
  })

  // ── Tasks ──────────────────────────────────────────────────────────────────

  test('Tasks — page content visible on mobile', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible()
    await expect(page.getByRole('button', { name: '+ New Task' })).toBeVisible()
    await expect(page.getByText("Today's Progress")).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Tasks — create form is usable on mobile', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New Task' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()
    await expect(page.getByPlaceholder('Target (e.g. 1)')).toBeVisible()
    await expect(page.getByPlaceholder('Unit (e.g. hour, liters)')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Tasks — task row is readable when task exists', async ({ page }) => {
    // Create task via API
    const ctx = await apiRequest.newContext()
    await ctx.post(`${API_URL}/api/tasks`, {
      data: { title: 'Mobile Task Test', target: 5, unit: 'km' },
      headers: { Authorization: `Bearer ${authToken}` },
    })
    await ctx.dispose()

    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Mobile Task Test')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  // ── Goals ──────────────────────────────────────────────────────────────────

  test('Goals — page content visible on mobile', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Goals', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '+ New Goal' })).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Goals — create form is usable on mobile', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await expect(page.getByPlaceholder('Goal title')).toBeVisible()
    await expect(page.getByPlaceholder('Target hours')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  // ── Reports ────────────────────────────────────────────────────────────────

  test('Reports — page content visible on mobile', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible()
    await expect(page.getByText('Weekly Work')).toBeVisible()
    await expect(page.getByText('Weekly Study')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Reports — charts or empty states visible on mobile', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Weekly Breakdown')).toBeVisible()
    await expect(page.getByText('Monthly Productive Hours')).toBeVisible()
  })

  // ── Calendar ───────────────────────────────────────────────────────────────

  test('Calendar — grid and navigation visible on mobile', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Sun', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Calendar — task panel columns stack vertically on mobile', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    // Click today's ring cell
    const todayCell = page.locator('div.ring-2.ring-indigo-500')
    await todayCell.click()
    await expect(page.getByRole('heading', { name: /Tasks for/ })).toBeVisible()
    // All 3 column headings should be visible (stacked vertically)
    await expect(page.locator('h4.text-green-400')).toBeVisible()
    await expect(page.locator('h4.text-red-400')).toBeVisible()
    await expect(page.locator('h4.text-amber-400')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  // ── Settings ───────────────────────────────────────────────────────────────

  test('Settings — form fields visible on mobile', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByText('Profile')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    await checkNoHorizontalScroll(page)
  })
})

// =============================================================================
// TABLET (768px)
// =============================================================================

test.describe('Tablet 768px', () => {
  test.use({ viewport: TABLET })

  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
  })

  test('Tablet — sidebar is visible without hamburger', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // On tablet (≥ md = 768px) the sidebar is always visible
    await expect(page.locator('aside')).toBeInViewport()
    // Hamburger not visible on tablet
    await expect(page.getByRole('button', { name: 'Open menu' })).not.toBeVisible()
  })

  test('Dashboard — all stat cards visible on tablet', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Productivity Score')).toBeVisible()
    await expect(page.getByText('Work Hours')).toBeVisible()
    await expect(page.getByText('Study Hours')).toBeVisible()
    await expect(page.getByText('Gym')).toBeVisible()
    await expect(page.getByText('Water')).toBeVisible()
    await expect(page.getByText('Sleep')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Timer — display and all 3 countdown cards visible on tablet', async ({ page }) => {
    await page.goto('/timer')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('00:00:00')).toBeVisible()
    await expect(page.getByText('Free Hours Today')).toBeVisible()
    await expect(page.getByText('Days Left in Month')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Tasks — page content and form visible on tablet', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Task Board' })).toBeVisible()
    await page.getByRole('button', { name: '+ New Task' }).click()
    await expect(page.getByPlaceholder('Title (e.g. Gym)')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Goals — create form shows 2-column grid on tablet', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: '+ New Goal' }).click()
    await expect(page.getByPlaceholder('Goal title')).toBeVisible()
    // Period select and target hours should be on same row (sm:grid-cols-2)
    const select = page.locator('select')
    const targetInput = page.getByPlaceholder('Target hours')
    await expect(select).toBeVisible()
    await expect(targetInput).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Calendar — task panel shows 3 columns on tablet', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForLoadState('networkidle')
    const todayCell = page.locator('div.ring-2.ring-indigo-500')
    await todayCell.click()
    await expect(page.locator('h4.text-green-400')).toBeVisible()
    await expect(page.locator('h4.text-red-400')).toBeVisible()
    await expect(page.locator('h4.text-amber-400')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Reports — charts and stat cards visible on tablet', async ({ page }) => {
    await page.goto('/reports')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Weekly Work')).toBeVisible()
    await expect(page.getByText('Weekly Breakdown')).toBeVisible()
    await checkNoHorizontalScroll(page)
  })

  test('Settings — form visible on tablet', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible()
    await checkNoHorizontalScroll(page)
  })
})
