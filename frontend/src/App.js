import React, { useState, useEffect, useCallback, useRef, useMemo, lazy, Suspense, memo } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from "leaflet";
import axios from "axios";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
// Extracted dialog components for cleaner App.js
import { ReportDialog, ShareDialog, WelcomeDialog, AddToHomeScreenModal, ScrapYardAdModal } from "./components/dialogs/Dialogs";
// Extracted menu drawer component
import { MenuDrawer } from "./components/layout/MenuDrawer";
// Extracted modals
import { QuickGuideModal, CameraTroubleshootTooltip, FullscreenImageViewer, InstallPromptBanner } from "./components/modals/Modals";
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
  Heart,
  Building,
  Edit,
  Package,
  Handshake,
  Download,
  FileDown,
  Smartphone,
  Settings,
  HelpCircle,
  ChevronDown,
  TrendingUp,
  Mail,
  MapPinned,
  Phone,
  Timer
} from "lucide-react";
import "leaflet/dist/leaflet.css";
import "@/index.css";

// Import shared utilities and constants
import { BACKEND_URL, API, CATEGORIES, REPORT_REASONS, STORAGE_KEYS } from './utils/constants';
import { createPinIcon, locationIcon, calculateDistance, formatDistance as formatDistanceUtil, formatAddress } from './utils/mapUtils';
import { logInteraction } from './utils/interactions';

// Helper function using imported utility
const formatDistance = (post) => {
  if (post.distance === undefined) return null;
  return formatDistanceUtil(post.distance);
};

// Import extracted map components
import { LocationPicker } from './components/map/LocationPicker';
import { UserLocationMarker } from './components/map/UserLocationMarker';
import { MapCenterUpdater, MapRefSetter } from './components/map/MapHelpers';

// Import extracted post components
import { CategoryBadge, StatusBadge } from './components/post/PostCard';

