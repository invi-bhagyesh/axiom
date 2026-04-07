"use client";

function isImageUrl(val: unknown): boolean {
  if (typeof val !== "string") return false;
  const s = val.trim().toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|svg|bmp|avif)(\?.*)?$/i.test(s)) return true;
  if (/^https?:\/\/(images\.unsplash\.com|picsum\.photos|i\.imgur\.com|upload\.wikimedia\.org)/.test(s)) return true;
  return false;
}

function isUrl(val: unknown): boolean {
  if (typeof val !== "string") return false;
  return /^https?:\/\/.+/.test(val.trim());
}

export default function ItemDataRenderer({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, val]) => (
        <div key={key}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] mb-1.5"
            style={{ color: 'rgba(100,170,200,0.3)' }}>
            {key.replace(/_/g, " ")}
          </p>
          {isImageUrl(val) ? (
            <div className="overflow-hidden" style={{ borderRadius: 3, border: '1px solid rgba(0,200,240,0.08)' }}>
              <img
                src={val}
                alt={key}
                className="w-full max-h-[400px] object-contain"
                style={{ background: 'rgba(0,20,40,0.3)' }}
                loading="lazy"
              />
            </div>
          ) : isUrl(val) ? (
            <a href={val} target="_blank" rel="noopener noreferrer"
              className="text-[12px] font-mono underline break-all" style={{ color: '#00d4ff' }}>
              {String(val)}
            </a>
          ) : (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(180,220,240,0.6)' }}>
              {String(val)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
