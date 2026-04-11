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
}

export function Canvas({
  state,
  actions,
  selectedSeatId,
  onSelectSeat,
  canvasRef,
  isPlacingLandmark,
  onLandmarkPlaced,
}: Props) {
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const innerRef = useRef<HTMLDivElement | null>(null)

  // ポインター追跡（パン・ピンチ用）
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchInitial = useRef<{ distance: number; scale: number; midX: number; midY: number } | null>(null)
  const panInitial = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null)
  const suppressNextClick = useRef(false)
  const scaleRef = useRef(scale)
  const offsetRef = useRef(offset)
  scaleRef.current = scale
  offsetRef.current = offset

  const attendeeMap = Object.fromEntries(state.attendees.map((a) => [a.id, a]))

  const getBounds = useCallback(() => ({ width: WORLD_W, height: WORLD_H }), [])

  // キャンバス背景へのタッチ開始（パン or ピンチ）
  const handleBgPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && e.target !== innerRef.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (activePointers.current.size === 2) {
      // ピンチ開始
      const pts = Array.from(activePointers.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      pinchInitial.current = {
        distance: dist,
        scale: scaleRef.current,
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      }
      panInitial.current = null
      suppressNextClick.current = true
    } else {
      // パン開始
      panInitial.current = {
        px: e.clientX,
        py: e.clientY,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      }
      pinchInitial.current = null
    }
  }, [])

  const handleBgPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(e.pointerId)) return
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pinchInitial.current && activePointers.current.size === 2) {
      // ピンチズーム
      const pts = Array.from(activePointers.current.values())
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)
      const newScale = clampScale(pinchInitial.current.scale * dist / pinchInitial.current.distance)
      const rect = canvasRef.current!.getBoundingClientRect()
      const midX = (pts[0].x + pts[1].x) / 2 - rect.left
      const midY = (pts[0].y + pts[1].y) / 2 - rect.top
      // ピンチ中心を固定したままスケール変更
      const prevScale = scaleRef.current
      setOffset((prev) => ({
        x: midX - (midX - prev.x) * (newScale / prevScale),
        y: midY - (midY - prev.y) * (newScale / prevScale),
      }))
      setScale(newScale)
    } else if (panInitial.current && activePointers.current.size === 1) {
      // パン
      const dx = e.clientX - panInitial.current.px
      const dy = e.clientY - panInitial.current.py
      if (Math.hypot(dx, dy) > 4) suppressNextClick.current = true
      setOffset({ x: panInitial.current.ox + dx, y: panInitial.current.oy + dy })
    }
  }, [canvasRef])

  const handleBgPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(e.pointerId)
    if (activePointers.current.size < 2) {
      pinchInitial.current = null
    }
    if (activePointers.current.size === 1) {
      // 指1本が残ったらパン継続
      const remaining = Array.from(activePointers.current.entries())[0]
      panInitial.current = {
        px: remaining[1].x,
        py: remaining[1].y,
        ox: offsetRef.current.x,
        oy: offsetRef.current.y,
      }
    } else if (activePointers.current.size === 0) {
      panInitial.current = null
    }
  }, [])

  // ホイールズーム（デスクトップ）
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const rect = canvasRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    setScale((prev) => {
      const next = clampScale(prev + delta)
      setOffset((o) => ({
        x: mouseX - (mouseX - o.x) * (next / prev),
        y: mouseY - (mouseY - o.y) * (next / prev),
      }))
      return next
    })
  }, [canvasRef])

  // クリックで座席・オブジェクト配置
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressNextClick.current) {
        suppressNextClick.current = false
        return
      }
      if (e.target !== e.currentTarget && e.target !== innerRef.current) return
      const rect = canvasRef.current!.getBoundingClientRect()
      const logicalX = (e.clientX - rect.left - offset.x) / scale
      const logicalY = (e.clientY - rect.top - offset.y) / scale

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
    [actions, canvasRef, isPlacingLandmark, offset, onLandmarkPlaced, onSelectSeat, scale]
  )

  const handleReset = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const isEmpty = state.seats.length === 0 && (state.landmarks ?? []).length === 0

  return (
    <div
      ref={canvasRef}
      className={[styles.canvas, isPlacingLandmark ? styles.placingMode : ''].filter(Boolean).join(' ')}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
      onPointerDown={handleBgPointerDown}
      onPointerMove={handleBgPointerMove}
      onPointerUp={handleBgPointerUp}
      title={isPlacingLandmark ? 'クリックしてオブジェクトを配置' : 'クリックして座席を追加'}
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
        {/* ランドマーク（座席の下に描画） */}
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

        {/* 座席 */}
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

      {/* ズームコントロール */}
      <div className={styles.zoomControls}>
        <button
          className={styles.zoomBtn}
          onClick={(e) => { e.stopPropagation(); setScale((s) => { const n = clampScale(s - SCALE_STEP); setOffset((o) => o); return n }) }}
          onPointerDown={(e) => e.stopPropagation()}
          title="縮小"
        >−</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          className={styles.zoomBtn}
          onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s + SCALE_STEP)) }}
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
