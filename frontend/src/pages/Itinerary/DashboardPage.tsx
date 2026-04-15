import { useState, useRef, useCallback } from 'react'
import { AppLayout, SidebarDashboard, RightPanelDashboard } from '../../components/layout/AppLayout'
import { DayView } from '../../components/ui/DayView'
import type { Activity as DayActivity, DayViewHandle } from '../../components/ui/DayView'
import { ITINERARY_DAYS } from '../../mock/itinerary.mock'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ActivityMeta {
  time?: string
  location?: string
  votes?: number
}

interface Activity {
  id: string
  title: string
  description: string
  status: 'confirmed' | 'pending'
  category: 'transport' | 'lodging' | 'activity'
  image: string
  price: string
  proposedBy?: string
  meta: ActivityMeta
}

interface TripDay {
  id: number
  shortDate: string
  label: string
  activityCount: number
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const DAYS: TripDay[] = [
  { id: 1, shortDate: '16 JUN', label: 'Día 1', activityCount: 3 },
  { id: 2, shortDate: '17 JUN', label: 'Día 2', activityCount: 4 },
  { id: 3, shortDate: '18 JUN', label: 'Día 3', activityCount: 2 },
  { id: 4, shortDate: '19 JUN', label: 'Día 4', activityCount: 1 },
]

const ACTIVITIES: Activity[] = [
  {
    id: '1',
    title: 'Traslado aeropuerto – hotel',
    description: 'Servicio privado de traslado con aire acondicionado y conductor profesional',
    status: 'confirmed',
    category: 'transport',
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&h=300&fit=crop',
    price: '$280 MXN / Persona',
    meta: { time: '09:00 hrs', location: 'Aeropuerto · Hotel' },
  },
  {
    id: '2',
    title: 'Hotel Malecón Premium',
    description: 'Hotel frente al mar con alberca infinity, desayuno incluido y acceso a playa privada',
    status: 'confirmed',
    category: 'lodging',
    image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=600&h=300&fit=crop',
    price: '$2,100 MXN / Noche',
    meta: { time: 'Check-in 14:00' },
  },
  {
    id: '3',
    title: 'Tour de snorkel',
    description: 'Explora arrecifes de coral con equipo incluido, guía certificado y transporte desde el hotel',
    status: 'pending',
    category: 'activity',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600&h=300&fit=crop',
    price: '$650 MXN / Persona',
    proposedBy: 'Bryan A.',
    meta: { time: '10:00 hrs', location: 'Playa Delfines', votes: 6 },
  },
  {
    id: '4',
    title: 'Cena en La Habichuela',
    description: 'Restaurante tradicional mexicano en el centro de Cancún con ambiente romántico y jardín tropical',
    status: 'pending',
    category: 'activity',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=300&fit=crop',
    price: '$390 MXN / Persona',
    proposedBy: 'Ana L.',
    meta: { time: '20:00 hrs', votes: 3 },
  },
]

// ── Inline icons ──────────────────────────────────────────────────────────────

function IconCalendar({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconUsers({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconMapPin({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconDownload({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconCheck({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function IconSearch({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
      <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconSend({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2" stroke="currentColor" strokeWidth="2" fill="currentColor"/>
    </svg>
  )
}

function IconInfo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

function IconPlane({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5 18 1 16 1 14.5 2.5L11 6 2.8 4.2l-2 2 3.5 3.5L2 14l2 2 4.5-2 3.5 3.5 3.5 3.5 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconBed({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2 9V5a1 1 0 011-1h18a1 1 0 011 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <rect x="2" y="9" width="20" height="9" rx="1" stroke="currentColor" strokeWidth="2"/>
      <line x1="2" y1="18" x2="2" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="22" y1="18" x2="22" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M6 9v4M12 9v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

function IconStar({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Category helpers ──────────────────────────────────────────────────────────

function getCategoryIcon(category: Activity['category']) {
  if (category === 'transport') return <IconPlane size={14} />
  if (category === 'lodging')   return <IconBed size={14} />
  return <IconStar size={14} />
}

function getCategoryColor(category: Activity['category']): string {
  if (category === 'transport') return '#1E6FD9'
  if (category === 'lodging')   return '#7A4FD6'
  return '#F59E0B'
}

function getSectionLabel(category: Activity['category'], hasPending?: boolean) {
  if (category === 'transport') return { icon: <IconPlane size={12} />, text: 'TRANSPORTE' }
  if (category === 'lodging')   return { icon: <IconBed size={12} />, text: 'HOSPEDAJE' }
  return { icon: <IconStar size={12} />, text: hasPending ? 'ACTIVIDADES – POR CONFIRMAR' : 'ACTIVIDADES' }
}

// ── HeroCard ──────────────────────────────────────────────────────────────────

interface HeroCardProps {
  activeDay: number | null
}

function HeroCard({ activeDay }: HeroCardProps) {
  return (
    <div className="relative rounded-2xl overflow-hidden mb-4 h-52 shrink-0">
      {/* Background image */}
      <img
        src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&h=400&fit=crop"
        alt="Cancún"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />

      {/* Top badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        <span className="font-body text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          {activeDay !== null ? `DÍA ${activeDay} / 4` : 'CANCÚN 2025'}
        </span>
        <span className="font-body text-[11px] font-bold text-white bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
          16 JUNIO 2025
        </span>
      </div>

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
        <h1 className="font-heading font-bold text-white text-[28px] leading-tight mb-1">
          Llegada a Cancún
        </h1>
        <p className="font-body text-[13px] text-white/70 mb-3">
          3 actividades planeadas · 1 pendiente de confirmación
        </p>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-white border border-white/50 rounded-lg px-4 py-2 hover:bg-white/10 transition-colors">
            <IconDownload size={13} />
            Exportar PDF
          </button>
          <button className="inline-flex items-center gap-1.5 font-body text-sm font-medium text-white bg-greenAccent rounded-lg px-4 py-2 hover:opacity-90 transition-opacity">
            <IconPlus size={13} />
            Proponer actividad
          </button>
        </div>
      </div>
    </div>
  )
}

// ── TimelineStrip ─────────────────────────────────────────────────────────────

interface TimelineStripProps {
  activeDay: number | null
  date?: string
  activities?: DayActivity[]
}

function TimelineStrip({ activeDay, date, activities = [] }: TimelineStripProps) {
  const confirmed  = activities.filter((a) => a.status === 'confirmada').length
  const pending    = activities.filter((a) => a.status === 'pendiente').length
  const total      = activities.length
  const pct        = total > 0 ? Math.round((confirmed / total) * 100) : 0

  const transport  = activities.filter((a) => a.category === 'transporte').length
  const lodging    = activities.filter((a) => a.category === 'hospedaje').length
  const acts       = activities.filter((a) => a.category === 'actividad').length

  /* ── No day selected ── */
  if (activeDay === null) {
    return (
      <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-5 mb-4 flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-bluePrimary/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-bluePrimary" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
            <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        <p className="font-body text-sm text-gray500 text-center">
          Selecciona un día para ver su progreso
        </p>
      </div>
    )
  }

  /* ── Day selected ── */
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] px-5 py-4 mb-4">
      {/* Top row: left meta + right progress bar */}
      <div className="flex items-start gap-5">
        {/* Left column */}
        <div className="shrink-0">
          <span className="inline-flex font-body text-[11px] font-bold text-bluePrimary bg-bluePrimary/10 rounded-full px-3 py-1 leading-none">
            DÍA {activeDay}{date ? ` · ${date.toUpperCase()}` : ''}
          </span>
          <p className="font-heading font-bold text-purpleNavbar text-sm mt-2 leading-none">
            Progreso del día
          </p>
          <p className="font-body text-xs text-gray500 mt-1 leading-none">
            {confirmed} de {total} actividades confirmadas
          </p>
        </div>

        {/* Right column */}
        <div className="flex-1 pt-0.5">
          {/* Progress bar */}
          <div className="bg-surface rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #1E6FD9, #35C56A)',
              }}
            />
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
              Confirmadas · {confirmed}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="w-2 h-2 rounded-full bg-purpleMedium shrink-0" />
              Por confirmar · {pending}
            </span>
            <span className="flex items-center gap-1.5 font-body text-[11px] text-gray500">
              <span className="w-2 h-2 rounded-full bg-[#E2E8F0] shrink-0" />
              Sin actividades · {total === 0 ? 1 : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Category chips */}
      {(transport > 0 || lodging > 0 || acts > 0) && (
        <div className="flex flex-wrap gap-2 mt-3">
          {transport > 0 && (
            <span className="font-body text-[11px] text-bluePrimary bg-[#EEF4FF] rounded-full px-3 py-1 leading-none">
              ✈ {transport} traslado{transport !== 1 ? 's' : ''}
            </span>
          )}
          {lodging > 0 && (
            <span className="font-body text-[11px] text-bluePrimary bg-[#EEF4FF] rounded-full px-3 py-1 leading-none">
              🏨 {lodging} hospedaje{lodging !== 1 ? 's' : ''}
            </span>
          )}
          {acts > 0 && (
            <span className="font-body text-[11px] text-purpleMedium bg-surface rounded-full px-3 py-1 leading-none">
              ⭐ {acts} actividad{acts !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── InfoBanner ────────────────────────────────────────────────────────────────

function InfoBanner() {
  return (
    <div className="flex items-start gap-3 bg-[#EEF4FF] border border-bluePrimary/20 rounded-xl px-4 py-3 mb-4">
      <span className="text-bluePrimary mt-0.5 shrink-0">
        <IconInfo size={16} />
      </span>
      <div>
        <p className="font-body text-sm font-semibold text-gray700 leading-tight">
          Acepta propuestas para confirmarlas
        </p>
        <p className="font-body text-xs text-gray500 mt-0.5 leading-relaxed">
          Las actividades con votos necesitan tu aprobación para ser incluidas en el itinerario final del grupo.
        </p>
      </div>
    </div>
  )
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-gray500">{icon}</span>
      <span className="font-body text-[11px] font-semibold text-gray500 uppercase tracking-wider">{text}</span>
    </div>
  )
}

// ── ActivityCardConfirmed ─────────────────────────────────────────────────────

function ActivityCardConfirmed({ activity }: { activity: Activity }) {
  const iconColor = getCategoryColor(activity.category)
  const iconEl    = getCategoryIcon(activity.category)

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Confirmed badge */}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 font-body text-[11px] font-bold text-white bg-greenAccent rounded-full px-3 py-1 shadow-sm">
          <IconCheck size={10} />
          CONFIRMADO
        </span>
        {/* Price badge */}
        <span className="absolute top-3 right-3 font-body text-xs font-semibold text-white bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          {activity.price}
        </span>
        {/* Category icon circle */}
        <div
          className="absolute left-4 -bottom-4 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-[#E2E8F0]"
          style={{ color: iconColor }}
        >
          {iconEl}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        <h3 className="font-heading font-bold text-purpleNavbar text-[15px] mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="font-body text-xs text-gray500 mb-3 leading-relaxed">{activity.description}</p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {activity.meta.time && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconClock /></span>
              {activity.meta.time}
            </span>
          )}
          {activity.meta.location && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.meta.location}
            </span>
          )}
        </div>

        {/* Confirmation status */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-greenAccent shrink-0" />
          <span className="font-body text-xs text-greenAccent font-medium">Reservación confirmada</span>
        </div>
      </div>
    </div>
  )
}

// ── ActivityCardPending ───────────────────────────────────────────────────────

interface ActivityCardPendingProps {
  activity: Activity
  onAccept: (id: string) => void
  onDelete: (id: string) => void
}

function ActivityCardPending({ activity, onAccept, onDelete }: ActivityCardPendingProps) {
  const iconColor = getCategoryColor(activity.category)
  const iconEl    = getCategoryIcon(activity.category)

  return (
    <div className="bg-white rounded-2xl border border-dashed border-[#E2E8F0] overflow-hidden">
      {/* Image */}
      <div className="relative h-36 overflow-hidden">
        <img
          src={activity.image}
          alt={activity.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Pending badge */}
        <span className="absolute top-3 left-3 font-body text-[11px] font-bold text-white bg-purpleMedium rounded-full px-3 py-1">
          POR CONFIRMAR
        </span>
        {/* Price badge */}
        <span className="absolute top-3 right-3 font-body text-xs font-semibold text-white bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
          {activity.price}
        </span>
        {/* Category icon circle */}
        <div
          className="absolute left-4 -bottom-4 w-9 h-9 rounded-full bg-white shadow-md flex items-center justify-center border border-[#E2E8F0]"
          style={{ color: iconColor }}
        >
          {iconEl}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 pt-6 pb-4">
        <h3 className="font-heading font-bold text-purpleNavbar text-[15px] mb-1 leading-snug">
          {activity.title}
        </h3>
        <p className="font-body text-xs text-gray500 mb-3 leading-relaxed">{activity.description}</p>

        {/* Info chips */}
        <div className="flex flex-wrap gap-2 mb-2">
          {activity.meta.time && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconClock /></span>
              {activity.meta.time}
            </span>
          )}
          {activity.meta.location && (
            <span className="inline-flex items-center gap-1.5 font-body text-xs text-gray700 bg-neutralBg rounded-full px-3 py-1">
              <span className="text-bluePrimary"><IconMapPin /></span>
              {activity.meta.location}
            </span>
          )}
          {activity.meta.votes !== undefined && (
            <span className="inline-flex items-center gap-1 font-body text-xs text-purpleMedium bg-purpleMedium/10 rounded-full px-3 py-1 font-medium">
              ↑ {activity.meta.votes} votos
            </span>
          )}
        </div>

        {activity.proposedBy && (
          <p className="font-body text-xs text-gray500 italic mb-3">
            Propuesto por {activity.proposedBy}
          </p>
        )}

        {/* Accept / Delete row */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAccept(activity.id)}
            className="flex-1 inline-flex items-center justify-center gap-1.5 font-body text-sm font-bold text-white bg-bluePrimary rounded-xl h-11 hover:opacity-90 transition-opacity"
          >
            <IconCheck size={14} />
            Aceptar propuesta
          </button>
          <button
            onClick={() => onDelete(activity.id)}
            className="w-11 h-11 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-gray500 hover:text-red-500 hover:border-red-200 transition-colors"
            aria-label="Eliminar propuesta"
          >
            <IconTrash size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AddActivityRow ────────────────────────────────────────────────────────────

function AddActivityRow() {
  return (
    <button className="w-full bg-white border border-dashed border-[#E2E8F0] rounded-2xl h-16 flex flex-col items-center justify-center gap-0.5 hover:border-bluePrimary/50 hover:bg-[#EEF4FF]/50 transition-colors group">
      <div className="flex items-center gap-2">
        <span className="text-gray500 group-hover:text-bluePrimary transition-colors">
          <IconSearch size={15} />
        </span>
        <span className="font-body text-sm font-medium text-gray500 group-hover:text-bluePrimary transition-colors">
          Buscar y proponer actividad
        </span>
      </div>
      <span className="font-body text-[11px] text-gray500/60">
        Vuelos, hoteles, lugares en Google Maps, Amadeus y más
      </span>
    </button>
  )
}

// ── BottomNavbar ──────────────────────────────────────────────────────────────

interface BottomNavbarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

const BOTTOM_TABS = [
  { id: 'buscar',   label: 'Buscar',   icon: <IconSearch size={18} /> },
  {
    id: 'comparar', label: 'Comparar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'mapas', label: 'Mapas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <line x1="8" y1="2" x2="8" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="16" y1="6" x2="16" y2="22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'pagar', label: 'Pagar',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
]

function BottomNavbar({ activeTab, onTabChange }: BottomNavbarProps) {
  return (
    <div className="shrink-0 bg-white border-t border-[#E2E8F0] h-14 flex items-center justify-around px-4">
      {BOTTOM_TABS.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={[
              'flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors',
              isActive ? 'text-bluePrimary' : 'text-gray500 hover:text-gray700',
            ].join(' ')}
          >
            {tab.icon}
            <span className={`font-body text-[10px] font-medium ${isActive ? 'text-bluePrimary' : ''}`}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonPulse({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-200 animate-pulse rounded-lg ${className}`} />
  )
}

function SkeletonView() {
  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <SkeletonPulse className="h-52 rounded-2xl" />
      <SkeletonPulse className="h-14 rounded-2xl" />
      <SkeletonPulse className="h-12 rounded-xl" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-[#E2E8F0]">
          <SkeletonPulse className="h-36 rounded-none" />
          <div className="px-5 py-4 flex flex-col gap-2">
            <SkeletonPulse className="h-4 w-2/3" />
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-16 text-center">
      <div className="w-20 h-20 rounded-2xl bg-bluePrimary/10 flex items-center justify-center mb-4">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-bluePrimary">
          <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
          <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
          <line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <line x1="8" y1="18" x2="12" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      <h3 className="font-heading font-bold text-purpleNavbar text-lg mb-2">
        Tu itinerario está vacío
      </h3>
      <p className="font-body text-sm text-gray500 max-w-xs mb-6 leading-relaxed">
        Empieza proponiendo actividades, vuelos u hoteles para este día. El grupo podrá votar y confirmar.
      </p>
      <button
        onClick={onAdd}
        className="inline-flex items-center gap-2 font-body text-sm font-semibold text-white bg-bluePrimary rounded-xl px-5 py-3 hover:opacity-90 transition-opacity"
      >
        <IconPlus size={14} />
        Proponer primera actividad
      </button>
    </div>
  )
}

// ── ActivitiesContent ─────────────────────────────────────────────────────────

interface ActivitiesContentProps {
  activities: Activity[]
  onAccept: (id: string) => void
  onDelete: (id: string) => void
}

function ActivitiesContent({ activities, onAccept, onDelete }: ActivitiesContentProps) {
  const transport  = activities.filter((a) => a.category === 'transport')
  const lodging    = activities.filter((a) => a.category === 'lodging')
  const acts       = activities.filter((a) => a.category === 'activity')
  const hasPending = acts.some((a) => a.status === 'pending')

  return (
    <div className="flex flex-col gap-4">
      {transport.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('transport')} />
          <div className="flex flex-col gap-4">
            {transport.map((a) =>
              a.status === 'confirmed'
                ? <ActivityCardConfirmed key={a.id} activity={a} />
                : <ActivityCardPending key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} />
            )}
          </div>
        </section>
      )}

      {lodging.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('lodging')} />
          <div className="flex flex-col gap-4">
            {lodging.map((a) =>
              a.status === 'confirmed'
                ? <ActivityCardConfirmed key={a.id} activity={a} />
                : <ActivityCardPending key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} />
            )}
          </div>
        </section>
      )}

      {acts.length > 0 && (
        <section>
          <SectionLabel {...getSectionLabel('activity', hasPending)} />
          <div className="flex flex-col gap-4">
            {acts.map((a) =>
              a.status === 'confirmed'
                ? <ActivityCardConfirmed key={a.id} activity={a} />
                : <ActivityCardPending key={a.id} activity={a} onAccept={onAccept} onDelete={onDelete} />
            )}
          </div>
        </section>
      )}

      <AddActivityRow />
    </div>
  )
}

// ── DashboardPage ─────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [activeDay,       setActiveDay]       = useState<number | null>(null)
  const [showDaySelector, setShowDaySelector] = useState(false)
  const [activeTab,       setActiveTab]       = useState('pagar')
  const [isLoading,       setIsLoading]       = useState(false)
  const [activities,      setActivities]      = useState<Activity[]>(ACTIVITIES)

  const dayRefs = useRef<Record<number, DayViewHandle | null>>({})

  const handleDayChange = useCallback((dayNumber: number) => {
    setActiveDay((prev) => {
      const next = prev === dayNumber ? null : dayNumber
      if (next !== null) {
        setShowDaySelector(false)
        setTimeout(() => dayRefs.current[next]?.scrollIntoView(), 60)
      }
      return next
    })
  }, [])

  const isEmpty = activities.length === 0

  function handleAccept(id: string) {
    setActivities((prev) =>
      prev.map((a) => a.id === id ? { ...a, status: 'confirmed' as const } : a)
    )
  }

  function handleDelete(id: string) {
    setActivities((prev) => prev.filter((a) => a.id !== id))
  }

  // Demo toggle for skeleton / empty states (dev helper, hidden in UI)
  void setIsLoading

  return (
    <AppLayout
      trip={{ name: 'Cancún 2025', subtitle: 'Riviera Maya, México', dates: '15–18 Jun', people: '4 personas' }}
      user={{ name: 'Bryan A.', role: 'Organizador', initials: 'BA', color: '#1E6FD9' }}
      notificationCount={3}
      isOnline
      sidebarContent={
        <SidebarDashboard
          activeDay={activeDay}
          showDaySelector={showDaySelector}
          onDayChange={handleDayChange}
          onToggleDaySelector={() => setShowDaySelector((v) => !v)}
        />
      }
      rightPanel={<RightPanelDashboard />}
    >
      {/* ── Central content ── */}
      {isLoading ? (
        <SkeletonView />
      ) : isEmpty ? (
        <EmptyState onAdd={() => {}} />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-6 bg-surface">
          <HeroCard activeDay={activeDay} />
          <InfoBanner />
          <TimelineStrip
            activeDay={activeDay}
            date={activeDay !== null ? ITINERARY_DAYS.find((d) => d.dayNumber === activeDay)?.date : undefined}
            activities={activeDay !== null ? ITINERARY_DAYS.find((d) => d.dayNumber === activeDay)?.activities : undefined}
          />
          <div className="flex flex-col gap-3">
            {ITINERARY_DAYS.map((day) => (
              <DayView
                key={day.dayNumber}
                ref={(handle) => { dayRefs.current[day.dayNumber] = handle }}
                dayNumber={day.dayNumber}
                date={day.date}
                activities={day.activities}
                isActive={day.dayNumber === activeDay}
                isExpanded={activeDay !== null && day.dayNumber === activeDay}
                onSelect={handleDayChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <BottomNavbar activeTab={activeTab} onTabChange={setActiveTab} />
    </AppLayout>
  )
}
