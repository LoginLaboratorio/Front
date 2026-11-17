"use client";

// components/TareaDialog.tsx
import { useEffect, useState, type FormEvent } from "react";
import Modal from "@/Components/Modal";
import { ApiError } from "@/lib/api";
import {
  ESTADOS,
  actualizarTarea,
  crearTarea,
  eliminarTarea,
  formatFecha,
  getEstado,
  obtenerTarea,
  type Tarea,
  type TareaInput,
} from "@/lib/tareas";

// tarea === null significa "crear una nueva"
export interface DialogState {
  tarea: Tarea | null;
  mode: "ver" | "editar";
}

interface Handlers {
  onClose: () => void;
  onCreated: (t: Tarea) => void;
  onUpdated: (t: Tarea) => void;
  onDeleted: (id: number) => void;
  onUnauthorized: () => void;
}

interface TareaDialogProps extends Handlers {
  dialog: DialogState | null;
}

const btnPrimary =
  "rounded-xl bg-gradient-to-b from-[#4a6b8a] to-[#35506b] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-[#35506b]/25 transition hover:from-[#527594] hover:to-[#2f4962] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/50 disabled:cursor-not-allowed disabled:opacity-60";
const btnSecondary =
  "rounded-xl border border-[#c9dbe8] bg-white/80 px-4 py-2.5 text-sm font-medium text-[#35506b] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/40 disabled:opacity-60";
const btnDanger =
  "rounded-xl border border-[#e9c6c6] bg-[#fbeeee] px-4 py-2.5 text-sm font-medium text-[#8a4545] transition hover:bg-[#f7e2e2] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#e9c6c6]/60 disabled:opacity-60";
const inputClass =
  "w-full rounded-xl border border-[#c9dbe8] bg-white/80 px-4 py-2.5 text-[#23394d] outline-none transition placeholder:text-[#9db3c4] focus:border-[#7fa8c9] focus:bg-white focus:ring-4 focus:ring-[#7fa8c9]/25";

export default function TareaDialog({ dialog, ...handlers }: TareaDialogProps) {
  return (
    <Modal open={dialog !== null} onClose={handlers.onClose} labelledBy="tarea-dialog-title">
      {/* key: cada vez que se abre una tarea distinta, el estado interno empieza limpio */}
      {dialog && (
        <Body
          key={dialog.tarea?.id ?? "nueva"}
          tarea={dialog.tarea}
          initialMode={dialog.mode}
          {...handlers}
        />
      )}
    </Modal>
  );
}

interface BodyProps extends Handlers {
  tarea: Tarea | null;
  initialMode: "ver" | "editar";
}

function Body({
  tarea,
  initialMode,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
  onUnauthorized,
}: BodyProps) {
  const isNew = tarea === null;

  const [current, setCurrent] = useState<Tarea | null>(tarea);
  const [mode, setMode] = useState<"ver" | "editar">(isNew ? "editar" : initialMode);
  const [form, setForm] = useState<TareaInput>({
    titulo: tarea?.titulo ?? "",
    descripcion: tarea?.descripcion ?? "",
    estado: tarea?.estado ?? ESTADOS[0].value,
  });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  // GET /api/tareas/{id}/: al abrir una tarea existente se pide el detalle actualizado.
  // Es un refresco opcional: si falla, se siguen mostrando los datos de la lista.
  useEffect(() => {
    if (!tarea) return;
    let cancelled = false;

    obtenerTarea(tarea.id)
      .then((t) => {
        if (!cancelled) setCurrent(t);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [tarea]);

  function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      onUnauthorized();
      return;
    }
    setError(err instanceof Error ? err.message : "Algo salió mal. Inténtalo de nuevo.");
  }

  function startEdit() {
    if (!current) return;
    setForm({
      titulo: current.titulo,
      descripcion: current.descripcion,
      estado: current.estado,
    });
    setError("");
    setMode("editar");
  }

  // POST (crear) o PUT (actualización completa)
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload: TareaInput = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      estado: form.estado,
    };

    try {
      if (isNew) {
        const created = await crearTarea(payload);
        onCreated(created);
        onClose();
      } else if (current) {
        const updated = await actualizarTarea(current.id, payload);
        onUpdated(updated);
        setCurrent(updated);
        setMode("ver");
      }
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  // DELETE
  async function handleDelete() {
    if (!current) return;
    setError("");
    setSaving(true);

    try {
      await eliminarTarea(current.id);
      onDeleted(current.id);
      onClose();
    } catch (err) {
      handleError(err);
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------ Edición / creación ------------------------------ */
  if (mode === "editar") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2
          id="tarea-dialog-title"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[#23394d]"
        >
          {isNew ? "Nueva tarea" : "Editar tarea"}
        </h2>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#4d6a85]">Título</span>
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            className={inputClass}
            autoFocus
            required
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#4d6a85]">Descripción</span>
          <textarea
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-[#4d6a85]">Estado</span>
          <select
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: Number(e.target.value) })}
            className={inputClass}
          >
            {ESTADOS.map((e) => (
              <option key={e.value} value={e.value}>
                {e.label}
              </option>
            ))}
            {!ESTADOS.some((e) => e.value === form.estado) && (
              <option value={form.estado}>{getEstado(form.estado).label}</option>
            )}
          </select>
        </label>

        {error && <ErrorBox message={error} />}

        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={isNew ? onClose : () => setMode("ver")}
            disabled={saving}
            className={btnSecondary}
          >
            Cancelar
          </button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? "Guardando…" : isNew ? "Crear tarea" : "Guardar cambios"}
          </button>
        </div>
      </form>
    );
  }

  /* ------------------------------------ Detalle ------------------------------------ */
  if (!current) return null;
  const estado = getEstado(current.estado);

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <h2
          id="tarea-dialog-title"
          className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[#23394d]"
        >
          {current.titulo}
        </h2>
        <span
          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${estado.tone}`}
        >
          {estado.label}
        </span>
      </div>

      <p className="mt-1 text-sm text-[#5b7690]">Creada el {formatFecha(current.fecha_creacion)}</p>

      <p className="mt-5 whitespace-pre-wrap text-[#35506b]">
        {current.descripcion || <span className="text-[#9db3c4]">Sin descripción</span>}
      </p>

      {error && (
        <div className="mt-4">
          <ErrorBox message={error} />
        </div>
      )}

      {confirming ? (
        <div className="mt-6 rounded-2xl border border-[#e9c6c6] bg-[#fbeeee] p-4">
          <p className="text-sm text-[#8a4545]">
            ¿Eliminar esta tarea? Esta acción no se puede deshacer.
          </p>
          <div className="mt-3 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className={btnSecondary}
            >
              Cancelar
            </button>
            <button type="button" onClick={handleDelete} disabled={saving} className={btnDanger}>
              {saving ? "Eliminando…" : "Sí, eliminar"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => setConfirming(true)} className={btnDanger}>
            Eliminar
          </button>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cerrar
            </button>
            <button type="button" onClick={startEdit} className={btnPrimary}>
              Editar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-[#e9c6c6] bg-[#fbeeee] px-4 py-2.5 text-sm text-[#8a4545]"
    >
      {message}
    </p>
  );
}