import { useState } from 'react'
import type { FC } from 'react'
import { RegisterExpenseModal } from './RegisterExpenseModal'
import { MyWalletView } from './MyWalletView'
import { getCurrentGroup } from '../../services/groups'

export interface Expense {
  id: string
  titulo: string
  categoria: 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro'
  monto: number
  pagadoPor: string
  splitType: 'equitativa' | 'personalizada'
  fecha: string
  splitAmounts?: Record<string, number>
}

const INITIAL_BUDGET = 15000

const MOCK_EXPENSES: Expense[] = [
  { id: '1', titulo: 'Vuelo CDMX → Cancún', categoria: 'transporte', monto: 3200, pagadoPor: 'Carlos', splitType: 'equitativa', fecha: '2025-07-01' },
  { id: '2', titulo: 'Hotel Marriott (3 noches)', categoria: 'hospedaje', monto: 4500, pagadoPor: 'Ximena', splitType: 'equitativa', fecha: '2025-07-02' },
  { id: '3', titulo: 'Snorkel en Cozumel', categoria: 'actividad', monto: 800, pagadoPor: 'Bryan', splitType: 'equitativa', fecha: '2025-07-03' },
]

const MOCK_MEMBERS = ['Yo', 'Carlos', 'Ximena', 'Bryan']

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)
}

function categoryColor(categoria: Expense['categoria']): string {
  switch (categoria) {
    case 'transporte': return '#1E6FD9'
    case 'hospedaje': return '#8B5CF6'
    case 'comida': return '#F59E0B'
    case 'actividad': return '#35C56A'
    default: return '#7A8799'
  }
}

function CategoryIcon({ categoria }: { categoria: Expense['categoria'] }) {
  if (categoria === 'transporte') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="1" y="3" width="15" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M16 8h4l3 3v5h-7V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="5.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="18.5" cy="18.5" r="2.5" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (categoria === 'hospedaje') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (categoria === 'comida') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <line x1="6" y1="1" x2="6" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="10" y1="1" x2="10" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="1" x2="14" y2="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  )
}

interface Props {
  groupId: string | null
}

