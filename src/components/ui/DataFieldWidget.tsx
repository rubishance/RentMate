import { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface DataFieldWidgetProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
  valueClassName?: string;
}

/**
 * DataFieldWidget
 * A modern, "mini-window" style component for displaying read-only data fields.
 * Conforms to the Stitch UI specification: softly rounded gray container,
 * small uppercase label with an icon, and a bold dominant value.
 */
export function DataFieldWidget({
  label,
  value,
  icon,
  onClick,
  className,
  valueClassName,
}: DataFieldWidgetProps) {
  const isClickable = !!onClick;

  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-slate-50 dark:bg-neutral-800/50 rounded-2xl p-4 flex flex-col items-start text-start w-full gap-0.5 transition-all",
        isClickable &&
          "cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800 active:scale-[0.98]",
        className
      )}
    >
      {/* Label Row */}
      <div className="text-xs text-muted-foreground w-full font-medium ml-1 mb-1 flex items-center gap-2 justify-start">
        {label}
      </div>

      {/* Value Row */}
      <div
        className={cn(
          "text-base !font-black !text-brand-900 dark:!text-brand-100 pr-0.5 w-full leading-tight break-words text-start",
          valueClassName
        )}
        dir="rtl"
      >
        {value || "-"}
      </div>
    </div>
  );
}
