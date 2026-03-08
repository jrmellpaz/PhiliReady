import { useState, useEffect, useMemo, useRef } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'
import * as Select from '@radix-ui/react-select'
import { ChevronDown, X, Search, Check, UserPlus } from 'lucide-react'
import { DialogSheet } from '#/components/ui/SilkSheets'
import {
  useUsers,
  useAssignCities,
  useRemoveCityAccess,
  useMe,
} from '#/lib/queries'
import { register } from '#/lib/api'
import type { UserWithCities } from '#/lib/types'

/* ── City list from GeoJSON ────────────────────────────────────── */

interface CityOption {
  pcode: string
  name: string
  province: string
}

let cityListCache: CityOption[] | null = null

function useCityOptions() {
  const [cities, setCities] = useState<CityOption[]>(cityListCache ?? [])

  useEffect(() => {
    if (cityListCache) return
    fetch('/geo/municities.json')
      .then((r) => r.json())
      .then(
        (geo: { features: Array<{ properties: Record<string, string> }> }) => {
          const list = geo.features
            .map((f) => ({
              pcode: f.properties.ADM3_PCODE ?? f.properties.adm3_psgc ?? '',
              name: f.properties.ADM3_EN ?? '',
              province: f.properties.ADM2_EN ?? '',
            }))
            .filter((c) => c.pcode && c.name)
            .sort((a, b) => a.name.localeCompare(b.name))
          cityListCache = list
          setCities(list)
        },
      )
      .catch(console.error)
  }, [])

  return cities
}

/* ── Register form ─────────────────────────────────────────────── */

function RegisterForm({ onSuccess }: { onSuccess?: () => void }) {
  const [msg, setMsg] = useState<string | null>(null)

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      fullName: '',
      role: 'lgu',
    },
    onSubmit: async ({ value }) => {
      setMsg(null)
      try {
        await register({
          email: value.email,
          password: value.password,
          fullName: value.fullName,
          role: value.role,
        })
        setMsg(`User ${value.email} created successfully.`)
        form.reset()
        // Auto-close dialog after a brief delay so the user sees the success message
        if (onSuccess) setTimeout(onSuccess, 1200)
      } catch (err: unknown) {
        setMsg(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
  })

  return (
    <div className="admin-register-dialog">
      <h2 className="admin-section-title">Register New User</h2>
      <form
        className="admin-register-form"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit()
        }}
      >
        <form.Field name="email">
          {(field) => (
            <input
              type="email"
              placeholder="Email"
              className="admin-input"
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <input
              type="password"
              placeholder="Password"
              className="admin-input"
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>

        <form.Field name="fullName">
          {(field) => (
            <input
              type="text"
              placeholder="Full Name"
              className="admin-input"
              required
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <Select.Root
              value={field.state.value}
              onValueChange={(v) => field.handleChange(v)}
            >
              <Select.Trigger className="admin-select radix-select-trigger">
                <Select.Value />
                <Select.Icon>
                  <ChevronDown size={14} />
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Content
                  className="radix-select-content"
                  position="popper"
                  sideOffset={4}
                >
                  <Select.Viewport>
                    <Select.Item value="lgu" className="radix-select-item">
                      <Select.ItemText>LGU</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="admin" className="radix-select-item">
                      <Select.ItemText>Admin</Select.ItemText>
                    </Select.Item>
                  </Select.Viewport>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          )}
        </form.Field>

        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" className="admin-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Registering…' : 'Register'}
            </button>
          )}
        </form.Subscribe>
      </form>
      {msg && <p className="admin-msg">{msg}</p>}
    </div>
  )
}

/* ── City tags + inline assign ─────────────────────────────────── */