export const BudgetDashboard: FC<Props> = ({ groupId }) => {
  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES)
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [view, setView] = useState<'dashboard' | 'wallet'>('dashboard')
  const [totalBudget, setTotalBudget] = useState(INITIAL_BUDGET)
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustValue, setAdjustValue] = useState('')

  const comprometido = expenses.reduce((sum, e) => sum + e.monto, 0)
  const disponible = totalBudget - comprometido
  const isOverBudget = comprometido > totalBudget
  const pct = Math.min((comprometido / totalBudget) * 100, 100)
  const barColor = pct < 70 ? '#35C56A' : pct < 90 ? '#F59E0B' : '#EF4444'
  const barLabel = pct < 70 ? 'Presupuesto saludable' : pct < 90 ? 'Atención: presupuesto al límite' : 'Presupuesto excedido'

  const myRole = getCurrentGroup()?.myRole ?? 'viajero'
  const canModifyExpenses = myRole === 'admin'
  const canAdjustBudget = myRole === 'admin'

  const categoryTotals = {
    transporte: expenses.filter(e => e.categoria === 'transporte').reduce((s, e) => s + e.monto, 0),
    hospedaje: expenses.filter(e => e.categoria === 'hospedaje').reduce((s, e) => s + e.monto, 0),
    actividad: expenses.filter(e => e.categoria === 'actividad').reduce((s, e) => s + e.monto, 0),
    comida: expenses.filter(e => e.categoria === 'comida').reduce((s, e) => s + e.monto, 0),
  }

  const handleSaveExpense = (expense: Expense) => {
    if (editingExpense) {
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)))
    } else {
      setExpenses((prev) => [...prev, expense])
    }
    setShowModal(false)
    setEditingExpense(null)
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowModal(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) {
      setExpenses((prev) => prev.filter((e) => e.id !== id))
    }
  }

  const handleAdjustBudget = () => {
    const val = parseFloat(adjustValue)
    if (!isNaN(val) && val > 0) {
      setTotalBudget(val)
      setShowAdjustModal(false)
      setAdjustValue('')
    }
  }

  if (view === 'wallet') {
    return <MyWalletView onBack={() => setView('dashboard')} />
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      {/* Header */}
      <div className="bg-[#1E0A4E] px-6 pt-6 pb-8">
        <p className="mb-1 font-body text-sm text-white/60">Presupuesto del viaje</p>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-white">Finanzas del Grupo</h1>
          {canAdjustBudget && (
            <button
              onClick={() => { setAdjustValue(String(totalBudget)); setShowAdjustModal(true) }}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-body text-xs font-medium text-white/80 transition-colors hover:bg-white/20"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 20h9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Ajustar presupuesto
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-[0.5px] border-[#E2E8F0] bg-white px-3 py-3">
            <p className="mb-1 font-body text-[10px] text-[#7A8799]">Total Viaje</p>
            <p className="font-heading text-base font-bold text-[#3D4A5C]">{formatMXN(totalBudget)}</p>
          </div>
          <div
            className={[
              'rounded-xl border-[0.5px] px-3 py-3',
              isOverBudget ? 'border-[#EF4444] bg-[#EF4444]' : 'border-[#E2E8F0] bg-white',
            ].join(' ')}
          >
            <p className={['mb-1 font-body text-[10px]', isOverBudget ? 'text-white' : 'text-[#7A8799]'].join(' ')}>
              Comprometido
            </p>
            <p className={['font-heading text-base font-bold', isOverBudget ? 'text-white' : 'text-[#EF4444]'].join(' ')}>
              {formatMXN(comprometido)}
            </p>
          </div>
          <div className="rounded-xl border-[0.5px] border-[#E2E8F0] bg-white px-3 py-3">
            <p className="mb-1 font-body text-[10px] text-[#7A8799]">Disponible</p>
            <p className="font-heading text-base font-bold text-[#35C56A]">{formatMXN(disponible)}</p>
          </div>
        </div>
      </div>

      {/* Banner de alerta: presupuesto excedido */}
      {isOverBudget && (
        <div className="flex items-center gap-3 bg-[#B91C1C] px-6 py-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <line x1="12" y1="9" x2="12" y2="13" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17" r="1" fill="white" />
          </svg>
          <p className="font-body font-semibold text-white" style={{ fontSize: '14px' }}>
            ¡Presupuesto excedido!
          </p>
        </div>
      )}

      {/* Progress bar */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-body text-xs text-[#7A8799]">Comprometido del total</span>
          <span className="font-body text-xs font-semibold" style={{ color: barColor }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: barColor }}
          />
        </div>
        <p className="mt-1.5 font-body text-[11px] text-[#7A8799]">{barLabel}</p>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div className="flex gap-3">
          <button
            onClick={() => { setEditingExpense(null); setShowModal(true) }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Registrar gasto
          </button>
          <button
            onClick={() => setView('wallet')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E6FD9] py-3 font-body text-sm font-semibold text-[#1E6FD9] transition-colors hover:bg-[#1E6FD9]/5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
              <line x1="1" y1="10" x2="23" y2="10" stroke="currentColor" strokeWidth="2" />
            </svg>
            Mi Cartera
          </button>
        </div>

        {/* Gastos del grupo */}
        <div>
          <h2 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Gastos del grupo</h2>
          <div className="flex flex-col gap-2">
            {expenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    backgroundColor: `${categoryColor(expense.categoria)}18`,
                    color: categoryColor(expense.categoria),
                  }}
                >
                  <CategoryIcon categoria={expense.categoria} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-semibold text-[#3D4A5C]">{expense.titulo}</p>
                  <p className="font-body text-xs text-[#7A8799]">
                    Pagó {expense.pagadoPor} · {expense.fecha}
                  </p>
                </div>
                <span className="shrink-0 font-heading text-sm font-bold text-[#3D4A5C]">
                  {formatMXN(expense.monto)}
                </span>
                {canModifyExpenses && (
                  <button
                    onClick={() => openEdit(expense)}
                    aria-label="Editar gasto"
                    className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#F4F6F8] hover:text-[#1E6FD9]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
                {canModifyExpenses && (
                  <button
                    onClick={() => handleDelete(expense.id)}
                    aria-label="Eliminar gasto"
                    className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panel derecho: Participantes + Presupuesto Grupal */}
        <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Participantes</h3>
            <div className="flex flex-wrap gap-2">
              {MOCK_MEMBERS.map((member) => (
                <div key={member} className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E0A4E] font-heading text-[10px] font-bold text-white">
                    {member[0]}
                  </div>
                  <span className="font-body text-xs text-[#3D4A5C]">{member}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Presupuesto Grupal</h3>
            <div className="flex flex-col gap-2.5">
              {(
                [
                  { label: 'Vuelos', categoria: 'transporte' },
                  { label: 'Hospedaje', categoria: 'hospedaje' },
                  { label: 'Actividades', categoria: 'actividad' },
                  { label: 'Comida', categoria: 'comida' },
                ] as { label: string; categoria: keyof typeof categoryTotals }[]
              ).map(({ label, categoria }) => (
                <div key={categoria} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${categoryColor(categoria)}18`, color: categoryColor(categoria) }}
                    >
                      <CategoryIcon categoria={categoria} />
                    </span>
                    <span className="font-body text-xs text-[#7A8799]">{label}</span>
                  </div>
                  <span className="font-body text-xs font-semibold text-[#3D4A5C]">
                    {formatMXN(categoryTotals[categoria])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RegisterExpenseModal
        open={showModal}
        members={MOCK_MEMBERS}
        editingExpense={editingExpense}
        onClose={() => { setShowModal(false); setEditingExpense(null) }}
        onSave={handleSaveExpense}
      />

      {/* Modal: Ajustar presupuesto total */}
      {showAdjustModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(13,8,32,0.75)' }}
          onClick={() => setShowAdjustModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 font-heading text-lg font-bold text-[#1E0A4E]">Ajustar presupuesto total</h2>
            <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Nuevo presupuesto (MXN)</label>
            <div className="relative mb-4">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
              <input
                type="number"
                min="0"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 pl-7 pr-4 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 font-body text-sm font-semibold text-[#7A8799] transition-colors hover:border-[#3D4A5C] hover:text-[#3D4A5C]"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdjustBudget}
                disabled={!adjustValue || parseFloat(adjustValue) <= 0}
                className="flex-1 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
