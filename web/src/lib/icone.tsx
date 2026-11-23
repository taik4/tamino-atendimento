import { HugeiconsIcon } from "@hugeicons/react";
import type { ComponentProps } from "react";

// Ícones: Hugeicons Stroke Rounded (pacote gratuito @hugeicons/core-free-icons). Um traço só no app inteiro.
export function Icone({ icon, size = 20, ...rest }: Omit<ComponentProps<typeof HugeiconsIcon>, "strokeWidth"> & { size?: number }) {
  return <HugeiconsIcon icon={icon} size={size} strokeWidth={1.6} aria-hidden="true" {...rest} />;
}
