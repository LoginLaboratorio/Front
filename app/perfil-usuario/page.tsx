"use client";

// app/perfil-usuario/page.tsx  →  ruta "/perfil-usuario"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import TareasPanel from "@/Components/TareasPanel";
import { getRole, getRoleLabel, getSession, logout, type RoleId, type User } from "@/lib/api";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

const ROLE_TONE: Record<RoleId, string> = {
  1: "bg-[#ebe4f5] text-[#5a4a82] border-[#d5c8ea]",
  2: "bg-[#dcebf6] text-[#35506b] border-[#bcd5e8]",
  3: "bg-[#e1f1e8] text-[#3d6b52] border-[#bfdccb]",
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("es-PE", { dateStyle: "long" }) : "—";

export default function PerfilUsuarioPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Sin sesión válida → volver al login
  useEffect(() => {
    let cancelled = false;

    getSession()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) router.replace("/");
      });

    // Al ocultarse la página se descarta el usuario anterior
    return () => {
      cancelled = true;
      setUser(null);
      setLoggingOut(false);
    };
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      router.replace("/");
    }
  }

  const roleId = user ? getRole(user.role) : null;

  return (
    <div
      className={`${display.variable} ${body.variable} min-h-screen bg-gradient-to-b from-[#dfeaf3] to-[#f4f8fb] font-[family-name:var(--font-body)]`}
    >
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[#23394d]">
          Escarcha
        </span>
        <button
          onClick={handleLogout}
          disabled={loggingOut || !user}
          className="rounded-xl border border-[#c9dbe8] bg-white/80 px-4 py-2 text-sm font-medium text-[#35506b] transition hover:bg-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/40 disabled:opacity-60"
        >
          {loggingOut ? "Saliendo…" : "Cerrar sesión"}
        </button>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-10 px-4 pb-16 pt-4">
        {!user ? (
          <p className="text-center text-[#5b7690]">Cargando tu perfil…</p>
        ) : (
          <>
            <section className="flex flex-wrap items-center gap-5 rounded-3xl border border-white/80 bg-white/80 p-6 shadow-[0_24px_60px_-24px_rgba(53,80,107,0.35)] sm:p-7">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#35506b] font-[family-name:var(--font-display)] text-2xl font-semibold text-white"
              >
                {user.username.charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-[#23394d]">
                    {user.username}
                  </h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${
                      roleId ? ROLE_TONE[roleId] : "border-[#d6dfe8] bg-[#eef1f5] text-[#5b7690]"
                    }`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-sm text-[#5b7690]">
                  {user.email ?? "Sin correo registrado"}
                </p>
              </div>

              <p className="text-sm text-[#5b7690]">
                Miembro desde{" "}
                <span className="font-medium text-[#23394d]">{formatDate(user.date_joined)}</span>
              </p>
            </section>

            <TareasPanel />
          </>
        )}
      </main>
    </div>
  );
}