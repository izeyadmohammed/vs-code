import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { NotificationItem, ThemeConfig } from '../types/ide';

interface NotificationToastsProps {
  theme: ThemeConfig;
  notifications: NotificationItem[];
}

export const NotificationToasts: React.FC<NotificationToastsProps> = ({
  theme,
  notifications,
}) => {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (notifications.length === 0) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 500);
    return () => window.clearInterval(timer);
  }, [notifications]);

  const visible = notifications
    .filter((n) => !dismissedIds.has(n.id) && now - n.timestamp < 5000)
    .slice(0, 3);

  if (visible.length === 0) return null;

  const c = theme.colors;

  return (
    <div className="fixed bottom-8 right-3 z-50 flex flex-col gap-2 max-w-sm w-[calc(100vw-24px)] pointer-events-none">
      {visible.map((item) => {
        const Icon =
          item.type === 'success'
            ? CheckCircle2
            : item.type === 'warning'
            ? AlertTriangle
            : item.type === 'error'
            ? XCircle
            : Info;
        const iconColor =
          item.type === 'success'
            ? '#4ade80'
            : item.type === 'warning'
            ? '#fbbf24'
            : item.type === 'error'
            ? '#f87171'
            : c.accent;

        return (
          <div
            key={item.id}
            className="pointer-events-auto flex items-start gap-2.5 px-3 py-2.5 rounded-[5px] shadow-2xl text-[12px]"
            style={{
              backgroundColor: c.dropdownBg,
              border: `1px solid ${c.dropdownBorder}`,
              color: c.editorFg,
            }}
          >
            <Icon size={15} style={{ color: iconColor }} className="shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="leading-snug break-words">{item.message}</div>
              <div className="text-[10.5px] opacity-55 mt-0.5">{item.source}</div>
            </div>
            <button
              type="button"
              onClick={() => setDismissedIds((prev) => new Set(prev).add(item.id))}
              className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/10 opacity-70 hover:opacity-100 shrink-0"
              aria-label="Dismiss notification"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
