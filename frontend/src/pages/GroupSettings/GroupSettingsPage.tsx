import { useState } from 'react'
import { AppLayout } from '../../components/layout/AppLayout'

// ── Types ─────────────────────────────────────────────────────────────────────
interface Member {
  id: string
  name: string
  email: string
  role: 'admin' | 'member'
  avatar: string
}

interface GroupSettings {
  name: string
  destination: string
  startDate: string
  endDate: string
  maxMembers: string
  description: string
  isPublic: boolean
  allowMemberInvite: boolean
  currency: string
}

// ── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK_MEMBERS: Member[] = [
  { id: '1', name: 'Sofía Ramírez', email: 'sofia@ejemplo.com', role: 'admin', avatar: '#7A4FD6' },
  { id: '2', name: 'Carlos Herrera', email: 'carlos@ejemplo.com', role: 'member', avatar: '#1E6FD9' },
  { id: '3', name: 'Ana Martínez', email: 'ana@ejemplo.com', role: 'member', avatar: '#35C56A' },
  { id: '4', name: 'Miguel López', email: 'miguel@ejemplo.com', role: 'member', avatar: '#F59E0B' },
]

const CURRENCIES = ['MXN', 'USD', 'EUR', 'CAD']
const DESTINATIONS = [
  'Cancún, México', 'Ciudad de México', 'Oaxaca, México', 'Los Cabos, México',
  'Puerto Vallarta, México', 'Tulum, México', 'Guadalajara, México',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E8F0] shadow-sm p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 bg-[#1E0A4E] rounded-xl flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="font-heading font-semibold text-[#1E0A4E] text-sm">{title}</h3>
        {subtitle && <p className="font-body text-xs text-[#7A8799] mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function InputField({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  disabled,
}: {
  label: string
  type?: string
  placeholder: string
  value: string
  onChange?: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className={`w-full font-body text-sm text-[#1E0A4E] placeholder-gray-400 border rounded-xl px-4 py-3 outline-none transition-all duration-200
          ${disabled
            ? 'bg-[#F8FAFC] border-[#E2E8F0] cursor-not-allowed text-[#1E0A4E]/40'
            : 'bg-white border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
          }
        `}
      />
    </div>
  )
}

