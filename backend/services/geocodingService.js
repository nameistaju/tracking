/**
 * Geocoding Service — Uses free OpenStreetMap Nominatim API
 * 
 * Strategy:
 * - In-memory cache keyed by rounded coordinates (3 decimal places ≈ 110m grid)
 * - Rate limited to 1 request/second (Nominatim policy)
 * - Only geocode if moved > 200m from last geocoded point
 * - Returns { area, city, state, formatted }
 */

const cache = new Map();
const MAX_CACHE_SIZE = 5000;
let lastRequestTime = 0;
const MIN_REQUEST_GAP_MS = 1100; // Slightly over 1 second for safety

/**
 * Calculate distance between two coordinates in meters (Haversine)
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Create a cache key from lat/lng rounded to 3 decimal places (~110m grid)
 */
function getCacheKey(lat, lng) {
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

/**
 * Wait if needed to respect Nominatim rate limit
 */
async function rateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_GAP_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_GAP_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

/**
 * Reverse geocode coordinates to a human-readable address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<{area: string, city: string, state: string, formatted: string}>}
 */
async function reverseGeocode(lat, lng) {
  if (!lat || !lng) return { area: '', city: '', state: '', formatted: '' };

  // Check cache first
  const key = getCacheKey(lat, lng);
  if (cache.has(key)) {
    return cache.get(key);
  }

  try {
    await rateLimit();

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'FieldTrackPro/1.0 (fieldtrack-employee-monitoring)',
        'Accept-Language': 'en'
      }
    });

    if (!response.ok) {
      console.warn(`Geocoding failed with status ${response.status}`);
      return getFallback(lat, lng);
    }

    const data = await response.json();
    const addr = data.address || {};

    const result = {
      area: addr.suburb || addr.neighbourhood || addr.hamlet || addr.village || addr.town || '',
      city: addr.city || addr.town || addr.county || addr.state_district || '',
      state: addr.state || '',
      formatted: formatAddress(addr)
    };

    // Add to cache (evict oldest if full)
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    cache.set(key, result);

    return result;
  } catch (error) {
    console.warn('Geocoding error:', error.message);
    return getFallback(lat, lng);
  }
}

/**
 * Format address components into readable string
 */
function formatAddress(addr) {
  const parts = [];
  if (addr.suburb || addr.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
  if (addr.city || addr.town) parts.push(addr.city || addr.town);
  if (addr.state) parts.push(addr.state);
  return parts.join(', ') || 'Unknown Location';
}

/**
 * Fallback when geocoding fails — use known Indian city database
 */
function getFallback(lat, lng) {
  const cities = [
    { lat: 28.6139, lng: 77.2090, name: 'New Delhi', state: 'Delhi' },
    { lat: 19.0760, lng: 72.8777, name: 'Mumbai', state: 'Maharashtra' },
    { lat: 17.3850, lng: 78.4867, name: 'Hyderabad', state: 'Telangana' },
    { lat: 23.0225, lng: 72.5714, name: 'Ahmedabad', state: 'Gujarat' },
    { lat: 12.9716, lng: 77.5946, name: 'Bengaluru', state: 'Karnataka' },
    { lat: 13.0827, lng: 80.2707, name: 'Chennai', state: 'Tamil Nadu' },
    { lat: 22.5726, lng: 88.3639, name: 'Kolkata', state: 'West Bengal' },
    { lat: 18.5204, lng: 73.8567, name: 'Pune', state: 'Maharashtra' },
    { lat: 26.9124, lng: 75.7873, name: 'Jaipur', state: 'Rajasthan' },
    { lat: 26.8467, lng: 80.9462, name: 'Lucknow', state: 'Uttar Pradesh' },
  ];

  let nearest = null;
  let minDist = Infinity;
  for (const c of cities) {
    const d = haversineDistance(lat, lng, c.lat, c.lng);
    if (d < minDist) {
      minDist = d;
      nearest = c;
    }
  }

  if (nearest && minDist < 50000) { // Within 50km
    return {
      area: '',
      city: nearest.name,
      state: nearest.state,
      formatted: `Near ${nearest.name}, ${nearest.state}`
    };
  }

  return {
    area: '',
    city: '',
    state: '',
    formatted: `${lat.toFixed(4)}, ${lng.toFixed(4)}`
  };
}

/**
 * Check if location has changed significantly from last known point
 * @returns {boolean} true if moved > threshold meters
 */
function hasMovedSignificantly(lat1, lng1, lat2, lng2, thresholdMeters = 200) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return true;
  return haversineDistance(lat1, lng1, lat2, lng2) > thresholdMeters;
}

module.exports = {
  reverseGeocode,
  haversineDistance,
  hasMovedSignificantly,
  getCacheKey
};