// Performance: Memoized marker component to prevent re-renders
// Now supports status-based pin colors: green (active), yellow (pending)
const MemoizedMarker = memo(({ post, onClick }) => (
  <Marker
    position={[post.latitude, post.longitude]}
    icon={createPinIcon(post.image_base64, post.status)}
    eventHandlers={{ click: () => onClick(post) }}
  />
));
MemoizedMarker.displayName = 'MemoizedMarker';

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
  const [currentImageIndex, setCurrentImageIndex] = useState(0);  // Image gallery index
  const touchStartX = useRef(0);  // For swipe gesture tracking
  const touchStartY = useRef(0);  // For swipe down gesture
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef(null);
  const locationWatchId = useRef(null);  // For live GPS tracking
  
  // Camera permission state - check on load
  const [cameraPermissionState, setCameraPermissionState] = useState('prompt');  // 'granted', 'denied', 'prompt'
  
  // Fullscreen image viewer state
  const [showFullscreenImage, setShowFullscreenImage] = useState(false);
  const [fullscreenImages, setFullscreenImages] = useState([]);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [fullscreenSwipeY, setFullscreenSwipeY] = useState(0);
  
  // PWA Install & Update state
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [swRegistration, setSwRegistration] = useState(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef(null);
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [radiusKm, setRadiusKm] = useState(105); // Default 105km radius for geo-filtering
  const [showRadiusSlider, setShowRadiusSlider] = useState(false);
  const [filterBarVisible, setFilterBarVisible] = useState(true); // Auto-fade filter bar
  const filterBarTimeoutRef = useRef(null);
  
  // Camera state
  const [showCameraView, setShowCameraView] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Welcome & Scrap Yard state
  const [showWelcome, setShowWelcome] = useState(false);
  const [showScrapYardAd, setShowScrapYardAd] = useState(false);
  const [showScrapPrices, setShowScrapPrices] = useState(false); // Scrap prices modal
  const [showCategoryFilter, setShowCategoryFilter] = useState(false); // Collapsible category filter
  const [showAddToHomeScreen, setShowAddToHomeScreen] = useState(false); // iOS Add to Home Screen prompt
  const [isStandalone, setIsStandalone] = useState(false); // PWA standalone mode detection
  const [isIOS, setIsIOS] = useState(false); // iOS device detection
  
  // Menu & Guide modals
  const [showQuickGuide, setShowQuickGuide] = useState(false); // Quick Guide swipe modal
  const [showCameraTroubleshoot, setShowCameraTroubleshoot] = useState(false); // Camera troubleshoot tooltip
  const [hasSeenCameraTip, setHasSeenCameraTip] = useState(() => {
    return localStorage.getItem('ucycle_camera_tip_seen') === 'true';
  });
  
  // Notification state
  const [notification, setNotification] = useState(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const [myPostIds, setMyPostIds] = useState(() => {
    const saved = localStorage.getItem('ucycle_my_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [lastSeenPostIds, setLastSeenPostIds] = useState(() => {
    const saved = localStorage.getItem('ucycle_seen_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [nearbyNotificationsEnabled, setNearbyNotificationsEnabled] = useState(() => {
    const saved = localStorage.getItem('ucycle_nearby_notifications');
    return saved === null ? true : saved === 'true'; // ON by default
  });
  const notificationSound = useRef(null);
  const lastFetchTime = useRef(Date.now());
  
  // Favorites state
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('ucycle_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // My Claims - track items I've claimed (persisted in localStorage)
  const [myClaims, setMyClaims] = useState(() => {
    const saved = localStorage.getItem('ucycle_my_claims');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Post form state
  const [newPost, setNewPost] = useState({
    image_base64: "",
    title: "",
    category: "general",
    description: "",
    expiry_hours: 48,
    latitude: null,
    longitude: null,
    images: [],  // Additional images beyond the primary one
    address: "",  // Human-readable address from reverse geocoding
    poster_phone: ""  // Optional contact number for pickers
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);  // Progress percentage 0-100
  const [isPosting, setIsPosting] = useState(false);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [isGettingAddress, setIsGettingAddress] = useState(false);  // For address lookup loading
  const [aiAnalysisStep, setAiAnalysisStep] = useState('');  // For showing AI progress steps
  
  // Claiming system state
  const [activeClaim, setActiveClaim] = useState(() => {
    const saved = localStorage.getItem('ucycle_active_claim');
    return saved ? JSON.parse(saved) : null;
  });
  const [claimTimeLeft, setClaimTimeLeft] = useState(0);  // Minutes remaining
  
  // Custom notification state (centered, standardized)
  const [customNotification, setCustomNotification] = useState(null); // { type: 'success' | 'error', message: string }
  
  // Report state
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  
  // File input refs - using native camera
  const fileInputRef = useRef(null);  // Gallery picker
  const cameraInputRef = useRef(null);  // Native camera capture
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

  // Notification functions
  const playNotificationSound = useCallback(() => {
    if (notificationSound.current) {
      notificationSound.current.currentTime = 0;
      notificationSound.current.play().catch(() => {});
    }
  }, []);

  const showNotification = useCallback((message, type = 'info') => {
    setNotification({ message, type });
    setShowNotificationBanner(true);
    playNotificationSound();
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setShowNotificationBanner(false);
      setTimeout(() => setNotification(null), 300);
    }, 5000);
  }, [playNotificationSound]);

  const toggleNearbyNotifications = useCallback(() => {
    setNearbyNotificationsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('ucycle_nearby_notifications', String(newValue));
      // Only show notification for nearby toggle
      showNotification(newValue ? 'Nearby notifications enabled!' : 'Nearby notifications disabled', 'info');
      return newValue;
    });
  }, [showNotification]);

  // Show standardized centered notification (Success ✅ or Failure ❌)
  const showCenteredNotification = useCallback((type, message = '') => {
    setCustomNotification({ type, message });
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      setCustomNotification(null);
    }, 2500);
  }, []);

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

  // Format distance for display
  const formatDistance = useCallback((post) => {
    if (!userLocation || !post?.latitude) return null;
    const dist = getDistance(
      userLocation[0], userLocation[1],
      post.latitude, post.longitude
    );
    if (dist < 1) {
      return `${Math.round(dist * 1000)}m`;
    }
    return `${dist.toFixed(1)}km`;
  }, [userLocation, getDistance]);

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
  // IMPORTANT: Also show items I've claimed (status = 'pending' and in myClaims)
  const getDisplayPosts = useCallback(() => {
    let result = postsInRadius;
    
    // Also include any pending items that I've claimed
    const myClaimIds = myClaims.map(c => c.post_id);
    result = result.filter(post => 
      post.status === 'active' || 
      (post.status === 'pending' && myClaimIds.includes(post.id))
    );
    
    if (selectedCategory) {
      result = result.filter(post => post.category === selectedCategory);
    }
    if (showFavoritesOnly) {
      result = result.filter(post => favorites.includes(post.id));
    }
    return result;
  }, [postsInRadius, selectedCategory, showFavoritesOnly, favorites, myClaims]);

  // Get unique categories from posts within radius only
  const availableCategories = useMemo(() => {
    const cats = [...new Set(postsInRadius.map(p => p.category))];
    return cats.sort();
  }, [postsInRadius]);

  // Count of favorite posts
  const favoritesCount = useMemo(() => {
    return posts.filter(p => favorites.includes(p.id)).length;
  }, [posts, favorites]);

  // Check if location permission is already granted
  const checkLocationPermission = useCallback(async () => {
    if (!navigator.permissions) return 'prompt'; // Fallback for older browsers
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (e) {
      return 'prompt';
    }
  }, []);

  // MODULE 1: LIVE LOCATION TRACKING with watchPosition
  // Updates every 5 seconds for real-time distance tracking
  const startLiveLocationTracking = useCallback(async () => {
    if (!navigator.geolocation) return;
    
    // Clear any existing watch
    if (locationWatchId.current) {
      navigator.geolocation.clearWatch(locationWatchId.current);
    }
    
    const permissionStatus = await checkLocationPermission();
    if (permissionStatus === 'denied') return;
    
    // Start watching position with high accuracy
    locationWatchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const newLoc = [position.coords.latitude, position.coords.longitude];
        setUserLocation(newLoc);
        setIsLocating(false);
      },
      (error) => {
        console.log("Live location error:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000  // Update every 5 seconds max
      }
    );
  }, [checkLocationPermission]);

  // Stop live tracking (cleanup)
  const stopLiveLocationTracking = useCallback(() => {
    if (locationWatchId.current) {
      navigator.geolocation.clearWatch(locationWatchId.current);
      locationWatchId.current = null;
    }
  }, []);

  // Request user location (one-time, for initial centering)
  const requestLocation = useCallback(async (showToast = true) => {
    setIsLocating(true);
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      if (showToast) toast.error("Geolocation not supported");
      return;
    }

    // Check permission status first
    const permissionStatus = await checkLocationPermission();
    
    // If denied, don't even try (avoid repeated prompts)
    if (permissionStatus === 'denied') {
      setIsLocating(false);
      setLocationError("Location permission denied");
      if (showToast) toast.error("Location permission denied. Please enable in browser settings.");
      setMapCenter([51.505, -0.09]);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = [position.coords.latitude, position.coords.longitude];
        setUserLocation(loc);
        setMapCenter(loc);
        setIsLocating(false);
        // Only show toast if explicitly requested and permission was just granted
        if (showToast && permissionStatus === 'prompt') {
          toast.success("Location found!");
        }
        
        // Fly to location if map is ready - zoom level 19 for close street view (~100m radius)
        if (mapRef.current) {
          mapRef.current.flyTo(loc, 19, { duration: 1.5 });
        }
        
        // Start live tracking after initial location is obtained
        startLiveLocationTracking();
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
        if (showToast) toast.error(errorMsg);
        // Keep default location
        setMapCenter([51.505, -0.09]);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, [checkLocationPermission, startLiveLocationTracking]);

  // Filter posts by radius from user location
  const filterPostsByRadius = useCallback((allPosts, location, radius) => {
    if (!location) return allPosts; // Show all if no location
    return allPosts.filter(post => {
      const distance = getDistance(location[0], location[1], post.latitude, post.longitude);
      return distance <= radius;
    });
  }, [getDistance]);

  // Fetch posts
  const fetchPosts = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/posts`);
      setPosts(response.data);
      // Apply geo-filter immediately if we have user location
      if (userLocation) {
        const filtered = filterPostsByRadius(response.data, userLocation, radiusKm);
        setFilteredPosts(filtered);
      } else {
        setFilteredPosts(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  }, [userLocation, radiusKm, filterPostsByRadius]);

  // Re-filter posts when radius or user location changes
  useEffect(() => {
    if (posts.length > 0 && userLocation) {
      const filtered = filterPostsByRadius(posts, userLocation, radiusKm);
      setFilteredPosts(filtered);
    }
  }, [userLocation, radiusKm, posts, filterPostsByRadius]);

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

  // Get user location on mount (silent - no toast unless first time)
  useEffect(() => {
    requestLocation(false); // Silent mode - no toast on initial load
    
    // Cleanup live tracking on unmount
    return () => {
      stopLiveLocationTracking();
    };
  }, [requestLocation, stopLiveLocationTracking]);

  // Initial fetch
  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Polling for new nearby posts and collected items (every 30 seconds)
  useEffect(() => {
    if (!nearbyNotificationsEnabled) return;
    
    const checkForUpdates = async () => {
      try {
        const response = await axios.get(`${API}/posts`);
        const currentPosts = response.data;
        
        // Check for new nearby posts (within 10km)
        if (userLocation) {
          const nearbyRadius = 10; // 10km
          currentPosts.forEach(post => {
            // Skip if we've already seen this post
            if (lastSeenPostIds.includes(post.id)) return;
            // Skip if this is user's own post
            if (myPostIds.includes(post.id)) return;
            
            const distance = getDistance(
              userLocation[0], userLocation[1],
              post.latitude, post.longitude
            );
            
            if (distance <= nearbyRadius && post.status === 'active') {
              // New nearby item found!
              showNotification(`New item nearby: ${post.title}`, 'nearby');
              
              // Mark as seen
              setLastSeenPostIds(prev => {
                const updated = [...prev, post.id];
                localStorage.setItem('ucycle_seen_posts', JSON.stringify(updated));
                return updated;
              });
            }
          });
        }
        
        // Check if any of user's own posts were collected
        myPostIds.forEach(myPostId => {
          const myPost = currentPosts.find(p => p.id === myPostId);
          if (myPost && myPost.status === 'collected') {
            // User's item was collected!
            showNotification(`You helped a mate! Your "${myPost.title}" was collected 🎉`, 'collected');
            
            // Remove from my posts list (so we don't notify again)
            setMyPostIds(prev => {
              const updated = prev.filter(id => id !== myPostId);
              localStorage.setItem('ucycle_my_posts', JSON.stringify(updated));
              return updated;
            });
          }
        });
        
        // Update posts state
        setPosts(currentPosts);
        setFilteredPosts(currentPosts);
        
      } catch (error) {
        console.error('Failed to check for updates:', error);
      }
    };
    
    // Check every 30 seconds
    const interval = setInterval(checkForUpdates, 30000);
    
    return () => clearInterval(interval);
  }, [userLocation, myPostIds, lastSeenPostIds, nearbyNotificationsEnabled, getDistance, showNotification]);

  // Mark initial posts as "seen" on first load
  useEffect(() => {
    if (posts.length > 0 && lastSeenPostIds.length === 0) {
      const currentIds = posts.map(p => p.id);
      setLastSeenPostIds(currentIds);
      localStorage.setItem('ucycle_seen_posts', JSON.stringify(currentIds));
    }
  }, [posts, lastSeenPostIds.length]);

  // Show welcome popup on first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('ucycle_welcome_seen');
    if (!hasSeenWelcome) {
      setTimeout(() => setShowWelcome(true), 1000);
    }
  }, []);

  // Detect standalone mode (PWA installed), iOS device, and handle ?action=camera shortcut
  useEffect(() => {
    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone === true
                    || document.referrer.includes('android-app://');
    setIsStandalone(standalone);
    
    // Detect iOS device
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);
    
    // Handle ?action=camera shortcut from PWA
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('action') === 'camera') {
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
      // Open camera after a brief delay for app to initialize
      setTimeout(() => {
        openCamera();
      }, 500);
    }
  }, []);

  // PWA Install Prompt listener
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show install prompt after 30 seconds if not already installed
      const hasDeclined = localStorage.getItem('ucycle_install_declined');
      if (!hasDeclined) {
        setTimeout(() => setShowInstallPrompt(true), 30000);
      }
    };
    
    const handleSwUpdate = (e) => {
      setSwRegistration(e.detail);
      setShowUpdateBanner(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('swUpdate', handleSwUpdate);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('swUpdate', handleSwUpdate);
    };
  }, []);

  // Handle PWA install
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success("Ucycle installed! 🎉");
    }
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const dismissInstallPrompt = () => {
    localStorage.setItem('ucycle_install_declined', 'true');
    setShowInstallPrompt(false);
  };

  // Handle app update
  const handleUpdateClick = () => {
    if (swRegistration && swRegistration.waiting) {
      swRegistration.waiting.postMessage('skipWaiting');
      window.location.reload();
    }
    setShowUpdateBanner(false);
  };

  const dismissWelcome = () => {
    localStorage.setItem('ucycle_welcome_seen', 'true');
    setShowWelcome(false);
    
    // Check if NOT in standalone mode (PWA not installed)
    // Show "Add to Home Screen" prompt for iOS users
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
                    || window.navigator.standalone === true;
    
    if (!standalone) {
      // Detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      const hasSeenAddToHome = localStorage.getItem('ucycle_add_to_home_seen');
      
      if (isIOS && !hasSeenAddToHome) {
        // Show Add to Home Screen prompt after a brief delay
        setTimeout(() => setShowAddToHomeScreen(true), 500);
      }
    }
  };

  const dismissAddToHomeScreen = () => {
    localStorage.setItem('ucycle_add_to_home_seen', 'true');
    setShowAddToHomeScreen(false);
  };

  // Auto-fade filter bar after 1.2 seconds - reappears on tap
  useEffect(() => {
    if (filterBarVisible && !showRadiusSlider && !showCategoryFilter) {
      filterBarTimeoutRef.current = setTimeout(() => {
        setFilterBarVisible(false);
      }, 1200);
    }
    return () => {
      if (filterBarTimeoutRef.current) {
        clearTimeout(filterBarTimeoutRef.current);
      }
    };
  }, [filterBarVisible, showRadiusSlider, showCategoryFilter]);

  // Show filter bar when radius or category changes, or when tapped
  const showFilterBar = useCallback(() => {
    setFilterBarVisible(true);
  }, []);

  // Auto-dismiss welcome popup after 10 seconds
  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => {
        dismissWelcome();
      }, 10000); // 10 seconds
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // Check if user is in Sydney Metropolitan Region (~300km from Penrith/St Marys)
  // This is used to show/hide regional partners like Norman Scrap Yard
  const isInSydneyMetro = useCallback(() => {
    if (!userLocation) return false;
    // Penrith/St Marys area coordinates (center of Western Sydney)
    const penrithLat = -33.7507;
    const penrithLng = 150.6944;
    const distance = getDistance(userLocation[0], userLocation[1], penrithLat, penrithLng);
    return distance <= 300; // Within 300km of Sydney Metro (covers greater Sydney region)
  }, [userLocation, getDistance]);

  // Check if user is in Western Sydney area (closer proximity for partner ads)
  const isInWesternSydney = useCallback(() => {
    if (!userLocation) return false;
    const penrithLat = -33.7507;
    const penrithLng = 150.6944;
    const distance = getDistance(userLocation[0], userLocation[1], penrithLat, penrithLng);
    return distance <= 50; // Within 50km of Penrith for targeted ads
  }, [userLocation, getDistance]);

  // Partner Configuration - Expandable for future regional partners
  const PARTNERS = {
    sydney_metro: {
      norman_scrap_yard: {
        name: "Norman's Scrap Metal",
        address: "34 Peachtree Rd, Penrith NSW 2750",
        phone: "Contact via Google Maps",
        mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=34+Peachtree+Rd,+Penrith+NSW+2750",
        logo: "https://customer-assets.emergentagent.com/job_43339dc9-f006-41e6-8de9-36afdf0eb8cc/artifacts/tuki91fg_IMG_4869.png",
        acceptedItems: [
          "Scrap Metal",
          "White Goods (Fridges, Washing Machines, Dryers, Microwaves)",
          "Car Batteries",
          "Aluminium",
          "Copper",
          "Brass",
          "Steel"
        ],
        region: "Sydney Metropolitan"
      }
    }
    // Future: newcastle_region, interstate_partners, etc.
  };

  // Legacy reference for backward compatibility
  const NORMAN_SCRAP_YARD = PARTNERS.sydney_metro.norman_scrap_yard;

  // Scrap Metal Prices (NSW)
  const SCRAP_PRICES = [
    { material: "Copper (Bright/Clean)", price: "$10.50 - $12.00 / kg" },
    { material: "Copper (Mixed/Burnt)", price: "$9.00 - $10.00 / kg" },
    { material: "Brass (Mixed)", price: "$6.00 - $6.50 / kg" },
    { material: "Insulated Copper Wire (40%)", price: "$2.50 - $3.50 / kg" },
    { material: "Aluminium (Clean Extrusion)", price: "$2.00 - $2.50 / kg" },
    { material: "Aluminium Cans", price: "$1.20 - $1.50 / kg" },
    { material: "Stainless Steel", price: "$1.20 - $1.60 / kg" },
    { material: "White Goods", price: "$0.25 - $0.45 / kg" }
  ];

  // ============ CAMERA FUNCTIONS ============
  
  // Camera zoom state
  const [cameraZoom, setCameraZoom] = useState(1);
  const [maxZoom, setMaxZoom] = useState(5);
  const lastTouchDistance = useRef(0);
  
  // Check camera permission status
  const checkCameraPermission = useCallback(async () => {
    if (!navigator.permissions) return 'prompt';
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      setCameraPermissionState(result.state);
      return result.state;
    } catch (e) {
      return 'prompt'; // Some browsers don't support camera permission query
    }
  }, []);

  // Open NATIVE device camera app
  const openCamera = () => {
    // Show camera troubleshoot tip (one-time) for iOS users
    if (isIOS && !hasSeenCameraTip) {
      setShowCameraTroubleshoot(true);
      // Auto-dismiss after 6 seconds
      setTimeout(() => setShowCameraTroubleshoot(false), 6000);
    }
    
    // Trigger the native camera input - opens device's camera app
    cameraInputRef.current?.click();
  };
  
  // Handle native camera capture result
  const handleNativeCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Hide camera tip when photo is taken
    setShowCameraTroubleshoot(false);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      await processImage(base64);
    };
    reader.readAsDataURL(file);
    
    // Clear the input so same file can be selected again
    e.target.value = '';
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

  // MODULE 2: Check camera permission on app load
  useEffect(() => {
    const checkCameraOnLoad = async () => {
      if (!navigator.permissions) return;
      try {
        const result = await navigator.permissions.query({ name: 'camera' });
        setCameraPermissionState(result.state);
      } catch (e) {
        // Some browsers don't support camera permission query
      }
    };
    checkCameraOnLoad();
  }, []);

  // Reverse geocode coordinates to human-readable address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const addr = response.data?.address;
      if (addr) {
        // Build a short, readable address like "12 High St, St Marys"
        const parts = [];
        if (addr.house_number) parts.push(addr.house_number);
        if (addr.road) parts.push(addr.road);
        const suburb = addr.suburb || addr.town || addr.city || addr.village || '';
        if (suburb) parts.push(suburb);
        return parts.length > 0 ? parts.join(', ') : response.data.display_name?.split(',').slice(0, 2).join(',');
      }
      return null;
    } catch (e) {
      console.log("Reverse geocode failed:", e);
      return null;
    }
  };

  // Process image (shared between camera capture and file upload)
  // MODULE 3: OPTIMISTIC 2-SPEED WORKFLOW
  // - Instant image display
  // - Background AI analysis (high quality, non-blocking)
  // - User can type immediately or wait for AI
  // - Progress indicator with percentage
  const processImage = async (base64) => {
    // INSTANT: Show the post drawer with image immediately
    setNewPost(prev => ({ 
      ...prev, 
      image_base64: base64,
      latitude: userLocation ? userLocation[0] : null,
      longitude: userLocation ? userLocation[1] : null,
      address: "",
      title: "",
      description: ""
    }));
    setShowPostDrawer(true);
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAiAnalysisStep('Uploading...');
    
    // ========== PARALLEL: GPS + AI Analysis ==========
    
    // TASK 1: Instant GPS Stamp with Address (non-blocking)
    (async () => {
      if (!navigator.geolocation) {
        if (userLocation) {
          const addr = await reverseGeocode(userLocation[0], userLocation[1]);
          if (addr) setNewPost(prev => ({ ...prev, address: addr }));
        }
        return;
      }
      
      const permissionStatus = await checkLocationPermission();
      if (permissionStatus === 'denied' && userLocation) {
        const addr = await reverseGeocode(userLocation[0], userLocation[1]);
        if (addr) setNewPost(prev => ({ ...prev, address: addr }));
        return;
      }
      
      setIsGettingAddress(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const freshLat = position.coords.latitude;
          const freshLng = position.coords.longitude;
          
          setNewPost(prev => ({
            ...prev,
            latitude: freshLat,
            longitude: freshLng
          }));
          setUserLocation([freshLat, freshLng]);
          
          const address = await reverseGeocode(freshLat, freshLng);
          if (address) {
            setNewPost(prev => ({ ...prev, address: address }));
          }
          setIsGettingAddress(false);
        },
        (error) => {
          console.log("GPS failed:", error);
          setIsGettingAddress(false);
          if (userLocation) {
            setNewPost(prev => ({
              ...prev,
              latitude: userLocation[0],
              longitude: userLocation[1]
            }));
            reverseGeocode(userLocation[0], userLocation[1]).then(addr => {
              if (addr) setNewPost(prev => ({ ...prev, address: addr }));
            });
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    })();
    
    // TASK 2: AI Analysis with progress percentage (background, non-blocking)
    (async () => {
      try {
        const base64Data = base64.split(',')[1] || base64;
        
        // Progress simulation with real API call
        setAnalysisProgress(10);
        setAiAnalysisStep('Uploading...');
        await new Promise(r => setTimeout(r, 300));
        
        setAnalysisProgress(30);
        setAiAnalysisStep('Scanning...');
        await new Promise(r => setTimeout(r, 300));
        
        setAnalysisProgress(50);
        setAiAnalysisStep('Identifying...');
        
        const response = await axios.post(`${API}/analyze-image-fast`, {
          image_base64: base64Data
        }, { timeout: 20000 });
        
        setAnalysisProgress(90);
        setAiAnalysisStep('Finishing...');
        await new Promise(r => setTimeout(r, 200));
        
        setAnalysisProgress(100);
        setAiAnalysisStep('Complete!');
        await new Promise(r => setTimeout(r, 300));
        
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAiAnalysisStep('');
        
        // Only update title/category if user hasn't typed anything yet
        setNewPost(prev => ({
          ...prev,
          title: prev.title || response.data.title,
          category: prev.category === 'general' ? response.data.category : prev.category
        }));
        
      } catch (error) {
        console.error("AI analysis failed:", error);
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setAiAnalysisStep('');
        // No error notification - user can fill manually
      }
    })();
  };

  // Handle album/gallery selection
  const openGallery = () => {
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

  // Handle additional images selection
  const handleAdditionalImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    // Limit to 4 additional images (5 total including primary)
    const maxAdditional = 4 - newPost.images.length;
    const filesToProcess = files.slice(0, maxAdditional);
    
    if (files.length > maxAdditional) {
      toast.info(`Only ${maxAdditional} more images allowed (max 5 total)`);
    }
    
    // Compress each image
    const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      });
    };
    
    try {
      const compressedImages = await Promise.all(
        filesToProcess.map(file => compressImage(file))
      );
      
      setNewPost(prev => ({
        ...prev,
        images: [...prev.images, ...compressedImages]
      }));
      
      toast.success(`Added ${compressedImages.length} image(s)`);
    } catch (error) {
      console.error("Failed to process images:", error);
      toast.error("Could not process images");
    }
  };

  // Remove additional image
  const removeAdditionalImage = (index) => {
    setNewPost(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
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
      
      // Process additional images (strip data URL prefix if present)
      const additionalImages = newPost.images.map(img => 
        img.includes(',') ? img.split(',')[1] : img
      );
      
      // Post with minimal data (description is optional now)
      const response = await axios.post(`${API}/posts`, {
        ...newPost,
        image_base64: base64Data,
        images: additionalImages.length > 0 ? additionalImages : null,
        description: newPost.description || ""  // Can be empty, will be filled in background
      });
      
      // Track user's own post ID for "You helped a mate!" notification
      const newPostId = response.data?.id;
      if (newPostId) {
        const updatedMyPosts = [...myPostIds, newPostId];
        setMyPostIds(updatedMyPosts);
        localStorage.setItem('ucycle_my_posts', JSON.stringify(updatedMyPosts));
        
        // BACKGROUND: Trigger description generation (The Marathon)
        // This runs silently - no need to wait for it
        axios.post(`${API}/posts/${newPostId}/generate-description`)
          .then(() => {
            console.log("Background description generated for post:", newPostId);
            // Refresh posts to show the new description
            setTimeout(() => fetchPosts(), 2000);  // Small delay to let DB update
          })
          .catch(err => console.log("Background description error:", err));
      }
      
      // Show standardized success notification
      showCenteredNotification('success', 'Post created');
      setShowPostDrawer(false);
      setNewPost({
        image_base64: "",
        title: "",
        category: "general",
        description: "",
        expiry_hours: 48,
        latitude: null,
        longitude: null,
        images: [],
        address: "",
        poster_phone: ""
      });
      fetchPosts();
    } catch (error) {
      console.error("Failed to post:", error);
      // Show standardized error notification
      showCenteredNotification('error', 'Failed – try again');
    } finally {
      setIsPosting(false);
    }
  };

  // Mark as collected
  const handleMarkCollected = async (postId) => {
    try {
      // Use /complete endpoint which handles both collected status AND claim clearing
      await axios.post(`${API}/posts/${postId}/complete`);
      
      // Clear active claim if this was our claimed item
      if (activeClaim?.post_id === postId) {
        localStorage.removeItem('ucycle_active_claim');
        setActiveClaim(null);
        setClaimTimeLeft(0);
        
        // Remove from my claims
        const newMyClaims = myClaims.filter(c => c.post_id !== postId);
        setMyClaims(newMyClaims);
        localStorage.setItem('ucycle_my_claims', JSON.stringify(newMyClaims));
      }
      
      // Remove post from display
      setPosts(prev => prev.filter(p => p.id !== postId));
      
      showCenteredNotification('success', 'Pickup complete! 🎉');
      setShowDetailDrawer(false);
      setSelectedPost(null);
      
      // Show Norman Scrap Yard ad if user is in Western Sydney
      if (isInWesternSydney()) {
        setTimeout(() => {
          setShowScrapYardAd(true);
          setTimeout(() => setShowScrapYardAd(false), 5000);
        }, 500);
      }
    } catch (error) {
      console.error("Failed to complete pickup:", error);
      const errorMsg = error.response?.data?.detail || 'Network error – try again';
      showCenteredNotification('error', errorMsg);
    }
  };

  // Share post - native share API
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePost, setSharePost] = useState(null);
  
  const handleNativeShare = async (post) => {
    // Use post-meta URL for social sharing (has proper OG tags for image previews)
    const shareUrl = `${BACKEND_URL}/api/post-meta/${post.id}`;
    const shareTitle = `Check out this ${post.title} on Ucycle`;
    const shareText = `Free pickup available! Grab it before it's gone!`;
    
    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        // No notification for share success - just close silently
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.log("Native share failed, showing dialog");
        }
      }
    }
    
    // Fallback to share dialog
    setSharePost(post);
    setShowShareDialog(true);
  };

  // ============ FULLSCREEN IMAGE VIEWER ============
  
  const openFullscreenImage = (images, startIndex = 0) => {
    const imageArray = images?.length > 0 ? images : [];
    if (imageArray.length === 0) return;
    setFullscreenImages(imageArray);
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
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchStartY.current;
    // Only allow downward swipe
    if (diffY > 0) {
      setFullscreenSwipeY(diffY);
    }
  };

  const handleFullscreenTouchEnd = (e) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchEndY - touchStartY.current;
    
    // Swipe down to close (threshold 100px)
    if (diffY > 100 && Math.abs(diffX) < 50) {
      closeFullscreenImage();
      return;
    }
    
    // Reset swipe position if not closing
    setFullscreenSwipeY(0);
    
    // Horizontal swipe for navigation (threshold 50px)
    if (Math.abs(diffX) > 50 && fullscreenImages.length > 1) {
      if (diffX > 0) {
        // Swipe left - next image
        setFullscreenIndex(i => i < fullscreenImages.length - 1 ? i + 1 : 0);
      } else {
        // Swipe right - previous image
        setFullscreenIndex(i => i > 0 ? i - 1 : fullscreenImages.length - 1);
      }
    }
  };

  // Swipe gesture handlers for image gallery
  const handleGalleryTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleGalleryTouchEnd = (e, imagesCount) => {
    if (imagesCount <= 1) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe left - next image
        setCurrentImageIndex(i => i < imagesCount - 1 ? i + 1 : 0);
      } else {
        // Swipe right - previous image
        setCurrentImageIndex(i => i > 0 ? i - 1 : imagesCount - 1);
      }
    }
  };

  const handleSharePost = (post) => {
    setSharePost(post);
    setShowShareDialog(true);
  };

  // Use post-meta URL for social sharing (has proper OG tags for previews)
  // This URL auto-redirects human visitors to /post/{id}
  const getShareUrl = (post) => `${BACKEND_URL}/api/post-meta/${post.id}`;

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
    const groupUrl = 'https://www.facebook.com/share/g/17uqbznuSH/?mibextid=wwXIfr';
    window.open(groupUrl, '_blank');
    // Copy link to clipboard silently for easy pasting
    navigator.clipboard.writeText(`Free item: ${post.title} 🎁\n\n${url}`).catch(() => {});
    setShowShareDialog(false);
  };

  const shareToGumtree = (post) => {
    // Gumtree doesn't have a direct share API, so we'll open Gumtree's post page
    window.open('https://www.gumtree.com.au/p-post-ad.html', '_blank');
    setShowShareDialog(false);
  };

  const copyShareLink = async (post) => {
    const url = getShareUrl(post);
    try {
      await navigator.clipboard.writeText(url);
      showCenteredNotification('success', 'Link copied');
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showCenteredNotification('success', 'Link copied');
    }
    setShowShareDialog(false);
  };

  // Submit report
  const handleSubmitReport = async () => {
    if (!reportReason || !selectedPost) return;

    setIsReporting(true);
    
    // OPTIMISTIC UI: Immediately hide the post if "Item is Gone"
    const postIdToHide = selectedPost.id;
    if (reportReason === 'item_gone') {
      // Immediately remove from local state
      setPosts(prev => prev.filter(p => p.id !== postIdToHide));
      setFilteredPosts(prev => prev.filter(p => p.id !== postIdToHide));
      setShowDetailDrawer(false);
      setShowReportDialog(false);
      showCenteredNotification('success', 'Item marked as gone');
    }
    
    try {
      await axios.post(`${API}/reports`, {
        post_id: postIdToHide,
        reason: reportReason,
        details: reportDetails
      });
      
      if (reportReason === 'illegal_dumping') {
        showCenteredNotification('success', 'Reported to council');
        setShowReportDialog(false);
      } else if (reportReason !== 'item_gone') {
        showCenteredNotification('success', 'Report submitted');
        setShowReportDialog(false);
      }
      
      setReportReason("");
      setReportDetails("");
    } catch (error) {
      console.error("Failed to report:", error);
      // If optimistic update failed, restore the post
      if (reportReason === 'item_gone') {
        // Refetch posts to restore
        fetchPosts();
        showCenteredNotification('error', 'Failed – try again');
      } else {
        showCenteredNotification('error', 'Failed – try again');
      }
    } finally {
      setIsReporting(false);
    }
  };

  // Handle claiming an item (30-minute handshake)
  const handleClaimItem = async (post) => {
    try {
      const response = await axios.post(`${API}/claims`, {
        post_id: post.id
      });
      
      if (response.data) {
        const claimData = {
          ...response.data,
          claimed_at: new Date().toISOString()
        };
        
        setActiveClaim(claimData);
        setClaimTimeLeft(response.data.minutes_remaining || 30);
        
        // Save to localStorage so it persists
        localStorage.setItem('ucycle_active_claim', JSON.stringify(claimData));
        
        // Add to my claims list
        const newMyClaims = [...myClaims.filter(c => c.post_id !== post.id), { post_id: post.id, claim_id: response.data.claim_id }];
        setMyClaims(newMyClaims);
        localStorage.setItem('ucycle_my_claims', JSON.stringify(newMyClaims));
        
        // Update the selected post with claim info - KEEP DRAWER OPEN
        setSelectedPost(prev => ({
          ...prev,
          status: 'pending',
          claim_id: response.data.claim_id,
          poster_phone: response.data.poster_phone
        }));
        
        // Also update the post in the posts array so pin turns yellow
        setPosts(prevPosts => prevPosts.map(p => 
          p.id === post.id ? { ...p, status: 'pending', claim_id: response.data.claim_id } : p
        ));
        
        // Log the interaction
        logInteraction(post.id, 'contact_reveal');
        
        showCenteredNotification('success', 'Item claimed! Call to arrange pickup.');
      }
    } catch (error) {
      console.error("Claim failed:", error);
      if (error.response?.status === 409) {
        showCenteredNotification('error', 'Item already claimed');
      } else {
        showCenteredNotification('error', 'Claim failed – try again');
      }
    }
  };

  // Release a claim
  const handleReleaseClaim = async () => {
    if (!activeClaim?.claim_id) return;
    
    try {
      await axios.delete(`${API}/claims/${activeClaim.claim_id}`);
      
      // Clear from localStorage
      localStorage.removeItem('ucycle_active_claim');
      
      // Remove from my claims
      const newMyClaims = myClaims.filter(c => c.claim_id !== activeClaim.claim_id);
      setMyClaims(newMyClaims);
      localStorage.setItem('ucycle_my_claims', JSON.stringify(newMyClaims));
      
      // Update the post in posts array
      setPosts(prevPosts => prevPosts.map(p => 
        p.id === activeClaim.post_id ? { ...p, status: 'active', claim_id: null } : p
      ));
      
      setActiveClaim(null);
      setClaimTimeLeft(0);
      
      // Update the selected post
      setSelectedPost(prev => ({
        ...prev,
        status: 'active',
        claim_id: null,
        poster_phone: null
      }));
      
      showCenteredNotification('success', 'Claim released');
    } catch (error) {
      console.error("Release claim failed:", error);
    }
  };

  // Countdown timer effect for active claims
  useEffect(() => {
    if (!activeClaim) return;
    
    // Calculate remaining time from expires_at
    const expiresAt = new Date(activeClaim.expires_at);
    const now = new Date();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 60000));
    setClaimTimeLeft(remaining);
    
    if (remaining <= 0) {
      // Claim expired
      localStorage.removeItem('ucycle_active_claim');
      setActiveClaim(null);
      return;
    }
    
    const timer = setInterval(() => {
      setClaimTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          localStorage.removeItem('ucycle_active_claim');
          setActiveClaim(null);
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute
    
    return () => clearInterval(timer);
  }, [activeClaim]);

  // View post details
  const handleViewDetails = (post) => {
    setSelectedPost(post);
    setShowDetailDrawer(true);
  };

  return (
    <div className="h-screen w-screen overflow-hidden" data-testid="app-container">
      {/* Centered Notification (Success ✅ / Failure ❌) */}
      {customNotification && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-200">
            {customNotification.type === 'success' ? (
              <div className="text-6xl">✅</div>
            ) : (
              <div className="text-6xl">❌</div>
            )}
            <p className="text-lg font-semibold text-slate-800">
              {customNotification.type === 'success' ? 'Success' : 'Failure – try again'}
            </p>
            {customNotification.message && customNotification.message !== 'Success' && customNotification.message !== 'Failure – try again' && (
              <p className="text-sm text-slate-500">{customNotification.message}</p>
            )}
          </div>
        </div>
      )}
      {/* Header */}
      <header className="glass-header fixed top-0 left-0 right-0 z-20 px-4 py-3">
        {!showSearchBar ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img 
                src="https://static.prod-images.emergentagent.com/jobs/a1807c5d-0c47-4949-991c-6bf277dda598/images/0d901fd15e3e9b94f2129aa3238b6de15be635af96d6229d19a275e9082a2190.png"
                alt="Ucycle"
                className="w-10 h-10 rounded-xl"
              />
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
            {/* High Contrast Search Bar */}
            <div className="flex-1 relative">
              <div className="flex items-center bg-white border-2 border-slate-300 rounded-full shadow-lg overflow-hidden" style={{ minHeight: '48px', backgroundColor: '#ffffff' }}>
                <Search className="ml-4 w-5 h-5 text-slate-400 flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                  placeholder="Search 'Fridge', 'Copper', 'St Marys'..."
                  className="flex-1 px-3 py-3 bg-transparent text-slate-900 placeholder-slate-400 focus:outline-none"
                  data-testid="search-input"
                />
                {searchQuery && !isSearching && (
                  <button
                    onClick={clearSearch}
                    className="p-2 hover:bg-slate-100 rounded-full mr-1"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
                {isSearching && (
                  <Loader2 className="w-5 h-5 text-green-600 animate-spin mr-3" />
                )}
                {/* GO Button */}
                <button
                  onClick={() => handleSearch(searchQuery)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 mr-1 rounded-full font-bold text-sm transition-colors"
                  data-testid="search-go-btn"
                >
                  GO
                </button>
              </div>
            </div>
            <button
              onClick={() => {
                setShowSearchBar(false);
                clearSearch();
              }}
              className="px-2 py-2 text-slate-600 font-medium text-sm"
              data-testid="cancel-search-btn"
            >
              Cancel
            </button>
          </div>
        )}
      </header>

      {/* Quick Search Chips - show when search bar is open */}
      {showSearchBar && !showSearchResults && (
        <div className="fixed top-16 left-0 right-0 z-25 px-4 py-2 bg-white border-b border-slate-200 animate-fade-in">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            {['Fridges', 'Washing Machines', 'Scrap Metal', 'Furniture', 'Electronics'].map(chip => (
              <button
                key={chip}
                onClick={() => {
                  setSearchQuery(chip);
                  handleSearch(chip);
                }}
                className="flex-shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-green-100 text-slate-700 text-sm font-medium rounded-full transition-colors"
                data-testid={`quick-chip-${chip.toLowerCase().replace(' ', '-')}`}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Active Claim Banner - Tap to reopen claimed item */}
      {activeClaim && (
        <button
          onClick={() => {
            // Find the claimed post and open its drawer
            const claimedPost = posts.find(p => p.id === activeClaim.post_id);
            if (claimedPost) {
              setSelectedPost({ ...claimedPost, status: 'pending', poster_phone: activeClaim.poster_phone });
              setShowDetailDrawer(true);
            }
          }}
          className="fixed top-16 left-4 right-4 z-30 bg-yellow-400 text-black rounded-xl shadow-lg p-3 flex items-center justify-between animate-slide-up"
          data-testid="active-claim-banner"
        >
          <div className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            <span className="font-bold text-sm">You have a claimed item</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-700 font-mono font-bold">{claimTimeLeft} min</span>
            <ChevronDown className="w-4 h-4 -rotate-90" />
          </div>
        </button>
      )}

      {/* Map */}
      <div className="map-container">
        <MapContainer 
          center={mapCenter} 
          zoom={14} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          preferCanvas={true}
          tap={true}
          touchZoom={true}
          bounceAtZoomLimits={false}
          inertia={true}
          inertiaDeceleration={3000}
          inertiaMaxSpeed={1500}
          worldCopyJump={false}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            updateWhenZooming={false}
            updateWhenIdle={true}
            keepBuffer={4}
          />
          <MapCenterUpdater center={mapCenter} />
          <MapRefSetter mapRef={mapRef} />
          
          {/* User location marker */}
          <UserLocationMarker position={userLocation} />
          
          {/* Post markers with clustering for performance */}
          <MarkerClusterGroup
            chunkedLoading={true}
            maxClusterRadius={60}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            disableClusteringAtZoom={18}
            animate={true}
            animateAddingMarkers={false}
          >
            {getDisplayPosts().map(post => (
              <MemoizedMarker
                key={post.id}
                post={post}
                onClick={handleViewDetails}
              />
            ))}
          </MarkerClusterGroup>
          
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

      {/* Radius & Category Filters - Floating Pill Bar (auto-fades after 1.2s) */}
      {!showSearchBar && !pickingLocation && !showCameraView && (
        <div 
          className={`fixed top-[68px] left-1/2 -translate-x-1/2 z-20 transition-opacity duration-300 ${filterBarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={showFilterBar}
        >
          {/* Floating pill-shaped bar - slightly larger for easy tapping */}
          <div className="bg-white rounded-full shadow-lg px-3 py-1.5 border border-slate-200 flex items-center gap-2" style={{ backgroundColor: '#ffffff' }}>
            {/* Radius button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowRadiusSlider(!showRadiusSlider); showFilterBar(); }}
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-sm font-bold text-slate-800 hover:bg-slate-200 transition-colors"
              data-testid="radius-toggle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {radiusKm}km
            </button>
            
            {/* Filter button */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowCategoryFilter(!showCategoryFilter); showFilterBar(); }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedCategory || showFavoritesOnly
                  ? 'bg-green-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              data-testid="category-filter-toggle"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
              </svg>
              {selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : showFavoritesOnly ? 'Saved' : 'Filter'}
            </button>
            
            {/* Nearby count */}
            <span className="text-sm font-medium text-slate-600 px-1">
              {postsInRadius.length} nearby
            </span>
          </div>
          
          {/* Expandable panels below the pill */}
          {showRadiusSlider && (
            <div className="mt-1 bg-white rounded-full shadow-lg px-3 py-1 border border-slate-200 flex items-center gap-2 animate-fade-in">
              <span className="text-xs text-slate-500">5</span>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={radiusKm}
                onChange={(e) => {
                  setRadiusKm(parseInt(e.target.value));
                  setTimeout(() => setShowRadiusSlider(false), 2000);
                }}
                className="w-32 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                data-testid="radius-slider"
              />
              <span className="text-xs text-slate-500">200</span>
            </div>
          )}
          
          {showCategoryFilter && postsInRadius.length > 0 && (
            <div className="mt-1 bg-white rounded-xl shadow-lg p-2 border border-slate-200 animate-fade-in max-w-xs">
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => { setSelectedCategory(null); setShowFavoritesOnly(false); setShowCategoryFilter(false); }}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${!selectedCategory && !showFavoritesOnly ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  All
                </button>
                {favoritesCount > 0 && (
                  <button
                    onClick={() => { setShowFavoritesOnly(!showFavoritesOnly); setSelectedCategory(null); setShowCategoryFilter(false); }}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${showFavoritesOnly ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    ♥ Saved
                  </button>
                )}
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSelectedCategory(selectedCategory === cat ? null : cat); setShowFavoritesOnly(false); setShowCategoryFilter(false); }}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedCategory === cat ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                  </button>
                ))}
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

      {/* Tap to show filter bar indicator (when filter bar is hidden) */}
      {!filterBarVisible && !showSearchBar && !pickingLocation && !showCameraView && (
        <button
          onClick={showFilterBar}
          className="fixed top-[68px] left-1/2 -translate-x-1/2 z-20 bg-white/80 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-md border border-slate-200 transition-all hover:bg-white active:scale-95"
          data-testid="show-filter-bar-btn"
        >
          <span className="text-sm font-medium text-slate-600">{postsInRadius.length} nearby</span>
        </button>
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
      
      {/* Hidden input for NATIVE CAMERA - opens device camera app */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={cameraInputRef}
        onChange={handleNativeCameraCapture}
        className="hidden"
        data-testid="native-camera-input"
      />
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera FAB Button - Opens NATIVE camera */}
      {!pickingLocation && (
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

      {/* Menu Drawer - Extracted to separate component */}
      <MenuDrawer
        open={showMenu}
        onOpenChange={setShowMenu}
        isStandalone={isStandalone}
        isIOS={isIOS}
        isInSydneyMetro={isInSydneyMetro()}
        onShowAddToHomeScreen={() => setShowAddToHomeScreen(true)}
        onShowQuickGuide={() => setShowQuickGuide(true)}
        onShowScrapPrices={() => setShowScrapPrices(true)}
        onRefresh={fetchPosts}
        nearbyNotifications={nearbyNotificationsEnabled}
        onToggleNearbyNotifications={toggleNearbyNotifications}
        favoritesCount={favoritesCount}
      />

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
                  className={`w-full ${isAnalyzing ? 'h-48' : 'h-40'} object-cover transition-all duration-300`}
                />
                {/* AI Analysis Progress Overlay with Percentage */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-end pb-6">
                    {/* Animated progress bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-black/30">
                      <div 
                        className="h-full bg-green-400 transition-all duration-300 ease-out"
                        style={{ width: `${analysisProgress}%` }}
                      />
                    </div>
                    
                    {/* Progress indicator with percentage */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        {/* Circular progress background */}
                        <svg className="w-20 h-20 transform -rotate-90">
                          <circle cx="40" cy="40" r="36" stroke="rgba(74, 222, 128, 0.2)" strokeWidth="6" fill="none" />
                          <circle 
                            cx="40" cy="40" r="36" 
                            stroke="#4ade80" 
                            strokeWidth="6" 
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 36}`}
                            strokeDashoffset={`${2 * Math.PI * 36 * (1 - analysisProgress / 100)}`}
                            strokeLinecap="round"
                            className="transition-all duration-300 ease-out"
                          />
                        </svg>
                        {/* Percentage in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-white font-bold text-lg">{analysisProgress}%</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-white font-semibold text-base">{aiAnalysisStep || 'Processing...'}</p>
                        <p className="text-green-400/80 text-xs mt-1">You can start typing below</p>
                      </div>
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
          
          {/* Additional Images Section */}
          {newPost.image_base64 && (
            <div className="px-4 py-2 bg-slate-50 border-t">
              <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                {/* Thumbnails of additional images */}
                {newPost.images.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    <img 
                      src={img} 
                      alt={`Photo ${index + 2}`}
                      className="w-14 h-14 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removeAdditionalImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
                
                {/* Add more button (if less than 4 additional) */}
                {newPost.images.length < 4 && (
                  <button
                    onClick={() => additionalImagesRef.current?.click()}
                    className="w-14 h-14 flex-shrink-0 bg-white border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center hover:border-green-500 transition-colors"
                    data-testid="add-more-photos-btn"
                  >
                    <Plus className="w-5 h-5 text-slate-400" />
                  </button>
                )}
                
                <span className="text-xs text-slate-500 flex-shrink-0 ml-1">
                  {newPost.images.length + 1}/5 photos
                </span>
              </div>
              
              {/* Hidden file input for additional images */}
              <input
                ref={additionalImagesRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleAdditionalImages}
                className="hidden"
              />
            </div>
          )}
          
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
            
            {/* Location - auto-use current if available with human-readable address */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
              <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
              {isGettingAddress ? (
                <span className="text-sm text-slate-500 flex items-center gap-2 flex-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Getting location...
                </span>
              ) : newPost.latitude ? (
                <>
                  <div className="flex-1 min-w-0">
                    {newPost.address ? (
                      <span className="text-sm text-green-700 font-medium truncate block">{newPost.address}</span>
                    ) : (
                      <span className="text-sm text-green-700">Location set ✓</span>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      // Refresh to get fresh GPS location + new address
                      if (navigator.geolocation) {
                        toast.loading("Refreshing...", { id: 'refresh-loc' });
                        setIsGettingAddress(true);
                        navigator.geolocation.getCurrentPosition(
                          async (position) => {
                            const lat = position.coords.latitude;
                            const lng = position.coords.longitude;
                            setNewPost(prev => ({
                              ...prev,
                              latitude: lat,
                              longitude: lng
                            }));
                            setUserLocation([lat, lng]);
                            // Get new address
                            const addr = await reverseGeocode(lat, lng);
                            if (addr) {
                              setNewPost(prev => ({ ...prev, address: addr }));
                            }
                            setIsGettingAddress(false);
                            toast.success("Location updated!", { id: 'refresh-loc' });
                          },
                          (error) => {
                            setIsGettingAddress(false);
                            toast.error("Could not refresh location", { id: 'refresh-loc' });
                          },
                          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                        );
                      }
                    }}
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 flex-shrink-0"
                    data-testid="refresh-location-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Refresh
                  </button>
                </>
              ) : userLocation ? (
                <button
                  onClick={async () => {
                    // Get fresh location with address
                    if (navigator.geolocation) {
                      toast.loading("Getting location...", { id: 'get-loc' });
                      setIsGettingAddress(true);
                      navigator.geolocation.getCurrentPosition(
                        async (position) => {
                          const lat = position.coords.latitude;
                          const lng = position.coords.longitude;
                          setNewPost(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng
                          }));
                          setUserLocation([lat, lng]);
                          const addr = await reverseGeocode(lat, lng);
                          if (addr) setNewPost(prev => ({ ...prev, address: addr }));
                          setIsGettingAddress(false);
                          toast.success("Location set!", { id: 'get-loc' });
                        },
                        async (error) => {
                          // Fallback to cached location
                          setNewPost(prev => ({
                            ...prev,
                            latitude: userLocation[0],
                            longitude: userLocation[1]
                          }));
                          const addr = await reverseGeocode(userLocation[0], userLocation[1]);
                          if (addr) setNewPost(prev => ({ ...prev, address: addr }));
                          setIsGettingAddress(false);
                          toast.success("Using cached location", { id: 'get-loc' });
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                      );
                    } else {
                      setNewPost(prev => ({
                        ...prev,
                        latitude: userLocation[0],
                        longitude: userLocation[1]
                      }));
                      toast.success("Using your location!");
                    }
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
            
            {/* Contact Number (Optional) */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-slate-700">Contact Number (Optional)</span>
              </div>
              <input
                type="tel"
                inputMode="tel"
                placeholder="Mobile for pickers to contact you"
                value={newPost.poster_phone}
                onChange={(e) => setNewPost(prev => ({ ...prev, poster_phone: e.target.value }))}
                className="w-full p-3 bg-white border border-blue-200 rounded-lg text-slate-800 placeholder:text-slate-400"
                data-testid="poster-phone-input"
              />
              <p className="text-xs text-blue-600 mt-1">Only shared when someone claims your item</p>
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
      <Drawer open={showDetailDrawer} onOpenChange={(open) => {
        setShowDetailDrawer(open);
        if (!open) setCurrentImageIndex(0);
      }}>
        <DrawerContent className="max-h-[85vh] pb-20">
          {selectedPost && (
            <>
              <div className="relative">
                {/* Image Gallery */}
                {(() => {
                  const images = selectedPost.images?.length > 0 
                    ? selectedPost.images 
                    : [selectedPost.image_base64];
                  const currentImg = images[currentImageIndex] || images[0];
                  const imgSrc = currentImg?.startsWith('data:') 
                    ? currentImg 
                    : `data:image/jpeg;base64,${currentImg}`;
                  
                  return (
                    <>
                      <img 
                        src={imgSrc}
                        alt={selectedPost.title}
                        className="w-full h-48 object-cover touch-pan-y cursor-pointer"
                        onClick={() => openFullscreenImage(images, currentImageIndex)}
                        onTouchStart={handleGalleryTouchStart}
                        onTouchEnd={(e) => handleGalleryTouchEnd(e, images.length)}
                      />
                      
                      {/* Tap to expand hint */}
                      <div 
                        className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none"
                        data-testid="tap-to-expand-hint"
                      >
                        <p className="text-white text-xs font-medium flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          {images.length > 1 ? 'Tap to expand • Swipe to browse' : 'Tap to expand'}
                        </p>
                      </div>
                      
                      {/* Navigation arrows if multiple images */}
                      {images.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentImageIndex(i => i > 0 ? i - 1 : images.length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          <button
                            onClick={() => setCurrentImageIndex(i => i < images.length - 1 ? i + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center rotate-180"
                          >
                            <ChevronLeft className="w-5 h-5 text-white" />
                          </button>
                          
                          {/* Dots indicator */}
                          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1">
                            {images.map((_, i) => (
                              <button
                                key={i}
                                onClick={() => setCurrentImageIndex(i)}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                  i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
                
                <div className="absolute top-3 left-3">
                  <CategoryBadge category={selectedPost.category} />
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  {/* Share button */}
                  <button
                    onClick={() => handleNativeShare(selectedPost)}
                    className="w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg"
                    data-testid="share-post-btn"
                  >
                    <Share2 className="w-4 h-4 text-slate-700" />
                  </button>
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
                  {/* Distance indicator */}
                  {formatDistance(selectedPost) && (
                    <div className="flex items-center gap-1 text-green-600 font-medium">
                      <MapPin className="w-4 h-4" />
                      <span>{formatDistance(selectedPost)} away</span>
                    </div>
                  )}
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
                    onClick={() => logInteraction(selectedPost.id, 'direction_click')}
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Get directions</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Safety Notice - Full Recovery Network Message */}
                <div className="safety-notice p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-700 text-xs font-medium">
                        Public pickup only. Do not enter private property.
                      </p>
                      <p className="text-amber-600 text-xs mt-1">
                        Ucycle is a recovery network. We do not support dumping. Items not claimed within 48 hours must be removed by the owner.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CLAIM BUTTON - For unclaimed items */}
                {selectedPost.status === "active" && (!activeClaim || activeClaim?.post_id !== selectedPost.id) && (
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => handleClaimItem(selectedPost)}
                      className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                      data-testid="claim-btn"
                    >
                      <Phone className="w-5 h-5" />
                      <span className="font-black uppercase">Claim (30 Mins)</span>
                    </button>
                    <Button
                      variant="outline"
                      className="py-4 px-4 rounded-xl"
                      onClick={() => handleMarkCollected(selectedPost.id)}
                      data-testid="collected-btn"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </Button>
                  </div>
                )}

                {/* ACTIVE CLAIM - Big phone icon + timer */}
                {(selectedPost.status === "pending" || activeClaim?.post_id === selectedPost.id) && (
                  <div className="mb-3 bg-slate-900 rounded-xl overflow-hidden">
                    {/* Timer bar */}
                    <div className="px-4 py-3 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400 font-bold text-xl animate-pulse">
                          {claimTimeLeft || 30} min
                        </span>
                        <span className="text-slate-400 text-xs uppercase tracking-wider">
                          left to pickup
                        </span>
                      </div>
                    </div>
                    
                    {/* Call + Done buttons */}
                    <div className="flex h-14">
                      <a
                        href={`tel:${selectedPost.poster_phone || activeClaim?.poster_phone || ''}`}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white flex flex-col items-center justify-center border-r border-green-600"
                        data-testid="call-btn"
                      >
                        <Phone className="w-6 h-6" />
                        <span className="text-[10px] font-bold mt-1 uppercase">Call</span>
                      </a>
                      <button
                        onClick={() => handleMarkCollected(selectedPost.id)}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 text-white flex flex-col items-center justify-center"
                        data-testid="done-btn"
                      >
                        <CheckCircle className="w-6 h-6" />
                        <span className="text-[10px] font-bold mt-1 uppercase">Done</span>
                      </button>
                    </div>
                  </div>
                )}
                      onClick={handleReleaseClaim}
                      className="w-full text-center text-red-500 hover:text-red-700 text-sm py-2 mt-1"
                    >
                      Cancel claim
                    </button>
                  </div>
                )}

                {/* Quick Actions Row - favorite, share, report */}
                {selectedPost.status === "active" && !activeClaim && (
                  <div className="flex justify-center gap-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`rounded-full ${isFavorite(selectedPost.id) ? 'text-red-600' : 'text-slate-500'}`}
                      onClick={() => {
                        toggleFavorite(selectedPost.id);
                        toast.success(isFavorite(selectedPost.id) ? 'Removed from favorites' : 'Added to favorites');
                      }}
                      data-testid="favorite-btn"
                    >
                      <Heart className={`w-5 h-5 ${isFavorite(selectedPost.id) ? 'fill-red-500' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-slate-500"
                      onClick={() => handleSharePost(selectedPost)}
                      data-testid="share-post-btn"
                    >
                      <Share2 className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-slate-500"
                      onClick={() => {
                        setShowDetailDrawer(false);
                        setShowReportDialog(true);
                      }}
                      data-testid="report-post-btn"
                    >
                      <Flag className="w-5 h-5" />
                    </Button>
                  </div>
                )}
                
                {/* Bottom spacer to prevent Emergent badge overlap */}
                <div className="h-16"></div>
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
                <span className={`font-medium block ${reportReason === reason.value ? 'text-green-700' : 'text-slate-700'}`}>
                  {reason.label}
                </span>
                <span className="text-xs text-slate-500">{reason.description}</span>
              </button>
            ))}
            
            {/* Additional details for illegal dumping */}
            {reportReason === 'illegal_dumping' && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm text-amber-800 mb-3">
                  <strong>⚠️ Illegal Dumping Report</strong><br/>
                  This will be sent to local council authorities. Please add any additional details.
                </p>
                <textarea
                  value={reportDetails}
                  onChange={(e) => setReportDetails(e.target.value)}
                  placeholder="Additional details (optional): e.g., 'Large pile of construction waste', 'Multiple mattresses', etc."
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
                🚨 <strong>Safety:</strong> Public pickup only
              </p>
            </div>
            
            <Button 
              className="w-full bg-gradient-to-r from-green-600 to-lime-500 text-white font-bold py-4 rounded-full shadow-lg"
              onClick={dismissWelcome}
              data-testid="welcome-start-btn"
            >
              Let&apos;s go! 🚀
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* iOS Add to Home Screen Prompt - Swipe down to dismiss */}
      {showAddToHomeScreen && (
        <div 
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 modal-backdrop animate-fade-in"
          onClick={dismissAddToHomeScreen}
        >
          <div 
            className="w-full max-w-md mx-4 mb-20 animate-slide-up modal-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
              const currentY = e.touches[0].clientY;
              const diff = currentY - startY;
              // Only allow downward swipe
              if (diff > 0) {
                e.currentTarget.style.transform = `translateY(${diff * 0.5}px)`;
                e.currentTarget.style.opacity = `${Math.max(0.3, 1 - diff / 300)}`;
                e.currentTarget.style.transition = 'none';
              }
            }}
            onTouchEnd={(e) => {
              const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
              const endY = e.changedTouches[0].clientY;
              e.currentTarget.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.3s ease';
              e.currentTarget.style.transform = '';
              e.currentTarget.style.opacity = '';
              // Swipe down to close (threshold 80px)
              if (endY - startY > 80) {
                dismissAddToHomeScreen();
              }
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center mb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 bg-white/60 rounded-full" />
            </div>
            <p className="text-center text-xs text-white/80 mb-2">Swipe down to close</p>
            
            {/* Arrow pointing to Share button */}
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
                
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Add Ucycle to Home Screen
                </h3>
                <p className="text-slate-600 text-sm mb-4">
                  Get instant access with one tap! Install Ucycle for the best experience.
                </p>
                
                {/* Instructions */}
                <div className="bg-slate-50 rounded-xl p-4 text-left space-y-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Share2 className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Step 1:</strong> Tap the <span className="text-blue-600">Share</span> icon in your browser&apos;s toolbar (Safari, Chrome)
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Plus className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Step 2:</strong> Scroll and select <span className="text-green-600">&quot;Add to Home Screen&quot;</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-sm text-slate-700">
                      <strong>Step 3:</strong> Tap <span className="text-amber-600">&quot;Add&quot;</span> to confirm
                    </p>
                  </div>
                </div>
                
                <p className="text-xs text-slate-400 mb-4">
                  📷 For best camera access, also visit Safari Settings → Ucycle → Camera → Allow
                </p>
                
                <div className="flex gap-3">
                  <Button 
                    variant="outline"
                    className="flex-1 py-4 rounded-full active:scale-[0.98] transition-transform"
                    onClick={dismissAddToHomeScreen}
                  >
                    Maybe later
                  </Button>
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full active:scale-[0.98] transition-transform"
                    onClick={dismissAddToHomeScreen}
                  >
                    Got it!
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Norman Scrap Yard Ad - Sydney Metro Only - Swipe to dismiss */}
      {showScrapYardAd && isInSydneyMetro() && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 modal-backdrop animate-fade-in"
          onClick={() => setShowScrapYardAd(false)}
        >
          <div 
            className="bg-white max-w-sm mx-4 rounded-3xl shadow-2xl overflow-hidden animate-slide-up modal-content"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              e.currentTarget.dataset.touchStartY = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
              const currentY = e.touches[0].clientY;
              const diff = currentY - startY;
              // Allow both up and down swipe
              if (Math.abs(diff) > 10) {
                e.currentTarget.style.transform = `translateY(${diff * 0.4}px)`;
                e.currentTarget.style.transition = 'none';
              }
            }}
            onTouchEnd={(e) => {
              const startY = parseFloat(e.currentTarget.dataset.touchStartY || 0);
              const endY = e.changedTouches[0].clientY;
              e.currentTarget.style.transition = 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)';
              e.currentTarget.style.transform = '';
              if (Math.abs(endY - startY) > 80) {
                setShowScrapYardAd(false);
              }
            }}
          >
            <div className="pt-6 px-6 text-center">
              {/* Swipe indicator */}
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4 cursor-grab" />
              
              <img 
                src={NORMAN_SCRAP_YARD.logo} 
                alt="Norman's Scrap Metal"
                className="w-full max-w-[200px] h-auto mx-auto mb-4"
                data-testid="norman-scrapyard-logo"
              />
              <h2 className="text-xl font-bold text-slate-900 mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Got scrap metal? 🔧
              </h2>
              <p className="text-slate-600 mb-4">
                {NORMAN_SCRAP_YARD.name} in Penrith is a local legend for recycling!
              </p>
              
              <div className="p-4 bg-slate-100 rounded-2xl mb-4 text-left">
                <p className="font-semibold text-slate-900">{NORMAN_SCRAP_YARD.name}</p>
                <p className="text-sm text-slate-600">{NORMAN_SCRAP_YARD.address}</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">✓ Accepted Items:</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Scrap Metal • <strong>White Goods</strong> (Fridges, Washers, Dryers, Microwaves) • Car Batteries • Aluminium • Copper • Brass • Steel
                  </p>
                </div>
              </div>
            
              <div className="grid grid-cols-2 gap-3 mb-4">
                <Button 
                  variant="outline"
                  className="py-4 rounded-full active:scale-[0.98] transition-transform"
                  onClick={() => setShowScrapYardAd(false)}
                  data-testid="scrapyard-skip-btn"
                >
                  Not now
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-full active:scale-[0.98] transition-transform"
                  onClick={async () => {
                    // Track partner click (background, no delay)
                    try {
                      axios.post(`${API}/track-partner-click?partner_id=normans_scrap&partner_name=Norman's Scrap Yard&category=${selectedPost?.category || ''}`);
                    } catch (e) { /* ignore tracking errors */ }
                    window.open(NORMAN_SCRAP_YARD.mapsUrl, '_blank');
                    setShowScrapYardAd(false);
                  }}
                  data-testid="scrapyard-maps-btn"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Get directions
                </Button>
              </div>
              
              <p className="text-xs text-slate-400 pb-4">
                Swipe to dismiss • Auto-closes in 5s
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scrap Prices Modal - Compact Receipt Style */}
      <Dialog open={showScrapPrices} onOpenChange={setShowScrapPrices}>
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
              onClick={() => setShowScrapPrices(false)}
              data-testid="scrap-prices-close-btn"
            >
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Guide Modal - Extracted */}
      <QuickGuideModal 
        show={showQuickGuide} 
        onClose={() => setShowQuickGuide(false)} 
        isStandalone={isStandalone} 
      />

      {/* Camera Troubleshoot Tooltip - Extracted */}
      <CameraTroubleshootTooltip 
        show={showCameraTroubleshoot} 
        hasSeenTip={hasSeenCameraTip} 
        onDismiss={() => {
          setShowCameraTroubleshoot(false);
          setHasSeenCameraTip(true);
        }} 
      />

      {/* Fullscreen Image Viewer - Extracted */}
      <FullscreenImageViewer
        show={showFullscreenImage}
        images={fullscreenImages}
        currentIndex={fullscreenIndex}
        setCurrentIndex={setFullscreenIndex}
        swipeY={fullscreenSwipeY}
        onClose={closeFullscreenImage}
        onTouchStart={handleFullscreenTouchStart}
        onTouchMove={handleFullscreenTouchMove}
        onTouchEnd={handleFullscreenTouchEnd}
      />

      {/* PWA Install Prompt Banner - Extracted */}
      <InstallPromptBanner
        show={showInstallPrompt}
        deferredPrompt={deferredPrompt}
        onInstall={() => {}}
        onDismiss={() => setShowInstallPrompt(false)}
      />
      {/* In-App Notification Banner */}
      {notification && (
        <div 
          className={`fixed top-0 left-0 right-0 z-[200] transition-transform duration-300 ${showNotificationBanner ? 'translate-y-0' : '-translate-y-full'}`}
          data-testid="notification-banner"
        >
          <div className={`mx-4 mt-4 rounded-2xl shadow-xl p-4 ${
            notification.type === 'collected' 
              ? 'bg-gradient-to-r from-green-600 to-lime-500' 
              : 'bg-gradient-to-r from-blue-600 to-cyan-500'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                notification.type === 'collected' ? 'bg-white/20' : 'bg-white/20'
              }`}>
                {notification.type === 'collected' ? (
                  <CheckCircle className="w-6 h-6 text-white" />
                ) : (
                  <MapPin className="w-6 h-6 text-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{notification.message}</p>
                <p className="text-white/80 text-xs">
                  {notification.type === 'collected' ? 'Your item was picked up!' : 'Tap to see on map'}
                </p>
              </div>
              <button 
                onClick={() => setShowNotificationBanner(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Sound - using a base64 encoded simple ding sound */}
      <audio 
        ref={notificationSound}
        preload="auto"
        src="data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYxnQ5SAAAAAAAAAAAAAAAAAAAAAP/7kGQAAANUMEoFPeACNQV40KENABEY1g5GesOAKwPSyYTAbPkGBgYGBgYBhBAGHzP4kAQdBxnMEHw+9wMGDiCDoNwQcWqGU0QOqQ0ODfG+BAEHQOc3B0LgYNJOv/MDE1OXMQfBv8QBQHEHwfB8EAQPGdyYfE4Px+D4Pg+D4IAAA=="
      />

      <Toaster position="top-center" duration={1200} toastOptions={{ style: { marginTop: '40vh' } }} />
    </div>
  );
}

// Lazy load Admin and Post pages for better initial load performance
const LazyAdminPanel = lazy(() => import('./components/Admin/AdminDashboard'));
const LazyAdminHQ = lazy(() => import('./components/Admin/AdminHQ'));
const LazyPostPage = lazy(() => import('./pages/PostPage'));

// Loading fallback for lazy components
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-2" />
      <p className="text-slate-600">Loading...</p>
    </div>
  </div>
);

// Main App with Router
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="/post/:postId" element={
          <Suspense fallback={<LoadingFallback />}>
            <LazyPostPage />
          </Suspense>
        } />
        <Route path="/admin" element={
          <Suspense fallback={<LoadingFallback />}>
            <LazyAdminPanel />
          </Suspense>
        } />
        <Route path="/hq" element={
          <Suspense fallback={<LoadingFallback />}>
            <LazyAdminHQ />
          </Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

