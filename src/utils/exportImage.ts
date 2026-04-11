import html2canvas from 'html2canvas'
import type { AppState } from '../types'
import { SEAT_WIDTH, SEAT_HEIGHT } from '../components/Canvas/SeatNode'
import { LANDMARK_WIDTH, LANDMARK_HEIGHT } from '../components/Canvas/LandmarkNode'

export async function exportImage(element: HTMLElement): Promise<void> {
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  })

  const dataUrl = canvas.toDataURL('image/png')
  const isMobile = 'ontouchstart' in window || window.matchMedia('(max-width: 640px)').matches

  if (!isMobile) {
    // デスクトップ: オブジェクトURLでダウンロード
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'zaseki.png'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    return
  }

  // モバイル: iOS は <a download> もシェアAPIも html2canvas の await 後は動かないため
  // 画像をオーバーレイ表示して長押し保存してもらう
  showImageOverlay(dataUrl)
}

function showImageOverlay(dataUrl: string): void {
  const overlay = document.createElement('div')
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.88)', 'z-index:9999',
    'display:flex', 'flex-direction:column', 'align-items:center', 'justify-content:center',
    'gap:16px', 'padding:16px', 'box-sizing:border-box',
  ].join(';')

  const msg = document.createElement('p')
  msg.textContent = '画像を長押し → 写真に追加'
  msg.style.cssText = 'color:#fff;font-size:15px;margin:0;text-align:center;'

  const img = document.createElement('img')
  img.src = dataUrl
  img.style.cssText = 'max-width:100%;max-height:65vh;object-fit:contain;border-radius:8px;'

  const closeBtn = document.createElement('button')
  closeBtn.textContent = '閉じる'
  closeBtn.style.cssText = [
    'padding:12px 40px', 'background:#fff', 'border:none', 'border-radius:8px',
    'font-size:16px', 'font-weight:600', 'cursor:pointer',
  ].join(';')
  closeBtn.onclick = () => overlay.remove()

  overlay.appendChild(msg)
  overlay.appendChild(img)
  overlay.appendChild(closeBtn)
  document.body.appendChild(overlay)
}

/** 全要素が収まるようにズームアウトしてから書き出す */
export async function exportImageFit(
  canvasEl: HTMLElement,
  innerEl: HTMLElement,
  state: AppState
): Promise<void> {
  const items = [
    ...state.seats.map((s) => ({ x: s.x, y: s.y, w: SEAT_WIDTH, h: SEAT_HEIGHT })),
    ...(state.landmarks ?? []).map((l) => ({ x: l.x, y: l.y, w: LANDMARK_WIDTH, h: LANDMARK_HEIGHT })),
  ]

  // visibility:hidden の親があると html2canvas が真っ白になるため一時的に解除する
  const pane = canvasEl.parentElement
  const wasHidden = !!pane && getComputedStyle(pane).visibility === 'hidden'
  if (wasHidden && pane) pane.style.visibility = 'visible'

  const originalTransform = innerEl.style.transform

  if (items.length > 0) {
    const PADDING = 28
    const minX = Math.min(...items.map((i) => i.x))
    const minY = Math.min(...items.map((i) => i.y))
    const maxX = Math.max(...items.map((i) => i.x + i.w))
    const maxY = Math.max(...items.map((i) => i.y + i.h))
    const contentW = maxX - minX
    const contentH = maxY - minY
    const canvasW = canvasEl.clientWidth
    const canvasH = canvasEl.clientHeight

    const fitScale = Math.min(
      (canvasW - PADDING * 2) / contentW,
      (canvasH - PADDING * 2) / contentH,
      1
    )
    const fitOffsetX = (canvasW - contentW * fitScale) / 2 - minX * fitScale
    const fitOffsetY = (canvasH - contentH * fitScale) / 2 - minY * fitScale

    innerEl.style.transform = `translate(${fitOffsetX}px, ${fitOffsetY}px) scale(${fitScale})`
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  }

  try {
    await exportImage(canvasEl)
  } finally {
    innerEl.style.transform = originalTransform
    if (wasHidden && pane) pane.style.visibility = ''
  }
}
