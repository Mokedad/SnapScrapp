import React from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Button } from '../ui/button';
import { RefreshCw, Camera, MapPin, Check } from 'lucide-react';

export function WelcomeDialog({ open, onOpenChange, onGetStarted }) {
  const handleGetStarted = () => {
    onOpenChange(false);
    if (onGetStarted) onGetStarted();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-sm text-center rounded-3xl p-5">
        <div className="pt-2">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-2xl flex items-center justify-center mb-3">
            <RefreshCw className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
            G&apos;day mate! 👋
          </h2>
          <p className="text-slate-600 text-sm mb-4">
            Help a mate find your unwanted stuff!
          </p>
          
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
            <p className="text-xs text-amber-800">
              🔒 <strong>Safety:</strong> Public pickup only
            </p>
          </div>
          
          <Button 
            className="w-full bg-gradient-to-r from-green-600 to-lime-500 hover:from-green-700 hover:to-lime-600 text-white font-semibold py-5 rounded-full"
            onClick={handleGetStarted}
            data-testid="welcome-get-started"
          >
            Let&apos;s go! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WelcomeDialog;
