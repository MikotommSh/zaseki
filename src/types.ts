export interface Seat {
  id: string
  x: number
  y: number
  label?: string
  assignedAttendeeId?: string
  pinned: boolean
}

export interface Attendee {
  id: string
  name: string
}

export interface Landmark {
  id: string
  x: number
  y: number
  label: string
}

export interface AppState {
  seats: Seat[]
  attendees: Attendee[]
  landmarks: Landmark[]
}
