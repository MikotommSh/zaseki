import { useState, useRef, useCallback } from 'react'
import type { AppState } from '../../types'
import type { AppActions } from '../../store/useAppState'
import { SeatNode, SEAT_WIDTH, SEAT_HEIGHT } from './SeatNode'
import { LandmarkNode, LANDMARK_WIDTH, LANDMARK_HEIGHT } from './LandmarkNode'
import styles from './Canvas.module.css'

const SCALE_MIN = 0.3
const SCALE_MAX = 2.0
const SCALE_STEP = 0.1

function clampScale(s: number) {
  return Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(s * 10) / 10))
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
  const innerRef = useRef<HTMLDivElement | null>(null)
  const attendeeMap = Object.fromEntries(state.attendees.map((a) => [a.id, a]))

  const getBounds = useCallback(() => {
    if (!canvasRef.current) return { width: 9999, height: 9999 }
    return {
      width: canvasRef.current.offsetWidth / scale,
      height: canvasRef.current.offsetHeight / scale,
    }
  }, [canvasRef, scale])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget && e.target !== innerRef.current) return
      const rect = canvasRef.current!.getBoundingClientRect()
      const logicalX = (e.clientX - rect.left) / scale
      const logicalY = (e.clientY - rect.top) / scale
      const bounds = getBounds()

      if (isPlacingLandmark) {
        const x = Math.round(logicalX - LANDMARK_WIDTH / 2)
        const y = Math.round(logicalY - LANDMARK_HEIGHT / 2)
        actions.addLandmark(
          Math.max(0, Math.min(x, bounds.width - LANDMARK_WIDTH)),
          Math.max(0, Math.min(y, bounds.height - LANDMARK_HEIGHT)),
          'オブジェクト'
        )
        onLandmarkPlaced()
      } else {
        const x = Math.round(logicalX - SEAT_WIDTH / 2)
        const y = Math.round(logicalY - SEAT_HEIGHT / 2)
        actions.addSeat(
          Math.max(0, Math.min(x, bounds.width - SEAT_WIDTH)),
          Math.max(0, Math.min(y, bounds.height - SEAT_HEIGHT))
        )
        onSelectSeat(null)
      }
    },
    [actions, canvasRef, getBounds, isPlacingLandmark, onLandmarkPlaced, onSelectSeat, scale]
  )

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
    setScale((s) => clampScale(s + delta))
  }, [])

  const isEmpty = state.seats.length === 0 && (state.landmarks ?? []).length === 0

  return (
    <div
      ref={canvasRef}
      className={[styles.canvas, isPlacingLandmark ? styles.placingMode : ''].filter(Boolean).join(' ')}
      onClick={handleCanvasClick}
      onWheel={handleWheel}
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
        style={{ transform: `scale(${scale})` }}
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
          onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s - SCALE_STEP)) }}
          title="縮小"
        >−</button>
        <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
        <button
          className={styles.zoomBtn}
          onClick={(e) => { e.stopPropagation(); setScale((s) => clampScale(s + SCALE_STEP)) }}
          title="拡大"
        >＋</button>
      </div>
    </div>
  )
}
