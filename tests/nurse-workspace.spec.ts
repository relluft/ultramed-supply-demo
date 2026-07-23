import { expect, test } from '@playwright/test'
import {
  expectFullyUnclipped,
  expectNoViewportHorizontalOverflow,
  nurseWorkspace,
  openNurseRoute,
  resetDemoStorage,
  type NurseRole,
} from './helpers/workspace'

const nurseRoles: NurseRole[] = ['nurse-101', 'nurse-102', 'nurse-105']
const desktopViewports = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
]
const nurseRoutes = [
  '/cabinet',
  '/cabinet#request',
  '/cabinet#my-requests',
  '/cabinet/materials',
  '/cabinet/settings',
  '/cabinet/journal',
]

test.describe('nurse workspace-v2', () => {
  test.beforeEach(async ({ page }) => {
    await resetDemoStorage(page)
  })

  for (const role of nurseRoles) {
    for (const viewport of desktopViewports) {
      test(`${role} renders all workspace states at ${viewport.width}x${viewport.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport)

        for (const route of nurseRoutes) {
          await openNurseRoute(page, route, role)
          await expectNoViewportHorizontalOverflow(page)
          await expect(nurseWorkspace(page)).toBeVisible()
        }
      })
    }
  }

  test('keeps the request workspace and its primary actions unclipped at 1280x720', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')
    await expect(page).toHaveURL(/\/cabinet#request$/)
    await expectNoViewportHorizontalOverflow(page)

    const primaryControls = [
      page.getByPlaceholder('Поиск по названию'),
      page.getByRole('button', { name: 'Позиция не найдена', exact: true }),
      page.getByRole('columnheader', { name: 'Действие', exact: true }),
      page.getByRole('button', { name: 'Демо', exact: true }),
      page.getByRole('button', { name: 'Сформировать', exact: true }),
    ]

    for (const control of primaryControls) {
      await expectFullyUnclipped(control)
    }
  })

  test('opens settings from the home page and keeps the sidebar item active', async ({ page }) => {
    await openNurseRoute(page, '/cabinet')

    await page.getByRole('link', { name: 'Настройки Параметры кабинета', exact: true }).click()

    await expect(page).toHaveURL(/\/cabinet\/settings$/)
    await expect(page.getByRole('heading', { name: 'Настройки', exact: true })).toBeVisible()
    await expect(page.locator('.nurse-sidebar-link[aria-current="page"]')).toHaveText('Настройки')
  })

  test('keeps the history action column reachable without page-level horizontal scrolling', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#my-requests')
    await expect(page).toHaveURL(/\/cabinet#my-requests$/)
    await expectNoViewportHorizontalOverflow(page)

    const openButton = page.getByRole('button', { name: 'Открыть', exact: true }).first()
    await expectFullyUnclipped(openButton)
  })

  test('does not show density controls in the sidebar', async ({ page }) => {
    await openNurseRoute(page, '/cabinet')

    await expect(page.getByText('Плотность', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('group', { name: 'Плотность интерфейса' })).toHaveCount(0)
  })

  test('modal traps focus, closes with Escape, and restores focus to its trigger', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')

    const trigger = page.getByRole('button', { name: 'Позиция не найдена', exact: true })
    await trigger.focus()
    await trigger.click()

    const dialog = page.getByRole('dialog', { name: 'Позиция не найдена', exact: true })
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    await expect
      .poll(() => dialog.evaluate((element) => element.contains(document.activeElement)))
      .toBe(true)
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe('hidden')

    const focusable = dialog.locator(
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    await expect(focusable).not.toHaveCount(0)
    const first = focusable.first()
    const last = focusable.last()

    await last.focus()
    await page.keyboard.press('Tab')
    await expect(first).toBeFocused()

    await first.focus()
    await page.keyboard.press('Shift+Tab')
    await expect(last).toBeFocused()

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('resizes the cart by pointer and keyboard through the screen midpoint', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')

    const separator = page.getByRole('separator', { name: 'Изменить ширину заявки' })
    const resizeMark = separator.locator('.nurse-request-resizer-mark')
    const catalog = page.locator('.nurse-catalog-pane')
    const cart = page.locator('.nurse-cart-panel')
    const separatorBox = await separator.boundingBox()
    expect(separatorBox).not.toBeNull()

    await page.mouse.move(separatorBox!.x + separatorBox!.width / 2, separatorBox!.y + 120)
    await page.mouse.down()
    await page.mouse.move(separatorBox!.x - 48, separatorBox!.y + 120)
    await page.mouse.up()

    const pointerCatalogBox = await catalog.boundingBox()
    const pointerCartBox = await cart.boundingBox()
    expect(pointerCatalogBox!.width).toBeGreaterThanOrEqual(319)
    expect(pointerCartBox!.width).toBeGreaterThan(340)
    await expect(resizeMark).toBeVisible()

    await separator.focus()
    await page.keyboard.press('End')
    const maximumWidth = Number(await separator.getAttribute('aria-valuemax'))
    const currentWidth = Number(await separator.getAttribute('aria-valuenow'))
    expect(currentWidth).toBe(maximumWidth)
    expect(currentWidth).toBeGreaterThanOrEqual(320)
    expect(currentWidth).toBeGreaterThanOrEqual(640)
    const keyboardCatalogBox = await catalog.boundingBox()
    expect(keyboardCatalogBox!.width).toBeGreaterThanOrEqual(319)
    expect(keyboardCatalogBox!.x + keyboardCatalogBox!.width).toBeLessThanOrEqual(640)
  })

  test('opens detailed filters and selects a clinical direction', async ({ page }) => {
    await openNurseRoute(page, '/cabinet#request')

    await page.getByRole('button', { name: 'Фильтры', exact: true }).click()
    const filters = page.getByRole('dialog', { name: 'Подробные фильтры каталога' })
    await expect(filters).toBeVisible()

    const orthodontics = filters.getByRole('button', { name: 'Ортодонтия', exact: true })
    await orthodontics.click()
    await expect(orthodontics).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('row', { name: /Ортодонтия/ }).first()).toBeVisible()
  })

  test('keeps preview actions visible and shows the selected responsible nurse', async ({
    page,
  }) => {
    await openNurseRoute(page, '/cabinet#request')
    await page.getByLabel('Ответственный').selectOption({
      label: 'Ксения Андреевна Тихонова',
    })
    await page.getByRole('button', { name: 'Добавить', exact: true }).first().click()
    await page.getByRole('button', { name: 'Сформировать', exact: true }).click()

    const preview = page.getByRole('dialog', {
      name: 'Проверка заявки перед отправкой',
      exact: true,
    })
    await expect(preview).toBeVisible()
    await expect(preview.getByText('Ксения Андреевна Тихонова', { exact: true })).toBeVisible()
    await expectFullyUnclipped(
      preview.getByRole('button', { name: 'Подтвердить', exact: true }),
    )
  })

  for (const viewport of [
    { width: 640, height: 360 },
    { width: 320, height: 180 },
  ]) {
    test(`keeps every request action reachable under ${viewport.width}x${viewport.height} reflow`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport)
      await openNurseRoute(page, '/cabinet#request')
      await expectNoViewportHorizontalOverflow(page)
      await expect(page.locator('.nurse-request-workspace')).toHaveAttribute(
        'data-stacked',
        'true',
      )

      const manualButton = page.getByRole('button', {
        name: 'Позиция не найдена',
        exact: true,
      })
      await manualButton.scrollIntoViewIfNeeded()
      await expect(manualButton).toBeVisible()

      const submitButton = page.getByRole('button', {
        name: 'Сформировать',
        exact: true,
      })
      await submitButton.scrollIntoViewIfNeeded()
      await expect(submitButton).toBeVisible()

      await manualButton.click()
      const manualDialog = page.getByRole('dialog', {
        name: 'Позиция не найдена',
        exact: true,
      })
      await expect(manualDialog).toBeVisible()
      await expectFullyUnclipped(
        manualDialog.getByRole('button', { name: 'Отмена', exact: true }),
      )
      await expectFullyUnclipped(
        manualDialog.getByRole('button', { name: 'Добавить в заявку', exact: true }),
      )
      await page.keyboard.press('Escape')
    })
  }

  test('keeps the loading dialog modal, cancellable, and focus-safe', async ({ page }) => {
    await openNurseRoute(page, '/cabinet#request')
    await page.getByLabel('Ответственный').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Добавить', exact: true }).first().click()
    await page.getByRole('button', { name: 'Сформировать', exact: true }).click()
    await page.clock.install()

    const preview = page.getByRole('dialog', {
      name: 'Проверка заявки перед отправкой',
      exact: true,
    })
    const confirm = preview.getByRole('button', { name: 'Подтвердить', exact: true })
    await expect(confirm).toBeFocused()
    await confirm.click()

    const loading = page.getByRole('dialog', { name: 'Формируем заявку', exact: true })
    await expect(loading).toBeVisible()
    await expect(loading).toHaveAttribute('aria-modal', 'true')
    await expect
      .poll(() => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe('hidden')
    await page.keyboard.press('Escape')

    await expect(loading).toBeHidden()
    const restoredPreview = page.getByRole('dialog', {
      name: 'Проверка заявки перед отправкой',
      exact: true,
    })
    await expect(restoredPreview).toBeVisible()
    await expect(
      restoredPreview.getByRole('button', { name: 'Подтвердить', exact: true }),
    ).toBeFocused()
  })

  test('stores the selected responsible nurse and shows her in request history', async ({ page }) => {
    await openNurseRoute(page, '/cabinet')
    await expect(page.getByRole('heading', { name: 'Кабинет 105', exact: true })).toBeVisible()
    await expect(page.locator('.nurse-sidebar-profile-name')).toHaveText('Кабинет 105')
    await expect(page.locator('.nurse-sidebar-profile-role')).toHaveText('Ортодонтия')

    await page.getByRole('link', { name: 'Заявка', exact: true }).click()
    await page.getByLabel('Ответственный').selectOption({
      label: 'Мария Олеговна Громова',
    })
    await page.getByRole('button', { name: 'Добавить', exact: true }).first().click()
    await page.getByRole('button', { name: 'Сформировать', exact: true }).click()
    await page
      .getByRole('dialog', { name: 'Проверка заявки перед отправкой', exact: true })
      .getByRole('button', { name: 'Подтвердить', exact: true })
      .click()

    const done = page.getByRole('dialog', { name: 'Готово', exact: true })
    await expect(done).toBeVisible()
    await done.getByRole('button', { name: 'Закрыть', exact: true }).click()
    await page.getByRole('link', { name: 'История', exact: true }).click()

    const newestRequest = page
      .getByRole('region', { name: 'История заявок кабинета' })
      .locator('tbody tr')
      .first()
    await expect(newestRequest).toContainText('Мария Олеговна Громова')
  })

  test('uses compact labels and caps the growing request comment at twice its height', async ({ page }) => {
    await openNurseRoute(page, '/cabinet#request')

    const responsible = page.getByLabel('Ответственный')
    await expect(responsible).toHaveValue('')
    await expect(responsible.locator('option').first()).toHaveText('Выбрать')

    const responsibleGroup = responsible.locator('..')
    const groupBox = await responsibleGroup.boundingBox()
    expect(groupBox).not.toBeNull()
    await responsibleGroup.click({ position: { x: groupBox!.width - 4, y: 4 } })
    await expect(responsible).not.toBeFocused()

    const comment = page.getByLabel('Комментарий')
    await expect(comment).not.toHaveAttribute('placeholder')
    const initialHeight = await comment.evaluate((element) => element.getBoundingClientRect().height)
    expect(initialHeight).toBeGreaterThanOrEqual(128)

    await comment.fill(Array.from({ length: 10 }, (_, index) => `Строка ${index + 1}`).join('\n'))
    await expect
      .poll(() => comment.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(initialHeight)
    const overflow = await comment.evaluate((element) => ({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
    }))
    expect(overflow.scrollHeight).toBeLessThanOrEqual(overflow.clientHeight)

    await comment.fill(Array.from({ length: 30 }, (_, index) => `Длинная строка ${index + 1}`).join('\n'))
    await expect
      .poll(() => comment.evaluate((element) => element.getBoundingClientRect().height))
      .toBeLessThanOrEqual(initialHeight * 2)
    const cappedOverflow = await comment.evaluate((element) => ({
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
      scrollHeight: element.scrollHeight,
    }))
    expect(cappedOverflow.scrollHeight).toBeGreaterThan(cappedOverflow.clientHeight)
    expect(cappedOverflow.overflowY).toBe('auto')
  })

  test('shows cabinet quantities, expiry batches, statuses, and confirmed removal', async ({ page }) => {
    await openNurseRoute(page, '/cabinet/materials')
    await expectNoViewportHorizontalOverflow(page)

    const tableViewport = page.getByRole('region', { name: 'Справочник материалов' })
    await expect(page.getByRole('columnheader', { name: '№', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Название', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Категория', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Единица измерения', exact: true })).toBeVisible()
    const nameHeader = page.getByRole('columnheader', { name: 'Название', exact: true })
    await expect(page.getByRole('columnheader', { name: 'Упаковка', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Количество', exact: true })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Срок годности', exact: true })).toBeVisible()
    await expect(nameHeader).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(nameHeader).toHaveCSS('font-weight', '400')
    await expect(nameHeader).toHaveCSS('text-align', 'center')
    await expect(page.getByRole('cell').first()).toHaveText('1')
    await expect(page.getByRole('cell').first()).toHaveCSS('background-color', 'rgb(255, 240, 242)')
    const firstNameCell = page.locator('tbody tr').first().locator('td').nth(1)
    await expect(firstNameCell).toHaveCSS('font-weight', '400')
    await expect(firstNameCell).not.toBeEmpty()
    await expect(page.getByText('Перчатки нитриловые M', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: 'Альтернативы', exact: true })).toHaveCount(0)
    await expect(page.getByRole('columnheader', { name: 'Замена', exact: true })).toHaveCount(0)
    await expect(page.getByText('Нельзя заменять без подтверждения')).toHaveCount(0)
    await expect(page.getByText(/^Годен до /).first()).toBeVisible()
    const warningExpiryLabel = page.getByText(/^Внимание · до /).first()
    await expect(warningExpiryLabel).toBeVisible()
    await expect(warningExpiryLabel).toHaveCSS('border-style', 'none')
    await expect(warningExpiryLabel).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    await expect(warningExpiryLabel.locator('xpath=..')).toHaveCSS('text-align', 'left')
    await expect(page.getByText(/^Просрочено · /).first()).toBeVisible()
    await expect(page.getByText('Не требуется').first()).toBeVisible()

    await expect(page.getByLabel('Сортировка')).toHaveValue('expiry-priority')
    const expiryOrder = await page.locator('tbody tr').evaluateAll((rows) =>
      rows.map((row) => row.getAttribute('data-expiry-tone') ?? 'none'),
    )
    const expiryPriority = { danger: 0, warning: 1, success: 2, none: 3 } as const
    expect(expiryOrder.map((status) => expiryPriority[status as keyof typeof expiryPriority]))
      .toEqual([...expiryOrder.map((status) => expiryPriority[status as keyof typeof expiryPriority])].sort((a, b) => a - b))

    await page.getByLabel('Статус срока').selectOption('warning')
    await expect(page.locator('tbody tr')).toHaveCount(await page.locator('tbody tr[data-expiry-tone="warning"]').count())
    await page.getByLabel('Статус срока').selectOption('all')

    await page.getByLabel('Категория').selectOption({ label: 'Анестезия' })
    await expect(page.locator('tbody tr').first()).toContainText('Анестезия')
    await page.getByLabel('Категория').selectOption('all')

    await page.getByLabel('Поиск').fill('Артикаин')
    await expect(page.locator('tbody tr')).toHaveCount(2)
    await page.getByLabel('Поиск').fill('')

    const articaineRows = page.locator('tbody tr').filter({ hasText: 'Артикаин 4% с адреналином' })
    await expect(articaineRows).toHaveCount(2)
    await expect(articaineRows.nth(0)).not.toHaveText(await articaineRows.nth(1).innerText())

    const normalRow = page.locator('tbody tr[data-expiry-tone="success"]').first()
    const warningRow = page.locator('tbody tr[data-expiry-tone="warning"]').first()
    const expiredRow = page.locator('tbody tr[data-expiry-tone="danger"]').first()
    await expect(normalRow.locator('td').first()).toHaveCSS('background-color', 'rgb(238, 248, 243)')
    await expect(warningRow.locator('td').first()).toHaveCSS('background-color', 'rgb(255, 248, 223)')
    await expect(expiredRow.locator('td').first()).toHaveCSS('background-color', 'rgb(255, 240, 242)')

    const rowsBeforeRemoval = await page.locator('tbody tr').count()
    const deleteButton = articaineRows.nth(0).getByRole('button', { name: /^Удалить Артикаин 4% с адреналином/ })
    await expect(deleteButton).toHaveCSS('color', 'rgb(17, 17, 17)')
    await expect(deleteButton).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await deleteButton.click()

    const confirmation = page.getByRole('dialog', { name: 'Удалить материал из кабинета?' })
    await expect(confirmation).toBeVisible()
    await expect(confirmation).toContainText('Артикаин 4% с адреналином 1:100 000')
    await confirmation.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(confirmation).toHaveCount(0)
    await expect(page.locator('tbody tr')).toHaveCount(rowsBeforeRemoval - 1)
    await expect(articaineRows).toHaveCount(1)

    const dimensions = await tableViewport.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }))
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth)
  })
})
