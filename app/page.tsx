"use client";

// app/page.jsx  →  ruta "/"
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Snowfall from "react-snowfall";
import gsap from "gsap";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import AuthCards from "@/components/AuthCards";
import { getSession } from "@/lib/api";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body" });

export default function HomePage() {
  const router = useRouter();
  const rootRef = useRef(null);
  const bgRef = useRef(null);

  // Si ya hay sesión (cookie válida), saltar directo al perfil
  useEffect(() => {
    getSession()
      .then(() => router.replace("/perfil-usuario"))
      .catch(() => {}); // sin sesión: se queda en el login
  }, [router]);

  // GSAP: zoom lento del fondo + entrada del header y de las tarjetas
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        bgRef.current,
        { scale: 1.12 },
        { scale: 1, duration: 14, ease: "power1.out" }
      );

      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-intro='header']", { y: -24, opacity: 0, duration: 0.9 })
        .from("[data-intro='cards']", { y: 40, opacity: 0, duration: 1.1 }, "-=0.5");
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`${display.variable} ${body.variable} relative min-h-screen overflow-hidden bg-[#dfeaf3] font-[family-name:var(--font-body)]`}
    >
      {/* Capa 0: imagen de fondo (coloca tu imagen en /public/invierno.jpg) */}
      <div
        ref={bgRef}
        className="absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/invierno.jpg')" }}
      />
      {/* Velo suave para que las tarjetas y el texto se lean bien */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#23394d]/35 via-[#7fa8c9]/10 to-[#eaf2f8]/40" />

      {/* Capa 1: nieve (delante de la imagen, detrás de las tarjetas) */}
      <Snowfall
        color="#ffffff"
        snowflakeCount={140}
        radius={[0.6, 3.2]}
        speed={[0.5, 2]}
        wind={[-0.5, 1.5]}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 10,
          pointerEvents: "none",
        }}
      />

      {/* Capa 2: header + tarjetas */}
      <header
        data-intro="header"
        className="relative z-30 flex items-center gap-2.5 px-6 py-5 sm:px-10"
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <g stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round">
            <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
            <path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2" />
          </g>
        </svg>
        <span className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-white drop-shadow">
          Escarcha
        </span>
      </header>

      <main className="relative z-20 flex min-h-[calc(100vh-76px)] items-center justify-center px-4 pb-10">
        <div data-intro="cards" className="w-full max-w-md">
          <AuthCards />
        </div>
      </main>
    </div>
  );
}