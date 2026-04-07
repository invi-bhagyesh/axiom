"use client";

import { cn } from "@/lib/utils";

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  tags?: string[];
  meta?: string;
  cta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
}

function BentoGrid({ items }: BentoGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "group relative p-4 overflow-hidden transition-all duration-300",
            "border border-[rgba(0,200,240,0.08)]",
            "bg-[linear-gradient(135deg,rgba(0,30,50,0.25)_0%,rgba(6,8,16,0.5)_100%)]",
            "hover:border-[rgba(0,200,240,0.16)]",
            "hover:-translate-y-0.5 will-change-transform",
            "rounded-[3px]",
            item.colSpan === 2 ? "md:col-span-2" : "col-span-1",
            {
              "border-[rgba(0,200,240,0.12)] -translate-y-0.5": item.hasPersistentHover,
            }
          )}
        >
          {/* Top edge glow */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,200,240,0.15), transparent)' }} />

          {/* Dot grid on hover */}
          <div
            className={`absolute inset-0 ${
              item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            } transition-opacity duration-300`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,200,240,0.015)_1px,transparent_1px)] bg-[length:6px_6px]" />
          </div>

          <div className="relative flex flex-col space-y-3">
            {/* Header row: icon + status */}
            <div className="flex items-center justify-between">
              <div className="w-7 h-7 rounded-[2px] flex items-center justify-center"
                style={{ background: 'rgba(0,200,240,0.06)', border: '1px solid rgba(0,200,240,0.08)' }}>
                {item.icon}
              </div>
              <span className="text-[9px] font-medium px-2 py-0.5 rounded-[2px] tracking-[0.08em] uppercase"
                style={{
                  background: 'rgba(0,200,240,0.05)',
                  color: 'rgba(120,190,220,0.5)',
                  border: '1px solid rgba(0,200,240,0.06)',
                }}>
                {item.status || "Active"}
              </span>
            </div>

            {/* Title + description */}
            <div className="space-y-1.5">
              <h3 className="font-medium tracking-tight text-[13px]" style={{ color: 'rgba(180,220,240,0.75)' }}>
                {item.title}
                {item.meta && (
                  <span className="ml-2 text-[10px] font-normal" style={{ color: 'rgba(100,170,200,0.3)' }}>
                    {item.meta}
                  </span>
                )}
              </h3>
              <p className="text-[11px] leading-relaxed" style={{ color: 'rgba(120,180,210,0.4)' }}>
                {item.description}
              </p>
            </div>

            {/* Footer: tags + CTA */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1.5 text-[9px]" style={{ color: 'rgba(100,170,200,0.3)' }}>
                {item.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 rounded-[2px] transition-all duration-200"
                    style={{
                      background: 'rgba(0,200,240,0.04)',
                      border: '1px solid rgba(0,200,240,0.05)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: 'rgba(0,200,240,0.35)' }}>
                {item.cta || "→"}
              </span>
            </div>
          </div>

          {/* Gradient border on hover */}
          <div className={`absolute inset-0 -z-10 rounded-[3px] p-px
            ${item.hasPersistentHover ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
            transition-opacity duration-300`}
            style={{ background: 'linear-gradient(135deg, transparent, rgba(0,200,240,0.06), transparent)' }}
          />
        </div>
      ))}
    </div>
  );
}

export { BentoGrid };
