import { test, expect } from '@playwright/test'

test.describe('Admin login + panel', () => {
  test('logs in and shows admin title', async ({ page }) => {
    let authed = false

    await page.route('**/api/v1/auth/me', async (route) => {
      if (authed) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ username: 'e2e_admin' }),
        })
        return
      }
      await route.fulfill({ status: 401, body: '{}' })
    })

    await page.route('**/api/v1/auth/has-admins', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ has_admins: true }),
      })
    })

    await page.route('**/api/v1/auth/login', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      authed = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    })

    await page.route('**/api/v1/admin/settings', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' })
    })

    await page.route('**/api/v1/leads/**', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], total: 0, skip: 0, limit: 50 }),
      })
    })

    await page.goto('/ru/admin/login')

    await page.locator('.login-form input[type="text"]').fill('e2e_admin')
    await page.locator('.login-form input[type="password"]').fill('SomePassword123')
    await page.locator('.login-form .login-btn').click()

    await expect(page.locator('.admin-title')).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.admin-user-name')).toContainText('e2e_admin')
  })
})
