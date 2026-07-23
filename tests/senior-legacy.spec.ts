import { expect, test } from '@playwright/test'
import { resetDemoStorage } from './helpers/workspace'

test.describe('senior workspace regression boundary', () => {
  test('remains on the legacy UI foundation with its existing zoom control', async ({ page }) => {
    await resetDemoStorage(page)
    await page.goto('/senior')
    await expect(page).toHaveURL(/\/senior$/)

    await expect(page.locator('[data-ui-mode="workspace-v2"]')).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Interface zoom' })).toHaveCount(2)
    await expect(page.getByRole('group', { name: /плотност|density/i })).toHaveCount(0)
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
  const routesWithLegacyZoom = new Set(
    frozenRoutes.filter((route) => route !== '/suppliers' && route !== '/journal'),
  )

  for (const route of frozenRoutes) {
    test(`keeps the frozen legacy screenshot for ${route}`, async ({ page }) => {
      await resetDemoStorage(page)
      await page.goto(route)
      await expect(page.locator('[data-ui-mode="workspace-v2"]')).toHaveCount(0)
      await expect(page.getByRole('group', { name: 'Interface zoom' })).toHaveCount(
        routesWithLegacyZoom.has(route) ? 2 : 0,
      )
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
