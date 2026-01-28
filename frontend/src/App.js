import React, { useState, useEffect, useCallback, useRef } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  Plus, 
  MapPin, 
  Camera, 
  Clock, 
  AlertTriangle, 
  Check, 
  X, 
  Menu, 
  Trash2,
  Flag,
  Shield,
  BarChart3,
  RefreshCw,
  ChevronLeft,
  Loader2,
  Upload,
  Eye,
  CheckCircle,
  Share2,
  Copy,
  ExternalLink,
  Navigation
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@/index.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Categories list
const CATEGORIES = [
  "furniture", "electronics", "appliances", "sports", "toys", "books", 
  "clothing", "garden", "kitchen", "tools", "e-waste", "scrap-metal", "cardboard", "general"
];

// Report reasons
const REPORT_REASONS = [
  { value: "item_gone", label: "Item already gone" },
  { value: "incorrect_location", label: "Incorrect location" },
  { value: "unsafe", label: "Unsafe or prohibited" },
  { value: "spam", label: "Spam / misuse" }
];

// Create custom marker icon from base64 image
const createPinIcon = (imageBase64) => {
  const html = `
    <div class="custom-pin">
      <img src="${imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`}" alt="item" />
    </div>
  `;
  return L.divIcon({
    html,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 52],
    popupAnchor: [0, -52]
  });
};

// Default marker for location selection
const locationIcon = L.divIcon({
  html: `<div style="width:40px;height:40px;background:#166534;border-radius:50%;border:4px solid white;box-shadow:0 4px 14px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`,
  className: '',
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

// Map click handler component
function LocationPicker({ onLocationSelect, selectedLocation }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect([e.latlng.lat, e.latlng.lng]);
    }
  });
  
  return selectedLocation ? (
    <Marker position={selectedLocation} icon={locationIcon} />
  ) : null;
}

// Map center updater
function MapCenterUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

// Map reference setter
function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

