import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { Toaster } from 'sonner'
import Navbar from '../components/Header'

import TanStackQueryProvider from '../integrations/tanstack-query/root-provider'
import { SheetStateProvider } from '../lib/sheet-state'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      {
        name: 'viewport',
        content:
          'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
      },
      { title: 'PhiliReady — Relief Goods Demand Forecaster' },
      {
        name: 'description',
        content:
          'City-level micro-demand forecaster for relief goods across all Philippine municipalities. Predict rice, water, medicine, and hygiene kit needs before disasters peak.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TanStackQueryProvider>
          <SheetStateProvider>
            <div className="app-layout">
              <Navbar />
              {children}
            </div>
          </SheetStateProvider>
        </TanStackQueryProvider>
        <Toaster
          position="bottom-right"
          richColors
          toastOptions={{
            style: {
              fontFamily: 'inherit',
            },
          }}
        />
        <Scripts />
      </body>
    </html>
  )
}
