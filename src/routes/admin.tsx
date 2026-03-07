import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'
import * as Select from '@radix-ui/react-select'
import { ChevronDown, X } from 'lucide-react'
import {
  useUsers,
  useAssignCities,
  useRemoveCityAccess,
  useMe,
} from '#/lib/queries'
import { register } from '#/lib/api'
import type { UserWithCities } from '#/lib/types'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

/* ── Register form ─────────────────────────────────────────────── */

function RegisterForm() {
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
      } catch (err: unknown) {
        setMsg(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    },
  })

  return (
    <section className="admin-section">
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
    </section>
  )
}

/* ── City tags + inline assign ─────────────────────────────────── */

function CityCell({ user }: { user: UserWithCities }) {
  const removeMutation = useRemoveCityAccess()
  const assignMutation = useAssignCities()

  const assignForm = useForm({
    defaultValues: { pcodes: '' },
    onSubmit: async ({ value }) => {
      const pcodes = value.pcodes
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      if (pcodes.length === 0) return
      assignMutation.mutate({ userId: user.id, pcodes })
      assignForm.reset()
    },
  })

  return (
    <div>
      <div className="admin-user-cities">
        <span className="admin-cities-label">Cities:</span>
        {user.cities.length === 0 ? (
          <span className="admin-no-cities">None</span>
        ) : (
          user.cities.map((pcode) => (
            <span key={pcode} className="admin-city-tag">
              {pcode}
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
      <form
        className="admin-assign-row"
        onSubmit={(e) => {
          e.preventDefault()
          assignForm.handleSubmit()
        }}
      >
        <assignForm.Field name="pcodes">
          {(field) => (
            <input
              type="text"
              placeholder="Add pcodes (comma-separated)"
              className="admin-input admin-input-sm"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          )}
        </assignForm.Field>
        <assignForm.Subscribe selector={(s) => s.values.pcodes}>
          {(pcodes) => (
            <button
              type="submit"
              className="admin-btn admin-btn-sm"
              disabled={!pcodes.trim()}
            >
              Assign
            </button>
          )}
        </assignForm.Subscribe>
      </form>
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

/* ── Main page ─────────────────────────────────────────────────── */

function AdminPage() {
  const { data: me } = useMe()

  if (me?.role !== 'admin') {
    return (
      <main className="admin-page">
        <p className="admin-denied">
          Admin access required. Please log in as an admin.
        </p>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <h1 className="admin-title">Admin Panel</h1>
      <RegisterForm />
      <UsersTable />
    </main>
  )
}
