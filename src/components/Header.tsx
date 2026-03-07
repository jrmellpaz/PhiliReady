import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMe } from '#/lib/queries'
import { clearToken, getToken } from '#/lib/auth'
import { useSheetState } from '#/lib/sheet-state'
import type { SheetName } from '#/lib/sheet-state'
import {
  FlaskConical,
  Shield,
  Tag,
  LogIn,
  LogOut,
  Menu,
  X,
  Sliders,
  User,
} from 'lucide-react'

export default function Navbar() {
  const token = getToken()
  const { data: user } = useMe()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const { open } = useSheetState()

  const handleLogout = () => {
    clearToken()
    window.location.reload()
  }

  const openSheet = (name: SheetName) => {
    setMobileOpen(false)
    open(name)
  }

  return (
    <header className="navbar">
      <nav className="navbar-inner">
        {/* Brand */}
        <div className="navbar-brand">
          <div className="navbar-logo">
            <Shield size={18} />
          </div>
          <span className="navbar-app-name">PhiliReady</span>
          <span className="navbar-badge">BETA</span>
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Nav links */}
        <div
          className={`navbar-links ${mobileOpen ? 'navbar-links-open' : ''}`}
        >
          <button
            className="navbar-link navbar-link-simulate"
            onClick={() => openSheet('simulate')}
          >
            <FlaskConical size={14} />
            Simulate
          </button>
          <button
            className="navbar-link"
            onClick={() => {
              setMobileOpen(false)
              navigate({
                to: '/',
                search: (prev: Record<string, unknown>) => ({
                  ...prev,
                  modal: 'simulator',
                }),
                mask: { to: '/simulator' },
              })
            }}
          >
            <Sliders size={14} />
            What-If
          </button>

          {user?.role === 'admin' && (
            <>
              <button
                className="navbar-link"
                onClick={() => {
                  setMobileOpen(false)
                  navigate({
                    to: '/',
                    search: (prev: Record<string, unknown>) => ({
                      ...prev,
                      modal: 'admin',
                    }),
                    mask: { to: '/admin' },
                  })
                }}
              >
                <Shield size={14} />
                Admin
              </button>
              <button
                className="navbar-link"
                onClick={() => {
                  setMobileOpen(false)
                  navigate({
                    to: '/',
                    search: (prev: Record<string, unknown>) => ({
                      ...prev,
                      modal: 'prices',
                    }),
                    mask: { to: '/prices' },
                  })
                }}
              >
                <Tag size={14} />
                Prices
              </button>
            </>
          )}

          <div className="navbar-spacer" />

          {token ? (
            <div className="navbar-user">
              <span className="navbar-user-name">
                <User size={13} />
                {user?.fullName ?? 'User'}
              </span>
              <span className="navbar-user-divider" />
              <button
                className="navbar-link navbar-logout"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          ) : (
            <button
              className="navbar-link navbar-login"
              onClick={() => openSheet('login')}
            >
              <LogIn size={14} />
              Login
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
