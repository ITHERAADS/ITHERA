import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FC } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { RegisterExpenseModal } from './RegisterExpenseModal'
import { MyWalletView } from './MyWalletView'
import { useAuth } from '../../context/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { useGroupRealtimeRefresh } from '../../hooks/useGroupRealtimeRefresh'
import {
  budgetService,
  type BudgetDashboardResponse,
  type BudgetMember,
  type BudgetSummary,
} from '../../services/budget'
import { documentsService, type TripDocumentCategory } from '../../services/documents'
import {
  contextLinksService,
  type ContextEntityRef,
  type ContextEntitySummary,
  type ContextLink,
  type ContextLinkOptions,
} from '../../services/context-links'

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
  participantIds?: string[]
  linkedActivities?: ContextEntityRef[]
  linkedDocuments?: string[]
  draftDocument?: {
    file: File
    category: TripDocumentCategory
    notes: string
  } | null
}

interface Props {
  groupId: string | null
  onSummaryChange?: (summary: BudgetSummary | null) => void
  onOpenVault?: () => void
  onOpenItinerary?: () => void
  onOpenSubgroups?: () => void
  /** Modo solo lectura: viaje cerrado/archivado/finalizado (CU-2.10) */
  isReadOnly?: boolean
}

const CATEGORY_LABELS: Record<Expense['categoria'], string> = {
  transporte: 'Transporte',
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

const EMPTY_LINK_OPTIONS: ContextLinkOptions = {
  expenses: [],
  documents: [],
  activities: [],
  subgroupActivities: [],
}

function formatMXN(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(n)
}

function buildReceiptPdfDocument(data: {
  folio: string
  fecha: string
  viaje: string
  acreedor: string
  deudor: string
  monto: string
}): string {
  const esc = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  const lines = [
    'BT',
    // Header text
    '/F1 34 Tf',
    '1 1 1 rg',
    '72 770 Td',
    '(RECIBO DE COBRO) Tj',
    '/F1 13 Tf',
    '0 -24 Td (ITHERA - Comprobante financiero) Tj',
    // Body labels/values
    '/F1 12 Tf',
    '0.16 0.22 0.36 rg',
    '0 -70 Td (Folio) Tj',
    '240 0 Td (Fecha de emision) Tj',
    '-240 -20 Td',
    '/F1 18 Tf',
    `(${esc(data.folio)}) Tj`,
    '240 0 Td',
    `(${esc(data.fecha)}) Tj`,
    '/F1 12 Tf',
    '-240 -52 Td (Viaje) Tj',
    '0 -20 Td',
    '/F1 18 Tf',
    `(${esc(data.viaje)}) Tj`,
    '/F1 12 Tf',
    '0 -52 Td (Acreedor \\(cobra\\)) Tj',
    '0 -20 Td',
    '/F1 18 Tf',
    `(${esc(data.acreedor)}) Tj`,
    '/F1 12 Tf',
    '0 -52 Td (Deudor) Tj',
    '0 -20 Td',
    '/F1 18 Tf',
    `(${esc(data.deudor)}) Tj`,
    '/F1 12 Tf',
    '0 -52 Td (Monto) Tj',
    '0 -20 Td',
    '/F1 22 Tf',
    '0.12 0.44 0.86 rg',
    `(${esc(data.monto)}) Tj`,
    '/F1 11 Tf',
    '0.32 0.40 0.54 rg',
    '0 -42 Td (Snapshot inmutable del estado de deuda al momento de emision.) Tj',
    'ET',
  ].join('\n')

  const draw = [
    // Header background
    '0.12 0.04 0.36 rg',
    '40 740 515 90 re',
    'f',
    // Main card
    '0.96 0.96 0.99 rg',
    '72 250 451 480 re',
    'f',
    // Card border
    '0.82 0.85 0.93 RG',
    '1 w',
    '72 250 451 480 re',
    'S',
    // Horizontal separators
    '0.86 0.89 0.95 RG',
    '0.8 w',
    '92 586 m 503 586 l S',
    '92 512 m 503 512 l S',
    '92 438 m 503 438 l S',
    '92 364 m 503 364 l S',
  ].join('\n')

  const contentStream = `${draw}\n${lines}`
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${contentStream.length} >> stream\n${contentStream}\nendstream endobj`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += `${obj}\n`
  }
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`
  return pdf
}

function categoryColor(categoria: Expense['categoria']): string {
  switch (categoria) {
    case 'transporte': return '#2F7CF6'
    case 'hospedaje': return '#8A63F9'
    case 'comida': return '#F59E0B'
    case 'actividad': return '#31C773'
    default: return '#6B7FA6'
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
    participantIds: Object.keys(expense.splitAmounts ?? {}),
  }
}

const entityKey = (entity: ContextEntityRef): string => `${entity.type}:${entity.id}`

const otherEntityForExpense = (link: ContextLink, expenseId: string): ContextEntitySummary | null => {
  if (link.entityA.type === 'expense' && link.entityA.id === expenseId) return link.entityB
  if (link.entityB.type === 'expense' && link.entityB.id === expenseId) return link.entityA
  return null
}

const isExpenseContextType = (type: ContextEntityRef['type']): boolean =>
  type === 'activity' || type === 'subgroup_activity' || type === 'document'

export const BudgetDashboard: FC<Props> = ({
  groupId,
  onSummaryChange,
  onOpenVault,
  onOpenItinerary,
  onOpenSubgroups,
  isReadOnly = false,
}) => {
  const { accessToken, localUser } = useAuth()
  const { socket } = useSocket(accessToken)
  const [dashboard, setDashboard] = useState<BudgetDashboardResponse | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [members, setMembers] = useState<BudgetMember[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [view, setView] = useState<'dashboard' | 'wallet'>('dashboard')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null)
  const [adjustValue, setAdjustValue] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([])
  const [linkOptions, setLinkOptions] = useState<ContextLinkOptions>(EMPTY_LINK_OPTIONS)
  const [isOffline, setIsOffline] = useState<boolean>(typeof navigator !== 'undefined' ? !navigator.onLine : false)
  const [copyGroupSummaryState, setCopyGroupSummaryState] = useState<'idle' | 'loading' | 'done'>('idle')
  const [exportingGroupSummary, setExportingGroupSummary] = useState(false)

  const toUserMessage = (err: unknown, fallback: string): string => {
    const raw = err instanceof Error ? err.message : ''
    if (!raw) return fallback

    if (raw.includes('<!DOCTYPE html>') || raw.includes('<html')) {
      if (raw.includes('Cannot GET')) {
        return 'El modulo financiero no esta disponible en este backend. Actualiza/reinicia el backend con las rutas de presupuesto.'
      }
      return fallback
    }

    return raw
  }

  const applyDashboard = useCallback((nextDashboard: BudgetDashboardResponse) => {
    setDashboard(nextDashboard)
    setExpenses(nextDashboard.expenses.map(normalizeExpense))
    setMembers(nextDashboard.members)
    onSummaryChange?.(nextDashboard.summary)
    if (groupId) {
      localStorage.setItem(`budget-dashboard-cache:${groupId}`, JSON.stringify(nextDashboard))
    }
  }, [groupId, onSummaryChange])

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
      const cachedRaw = localStorage.getItem(`budget-dashboard-cache:${groupId}`)
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw) as BudgetDashboardResponse
          applyDashboard(cached)
          setError('Mostrando el ultimo estado sincronizado (modo offline).')
        } catch {
          setError(toUserMessage(err, 'No se pudo cargar el presupuesto'))
          onSummaryChange?.(null)
        }
      } else {
        setError(toUserMessage(err, 'No se pudo cargar el presupuesto'))
        onSummaryChange?.(null)
      }
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, applyDashboard, groupId, onSummaryChange])

  useEffect(() => {
    const goOnline = () => setIsOffline(false)
    const goOffline = () => setIsOffline(true)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const loadContextLinks = useCallback(async () => {
    if (!groupId || !accessToken) {
      setContextLinks([])
      setLinkOptions(EMPTY_LINK_OPTIONS)
      return
    }

    const [linksResponse, optionsResponse] = await Promise.all([
      contextLinksService.list(groupId, accessToken),
      contextLinksService.options(groupId, accessToken),
    ])
    setContextLinks(linksResponse.links)
    setLinkOptions(optionsResponse.options)
  }, [accessToken, groupId])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    void loadContextLinks().catch(() => {
      setContextLinks([])
      setLinkOptions(EMPTY_LINK_OPTIONS)
    })
  }, [loadContextLinks])

  useGroupRealtimeRefresh({
    socket,
    groupId,
    events: ['dashboard_updated', 'checkout_updated'],
    debounceMs: 250,
    onRefresh: async (payload) => {
      const tipo = String(payload.tipo ?? '')
      if (
        tipo.startsWith('gasto_') ||
        tipo.startsWith('presupuesto_') ||
        tipo.startsWith('pago_') ||
        tipo.includes('checkout') ||
        tipo.includes('documento') ||
        tipo.includes('liquidacion')
      ) {
        await Promise.all([
          loadDashboard(),
          loadContextLinks().catch(() => undefined),
        ])
      }
    },
  })

  const getLinksForExpense = useCallback((expenseId: string) => {
    return contextLinks
      .map((link) => otherEntityForExpense(link, expenseId))
      .filter((entity): entity is ContextEntitySummary =>
        entity !== null && isExpenseContextType(entity.type)
      )
  }, [contextLinks])

  const getExpenseWithLinks = useCallback((expense: Expense): Expense => {
    const linked = getLinksForExpense(expense.id)
    return {
      ...expense,
      linkedActivities: linked
        .filter((entity) => entity.type === 'activity' || entity.type === 'subgroup_activity')
        .map((entity) => ({ type: entity.type, id: entity.id })),
      linkedDocuments: linked
        .filter((entity) => entity.type === 'document')
        .map((entity) => entity.id),
    }
  }, [getLinksForExpense])

  const findSavedExpenseId = (
    nextDashboard: BudgetDashboardResponse,
    expense: Expense,
    previousIds: Set<string>,
  ): string | null => {
    const candidates = nextDashboard.expenses
      .filter((item) => !previousIds.has(String(item.id)))
      .filter((item) =>
        item.description === expense.titulo &&
        Number(item.amount) === Number(expense.monto) &&
        String(item.paidByUserId) === String(expense.pagadoPorId) &&
        item.category === expense.categoria
      )
      .sort((a, b) => Number(b.id) - Number(a.id))

    return candidates[0]?.id ? String(candidates[0].id) : null
  }

  const syncExpenseLinks = async (expenseId: string, expense: Expense) => {
    if (!groupId || !accessToken) return

    const desiredEntities: ContextEntityRef[] = [
      ...(expense.linkedActivities ?? []),
      ...(expense.linkedDocuments ?? []).map((id) => ({ type: 'document' as const, id })),
    ]

    const desiredKeys = new Set(desiredEntities.map(entityKey))
    const currentResponse = await contextLinksService.list(groupId, accessToken, {
      type: 'expense',
      id: expenseId,
    })
    const currentRelevant = currentResponse.links
      .map((link) => ({ link, entity: otherEntityForExpense(link, expenseId) }))
      .filter((item): item is { link: ContextLink; entity: ContextEntitySummary } =>
        item.entity !== null && isExpenseContextType(item.entity.type)
      )

    await Promise.all([
      ...currentRelevant
        .filter(({ entity }) => entity && !desiredKeys.has(entityKey(entity)))
        .map(({ link }) => contextLinksService.remove(groupId, link.id, accessToken)),
      ...desiredEntities
        .filter((entity) => !currentRelevant.some((item) => item.entity && entityKey(item.entity) === entityKey(entity)))
        .map((entity) => contextLinksService.create(groupId, {
          source: { type: 'expense', id: expenseId },
          target: entity,
        }, accessToken)),
    ])
  }

  const findReceiptRelatedExpenseId = useCallback((
    debtorUserId: string,
    creditorUserId: string,
    receiptAmount: number,
  ): string | null => {
    const entries = (dashboard?.expenses ?? [])
      .map((expense) => {
        if (String(expense.paidByUserId) !== String(creditorUserId)) return null
        const splitShare = Number(expense.splitAmounts?.[debtorUserId] ?? 0)
        if (!Number.isFinite(splitShare) || splitShare <= 0) return null
        const createdAt = new Date(expense.createdAt ?? expense.expenseDate ?? 0).getTime()
        return {
          id: String(expense.id),
          splitShare,
          createdAt: Number.isFinite(createdAt) ? createdAt : 0,
        }
      })
      .filter((item): item is { id: string; splitShare: number; createdAt: number } => item !== null)
      .sort((left, right) => {
        const amountDiff = Math.abs(left.splitShare - receiptAmount) - Math.abs(right.splitShare - receiptAmount)
        if (amountDiff !== 0) return amountDiff
        return right.createdAt - left.createdAt
      })

    return entries[0]?.id ?? null
  }, [dashboard?.expenses])


  const totalBudget = dashboard?.summary.totalBudget ?? 0
  const comprometido = dashboard?.summary.committed ?? 0
  const disponible = dashboard?.summary.available ?? 0
  const categoryTotals = dashboard?.summary.categoryTotals ?? EMPTY_TOTALS
  const chartData = useMemo(
    () =>
      (Object.keys(CATEGORY_LABELS) as Expense['categoria'][]).map((categoria) => ({
        categoria,
        name: CATEGORY_LABELS[categoria],
        value: Number(categoryTotals[categoria] ?? 0),
        fill: categoryColor(categoria),
      })),
    [categoryTotals],
  )
  const chartTotal = useMemo(
    () => chartData.reduce((sum, item) => sum + item.value, 0),
    [chartData],
  )
  const chartVisibleData = useMemo(
    () => chartData.filter((item) => item.value > 0),
    [chartData],
  )
  const chartZeroData = useMemo(
    () => chartData.filter((item) => item.value <= 0),
    [chartData],
  )
  const topCategory = useMemo(() => {
    if (chartVisibleData.length === 0) return null
    return [...chartVisibleData].sort((a, b) => b.value - a.value)[0] ?? null
  }, [chartVisibleData])
  const activeCategoriesCount = chartVisibleData.length
  const averagePerCategory = activeCategoriesCount > 0 ? chartTotal / activeCategoriesCount : 0
  const isOverBudget = totalBudget > 0 && comprometido > totalBudget
  const pct = totalBudget > 0 ? Math.min((comprometido / totalBudget) * 100, 100) : 0
  const barColor = pct < 70 ? '#35C56A' : pct < 90 ? '#F59E0B' : '#EF4444'
  const barLabel = totalBudget === 0
    ? 'Define un presupuesto para activar seguimiento'
    : pct < 70 ? 'Presupuesto saludable' : pct < 90 ? 'Atencion: presupuesto al limite' : 'Presupuesto excedido'
  const canModifyExpenses = dashboard?.myRole === 'admin' && !isReadOnly && !isOffline
  const canAdjustBudget = dashboard?.myRole === 'admin' && !isReadOnly && !isOffline
  const requiresBudgetSetup = totalBudget <= 0
  const groupSettlementSummary = dashboard?.groupSettlementSummary ?? { totalTransfers: 0, totalAmount: 0 }

  const buildGroupSettlementSummaryText = () => {
    return [
      'Resumen grupal de liquidacion',
      `Fecha: ${new Date().toLocaleString('es-MX')}`,
      `Transferencias minimas pendientes: ${groupSettlementSummary.totalTransfers}`,
      `Monto total por liquidar: ${formatMXN(groupSettlementSummary.totalAmount)}`,
    ].join('\n')
  }

  const handleSaveExpense = async (expense: Expense) => {
    if (!groupId || !accessToken) return

    const editingPreviousAmount = editingExpense ? Number(editingExpense.monto) : 0
    const nextCommitted = comprometido - editingPreviousAmount + Number(expense.monto)
    if (totalBudget > 0 && nextCommitted - totalBudget > 0.01) {
      setError('Este gasto excede el presupuesto total del viaje. Ajusta el presupuesto o reduce el monto.')
      return
    }

    if (requiresBudgetSetup) {
      setError('Primero define el presupuesto total del viaje para registrar gastos.')
      return
    }

    setIsSaving(true)
    setError(null)
    const previousExpenseIds = new Set(expenses.map((item) => item.id))

    const payload = {
      paid_by_user_id: expense.pagadoPorId,
      amount: expense.monto,
      description: expense.titulo,
      category: expense.categoria,
      split_type: expense.splitType,
      member_ids: expense.splitType === 'equitativa'
        ? (expense.participantIds?.length ? expense.participantIds : members.map((member) => member.usuario_id))
        : undefined,
      split_amounts: expense.splitType === 'personalizada' ? expense.splitAmounts : undefined,
      expense_date: expense.fecha,
    }

    try {
      const nextDashboard = editingExpense
        ? await budgetService.updateExpense(groupId, expense.id, payload, accessToken)
        : await budgetService.createExpense(groupId, payload, accessToken)
      const savedExpenseId = editingExpense?.id ?? findSavedExpenseId(nextDashboard, expense, previousExpenseIds)
      if (savedExpenseId) {
        await syncExpenseLinks(savedExpenseId, expense)
        if (expense.draftDocument) {
          const document = await documentsService.upload(groupId, expense.draftDocument.file, expense.draftDocument.category, {
            notes: expense.draftDocument.notes,
          }, accessToken)
          await contextLinksService.create(groupId, {
            source: { type: 'expense', id: savedExpenseId },
            target: { type: 'document', id: document.id },
          }, accessToken)
        }
        await loadContextLinks()
      }
      applyDashboard(nextDashboard)
      setShowModal(false)
      setEditingExpense(null)
    } catch (err) {
      setError(toUserMessage(err, 'No se pudo guardar el gasto'))
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (expense: Expense) => {
    setEditingExpense(getExpenseWithLinks(expense))
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    if (!groupId || !accessToken) return

    setIsSaving(true)
    setError(null)
    try {
      applyDashboard(await budgetService.deleteExpense(groupId, id, accessToken))
      setExpenseToDelete(null)
    } catch (err) {
      setError(toUserMessage(err, 'No se pudo eliminar el gasto'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleAdjustBudget = async () => {
    if (!groupId || !accessToken) return
    const val = parseFloat(adjustValue)
    if (!Number.isFinite(val) || val < 0) return
    if (val + 0.01 < comprometido) {
      setError(`No puedes ajustar por debajo del comprometido actual (${formatMXN(comprometido)}).`)
      return
    }

    setIsSaving(true)
    setError(null)
    try {
      applyDashboard(await budgetService.updateBudget(groupId, val, accessToken))
      setShowAdjustModal(false)
      setAdjustValue('')
    } catch (err) {
      setError(toUserMessage(err, 'No se pudo ajustar el presupuesto'))
    } finally {
      setIsSaving(false)
    }
  }

  if (view === 'wallet') {
    return (
      <MyWalletView
        onBack={() => setView('dashboard')}
        isReadOnly={isReadOnly || isOffline}
        settlements={dashboard?.settlements ?? []}
        paymentHistory={dashboard?.paymentHistory ?? []}
        members={members}
        currentUserId={localUser?.id_usuario != null ? String(localUser.id_usuario) : null}
        onRegisterPayment={async (payload) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            let proofDocumentId: string | null = null
            if (payload.proofFile) {
              const proofDocument = await documentsService.upload(
                groupId,
                payload.proofFile,
                'gasto',
                {
                  notes: `Comprobante de pago de liquidacion ${payload.from_user_id} -> ${payload.to_user_id}`,
                  linked_entity_type: 'otro',
                },
                accessToken,
              )
              proofDocumentId = proofDocument.id
            }
            const nextDashboard = await budgetService.markSettlementPaid(groupId, {
              from_user_id: payload.from_user_id,
              to_user_id: payload.to_user_id,
              amount: payload.amount,
              payment_method: payload.payment_method,
              note: payload.note ?? null,
              proof_document_id: proofDocumentId,
            }, accessToken)
            applyDashboard(nextDashboard)
          } catch (err) {
            setError(toUserMessage(err, 'No se pudo registrar el pago'))
          } finally {
            setIsSaving(false)
          }
        }}
        onReviewPayment={async (paymentId, payload) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            const nextDashboard = await budgetService.reviewSettlementPayment(groupId, paymentId, payload, accessToken)
            applyDashboard(nextDashboard)
          } catch (err) {
            setError(toUserMessage(err, 'No se pudo revisar el pago'))
          } finally {
            setIsSaving(false)
          }
        }}
        onUpdateSentPayment={async (paymentId, payload) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            let proofDocumentId: string | null = null
            if (payload.proofFile) {
              const proofDocument = await documentsService.upload(
                groupId,
                payload.proofFile,
                'gasto',
                {
                  notes: `Comprobante actualizado de pago de liquidacion`,
                  linked_entity_type: 'otro',
                },
                accessToken,
              )
              proofDocumentId = proofDocument.id
            }
            const nextDashboard = await budgetService.updatePendingSettlementPayment(
              groupId,
              paymentId,
              {
                amount: payload.amount,
                payment_method: payload.payment_method,
                note: payload.note ?? null,
                proof_document_id: proofDocumentId,
              },
              accessToken,
            )
            applyDashboard(nextDashboard)
          } catch (err) {
            setError(toUserMessage(err, 'No se pudo actualizar el pago'))
          } finally {
            setIsSaving(false)
          }
        }}
        onDeleteSentPayment={async (paymentId) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            const nextDashboard = await budgetService.deletePendingSettlementPayment(groupId, paymentId, accessToken)
            applyDashboard(nextDashboard)
          } catch (err) {
            setError(toUserMessage(err, 'No se pudo eliminar el pago'))
          } finally {
            setIsSaving(false)
          }
        }}
        onGenerateReceipt={async (payload) => {
          if (!groupId || !accessToken) return
          setIsSaving(true)
          setError(null)
          try {
            const apiBase = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '')
            const apiRoots = Array.from(new Set([
              apiBase,
              apiBase.endsWith('/groups') ? apiBase.slice(0, -'/groups'.length) : apiBase,
            ])).filter(Boolean)

            const requestPayload = {
              folio: payload.folio,
              tripLabel: String(groupId),
              issuedAt: new Date().toLocaleString('es-MX'),
              creditor: payload.creditor_name || payload.creditor_user_id,
              debtor: payload.debtor_name || payload.debtor_user_id,
              amount: formatMXN(payload.amount),
            }

            let receiptBlob: Blob | null = null
            for (const root of apiRoots) {
              const endpoints = [
                `${root}/groups/${groupId}/settlements/receipt-pdf`,
                `${root}/budget/${groupId}/settlements/receipt-pdf`,
              ]
              for (const endpoint of endpoints) {
                const response = await fetch(endpoint, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestPayload),
                })
                if (response.ok) {
                  receiptBlob = await response.blob()
                  break
                }
              }
              if (receiptBlob) break
            }

            if (!receiptBlob) {
              const fallbackPdf = buildReceiptPdfDocument({
                folio: payload.folio,
                fecha: requestPayload.issuedAt,
                viaje: requestPayload.tripLabel,
                acreedor: requestPayload.creditor,
                deudor: requestPayload.debtor,
                monto: requestPayload.amount,
              })
              receiptBlob = new Blob([fallbackPdf], { type: 'application/pdf' })
            }

            const previewBlob = receiptBlob
            const previewUrl = URL.createObjectURL(previewBlob)
            const previewWindow = window.open(previewUrl, '_blank')
            window.setTimeout(() => URL.revokeObjectURL(previewUrl), 120000)
            if (!previewWindow) {
              throw new Error('No se pudo abrir la vista previa del recibo. Revisa el bloqueador de ventanas.')
            }

            if (!payload.save_to_vault) return

            const existingDocs = await documentsService.list(groupId, accessToken)
            const duplicated = existingDocs.find((doc) =>
              String(doc.metadata?.immutable_kind ?? '') === 'recibo_cobro' &&
              String(doc.metadata?.receipt_debtor_user_id ?? '') === String(payload.debtor_user_id) &&
              String(doc.metadata?.receipt_creditor_user_id ?? '') === String(payload.creditor_user_id)
            )
            if (duplicated) {
              throw new Error('Este recibo ya fue generado y ya esta en la boveda de documentos.')
            }

            const pdfName = payload.fileName.replace(/\.txt$/i, '.pdf')
            const file = new File([receiptBlob], pdfName, { type: 'application/pdf' })
            const uploadedDocument = await documentsService.upload(
              groupId,
              file,
              'otro',
              {
                immutable: true,
                immutable_kind: 'recibo_cobro',
                receipt_debtor_user_id: payload.debtor_user_id,
                receipt_creditor_user_id: payload.creditor_user_id,
                receipt_folio: payload.folio,
                linked_entity_type: 'otro',
                person_reference: payload.debtor_user_id,
                person_references: [payload.creditor_user_id, payload.debtor_user_id],
                expense_reason: `Recibo de cobro ${payload.folio}`,
                expense_amount: payload.amount,
                notes: `Recibo inmutable generado. Folio: ${payload.folio}`,
              },
              accessToken,
            )
            const relatedExpenseId = findReceiptRelatedExpenseId(
              payload.debtor_user_id,
              payload.creditor_user_id,
              payload.amount,
            )
            if (relatedExpenseId) {
              await contextLinksService.create(groupId, {
                source: { type: 'document', id: uploadedDocument.id },
                target: { type: 'expense', id: relatedExpenseId },
              }, accessToken)
            }
            await Promise.all([loadDashboard(), loadContextLinks()])
          } catch (err) {
            setError(toUserMessage(err, 'No se pudo generar el recibo de cobro'))
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
        {isOffline && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3 font-body text-sm text-[#92400E]">
            Sin conexion: finanzas esta en modo solo lectura con el ultimo estado sincronizado.
          </div>
        )}
        <div className="flex gap-3">
          {!isReadOnly && (
            <button
              onClick={() => { setEditingExpense(null); setShowModal(true) }}
              disabled={!groupId || members.length === 0 || isSaving || requiresBudgetSetup}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E6FD9] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Registrar gasto
            </button>
          )}
          <button
            onClick={() => setView('wallet')}
            disabled={requiresBudgetSetup}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#1E6FD9] py-3 font-body text-sm font-semibold text-[#1E6FD9] transition-colors hover:bg-[#1E6FD9]/5"
          >
            Mi Cartera
          </button>
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-body text-xs text-[#7A8799]">Liquidacion grupal (sin detalle sensible)</p>
              <p className="font-body text-sm font-semibold text-[#3D4A5C]">
                {groupSettlementSummary.totalTransfers} transferencias · {formatMXN(groupSettlementSummary.totalAmount)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    setCopyGroupSummaryState('loading')
                    await navigator.clipboard.writeText(buildGroupSettlementSummaryText())
                    setCopyGroupSummaryState('done')
                    window.setTimeout(() => setCopyGroupSummaryState('idle'), 1800)
                  } catch {
                    setCopyGroupSummaryState('idle')
                    setError('No se pudo copiar el resumen grupal.')
                  }
                }}
                className="rounded-lg border border-[#CBD5E1] px-3 py-1.5 font-body text-xs font-semibold text-[#334155]"
                disabled={copyGroupSummaryState === 'loading'}
              >
                {copyGroupSummaryState === 'loading' ? 'Copiando...' : copyGroupSummaryState === 'done' ? 'Resumen copiado' : 'Copiar resumen'}
              </button>
              <button
                onClick={() => {
                  setExportingGroupSummary(true)
                  const generatedAt = new Date().toLocaleString('es-MX', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const committedPct = totalBudget > 0 ? Math.min((comprometido / totalBudget) * 100, 100) : 0
                  const html = `
                    <!doctype html>
                    <html lang="es">
                      <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width,initial-scale=1" />
                        <title>Resumen grupal de liquidacion</title>
                        <style>
                          :root{--ink:#1E0A4E;--ink-soft:#2E1767;--blue:#1E6FD9;--paper:#fff;--muted:#64748B;}
                          *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
                          body{margin:0;font-family:"Segoe UI",Tahoma,Geneva,Verdana,sans-serif;background:linear-gradient(145deg,#EBE6FA 0%,#EAF2FF 100%);padding:24px;color:#243247;}
                          .sheet{max-width:920px;margin:0 auto;background:var(--paper);border:1px solid #D9E4F7;border-radius:20px;overflow:hidden;box-shadow:0 24px 56px rgba(30,10,78,.18);}
                          .hero{background:linear-gradient(120deg,var(--ink),var(--ink-soft));color:#fff;padding:28px 30px;}
                          .hero h1{margin:0;font-size:30px;}
                          .hero p{margin:8px 0 0;font-size:14px;color:rgba(255,255,255,.9);}
                          .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:14px;}
                          .metric{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.24);padding:10px;border-radius:12px;}
                          .metric b{display:block;font-size:20px;margin-top:4px;}
                          .content{padding:18px 20px 26px;background:linear-gradient(180deg,#FAFCFF 0%,#FFFFFF 18%);}
                          .section{border:1px solid #DEE7FB;border-radius:16px;background:#fff;overflow:hidden;}
                          .section h3{margin:0;padding:12px 14px;background:linear-gradient(90deg,#F3EEFF,#F8FAFF);border-bottom:1px solid #E5ECFA;color:var(--ink);}
                          .body{padding:14px;}
                          .row{display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px dashed #E6ECFA;}
                          .row:last-child{border-bottom:0;}
                          .label{color:#55637E;font-size:13px;}
                          .value{font-weight:700;color:#1E0A4E;}
                          .footer{border-top:1px solid #E5ECFA;background:#FAFCFF;padding:12px 20px;color:var(--muted);font-size:11px;display:flex;justify-content:space-between;}
                          @media print{body{background:#EEE8FB;padding:0}.sheet{border:0;border-radius:0;box-shadow:none;max-width:100%}@page{size:A4;margin:10mm}}
                        </style>
                      </head>
                      <body>
                        <main class="sheet">
                          <header class="hero">
                            <h1>Resumen Grupal de Liquidacion</h1>
                            <p>Panel de Finanzas · ITHERA</p>
                            <div class="metrics">
                              <div class="metric"><span>Total viaje</span><b>${formatMXN(totalBudget)}</b></div>
                              <div class="metric"><span>Comprometido</span><b>${formatMXN(comprometido)}</b></div>
                              <div class="metric"><span>Transferencias minimas</span><b>${groupSettlementSummary.totalTransfers}</b></div>
                              <div class="metric"><span>Monto por liquidar</span><b>${formatMXN(groupSettlementSummary.totalAmount)}</b></div>
                            </div>
                          </header>
                          <section class="content">
                            <div class="section">
                              <h3>Resumen consolidado (sin detalle sensible)</h3>
                              <div class="body">
                                <div class="row">
                                  <span class="label">Porcentaje comprometido del presupuesto</span>
                                  <span class="value">${committedPct.toFixed(1)}%</span>
                                </div>
                                <div class="row">
                                  <span class="label">Monto disponible actual</span>
                                  <span class="value">${formatMXN(disponible)}</span>
                                </div>
                                <div class="row">
                                  <span class="label">Transferencias minimas pendientes</span>
                                  <span class="value">${groupSettlementSummary.totalTransfers}</span>
                                </div>
                                <div class="row">
                                  <span class="label">Monto total por liquidar</span>
                                  <span class="value">${formatMXN(groupSettlementSummary.totalAmount)}</span>
                                </div>
                              </div>
                            </div>
                          </section>
                          <footer class="footer">
                            <span>Generado por ITHERA</span>
                            <span>${generatedAt}</span>
                          </footer>
                        </main>
                      </body>
                    </html>
                  `
                  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
                  const blobUrl = URL.createObjectURL(blob)
                  const win = window.open(blobUrl, '_blank')
                  if (!win) {
                    setExportingGroupSummary(false)
                    URL.revokeObjectURL(blobUrl)
                    setError('No se pudo abrir la ventana para exportar el resumen.')
                    return
                  }
                  const cleanup = () => {
                    URL.revokeObjectURL(blobUrl)
                    setExportingGroupSummary(false)
                  }
                  try {
                    win.addEventListener('load', () => {
                      try { win.focus(); win.print() } finally { cleanup() }
                    }, { once: true })
                  } catch {
                    window.setTimeout(() => {
                      try { win.focus(); win.print() } finally { cleanup() }
                    }, 700)
                  }
                }}
                className="rounded-lg bg-[#1E6FD9] px-3 py-1.5 font-body text-xs font-semibold text-white"
                disabled={exportingGroupSummary}
              >
                {exportingGroupSummary ? 'Exportando...' : 'Exportar resumen'}
              </button>
            </div>
          </div>
        </div>

        {requiresBudgetSetup && (
          <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3">
            <p className="font-body text-sm text-[#92400E]">
              Debes definir un presupuesto total para habilitar gastos y cartera.
            </p>
            {canAdjustBudget ? (
              <button
                type="button"
                onClick={() => { setAdjustValue(''); setShowAdjustModal(true) }}
                className="mt-2 rounded-lg bg-[#1E6FD9] px-3 py-2 font-body text-xs font-semibold text-white hover:bg-[#2C8BE6]"
              >
                Definir presupuesto inicial
              </button>
            ) : (
              <p className="mt-2 font-body text-xs text-[#92400E]">
                Solo un administrador puede configurarlo.
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-4 py-3 font-body text-sm text-[#C03535]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <div>
            <h3 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Distribucion del gasto</h3>
            <div className="mb-5 rounded-2xl border border-[#DDD6FE] bg-gradient-to-br from-[#F6F2FF] via-[#F5F9FF] to-[#EEF4FF] p-3 sm:p-4">
              <div className="grid gap-3 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="h-80 rounded-2xl border border-white/70 bg-white/35 backdrop-blur-[1px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartVisibleData.length > 0 ? chartVisibleData : [{ name: 'Sin gastos', value: 1, fill: '#D9E2F1' }]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={78}
                        outerRadius={118}
                        paddingAngle={chartVisibleData.length > 1 ? 2 : 0}
                        labelLine={false}
                      >
                        {(chartVisibleData.length > 0 ? chartVisibleData : [{ categoria: 'otro' as const, fill: '#D9E2F1' }]).map((item) => (
                          <Cell key={item.categoria} fill={item.fill} stroke="#F8FAFC" strokeWidth={2.5} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, _name, entry) => {
                          const numeric = Number(value ?? 0)
                          if (chartVisibleData.length === 0) return ['Sin gastos registrados', 'Estado']
                          const pctValue = chartTotal > 0 ? (numeric / chartTotal) * 100 : 0
                          return [`${formatMXN(numeric)} (${pctValue.toFixed(1)}%)`, entry.payload?.name ?? 'Categoria']
                        }}
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #D9CCFF', borderRadius: '10px' }}
                      />
                      <text x="50%" y="46%" textAnchor="middle" className="fill-[#6B7FA6] text-[11px] font-semibold">
                        Total comprometido
                      </text>
                      <text x="50%" y="54%" textAnchor="middle" className="fill-[#1E0A4E] text-[15px] font-bold">
                        {formatMXN(chartTotal)}
                      </text>
                      {chartVisibleData.length === 0 && (
                        <text x="50%" y="61%" textAnchor="middle" className="fill-[#8EA0BF] text-[10px] font-medium">
                          Aun no hay gastos
                        </text>
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div className="rounded-xl border border-[#DCE5F5] bg-white px-3 py-2.5">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-[#6B7FA6]">Categoria principal</p>
                      <p className="mt-1 font-body text-sm font-bold text-[#1E0A4E]">{topCategory?.name ?? 'Sin datos'}</p>
                    </div>
                    <div className="rounded-xl border border-[#DCE5F5] bg-white px-3 py-2.5">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-[#6B7FA6]">Categorias activas</p>
                      <p className="mt-1 font-body text-sm font-bold text-[#1E0A4E]">{activeCategoriesCount}</p>
                    </div>
                    <div className="rounded-xl border border-[#DCE5F5] bg-white px-3 py-2.5">
                      <p className="font-body text-[11px] font-semibold uppercase tracking-wide text-[#6B7FA6]">Promedio activo</p>
                      <p className="mt-1 font-body text-sm font-bold text-[#1E0A4E]">{formatMXN(averagePerCategory)}</p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    {[...chartVisibleData, ...chartZeroData].map((item) => {
                      const pctValue = chartTotal > 0 ? (item.value / chartTotal) * 100 : 0
                      const isZero = item.value <= 0
                      return (
                        <div
                          key={item.categoria}
                          className={[
                            'rounded-xl border px-3 py-2 shadow-[0_1px_0_rgba(30,10,78,0.04)]',
                            isZero ? 'border-[#E6ECF7] bg-[#F8FAFD]' : 'border-[#DCE5F5] bg-white/95',
                          ].join(' ')}
                        >
                          <div className="mb-1.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full ring-2 ring-white"
                                style={{ backgroundColor: isZero ? '#C6D3EA' : item.fill }}
                              />
                              <span className={['font-body text-xs font-semibold', isZero ? 'text-[#7A8799]' : 'text-[#2E3A59]'].join(' ')}>
                                {item.name}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className={['font-body text-xs font-semibold', isZero ? 'text-[#7A8799]' : 'text-[#1E0A4E]'].join(' ')}>
                                {formatMXN(item.value)}
                              </p>
                              <p className="font-body text-[11px] text-[#6B7FA6]">{pctValue.toFixed(1)}%</p>
                            </div>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-[#E8EEF9]">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pctValue}%`, backgroundColor: isZero ? '#C6D3EA' : item.fill }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

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

        <div>
          <h2 className="mb-3 font-heading text-sm font-bold text-[#3D4A5C]">Gastos del grupo</h2>
          <div className="flex flex-col gap-2">
            {expenses.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-white px-4 py-8 text-center font-body text-sm text-[#7A8799]">
                Aun no hay gastos registrados para este viaje.
              </div>
            ) : [...expenses].reverse().map((expense) => {
              const linkedEntities = getLinksForExpense(expense.id)
              const linkedActivities = linkedEntities.filter((entity) => entity.type === 'activity' || entity.type === 'subgroup_activity')
              const linkedDocuments = linkedEntities.filter((entity) => entity.type === 'document')

              return (
                <div key={expense.id} className="flex items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
                  <div
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${categoryColor(expense.categoria)}18`, color: categoryColor(expense.categoria) }}
                  >
                    <CategoryIcon categoria={expense.categoria} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm font-semibold text-[#3D4A5C]">{expense.titulo}</p>
                    <p className="font-body text-xs text-[#7A8799]">Pago {expense.pagadoPor} - {expense.fecha}</p>
                    {(linkedActivities.length > 0 || linkedDocuments.length > 0) ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {linkedActivities.map((entity) => (
                          <button
                            key={entityKey(entity)}
                            type="button"
                            onClick={() => {
                              if (entity.type === 'subgroup_activity') onOpenSubgroups?.()
                              else onOpenItinerary?.()
                            }}
                            className="max-w-full rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#1E6FD9] hover:bg-[#E2EDFF]"
                            title={entity.label}
                          >
                            {entity.type === 'subgroup_activity' ? 'Subgrupo' : 'Actividad'}:{' '}
                            <span className="font-medium">{entity.label}</span>
                          </button>
                        ))}
                        {linkedDocuments.map((entity) => (
                          <button
                            key={entityKey(entity)}
                            type="button"
                            onClick={onOpenVault}
                            className="max-w-full rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#5B35B1] hover:bg-[#ECE4FF]"
                            title={entity.label}
                          >
                            Documento: <span className="font-medium">{entity.label}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 font-body text-xs text-[#7A8799]">
                        Aun no hay asociaciones confirmadas.
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-heading text-sm font-bold text-[#3D4A5C]">{formatMXN(expense.monto)}</span>
                  {canModifyExpenses && (
                    <button
                      onClick={() => openEdit(expense)}
                      aria-label="Editar gasto"
                      className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#F4F6F8] hover:text-[#1E6FD9]"
                    >
                      Editar/asociar
                    </button>
                  )}
                  {canModifyExpenses && (
                    <button
                      onClick={() => setExpenseToDelete(expense)}
                      aria-label="Eliminar gasto"
                      className="shrink-0 rounded-lg p-1.5 text-[#7A8799] transition-colors hover:bg-[#FEF2F2] hover:text-[#EF4444]"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <RegisterExpenseModal
        open={showModal && !isReadOnly}
        members={members}
        editingExpense={editingExpense}
        activityOptions={[...linkOptions.activities, ...linkOptions.subgroupActivities]}
        documentOptions={linkOptions.documents}
        totalBudget={totalBudget}
        comprometido={comprometido}
        isSaving={isSaving}
        onClose={() => { if (!isSaving) { setShowModal(false); setEditingExpense(null) } }}
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

      {expenseToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(13,8,32,0.75)' }}
          onClick={() => !isSaving && setExpenseToDelete(null)}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 font-heading text-lg font-bold text-[#1E0A4E]">Eliminar gasto</h2>
            <p className="mb-4 font-body text-sm text-[#475569]">
              ¿Seguro que quieres eliminar{' '}
              <span className="font-semibold text-[#1E0A4E]">"{expenseToDelete.titulo}"</span>{' '}
              por <span className="font-semibold text-[#1E0A4E]">{formatMXN(expenseToDelete.monto)}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setExpenseToDelete(null)}
                disabled={isSaving}
                className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 font-body text-sm font-semibold text-[#7A8799] transition-colors hover:border-[#3D4A5C] hover:text-[#3D4A5C] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={() => void handleDelete(expenseToDelete.id)}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-[#C03535] py-3 font-body text-sm font-semibold text-white transition-colors hover:bg-[#D94848] disabled:opacity-60"
              >
                {isSaving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

