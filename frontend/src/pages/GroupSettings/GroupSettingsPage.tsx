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

type SettingsForm = {
  name: string
  destination: string
  startDate: string
  endDate: string
  maxMembers: string
  description: string
}

function buildForm(group: Group): SettingsForm {
  return {
    name: group.nombre || '',
    destination: group.destino || '',
    startDate: group.fecha_inicio || '',
    endDate: group.fecha_fin || '',
    maxMembers: group.maximo_miembros ? String(group.maximo_miembros) : '10',
    description: group.descripcion || '',
  }
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
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const groupId = searchParams.get('groupId') || group?.id || ''

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
        saveCurrentGroup(foundGroup)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el grupo')
      } finally {
        setLoading(false)
      }
    }

    loadGroup()
  }, [accessToken, groupId])

  const setField = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!accessToken || !group) return

    if (!form.name.trim()) {
      setError('El nombre del grupo es obligatorio')
      return
    }

    if (!form.destination.trim()) {
      setError('Selecciona un destino válido.')
      return
    }

    if (form.startDate && form.endDate && form.startDate > form.endDate) {
      setError('La fecha final no puede ser menor a la inicial')
      return
    }

    if (!form.maxMembers || Number(form.maxMembers) < 2) {
      setError('El máximo de miembros debe ser al menos 2.')
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
          fecha_inicio: form.startDate || undefined,
          fecha_fin: form.endDate || undefined,
          maximo_miembros: Number(form.maxMembers),
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
    if (!accessToken || !group) return

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
              onClick={() => navigate('/my-trips')}
              className="mt-4 bg-[#1E6FD9] text-white rounded-xl px-4 py-3 text-sm"
            >
              Volver a mis viajes
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
                <p className="font-body text-sm text-[#7A8799]">Edita la información principal del viaje</p>
              </div>
              <button
                onClick={() => navigate(`/grouppanel?groupId=${encodeURIComponent(group?.id || '')}`)}
                className="border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm text-[#1E0A4E]"
              >
                Volver al panel
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Nombre del grupo
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <DestinationSearch
                  value={form.destination}
                  onChange={(value) => setField('destination', value)}
                  token={accessToken}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setField('startDate', e.target.value)}
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
                  onChange={(e) => setField('endDate', e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Máximo de miembros
                </label>
                <input
                  type="number"
                  min={2}
                  value={form.maxMembers}
                  onChange={(e) => setField('maxMembers', e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide mb-1.5">
                  Descripción
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  rows={4}
                  className="w-full border border-[#E2E8F0] rounded-xl px-4 py-3 text-sm resize-none"
                />
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
            {success && <p className="mt-4 text-sm text-[#35C56A]">{success}</p>}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1E6FD9] text-white rounded-xl px-5 py-3 text-sm disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-red-200 p-6 shadow-sm">
            <h2 className="font-heading text-lg text-red-600 font-semibold">Zona de peligro</h2>
            <p className="font-body text-sm text-[#7A8799] mt-1">
              Eliminar el grupo borrará la configuración y la membresía asociada al grupo.
            </p>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="mt-4 bg-red-500 text-white rounded-xl px-5 py-3 text-sm disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar grupo'}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default GroupSettingsPage