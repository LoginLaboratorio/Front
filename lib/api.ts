// lib/api.ts
// Cliente para el backend Django.
// Autenticación mediante cookies (access y refresh), sin CSRF.

// ========================================
// Configuración
// ========================================

// Las peticiones van al MISMO origen (/api/...) y Next las reenvía a Django
// (ver rewrites en next.config.ts). Así el navegador guarda y envía las cookies
// y no hace falta configurar CORS.
const BASE = "";

const ENDPOINTS = {
  login: "/api/users/login/",
  register: "/api/users/",
  me: "/api/users/me/",
  logout: "/api/users/logout/",
} as const;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// ========================================
// Roles
// ========================================

export const ROLES = { ADMIN: 1, DOCENTE: 2, ESTUDIANTE: 3 } as const;
export type RoleId = (typeof ROLES)[keyof typeof ROLES];

const ROLE_LABELS: Record<RoleId, string> = {
  1: "Administrador",
  2: "Docente",
  3: "Estudiante",
};

// El back guarda el rol en un CharField: puede llegar como "3" o como 3.
export function getRole(role: unknown): RoleId | null {
  const n = Number(role);
  return n === 1 || n === 2 || n === 3 ? n : null;
}

export function getRoleLabel(role: unknown): string {
  const id = getRole(role);
  return id ? ROLE_LABELS[id] : "Sin rol";
}

// ========================================
// Interfaces
// ========================================

export interface LoginPayload {
  username: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  email?: string;
}

export interface User {
  username: string;
  email: string | null;
  role: string | number;
  date_joined: string;
}

// El back puede devolver los datos del usuario creado o solo un mensaje
export type RegisterResponse = Partial<User> & { message?: string };

export interface RegisterAndLoginResponse {
  message: string;
  user: User;
}

// ========================================
// Manejo de errores
// ========================================

// Error con el código HTTP, para poder reaccionar a 401, 403, 404...
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function parseError(data: unknown, status: number): string {
  const fallback = `Error ${status}. Inténtalo de nuevo.`;

  if (!data) return fallback;

  if (typeof data === "string") {
    // Si Django devolvió una página HTML (error 400/500), no mostrarla al usuario
    return data.trimStart().startsWith("<") ? fallback : data;
  }

  if (typeof data !== "object") return fallback;

  const body = data as Record<string, unknown>;

  if (typeof body.detail === "string") return body.detail;

  // Errores de validación de Django REST Framework
  for (const value of Object.values(body)) {
    if (typeof value === "string") return value;

    if (Array.isArray(value)) {
      const message = value.find((item) => typeof item === "string");
      if (typeof message === "string") return message;
    }
  }

  return fallback;
}

// ========================================
// Función principal de peticiones
// ========================================

export async function request<T>(
  path: string,
  {
    method = "GET",
    body,
  }: {
    method?: HttpMethod;
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const url = `${BASE}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      credentials: "include",
      cache: "no-store",
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    // Error de red (el servidor no responde)
    throw new ApiError("No se pudo conectar con el servidor. Inténtalo más tarde.", 0);
  }

  // Leer la respuesta aunque no sea JSON (un 204 llega vacío)
  const responseText = await res.text();

  let data: unknown = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("API RESPONSE:", { url, method, status: res.status, ok: res.ok, data });
  }

  if (!res.ok) {
    throw new ApiError(parseError(data, res.status), res.status);
  }

  return data as T;
}

// ========================================
// Autenticación
// ========================================

// Iniciar sesión
export const login = ({ username, password }: LoginPayload) =>
  request<User>(ENDPOINTS.login, {
    method: "POST",
    body: { username, password },
  });

// Registrar usuario (el rol lo asigna el back: todo registro es estudiante)
export const register = ({ username, email, password }: RegisterPayload) =>
  request<RegisterResponse>(ENDPOINTS.register, {
    method: "POST",
    body: {
      username,
      password,
      ...(email ? { email } : {}),
    },
  });

// Registro + inicio de sesión automático
export const registerAndLogin = async (
  payload: RegisterPayload
): Promise<RegisterAndLoginResponse> => {
  // 1. Registrar usuario
  const registered = await register(payload);

  // 2. Iniciar sesión
  const user = await login({
    username: payload.username,
    password: payload.password,
  });

  // 3. Devolver resultados
  return {
    message: registered.message ?? "Cuenta creada correctamente.",
    user,
  };
};

// Obtener usuario autenticado
export const getSession = async (): Promise<User> => {
  const user = await request<User>(ENDPOINTS.me);

  // Si el backend serializa AnonymousUser con HTTP 200 ({ username: "", email: null }),
  // tratarlo como sesión no autenticada.
  if (!user || !user.username?.trim()) {
    throw new ApiError("No hay sesión activa.", 401);
  }

  return user;
};

// Cerrar sesión (204 sin cuerpo)
export const logout = () => request<null>(ENDPOINTS.logout, { method: "POST" });