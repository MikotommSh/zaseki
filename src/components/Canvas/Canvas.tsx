import { useCallback } from 'react'
import type { AppState } from '../../types'
import type { AppActions } from '../../store/useAppState'
import { SeatNode, SEAT_WIDTH, SEAT_HEIGHT } from './SeatNode'
import { LandmarkNode, LANDMARK_WIDTH, LANDMARK_HEIGHT } from './LandmarkNode'
import styles from './Canvas.module.css'

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
  const attendeeMap = Object.fromEntries(state.attendees.map((a) => [a.id, a]))

  const getBounds = useCallback(() => {
    if (!canvasRef.current) return { width: 9999, height: 9999 }
    return {
      width: canvasRef.current.offsetWidth,
      height: canvasRef.current.offsetHeight,
    }
  }, [canvasRef])

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget) return
      const rect = e.currentTarget.getBoundingClientRect()

      if (isPlacingLandmark) {
        const x = Math.round(e.clientX - rect.left - LANDMARK_WIDTH / 2)
        const y = Math.round(e.clientY - rect.top - LANDMARK_HEIGHT / 2)
        const clampedX = Math.max(0, Math.min(x, rect.width - LANDMARK_WIDTH))
        const clampedY = Math.max(0, Math.min(y, rect.height - LANDMARK_HEIGHT))
        actions.addLandmark(clampedX, clampedY, 'オブジェクト')
        onLandmarkPlaced()
      } else {
        const x = Math.round(e.clientX - rect.left - SEAT_WIDTH / 2)
        const y = Math.round(e.clientY - rect.top - SEAT_HEIGHT / 2)
        const clampedX = Math.max(0, Math.min(x, rect.width - SEAT_WIDTH))
        const clampedY = Math.max(0, Math.min(y, rect.height - SEAT_HEIGHT))
        actions.addSeat(clampedX, clampedY)
        onSelectSeat(null)
      }
    },
    [actions, isPlacingLandmark, onLandmarkPlaced, onSelectSeat]
  )

  const isEmpty = state.seats.length === 0 && (state.landmarks ?? []).length === 0

  return (
    <div
      ref={canvasRef}
      className={[styles.canvas, isPlacingLandmark ? styles.placingMode : ''].filter(Boolean).join(' ')}
      onClick={handleCanvasClick}
      title={isPlacingLandmark ? 'クリックしてオブジェクトを配置' : 'クリックして座席を追加'}
      data-testid="canvas"
    >
      {isEmpty && (
        <div className={styles.empty}>
          <p>クリックして座席を追加</p>
        </div>
      )}

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
          />
        )
      })}
    </div>
  )
}
