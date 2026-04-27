/**
 * GeoJSON LineString geometry.
 * Represents a sequence of [longitude, latitude] coordinate pairs.
 * Used for route segment geometry between consecutive stops.
 *
 * @see https://tools.ietf.org/html/rfc7946#section-3.1.4
 */
export interface GeoJsonLineString {
  type: 'LineString';
  coordinates: Array<[number, number]>; // [lng, lat][]
}
