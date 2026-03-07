import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'
import { usePrices, useUpdatePrice, useMe } from '#/lib/queries'
import type { PriceItem } from '#/lib/types'

/* ── Inline price editor ───────────────────────────────────────── */

function PriceEditor({
  item,
  onDone,
}: {
  item: PriceItem
  onDone: () => void
}) {
  const updateMutation = useUpdatePrice()

  const form = useForm({
    defaultValues: { price: String(item.pricePerUnit) },
    onSubmit: async ({ value }) => {
      const price = parseFloat(value.price)
      if (isNaN(price) || price < 0) return
      updateMutation.mutate(
        { itemKey: item.itemKey, price },
        { onSuccess: () => onDone() },
      )
    },
  })

  return (
    <form
      className="price-edit-row"
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
    >
      <form.Field name="price">
        {(field) => (
          <input
            type="number"
            min={0}
            step={0.01}
            className="price-edit-input"
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value)}
            autoFocus
          />
        )}
      </form.Field>
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(isSubmitting) => (
          <button
            type="submit"
            className="price-save-btn"
            disabled={isSubmitting || updateMutation.isPending}
          >
            Save
          </button>
        )}
      </form.Subscribe>
      <button type="button" className="price-cancel-btn" onClick={onDone}>
        Cancel
      </button>
    </form>
  )
}

/* ── Table cell for price value + edit ─────────────────────────── */

function PriceValueCell({
  item,
  isAdmin,
}: {
  item: PriceItem
  isAdmin: boolean
}) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <PriceEditor item={item} onDone={() => setEditing(false)} />
  }

  return (
    <div className="price-display-row">
      <span className="price-value">₱{item.pricePerUnit.toFixed(2)}</span>
      {isAdmin && (
        <button className="price-edit-btn" onClick={() => setEditing(true)}>
          Edit
        </button>
      )}
    </div>
  )
}

/* ── Main content ──────────────────────────────────────────────── */

const columnHelper = createColumnHelper<PriceItem>()

export function PricesContent() {
  const { data: me } = useMe()
  const { data: prices, isLoading } = usePrices()
  const isAdmin = me?.role === 'admin'

  const data = prices ?? []

  const columns = [
    columnHelper.accessor('label', {
      header: 'Item',
      cell: (info) => (
        <div className="price-card-header">
          <h3 className="price-item-label">{info.getValue()}</h3>
          <span className="price-item-unit">per {info.row.original.unit}</span>
        </div>
      ),
    }),
    columnHelper.accessor('pricePerUnit', {
      header: 'Price (₱)',
      cell: ({ row }) => (
        <PriceValueCell item={row.original} isAdmin={isAdmin} />
      ),
    }),
    columnHelper.accessor('updatedAt', {
      header: 'Last Updated',
      cell: (info) => (
        <span className="price-updated">
          {new Date(info.getValue()).toLocaleDateString('en-PH')}
        </span>
      ),
    }),
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="prices-page">
      <h1 className="prices-title">Relief Goods Prices</h1>
      <p className="prices-subtitle">
        Current unit prices for relief goods in Philippine Pesos (₱). These
        prices affect all forecast cost calculations.
      </p>

      {isLoading ? (
        <p>Loading prices…</p>
      ) : (
        <div className="prices-table-wrap">
          <table className="prices-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th key={header.id} className="prices-th">
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
                <tr key={row.id} className="prices-tr">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="prices-td">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
