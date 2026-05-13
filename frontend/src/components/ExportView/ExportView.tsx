import { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { exportService } from '../../services/export';
import { InlineBanner } from '../ui/InlineBanner/InlineBanner';
import { ErrorModal } from '../ui/ErrorModal/ErrorModal';
import { useToast } from '../ui/Toast/Toast';
import { ERROR_CODES } from '../../constants/errorCodes';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconImage() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="font-body text-sm text-[#3D4A5C]">{label}</p>
      <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#1E6FD9] rounded-full animate-pulse"
          style={{ width: '70%' }}
        />
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ExportViewProps {
  grupoId: string | null;
}

export function ExportView({ grupoId }: ExportViewProps) {
  const { accessToken } = useAuth();
  const { showToast, ToastContainer } = useToast();

  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [consolidatedError, setConsolidatedError] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  function openPrintWindow(html: string) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank');

    if (!win) {
      URL.revokeObjectURL(blobUrl);
      setErrorModal(ERROR_CODES['ERR_75_002'].message);
      return;
    }

    const cleanup = () => {
      try { URL.revokeObjectURL(blobUrl); } catch { /* noop */ }
    };

    win.addEventListener('load', () => {
      try {
        win.focus();
        win.print();
      } finally {
        cleanup();
      }
    });

    setTimeout(cleanup, 60_000);
  }

  async function handleExport(type: 'pdf' | 'png') {
    if (!accessToken || !grupoId) return;
    setExporting(type);
    setConsolidatedError(false);

    try {
      const { html } =
        type === 'pdf'
          ? await exportService.exportPDF(grupoId, accessToken)
          : await exportService.exportPNG(grupoId, accessToken);

      if (type === 'png') {
        showToast(
          'Abre el diálogo de impresión y elige "Guardar como PDF" o usa la captura de pantalla del navegador.',
          'low'
        );
      }
      openPrintWindow(html);
    } catch (err: any) {
      const code: string = err?.response?.data?.code ?? err?.code ?? '';
      if (code === 'ERR-75-001') {
        setConsolidatedError(true);
      } else {
        setErrorModal(ERROR_CODES['ERR_75_002'].message);
      }
    } finally {
      setExporting(null);
    }
  }

  async function handleGetShareLink() {
    if (!accessToken || !grupoId) return;
    setShareLoading(true);

    try {
      const { shareUrl: url } = await exportService.getShareLink(grupoId, accessToken);
      setShareUrl(url);
    } catch {
      showToast(ERROR_CODES['ERR_75_002'].message, 'medium');
    } finally {
      setShareLoading(false);
    }
  }

  function handleCopyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const busy = exporting !== null;

  return (
    <div className="flex-1 overflow-y-auto">
      {ToastContainer()}

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="font-heading font-bold text-xl text-[#1E0A4E]">
            Exportar itinerario
          </h1>
          <p className="font-body text-sm text-[#7A8799] mt-1">
            Descarga el itinerario confirmado o compártelo con tu grupo.
          </p>
        </div>

        {/* ERR-75-001 banner */}
        {consolidatedError && (
          <InlineBanner
            message={ERROR_CODES['ERR_75_001'].message}
            onDismiss={() => setConsolidatedError(false)}
          />
        )}

        {/* Export section */}
        <div
          className="bg-white rounded-xl p-6 flex flex-col gap-5"
          style={{ border: '0.5px solid #E2E8F0', borderRadius: '12px' }}
        >
          <h2 className="font-heading font-bold text-base text-[#1E0A4E]">
            Descargar
          </h2>

          {/* PDF */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-sm font-semibold text-[#3D4A5C]">PDF</p>
                <p className="font-body text-xs text-[#7A8799]">
                  Formato A4, listo para imprimir o archivar.
                </p>
              </div>
              <button
                onClick={() => handleExport('pdf')}
                disabled={busy || !grupoId}
                className="flex items-center gap-2 bg-[#1E6FD9] hover:bg-[#2C8BE6] text-white font-heading font-bold text-sm rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <IconDownload />
                {exporting === 'pdf' ? 'Generando…' : 'Exportar PDF'}
              </button>
            </div>
            {exporting === 'pdf' && <ProgressBar label="Preparando documento…" />}
          </div>

          <hr className="border-[#E2E8F0]" />

          {/* PNG */}
          <div className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-body text-sm font-semibold text-[#3D4A5C]">Imagen (PNG)</p>
                <p className="font-body text-xs text-[#7A8799]">
                  Abre la vista de impresión y usa "Guardar como PDF" o captura de pantalla.
                </p>
              </div>
              <button
                onClick={() => handleExport('png')}
                disabled={busy || !grupoId}
                className="flex items-center gap-2 border border-[#1E6FD9] text-[#1E6FD9] font-heading font-bold text-sm rounded-lg px-4 py-2 hover:bg-[#1E6FD9]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                <IconImage />
                {exporting === 'png' ? 'Generando…' : 'Exportar imagen'}
              </button>
            </div>
            {exporting === 'png' && <ProgressBar label="Preparando imagen…" />}
          </div>
        </div>

        {/* Share link section */}
        <div
          className="bg-white rounded-xl p-6 flex flex-col gap-4"
          style={{ border: '0.5px solid #E2E8F0', borderRadius: '12px' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-bold text-base text-[#1E0A4E]">
                Enlace compartible
              </h2>
              <p className="font-body text-xs text-[#7A8799] mt-0.5">
                Válido por 7 días. Cualquier persona con el enlace puede ver el itinerario.
              </p>
            </div>
            <button
              onClick={handleGetShareLink}
              disabled={shareLoading || !grupoId}
              className="flex items-center gap-2 border border-[#7A4FD6] text-[#7A4FD6] font-heading font-bold text-sm rounded-lg px-4 py-2 hover:bg-[#7A4FD6]/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              <IconLink />
              {shareLoading ? 'Generando…' : 'Generar enlace'}
            </button>
          </div>

          {shareUrl && (
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                className="flex-1 border border-[#E2E8F0] rounded-lg px-3 py-2 font-body text-xs text-[#3D4A5C] bg-[#F4F6F8] focus:outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                title={copied ? 'Copiado' : 'Copiar enlace'}
                className={[
                  'shrink-0 flex items-center gap-1.5 font-body text-xs font-medium rounded-lg px-3 py-2 transition-colors border',
                  copied
                    ? 'bg-[#35C56A]/10 border-[#35C56A] text-[#35C56A]'
                    : 'bg-white border-[#E2E8F0] text-[#3D4A5C] hover:bg-[#F4F6F8]',
                ].join(' ')}
              >
                {copied ? <IconCheck /> : <IconCopy />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ErrorModal for ERR-75-002 */}
      {errorModal && (
        <ErrorModal
          title="Error al exportar"
          message={errorModal}
          errorCode="ERR-75-002"
          onRetry={() => setErrorModal(null)}
          onClose={() => setErrorModal(null)}
        />
      )}
    </div>
  );
}
