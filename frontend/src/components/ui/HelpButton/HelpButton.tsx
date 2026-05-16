import { useId, useState } from "react";

interface HelpButtonProps {
  title: string;
  description: string;
  placement?: "left" | "right" | "center";
  className?: string;
}

export function HelpButton({
  title,
  description,
  placement = "left",
  className = "",
}: HelpButtonProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  const placementClasses =
    placement === "right"
      ? "right-0"
      : placement === "center"
        ? "left-1/2 -translate-x-1/2"
        : "left-0";

  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={`Ayuda: ${title}`}
        aria-expanded={open}
        aria-describedby={open ? tooltipId : undefined}
        onClick={() => setOpen((current) => !current)}
        onBlur={() => setOpen(false)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#DCE6F4] bg-white text-[#1E6FD9] shadow-sm transition hover:border-[#1E6FD9] hover:bg-[#EEF4FF] focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
      >
        <span className="font-heading text-sm font-bold leading-none">?</span>
      </button>

      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute top-10 z-[120] w-72 rounded-2xl border border-[#DCE6F4] bg-white p-4 text-left shadow-xl ${placementClasses}`}
        >
          <span className="block font-heading text-sm font-bold text-[#1E0A4E]">
            {title}
          </span>
          <span className="mt-1 block font-body text-xs leading-relaxed text-[#64748B]">
            {description}
          </span>
        </span>
      )}
    </span>
  );
}

export default HelpButton;
