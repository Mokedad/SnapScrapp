import axios from 'axios';
import { API } from './constants';

/**
 * Log user interactions for analytics
 * @param {string} postId - The post ID
 * @param {string} type - Interaction type: 'direction_click', 'contact_reveal', 'claim_intent'
 * @param {string} adminPin - Admin PIN for authentication (optional for public interactions)
 */
export const logInteraction = async (postId, type, adminPin = null) => {
  try {
    const headers = adminPin ? { 'X-Admin-PIN': adminPin } : {};
    await axios.post(`${API}/log-interaction`, {
      post_id: postId,
      interaction_type: type
    }, { headers });
  } catch (e) {
    console.error("Interaction logging failed", e);
  }
};

/**
 * Claim an item - creates a claim intent
 * @param {string} postId - The post ID to claim
 * @returns {object} - Claim response with claim_id and timer info
 */
export const claimItem = async (postId) => {
  try {
    const response = await axios.post(`${API}/claims`, {
      post_id: postId
    });
    return response.data;
  } catch (e) {
    console.error("Claim failed", e);
    throw e;
  }
};

/**
 * Get claim status for a post
 * @param {string} postId - The post ID
 * @returns {object} - Claim status with timer info
 */
export const getClaimStatus = async (postId) => {
  try {
    const response = await axios.get(`${API}/claims/${postId}`);
    return response.data;
  } catch (e) {
    return null;
  }
};

/**
 * Release a claim (cancel)
 * @param {string} claimId - The claim ID to release
 */
export const releaseClaim = async (claimId) => {
  try {
    await axios.delete(`${API}/claims/${claimId}`);
  } catch (e) {
    console.error("Release claim failed", e);
  }
};

export default {
  logInteraction,
  claimItem,
  getClaimStatus,
  releaseClaim
};
