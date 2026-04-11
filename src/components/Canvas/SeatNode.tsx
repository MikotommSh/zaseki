import { useState, useRef, useCallback } from 'react'
import type { Seat, Attendee } from '../../types'
import { useDrag } from '../../hooks/useDrag'
import styles from './SeatNode.module.css'

export const SEAT_WIDTH = 88
export const SEAT_HEIGHT = 60

interface Props {
  seat: Seat
  attendee?: Attendee
  isSelected: boolean
  onClick: () => void
  onMove: (x: number, y: number) => void
  onDrop: (x: number, y: number) => void
  onRemove: () => void
  onTogglePin: () => void
  onLabelSave: (label: string) => void
  onUnassign: () => void
  scale?: number
}

export function SeatNode({
  seat,
  attendee,
  isSelected,
  onClick,
  onMove,
  onDrop,
  onRemove,
  onTogglePin,
  onLabelSave,
  onUnassign,
  scale,
}: Props) {
  const [isEditingLabel, setIsEditingLabel] = useState(false)
  const [labelInput, setLabelInput] = useState(seat.label ?? '')
  const labelRef = useRef<HTMLInputElement>(null)

  const drag = useDrag({ onMove, onDrop, onClick, scale })

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setLabelInput(seat.label ?? '')
      setIsEditingLabel(true)
      setTimeout(() => labelRef.current?.focus(), 0)
    },
    [seat.label]
  )

  const commitLabel = useCallback(() => {
    setIsEditingLabel(false)
    onLabelSave(labelInput)
  }, [labelInput, onLabelSave])

  const handleLabelKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitLabel()
      if (e.key === 'Escape') setIsEditingLabel(false)
    },
    [commitLabel]
  )

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      // button===2 は右クリック。タッチ長押しは button===0 なので無視する
      if (e.button === 2) onRemove()
    },
    [onRemove]
  )

  return (
    <div
      className={[
        styles.seat,
        isSelected ? styles.selected : '',
        seat.pinned ? styles.pinned : '',
        attendee ? styles.occupied : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ left: seat.x, top: seat.y, width: SEAT_WIDTH, height: SEAT_HEIGHT }}
      onPointerDown={(e) => drag.onPointerDown(e, seat.x, seat.y)}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      data-testid="seat"
      data-pinned={seat.pinned ? 'true' : 'false'}
      data-occupied={attendee ? 'true' : 'false'}
    >
      {/* ラベル（上部） */}
      {isEditingLabel ? (
        <input
          ref={labelRef}
          className={styles.labelInput}
          value={labelInput}
          onChange={(e) => setLabelInput(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={handleLabelKeyDown}
          onClick={(e) => e.stopPropagation()}
          placeholder="ラベル"
          maxLength={8}
        />
      ) : (
        seat.label && <span className={styles.label}>{seat.label}</span>
      )}

      {/* 出席者名 */}
      <span className={styles.name} data-testid="seat-name">
        {attendee ? attendee.name : ''}
      </span>

      {/* ホバー時のアクションボタン */}
      <div
        className={styles.actions}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ピンボタン */}
        <button
          className={[styles.actionBtn, seat.pinned ? styles.pinActive : ''].filter(Boolean).join(' ')}
          onClick={(e) => { e.stopPropagation(); onTogglePin() }}
          title={seat.pinned ? 'ピン解除' : 'ピン留め'}
          data-testid="pin-btn"
        >
          📌
        </button>

        {/* 割り当て解除ボタン（割り当て済み時のみ） */}
        {attendee && (
          <button
            className={styles.actionBtn}
            onClick={(e) => { e.stopPropagation(); onUnassign() }}
            title="割り当て解除"
          >
            ↩
          </button>
        )}

        {/* 削除ボタン */}
        <button
          className={[styles.actionBtn, styles.removeBtn].join(' ')}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          title="座席を削除"
        >
          ×
        </button>
      </div>
    </div>
  )
}
