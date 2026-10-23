'use client'
import * as React from 'react'
import { useSearchParams } from 'next/navigation'

export function useNotificationRecord<T extends { id: string }>(records: T[], onOpen: (record: T) => void) {
  const params = useSearchParams()
  const id = params.get('record')
  const notice = params.get('notice')
  const handled = React.useRef('')
  React.useEffect(() => {
    const key = `${id}:${notice}`
    if (!id || handled.current === key) return
    const record = records.find((item) => item.id === id)
    if (record) { handled.current = key; onOpen(record) }
  }, [id, notice, records, onOpen])
}
