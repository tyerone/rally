export interface Checkpoint {
  name: string;
  area: string;
  n: number;
  color: string;
  lat: number;
  lng: number;
}

export const MAP_CENTER: [number, number] = [49.278, -122.818];
export const MAP_ZOOM = 13;

// Ported verbatim from Map.html's `CHECKPOINTS` const.
export const CHECKPOINTS: Checkpoint[] = [
  { name: "Lafarge Lake", area: "Coquitlam", n: 4, color: "#4FCBBB", lat: 49.2846, lng: -122.7932 },
  { name: "Rocky Point Park", area: "Port Moody", n: 5, color: "#7F60DC", lat: 49.286, lng: -122.856 },
  { name: "Coquitlam Centre", area: "Coquitlam", n: 3, color: "#F8C949", lat: 49.279, lng: -122.796 },
  { name: "Como Lake Park", area: "Coquitlam", n: 3, color: "#FF6B6B", lat: 49.256, lng: -122.846 },
  { name: "Brewers Row", area: "Port Moody", n: 4, color: "#E0A46B", lat: 49.2795, lng: -122.848 },
  { name: "Mundy Park", area: "Coquitlam", n: 2, color: "#5BC0A8", lat: 49.266, lng: -122.83 },
  { name: "Town Centre Park", area: "Coquitlam", n: 5, color: "#4C9BE0", lat: 49.281, lng: -122.789 },
];
