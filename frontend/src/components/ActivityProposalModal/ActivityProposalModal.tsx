import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { mapsService, type PlaceAutocompleteResult, type PlaceResult } from '../../services/maps'
import { groupsService } from '../../services/groups'
import { proposalsService } from '../../services/proposals'
import { budgetService, type BudgetCategory, type BudgetSplitType } from '../../services/budget'
import { documentsService, type TripDocumentCategory } from '../../services/documents'
import { ApiError } from '../../services/apiClient'
import {
  contextLinksService,
  type ContextEntitySummary,
  type ContextLink,
  type ContextLinkOptions,
} from '../../services/context-links'
import type { Group } from '../../types/groups'
import type { Activity } from '../ui/DayView/DayView'
import { ExpenseDraftForm } from '../budget/ExpenseDraftForm'

type EnrichedPlaceResult = PlaceResult & {
  routeDistanceText?: string | null
  routeDurationText?: string | null
  routeDistanceMeters?: number | null
  routeDurationSeconds?: number | null
}

type ActivityContextModalMode =
  | 'expense'
  | 'document'
  | null

type ContextModalTab = 'associate' | 'create'

type ActivityProposalModalProps = {
  open: boolean
  group: Group | null
  token?: string | null
  selectedDayNumber?: number | null
  editingActivity?: Activity | null
  isCurrentUserAdmin?: boolean
  currentUserId?: string | null
  members?: Array<{
    id?: string | number | null
    usuario_id?: string | number | null
    nombre?: string | null
    email?: string | null
  }>
  onClose: () => void
  onCreated: () => void
}

const EMPTY_LINK_OPTIONS: ContextLinkOptions = {
  expenses: [],
  documents: [],
  activities: [],
  subgroupActivities: [],
}

const documentCategoryLabels: Record<TripDocumentCategory, string> = {
  vuelo: 'Vuelo',
  hospedaje: 'Hospedaje',
  gasto: 'Gasto',
  actividad: 'Actividad',
  otro: 'Otro',
}

const todayValue = () => new Date().toISOString().split('T')[0]
const activityContextKey = (entity: { type: 'expense' | 'document'; id: string }) => `${entity.type}:${entity.id}`
const PLACE_SEARCH_RADIUS_METERS = 50000
const LONG_ROUTE_THRESHOLD_SECONDS = 60 * 60

const otherEntityForActivity = (link: ContextLink, activityId: string): ContextEntitySummary | null => {
  if (link.entityA.type === 'activity' && link.entityA.id === activityId) return link.entityB
  if (link.entityB.type === 'activity' && link.entityB.id === activityId) return link.entityA
  return null
}

function parseActivityTime(raw: string | undefined): string {
  const match = (raw ?? '').match(/\b([01]\d|2[0-3]):([0-5]\d)\b/)
  return match ? match[0] : '12:00'
}

