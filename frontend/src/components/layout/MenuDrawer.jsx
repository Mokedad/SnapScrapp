import React from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { toast } from "sonner";
import { 
  RefreshCw, Plus, ChevronDown, Smartphone, Settings, HelpCircle, Heart, Shield, AlertTriangle 
} from "lucide-react";

export const MenuDrawer = ({
  open,
  onOpenChange,
  isStandalone,
  isIOS,
  isInSydneyMetro,
  onShowAddToHomeScreen,
  onShowQuickGuide,
  onShowScrapPrices,
  onRefresh,
  nearbyNotifications,
  onToggleNearbyNotifications,
  favoritesCount
}) => {
  const navigate = useNavigate();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[70vh]">
        <DrawerHeader>
          <DrawerTitle>Menu</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-3 overflow-y-auto">
          
          {/* Download App Section - Only show if NOT in standalone mode */}
          {!isStandalone && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 mb-2 border border-blue-100">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900">Download App</h3>
              </div>
              <p className="text-xs text-slate-600 mb-3">Get the full app experience with quick access from your home screen</p>
              
              <button
                onClick={() => {
                  onOpenChange(false);
                  onShowAddToHomeScreen();
                }}
                className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-blue-50 transition-colors text-left shadow-sm"
                data-testid="add-home-menu-btn"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <span className="font-medium text-slate-900 text-sm">Add to Home Screen</span>
                  <p className="text-xs text-slate-500">Install Ucycle on your device</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
              </button>
            </div>
          )}

          {/* Device Options Section - iOS specific features */}
          {isIOS && (
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 mb-2 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-slate-600" />
                <h3 className="font-semibold text-slate-900">Device Options</h3>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    onOpenChange(false);
                    onShowQuickGuide();
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white rounded-xl hover:bg-slate-50 transition-colors text-left shadow-sm"
                  data-testid="quick-guide-menu-btn"
                >
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-slate-900 text-sm">Quick Guide</span>
                    <p className="text-xs text-slate-500">Setup tips & camera help</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90" />
                </button>
              </div>
            </div>
          )}

          {/* Scrap Prices - Only show in Sydney Metro */}
          {isInSydneyMetro && (
            <button
              onClick={() => {
                onOpenChange(false);
                onShowScrapPrices();
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
              data-testid="scrap-prices-menu-btn"
            >
              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v12M9 9h6M9 15h6" />
              </svg>
              <div className="flex-1">
                <span className="font-medium text-slate-900">Current Scrap Prices</span>
                <p className="text-xs text-green-600">NSW market rates</p>
              </div>
            </button>
          )}
          
          <button
            onClick={() => {
              onOpenChange(false);
              onRefresh();
              toast.success("Refreshed!");
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
            data-testid="refresh-menu-btn"
          >
            <RefreshCw className="w-5 h-5 text-slate-600" />
            <span className="font-medium text-slate-900">Refresh Map</span>
          </button>
          
          <button
            onClick={onToggleNearbyNotifications}
            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
            data-testid="notifications-menu-btn"
          >
            <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <div className="flex-1 flex items-center gap-2">
              <span className="font-medium text-slate-900">Nearby Alerts</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${nearbyNotifications ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {nearbyNotifications ? 'ON' : 'OFF'}
              </span>
            </div>
          </button>
          
          <button
            onClick={() => {
              onOpenChange(false);
              navigate('/?favorites=true');
            }}
            className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
            data-testid="favorites-menu-btn"
          >
            <Heart className="w-5 h-5 text-red-500" />
            <div className="flex-1 flex items-center gap-2">
              <span className="font-medium text-slate-900">My Favorites</span>
              {favoritesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                  {favoritesCount}
                </span>
              )}
            </div>
          </button>
          
          <div className="pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                onOpenChange(false);
                navigate('/admin');
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
              data-testid="admin-menu-btn"
            >
              <Shield className="w-5 h-5 text-slate-400" />
              <span className="font-medium text-slate-400 text-sm">Admin Panel</span>
            </button>
          </div>
          
          <div className="pt-3 text-center">
            <p className="text-xs text-slate-400">
              Made with 💚 in Sydney
            </p>
            <p className="text-xs text-slate-300 mt-1">
              v1.0.0
            </p>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default MenuDrawer;
