import { useState, useEffect, useRef } from "react";
import { reverseGeocode } from "../utils/geolocation";

export const useGeolocation = () => {
  const [coords, setCoords] = useState(null);
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(false);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(false);
  const [positionError, setPositionError] = useState(null);
  const isRequesting = useRef(false);
  const currentRequest = useRef(null);

  useEffect(() => {
    // Check if geolocation is available
    console.log('Checking geolocation availability...');
    console.log('navigator.geolocation:', navigator.geolocation);
    
    if (!navigator.geolocation) {
      console.log('Geolocation not supported');
      setIsGeolocationAvailable(false);
      return;
    }
    
    console.log('Geolocation is available');
    setIsGeolocationAvailable(true);

    // Check permission status
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        console.log('Permission state:', result.state);
        setIsGeolocationEnabled(result.state === 'granted');
      }).catch(err => {
        console.log('Permission query failed:', err);
        // Don't set isGeolocationEnabled to false here, let the actual geolocation call determine it
      });
    } else {
      console.log('Permissions API not available');
    }
  }, []);

  const getLocationWithAddress = async () => {
    console.log('getLocationWithAddress called');
    console.log('isGeolocationAvailable:', isGeolocationAvailable);
    console.log('navigator.geolocation:', navigator.geolocation);
    
    // Always check geolocation availability directly
    if (!navigator.geolocation) {
      throw new Error('Geolocation not supported by this browser');
    }

    // Return existing promise if one is in progress
    if (currentRequest.current) {
      console.log('Geolocation request already in progress, returning existing promise...');
      return currentRequest.current;
    }

    // Return existing coords if available
    if (coords) {
      console.log('Using existing coordinates:', coords);
      return coords;
    }

    isRequesting.current = true;
    console.log('Requesting geolocation...');

    currentRequest.current = new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          console.log('Geolocation success:', position);
          try {
            console.log('Starting reverse geocoding...');
            const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
            console.log('Reverse geocoding result:', address);
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              address: address || 'Position actuelle',
              formatted_address: address || 'Position actuelle',
              source: 'gps'
            };
            console.log('Location object created:', location);
            setCoords(location);
            setIsGeolocationEnabled(true);
            setPositionError(null);
            isRequesting.current = false;
            currentRequest.current = null;
            resolve(location);
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            // Don't reject on reverse geocoding error, just use fallback address
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
              address: 'Position actuelle',
              formatted_address: 'Position actuelle',
              source: 'gps'
            };
            console.log('Using fallback location:', location);
            setCoords(location);
            setIsGeolocationEnabled(true);
            setPositionError(null);
            isRequesting.current = false;
            currentRequest.current = null;
            resolve(location);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          
          // Don't reject if we're already processing a successful request
          if (!isRequesting.current) {
            console.log('Ignoring error - request already completed');
            return;
          }
          
          let errorMessage = 'Unable to detect your location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please allow location access and try again.';
              setIsGeolocationEnabled(false);
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your GPS settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            default:
              errorMessage = `An unknown error occurred while retrieving location. Code: ${error.code}, Message: ${error.message}`;
              break;
          }
          setPositionError({ message: errorMessage });
          isRequesting.current = false;
          currentRequest.current = null;
          reject(new Error(errorMessage));
        },
        { 
          enableHighAccuracy: true, 
          timeout: 10000, 
          maximumAge: 300000 // 5 minutes
        }
      );

      // Add a timeout to prevent hanging
      setTimeout(() => {
        if (isRequesting.current) {
          console.log('Geolocation request timed out');
          isRequesting.current = false;
          currentRequest.current = null;
          reject(new Error('Geolocation request timed out'));
        }
      }, 12000);
    });

    return currentRequest.current;
  };

  const resetRequest = () => {
    isRequesting.current = false;
    currentRequest.current = null;
  };

  return {
    coords,
    isGeolocationAvailable,
    isGeolocationEnabled,
    positionError,
    getLocationWithAddress,
    resetRequest
  };
};
