import { useEffect, useState, type ReactNode } from 'react'
import type { FC } from 'react'
import type { Expense } from './BudgetDashboard'
import type { BudgetMember } from '../../services/budget'
import type { ContextEntityRef, ContextEntitySummary } from '../../services/context-links'
import type { TripDocumentCategory } from '../../services/documents'

interface Props {
  open: boolean
  members: BudgetMember[]
  activityOptions?: ContextEntitySummary[]
  documentOptions?: ContextEntitySummary[]
  editingExpense?: Expense | null
  totalBudget?: number
  comprometido?: number
  onClose: () => void
  onSave: (expense: Expense) => void
}

type ExpenseContextModalMode = 'activity' | 'document' | null

const CATEGORIES: { value: Expense['categoria']; label: string }[] = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'actividad', label: 'Actividad' },
  { value: 'comida', label: 'Comida' },
  { value: 'otro', label: 'Otro' },
]

const entityKey = (entity: ContextEntityRef): string => `${entity.type}:${entity.id}`

const parseEntityKey = (value: string): ContextEntityRef => {
  const [type, ...idParts] = value.split(':')
  return {
    type: type as ContextEntityRef['type'],
    id: idParts.join(':'),
  }
}

const documentCategoryLabels: Record<TripDocumentCategory, string> = {
  vuelo: 'Vuelo',
  hospedaje: 'Hospedaje',
  gasto: 'Gasto',
  actividad: 'Actividad',
  otro: 'Otro',
}