function Toggle({
  value,
  onChange,
  label,
  description,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="font-body text-sm text-[#1E0A4E] font-medium">{label}</p>
        {description && <p className="font-body text-xs text-[#7A8799] mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 ${
          value ? 'bg-[#1E6FD9]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function MemberRow({
  member,
  onRemove,
  onChangeRole,
  isSelf,
}: {
  member: Member
  onRemove: (id: string) => void
  onChangeRole: (id: string, role: 'admin' | 'member') => void
  isSelf: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex items-center gap-3 py-3 border-b border-[#F4F6F8] last:border-0 relative">
      {/* Avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm shrink-0"
        style={{ backgroundColor: member.avatar }}
      >
        {member.name[0]}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm text-[#1E0A4E] font-medium truncate">
          {member.name} {isSelf && <span className="text-[#7A8799] font-normal">(tú)</span>}
        </p>
        <p className="font-body text-xs text-[#7A8799] truncate">{member.email}</p>
      </div>

      {/* Role badge */}
      <span
        className={`font-body text-[10px] font-medium px-2.5 py-1 rounded-full border ${
          member.role === 'admin'
            ? 'bg-[#1E0A4E]/5 border-[#1E0A4E]/15 text-[#1E0A4E]'
            : 'bg-[#F4F6F8] border-[#E2E8F0] text-[#7A8799]'
        }`}
      >
        {member.role === 'admin' ? 'Admin' : 'Miembro'}
      </span>

      {/* Actions */}
      {!isSelf && (
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-lg hover:bg-[#F4F6F8] flex items-center justify-center text-[#7A8799] hover:text-[#1E0A4E] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="currentColor" />
              <circle cx="12" cy="12" r="1.5" fill="currentColor" />
              <circle cx="12" cy="19" r="1.5" fill="currentColor" />
            </svg>
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-20 overflow-hidden min-w-[160px]">
                <button
                  onClick={() => { onChangeRole(member.id, member.role === 'admin' ? 'member' : 'admin'); setMenuOpen(false) }}
                  className="w-full font-body text-xs text-[#1E0A4E] px-4 py-2.5 hover:bg-[#F8FAFC] text-left flex items-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  {member.role === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                </button>
                <button
                  onClick={() => { onRemove(member.id); setMenuOpen(false) }}
                  className="w-full font-body text-xs text-red-500 px-4 py-2.5 hover:bg-red-50 text-left flex items-center gap-2"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <line x1="17" y1="8" x2="23" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="23" y1="8" x2="17" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Eliminar del grupo
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Danger Zone ───────────────────────────────────────────────────────────────
function DangerZone({ onDelete }: { onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [input, setInput] = useState('')
  const GROUP_NAME = 'Cancún Squad 2025'

  return (
    <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h3 className="font-heading font-semibold text-red-600 text-sm">Zona de peligro</h3>
          <p className="font-body text-xs text-[#7A8799] mt-0.5">Estas acciones son irreversibles.</p>
        </div>
      </div>

      {!confirming ? (
        <div className="flex items-center justify-between bg-red-50 rounded-xl p-4 border border-red-100">
          <div>
            <p className="font-body text-sm text-[#1E0A4E] font-medium">Eliminar grupo</p>
            <p className="font-body text-xs text-[#7A8799]">Se eliminarán el itinerario, presupuesto y todos los datos.</p>
          </div>
          <button
            onClick={() => setConfirming(true)}
            className="font-body text-xs font-medium text-red-600 border border-red-300 rounded-lg px-4 py-2 hover:bg-red-100 transition-colors whitespace-nowrap ml-4"
          >
            Eliminar grupo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-50 rounded-xl p-4 border border-red-200">
            <p className="font-body text-sm text-red-700 mb-3">
              Escribe el nombre del grupo para confirmar:{' '}
              <span className="font-medium">{GROUP_NAME}</span>
            </p>
            <input
              type="text"
              placeholder={GROUP_NAME}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full font-body text-sm text-[#1E0A4E] border border-red-300 rounded-xl px-4 py-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 bg-white"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setConfirming(false); setInput('') }}
              className="flex-1 font-body text-sm border border-[#E2E8F0] text-[#1E0A4E]/60 rounded-xl py-3 hover:border-[#1E0A4E] transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => input === GROUP_NAME && onDelete()}
              disabled={input !== GROUP_NAME}
              className="flex-1 font-body text-sm font-medium bg-red-500 text-white rounded-xl py-3 hover:bg-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirmar eliminación
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Save Toast ────────────────────────────────────────────────────────────────
function SaveToast({ visible }: { visible: boolean }) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1E0A4E] text-white font-body text-sm px-5 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <polyline points="20 6 9 17 4 12" stroke="#35C56A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Cambios guardados
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export function GroupSettingsPage() {
  const [settings, setSettings] = useState<GroupSettings>({
    name: 'Cancún Squad 2025',
    destination: 'Cancún, México',
    startDate: '2025-07-10',
    endDate: '2025-07-17',
    maxMembers: '12',
    description: 'El viaje épico del año con toda la crew 🌴',
    isPublic: false,
    allowMemberInvite: true,
    currency: 'MXN',
  })
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS)
  const [saving, setSaving] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'advanced'>('general')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteError, setInviteError] = useState('')

  const set = (key: keyof GroupSettings) => (val: string | boolean) =>
    setSettings((s) => ({ ...s, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 1000))
    setSaving(false)
    setToastVisible(true)
    setTimeout(() => setToastVisible(false), 3000)
  }

  const handleRemoveMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  const handleChangeRole = (id: string, role: 'admin' | 'member') => {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, role } : m)))
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return setInviteError('Ingresa un correo.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) return setInviteError('Correo inválido.')
    setInviteError('')
    setInviteEmail('')
    // In a real app: send invite
  }

  const TABS = [
    { id: 'general', label: 'General' },
    { id: 'members', label: `Miembros (${members.length})` },
    { id: 'advanced', label: 'Avanzado' },
  ] as const

  return (
    <AppLayout
      trip={{ name: settings.name, subtitle: settings.destination, dates: '10–17 Jul', people: `${members.length} personas` }}
      user={{ name: 'Bryan A.', role: 'Admin', initials: 'BA', color: '#7A4FD6' }}
      showTripSelector={false}
      centerTitle={settings.name}
      showRightPanel={false}
    >
      <div className="flex-1 overflow-y-auto">
      <div className="relative max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-8">
          <div>
            <h1 className="font-heading font-bold text-[#1E0A4E] text-xl">Configuración del grupo</h1>
            <p className="font-body text-xs text-[#7A8799]">{settings.name}</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto font-body font-medium text-sm bg-[#1E6FD9] text-white rounded-xl px-5 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            )}
            Guardar
          </button>
        </div>

        {/* Group Code Banner */}
        <div className="bg-[#1E0A4E] rounded-2xl p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="font-body text-xs text-white/40 uppercase tracking-wider mb-1">Código del grupo</p>
            <p className="font-heading font-bold text-white text-xl tracking-widest">ITHERA-K7X2M</p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText('ITHERA-K7X2M')}
            className="font-body text-xs border border-white/20 text-white/70 rounded-lg px-3 py-2 hover:bg-white/10 transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Copiar
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#E2E8F0] rounded-xl p-1 mb-5 shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 font-body text-sm py-2.5 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-[#1E0A4E] text-white font-medium shadow-sm'
                  : 'text-[#7A8799] hover:text-[#1E0A4E]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab: General */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <SectionCard>
              <SectionHeader
                title="Información del viaje"
                subtitle="Datos principales del grupo"
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
                  placeholder="Nombre del grupo"
                  value={settings.name}
                  onChange={set('name') as (v: string) => void}
                />
                <div>
                  <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide block mb-1.5">Destino</label>
                  <select
                    value={settings.destination}
                    onChange={(e) => set('destination')(e.target.value)}
                    className="w-full font-body text-sm text-[#1E0A4E] border border-[#E2E8F0] rounded-xl px-4 py-3 outline-none focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10 bg-white"
                  >
                    {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <InputField
                  label="Descripción"
                  placeholder="Descripción del grupo"
                  value={settings.description}
                  onChange={set('description') as (v: string) => void}
                />
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                title="Fechas del viaje"
                subtitle="Cuándo sale y regresa el grupo"
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
                  label="Salida"
                  type="date"
                  placeholder=""
                  value={settings.startDate}
                  onChange={set('startDate') as (v: string) => void}
                />
                <InputField
                  label="Regreso"
                  type="date"
                  placeholder=""
                  value={settings.endDate}
                  onChange={set('endDate') as (v: string) => void}
                />
              </div>
            </SectionCard>

            <SectionCard>
              <SectionHeader
                title="Presupuesto"
                subtitle="Moneda para el seguimiento de gastos"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                    <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
              <div className="flex gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => set('currency')(c)}
                    className={`flex-1 font-body text-sm py-2.5 rounded-xl border transition-all duration-200 ${
                      settings.currency === c
                        ? 'bg-[#1E0A4E] text-white border-[#1E0A4E] font-medium'
                        : 'text-[#7A8799] border-[#E2E8F0] hover:border-[#1E0A4E]/30 hover:text-[#1E0A4E]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        )}

        {/* Tab: Members */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Invite */}
            <SectionCard>
              <SectionHeader
                title="Invitar miembros"
                subtitle="Agrega personas por correo electrónico"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  className={`flex-1 font-body text-sm text-[#1E0A4E] placeholder-gray-400 border rounded-xl px-4 py-3 outline-none transition-all duration-200 bg-white ${
                    inviteError ? 'border-red-400' : 'border-[#E2E8F0] focus:border-[#1E6FD9] focus:ring-2 focus:ring-[#1E6FD9]/10'
                  }`}
                />
                <button
                  onClick={handleInvite}
                  className="font-body text-sm font-semibold bg-[#1E6FD9] text-white rounded-xl px-4 py-3 hover:bg-[#1a5fc2] transition-colors whitespace-nowrap"
                >
                  Invitar
                </button>
              </div>
              {inviteError && <p className="font-body text-xs text-red-500 mt-2">{inviteError}</p>}
            </SectionCard>

            {/* Members list */}
            <SectionCard>
              <SectionHeader
                title={`Miembros del grupo (${members.length})`}
                subtitle="Gestiona roles y accesos"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
              <div>
                {members.map((m) => (
                  <MemberRow
                    key={m.id}
                    member={m}
                    isSelf={m.id === '1'}
                    onRemove={handleRemoveMember}
                    onChangeRole={handleChangeRole}
                  />
                ))}
              </div>
            </SectionCard>

            {/* Capacity */}
            <SectionCard>
              <label className="font-body text-xs font-semibold text-[#1E0A4E]/60 uppercase tracking-wide block mb-3">
                Capacidad máxima
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={members.length}
                  max={50}
                  value={settings.maxMembers}
                  onChange={(e) => set('maxMembers')(e.target.value)}
                  className="flex-1 accent-[#1E6FD9]"
                />
                <div className="w-14 h-10 bg-[#F4F6F8] border border-[#E2E8F0] rounded-xl flex items-center justify-center">
                  <span className="font-heading font-bold text-[#1E0A4E] text-sm">{settings.maxMembers}</span>
                </div>
              </div>
              <p className="font-body text-xs text-[#7A8799] mt-2">
                {members.length} de {settings.maxMembers} lugares ocupados
              </p>
              {/* Progress bar */}
              <div className="mt-2 h-1.5 bg-[#F4F6F8] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1E6FD9] rounded-full transition-all"
                  style={{ width: `${(members.length / parseInt(settings.maxMembers)) * 100}%` }}
                />
              </div>
            </SectionCard>
          </div>
        )}

        {/* Tab: Advanced */}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <SectionCard>
              <SectionHeader
                title="Permisos y privacidad"
                subtitle="Controla quién puede hacer qué en el grupo"
                icon={
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-white">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                }
              />
              <div className="divide-y divide-[#F4F6F8]">
                <Toggle
                  value={settings.isPublic}
                  onChange={set('isPublic') as (v: boolean) => void}
                  label="Grupo público"
                  description="Cualquiera con el código puede unirse sin aprobación"
                />
                <Toggle
                  value={settings.allowMemberInvite}
                  onChange={set('allowMemberInvite') as (v: boolean) => void}
                  label="Miembros pueden invitar"
                  description="Los miembros del grupo también pueden enviar invitaciones"
                />
              </div>
            </SectionCard>

            <DangerZone onDelete={() => window.location.href = '/dashboard'} />
          </div>
        )}

        <div className="h-8" />
      </div>
      </div>

      <SaveToast visible={toastVisible} />
    </AppLayout>
  )
}

export default GroupSettingsPage
