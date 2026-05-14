import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../context/useAuth'
import {
  clearCurrentGroup,
  getCurrentGroup,
  groupsService,
  saveCurrentGroup,
} from '../../services/groups'
import type { Group } from '../../types/groups'
import { DestinationSearch } from '../../components/DestinationSearch/DestinationSearch'
import type { GeocodingResult } from '../../services/maps'

type SettingsForm = {
  name: string
  destination: string
  startDate: string
  endDate: string
  maxMembers: string
  description: string
  isPublic: boolean
}

function buildForm(group: Group): SettingsForm {
  return {
    name: group.nombre || '',
    destination: group.destino || '',
    startDate: group.fecha_inicio || '',
    endDate: group.fecha_fin || '',
    maxMembers: group.maximo_miembros ? String(group.maximo_miembros) : '10',
    description: group.descripcion || '',
    isPublic: group.es_publico === true,
  }
}

const GROUP_NAME_MAX_LENGTH = 60
const GROUP_DESCRIPTION_MAX_LENGTH = 300

const todayISO = () => {
  const now = new Date()
  const timezoneOffset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10)
}

function isClosedGroup(group?: Group | null) {
  return ['cerrado', 'archivado', 'finalizado'].includes(String(group?.estado ?? '').toLowerCase())
}

const addDaysISO = (date: string, days: number) => {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return ''
  parsed.setDate(parsed.getDate() + days)
  return parsed.toISOString().slice(0, 10)
}

const getValidationError = (form: SettingsForm) => {
  const maxMembers = Number(form.maxMembers)
  const today = todayISO()

  if (!form.name.trim()) return 'El nombre del grupo es obligatorio.'
  if (form.name.trim().length > GROUP_NAME_MAX_LENGTH) {
    return `El nombre del grupo permite máximo ${GROUP_NAME_MAX_LENGTH} caracteres.`
  }
  if (!form.destination.trim()) return 'Selecciona un destino válido.'
  if (form.description.trim().length > GROUP_DESCRIPTION_MAX_LENGTH) {
    return `La descripción permite máximo ${GROUP_DESCRIPTION_MAX_LENGTH} caracteres.`
  }
  if (form.startDate && form.startDate < today) {
    return 'La fecha de inicio no puede ser anterior a hoy.'
  }
  if (form.endDate && form.endDate < today) {
    return 'La fecha de fin no puede ser anterior a hoy.'
  }
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    return 'La fecha final debe ser posterior a la inicial.'
  }
  if (!Number.isInteger(maxMembers) || maxMembers < 1 || maxMembers > 50) {
    return 'El máximo de miembros debe estar entre 1 y 50.'
  }

  return ''
}

