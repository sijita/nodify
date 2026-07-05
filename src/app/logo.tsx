import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { useTheme } from "./theme-store";

/**
 * Logo de Nodify (cara de perro). Cambia según el tema: la variante oscura tiene
 * contorno blanco (resalta en fondo oscuro) y la clara contorno negro (resalta en claro).
 */
export function Logo({ className }: { className?: string }) {
  const theme = useTheme((s) => s.theme);
  return (
    <img
      src={theme === "dark" ? logoDark : logoLight}
      alt="Nodify"
      className={className}
      draggable={false}
    />
  );
}
