import { cn } from "@/lib/utils";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; count?: number }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            active === tab.id
              ? "border-brand-600 text-brand-700"
              : "border-transparent text-muted hover:text-fg",
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ms-1.5 rounded-full bg-brand-50 px-1.5 text-xs">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}
