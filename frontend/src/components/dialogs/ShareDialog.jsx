import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Copy } from 'lucide-react';
import { BACKEND_URL } from '../../utils/constants';
import { toast } from 'sonner';

export function ShareDialog({ open, onOpenChange, post }) {
  if (!post) return null;

  const shareUrl = `${BACKEND_URL}/api/post-meta/${post.id}`;

  const shareToMessenger = () => {
    window.open(`fb-messenger://share/?link=${encodeURIComponent(shareUrl)}`, '_blank');
    setTimeout(() => {
      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&app_id=0&redirect_uri=${encodeURIComponent(window.location.href)}`, '_blank');
    }, 500);
    onOpenChange(false);
  };

  const shareToFacebookGroups = () => {
    const groupUrl = 'https://www.facebook.com/share/g/17uqbznuSH/?mibextid=wwXIfr';
    window.open(groupUrl, '_blank');
    navigator.clipboard.writeText(`Free item: ${post.title} 🎁\n\n${shareUrl}`).then(() => {
      toast.success("Link copied! Paste it in the group");
    }).catch(() => {
      toast.success("Share in the Ucycle community!");
    });
    onOpenChange(false);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center">
          <DialogTitle className="text-center">Share this item</DialogTitle>
          <DialogDescription className="text-center">{post.title}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-4">
          <button
            onClick={shareToMessenger}
            className="share-btn messenger flex-col py-4"
            data-testid="share-messenger"
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
            </svg>
            Messenger
          </button>
          <button
            onClick={shareToFacebookGroups}
            className="share-btn facebook flex-col py-4"
            data-testid="share-fb-groups"
          >
            <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
            </svg>
            Community
          </button>
          <button
            onClick={copyShareLink}
            className="share-btn copy flex-col py-4 col-span-2"
            data-testid="share-copy-link"
          >
            <Copy className="w-6 h-6 mb-1" />
            Copy Link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
