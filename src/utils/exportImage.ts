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

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
  )

  const file = new File([blob], 'zaseki.png', { type: 'image/png' })

  // iOS / Android: ネイティブ共有シートでファイル共有
  // → 写真に保存・AirDrop・LINE などが選択できる
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: '座席表' })
    return
  }

  // デスクトップ: ダウンロード
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'zaseki.png'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
