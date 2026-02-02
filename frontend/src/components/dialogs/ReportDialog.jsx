import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Loader2 } from 'lucide-react';
import { REPORT_REASONS } from '../../utils/constants';
import { submitReport } from '../../utils/api';
import { toast } from 'sonner';

export function ReportDialog({ open, onOpenChange, post }) {
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleSubmitReport = async () => {
    if (!reportReason || !post) return;
    
    setIsReporting(true);
    try {
      await submitReport({
        post_id: post.id,
        reason: reportReason,
        details: reportDetails,
        post_data: reportReason === 'illegal_dumping' ? {
          title: post.title,
          description: post.description,
          category: post.category,
          image: post.image_base64,
          latitude: post.latitude,
          longitude: post.longitude,
          address: post.address
        } : null
      });
      
      toast.success(
        reportReason === 'illegal_dumping' 
          ? 'Illegal dumping reported to council' 
          : 'Report submitted successfully'
      );
      
      setReportReason('');
      setReportDetails('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast.error('Failed to submit report');
    } finally {
      setIsReporting(false);
    }
  };

  const handleOpenChange = (newOpen) => {
    if (!newOpen) {
      setReportReason('');
      setReportDetails('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
                reportReason === reason.value 
                  ? 'border-green-600 bg-green-50' 
                  : 'border-slate-200 hover:border-slate-300'
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
                <strong>Illegal Dumping Report</strong><br/>
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
          onClick={handleSubmitReport}
          disabled={!reportReason || isReporting}
          data-testid="submit-report-btn"
        >
          {isReporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : reportReason === 'illegal_dumping' ? (
            "Report to Council"
          ) : (
            "Submit Report"
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default ReportDialog;
