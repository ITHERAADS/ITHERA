import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../../components/layout/AppLayout'
import { useAuth } from '../../context/useAuth'
import { groupsService, saveCurrentGroup } from '../../services/groups'
import { DestinationSearch } from '../../components/DestinationSearch/DestinationSearch'
import type { GeocodingResult } from '../../services/maps'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  id: string
  email: string
  name?: string
}

interface FormData {
  name: string
  destination: string
  startDate: string
  endDate: string
  maxMembers: string
  totalBudget: string
  description: string
  isPublic: boolean
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  hint,
  maxLength,
  multiline = false,
}: {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  maxLength?: number
  multiline?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">{label}</label>
      {multiline ? (
        <textarea
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={`w-full resize-none font-body text-sm text-[#1E0A4E] placeholder-gray-400 border rounded-xl px-4 py-3 outline-none transition-all duration-200 bg-white
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
            }
          `}
        />
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          maxLength={maxLength}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full font-body text-sm text-[#1E0A4E] placeholder-gray-400 border rounded-xl px-4 py-3 outline-none transition-all duration-200 bg-white
            ${error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
            }
          `}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        {hint && !error && <p className="font-body text-[11px] text-[#1E0A4E]/40">{hint}</p>}
        {maxLength !== undefined && (
          <p className={`font-body text-[11px] ${value.length >= maxLength ? 'text-red-500' : 'text-[#1E0A4E]/40'}`}>
            {value.length}/{maxLength}
          </p>
        )}
      </div>
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
    </div>
  )
}

function MembersSection({
  members,
  onAdd,
  onRemove,
}: {
  members: Member[]
  onAdd: (m: Member) => void
  onRemove: (id: string) => void
}) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const handleAdd = () => {
    if (!email.trim()) return setError('Ingresa un correo electrónico.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Correo inválido.')
    if (members.find((m) => m.email === email)) return setError('Ya fue agregado.')
    onAdd({ id: crypto.randomUUID(), email })
    setEmail('')
    setError('')
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">
        Invitar miembros (opcional)
      </label>

      <div className="flex gap-2">
        <input
          type="email"
          placeholder="correo@ejemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className={`flex-1 font-body text-sm text-[#1E0A4E] placeholder-gray-400 border rounded-xl px-4 py-3 outline-none transition-all duration-200 bg-white
            ${error ? 'border-red-400' : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'}
          `}
        />
        <button
          onClick={handleAdd}
          type="button"
          className="font-body text-sm font-semibold bg-[#1E6FD9] text-white rounded-xl px-4 py-3 hover:bg-[#1a5fc2] transition-colors whitespace-nowrap flex items-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Agregar
        </button>
      </div>
      {error && <p className="font-body text-xs text-red-500">{error}</p>}

      {members.length > 0 && (
        <div className="space-y-2">
          {members.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between bg-[#F0EEF8] rounded-xl px-4 py-2.5 border border-[#E2E8F0]"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1E6FD9]/10 flex items-center justify-center">
                  <span className="font-heading font-bold text-[#1E6FD9] text-[11px] uppercase">
                    {m.email[0]}
                  </span>
                </div>
                <span className="font-body text-sm text-[#1E0A4E]">{m.email}</span>
              </div>
              <button
                onClick={() => onRemove(m.id)}
                className="text-[#7A8799] hover:text-red-500 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionLabel({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 bg-[#1E0A4E] rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <h3 className="font-heading font-semibold text-[#1E0A4E] text-sm">{title}</h3>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function CreateGroupPage() {
  const { accessToken, localUser } = useAuth()
  const [serverError, setServerError] = useState('')
  const [createdGroupId, setCreatedGroupId] = useState('')
  const [destinationData, setDestinationData] = useState<GeocodingResult | null>(null)
  const navigate = useNavigate()
  const [form, setForm] = useState<FormData>({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    maxMembers: '10',
    totalBudget: '',
    description: '',
    isPublic: false,
  })
  const [members, setMembers] = useState<Member[]>([])
  const [errors, setErrors] = useState<Partial<FormData>>({})
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState(false)
  const [groupCode, setGroupCode] = useState('')
  const [invitedCount, setInvitedCount] = useState(0)

  const set = (key: keyof FormData) => (val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }))

  const validate = () => {
    const e: Partial<FormData> = {}
    if (!form.name.trim()) e.name = 'El nombre del grupo es requerido.'
    else if (form.name.trim().length > 60) e.name = 'Máximo 60 caracteres permitidos.'
    if (!form.destination) e.destination = 'Selecciona un destino.'
    if (form.description.trim().length > 300) e.description = 'Máximo 300 caracteres permitidos.'
    if (!Number.isFinite(Number(form.maxMembers)) || Number(form.maxMembers) < 1) {
      e.maxMembers = 'El máximo de miembros debe ser al menos 1.'
    } else if (Number(form.maxMembers) > 50) {
      e.maxMembers = 'El máximo de miembros permitido es 50.'
    }
    if (!form.startDate) e.startDate = 'Fecha de inicio requerida.'
    if (!form.endDate) e.endDate = 'Fecha de regreso requerida.'
    if (!form.totalBudget || Number(form.totalBudget) <= 0) e.totalBudget = 'Define un presupuesto mayor a cero.'
    if (form.startDate && form.endDate && form.startDate > form.endDate)
      e.endDate = 'La fecha de regreso debe ser después de la de inicio.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleCreate = async () => {
    if (!validate()) return

    if (!form.totalBudget || Number(form.totalBudget) <= 0) {
      setErrors((prev) => ({ ...prev, totalBudget: 'Define un presupuesto mayor a cero.' }))
      return
    }

    if (!accessToken) {
      setServerError('Tu sesión expiró. Vuelve a iniciar sesión.')
      return
    }

    try {
      setServerError('')
      setLoading(true)

      const response = await groupsService.createGroup(
          {
            nombre: form.name.trim(),
            descripcion: form.description.trim() || undefined,
            destino: form.destination || undefined,
            destino_latitud: destinationData?.latitude ?? null,
            destino_longitud: destinationData?.longitude ?? null,
            destino_place_id: destinationData?.placeId ?? null,
            destino_formatted_address: destinationData?.formattedAddress ?? null,
            fecha_inicio: form.startDate || undefined,
            fecha_fin: form.endDate || undefined,
            maximo_miembros: Number(form.maxMembers),
            presupuesto_total: Number(form.totalBudget),
          },
        accessToken
      )

      saveCurrentGroup(response.group)
      setGroupCode(response.group.codigo_invitacion)
      setCreatedGroupId(response.group.id)

      if (members.length > 0) {
        const emails = members.map((member) => member.email)

        const invitationsResponse = await groupsService.sendInvitations(
          response.group.id,
          emails,
          accessToken
        )

        setInvitedCount(invitationsResponse.invitations.length)
      }

      setCreated(true)

    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'No se pudo crear el grupo')
    } finally {
      setLoading(false)
    }
  }

  // ── Success State ────────────────────────────────────────────────────────
  if (created) {
    return (
      <AppLayout
        user={{
          name: localUser?.nombre || 'Usuario',
          role: 'Organizador',
          initials: (localUser?.nombre || 'U').slice(0, 2).toUpperCase(),
          color: '#1E6FD9',
        }}
        showTripSelector={false}
        showRightPanel={false}
      >
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div
            className="fixed inset-0 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(30,10,78,0.04) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative w-full max-w-md">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-8 text-center">
              <div className="w-16 h-16 bg-[#35C56A]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#35C56A]">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="font-heading font-bold text-[#1E0A4E] text-2xl mb-2">¡Grupo creado!</h2>
              <p className="font-body text-sm text-[#7A8799] mb-6">
                {invitedCount > 0
                ? `Grupo creado correctamente. También se generaron ${invitedCount} invitación(es) por correo.`
                : 'Comparte este código con tu equipo para que se unan al viaje.'}
              </p>
              <div className="bg-[#1E0A4E] rounded-2xl p-5 mb-6">
                <p className="font-body text-xs text-white/40 uppercase tracking-wider mb-2">Código del grupo</p>
                <p className="font-heading font-bold text-white text-2xl tracking-widest">{groupCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => navigator.clipboard.writeText(groupCode)}
                  className="font-body text-sm border border-[#E2E8F0] text-[#3D4A5C] rounded-xl px-4 py-3 hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Copiar código
                </button>
                <button
                  onClick={() => navigate(`/dashboard?groupId=${encodeURIComponent(createdGroupId)}`)}
                  className="font-body font-medium text-sm bg-[#1E6FD9] text-white rounded-xl px-4 py-3 hover:opacity-90 transition-opacity flex items-center justify-center"
                >
                  Ir al grupo →
                </button>

              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <AppLayout
      user={{
        name: localUser?.nombre || 'Usuario',
        role: 'Organizador',
        initials: (localUser?.nombre || 'U').slice(0, 2).toUpperCase(),
        color: '#1E6FD9',
      }}
      showTripSelector={false}
      showRightPanel={false}
    >
      <div className="flex-1 overflow-y-auto">
      <div
        className="fixed inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(30,10,78,0.04) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="relative max-w-2xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 font-body text-sm text-[#1E6FD9] hover:underline mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Volver
        </button>
        <div className="mb-8">
          <h1 className="font-heading font-bold text-[#1E0A4E] text-3xl mb-2">Crear nuevo grupo</h1>
          <p className="font-body text-sm text-[#7A8799]">
            Configura tu viaje grupal y empieza a planear juntos.
          </p>
        </div>

        <div className="space-y-4">
          {/* Section 1: Basic Info */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <SectionLabel
              title="Información básica"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
            />
            <div className="space-y-4">
              <InputField
                label="Nombre del grupo"
                placeholder="Ej: Cancún Squad 2025 🌴"
                value={form.name}
                onChange={set('name') as (v: string) => void}
                error={errors.name}
                hint="Elige un nombre que identifique a tu grupo"
                maxLength={60}
              />
              <DestinationSearch
                value={form.destination}
                onChange={(value, result) => {
                  set('destination')(value)
                  setDestinationData(result ?? null)
                }}
                error={errors.destination}
                token={accessToken}
              />
              <InputField
                label="Descripción (opcional)"
                placeholder="¿De qué trata este viaje?"
                value={form.description}
                onChange={set('description') as (v: string) => void}
                error={errors.description}
                multiline
                maxLength={300}
                hint="Describe brevemente el propósito del viaje"
              />
            </div>
          </div>

          {/* Section 2: Dates & Members */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <SectionLabel
              title="Fechas y capacidad"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                  <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
                </svg>
              }
            />
            <div className="grid grid-cols-2 gap-4">
              <InputField
                label="Fecha de salida"
                type="date"
                placeholder=""
                value={form.startDate}
                onChange={set('startDate') as (v: string) => void}
                error={errors.startDate}
              />
              <InputField
                label="Fecha de regreso"
                type="date"
                placeholder=""
                value={form.endDate}
                onChange={set('endDate') as (v: string) => void}
                error={errors.endDate}
              />
            </div>
            <div className="mt-4">
              <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide block mb-1.5">
                Máximo de miembros
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={form.maxMembers}
                  onChange={(e) => set('maxMembers')(e.target.value)}
                  className="flex-1 accent-[#1E6FD9]"
                />
                <div className="w-14 h-10 bg-[#F4F6F8] border border-[#E2E8F0] rounded-xl flex items-center justify-center">
                  <span className="font-heading font-bold text-[#1E0A4E] text-sm">{form.maxMembers}</span>
                </div>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <p className="font-body text-[11px] text-[#1E0A4E]/40">
                  Puedes crear el viaje solo para ti. Después podrás invitar a más integrantes si lo necesitas.
                </p>
                {errors.maxMembers && (
                  <p className="font-body text-xs text-red-500 text-right">{errors.maxMembers}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <InputField
                label="Presupuesto total (MXN)"
                type="number"
                placeholder="Ej: 25000"
                value={form.totalBudget}
                onChange={set('totalBudget') as (v: string) => void}
                error={errors.totalBudget}
                hint="Requisito obligatorio para iniciar el viaje"
              />
            </div>
          </div>

          {/* Section 3: Members */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <SectionLabel
              title="Invitar al grupo"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              }
            />
            <MembersSection
              members={members}
              onAdd={(m) => setMembers((prev) => [...prev, m])}
              onRemove={(id) => setMembers((prev) => prev.filter((m) => m.id !== id))}
            />
          </div>

          {/* Section 4: Privacy */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-heading font-semibold text-[#1E0A4E] text-sm mb-0.5">
                  Grupo público
                </h3>
                <p className="font-body text-xs text-[#7A8799]">
                  Cualquiera con el código puede unirse sin aprobación
                </p>
              </div>
              <button
                role="switch"
                aria-checked={form.isPublic}
                onClick={() => set('isPublic')(!form.isPublic)}
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

          {/* Create Button */}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full font-body font-medium text-sm bg-[#1E6FD9] text-white rounded-xl px-6 py-4 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                Creando grupo...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Crear grupo
              </>
            )}
          </button>
          {serverError && (
            <p className="mt-3 font-body text-sm text-red-500 text-center">{serverError}</p>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  )
}

export default CreateGroupPage
