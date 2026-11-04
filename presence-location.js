const DEFAULT_RADIUS_METERS = 250;
const MAX_ACCURACY_METERS = 100;
function distanceMeters(a, b) {
  if (![a?.latitude, a?.longitude, b?.latitude, b?.longitude].every(Number.isFinite)) return null;
  const rad = n => n * Math.PI / 180, dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function assessLocation(station, point, radius = DEFAULT_RADIUS_METERS) {
  const distance = distanceMeters(station, point);
  if (distance == null || !Number.isFinite(point.accuracy) || point.accuracy <= 0 || point.accuracy > MAX_ACCURACY_METERS)
    return { distance, verificationStatus: 'uncertain', quality: false };
  if (distance + point.accuracy <= radius) return { distance, verificationStatus: 'ok', quality: true };
  if (distance - point.accuracy > radius) return { distance, verificationStatus: 'suspicious', quality: true };
  return { distance, verificationStatus: 'uncertain', quality: false };
}
function checksDue(lastVehicleAt, checks = 0, now = Date.now()) {
  const base = Date.parse(lastVehicleAt);
  return Number.isFinite(base) && now - base >= (checks + 1) * 10 * 60 * 1000;
}
module.exports = { DEFAULT_RADIUS_METERS, MAX_ACCURACY_METERS, distanceMeters, assessLocation, checksDue };
