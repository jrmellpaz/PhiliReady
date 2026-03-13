import { Sheet, Scroll } from '@silk-hq/components'
import { useRef, useCallback } from 'react'
import type { SheetViewProps } from '@silk-hq/components'
import { X } from 'lucide-react'

/* ─── Shared close button ───────────────────────────────────────── */

function SheetCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sheet-close-btn"
      aria-label="Close"
    >
      <X size={18} strokeWidth={2.5} />
    </button>
  )
}

/* ─── Bottom Sheet ──────────────────────────────────────────────── */

interface BottomSheetProps {
  presented: boolean
  onClose: () => void
  children: React.ReactNode
}

export function BottomSheet({
  presented,
  onClose,
  children,
}: BottomSheetProps) {
  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={(p) => !p && onClose()}
    >
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view"
          contentPlacement="bottom"
          nativeEdgeSwipePrevention
          swipeDismissal
        >
          <Sheet.Backdrop className="silk-backdrop" themeColorDimming="auto" />
          <Sheet.Content className="silk-bottom-content">
            <Sheet.BleedingBackground className="silk-bleeding-bg" />
            <div className="silk-drag-handle" />
            <SheetCloseButton onClick={onClose} />
            {children}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

/* ─── Page Sheet (full height, slides up) ──────────────────────── */

interface PageSheetProps {
  presented: boolean
  onClose: () => void
  children: React.ReactNode
  swipeDismissal?: boolean
}

export function PageSheet({ presented, onClose, children, swipeDismissal = true }: PageSheetProps) {
  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={(p) => !p && onClose()}
    >
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view silk-page-view"
          contentPlacement="bottom"
          nativeEdgeSwipePrevention
          swipeDismissal={swipeDismissal}
        >
          <Sheet.Backdrop className="silk-backdrop" themeColorDimming="auto" />
          <Sheet.Content className="silk-page-content">
            <Sheet.BleedingBackground className="silk-bleeding-bg silk-page-bg" />
            <div className="silk-drag-handle" />
            <SheetCloseButton onClick={onClose} />
            {children}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

/* ─── Scrollable Sheet (SheetWithKeyboard pattern) ─────────────── */

interface ScrollableSheetProps {
  presented: boolean
  onClose: () => void
  tall?: boolean
  swipeDismissal?: boolean
  children: React.ReactNode
}

export function ScrollableSheet({
  presented,
  onClose,
  tall,
  swipeDismissal = true,
  children,
}: ScrollableSheetProps) {
  const viewRef = useRef<HTMLElement>(null)

  const travelHandler = useCallback<NonNullable<SheetViewProps['onTravel']>>(
    ({ progress }) => {
      if (!viewRef.current) return
      if (progress < 0.999) {
        viewRef.current.focus()
      }
    },
    [],
  )

  const setRef = useCallback((node: HTMLElement | null) => {
    ;(viewRef as React.MutableRefObject<HTMLElement | null>).current = node
  }, [])

  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={(p) => !p && onClose()}
    >
      <Sheet.Portal>
        <Sheet.View
          className="SheetWithKeyboard-view"
          contentPlacement="center"
          tracks={['top', 'bottom']}
          swipeOvershoot={false}
          nativeEdgeSwipePrevention
          swipeDismissal={swipeDismissal}
          onTravel={travelHandler}
          ref={setRef}
        >
          <Sheet.Backdrop className="silk-backdrop" themeColorDimming="auto" />
          <Sheet.Content
            className={`SheetWithKeyboard-content${tall ? ' SheetWithKeyboard-content--tall' : ''}`}
          >
            <div className="SheetWithKeyboard-header">
              <div className="silk-drag-handle" />
              <SheetCloseButton onClick={onClose} />
            </div>
            <Scroll.Root asChild>
              <Scroll.View
                className="SheetWithKeyboard-scrollView"
                scrollGestureTrap={{ yEnd: true }}
              >
                <Scroll.Content className="SheetWithKeyboard-scrollContent">
                  {children}
                </Scroll.Content>
              </Scroll.View>
            </Scroll.Root>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

/* ─── Sidebar Sheet (slides from right) ────────────────────────── */

interface SidebarSheetProps {
  presented: boolean
  onClose: () => void
  children: React.ReactNode
}

export function SidebarSheet({
  presented,
  onClose,
  children,
}: SidebarSheetProps) {
  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={(p) => !p && onClose()}
    >
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view silk-sidebar-view"
          contentPlacement="right"
          nativeEdgeSwipePrevention
          swipeDismissal
        >
          <Sheet.Backdrop className="silk-backdrop" themeColorDimming="auto" />
          <Sheet.Content className="silk-sidebar-content">
            <Sheet.BleedingBackground className="silk-bleeding-bg silk-sidebar-bg" />
            <SheetCloseButton onClick={onClose} />
            {children}
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}

/* ─── Dialog Sheet (centered, for login) ───────────────────────── */

interface DialogSheetProps {
  presented: boolean
  onClose: () => void
  children: React.ReactNode
}

export function DialogSheet({
  presented,
  onClose,
  children,
}: DialogSheetProps) {
  return (
    <Sheet.Root
      license="non-commercial"
      presented={presented}
      onPresentedChange={(p) => !p && onClose()}
      sheetRole="dialog"
    >
      <Sheet.Portal>
        <Sheet.View
          className="silk-sheet-view silk-dialog-view"
          contentPlacement="center"
          nativeEdgeSwipePrevention={false}
          swipeDismissal={false}
        >
          <Sheet.Backdrop className="silk-backdrop" themeColorDimming="auto" />
          <Sheet.Content className="silk-dialog-content">
            <div className="dialog-card">
              <SheetCloseButton onClick={onClose} />
              {children}
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
