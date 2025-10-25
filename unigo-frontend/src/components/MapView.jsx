import React, { useRef, useEffect, useState, useCallback } from 'react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Car, Users, Clock, DollarSign, Navigation } from 'lucide-react';
import { calculateDistance, formatDistance } from '../utils/geolocation';

const MAPBOX_TOKEN = "pk.eyJ1IjoidW5pZ29vIiwiYSI6ImNtZ3kxbzBieDByeW8yanNpdDExaWo1dmYifQ.fqm3Md25JgOl7nPYFz9wmQ"

const MapView = ({ 
  trips = [], 
  onLocationSelect, 
  selectedTrip, 
  onTripSelect,
  searchCenter = { lat: 33.9981, lng: -6.8167 }, // Rabat center
  searchRadius = 20, // km
  currentLocation = null,
  routeData = null,
  selectedDeparture = null,
  selectedArrival = null,
  onPointSelect = null, // New prop for handling point selection
  selectionMode = null // 'departure', 'arrival', or null
}) => {
  const mapRef = useRef();
  const [viewState, setViewState] = useState({
    longitude: currentLocation?.lng || searchCenter.lng,
    latitude: currentLocation?.lat || searchCenter.lat,
    zoom: 12
  });

  useEffect(() => {
    if (currentLocation) {
      setViewState(prev => ({
        ...prev,
        longitude: currentLocation.lng,
        latitude: currentLocation.lat,
        zoom: 13
      }));
    }
  }, [currentLocation]);

  useEffect(() => {
    if (selectedDeparture && selectedArrival) {
      const departure = selectedDeparture.coordinates;
      const arrival = selectedArrival.coordinates;
      
      const minLng = Math.min(departure.lng, arrival.lng);
      const maxLng = Math.max(departure.lng, arrival.lng);
      const minLat = Math.min(departure.lat, arrival.lat);
      const maxLat = Math.max(departure.lat, arrival.lat);
      
      const padding = 0.01; // degrees
      const bounds = {
        minLng: minLng - padding,
        maxLng: maxLng + padding,
        minLat: minLat - padding,
        maxLat: maxLat + padding
      };
      
      const centerLng = (bounds.minLng + bounds.maxLng) / 2;
      const centerLat = (bounds.minLat + bounds.maxLat) / 2;
      
      const distance = calculateDistance(departure.lat, departure.lng, arrival.lat, arrival.lng);
      let zoom = 12;
      if (distance < 5) zoom = 14;
      else if (distance < 10) zoom = 13;
      else if (distance < 25) zoom = 12;
      else if (distance < 50) zoom = 11;
      else zoom = 10;
      
      setViewState(prev => ({
        ...prev,
        longitude: centerLng,
        latitude: centerLat,
        zoom: zoom
      }));
    }
  }, [selectedDeparture, selectedArrival]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [showTripDetails, setShowTripDetails] = useState(null);

  const defaultViewport = {
    longitude: -6.8167,
    latitude: 33.9981,
    zoom: 11
  };

  const handleMapClick = useCallback(async (event) => {
    const { lngLat } = event;
    
    if (selectionMode && onPointSelect) {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lngLat.lat}&lon=${lngLat.lng}&addressdetails=1&accept-language=fr`,
          {
            headers: {
              'User-Agent': 'Unigoo/1.0'
            }
          }
        );
        
        let address = `Position: ${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`;
        if (response.ok) {
          const data = await response.json();
          if (data && data.display_name) {
            address = data.display_name;
          }
        }
        
        const location = {
          lat: lngLat.lat,
          lng: lngLat.lng,
          address: address,
          coordinates: { lat: lngLat.lat, lng: lngLat.lng }
        };
        
        onPointSelect(location, selectionMode);
      } catch (error) {
        console.error('Error getting address for clicked location:', error);
        const location = {
          lat: lngLat.lat,
          lng: lngLat.lng,
          address: `Position: ${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`,
          coordinates: { lat: lngLat.lat, lng: lngLat.lng }
        };
        onPointSelect(location, selectionMode);
      }
    } else if (onLocationSelect) {
      const location = {
        lat: lngLat.lat,
        lng: lngLat.lng,
        address: `Location: ${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`
      };
      setSelectedLocation(location);
      onLocationSelect(location);
    }
  }, [onLocationSelect, onPointSelect, selectionMode]);

  const handleTripClick = useCallback((trip) => {
    setShowTripDetails(trip);
    if (onTripSelect) {
      onTripSelect(trip);
    }
  }, [onTripSelect]);


  const nearbyTrips = trips.filter(trip => {
    if (!trip.departure?.coordinates || !trip.arrival?.coordinates) return false;
    
    const departureDistance = calculateDistance(
      searchCenter.lat, searchCenter.lng,
      trip.departure.coordinates.lat, trip.departure.coordinates.lng
    );
    
    const arrivalDistance = calculateDistance(
      searchCenter.lat, searchCenter.lng,
      trip.arrival.coordinates.lat, trip.arrival.coordinates.lng
    );
    
    return departureDistance <= searchRadius || arrivalDistance <= searchRadius;
  });

  const getTripMarkerColor = (trip) => {
    if (trip.available_seats === 0) return '#ef4444'; // Red for full
    if (trip.price_per_seat <= 10) return '#22c55e'; // Green for cheap
    if (trip.price_per_seat <= 20) return '#f59e0b'; // Yellow for medium
    return '#3b82f6'; // Blue for expensive
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Demain";
    } else {
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      });
    }
  };

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        onClick={handleMapClick}
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        attributionControl={false}
      >
        <Source
          id="search-radius"
          type="geojson"
          data={{
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [searchCenter.lng, searchCenter.lat]
            },
            properties: {}
          }}
        >
          <Layer
            id="search-radius-circle"
            type="circle"
            paint={{
              "circle-radius": {
                stops: [
                  [0, 0],
                  [20, searchRadius * 1000] // Convert km to meters
                ],
                base: 2
              },
              "circle-color": "#3b82f6",
              "circle-opacity": 0.1,
              "circle-stroke-color": "#3b82f6",
              "circle-stroke-width": 2,
              "circle-stroke-opacity": 0.3
            }}
          />
        </Source>

        {nearbyTrips.map((trip) => (
          <React.Fragment key={trip._id}>
            <Marker
              longitude={trip.departure.coordinates.lng}
              latitude={trip.departure.coordinates.lat}
              onClick={() => handleTripClick(trip)}
            >
              <div className="relative">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: getTripMarkerColor(trip) }}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-2 py-1 shadow-lg text-xs whitespace-nowrap">
                  <div className="font-semibold">{trip.departure.address}</div>
                  <div className="text-gray-600">{formatTime(trip.departure_time)}</div>
                </div>
              </div>
            </Marker>

            <Marker
              longitude={trip.arrival.coordinates.lng}
              latitude={trip.arrival.coordinates.lat}
              onClick={() => handleTripClick(trip)}
            >
              <div className="relative">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center cursor-pointer"
                  style={{ backgroundColor: getTripMarkerColor(trip) }}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg px-2 py-1 shadow-lg text-xs whitespace-nowrap">
                  <div className="font-semibold">{trip.arrival.address}</div>
                  <div className="text-gray-600">{formatTime(trip.arrival_time)}</div>
                </div>
              </div>
            </Marker>

            <Source
              id={`route-${trip._id}`}
              type="geojson"
              data={{
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [trip.departure.coordinates.lng, trip.departure.coordinates.lat],
                    [trip.arrival.coordinates.lng, trip.arrival.coordinates.lat]
                  ]
                },
                properties: {}
              }}
            >
              <Layer
                id={`route-line-${trip._id}`}
                type="line"
                paint={{
                  "line-color": getTripMarkerColor(trip),
                  "line-width": 3,
                  "line-opacity": 0.6
                }}
              />
            </Source>
          </React.Fragment>
        ))}

        {currentLocation && (
          <Marker
            longitude={currentLocation.lng}
            latitude={currentLocation.lat}
          >
            <div className="w-10 h-10 rounded-full border-4 border-blue-500 bg-blue-100 flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <MapPin className="w-3 h-3 text-white" />
              </div>
            </div>
          </Marker>
        )}

        {selectedDeparture && (
          <Marker
            longitude={selectedDeparture.coordinates.lng}
            latitude={selectedDeparture.coordinates.lat}
          >
            <div className="w-8 h-8 rounded-full border-4 border-green-500 bg-green-100 flex items-center justify-center shadow-lg">
              <MapPin className="w-4 h-4 text-green-600" />
            </div>
          </Marker>
        )}

        {selectedArrival && (
          <Marker
            longitude={selectedArrival.coordinates.lng}
            latitude={selectedArrival.coordinates.lat}
          >
            <div className="w-8 h-8 rounded-full border-4 border-red-500 bg-red-100 flex items-center justify-center shadow-lg">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
          </Marker>
        )}

        {selectedDeparture && selectedArrival && (
          <Marker
            longitude={(selectedDeparture.coordinates.lng + selectedArrival.coordinates.lng) / 2}
            latitude={(selectedDeparture.coordinates.lat + selectedArrival.coordinates.lat) / 2}
          >
            <div className="bg-white rounded-full px-3 py-1 shadow-lg border-2 border-blue-500 flex items-center gap-1">
              <Navigation className="w-3 h-3 text-blue-500" />
              <span className="text-sm font-semibold text-blue-600">
                {formatDistance(calculateDistance(
                  selectedDeparture.coordinates.lat,
                  selectedDeparture.coordinates.lng,
                  selectedArrival.coordinates.lat,
                  selectedArrival.coordinates.lng
                ))}
              </span>
            </div>
          </Marker>
        )}

        {selectedDeparture && selectedArrival && (
          <Source
            id="direct-route"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [
                  [selectedDeparture.coordinates.lng, selectedDeparture.coordinates.lat],
                  [selectedArrival.coordinates.lng, selectedArrival.coordinates.lat]
                ]
              },
              properties: {}
            }}
          >
            <Layer
              id="direct-route-shadow"
              type="line"
              paint={{
                "line-color": "#1e40af",
                "line-width": 6,
                "line-opacity": 0.3
              }}
            />
            <Layer
              id="direct-route-line"
              type="line"
              paint={{
                "line-color": "#3b82f6",
                "line-width": 4,
                "line-opacity": 0.9,
                "line-dasharray": [3, 3]
              }}
            />
          </Source>
        )}

        {routeData && routeData.coordinates && (
          <Source
            id="route"
            type="geojson"
            data={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeData.coordinates
              },
              properties: {}
            }}
          >
            <Layer
              id="route-line"
              type="line"
              paint={{
                "line-color": "#10b981",
                "line-width": 3,
                "line-opacity": 0.9
              }}
            />
          </Source>
        )}

        {selectedLocation && (
          <Marker
            longitude={selectedLocation.lng}
            latitude={selectedLocation.lat}
          >
            <div className="w-8 h-8 rounded-full border-4 border-blue-500 bg-blue-100 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
          </Marker>
        )}

        {showTripDetails && (
          <Popup
            longitude={showTripDetails.departure.coordinates.lng}
            latitude={showTripDetails.departure.coordinates.lat}
            onClose={() => setShowTripDetails(null)}
            closeButton={true}
            closeOnClick={false}
            className="trip-popup"
          >
            <div className="p-4 min-w-[300px]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Voyage {showTripDetails.trip_id}
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">
                    {showTripDetails.available_seats}/{showTripDetails.total_seats} places
                  </span>
                  <Users className="w-4 h-4 text-gray-500" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="w-0.5 h-8 bg-gray-300 mt-1"></div>
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {showTripDetails.departure.address}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(showTripDetails.departure_time)} à {formatTime(showTripDetails.departure_time)}
                    </div>
                    <div className="mt-2 font-medium text-gray-900">
                      {showTripDetails.arrival.address}
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatDate(showTripDetails.arrival_time)} à {formatTime(showTripDetails.arrival_time)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="font-semibold text-green-600">
                        {showTripDetails.price_per_seat} MAD
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {showTripDetails.estimated_duration} min
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Car className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">
                        {showTripDetails.distance_km} km
                      </span>
                    </div>
                  </div>
                </div>

                {showTripDetails.driver_id && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {showTripDetails.driver_id.first_name?.[0]}{showTripDetails.driver_id.last_name?.[0]}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {showTripDetails.driver_id.first_name} {showTripDetails.driver_id.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Conducteur vérifié
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      console.log('Book trip:', showTripDetails._id);
                    }}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Réserver maintenant
                  </button>
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>

      <div className="absolute top-4 right-4 space-y-2">
        <div className="bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm font-medium text-gray-700 mb-2">Légende</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>≤ 10 MAD</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span>11-20 MAD</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>&gt; 20 MAD</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span>Complet</span>
            </div>
          </div>
        </div>
      </div>

      {selectionMode && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white rounded-lg shadow-lg p-3 max-w-xs">
          <div className="flex items-center gap-2 mb-2">
            <MapPin className="w-4 h-4" />
            <span className="font-semibold">
              {selectionMode === 'departure' ? 'Sélectionner le départ' : 'Sélectionner l\'arrivée'}
            </span>
          </div>
          <p className="text-sm opacity-90">
            Cliquez sur la carte pour choisir {selectionMode === 'departure' ? 'votre point de départ' : 'votre point d\'arrivée'}
          </p>
        </div>
      )}

      <div className="absolute bottom-4 left-4">
        <div className="bg-white rounded-lg shadow-lg px-4 py-2">
          <div className="text-sm font-medium text-gray-700">
            {nearbyTrips.length} voyage{nearbyTrips.length !== 1 ? 's' : ''} trouvé{nearbyTrips.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
