"use client";

// components/AuthCards.tsx
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionTemplate, useMotionValue, type Variants } from "framer-motion";
import gsap from "gsap";
import { login, register } from "@/lib/api";

type Mode = "login" | "register";
type FormValues = Record<string, string>;

/* ------------------------------------------------------------------ */
/* Animación de las tarjetas                                           */
/* La tarjeta activa está al frente; al cambiar, la de delante se      */
/* desliza al costado y pasa detrás mientras la otra avanza.           */
/* ------------------------------------------------------------------ */
const cardVariants: Variants = {
  front: {
    x: 0,
    y: 0,
    scale: 1,
    rotate: 0,
    opacity: 1,
    zIndex: 20,
    transition: { type: "spring", stiffness: 130, damping: 18, delay: 0.2 },
  },
  back: {
    x: [0, 90, 0],
    y: [0, 24, -44],
    scale: [1, 0.97, 0.92],
    rotate: [0, 4, 0],
    opacity: [1, 1, 0.75],
    zIndex: [20, 20, 10],
    transition: { duration: 0.8, times: [0, 0.45, 1], ease: "easeInOut" },
  },
};

export default function AuthCards() {
  const [mode, setMode] = useState<Mode>("login");
  const [formsKey, setFormsKey] = useState(0);

  // Vacía ambos formularios y deja el login al frente
  function resetForms() {
    setFormsKey((k) => k + 1);
    setMode("login");
  }

  return (
    <div className="grid w-full max-w-md pt-14 [&>*]:col-start-1 [&>*]:row-start-1">
      <Card active={mode === "login"} onActivate={() => setMode("login")}>
        <LoginForm
          key={`login-${formsKey}`}
          onSwitch={() => setMode("register")}
          onDone={resetForms}
        />
      </Card>

      <Card active={mode === "register"} onActivate={() => setMode("register")}>
        <RegisterForm
          key={`register-${formsKey}`}
          onSwitch={() => setMode("login")}
          onDone={resetForms}
        />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tarjeta                                                             */
/* ------------------------------------------------------------------ */
interface CardProps {
  active: boolean;
  onActivate: () => void;
  children: ReactNode;
}

function Card({ active, onActivate, children }: CardProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Brillo de escarcha que sigue al cursor
  const mx = useMotionValue(-300);
  const my = useMotionValue(-300);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(255,255,255,0.8), transparent 70%)`;

  function onPointerMove(e: ReactPointerEvent<HTMLElement>) {
    if (!active) return;
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
  }

  // La tarjeta de atrás no debe recibir foco ni clics en sus campos
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (active) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [active]);

  return (
    <motion.section
      variants={cardVariants}
      initial={false}
      animate={active ? "front" : "back"}
      onClick={active ? undefined : onActivate}
      onPointerMove={onPointerMove}
      aria-hidden={!active}
      className={`group/card relative flex flex-col rounded-3xl border border-white/80 bg-linear-to-br from-white/85 via-white/65 to-[#d6e8f5]/70 p-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_28px_60px_-22px_rgba(53,80,107,0.5)] backdrop-blur-xl sm:p-9 ${
        active ? "" : "cursor-pointer"
      }`}
    >
      <SnowCap />

      {/* Decoración recortada a la forma de la tarjeta */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
      >
        <div className="absolute inset-x-0 top-0 h-28 bg-linear-to-b from-white/60 to-transparent" />
        <Snowflake
          strokeWidth={0.6}
          className="absolute -bottom-12 -right-12 h-52 w-52 text-[#7fa8c9]/20"
        />
        <Snowflake
          strokeWidth={0.8}
          className="absolute -left-6 bottom-24 h-20 w-20 rotate-12 text-[#7fa8c9]/15"
        />
        <motion.div
          style={{ background: glow }}
          className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        />
      </div>

      <div ref={contentRef} className="relative z-10 flex flex-1 flex-col justify-center">
        {children}
      </div>
    </motion.section>
  );
}

// Montón de nieve acumulado sobre el borde superior de la tarjeta
function SnowCap() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 26"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-6 -top-[15px] h-[26px] drop-shadow-[0_2px_2px_rgba(53,80,107,0.18)]"
    >
      <path
        fill="#f7fbfe"
        d="M0 26C0 12 14 9 28 13C44 -2 66 0 80 11C98 4 118 6 130 15C150 -1 176 2 190 13C208 5 232 5 248 15C266 0 292 2 306 13C324 6 348 8 360 15C376 7 400 11 400 26Z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Formularios                                                         */
/* ------------------------------------------------------------------ */
function useAuthSubmit(action: (data: FormValues) => Promise<unknown>, onDone?: () => void) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // leer antes del await: después currentTarget ya no existe
    const data = Object.fromEntries(new FormData(e.currentTarget)) as FormValues;
    setError("");
    setLoading(true);

    try {
      await action(data);
      onDone?.();
      router.replace("/perfil-usuario");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo salió mal. Inténtalo de nuevo.");
      gsap.fromTo(formRef.current, { x: -10 }, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.25)" });
    } finally {
      setLoading(false);
    }
  }

  return { formRef, error, loading, onSubmit };
}

interface SwitchProps {
  onSwitch: () => void;
  onDone: () => void;
}

function LoginForm({ onSwitch, onDone }: SwitchProps) {
  const { formRef, error, loading, onSubmit } = useAuthSubmit((d) =>
    login({ username: d.username, password: d.password }), onDone
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <Heading
        title="Entra a tu cuenta"
        text="Tu perfil te espera."
        icon={<Snowflake className="h-6 w-6 animate-[spin_24s_linear_infinite] motion-reduce:animate-none" />}
      />

      <Field
        label="Usuario"
        name="username"
        autoComplete="username"
        icon={<IconUser />}
        required
      />
      <PasswordField label="Contraseña" name="password" autoComplete="current-password" required />

      <ErrorMessage message={error} />
      <SubmitButton loading={loading}>Iniciar sesión</SubmitButton>

      <Divider />
      <p className="text-center text-sm text-[#5b7690]">
        ¿Aún no tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-[#35506b] underline underline-offset-4 hover:text-[#1f3347]"
        >
          Crear cuenta
        </button>
      </p>
    </form>
  );
}

function RegisterForm({ onSwitch, onDone }: SwitchProps) {
  const [password, setPassword] = useState("");
  const { formRef, error, loading, onSubmit } = useAuthSubmit(async (d) => {
    if (d.password !== d.confirm) {
      throw new Error("Las contraseñas no coinciden.");
    }
    await register({ username: d.username, email: d.email, password: d.password });
    // Si tu endpoint de registro ya inicia sesión (setea la cookie), puedes quitar esta línea
    await login({ username: d.username, password: d.password });
  }, onDone);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <Heading
        title="Crea tu cuenta"
        text="Solo necesitas un usuario y una contraseña."
        icon={<IconUserPlus />}
      />

      <Field
        label="Usuario"
        name="username"
        autoComplete="username"
        maxLength={150}
        icon={<IconUser />}
        required
      />
      <Field
        label="Correo (opcional)"
        name="email"
        type="email"
        autoComplete="email"
        icon={<IconMail />}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <PasswordField
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <PasswordField
          label="Repetir contraseña"
          name="confirm"
          autoComplete="new-password"
          required
        />
      </div>
      <PasswordStrength value={password} />

      <ErrorMessage message={error} />
      <SubmitButton loading={loading}>Crear cuenta</SubmitButton>

      <Divider />
      <p className="text-center text-sm text-[#5b7690]">
        ¿Ya tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-[#35506b] underline underline-offset-4 hover:text-[#1f3347]"
        >
          Iniciar sesión
        </button>
      </p>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Piezas pequeñas                                                     */
/* ------------------------------------------------------------------ */
function Heading({ title, text, icon }: { title: string; text: string; icon: ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#eef6fc] to-[#bcd5e8] text-[#35506b] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_10px_18px_-10px_rgba(53,80,107,0.6)]">
        {icon}
      </span>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[#23394d]">
          {title}
        </h1>
        <p className="mt-0.5 text-sm text-[#5b7690]">{text}</p>
      </div>
    </div>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
}

function Field({ label, icon, trailing, ...props }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#4d6a85]">{label}</span>
      <span className="group/field relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-[#8fa9bf] transition-colors group-focus-within/field:text-[#4a6b8a]">
          {icon}
        </span>
        <input
          {...props}
          className="w-full rounded-xl border border-[#c9dbe8] bg-white/80 py-2.5 pl-11 pr-11 text-[#23394d] outline-none transition placeholder:text-[#9db3c4] focus:border-[#7fa8c9] focus:bg-white focus:ring-4 focus:ring-[#7fa8c9]/25"
        />
        {trailing && <span className="absolute right-2">{trailing}</span>}
      </span>
    </label>
  );
}

function PasswordField(props: Omit<FieldProps, "icon" | "trailing" | "type">) {
  const [show, setShow] = useState(false);

  return (
    <Field
      {...props}
      type={show ? "text" : "password"}
      icon={<IconLock />}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          className="rounded-lg p-1.5 text-[#8fa9bf] transition hover:text-[#35506b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7fa8c9]"
        >
          {show ? <IconEyeOff /> : <IconEye />}
        </button>
      }
    />
  );
}

// Medidor de seguridad de la contraseña (4 niveles)
function PasswordStrength({ value }: { value: string }) {
  if (!value) return null;

  const score = [
    value.length >= 8,
    /[a-z]/.test(value) && /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ].filter(Boolean).length;

  const labels = ["Muy débil", "Débil", "Regular", "Buena", "Fuerte"];
  const colors = ["#d99a9a", "#d99a9a", "#e0bf86", "#8fb8d6", "#5f9fc4"];

  return (
    <div aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full transition-colors duration-300"
            style={{ backgroundColor: i < score ? colors[score] : "#dbe7f0" }}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-[#5b7690]">Seguridad: {labels[score]}</p>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 text-[#a9c0d2]" aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9dbe8]" />
      <Snowflake className="h-3.5 w-3.5" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9dbe8]" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border border-[#e9c6c6] bg-[#fbeeee] px-4 py-2.5 text-sm text-[#8a4545]"
    >
      {message}
    </p>
  );
}

function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="group/btn relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#4a6b8a] to-[#35506b] px-4 py-3 font-medium text-white shadow-lg shadow-[#35506b]/30 transition hover:from-[#527594] hover:to-[#2f4962] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa8c9]/50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {/* Destello de hielo al pasar el cursor */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/30 blur-sm transition-transform duration-700 group-hover/btn:translate-x-[420%] motion-reduce:hidden"
      />
      <span className="relative">{loading ? "Un momento…" : children}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Íconos (SVG inline, sin dependencias)                               */
/* ------------------------------------------------------------------ */
function Icon({ children, className = "h-5 w-5" }: { children: ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

function Snowflake({ className = "h-5 w-5", strokeWidth = 1.5 }: { className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" />
      <path d="M9.5 3.8L12 6l2.5-2.2M9.5 20.2L12 18l2.5 2.2M3.5 10.5l3-.3-.8-2.9M20.5 13.5l-3 .3.8 2.9M3.5 13.5l3 .3-.8 2.9M20.5 10.5l-3-.3.8-2.9" />
    </svg>
  );
}

const IconUser = () => (
  <Icon>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
  </Icon>
);

const IconUserPlus = () => (
  <Icon className="h-6 w-6">
    <circle cx="10" cy="8" r="4" />
    <path d="M2.5 20c0-4 3.5-6 7.5-6s7.5 2 7.5 6M19 8v6M16 11h6" />
  </Icon>
);

const IconMail = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 7 8 6 8-6" />
  </Icon>
);

const IconLock = () => (
  <Icon>
    <rect x="5" y="11" width="14" height="9" rx="3" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

const IconEye = () => (
  <Icon className="h-[18px] w-[18px]">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Icon>
);

const IconEyeOff = () => (
  <Icon className="h-[18px] w-[18px]">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M3 3l18 18" />
  </Icon>
);