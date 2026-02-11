import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Check, RefreshCw, Share2, Plus, Copy, Loader2 } from "lucide-react";
import { REPORT_REASONS } from '../../utils/constants';

// Report Dialog
export const ReportDialog = ({
  open,
  onOpenChange,
  reportReason,
  setReportReason,
  reportDetails,
  setReportDetails,
  onSubmit,
  isReporting
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Report an Issue</DialogTitle>
        <DialogDescription>Help us keep Ucycle safe and accurate</DialogDescription>
      </DialogHeader>
      <div className="space-y-3 py-4">
        {REPORT_REASONS.map(reason => (
          <button
            key={reason.value}
            onClick={() => setReportReason(reason.value)}
            className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
              reportReason === reason.value ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`report-reason-${reason.value}`}
          >
            <span className={`font-medium block ${reportReason === reason.value ? 'text-green-700' : 'text-slate-700'}`}>
              {reason.label}
            </span>
            <span className="text-xs text-slate-500">{reason.description}</span>
          </button>
        ))}
        {reportReason === 'illegal_dumping' && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm text-amber-800 mb-3">
              <strong>⚠️ Illegal Dumping Report</strong><br/>
              This will be sent to local council authorities.
            </p>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              placeholder="Additional details (optional)"
              className="w-full p-3 border border-amber-300 rounded-lg text-sm resize-none"
              rows={3}
            />
          </div>
        )}
      </div>
      <Button
        className="w-full bg-green-800 hover:bg-green-900"
        onClick={onSubmit}
        disabled={!reportReason || isReporting}
        data-testid="submit-report-btn"
      >
        {isReporting ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
        ) : reportReason === 'illegal_dumping' ? "Report to Council" : "Submit Report"}
      </Button>
    </DialogContent>
  </Dialog>
);

