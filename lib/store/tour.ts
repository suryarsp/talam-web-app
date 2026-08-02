import { create } from 'zustand'
import type { TourStep } from '@/lib/tours'

type TourState = {
  active: boolean
  steps: TourStep[]
  stepIndex: number
  start: (steps: TourStep[]) => void
  stop: () => void
  setStepIndex: (i: number) => void
}

export const useTourStore = create<TourState>((set) => ({
  active: false,
  steps: [],
  stepIndex: 0,
  start: (steps) => set({ active: true, steps, stepIndex: 0 }),
  stop: () => set({ active: false, steps: [], stepIndex: 0 }),
  setStepIndex: (stepIndex) => set({ stepIndex }),
}))
