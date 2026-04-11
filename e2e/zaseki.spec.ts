import { test, expect, type Page } from '@playwright/test'
import path from 'path'

const SS = (name: string) => path.join('e2e', 'screenshots', `${name}.png`)

async function addSeat(page: Page, x: number, y: number) {
  await page.locator('[data-testid="canvas"]').click({ position: { x, y } })
}

test.describe('zaseki e2e', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
  })

  // ─── 1. 初期表示 ─────────────────────────────────────────────
  test('01 初期表示 — 空のキャンバスとサイドパネルが表示される', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('座席')
    await expect(page.locator('text=クリックして座席を追加')).toBeVisible()
    await expect(page.locator('button:has-text("席決め")')).toBeDisabled()
    await page.screenshot({ path: SS('01_initial') })
  })

  // ─── 2. 座席追加 ──────────────────────────────────────────────
  test('02 座席追加 — キャンバスクリックで座席が生成される', async ({ page }) => {
    await addSeat(page, 200, 150)
    await addSeat(page, 400, 150)
    await addSeat(page, 300, 300)

    await expect(page.locator('[data-testid="seat"]')).toHaveCount(3)
    await expect(page.locator('text=0席')).not.toBeVisible()
    await page.screenshot({ path: SS('02_seats_added') })
  })

  // ─── 3. 出席者追加 ────────────────────────────────────────────
  test('03 出席者追加 — 名前を入力してEnterで追加される', async ({ page }) => {
    const input = page.locator('input[placeholder="名前を入力..."]')

    for (const name of ['田中', '鈴木', '佐藤']) {
      await input.fill(name)
      await input.press('Enter')
    }

    await expect(page.locator('[data-testid="attendee-item"]')).toHaveCount(3)
    await expect(page.locator('text=田中')).toBeVisible()
    await page.screenshot({ path: SS('03_attendees_added') })
  })

  // ─── 4. 手動割り当て ──────────────────────────────────────────
  test('04 手動割り当て — 座席選択後に出席者をクリックで割り当て', async ({ page }) => {
    await addSeat(page, 300, 200)

    const input = page.locator('input[placeholder="名前を入力..."]')
    await input.fill('山田')
    await input.press('Enter')

    // 座席をクリックして選択
    await page.locator('[data-testid="seat"]').first().click()

    // ヒントが表示される
    await expect(page.locator('text=座席を選択中')).toBeVisible()

    // 割り当て可能な出席者をクリック
    await page.locator('[data-testid="attendee-item"][data-selectable="true"]').first().click()

    // 座席に名前が表示される
    await expect(page.locator('[data-testid="seat-name"]').first()).toContainText('山田')
    await page.screenshot({ path: SS('04_attendee_assigned') })
  })

  // ─── 5. ピン留め ──────────────────────────────────────────────
  test('05 ピン留め — ピンボタンをクリックで座席が固定される', async ({ page }) => {
    await addSeat(page, 300, 200)

    const input = page.locator('input[placeholder="名前を入力..."]')
    await input.fill('松本')
    await input.press('Enter')

    // 割り当て
    await page.locator('[data-testid="seat"]').first().click()
    await page.locator('[data-testid="attendee-item"][data-selectable="true"]').first().click()

    // ホバーしてピンボタンをクリック
    const seat = page.locator('[data-testid="seat"]').first()
    await seat.hover()
    await seat.locator('[data-testid="pin-btn"]').click()

    await expect(seat).toHaveAttribute('data-pinned', 'true')
    await page.screenshot({ path: SS('05_seat_pinned') })
  })

  // ─── 6. 席決め（シャッフル）─────────────────────────────────
  test('06 席決め — シャッフルボタンで出席者が座席に配置される', async ({ page }) => {
    for (const pos of [
      { x: 150, y: 150 }, { x: 350, y: 150 },
      { x: 550, y: 150 }, { x: 350, y: 320 },
    ]) {
      await addSeat(page, pos.x, pos.y)
    }

    const input = page.locator('input[placeholder="名前を入力..."]')
    for (const name of ['Alice', 'Bob', 'Carol']) {
      await input.fill(name)
      await input.press('Enter')
    }

    await page.screenshot({ path: SS('06a_before_shuffle') })
    await page.locator('button:has-text("席決め")').click()

    await expect(page.locator('[data-testid="seat"][data-occupied="true"]')).toHaveCount(3)
    await page.screenshot({ path: SS('06b_after_shuffle') })
  })

  // ─── 7. ピン留め保持シャッフル ───────────────────────────────
  test('07 ピン留め保持 — シャッフル後もピン席の割り当てが変わらない', async ({ page }) => {
    for (const pos of [{ x: 150, y: 200 }, { x: 350, y: 200 }, { x: 550, y: 200 }]) {
      await addSeat(page, pos.x, pos.y)
    }

    const input = page.locator('input[placeholder="名前を入力..."]')
    for (const name of ['固定太郎', 'Bさん', 'Cさん']) {
      await input.fill(name)
      await input.press('Enter')
    }

    // 最初の席に固定太郎を割り当てピン留め
    const firstSeat = page.locator('[data-testid="seat"]').first()
    await firstSeat.click()
    await page.locator('[data-testid="attendee-item"][data-selectable="true"]').first().click()
    await firstSeat.hover()
    await firstSeat.locator('[data-testid="pin-btn"]').click()
    await expect(firstSeat).toHaveAttribute('data-pinned', 'true')

    await page.screenshot({ path: SS('07a_before_shuffle_with_pin') })

    // シャッフル
    await page.locator('button:has-text("席決め")').click()

    // ピン席は固定太郎のまま
    await expect(firstSeat.locator('[data-testid="seat-name"]')).toContainText('固定太郎')
    await expect(firstSeat).toHaveAttribute('data-pinned', 'true')

    await page.screenshot({ path: SS('07b_after_shuffle_pin_preserved') })
  })

  // ─── 8. ラベル編集 ────────────────────────────────────────────
  test('08 ラベル編集 — ダブルクリックでラベルを入力できる', async ({ page }) => {
    await addSeat(page, 300, 200)

    const seat = page.locator('[data-testid="seat"]').first()
    await seat.dblclick()

    const labelInput = seat.locator('input[placeholder="ラベル"]')
    await expect(labelInput).toBeVisible()
    await labelInput.fill('窓際')
    await labelInput.press('Enter')

    await expect(page.locator('[data-testid="seat"]').first()).toContainText('窓際')
    await page.screenshot({ path: SS('08_seat_label') })
  })

  // ─── 9. 座席削除 ──────────────────────────────────────────────
  test('09 座席削除 — 右クリックで座席が削除される', async ({ page }) => {
    await addSeat(page, 200, 200)
    await addSeat(page, 400, 200)

    await expect(page.locator('[data-testid="seat"]')).toHaveCount(2)
    await page.locator('[data-testid="seat"]').first().click({ button: 'right' })
    await expect(page.locator('[data-testid="seat"]')).toHaveCount(1)

    await page.screenshot({ path: SS('09_seat_deleted') })
  })

  // ─── 10. 出席者削除 ───────────────────────────────────────────
  test('10 出席者削除 — ×ボタンで出席者が削除され割り当ても解除される', async ({ page }) => {
    await addSeat(page, 300, 200)

    const input = page.locator('input[placeholder="名前を入力..."]')
    await input.fill('削除対象')
    await input.press('Enter')

    // 割り当て
    await page.locator('[data-testid="seat"]').first().click()
    await page.locator('[data-testid="attendee-item"][data-selectable="true"]').first().click()
    await expect(page.locator('[data-testid="seat-name"]').first()).toContainText('削除対象')

    // 出席者削除
    await page.locator('[data-testid="attendee-remove-btn"]').first().click()
    await expect(page.locator('[data-testid="attendee-item"]')).toHaveCount(0)
    await expect(page.locator('[data-testid="seat"]').first()).toHaveAttribute('data-occupied', 'false')

    await page.screenshot({ path: SS('10_attendee_removed') })
  })

  // ─── 11. URLシェア ────────────────────────────────────────────
  test('11 URLシェア — 共有ボタンでURLがコピーされる', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])

    await addSeat(page, 300, 200)
    const input = page.locator('input[placeholder="名前を入力..."]')
    await input.fill('共有太郎')
    await input.press('Enter')

    await page.locator('button:has-text("共有")').click()
    await expect(page.locator('text=URLをコピーしました')).toBeVisible()

    const clipText = await page.evaluate(() => navigator.clipboard.readText())
    expect(clipText).toContain('#')

    await page.screenshot({ path: SS('11_url_shared') })
  })

  // ─── 12. 統合シナリオ ─────────────────────────────────────────
  test('12 統合シナリオ — 席決め会議の全フロー', async ({ page }) => {
    // 6席を配置
    for (const pos of [
      { x: 120, y: 120 }, { x: 320, y: 120 }, { x: 520, y: 120 },
      { x: 120, y: 300 }, { x: 320, y: 300 }, { x: 520, y: 300 },
    ]) {
      await addSeat(page, pos.x, pos.y)
    }

    // 最初の席に"上座"ラベル
    const firstSeat = page.locator('[data-testid="seat"]').first()
    await firstSeat.dblclick()
    await firstSeat.locator('input[placeholder="ラベル"]').fill('上座')
    await firstSeat.locator('input[placeholder="ラベル"]').press('Enter')

    // 6人追加
    const input = page.locator('input[placeholder="名前を入力..."]')
    for (const name of ['田中部長', '鈴木', '佐藤', '高橋', '渡辺', '伊藤']) {
      await input.fill(name)
      await input.press('Enter')
    }

    await page.screenshot({ path: SS('12a_setup_complete') })

    // 田中部長を上座にピン留め
    await firstSeat.click()
    await page.locator('[data-testid="attendee-item"][data-selectable="true"]').first().click()
    await firstSeat.hover()
    await firstSeat.locator('[data-testid="pin-btn"]').click()

    await page.screenshot({ path: SS('12b_tanaka_pinned') })

    // 席決め実行
    await page.locator('button:has-text("席決め")').click()

    await expect(page.locator('[data-testid="seat"][data-occupied="true"]')).toHaveCount(6)
    await expect(firstSeat.locator('[data-testid="seat-name"]')).toContainText('田中部長')

    await page.screenshot({ path: SS('12c_final_seating') })
  })

  // ─── 13. オブジェクト配置 ────────────────────────────────────
  test('13 オブジェクト配置 — 配置モードでキャンバスクリックして配置', async ({ page }) => {
    // 配置モードボタンをクリック
    await page.locator('[data-testid="toggle-landmark-mode"]').click()
    await expect(page.locator('text=キャンバスをクリックして配置')).toBeVisible()

    // キャンバスの背景が配置モード色に変わる
    await page.screenshot({ path: SS('13a_placing_mode_active') })

    // キャンバスをクリックしてオブジェクト配置
    await page.locator('[data-testid="canvas"]').click({ position: { x: 400, y: 100 } })

    // ランドマークが1つ追加される
    await expect(page.locator('[data-testid="landmark"]')).toHaveCount(1)

    // 配置後は配置モードが解除される（1回配置で終了）
    await expect(page.locator('text=キャンバスをクリックして配置')).not.toBeVisible()

    await page.screenshot({ path: SS('13b_landmark_placed') })
  })

  // ─── 14. ランドマークラベル編集 ──────────────────────────────
  test('14 ランドマークラベル編集 — ダブルクリックでラベルを変更', async ({ page }) => {
    // オブジェクトを配置
    await page.locator('[data-testid="toggle-landmark-mode"]').click()
    await page.locator('[data-testid="canvas"]').click({ position: { x: 300, y: 150 } })

    const landmark = page.locator('[data-testid="landmark"]').first()
    await expect(landmark).toContainText('オブジェクト')

    // ダブルクリックで編集
    await landmark.dblclick()
    const input = landmark.locator('input')
    await expect(input).toBeVisible()
    await input.fill('入口')
    await input.press('Enter')

    await expect(landmark).toContainText('入口')
    await page.screenshot({ path: SS('14_landmark_label_edited') })
  })

  // ─── 15. ランドマーク削除 ────────────────────────────────────
  test('15 ランドマーク削除 — 右クリックで削除される', async ({ page }) => {
    // 2つ配置
    await page.locator('[data-testid="toggle-landmark-mode"]').click()
    await page.locator('[data-testid="canvas"]').click({ position: { x: 200, y: 150 } })
    await page.locator('[data-testid="toggle-landmark-mode"]').click()
    await page.locator('[data-testid="canvas"]').click({ position: { x: 500, y: 150 } })

    await expect(page.locator('[data-testid="landmark"]')).toHaveCount(2)

    // 右クリックで削除
    await page.locator('[data-testid="landmark"]').first().click({ button: 'right' })
    await expect(page.locator('[data-testid="landmark"]')).toHaveCount(1)

    await page.screenshot({ path: SS('15_landmark_deleted') })
  })

  // ─── 16. 席決めでランドマークが動かない ──────────────────────
  test('16 シャッフル後もランドマークは変化しない', async ({ page }) => {
    // ランドマーク配置
    await page.locator('[data-testid="toggle-landmark-mode"]').click()
    await page.locator('[data-testid="canvas"]').click({ position: { x: 400, y: 80 } })
    const landmark = page.locator('[data-testid="landmark"]').first()
    await landmark.dblclick()
    await landmark.locator('input').fill('演台')
    await landmark.locator('input').press('Enter')

    // 座席と出席者を追加してシャッフル
    for (const pos of [{ x: 150, y: 250 }, { x: 350, y: 250 }, { x: 550, y: 250 }]) {
      await page.locator('[data-testid="canvas"]').click({ position: pos })
    }
    const input = page.locator('input[placeholder="名前を入力..."]')
    for (const name of ['A', 'B', 'C']) {
      await input.fill(name)
      await input.press('Enter')
    }
    await page.locator('button:has-text("席決め")').click()

    // ランドマークは消えず「演台」のまま
    await expect(page.locator('[data-testid="landmark"]')).toHaveCount(1)
    await expect(landmark).toContainText('演台')

    await page.screenshot({ path: SS('16_landmark_survives_shuffle') })
  })
})
