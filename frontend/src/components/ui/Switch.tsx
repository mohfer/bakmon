import { cn } from "../../lib/cn";

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2.5 rounded-md py-1 text-[12px] text-muted transition-colors duration-150 hover:text-foreground",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-[18px] w-8 rounded-full border transition-colors duration-150",
          checked
            ? "border-foreground bg-foreground"
            : "border-border-strong bg-surface",
        )}
      >
        <span
          className={cn(
            "absolute top-1/2 size-3 -translate-y-1/2 rounded-full transition-[left,background-color] duration-150",
            checked ? "left-[17px] bg-background" : "left-[3px] bg-muted",
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
