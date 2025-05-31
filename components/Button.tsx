import { JSX } from "preact";
import { IS_BROWSER } from "$fresh/runtime.ts";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
  small?: boolean;
}

export function Button({ small = false, ...props }: ButtonProps) {
  // Determina le classi CSS in base alla dimensione
  const sizeClasses = small 
    ? "px-2 py-1 text-sm" 
    : "px-3 py-2";
  
  return (
    <button
      {...props}
      disabled={!IS_BROWSER || props.disabled}
      class={`${sizeClasses} border-gray-500 border-2 rounded bg-white hover:bg-gray-200 transition-colors ${props.class || ""}`}
    />
  );
}
