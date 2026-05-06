import { useMemo, useState } from 'react'
import type { FC } from 'react'
import { useAuth } from '../../context/useAuth'
import {
  documentsService,
  type DocumentMetadataInput,
  type TripDocument,
  type TripDocumentCategory,
} from '../../services/documents'

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
}

export const DocumentVaultPanel: FC<Props> = ({ groupId, members = [], currentUser = null }) => {
  const { accessToken } = useAuth()
  const [items, setItems] = useState<TripDocument[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [category, setCategory] = useState<TripDocumentCategory>('otro')
  const [activeFilter, setActiveFilter] = useState<'todos' | TripDocumentCategory>('todos')
  const [linkedEntityType, setLinkedEntityType] = useState('')
  const [linkedEntityId, setLinkedEntityId] = useState('')
  const [selectedPeople, setSelectedPeople] = useState<string[]>([])
  const [expenseReason, setExpenseReason] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [notes, setNotes] = useState('')

  const LINKED_ENTITY_TYPES = [
    { value: '', label: 'Sin vínculo' },
    { value: 'actividad', label: 'Actividad' },
    { value: 'subgrupo', label: 'Subgrupo' },
    { value: 'actividad_subgrupo', label: 'Actividad de subgrupo' },
    { value: 'gasto', label: 'Gasto' },
    { value: 'vuelo', label: 'Vuelo' },
    { value: 'hospedaje', label: 'Hospedaje' },
  ]

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

  const filteredItems = useMemo(
    () => (activeFilter === 'todos' ? items : items.filter((item) => item.category === activeFilter)),
    [activeFilter, items]
  )

  const load = async () => {
    if (!groupId || !accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      setItems(await documentsService.list(groupId, accessToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los documentos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File | null) => {
    if (!file || !groupId || !accessToken) return
    setIsUploading(true)
    setError(null)
    try {
      const metadata: DocumentMetadataInput = {
        linked_entity_type: linkedEntityType || null,
        linked_entity_id: linkedEntityId || null,
        person_reference: null,
        person_references: selectedPeople,
        expense_reason: expenseReason || null,
        expense_amount: expenseAmount ? Number(expenseAmount) : null,
        notes: notes || null,
      }

      const created = await documentsService.upload(groupId, file, category, metadata, accessToken)
      setItems((prev) => [created, ...prev])
      setLinkedEntityType('')
      setLinkedEntityId('')
      setSelectedPeople([])
      setExpenseReason('')
      setExpenseAmount('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo subir el documento')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!groupId || !accessToken) return
    setError(null)
    try {
      await documentsService.remove(groupId, docId, accessToken)
      setItems((prev) => prev.filter((item) => item.id !== docId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el documento')
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto bg-surface px-6 py-6">
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <h2 className="font-heading text-lg font-bold text-[#1E0A4E]">Bóveda de Documentos</h2>
        <p className="mt-1 font-body text-sm text-[#7A8799]">
          Adjunta boletos, reservas, comprobantes y archivos del viaje.
        </p>

        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
              Categoría
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TripDocumentCategory)}
              className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-body text-sm text-[#1E0A4E]"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <label className="cursor-pointer rounded-xl bg-[#1E6FD9] px-4 py-2.5 font-body text-sm font-semibold text-white hover:bg-[#2C8BE6]">
            {isUploading ? 'Subiendo...' : 'Subir documento'}
            <input
              type="file"
              accept={ACCEPTED_FILES}
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                void handleUpload(file)
                e.currentTarget.value = ''
              }}
            />
          </label>

          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-body text-sm font-semibold text-[#3D4A5C] hover:bg-[#F8FAFC] disabled:opacity-50"
          >
            {isLoading ? 'Cargando...' : 'Refrescar'}
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <select
            value={linkedEntityType}
            onChange={(e) => setLinkedEntityType(e.target.value)}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E]"
          >
            {LINKED_ENTITY_TYPES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <input
            value={linkedEntityId}
            onChange={(e) => setLinkedEntityId(e.target.value)}
            placeholder="ID registro relacionado"
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E]"
          />
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2">
            <p className="mb-2 font-body text-xs font-semibold text-[#7A8799]">Personas relacionadas</p>
            <div className="flex flex-wrap gap-2">
              {memberOptionsSafe.map((member) => {
                const isActive = selectedPeople.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedPeople((prev) =>
                        isActive ? prev.filter((value) => value !== member.id) : [...prev, member.id]
                      )
                    }}
                    className={`rounded-full px-2.5 py-1 font-body text-xs font-semibold ${isActive ? 'bg-[#1E6FD9] text-white' : 'bg-[#EEF2FF] text-[#1E0A4E]'}`}
                  >
                    {member.label}
                  </button>
                )
              })}
              {memberOptionsSafe.length === 0 && (
                <span className="font-body text-xs text-[#7A8799]">Sin miembros disponibles</span>
              )}
            </div>
          </div>
          <input
            value={expenseReason}
            onChange={(e) => setExpenseReason(e.target.value)}
            placeholder="Motivo del gasto"
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E]"
          />
          <input
            type="number"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            placeholder="Monto implicado"
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E]"
          />
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas"
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 font-body text-sm text-[#1E0A4E]"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-[#FBC7C7] bg-[#FFF5F5] px-3 py-2 font-body text-sm text-[#C03535]">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
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
          <div className="rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] px-4 py-10 text-center font-body text-sm text-[#7A8799]">
            No hay documentos en esta categoría.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                <div className="min-w-0">
                  <a
                    href={item.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-body text-sm font-semibold text-[#1E6FD9] hover:underline"
                  >
                    {item.file_name}
                  </a>
                  <p className="mt-1 font-body text-xs text-[#7A8799]">
                    {categoryLabel(item.category)} · {formatBytes(item.file_size)} · {formatDate(item.created_at)}
                  </p>
                  {(item.metadata?.linked_entity_type || item.metadata?.linked_entity_id || item.metadata?.person_reference || item.metadata?.expense_reason || item.metadata?.expense_amount) && (
                    <p className="mt-1 font-body text-xs text-[#3D4A5C]">
                      {item.metadata?.linked_entity_type ? `Tipo: ${String(item.metadata.linked_entity_type)} · ` : ''}
                      {item.metadata?.linked_entity_id ? `Registro: ${String(item.metadata.linked_entity_id)} · ` : ''}
                      {item.metadata?.person_reference ? `Persona: ${String(item.metadata.person_reference)} · ` : ''}
                      {Array.isArray(item.metadata?.person_references) && item.metadata.person_references.length > 0 ? `Personas: ${item.metadata.person_references.join(', ')} · ` : ''}
                      {item.metadata?.expense_reason ? `Motivo: ${String(item.metadata.expense_reason)} · ` : ''}
                      {item.metadata?.expense_amount != null ? `Monto: $${String(item.metadata.expense_amount)}` : ''}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="ml-3 rounded-lg border border-[#FBC7C7] px-2.5 py-1 font-body text-xs font-semibold text-[#C03535] hover:bg-[#FFF5F5]"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
