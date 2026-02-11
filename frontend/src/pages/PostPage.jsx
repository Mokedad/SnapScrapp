import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  MapPin, Clock, AlertTriangle, ChevronLeft, Loader2, Eye, CheckCircle,
  Share2, Copy, ExternalLink, Navigation, Heart, Flag, RefreshCw, X
} from "lucide-react";
import { BACKEND_URL, API, REPORT_REASONS } from '../utils/constants';
import { CategoryBadge, StatusBadge } from '../components/post/PostCard';

export function PostPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Fullscreen image viewer state
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImages, setFullscreenImages] = useState([]);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [fullscreenSwipeY, setFullscreenSwipeY] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  
  // Favorites state
  const [isFavorited, setIsFavorited] = useState(() => {
    const saved = localStorage.getItem('ucycle_favorites');
    const favorites = saved ? JSON.parse(saved) : [];
    return favorites.includes(postId);
  });

  const toggleFavorite = () => {
    const saved = localStorage.getItem('ucycle_favorites');
    let favorites = saved ? JSON.parse(saved) : [];
    
    if (isFavorited) {
      favorites = favorites.filter(id => id !== postId);
      toast.success('Removed from favorites');
    } else {
      favorites.push(postId);
      toast.success('Added to favorites');
    }
    
    localStorage.setItem('ucycle_favorites', JSON.stringify(favorites));
    setIsFavorited(!isFavorited);
  };

  // Fullscreen image functions
  const openFullscreenImage = (images, startIndex = 0) => {
    setFullscreenImages(images);
    setFullscreenIndex(startIndex);
    setFullscreenSwipeY(0);
    setShowFullscreenImage(true);
  };

  const closeFullscreenImage = () => {
    setShowFullscreenImage(false);
    setFullscreenSwipeY(0);
  };

  const handleFullscreenTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleFullscreenTouchMove = (e) => {
    const diffY = e.touches[0].clientY - touchStartY.current;
    if (diffY > 0) setFullscreenSwipeY(diffY);
  };

  const handleFullscreenTouchEnd = (e) => {
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    
    if (diffY > 100 && Math.abs(diffX) < 50) {
      closeFullscreenImage();
      return;
    }
    setFullscreenSwipeY(0);
    
    if (Math.abs(diffX) > 50 && fullscreenImages.length > 1) {
      if (diffX > 0) {
        setFullscreenIndex(i => i < fullscreenImages.length - 1 ? i + 1 : 0);
      } else {
        setFullscreenIndex(i => i > 0 ? i - 1 : fullscreenImages.length - 1);
      }
    }
  };

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${API}/posts/${postId}`);
        setPost(response.data);
        document.title = `${response.data.title} - Free on Ucycle`;
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setError("Post not found or has expired");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
    
    return () => {
      document.title = 'Ucycle - Free Items Near You';
    };
  }, [postId]);

  // Get user location for distance calculation
  const [userLocation, setUserLocation] = useState(null);
  
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        () => {}
      );
    }
  }, []);

  // Calculate and format distance
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const formatDistance = () => {
    if (!userLocation || !post?.latitude) return null;
    const dist = getDistance(userLocation[0], userLocation[1], post.latitude, post.longitude);
    if (dist < 1) return `${Math.round(dist * 1000)}m`;
    return `${dist.toFixed(1)}km`;
  };

  const handleMarkCollected = async () => {
    try {
      await axios.patch(`${API}/posts/${postId}/collected`);
      toast.success("Marked as collected!");
      setPost(prev => ({ ...prev, status: "collected" }));
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const shareUrl = `${BACKEND_URL}/api/post-meta/${postId}`;
  
  const handleNativeShare = async () => {
    const shareTitle = `Check out this ${post?.title} on Ucycle`;
    const shareText = `Free pickup available! Grab it before it's gone!`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.log("Native share failed");
      }
    }
    setShowShareDialog(true);
  };

  const shareToMessenger = () => {
    const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`;
    const webMessengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&redirect_uri=${encodeURIComponent(window.location.origin)}&app_id=966242223397117`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = messengerUrl;
      setTimeout(() => window.open(webMessengerUrl, '_blank', 'width=600,height=400'), 1500);
    } else {
      window.open(webMessengerUrl, '_blank', 'width=600,height=400');
    }
    setShowShareDialog(false);
  };

  const shareToFacebookGroups = () => {
    const groupUrl = 'https://www.facebook.com/share/g/17uqbznuSH/?mibextid=wwXIfr';
    window.open(groupUrl, '_blank');
    navigator.clipboard.writeText(`Free item: ${post.title} 🎁\n\n${shareUrl}`).catch(() => {});
    setShowShareDialog(false);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch (err) {}
    setShowShareDialog(false);
  };

  const handleSubmitReport = async () => {
    if (!reportReason) return;
    setIsReporting(true);
    try {
      await axios.post(`${API}/reports`, { post_id: postId, reason: reportReason });
      toast.success("Report submitted");
      setShowReportDialog(false);
      setReportReason("");
    } catch (err) {
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="post-not-found">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-slate-200 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Post Not Found</h1>
          <p className="text-slate-500 mb-6">{error || "This item may have been collected or expired."}</p>
          <Button onClick={() => navigate('/')} className="bg-green-800 hover:bg-green-900" data-testid="go-to-map-btn">
            <MapPin className="w-4 h-4 mr-2" />
            Go to Map
          </Button>
        </div>
        <Toaster position="top-center" duration={1200} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="shared-post-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="back-btn">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-lime-500 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Ucycle</span>
          </div>
        </div>
        <button onClick={handleNativeShare} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="share-post-header-btn">
          <Share2 className="w-5 h-5 text-slate-600" />
        </button>
      </header>

      {/* Post Content */}
      <div className="pb-24">
        <div className="relative">
          {(() => {
            const images = post.images?.length > 0 ? post.images : [post.image_base64];
            const currentImg = images[currentImageIndex] || images[0];
            const imgSrc = currentImg?.startsWith('data:') ? currentImg : `data:image/jpeg;base64,${currentImg}`;
            
            return (
              <>
                <img 
                  src={imgSrc}
                  alt={post.title}
                  className="w-full h-64 object-cover touch-pan-y cursor-pointer"
                  onClick={() => openFullscreenImage(images, currentImageIndex)}
                  onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
                  onTouchEnd={(e) => {
                    const diffX = touchStartX.current - e.changedTouches[0].clientX;
                    if (Math.abs(diffX) > 50 && images.length > 1) {
                      if (diffX > 0) setCurrentImageIndex(i => i < images.length - 1 ? i + 1 : 0);
                      else setCurrentImageIndex(i => i > 0 ? i - 1 : images.length - 1);
                    }
                  }}
                />
                
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
                  <p className="text-white text-xs font-medium flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    {images.length > 1 ? 'Tap to expand • Swipe to browse' : 'Tap to expand'}
                  </p>
                </div>
                
                {images.length > 1 && (
                  <>
                    <button onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : images.length - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center">
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button onClick={() => setCurrentImageIndex(i => i < images.length - 1 ? i + 1 : 0)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center rotate-180">
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrentImageIndex(i)} className={`w-2.5 h-2.5 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
                      ))}
                    </div>
                  </>
                )}
              </>
            );
          })()}
          
          <div className="absolute top-3 left-3">
            <CategoryBadge category={post.category} />
          </div>
          <div className="absolute top-3 right-3">
            <StatusBadge status={post.status} />
          </div>
        </div>

        <div className="p-4 pb-8 space-y-4">
          <div>
            <h1 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {post.title}
            </h1>
            <p className="text-slate-600 mt-2">{post.description}</p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-500">
            {formatDistance() && (
              <div className="flex items-center gap-1 text-green-600 font-medium">
                <MapPin className="w-4 h-4" />
                <span>{formatDistance()} away</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Expires {new Date(post.expires_at).toLocaleDateString()}</span>
            </div>
            <a 
              href={`https://www.google.com/maps/dir/?api=1&destination=${post.latitude},${post.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:underline"
              data-testid="get-directions-link"
            >
              <Navigation className="w-4 h-4" />
              <span>Get directions</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <div className="safety-notice p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs">Public pickup only. Do not enter private property.</p>
            </div>
          </div>

          {post.status === "active" && (
            <div className="space-y-3 pt-2">
              <Button className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-5 rounded-full" onClick={() => navigate(`/?lat=${post.latitude}&lng=${post.longitude}&post=${post.id}`)} data-testid="view-on-map-btn">
                <MapPin className="w-5 h-5 mr-2" />
                View on Map
              </Button>
              <Button className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-5 rounded-full" onClick={handleMarkCollected} data-testid="mark-collected-btn">
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark as Collected
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" className={`py-5 rounded-full ${isFavorited ? 'bg-red-50 border-red-200 text-red-600' : ''}`} onClick={toggleFavorite} data-testid="favorite-btn">
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500' : ''}`} />
                </Button>
                <Button variant="outline" className="py-5 rounded-full" onClick={handleNativeShare} data-testid="share-post-btn">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="py-5 rounded-full" onClick={() => setShowReportDialog(true)} data-testid="report-post-btn">
                  <Flag className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Share this item</DialogTitle>
            <DialogDescription className="text-center">{post?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button onClick={shareToMessenger} className="share-btn messenger flex-col py-4" data-testid="share-messenger">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
              </svg>
              Messenger
            </button>
            <button onClick={shareToFacebookGroups} className="share-btn facebook flex-col py-4" data-testid="share-fb-groups">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
              </svg>
              Community
            </button>
            <button onClick={copyShareLink} className="share-btn copy flex-col py-4 col-span-2" data-testid="share-copy-link">
              <Copy className="w-6 h-6 mb-1" />
              Copy Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>Help us keep Ucycle safe</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {REPORT_REASONS.map(reason => (
              <button
                key={reason.value}
                onClick={() => setReportReason(reason.value)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${reportReason === reason.value ? 'border-green-600 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <span className={`font-medium ${reportReason === reason.value ? 'text-green-700' : 'text-slate-700'}`}>
                  {reason.label}
                </span>
              </button>
            ))}
          </div>
          <Button className="w-full bg-green-800 hover:bg-green-900" onClick={handleSubmitReport} disabled={!reportReason || isReporting}>
            {isReporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit Report
          </Button>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {showFullscreenImage && (
        <div className="fixed inset-0 z-[100] bg-black" style={{ opacity: fullscreenSwipeY > 0 ? Math.max(0.3, 1 - fullscreenSwipeY / 300) : 1 }} onClick={closeFullscreenImage}>
          <div className="w-full h-full flex items-center justify-center" style={{ transform: `translateY(${fullscreenSwipeY}px)`, transition: fullscreenSwipeY === 0 ? 'transform 0.2s ease' : 'none' }} onTouchStart={handleFullscreenTouchStart} onTouchMove={handleFullscreenTouchMove} onTouchEnd={handleFullscreenTouchEnd} onClick={(e) => e.stopPropagation()}>
            {fullscreenImages[fullscreenIndex] && (
              <img src={fullscreenImages[fullscreenIndex].startsWith('data:') ? fullscreenImages[fullscreenIndex] : `data:image/jpeg;base64,${fullscreenImages[fullscreenIndex]}`} alt="Fullscreen view" className="max-w-full max-h-full object-contain" onClick={closeFullscreenImage} />
            )}
          </div>
          <button className="absolute top-12 right-4 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center" onClick={closeFullscreenImage}>
            <X className="w-6 h-6 text-white" />
          </button>
          {fullscreenImages.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
              {fullscreenImages.map((_, i) => (
                <button key={i} onClick={(e) => { e.stopPropagation(); setFullscreenIndex(i); }} className={`w-2.5 h-2.5 rounded-full ${i === fullscreenIndex ? 'bg-white' : 'bg-white/40'}`} />
              ))}
            </div>
          )}
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/50 text-sm">
            {fullscreenImages.length > 1 ? 'Swipe to navigate • Swipe down to close' : 'Swipe down to close'}
          </div>
        </div>
      )}

      <Toaster position="top-center" duration={1200} />
    </div>
  );
}

export default PostPage;
