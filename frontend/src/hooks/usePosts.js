import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchPosts, createPost, markPostCollected, generatePostDescription } from '../utils/api';
import { STORAGE_KEYS } from '../utils/constants';
import { calculateDistance } from '../utils/mapUtils';

export function usePosts(userLocation) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  
  // My posts tracking (localStorage)
  const [myPostIds, setMyPostIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.MY_POST_IDS)) || [];
    } catch {
      return [];
    }
  });

  // Favorites tracking (localStorage)
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.FAVORITES)) || [];
    } catch {
      return [];
    }
  });

  // Load posts from API
  const loadPosts = useCallback(async (bounds = null) => {
    try {
      setLoading(true);
      const data = await fetchPosts(bounds);
      
      // Add distance to each post if user location available
      const postsWithDistance = data.map(post => {
        if (userLocation && post.latitude && post.longitude) {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            post.latitude, post.longitude
          );
          return { ...post, distance };
        }
        return post;
      });
      
      setPosts(postsWithDistance);
      setError(null);
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  // Create a new post
  const addPost = useCallback(async (postData) => {
    const newPost = await createPost(postData);
    
    // Track as my post
    const updatedMyPostIds = [...myPostIds, newPost.id];
    setMyPostIds(updatedMyPostIds);
    localStorage.setItem(STORAGE_KEYS.MY_POST_IDS, JSON.stringify(updatedMyPostIds));
    
    // Add to posts list
    setPosts(prev => [newPost, ...prev]);
    
    // Generate description in background
    generatePostDescription(newPost.id).catch(console.error);
    
    return newPost;
  }, [myPostIds]);

  // Mark post as collected
  const collectPost = useCallback(async (postId) => {
    await markPostCollected(postId);
    setPosts(prev => prev.map(p => 
      p.id === postId ? { ...p, status: 'collected' } : p
    ));
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((postId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(postId)
        ? prev.filter(id => id !== postId)
        : [...prev, postId];
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(newFavorites));
      return newFavorites;
    });
  }, []);

  // Check if post is favorite
  const isFavorite = useCallback((postId) => {
    return favorites.includes(postId);
  }, [favorites]);

  // Check if post is mine
  const isMyPost = useCallback((postId) => {
    return myPostIds.includes(postId);
  }, [myPostIds]);

  // Update posts with new distances when user location changes
  useEffect(() => {
    if (userLocation && posts.length > 0) {
      setPosts(prev => prev.map(post => {
        if (post.latitude && post.longitude) {
          const distance = calculateDistance(
            userLocation.lat, userLocation.lng,
            post.latitude, post.longitude
          );
          return { ...post, distance };
        }
        return post;
      }));
    }
  }, [userLocation]);

  return {
    posts,
    loading,
    error,
    loadPosts,
    addPost,
    collectPost,
    toggleFavorite,
    isFavorite,
    isMyPost,
    myPostIds,
    favorites,
    mapRef
  };
}

export default usePosts;
