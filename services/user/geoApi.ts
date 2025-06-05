import axios from "axios";
import { api } from "../api";

const geoApi = {
  searchAddress: async (query: string): Promise<any[]> => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`,
        {
          headers: { 'User-Agent': 'Rideezy/1.0 (alameen.alameen8086@gmail.com)' }
        }
      );
      if (response.status !== 200) throw new Error(`Nominatim request failed with status ${response.status}`);
      const data = response.data;
      return data.filter((result: any) => result.address && result.address.state === 'Kerala');
    } catch (error) {
      console.error(`Error searching address: ${error}`);
      throw error;
    }
  },

 calculateRoute: async (startPoint: string, endPoint: string): Promise<any> => {
  try {
    const [startLat, startLng] = startPoint.split(',').map(Number);
    const [endLat, endLng] = endPoint.split(',').map(Number);
    const response = await api.post("/route", {
      startPoint: `${startLng},${startLat}`,
      endPoint: `${endLng},${endLat}`
    });
    console.log('Route API response:', response.data); // Debug log
    if (!response.data.geometry || !response.data.geometry.coordinates) {
      throw new Error('Invalid route data');
    }
    return response.data;
  } catch (error) {
    console.error(`Error calculating route: ${error}`);
    throw error;
  }
},
};

export { geoApi }; 