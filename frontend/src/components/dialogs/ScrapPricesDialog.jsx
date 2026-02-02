import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { SCRAP_PRICES } from '../../utils/constants';

export function ScrapPricesDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs rounded-2xl p-0 overflow-hidden">
        <div className="bg-gradient-to-br from-green-600 to-lime-500 px-3 py-2 text-white">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v12M9 9h6M9 15h6" />
            </svg>
            Scrap Prices NSW
          </DialogTitle>
        </div>
        
        <div className="px-2 py-1 bg-white">
          <table className="w-full" style={{ fontSize: '11px' }}>
            <thead>
              <tr className="border-b border-slate-300">
                <th className="text-left py-1 font-bold text-slate-700">Material</th>
                <th className="text-right py-1 font-bold text-slate-700">$/kg</th>
              </tr>
            </thead>
            <tbody>
              {SCRAP_PRICES.map((item, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="py-0.5 text-slate-800">{item.material}</td>
                  <td className="py-0.5 text-right font-semibold text-green-700">{item.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-[10px] text-slate-500 mt-1 text-center">*Prices vary by yard & quality</p>
        </div>
        
        <div className="px-2 pb-2 bg-white">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded-full text-xs py-1.5"
            onClick={() => onOpenChange(false)}
            data-testid="scrap-prices-close-btn"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ScrapPricesDialog;