export function GroupSettingsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { accessToken, localUser } = useAuth()

  const [group, setGroup] = useState<Group | null>(getCurrentGroup())
  const [form, setForm] = useState<SettingsForm>({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    maxMembers: '10',
    description: '',
    isPublic: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [destinationData, setDestinationData] = useState<GeocodingResult | null>(null)

  const groupId = searchParams.get('groupId') || group?.id || ''
  const currentGroupFallback = getCurrentGroup()
  const effectiveGroup = group ?? currentGroupFallback
  const effectiveGroupId = String(group?.id ?? currentGroupFallback?.id ?? groupId ?? '')
  const formError = getValidationError(form)
  const minEndDate = form.startDate ? addDaysISO(form.startDate, 1) : todayISO()
  const isReadOnly = isClosedGroup(group)

  const goToGroupPanel = () => {
    if (!effectiveGroupId) {
      navigate('/my-trips')
      return
    }
    navigate(`/grouppanel?groupId=${encodeURIComponent(effectiveGroupId)}`)
  }

  const goToItinerary = () => {
    if (!effectiveGroupId) {
      navigate('/my-trips')
      return
    }
    navigate(`/dashboard?groupId=${encodeURIComponent(effectiveGroupId)}`, {
      state: {
        groupId: effectiveGroupId,
        switchingGroup: effectiveGroup ?? undefined,
      },
    })
  }

  useEffect(() => {
    if (!accessToken || !groupId) {
      setLoading(false)
      return
    }

    const loadGroup = async () => {
      try {
        setLoading(true)
        setError('')

        const history = await groupsService.getMyHistory(accessToken)
        const allGroups = [...history.activos, ...history.pasados].map((item) => item.grupos_viaje)
        const foundGroup = allGroups.find((item) => String(item.id) === String(groupId)) || null

        if (!foundGroup) {
          throw new Error('No se encontró el grupo solicitado')
        }

        setGroup(foundGroup)
        setForm(buildForm(foundGroup))
        setDestinationData(null)
        saveCurrentGroup(foundGroup)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el grupo')
      } finally {
        setLoading(false)
      }
    }

    loadGroup()
  }, [accessToken, groupId])

  const setField = (key: keyof SettingsForm, value: string | boolean) => {
    if (isReadOnly) return
    let nextValue = value

    if (typeof value === 'string') {
      if (key === 'name') nextValue = value.slice(0, GROUP_NAME_MAX_LENGTH)
      if (key === 'description') nextValue = value.slice(0, GROUP_DESCRIPTION_MAX_LENGTH)
      if (key === 'maxMembers') nextValue = value.replace(/[^0-9]/g, '')
    }

    setForm((prev) => {
      const next = { ...prev, [key]: nextValue }

      if (key === 'startDate' && typeof nextValue === 'string' && next.endDate && next.endDate <= nextValue) {
        next.endDate = ''
      }

      return next
    })
    setError('')
    setSuccess('')
  }

  const handleSave = async () => {
    if (!accessToken || !group || isReadOnly) return

    const validationError = getValidationError(form)
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError('')
      setSuccess('')

      const response = await groupsService.updateGroup(
        group.id,
        {
          nombre: form.name.trim(),
          descripcion: form.description.trim() || undefined,
          destino: form.destination.trim() || undefined,
          destino_latitud: destinationData?.latitude ?? group.destino_latitud ?? null,
          destino_longitud: destinationData?.longitude ?? group.destino_longitud ?? null,
          destino_place_id: destinationData?.placeId ?? group.destino_place_id ?? null,
          destino_formatted_address:
            destinationData?.formattedAddress ?? group.destino_formatted_address ?? null,
          fecha_inicio: form.startDate || undefined,
          fecha_fin: form.endDate || undefined,
          maximo_miembros: Number(form.maxMembers),
          es_publico: form.isPublic,
        },
        accessToken
      )

      setGroup(response.group)
      saveCurrentGroup(response.group)
      setSuccess('Cambios guardados correctamente')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!accessToken || !group || isReadOnly) return

    const confirmed = window.confirm(`¿Seguro que quieres eliminar el grupo "${group.nombre}"?`)
    if (!confirmed) return

    try {
      setDeleting(true)
      setError('')
      await groupsService.deleteGroup(group.id, accessToken)
      clearCurrentGroup()
      navigate('/my-trips')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el grupo')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <AppLayout showTripSelector={false} showRightPanel={false}>
        <div className="flex-1 flex items-center justify-center">
          <p className="font-body text-sm text-[#7A8799]">Cargando configuración...</p>
        </div>
      </AppLayout>
    )
  }

  if (error && !group) {
    return (
      <AppLayout showTripSelector={false} showRightPanel={false}>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 max-w-md w-full text-center">
            <h2 className="font-heading text-xl text-[#1E0A4E] mb-2">No se pudo abrir configuración</h2>
            <p className="font-body text-sm text-red-500">{error}</p>
            <button
              onClick={effectiveGroupId ? goToItinerary : () => navigate('/my-trips')}
              className="mt-4 bg-[#1E6FD9] text-white rounded-xl px-4 py-3 text-sm"
            >
              {effectiveGroupId ? 'Volver al itinerario' : 'Volver a mis viajes'}
            </button>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout
      trip={{
        name: group?.nombre || 'Grupo',
        subtitle: group?.destino || 'Sin destino',
        dates: `${group?.fecha_inicio || '—'} → ${group?.fecha_fin || '—'}`,
        people: group?.maximo_miembros ? `${group.maximo_miembros} máx.` : 'Sin límite',
      }}
      user={{
        name: localUser?.nombre || 'Usuario',
        role: 'Admin',
        initials: (localUser?.nombre || 'U').slice(0, 2).toUpperCase(),
        color: '#7A4FD6',
      }}
      showTripSelector={false}
      showRightPanel={false}
    >
      <div className="flex-1 overflow-y-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-5">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h1 className="font-heading font-bold text-[#1E0A4E] text-2xl">Configuración del grupo</h1>
                <p className="font-body text-sm text-[#7A8799]">{isReadOnly ? 'Consulta la información del viaje cerrado' : 'Edita la información principal del viaje'}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={goToGroupPanel}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] shadow-sm transition hover:bg-[#F8FAFC]"
                >
                  Volver al panel
                </button>
                <button
                  onClick={goToItinerary}
                  className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm font-semibold text-[#1E0A4E] shadow-sm transition hover:bg-[#F8FAFC]"
                >
                  Ir al itinerario
                </button>
              </div>
            </div>

            {isReadOnly && (
              <div className="mb-5 rounded-2xl border border-[#CBD5E1] bg-[#F8FAFC] px-4 py-3">
                <p className="font-heading text-sm font-semibold text-[#1E0A4E]">Viaje cerrado · configuración en modo lectura</p>
                <p className="mt-1 font-body text-sm leading-relaxed text-[#64748B]">
                  Este viaje ya finalizó. La información se conserva para consulta, pero no se puede editar ni eliminar.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Nombre del grupo
                </label>
                <input
                  value={form.name}
                  maxLength={GROUP_NAME_MAX_LENGTH}
                  onChange={(e) => setField('name', e.target.value)}
                  disabled={isReadOnly}
                  className={`w-full border rounded-xl px-4 py-3 text-sm ${form.name.trim().length > GROUP_NAME_MAX_LENGTH ? 'border-red-400' : 'border-[#E2E8F0]'}`}
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-[#1E0A4E]/40">Máximo {GROUP_NAME_MAX_LENGTH} caracteres.</p>
                  <p className={`text-[11px] ${form.name.length >= GROUP_NAME_MAX_LENGTH ? 'text-red-500' : 'text-[#1E0A4E]/40'}`}>
                    {form.name.length}/{GROUP_NAME_MAX_LENGTH}
                  </p>
                </div>
              </div>

              <div className="md:col-span-2">
                <DestinationSearch
                  value={form.destination}
                  onChange={(value, result) => {
                    setField('destination', value)
                    setDestinationData(result ?? null)
                  }}
                  token={accessToken}
                  disabled={isReadOnly}
                  lockedValue
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  min={todayISO()}
                  onChange={(e) => setField('startDate', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={form.endDate}
                  min={minEndDate}
                  onChange={(e) => setField('endDate', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Máximo de miembros
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={form.maxMembers}
                  onKeyDown={(e) => {
                    if (["-", "+", "e", "E", "."].includes(e.key)) e.preventDefault()
                  }}
                  onWheel={(e) => e.currentTarget.blur()}
                  onChange={(e) => setField('maxMembers', e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
                <p className="mt-1.5 text-[11px] text-[#1E0A4E]/40">
                  Mínimo 1. El viaje puede iniciar solo con el creador y después aceptar más integrantes.
                </p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-heading text-sm font-semibold text-[#1E0A4E]">Grupo público</h3>
                    <p className="mt-1 font-body text-xs text-[#7A8799]">
                      Activado: cualquiera con el código entra sin aprobación. Desactivado: el admin aprueba solicitudes.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isPublic}
                    onClick={() => setField('isPublic', !form.isPublic)}
                    disabled={isReadOnly}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 ${
                      form.isPublic ? 'bg-[#1E6FD9]' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                        form.isPublic ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  maxLength={GROUP_DESCRIPTION_MAX_LENGTH}
                  onChange={(e) => setField('description', e.target.value)}
                  disabled={isReadOnly}
                  rows={4}
                  className={`w-full border rounded-xl px-4 py-3 text-sm resize-none ${form.description.trim().length > GROUP_DESCRIPTION_MAX_LENGTH ? 'border-red-400' : 'border-[#E2E8F0]'}`}
                />
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-[#1E0A4E]/40">Máximo {GROUP_DESCRIPTION_MAX_LENGTH} caracteres.</p>
                  <p className={`text-[11px] ${form.description.length >= GROUP_DESCRIPTION_MAX_LENGTH ? 'text-red-500' : 'text-[#1E0A4E]/40'}`}>
                    {form.description.length}/{GROUP_DESCRIPTION_MAX_LENGTH}
                  </p>
                </div>
              </div>
            </div>

            {formError && !error && (
              <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                {formError}
              </p>
            )}
            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            {success && <p className="mt-4 text-sm text-[#35C56A]">{success}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={isReadOnly || saving || Boolean(formError)}
                title={formError || undefined}
                className="bg-[#1E6FD9] text-white rounded-xl px-5 py-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReadOnly ? 'Solo lectura' : (saving ? 'Guardando...' : 'Guardar cambios')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
            <h2 className="font-heading text-lg text-red-600 font-semibold">Zona de peligro</h2>
            <p className="font-body text-sm text-[#7A8799] mt-1">
              {isReadOnly ? 'Este viaje está cerrado y no puede eliminarse desde el modo historial.' : 'Eliminar el grupo borrará la configuración y la membresía asociada al grupo.'}
            </p>
            <button
              onClick={handleDelete}
              disabled={isReadOnly || deleting}
              className="mt-4 bg-red-500 text-white rounded-xl px-5 py-3 text-sm disabled:opacity-50"
            >
              {isReadOnly ? 'No disponible en historial' : (deleting ? 'Eliminando...' : 'Eliminar grupo')}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default GroupSettingsPage
