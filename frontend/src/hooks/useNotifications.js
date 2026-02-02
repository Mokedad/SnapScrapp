import { useState, useCallback, useEffect, useRef } from 'react';
import { STORAGE_KEYS, NEARBY_RADIUS_KM } from '../utils/constants';

export function useNotifications() {
  const [notification, setNotification] = useState(null);
  const [showNotificationBanner, setShowNotificationBanner] = useState(false);
  const audioRef = useRef(null);
  
  // Notifications enabled state (localStorage)
  const [nearbyNotificationsEnabled, setNearbyNotificationsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  // Last seen post IDs for detecting new posts
  const [lastSeenPostIds, setLastSeenPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.LAST_SEEN_POST_IDS)) || [];
    } catch {
      return [];
    }
  });

  // Initialize audio
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleRcKLYDL7pt8JxgtiM3ufHExOXe62t5zLChyq9/qe0BHYYHV7oZRMD5pnN/sfkxLX3/L8oNLPUVbjdL0gU0/Slh6yPiASTxPWXbB+oRKPk9Xc736hEo7T1dy9fuFSDtRVnH0/YdIOlJVcPP+iEc4U1Rw8f6JRjhTU3Dw/4pFN1RSb+//ikU3VFJv7v+KRDdUUW7u/4pEN1VRbe7/ikM2VVFs7v+KQzZWUWzt/4pDNlZRbO3/ikI1V1Fr7P+KQjVXUGvs/4pCNVhQa+v/iUE0WE9q6/+JQTRZTmrr/4lANFpOaev/iEA0Wk1o6v+IQDNbTWjq/4hAM1tNZ+r/h0AzXExn6f+HPzJcTGfp/4c/Ml1MZun/hj8yXUtl6P+GPjFdS2Xo/4Y+MV5LZOf/hT4xXkpk5/+FPjFfSmTn/4U9MF9KY+b/hD0wX0pj5v+EPTBgSmPm/4Q9L2BJYuX/gz0vYElh5f+DPS5gSWHl/4M9LmFJYeT/gzwuYUlh5P+DPC5hSWDk/4I8LWJIYeT/gjwtYkhh4/+CPC1iSGHj/4E7LGNIYeP/gTssY0hh4/+BOyxjSGHi/4E7K2RIYN//gDoqZEdg3/+AOSpkR2De/384KWVHXt7/fjcpZUde3f99NihlRl7d/3w2J2ZGXdz/ezUmZkVd2/96NCZmRV3a/3kzJmdFXNr/eDMmZ0Vc2f93MiVoRVvY/3YxJWhEW9f/dTAkaERb1/9zLyNoQ1vW/3IuI2lDWtX/cS4iaUNa1f9wLSJpQ1rU/28sIWpCWtP/biwhakJZ0v9tKyBrQlnR/2wqIGtBWNH/ayoga0FY0P9qKR9sQVjP/2koH2xBV87/aCgfbUBXzv9nJx5tQFbN/2YnHm0/Vs3/ZSYdbj9Wzf9kJh1uP1XM/2MlHW8+Vcv/YiUcbz5Vy/9hJBxwPlTK/2AkG3A9VMn/XyMbcT1Tyf9eIhpxPVPJ/10iGnI8U8j/XCEach1SyP9bIRlyPFLH/1ogGXM8Ucb/WSAZczxRxv9YHxh0O1DG/1cfGHQ7UMX/Vh4YdDtPxf9VHhd1Ok/E/1QdF3U6T8T/Ux0XdjlOw/9SHBd2OU7D/1EcFnc5TsL/UBsWdzlNwv9PGxV3OE3B/04aFXg4TcH/TRoVeDhMwf9MGhR5N0vA/0oZFHk3S8D/SRkUejdLv/9IGBR6NkrA/0cYE3o2Sr//RhcTezdKvv9FFxN7NUm+/0QWE3s1Sb7/QxYSfDVJvf9CFhJ8NEi9/0EVEX00SLz/QBURPTRI');
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  }, []);

  // Show notification
  const showNotification = useCallback((title, message, type = 'info') => {
    if (!nearbyNotificationsEnabled && type === 'nearby') return;
    
    setNotification({ title, message, type });
    setShowNotificationBanner(true);
    playSound();

    // Auto-hide after 4 seconds
    setTimeout(() => {
      setShowNotificationBanner(false);
      setTimeout(() => setNotification(null), 300);
    }, 4000);
  }, [nearbyNotificationsEnabled, playSound]);

  // Check for new nearby posts
  const checkNewNearbyPosts = useCallback((posts, userLocation) => {
    if (!nearbyNotificationsEnabled || !userLocation) return;
    
    const currentPostIds = posts.map(p => p.id);
    const newPostIds = currentPostIds.filter(id => !lastSeenPostIds.includes(id));
    
    if (newPostIds.length > 0) {
      // Check if any new posts are within 1km
      const nearbyNewPosts = posts.filter(p => 
        newPostIds.includes(p.id) && 
        p.distance !== undefined && 
        p.distance <= NEARBY_RADIUS_KM
      );
      
      if (nearbyNewPosts.length > 0) {
        showNotification(
          'New item nearby!',
          `${nearbyNewPosts[0].title} - ${Math.round(nearbyNewPosts[0].distance * 1000)}m away`,
          'nearby'
        );
      }
    }
    
    // Update last seen
    setLastSeenPostIds(currentPostIds);
    localStorage.setItem(STORAGE_KEYS.LAST_SEEN_POST_IDS, JSON.stringify(currentPostIds));
  }, [nearbyNotificationsEnabled, lastSeenPostIds, showNotification]);

  // Toggle notifications
  const toggleNotifications = useCallback(() => {
    setNearbyNotificationsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, JSON.stringify(newValue));
      return newValue;
    });
  }, []);

  // Dismiss notification
  const dismissNotification = useCallback(() => {
    setShowNotificationBanner(false);
    setTimeout(() => setNotification(null), 300);
  }, []);

  return {
    notification,
    showNotificationBanner,
    nearbyNotificationsEnabled,
    showNotification,
    checkNewNearbyPosts,
    toggleNotifications,
    dismissNotification
  };
}

export default useNotifications;
