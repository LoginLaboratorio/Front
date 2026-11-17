// lib/tareas.ts
// Endpoints de /api/tareas/ (cada usuario gestiona sus propias tareas).
import { request } from "@/lib/api";

const PATH = "/api/tareas/";

// ========================================
// Tipos
// ========================================

export interface Tarea {
  id: number;
  titulo: string;
  descripcion: string;
  fecha_creacion: string;
  estado: number;
}

export interface TareaInput {
  titulo: string;
  descripcion: string;
  estado: number;
}

// ========================================
// Estados
// ========================================
// SUPUESTO: la API solo dice que "estado" es un entero (el ejemplo usa 1).
// Ajusta esta lista a los valores reales de tu modelo; la interfaz se adapta sola.
export const ESTADOS = [
  { value: 1, label: "Pendiente", tone: "bg-[#eef1f5] text-[#5b7690] border-[#d6dfe8]" },
  { value: 2, label: "En progreso", tone: "bg-[#dcebf6] text-[#35506b] border-[#bcd5e8]" },
  { value: 3, label: "Completada", tone: "bg-[#e1f1e8] text-[#3d6b52] border-[#bfdccb]" },
] as const;

export function getEstado(value: number) {
  return (
    ESTADOS.find((e) => e.value === value) ?? {
      value,
      label: `Estado ${value}`,
      tone: ESTADOS[0].tone,
    }
  );
}

export function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ========================================
// Endpoints
// ========================================

// GET /api/tareas/ → listar (más recientes primero)
export const listarTareas = async (): Promise<Tarea[]> => {
  const data = await request<Tarea[] | { results: Tarea[] }>(PATH);
  // Tolera que el back active paginación de DRF
  return Array.isArray(data) ? data : data.results;
};

// POST /api/tareas/ → crear (el usuario lo asigna el back)
export const crearTarea = (data: TareaInput) =>
  request<Tarea>(PATH, { method: "POST", body: data });

// GET /api/tareas/{id}/ → detalle
export const obtenerTarea = (id: number) => request<Tarea>(`${PATH}${id}/`);

// PUT /api/tareas/{id}/ → actualización completa
export const actualizarTarea = (id: number, data: TareaInput) =>
  request<Tarea>(`${PATH}${id}/`, { method: "PUT", body: data });

// PATCH /api/tareas/{id}/ → actualización parcial
export const actualizarTareaParcial = (id: number, data: Partial<TareaInput>) =>
  request<Tarea>(`${PATH}${id}/`, { method: "PATCH", body: data });

// DELETE /api/tareas/{id}/ → eliminar (204 sin cuerpo)
export const eliminarTarea = (id: number) =>
  request<null>(`${PATH}${id}/`, { method: "DELETE" });