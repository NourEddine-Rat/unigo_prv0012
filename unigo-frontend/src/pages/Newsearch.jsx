import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search as SearchIcon, MapPin, Calendar, Clock, Filter, Navigation, Star, Users, DollarSign, Map, List, X, ChevronDown, ChevronUp, SlidersHorizontal, RefreshCw, Ban } from 'lucide-react'
import { districts, trips } from '../data/mockData'
import { calculateDistance, isWithinRadius, formatDistance, getRoutePolyline, getEstimatedDuration, searchPlaces, geocodeAddress } from '../utils/geolocation'
import { useGeolocation } from '../hooks/useGeolocation'
import useUniversities from '../hooks/useUniversities'
import MapView from '../components/MapView'
import toast from 'react-hot-toast'
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'
const BACKEND_BASE_URL = import.meta.env?.VITE_BACKEND_BASE_URL || (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL)
import { useAuth } from '../context/AuthContext'

const Search = () => {
  const { user } = useAuth()
  const { 
    coords, 
    isGeolocationAvailable, 
    isGeolocationEnabled, 
    positionError, 
    getLocationWithAddress,
    resetRequest
  } = useGeolocation()

  const [form, setForm] = useState({
departure: '',
arrival: '',
date: '',
time: '',
radius: 10,
max_price: 200,
min_seats: 1,
payment_mode: 'all',
non_smoke: false,
gender: 'all',
sort_by: 'departure_time',
sort_order: 'asc'
})
const [showFilters, setShowFilters] = useState(false)
const [filters, setFilters] = useState({
  // Trip filters
  priceRange: [0, 200],
  departureTime: 'all', // 'all', 'morning', 'afternoon', 'evening', 'night'
  tripType: 'all', // 'all', 'oneway', 'roundtrip'
  availableSeats: 1,
  paymentMethods: [], // ['cash', 'unicard', 'mixed']
  
  // Driver filters
  driverRating: 0, // minimum rating
  driverExperience: 'all', // 'all', 'new', 'experienced', 'expert'
  vehicleType: 'all', // 'all', 'car', 'van', 'bus'
  smokingPolicy: 'all', // 'all', 'smoking', 'non_smoking'
  genderPreference: 'all', // 'all', 'male', 'female'
  
  // Additional filters
  verifiedDriver: false,
  instantBooking: false,
  flexibleTiming: false
})
const [results, setResults] = useState([])
const [suggestions, setSuggestions] = useState({ departure: [], arrival: [] })
const [userLocation, setUserLocation] = useState(null)
const [currentStep, setCurrentStep] = useState('search') // 'search' or 'results'
const [selectedTrip, setSelectedTrip] = useState(null)
const [searchCenter, setSearchCenter] = useState({ lat: 33.9981, lng: -6.8167 })
const [isLoading, setIsLoading] = useState(false)
const [searchHistory, setSearchHistory] = useState([])
const [recentSearches, setRecentSearches] = useState([])
const [showSuggestions, setShowSuggestions] = useState(false)
const [activeField, setActiveField] = useState(null)
const [mapCenter, setMapCenter] = useState({ lat: 33.9981, lng: -6.8167 })
const [selectedDeparture, setSelectedDeparture] = useState(null)
const [selectedArrival, setSelectedArrival] = useState(null)
const [currentLocation, setCurrentLocation] = useState(null)
const [routeData, setRouteData] = useState(null)
const [isGettingLocation, setIsGettingLocation] = useState(false)
const [showLocationPermissionModal, setShowLocationPermissionModal] = useState(false)
const [locationError, setLocationError] = useState(null)
const [searchTimeout, setSearchTimeout] = useState(null)
const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
const [mapSelectionMode, setMapSelectionMode] = useState(null) // 'departure', 'arrival', or null
const { universities } = useUniversities()

// Close suggestions when clicking outside
useEffect(() => {
  const handleClickOutside = (event) => {
    if (showSuggestions && !event.target.closest('.suggestion-container')) {
      setShowSuggestions(false)
      setActiveField(null)
    }
  }

  document.addEventListener('mousedown', handleClickOutside)
  return () => {
    document.removeEventListener('mousedown', handleClickOutside)
  }
}, [showSuggestions])

// Booking modal state
const [showBookingModal, setShowBookingModal] = useState(false)
const [showSignupModal, setShowSignupModal] = useState(false)
const [bookingTrip, setBookingTrip] = useState(null)
const [bookingSeats, setBookingSeats] = useState(1)
const [bookingPayment, setBookingPayment] = useState('unicard') // 'unicard' | 'cash' | 'mixed'
const [bookingUniAmount, setBookingUniAmount] = useState(0)
const [isBooking, setIsBooking] = useState(false)

const allLocations = [...universities, ...districts]

const handleLocationClick = async () => {
setIsGettingLocation(true)
setLocationError(null)
try {
const location = await getLocationWithAddress()
setCurrentLocation(location)
setUserLocation(location)
setMapCenter([location.lng, location.lat])
setSearchCenter([location.lng, location.lat])
setForm({ ...form, departure: location.formatted_address })
setSelectedDeparture({ 
address: location.formatted_address, 
coordinates: { lat: location.lat, lng: location.lng }
})

toast.success('Position GPS détectée avec succès!')
} catch (error) {
console.error('Error getting location:', error)
setLocationError(error.message)
toast.error('Impossible de détecter votre position. Veuillez autoriser la géolocalisation.')
} finally {
setIsGettingLocation(false)
}
}

const requestLocationPermission = async () => {
setShowLocationPermissionModal(false)
setIsGettingLocation(true)
try {
// Try to get precise GPS location
const location = await getLocationWithAddress()
setCurrentLocation(location)
setUserLocation(location)
setMapCenter([location.lng, location.lat])
setSearchCenter([location.lng, location.lat])
setForm({ ...form, departure: location.formatted_address })
setSelectedDeparture({ 
address: location.formatted_address, 
coordinates: { lat: location.lat, lng: location.lng }
})
toast.success('Position GPS détectée!')
} catch (error) {
console.error('GPS location failed:', error)
setLocationError(error.message)
toast.error('Accès à la position refusé. Veuillez autoriser la géolocalisation dans les paramètres de votre navigateur.')
} finally {
setIsGettingLocation(false)
}
}

const handleLocationSelect = (location, type) => {
if (type === 'departure') {
setSelectedDeparture(location)
setForm({ ...form, departure: location.address })
} else if (type === 'arrival') {
setSelectedArrival(location)
setForm({ ...form, arrival: location.address })
}
setMapCenter(location.coordinates)

// Calculate route if both departure and arrival are selected
if (type === 'departure' && selectedArrival) {
calculateRoute(location.coordinates, selectedArrival.coordinates)
} else if (type === 'arrival' && selectedDeparture) {
calculateRoute(selectedDeparture.coordinates, location.coordinates)
}
}

const calculateRoute = async (start, end) => {
try {
const route = await getRoutePolyline(start.lat, start.lng, end.lat, end.lng)
if (route) {
setRouteData({
coordinates: route,
start: start,
end: end,
distance: calculateDistance(start.lat, start.lng, end.lat, end.lng),
duration: getEstimatedDuration(calculateDistance(start.lat, start.lng, end.lat, end.lng))
})
}
} catch (error) {
console.error('Error calculating route:', error)
}
}

const handleSearch = async () => {
setIsLoading(true)
try {
    // Debug logging
    console.log('🔍 Starting search with:', {
      departure: form.departure,
      arrival: form.arrival,
      date: form.date,
      time: form.time,
      max_price: form.max_price,
      min_seats: form.min_seats,
      selectedDeparture,
      selectedArrival
    })
    
// Save search to history
const searchQuery = {
departure: form.departure,
arrival: form.arrival,
date: form.date,
time: form.time,
timestamp: new Date().toISOString()
}
setSearchHistory(prev => [searchQuery, ...prev.slice(0, 4)])

    // Try API search first
    let apiResults = []
    try {
      const token = localStorage.getItem('unigo_token')
      const res = await fetch(`${API_BASE_URL}/trips`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      if (res.ok) {
        const data = await res.json()
        apiResults = Array.isArray(data) ? data : (Array.isArray(data.trips) ? data.trips : [])
        console.log('📡 API returned trips:', apiResults.length, 'trips')
        if (apiResults.length > 0) {
          console.log('📋 Sample trip data:', {
            departure: apiResults[0].departure?.address || apiResults[0].departure_text,
            arrival: apiResults[0].arrival?.address || apiResults[0].arrival_text,
            departure_time: apiResults[0].departure_time,
            price_per_seat: apiResults[0].price_per_seat,
            available_seats: apiResults[0].available_seats,
            total_seats: apiResults[0].total_seats
          })
        }
      } else {
        console.warn('API trips fetch failed with status', res.status)
      }
    } catch (e) {
      console.warn('API trips fetch error, falling back to mock data:', e)
    }

    let workingResults = []
    if (apiResults.length > 0) {
      // Filter by text or proximity
      workingResults = apiResults.filter(trip => {
        const depAddr = trip.departure?.address || trip.departure_text || ''
        const arrAddr = trip.arrival?.address || trip.arrival_text || ''
        
        // Enhanced text matching - try multiple approaches
        const matchDepText = !form.departure || (() => {
          const searchTerm = form.departure.toLowerCase().trim()
          const tripAddr = depAddr.toLowerCase().trim()
          
          if (!searchTerm || !tripAddr) return false
          
          // Direct substring match
          if (tripAddr.includes(searchTerm)) return true
          
          // Try matching against individual words (more flexible)
          const searchWords = searchTerm.split(/[\s,.-]+/).filter(w => w.length > 1)
          const tripWords = tripAddr.split(/[\s,.-]+/)
          
          console.log('🔍 Departure matching:', {
            searchTerm,
            tripAddr,
            searchWords,
            tripWords
          })
          
          // Check if most search words are found in trip address
          const matchingWords = searchWords.filter(word => 
            tripWords.some(tripWord => tripWord.includes(word))
          )
          
          // If no matches with word splitting, try more flexible matching
          if (matchingWords.length === 0 && searchWords.length > 0) {
            // Try matching any search word against any trip word (more flexible)
            const flexibleMatches = searchWords.filter(searchWord => 
              tripWords.some(tripWord => 
                tripWord.includes(searchWord) || searchWord.includes(tripWord)
              )
            )
            
            console.log('🔍 Flexible departure matching:', {
              searchWords,
              tripWords,
              flexibleMatches
            })
            
            if (flexibleMatches.length > 0) {
              return true
            }
          }
          
          const matchRatio = searchWords.length > 0 ? matchingWords.length / searchWords.length : 0
          
          // More lenient matching when trip address is much shorter than search term
          // This handles cases where user searches with full address but trip has short name
          const isTripMuchShorter = tripWords.length < searchWords.length * 0.5
          const isTripVeryShort = tripWords.length <= 2 && searchWords.length > 3
          const adjustedThreshold = isTripVeryShort ? 0.1 : (isTripMuchShorter ? 0.2 : 0.5) // 10% vs 20% vs 50% threshold
          const matches = matchRatio >= adjustedThreshold
          
          console.log('🔍 Departure match result:', {
            matchingWords,
            matchRatio,
            isTripMuchShorter,
            isTripVeryShort,
            adjustedThreshold,
            matches
          })
          
          return matches
        })()
        
        const matchArrText = !form.arrival || (() => {
          const searchTerm = form.arrival.toLowerCase().trim()
          const tripAddr = arrAddr.toLowerCase().trim()
          
          if (!searchTerm || !tripAddr) return false
          
          // Direct substring match
          if (tripAddr.includes(searchTerm)) return true
          
          // Try matching against individual words (more flexible)
          const searchWords = searchTerm.split(/[\s,.-]+/).filter(w => w.length > 1)
          const tripWords = tripAddr.split(/[\s,.-]+/)
          
          console.log('🔍 Arrival matching:', {
            searchTerm,
            tripAddr,
            searchWords,
            tripWords
          })
          
          // Check if most search words are found in trip address
          const matchingWords = searchWords.filter(word => 
            tripWords.some(tripWord => tripWord.includes(word))
          )
          
          // If no matches with word splitting, try more flexible matching
          if (matchingWords.length === 0 && searchWords.length > 0) {
            // Try matching any search word against any trip word (more flexible)
            const flexibleMatches = searchWords.filter(searchWord => 
              tripWords.some(tripWord => 
                tripWord.includes(searchWord) || searchWord.includes(tripWord)
              )
            )
            
            console.log('🔍 Flexible arrival matching:', {
              searchWords,
              tripWords,
              flexibleMatches
            })
            
            if (flexibleMatches.length > 0) {
              return true
            }
          }
          
          const matchRatio = searchWords.length > 0 ? matchingWords.length / searchWords.length : 0
          
          // More lenient matching when trip address is much shorter than search term
          // This handles cases where user searches with full address but trip has short name
          const isTripMuchShorter = tripWords.length < searchWords.length * 0.5
          const isTripVeryShort = tripWords.length <= 2 && searchWords.length > 3
          const adjustedThreshold = isTripVeryShort ? 0.1 : (isTripMuchShorter ? 0.2 : 0.5) // 10% vs 20% vs 50% threshold
          const matches = matchRatio >= adjustedThreshold
          
          console.log('🔍 Arrival match result:', {
            matchingWords,
            matchRatio,
            isTripMuchShorter,
            isTripVeryShort,
            adjustedThreshold,
            matches
          })
          
          return matches
        })()

        let matchDepProx = true
        let matchArrProx = true
        try {
          if (selectedDeparture?.coordinates && trip.departure?.coordinates) {
            const d = calculateDistance(
              selectedDeparture.coordinates.lat,
              selectedDeparture.coordinates.lng,
              trip.departure.coordinates.lat,
              trip.departure.coordinates.lng
            )
            matchDepProx = d <= form.radius
          }
          if (selectedArrival?.coordinates && trip.arrival?.coordinates) {
            const d2 = calculateDistance(
              selectedArrival.coordinates.lat,
              selectedArrival.coordinates.lng,
              trip.arrival.coordinates.lat,
              trip.arrival.coordinates.lng
            )
            matchArrProx = d2 <= form.radius
          }
        } catch (_) {}

        const matchDate = !form.date || (trip.departure_time && String(trip.departure_time).startsWith(form.date))
        const matchPrice = !form.max_price || (trip.price_per_seat || 0) <= form.max_price
        const matchSeats = !form.min_seats || (trip.available_seats || 0) >= form.min_seats
        
        const matches = (matchDepText || matchDepProx) && (matchArrText || matchArrProx) && matchDate && matchPrice && matchSeats
        
        // Debug all filter conditions for ALL trips
        console.log(`🔍 Trip ${apiResults.indexOf(trip) + 1} - All conditions:`, {
          tripId: trip._id || trip.id,
          depAddr: depAddr,
          arrAddr: arrAddr,
          searchDep: form.departure,
          searchArr: form.arrival,
          matchDepText,
          matchArrText,
          matchDepProx,
          matchArrProx,
          formDate: form.date,
          tripDepartureTime: trip.departure_time,
          matchDate,
          formMaxPrice: form.max_price,
          tripPricePerSeat: trip.price_per_seat,
          matchPrice,
          formMinSeats: form.min_seats,
          tripAvailableSeats: trip.available_seats,
          matchSeats,
          finalMatch: matches
        })
        
        return matches
      })

      console.log('🔍 After filtering:', {
        totalApiResults: apiResults.length,
        filteredResults: workingResults.length,
        workingResults: workingResults.map(t => ({
          id: t._id || t.id,
          departure: t.departure?.address || t.departure_text,
          arrival: t.arrival?.address || t.arrival_text
        }))
      })

      // Enrich with distance if possible
      workingResults = workingResults.map(trip => {
        let distance_km = trip.distance_km
        try {
          // Calculate distance between trip's departure and arrival points
          if (trip.departure?.coordinates && trip.arrival?.coordinates) {
            distance_km = calculateDistance(
              trip.departure.coordinates.lat,
              trip.departure.coordinates.lng,
              trip.arrival.coordinates.lat,
              trip.arrival.coordinates.lng
            )
          }
          // If no trip coordinates, try to calculate from selected points to trip departure
          else if (selectedDeparture?.coordinates && trip.departure?.coordinates) {
            distance_km = calculateDistance(
              selectedDeparture.coordinates.lat,
              selectedDeparture.coordinates.lng,
              trip.departure.coordinates.lat,
              trip.departure.coordinates.lng
            )
          }
        } catch (error) {
          console.warn('Distance calculation failed:', error)
        }
        return { ...trip, distance_km }
      })
    } else {
      // Fallback to mock data
let filtered = trips.filter(trip => {
const matchDeparture = !form.departure || trip.departure_text.toLowerCase().includes(form.departure.toLowerCase())
const matchArrival = !form.arrival || trip.arrival_text.toLowerCase().includes(form.arrival.toLowerCase())
const matchDate = !form.date || trip.date_time.startsWith(form.date)
const matchPrice = trip.price_per_seat <= form.max_price
const matchSeats = trip.available_seats >= form.min_seats
const matchPayment = form.payment_mode === 'all' || trip.payment_modes.includes(form.payment_mode)
const matchSmoke = !form.non_smoke || trip.tags.includes('non_smoke')
return matchDeparture && matchArrival && matchDate && matchPrice && matchSeats && matchPayment && matchSmoke
})

if (userLocation && form.departure === 'Ma position actuelle') {
filtered = filtered.map(trip => ({
...trip,
distance: calculateDistance(userLocation.lat, userLocation.lng, trip.departure_coords.lat, trip.departure_coords.lng)
})).filter(trip => trip.distance <= form.radius)
}

      workingResults = filtered.map(trip => {
        // Calculate actual trip distance between departure and arrival
        let tripDistance = 0
        try {
          if (trip.departure_coords && trip.arrival_coords) {
            tripDistance = calculateDistance(
              trip.departure_coords.lat,
              trip.departure_coords.lng,
              trip.arrival_coords.lat,
              trip.arrival_coords.lng
            )
          }
        } catch (error) {
          console.warn('Mock data distance calculation failed:', error)
        }

        return {
_id: trip.id,
trip_id: `TRIP_${trip.id}`,
departure: {
address: trip.departure_text,
coordinates: trip.departure_coords
},
arrival: {
address: trip.arrival_text,
coordinates: trip.arrival_coords
},
departure_time: trip.date_time,
          arrival_time: new Date(new Date(trip.date_time).getTime() + 30 * 60000).toISOString(),
price_per_seat: trip.price_per_seat,
total_seats: trip.total_seats || 4,
available_seats: trip.available_seats,
          distance_km: tripDistance,
estimated_duration: 30,
driver_id: {
first_name: trip.driver_name?.split(' ')[0] || 'John',
last_name: trip.driver_name?.split(' ')[1] || 'Doe',
profile_picture: trip.driver_avatar
},
...trip
        }
      })
    }

// Sort results
    const sortedResults = workingResults.sort((a, b) => {
if (form.sort_by === 'price_per_seat') {
        return form.sort_order === 'asc' ? (a.price_per_seat || 0) - (b.price_per_seat || 0) : (b.price_per_seat || 0) - (a.price_per_seat || 0)
} else if (form.sort_by === 'departure_time') {
return form.sort_order === 'asc' ? new Date(a.departure_time) - new Date(b.departure_time) : new Date(b.departure_time) - new Date(a.departure_time)
} else if (form.sort_by === 'distance') {
return form.sort_order === 'asc' ? (a.distance_km || 0) - (b.distance_km || 0) : (b.distance_km || 0) - (a.distance_km || 0)
}
return 0
})

    console.log('✅ Final results:', sortedResults.length, 'trips found')
    if (sortedResults.length > 0) {
      console.log('📋 First result:', {
        departure: sortedResults[0].departure?.address || sortedResults[0].departure_text,
        arrival: sortedResults[0].arrival?.address || sortedResults[0].arrival_text
      })
    }
    
    // Apply filters to the results
    const filteredResults = applyFilters(sortedResults)
    console.log('🔍 After filtering:', filteredResults.length, 'trips remain')
    
    setResults(filteredResults)
setCurrentStep('results')
    toast.success(`${filteredResults.length} voyage${filteredResults.length !== 1 ? 's' : ''} trouvé${filteredResults.length !== 1 ? 's' : ''}`)
} catch (error) {
console.error('Search error:', error)
toast.error('Erreur lors de la recherche')
} finally {
setIsLoading(false)
}
}

// Apply all filters to search results
const applyFilters = (trips) => {
  return trips.filter(trip => {
    // Price filter
    if (trip.price_per_seat < filters.priceRange[0] || trip.price_per_seat > filters.priceRange[1]) {
      return false
    }

    // Available seats filter
    if (trip.available_seats < filters.availableSeats) {
      return false
    }

    // Trip type filter
    if (filters.tripType !== 'all' && trip.type !== filters.tripType) {
      return false
    }

    // Payment methods filter
    if (filters.paymentMethods.length > 0) {
      const hasMatchingPayment = trip.payment_modes?.some(mode => filters.paymentMethods.includes(mode))
      if (!hasMatchingPayment) return false
    }

    // Departure time filter
    if (filters.departureTime !== 'all') {
      const hour = new Date(trip.departure_time).getHours()
      switch (filters.departureTime) {
        case 'morning': if (hour < 6 || hour >= 12) return false; break
        case 'afternoon': if (hour < 12 || hour >= 18) return false; break
        case 'evening': if (hour < 18 || hour >= 22) return false; break
        case 'night': if (hour < 22 && hour >= 6) return false; break
      }
    }

    // Driver rating filter
    if (filters.driverRating > 0 && trip.driver_id?.rating_average < filters.driverRating) {
      return false
    }

    // Driver experience filter
    if (filters.driverExperience !== 'all') {
      const totalTrips = trip.driver_id?.total_trips || 0
      switch (filters.driverExperience) {
        case 'new': if (totalTrips >= 10) return false; break
        case 'experienced': if (totalTrips < 10 || totalTrips >= 50) return false; break
        case 'expert': if (totalTrips < 50) return false; break
      }
    }

    // Smoking policy filter
    if (filters.smokingPolicy !== 'all') {
      const isNonSmoking = trip.tags?.includes('non_smoke') || trip.non_smoking
      if (filters.smokingPolicy === 'non_smoking' && !isNonSmoking) return false
      if (filters.smokingPolicy === 'smoking' && isNonSmoking) return false
    }

    // Gender preference filter
    if (filters.genderPreference !== 'all') {
      // Check if trip has female_only tag
      const isFemaleOnly = trip.tags?.includes('female_only')
      if (filters.genderPreference === 'female' && !isFemaleOnly) return false
      if (filters.genderPreference === 'male' && isFemaleOnly) return false
    }

    // Verified driver filter
    if (filters.verifiedDriver && trip.driver_id?.status !== 'active') {
      return false
    }

    return true
  })
}

// Filter update handlers
const updateFilter = (key, value) => {
  setFilters(prev => ({ ...prev, [key]: value }))
}

const togglePaymentMethod = (method) => {
  setFilters(prev => ({
    ...prev,
    paymentMethods: prev.paymentMethods.includes(method)
      ? prev.paymentMethods.filter(m => m !== method)
      : [...prev.paymentMethods, method]
  }))
}

const resetFilters = () => {
  setFilters({
    priceRange: [0, 200],
    departureTime: 'all',
    tripType: 'all',
    availableSeats: 1,
    paymentMethods: [],
    driverRating: 0,
    driverExperience: 'all',
    vehicleType: 'all',
    smokingPolicy: 'all',
    genderPreference: 'all',
    verifiedDriver: false,
    instantBooking: false,
    flexibleTiming: false
  })
  // Re-run search with reset filters
  if (currentStep === 'results') {
    handleSearch()
  }
}

// Apply filters to current results
const applyFiltersToResults = () => {
  // Re-run the search with current filters applied
  handleSearch()
}

const handleTripSelect = (trip) => {
setSelectedTrip(trip)
}

const openBookingModal = (trip) => {
  // Check if user account is verified and active
  if (!user) {
    setBookingTrip(trip)
    setShowSignupModal(true)
    return
  }
  
  if (user.status !== 'active') {
    toast.error('Votre compte n\'est pas encore actif. Vous ne pouvez pas réserver de trajets.')
    return
  }
  
  setBookingTrip(trip)
  setBookingSeats(1)
  setBookingPayment('unicard')
  setBookingUniAmount(trip?.price_per_seat || 0)
  setShowBookingModal(true)
}

const submitBooking = async () => {
  if (!bookingTrip) return
  try {
    setIsBooking(true)
    const total = (bookingTrip.price_per_seat || 0) * bookingSeats
    let unicard_amount = 0
    let cash_amount = 0
    if (bookingPayment === 'unicard') {
      unicard_amount = total
    } else if (bookingPayment === 'cash') {
      cash_amount = total
    } else {
      // mixed
      const ua = Number(bookingUniAmount)
      if (ua < 0 || ua > total) {
        toast.error('Montant UniCard invalide')
        setIsBooking(false)
        return
      }
      unicard_amount = ua
      cash_amount = total - ua
    }

    const token = localStorage.getItem('unigo_token')
    if (!token) {
      toast.error('Veuillez vous connecter')
      setIsBooking(false)
      return
    }

    const res = await fetch(`${API_BASE_URL}/trips/${bookingTrip._id || bookingTrip.id}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        seats_booked: bookingSeats,
        payment_method: bookingPayment === 'mixed' ? 'mixed' : bookingPayment,
        unicard_amount,
        cash_amount,
        passenger_notes: ''
      })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `Erreur HTTP ${res.status}`)
    }
    const data = await res.json()
    toast.success('Réservation effectuée!')
    setShowBookingModal(false)
  } catch (e) {
    console.error('Booking error:', e)
    toast.error(`Échec de la réservation: ${e.message}`)
  } finally {
    setIsBooking(false)
  }
}

const handleInputChange = (field, value) => {
setForm({ ...form, [field]: value })
setActiveField(field)

// Clear previous timeout
if (searchTimeout) {
clearTimeout(searchTimeout)
}

if ((field === 'departure' || field === 'arrival') && value.length > 1) {
// Show immediate results from predefined locations
const predefinedMatches = allLocations.filter(loc =>
loc.name.toLowerCase().includes(value.toLowerCase())
).slice(0, 3)

console.log('🔍 Input change:', { field, value, predefinedMatches: predefinedMatches.length })
setSuggestions({ ...suggestions, [field]: predefinedMatches })
setShowSuggestions(true)

// Debounce the geocoding search
const timeout = setTimeout(async () => {
setIsSearchingPlaces(true)
try {
const placeMatches = await searchPlaces(value, 7)
// Combine and deduplicate results
const allMatches = [...predefinedMatches, ...placeMatches]
const uniqueMatches = allMatches.filter((match, index, self) => 
index === self.findIndex(m => m.name === match.name && m.city === match.city)
).slice(0, 8)

setSuggestions({ ...suggestions, [field]: uniqueMatches })
} catch (error) {
console.error('Error searching places:', error)
} finally {
setIsSearchingPlaces(false)
}
}, 300) // 300ms delay

setSearchTimeout(timeout)
} else if (value.length === 0) {
// Only hide suggestions when input is completely empty
setSuggestions({ ...suggestions, [field]: [] })
setShowSuggestions(false)
setActiveField(null)
}
}

const selectSuggestion = (field, location) => {
// Use full address for better matching with database trips
const addressToUse = location.full_address || location.address || location.name
setForm({ ...form, [field]: addressToUse })
setSuggestions({ ...suggestions, [field]: [] })
setShowSuggestions(false)
setActiveField(null)

// Handle location selection for both predefined and geocoded places
const locationData = {
address: addressToUse,
coordinates: location.coordinates || location.coords
}

if (field === 'departure') {
setSelectedDeparture(locationData)
} else if (field === 'arrival') {
setSelectedArrival(locationData)
}

// Calculate route if both locations are selected
if (field === 'departure' && selectedArrival) {
calculateRoute(locationData.coordinates, selectedArrival.coordinates)
} else if (field === 'arrival' && selectedDeparture) {
calculateRoute(selectedDeparture.coordinates, locationData.coordinates)
}
}

const clearField = (field) => {
setForm({ ...form, [field]: '' })
setSuggestions({ ...suggestions, [field]: [] })
setShowSuggestions(false)
}

const swapLocations = () => {
setForm(prev => ({
...prev,
departure: prev.arrival,
arrival: prev.departure
}))
}

const quickSearch = (departure, arrival) => {
setForm(prev => ({
...prev,
departure,
arrival
}))
handleSearch()
}

const goBackToSearch = () => {
setCurrentStep('search')
}

const handleMapClick = (location) => {
// Handle map click for location selection
console.log('Map clicked:', location)
}

const handleMapPointSelect = (location, mode) => {
// Handle point selection from map
if (mode === 'departure') {
setSelectedDeparture(location)
setForm({ ...form, departure: location.address })
} else if (mode === 'arrival') {
setSelectedArrival(location)
setForm({ ...form, arrival: location.address })
}

// Calculate route if both locations are selected
if (mode === 'departure' && selectedArrival) {
calculateRoute(location.coordinates, selectedArrival.coordinates)
} else if (mode === 'arrival' && selectedDeparture) {
calculateRoute(selectedDeparture.coordinates, location.coordinates)
}

// Clear selection mode
setMapSelectionMode(null)
toast.success(`${mode === 'departure' ? 'Point de départ' : 'Point d\'arrivée'} sélectionné!`)
}

const startMapSelection = (mode) => {
setMapSelectionMode(mode)
toast(`Cliquez sur la carte pour sélectionner ${mode === 'departure' ? 'le départ' : 'l\'arrivée'}`, { duration: 3000 })
}

const cancelMapSelection = () => {
setMapSelectionMode(null)
toast('Sélection annulée')
}

useEffect(() => {
// Auto-get current location on page load with a small delay to ensure hook is initialized
const getInitialLocation = async () => {
// Wait a bit for the geolocation hook to initialize
await new Promise(resolve => setTimeout(resolve, 200))

// Only try once on page load
if (currentLocation) {
  console.log('Location already set, skipping initial location request');
  return;
}

setIsGettingLocation(true)
try {
console.log('Attempting to get initial location...')
const location = await getLocationWithAddress()
console.log('Initial location obtained:', location)
setCurrentLocation(location)
setUserLocation(location)
setMapCenter([location.lng, location.lat])
setSearchCenter([location.lng, location.lat])
setForm(prev => ({ ...prev, departure: location.formatted_address }))
setSelectedDeparture({ 
address: location.formatted_address, 
coordinates: { lat: location.lat, lng: location.lng }
})

toast.success('Position GPS détectée avec succès!')
} catch (error) {
console.error('Error getting initial location:', error)
// Fallback to Rabat if GPS fails
const fallbackLocation = {
lat: 33.9981,
lng: -6.8167,
accuracy: 0,
timestamp: Date.now(),
address: 'Rabat, Maroc',
formatted_address: 'Rabat, Maroc',
source: 'default'
}
setCurrentLocation(fallbackLocation)
setUserLocation(fallbackLocation)
setMapCenter([fallbackLocation.lng, fallbackLocation.lat])
setSearchCenter([fallbackLocation.lng, fallbackLocation.lat])
setForm(prev => ({ ...prev, departure: fallbackLocation.formatted_address }))
setSelectedDeparture({ 
address: fallbackLocation.formatted_address, 
coordinates: { lat: fallbackLocation.lat, lng: fallbackLocation.lng }
})
toast('Position par défaut (Rabat) - Cliquez sur le bouton GPS pour activer la géolocalisation', { duration: 5000 })
} finally {
setIsGettingLocation(false)
}
}

getInitialLocation()
}, [])

// Cleanup effect
useEffect(() => {
  return () => {
    resetRequest()
    if (searchTimeout) {
      clearTimeout(searchTimeout)
  }
  }
}, [resetRequest, searchTimeout])

return (
<div className="min-h-screen bg-gray-50">

{currentStep === 'search' ? (
<div className="h-screen flex flex-col relative">
{/* Full Screen Map Background */}
<div className="absolute inset-0 z-0">
<MapView
trips={[]}
onLocationSelect={(location) => handleMapClick(location)}
selectedTrip={null}
onTripSelect={() => {}}
searchCenter={mapCenter}
searchRadius={form.radius}
currentLocation={currentLocation}
routeData={routeData}
selectedDeparture={selectedDeparture}
selectedArrival={selectedArrival}
onPointSelect={handleMapPointSelect}
selectionMode={mapSelectionMode}
/>
</div>

{/* Dark Overlay */}
<div className="absolute inset-0 bg-black bg-opacity-20 z-10"></div>

{/* Header */}
<div className="relative z-20 flex items-center justify-between p-4 pt-12">
<div className="flex items-center">
<div className="text-2xl font-bold text-white">UNIGO</div>
</div>
<div className="flex items-center gap-3">
{/* Current Location Button */}
<button
onClick={handleLocationClick}
disabled={isGettingLocation}
className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
title="Ma position actuelle"
>
{isGettingLocation ? (
<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
) : (
<Navigation className="w-5 h-5 text-blue-500" />
)}
</button>

{/* Profile Icon */}
<div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
<i className="fas fa-user text-white"></i>
</div>
</div>
</div>

{/* Search Container - Uber Style */}
<div className="absolute bottom-0 left-0 right-0 z-20 transition-all duration-300">
<div className="bg-white rounded-t-3xl shadow-2xl">
{/* Handle Bar */}
<div className="flex justify-center pt-3 pb-2">
<div className="w-12 h-1 bg-gray-300 rounded-full"></div>
</div>

<div className="px-6 pb-6">
{/* Search Inputs */}
<div className="space-y-3">
{/* Pickup Location */}
<div className="relative">
<div className="flex items-center">
<div className="w-4 h-4 bg-blue-500 rounded-full mr-4 flex-shrink-0"></div>
<div className="flex-1">
<input
type="text"
value={form.departure || 'Ma position actuelle'}
onChange={(e) => handleInputChange('departure', e.target.value)}
onFocus={() => setActiveField('departure')}
placeholder="Ma position actuelle"
className="w-full text-lg font-medium bg-transparent border-none outline-none py-4 text-gray-800 placeholder-gray-500"
/>
{activeField === 'departure' && showSuggestions && (suggestions.departure || []).length > 0 && (
<motion.div 
initial={{ opacity: 0, y: -10 }} 
animate={{ opacity: 1, y: 0 }} 
exit={{ opacity: 0, y: -10 }}
className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto mt-2 z-50"
>
{(suggestions.departure || []).map(loc => (
<button 
key={loc.id} 
onClick={() => selectSuggestion('departure', loc)} 
className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
>
<div className="flex items-start gap-4">
<div className="flex-shrink-0 mt-1">
<MapPin className="w-5 h-5 text-blue-500" />
</div>
<div className="flex-1 min-w-0">
<p className="font-medium text-gray-800 text-lg">{loc.name}</p>
<p className="text-sm text-gray-500">
{loc.type && loc.type !== 'lieu' ? `${loc.type} • ` : ''}
{loc.city}
{loc.district && ` • ${loc.district}`}
</p>
{loc.full_address && loc.full_address !== loc.name && (
<p className="text-xs text-gray-400 truncate mt-1">{loc.full_address}</p>
)}
</div>
</div>
</button>
))}

{/* Loading indicator */}
{isSearchingPlaces && (
<div className="w-full px-4 py-4 text-center">
<div className="flex items-center justify-center gap-2 text-gray-500">
<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
<span className="text-sm">Recherche de lieux...</span>
</div>
</div>
)}
</motion.div>
)}
</div>
<div className="flex gap-2 ml-6">
{form.departure && (
<button 
onClick={() => clearField('departure')}
className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
>
<X className="w-4 h-4" />
</button>
)}
<button 
onClick={() => startMapSelection('departure')}
className="p-2 text-green-500 hover:text-green-600 transition-colors"
title="Sélectionner sur la carte"
>
<MapPin className="w-5 h-5" />
</button>
</div>
</div>
</div>

{/* Destination Location */}
<div className="relative">
<div className="flex items-center">
<div className="w-4 h-4 bg-red-500 rounded-full mr-4 flex-shrink-0"></div>
<div className="flex-1">
<input
type="text"
value={form.arrival}
onChange={(e) => handleInputChange('arrival', e.target.value)}
onFocus={() => setActiveField('arrival')}
placeholder="Où allez-vous ?"
className="w-full text-lg font-medium bg-transparent border-none outline-none py-4 text-gray-800 placeholder-gray-500"
/>
{activeField === 'arrival' && showSuggestions && (suggestions.arrival || []).length > 0 && (
<motion.div 
initial={{ opacity: 0, y: -10 }} 
animate={{ opacity: 1, y: 0 }} 
exit={{ opacity: 0, y: -10 }}
className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-80 overflow-y-auto mt-2 z-50"
>
{(suggestions.arrival || []).map(loc => (
<button 
key={loc.id} 
onClick={() => selectSuggestion('arrival', loc)} 
className="w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
>
<div className="flex items-start gap-4">
<div className="flex-shrink-0 mt-1">
<MapPin className="w-5 h-5 text-red-500" />
</div>
<div className="flex-1 min-w-0">
<p className="font-medium text-gray-800 text-lg">{loc.name}</p>
<p className="text-sm text-gray-500">
{loc.type && loc.type !== 'lieu' ? `${loc.type} • ` : ''}
{loc.city}
{loc.district && ` • ${loc.district}`}
</p>
{loc.full_address && loc.full_address !== loc.name && (
<p className="text-xs text-gray-400 truncate mt-1">{loc.full_address}</p>
)}
</div>
</div>
</button>
))}

{/* Loading indicator */}
{isSearchingPlaces && (
<div className="w-full px-4 py-4 text-center">
<div className="flex items-center justify-center gap-2 text-gray-500">
<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
<span className="text-sm">Recherche de lieux...</span>
</div>
</div>
)}
</motion.div>
)}
</div>
<div className="flex gap-2 ml-6">
{form.arrival && (
<button 
onClick={() => clearField('arrival')}
className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
>
<X className="w-4 h-4" />
</button>
)}
<button 
onClick={() => startMapSelection('arrival')}
className="p-2 text-red-500 hover:text-red-600 transition-colors"
title="Sélectionner sur la carte"
>
<MapPin className="w-5 h-5" />
</button>
<button 
onClick={swapLocations}
className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
title="Inverser départ et arrivée"
>
<RefreshCw className="w-5 h-5" />
</button>
</div>
</div>
</div>
</div>

{/* Date and Time Section */}
<div className="flex gap-4 py-4 border-t border-gray-200">
<div className="flex-1">
<label className="block text-sm font-medium text-gray-600 mb-2">Date</label>
<div className="relative">
<Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input 
type="date" 
value={form.date} 
onChange={(e) => setForm({ ...form, date: e.target.value })} 
className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white" 
/>
</div>
</div>

<div className="flex-1">
<label className="block text-sm font-medium text-gray-600 mb-2">Heure</label>
<div className="relative">
<Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input 
type="time" 
value={form.time} 
onChange={(e) => setForm({ ...form, time: e.target.value })} 
className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white" 
/>
</div>
</div>
</div>

{/* Route Information */}
{(selectedDeparture && selectedArrival) && (
<div className="mb-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
<div className="flex items-center gap-2 mb-2">
<MapPin className="w-4 h-4 text-blue-500" />
<span className="font-semibold text-blue-800">Itinéraire sélectionné</span>
</div>
<div className="flex gap-6 text-sm">
<div className="flex items-center gap-1">
<Clock className="w-4 h-4 text-blue-500" />
<span className="text-blue-700">
{routeData ? `${routeData.duration} min` : 
`${getEstimatedDuration(calculateDistance(
  selectedDeparture.coordinates.lat,
  selectedDeparture.coordinates.lng,
  selectedArrival.coordinates.lat,
  selectedArrival.coordinates.lng
))} min`}
</span>
</div>
<div className="flex items-center gap-1">
<Navigation className="w-4 h-4 text-blue-500" />
<span className="text-blue-700">
{formatDistance(calculateDistance(
  selectedDeparture.coordinates.lat,
  selectedDeparture.coordinates.lng,
  selectedArrival.coordinates.lat,
  selectedArrival.coordinates.lng
))}
</span>
</div>
</div>
<div className="mt-2 text-xs text-blue-600 truncate">
{selectedDeparture.address} → {selectedArrival.address}
</div>
</div>
)}

{/* Search Button */}
<button 
onClick={handleSearch} 
disabled={isLoading || !form.departure || !form.arrival}
className="w-full px-6 py-4 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
>
{isLoading ? (
<>
<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
Recherche...
</>
) : (
<>
<SearchIcon className="w-5 h-5" />
Rechercher des trajets
</>
)}
</button>

{/* Filter Toggle Button */}
<button
onClick={() => setShowFilters(!showFilters)}
className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all flex items-center justify-center gap-2 mt-3"
>
<SlidersHorizontal className="w-5 h-5" />
Filtres avancés
{showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
</button>

{/* Filters Panel */}
{showFilters && (
<motion.div
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: 'auto' }}
exit={{ opacity: 0, height: 0 }}
className="mt-4 p-6 bg-gray-50 rounded-xl border border-gray-200"
>
<div className="space-y-6">
{/* Price Range */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Prix maximum par place</label>
<div className="flex items-center gap-4">
<input
type="range"
min="0"
max="200"
value={filters.priceRange[1]}
onChange={(e) => updateFilter('priceRange', [0, parseInt(e.target.value)])}
className="flex-1"
/>
<span className="text-sm text-gray-600 min-w-[60px]">{filters.priceRange[1]} DH</span>
</div>
</div>

{/* Non-smoking */}
<div>
<label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
<input
type="checkbox"
checked={filters.smokingPolicy === 'non_smoking'}
onChange={(e) => updateFilter('smokingPolicy', e.target.checked ? 'non_smoking' : 'all')}
className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
/>
<span className="text-sm font-medium text-gray-700">🚭 Non-fumeur uniquement</span>
</label>
</div>

{/* Women Only */}
<div>
<label className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
<input
type="checkbox"
checked={filters.genderPreference === 'female'}
onChange={(e) => updateFilter('genderPreference', e.target.checked ? 'female' : 'all')}
className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
/>
<span className="text-sm font-medium text-gray-700">👩 Femme uniquement</span>
</label>
</div>

{/* Available Seats */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Places disponibles</label>
<div className="flex items-center gap-2">
<input
type="number"
min="1"
max="8"
value={filters.availableSeats}
onChange={(e) => updateFilter('availableSeats', parseInt(e.target.value))}
className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
/>
<span className="text-sm text-gray-600">places minimum</span>
</div>
</div>

{/* Driver Rating */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Note minimum du conducteur</label>
<div className="flex items-center gap-2">
<input
type="range"
min="0"
max="5"
step="0.5"
value={filters.driverRating}
onChange={(e) => updateFilter('driverRating', parseFloat(e.target.value))}
className="flex-1"
/>
<span className="text-sm text-gray-600 min-w-[40px]">{filters.driverRating}★</span>
</div>
</div>

{/* Filter Actions */}
<div className="flex gap-3 pt-4 border-t border-gray-200">
<button
onClick={resetFilters}
className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
>
Réinitialiser
</button>
<button
onClick={() => {
applyFiltersToResults()
setShowFilters(false)
}}
className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
>
Appliquer les filtres
</button>
</div>
</div>
</motion.div>
)}
</div>
</div>
</div>

{/* Map Controls Overlay */}
<div className="absolute top-20 right-4 z-30 space-y-2">
{mapSelectionMode && (
<button
onClick={cancelMapSelection}
className="bg-red-500 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all"
title="Annuler la sélection"
>
<X className="w-6 h-6" />
</button>
)}

{/* Location status indicator */}
{currentLocation && (
<div className="bg-white rounded-lg shadow-lg p-2 text-xs">
<div className="flex items-center gap-1 text-gray-600">
<MapPin className="w-3 h-3" />
<span>
{currentLocation.source === 'default' ? 'Rabat (défaut)' : 
 currentLocation.source === 'ip' ? 'Position IP' : 
 'GPS activé'}
</span>
</div>
</div>
)}
</div>

{/* Route Information Overlay */}
{(selectedDeparture && selectedArrival) && (
<div className="absolute top-20 left-4 bg-white rounded-lg shadow-lg p-4 max-w-xs z-30">
<div className="flex items-center gap-2 mb-2">
<MapPin className="w-4 h-4 text-blue-500" />
<span className="font-semibold text-gray-800">Itinéraire</span>
</div>
<div className="text-sm text-gray-600">
<div className="flex items-center gap-1 mb-1">
<Clock className="w-3 h-3" />
<span>
{routeData ? `${routeData.duration} min` : 
`${getEstimatedDuration(calculateDistance(
  selectedDeparture.coordinates.lat,
  selectedDeparture.coordinates.lng,
  selectedArrival.coordinates.lat,
  selectedArrival.coordinates.lng
))} min`}
</span>
</div>
<div className="flex items-center gap-1">
<Navigation className="w-3 h-3" />
<span>
{formatDistance(calculateDistance(
  selectedDeparture.coordinates.lat,
  selectedDeparture.coordinates.lng,
  selectedArrival.coordinates.lat,
  selectedArrival.coordinates.lng
))}
</span>
</div>
</div>
<div className="mt-2 text-xs text-gray-500 truncate">
{selectedDeparture.address} → {selectedArrival.address}
</div>
</div>
)}
</div>
) : (
  /* Results Page - Uber Style */
<div className="min-h-screen bg-gray-50">
{/* Header with back button */}
<div className="bg-white border-b border-gray-200 px-4 py-4">
<div className="max-w-4xl mx-auto flex items-center gap-4">
<button
onClick={goBackToSearch}
className="p-2 hover:bg-gray-100 rounded-full transition-colors"
>
<ChevronDown className="w-6 h-6 text-gray-600 rotate-90" />
</button>
<div className="flex-1">
<h1 className="text-xl font-semibold text-gray-800">Trajets trouvés</h1>
<p className="text-sm text-gray-500">{form.departure} → {form.arrival}</p>
</div>
<div className="flex items-center gap-4">
<button
onClick={() => setShowFilters(!showFilters)}
className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all flex items-center gap-2"
>
<SlidersHorizontal className="w-4 h-4" />
Filtres
</button>
<div className="text-right">
<p className="text-sm text-gray-500">{results.length} résultat{results.length !== 1 ? 's' : ''}</p>
</div>
</div>
</div>
</div>

{/* Simple Filters Panel for Results */}
{showFilters && (
<motion.div
initial={{ opacity: 0, height: 0 }}
animate={{ opacity: 1, height: 'auto' }}
exit={{ opacity: 0, height: 0 }}
className="bg-white border-b border-gray-200 px-4 py-6"
>
<div className="max-w-4xl mx-auto">
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
{/* Price Range - Simple */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Prix maximum par place</label>
<div className="flex items-center gap-4">
<input
type="range"
min="0"
max="200"
value={filters.priceRange[1]}
onChange={(e) => updateFilter('priceRange', [0, parseInt(e.target.value)])}
className="flex-1"
/>
<span className="text-sm text-gray-600 min-w-[60px]">{filters.priceRange[1]} DH</span>
</div>
</div>

{/* Non-smoking - Simple */}
<div>
<label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer">
<input
type="checkbox"
checked={filters.smokingPolicy === 'non_smoking'}
onChange={(e) => updateFilter('smokingPolicy', e.target.checked ? 'non_smoking' : 'all')}
className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
/>
<span className="text-sm font-medium text-gray-700">🚭 Non-fumeur</span>
</label>
</div>

{/* Women Only - Simple */}
<div>
<label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer">
<input
type="checkbox"
checked={filters.genderPreference === 'female'}
onChange={(e) => updateFilter('genderPreference', e.target.checked ? 'female' : 'all')}
className="w-5 h-5 text-blue-500 rounded focus:ring-blue-500"
/>
<span className="text-sm font-medium text-gray-700">👩 Femme uniquement</span>
</label>
</div>

{/* Available Seats - Simple */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Places disponibles</label>
<div className="flex items-center gap-2">
<input
type="number"
min="1"
max="8"
value={filters.availableSeats}
onChange={(e) => updateFilter('availableSeats', parseInt(e.target.value))}
className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
/>
<span className="text-sm text-gray-600">min</span>
</div>
</div>

{/* Driver Rating - Simple */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-3">Note minimum</label>
<div className="flex items-center gap-2">
<input
type="range"
min="0"
max="5"
step="0.5"
value={filters.driverRating}
onChange={(e) => updateFilter('driverRating', parseFloat(e.target.value))}
className="flex-1"
/>
<span className="text-sm text-gray-600 min-w-[40px]">{filters.driverRating}★</span>
</div>
</div>
</div>

{/* Filter Actions */}
<div className="flex gap-3 pt-4 border-t border-gray-200 mt-6">
<button
onClick={resetFilters}
className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
>
Réinitialiser
</button>
<button
onClick={() => {
applyFiltersToResults()
setShowFilters(false)
}}
className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
>
Appliquer les filtres
</button>
</div>
</div>
</motion.div>
)}

{/* Results List */}
<div className="max-w-4xl mx-auto p-4">
{results.length > 0 ? (
<div className="space-y-4">
{results.map((trip, index) => (
<motion.div 
key={trip._id} 
initial={{ opacity: 0, y: 20 }} 
animate={{ opacity: 1, y: 0 }}
transition={{ delay: index * 0.1 }}
className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100"
>
<div className="p-6">
<div className="flex flex-col lg:flex-row gap-6">
{/* Trip Info */}
<div className="flex-1">
<div className="flex items-start justify-between mb-4">
<div className="flex-1">
<div className="flex items-center gap-3 mb-3">
<div className="w-4 h-4 bg-green-500 rounded-full flex-shrink-0" />
<div>
<p className="font-semibold text-gray-800 text-lg">{trip.departure?.address || trip.departure_text}</p>
<p className="text-sm text-gray-500">Départ</p>
</div>
</div>
<div className="flex items-center gap-3">
<div className="w-4 h-4 bg-red-500 rounded-full flex-shrink-0" />
<div>
<p className="font-semibold text-gray-800 text-lg">{trip.arrival?.address || trip.arrival_text}</p>
<p className="text-sm text-gray-500">Arrivée</p>
</div>
</div>
</div>
<div className="text-right">
<p className="text-4xl font-bold text-blue-600">{trip.price_per_seat} MAD</p>
<p className="text-sm text-gray-500">par place</p>
{(trip.tags?.includes('non_smoke') || trip.tags?.includes('female_only')) && (
  <div className="flex justify-end gap-1 mt-1">
    {trip.tags?.includes('non_smoke') && <Ban className="w-3 h-3 text-red-500" />}
    {trip.tags?.includes('female_only') && <Users className="w-3 h-3 text-red-500" />}
  </div>
)}
</div>
</div>

{/* Trip Details */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
<div className="flex items-center gap-2 text-sm text-gray-600">
<Calendar className="w-4 h-4 text-blue-500" />
<span>{new Date(trip.departure_time || trip.date_time).toLocaleDateString('fr-FR')}</span>
</div>
<div className="flex items-center gap-2 text-sm text-gray-600">
<Clock className="w-4 h-4 text-blue-500" />
<span>{new Date(trip.departure_time || trip.date_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
</div>
<div className="flex items-center gap-2 text-sm text-gray-600">
<Users className="w-4 h-4 text-blue-500" />
<span>{(trip.total_seats || 0) - (trip.available_seats || 0)} réservée{(((trip.total_seats||0)-(trip.available_seats||0)) !== 1) ? 's' : ''} / {trip.total_seats} (dispo: {trip.available_seats})</span>
</div>
{trip.distance_km && (
<div className="flex items-center gap-2 text-sm text-gray-600">
<MapPin className="w-4 h-4 text-blue-500" />
<span>{trip.distance_km.toFixed(1)} km</span>
</div>
)}
</div>

{/* Tags */}
<div className="flex flex-wrap gap-2 mb-4">
{trip.tags?.map(tag => (
<span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
{tag === 'non_smoke' ? '🚭 Non-fumeur' : tag === 'female_only' ? '👩 Femmes uniquement' : tag}
</span>
))}
{trip.payment_modes?.map(mode => (
<span key={mode} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
{mode === 'cash' ? '💵 Cash' : mode === 'unicard' ? '💳 UniCard' : '💰 Mixte'}
</span>
))}
</div>

{/* Driver Info */}
{trip.driver_id && (
<div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
{(() => {
  const picture = trip.driver_id.profile_picture || trip.driver_id.selfie_url
  if (picture) {
    const isHttp = picture.startsWith('http')
    const src = isHttp ? picture : `${BACKEND_BASE_URL}/uploads/${picture.replace(/^\/?uploads\/?/, '')}`
    return (
      <img 
        src={src}
        alt="Conducteur"
        className="w-10 h-10 rounded-full object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
<div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
{trip.driver_id.first_name?.[0]}{trip.driver_id.last_name?.[0]}
</div>
  )
})()}
<div>
<p className="font-medium text-gray-800">{trip.driver_id.first_name?.toUpperCase()} {trip.driver_id.last_name?.toUpperCase()}</p>
<p className="text-sm text-gray-500">Conducteur vérifié</p>
</div>
<div className="ml-auto flex items-center gap-1">
<Star className="w-4 h-4 text-yellow-400 fill-current" />
<span className="text-sm font-medium text-gray-700">
{trip.driver_id.rating_average ? trip.driver_id.rating_average.toFixed(1) : '5.0'}
</span>
<span className="text-xs text-gray-500">
({trip.driver_id.rating_count || 0})
</span>
</div>
</div>
)}
</div>

{/* Actions */}
<div className="flex flex-col sm:flex-row gap-3 lg:w-64">
<Link 
to={`/trip/${trip._id}`} 
className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold text-center hover:shadow-lg transition-all"
>
Voir détails
</Link>
{trip.driver_id && (user?._id !== (trip.driver_id?._id || trip.driver_id?.id)) && (
  <Link to={`/chat/${trip.driver_id?._id || trip.driver_id?.id}`} className="px-6 py-3 border-2 border-blue-500 text-blue-500 rounded-xl font-semibold hover:bg-blue-50 transition-all">
Contacter
  </Link>
)}
</div>
</div>
</div>
<div className="mt-4 flex gap-3">
  <button onClick={() => openBookingModal(trip)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">Réserver</button>
  <Link to={`/trip/${trip._id}`} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Détails</Link>
</div>
</motion.div>
))}
</div>
) : (
<div className="text-center py-16">
<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
<SearchIcon className="w-12 h-12 text-gray-400" />
</div>
<h3 className="text-xl font-semibold text-gray-800 mb-2">Aucun trajet trouvé</h3>
<p className="text-gray-500 mb-6">Essayez d'ajuster vos critères de recherche.</p>
<button 
onClick={goBackToSearch}
className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors"
>
Modifier la recherche
</button>
</div>
)}
</div>
</div>
)}


{/* Location Permission Modal */}
<AnimatePresence>
{showLocationPermissionModal && (
<motion.div 
initial={{ opacity: 0 }} 
animate={{ opacity: 1 }} 
exit={{ opacity: 0 }}
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
<motion.div 
initial={{ scale: 0.9, opacity: 0 }} 
animate={{ scale: 1, opacity: 1 }} 
exit={{ scale: 0.9, opacity: 0 }}
className="bg-white rounded-2xl p-6 max-w-md w-full"
>
<div className="text-center">
<div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
<Navigation className="w-8 h-8 text-blue-500" />
</div>
<h3 className="text-xl font-semibold text-gray-800 mb-2">Activer la géolocalisation</h3>
<p className="text-gray-600 mb-6">
Pour une meilleure expérience, autorisez l'accès à votre position pour trouver des trajets plus précis.
</p>
<div className="flex gap-3">
<button
onClick={() => setShowLocationPermissionModal(false)}
className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
>
Plus tard
</button>
<button
onClick={requestLocationPermission}
className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
>
Autoriser
</button>
</div>
</div>
</motion.div>
</motion.div>
)}
</AnimatePresence>

{/* Signup Modal */}
<AnimatePresence>
{showSignupModal && bookingTrip && (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }} 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    onClick={() => setShowSignupModal(false)}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8"
    >
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Créez un compte</h3>
        <p className="text-gray-600">Vous devez créer un compte pour réserver ce trajet</p>
      </div>

      {/* Trip Preview */}
      <div className="bg-gray-50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-green-500" />
          <span className="text-sm text-gray-700">{bookingTrip.departure?.address || bookingTrip.departure_text}</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4 text-red-500" />
          <span className="text-sm text-gray-700">{bookingTrip.arrival?.address || bookingTrip.arrival_text}</span>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <span className="text-sm text-gray-600">Prix</span>
          <span className="text-lg font-bold text-gray-900">{bookingTrip.price_per_seat} MAD</span>
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold">✓</span>
          </div>
          <p className="text-sm text-gray-700">Réservez facilement vos trajets</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold">✓</span>
          </div>
          <p className="text-sm text-gray-700">Communiquez avec les conducteurs</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-green-600 font-bold">✓</span>
          </div>
          <p className="text-sm text-gray-700">Suivez vos réservations</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <Link 
          to="/signup/passenger"
          onClick={() => setShowSignupModal(false)}
          className="block w-full py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all text-center"
        >
          Créer un compte
        </Link>
        <button 
          onClick={() => {
            setShowSignupModal(false)
            setBookingTrip(null)
          }}
          className="block w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          Plus tard
        </button>
        <div className="text-center">
          <Link 
            to="/login"
            onClick={() => setShowSignupModal(false)}
            className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            Vous avez déjà un compte ? Se connecter
          </Link>
        </div>
      </div>
    </motion.div>
  </motion.div>
)}
</AnimatePresence>

{/* Booking Modal */}
<AnimatePresence>
{showBookingModal && bookingTrip && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Réserver ce trajet</h3>
        <button onClick={() => setShowBookingModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-green-600" />
          <span className="font-medium">{bookingTrip.departure?.address || bookingTrip.departure_text}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-red-600" />
          <span className="font-medium">{bookingTrip.arrival?.address || bookingTrip.arrival_text}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-600" />
          <span>{new Date(bookingTrip.departure_time || bookingTrip.date_time).toLocaleString('fr-FR')}</span>
        </div>
        <div className="pt-2">
          <label className="block text-gray-700 mb-1">Places</label>
          <input type="number" min="1" max={bookingTrip.total_seats || 8} value={bookingSeats} onChange={(e) => setBookingSeats(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
        </div>
        <div>
          <label className="block text-gray-700 mb-1">Mode de paiement</label>
          <select value={bookingPayment} onChange={(e) => setBookingPayment(e.target.value)} className="w-full border rounded-lg px-3 py-2">
            <option value="unicard">UniCard</option>
            <option value="cash">Cash</option>
            <option value="mixed">Mixte</option>
          </select>
        </div>
        {bookingPayment === 'mixed' && (
          <div>
            <label className="block text-gray-700 mb-1">Montant UniCard</label>
            <input type="number" min="0" max={(bookingTrip.price_per_seat || 0) * bookingSeats} value={bookingUniAmount} onChange={(e) => setBookingUniAmount(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2" />
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <span className="text-gray-600">Total</span>
          <span className="text-lg font-semibold">{(bookingTrip.price_per_seat || 0) * bookingSeats} MAD</span>
        </div>
      </div>
      <div className="mt-4 flex gap-3">
        <button onClick={() => setShowBookingModal(false)} className="flex-1 border border-gray-300 rounded-lg py-2">Annuler</button>
        <button disabled={isBooking} onClick={submitBooking} className="flex-1 bg-blue-600 text-white rounded-lg py-2 disabled:opacity-50">{isBooking ? 'Réservation...' : 'Confirmer'}</button>
      </div>
    </motion.div>
  </motion.div>
)}
</AnimatePresence>

{/* Location Error Modal */}
<AnimatePresence>
{locationError && (
<motion.div 
initial={{ opacity: 0 }} 
animate={{ opacity: 1 }} 
exit={{ opacity: 0 }}
className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
>
<motion.div 
initial={{ scale: 0.9, opacity: 0 }} 
animate={{ scale: 1, opacity: 1 }} 
exit={{ scale: 0.9, opacity: 0 }}
className="bg-white rounded-2xl p-6 max-w-md w-full"
>
<div className="text-center">
<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
<X className="w-8 h-8 text-red-500" />
</div>
<h3 className="text-xl font-semibold text-gray-800 mb-2">Erreur de géolocalisation</h3>
<p className="text-gray-600 mb-6">{locationError}</p>
<div className="flex gap-3">
<button
onClick={() => setLocationError(null)}
className="flex-1 px-4 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors"
>
Fermer
</button>
<button
onClick={() => {
setLocationError(null)
handleLocationClick()
}}
className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors"
>
Réessayer
</button>
</div>
</div>
</motion.div>
</motion.div>
)}
</AnimatePresence>
</div>
)
}

export default Search