// Share Dialog
export const ShareDialog = ({
  open,
  onOpenChange,
  post,
  onShareMessenger,
  onShareFacebookGroups,
  onCopyLink
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-sm">
      <DialogHeader className="text-center">
        <DialogTitle className="text-center">Share this item</DialogTitle>
        <DialogDescription className="text-center">{post?.title}</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-3 py-4">
        <button onClick={onShareMessenger} className="share-btn messenger flex-col py-4" data-testid="share-messenger">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
          </svg>
          Messenger
        </button>
        <button onClick={onShareFacebookGroups} className="share-btn facebook flex-col py-4" data-testid="share-fb-groups">
          <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
          </svg>
          Community
        </button>
        <button onClick={onCopyLink} className="share-btn copy flex-col py-4 col-span-2" data-testid="share-copy-link">
          <Copy className="w-6 h-6 mb-1" />
          Copy Link
        </button>
      </div>
    </DialogContent>
  </Dialog>
);

// Welcome Dialog
export const WelcomeDialog = ({ open, onOpenChange, onDismiss }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-[90vw] max-w-sm text-center rounded-3xl p-5">
      <div className="pt-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-2xl flex items-center justify-center mb-3">
          <RefreshCw className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
          G&apos;day mate! 👋
        </h2>
        <p className="text-slate-600 text-sm mb-4">Help a mate find your unwanted stuff!</p>
        <div className="text-left space-y-2 mb-4 p-3 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-slate-700"><strong>Snap it</strong> - Photo your item</p>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-slate-700"><strong>Drop it</strong> - Set location</p>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
            <p className="text-xs text-slate-700"><strong>Done!</strong> - Someone grabs it</p>
          </div>
        </div>
        <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <p className="text-xs text-amber-800">🚨 <strong>Safety:</strong> Public pickup only</p>
        </div>
        <Button 
          className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-bold py-4 rounded-full shadow-lg"
          onClick={onDismiss}
          data-testid="welcome-start-btn"
        >
          Let&apos;s go! 🚀
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

// Add to Home Screen Modal
export const AddToHomeScreenModal = ({ show, onDismiss }) => {
  if (!show) return null;
  
  const handleSwipeGesture = (e) => {
    const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
    const endY = e.changedTouches[0].clientY;
    e.currentTarget.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease';
    e.currentTarget.style.transform = '';
    e.currentTarget.style.opacity = '';
    if (endY - startY > 80) onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 modal-backdrop animate-fade-in" onClick={onDismiss}>
      <div 
        className="w-full max-w-md mx-4 mb-20 animate-slide-up modal-content"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { e.currentTarget.dataset.touchStartY = e.touches[0].clientY; }}
        onTouchMove={(e) => {
          const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
          const diff = e.touches[0].clientY - startY;
          if (diff > 0) {
            e.currentTarget.style.transform = `translateY(${diff * 0.5}px)`;
            e.currentTarget.style.opacity = `${Math.max(0.3, 1 - diff / 300)}`;
            e.currentTarget.style.transition = 'none';
          }
        }}
        onTouchEnd={handleSwipeGesture}
      >
        <div className="flex justify-center mb-2 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-white/60 rounded-full" />
        </div>
        <p className="text-center text-xs text-white/80 mb-2">Swipe down to close</p>
        <div className="flex justify-center mb-2">
          <div className="bg-white rounded-full p-2 shadow-lg animate-bounce">
            <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M8 7l4-4m0 0l4 4m-4-4v18" />
            </svg>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <Camera className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Add Ucycle to Home Screen</h3>
            <p className="text-slate-600 text-sm mb-4">Get instant access with one tap!</p>
            <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm text-slate-700"><strong>Step 1:</strong> Tap <span className="text-blue-600">Share</span></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-sm text-slate-700"><strong>Step 2:</strong> Select <span className="text-green-600">&quot;Add to Home Screen&quot;</span></p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Check className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-sm text-slate-700"><strong>Step 3:</strong> Tap <span className="text-amber-600">&quot;Add&quot;</span></p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 py-4 rounded-full" onClick={onDismiss}>Maybe later</Button>
              <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full" onClick={onDismiss}>Got it!</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Scrap Yard Ad Modal
export const ScrapYardAdModal = ({ show, onDismiss, onViewPrices, onTrackClick }) => {
  if (!show) return null;

  const handleSwipeGesture = (e) => {
    const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
    const endY = e.changedTouches[0].clientY;
    e.currentTarget.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease';
    e.currentTarget.style.transform = '';
    e.currentTarget.style.opacity = '';
    if (endY - startY > 80) onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 modal-backdrop animate-fade-in" onClick={onDismiss}>
      <div 
        className="w-full max-w-sm mx-4 modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => { e.currentTarget.dataset.touchStartY = e.touches[0].clientY; }}
        onTouchMove={(e) => {
          const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
          const diff = e.touches[0].clientY - startY;
          if (diff > 0) {
            e.currentTarget.style.transform = `translateY(${diff * 0.5}px)`;
            e.currentTarget.style.opacity = `${Math.max(0.3, 1 - diff / 300)}`;
            e.currentTarget.style.transition = 'none';
          }
        }}
        onTouchEnd={handleSwipeGesture}
      >
        <div className="flex justify-center mb-2 cursor-grab">
          <div className="w-10 h-1.5 bg-white/60 rounded-full" />
        </div>
        <p className="text-center text-xs text-white/80 mb-2">Swipe down to close</p>
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4">
            <p className="text-white text-xs font-medium mb-1">🏆 FEATURED PARTNER</p>
            <h3 className="text-white text-xl font-bold">Norman Scrap Yard</h3>
            <p className="text-amber-100 text-sm">Sydney&apos;s trusted metal recyclers</p>
          </div>
          <div className="p-5">
            <div className="mb-4 space-y-2">
              <p className="text-slate-700 text-sm flex items-center gap-2">💰 <strong>Best prices</strong> for scrap metal</p>
              <p className="text-slate-700 text-sm flex items-center gap-2">🚗 <strong>Free pickup</strong> for large loads</p>
              <p className="text-slate-700 text-sm flex items-center gap-2">📍 <strong>Nearby</strong> - St Marys, NSW</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-lime-50 rounded-xl p-3 mb-4 border border-green-200">
              <p className="text-green-800 text-sm font-medium text-center">💵 Copper: $10+/kg | Steel: $1.5+/kg</p>
            </div>
            <div className="space-y-2">
              <a
                href="tel:0246480225"
                onClick={() => onTrackClick('call')}
                className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-green-600 to-lime-500 text-white py-3 rounded-full font-bold shadow-lg"
              >
                📞 Call Now: 02 4648 0225
              </a>
              <button onClick={onViewPrices} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-full font-medium transition-colors">
                💰 View Current Prices
              </button>
              <button onClick={onDismiss} className="w-full text-slate-400 py-2 text-sm">Not interested</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
