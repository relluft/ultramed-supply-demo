import { expect, test } from '@playwright/test'
import { resetDemoStorage } from './helpers/workspace'

test.describe('senior workspace regression boundary', () => {
  test('uses the shared sidebar footer without a global zoom control', async ({ page }) => {
    await resetDemoStorage(page)
    await page.goto('/senior')
    await expect(page).toHaveURL(/\/senior$/)

    await expect(page.locator('[data-ui-mode="workspace-v2"]')).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Interface zoom' })).toHaveCount(0)
    await expect(page.locator('.app-sidebar').getByRole('button', { name: 'Сбросить демо' })).toHaveCount(0)
    await expect(page.locator('.app-sidebar').getByRole('link', { name: 'Настройки' })).toBeVisible()
    await expect(page.locator('.app-sidebar').getByRole('button', { name: 'Выйти' })).toBeVisible()
    const homeLink = page.locator('.app-sidebar').getByRole('link', { name: 'Главная' })
    await expect(homeLink).toBeVisible()
    await expect(homeLink).toHaveAttribute('href', '/senior')
    await expect(page.locator('.app-sidebar nav')).toHaveCSS('overflow-y', 'hidden')
    await expect(page.locator('.app-workspace-surface')).toHaveCSS('padding-left', '0px')

    await expect(page.getByRole('group', { name: /плотност|density/i })).toHaveCount(0)
  })

  test('returns to the senior home page from the sidebar', async ({ page }) => {
    await resetDemoStorage(page)
    await page.goto('/senior#requests')

    await page.locator('.app-sidebar').getByRole('link', { name: 'Главная' }).click()

    await expect(page).toHaveURL(/\/senior$/)
    await expect(page.getByRole('heading', { name: 'Главная' })).toBeVisible()
    await expect(page.locator('.app-sidebar').getByRole('link', { name: 'Главная' })).toHaveClass(/bg-\[linear-gradient/)
    await expect(page.getByRole('navigation', { name: 'Основные действия' }).getByRole('link')).toHaveCount(3)
    await expect(page.getByRole('navigation', { name: 'Все разделы' }).getByRole('link')).toHaveCount(6)
  })

  test('opens the manager home page and keeps analytics as a separate section', async ({ page }) => {
    await resetDemoStorage(page)
    await page.goto('/manager')

    await expect(page).toHaveURL(/\/manager$/)
    await expect(page.getByRole('heading', { name: 'Главная', exact: true })).toBeVisible()
    await expect(page.locator('.app-sidebar a[href="/manager"]')).toHaveClass(/bg-\[linear-gradient/)
    await expect(page.getByRole('navigation', { name: 'Основные действия' }).getByRole('link')).toHaveCount(1)
    await expect(page.getByRole('navigation', { name: 'Все разделы' }).getByRole('link')).toHaveCount(3)

    await page.getByRole('link', { name: 'Открыть аналитику', exact: true }).click()
    await expect(page).toHaveURL(/\/analytics$/)

    await page.locator('.app-sidebar a[href="/manager"]').click()
    await expect(page).toHaveURL(/\/manager$/)
  })

  const frozenRoutes = [
    '/senior',
    '/stock',
    '/replenishment',
    '/orders/forming',
    '/orders',
    '/receipt',
    '/suppliers',
    '/catalog',
    '/journal',
    '/analytics',
  ]

  for (const route of frozenRoutes) {
    test(`keeps the frozen legacy screenshot for ${route}`, async ({ page }) => {
      await resetDemoStorage(page)
      await page.goto(route)
      await expect(page.locator('[data-ui-mode="workspace-v2"]')).toHaveCount(0)
      await expect(page.getByRole('group', { name: 'Interface zoom' })).toHaveCount(0)
      await page.evaluate(() => document.fonts.ready)

      const snapshotName = `legacy-${route.slice(1).replaceAll('/', '-')}.png`
      await expect(page).toHaveScreenshot(snapshotName, {
        animations: 'disabled',
        caret: 'hide',
        fullPage: false,
        maxDiffPixels: 0,
      })
    })
  }
})
