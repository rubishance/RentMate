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
        "flex flex-col p-4 md:p-5 rounded-[1.25rem] bg-secondary/5 dark:bg-secondary/10 transition-all text-start",
        isClickable &&
          "cursor-pointer hover:bg-secondary/10 dark:hover:bg-secondary/20 active:scale-[0.98]",
        className
      )}
    >
      {/* Label and Icon Row */}
      <div className="flex items-center justify-start gap-1.5 text-muted-foreground mb-1.5">
        {icon && (
          <span className="w-4 h-4 flex items-center justify-center opacity-80 text-muted-foreground">
            {icon}
          </span>
        )}
        <span className="text-[13px] font-medium text-muted-foreground">
          {label}
        </span>
      </div>

      {/* Value Row */}
      <div
        className={cn(
          "text-[16px] md:text-[17px] font-bold text-foreground leading-tight text-start",
          valueClassName
        )}
        dir="rtl"
      >
        {value || "-"}
      </div>
    </div>
  );
}
