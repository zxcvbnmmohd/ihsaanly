export interface WidgetEntry {
  id: string
  title: string
}

export interface WidgetSnapshot {
  writtenAt: number
  rightNow: WidgetEntry | null
  quickDuas: WidgetEntry[]
}
