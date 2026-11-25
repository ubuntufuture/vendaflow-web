import type { SVGProps } from "react";
import { Icon, type IconName } from "../../packages/ui/components/icons";
// Reconstituição vetorial dos quatro pictogramas do brandboard; não é o SVG oficial do logo.
export function BrandIcon({name,...props}: SVGProps<SVGSVGElement> & {name: IconName | "integration"}) {
  if (!["conversation","automation","sales","integration"].includes(name)) return <Icon name={name as IconName} {...props}/>;
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" {...props}>
    {name === "conversation" && <><path d="M5 3h14a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-8l-5 4v-4H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z"/><circle cx="7" cy="11" r=".7" fill="currentColor"/><circle cx="12" cy="11" r=".7" stroke="#FF6A4D" fill="#FF6A4D"/><circle cx="17" cy="11" r=".7" fill="currentColor"/></>}
    {name === "automation" && <><path d="m14 1-9 13h7l-2 9 10-14h-7l1-8Z"/><path d="m14 18 6-9" stroke="#FF6A4D"/></>}
    {name === "sales" && <><path d="M4 20v-5 M10 20V9 M16 20V5 M22 20V1"/><path d="M10 20v-8 M16 20V9" stroke="#FF6A4D"/></>}
    {name === "integration" && <><path d="m2 7 10-5 10 5-10 5L2 7Z M2 12l10 5 10-5"/><path d="m2 17 10 5 10-5" stroke="#FF6A4D"/></>}
  </svg>;
}
