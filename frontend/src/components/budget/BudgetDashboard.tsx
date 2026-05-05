import { useCallback, useEffect, useState } from 'react'
import type { FC } from 'react'
import { RegisterExpenseModal } from './RegisterExpenseModal'
import { MyWalletView } from './MyWalletView'
import { useAuth } from '../../context/useAuth'
import {
  budgetService,
  type BudgetDashboardResponse,
  type BudgetMember,
  type BudgetSummary,
} from '../../services/budget'

export interface Expense {
  id: string
  titulo: string
  categoria: 'transporte' | 'hospedaje' | 'actividad' | 'comida' | 'otro'
  monto: number
  pagadoPor: string
  pagadoPorId: string
  splitType: 'equitativa' | 'personalizada'
  fecha: string
  splitAmounts?: Record<string, number>
}

interface Props {
  groupId: string | null
  onSummaryChange?: (summary: BudgetSummary | null) => void
}

const CATEGORY_LABELS: Record<Expense['categoria'], string> = {
  transporte: 'Vuelos',
  hospedaje: 'Hospedaje',
  actividad: 'Actividades',
  comida: 'Comida',
  otro: 'Otros',
}

const EMPTY_TOTALS: Record<Expense['categoria'], number> = {
  transporte: 0,
  hospedaje: 0,
  actividad: 0,
  comida: 0,
  otro: 0,
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
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

function normalizeExpense(expense: BudgetDashboardResponse['expenses'][number]): Expense {
  const dateSource = expense.expenseDate ?? expense.createdAt ?? new Date().toISOString()
  return {
    id: expense.id,
    titulo: expense.description,
    categoria: expense.category,
    monto: Number(expense.amount),
    pagadoPor: expense.paidByName,
    pagadoPorId: expense.paidByUserId,
    splitType: expense.splitType,
    fecha: dateSource.split('T')[0],
    splitAmounts: expense.splitAmounts,
  }
}

export const BudgetDashboard: FC<Props> = ({ groupId, onSummaryChange }) => {
  const { accessToken, localUser } = useAuth()
  const [dashboard, setDashboard] = useState<BudgetDashboardResponse | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<BudgetMember[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [view, setView] = useState<'dashboard' | 'wallet'>('dashboard')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [adjustValue, setAdjustValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyDashboard = useCallback((nextDashboard: BudgetDashboardResponse) => {
    setDashboard(nextDashboard)
    setExpenses(nextDashboard.expenses.map(normalizeExpense))
    setMembers(nextDashboard.members)
    onSummaryChange?.(nextDashboard.summary)
  }, [onSummaryChange])

  const loadDashboard = useCallback(async () => {
    if (!groupId || !accessToken) {
      setIsLoading(false)
      onSummaryChange?.(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      applyDashboard(await budgetService.getDashboard(groupId, accessToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el presupuesto')
      onSummaryChange?.(null)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyDashboard, groupId, onSummaryChange])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const totalBudget = dashboard?.summary.totalBudget ?? 0
  const comprometido = dashboard?.summary.committed ?? 0
  const disponible = dashboard?.summary.available ?? 0
  const categoryTotals = dashboard?.summary.categoryTotals ?? EMPTY_TOTALS
  const isOverBudget = totalBudget > 0 && comprometido > totalBudget
  const pct = totalBudget > 0 ? Math.min((comprometido / totalBudget) * 100, 100) : 0
  const barColor = pct < 70 ? '#35C56A' : pct < 90 ? '#F59E0B' : '#EF4444'
  const barLabel = totalBudget === 0
    ? 'Define un presupuesto para activar seguimiento'
    : pct < 70 ? 'Presupuesto saludable' : pct < 90 ? 'Atencion: presupuesto al limite' : 'Presupuesto excedido'
  const canModifyExpenses = dashboard?.myRole === 'admin'
  const canAdjustBudget = dashboard?.myRole === 'admin'

  const handleSaveExpense = async (expense: Expense) => {
    if (!groupId || !accessToken) return
    setIsSaving(true)
    setError(null)

    const payload = {
      paid_by_user_id: expense.pagadoPorId,
      amount: expense.monto,
      description: expense.titulo,
      category: expense.categoria,
      split_type: expense.splitType,
      member_ids: expense.splitType === 'equitativa'
        ? members.map((member) => member.usuario_id)
        : undefined,
      split_amounts: expense.splitType === 'personalizada' ? expense.splitAmounts : undefined,
      expense_date: expense.fecha,
    }

    try {
      const nextDashboard = editingExpense
        ? await budgetService.updateExpense(groupId, expense.id, payload, accessToken)
        : await budgetService.createExpense(groupId, payload, accessToken)
      applyDashboard(nextDashboard)
      setShowModal(false)
      setEditingExpense(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el gasto')
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!groupId || !accessToken) return
    if (!window.confirm('Eliminar este gasto? Esta accion no se puede deshacer.')) return

    setIsSaving(true)
    setError(null)
    try {
      applyDashboard(await budgetService.deleteExpense(groupId, id, accessToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el gasto')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdjustBudget = async () => {
    if (!groupId || !accessToken) return
    const val = parseFloat(adjustValue)
    if (!Number.isFinite(val) || val < 0) return

    setIsSaving(true)
    setError(null)
    try {
      applyDashboard(await budgetService.updateBudget(groupId, val, accessToken))
      setShowAdjustModal(false)
      setAdjustValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo ajustar el presupuesto')
    } finally {
      setIsSaving(false)
    }
  }

  if (view === 'wallet') {
    return (
      <MyWalletView
        onBack={() => setView('dashboard')}
        settlements={dashboard?.settlements ?? []}
        paymentHistory={dashboard?.paymentHistory ?? []}
        members={members}
        myRole={dashboard?.myRole ?? 'viajero'}
        currentUserId={localUser?.id_usuario != null ? String(localUser.id_usuario) : null}
        onMarkPaid={async (payload) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            const nextDashboard = await budgetService.markSettlementPaid(groupId, payload, accessToken)
            applyDashboard(nextDashboard)
          } catch (err) {
            setError(err instanceof Error ? err.message : 'No se pudo marcar el pago')
          } finally {
            setIsSaving(false)
          }
        }}
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#F4F6F8] p-8">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white px-6 py-5 text-center">
          <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-[#1E6FD9] border-t-transparent" />
          <p className="font-body text-sm text-[#7A8799]">Cargando presupuesto...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-[#F4F6F8]">
      <div className="bg-[#1E0A4E] px-6 pt-6 pb-8">
        <p className="mb-1 font-body text-sm text-white/60">Presupuesto del viaje</p>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-heading text-2xl font-bold text-white">Finanzas del Grupo</h1>
          {canAdjustBudget && (
            <button
              onClick={() => { setAdjustValue(String(totalBudget)); setShowAdjustModal(true) }}
              disabled={isSaving}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 font-body text-xs font-medium text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              Ajustar presupuesto
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border-[0.5px] border-[#E2E8F0] bg-white px-3 py-3">
            <p className="mb-1 font-body text-[10px] text-[#7A8799]">Total Viaje</p>
            <p className="font-heading text-base font-bold text-[#3D4A5C]">{formatMXN(totalBudget)}</p>
          </div>
          <div className={['rounded-xl border-[0.5px] px-3 py-3', isOverBudget ? 'border-[#EF4444] bg-[#EF4444]' : 'border-[#E2E8F0] bg-white'].join(' ')}>
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

      {isOverBudget && (
        <div className="bg-[#B91C1C] px-6 py-3 font-body text-sm font-semibold text-white">
          Presupuesto excedido
        </div>
      )}

      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-body text-xs text-[#7A8799]">Comprometido del total</span>
          <span className="font-body text-xs font-semibold" style={{ color: barColor }}>
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
        <p className="mt-1.5 font-body text-[11px] text-[#7A8799]">{barLabel}</p>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-6 py-5">
        <div className="flex gap-3">
          <button
            onClick={() => { setEditingExpense(null); setShowModal(true) }}
            disabled={!groupId || members.length === 0 || isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Registrar gasto
          </button>
          <button
            onClick={() => setView('wallet')}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E6FD9] py-3 font-body text-sm font-semibold text-[#1E6FD9] transition-colors hover:bg-[#1E6FD9]/5"
          >
            Mi Cartera
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-4 py-3 font-body text-sm text-[#C03535]">
            {error}
          </div>
        )}

        <div>
          <h2 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Gastos del grupo</h2>
          <div className="flex flex-col gap-2">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-8 text-center font-body text-sm text-[#7A8799]">
                Aun no hay gastos registrados para este viaje.
              </div>
            ) : expenses.map((expense) => (
              <div key={expense.id} className="flex items-center gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${categoryColor(expense.categoria)}18`, color: categoryColor(expense.categoria) }}
                >
                  <CategoryIcon categoria={expense.categoria} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-semibold text-[#3D4A5C]">{expense.titulo}</p>
                  <p className="font-body text-xs text-[#7A8799]">Pago {expense.pagadoPor} - {expense.fecha}</p>
                </div>
                <span className="shrink-0 font-heading text-sm font-bold text-[#3D4A5C]">{formatMXN(expense.monto)}</span>
                {canModifyExpenses && (
                  <button
                    onClick={() => openEdit(expense)}
                    aria-label="Editar gasto"
                    className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#F4F6F8] hover:text-[#1E6FD9]"
                  >
                    Editar
                  </button>
                )}
                {canModifyExpenses && (
                  <button
                    onClick={() => void handleDelete(expense.id)}
                    aria-label="Eliminar gasto"
                    className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                  >
                    Eliminar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Participantes</h3>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <div key={member.usuario_id} className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1E0A4E] font-heading text-[10px] font-bold text-white">
                    {(member.nombre || member.email || '?')[0]}
                  </div>
                  <span className="font-body text-xs text-[#3D4A5C]">{member.nombre || member.email}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Presupuesto Grupal</h3>
            <div className="flex flex-col gap-2.5">
              {(Object.keys(CATEGORY_LABELS) as Expense['categoria'][]).map((categoria) => (
                <div key={categoria} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${categoryColor(categoria)}18`, color: categoryColor(categoria) }}
                    >
                      <CategoryIcon categoria={categoria} />
                    </span>
                    <span className="font-body text-xs text-[#7A8799]">{CATEGORY_LABELS[categoria]}</span>
                  </div>
                  <span className="font-body text-xs font-semibold text-[#3D4A5C]">
                    {formatMXN(categoryTotals[categoria] ?? 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <RegisterExpenseModal
        open={showModal}
        members={members}
        editingExpense={editingExpense}
        onClose={() => { setShowModal(false); setEditingExpense(null) }}
        onSave={(expense) => void handleSaveExpense(expense)}
      />

      {showAdjustModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(13,8,32,0.75)' }}
          onClick={() => setShowAdjustModal(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
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
                onClick={() => void handleAdjustBudget()}
                disabled={isSaving || !adjustValue || parseFloat(adjustValue) < 0}
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
