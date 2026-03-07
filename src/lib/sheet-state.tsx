import { createContext, useContext, useState, useCallback } from 'react'

export type SheetName = 'simulate' | 'login' | 'admin' | 'prices'

interface SheetState {
  openSheet: SheetName | null
  open: (name: SheetName) => void
  close: () => void
}

const SheetContext = createContext<SheetState>({
  openSheet: null,
  open: () => {},
  close: () => {},
})

export function SheetStateProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [openSheet, setOpenSheet] = useState<SheetName | null>(null)

  const open = useCallback((name: SheetName) => setOpenSheet(name), [])
  const close = useCallback(() => setOpenSheet(null), [])

  return (
    <SheetContext.Provider value={{ openSheet, open, close }}>
      {children}
    </SheetContext.Provider>
  )
}

export function useSheetState() {
  return useContext(SheetContext)
}
