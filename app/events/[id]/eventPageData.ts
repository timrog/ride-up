export type EventPageData = {
  title: string
  dateMs: number
  duration: number
  location: string
  description: string
  routeLink: string
  createdAtMs: number
  createdBy: string
  createdByName: string
  linkId?: string
  tags: string[]
  isCancelled: boolean
}
