"use client";

// components/TareasPanel.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import TareaDialog, { type DialogState } from "@/Components/TareaDialog";
import {
  ESTADOS,
  actualizarTareaParcial,
  formatFecha,
  getEstado,
  listarTareas,
  type Tarea,
} from "@/lib/tareas";

export default function TareasPanel() {
  const router = useRouter();
  const [tareas, setTareas] = useState<Tarea[] | null>(null); // null = cargando
  const [filtro, setFiltro] = useState<number | null>(null); // null = todas
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  // Sesión vencida (401) → volver al login. Otro error → mensaje en pantalla.
  const handleError = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/");
        return;
      }
      setError(err instanceof Error ? err.message : "Algo salió mal. Inténtalo de nuevo.");
    },
    [router]
  );

  // GET /api/tareas/
  useEffect(() => {
    let cancelled = false;

    listarTareas()
      .then((data) => {
        if (!cancelled) setTareas(data);
      })
      .catch((err) => {
        if (cancelled) return;
        handleError(err);
        setTareas([]);
      });

    // Al ocultarse la página se limpia el estado, para no mostrar las tareas
    // de otra cuenta si alguien inicia sesión después en el mismo navegador.
    return () => {
      cancelled = true;
      setTareas(null);
      setDialog(null);
      setFiltro(null);
      setError("");
    };
  }, [handleError]);

  const visibles = useMemo(
    () => (tareas ?? []).filter((t) => filtro === null || t.estado === filtro),
    [tareas, filtro]
  );

  const conteo = useMemo(() => {
    const counts = new Map<number, number>();
    (tareas ?? []).forEach((t) => counts.set(t.estado, (counts.get(t.estado) ?? 0) + 1));
    return counts;
  }, [tareas]);

  // PATCH: cambio rápido de estado desde la tarjeta (solo se envía "estado")
  async function cambiarEstado(tarea: Tarea, estado: number) {
    setPendingId(tarea.id);
    setError("");
    try {
      const updated = await actualizarTareaParcial(tarea.id, { estado });
      setTareas((prev) => prev?.map((t) => (t.id === updated.id ? updated : t)) ?? prev);
    } catch (err) {
      handleError(err);
    } finally {
      setPendingId(null);
    }
  }

  const total = tareas?.length ?? 0;

  return (
    <section aria-labelledby="mis-tareas">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2
            id="mis-tareas"
            className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[#23394d]"
          >
            Mis tareas
          </h2>
          <p className="mt-0.5 text-sm text-[#5b7690]">
            {tareas === null
              ? "Cargando…"
              : total === 0
                ? "Todavía no tienes tareas."
                : `${total} ${total === 1 ? "tarea" : "tareas"} en total`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setDialog({ tarea: null, mode: "editar" })}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-[#4a6b8a] to-[#35506b] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#35506b]/25 transition hover:from-[#527594] hover:to-[#2f4962] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/50"
        >
          <PlusIcon />
          Nueva tarea
        </button>
      </div>

      {total > 0 && (
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
          <Chip active={filtro === null} onClick={() => setFiltro(null)}>
            Todas · {total}
          </Chip>
          {ESTADOS.map((e) => (
            <Chip key={e.value} active={filtro === e.value} onClick={() => setFiltro(e.value)}>
              {e.label} · {conteo.get(e.value) ?? 0}
            </Chip>
          ))}
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl border border-[#e9c6c6] bg-[#fbeeee] px-4 py-2.5 text-sm text-[#8a4545]"
        >
          {error}
        </p>
      )}

      <div className="mt-5">
        {tareas === null ? (
          <ul className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <li key={i} className="h-32 animate-pulse rounded-2xl bg-white/60" />
            ))}
          </ul>
        ) : total === 0 ? (
          <EmptyState
            title="Tu lista está vacía"
            text="Crea tu primera tarea para empezar a organizarte."
            action={
              <button
                type="button"
                onClick={() => setDialog({ tarea: null, mode: "editar" })}
                className="rounded-xl border border-[#c9dbe8] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#35506b] transition hover:bg-white"
              >
                Crear tarea
              </button>
            }
          />
        ) : visibles.length === 0 ? (
          <EmptyState title="Sin resultados" text="No hay tareas con ese estado." />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {visibles.map((t) => (
              <li
                key={t.id}
                className="flex flex-col rounded-2xl border border-white/80 bg-white/80 p-5 shadow-[0_18px_40px_-24px_rgba(53,80,107,0.4)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_44px_-22px_rgba(53,80,107,0.5)]"
              >
                {/* Abre el detalle (GET /{id}/); desde ahí se edita o se elimina */}
                <button
                  type="button"
                  onClick={() => setDialog({ tarea: t, mode: "ver" })}
                  className="flex-1 rounded-lg text-left focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/40"
                >
                  <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[#23394d]">
                    {t.titulo}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-sm text-[#5b7690]">
                    {t.descripcion || "Sin descripción"}
                  </p>
                </button>

                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="text-xs text-[#8fa9bf]">{formatFecha(t.fecha_creacion)}</span>
                  <select
                    aria-label={`Estado de ${t.titulo}`}
                    value={t.estado}
                    disabled={pendingId === t.id}
                    onChange={(e) => cambiarEstado(t, Number(e.target.value))}
                    className={`rounded-full border px-3 py-1 text-xs font-medium outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/30 disabled:opacity-60 ${getEstado(t.estado).tone}`}
                  >
                    {ESTADOS.map((e) => (
                      <option key={e.value} value={e.value}>
                        {e.label}
                      </option>
                    ))}
                    {!ESTADOS.some((e) => e.value === t.estado) && (
                      <option value={t.estado}>{getEstado(t.estado).label}</option>
                    )}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <TareaDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onCreated={(t) => setTareas((prev) => [t, ...(prev ?? [])])} // más reciente primero
        onUpdated={(t) => setTareas((prev) => prev?.map((x) => (x.id === t.id ? t : x)) ?? prev)}
        onDeleted={(id) => setTareas((prev) => prev?.filter((x) => x.id !== id) ?? prev)}
        onUnauthorized={() => router.replace("/")}
      />
    </section>
  );
}

/* ---------------------------------- Piezas ---------------------------------- */
function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/40 ${
        active
          ? "border-[#35506b] bg-[#35506b] text-white"
          : "border-[#c9dbe8] bg-white/70 text-[#4d6a85] hover:bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-[#c9dbe8] bg-white/50 px-6 py-12 text-center">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-12 w-12 text-[#a9c0d2]"
      >
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
        <path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2" />
      </svg>
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-lg font-semibold text-[#23394d]">
        {title}
      </h3>
      <p className="mt-1 text-sm text-[#5b7690]">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}