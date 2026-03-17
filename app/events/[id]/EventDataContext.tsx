'use client'

import React, { createContext, useContext } from 'react'
import { EventPageData } from './eventPageData'

type EventDataContextValue = {
  initialEvent: EventPageData | null
}

const EventDataContext = createContext<EventDataContextValue | null>(null)

type Props = {
  children: React.ReactNode
  initialEvent: EventPageData | null
}

export function EventDataProvider({ children, initialEvent }: Props) {
  return (
    <EventDataContext.Provider value={{ initialEvent }}>
      {children}
    </EventDataContext.Provider>
  )
}

export function useEventData() {
  const value = useContext(EventDataContext)

  if (!value) {
    throw new Error('useEventData must be used within an EventDataProvider')
  }

  return value
}
