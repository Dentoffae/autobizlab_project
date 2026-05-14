import { test, expect } from '@playwright/test'

test.describe('Landing quick lead', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/v1/portfolio/landings', async (route) => {
      await route.fulfill({ status: 200, body: '[]', contentType: 'application/json' })
    })
    await page.route('**/api/v1/portfolio/cases', async (route) => {
      await route.fulfill({ status: 200, body: '[]', contentType: 'application/json' })
    })
  })

  test('submits hero form when API ok', async ({ page }) => {
    await page.route('**/api/v1/leads/quick', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 1, created: true }),
      })
    })

    await page.goto('/ru')

    await page.locator('.hero-form input[name="name"]').fill('E2E Client')
    await page.locator('.hero-form input[name="phone"]').fill('+971500000000')
    await page.locator('.hero-form input[name="privacy_consent"]').check()

    await page.locator('.hero-form .hero-submit-btn').click()

    await expect(page.locator('.success-title')).toBeVisible({ timeout: 15000 })
  })
})
