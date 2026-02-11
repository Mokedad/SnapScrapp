import React from "react";
import { Camera, Plus, Share2, ChevronDown, X } from "lucide-react";

// Quick Guide Modal - iOS swipe to dismiss
export const QuickGuideModal = ({ show, onClose, isStandalone }) => {
  if (!show) return null;

  const handleSwipe = (e) => {
    const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
    const startScroll = parseFloat(e.currentTarget.dataset.touchStartScrollTop || 0);
    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY;
    
    e.currentTarget.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
    e.currentTarget.style.transform = '';
    
    if (startScroll <= 0 && diff > 80) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 modal-backdrop animate-fade-in" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
          e.currentTarget.dataset.touchStartScrollTop = e.currentTarget.scrollTop;
        }}
        onTouchMove={(e) => {
          const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
          const startScroll = parseFloat(e.currentTarget.dataset.touchStartScrollTop || 0);
          const diff = e.touches[0].clientY - startY;
          
          if (startScroll <= 0 && diff > 0) {
            e.currentTarget.style.transform = `translateY(${Math.min(diff * 0.5, 150)}px)`;
            e.currentTarget.style.transition = 'none';
          }
        }}
        onTouchEnd={handleSwipe}
      >
        <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>
        <p className="text-center text-xs text-slate-400 mb-2">Swipe down to close</p>
        
        <div className="px-6 pb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Quick Setup Guide</h2>
          
          {!isStandalone && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Plus className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Add to Home Screen</h3>
                  <p className="text-xs text-slate-500">Install for quick access</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                  <Share2 className="w-5 h-5 text-blue-500" />
                  <span>Tap the <strong>Share</strong> icon in your browser</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                  <ChevronDown className="w-5 h-5 text-slate-500" />
                  <span>Scroll down in the share menu</span>
                </div>
                <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                  <Plus className="w-5 h-5 text-green-500" />
                  <span>Select <strong>&quot;Add to Home Screen&quot;</strong></span>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-green-50 rounded-2xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Camera className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Camera Permission</h3>
                <p className="text-xs text-slate-500">Stop repeated prompts</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-slate-600">To stop Safari asking &quot;Allow Camera&quot; every time:</p>
              <div className="bg-white rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-600">
                  <strong>Method 1:</strong> Tap <strong>&quot;AA&quot;</strong> in URL bar → Website Settings → Camera → <span className="text-green-600 font-semibold">Allow</span>
                </p>
                <p className="text-xs text-slate-600">
                  <strong>Method 2:</strong> Settings → Safari → Camera → <span className="text-green-600 font-semibold">Allow</span>
                </p>
              </div>
            </div>
          </div>
          
          <button onClick={onClose} className="w-full py-4 bg-green-600 hover:bg-green-700 active:scale-[0.98] text-white font-semibold rounded-full transition-all">
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// Camera Troubleshoot Tooltip
export const CameraTroubleshootTooltip = ({ show, hasSeenTip, onDismiss }) => {
  if (!show || hasSeenTip) return null;

  const handleDismiss = () => {
    onDismiss();
    localStorage.setItem('ucycle_camera_tip_seen', 'true');
  };

  return (
    <div 
      className="fixed bottom-24 left-4 right-4 z-50 animate-slide-up modal-content"
      onTouchStart={(e) => { e.currentTarget.dataset.touchStartY = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
        const diff = e.touches[0].clientY - startY;
        if (diff > 0) {
          e.currentTarget.style.transform = `translateY(${diff * 0.5}px)`;
          e.currentTarget.style.opacity = `${Math.max(0.3, 1 - diff / 200)}`;
          e.currentTarget.style.transition = 'none';
        }
      }}
      onTouchEnd={(e) => {
        const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
        const endY = e.changedTouches[0].clientY;
        e.currentTarget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.opacity = '';
        if (endY - startY > 60) handleDismiss();
      }}
    >
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <Camera className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Stop Camera Permission Prompts</p>
            <p className="text-xs text-slate-300 mt-1">
              Tap the <strong className="text-blue-400">&quot;AA&quot;</strong> in the URL bar → Website Settings → Set Camera to <strong className="text-green-400">&quot;Allow&quot;</strong>
            </p>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-white active:scale-95 transition-transform">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Fullscreen Image Viewer
export const FullscreenImageViewer = ({ 
  show, 
  images, 
  currentIndex, 
  setCurrentIndex, 
  swipeY, 
  onClose,
  onTouchStart,
  onTouchMove,
  onTouchEnd
}) => {
  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black"
      style={{ opacity: swipeY > 0 ? Math.max(0.3, 1 - swipeY / 300) : 1 }}
      onClick={onClose}
    >
      <div
        className="w-full h-full flex items-center justify-center"
        style={{ transform: `translateY(${swipeY}px)`, transition: swipeY === 0 ? 'transform 0.2s ease' : 'none' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {images[currentIndex] && (
          <img
            src={images[currentIndex].startsWith('data:') ? images[currentIndex] : `data:image/jpeg;base64,${images[currentIndex]}`}
            alt="Fullscreen view"
            className="max-w-full max-h-full object-contain"
            onClick={onClose}
          />
        )}
      </div>
      
      <button className="absolute top-12 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center" onClick={onClose}>
        <X className="w-6 h-6 text-white" />
      </button>
      
      {images.length > 1 && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(i); }}
              className={`w-2.5 h-2.5 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
      
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/40 px-4 py-2 rounded-full">
        <p className="text-white/80 text-sm font-medium">
          {images.length > 1 ? 'Swipe ← → to browse • Swipe ↓ or tap to exit' : 'Swipe ↓ or tap to exit'}
        </p>
      </div>
    </div>
  );
};

// PWA Install Prompt Banner
export const InstallPromptBanner = ({ show, onInstall, onDismiss, deferredPrompt }) => {
  if (!show) return null;

  return (
    <div 
      className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up modal-content"
      onTouchStart={(e) => { e.currentTarget.dataset.touchStartY = e.touches[0].clientY; }}
      onTouchMove={(e) => {
        const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
        const diff = e.touches[0].clientY - startY;
        if (diff > 0) {
          e.currentTarget.style.transform = `translateY(${diff * 0.5}px)`;
          e.currentTarget.style.opacity = `${Math.max(0.3, 1 - diff / 200)}`;
          e.currentTarget.style.transition = 'none';
        }
      }}
      onTouchEnd={(e) => {
        const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
        const endY = e.changedTouches[0].clientY;
        e.currentTarget.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
        e.currentTarget.style.transform = '';
        e.currentTarget.style.opacity = '';
        if (endY - startY > 60) onDismiss();
      }}
    >
      <div className="bg-white rounded-2xl p-4 shadow-xl border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Plus className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Install Ucycle</p>
            <p className="text-xs text-slate-500">Add to home screen for quick access</p>
          </div>
          <button
            onClick={async () => {
              if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') onDismiss();
              }
            }}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-full"
          >
            Install
          </button>
          <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600 ml-1">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
