import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMe } from '#/lib/queries'
import { clearToken, getToken } from '#/lib/auth'
import { useSheetState } from '#/lib/sheet-state'
import {
  FlaskConical,
  Shield,
  Tag,
  LogIn,
  LogOut,
  Menu,
  Sliders,
  User,
  Bot
} from 'lucide-react'
import { BottomSheet } from '#/components/ui/SilkSheets'

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

        {/* Desktop Links */}
        <div className="navbar-links-desktop">
          <NavLinks
            user={user}
            token={!!token}
            onLogout={handleLogout}
            onOpenSheet={open}
            onNavigate={(modal) =>
              navigate({
                to: '/',
                search: (prev) => ({ ...prev, modal }),
                mask: { to: `/${modal}` },
              })
            }
          />
        </div>

        {/* Mobile toggle */}
        <button
          className="navbar-mobile-toggle"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={20} />
        </button>

        {/* Mobile Bottom Sheet */}
        <BottomSheet presented={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div className="mobile-nav-sheet">
            <h3 className="mobile-nav-title">Menu</h3>
            <NavLinks
              user={user}
              token={!!token}
              isMobile
              onLogout={handleLogout}
              onOpenSheet={(name) => {
                setMobileOpen(false)
                open(name)
              }}
              onNavigate={(modal) => {
                setMobileOpen(false)
                navigate({
                  to: '/',
                  search: (prev) => ({ ...prev, modal }),
                  mask: { to: `/${modal}` },
                })
              }}
            />
          </div>
        </BottomSheet>
      </nav>
    </header>
  )
}

function NavLinks({
  user,
  token,
  isMobile,
  onLogout,
  onOpenSheet,
  onNavigate,
}: {
  user: any
  token: boolean
  isMobile?: boolean
  onLogout: () => void
  onOpenSheet: (name: string) => void
  onNavigate: (modal: string) => void
}) {
  return (
    <div className={`nav-links-container ${isMobile ? 'nav-links--mobile' : ''}`}>
      <button
        className="navbar-link navbar-link-simulate"
        onClick={() => onOpenSheet('simulate')}
      >
        <FlaskConical size={14} />
        Simulate
      </button>

      <button
        className="navbar-link navbar-link-simulate"
        onClick={() => onOpenSheet('assistant')}
      >
        <Bot size={14} />
        Assistant
      </button>

      <button className="navbar-link" onClick={() => onNavigate('simulator')}>
        <Sliders size={14} />
        What-If
      </button>

      {user?.role === 'admin' && (
        <>
          <button className="navbar-link" onClick={() => onNavigate('admin')}>
            <Shield size={14} />
            Admin
          </button>
          <button className="navbar-link" onClick={() => onNavigate('prices')}>
            <Tag size={14} />
            Prices
          </button>
        </>
      )}

      {isMobile ? null : <div className="navbar-spacer" />}

      {token ? (
        <div className="navbar-user">
          <span className="navbar-user-name">
            <User size={13} />
            {user?.fullName ?? 'User'}
          </span>
          {isMobile ? null : <span className="navbar-user-divider" />}
          <button className="navbar-link navbar-logout" onClick={onLogout}>
            <LogOut size={14} />
            Logout
          </button>
        </div>
      ) : (
        <button
          className="navbar-link navbar-login"
          onClick={() => onOpenSheet('login')}
        >
          <LogIn size={14} />
          Login
        </button>
      )}
    </div>
  )
}
