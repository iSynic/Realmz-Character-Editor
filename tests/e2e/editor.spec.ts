import fs from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'

const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const traskPath = path.join(realmzRoot, 'out_win_clang', 'Character Files', 'Traskelion')

async function dragFirstCatalogItemToInventory(page: Page) {
  const sourceBox = await page.locator('.catalog .item-row').first().boundingBox()
  const targetBox = await page.locator('.inventory-dropzone').boundingBox()
  if (!sourceBox || !targetBox) {
    throw new Error('item drag source or inventory drop target is not visible')
  }

  const startX = sourceBox.x + sourceBox.width / 2
  const startY = sourceBox.y + sourceBox.height / 2
  const endX = targetBox.x + targetBox.width / 2
  const endY = targetBox.y + targetBox.height / 2

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX - 80, startY, { steps: 10 })
  await page.mouse.move(endX, endY, { steps: 20 })
  await page.mouse.up()
}

test('uploads, edits, and downloads a Realmz character', async ({ page }) => {
  test.skip(!fs.existsSync(traskPath), `Realmz fixture not found at ${traskPath}`)

  await page.goto('./')
  await page.locator('input[type="file"]').setInputFiles(traskPath)
  await expect(page.getByText(/Opened Traskelion/)).toBeVisible()
  await page.getByRole('button', { name: 'Level Up' }).click()
  await expect(page.getByText(/Leveled Traskelion to level/)).toBeVisible()
  await page.getByRole('button', { name: 'Items' }).click()
  await page.waitForFunction(() =>
    Array.from(document.querySelectorAll<HTMLImageElement>('img[src*="realmz-assets"]')).every(
      (img) => img.complete,
    ),
  )
  const brokenAssets = await page.$$eval('img[src*="realmz-assets"]', (images) =>
    images
      .filter((image) => image instanceof HTMLImageElement && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  )
  expect(brokenAssets).toEqual([])
  await page.getByRole('checkbox', { name: 'Usable' }).check()
  await expect(page.locator('.catalog .item-row').first()).toBeVisible()
  const inventoryRows = page.locator('.inventory-dropzone .item-row')
  const initialInventoryCount = await inventoryRows.count()
  if (initialInventoryCount < 30) {
    await dragFirstCatalogItemToInventory(page)
    await expect(inventoryRows).toHaveCount(initialInventoryCount + 1)
  }
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Traskelion')
})
