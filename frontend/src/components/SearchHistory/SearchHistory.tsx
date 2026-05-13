import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { searchHistoryService } from '../../services/searchHistory';
import type { SearchHistoryItem } from '../../types/searchHistory';
import { InlineBanner } from '../ui/InlineBanner/InlineBanner';
import { useToast } from '../ui/Toast/Toast';
import { ERROR_CODES } from '../../constants/errorCodes';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_ICON: Record<string, string> = {
  vuelo:     '✈',
  hospedaje: '🏨',
  lugar:     '📍',
  ruta:      '🗺',
};

function str(val: unknown): string {
  return typeof val === 'string' ? val : '';
}

function summarizeParams(tipo: string, p: Record<string, unknown>): string {
  switch (tipo) {
    case 'vuelo':
      return `${str(p['origen']) || '?'} → ${str(p['destino']) || '?'}`;
    case 'hospedaje':
      return str(p['destino']) || str(p['nombre']) || 'Sin destino';
    case 'lugar':
      return str(p['nombre']) || str(p['destino']) || 'Sin nombre';
    case 'ruta':
      return `${str(p['origen']) || '?'} → ${str(p['destino']) || '?'}`;
    default:
      return JSON.stringify(p).slice(0, 60);
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SearchHistoryProps {
  grupoId: string | null;
}

export function SearchHistory({ grupoId }: SearchHistoryProps) {
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [items,          setItems]          = useState<SearchHistoryItem[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState(false);
  const [activeTab,      setActiveTab]      = useState<'busquedas' | 'descartadas'>('busquedas');
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [recovering,     setRecovering]     = useState<string | null>(null);

  const load = async () => {
    if (!accessToken) return;
    try {
      setLoading(true);
      setError(false);
      const data = await searchHistoryService.getHistory(accessToken);
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.tipo.includes(q) ||
      JSON.stringify(item.parametros).toLowerCase().includes(q) ||
      item.created_at.includes(q)
    );
  }, [items, searchQuery]);

  async function handleRecover(item: SearchHistoryItem) {
    if (!accessToken || !grupoId) return;
    try {
      setRecovering(item.id);
      await searchHistoryService.recoverAsProposal(item.id, grupoId, accessToken);
      showToast('Opción reincorporada como propuesta al itinerario.', 'low');
    } catch {
      showToast(ERROR_CODES['ERR_74_002'].message, 'medium');
    } finally {
      setRecovering(null);
    }
  }

  function handleRepeat(item: SearchHistoryItem) {
    const dest = grupoId ? `/dashboard?groupId=${grupoId}` : '/my-trips';
    showToast('Redirigiendo a búsqueda...', 'low');
    navigate(dest, { state: { prefill: item.parametros, tipo: item.tipo } });
  }

  async function handleClearConfirm() {
    if (!accessToken) return;
    try {
      await searchHistoryService.clearAll(accessToken);
      setItems([]);
      setShowClearModal(false);
      showToast('Historial limpiado correctamente.', 'low');
    } catch {
      setShowClearModal(false);
      showToast('No se pudo limpiar el historial. Inténtalo de nuevo.', 'medium');
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto">
      {ToastContainer()}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-heading font-bold text-xl text-[#1E0A4E]">
            Historial de Búsquedas
          </h1>
          <button
            onClick={() => setShowClearModal(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1.5 border border-[#EF4444] text-[#EF4444] font-body text-sm font-medium rounded-lg px-3 py-1.5 hover:bg-[#FEF2F2] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <IconTrash />
            Limpiar historial
          </button>
        </div>

        {/* Search bar */}
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por tipo, destino o fecha..."
          className="w-full border border-[#E2E8F0] rounded-lg px-4 py-2.5 font-body text-sm text-[#3D4A5C] placeholder-[#7A8799] focus:outline-none focus:ring-2 focus:ring-[#1E6FD9] focus:border-transparent"
        />

        {/* Error banner */}
        {error && (
          <InlineBanner
            message={ERROR_CODES['ERR_73_002'].message}
            onDismiss={() => { setError(false); void load(); }}
          />
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#E2E8F0]">
          {(['busquedas', 'descartadas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-2.5 font-body text-sm transition-colors border-b-2 -mb-px',
                activeTab === tab
                  ? 'border-[#1E6FD9] text-[#1E6FD9] font-bold'
                  : 'border-transparent text-[#7A8799] hover:text-[#3D4A5C]',
              ].join(' ')}
            >
              {tab === 'busquedas' ? 'Búsquedas' : 'Propuestas descartadas'}
            </button>
          ))}
        </div>

        {/* Tab: Búsquedas */}
        {activeTab === 'busquedas' && (
          <>
            {/* Skeletons */}
            {loading && (
              <div className="flex flex-col gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-24 rounded-xl animate-pulse bg-gray-200" />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredItems.length === 0 && (
              <div className="flex flex-col items-center gap-4 py-14 text-[#7A8799]">
                <IconSearch />
                <p className="font-body text-sm text-center max-w-xs">
                  {ERROR_CODES['ERR_73_001'].message}
                </p>
                <button
                  onClick={() => navigate(grupoId ? `/dashboard?groupId=${grupoId}` : '/my-trips')}
                  className="bg-[#1E6FD9] hover:bg-[#2C8BE6] text-white font-heading font-bold text-sm rounded-lg px-5 py-2.5 transition-colors"
                >
                  Ir a búsqueda
                </button>
              </div>
            )}

            {/* Item list */}
            {!loading && !error && filteredItems.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-start gap-4"
                style={{ borderWidth: '0.5px', borderRadius: '12px' }}
              >
                {/* Type icon */}
                <span className="shrink-0 w-10 h-10 bg-[#F4F6F8] rounded-lg flex items-center justify-center text-xl">
                  {TIPO_ICON[item.tipo] ?? '🔍'}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-body text-xs font-semibold uppercase tracking-wide text-[#7A8799]">
                      {item.tipo}
                    </span>
                    {item.expirado && (
                      <span
                        title={ERROR_CODES['ERR_74_001'].message}
                        className="bg-[#F4F6F8] text-[#7A8799] font-body text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        Expirado
                      </span>
                    )}
                  </div>
                  <p className="font-body text-sm font-semibold text-[#3D4A5C] mt-0.5 truncate">
                    {summarizeParams(item.tipo, item.parametros)}
                  </p>
                  <p className="font-body text-xs text-[#7A8799] mt-0.5">
                    {formatDate(item.created_at)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleRepeat(item)}
                    disabled={!!item.expirado}
                    title={item.expirado ? ERROR_CODES['ERR_74_001'].message : undefined}
                    className="font-body text-xs font-medium text-[#1E6FD9] border border-[#1E6FD9] rounded-lg px-3 py-1.5 hover:bg-[#1E6FD9]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Repetir búsqueda
                  </button>
                  <button
                    onClick={() => handleRecover(item)}
                    disabled={!!item.expirado || !grupoId || recovering === item.id}
                    title={item.expirado ? ERROR_CODES['ERR_74_001'].message : !grupoId ? 'Selecciona un grupo primero' : undefined}
                    className="font-body text-xs font-medium text-[#7A4FD6] border border-[#7A4FD6] rounded-lg px-3 py-1.5 hover:bg-[#7A4FD6]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {recovering === item.id ? 'Agregando...' : 'Re-proponer al itinerario'}
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Tab: Propuestas descartadas */}
        {activeTab === 'descartadas' && (
          <div className="flex flex-col items-center gap-4 py-14 text-[#7A8799]">
            <IconSearch />
            <p className="font-body text-sm text-center max-w-xs">
              Las propuestas que descartes en el itinerario aparecerán aquí.
            </p>
          </div>
        )}
      </div>

      {/* Clear confirmation modal */}
      {showClearModal && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'rgba(13,8,32,0.75)' }}
            onClick={() => setShowClearModal(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
              <h2 className="font-heading font-bold text-lg text-[#1E0A4E] mb-3">Confirmar</h2>
              <p className="font-body text-sm text-[#3D4A5C] mb-6">
                ¿Seguro que deseas limpiar todo tu historial? Esta acción no se puede deshacer.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 border border-[#E2E8F0] text-[#3D4A5C] font-body text-sm font-medium rounded-lg px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearConfirm}
                  className="flex-1 bg-[#EF4444] hover:bg-red-600 text-white font-heading font-bold text-sm rounded-lg px-4 py-2.5 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
