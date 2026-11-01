import React from 'react';
import { ScanText, Receipt, History, Settings } from 'lucide-react';

export type NavTab = 'scan' | 'receipt' | 'history' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  hasActiveReceipt: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onTabChange,
  hasActiveReceipt,
}) => {
  const tabs = [
    {
      id: 'scan' as NavTab,
      label: 'Pindai OCR',
      icon: ScanText,
    },
    {
      id: 'receipt' as NavTab,
      label: 'Struk & Edit',
      icon: Receipt,
      badge: hasActiveReceipt,
    },
    {
      id: 'history' as NavTab,
      label: 'Riwayat',
      icon: History,
    },
    {
      id: 'settings' as NavTab,
      label: 'Pengaturan',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-sky-100 safe-pb shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-all relative ${
                isActive
                  ? 'text-sky-600 font-bold'
                  : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 text-sky-600' : 'text-slate-400'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                {tab.badge && !isActive && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-500/30" />
                )}
              </div>
              <span className="text-[11px] mt-0.5 tracking-tight line-clamp-1">{tab.label}</span>
              {isActive && (
                <div className="w-5 h-0.5 bg-sky-500 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
