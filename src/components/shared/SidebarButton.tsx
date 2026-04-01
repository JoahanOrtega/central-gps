import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  title: string;
  isActive?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export const SidebarButton = ({
  title,
  isActive = false,
  onClick,
  children,
}: SidebarButtonProps) => {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-18 w-18 items-center justify-center rounded-xl border transition-all",
        isActive
          ? "border-sky-300 bg-sky-50 text-sky-700 shadow-sm"
          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700",
      )}
    >
      {children}
    </button>
  );
};