function ActionModal({
  open,
  title,
  subtitle,
  confirmLabel,
  confirmDisabled = false,
  onClose,
  onConfirm,
  children,
}: {
  open: boolean
  title: string
  subtitle: string
  confirmLabel: string
  confirmDisabled?: boolean
  onClose: () => void
  onConfirm: () => void
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0820]/70 px-4" onClick={onClose}>
      <div
        className="max-h-[84vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
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

export const RegisterExpenseModal: FC<Props> = ({
  open,
  members,
  activityOptions = [],
  documentOptions = [],
  editingExpense,
  totalBudget = 0,
  comprometido = 0,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [category, setCategory] = useState<Expense['categoria']>('transporte')
  const [paidBy, setPaidBy] = useState(members[0]?.usuario_id ?? '')
  const [splitType, setSplitType] = useState<Expense['splitType']>('equitativa')
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({})
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [selectedActivityKeys, setSelectedActivityKeys] = useState<string[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [draftDocumentFile, setDraftDocumentFile] = useState<File | null>(null)
  const [draftDocumentCategory, setDraftDocumentCategory] = useState<TripDocumentCategory>('gasto')
  const [draftDocumentNotes, setDraftDocumentNotes] = useState('')
  const [activeContextModal, setActiveContextModal] = useState<ExpenseContextModalMode>(null)
  const [activityFilter, setActivityFilter] = useState('')
  const [documentModalTab, setDocumentModalTab] = useState<'associate' | 'create'>('associate')

  useEffect(() => {
    if (!open) return
    if (editingExpense) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAmount(String(editingExpense.monto))
      setDescription(editingExpense.titulo)
      setDate(editingExpense.fecha)
      setCategory(editingExpense.categoria)
      setPaidBy(editingExpense.pagadoPorId)
      setSplitType(editingExpense.splitType ?? 'equitativa')
      setSelectedMemberIds(
        editingExpense.participantIds?.length
          ? editingExpense.participantIds
          : members.map((member) => member.usuario_id)
      )
      setSplitAmounts(
        Object.fromEntries(
          Object.entries(editingExpense.splitAmounts ?? {}).map(([k, v]) => [k, String(v)])
        )
      )
      setSelectedActivityKeys((editingExpense.linkedActivities ?? []).map(entityKey))
      setSelectedDocumentIds(editingExpense.linkedDocuments ?? [])
      setDraftDocumentFile(editingExpense.draftDocument?.file ?? null)
      setDraftDocumentCategory(editingExpense.draftDocument?.category ?? 'gasto')
      setDraftDocumentNotes(editingExpense.draftDocument?.notes ?? '')
      setActivityFilter('')
    } else {
      setAmount('')
      setDescription('')
      setDate(new Date().toISOString().split('T')[0])
      setCategory('transporte')
      setPaidBy(members[0]?.usuario_id ?? '')
      setSplitType('equitativa')
      setSelectedMemberIds(members.map((member) => member.usuario_id))
      setSplitAmounts({})
      setSelectedActivityKeys([])
      setSelectedDocumentIds([])
      setDraftDocumentFile(null)
      setDraftDocumentCategory('gasto')
      setDraftDocumentNotes('')
      setActivityFilter('')
    }
  }, [open, editingExpense]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null

  const totalAmount = parseFloat(amount) || 0
  const splitSum =
    splitType === 'personalizada'
      ? members
        .filter((member) => selectedMemberIds.includes(member.usuario_id))
        .reduce((sum, m) => sum + (parseFloat(splitAmounts[m.usuario_id] ?? '0') || 0), 0)
      : totalAmount
  const splitError =
    splitType === 'personalizada' && totalAmount > 0 && Math.abs(splitSum - totalAmount) > 0.01
      ? `La suma de los montos ($${Math.round(splitSum)}) no coincide con el total ($${Math.round(totalAmount)})`
      : null

  const editingPreviousAmount = editingExpense ? Number(editingExpense.monto) : 0
  const nextCommitted = comprometido - editingPreviousAmount + totalAmount
  const budgetError =
    totalBudget > 0 && nextCommitted - totalBudget > 0.01
      ? 'Este gasto excede el presupuesto total del viaje. Ajusta el presupuesto o reduce el monto.'
      : null

  const isValid = totalAmount > 0 && description.trim().length > 0 && selectedMemberIds.length > 0 && splitError === null && budgetError === null

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
      if (next.length === 0) return prev
      if (!next.includes(paidBy)) setPaidBy(next[0] ?? '')
      return next
    })
  }

  const toggleActivity = (key: string) => {
    setSelectedActivityKeys((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  const toggleDocument = (documentId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(documentId) ? prev.filter((item) => item !== documentId) : [...prev, documentId]
    )
  }

  const confirmDraftDocument = () => {
    if (!draftDocumentFile) return
    if (!draftDocumentNotes.trim()) return
    setActiveContextModal(null)
  }

  const handleSave = () => {
    if (!isValid) return
    if (draftDocumentFile && !draftDocumentNotes.trim()) return

    const parsedSplitAmounts: Record<string, number> | undefined =
      splitType === 'personalizada'
        ? Object.fromEntries(
          members
            .filter((member) => selectedMemberIds.includes(member.usuario_id))
            .map((m) => [m.usuario_id, parseFloat(splitAmounts[m.usuario_id] ?? '0') || 0])
        )
        : undefined

    const paidByMember = members.find((member) => member.usuario_id === paidBy)
    const expense: Expense = {
      id: editingExpense ? editingExpense.id : crypto.randomUUID(),
      titulo: description.trim(),
      categoria: category,
      monto: totalAmount,
      pagadoPor: paidByMember?.nombre ?? paidBy,
      pagadoPorId: paidBy,
      splitType,
      fecha: date || new Date().toISOString().split('T')[0],
      participantIds: selectedMemberIds,
      linkedActivities: selectedActivityKeys.map(parseEntityKey),
      linkedDocuments: selectedDocumentIds,
      draftDocument: draftDocumentFile ? {
        file: draftDocumentFile,
        category: draftDocumentCategory,
        notes: draftDocumentNotes.trim(),
      } : null,
      ...(parsedSplitAmounts !== undefined && { splitAmounts: parsedSplitAmounts }),
    }

    if (editingExpense) {
      console.log('Gasto editado:', expense)
    } else {
      console.log('Gasto registrado:', expense)
    }

    onSave(expense)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(13,8,32,0.75)' }}
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-t-3xl bg-white max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — siempre visible */}
        <div className="shrink-0 px-6 pt-6">
          <div className="mx-auto mb-5 h-1 w-12 rounded-full bg-[#E2E8F0]" />

          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-lg font-bold text-[#1E0A4E]">
                {editingExpense ? 'Editar gasto' : 'Registrar gasto'}
              </h2>
              {editingExpense && (
                <span className="rounded-full bg-[#7A4FD6]/10 px-2.5 py-0.5 font-body text-xs font-semibold text-[#7A4FD6]">
                  Editando
                </span>
              )}
            </div>
            <button onClick={onClose} className="text-[#7A8799] transition-colors hover:text-[#3D4A5C]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo scrolleable */}
        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex flex-col gap-4 pb-2">
            {budgetError && (
              <div className="rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-4 py-3 font-body text-sm text-[#C03535]">
                {budgetError}
              </div>
            )}

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Monto</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3 pl-7 pr-4 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ej. Vuelos, Hotel, Tour..."
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              />
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Expense['categoria'])}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">¿Quién pagó?</label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
              >
                {members.filter((member) => selectedMemberIds.includes(member.usuario_id)).map((m) => (
                  <option key={m.usuario_id} value={m.usuario_id}>{m.nombre || m.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">Participantes</label>
              <div className="flex flex-wrap gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-3 py-3">
                {members.map((member) => {
                  const selected = selectedMemberIds.includes(member.usuario_id)
                  return (
                    <button
                      key={member.usuario_id}
                      type="button"
                      onClick={() => toggleMember(member.usuario_id)}
                      className={[
                        'rounded-full border px-3 py-1.5 font-body text-xs font-semibold transition-colors',
                        selected
                          ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                          : 'border-[#E2E8F0] bg-white text-[#7A8799]',
                      ].join(' ')}
                    >
                      {member.nombre || member.email}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block font-body text-sm font-medium text-[#3D4A5C]">¿Cómo dividir la cuenta?</label>
              <div className="flex gap-2">
                {(['equitativa', 'personalizada'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    className={[
                      'flex-1 rounded-xl border py-2.5 font-body text-sm font-medium transition-colors',
                      splitType === type
                        ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                        : 'border-[#E2E8F0] bg-[#F4F6F8] text-[#7A8799] hover:border-[#1E6FD9]/50',
                    ].join(' ')}
                  >
                    {type === 'equitativa' ? 'Equitativa' : 'Personalizada'}
                  </button>
                ))}
              </div>
            </div>

            {splitType === 'personalizada' && (
              <div className="flex flex-col gap-2 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] px-4 py-3">
                <p className="font-body text-xs font-medium text-[#7A8799]">Monto por persona</p>
                {members.filter((member) => selectedMemberIds.includes(member.usuario_id)).map((member) => (
                  <div key={member.usuario_id} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 font-body text-sm text-[#3D4A5C]">{member.nombre || member.email}</span>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-sm text-[#7A8799]">$</span>
                      <input
                        type="number"
                        min="0"
                        value={splitAmounts[member.usuario_id] ?? ''}
                        onChange={(e) => setSplitAmounts((prev) => ({ ...prev, [member.usuario_id]: e.target.value }))}
                        placeholder="0"
                        className="w-full rounded-lg border border-[#E2E8F0] bg-white py-2 pl-6 pr-3 font-body text-sm text-[#3D4A5C] outline-none transition-colors focus:border-[#1E6FD9]"
                      />
                    </div>
                  </div>
                ))}
                {splitError && (
                  <p className="mt-1 font-body text-xs text-[#EF4444]">{splitError}</p>
                )}
              </div>
            )}

            {(activityOptions.length > 0 || documentOptions.length > 0) && (
              <div className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
                <p className="font-body text-sm font-semibold text-[#3D4A5C]">Vincular con el viaje</p>
                <p className="mt-1 font-body text-xs text-[#7A8799]">
                  Relaciona esta salida con acciones separadas para que el formulario principal no se vuelva confuso.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setActiveContextModal('activity')}
                    className="rounded-xl border border-[#D7DEEA] bg-[#F8FAFC] px-3 py-2.5 text-left font-body text-sm font-semibold text-[#1E6FD9]"
                  >
                    Relacionar actividad
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentModalTab('associate')
                      setActiveContextModal('document')
                    }}
                    className="rounded-xl border border-[#D7DEEA] bg-[#F8FAFC] px-3 py-2.5 text-left font-body text-sm font-semibold text-[#7A4FD6]"
                  >
                    Gestionar documento
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedActivityKeys.map((key) => {
                    const activity = activityOptions.find((item) => entityKey(item) === key)
                    if (!activity) return null
                    return (
                      <span key={key} className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 font-body text-xs font-semibold text-[#1E6FD9]">
                        Actividad: {activity.label}
                      </span>
                    )
                  })}
                  {selectedDocumentIds.map((documentId) => {
                    const document = documentOptions.find((item) => item.id === documentId)
                    if (!document) return null
                    return (
                      <span key={documentId} className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]">
                        Documento: {document.label}
                      </span>
                    )
                  })}
                  {draftDocumentFile && (
                    <span className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]">
                      Documento por subir: {draftDocumentFile.name}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer — siempre visible */}
        <div className="shrink-0 px-6 pb-8 pt-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#E2E8F0] bg-[#F4F6F8] py-3.5 font-body text-sm font-semibold text-[#7A8799] transition-colors hover:border-[#3D4A5C] hover:text-[#3D4A5C]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 rounded-xl bg-[#1E6FD9] py-3.5 font-body text-sm font-semibold text-white transition-colors hover:bg-[#2C8BE6] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {editingExpense ? 'Guardar cambios' : 'Guardar gasto'}
            </button>
          </div>
        </div>
      </div>

      <ActionModal
        open={activeContextModal === 'activity'}
        title="Relacionar actividad"
        subtitle="Selecciona una actividad ya existente del viaje para dejarla asociada al gasto."
        confirmLabel="Guardar seleccion"
        onClose={() => setActiveContextModal(null)}
        onConfirm={() => setActiveContextModal(null)}
      >
        {activityOptions.length === 0 ? (
          <p className="font-body text-sm text-[#64748B]">No hay actividades disponibles para asociar.</p>
        ) : (
          <div className="space-y-3">
            <input
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
              placeholder="Filtrar actividades"
              className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#1E6FD9]"
            />
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
              {activityOptions
                .filter((activity) => {
                  const filter = activityFilter.trim().toLowerCase()
                  if (!filter) return true
                  return `${activity.label} ${activity.subtitle ?? ''}`.toLowerCase().includes(filter)
                })
                .map((activity) => {
                  const key = entityKey(activity)
                  const selected = selectedActivityKeys.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleActivity(key)}
                      className={[
                        'max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold transition-colors',
                        selected
                          ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white'
                          : 'border-[#D7DEEA] bg-white text-[#3D4A5C]',
                      ].join(' ')}
                    >
                      <span className="mr-1 text-[10px] opacity-75">
                        {activity.type === 'subgroup_activity' ? 'Subgrupo' : 'Itinerario'}
                      </span>
                      <span className="inline-block max-w-[210px] truncate align-bottom">{activity.label}</span>
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </ActionModal>

      <ActionModal
        open={activeContextModal === 'document'}
        title="Gestionar documento"
        subtitle="Asocia un documento existente o sube uno nuevo desde este mismo modal."
        confirmLabel={documentModalTab === 'associate' ? 'Guardar seleccion' : 'Guardar documento'}
        onClose={() => setActiveContextModal(null)}
        onConfirm={() => {
          if (documentModalTab === 'associate') setActiveContextModal(null)
          else confirmDraftDocument()
        }}
      >
        <div className="mb-4 inline-flex rounded-lg border border-[#D7DEEA] bg-[#F8FAFC] p-1">
          <button
            type="button"
            onClick={() => setDocumentModalTab('associate')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${documentModalTab === 'associate' ? 'bg-[#7A4FD6] text-white' : 'text-[#475569]'}`}
          >
            Asociar
          </button>
          <button
            type="button"
            onClick={() => setDocumentModalTab('create')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${documentModalTab === 'create' ? 'bg-[#7A4FD6] text-white' : 'text-[#475569]'}`}
          >
            Crear
          </button>
        </div>
        {documentModalTab === 'associate' ? (
          documentOptions.length === 0 ? (
            <p className="font-body text-sm text-[#64748B]">No hay documentos en la boveda para asociar.</p>
          ) : (
            <div className="space-y-3">
              <input
                value={draftDocumentNotes}
                onChange={(event) => setDraftDocumentNotes(event.target.value)}
                placeholder="Filtrar documentos"
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
              />
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {documentOptions
                  .filter((document) => {
                    const filter = draftDocumentNotes.trim().toLowerCase()
                    if (!filter) return true
                    return `${document.label} ${document.subtitle ?? ''}`.toLowerCase().includes(filter)
                  })
                  .map((document) => {
                    const selected = selectedDocumentIds.includes(document.id)
                    return (
                      <button
                        key={document.id}
                        type="button"
                        onClick={() => toggleDocument(document.id)}
                        className={[
                          'max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold transition-colors',
                          selected
                            ? 'border-[#7A4FD6] bg-[#7A4FD6] text-white'
                            : 'border-[#D7DEEA] bg-white text-[#3D4A5C]',
                        ].join(' ')}
                      >
                        <span className="inline-block max-w-[220px] truncate align-bottom">{document.label}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )
        ) : (
          <div className="grid gap-3">
            <input
              type="file"
              onChange={(event) => setDraftDocumentFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm text-[#3D4A5C] outline-none focus:border-[#7A4FD6]"
            />
            <select
              value={draftDocumentCategory}
              onChange={(event) => setDraftDocumentCategory(event.target.value as TripDocumentCategory)}
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
            >
              {(Object.keys(documentCategoryLabels) as TripDocumentCategory[]).map((category) => (
                <option key={category} value={category}>{documentCategoryLabels[category]}</option>
              ))}
            </select>
            <textarea
              value={draftDocumentNotes}
              onChange={(event) => setDraftDocumentNotes(event.target.value)}
              placeholder="Nota obligatoria del documento"
              rows={3}
              className="w-full resize-none rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
            />
          </div>
        )}
      </ActionModal>
    </div>
  )
}
