import { nanoid } from 'nanoid'
import type { AppState, Seat, Attendee, Landmark } from '../types'
import { shuffle } from '../utils/shuffle'

export type Action =
  | { type: 'ADD_SEAT'; payload: { x: number; y: number } }
  | { type: 'REMOVE_SEAT'; payload: { id: string } }
  | { type: 'MOVE_SEAT'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_SEAT_LABEL'; payload: { id: string; label: string } }
  | { type: 'TOGGLE_PIN'; payload: { id: string } }
  | { type: 'ASSIGN_ATTENDEE'; payload: { seatId: string; attendeeId: string } }
  | { type: 'UNASSIGN_SEAT'; payload: { id: string } }
  | { type: 'ADD_ATTENDEE'; payload: { name: string } }
  | { type: 'REMOVE_ATTENDEE'; payload: { id: string } }
  | { type: 'SHUFFLE' }
  | { type: 'ADD_LANDMARK'; payload: { x: number; y: number; label: string } }
  | { type: 'REMOVE_LANDMARK'; payload: { id: string } }
  | { type: 'MOVE_LANDMARK'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_LANDMARK_LABEL'; payload: { id: string; label: string } }
  | { type: 'LOAD_STATE'; payload: AppState }

export const initialState: AppState = {
  seats: [],
  attendees: [],
  landmarks: [],
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_SEAT': {
      const newSeat: Seat = {
        id: nanoid(),
        x: action.payload.x,
        y: action.payload.y,
        pinned: false,
      }
      return { ...state, seats: [...state.seats, newSeat] }
    }

    case 'REMOVE_SEAT':
      return {
        ...state,
        seats: state.seats.filter((s) => s.id !== action.payload.id),
      }

    case 'MOVE_SEAT':
      return {
        ...state,
        seats: state.seats.map((s) =>
          s.id === action.payload.id
            ? { ...s, x: action.payload.x, y: action.payload.y }
            : s
        ),
      }

    case 'UPDATE_SEAT_LABEL':
      return {
        ...state,
        seats: state.seats.map((s) =>
          s.id === action.payload.id
            ? { ...s, label: action.payload.label || undefined }
            : s
        ),
      }

    case 'TOGGLE_PIN':
      return {
        ...state,
        seats: state.seats.map((s) =>
          s.id === action.payload.id ? { ...s, pinned: !s.pinned } : s
        ),
      }

    case 'ASSIGN_ATTENDEE':
      return {
        ...state,
        seats: state.seats.map((s) => {
          // 既に同じ人が別の席に座っていたら解除
          if (s.assignedAttendeeId === action.payload.attendeeId && s.id !== action.payload.seatId) {
            return { ...s, assignedAttendeeId: undefined }
          }
          // 対象の席に割り当て
          if (s.id === action.payload.seatId) {
            return { ...s, assignedAttendeeId: action.payload.attendeeId }
          }
          return s
        }),
      }

    case 'UNASSIGN_SEAT':
      return {
        ...state,
        seats: state.seats.map((s) =>
          s.id === action.payload.id ? { ...s, assignedAttendeeId: undefined, pinned: false } : s
        ),
      }

    case 'ADD_ATTENDEE': {
      const name = action.payload.name.trim()
      if (!name) return state
      const newAttendee: Attendee = { id: nanoid(), name }
      return { ...state, attendees: [...state.attendees, newAttendee] }
    }

    case 'REMOVE_ATTENDEE':
      return {
        ...state,
        attendees: state.attendees.filter((a) => a.id !== action.payload.id),
        seats: state.seats.map((s) =>
          s.assignedAttendeeId === action.payload.id
            ? { ...s, assignedAttendeeId: undefined, pinned: false }
            : s
        ),
      }

    case 'SHUFFLE': {
      const attendeeIds = state.attendees.map((a) => a.id)
      const newSeats = shuffle(state.seats, attendeeIds)
      return { ...state, seats: newSeats }
    }

    case 'ADD_LANDMARK': {
      const newLandmark: Landmark = {
        id: nanoid(),
        x: action.payload.x,
        y: action.payload.y,
        label: action.payload.label,
      }
      return { ...state, landmarks: [...(state.landmarks ?? []), newLandmark] }
    }

    case 'REMOVE_LANDMARK':
      return {
        ...state,
        landmarks: (state.landmarks ?? []).filter((l) => l.id !== action.payload.id),
      }

    case 'MOVE_LANDMARK':
      return {
        ...state,
        landmarks: (state.landmarks ?? []).map((l) =>
          l.id === action.payload.id
            ? { ...l, x: action.payload.x, y: action.payload.y }
            : l
        ),
      }

    case 'UPDATE_LANDMARK_LABEL':
      return {
        ...state,
        landmarks: (state.landmarks ?? []).map((l) =>
          l.id === action.payload.id ? { ...l, label: action.payload.label } : l
        ),
      }

    case 'LOAD_STATE':
      return { landmarks: [], ...action.payload }

    default:
      return state
  }
}
