import { expect, type Locator, type Page } from '@playwright/test'

export type NurseRole = 'nurse-101' | 'nurse-102' | 'nurse-105'

export const nurseWorkspace = (page: Page) =>
  page.locator('.workspace-v2-root[data-ui-mode="workspace-v2"]')

export async function resetDemoStorage(page: Page) {
  await page.addInitScript(() => {
    if (window.sessionStorage.getItem('__medsupply_e2e_storage_reset__') === 'done') return

    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith('ultramed-')) {
        window.localStorage.removeItem(key)
      }
    }
    window.sessionStorage.setItem('__medsupply_e2e_storage_reset__', 'done')
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

export async function openNurseRoute(
  page: Page,
  route: string,
  role: NurseRole = 'nurse-105',
) {
  await page.goto(route)
  await expect(nurseWorkspace(page)).toHaveCount(1)
  await expect(nurseWorkspace(page)).toBeVisible()
  await expect(nurseWorkspace(page)).toHaveAttribute('data-density', /^(compact|standard|comfortable)$/)

  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem('ultramed-supply-demo-state')),
    )
    .not.toBeNull()

  const roleChanged = await page.evaluate((nextRole) => {
    const key = 'ultramed-supply-demo-state'
    const serialized = window.localStorage.getItem(key)
    if (!serialized) return false

    const state = JSON.parse(serialized) as { role?: string }
    if (state.role === nextRole) return false
    state.role = nextRole
    window.localStorage.setItem(key, JSON.stringify(state))
    return true
  }, role)

  if (roleChanged) {
    await page.reload()
    await expect(nurseWorkspace(page)).toBeVisible()
  }
}

type VisibleGeometry = {
  element: { left: number; right: number; top: number; bottom: number }
  clippingBounds: { left: number; right: number; top: number; bottom: number }
}

/**
 * Checks both the viewport and every clipping/scrolling ancestor. A plain
 * bounding-box assertion misses controls hidden by an overflow container.
 */
export async function expectFullyUnclipped(locator: Locator) {
  await expect(locator).toBeVisible()

  const geometry = await locator.evaluate<VisibleGeometry>((element) => {
    const rect = element.getBoundingClientRect()
    const clippingBounds = {
      left: 0,
      right: window.innerWidth,
      top: 0,
      bottom: window.innerHeight,
    }

    let ancestor = element.parentElement
    while (ancestor) {
      const style = window.getComputedStyle(ancestor)
      const clipsX = /(auto|clip|hidden|scroll)/.test(style.overflowX)
      const clipsY = /(auto|clip|hidden|scroll)/.test(style.overflowY)

      if (clipsX || clipsY) {
        const ancestorRect = ancestor.getBoundingClientRect()
        if (clipsX) {
          clippingBounds.left = Math.max(clippingBounds.left, ancestorRect.left)
          clippingBounds.right = Math.min(clippingBounds.right, ancestorRect.right)
        }
        if (clipsY) {
          clippingBounds.top = Math.max(clippingBounds.top, ancestorRect.top)
          clippingBounds.bottom = Math.min(clippingBounds.bottom, ancestorRect.bottom)
        }
      }

      ancestor = ancestor.parentElement
    }

    return {
      element: {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
      },
      clippingBounds,
    }
  })

  const tolerance = 1
  expect(geometry.element.left, 'element left edge is clipped').toBeGreaterThanOrEqual(
    geometry.clippingBounds.left - tolerance,
  )
  expect(geometry.element.right, 'element right edge is clipped').toBeLessThanOrEqual(
    geometry.clippingBounds.right + tolerance,
  )
  expect(geometry.element.top, 'element top edge is clipped').toBeGreaterThanOrEqual(
    geometry.clippingBounds.top - tolerance,
  )
  expect(geometry.element.bottom, 'element bottom edge is clipped').toBeLessThanOrEqual(
    geometry.clippingBounds.bottom + tolerance,
  )
}

export async function expectNoViewportHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    bodyClientWidth: document.body.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    rootClientWidth: document.documentElement.clientWidth,
    rootScrollWidth: document.documentElement.scrollWidth,
  }))

  expect(
    dimensions.bodyScrollWidth,
    `body overflowed horizontally: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.bodyClientWidth + 1)
  expect(
    dimensions.rootScrollWidth,
    `documentElement overflowed horizontally: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.rootClientWidth + 1)
}