// User location marker
function UserLocationMarker({ position }) {
  if (!position) return null;
  
  const icon = L.divIcon({
    html: `<div class="user-location-marker">
      <div class="pulse-ring"></div>
      <div class="center-dot"></div>
    </div>`,
    className: '',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
  
  return <Marker position={position} icon={icon} />;
}

// Category Badge
function CategoryBadge({ category }) {
  return (
    <span className={`category-pill ${category}`} data-testid={`category-badge-${category}`}>
      {category.replace('-', ' ')}
    </span>
  );
}

// Status Badge
function StatusBadge({ status }) {
  return (
    <span className={`status-badge ${status}`} data-testid={`status-badge-${status}`}>
      {status === "active" && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
      {status}
    </span>
  );
}

// Post Card Component
function PostCard({ post, onViewDetails }) {
  const timeLeft = () => {
    const expires = new Date(post.expires_at);
    const now = new Date();
    const diff = expires - now;
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "< 1 hour left";
    return `${hours}h left`;
  };

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 animate-slide-up cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onViewDetails(post)}
      data-testid={`post-card-${post.id}`}
    >
      <div className="relative aspect-video">
        <img 
          src={post.image_base64.startsWith('data:') ? post.image_base64 : `data:image/jpeg;base64,${post.image_base64}`}
          alt={post.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3">
          <CategoryBadge category={post.category} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
          <h3 className="text-white font-bold text-lg">{post.title}</h3>
        </div>
      </div>
      <div className="p-4">
        <p className="text-slate-600 text-sm line-clamp-2 mb-3">{post.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Clock className="w-4 h-4" />
            <span>{timeLeft()}</span>
          </div>
          <StatusBadge status={post.status} />
        </div>
      </div>
    </div>
  );
}

// Main App Component
function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // State
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostDrawer, setShowPostDrawer] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default: London
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  
  // Post form state
  const [newPost, setNewPost] = useState({
    image_base64: "",
    title: "",
    category: "general",
    description: "",
    expiry_hours: 48,
    latitude: null,
    longitude: null
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  
  // Report state
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  
  const fileInputRef = useRef(null);

  // Request user location
  const requestLocation = useCallback(() => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = [position.coords.latitude, position.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setIsLocating(false);
        toast.success("Location found!");
        
        // Fly to location if map is ready
        if (mapRef.current) {
          mapRef.current.flyTo(loc, 15, { duration: 1.5 });
        }
      },
      (error) => {
        setIsLocating(false);
        let errorMsg = "Unable to get location";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = "Location permission denied. Please enable location access.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMsg = "Location request timed out";
            break;
          default:
            errorMsg = "Unknown location error";
        }
        setLocationError(errorMsg);
        toast.error(errorMsg);
        // Keep default location
        setMapCenter([51.505, -0.09]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Get user location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result;
      setNewPost(prev => ({ ...prev, image_base64: base64 }));
      
      // Analyze with AI
      setIsAnalyzing(true);
      try {
        // Extract just the base64 data without the data URL prefix
        const base64Data = base64.split(',')[1] || base64;
        const response = await axios.post(`${API}/analyze-image`, {
          image_base64: base64Data
        });
        setNewPost(prev => ({
          ...prev,
          title: response.data.title,
          category: response.data.category,
          description: response.data.description
        }));
        toast.success("AI analysis complete!");
      } catch (error) {
        console.error("AI analysis failed:", error);
        toast.error("Could not analyze image. Please fill in details manually.");
      } finally {
        setIsAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle location selection
  const handleLocationSelect = (coords) => {
    if (pickingLocation) {
      setNewPost(prev => ({
        ...prev,
        latitude: coords[0],
        longitude: coords[1]
      }));
      setPickingLocation(false);
      toast.success("Location set!");
      // Reopen the post drawer
      setTimeout(() => setShowPostDrawer(true), 100);
    }
  };

  // Submit post
  const handleSubmitPost = async () => {
    if (!newPost.image_base64 || !newPost.title || !newPost.latitude) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsPosting(true);
    try {
      const base64Data = newPost.image_base64.split(',')[1] || newPost.image_base64;
      await axios.post(`${API}/posts`, {
        ...newPost,
        image_base64: base64Data
      });
      toast.success("Item posted successfully!");
      setShowPostDrawer(false);
      setNewPost({
        image_base64: "",
        title: "",
        category: "general",
        description: "",
        expiry_hours: 48,
        latitude: null,
        longitude: null
      });
      fetchPosts();
    } catch (error) {
      console.error("Failed to post:", error);
      toast.error("Failed to post item");
    } finally {
      setIsPosting(false);
    }
  };

  // Mark as collected
  const handleMarkCollected = async (postId) => {
    try {
      await axios.patch(`${API}/posts/${postId}/collected`);
      toast.success("Marked as collected!");
      setShowDetailDrawer(false);
      fetchPosts();
    } catch (error) {
      console.error("Failed to mark collected:", error);
      toast.error("Failed to update");
    }
  };

  // Share post - show share dialog
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePost, setSharePost] = useState(null);

  const handleSharePost = (post) => {
    setSharePost(post);
    setShowShareDialog(true);
  };

  const getShareUrl = (post) => `${window.location.origin}/post/${post.id}`;

  const shareToWhatsApp = (post) => {
    const url = getShareUrl(post);
    const text = `Check out this free item on Ucycle: ${post.title}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    setShowShareDialog(false);
  };

  const shareToFacebook = (post) => {
    const url = getShareUrl(post);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
    setShowShareDialog(false);
  };

  const shareToTwitter = (post) => {
    const url = getShareUrl(post);
    const text = `Free item available: ${post.title} 🎁`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    setShowShareDialog(false);
  };

  const copyShareLink = async (post) => {
    const url = getShareUrl(post);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success("Link copied!");
    }
    setShowShareDialog(false);
  };

  // Submit report
  const handleSubmitReport = async () => {
    if (!reportReason || !selectedPost) return;

    setIsReporting(true);
    try {
      await axios.post(`${API}/reports`, {
        post_id: selectedPost.id,
        reason: reportReason
      });
      toast.success("Report submitted");
      setShowReportDialog(false);
      setReportReason("");
    } catch (error) {
      console.error("Failed to report:", error);
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  // View post details
  const handleViewDetails = (post) => {
    setSelectedPost(post);
    setShowDetailDrawer(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden" data-testid="app-container">
      {/* Header */}
      <header className="glass-header fixed top-0 left-0 right-0 z-20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-lime-500 rounded-xl flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Ucycle
          </h1>
        </div>
        <button 
          onClick={() => setShowMenu(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
          data-testid="menu-button"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-slate-700" />
        </button>
      </header>

      {/* Map */}
      <div className="map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <MapCenterUpdater center={mapCenter} />
          <MapRefSetter mapRef={mapRef} />
          
          {/* User location marker */}
          <UserLocationMarker position={userLocation} />
          
          {/* Post markers */}
          {posts.map(post => (
            <Marker
              key={post.id}
              position={[post.latitude, post.longitude]}
              icon={createPinIcon(post.image_base64)}
              eventHandlers={{
                click: () => handleViewDetails(post)
              }}
            />
          ))}
          
          {/* Location picker */}
          {pickingLocation && (
            <LocationPicker 
              onLocationSelect={handleLocationSelect}
              selectedLocation={newPost.latitude ? [newPost.latitude, newPost.longitude] : null}
            />
          )}
        </MapContainer>
      </div>

      {/* My Location button */}
      {!pickingLocation && (
        <button 
          className={`my-location-btn ${isLocating ? 'locating' : ''}`}
          onClick={requestLocation}
          disabled={isLocating}
          data-testid="my-location-btn"
          aria-label="Go to my location"
        >
          {isLocating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
            </svg>
          )}
        </button>
      )}

      {/* Location picking overlay */}
      {pickingLocation && (
        <div className="fixed top-20 left-4 right-4 z-30 animate-slide-up">
          <div className="bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3">
            <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-slate-700">Tap on the map to set approximate location</p>
            <button 
              onClick={() => setPickingLocation(false)}
              className="ml-auto p-2 hover:bg-slate-100 rounded-full"
              data-testid="cancel-location-btn"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB - Post Item */}
      {!pickingLocation && (
        <button 
          className="fab-button"
          onClick={() => setShowPostDrawer(true)}
          data-testid="post-item-fab"
          aria-label="Post new item"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Menu Drawer */}
      <Drawer open={showMenu} onOpenChange={setShowMenu}>
        <DrawerContent className="max-h-[50vh]">
          <DrawerHeader>
            <DrawerTitle>Menu</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2">
            <button
              onClick={() => {
                setShowMenu(false);
                navigate('/admin');
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
              data-testid="admin-menu-btn"
            >
              <Shield className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Admin Panel</span>
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                fetchPosts();
                toast.success("Refreshed!");
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
              data-testid="refresh-menu-btn"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
              <span className="font-medium text-slate-900">Refresh Map</span>
            </button>
          </div>
          {/* Safety Notice */}
          <div className="mx-4 mb-4 safety-notice p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800 text-sm">Safety Notice</p>
                <p className="text-amber-700 text-xs mt-1">
                  Public pickup only. Do not enter private property.
                </p>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Post Item Drawer */}
      <Drawer open={showPostDrawer} onOpenChange={setShowPostDrawer}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>Post an Item</DrawerTitle>
            <DrawerDescription>Share something you no longer need</DrawerDescription>
          </DrawerHeader>
          <div className="p-4 space-y-6 overflow-y-auto pb-8">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Photo</label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
                data-testid="image-upload-input"
              />
              <div 
                className={`image-upload-area p-6 text-center cursor-pointer ${newPost.image_base64 ? 'has-image' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                data-testid="image-upload-area"
              >
                {newPost.image_base64 ? (
                  <div className="relative">
                    <img 
                      src={newPost.image_base64} 
                      alt="Preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                          <span className="text-sm font-medium text-slate-700">Analyzing...</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                      <Camera className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="text-slate-600">Tap to take or upload a photo</p>
                    <p className="text-xs text-slate-400">AI will auto-fill item details</p>
                  </div>
                )}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
              <Input
                value={newPost.title}
                onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Old Bookshelf"
                disabled={isAnalyzing}
                data-testid="post-title-input"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
              <Select 
                value={newPost.category} 
                onValueChange={(val) => setNewPost(prev => ({ ...prev, category: val }))}
                disabled={isAnalyzing}
              >
                <SelectTrigger data-testid="post-category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace('-', ' ').charAt(0).toUpperCase() + cat.replace('-', ' ').slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
              <Textarea
                value={newPost.description}
                onChange={(e) => setNewPost(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the item..."
                rows={3}
                disabled={isAnalyzing}
                data-testid="post-description-input"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Expires in</label>
              <div className="grid grid-cols-3 gap-3">
                {[24, 48, 72].map(hours => (
                  <button
                    key={hours}
                    onClick={() => setNewPost(prev => ({ ...prev, expiry_hours: hours }))}
                    className={`expiry-option ${newPost.expiry_hours === hours ? 'selected' : ''}`}
                    data-testid={`expiry-${hours}h`}
                  >
                    <Clock className={`w-5 h-5 mb-1 ${newPost.expiry_hours === hours ? 'text-green-700' : 'text-slate-400'}`} />
                    <span className={`font-bold ${newPost.expiry_hours === hours ? 'text-green-700' : 'text-slate-700'}`}>
                      {hours}h
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
              <div className="space-y-2">
                {userLocation && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-green-200 bg-green-50 hover:bg-green-100"
                    onClick={() => {
                      setNewPost(prev => ({
                        ...prev,
                        latitude: userLocation[0],
                        longitude: userLocation[1]
                      }));
                      toast.success("Using your current location!");
                    }}
                    data-testid="use-my-location-btn"
                  >
                    <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
                    </svg>
                    <span className="text-green-700">Use my current location</span>
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    setShowPostDrawer(false);
                    setPickingLocation(true);
                  }}
                  data-testid="set-location-btn"
                >
                  <MapPin className="w-4 h-4" />
                  {newPost.latitude ? (
                    <span className="text-green-700">Location set ✓</span>
                  ) : (
                    <span>Or tap to pick on map</span>
                  )}
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Only approximate location will be shown to protect privacy
              </p>
            </div>

            {/* Submit */}
            <Button
              className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-6 rounded-full shadow-lg"
              onClick={handleSubmitPost}
              disabled={isPosting || isAnalyzing || !newPost.image_base64 || !newPost.title || !newPost.latitude}
              data-testid="publish-post-btn"
            >
              {isPosting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Post Detail Drawer */}
      <Drawer open={showDetailDrawer} onOpenChange={setShowDetailDrawer}>
        <DrawerContent className="max-h-[85vh]">
          {selectedPost && (
            <>
              <div className="relative">
                <img 
                  src={selectedPost.image_base64.startsWith('data:') ? selectedPost.image_base64 : `data:image/jpeg;base64,${selectedPost.image_base64}`}
                  alt={selectedPost.title}
                  className="w-full h-48 object-cover"
                />
                <div className="absolute top-3 left-3">
                  <CategoryBadge category={selectedPost.category} />
                </div>
                <div className="absolute top-3 right-3">
                  <StatusBadge status={selectedPost.status} />
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <h2 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedPost.title}
                  </h2>
                  <p className="text-slate-600 mt-2">{selectedPost.description}</p>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Expires {new Date(selectedPost.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Safety Notice */}
                <div className="safety-notice p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-amber-700 text-xs">
                      Public pickup only. Do not enter private property.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {selectedPost.status === "active" && (
                  <div className="space-y-3 pt-2">
                    <Button
                      className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-5 rounded-full"
                      onClick={() => handleMarkCollected(selectedPost.id)}
                      data-testid="mark-collected-btn"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Mark as Collected
                    </Button>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        className="py-5 rounded-full"
                        onClick={() => handleSharePost(selectedPost)}
                        data-testid="share-post-btn"
                      >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        className="py-5 rounded-full"
                        onClick={() => {
                          setShowDetailDrawer(false);
                          setShowReportDialog(true);
                        }}
                        data-testid="report-post-btn"
                      >
                        <Flag className="w-4 h-4 mr-2" />
                        Report
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DrawerContent>
      </Drawer>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report an Issue</DialogTitle>
            <DialogDescription>
              Help us keep Ucycle safe and accurate
            </DialogDescription>
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
                <span className={`font-medium ${reportReason === reason.value ? 'text-green-700' : 'text-slate-700'}`}>
                  {reason.label}
                </span>
              </button>
            ))}
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
            ) : (
              "Submit Report"
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share this item</DialogTitle>
            <DialogDescription>
              {sharePost?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button
              onClick={() => shareToWhatsApp(sharePost)}
              className="share-btn whatsapp w-full"
              data-testid="share-whatsapp"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => shareToFacebook(sharePost)}
              className="share-btn facebook w-full"
              data-testid="share-facebook"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
            <button
              onClick={() => shareToTwitter(sharePost)}
              className="share-btn twitter w-full"
              data-testid="share-twitter"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter)
            </button>
            <button
              onClick={() => copyShareLink(sharePost)}
              className="share-btn copy w-full"
              data-testid="share-copy-link"
            >
              <Copy className="w-5 h-5" />
              Copy Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" />
    </div>
  );
}

// Admin Panel Component
function AdminPanel() {
  const navigate = useNavigate();
  const [verified, setVerified] = useState(false);
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState("stats");
  const [loading, setLoading] = useState(false);

  // Verify PIN
  const handleVerify = async () => {
    setVerifying(true);
    try {
      const response = await axios.post(`${API}/admin/verify`, { pin });
      if (response.data.verified) {
        setVerified(true);
        fetchAdminData();
      }
    } catch (error) {
      toast.error("Invalid PIN");
      setPin("");
    } finally {
      setVerifying(false);
    }
  };

  // Fetch admin data
  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, postsRes, reportsRes] = await Promise.all([
        axios.get(`${API}/admin/stats?pin=${pin}`),
        axios.get(`${API}/admin/posts?pin=${pin}`),
        axios.get(`${API}/reports?status=pending`)
      ]);
      setStats(statsRes.data);
      setPosts(postsRes.data);
      setReports(reportsRes.data);
    } catch (error) {
      console.error("Failed to fetch admin data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // Remove post
  const handleRemovePost = async (postId) => {
    try {
      await axios.delete(`${API}/admin/posts/${postId}?pin=${pin}`);
      toast.success("Post removed");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to remove post");
    }
  };

  // Mark report reviewed
  const handleReviewReport = async (reportId) => {
    try {
      await axios.patch(`${API}/admin/reports/${reportId}/reviewed?pin=${pin}`);
      toast.success("Report marked as reviewed");
      fetchAdminData();
    } catch (error) {
      toast.error("Failed to update report");
    }
  };

  // PIN entry screen
  if (!verified) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" data-testid="admin-pin-screen">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-2xl flex items-center justify-center mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Admin Access
            </h1>
            <p className="text-slate-500 mt-2">Enter PIN to continue</p>
          </div>

          {/* PIN Display */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map(i => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full ${pin.length > i ? 'bg-green-600' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-4 justify-items-center">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((num, i) => (
              num === null ? <div key={i} /> : (
                <button
                  key={i}
                  className="pin-button"
                  onClick={() => {
                    if (num === 'del') {
                      setPin(p => p.slice(0, -1));
                    } else if (pin.length < 4) {
                      const newPin = pin + num;
                      setPin(newPin);
                      if (newPin.length === 4) {
                        setTimeout(() => {
                          setVerifying(true);
                          axios.post(`${API}/admin/verify`, { pin: newPin })
                            .then(res => {
                              if (res.data.verified) {
                                setPin(newPin);
                                setVerified(true);
                              }
                            })
                            .catch(() => {
                              toast.error("Invalid PIN");
                              setPin("");
                            })
                            .finally(() => setVerifying(false));
                        }, 200);
                      }
                    }
                  }}
                  disabled={verifying}
                  data-testid={`pin-btn-${num}`}
                >
                  {num === 'del' ? <X className="w-6 h-6" /> : num}
                </button>
              )
            ))}
          </div>

          <button
            onClick={() => navigate('/')}
            className="mt-8 text-slate-500 text-sm flex items-center gap-2 mx-auto hover:text-slate-700"
            data-testid="back-to-map-btn"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to map
          </button>
        </div>
        <Toaster position="top-center" />
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="min-h-screen bg-slate-50" data-testid="admin-dashboard">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-100 rounded-lg"
            data-testid="admin-back-btn"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg text-slate-900">Admin Panel</h1>
        </div>
        <button
          onClick={fetchAdminData}
          className="p-2 hover:bg-slate-100 rounded-lg"
          disabled={loading}
          data-testid="admin-refresh-btn"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white">
        {[
          { id: 'stats', label: 'Statistics', icon: BarChart3 },
          { id: 'posts', label: 'Posts', icon: Eye },
          { id: 'reports', label: 'Reports', icon: Flag }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
              activeTab === tab.id 
                ? 'text-green-700 border-b-2 border-green-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
            data-testid={`admin-tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.id === 'reports' && reports.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {reports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Statistics Tab */}
        {activeTab === 'stats' && stats && (
          <div className="space-y-4 animate-fade-in">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Total Posts</p>
                <p className="text-3xl font-bold text-slate-900">{stats.total_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Active</p>
                <p className="text-3xl font-bold text-green-600">{stats.active_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Collected</p>
                <p className="text-3xl font-bold text-blue-600">{stats.collected_posts}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm">Expired</p>
                <p className="text-3xl font-bold text-amber-600">{stats.expired_posts}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-2xl shadow-sm">
              <p className="text-slate-500 text-sm mb-3">Pending Reports</p>
              <p className="text-3xl font-bold text-red-600">{stats.pending_reports}</p>
            </div>

            {Object.keys(stats.categories || {}).length > 0 && (
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <p className="text-slate-500 text-sm mb-3">Categories</p>
                <div className="space-y-2">
                  {Object.entries(stats.categories).map(([cat, count]) => (
                    <div key={cat} className="flex items-center justify-between">
                      <CategoryBadge category={cat} />
                      <span className="font-bold text-slate-700">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Posts Tab */}
        {activeTab === 'posts' && (
          <div className="space-y-4 animate-fade-in">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No posts yet
              </div>
            ) : (
              posts.map(post => (
                <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex">
                    <img 
                      src={post.image_base64.startsWith('data:') ? post.image_base64 : `data:image/jpeg;base64,${post.image_base64}`}
                      alt={post.title}
                      className="w-24 h-24 object-cover"
                    />
                    <div className="flex-1 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-slate-900">{post.title}</h3>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(post.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={post.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <CategoryBadge category={post.category} />
                        {post.report_count > 0 && (
                          <span className="text-xs text-red-600 font-medium">
                            {post.report_count} reports
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {post.status !== 'removed' && (
                    <div className="border-t border-slate-100 p-2">
                      <button
                        onClick={() => handleRemovePost(post.id)}
                        className="w-full py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg flex items-center justify-center gap-2"
                        data-testid={`remove-post-${post.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove Post
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-fade-in">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No pending reports
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="bg-white rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {REPORT_REASONS.find(r => r.value === report.reason)?.label || report.reason}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Post: {report.post_id.slice(0, 8)}...
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => handleReviewReport(report.id)}
                      className="px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-full hover:bg-green-200"
                      data-testid={`review-report-${report.id}`}
                    >
                      Mark Reviewed
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <Toaster position="top-center" />
    </div>
  );
}

// Shared Post Page Component
function PostPage() {
  const navigate = useNavigate();
  const { postId } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await axios.get(`${API}/posts/${postId}`);
        setPost(response.data);
      } catch (err) {
        console.error("Failed to fetch post:", err);
        setError("Post not found or has expired");
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [postId]);

  const handleMarkCollected = async () => {
    try {
      await axios.patch(`${API}/posts/${postId}/collected`);
      toast.success("Marked as collected!");
      setPost(prev => ({ ...prev, status: "collected" }));
    } catch (err) {
      toast.error("Failed to update");
    }
  };

  const shareUrl = window.location.href;

  const shareToWhatsApp = () => {
    const text = `Check out this free item on Ucycle: ${post.title}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + shareUrl)}`, '_blank');
    setShowShareDialog(false);
  };

  const shareToFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
    setShowShareDialog(false);
  };

  const shareToTwitter = () => {
    const text = `Free item available: ${post.title} 🎁`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
    setShowShareDialog(false);
  };

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
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
        <Toaster position="top-center" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" data-testid="shared-post-page">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="p-2 hover:bg-slate-100 rounded-lg" data-testid="back-btn">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-green-600 to-lime-500 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">Ucycle</span>
        </div>
      </header>

      {/* Post Content */}
      <div className="pb-8">
        <div className="relative">
          <img 
            src={post.image_base64.startsWith('data:') ? post.image_base64 : `data:image/jpeg;base64,${post.image_base64}`}
            alt={post.title}
            className="w-full h-64 object-cover"
          />
          <div className="absolute top-3 left-3">
            <CategoryBadge category={post.category} />
          </div>
          <div className="absolute top-3 right-3">
            <StatusBadge status={post.status} />
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <h1 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {post.title}
            </h1>
            <p className="text-slate-600 mt-2">{post.description}</p>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Expires {new Date(post.expires_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>Tap to view on map</span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="safety-notice p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs">
                Public pickup only. Do not enter private property.
              </p>
            </div>
          </div>

          {/* Actions */}
          {post.status === "active" && (
            <div className="space-y-3 pt-2">
              <Button
                className="w-full bg-green-800 hover:bg-green-900 text-white font-bold py-5 rounded-full"
                onClick={() => navigate(`/?lat=${post.latitude}&lng=${post.longitude}&post=${post.id}`)}
                data-testid="view-on-map-btn"
              >
                <MapPin className="w-5 h-5 mr-2" />
                View on Map
              </Button>
              <Button
                className="w-full bg-lime-500 hover:bg-lime-600 text-slate-900 font-bold py-5 rounded-full"
                onClick={handleMarkCollected}
                data-testid="mark-collected-btn"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Mark as Collected
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="py-5 rounded-full" onClick={() => setShowShareDialog(true)} data-testid="share-btn">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" className="py-5 rounded-full" onClick={() => setShowReportDialog(true)} data-testid="report-btn">
                  <Flag className="w-4 h-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>
          )}

          {post.status !== "active" && (
            <div className="text-center py-6">
              <p className="text-slate-500">
                {post.status === "collected" ? "This item has been collected." : "This post has expired."}
              </p>
              <Button onClick={() => navigate('/')} variant="outline" className="mt-4" data-testid="browse-more-btn">
                Browse More Items
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share this item</DialogTitle>
            <DialogDescription>{post?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <button onClick={shareToWhatsApp} className="share-btn whatsapp w-full" data-testid="share-whatsapp">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button onClick={shareToFacebook} className="share-btn facebook w-full" data-testid="share-facebook">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
            <button onClick={shareToTwitter} className="share-btn twitter w-full" data-testid="share-twitter">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter)
            </button>
            <button onClick={copyShareLink} className="share-btn copy w-full" data-testid="share-copy-link">
              <Copy className="w-5 h-5" />
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
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  reportReason === reason.value 
                    ? 'border-green-600 bg-green-50' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className={`font-medium ${reportReason === reason.value ? 'text-green-700' : 'text-slate-700'}`}>
                  {reason.label}
                </span>
              </button>
            ))}
          </div>
          <Button
            className="w-full bg-green-800 hover:bg-green-900"
            onClick={handleSubmitReport}
            disabled={!reportReason || isReporting}
          >
            {isReporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit Report
          </Button>
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" />
    </div>
  );
}

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/post/:postId" element={<PostPage />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
