import type { Metadata } from "next"
import { getAdminDb } from "@/lib/firebase/admin"
import { EventDataProvider } from "./EventDataContext"
import { EventPageData } from "./eventPageData"

type Props = {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

const loadEvent = async (id: string): Promise<EventPageData | null> => {
  const eventSnapshot = await getAdminDb().collection("events").doc(id).get()

  if (!eventSnapshot.exists) {
    return null
  }

  const event = eventSnapshot.data() as {
    title: string
    date: { toMillis: () => number }
    duration: number
    location: string
    description: string
    routeLink: string
    createdAt: { toMillis: () => number }
    createdBy: string
    createdByName: string
    linkId?: string
    tags: string[]
    isCancelled: boolean
  }

  return {
    title: event.title,
    dateMs: event.date.toMillis(),
    duration: event.duration,
    location: event.location,
    description: event.description,
    routeLink: event.routeLink,
    createdAtMs: event.createdAt.toMillis(),
    createdBy: event.createdBy,
    createdByName: event.createdByName,
    linkId: event.linkId,
    tags: event.tags,
    isCancelled: event.isCancelled
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const event = await loadEvent(id)

  if (!event) {
    return {
      title: "Event not found | VCGH",
      description: "This event could not be found."
    }
  }

  return {
    title: `${event.title} | VCGH`,
    description: event.description
  }
}

export default async function EventLayout({ children, params }: Props) {
  const { id } = await params
  const event = await loadEvent(id)

  return (
    <EventDataProvider initialEvent={event}>
      {children}
    </EventDataProvider>
  )
}
