import type { Attendee, Seat } from '../../types'
import styles from './SidePanel.module.css'

interface Props {
  attendee: Attendee
  assignedSeat?: Seat
  isSelectable: boolean
  onAssign: () => void
  onRemove: () => void
}

export function AttendeeItem({ attendee, assignedSeat, isSelectable, onAssign, onRemove }: Props) {
  return (
    <div
      className={[
        styles.attendeeItem,
        isSelectable ? styles.selectable : '',
        assignedSeat ? styles.assigned : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={isSelectable ? onAssign : undefined}
      title={isSelectable ? 'この人を選択中の座席に割り当て' : undefined}
      data-testid="attendee-item"
      data-selectable={isSelectable ? 'true' : 'false'}
    >
      <span className={styles.attendeeName}>{attendee.name}</span>
      {assignedSeat && (
        <span className={styles.seatBadge} title={assignedSeat.label}>
          {assignedSeat.pinned ? '📌' : '💺'}
          {assignedSeat.label ?? ''}
        </span>
      )}
      <button
        className={styles.removeBtn}
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="削除"
        data-testid="attendee-remove-btn"
      >
        ×
      </button>
    </div>
  )
}
