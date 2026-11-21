import React, { useState } from 'react';
import { Download, Share, X, WifiOff, Smartphone, Monitor } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { ThemeConfig } from '../types/ide';

interface PWAInstallButtonProps {
  theme: ThemeConfig;
  variant?: 'toolbar' | 'welcome';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  theme,
  variant = 'toolbar',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Never show install UI when already running in installed standalone mode
  if (isInstalled) return null;

  const c = theme.colors;
  const inIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowHelpModal(true);
  };

  return (
    <>
      {variant === 'toolbar' ? (
        <button
          type="button"
          onClick={handleClick}
          className="h-7 px-2 flex items-center gap-1.5 rounded transition-colors text-[11px] font-medium shrink-0"
          style={{
            backgroundColor: isInstallable ? c.buttonBg : 'transparent',
            color: isInstallable ? c.buttonFg : c.accent,
            border: isInstallable ? 'none' : `1px solid ${c.accent}55`,
          }}
          title="Install VS Code as an App (PWA)"
          aria-label="Install App (PWA)"
        >
          <Download size={13} />
          <span className="whitespace-nowrap">Install App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="flex items-center gap-2.5 py-1 hover:underline text-left"
          style={{ color: c.accent }}
        >
          <Download size={16} />
          <span>Install VS Code App on Device (PWA)...</span>
        </button>
      )}

      {showHelpModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowHelpModal(false)}
        >
          <div
            className="w-full max-w-md rounded-lg shadow-2xl p-5 space-y-4 select-text"
            style={{
              backgroundColor: c.dropdownBg,
              border: `1px solid ${c.dropdownBorder}`,
              color: c.editorFg,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download size={18} style={{ color: c.accent }} />
                <h3 className="text-[14px] font-semibold">Install VS Code App (PWA)</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3 text-[13px] opacity-90">
                <p>To install VS Code on your iPhone or iPad:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    Tap the{' '}
                    <span className="inline-flex items-center gap-1 font-semibold">
                      <Share size={13} /> Share
                    </span>{' '}
                    button in Safari&apos;s toolbar.
                  </li>
                  <li>
                    Scroll down and select <strong>Add to Home Screen</strong>.
                  </li>
                  <li>
                    Tap <strong>Add</strong> to launch it like a native standalone app.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-[12.5px] opacity-90">
                <p>
                  This app is PWA-ready and supports offline caching and standalone window mode.
                </p>

                <div
                  className="p-3 rounded space-y-1.5"
                  style={{
                    backgroundColor: c.inputBg,
                    border: `1px solid ${c.inputBorder}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[12px]">
                    <Smartphone size={14} style={{ color: c.accent }} />
                    <span>Android / Tablet (Chrome / Edge / Samsung Internet)</span>
                  </div>
                  <p className="opacity-80">
                    Open browser menu (<strong>⋮</strong>) → tap{' '}
                    <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                  </p>
                </div>

                <div
                  className="p-3 rounded space-y-1.5"
                  style={{
                    backgroundColor: c.inputBg,
                    border: `1px solid ${c.inputBorder}`,
                  }}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-[12px]">
                    <Monitor size={14} style={{ color: c.accent }} />
                    <span>Desktop (Chrome / Edge)</span>
                  </div>
                  <p className="opacity-80">
                    Click the <strong>Install</strong> icon on the right side of the browser
                    address bar, or open menu (<strong>⋮</strong>) →{' '}
                    <strong>Save and share → Install page as app</strong>.
                  </p>
                </div>

                {inIframe && (
                  <p className="text-[11.5px] opacity-75">
                    Note: Embedded preview frames block the automatic install prompt. Open your
                    deployed URL directly in a normal browser tab to trigger one-click install.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-1.5 rounded text-[12px] font-medium"
                style={{
                  backgroundColor: c.buttonBg,
                  color: c.buttonFg,
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC<{ theme?: ThemeConfig }> = ({ theme }) => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      className="fixed bottom-8 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded shadow-lg text-[12px] font-medium"
      style={{
        backgroundColor: theme?.colors.dropdownBg ?? '#252526',
        border: `1px solid ${theme?.colors.dropdownBorder ?? '#454545'}`,
        color: '#fbbf24',
      }}
    >
      <WifiOff size={14} />
      <span>Offline — Cached files still work</span>
    </div>
  );
};
