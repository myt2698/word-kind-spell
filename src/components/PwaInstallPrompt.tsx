import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, X, Monitor, Smartphone, Tablet } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for install prompt (Chrome/Edge on desktop & Android)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  // Don't show if installed, dismissed, or no prompt available (iOS/Safari handles differently)
  if (isInstalled || dismissed || !deferredPrompt) return null;

  // Detect device type
  const isMobile = /Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const isTablet = /iPad|Tablet|Mate/.test(navigator.userAgent);

  const DeviceIcon = isTablet ? Tablet : isMobile ? Smartphone : Monitor;
  const platformName = isTablet ? "平板" : isMobile ? "手机" : "电脑";

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-white rounded-xl border border-indigo-200 shadow-lg p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
          <DeviceIcon className="w-5 h-5 text-indigo-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">安装到{platformName}</p>
          <p className="text-xs text-gray-500">像原生App一样使用，支持离线访问</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-gray-400"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            className="h-8 bg-indigo-500 hover:bg-indigo-600 text-white text-xs"
            onClick={handleInstall}
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            安装
          </Button>
        </div>
      </div>
    </div>
  );
}
