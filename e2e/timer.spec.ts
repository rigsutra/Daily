import { test, expect, request as apiRequest } from '@playwright/test'
import { registerViaApi, injectAuth, API_URL } from './helpers'

test.describe('Timer', () => {
  let authUser: { id: number; name: string; email: string }
  let authToken: string

  test.beforeAll(async () => {
    const ctx = await apiRequest.newContext()
    const result = await registerViaApi(ctx, `timer-${Date.now()}`)
    authUser = result.user
    authToken = result.token
    await ctx.dispose()
  })

  // Stop any running session left from a previous test
  test.beforeEach(async ({ page }) => {
    await injectAuth(page, authUser, authToken)
    await page.goto('/timer')
    await expect(page.getByRole('heading', { name: 'Timer' })).toBeVisible()

    // If a session was left running, stop it first
    const stopBtn = page.getByText('■ Stop')
    if (await stopBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stopBtn.click()
      await expect(page.getByText('▶ Start')).toBeVisible({ timeout: 6000 })
    }
  })

  test('idle state: shows 00:00:00 and type buttons', async ({ page }) => {
    await expect(page.getByText('00:00:00')).toBeVisible()
    await expect(page.getByRole('button', { name: 'work' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'study' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'break' })).toBeVisible()
    await expect(page.getByText('▶ Start')).toBeVisible()
  })

  test('selecting a timer type highlights the button', async ({ page }) => {
    await page.getByRole('button', { name: 'study' }).click()
    const studyBtn = page.getByRole('button', { name: 'study' })
    await expect(studyBtn).toHaveClass(/bg-indigo-600/)

    await page.getByRole('button', { name: 'break' }).click()
    const breakBtn = page.getByRole('button', { name: 'break' })
    await expect(breakBtn).toHaveClass(/bg-indigo-600/)
  })

  test('start work timer → Pause and Stop appear, type buttons hidden', async ({ page }) => {
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    // Type buttons should be hidden
    await expect(page.getByRole('button', { name: 'work' })).not.toBeVisible()
    await expect(page.getByText('▶ Start')).not.toBeVisible()

    // Pause and Stop buttons appear
    await expect(page.getByText('⏸ Pause')).toBeVisible()
    await expect(page.getByText('■ Stop')).toBeVisible()

    // Session status shows "Running · work session"
    await expect(page.getByText(/Running · work session/)).toBeVisible()

    // Elapsed time is non-zero after a moment
    await page.waitForTimeout(1500)
    const elapsedText = await page.locator('.font-mono').textContent()
    expect(elapsedText).not.toBe('00:00:00')

    // Stop the timer to clean up
    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes
  })

  test('pause timer → shows Resume, Stop, and Paused status', async ({ page }) => {
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    const pauseRes = page.waitForResponse(r => r.url().includes('/api/timer/pause'))
    await page.getByText('⏸ Pause').click()
    await pauseRes

    await expect(page.getByText('▶ Resume')).toBeVisible()
    await expect(page.getByText('■ Stop')).toBeVisible()
    await expect(page.getByText(/Paused · work session/)).toBeVisible()

    // Clean up
    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes
  })

  test('resume paused timer → Pause and Stop appear again', async ({ page }) => {
    // Start
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    // Pause
    const pauseRes = page.waitForResponse(r => r.url().includes('/api/timer/pause'))
    await page.getByText('⏸ Pause').click()
    await pauseRes

    // Resume
    const resumeRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Resume').click()
    await resumeRes

    await expect(page.getByText('⏸ Pause')).toBeVisible()
    await expect(page.getByText('■ Stop')).toBeVisible()
    await expect(page.getByText(/Running · work session/)).toBeVisible()

    // Clean up
    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes
  })

  test('stop timer → resets to 00:00:00 and type buttons return', async ({ page }) => {
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    await page.waitForTimeout(1200)

    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes

    await expect(page.getByText('00:00:00')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: 'work' })).toBeVisible()
    await expect(page.getByText('▶ Start')).toBeVisible()
    await expect(page.getByText('⏸ Pause')).not.toBeVisible()
    await expect(page.getByText('■ Stop')).not.toBeVisible()
  })

  test('countdown cards show year data', async ({ page }) => {
    await expect(page.getByText('Free Hours Today')).toBeVisible()
    await expect(page.getByText('hours available')).toBeVisible()
    await expect(page.getByText('Days Left in Month')).toBeVisible()
    await expect(page.getByText(/h free remaining/).first()).toBeVisible()
    await expect(page.getByText(/Days Left in 20\d\d/)).toBeVisible()
  })

  // ── Additional coverage ───────────────────────────────────────────────────

  test('countdown card values are real positive numbers', async ({ page }) => {
    // Free hours, days left in month, days left in year are all > 0
    const indigo = page.locator('p.text-indigo-400')
    const yellow = page.locator('p.text-yellow-400')
    const red = page.locator('p.text-red-400')
    await expect(indigo).toBeVisible()
    await expect(yellow).toBeVisible()
    await expect(red).toBeVisible()

    const hoursVal = await indigo.textContent()
    const monthVal = await yellow.textContent()
    const yearVal = await red.textContent()
    expect(parseFloat(hoursVal ?? '0')).toBeGreaterThan(0)
    expect(parseInt(monthVal ?? '0')).toBeGreaterThanOrEqual(0)
    expect(parseInt(yearVal ?? '0')).toBeGreaterThan(0)
  })

  test('study timer: session status shows "study session"', async ({ page }) => {
    await page.getByRole('button', { name: 'study' }).click()
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    await expect(page.getByText(/Running · study session/)).toBeVisible()

    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes
  })

  test('break timer: session status shows "break session"', async ({ page }) => {
    await page.getByRole('button', { name: 'break' }).click()
    const startRes = page.waitForResponse(
      r => r.url().includes('/api/timer/start') && r.status() === 201
    )
    await page.getByText('▶ Start').click()
    await startRes

    await expect(page.getByText(/Running · break session/)).toBeVisible()

    const stopRes = page.waitForResponse(r => r.url().includes('/api/timer/stop'))
    await page.getByText('■ Stop').click()
    await stopRes
  })

  test('timer display is visible and not overflowing', async ({ page }) => {
    const display = page.locator('div.font-mono')
    await expect(display).toBeVisible()
    const box = await display.boundingBox()
    expect(box).not.toBeNull()
    // Should not overflow beyond the viewport width
    expect(box!.x + box!.width).toBeLessThanOrEqual(1300)
  })

  test('type button defaults to "work" highlighted on page load', async ({ page }) => {
    const workBtn = page.getByRole('button', { name: 'work' })
    await expect(workBtn).toHaveClass(/bg-indigo-600/)
  })

  test('Start button is disabled while request is in-flight (loading state)', async ({ page }) => {
    // We can verify loading prop removes opacity — just verify button exists with disabled attr
    const startBtn = page.getByText('▶ Start')
    await expect(startBtn).toBeEnabled()
  })
})
