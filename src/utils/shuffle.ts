import type { Seat } from '../types'

export function shuffle(seats: Seat[], attendeeIds: string[]): Seat[] {
  // ピン留め済みの出席者IDセット
  const pinnedAttendeeIds = new Set(
    seats
      .filter((s) => s.pinned && s.assignedAttendeeId)
      .map((s) => s.assignedAttendeeId as string)
  )

  // シャッフル対象の座席（ピンなし）
  const freeSeatIds = seats
    .filter((s) => !s.pinned)
    .map((s) => s.id)

  // シャッフル対象の出席者（ピンなし）
  const freeAttendees = attendeeIds.filter((id) => !pinnedAttendeeIds.has(id))

  // Fisher-Yates shuffle（出席者）
  const shuffled = [...freeAttendees]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  // Fisher-Yates shuffle（座席）
  // 座席数 > 出席者数の場合、どの席が空席になるかもランダムにする
  const shuffledSeatIds = [...freeSeatIds]
  for (let i = shuffledSeatIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffledSeatIds[i], shuffledSeatIds[j]] = [shuffledSeatIds[j], shuffledSeatIds[i]]
  }

  // 割り当てマップ作成: seatId → attendeeId | undefined
  const assignmentMap = new Map<string, string | undefined>()
  shuffledSeatIds.forEach((seatId, index) => {
    assignmentMap.set(seatId, shuffled[index])
  })

  return seats.map((seat) => {
    if (seat.pinned) return seat
    return {
      ...seat,
      assignedAttendeeId: assignmentMap.get(seat.id),
    }
  })
}
