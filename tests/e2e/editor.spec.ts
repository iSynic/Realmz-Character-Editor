import fs from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'

const realmzRoot = process.env.REALMZ_ROOT ?? 'F:\\Realmz'
const traskPath = path.join(realmzRoot, 'out_win_clang', 'Character Files', 'Traskelion')

test('uploads, edits, and downloads a Realmz character', async ({ page }) => {
  test.skip(!fs.existsSync(traskPath), `Realmz fixture not found at ${traskPath}`)

  await page.goto('/')
  await page.getByLabel('Upload character file').setInputFiles(traskPath)
  await expect(page.getByText(/Opened Traskelion/)).toBeVisible()
  await page.getByLabel('Level').fill('13')
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
  await expect(page.getByRole('button', { name: 'Download' })).toBeEnabled()
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe('Traskelion')
})
