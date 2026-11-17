"use client";

// components/Modal.tsx
import { useEffect, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy: string; // id del título, para lectores de pantalla
  children: ReactNode;
}

export default function Modal({ open, onClose, labelledBy, children }: ModalProps) {
  // Escape cierra y se bloquea el scroll del fondo mientras está abierto
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            aria-hidden="true"
            onClick={onClose}
            className="absolute inset-0 bg-[#23394d]/40 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/80 bg-white/90 p-7 shadow-[0_30px_70px_-20px_rgba(35,57,77,0.55)] backdrop-blur-xl"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}