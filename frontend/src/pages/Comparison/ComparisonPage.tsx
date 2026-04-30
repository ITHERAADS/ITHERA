import { useState } from 'react'
import { useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { proposalsService } from '../../services/proposals';


export interface ComparisonPageProps {
  groupId: string;
  onBack: () => void;
}


interface ComparisonOption {
  id: string
  title: string
  category: 'transporte' | 'hospedaje' | 'actividad'
  price: number
  duration: string
  location: string
  climate: string
  image: string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconArrowLeft({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconWarning({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconSun({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
      <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconX({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="6" y1="6" x2="18" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function IconArrowRight({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CategoryIcon({ category }: { category: ComparisonOption['category'] }) {
  if (category === 'transporte') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#1E6FD9]">
        <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19.5 2.5 18 1 16 1 14.5 2.5L11 6 2.8 4.2l-2 2 3.5 3.5L2 14l2 2 4.5-2 3.5 3.5 3.5 3.5 2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (category === 'hospedaje') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#7A4FD6]">
        <path d="M2 9V5a1 1 0 011-1h18a1 1 0 011 1v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="2" y="9" width="20" height="9" rx="1" stroke="currentColor" strokeWidth="2" />
        <line x1="2" y1="18" x2="2" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="22" y1="18" x2="22" y2="21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0 text-[#F59E0B]">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Row wrapper ───────────────────────────────────────────────────────────────

function TableRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start border-t border-[#E2E8F0]">
      <div className="w-28 shrink-0 py-3 pl-4 pr-2 font-body text-xs text-[#9CA3AF] flex items-center self-stretch">
        {label}
      </div>
      <div className="flex flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}

// ── ComparisonPage ────────────────────────────────────────────────────────────

export function ComparisonPage({ groupId, onBack }: ComparisonPageProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [proposed, setProposed] = useState(false)
  const { accessToken } = useAuth();
  const [options, setOptions] = useState<ComparisonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const minPrice = Math.min(...options.map((o) => o.price))
  const selectedOption = selected ? options.find((o) => o.id === selected) ?? null : null
  const exceedsBudget = selectedOption ? selectedOption.price > BUDGET_LIMIT : false


  useEffect(() => {
    if (!groupId || !accessToken) return;
    setLoading(true);
    proposalsService.getGroupProposals(groupId, accessToken)
      .then(res => {
        const mapped = res.proposals.map(p => ({
          id: p.id,
          title: p.titulo,
          price: p.precio,
          category: p.tipo === 'vuelo' ? 'transporte' : p.tipo === 'hotel' ? 'hospedaje' : 'actividad',
          duration: p.duracion ?? 'N/A',
          location: p.ubicacion ?? 'Ubicación pendiente',
          climate: p.clima ?? 'Clima pendiente',
          image: p.imagen ?? 'https://via.placeholder.com/150',
        }));
        setOptions(mapped);
      })
      .catch(() => setError('No se pudieron cargar las propuestas'))
      .finally(() => setLoading(false));
  }, [groupId, accessToken]);

  function removeOption(id: string) {
    if (options.length <= 1) return
    setOptions((prev) => prev.filter((o) => o.id !== id))
    if (selected === id) setSelected(null)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando propuestas...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (options.length === 0) return <div className="p-8 text-center text-gray-400">No hay propuestas para comparar aún.</div>;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 border border-[#E2E8F0] text-[#1E0A4E] font-body text-sm rounded-xl px-4 py-2 hover:bg-[#F8FAFC] transition-colors shrink-0"
          >
            <IconArrowLeft size={14} />
            Regresar
          </button>
          <h1 className="font-heading font-bold text-[#1E0A4E] text-xl leading-tight">
            Comparar opciones
          </h1>
        </div>

        {/* Budget indicator */}
        {exceedsBudget ? (
          <span className="inline-flex items-center gap-1 font-body text-sm text-[#EF4444] shrink-0">
            <IconWarning size={14} />
            ¡Excede el presupuesto!
          </span>
        ) : (
          <span className="font-body text-sm text-[#6B7280] shrink-0">
            Presupuesto disponible: $5,000 MXN
          </span>
        )}
      </div>

      {/* ── Comparison card ── */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-max w-full">

            {/* Row: Image + title */}
            <div className="flex items-start p-4 gap-3">
              <div className="w-28 shrink-0" />
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 pr-3 last:pr-0">
                  {/* Image with remove button */}
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={o.image}
                      alt={o.title}
                      className="w-full h-[100px] object-cover"
                      loading="lazy"
                    />
                    <button
                      onClick={() => removeOption(o.id)}
                      disabled={options.length <= 1}
                      className={[
                        'absolute top-1.5 right-1.5 bg-black/40 rounded-full p-1 transition-opacity',
                        options.length <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/60',
                      ].join(' ')}
                      aria-label={`Quitar ${o.title}`}
                    >
                      <IconX size={10} />
                    </button>
                  </div>
                  {/* Title + category icon */}
                  <div className="flex items-start gap-1 mt-2">
                    <span className="mt-0.5"><CategoryIcon category={o.category} /></span>
                    <p className="font-body text-sm font-semibold text-[#1E0A4E] leading-tight">{o.title}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Row: Precio */}
            <TableRow label="Precio">
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 py-3 pr-3 last:pr-4 flex flex-col gap-1">
                  <span className="font-heading font-bold text-[#1E0A4E] text-base leading-none">
                    ${o.price.toLocaleString('es-MX')} MXN
                  </span>
                  {o.price === minPrice && options.length > 1 && (
                    <span className="inline-flex w-fit bg-[#35C56A]/10 text-[#35C56A] text-[10px] font-bold rounded-full px-2 py-0.5">
                      Mejor precio
                    </span>
                  )}
                </div>
              ))}
            </TableRow>

            {/* Row: Duración */}
            <TableRow label="Duración">
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 py-3 pr-3 last:pr-4">
                  <span className="font-body text-sm text-[#1E0A4E]">{o.duration}</span>
                </div>
              ))}
            </TableRow>

            {/* Row: Ubicación */}
            <TableRow label="Ubicación">
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 py-3 pr-3 last:pr-4">
                  <span className="font-body text-xs text-[#6B7280]">{o.location}</span>
                </div>
              ))}
            </TableRow>

            {/* Row: Clima */}
            <TableRow label="Clima">
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 py-3 pr-3 last:pr-4 flex items-center gap-1">
                  <span className="text-[#F59E0B] shrink-0"><IconSun size={12} /></span>
                  <span className="font-body text-xs text-[#6B7280]">{o.climate}</span>
                </div>
              ))}
            </TableRow>

            {/* Row: Action */}
            <TableRow label="">
              {options.map((o) => (
                <div key={o.id} className="min-w-48 flex-1 py-3 pr-3 last:pr-4">
                  {selected === o.id ? (
                    <button
                      onClick={() => setSelected(o.id)}
                      className="inline-flex w-full items-center justify-center gap-1.5 bg-[#1E6FD9] text-white font-body text-sm font-semibold rounded-xl py-2.5 px-3"
                    >
                      <IconCheck size={12} />
                      Seleccionada
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelected(o.id)}
                      className="w-full border border-[#1E6FD9] text-[#1E6FD9] font-body text-sm rounded-xl py-2.5 px-3 hover:bg-[#1E6FD9]/5 transition-colors"
                    >
                      Proponer al grupo
                    </button>
                  )}
                </div>
              ))}
            </TableRow>

          </div>
        </div>

        {/* Single-option info box */}
        {options.length === 1 && (
          <div className="p-4 border-t border-[#E2E8F0]">
            <div className="bg-[#F0EEF8] border border-[#E2E8F0] rounded-xl p-4 text-center">
              <p className="inline-flex items-center justify-center gap-1.5 font-body text-sm text-[#6B7280]">
                <IconArrowRight size={14} />
                Agrega otra opción para comparar
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Success banner — above add button ── */}
      {proposed && (
        <div className="bg-[#35C56A]/10 border border-[#35C56A]/30 rounded-xl p-4">
          <p className="font-body text-sm text-[#35C56A] font-semibold flex items-center gap-1.5">
            <IconCheck size={12} />
            Propuesta enviada al grupo. Los miembros podrán votarla.
          </p>
        </div>
      )}

      {/* ── Add option button ── */}
      {options.length < 4 && (
        <button className="border-2 border-dashed border-[#E2E8F0] rounded-xl py-4 w-full flex items-center justify-center gap-2 text-[#6B7280] font-body text-sm hover:border-[#1E6FD9]/30 hover:text-[#1E6FD9] transition-colors">
          <IconPlus size={14} />
          Agregar opción para comparar
        </button>
      )}

      {/* ── Budget warning + confirm ── */}
      {selected !== null && !proposed && (
        <div className="flex flex-col gap-3">
          {exceedsBudget && (
            <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-3 flex items-start gap-2">
              <span className="text-[#EF4444] shrink-0 mt-0.5"><IconWarning size={14} /></span>
              <p className="font-body text-xs text-[#EF4444]">
                Esta opción excede el presupuesto disponible del grupo ($5,000 MXN). ¿Deseas proponerla de todas formas?
              </p>
            </div>
          )}

          <button
            onClick={async () => {
              if (!selectedOption || !accessToken) return;
              try {
                await proposalsService.voteProposal(groupId, selectedOption.id, { voto: 'a_favor' }, accessToken);
                setProposed(true);
              } catch {
                alert('No se pudo confirmar la propuesta. Intenta de nuevo.');
              }
            }}
            className={[
              'w-full font-body font-semibold text-sm rounded-xl py-3 text-white transition-colors flex items-center justify-center gap-2',
              exceedsBudget ? 'bg-[#EF4444] hover:bg-[#dc2626]' : 'bg-[#1E6FD9] hover:bg-[#1a5fc2]',
            ].join(' ')}
          >
            {exceedsBudget ? 'Proponer de todas formas →' : 'Confirmar propuesta al grupo →'}
          </button>
        </div>
      )}

    </div>
  )
}
