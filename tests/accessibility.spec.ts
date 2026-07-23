import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import {
  openNurseRoute,
  resetDemoStorage,
  type NurseRole,
} from './helpers/workspace'

const roles: NurseRole[] = ['nurse-101', 'nurse-102', 'nurse-105']
const routes = [
  '/cabinet',
  '/cabinet#request',
  '/cabinet#my-requests',
  '/cabinet/materials',
  '/cabinet/settings',
  '/cabinet/journal',
]

async function expectNoSeriousOrCriticalViolations(page: Page, context: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const blockingViolations = result.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  )
  const summary = blockingViolations
    .map(
      (violation) =>
        `${violation.impact}: ${violation.id} (${violation.nodes.length}) ${violation.help}`,
    )
    .join('\n')

  expect(blockingViolations, `${context}\n${summary}`).toEqual([])
}

test.describe('nurse accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoStorage(page)
  })

  for (const role of roles) {
    for (const route of routes) {
      test(`${role} ${route} has no serious or critical axe violations`, async ({ page }) => {
        await openNurseRoute(page, route, role)
        await expectNoSeriousOrCriticalViolations(
          page,
          `${role} ${route} axe violations`,
        )
      })
    }
  }

  test('manual-position dialog has no serious or critical axe violations', async ({ page }) => {
    await openNurseRoute(page, '/cabinet#request')
    await page.getByRole('button', { name: 'Позиция не найдена', exact: true }).click()
    await expect(page.getByRole('dialog', { name: 'Позиция не найдена', exact: true })).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Manual-position dialog axe violations')
  })

  test('preview and completion dialogs have no serious or critical axe violations', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')
    await page.getByLabel('Ответственный').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Добавить', exact: true }).first().click()
    await page.getByRole('button', { name: 'Сформировать', exact: true }).click()

    const preview = page.getByRole('dialog', {
      name: 'Проверка заявки перед отправкой',
      exact: true,
    })
    await expect(preview).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Preview dialog axe violations')

    await preview.getByRole('button', { name: 'Подтвердить', exact: true }).click()
    const done = page.getByRole('dialog', { name: 'Готово', exact: true })
    await expect(done).toBeVisible()
    await expectNoSeriousOrCriticalViolations(page, 'Completion dialog axe violations')
  })

  test('visible controls keep 40px targets and the focus token remains visible', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')

    const undersizedControls = await page.locator('.workspace-v2-root').evaluate((root) => {
      const selector = 'a[href], button, input, select, textarea'
      return Array.from(root.querySelectorAll<HTMLElement>(selector))
        .filter((element) => {
          const style = getComputedStyle(element)
          const rect = element.getBoundingClientRect()
          return (
            style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            rect.width > 0 &&
            rect.height > 0
          )
        })
        .map((element) => {
          const rect = element.getBoundingClientRect()
          return {
            label:
              element.getAttribute('aria-label') ||
              element.textContent?.trim().slice(0, 80) ||
              element.tagName,
            width: rect.width,
            height: rect.height,
          }
        })
        .filter(({ width, height }) => width < 39.5 || height < 39.5)
    })

    expect(undersizedControls).toEqual([])

    const search = page.getByRole('textbox', { name: 'Поиск по каталогу материалов' })
    await search.focus()
    const focusStyle = await search.evaluate((element) => {
      const style = getComputedStyle(element)
      return {
        color: style.outlineColor,
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
        offset: Number.parseFloat(style.outlineOffset),
      }
    })

    expect(focusStyle.style).toBe('solid')
    expect(focusStyle.width).toBeGreaterThanOrEqual(2)
    expect(focusStyle.offset).toBeGreaterThanOrEqual(2)
    expect(focusStyle.color).toMatch(/^rgb/)
  })

  test('status badges always expose text together with a semantic tone', async ({ page }) => {
    await openNurseRoute(page, '/cabinet#my-requests')

    const invalidBadges = await page.locator('.workspace-status-badge').evaluateAll((badges) =>
      badges
        .map((badge) => ({
          text: badge.textContent?.trim() ?? '',
          tone: badge.getAttribute('data-tone') ?? '',
        }))
        .filter(({ text, tone }) => !text || !tone),
    )

    expect(invalidBadges).toEqual([])
  })
})
