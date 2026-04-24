const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MAX_DIRECTIONS_POINTS = 25;

export const simplifyWaypoints = (points) => {
  if (points.length <= MAX_DIRECTIONS_POINTS) {
    return points;
  }

  const sampled = [points[0]];
  const middlePoints = points.slice(1, -1);
  const slots = MAX_DIRECTIONS_POINTS - 2;

  for (let index = 0; index < slots; index += 1) {
    const sampleIndex = Math.round((index * (middlePoints.length - 1)) / Math.max(slots - 1, 1));
    const point = middlePoints[sampleIndex];
    if (point) {
      sampled.push(point);
    }
  }

  sampled.push(points[points.length - 1]);

  return sampled.filter((point, index, array) => {
    if (index === 0) return true;
    const previous = array[index - 1];
    return previous[0] !== point[0] || previous[1] !== point[1];
  });
};

export const fetchMapboxRoute = async (points) => {
  if (!MAPBOX_TOKEN || points.length < 2) {
    return points;
  }

  const waypoints = simplifyWaypoints(points);
  const coordinatePath = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatePath}?geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`;
  const response = await fetch(url);
  const data = await response.json();
  const geometry = data.routes?.[0]?.geometry?.coordinates;

  if (!response.ok || !geometry?.length) {
    throw new Error(data.message || "Unable to load route");
  }

  return geometry.map(([lng, lat]) => [lat, lng]);
};
