export const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported by this browser'))
      return
    }

    // Check if geolocation is available
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'denied') {
          reject(new Error('Geolocation permission denied. Please enable location access in your browser settings.'))
          return
        }
      })
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        console.log('Location detected:', position.coords)
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        })
      },
      error => {
        console.error('Geolocation error:', error)
        let errorMessage = 'Unable to detect your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access and try again.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable. Please check your GPS settings.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Please try again.'
            break
          default:
            errorMessage = 'An unknown error occurred while retrieving location.'
            break
        }
        reject(new Error(errorMessage))
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 300000 // 5 minutes
      }
    )
  })
}

export const getCurrentLocationWithAddress = async () => {
  try {
    const position = await getCurrentPosition()
    const address = await reverseGeocode(position.lat, position.lng)
    return {
      ...position,
      address: address || 'Position actuelle',
      formatted_address: address || 'Position actuelle'
    }
  } catch (error) {
    console.error('Error getting location:', error)
    throw error
  }
}

export const reverseGeocode = async (lat, lng) => {
  try {
    // Using OpenStreetMap Nominatim API (free, no API key required)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=fr`,
      {
        headers: {
          'User-Agent': 'Unigoo/1.0'
        }
      }
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    if (data && data.display_name) {
      // Extract city and district information
      const parts = data.display_name.split(', ')
      let address = parts[0] // Street name or first part
      if (parts.length > 1) {
        address = `${parts[0]}, ${parts[1]}` // Street, District
      }
      return address
    }
    return null
  } catch (error) {
    console.error('Reverse geocoding error:', error)
    // Return a fallback address based on coordinates
    return `Position: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }
}

export const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const isWithinRadius = (userLat, userLng, targetLat, targetLng, radiusKm) => {
  const distance = calculateDistance(userLat, userLng, targetLat, targetLng)
  return distance <= radiusKm
}

export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`
  } else {
    return `${distanceKm.toFixed(1)}km`
  }
}

export const getRoutePolyline = async (startLat, startLng, endLat, endLng) => {
  try {
    // For now, return a simple straight line between points
    // In production, you would use a proper routing service
    return [
      [startLng, startLat],
      [endLng, endLat]
    ]
  } catch (error) {
    console.error('Route calculation error:', error)
    return null
  }
}

export const getEstimatedDuration = (distanceKm) => {
  // Rough estimation: 30 km/h average in city
  const averageSpeed = 30
  return Math.round((distanceKm / averageSpeed) * 60) // in minutes
}

// GPS-only location detection with better error handling
export const getLocationWithFallback = async () => {
  try {
    // Try GPS location detection
    return await getCurrentLocationWithAddress()
  } catch (gpsError) {
    console.warn('GPS location failed, using default location:', gpsError.message)
    // Fallback to Rabat if GPS fails
    return {
      lat: 33.9981,
      lng: -6.8167,
      accuracy: 0,
      timestamp: Date.now(),
      address: 'Rabat, Maroc',
      formatted_address: 'Rabat, Maroc',
      source: 'default'
    }
  }
}

// Search for places using Geoapify API for better autocomplete
export const searchPlaces = async (query, limit = 10) => {
  try {
    if (!query || query.length < 2) return []
    
    const GEOAPIFY_API_KEY = 'b49000acb3474af0ac3d4a5fdb0b9afe'
    
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&apiKey=${GEOAPIFY_API_KEY}&limit=${limit}&lang=fr&filter=countrycode:ma&bias=countrycode:ma`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.features) return []
    
    return data.features.map((feature, index) => {
      const properties = feature.properties
      const geometry = feature.geometry
      
      return {
        id: `place_${index}`,
        name: properties.name || properties.formatted.split(',')[0],
        full_address: properties.formatted,
        type: getGeoapifyPlaceType(properties),
        city: properties.city || properties.county || 'Inconnu',
        district: properties.suburb || properties.district || '',
        coordinates: {
          lat: geometry.coordinates[1],
          lng: geometry.coordinates[0]
        },
        address: properties.formatted,
        importance: properties.rank?.importance || 0,
        source: 'geoapify'
      }
    }).sort((a, b) => b.importance - a.importance)
    
  } catch (error) {
    console.error('Place search error:', error)
    // Fallback to OpenStreetMap if Geoapify fails
    return await searchPlacesFallback(query, limit)
  }
}

// Fallback to OpenStreetMap if Geoapify fails
const searchPlacesFallback = async (query, limit = 10) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=${limit}&addressdetails=1&accept-language=fr&countrycodes=ma&bounded=1&viewbox=-7.5,33.5,-6.0,35.0`,
      {
        headers: {
          'User-Agent': 'Unigoo/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    return data.map((place, index) => ({
      id: `place_${index}`,
      name: place.display_name.split(',')[0],
      full_address: place.display_name,
      type: getPlaceType(place.type, place.class),
      city: place.address?.city || place.address?.town || place.address?.village || 'Inconnu',
      district: place.address?.suburb || place.address?.quarter || place.address?.neighbourhood || '',
      coordinates: {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon)
      },
      address: place.display_name,
      importance: place.importance || 0,
      source: 'nominatim'
    })).sort((a, b) => b.importance - a.importance)
    
  } catch (error) {
    console.error('Fallback place search error:', error)
    return []
  }
}

