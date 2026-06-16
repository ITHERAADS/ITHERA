import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SearchIntegratedShell } from "./SearchIntegratedShell";
import { useAuth } from "../../context/useAuth";
import { getCurrentGroup } from "../../services/groups";
import { searchHistoryService, type SearchHistoryEntry } from "../../services/search-history";
import type { Group } from "../../types/groups";

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function sourceLabel(value: string) {
  if (value === "duffel") return "Duffel";
  if (value === "liteapi") return "LiteAPI";
  return value;
}

function typeLabel(value: "vuelo" | "hospedaje") {
  return value === "vuelo" ? "Vuelo" : "Hospedaje";
}

const SearchHistoryPage = () => {
  const { accessToken, localUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { group?: Group } | null;

  const currentGroup = useMemo(
    () => state?.group ?? getCurrentGroup(),
    [state?.group],
  );

  const [items, setItems] = useState<SearchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!currentGroup?.id || !accessToken) {
        setItems([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await searchHistoryService.listByGroup(
          String(currentGroup.id),
          accessToken,
        );
        if (cancelled) return;
        setItems(response.data ?? []);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "No se pudo cargar el historial de propuestas guardadas.",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [accessToken, currentGroup?.id]);

  return (
    <SearchIntegratedShell
      group={currentGroup}
      user={{
        name: localUser?.nombre ?? localUser?.email ?? "Usuario",
        role: currentGroup?.myRole === "admin" ? "Organizador" : "Viajero",
        initials: (localUser?.nombre ?? localUser?.email ?? "U")
          .slice(0, 1)
          .toUpperCase(),
        color: "#7A4FD6",
      }}
    >
      <div className="min-h-full bg-[#F4F6F8] px-6 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#1E0A4E]">
                Propuestas guardadas
              </h1>
              <p className="text-sm text-[#5A6B85]">
                Historial de resultados M4 guardados en este viaje.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                navigate("/search/flights-hotels", {
                  state: currentGroup
                    ? { groupId: currentGroup.id, group: currentGroup }
                    : undefined,
                })
              }
              className="rounded-xl border border-[#D9E2EF] bg-white px-4 py-2 text-sm font-semibold text-[#1E0A4E] hover:bg-[#F9FBFF]"
            >
              Ir a búsqueda
            </button>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-sm text-[#5A6B85]">
              Cargando historial...
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#991B1B]">
              {errorMessage}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 text-sm text-[#5A6B85]">
              Aún no hay propuestas guardadas en el historial.
            </div>
          ) : (
            <div className="grid gap-3">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#E8F0FF] px-2.5 py-1 text-xs font-semibold text-[#1E6FD9]">
                      {typeLabel(item.tipo_item)}
                    </span>
                    <span className="rounded-full bg-[#F3F4F6] px-2.5 py-1 text-xs font-semibold text-[#374151]">
                      {sourceLabel(item.fuente)}
                    </span>
                    <span className="text-xs text-[#6B7280]">
                      {formatDate(item.created_at)}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-[#1E0A4E]">
                    {item.titulo}
                  </h2>
                  {item.descripcion ? (
                    <p className="mt-1 text-sm text-[#5A6B85]">{item.descripcion}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </SearchIntegratedShell>
  );
};

export default SearchHistoryPage;