function parseGoogleDurationSeconds(raw?: string | null): number | null {
  if (!raw) return null
  const match = raw.match(/^(\d+(?:\.\d+)?)s$/)
  return match ? Number(match[1]) : null
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

export function ActivityProposalModal({
  open,
  group,
  token,
  selectedDayNumber,
  editingActivity,
  isCurrentUserAdmin = false,
  currentUserId = null,
  members = [],
  onClose,
  onCreated,
}: ActivityProposalModalProps) {
  const [query, setQuery] = useState('')
  const [description, setDescription] = useState('')
  const [timeValue, setTimeValue] = useState('12:00')
  const [results, setResults] = useState<EnrichedPlaceResult[]>([])
  const [suggestions, setSuggestions] = useState<PlaceAutocompleteResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<EnrichedPlaceResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [linkOptions, setLinkOptions] = useState<ContextLinkOptions>(EMPTY_LINK_OPTIONS)
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])
  const [expenseFilter, setExpenseFilter] = useState('')
  const [documentFilter, setDocumentFilter] = useState('')
  const [quickExpenseAmount, setQuickExpenseAmount] = useState('')
  const [quickExpenseDescription, setQuickExpenseDescription] = useState('')
  const [quickExpenseCategory, setQuickExpenseCategory] = useState<BudgetCategory>('actividad')
  const [quickExpenseDate, setQuickExpenseDate] = useState(todayValue())
  const [quickExpensePaidBy, setQuickExpensePaidBy] = useState('')
  const [quickExpenseSplitType, setQuickExpenseSplitType] = useState<BudgetSplitType>('equitativa')
  const [quickExpenseSplitAmounts, setQuickExpenseSplitAmounts] = useState<Record<string, string>>({})
  const [quickExpenseMemberIds, setQuickExpenseMemberIds] = useState<string[]>([])
  const [quickDocumentFile, setQuickDocumentFile] = useState<File | null>(null)
  const [quickDocumentCategory, setQuickDocumentCategory] = useState<TripDocumentCategory>('actividad')
  const [quickDocumentNotes, setQuickDocumentNotes] = useState('')
  const [activeContextModal, setActiveContextModal] = useState<ActivityContextModalMode>(null)
  const [expenseModalTab, setExpenseModalTab] = useState<ContextModalTab>('associate')
  const [documentModalTab, setDocumentModalTab] = useState<ContextModalTab>('associate')
  const [longRouteConfirmation, setLongRouteConfirmation] = useState<{ asAdminDirect: boolean } | null>(null)
  const [scheduleConflictMessage, setScheduleConflictMessage] = useState<string | null>(null)
  const autocompleteBoxRef = useRef<HTMLDivElement | null>(null)

  const memberOptions = useMemo(
    () =>
      members
        .map((member) => {
          const id = String(member.usuario_id ?? member.id ?? '')
          return {
            id,
            label: member.nombre || member.email || `Usuario ${id}`,
          }
        })
        .filter((member) => member.id.length > 0),
    [members]
  )

  const safeMemberOptions = useMemo(() => {
    if (memberOptions.length > 0) return memberOptions
    if (!currentUserId) return []
    return [{ id: String(currentUserId), label: `Usuario ${currentUserId}` }]
  }, [currentUserId, memberOptions])

  const defaultExpensePayer = useMemo(() => {
    if (currentUserId && safeMemberOptions.some((member) => member.id === String(currentUserId))) {
      return String(currentUserId)
    }
    return safeMemberOptions[0]?.id ?? ''
  }, [currentUserId, safeMemberOptions])

  const selectedActivityDate = useMemo(() => {
    const startDate = group?.fecha_inicio
    if (!startDate || !selectedDayNumber) return null

    const selectedDate = new Date(
      new Date(`${startDate}T12:00:00`).getTime() + (selectedDayNumber - 1) * 86400000
    )
    const yyyy = selectedDate.getFullYear()
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0')
    const dd = String(selectedDate.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [group?.fecha_inicio, selectedDayNumber])

  const routeOrigin = useMemo(() => {
    if (group?.punto_partida_latitud != null && group.punto_partida_longitud != null) {
      return {
        lat: Number(group.punto_partida_latitud),
        lng: Number(group.punto_partida_longitud),
      }
    }

    if (group?.destino_latitud != null && group.destino_longitud != null) {
      return {
        lat: Number(group.destino_latitud),
        lng: Number(group.destino_longitud),
      }
    }

    return null
  }, [
    group?.destino_latitud,
    group?.destino_longitud,
    group?.punto_partida_latitud,
    group?.punto_partida_longitud,
  ])

  const routeOriginLabel = group?.punto_partida_tipo === 'hotel_reservado'
    ? 'tu hospedaje'
    : 'el destino del viaje'
  const selectedPlaceIsLongRoute =
    selectedPlace?.routeDurationSeconds != null &&
    selectedPlace.routeDurationSeconds > LONG_ROUTE_THRESHOLD_SECONDS

  const getActivityDate = useCallback(() => {
    if (!selectedActivityDate) return null
    return `${selectedActivityDate}T${timeValue}:00`
  }, [selectedActivityDate, timeValue])

  const resetContextDraft = () => {
    setSelectedExpenseIds([])
    setSelectedDocumentIds([])
    setExpenseFilter('')
    setDocumentFilter('')
    setQuickExpenseAmount('')
    setQuickExpenseDescription('')
    setQuickExpenseCategory('actividad')
    setQuickExpenseDate(getActivityDate()?.slice(0, 10) ?? todayValue())
    setQuickExpensePaidBy(defaultExpensePayer)
    setQuickExpenseSplitType('equitativa')
    setQuickExpenseSplitAmounts({})
    setQuickExpenseMemberIds(safeMemberOptions.map((member) => member.id))
    setQuickDocumentFile(null)
    setQuickDocumentCategory('actividad')
    setQuickDocumentNotes('')
    setActiveContextModal(null)
  }

  useEffect(() => {
    if (!open) return
    setQuickExpenseDate(getActivityDate()?.slice(0, 10) ?? todayValue())
  }, [getActivityDate, open])

  useEffect(() => {
    if (!open) return

    let cancelled = false

    const hydrate = async () => {
      if (group?.id && token) {
        try {
          const [optionsResponse, linksResponse] = await Promise.all([
            contextLinksService.options(String(group.id), token),
            editingActivity
              ? contextLinksService.list(String(group.id), token, { type: 'activity', id: editingActivity.id })
              : Promise.resolve({ ok: true, links: [] }),
          ])
          if (cancelled) return
          setLinkOptions(optionsResponse.options)

          const linkedEntities = editingActivity
            ? linksResponse.links
              .map((link) => otherEntityForActivity(link, editingActivity.id))
              .filter((entity): entity is ContextEntitySummary =>
                entity !== null && (entity.type === 'expense' || entity.type === 'document')
              )
            : []

          setSelectedExpenseIds(linkedEntities.filter((entity) => entity.type === 'expense').map((entity) => entity.id))
          setSelectedDocumentIds(linkedEntities.filter((entity) => entity.type === 'document').map((entity) => entity.id))
        } catch {
          if (cancelled) return
          setLinkOptions(EMPTY_LINK_OPTIONS)
          setSelectedExpenseIds([])
          setSelectedDocumentIds([])
        }
      } else {
        setLinkOptions(EMPTY_LINK_OPTIONS)
        setSelectedExpenseIds([])
        setSelectedDocumentIds([])
      }

      setExpenseFilter('')
      setDocumentFilter('')
      setQuickExpenseAmount('')
      setQuickExpenseDescription('')
      setQuickExpenseCategory('actividad')
      setQuickExpenseDate(selectedActivityDate ?? todayValue())
      setQuickExpensePaidBy(defaultExpensePayer)
      setQuickExpenseSplitType('equitativa')
      setQuickExpenseSplitAmounts({})
      setQuickExpenseMemberIds(safeMemberOptions.map((member) => member.id))
      setQuickDocumentFile(null)
      setQuickDocumentCategory('actividad')
      setQuickDocumentNotes('')
      setActiveContextModal(null)

      if (editingActivity) {
        setQuery(editingActivity.title ?? '')
        setDescription(editingActivity.description ?? '')
        setTimeValue(parseActivityTime(editingActivity.time))
        setSelectedPlace({
          id: editingActivity.externalReference ?? editingActivity.id,
          name: editingActivity.title ?? '',
          formattedAddress: editingActivity.location ?? '',
          latitude: editingActivity.latitude ?? null,
          longitude: editingActivity.longitude ?? null,
          primaryCategory: 'Actividad',
          photoUrl: editingActivity.image ?? null,
        })
        setResults([])
        setError('')
        return
      }

      setQuery('')
      setDescription('')
      setTimeValue('12:00')
      setResults([])
      setSuggestions([])
      setShowSuggestions(false)
      setSelectedPlace(null)
      setError('')
    }

    void hydrate()

    return () => { cancelled = true }
  }, [defaultExpensePayer, editingActivity, group?.id, open, safeMemberOptions, selectedActivityDate, token])

  const enrichPlaceWithRoute = useCallback(async (place: EnrichedPlaceResult): Promise<EnrichedPlaceResult> => {
    const enrichedPlace = { ...place }

    if (!token || !routeOrigin || place.latitude == null || place.longitude == null) {
      return enrichedPlace
    }

    try {
      const routeResponse = await mapsService.computeRoute(
        {
          originLat: routeOrigin.lat,
          originLng: routeOrigin.lng,
          destinationLat: place.latitude,
          destinationLng: place.longitude,
          travelMode: 'DRIVE',
        },
        token
      )

      enrichedPlace.routeDistanceText = routeResponse.data?.distanceText ?? null
      enrichedPlace.routeDurationText = routeResponse.data?.durationText ?? routeResponse.data?.staticDurationText ?? null
      enrichedPlace.routeDistanceMeters = routeResponse.data?.distanceMeters ?? null
      enrichedPlace.routeDurationSeconds = parseGoogleDurationSeconds(
        routeResponse.data?.duration ?? routeResponse.data?.staticDuration
      )
    } catch {
      // La propuesta puede continuar aunque la ruta no este disponible.
    }

    return enrichedPlace
  }, [routeOrigin, token])

  useEffect(() => {
    if (!open) return

    const trimmedQuery = query.trim()
    const selectedName = selectedPlace?.name?.trim()

    if (trimmedQuery.length < 3 || (selectedName && trimmedQuery === selectedName)) {
      setSuggestions([])
      setShowSuggestions(false)
      setSuggestionsLoading(false)
      return
    }

    if (!token) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      try {
        setSuggestionsLoading(true)
        const response = await mapsService.autocompletePlaces(trimmedQuery, token, {
          latitude: routeOrigin?.lat,
          longitude: routeOrigin?.lng,
          radius: PLACE_SEARCH_RADIUS_METERS,
        })

        if (cancelled) return
        const nextSuggestions = response.data ?? []
        setSuggestions(nextSuggestions)
        setShowSuggestions(nextSuggestions.length > 0)
      } catch {
        if (cancelled) return
        setSuggestions([])
        setShowSuggestions(false)
      } finally {
        if (!cancelled) setSuggestionsLoading(false)
      }
    }, 300)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [open, query, routeOrigin, selectedPlace?.name, token])

  if (!open) return null

  const handleSearch = async () => {
    if (!query.trim()) {
      setError('Escribe una actividad o lugar para buscar.')
      return
    }

    if (!token) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSelectedPlace(null)

      const response = await mapsService.searchPlacesByText(
        {
          textQuery: query.trim(),
          latitude: routeOrigin?.lat,
          longitude: routeOrigin?.lng,
          radius: PLACE_SEARCH_RADIUS_METERS,
          maxResultCount: 10,
        },
        token
      )

      const fetchedResults: EnrichedPlaceResult[] = response.data ?? []

      if (routeOrigin && fetchedResults.length > 0) {
        const topResults = await Promise.all(fetchedResults.slice(0, 10).map(enrichPlaceWithRoute))

        topResults.sort((a, b) => {
          const distA = a.routeDistanceMeters ?? Infinity
          const distB = b.routeDistanceMeters ?? Infinity
          return distA - distB
        })

        setResults(topResults)
      } else {
        setResults(fetchedResults)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron buscar lugares.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = async (suggestion: PlaceAutocompleteResult) => {
    if (!token) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setShowSuggestions(false)
      setSuggestions([])
      setResults([])

      const response = await mapsService.getPlaceDetails(suggestion.placeId, token)
      const place = response.data

      if (!place) {
        setError('No se pudo cargar el detalle de ese lugar.')
        return
      }

      const enrichedPlace = await enrichPlaceWithRoute(place)
      setSelectedPlace(enrichedPlace)
      setQuery(enrichedPlace.name || suggestion.mainText || suggestion.description)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo seleccionar el lugar.')
    } finally {
      setLoading(false)
    }
  }

  const buildActivityPayload = () => {
    if (!selectedPlace) return null

    const activityDate = getActivityDate()
    return {
      titulo: selectedPlace.name || query.trim(),
      descripcion: description.trim() || null,
      ubicacion: selectedPlace.formattedAddress,
      latitud: selectedPlace.latitude,
      longitud: selectedPlace.longitude,
      fecha_inicio: activityDate,
      fecha_fin: activityDate,
      referencia_externa: selectedPlace.id,
      fuente: 'google_maps',
      payload: {
        googlePlaceId: selectedPlace.id,
        name: selectedPlace.name,
        formattedAddress: selectedPlace.formattedAddress,
        latitude: selectedPlace.latitude,
        longitude: selectedPlace.longitude,
        selectedTime: timeValue,
        primaryCategory: selectedPlace.primaryCategory,
        photoName: selectedPlace.photoName ?? null,
        photoUrl: selectedPlace.photoUrl ?? null,
        imageUrl: selectedPlace.photoUrl ?? null,
        query: query.trim(),
      },
    }
  }

  const toggleQuickExpenseMember = (memberId: string) => {
    setQuickExpenseMemberIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
      if (next.length === 0) return prev
      if (!next.includes(quickExpensePaidBy)) setQuickExpensePaidBy(next[0] ?? '')
      return next
    })
  }

  const setQuickExpenseSplitAmount = (memberId: string, value: string) => {
    setQuickExpenseSplitAmounts((prev) => ({
      ...prev,
      [memberId]: value,
    }))
  }

  const quickExpenseTotal = parseFloat(quickExpenseAmount) || 0
  const quickExpenseSplitSum =
    quickExpenseSplitType === 'personalizada'
      ? safeMemberOptions
        .filter((member) => quickExpenseMemberIds.includes(member.id))
        .reduce((sum, member) => sum + (parseFloat(quickExpenseSplitAmounts[member.id] ?? '0') || 0), 0)
      : quickExpenseTotal
  const quickExpenseSplitError =
    quickExpenseSplitType === 'personalizada' &&
    quickExpenseTotal > 0 &&
    Math.abs(quickExpenseSplitSum - quickExpenseTotal) > 0.01
      ? 'La division personalizada debe sumar el monto total.'
      : null

  const handleSave = async (asAdminDirect = false, skipLongRouteConfirmation = false) => {
    if (!group?.id) {
      setError('No se encontro el grupo actual.')
      return
    }
    if (!token) {
      setError('Tu sesion expiro. Vuelve a iniciar sesion.')
      return
    }
    if (!selectedPlace) {
      setError('Selecciona un lugar para proponer la actividad.')
      return
    }
    if (selectedPlaceIsLongRoute && !skipLongRouteConfirmation) {
      setLongRouteConfirmation({ asAdminDirect })
      return
    }

    const shouldCreateExpense = quickExpenseAmount.trim().length > 0 || quickExpenseDescription.trim().length > 0
    const quickExpenseValue = Number(quickExpenseAmount)
    const shouldUploadDocument = quickDocumentFile !== null
    if (shouldCreateExpense) {
      if (!Number.isFinite(quickExpenseValue) || quickExpenseValue <= 0) {
        setError('El monto del gasto rapido debe ser mayor a 0.')
        return
      }
      if (!quickExpenseDescription.trim()) {
        setError('La descripcion del gasto es obligatoria.')
        return
      }
      if (!quickExpensePaidBy) {
        setError('Selecciona quien pagara el gasto.')
        return
      }
      if (quickExpenseMemberIds.length === 0) {
        setError('Selecciona al menos una persona para el gasto.')
        return
      }
      if (quickExpenseSplitError) {
        setError(quickExpenseSplitError)
        return
      }
    }
    if (shouldUploadDocument && !quickDocumentNotes.trim()) {
      setError('La nota del documento es obligatoria para subirlo a la boveda.')
      return
    }

    const payload = buildActivityPayload()
    if (!payload) {
      setError('No se pudo preparar la informacion de la actividad.')
      return
    }

    try {
      setSaving(true)
      setError('')

      let activityId = ''
      let proposalId = ''

      if (editingActivity) {
        await groupsService.updateActivity(String(group.id), editingActivity.id, payload, token)
        activityId = String(editingActivity.id)
        proposalId = String(editingActivity.proposalId ?? '')
      } else {
        const created = await groupsService.createActivity(String(group.id), payload, token)
        activityId = String(created.activity?.id_actividad ?? '')
        proposalId = String(
          created.activity?.propuesta_id ??
          created.activity?.proposalId ??
          ''
        )

        if (asAdminDirect && proposalId) {
          await proposalsService.applyAdminDecision(
            String(group.id),
            proposalId,
            {
              decision: 'aprobar',
              reason: 'Actividad agregada directamente por organizador (Tipo A)',
            },
            token
          )
        }
      }

      if (activityId) {
        const createdExpenseId = shouldCreateExpense
          ? await budgetService.createExpense(String(group.id), {
            paid_by_user_id: quickExpensePaidBy,
            amount: quickExpenseValue,
            description: quickExpenseDescription.trim(),
            category: quickExpenseCategory,
            split_type: quickExpenseSplitType,
            member_ids: quickExpenseMemberIds,
            split_amounts: quickExpenseSplitType === 'personalizada'
              ? Object.fromEntries(
                quickExpenseMemberIds.map((memberId) => [
                  memberId,
                  parseFloat(quickExpenseSplitAmounts[memberId] ?? '0') || 0,
                ])
              )
              : undefined,
            expense_date: quickExpenseDate || (getActivityDate()?.slice(0, 10) ?? null),
          }, token).then((response) => {
            const expectedDescription = quickExpenseDescription.trim()
            const candidates = response.expenses.filter((expense) =>
              expense.description === expectedDescription &&
              Number(expense.amount) === quickExpenseValue
            )
            const sorted = [...(candidates.length > 0 ? candidates : response.expenses)].sort((a, b) =>
              new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
            )
            return sorted[0]?.id ?? null
          })
          : null

        const createdDocumentId = quickDocumentFile
          ? await documentsService.upload(String(group.id), quickDocumentFile, quickDocumentCategory, {
            notes: quickDocumentNotes.trim() || null,
          }, token).then((document) => document.id)
          : null

        const desiredEntities = [
          ...selectedExpenseIds.map((id) => ({ type: 'expense' as const, id })),
          ...selectedDocumentIds.map((id) => ({ type: 'document' as const, id })),
          ...(createdExpenseId ? [{ type: 'expense' as const, id: createdExpenseId }] : []),
          ...(createdDocumentId ? [{ type: 'document' as const, id: createdDocumentId }] : []),
        ]
        const desiredKeys = new Set(desiredEntities.map(activityContextKey))

        const currentResponse = await contextLinksService.list(String(group.id), token, {
          type: 'activity',
          id: activityId,
        })
        const currentRelevant = currentResponse.links
          .map((link) => ({ link, entity: otherEntityForActivity(link, activityId) }))
          .filter((item): item is { link: ContextLink; entity: ContextEntitySummary } =>
            item.entity !== null && (item.entity.type === 'expense' || item.entity.type === 'document')
          )

        await Promise.all([
          ...currentRelevant
            .filter(({ entity }) => !desiredKeys.has(activityContextKey({ type: entity.type as 'expense' | 'document', id: entity.id })))
            .map(({ link }) => contextLinksService.remove(String(group.id), link.id, token)),
          ...desiredEntities
            .filter((entity) => !currentRelevant.some((item) => activityContextKey({ type: item.entity.type as 'expense' | 'document', id: item.entity.id }) === activityContextKey(entity)))
            .map((entity) => contextLinksService.create(String(group.id), {
              source: { type: 'activity', id: activityId },
              target: entity,
            }, token)),
        ])
      }

      setQuery('')
      setDescription('')
      setTimeValue('12:00')
      setResults([])
      setSelectedPlace(null)
      setLongRouteConfirmation(null)
      resetContextDraft()
      onCreated()
      onClose()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setScheduleConflictMessage(
          'Ya hay una actividad en ese horario. Necesitas cambiar el horario de la otra actividad o el de esta para poder continuar.'
        )
        setError('')
        return
      }
      setError(
        err instanceof Error
          ? err.message
          : editingActivity
            ? 'No se pudo actualizar la actividad.'
            : 'No se pudo crear la actividad.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (saving) return
    setQuery('')
    setDescription('')
    setTimeValue('12:00')
    setResults([])
    setSelectedPlace(null)
    setLongRouteConfirmation(null)
    setScheduleConflictMessage(null)
    resetContextDraft()
    setError('')
    onClose()
  }

  const confirmExpenseModal = () => {
    if (expenseModalTab === 'associate') {
      setActiveContextModal(null)
      return
    }
    const shouldCreateExpense = quickExpenseAmount.trim().length > 0 || quickExpenseDescription.trim().length > 0
    const amount = Number(quickExpenseAmount)
    if (!shouldCreateExpense) {
      setError('Completa el gasto para guardarlo.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('El monto del gasto rapido debe ser mayor a 0.')
      return
    }
    if (!quickExpenseDescription.trim()) {
      setError('La descripcion del gasto es obligatoria.')
      return
    }
    if (!quickExpensePaidBy) {
      setError('Selecciona quien pagara el gasto.')
      return
    }
    if (quickExpenseMemberIds.length === 0) {
      setError('Selecciona al menos una persona para el gasto.')
      return
    }
    if (quickExpenseSplitError) {
      setError(quickExpenseSplitError)
      return
    }
    setError('')
    setActiveContextModal(null)
  }

  const confirmDocumentModal = () => {
    if (documentModalTab === 'associate') {
      setActiveContextModal(null)
      return
    }
    if (!quickDocumentFile) {
      setError('Selecciona un archivo para el documento.')
      return
    }
    if (!quickDocumentNotes.trim()) {
      setError('La nota del documento es obligatoria.')
      return
    }
    setError('')
    setActiveContextModal(null)
  }

  const toggleExpense = (expenseId: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(expenseId) ? prev.filter((id) => id !== expenseId) : [...prev, expenseId]
    )
  }

  const toggleDocument = (documentId: string) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(documentId) ? prev.filter((id) => id !== documentId) : [...prev, documentId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="border-b border-[#E2E8F0] px-6 py-5">
          <h2 className="font-heading text-xl font-bold text-purpleNavbar">
            {editingActivity ? 'Editar propuesta' : 'Proponer actividad'}
          </h2>
          <p className="mt-1 font-body text-sm text-gray500">
            Escribe y elige una sugerencia de Google Places para agregarla como propuesta al itinerario.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Buscar lugar o actividad
            </label>
            <div
              ref={autocompleteBoxRef}
              className="relative"
              onBlur={(event) => {
                if (!autocompleteBoxRef.current?.contains(event.relatedTarget as Node | null)) {
                  setShowSuggestions(false)
                }
              }}
            >
              <input
                value={query}
                onChange={(e) => {
                  const value = e.target.value
                  setQuery(value)
                  setError('')
                  if (selectedPlace) setSelectedPlace(null)
                  setResults([])
                  setShowSuggestions(value.trim().length >= 3)
                }}
                onFocus={() => {
                  setShowSuggestions(query.trim().length >= 3 && suggestions.length > 0)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (suggestions[0]) {
                      void handleSelectSuggestion(suggestions[0])
                    } else {
                      void handleSearch()
                    }
                  }
                }}
                placeholder="Ej: restaurante, playa, museo..."
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 pr-10 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
              />
              {(suggestionsLoading || loading) && (
                <span className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[#D7DEEA] border-t-bluePrimary" />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 max-h-72 overflow-y-auto rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-xl">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId || suggestion.description}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => void handleSelectSuggestion(suggestion)}
                      className="block w-full rounded-lg px-4 py-3 text-left transition hover:bg-[#F8FAFC]"
                    >
                      <p className="font-body text-sm font-semibold text-purpleNavbar">
                        {suggestion.mainText || suggestion.description}
                      </p>
                      <p className="mt-0.5 font-body text-xs text-gray500">
                        {suggestion.secondaryText || suggestion.description}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Descripcion opcional
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: visitar por la tarde, revisar horarios, llevar efectivo..."
              rows={3}
              className="w-full resize-none rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block font-body text-xs font-semibold uppercase tracking-wide text-[#1E0A4E]/60">
              Hora estimada
            </label>
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm outline-none transition focus:border-bluePrimary focus:ring-2 focus:ring-bluePrimary/10"
            />
          </div>

          {selectedPlace && (
            <div className="rounded-xl border border-bluePrimary/30 bg-bluePrimary/5 px-4 py-3">
              <p className="font-body text-sm font-bold text-purpleNavbar">
                Seleccionado: {selectedPlace.name || 'Lugar sin nombre'}
              </p>
              <p className="mt-0.5 font-body text-xs text-gray500">
                {selectedPlace.formattedAddress || 'Direccion no disponible'}
              </p>
              {(selectedPlace.routeDistanceText || selectedPlace.routeDurationText) && (
                <p className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 font-body text-[11px] font-semibold text-bluePrimary shadow-sm">
                  A {selectedPlace.routeDistanceText ?? 'distancia no disponible'}
                  {selectedPlace.routeDurationText ? ` · ${selectedPlace.routeDurationText}` : ''} desde {routeOriginLabel}
                </p>
              )}
              {selectedPlaceIsLongRoute && (
                <div className="mt-3 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-800">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-red-100 text-red-700">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                      <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      <path d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <div>
                    <p className="font-body text-xs font-bold">Traslado largo</p>
                    <p className="mt-0.5 font-body text-xs">
                      Este lugar queda a mas de 1 hora desde {routeOriginLabel}
                      {selectedPlace.routeDurationText ? ` (${selectedPlace.routeDurationText})` : ''}. Te pediremos confirmar antes de agregarlo.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto rounded-xl border border-[#E2E8F0]">
              {results.map((place) => {
                const isSelected = selectedPlace?.id === place.id
                return (
                  <button
                    key={place.id || `${place.name}-${place.formattedAddress}`}
                    type="button"
                    onClick={() => setSelectedPlace(place)}
                    className={`block w-full border-b border-[#F1F5F9] px-4 py-3 text-left last:border-b-0 ${
                      isSelected ? 'bg-bluePrimary/10' : 'bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex gap-3">
                      <img
                        src={place.photoUrl || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=200&h=200&fit=crop'}
                        alt={place.name || 'Lugar'}
                        className="h-14 w-14 flex-none rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-body text-sm font-bold text-purpleNavbar">
                          {place.name || 'Lugar sin nombre'}
                        </p>
                        <p className="mt-0.5 line-clamp-2 font-body text-xs text-gray500">
                          {place.formattedAddress || 'Direccion no disponible'}
                        </p>
                        {(place.routeDistanceText || place.routeDurationText) && (
                          <p className="mt-1 font-body text-[11px] font-semibold text-bluePrimary">
                            {place.routeDistanceText ?? 'Distancia no disponible'}
                            {place.routeDurationText ? ` · ${place.routeDurationText}` : ''} desde {routeOriginLabel}
                          </p>
                        )}
                        {place.routeDurationSeconds != null && place.routeDurationSeconds > LONG_ROUTE_THRESHOLD_SECONDS && (
                          <p className="mt-1 flex items-center gap-1.5 font-body text-[11px] font-semibold text-red-700">
                            <span className="text-red-600">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                                <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                <path d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                              </svg>
                            </span>
                            A mas de 1 hora{place.routeDurationText ? ` (${place.routeDurationText})` : ''}
                          </p>
                        )}
                        {place.primaryCategory && (
                          <p className="mt-1 font-body text-[11px] text-bluePrimary">{place.primaryCategory}</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
              <p className="font-body text-sm font-semibold text-[#1E0A4E]">Agregar gasto o comprobante</p>
              <p className="mt-1 font-body text-xs text-[#64748B]">
                Aqui puedes relacionar gastos (taxi, entradas, comida) y comprobantes (tickets, reservaciones, recibos) para esta actividad.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseModalTab('associate')
                    setActiveContextModal('expense')
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-left font-body text-sm font-semibold text-[#1E6FD9]"
                >
                  Agregar o elegir gasto
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDocumentModalTab('associate')
                    setActiveContextModal('document')
                  }}
                  className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 text-left font-body text-sm font-semibold text-[#7A4FD6]"
                >
                  Agregar o elegir comprobante
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedExpenseIds.map((expenseId) => {
                  const expense = linkOptions.expenses.find((item) => item.id === expenseId)
                  if (!expense) return null
                  return (
                    <span key={expenseId} className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 font-body text-xs font-semibold text-[#1E6FD9]">
                      Gasto asociado: {expense.label}
                    </span>
                  )
                })}
                {(quickExpenseAmount.trim() || quickExpenseDescription.trim()) && (
                  <span className="rounded-full border border-[#CFE0FF] bg-[#EEF4FF] px-3 py-1.5 font-body text-xs font-semibold text-[#1E6FD9]">
                    Gasto por crear: {quickExpenseDescription.trim() || 'Sin descripcion'} {quickExpenseAmount.trim() ? `· $${quickExpenseAmount}` : ''}
                  </span>
                )}
                {selectedDocumentIds.map((documentId) => {
                  const document = linkOptions.documents.find((item) => item.id === documentId)
                  if (!document) return null
                  return (
                    <span key={documentId} className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]">
                      Documento asociado: {document.label}
                    </span>
                  )
                })}
                {quickDocumentFile && (
                  <span className="rounded-full border border-[#D8C8FF] bg-[#F3EEFF] px-3 py-1.5 font-body text-xs font-semibold text-[#5B35B1]">
                    Documento por subir: {quickDocumentFile.name}
                  </span>
                )}
                {selectedExpenseIds.length === 0 &&
                  selectedDocumentIds.length === 0 &&
                  !quickExpenseAmount.trim() &&
                  !quickExpenseDescription.trim() &&
                  !quickDocumentFile && (
                    <span className="rounded-lg bg-white px-3 py-2 font-body text-xs text-[#7A8799]">
                      Todavia no agregas gasto ni documento a esta actividad.
                    </span>
                  )}
              </div>
            </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 border-t border-[#E2E8F0] px-6 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="rounded-xl border border-[#E2E8F0] px-4 py-3 font-body text-sm font-semibold text-gray700"
          >
            Cancelar
          </button>
          {!editingActivity && isCurrentUserAdmin && (
            <button
              type="button"
              onClick={() => void handleSave(true)}
              disabled={saving || !selectedPlace}
              className="rounded-xl border border-[#1E6FD9] bg-[#EEF4FF] px-4 py-3 font-body text-sm font-semibold text-[#1E6FD9] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Agregar como admin (directo)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave(false)}
            disabled={saving || !selectedPlace}
            className="rounded-xl bg-bluePrimary px-4 py-3 font-body text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando...' : editingActivity ? 'Guardar cambios' : 'Agregar actividad'}
          </button>
        </div>
      </div>

      <ActionModal
        open={scheduleConflictMessage !== null}
        title="Conflicto de horario"
        subtitle="No se puede guardar la actividad con esa hora."
        confirmLabel="Cambiar horario"
        onClose={() => setScheduleConflictMessage(null)}
        onConfirm={() => setScheduleConflictMessage(null)}
      >
        <p className="font-body text-sm leading-relaxed text-[#475569]">
          {scheduleConflictMessage}
        </p>
      </ActionModal>

      <ActionModal
        open={activeContextModal === 'expense'}
        title="Agregar gasto o comprobante"
        subtitle="Relaciona un gasto existente o crea uno nuevo, por ejemplo taxi, entradas o comida."
        confirmLabel={expenseModalTab === 'associate' ? 'Guardar seleccion' : 'Guardar gasto'}
        onClose={() => setActiveContextModal(null)}
        onConfirm={confirmExpenseModal}
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
          linkOptions.expenses.length === 0 ? (
            <p className="font-body text-sm text-[#64748B]">No hay gastos registrados para asociar.</p>
          ) : (
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
                    const selected = selectedExpenseIds.includes(expense.id)
                    return (
                      <button
                        key={expense.id}
                        type="button"
                        onClick={() => toggleExpense(expense.id)}
                        className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? 'border-[#1E6FD9] bg-[#1E6FD9] text-white' : 'border-[#D7DEEA] bg-white text-[#3D4A5C]'}`}
                        title={expense.subtitle ?? expense.label}
                      >
                        <span className="inline-block max-w-[240px] truncate align-bottom">{expense.label}</span>
                      </button>
                    )
                  })}
              </div>
            </div>
          )
        ) : (
          <ExpenseDraftForm
            amount={quickExpenseAmount}
            description={quickExpenseDescription}
            date={quickExpenseDate}
            category={quickExpenseCategory}
            paidBy={quickExpensePaidBy}
            splitType={quickExpenseSplitType}
            splitAmounts={quickExpenseSplitAmounts}
            selectedMemberIds={quickExpenseMemberIds}
            members={safeMemberOptions}
            onAmountChange={setQuickExpenseAmount}
            onDescriptionChange={setQuickExpenseDescription}
            onDateChange={setQuickExpenseDate}
            onCategoryChange={setQuickExpenseCategory}
            onPaidByChange={setQuickExpensePaidBy}
            onSplitTypeChange={setQuickExpenseSplitType}
            onSplitAmountChange={setQuickExpenseSplitAmount}
            onToggleMember={toggleQuickExpenseMember}
          />
        )}
      </ActionModal>

      <ActionModal
        open={activeContextModal === 'document'}
        title="Agregar gasto o comprobante"
        subtitle="Relaciona un comprobante existente o sube uno nuevo, por ejemplo ticket, reservacion o recibo."
        confirmLabel={documentModalTab === 'associate' ? 'Guardar seleccion' : 'Guardar documento'}
        onClose={() => setActiveContextModal(null)}
        onConfirm={confirmDocumentModal}
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
          linkOptions.documents.length === 0 ? (
            <p className="font-body text-sm text-[#64748B]">No hay documentos en la boveda para asociar.</p>
          ) : (
            <div className="space-y-3">
              <input
                value={documentFilter}
                onChange={(event) => setDocumentFilter(event.target.value)}
                placeholder="Filtrar documentos"
                className="w-full rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
              />
              <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto">
                {linkOptions.documents
                  .filter((document) => {
                    const filter = documentFilter.trim().toLowerCase()
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
                        className={`max-w-full rounded-full border px-3 py-1.5 font-body text-xs font-semibold ${selected ? 'border-[#7A4FD6] bg-[#7A4FD6] text-white' : 'border-[#D7DEEA] bg-white text-[#3D4A5C]'}`}
                        title={document.subtitle ?? document.label}
                      >
                        <span className="inline-block max-w-[240px] truncate align-bottom">{document.label}</span>
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
              onChange={(event) => setQuickDocumentFile(event.target.files?.[0] ?? null)}
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm text-[#3D4A5C] outline-none focus:border-[#7A4FD6]"
            />
            <select
              value={quickDocumentCategory}
              onChange={(event) => setQuickDocumentCategory(event.target.value as TripDocumentCategory)}
              className="rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
            >
              {(Object.keys(documentCategoryLabels) as TripDocumentCategory[]).map((category) => (
                <option key={category} value={category}>{documentCategoryLabels[category]}</option>
              ))}
            </select>
            <textarea
              value={quickDocumentNotes}
              onChange={(event) => setQuickDocumentNotes(event.target.value)}
              placeholder="Nota obligatoria del documento"
              rows={3}
              className="w-full resize-none rounded-xl border border-[#D7DEEA] bg-white px-3 py-2.5 font-body text-sm outline-none focus:border-[#7A4FD6]"
            />
          </div>
        )}
      </ActionModal>

      <ActionModal
        open={longRouteConfirmation !== null}
        title="Confirmar traslado largo"
        subtitle="La actividad seleccionada puede quedar demasiado lejos para el grupo."
        confirmLabel="Si, agregar de todos modos"
        confirmDisabled={saving}
        onClose={() => setLongRouteConfirmation(null)}
        onConfirm={() => {
          const pending = longRouteConfirmation
          setLongRouteConfirmation(null)
          if (pending) void handleSave(pending.asAdminDirect, true)
        }}
      >
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-red-100 text-red-700">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 8v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M12 17h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <path d="M10.3 4.1 2.6 17.4A2 2 0 0 0 4.3 20h15.4a2 2 0 0 0 1.7-2.6L13.7 4.1a2 2 0 0 0-3.4 0Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="font-body text-sm font-bold">
              {selectedPlace?.name || 'Este lugar'} esta a mas de 1 hora desde {routeOriginLabel}.
            </p>
            <p className="mt-1 font-body text-sm">
              {selectedPlace?.routeDurationText
                ? `Google estima aproximadamente ${selectedPlace.routeDurationText} de traslado.`
                : 'El traslado estimado supera el limite recomendado.'}
              {' '}Confirma solo si esta distancia tiene sentido para el itinerario.
            </p>
          </div>
        </div>
      </ActionModal>
    </div>
  )
}