// Determine place type based on Geoapify data
const getGeoapifyPlaceType = (properties) => {
  const categories = properties.categories || []
  const type = properties.type || ''
  
  // Map Geoapify categories to French place types
  const categoryMap = {
    'amenity.university': 'université',
    'amenity.school': 'école',
    'amenity.hospital': 'hôpital',
    'amenity.restaurant': 'restaurant',
    'amenity.cafe': 'café',
    'amenity.bank': 'banque',
    'amenity.pharmacy': 'pharmacie',
    'amenity.fuel': 'station-service',
    'tourism.hotel': 'hôtel',
    'tourism.attraction': 'attraction',
    'tourism.museum': 'musée',
    'shop.mall': 'centre commercial',
    'shop.supermarket': 'supermarché',
    'shop.clothes': 'boutique',
    'public_transport.bus_stop': 'arrêt de bus',
    'public_transport.bus_station': 'gare routière',
    'public_transport.tram_stop': 'arrêt de tram',
    'public_transport.railway_station': 'gare',
    'building.university': 'université',
    'building.school': 'école',
    'building.hospital': 'hôpital',
    'building.hotel': 'hôtel',
    'building.shop': 'magasin',
    'highway.bus_stop': 'arrêt de bus',
    'railway.station': 'gare',
    'railway.tram_stop': 'arrêt de tram'
  }
  
  // Check categories first
  for (const category of categories) {
    if (categoryMap[category]) {
      return categoryMap[category]
    }
  }
  
  // Fallback to type
  const typeMap = {
    'university': 'université',
    'school': 'école',
    'hospital': 'hôpital',
    'restaurant': 'restaurant',
    'cafe': 'café',
    'bank': 'banque',
    'pharmacy': 'pharmacie',
    'fuel': 'station-service',
    'hotel': 'hôtel',
    'attraction': 'attraction',
    'museum': 'musée',
    'mall': 'centre commercial',
    'supermarket': 'supermarché',
    'shop': 'magasin',
    'bus_stop': 'arrêt de bus',
    'bus_station': 'gare routière',
    'tram_stop': 'arrêt de tram',
    'railway_station': 'gare',
    'city': 'ville',
    'town': 'ville',
    'village': 'village',
    'suburb': 'quartier',
    'neighbourhood': 'quartier'
  }
  
  return typeMap[type] || 'lieu'
}

// Determine place type based on OSM data
const getPlaceType = (type, className) => {
  const typeMap = {
    'amenity': {
      'university': 'université',
      'school': 'école',
      'hospital': 'hôpital',
      'restaurant': 'restaurant',
      'cafe': 'café',
      'bank': 'banque',
      'pharmacy': 'pharmacie',
      'fuel': 'station-service'
    },
    'tourism': {
      'hotel': 'hôtel',
      'attraction': 'attraction',
      'museum': 'musée'
    },
    'shop': {
      'mall': 'centre commercial',
      'supermarket': 'supermarché',
      'clothes': 'boutique'
    },
    'highway': {
      'bus_stop': 'arrêt de bus',
      'bus_station': 'gare routière'
    },
    'railway': {
      'station': 'gare',
      'tram_stop': 'arrêt de tram'
    },
    'place': {
      'city': 'ville',
      'town': 'ville',
      'village': 'village',
      'suburb': 'quartier',
      'neighbourhood': 'quartier'
    }
  }
  
  return typeMap[className]?.[type] || type || 'lieu'
}

// Enhanced geocoding for any address using Geoapify
export const geocodeAddress = async (address) => {
  try {
    const GEOAPIFY_API_KEY = 'b49000acb3474af0ac3d4a5fdb0b9afe'
    
    const response = await fetch(
      `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&apiKey=${GEOAPIFY_API_KEY}&limit=1&lang=fr&filter=countrycode:ma&bias=countrycode:ma`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]
      const properties = feature.properties
      const geometry = feature.geometry
      
      return {
        lat: geometry.coordinates[1],
        lng: geometry.coordinates[0],
        address: properties.formatted,
        formatted_address: properties.formatted,
        city: properties.city || properties.county || 'Inconnu',
        district: properties.suburb || properties.district || '',
        type: getGeoapifyPlaceType(properties),
        source: 'geoapify'
      }
    }
    
    return null
  } catch (error) {
    console.error('Geocoding error:', error)
    // Fallback to OpenStreetMap if Geoapify fails
    return await geocodeAddressFallback(address)
  }
}

// Fallback geocoding using OpenStreetMap
const geocodeAddressFallback = async (address) => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1&accept-language=fr&countrycodes=ma&bounded=1&viewbox=-7.5,33.5,-6.0,35.0`,
      {
        headers: {
          'User-Agent': 'Unigoo/1.0'
        }
      }
    )
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data && data.length > 0) {
      const place = data[0]
      return {
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
        address: place.display_name,
        formatted_address: place.display_name,
        city: place.address?.city || place.address?.town || place.address?.village || 'Inconnu',
        district: place.address?.suburb || place.address?.quarter || place.address?.neighbourhood || '',
        type: getPlaceType(place.type, place.class),
        source: 'nominatim'
      }
    }
    
    return null
  } catch (error) {
    console.error('Fallback geocoding error:', error)
    return null
  }
}