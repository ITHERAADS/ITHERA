import { useEffect, useMemo, useState } from 'react'
import type { Dispatch, FC, ReactNode, SetStateAction } from 'react'
import { useAuth } from '../../context/useAuth'
import { budgetService, type BudgetCategory, type BudgetSplitType } from '../../services/budget'
import {
  documentsService,
  type DocumentMetadataInput,
  type TripDocument,
  type TripDocumentCategory,
} from '../../services/documents'
import {
  contextLinksService,
  type ContextEntityRef,
  type ContextEntitySummary,
  type ContextLink,
  type ContextLinkOptions,
} from '../../services/context-links'
import { ExpenseDraftForm } from '../budget/ExpenseDraftForm'

const ACCEPTED_FILES = '.pdf,.png,.jpg,.jpeg,.webp'

const CATEGORY_OPTIONS: Array<{ value: TripDocumentCategory; label: string }> = [
  { value: 'vuelo', label: 'Vuelos' },
  { value: 'hospedaje', label: 'Hospedajes' },
  { value: 'gasto', label: 'Gastos' },
  { value: 'actividad', label: 'Actividades' },
  { value: 'otro', label: 'Otros' },
]

const categoryLabel = (value: string): string =>
  CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? 'Otros'

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (value?: string): string => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('es-MX')
  } catch {
    return value
  }
}

interface Props {
  groupId: string | null
  members?: Array<{
    usuario_id?: string | number
    id?: string | number
    nombre?: string
    email?: string
  }>
  currentUser?: {
    id_usuario?: string | number
    nombre?: string | null
    email?: string | null
  } | null
  onOpenBudget?: () => void
  onOpenItinerary?: () => void
  onOpenSubgroups?: () => void
  isReadOnly?: boolean
}

type VaultActionModalState =
  | { target: 'upload'; mode: 'expense' | 'activity' }
  | { target: 'document'; docId: string; mode: 'expense' | 'activity' }
  | null

type VaultActionTab = 'associate' | 'create'

const EMPTY_LINK_OPTIONS: ContextLinkOptions = {
  expenses: [],
  documents: [],
  activities: [],
  subgroupActivities: [],
}

const entityKey = (entity: ContextEntityRef): string => `${entity.type}:${entity.id}`

const parseEntityKey = (value: string): ContextEntityRef => {
  const [type, ...idParts] = value.split(':')
  return {
    type: type as ContextEntityRef['type'],
    id: idParts.join(':'),
  }
}

const otherEntityForDocument = (link: ContextLink, documentId: string): ContextEntitySummary | null => {
  if (link.entityA.type === 'document' && link.entityA.id === documentId) return link.entityB
  if (link.entityB.type === 'document' && link.entityB.id === documentId) return link.entityA
  return null
}

const isVaultContextType = (type: ContextEntityRef['type']): boolean =>
  type === 'expense' || type === 'activity' || type === 'subgroup_activity'

const todayValue = () => new Date().toISOString().split('T')[0]