function CityCell({ user }: { user: UserWithCities }) {
  const removeMutation = useRemoveCityAccess()
  const assignMutation = useAssignCities()
  const allCities = useCityOptions()
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const cityNameMap = useMemo(() => {
    const map = new Map<string, CityOption>()
    for (const c of allCities) map.set(c.pcode, c)
    return map
  }, [allCities])

  const filtered = useMemo(() => {
    if (!search) return allCities.slice(0, 50)
    const q = search.toLowerCase()
    return allCities
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.province.toLowerCase().includes(q) ||
          c.pcode.toLowerCase().includes(q),
      )
      .slice(0, 50)
  }, [allCities, search])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleCity = (pcode: string) => {
    setSelected((prev) =>
      prev.includes(pcode) ? prev.filter((p) => p !== pcode) : [...prev, pcode],
    )
  }

  const handleAssign = () => {
    if (selected.length === 0) return
    assignMutation.mutate({ userId: user.id, pcodes: selected })
    setSelected([])
    setSearch('')
    setDropdownOpen(false)
  }

  return (
    <div>
      <div className="admin-user-cities">
        <span className="admin-cities-label">Cities:</span>
        {user.cities.length === 0 ? (
          <span className="admin-no-cities">None</span>
        ) : (
          user.cities.map((pcode) => (
            <span key={pcode} className="admin-city-tag">
              {cityNameMap.get(pcode)?.name ?? pcode}
              <button
                className="admin-city-remove"
                onClick={() =>
                  removeMutation.mutate({ userId: user.id, pcode })
                }
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
      </div>
      <div className="admin-assign-row" ref={wrapperRef}>
        <div className="city-multiselect">
          <div
            className="city-multiselect-trigger"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            {selected.length === 0 ? (
              <span className="city-multiselect-placeholder">
                Select cities…
              </span>
            ) : (
              <span className="city-multiselect-count">
                {selected.length} {selected.length === 1 ? 'city' : 'cities'}{' '}
                selected
              </span>
            )}
            <ChevronDown size={14} />
          </div>
          {dropdownOpen && (
            <div className="city-multiselect-dropdown">
              <div className="city-multiselect-search">
                <Search size={13} />
                <input
                  type="text"
                  placeholder="Search city or province…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="city-multiselect-list">
                {filtered.length === 0 ? (
                  <div className="city-multiselect-empty">No cities found</div>
                ) : (
                  filtered.map((c) => (
                    <button
                      key={c.pcode}
                      type="button"
                      className={`city-multiselect-item ${
                        selected.includes(c.pcode)
                          ? 'city-multiselect-item--selected'
                          : ''
                      }`}
                      onClick={() => toggleCity(c.pcode)}
                    >
                      <span className="city-multiselect-item-check">
                        {selected.includes(c.pcode) && <Check size={12} />}
                      </span>
                      <span className="city-multiselect-item-name">
                        {c.name}
                      </span>
                      <span className="city-multiselect-item-province">
                        {c.province}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <button
          type="button"
          className="admin-btn admin-btn-sm"
          disabled={selected.length === 0}
          onClick={handleAssign}
        >
          Assign
        </button>
      </div>
    </div>
  )
}

/* ── Users table ───────────────────────────────────────────────── */

const columnHelper = createColumnHelper<UserWithCities>()

const columns = [
  columnHelper.accessor('fullName', {
    header: 'Name',
    cell: (info) => <strong>{info.getValue()}</strong>,
  }),
  columnHelper.accessor('email', {
    header: 'Email',
    cell: (info) => <span className="admin-user-email">{info.getValue()}</span>,
  }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: (info) => <span className="admin-user-role">{info.getValue()}</span>,
  }),
  columnHelper.display({
    id: 'cities',
    header: 'City Access',
    cell: ({ row }) => <CityCell user={row.original} />,
  }),
]

function UsersTable() {
  const { data: users, isLoading } = useUsers()
  const data = users ?? []

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) return <p>Loading users…</p>

  return (
    <section className="admin-section">
      <h2 className="admin-section-title">Users & City Access</h2>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className="admin-th">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="admin-tr">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="admin-td">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/* ── Main content ──────────────────────────────────────────────── */

export function AdminContent() {
  const { data: me } = useMe()
  const [showRegister, setShowRegister] = useState(false)

  if (me?.role !== 'admin') {
    return (
      <div className="admin-page">
        <p className="admin-denied">
          Admin access required. Please log in as an admin.
        </p>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1 className="admin-title">Admin Panel</h1>
      </div>
      <button
        type="button"
        className="admin-cta-btn"
        onClick={() => setShowRegister(true)}
      >
        <UserPlus size={16} />
        Register New User
      </button>
      <UsersTable />

      {/* Register form — stacked dialog on top */}
      <DialogSheet
        presented={showRegister}
        onClose={() => setShowRegister(false)}
      >
        <RegisterForm onSuccess={() => setShowRegister(false)} />
      </DialogSheet>
    </div>
  )
}
