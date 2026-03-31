'use client'

import { useState, type FormEvent, type ReactNode } from 'react'

// ---------------------------------------------------------------------------
// Form wrapper with success/error feedback
// ---------------------------------------------------------------------------

interface GlassFormProps {
  onSubmit: (formData: Record<string, unknown>) => Promise<void>
  children: ReactNode
  submitLabel?: string
  className?: string
}

export function GlassForm({ onSubmit, children, submitLabel = 'Save', className = '' }: GlassFormProps) {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus('submitting')
    setMessage('')

    const form = e.currentTarget
    const data: Record<string, unknown> = {}
    const formData = new FormData(form)

    for (const [key, value] of formData.entries()) {
      const strVal = value.toString()
      if (strVal === '') continue

      // Check if field has a data-type attribute
      const el = form.querySelector(`[name="${key}"]`)
      const dataType = el?.getAttribute('data-type')

      if (dataType === 'number') {
        data[key] = parseFloat(strVal)
      } else if (dataType === 'boolean') {
        data[key] = strVal === 'true'
      } else if (dataType === 'array') {
        data[key] = strVal.split(',').map(s => s.trim()).filter(Boolean)
      } else {
        data[key] = strVal
      }
    }

    try {
      await onSubmit(data)
      setStatus('success')
      setMessage('Saved successfully!')
      form.reset()
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-4 ${className}`}>
      {children}

      {/* Status messages */}
      {status === 'success' && (
        <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: 'var(--accent-emerald)' }}>
          {message}
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="p-3 rounded-xl text-sm" style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: 'var(--accent-rose)' }}>
          {message}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="glass-button glass-button-primary text-sm px-6 py-2"
        >
          {status === 'submitting' ? 'Saving...' : submitLabel}
        </button>
        <button type="reset" className="glass-button text-sm px-4 py-2">
          Reset
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Input field with label
// ---------------------------------------------------------------------------

interface FieldProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string | number
  dataType?: 'string' | 'number' | 'boolean' | 'array'
  description?: string
}

export function Field({ label, name, type = 'text', placeholder, required, defaultValue, dataType, description }: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--accent-rose)' }}> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        data-type={dataType}
        className="glass-input w-full text-sm"
      />
      {description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Textarea field
// ---------------------------------------------------------------------------

interface TextAreaProps {
  label: string
  name: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  rows?: number
  description?: string
}

export function TextArea({ label, name, placeholder, required, defaultValue, rows = 4, description }: TextAreaProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--accent-rose)' }}> *</span>}
      </label>
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        rows={rows}
        className="glass-input w-full text-sm resize-y"
      />
      {description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Select dropdown (native)
// ---------------------------------------------------------------------------

interface SelectProps {
  label: string
  name: string
  options: { value: string; label: string }[]
  required?: boolean
  defaultValue?: string
  description?: string
}

export function Select({ label, name, options, required, defaultValue, description }: SelectProps) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--accent-rose)' }}> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="glass-input w-full text-sm"
      >
        <option value="">— Select —</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {description && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Data table with semantic HTML
// ---------------------------------------------------------------------------

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  total?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T extends { [key: string]: any }>({
  columns, rows, total, page = 1, pageSize = 25,
  onPageChange, onRowClick, emptyMessage = 'No records found',
}: DataTableProps<T>) {
  const totalPages = total ? Math.ceil(total / pageSize) : 1
  const showPagination = total !== undefined && total > pageSize

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {columns.map(col => (
                <th key={col.key} className="text-left py-2 px-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={(row.id as string) || i}
                  className={`border-t ${onRowClick ? 'cursor-pointer hover:bg-[var(--glass-bg-hover)]' : ''}`}
                  style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                  onClick={() => onRowClick?.(row)}
                  role={onRowClick ? 'link' : undefined}
                >
                  {columns.map(col => (
                    <td key={col.key} className="py-2.5 px-3" style={{ color: 'var(--text-primary)' }}>
                      {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <nav className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} aria-label="Pagination">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total!)} of {total} records
          </p>
          <div className="flex gap-2">
            <button
              className="glass-button text-xs px-3 py-1"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
            >
              Previous
            </button>
            <span className="text-xs px-2 py-1" style={{ color: 'var(--text-secondary)' }}>
              Page {page} of {totalPages}
            </span>
            <button
              className="glass-button text-xs px-3 py-1"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status badge (readable text)
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--accent-emerald)', running: 'var(--accent-emerald)', completed: 'var(--accent-emerald)', published: 'var(--accent-emerald)', done: 'var(--accent-emerald)', converted: 'var(--accent-emerald)',
  in_progress: 'var(--accent-blue)', contacted: 'var(--accent-blue)', meeting_booked: 'var(--accent-blue)', review: 'var(--accent-blue)',
  new: 'var(--accent-cyan)', unread: 'var(--accent-cyan)',
  pending: 'var(--text-muted)', idle: 'var(--text-muted)', backlog: 'var(--text-muted)', draft: 'var(--text-muted)',
  blocked: 'var(--accent-amber)', paused: 'var(--accent-amber)', waiting_on_you: 'var(--accent-amber)',
  error: 'var(--accent-rose)', failed: 'var(--accent-rose)', dead: 'var(--accent-rose)', declined: 'var(--accent-rose)',
  critical: 'var(--accent-rose)', high: 'var(--accent-amber)', medium: 'var(--accent-blue)', low: 'var(--text-muted)',
  hot: 'var(--accent-rose)', warm: 'var(--accent-amber)', cold: 'var(--text-muted)',
}

export function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || 'var(--text-muted)'
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
      <ol className="flex items-center gap-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            {item.href ? (
              <a href={item.href} className="hover:underline" style={{ color: 'var(--text-secondary)' }}>{item.label}</a>
            ) : (
              <span style={{ color: 'var(--text-primary)' }}>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
