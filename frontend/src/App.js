import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Navigation,
  Search,
  Heart
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
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10); // Default 10km radius
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);
  
  // Camera state
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Welcome & Scrap Yard state
  const [showWelcome, setShowWelcome] = useState(false);
  const [showScrapYardAd, setShowScrapYardAd] = useState(false);
  
  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ucycle_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Post form state
  const [newPost, setNewPost] = useState({
    image_base64: "",
    title: "",
    category: "general",
    description: "",
    expiry_hours: 48,
    latitude: null,
    longitude: null,
    images: []  // Additional images beyond the primary one
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  
  // Report state
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  
  // Additional images input ref
  const fileInputRef = useRef(null);
  const additionalImagesRef = useRef(null);

  // Favorites functions
  const toggleFavorite = useCallback((postId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId];
      localStorage.setItem('ucycle_favorites', JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  const isFavorite = useCallback((postId) => {
    return favorites.includes(postId);
  }, [favorites]);

  // Calculate distance between two points (Haversine formula)
  const getDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Get posts within radius
  const postsInRadius = useMemo(() => {
    if (!userLocation) return filteredPosts;
    return filteredPosts.filter(post => {
      const distance = getDistance(
        userLocation[0], userLocation[1],
        post.latitude, post.longitude
      );
      return distance <= radiusKm;
    });
  }, [filteredPosts, userLocation, radiusKm, getDistance]);

  // Filter posts by category (from radius-filtered posts)
  const getDisplayPosts = useCallback(() => {
    let result = postsInRadius;
    if (selectedCategory) {
      result = result.filter(post => post.category === selectedCategory);
    }
    if (showFavoritesOnly) {
      result = result.filter(post => favorites.includes(post.id));
    }
    return result;
  }, [postsInRadius, selectedCategory, showFavoritesOnly, favorites]);

  // Get unique categories from posts within radius only
  const availableCategories = useMemo(() => {
    const cats = [...new Set(postsInRadius.map(p => p.category))];
    return cats.sort();
  }, [postsInRadius]);

  // Count of favorite posts
  const favoritesCount = useMemo(() => {
    return posts.filter(p => favorites.includes(p.id)).length;
  }, [posts, favorites]);

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
      setFilteredPosts(response.data);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, []);

  // Search functionality
  const handleSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setFilteredPosts(posts);
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();

    // Filter posts by keyword (title, description, category)
    const keywordResults = posts.filter(post => 
      post.title.toLowerCase().includes(lowerQuery) ||
      post.description.toLowerCase().includes(lowerQuery) ||
      post.category.toLowerCase().includes(lowerQuery)
    );
    
    setFilteredPosts(keywordResults);

    // Also search for location using Nominatim (OpenStreetMap geocoding)
    try {
      // Use countrycodes=au for Australian addresses and add structured query hints
      const searchParams = new URLSearchParams({
        format: 'json',
        q: query,
        limit: '5',
        countrycodes: 'au',
        addressdetails: '1'
      });
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'UcycleApp/1.0' } }
      );
      
      const locationResults = response.data.map(item => ({
        type: 'location',
        name: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));

      // Combine with keyword results
      const itemResults = keywordResults.map(post => ({
        type: 'item',
        ...post
      }));

      setSearchResults([...itemResults.slice(0, 3), ...locationResults]);
      setShowSearchResults(true);
    } catch (error) {
      console.error("Geocoding failed:", error);
      // Just show item results
      setSearchResults(keywordResults.map(post => ({ type: 'item', ...post })));
      setShowSearchResults(keywordResults.length > 0);
    } finally {
      setIsSearching(false);
    }
  }, [posts]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery);
      } else {
        setFilteredPosts(posts);
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch, posts]);

  // Handle search result selection
  const handleSearchResultClick = (result) => {
    if (result.type === 'location') {
      // Fly to location
      if (mapRef.current) {
        mapRef.current.flyTo([result.lat, result.lng], 14, { duration: 1.5 });
      }
      setMapCenter([result.lat, result.lng]);
      toast.success(`Showing: ${result.name.split(',')[0]}`);
    } else {
      // Show item detail
      handleViewDetails(result);
    }
    setShowSearchResults(false);
    setShowSearchBar(false);
    setSearchQuery("");
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery("");
    setFilteredPosts(posts);
    setSearchResults([]);
    setShowSearchResults(false);
    setSelectedCategory(null);
  };

  // Check for nearby items notification
  const [lastNotifiedPosts, setLastNotifiedPosts] = useState(new Set());
  const [notificationPermission, setNotificationPermission] = useState('default');

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success("Notifications enabled! You'll be alerted when new items appear nearby.");
      }
      return permission;
    }
    return 'denied';
  };

  // Check for nearby items
  useEffect(() => {
    if (!userLocation || posts.length === 0) return;
    
    const nearbyRadius = 5; // km
    const newNearbyPosts = posts.filter(post => {
      const distance = getDistance(
        userLocation[0], userLocation[1],
        post.latitude, post.longitude
      );
      return distance <= nearbyRadius && !lastNotifiedPosts.has(post.id);
    });

    if (newNearbyPosts.length > 0 && notificationPermission === 'granted') {
      // Show browser notification
      newNearbyPosts.forEach(post => {
        new Notification('New item nearby! 🎁', {
          body: `${post.title} - ${post.category}`,
          icon: '/favicon.ico',
          tag: post.id
        });
      });
      
      // Update notified posts
      setLastNotifiedPosts(prev => {
        const newSet = new Set(prev);
        newNearbyPosts.forEach(p => newSet.add(p.id));
        return newSet;
      });
    }
  }, [posts, userLocation, lastNotifiedPosts, notificationPermission, getDistance]);

  // Get user location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Show welcome popup on first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('ucycle_welcome_seen');
    if (!hasSeenWelcome) {
      setTimeout(() => setShowWelcome(true), 1000);
    }
  }, []);

  const dismissWelcome = () => {
    localStorage.setItem('ucycle_welcome_seen', 'true');
    setShowWelcome(false);
  };

  // Check if user is in Western Sydney/Penrith area (for Norman Scrap Yard ad)
  const isInWesternSydney = useCallback(() => {
    if (!userLocation) return false;
    // Western Sydney / Penrith area: roughly -33.75, 150.69
    // Check within ~50km radius
    const penrithLat = -33.7507;
    const penrithLng = 150.6944;
    const distance = getDistance(userLocation[0], userLocation[1], penrithLat, penrithLng);
    return distance <= 50; // Within 50km of Penrith
  }, [userLocation, getDistance]);

  // Norman Scrap Yard details
  const NORMAN_SCRAP_YARD = {
    name: "Norman's Scrap Metal",
    address: "34 Peachtree Rd, Penrith NSW 2750",
    phone: "Contact via Google Maps",
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=34+Peachtree+Rd,+Penrith+NSW+2750",
    logo: "https://customer-assets.emergentagent.com/job_43339dc9-f006-41e6-8de9-36afdf0eb8cc/artifacts/tuki91fg_IMG_4869.png"
  };

  // ============ CAMERA FUNCTIONS ============
  
  // Camera zoom state
  const [cameraZoom, setCameraZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const lastTouchDistance = useRef(0);
  
  // Open camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setCameraStream(stream);
      setShowCameraView(true);
      setCameraZoom(1); // Reset zoom
      
      // Check if camera supports native zoom
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.zoom) {
        setMaxZoom(capabilities.zoom.max || 5);
      }
      
      // Connect stream to video element after render
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Could not access camera. Please check permissions.");
      // Fallback to file picker
      fileInputRef.current?.click();
    }
  };

  // Close camera
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraView(false);
    setCameraZoom(1);
  };

  // Apply zoom to camera
  const applyCameraZoom = useCallback((newZoom) => {
    const clampedZoom = Math.min(Math.max(newZoom, 1), maxZoom);
    setCameraZoom(clampedZoom);
    
    // Try to apply native camera zoom if supported
    if (cameraStream) {
      const track = cameraStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.();
      if (capabilities?.zoom) {
        track.applyConstraints({ advanced: [{ zoom: clampedZoom }] }).catch(() => {});
      }
    }
  }, [cameraStream, maxZoom]);

  // Handle pinch zoom on camera
  const handleCameraTouchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      lastTouchDistance.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
    }
  };

  const handleCameraTouchMove = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      if (lastTouchDistance.current > 0) {
        const scale = currentDistance / lastTouchDistance.current;
        const newZoom = cameraZoom * scale;
        applyCameraZoom(newZoom);
      }
      
      lastTouchDistance.current = currentDistance;
    }
  };

  const handleCameraTouchEnd = () => {
    lastTouchDistance.current = 0;
  };

  // Capture photo from camera
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas (with zoom crop if using CSS zoom)
    const ctx = canvas.getContext('2d');
    
    // If using CSS transform zoom, crop the center portion
    if (cameraZoom > 1) {
      const zoomFactor = cameraZoom;
      const cropWidth = video.videoWidth / zoomFactor;
      const cropHeight = video.videoHeight / zoomFactor;
      const cropX = (video.videoWidth - cropWidth) / 2;
      const cropY = (video.videoHeight - cropHeight) / 2;
      
      ctx.drawImage(
        video,
        cropX, cropY, cropWidth, cropHeight,  // Source crop
        0, 0, canvas.width, canvas.height      // Destination
      );
    } else {
      ctx.drawImage(video, 0, 0);
    }
    
    // Get compressed base64
    const base64 = canvas.toDataURL('image/jpeg', 0.7);
    
    // Close camera
    closeCamera();
    
    // Process the captured image
    await processImage(base64);
  };

  // Process image (shared between camera capture and file upload)
  const processImage = async (base64) => {
    // Auto-set location if available
    const locationUpdate = userLocation ? {
      latitude: userLocation[0],
      longitude: userLocation[1]
    } : {};
    
    setNewPost(prev => ({ 
      ...prev, 
      image_base64: base64,
      ...locationUpdate
    }));
    setShowPostDrawer(true);
    
    // Analyze with AI
    setIsAnalyzing(true);
    try {
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

  // Handle album/gallery selection
  const openGallery = () => {
    closeCamera();
    fileInputRef.current?.click();
  };

  // Handle image upload from file picker
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress image before upload
    const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Scale down if too large
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to compressed base64
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    };

    try {
      // Compress the image
      const compressedBase64 = await compressImage(file);
      // Process it (AI analysis + show form)
      await processImage(compressedBase64);
    } catch (error) {
      console.error("Image processing failed:", error);
      toast.error("Could not process image. Please try again.");
    }
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
      toast.success("Nice one! Item collected 🎉");
      setShowDetailDrawer(false);
      fetchPosts();
      
      // Show Norman Scrap Yard ad if user is in Western Sydney
      if (isInWesternSydney()) {
        setTimeout(() => setShowScrapYardAd(true), 500);
      }
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

  const shareToMessenger = (post) => {
    const url = getShareUrl(post);
    // Facebook Messenger share link
    const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(url)}`;
    // Fallback for desktop/web
    const webMessengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(url)}&redirect_uri=${encodeURIComponent(window.location.origin)}&app_id=966242223397117`;
    
    // Try mobile app first, fallback to web
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = messengerUrl;
      // Fallback after delay if app doesn't open
      setTimeout(() => {
        window.open(webMessengerUrl, '_blank', 'width=600,height=400');
      }, 1500);
    } else {
      window.open(webMessengerUrl, '_blank', 'width=600,height=400');
    }
    setShowShareDialog(false);
  };

  const shareToFacebookGroups = (post) => {
    const url = getShareUrl(post);
    // Direct link to Ucycle Facebook community group
    const groupUrl = 'https://www.facebook.com/groups/1JeLHV4p3n';
    window.open(groupUrl, '_blank');
    // Copy link to clipboard for easy pasting
    navigator.clipboard.writeText(`Free item: ${post.title} 🎁\n\n${url}`).then(() => {
      toast.success("Link copied! Paste it in the group");
    }).catch(() => {
      toast.success("Share in the Ucycle community!");
    });
    setShowShareDialog(false);
  };

  const shareToGumtree = (post) => {
    // Gumtree doesn't have a direct share API, so we'll open Gumtree's post page
    // User can then manually post their item there
    window.open('https://www.gumtree.com.au/p-post-ad.html', '_blank');
    toast.success("Post your item on Gumtree too!");
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
      <header className="glass-header fixed top-0 left-0 right-0 z-20 px-4 py-3">
        {!showSearchBar ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-lime-500 rounded-xl flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h1 className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Ucycle
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setShowSearchBar(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                data-testid="search-button"
                aria-label="Search"
              >
                <Search className="w-5 h-5 text-slate-700" />
              </button>
              <button 
                onClick={() => setShowMenu(true)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                data-testid="menu-button"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-slate-700" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items or locations..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-full text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                data-testid="search-input"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600 animate-spin" />
              )}
            </div>
            <button
              onClick={() => {
                setShowSearchBar(false);
                clearSearch();
              }}
              className="px-3 py-2 text-slate-600 font-medium"
              data-testid="cancel-search-btn"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* Search Results Dropdown */}
      {showSearchResults && searchResults.length > 0 && (
        <div className="fixed top-16 left-4 right-4 z-30 bg-white rounded-2xl shadow-lg border border-slate-200 max-h-80 overflow-y-auto animate-slide-up" data-testid="search-results">
          {searchResults.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSearchResultClick(result)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0 text-left"
              data-testid={`search-result-${index}`}
            >
              {result.type === 'location' ? (
                <>
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{result.name.split(',')[0]}</p>
                    <p className="text-xs text-slate-500 truncate">{result.name.split(',').slice(1, 3).join(',')}</p>
                  </div>
                </>
              ) : (
                <>
                  <img 
                    src={result.image_base64?.startsWith('data:') ? result.image_base64 : `data:image/jpeg;base64,${result.image_base64}`}
                    alt={result.title}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{result.title}</p>
                    <p className="text-xs text-slate-500 truncate">{result.category}</p>
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      {/* No Results Message - auto-dismiss after 3s */}
      {showSearchBar && searchQuery && !isSearching && searchResults.length === 0 && (
        <div 
          className="fixed top-16 left-4 right-4 z-30 bg-white rounded-2xl shadow-lg border border-slate-200 p-6 text-center animate-slide-up"
          onAnimationEnd={() => setTimeout(() => setSearchQuery(""), 3000)}
        >
          <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500">No results found for "{searchQuery}"</p>
        </div>
      )}

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
          
          {/* Post markers - use getDisplayPosts for category filter */}
          {getDisplayPosts().map(post => (
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

      {/* Loading State */}
      {loading && (
        <div className="fixed inset-0 z-40 bg-white/80 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <RefreshCw className="w-8 h-8 text-white" />
            </div>
            <p className="text-slate-600 font-medium">Loading Ucycle...</p>
          </div>
        </div>
      )}

      {/* Empty State - No Posts */}
      {!loading && posts.length === 0 && !showSearchBar && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 text-center p-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-lime-100 rounded-full flex items-center justify-center mb-4">
              <MapPin className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              No items yet
            </h2>
            <p className="text-slate-500 mb-6">
              Be the first to post a free item in your area!
            </p>
            <button
              onClick={() => setShowPostDrawer(true)}
              className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-bold py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow"
              data-testid="empty-state-post-btn"
            >
              <Camera className="w-5 h-5 inline mr-2" />
              Snap First Item
            </button>
          </div>
        </div>
      )}

      {/* Radius & Category Filters */}
      {!showSearchBar && !pickingLocation && !showCameraView && (
        <div className="fixed top-16 left-0 right-0 z-15 px-4 py-2">
          {/* Radius Control */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowRadiusSlider(!showRadiusSlider)}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-full shadow-sm text-sm font-medium text-slate-700"
              data-testid="radius-toggle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {radiusKm}km
            </button>
            {showRadiusSlider && (
              <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm animate-fade-in">
                <span className="text-xs text-slate-500">1km</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={radiusKm}
                  onChange={(e) => {
                    setRadiusKm(parseInt(e.target.value));
                    // Auto-close after 3 seconds
                    setTimeout(() => setShowRadiusSlider(false), 3000);
                  }}
                  className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  data-testid="radius-slider"
                />
                <span className="text-xs text-slate-500">100km</span>
              </div>
            )}
            {!showRadiusSlider && postsInRadius.length !== posts.length && (
              <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded-full shadow-sm">
                {postsInRadius.length} nearby
              </span>
            )}
          </div>
          
          {/* Category Chips - only show if there are posts in radius */}
          {postsInRadius.length > 0 && (
            <div className="overflow-x-auto hide-scrollbar">
              <div className="flex gap-2 pb-1">
                {/* Favorites filter */}
                {favoritesCount > 0 && (
                  <button
                    onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm flex items-center gap-1 ${
                      showFavoritesOnly 
                        ? 'bg-red-500 text-white' 
                        : 'bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                    data-testid="filter-favorites"
                  >
                    <Heart className={`w-3.5 h-3.5 ${showFavoritesOnly ? 'fill-white' : ''}`} />
                    Saved ({favoritesCount})
                  </button>
                )}
                <button
                  onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); }}
                  className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                    !selectedCategory && !showFavoritesOnly
                      ? 'bg-green-600 text-white' 
                      : 'bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                  data-testid="filter-all"
                >
                  All ({postsInRadius.length})
                </button>
                {availableCategories.map(cat => {
                  const count = postsInRadius.filter(p => p.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                      className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-sm ${
                        selectedCategory === cat 
                          ? 'bg-green-600 text-white' 
                          : 'bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                      data-testid={`filter-${cat}`}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')} ({count})
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search filter indicator */}
      {searchQuery && filteredPosts.length !== posts.length && (
        <div className="fixed top-28 left-4 right-4 z-20 animate-slide-up">
          <div className="bg-green-600 text-white rounded-full px-4 py-2 flex items-center justify-between shadow-lg">
            <span className="text-sm font-medium">
              Showing {getDisplayPosts().length} of {posts.length} items
            </span>
            <button 
              onClick={clearSearch}
              className="ml-2 p-1 hover:bg-green-700 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

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

      {/* Hidden file input for gallery */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        data-testid="image-upload-input"
      />
      
      {/* Hidden canvas for camera capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera FAB Button */}
      {!pickingLocation && !showCameraView && (
        <button 
          className="fab-button"
          onClick={openCamera}
          data-testid="camera-fab"
          aria-label="Open camera"
        >
          <Camera className="w-7 h-7" />
        </button>
      )}

      {/* Full Screen Camera View */}
      {showCameraView && (
        <div 
          className="fixed inset-0 z-50 bg-black touch-none" 
          data-testid="camera-view"
          onTouchStart={handleCameraTouchStart}
          onTouchMove={handleCameraTouchMove}
          onTouchEnd={handleCameraTouchEnd}
        >
          {/* Camera Feed - with zoom transform */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{
              transform: `scale(${cameraZoom})`,
              transformOrigin: 'center center'
            }}
          />
          
          {/* Camera UI Overlay */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {/* Top Bar - just close button */}
            <div className="flex items-center justify-between p-4 pt-12 pointer-events-auto">
              <button
                onClick={closeCamera}
                className="w-12 h-12 bg-black/40 rounded-full flex items-center justify-center"
                data-testid="close-camera-btn"
              >
                <X className="w-6 h-6 text-white" />
              </button>
              <div className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </div>
              <div className="w-12 h-12" /> {/* Spacer */}
            </div>
            
            {/* Zoom Indicator - shows when zoomed */}
            {cameraZoom > 1.1 && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 rounded-full pointer-events-auto">
                <p className="text-white text-sm font-medium">{cameraZoom.toFixed(1)}x</p>
              </div>
            )}
            
            {/* Spacer */}
            <div className="flex-1" />
            
            {/* Zoom Slider */}
            <div className="px-8 mb-4 pointer-events-auto">
              <div className="flex items-center gap-3 bg-black/40 rounded-full px-4 py-2">
                <span className="text-white text-xs">1x</span>
                <input
                  type="range"
                  min="1"
                  max={maxZoom}
                  step="0.1"
                  value={cameraZoom}
                  onChange={(e) => applyCameraZoom(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-lime-400"
                />
                <span className="text-white text-xs">{maxZoom}x</span>
              </div>
            </div>
            
            {/* Bottom Controls */}
            <div className="p-6 pb-12 pointer-events-auto">
              <div className="flex items-center justify-center gap-8">
                {/* Gallery Button */}
                <button
                  onClick={openGallery}
                  className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center"
                  data-testid="gallery-btn"
                >
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                </button>
                
                {/* Capture Button */}
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl ring-4 ring-white/30"
                  data-testid="capture-btn"
                >
                  <div className="w-16 h-16 bg-lime-400 rounded-full" />
                </button>
                
                {/* Flip Camera (placeholder) */}
                <button
                  className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center opacity-50"
                  disabled
                >
                  <RefreshCw className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
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
            <button
              onClick={async () => {
                const permission = await requestNotificationPermission();
                if (permission !== 'granted') {
                  toast.error("Please enable notifications in your browser settings");
                }
              }}
              className="w-full flex items-center gap-3 p-4 rounded-xl hover:bg-slate-100 transition-colors text-left"
              data-testid="notifications-menu-btn"
            >
              <svg className="w-5 h-5 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <div className="flex-1">
                <span className="font-medium text-slate-900">Nearby Notifications</span>
                <p className="text-xs text-slate-500">
                  {notificationPermission === 'granted' ? '✓ Enabled' : 'Get alerts for nearby items'}
                </p>
              </div>
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

      {/* Post Item Drawer - Compact Design */}
      <Drawer open={showPostDrawer} onOpenChange={setShowPostDrawer}>
        <DrawerContent className="max-h-[85vh]">
          {/* Compact Header with Image */}
          <div className="relative">
            {newPost.image_base64 ? (
              <>
                <img 
                  src={newPost.image_base64} 
                  alt="Preview" 
                  className="w-full h-40 object-cover"
                />
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="flex items-center gap-2 text-white">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-medium">AI analyzing...</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    setNewPost(prev => ({ ...prev, image_base64: "" }));
                    openCamera();
                    setShowPostDrawer(false);
                  }}
                  className="absolute top-3 right-3 p-2 bg-black/50 rounded-full text-white"
                  data-testid="retake-photo-btn"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </>
            ) : (
              <div 
                className="h-40 bg-slate-100 flex items-center justify-center cursor-pointer"
                onClick={() => { setShowPostDrawer(false); openCamera(); }}
              >
                <div className="text-center">
                  <Camera className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">Tap to snap a photo</p>
                </div>
              </div>
            )}
          </div>
          
          {/* Compact Form */}
          <div className="p-4 pb-20 space-y-4">
            {/* Title - larger, prominent */}
            <Input
              value={newPost.title}
              onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
              placeholder="What is it? (e.g. Old Chair)"
              disabled={isAnalyzing}
              className="text-lg font-semibold border-0 border-b rounded-none px-0 focus-visible:ring-0"
              data-testid="post-title-input"
            />
            
            {/* Category + Expiry in one row */}
            <div className="flex gap-3">
              <Select 
                value={newPost.category} 
                onValueChange={(val) => setNewPost(prev => ({ ...prev, category: val }))}
                disabled={isAnalyzing}
              >
                <SelectTrigger className="flex-1" data-testid="post-category-select">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace('-', ' ').charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Compact expiry buttons */}
              <div className="flex border rounded-lg overflow-hidden">
                {[24, 48, 72].map(hours => (
                  <button
                    key={hours}
                    onClick={() => setNewPost(prev => ({ ...prev, expiry_hours: hours }))}
                    className={`px-3 py-2 text-sm font-medium transition-colors ${
                      newPost.expiry_hours === hours 
                        ? 'bg-green-600 text-white' 
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    data-testid={`expiry-${hours}h`}
                  >
                    {hours}h
                  </button>
                ))}
              </div>
            </div>
            
            {/* Location - auto-use current if available */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-5 h-5 text-green-600" />
              {newPost.latitude ? (
                <span className="text-sm text-green-700 flex-1">Location set ✓</span>
              ) : userLocation ? (
                <button
                  onClick={() => {
                    setNewPost(prev => ({
                      ...prev,
                      latitude: userLocation[0],
                      longitude: userLocation[1]
                    }));
                    toast.success("Using your location!");
                  }}
                  className="text-sm text-green-600 flex-1 text-left"
                >
                  Tap to use current location
                </button>
              ) : (
                <button
                  onClick={() => { setShowPostDrawer(false); setPickingLocation(true); }}
                  className="text-sm text-slate-600 flex-1 text-left"
                >
                  Tap to set location
                </button>
              )}
            </div>
            
            {/* Swipe to Post Button */}
            <div className="pt-2">
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-lime-500 hover:from-green-700 hover:to-lime-600 text-white font-bold py-6 rounded-full shadow-lg text-lg"
                onClick={handleSubmitPost}
                disabled={isPosting || isAnalyzing || !newPost.image_base64 || !newPost.title || !newPost.latitude}
                data-testid="publish-post-btn"
              >
                {isPosting ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Check className="w-6 h-6 mr-2" />
                    Help a mate find it!
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-slate-400 mt-2">
                Approximate location shown for privacy
              </p>
            </div>
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
              <div className="p-4 pb-20 space-y-4">
                <div>
                  <h2 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {selectedPost.title}
                  </h2>
                  <p className="text-slate-600 mt-2">{selectedPost.description}</p>
                </div>
                
                <div className="flex flex-col gap-2 text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>
                      Expires {new Date(selectedPost.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPost.latitude},${selectedPost.longitude}`}
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
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        className={`py-5 rounded-full ${isFavorite(selectedPost.id) ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                        onClick={() => {
                          toggleFavorite(selectedPost.id);
                          toast.success(isFavorite(selectedPost.id) ? 'Removed from favorites' : 'Added to favorites');
                        }}
                        data-testid="favorite-btn"
                      >
                        <Heart className={`w-4 h-4 ${isFavorite(selectedPost.id) ? 'fill-red-500' : ''}`} />
                      </Button>
                      <Button
                        variant="outline"
                        className="py-5 rounded-full"
                        onClick={() => handleSharePost(selectedPost)}
                        data-testid="share-post-btn"
                      >
                        <Share2 className="w-4 h-4" />
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
                        <Flag className="w-4 h-4" />
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

      {/* Share Dialog - auto-close after 3s on action */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Share this item</DialogTitle>
            <DialogDescription className="text-center">
              {sharePost?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button
              onClick={() => shareToWhatsApp(sharePost)}
              className="share-btn whatsapp flex-col py-4"
              data-testid="share-whatsapp"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
            <button
              onClick={() => shareToMessenger(sharePost)}
              className="share-btn messenger flex-col py-4"
              data-testid="share-messenger"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
              </svg>
              Messenger
            </button>
            <button
              onClick={() => shareToFacebookGroups(sharePost)}
              className="share-btn facebook flex-col py-4"
              data-testid="share-fb-groups"
            >
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-4h2v4zm0-6h-2V9h2v2zm4 6h-2v-2h2v2zm0-4h-2v-2h2v2z"/>
              </svg>
              Community
            </button>
            <button
              onClick={() => shareToGumtree(sharePost)}
              className="share-btn gumtree flex-col py-4"
              data-testid="share-gumtree"
            >
              <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              Gumtree
            </button>
            <button
              onClick={() => copyShareLink(sharePost)}
              className="share-btn copy flex-col py-4 col-span-2"
              data-testid="share-copy-link"
            >
              <Copy className="w-6 h-6 mb-1" />
              Copy Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Popup - First Visit */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-600 to-lime-500 rounded-3xl flex items-center justify-center mb-4">
              <RefreshCw className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              G'day mate! 👋
            </h2>
            <p className="text-slate-600 mb-6">
              Welcome to Ucycle - where you can help a mate find your unwanted stuff!
            </p>
            
            <div className="text-left space-y-3 mb-6 p-4 bg-slate-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-slate-700"><strong>Snap it</strong> - Take a quick photo of your item</p>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-slate-700"><strong>Drop it</strong> - Set your approximate location</p>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <p className="text-sm text-slate-700"><strong>Done!</strong> - Someone nearby will grab it</p>
              </div>
            </div>
            
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <p className="text-xs text-amber-800">
                🚨 <strong>Safety first:</strong> Public pickup only. Never enter private property.
              </p>
            </div>
            
            <Button 
              className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-bold py-5 rounded-full shadow-lg text-lg"
              onClick={dismissWelcome}
              data-testid="welcome-start-btn"
            >
              Let's go! 🚀
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Norman Scrap Yard Ad - Western Sydney Only */}
      <Dialog open={showScrapYardAd} onOpenChange={setShowScrapYardAd}>
        <DialogContent className="max-w-sm text-center">
          <div className="pt-4">
            <img 
              src={NORMAN_SCRAP_YARD.logo} 
              alt="Norman's Scrap Metal"
              className="w-24 h-24 mx-auto rounded-2xl object-cover mb-4 shadow-md"
              data-testid="norman-scrapyard-logo"
            />
            <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Got scrap metal? 🔧
            </h2>
            <p className="text-slate-600 mb-4">
              {NORMAN_SCRAP_YARD.name} in Penrith is a local legend for recycling!
            </p>
            
            <div className="p-4 bg-slate-50 rounded-xl mb-6 text-left">
              <p className="font-semibold text-slate-900">{NORMAN_SCRAP_YARD.name}</p>
              <p className="text-sm text-slate-600">{NORMAN_SCRAP_YARD.address}</p>
              <p className="text-xs text-slate-500 mt-2">
                ♻️ Cash for scrap • Batteries • E-waste • Copper
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="py-4 rounded-full"
                onClick={() => setShowScrapYardAd(false)}
                data-testid="scrapyard-skip-btn"
              >
                Not now
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full"
                onClick={() => {
                  window.open(NORMAN_SCRAP_YARD.mapsUrl, '_blank');
                  setShowScrapYardAd(false);
                }}
                data-testid="scrapyard-maps-btn"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Get directions
              </Button>
            </div>
            
            <p className="text-xs text-slate-400 mt-4">
              Local partner • Western Sydney
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster position="top-center" duration={3000} />
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
        <Toaster position="top-center" duration={3000} />
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

      <Toaster position="top-center" duration={3000} />
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
  
  // Favorites state (local storage)
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

  const shareToMessenger = () => {
    const messengerUrl = `fb-messenger://share?link=${encodeURIComponent(shareUrl)}`;
    const webMessengerUrl = `https://www.facebook.com/dialog/send?link=${encodeURIComponent(shareUrl)}&redirect_uri=${encodeURIComponent(window.location.origin)}&app_id=966242223397117`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = messengerUrl;
      setTimeout(() => {
        window.open(webMessengerUrl, '_blank', 'width=600,height=400');
      }, 1500);
    } else {
      window.open(webMessengerUrl, '_blank', 'width=600,height=400');
    }
    setShowShareDialog(false);
  };

  const shareToFacebookGroups = () => {
    // Direct link to Ucycle Facebook community group
    const groupUrl = 'https://www.facebook.com/groups/1JeLHV4p3n';
    window.open(groupUrl, '_blank');
    // Copy link to clipboard for easy pasting
    navigator.clipboard.writeText(`Free item: ${post.title} 🎁\n\n${shareUrl}`).then(() => {
      toast.success("Link copied! Paste it in the group");
    }).catch(() => {
      toast.success("Share in the Ucycle community!");
    });
    setShowShareDialog(false);
  };

  const shareToGumtree = () => {
    window.open('https://www.gumtree.com.au/p-post-ad.html', '_blank');
    toast.success("Post your item on Gumtree too!");
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
        <Toaster position="top-center" duration={3000} />
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
      <div className="pb-24">
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

        <div className="p-4 pb-8 space-y-4">
          <div>
            <h1 className="font-bold text-2xl text-slate-900" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {post.title}
            </h1>
            <p className="text-slate-600 mt-2">{post.description}</p>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-500">
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
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  className={`py-5 rounded-full ${isFavorited ? 'bg-red-50 border-red-200 text-red-600' : ''}`}
                  onClick={toggleFavorite} 
                  data-testid="favorite-btn"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500' : ''}`} />
                </Button>
                <Button variant="outline" className="py-5 rounded-full" onClick={() => setShowShareDialog(true)} data-testid="share-btn">
                  <Share2 className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="py-5 rounded-full" onClick={() => setShowReportDialog(true)} data-testid="report-btn">
                  <Flag className="w-4 h-4" />
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

      {/* Share Dialog - centered 2x2 grid */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center">Share this item</DialogTitle>
            <DialogDescription className="text-center">{post?.title}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            <button onClick={shareToWhatsApp} className="share-btn whatsapp flex-col py-4" data-testid="share-whatsapp">
              <svg className="w-6 h-6 mb-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
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
            <button onClick={shareToGumtree} className="share-btn gumtree flex-col py-4" data-testid="share-gumtree">
              <svg className="w-6 h-6 mb-1" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              Gumtree
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

      <Toaster position="top-center" duration={3000} />
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
