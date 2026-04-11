import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const SS = (name: string) => path.join('e2e', 'screenshots', `mobile_${name}.png`)

test.describe('mobile layout & export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // ─── M1. モバイルレイアウト: アプリがビューポートを埋めているか ──────
  test('M1 レイアウト — アプリがビューポート全体を埋める', async ({ page }) => {
    const viewport = page.viewportSize()!

    // #root の高さがビューポートと一致しているか（±5px 許容）
    const rootHeight = await page.locator('#root').evaluate(
      (el) => el.getBoundingClientRect().height
    )
    expect(rootHeight).toBeGreaterThanOrEqual(viewport.height - 5)

    await page.screenshot({ path: SS('M1_layout_fullscreen') })
  })

  // ─── M2. モバイルレイアウト: タブUIが表示されるか ────────────────
  test('M2 レイアウト — モバイルではタブバーが表示される', async ({ page }) => {
    const viewport = page.viewportSize()!

    if (viewport.width <= 640) {
      // タブバーが表示されているか
      await expect(page.locator('button:has-text("キャンバス")')).toBeVisible()
      await expect(page.locator('button:has-text("出席者")')).toBeVisible()
    } else {
      // デスクトップではサイドパネルが表示
      await expect(page.locator('h1:has-text("座席")')).toBeVisible()
    }

    await page.screenshot({ path: SS('M2_tab_visible') })
  })

  // ─── M3. モバイルレイアウト: キャンバスエリアが十分な高さを持つ ──
  test('M3 レイアウト — キャンバスエリアが画面の大部分を占める', async ({ page }) => {
    const viewport = page.viewportSize()!
    const canvas = page.locator('[data-testid="canvas"]')
    await expect(canvas).toBeVisible()

    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // キャンバス幅がビューポート幅と一致しているか
    expect(box!.width).toBeGreaterThanOrEqual(viewport.width - 10)

    // キャンバス高さがビューポート高さの60%以上あるか
    // （タブバー52px などを除いた残り）
    expect(box!.height).toBeGreaterThanOrEqual(viewport.height * 0.6)

    await page.screenshot({ path: SS('M3_canvas_size') })
  })

  // ─── M4. モバイルレイアウト: キャンバスが画面外にはみ出していないか
  test('M4 レイアウト — キャンバスが画面外にはみ出さない', async ({ page }) => {
    const viewport = page.viewportSize()!
    const canvas = page.locator('[data-testid="canvas"]')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()

    // 右端が画面幅を超えていないか
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
    // 下端が画面高さを超えていないか
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1)

    await page.screenshot({ path: SS('M4_no_overflow') })
  })

  // ─── M5. タブ切り替え: 出席者タブで入力欄が表示される ───────────
  test('M5 タブ切り替え — 出席者タブに切り替えるとサイドパネルが表示', async ({ page }) => {
    const viewport = page.viewportSize()!
    if (viewport.width > 640) {
      test.skip() // デスクトップはスキップ
      return
    }

    await page.locator('button:has-text("出席者")').click()
    await expect(page.locator('input[placeholder="名前を入力..."]')).toBeVisible()
    await expect(page.locator('h1:has-text("座席")')).toBeVisible()

    await page.screenshot({ path: SS('M5_panel_tab') })
  })

  // ─── M6. 座席追加後に書き出しボタンが押せるか ────────────────────
  test('M6 書き出し — 座席を追加してから書き出しボタンが押せる', async ({ page }) => {
    const viewport = page.viewportSize()!

    // キャンバスタブがある場合はキャンバスタブを確認
    if (viewport.width <= 640) {
      await expect(page.locator('button:has-text("キャンバス")')).toBeVisible()
    }

    // 座席追加
    await page.locator('[data-testid="canvas"]').click({ position: { x: 150, y: 200 } })
    await expect(page.locator('[data-testid="seat"]')).toHaveCount(1)

    // モバイルの場合は出席者タブに切り替え
    if (viewport.width <= 640) {
      await page.locator('button:has-text("出席者")').click()
    }

    // 書き出しボタンが有効になっているか
    const exportBtn = page.locator('button:has-text("書き出し")')
    await expect(exportBtn).not.toBeDisabled()

    await page.screenshot({ path: SS('M6_export_btn_enabled') })
  })

  // ─── M7. 書き出し: モバイルでは画像オーバーレイが表示されるか ────
  // navigator.share / canShare をモックして、書き出し時に呼ばれるか検証する
  test('M7 書き出し — モバイルで書き出すとネイティブ共有シートが呼ばれる', async ({ page }) => {
    const viewport = page.viewportSize()!
    if (viewport.width > 640) {
      test.skip()
      return
    }

    // navigator.share / canShare をモックする
    await page.addInitScript(() => {
      const w = window as unknown as Record<string, unknown>
      w.__shareCalledWith = null
      Object.defineProperty(navigator, 'canShare', {
        value: (_data?: ShareData) => true, // ファイル共有をサポートしていると偽装
        writable: true,
      })
      Object.defineProperty(navigator, 'share', {
        value: (data: ShareData) => {
          w.__shareCalledWith = data
          return Promise.resolve()
        },
        writable: true,
      })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // 座席追加
    await page.locator('[data-testid="canvas"]').click({ position: { x: 150, y: 200 } })

    // 出席者タブに切り替え
    await page.locator('button:has-text("出席者")').click()

    // 書き出し実行
    const exportBtn = page.locator('button:has-text("書き出し")')
    await exportBtn.click()

    // navigator.share がファイル付きで呼ばれたか確認
    await page.waitForFunction(() => {
      const w = window as unknown as Record<string, unknown>
      return w.__shareCalledWith !== null
    }, { timeout: 8000 })

    const shareData = await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>
      const data = w.__shareCalledWith as ShareData
      return {
        title: data?.title,
        hasFiles: Array.isArray(data?.files) && (data?.files?.length ?? 0) > 0,
        fileName: data?.files?.[0]?.name,
      }
    })

    expect(shareData.title).toBe('座席表')
    expect(shareData.hasFiles).toBe(true)
    expect(shareData.fileName).toBe('zaseki.png')

    await page.screenshot({ path: SS('M7_share_called') })
  })

  // ─── M8. 共有: モバイルで共有ボタンを押したとき ──────────────────
  // WebKit は clipboard-write 権限付与に対応していないため、clipboard をモックして検証する
  test('M8 共有 — モバイルで共有ボタンを押すと動作する', async ({ page }) => {
    const viewport = page.viewportSize()!
    if (viewport.width > 640) {
      test.skip()
      return
    }

    // navigator.clipboard.writeText をモックして呼び出しを捕捉する
    await page.addInitScript(() => {
      let _lastWritten = ''
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: (text: string) => {
            _lastWritten = text
            ;(window as unknown as Record<string, unknown>).__clipboardText = text
            return Promise.resolve()
          },
          readText: () => Promise.resolve(_lastWritten),
        },
        writable: true,
      })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // 座席追加
    await page.locator('[data-testid="canvas"]').click({ position: { x: 150, y: 200 } })

    // 出席者タブに切り替え
    await page.locator('button:has-text("出席者")').click()

    // 共有ボタン押下（ブラウザ環境では navigator.clipboard が使われる）
    const shareBtn = page.locator('button:has-text("共有")')
    await expect(shareBtn).not.toBeDisabled()
    await shareBtn.click()

    // コピー成功メッセージが表示されるか
    await expect(page.locator('text=URLをコピーしました')).toBeVisible({ timeout: 3000 })

    // コピーされた URL に状態エンコードのハッシュが含まれるか確認
    // 本番・ネイティブ環境では mikotommsh.github.io/zaseki/#... になる
    // 開発環境では localhost/#... になる場合があるため URL 形式のみ検証
    const clipText = await page.evaluate(() =>
      (window as unknown as Record<string, unknown>).__clipboardText as string
    )
    expect(clipText).toMatch(/^https?:\/\/.+#.+$/)
    // 'zaseki' が URL に含まれるか（パスまたはホスト名に含まれる）
    expect(clipText).toContain('zaseki')

    await page.screenshot({ path: SS('M8_share') })
  })
})
