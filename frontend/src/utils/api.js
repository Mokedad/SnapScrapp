import axios from 'axios';
import { API } from './constants';

// Posts API
export const fetchPosts = async (bounds = null, page = 1, limit = 100) => {
  const params = { page, limit };
  if (bounds) {
    params.ne_lat = bounds.ne_lat;
    params.ne_lng = bounds.ne_lng;
    params.sw_lat = bounds.sw_lat;
    params.sw_lng = bounds.sw_lng;
  }
  const response = await axios.get(`${API}/posts`, { params });
  return response.data;
};

export const fetchPost = async (postId) => {
  const response = await axios.get(`${API}/posts/${postId}`);
  return response.data;
};

export const createPost = async (postData) => {
  const response = await axios.post(`${API}/posts`, postData);
  return response.data;
};

export const markPostCollected = async (postId) => {
  const response = await axios.patch(`${API}/posts/${postId}/collected`);
  return response.data;
};

export const generatePostDescription = async (postId) => {
  const response = await axios.post(`${API}/posts/${postId}/generate-description`);
  return response.data;
};

// Image Analysis API
export const analyzeImage = async (imageBase64) => {
  const response = await axios.post(`${API}/analyze-image`, { image: imageBase64 });
  return response.data;
};

export const analyzeImageFast = async (imageBase64) => {
  const response = await axios.post(`${API}/analyze-image-fast`, { image: imageBase64 });
  return response.data;
};

// Reports API
export const submitReport = async (reportData) => {
  const response = await axios.post(`${API}/reports`, reportData);
  return response.data;
};

// Partner tracking API
export const trackPartnerClick = async (partnerId, postId, category) => {
  const response = await axios.post(`${API}/track-partner-click`, {
    partner_id: partnerId,
    post_id: postId,
    category: category
  });
  return response.data;
};

// Admin API
export const verifyAdminPin = async (pin) => {
  const response = await axios.post(`${API}/admin/verify`, { pin });
  return response.data;
};

export const fetchAdminStats = async () => {
  const response = await axios.get(`${API}/admin/stats`);
  return response.data;
};

export const fetchAdminPosts = async () => {
  const response = await axios.get(`${API}/admin/posts`);
  return response.data;
};

export const deleteAdminPost = async (postId) => {
  const response = await axios.delete(`${API}/admin/posts/${postId}`);
  return response.data;
};

export const fetchAdminReports = async () => {
  const response = await axios.get(`${API}/admin/reports`);
  return response.data;
};

export const markReportReviewed = async (reportId) => {
  const response = await axios.patch(`${API}/admin/reports/${reportId}/reviewed`);
  return response.data;
};

export const fetchAdminAnalytics = async () => {
  const response = await axios.get(`${API}/admin/analytics`);
  return response.data;
};

export const fetchItemTypes = async () => {
  const response = await axios.get(`${API}/admin/item-types`);
  return response.data;
};

export const fetchPartnerClicks = async () => {
  const response = await axios.get(`${API}/admin/partners`);
  return response.data;
};

export const fetchBrands = async () => {
  const response = await axios.get(`${API}/admin/brands`);
  return response.data;
};

export const fetchIllegalDumpingReports = async () => {
  const response = await axios.get(`${API}/admin/illegal-dumping-reports`);
  return response.data;
};

// Export endpoints
export const exportItemTypes = () => `${API}/admin/export/item-types`;
export const exportPartnerClicks = () => `${API}/admin/export/partner-clicks`;
export const exportBrands = () => `${API}/admin/export/brands`;
export const exportPosts = () => `${API}/admin/export/posts`;
export const exportAll = () => `${API}/admin/export/all`;

// Geocoding API (OpenStreetMap Nominatim)
export const reverseGeocode = async (lat, lng) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
  );
  return response.json();
};

export const searchLocation = async (query) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=au&limit=5`
  );
  return response.json();
};
