import { useEffect, useState } from 'react'

type ToastKind = 'success' | 'error'

interface ToastItem {
  id: number
  kind: ToastKind
  message: string
}

let items: ToastItem[] = []
const listeners = new Set<(items: ToastItem[]) => void>()

function push(kind: ToastKind, message: string) {
  const item: ToastItem = { id: Date.now() + Math.random(), kind, message }
  items = [...items, item]
  listeners.forEach((l) => l(items))
  setTimeout(() => {
    items = items.filter((i) => i.id !== item.id)
    listeners.forEach((l) => l(items))
  }, 2600)
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message),
}

export function Toaster() {
  const [list, setList] = useState<ToastItem[]>(items)

  useEffect(() => {
    listeners.add(setList)
    return () => {
      listeners.delete(setList)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[100] flex -translate-x-1/2 flex-col gap-2">
      {list.map((item) => (
        <div
          key={item.id}
          className={`rounded-md border px-3 py-2 text-xs shadow-lg ${
            item.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {item.message}
        </div>
      ))}
    </div>
  )
}