function ActionModal({
  open,
  title,
  subtitle,
  confirmLabel,
  confirmDisabled = false,
  panelClassName = 'max-w-lg',
  onClose,
  onConfirm,
  children,
}: {
  open: boolean
  title: string
  subtitle: string
  confirmLabel: string
  confirmDisabled?: boolean
  panelClassName?: string
  onClose: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0820]/70 px-4" onClick={onClose}>
      <div
        className={`max-h-[84vh] w-full overflow-y-auto rounded-2xl bg-white shadow-xl ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#E2E8F0] px-5 py-4">
          <h3 className="font-heading text-lg font-bold text-[#1E0A4E]">{title}</h3>
          <p className="mt-1 font-body text-sm text-[#64748B]">{subtitle}</p>
        </div>
        <div className="px-5 py-4">{children}</div>
        <div className="flex justify-end gap-3 border-t border-[#E2E8F0] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[#D7DEEA] px-4 py-2.5 font-body text-sm font-semibold text-[#3D4A5C]"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            className="rounded-xl bg-[#1E6FD9] px-4 py-2.5 font-body text-sm font-semibold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export const DocumentVaultPanel: FC<Props> = ({
  groupId,
  members = [],
  currentUser = null,
  onOpenBudget,
  onOpenItinerary,
  onOpenSubgroups,
  isReadOnly = false,
}) => {
  const { accessToken } = useAuth()
  const [items, setItems] = useState<TripDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<TripDocumentCategory>('otro')
  const [activeFilter, setActiveFilter] = useState<'todos' | TripDocumentCategory>('todos')
  const [notes, setNotes] = useState('')
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [contextLinks, setContextLinks] = useState<ContextLink[]>([])
  const [linkOptions, setLinkOptions] = useState<ContextLinkOptions>(EMPTY_LINK_OPTIONS)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [selectedActivityKeys, setSelectedActivityKeys] = useState<string[]>([])
  const [editingExpenseIds, setEditingExpenseIds] = useState<string[]>([])
  const [editingActivityKeys, setEditingActivityKeys] = useState<string[]>([])
  const [savingLinksDocId, setSavingLinksDocId] = useState<string | null>(null)
  const [actionModal, setActionModal] = useState<VaultActionModalState>(null)
  const [expenseFilter, setExpenseFilter] = useState('')
  const [draftExpenseDescription, setDraftExpenseDescription] = useState('')
  const [draftExpenseAmount, setDraftExpenseAmount] = useState('')
  const [draftExpenseCategory, setDraftExpenseCategory] = useState<BudgetCategory>('otro')
  const [draftExpenseDate, setDraftExpenseDate] = useState(todayValue())
  const [draftExpensePaidBy, setDraftExpensePaidBy] = useState('')
  const [draftExpenseSplitType, setDraftExpenseSplitType] = useState<BudgetSplitType>('equitativa')
  const [draftExpenseSplitAmounts, setDraftExpenseSplitAmounts] = useState<Record<string, string>>({})
  const [draftExpenseMemberIds, setDraftExpenseMemberIds] = useState<string[]>([])
  const [expenseModalTab, setExpenseModalTab] = useState<VaultActionTab>('associate')

  const memberOptions = useMemo(
    () =>
      members.map((member) => {
        const id = String(member.usuario_id ?? member.id ?? '')
        return {
          id,
          label: member.nombre || member.email || `Usuario ${id}`,
        }
      }).filter((member) => member.id.length > 0),
    [members]
  )
  const memberOptionsSafe = useMemo(() => {
    if (memberOptions.length > 0) return memberOptions
    const fallbackId = currentUser?.id_usuario != null ? String(currentUser.id_usuario) : ''
    if (!fallbackId) return []
    return [{
      id: fallbackId,
      label: currentUser?.nombre || currentUser?.email || `Usuario ${fallbackId}`,
    }]
  }, [currentUser?.email, currentUser?.id_usuario, currentUser?.nombre, memberOptions])

  const defaultExpensePayer = useMemo(() => {
    const currentUserId = currentUser?.id_usuario != null ? String(currentUser.id_usuario) : ''
    if (currentUserId && memberOptionsSafe.some((member) => member.id === currentUserId)) {
      return currentUserId
    }
    return memberOptionsSafe[0]?.id ?? ''
  }, [currentUser?.id_usuario, memberOptionsSafe])

  const filteredItems = useMemo(
    () => (activeFilter === 'todos' ? items : items.filter((item) => item.category === activeFilter)),
    [activeFilter, items]
  )

  useEffect(() => {
    if (!draftExpensePaidBy) setDraftExpensePaidBy(defaultExpensePayer)
    if (draftExpenseMemberIds.length === 0 && memberOptionsSafe.length > 0) {
      setDraftExpenseMemberIds(memberOptionsSafe.map((member) => member.id))
    }
  }, [defaultExpensePayer, draftExpenseMemberIds.length, draftExpensePaidBy, memberOptionsSafe])

  const loadContextLinks = async () => {
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
  }

  const getLinksForDocument = (documentId: string) =>
    contextLinks
      .map((link) => otherEntityForDocument(link, documentId))
      .filter((entity): entity is ContextEntitySummary =>
        entity !== null && isVaultContextType(entity.type)
      )

  const syncDocumentLinks = async (
    documentId: string,
    expenseIds: string[],
    activityKeys: string[],
  ) => {
    if (!groupId || !accessToken) return

    const desiredEntities: ContextEntityRef[] = [
      ...expenseIds.map((id) => ({ type: 'expense' as const, id })),
      ...activityKeys.map(parseEntityKey),
    ]

    const desiredKeys = new Set(desiredEntities.map(entityKey))
    const currentResponse = await contextLinksService.list(groupId, accessToken, {
      type: 'document',
      id: documentId,
    })
    const currentRelevant = currentResponse.links
      .map((link) => ({ link, entity: otherEntityForDocument(link, documentId) }))
      .filter((item): item is { link: ContextLink; entity: ContextEntitySummary } =>
        item.entity !== null && isVaultContextType(item.entity.type)
      )

    await Promise.all([
      ...currentRelevant
        .filter(({ entity }) => !desiredKeys.has(entityKey(entity)))
        .map(({ link }) => contextLinksService.remove(groupId, link.id, accessToken)),
      ...desiredEntities
        .filter((entity) => !currentRelevant.some((item) => entityKey(item.entity) === entityKey(entity)))
        .map((entity) => contextLinksService.create(groupId, {
          source: { type: 'document', id: documentId },
          target: entity,
        }, accessToken)),
    ])
  }

  const resetLinkSelection = () => {
    setSelectedExpenseIds([])
    setSelectedActivityKeys([])
  }

  const resetUploadDraft = () => {
    setUploadFile(null)
    setNotes('')
    resetLinkSelection()
    setActionModal(null)
    setShowUploadModal(false)
  }

  const resetExpenseDraft = () => {
    setExpenseFilter('')
    setDraftExpenseDescription('')
    setDraftExpenseAmount('')
    setDraftExpenseCategory('otro')
    setDraftExpenseDate(todayValue())
    setDraftExpensePaidBy(defaultExpensePayer)
    setDraftExpenseSplitType('equitativa')
    setDraftExpenseSplitAmounts({})
    setDraftExpenseMemberIds(memberOptionsSafe.map((member) => member.id))
  }

  const toggleValue = (value: string, setter: Dispatch<SetStateAction<string[]>>) => {
    setter((prev) => prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value])
  }

  const toggleDraftExpenseMember = (memberId: string) => {
    setDraftExpenseMemberIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
      if (next.length === 0) return prev
      if (!next.includes(draftExpensePaidBy)) setDraftExpensePaidBy(next[0] ?? '')
      return next
    })
  }

  const setDraftExpenseSplitAmount = (memberId: string, value: string) => {
    setDraftExpenseSplitAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }))
  }

  const draftExpenseSplitError = useMemo(() => {
    const totalAmount = parseFloat(draftExpenseAmount) || 0
    if (draftExpenseSplitType !== 'personalizada' || totalAmount <= 0) return null
    const splitSum = memberOptionsSafe
      .filter((member) => draftExpenseMemberIds.includes(member.id))
      .reduce((sum, member) => sum + (parseFloat(draftExpenseSplitAmounts[member.id] ?? '0') || 0), 0)
    return Math.abs(splitSum - totalAmount) > 0.01
      ? 'La division personalizada debe sumar el monto total.'
      : null
  }, [draftExpenseAmount, draftExpenseMemberIds, draftExpenseSplitAmounts, draftExpenseSplitType, memberOptionsSafe])

  const startEditLinks = (item: TripDocument) => {
    const linked = getLinksForDocument(item.id)
    setEditingExpenseIds(linked.filter((entity) => entity.type === 'expense').map((entity) => entity.id))
    setEditingActivityKeys(
      linked
        .filter((entity) => entity.type === 'activity' || entity.type === 'subgroup_activity')
        .map(entityKey)
    )
  }

  const saveEditedLinks = async (documentId: string) => {
    if (isReadOnly) return
    if (!groupId || !accessToken) return
    setSavingLinksDocId(documentId)
    setError(null)
    try {
      await syncDocumentLinks(documentId, editingExpenseIds, editingActivityKeys)
      await loadContextLinks()
      setEditingExpenseIds([])
      setEditingActivityKeys([])
      setActionModal(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron guardar las asociaciones')
    } finally {
      setSavingLinksDocId(null)
    }
  }

  const openDocumentAction = (item: TripDocument, mode: 'expense' | 'activity') => {
    if (isReadOnly) return
    startEditLinks(item)
    resetExpenseDraft()
    setActionModal({ target: 'document', docId: item.id, mode })
  }

  const load = async () => {
    if (!groupId || !accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const [documents] = await Promise.all([
        documentsService.list(groupId, accessToken),
        loadContextLinks(),
      ])
      setItems(documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los documentos')
    } finally {
      setIsLoading(false)
    }
  }


  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, accessToken])

  const handleUpload = async (file: File | null) => {
    if (isReadOnly) return
    if (!file || !groupId || !accessToken) return
    if (!notes.trim()) {
      setError('La nota es obligatoria para subir el documento a la boveda.')
      return
    }
    if ((draftExpenseDescription.trim() || draftExpenseAmount.trim()) && !draftExpenseDescription.trim()) {
      setError('La descripcion del gasto es obligatoria.')
      return
    }
    if ((draftExpenseDescription.trim() || draftExpenseAmount.trim()) && (!Number.isFinite(Number(draftExpenseAmount)) || Number(draftExpenseAmount) <= 0)) {
      setError('El monto del gasto debe ser mayor a 0.')
      return
    }
    if ((draftExpenseDescription.trim() || draftExpenseAmount.trim()) && !draftExpensePaidBy) {
      setError('Selecciona quien pagara el gasto.')
      return
    }
    if ((draftExpenseDescription.trim() || draftExpenseAmount.trim()) && draftExpenseMemberIds.length === 0) {
      setError('Selecciona al menos una persona para el gasto.')
      return
    }
    if ((draftExpenseDescription.trim() || draftExpenseAmount.trim()) && draftExpenseSplitError) {
      setError(draftExpenseSplitError)
      return
    }
    setIsUploading(true)
    setError(null)
    try {
      const metadata: DocumentMetadataInput = {
        linked_entity_type: null,
        linked_entity_id: null,
        person_reference: null,
        person_references: [],
        expense_reason: null,
        expense_amount: null,
        notes: notes || null,
      }

      const created = await documentsService.upload(groupId, file, category, metadata, accessToken)
      const nextExpenseIds = [...selectedExpenseIds]
      const nextActivityKeys = [...selectedActivityKeys]
      if (draftExpenseDescription.trim() && Number(draftExpenseAmount) > 0) {
        const response = await budgetService.createExpense(groupId, {
          paid_by_user_id: draftExpensePaidBy,
          amount: Number(draftExpenseAmount),
          description: draftExpenseDescription.trim(),
          category: draftExpenseCategory,
          split_type: draftExpenseSplitType,
          member_ids: draftExpenseMemberIds,
          split_amounts: draftExpenseSplitType === 'personalizada'
            ? Object.fromEntries(
              draftExpenseMemberIds.map((memberId) => [
                memberId,
                parseFloat(draftExpenseSplitAmounts[memberId] ?? '0') || 0,
              ])
            )
            : undefined,
          expense_date: draftExpenseDate || null,
        }, accessToken)
        const createdExpense = [...response.expenses].sort((a, b) =>
          new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
        )[0]
        if (createdExpense) {
          nextExpenseIds.push(createdExpense.id)
        }
      }
      await syncDocumentLinks(
        created.id,
        Array.from(new Set(nextExpenseIds)),
        Array.from(new Set(nextActivityKeys)),
      )
      await loadContextLinks()
      setItems((prev) => [created, ...prev])
      resetExpenseDraft()
      resetUploadDraft()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (isReadOnly) return
    if (!groupId || !accessToken) return
    setError(null)
    try {
      await documentsService.remove(groupId, docId, accessToken)
      setItems((prev) => prev.filter((item) => item.id !== docId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento')
    }
  }

  const createExpenseForDocument = async (documentId: string) => {
    if (isReadOnly) return
    if (!groupId || !accessToken) return
    const amount = Number(draftExpenseAmount)
    const payerId = currentUser?.id_usuario != null ? String(currentUser.id_usuario) : ''
    const effectivePayerId = draftExpensePaidBy || payerId
    if (!effectivePayerId) {
      setError('No se encontro tu usuario para registrar el gasto.')
      return
    }
    if (!draftExpenseDescription.trim()) {
      setError('La descripcion del gasto es obligatoria.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto del gasto debe ser mayor a 0.')
      return
    }
    if (!draftExpensePaidBy) {
      setError('Selecciona quien pagara el gasto.')
      return
    }
    if (draftExpenseMemberIds.length === 0) {
      setError('Selecciona al menos una persona para el gasto.')
      return
    }
    if (draftExpenseSplitError) {
      setError(draftExpenseSplitError)
      return
    }

    try {
      setError(null)
      const response = await budgetService.createExpense(groupId, {
        paid_by_user_id: effectivePayerId,
        amount,
        description: draftExpenseDescription.trim(),
        category: draftExpenseCategory,
        split_type: draftExpenseSplitType,
        member_ids: draftExpenseMemberIds,
        split_amounts: draftExpenseSplitType === 'personalizada'
          ? Object.fromEntries(
            draftExpenseMemberIds.map((memberId) => [
              memberId,
              parseFloat(draftExpenseSplitAmounts[memberId] ?? '0') || 0,
            ])
          )
          : undefined,
        expense_date: draftExpenseDate || null,
      }, accessToken)
      const createdExpense = [...response.expenses].sort((a, b) =>
        new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
      )[0]
      if (!createdExpense) throw new Error('No se pudo ubicar el gasto creado.')
      await contextLinksService.create(groupId, {
        source: { type: 'document', id: documentId },
        target: { type: 'expense', id: createdExpense.id },
      }, accessToken)
      resetExpenseDraft()
      setActionModal(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el gasto')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface px-6 py-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-heading text-[28px] font-bold text-[#1E0A4E]">Bóveda de documentos</h2>
            <p className="mt-2 font-body text-sm text-[#64748B]">
              Ten a la mano tus boletos, reservas y comprobantes para que el viaje fluya sin estar buscando entre fotos,
              chats o correos. Guarda cada archivo con una nota y, si te sirve, relaciónalo después con un gasto o una actividad.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-[#D7DEEA] bg-[#F8FAFC] px-3 py-1.5 font-body text-xs font-semibold text-[#475569]">
                Archivo obligatorio
              </span>
              <span className="rounded-full border border-[#D7DEEA] bg-[#F8FAFC] px-3 py-1.5 font-body text-xs font-semibold text-[#475569]">
                Nota obligatoria
              </span>
              <span className="rounded-full border border-[#D7DEEA] bg-[#F8FAFC] px-3 py-1.5 font-body text-xs font-semibold text-[#475569]">
                Contexto opcional
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setShowUploadModal(true)
                }}
                disabled={isUploading}
                className="rounded-xl bg-[#1E6FD9] px-4 py-2.5 font-body text-sm font-semibold text-white hover:bg-[#2C8BE6] disabled:opacity-50"
              >
                {isUploading ? 'Subiendo...' : 'Subir documento'}
              </button>
            )}
            <button
              type="button"
              onClick={() => void load()}
              disabled={isLoading}
              className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-body text-sm font-semibold text-[#3D4A5C] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              {isLoading ? 'Cargando...' : 'Refrescar'}
            </button>
          </div>
        </div>

        {isReadOnly && (
          <div className="mt-4 rounded-xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3 font-body text-sm text-[#64748B]">
            Este viaje ya finalizó. La bóveda está en modo lectura: puedes abrir documentos existentes, pero no subir, relacionar ni eliminar archivos.
          </div>
        )}

        {error && (
          <div className="mt-3 rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-3 py-2 font-body text-sm text-[#C03535]">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-base font-bold text-[#1E0A4E]">Documentos del viaje</h3>
            <p className="mt-1 font-body text-sm text-[#7A8799]">
              Filtra por tipo y encuentra rápido lo que necesitas antes de salir o mientras están en ruta.
            </p>
          </div>
          <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 font-body text-xs font-semibold text-[#475569]">
            {filteredItems.length} {filteredItems.length === 1 ? 'documento' : 'documentos'}
          </span>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('todos')}
            className={`rounded-full px-3 py-1.5 font-body text-xs font-semibold ${activeFilter === 'todos' ? 'bg-[#1E6FD9] text-white' : 'bg-[#EEF2FF] text-[#1E0A4E]'}`}
          >
            Todos
          </button>
          {CATEGORY_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setActiveFilter(option.value)}
              className={`rounded-full px-3 py-1.5 font-body text-xs font-semibold ${activeFilter === option.value ? 'bg-[#1E6FD9] text-white' : 'bg-[#EEF2FF] text-[#1E0A4E]'}`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-12 text-center">
            <p className="font-body text-sm font-semibold text-[#1E0A4E]">
              {activeFilter === 'todos' ? 'Todavía no hay documentos guardados.' : 'No hay documentos en esta categoría.'}
            </p>
            <p className="mt-1 font-body text-sm text-[#7A8799]">
              {isReadOnly
                ? 'No hay documentos guardados para consultar en este viaje cerrado.'
                : 'Sube un boleto, una reservación o cualquier comprobante que quieras tener listo durante el viaje.'}
            </p>
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setShowUploadModal(true)
                }}
                className="mt-4 rounded-xl bg-[#1E6FD9] px-4 py-2.5 font-body text-sm font-semibold text-white hover:bg-[#2C8BE6]"
              >
                Subir primer documento
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredItems.map((item) => {
              const linkedEntities = getLinksForDocument(item.id)
              const linkedExpenses = linkedEntities.filter((entity) => entity.type === 'expense')
              const linkedActivities = linkedEntities.filter((entity) => entity.type === 'activity' || entity.type === 'subgroup_activity')

              return (
                <div key={item.id} className="rounded-2xl border border-[#E2E8F0] bg-[#FCFDFE] px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate font-body text-base font-semibold text-[#1E6FD9] hover:underline"
                      >
                        {item.file_name}
                      </a>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="rounded-full border border-[#D7DEEA] bg-white px-2.5 py-1 font-body text-[11px] font-semibold text-[#475569]">
                          {categoryLabel(item.category)}
                        </span>
                        <span className="rounded-full border border-[#D7DEEA] bg-white px-2.5 py-1 font-body text-[11px] font-semibold text-[#475569]">
                          {formatBytes(item.file_size)}
                        </span>
                        <span className="rounded-full border border-[#D7DEEA] bg-white px-2.5 py-1 font-body text-[11px] font-semibold text-[#475569]">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                      {item.metadata?.notes && (
                        <p className="mt-3 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#3D4A5C]">
                          {String(item.metadata.notes)}
                        </p>
                      )}
                      <div className="mt-3">
                        <p className="font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">Contexto asociado</p>
                        {(linkedExpenses.length > 0 || linkedActivities.length > 0) ? (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {linkedExpenses.map((entity) => (
                              <button
                                key={entityKey(entity)}
                                type="button"
                                onClick={onOpenBudget}
                                className="max-w-full rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#1E6FD9] hover:bg-[#E2EDFF]"
                                title={entity.label}
                              >
                                Gasto: <span className="font-medium">{entity.label}</span>
                              </button>
                            ))}
                            {linkedActivities.map((entity) => (
                              <button
                                key={entityKey(entity)}
                                type="button"
                                onClick={() => {
                                  if (entity.type === 'subgroup_activity') onOpenSubgroups?.()
                                  else onOpenItinerary?.()
                                }}
                                className="max-w-full rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-2.5 py-1 font-body text-[11px] font-semibold text-[#5B35B1] hover:bg-[#ECE4FF]"
                                title={entity.label}
                              >
                                {entity.type === 'subgroup_activity' ? 'Subgrupo' : 'Actividad'}:{' '}
                                <span className="font-medium">{entity.label}</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 rounded-lg bg-[#F8FAFC] px-2.5 py-1.5 font-body text-xs text-[#7A8799]">
                            Sin gasto ni actividad asociada.
                          </p>
                        )}
                      </div>
                    </div>

                    {!isReadOnly && (
                    <div className="flex shrink-0 flex-col gap-2 lg:w-[170px]">
                      <button
                        type="button"
                        onClick={() => {
                          setExpenseModalTab('associate')
                          openDocumentAction(item, 'expense')
                        }}
                        className="rounded-xl border border-[#D7DEEA] px-3 py-2 font-body text-xs font-semibold text-[#3D4A5C] hover:bg-[#F8FAFC]"
                      >
                        Relacionar gasto
                      </button>
                      <button
                        type="button"
                        onClick={() => openDocumentAction(item, 'activity')}
                        className="rounded-xl border border-[#D7DEEA] px-3 py-2 font-body text-xs font-semibold text-[#5B35B1] hover:bg-[#F3EEFF]"
                      >
                        Relacionar actividad
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        className="rounded-xl border border-[#FBC7C7] px-3 py-2 font-body text-xs font-semibold text-[#C03535] hover:bg-[#FFF5F5]"
                      >
                        Eliminar
                      </button>
                    </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ActionModal
        open={showUploadModal && !isReadOnly}
        title="Subir documento"
        subtitle="Guarda un archivo del viaje con una nota clara. Si quieres, después lo relacionas con un gasto o una actividad existente."
        confirmLabel={isUploading ? 'Subiendo...' : 'Subir a boveda'}
        confirmDisabled={isUploading || !uploadFile || !notes.trim()}
        panelClassName="max-w-xl"
        onClose={() => {
          if (isUploading) return
          resetUploadDraft()
        }}
        onConfirm={() => void handleUpload(uploadFile)}
      >
        <div className="grid gap-4">
          <div className="rounded-2xl border border-dashed border-[#C9D8F5] bg-[#F8FBFF] px-4 py-4">
            <label className="mb-2 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
              Archivo
            </label>
            <input
              type="file"
              accept={ACCEPTED_FILES}
              onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm text-[#3D4A5C] outline-none focus:border-[#1E6FD9]"
            />
            <p className="mt-2 font-body text-xs text-[#7A8799]">
              PDF, imagen o comprobante digital.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="max-w-[220px]">
              <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
                Categoría
              </label>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as TripDocumentCategory)}
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#1E6FD9]"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
                Nota
              </label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Ej. Boleto de ferry, reservación del hotel o recibo de la comida del primer día."
                rows={4}
                className="w-full resize-none rounded-xl border border-[#D7DEEA] bg-white px-3 py-3 font-body text-sm outline-none focus:border-[#1E6FD9]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-body text-sm font-semibold text-[#1E0A4E]">Contexto opcional</p>
                <p className="mt-1 font-body text-xs text-[#64748B]">
                  Relaciona este documento con un gasto o una actividad ahora, o súbelo primero y hazlo después.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseModalTab('associate')
                    setActionModal({ target: 'upload', mode: 'expense' })
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2 font-body text-xs font-semibold text-[#1E6FD9]"
                >
                  Relacionar gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActionModal({ target: 'upload', mode: 'activity' })
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2 font-body text-xs font-semibold text-[#7A4FD6]"
                >
                  Relacionar actividad
                </button>
              </div>
            </div>

            {(selectedExpenseIds.length > 0 || selectedActivityKeys.length > 0) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedExpenseIds.map((expenseId) => {
                  const expense = linkOptions.expenses.find((item) => item.id === expenseId)
                  if (!expense) return null
                  return (
                    <span key={expenseId} className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 font-body text-xs font-semibold text-[#1E6FD9]">
                      Gasto: {expense.label}
                    </span>
                  )
                })}
                {selectedActivityKeys.map((activityKey) => {
                  const activity = [...linkOptions.activities, ...linkOptions.subgroupActivities].find((item) => entityKey(item) === activityKey)
                  if (!activity) return null
                  return (
                    <span key={activityKey} className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]">
                      {activity.type === 'subgroup_activity' ? 'Subgrupo' : 'Actividad'}: {activity.label}
                    </span>
                  )
                })}
              </div>
            ) : (
              <p className="mt-3 font-body text-xs text-[#7A8799]">
                Sin relaciones seleccionadas por ahora.
              </p>
            )}
          </div>
        </div>
      </ActionModal>

      <ActionModal
        open={actionModal?.mode === 'expense' && !isReadOnly}
        title="Relacionar gasto"
        subtitle="Selecciona un gasto existente o crea uno nuevo para dejarlo asociado al documento."
        confirmLabel={
          expenseModalTab === 'associate'
            ? (actionModal?.target === 'document' && savingLinksDocId ? 'Guardando...' : 'Guardar seleccion')
            : (actionModal?.target === 'document' ? 'Crear y asociar' : 'Guardar gasto')
        }
        confirmDisabled={actionModal?.target === 'document' && savingLinksDocId != null}
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if (expenseModalTab === 'associate') {
            if (actionModal?.target === 'document') void saveEditedLinks(actionModal.docId)
            else setActionModal(null)
            return
          }
          if (actionModal?.target === 'document') void createExpenseForDocument(actionModal.docId)
          else setActionModal(null)
        }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setExpenseModalTab('associate')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${expenseModalTab === 'associate' ? 'bg-[#1E6FD9] text-white' : 'text-[#475569]'}`}
          >
            Asociar
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalTab('create')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${expenseModalTab === 'create' ? 'bg-[#1E6FD9] text-white' : 'text-[#475569]'}`}
          >
            Crear
          </button>
        </div>
        {expenseModalTab === 'associate' ? (
          <div className="space-y-3">
            <input
              value={expenseFilter}
              onChange={(event) => setExpenseFilter(event.target.value)}
              placeholder="Filtrar gastos"
              className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#1E6FD9]"
            />
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {linkOptions.expenses
                .filter((expense) => {
                  const filter = expenseFilter.trim().toLowerCase()
                  if (!filter) return true
                  return `${expense.label} ${expense.subtitle ?? ''}`.toLowerCase().includes(filter)
                })
                .map((expense) => {
              const selected =
                actionModal?.target === 'document'
                  ? editingExpenseIds.includes(expense.id)
                  : selectedExpenseIds.includes(expense.id)
              return (
                <button
                  key={expense.id}
                  type="button"
                  onClick={() =>
                    actionModal?.target === 'document'
                      ? toggleValue(expense.id, setEditingExpenseIds)
                      : toggleValue(expense.id, setSelectedExpenseIds)
                  }
                  className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white' : 'border-[#D7DEEA] bg-white text-[#3D4A5C]'}`}
                >
                  <span className="inline-block max-w-[220px] truncate align-bottom">{expense.label}</span>
                </button>
              )
                })}
            </div>
          </div>
        ) : (
          <ExpenseDraftForm
            amount={draftExpenseAmount}
            description={draftExpenseDescription}
            date={draftExpenseDate}
            category={draftExpenseCategory}
            paidBy={draftExpensePaidBy}
            splitType={draftExpenseSplitType}
            splitAmounts={draftExpenseSplitAmounts}
            selectedMemberIds={draftExpenseMemberIds}
            members={memberOptionsSafe}
            onAmountChange={setDraftExpenseAmount}
            onDescriptionChange={setDraftExpenseDescription}
            onDateChange={setDraftExpenseDate}
            onCategoryChange={setDraftExpenseCategory}
            onPaidByChange={setDraftExpensePaidBy}
            onSplitTypeChange={setDraftExpenseSplitType}
            onSplitAmountChange={setDraftExpenseSplitAmount}
            onToggleMember={toggleDraftExpenseMember}
          />
        )}
      </ActionModal>

      <ActionModal
        open={actionModal?.mode === 'activity' && !isReadOnly}
        title="Relacionar actividad"
        subtitle="Selecciona una actividad ya existente del viaje para dejarla asociada al documento."
        confirmLabel={actionModal?.target === 'document' && savingLinksDocId ? 'Guardando...' : 'Guardar seleccion'}
        confirmDisabled={actionModal?.target === 'document' && savingLinksDocId != null}
        onClose={() => setActionModal(null)}
        onConfirm={() => {
          if (actionModal?.target === 'document') void saveEditedLinks(actionModal.docId)
          else setActionModal(null)
        }}
      >
        <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
          {[...linkOptions.activities, ...linkOptions.subgroupActivities].map((activity) => {
            const key = entityKey(activity)
            const selected =
              actionModal?.target === 'document'
                ? editingActivityKeys.includes(key)
                : selectedActivityKeys.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() =>
                  actionModal?.target === 'document'
                    ? toggleValue(key, setEditingActivityKeys)
                    : toggleValue(key, setSelectedActivityKeys)
                }
                className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? 'border-[#7A4FD6] bg-[#7A4FD6] text-white' : 'border-[#D7DEEA] bg-white text-[#3D4A5C]'}`}
              >
                <span className="mr-1 text-[10px] opacity-75">
                  {activity.type === 'subgroup_activity' ? 'Subgrupo' : 'Itinerario'}
                </span>
                <span className="inline-block max-w-[190px] truncate align-bottom">{activity.label}</span>
              </button>
            )
          })}
        </div>
      </ActionModal>
    </div>
  )
}
