import { useState, useRef, useCallback } from 'react'
import type { AppState } from '../../types'
import type { AppActions } from '../../store/useAppState'
import { SeatNode, SEAT_WIDTH, SEAT_HEIGHT } from './SeatNode'
import { LandmarkNode, LANDMARK_WIDTH, LANDMARK_HEIGHT } from './LandmarkNode'
import styles from './Canvas.module.css'

const SCALE_MIN = 0.2
const SCALE_MAX = 3.0
const SCALE_STEP = 0.1
const WORLD_W = 4000
const WORLD_H = 3000

function clampScale(s: number) {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(s * 100) / 100))
}

interface Props {
  state: AppState
  actions: AppActions
  selectedSeatId: string | null
  onSelectSeat: (id: string | null) => void
  canvasRef: React.RefObject<HTMLDivElement | null>
  isPlacingLandmark: boolean
  onLandmarkPlaced: () => void
  onTogglePlacingLandmark: () => void
}

export function Canvas({
  state,
  actions,
  selectedSeatId,
  onSelectSeat,
  canvasRef,
  isPlacingLandmark,
  onLandmarkPlaced,
  onTogglePlacingLandmark,
}: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const innerRef = useRef<HTMLDivElement | null>(null)

  // ref は連続イベント間の「現在値」として使う（setState は再レンダー用）
  const scaleRef = useRef(scale)
  const offsetRef = useRef(offset)
  scaleRef.current = scale
  offsetRef.current = offset

  // ── ピンチ用：キャプチャフェーズで全ポインターを追跡 ──────────────
  // キャプチャフェーズは座席の stopPropagation より前に発火するため、
  // 指が座席上にあっても2本指を検出できる
  const allPointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const isPinchingRef = useRef(false)
  const pinchInitRef = useRef<{ distance: number; scale: number } | null>(null)

  // ── パン用：背景タッチのみ追跡 ───────────────────────────────────
  const panInitial = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const bgPointerId = useRef<number | null>(null)

  const suppressNextClick = useRef(false)

  const attendeeMap = Object.fromEntries(state.attendees.map((a) => [a.id, a]))
  const getBounds = useCallback(() => ({ width: WORLD_W, height: WORLD_H }), [])

  // ── ズームのコアロジック ─────────────────────────────────────────
  const applyZoom = useCallback((newScale: number, anchorX: number, anchorY: number) => {
    const clamped = clampScale(newScale)
    const prevScale = scaleRef.current
    if (prevScale === clamped) return
    const newOffset = {
      x: anchorX - (anchorX - offsetRef.current.x) * (clamped / prevScale),
      y: anchorY - (anchorY - offsetRef.current.y) * (clamped / prevScale),
    }
    scaleRef.current = clamped
    offsetRef.current = newOffset
    setScale(clamped)
    setOffset(newOffset)
  }, [])

  // ── キャプチャフェーズ：ピンチ検出（座席上の指も捕捉） ───────────
  const handleCaptureDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    allPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (allPointers.current.size >= 2 && !isPinchingRef.current) {
      const pts = Array.from(allPointers.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchInitRef.current = { distance: dist, scale: scaleRef.current }
      isPinchingRef.current = true
      suppressNextClick.current = true
      panInitial.current = null
      // 2本目の指が座席に当たっても座席ドラッグを開始させない
      e.stopPropagation()
    }
  }, [])

  const handleCaptureMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!allPointers.current.has(e.pointerId)) return
    allPointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (isPinchingRef.current) {
      // ピンチ中は座席ドラッグに届かせない
      e.stopPropagation()

      if (pinchInitRef.current && allPointers.current.size >= 2) {
        const pts = Array.from(allPointers.current.values())
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
        const newScale = pinchInitRef.current.scale * dist / pinchInitRef.current.distance
        const rect = canvasRef.current!.getBoundingClientRect()
        const midX = (pts[0].x + pts[1].x) / 2 - rect.left
        const midY = (pts[0].y + pts[1].y) / 2 - rect.top
        applyZoom(newScale, midX, midY)
      }
    }
  }, [applyZoom, canvasRef])

  const handleCaptureUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    allPointers.current.delete(e.pointerId)
    if (allPointers.current.size < 2) {
      isPinchingRef.current = false
      pinchInitRef.current = null
    }
  }, [])

  // ── 背景ハンドラー：パン ─────────────────────────────────────────
  const handleBgPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isPinchingRef.current) return
    if (e.target !== e.currentTarget && e.target !== innerRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    bgPointerId.current = e.pointerId
    panInitial.current = {
      px: e.clientX,
      py: e.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    }
  }, [])

  const handleBgPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isPinchingRef.current) return
    if (e.pointerId !== bgPointerId.current) return
    if (!panInitial.current) return

    const dx = e.clientX - panInitial.current.px
    const dy = e.clientY - panInitial.current.py
    if (Math.hypot(dx, dy) > 4) suppressNextClick.current = true
    const newOffset = { x: panInitial.current.ox + dx, y: panInitial.current.oy + dy }
    offsetRef.current = newOffset
    setOffset(newOffset)
  }, [])

  const handleBgPointerUp = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    panInitial.current = null
    bgPointerId.current = null
  }, [])

  // ── ホイールズーム（デスクトップ）───────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    applyZoom(scaleRef.current + delta, mouseX, mouseY)
  }, [applyZoom, canvasRef])

  // ── クリックで座席・オブジェクト配置 ────────────────────────────
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false
        return
      }
      if (e.target !== e.currentTarget && e.target !== innerRef.current) return
      const rect = canvasRef.current!.getBoundingClientRect()
      const logicalX = (e.clientX - rect.left - offsetRef.current.x) / scaleRef.current
      const logicalY = (e.clientY - rect.top - offsetRef.current.y) / scaleRef.current

      if (isPlacingLandmark) {
        const x = Math.round(logicalX - LANDMARK_WIDTH / 2)
        const y = Math.round(logicalY - LANDMARK_HEIGHT / 2)
        actions.addLandmark(
          Math.max(0, Math.min(x, WORLD_W - LANDMARK_WIDTH)),
          Math.max(0, Math.min(y, WORLD_H - LANDMARK_HEIGHT)),
          'オブジェクト'
        )
        onLandmarkPlaced()
      } else {
        const x = Math.round(logicalX - SEAT_WIDTH / 2)
        const y = Math.round(logicalY - SEAT_HEIGHT / 2)
        actions.addSeat(
          Math.max(0, Math.min(x, WORLD_W - SEAT_WIDTH)),
          Math.max(0, Math.min(y, WORLD_H - SEAT_HEIGHT))
        )
        onSelectSeat(null)
      }
    },
    [actions, canvasRef, isPlacingLandmark, onLandmarkPlaced, onSelectSeat]
  )

  // ── +/- ボタン：キャンバス中央を anchor ─────────────────────────
  const handleZoomBtn = useCallback((delta: number) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    applyZoom(scaleRef.current + delta, rect.width / 2, rect.height / 2)
  }, [applyZoom, canvasRef])

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    scaleRef.current = 1
    offsetRef.current = { x: 0, y: 0 }
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const isEmpty = state.seats.length === 0 && (state.landmarks ?? []).length === 0

  return (
    <div
      ref={(el) => { (canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el }}
      className={[styles.canvas, isPlacingLandmark ? styles.placingMode : ''].filter(Boolean).join(' ')}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onPointerDownCapture={handleCaptureDown}
      onPointerMoveCapture={handleCaptureMove}
      onPointerUpCapture={handleCaptureUp}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handleBgPointerMove}
      onPointerUp={handleBgPointerUp}
      data-testid="canvas"
    >
      {isEmpty && (
        <div className={styles.empty}>
          <p>クリックして座席を追加</p>
        </div>
      )}

      <div
        ref={(el) => { innerRef.current = el }}
        className={styles.inner}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
      >
        {(state.landmarks ?? []).map((landmark) => (
          <LandmarkNode
            key={landmark.id}
            landmark={landmark}
            onMove={(x, y) => actions.moveLandmark(landmark.id, x, y)}
            onDrop={(x, y) => actions.moveLandmark(landmark.id, x, y)}
            onRemove={() => actions.removeLandmark(landmark.id)}
            onLabelSave={(label) => actions.updateLandmarkLabel(landmark.id, label)}
            getBounds={getBounds}
            scale={scale}
          />
        ))}

        {state.seats.map((seat) => {
          const attendee = seat.assignedAttendeeId
            ? attendeeMap[seat.assignedAttendeeId]
            : undefined
          return (
            <SeatNode
              key={seat.id}
              seat={seat}
              attendee={attendee}
              isSelected={selectedSeatId === seat.id}
              onClick={() => onSelectSeat(selectedSeatId === seat.id ? null : seat.id)}
              onMove={(x, y) => actions.moveSeat(seat.id, x, y)}
              onDrop={(x, y) => actions.moveSeat(seat.id, x, y)}
              onRemove={() => {
                actions.removeSeat(seat.id)
                if (selectedSeatId === seat.id) onSelectSeat(null)
              }}
              onTogglePin={() => actions.togglePin(seat.id)}
              onLabelSave={(label) => actions.updateSeatLabel(seat.id, label)}
              onUnassign={() => actions.unassignSeat(seat.id)}
              getBounds={getBounds}
              scale={scale}
            />
          )
        })}
      </div>

      {/* オブジェクト配置フローティングボタン */}
      <div className={styles.placingBtn}>
        <button
          className={[styles.placingBtnInner, isPlacingLandmark ? styles.placingBtnActive : ''].filter(Boolean).join(' ')}
          onClick={(e) => { e.stopPropagation(); onTogglePlacingLandmark() }}
          onPointerDown={(e) => e.stopPropagation()}
          data-testid="toggle-landmark-mode"
        >
          {isPlacingLandmark ? '✕ 配置モード解除' : '＋ オブジェクト配置'}
        </button>
        {isPlacingLandmark && (
          <span className={styles.placingHint}>タップして配置 / ESCで解除</span>
        )}
      </div>

      {/* ズームコントロール */}
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomBtn}
          onClick={(e) => { e.stopPropagation(); handleZoomBtn(-SCALE_STEP) }}
          onPointerDown={(e) => e.stopPropagation()}
          title="縮小"
        >−</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          className={styles.zoomBtn}
          onClick={(e) => { e.stopPropagation(); handleZoomBtn(SCALE_STEP) }}
          onPointerDown={(e) => e.stopPropagation()}
          title="拡大"
        >＋</button>
        <button
          className={styles.zoomBtn}
          onClick={handleReset}
          onPointerDown={(e) => e.stopPropagation()}
          title="リセット"
          style={{ fontSize: '14px' }}
        >↺</button>
      </div>
    </div>
  )
}
