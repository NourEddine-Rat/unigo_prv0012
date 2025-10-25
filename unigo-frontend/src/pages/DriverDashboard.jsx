import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Calendar, DollarSign, Users, TrendingUp, MapPin, Clock, Edit2, Trash2, Navigation, X, Search, Map, CreditCard, Banknote, Ban, UserCheck, AlertTriangle, Flag, Play, Square } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { trips, cancellationReasons, districts } from '../data/mockData'
import { getCurrentPosition, searchPlaces, geocodeAddress, calculateDistance, formatDistance } from '../utils/geolocation'
import { useGeolocation } from '../hooks/useGeolocation'
import useUniversities from '../hooks/useUniversities'
import MapView from '../components/MapView'
import MessageWidget from '../components/MessageWidget'
// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
import toast from 'react-hot-toast'

// API functions
const createTrip = async (tripData) => {
  const token = localStorage.getItem('unigo_token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/trips`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(tripData)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

const getDriverTrips = async (driverId) => {
  const token = localStorage.getItem('unigo_token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/trips/driver/${driverId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

const cancelTrip = async (tripId, reason) => {
  const token = localStorage.getItem('unigo_token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/trips/${tripId}/cancel`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ reason })
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

const submitReview = async (reviewData) => {
  const token = localStorage.getItem('unigo_token')
  if (!token) {
    throw new Error('No authentication token found')
  }

  const response = await fetch(`${API_BASE_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(reviewData)
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  return await response.json()
}

// Helper function to format trip data for API
const formatTripForAPI = (formData, userId) => {
  return {
    driver_id: userId,
    departure: {
      type: 'custom',
      address: formData.departure_text,
      coordinates: formData.departure_coords
    },
    arrival: {
      type: 'custom',
      address: formData.arrival_text,
      coordinates: formData.arrival_coords
    },
    departure_time: new Date(formData.date_time).toISOString(),
    return_time: formData.return_date_time ? new Date(formData.return_date_time).toISOString() : null,
    type: formData.type,
    price_per_seat: parseFloat(formData.price_per_seat),
    total_seats: parseInt(formData.total_seats),
    available_seats: parseInt(formData.total_seats),
    payment_modes: formData.payment_modes,
    tags: formData.tags,
    radius_km: parseInt(formData.radius_km),
    description: formData.description || '',
    meeting_point: formData.meeting_point || '',
    estimated_duration: formData.estimated_duration || 0,
    distance_km: formData.distance_km || 0,
    status: 'published',
    created_at: new Date().toISOString()
  }
}

const DriverDashboard = () => {
const { user } = useAuth()
const { getLocationWithAddress } = useGeolocation()
const { universities } = useUniversities()
const [showCreateTrip, setShowCreateTrip] = useState(false)
const [showCancelTrip, setShowCancelTrip] = useState(false)
const [selectedTrip, setSelectedTrip] = useState(null)
const [cancelReason, setCancelReason] = useState('')
const [showConfirmCancel, setShowConfirmCancel] = useState(false)
const [currentStep, setCurrentStep] = useState('details') // 'details', 'map', 'review'
const [mapSelectionMode, setMapSelectionMode] = useState(null)
const [suggestions, setSuggestions] = useState({ departure: [], arrival: [] })
const [showSuggestions, setShowSuggestions] = useState(false)
const [activeField, setActiveField] = useState(null)
const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
const [searchTimeout, setSearchTimeout] = useState(null)
const [driverTrips, setDriverTrips] = useState([])
const [isBackendConnected, setIsBackendConnected] = useState(false)
const [editingTrip, setEditingTrip] = useState(null)
const [formMode, setFormMode] = useState('create') // 'create' | 'edit'
const [showReviewModal, setShowReviewModal] = useState(false)
const [selectedPassenger, setSelectedPassenger] = useState(null)
const [selectedTripForReview, setSelectedTripForReview] = useState(null)
const [reviewForm, setReviewForm] = useState({
  rating: 5,
  comment: ''
})
const [reviewStatus, setReviewStatus] = useState({})
const [showIncidentModal, setShowIncidentModal] = useState(false)
const [selectedBookingForIncident, setSelectedBookingForIncident] = useState(null)
const [incidentForm, setIncidentForm] = useState({
  title: '',
  description: '',
  type: 'other',
  severity: 'medium'
}) // Track review status for each passenger
const [form, setForm] = useState({
departure_text: '',
departure_coords: null,
arrival_text: '',
arrival_coords: null,
date_time: '',
return_date_time: '',
type: 'oneway',
price_per_seat: '',
total_seats: 4,
payment_modes: ['cash'],
tags: [],
radius_km: 5,
description: '',
vehicle_info: '',
meeting_point: '',
estimated_duration: 0,
distance_km: 0
})
const [driverBookings, setDriverBookings] = useState([])
const [isLoadingBookings, setIsLoadingBookings] = useState(false)
const [isHeaderVisible, setIsHeaderVisible] = useState(true)

// Ref to store latest driverTrips for auto-start functionality
const driverTripsRef = useRef([])

const driverReservations = driverBookings

// Calculate real statistics from database
const publishedTrips = driverTrips.filter(trip => trip.status === 'published' || trip.status === 'scheduled' || trip.status === 'active')
const totalPassengers = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length
const totalEarnings = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').reduce((sum, r) => {
  const trip = driverTrips.find(t => t._id === (r.trip_id?._id || r.trip_id))
return sum + (trip?.price_per_seat || 0) * r.seats_booked
}, 0)

// Calculate acceptance rate
const totalBookingRequests = driverReservations.length
const acceptedBookings = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length
const acceptanceRate = totalBookingRequests > 0 ? Math.round((acceptedBookings / totalBookingRequests) * 100) : 100

// Additional statistics
const completedTrips = driverTrips.filter(trip => trip.status === 'completed').length
const activeTrips = driverTrips.filter(trip => trip.status === 'active').length
const pendingBookings = driverReservations.filter(r => r.status === 'pending').length

// Debug logging for statistics
console.log('Driver Dashboard Statistics:', {
  totalTrips: driverTrips.length,
  publishedTrips: publishedTrips.length,
  totalPassengers,
  totalEarnings,
  acceptanceRate,
  completedTrips,
  activeTrips,
  pendingBookings
})

const stats = [
{ icon: Calendar, label: 'Trajets publiés', value: driverTrips.length, color: 'from-blue-500 to-blue-600' },
{ icon: Users, label: 'Passagers', value: totalPassengers, color: 'from-purple-500 to-purple-600' },
{ icon: DollarSign, label: 'Revenus estimés', value: `${totalEarnings} MAD`, color: 'from-green-500 to-green-600' },
{ icon: TrendingUp, label: 'Taux acceptation', value: `${acceptanceRate}%`, color: 'from-orange-500 to-orange-600' }
]

const allLocations = [...universities, ...districts]

const handleLocationClick = async (field) => {
try {
const location = await getLocationWithAddress()
if (location) {
const locationData = {
address: location.formatted_address,
coordinates: { lat: location.lat, lng: location.lng }
}
if (field === 'departure') {
setForm({ ...form, departure_text: location.formatted_address, departure_coords: locationData.coordinates })
} else {
setForm({ ...form, arrival_text: location.formatted_address, arrival_coords: locationData.coordinates })
}
toast.success('Position GPS détectée!')
}
} catch (error) {
console.error('Error getting location:', error)
toast.error('Impossible de détecter votre position')
}
}

const handleInputChange = (field, value) => {
setForm({ ...form, [field]: value })
setActiveField(field)

// Clear previous timeout
if (searchTimeout) {
clearTimeout(searchTimeout)
}

if ((field === 'departure_text' || field === 'arrival_text') && value.length > 1) {
// Show immediate results from predefined locations
const predefinedMatches = allLocations.filter(loc =>
loc.name.toLowerCase().includes(value.toLowerCase())
).slice(0, 3)

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
} else {
setSuggestions({ ...suggestions, [field]: [] })
setShowSuggestions(false)
}
}

const selectSuggestion = (field, location) => {
setForm({ ...form, [field]: location.name })
setSuggestions({ ...suggestions, [field]: [] })
setShowSuggestions(false)
setActiveField(null)

// Handle location selection for both predefined and geocoded places
const locationData = {
address: location.name,
coordinates: location.coordinates || location.coords
}

if (field === 'departure_text') {
setForm({ ...form, departure_text: location.name, departure_coords: locationData.coordinates })
} else if (field === 'arrival_text') {
setForm({ ...form, arrival_text: location.name, arrival_coords: locationData.coordinates })
}

// Calculate distance and duration if both locations are selected
if (field === 'departure_text' && form.arrival_coords) {
calculateTripDetails(locationData.coordinates, form.arrival_coords)
} else if (field === 'arrival_text' && form.departure_coords) {
calculateTripDetails(form.departure_coords, locationData.coordinates)
}
}

const calculateTripDetails = (departure, arrival) => {
const distance = calculateDistance(departure.lat, departure.lng, arrival.lat, arrival.lng)
const duration = Math.round((distance / 30) * 60) // 30 km/h average speed

setForm(prev => ({
...prev,
distance_km: distance,
estimated_duration: duration
}))
}

const handleMapPointSelect = (location, mode) => {
if (mode === 'departure') {
setForm({ ...form, departure_text: location.address, departure_coords: location.coordinates })
} else if (mode === 'arrival') {
setForm({ ...form, arrival_text: location.address, arrival_coords: location.coordinates })
}

// Calculate trip details if both locations are selected
if (mode === 'departure' && form.arrival_coords) {
calculateTripDetails(location.coordinates, form.arrival_coords)
} else if (mode === 'arrival' && form.departure_coords) {
calculateTripDetails(form.departure_coords, location.coordinates)
}

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

const handleCancelTripClick = (trip) => {
setSelectedTrip(trip)
setShowCancelTrip(true)
}

const handleCancelTripSubmit = () => {
if (!cancelReason) return
setShowCancelTrip(false)
setShowConfirmCancel(true)
}

const confirmTripCancellation = async () => {
try {
// Cancel trip via API
await cancelTrip(selectedTrip._id, cancelReason)

// Remove trip from the driver's trip list
setDriverTrips(prevTrips => prevTrips.filter(trip => trip._id !== selectedTrip._id))

const tripReservations = driverBookings.filter(r => (r.trip_id?._id || r.trip_id) === selectedTrip._id && r.status === 'confirmed')
setShowConfirmCancel(false)
setCancelReason('')
setSelectedTrip(null)
toast.success('Trajet annulé avec succès!')
} catch (error) {
console.error('Error cancelling trip:', error)
toast.error('Erreur lors de l\'annulation du trajet. Veuillez réessayer.')
}
}

// Edit trip function
const handleEditTrip = (trip) => {
setEditingTrip(trip)
setFormMode('edit')
// Pre-fill the form with trip data
setForm({
departure_text: trip.departure?.address || trip.departure_text || '',
departure_coords: trip.departure?.coordinates || trip.departure_coords,
arrival_text: trip.arrival?.address || trip.arrival_text || '',
arrival_coords: trip.arrival?.coordinates || trip.arrival_coords,
date_time: trip.departure_time ? new Date(trip.departure_time).toISOString().slice(0, 16) : '',
return_date_time: trip.arrival_time ? new Date(trip.arrival_time).toISOString().slice(0, 16) : '',
type: trip.type || 'oneway',
price_per_seat: trip.price_per_seat || '',
total_seats: trip.total_seats || '',
payment_modes: trip.payment_modes || ['cash'],
tags: trip.tags || [],
radius_km: trip.radius_km || 5,
description: trip.description || '',
meeting_point: trip.meeting_point || '',
estimated_duration: trip.estimated_duration || 0,
distance_km: trip.distance_km || 0
})
setCurrentStep('details')
setShowCreateTrip(true)
}

// Delete trip function
const handleDeleteTrip = async (trip) => {
if (window.confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) {
try {
// Delete trip via API
const token = localStorage.getItem('unigo_token')
if (!token) {
throw new Error('No authentication token found')
}

const response = await fetch(`${API_BASE_URL}/trips/${trip._id}`, {
method: 'DELETE',
headers: {
'Authorization': `Bearer ${token}`
}
})

if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`)
}

// Remove trip from the driver's trip list
setDriverTrips(prevTrips => prevTrips.filter(t => t._id !== trip._id))
toast.success('Trajet supprimé avec succès!')
} catch (error) {
console.error('Error deleting trip:', error)
toast.error('Erreur lors de la suppression du trajet. Veuillez réessayer.')
}
}
}

// Review handlers
const handleReviewPassenger = (passenger, trip) => {
  setSelectedPassenger(passenger)
  setSelectedTripForReview(trip)
  setReviewForm({ rating: 5, comment: '' })
  setShowReviewModal(true)
}

const checkReviewStatus = async (tripId, passengerId) => {
  try {
    const token = localStorage.getItem('unigo_token')
    const response = await fetch(`${API_BASE_URL}/reviews/check/${tripId}/${passengerId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    if (response.ok) {
      const data = await response.json()
      return data.hasReviewed
    }
  } catch (error) {
    console.error('Error checking review status:', error)
  }
  return false
}

const handleReviewSubmit = async (e) => {
e.preventDefault()
  if (!selectedPassenger || !selectedTripForReview) return

  try {
    await submitReview({
      trip_id: selectedTripForReview._id,
      reviewed_user_id: selectedPassenger._id,
      rating: reviewForm.rating,
      comment: reviewForm.comment
    })
    
    // Update review status
    const key = `${selectedTripForReview._id}-${selectedPassenger._id}`
    setReviewStatus(prev => ({ ...prev, [key]: true }))
    
    toast.success('Avis envoyé avec succès!')
    setShowReviewModal(false)
    setSelectedPassenger(null)
    setSelectedTripForReview(null)
    setReviewForm({ rating: 5, comment: '' })
  } catch (error) {
    console.error('Error submitting review:', error)
    toast.error('Erreur lors de l\'envoi de l\'avis. Veuillez réessayer.')
  }
}

const handleSubmit = async (e) => {
e.preventDefault()
if (currentStep === 'details') {
// Validate required fields
if (!form.departure_text || !form.arrival_text || !form.date_time || !form.price_per_seat) {
toast.error('Veuillez remplir tous les champs obligatoires')
return
}
setCurrentStep('map')
} else if (currentStep === 'map') {
// Validate coordinates
if (!form.departure_coords || !form.arrival_coords) {
toast.error('Veuillez sélectionner les coordonnées sur la carte')
return
}
setCurrentStep('review')
} else if (currentStep === 'review') {
// Create or update the trip
try {
const tripData = formatTripForAPI(form, user?._id)

if (formMode === 'edit' && editingTrip && editingTrip._id) {
// Update existing trip
const token = localStorage.getItem('unigo_token')
const response = await fetch(`${API_BASE_URL}/trips/${editingTrip._id}`, {
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify(tripData)
})

if (!response.ok) {
throw new Error(`HTTP error! status: ${response.status}`)
}

const updatedTrip = await response.json()

// Update trip in the driver's trip list
setDriverTrips(prevTrips => prevTrips.map(trip => 
trip._id === editingTrip._id ? updatedTrip.trip : trip
))

toast.success('Trajet modifié avec succès!')
setEditingTrip(null)
setFormMode('create')
} else {
// Create new trip
console.log('Creating trip with data:', tripData)
const response = await createTrip(tripData)
console.log('Trip creation response:', response)

// Add trip to the driver's trip list
setDriverTrips(prevTrips => [response.trip, ...prevTrips])

toast.success('Trajet créé avec succès!')
}

setShowCreateTrip(false)
resetForm()
} catch (error) {
console.error('Error saving trip:', error)
if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
// Fallback: Create trip locally when API is not available
const fallbackTrip = {
id: Date.now(),
driver_id: user?._id,
...form,
available_seats: form.total_seats,
status: 'published',
created_at: new Date().toISOString(),
trip_id: `TRIP_${Date.now()}`,
driver_name: `${user?.first_name?.toUpperCase()} ${user?.last_name?.toUpperCase()}`,
driver_avatar: null
}

// Add trip to the driver's trip list
setDriverTrips(prevTrips => [fallbackTrip, ...prevTrips])

toast.success('Trajet créé localement (serveur non disponible)')
setShowCreateTrip(false)
resetForm()
} else {
toast.error('Erreur lors de l\'enregistrement du trajet. Veuillez réessayer.')
}
}
}
}

const resetForm = () => {
setForm({
departure_text: '',
departure_coords: null,
arrival_text: '',
arrival_coords: null,
date_time: '',
return_date_time: '',
type: 'oneway',
price_per_seat: '',
total_seats: 4,
payment_modes: ['cash'],
tags: [],
radius_km: 5,
description: '',
vehicle_info: '',
meeting_point: '',
estimated_duration: 0,
distance_km: 0
})
setCurrentStep('details')
setMapSelectionMode(null)
setSuggestions({ departure: [], arrival: [] })
setShowSuggestions(false)
setActiveField(null)
setEditingTrip(null)
}

const nextStep = () => {
if (currentStep === 'details') {
if (!form.departure_text || !form.arrival_text || !form.date_time || !form.price_per_seat) {
toast.error('Veuillez remplir tous les champs obligatoires')
return
}
setCurrentStep('map')
} else if (currentStep === 'map') {
if (!form.departure_coords || !form.arrival_coords) {
toast.error('Veuillez sélectionner les coordonnées sur la carte')
return
}
setCurrentStep('review')
}
}

const prevStep = () => {
if (currentStep === 'map') {
setCurrentStep('details')
} else if (currentStep === 'review') {
setCurrentStep('map')
}
}

// Cleanup effect
useEffect(() => {
return () => {
if (searchTimeout) {
clearTimeout(searchTimeout)
}
}
}, [searchTimeout])

useEffect(() => {
const loadDriverTrips = async () => {
if (user?._id) {
try {
console.log('Loading trips for user:', user._id)
const apiTrips = await getDriverTrips(user._id)
console.log('API trips loaded:', apiTrips.length, 'trips')
setDriverTrips(apiTrips)
setIsBackendConnected(true)
} catch (error) {
console.error('Error loading trips:', error)
// Fallback to mock data if API fails
const initialTrips = trips.filter(t => t.driver_id === user?._id)
setDriverTrips(initialTrips)
if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
toast('Serveur non disponible - Utilisation des données locales', { 
duration: 4000 
})
} else {
toast.error('Erreur lors du chargement des trajets. Utilisation des données locales.')
}
}
}
}

const loadDriverBookings = async () => {
if (!user?._id) return
try {
setIsLoadingBookings(true)
const token = localStorage.getItem('unigo_token')
const res = await fetch(`${API_BASE_URL}/driver/bookings`, {
headers: { 'Authorization': `Bearer ${token}` }
})
if (!res.ok) throw new Error(`HTTP ${res.status}`)
const data = await res.json()
setDriverBookings(data.bookings || [])
} catch (e) {
console.error('Error loading driver bookings:', e)
setDriverBookings([])
} finally {
setIsLoadingBookings(false)
}
}

loadDriverTrips()
loadDriverBookings()
}, [user?._id])

// Load review statuses when driverBookings change
useEffect(() => {
  if (driverBookings.length > 0) {
    loadReviewStatuses(driverBookings)
  }
}, [driverBookings])

// Keep ref synchronized with driverTrips
useEffect(() => {
  driverTripsRef.current = driverTrips
}, [driverTrips])

// Auto-start trips when their scheduled time arrives
useEffect(() => {
  const checkAndAutoStartTrips = async () => {
    const now = new Date()
    
    // Check each trip that's published or scheduled
    for (const trip of driverTripsRef.current) {
      if ((trip.status === 'published' || trip.status === 'scheduled') && trip.departure_time) {
        const departureTime = new Date(trip.departure_time)
        const timeDiff = departureTime - now
        
        // Auto-start if departure time has passed or is within 1 minute
        if (timeDiff <= 60000 && timeDiff >= -300000) { // Within 1 min before to 5 min after
          try {
            const token = localStorage.getItem('unigo_token')
            const response = await fetch(`${API_BASE_URL}/trips/${trip._id}/start`, {
              method: 'PUT',
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ auto_start: true })
            })
            
            if (response.ok) {
              setDriverTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'active' } : t))
              toast.success(`Trajet "${trip.departure?.address || trip.departure_text} → ${trip.arrival?.address || trip.arrival_text}" démarré automatiquement`, {
                duration: 4000
              })
            }
          } catch (error) {
            console.error('Error auto-starting trip:', error)
          }
        }
      }
    }
  }
  
  // Check every 30 seconds
  const interval = setInterval(checkAndAutoStartTrips, 30000)
  
  // Also check immediately
  checkAndAutoStartTrips()
  
  return () => clearInterval(interval)
}, [])

// Scroll handler to hide/show header
useEffect(() => {
  const handleScroll = () => {
    const scrollY = window.scrollY
    setIsHeaderVisible(scrollY < 100) // Hide header after scrolling 100px
  }

  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])

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

const loadReviewStatuses = async (bookings) => {
  const completedBookings = bookings.filter(booking => booking.status === 'completed')
  console.log('Loading review statuses for completed bookings:', completedBookings.length)
  
  const statusPromises = []
  
  for (const booking of completedBookings) {
    const tripId = booking.trip_id?._id || booking.trip_id
    const passengerId = booking.passenger_id._id || booking.passenger_id
    const reviewKey = `${tripId}-${passengerId}`
    
    console.log('Checking review for:', { tripId, passengerId, reviewKey })
    
    statusPromises.push(
      checkReviewStatus(tripId, passengerId)
        .then(hasReviewed => {
          console.log('Review status for', reviewKey, ':', hasReviewed)
          return { key: reviewKey, hasReviewed }
        })
    )
  }
  
  const results = await Promise.all(statusPromises)
  const newReviewStatus = {}
  results.forEach(({ key, hasReviewed }) => {
    if (hasReviewed) newReviewStatus[key] = true
  })
  
  console.log('Final review status:', newReviewStatus)
  setReviewStatus(prev => ({ ...prev, ...newReviewStatus }))
}

// Incident reporting functions
const openIncidentModal = (booking) => {
  setSelectedBookingForIncident(booking)
  setIncidentForm({
    title: '',
    description: '',
    type: 'other',
    severity: 'medium'
  })
  setShowIncidentModal(true)
}

const submitIncidentReport = async () => {
  if (!incidentForm.title || !incidentForm.description) {
    toast.error('Veuillez remplir tous les champs obligatoires')
    return
  }

  try {
    const token = localStorage.getItem('unigo_token')
    const res = await fetch(`${API_BASE_URL}/incidents/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        ...incidentForm,
        trip_id: selectedBookingForIncident.trip_id?._id || selectedBookingForIncident.trip_id,
        reported_against_user_id: selectedBookingForIncident.passenger_id?._id || selectedBookingForIncident.passenger_id
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    toast.success('Incident signalé avec succès')
    setShowIncidentModal(false)
    setSelectedBookingForIncident(null)
    setIncidentForm({ title: '', description: '', type: 'other', severity: 'medium' })
  } catch (e) {
    console.error('Incident reporting failed', e)
    toast.error(`Échec du signalement: ${e.message}`)
  }
}

// Check if booking is eligible for incident reporting (completed within 48 hours)
const canReportIncident = (booking) => {
  if (!booking || booking.status !== 'completed') return false
  
  const tripEndTime = booking.trip_id?.arrival_time || booking.updated_at
  const hoursSinceTripEnd = (new Date() - new Date(tripEndTime)) / (1000 * 60 * 60)
  
  return hoursSinceTripEnd <= 48
}

return (
<div className="min-h-screen bg-gray-50">
{/* Modern Header */}
<motion.div 
  initial={{ y: 0, opacity: 1 }}
  animate={{ 
    y: isHeaderVisible ? 0 : -100, 
    opacity: isHeaderVisible ? 1 : 0 
  }}
  transition={{ duration: 0.3, ease: 'easeInOut' }}
  className="bg-white border-b border-gray-100 sticky top-0 z-20"
>
  <div className="max-w-7xl mx-auto px-4 py-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Tableau de bord</h1>
        <p className="text-gray-600 text-sm">Bienvenue, {user?.first_name?.toUpperCase()}</p>
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isBackendConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          <span className="text-xs text-gray-500">
            {isBackendConnected ? 'En ligne' : 'Hors ligne'}
          </span>
        </div>
      </div>
      <button 
        onClick={() => { setFormMode('create'); setEditingTrip(null); setShowCreateTrip(true) }} 
        className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all flex items-center gap-2 shadow-lg"
      >
        <Plus className="w-5 h-5" />
        Créer un trajet
      </button>
    </div>
  </div>
</motion.div>

<div className="max-w-7xl mx-auto px-4 py-6">

{/* Statistics Cards - Modern Design */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
{stats.map((stat, i) => (
<motion.div 
  key={stat.label} 
  initial={{ opacity: 0, y: 20 }} 
  animate={{ opacity: 1, y: 0 }} 
  transition={{ delay: i * 0.1 }} 
  className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
>
<div className="flex items-center gap-4">
  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
    <stat.icon className="w-6 h-6 text-gray-600" />
  </div>
  <div>
    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
    <p className="text-gray-600 text-sm">{stat.label}</p>
  </div>
</div>
</motion.div>
))}
</div>

{/* Messages Widget */}
<div className="mb-8">
<MessageWidget />
</div>

{showCreateTrip && (
<motion.div 
  initial={{ opacity: 0 }} 
  animate={{ opacity: 1 }} 
  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end z-50" 
  onClick={() => setShowCreateTrip(false)}
>
<motion.div 
  initial={{ y: '100%' }} 
  animate={{ y: 0 }} 
  exit={{ y: '100%' }}
  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
  onClick={(e) => e.stopPropagation()} 
  className="bg-white rounded-t-3xl w-full max-h-[95vh] overflow-hidden shadow-2xl border-t border-gray-200"
>
{/* Drag Handle */}
<div className="flex justify-center pt-4 pb-2">
  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
</div>

{/* Header */}
<div className="px-6 pb-4 border-b border-gray-100">
<div className="flex items-center justify-between">
<h2 className="text-2xl font-bold text-gray-900">{editingTrip ? 'Modifier le trajet' : 'Créer un trajet'}</h2>
<button 
  onClick={() => { setShowCreateTrip(false); setFormMode('create'); setEditingTrip(null) }} 
  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
>
<X className="w-6 h-6 text-gray-500" />
</button>
</div>

{/* Progress Steps */}
<div className="flex items-center justify-center mt-6 space-x-8">
{[{ key: 'details', label: 'Détails' }, { key: 'map', label: 'Carte' }, { key: 'review', label: 'Récapitulatif' }].map((step, index) => (
<div key={step.key} className="flex items-center">
<div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
currentStep === step.key ? 'bg-black text-white' : 
index < ['details', 'map', 'review'].indexOf(currentStep) ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-500'
}`}>
{index + 1}
</div>
<span className={`ml-2 text-sm font-medium transition-colors ${
currentStep === step.key ? 'text-gray-900' : 'text-gray-500'
}`}>{step.label}</span>
{index < 2 && <div className={`w-8 h-0.5 mx-4 transition-colors ${
index < ['details', 'map', 'review'].indexOf(currentStep) ? 'bg-gray-800' : 'bg-gray-200'
}`} />}
</div>
))}
</div>
</div>

{/* Content */}
<div className="px-6 py-6 max-h-[60vh] overflow-y-auto bg-gray-50">
{currentStep === 'details' && (
<div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
<form onSubmit={handleSubmit} className="space-y-6">
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
{/* Departure */}
<div className="relative">
<label className="block text-sm font-medium text-gray-700 mb-2">Départ *</label>
<div className="relative">
<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input 
type="text" 
value={form.departure_text} 
onChange={(e) => handleInputChange('departure_text', e.target.value)} 
required 
className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" 
placeholder="Ville, quartier, université..." 
/>
<div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
<button 
type="button"
onClick={() => startMapSelection('departure')}
className="p-1 text-gray-600 hover:text-black transition-colors"
title="Sélectionner sur la carte"
>
<Map className="w-5 h-5" />
</button>
<button 
type="button"
onClick={() => handleLocationClick('departure')} 
className="p-1 text-gray-600 hover:text-black transition-colors"
title="Utiliser ma position"
>
<Navigation className="w-5 h-5" />
</button>
</div>

{/* Inline Suggestions for Departure */}
<AnimatePresence>
{showSuggestions && activeField === 'departure_text' && (suggestions.departure_text || []).length > 0 && (
<motion.div 
initial={{ opacity: 0, y: -10 }} 
animate={{ opacity: 1, y: 0 }} 
exit={{ opacity: 0, y: -10 }}
className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-48 overflow-y-auto mt-2 z-50 suggestion-container"
onClick={(e) => e.stopPropagation()}
>
{(suggestions.departure_text || []).map((loc, index) => (
<button 
key={`departure-${loc._id || loc.id || index}`} 
onClick={(e) => {
  e.preventDefault()
  e.stopPropagation()
  selectSuggestion('departure_text', loc)
}} 
className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
>
<div className="flex items-start gap-3">
<div className="flex-shrink-0 mt-0.5">
<MapPin className="w-4 h-4 text-green-500" />
</div>
<div className="flex-1 min-w-0">
<p className="font-medium text-gray-800 text-base">{loc.name}</p>
<p className="text-xs text-gray-500">
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
<div className="w-full px-4 py-3 text-center">
<div className="flex items-center justify-center gap-2 text-gray-500">
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
<span className="text-sm">Recherche de lieux...</span>
</div>
</div>
)}
</motion.div>
)}
</AnimatePresence>
</div>
</div>

{/* Arrival */}
<div className="relative">
<label className="block text-sm font-medium text-gray-700 mb-2">Arrivée *</label>
<div className="relative">
<MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input 
type="text" 
value={form.arrival_text} 
onChange={(e) => handleInputChange('arrival_text', e.target.value)} 
required 
className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" 
placeholder="Ville, quartier, université..." 
/>
<div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
<button 
type="button"
onClick={() => startMapSelection('arrival')}
className="p-1 text-gray-600 hover:text-black transition-colors"
title="Sélectionner sur la carte"
>
<Map className="w-5 h-5" />
</button>
<button 
type="button"
onClick={() => handleLocationClick('arrival')} 
className="p-1 text-gray-600 hover:text-black transition-colors"
title="Utiliser ma position"
>
<Navigation className="w-5 h-5" />
</button>
</div>

{/* Inline Suggestions for Arrival */}
<AnimatePresence>
{showSuggestions && activeField === 'arrival_text' && (suggestions.arrival_text || []).length > 0 && (
<motion.div 
initial={{ opacity: 0, y: -10 }} 
animate={{ opacity: 1, y: 0 }} 
exit={{ opacity: 0, y: -10 }}
className="absolute top-full left-0 right-0 bg-white rounded-2xl shadow-2xl border border-gray-200 max-h-48 overflow-y-auto mt-2 z-50 suggestion-container"
onClick={(e) => e.stopPropagation()}
>
{(suggestions.arrival_text || []).map((loc, index) => (
<button 
key={`arrival-${loc._id || loc.id || index}`} 
onClick={(e) => {
  e.preventDefault()
  e.stopPropagation()
  selectSuggestion('arrival_text', loc)
}} 
className="w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
>
<div className="flex items-start gap-3">
<div className="flex-shrink-0 mt-0.5">
<MapPin className="w-4 h-4 text-red-500" />
</div>
<div className="flex-1 min-w-0">
<p className="font-medium text-gray-800 text-base">{loc.name}</p>
<p className="text-xs text-gray-500">
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
<div className="w-full px-4 py-3 text-center">
<div className="flex items-center justify-center gap-2 text-gray-500">
<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
<span className="text-sm">Recherche de lieux...</span>
</div>
</div>
)}
</motion.div>
)}
</AnimatePresence>
</div>
</div>
</div>

{/* Trip Type */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Type de trajet</label>
<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white">
<option value="oneway">Aller simple</option>
<option value="return">Retour</option>
<option value="roundtrip">Aller-retour</option>
</select>
</div>

{/* Date and Time */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Date et heure de départ *</label>
<input type="datetime-local" value={form.date_time} onChange={(e) => setForm({ ...form, date_time: e.target.value })} required className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
{form.type === 'roundtrip' && (
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Date et heure de retour</label>
<input type="datetime-local" value={form.return_date_time} onChange={(e) => setForm({ ...form, return_date_time: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
)}
</div>

{/* Price and Seats */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Prix par place (MAD) *</label>
<input type="number" value={form.price_per_seat} onChange={(e) => setForm({ ...form, price_per_seat: e.target.value })} required min="1" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Nombre de places *</label>
<input type="number" value={form.total_seats} onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })} required min="1" max="8" className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
</div>

{/* Additional Info */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Rayon de recherche (km)</label>
<select value={form.radius_km} onChange={(e) => setForm({ ...form, radius_km: Number(e.target.value) })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
{[1, 2, 5, 10, 30, 60].map(r => <option key={r} value={r}>{r} km</option>)}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Point de rencontre</label>
<input type="text" value={form.meeting_point} onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" placeholder="Ex: Devant l'entrée principale" />
</div>
</div>

{/* Payment Modes */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Modes de paiement acceptés</label>
<div className="flex gap-6">
<label className="flex items-center">
<input type="checkbox" checked={form.payment_modes.includes('cash')} onChange={(e) => {
const modes = e.target.checked ? [...form.payment_modes, 'cash'] : form.payment_modes.filter(m => m !== 'cash')
setForm({ ...form, payment_modes: modes })
}} className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" />
<span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
<Banknote className="w-4 h-4" />
Cash
</span>
</label>
<label className="flex items-center">
<input type="checkbox" checked={form.payment_modes.includes('unicard')} onChange={(e) => {
const modes = e.target.checked ? [...form.payment_modes, 'unicard'] : form.payment_modes.filter(m => m !== 'unicard')
setForm({ ...form, payment_modes: modes })
}} className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" />
<span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
<CreditCard className="w-4 h-4" />
UniCard
</span>
</label>
</div>
</div>

{/* Tags */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Préférences</label>
<div className="flex gap-6">
<label className="flex items-center">
<input type="checkbox" checked={form.tags.includes('non_smoke')} onChange={(e) => {
const tags = e.target.checked ? [...form.tags, 'non_smoke'] : form.tags.filter(t => t !== 'non_smoke')
setForm({ ...form, tags })
}} className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" />
<span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
<Ban className="w-4 h-4" />
Non-fumeur
</span>
</label>
<label className="flex items-center">
<input type="checkbox" checked={form.tags.includes('female_only')} onChange={(e) => {
const tags = e.target.checked ? [...form.tags, 'female_only'] : form.tags.filter(t => t !== 'female_only')
setForm({ ...form, tags })
}} className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" />
<span className="ml-2 text-sm text-gray-700 flex items-center gap-1">
<UserCheck className="w-4 h-4" />
Femmes uniquement
</span>
</label>
</div>
</div>

{/* Description */}
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" placeholder="Informations supplémentaires sur le trajet..." />
</div>
</form>
</div>
)}

{currentStep === 'map' && (
<div className="space-y-6">
<div className="text-center">
<h3 className="text-xl font-semibold text-gray-800 mb-2">Sélectionnez les points sur la carte</h3>
<p className="text-gray-600">Cliquez sur la carte pour confirmer les coordonnées de départ et d'arrivée</p>
</div>
<div className="h-96 rounded-xl overflow-hidden border border-gray-200">
<MapView
trips={[]}
onLocationSelect={() => {}}
selectedTrip={null}
onTripSelect={() => {}}
searchCenter={{ lat: 33.9981, lng: -6.8167 }}
searchRadius={form.radius_km}
currentLocation={null}
routeData={null}
selectedDeparture={form.departure_coords ? { coordinates: form.departure_coords, address: form.departure_text } : null}
selectedArrival={form.arrival_coords ? { coordinates: form.arrival_coords, address: form.arrival_text } : null}
onPointSelect={handleMapPointSelect}
selectionMode={mapSelectionMode}
/>
</div>
{mapSelectionMode && (
<div className="flex justify-center">
<button onClick={cancelMapSelection} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
Annuler la sélection
</button>
</div>
)}
</div>
)}

{currentStep === 'review' && (
<div className="space-y-6">
<div className="text-center">
<h3 className="text-xl font-semibold text-gray-800 mb-2">Récapitulatif du trajet</h3>
<p className="text-gray-600">Vérifiez les informations avant de publier</p>
</div>

<div className="bg-gray-50 rounded-xl p-6 space-y-4">
{/* Route */}
<div className="flex items-center gap-3">
<div className="w-3 h-3 bg-green-500 rounded-full"></div>
<div>
<p className="font-semibold text-gray-800">{form.departure_text}</p>
<p className="text-sm text-gray-500">Départ</p>
</div>
</div>
<div className="flex items-center gap-3">
<div className="w-3 h-3 bg-red-500 rounded-full"></div>
<div>
<p className="font-semibold text-gray-800">{form.arrival_text}</p>
<p className="text-sm text-gray-500">Arrivée</p>
</div>
</div>

{/* Trip Details */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
<div className="text-center">
<p className="text-2xl font-bold text-blue-600">{form.price_per_seat} MAD</p>
<p className="text-sm text-gray-500">par place</p>
</div>
<div className="text-center">
<p className="text-2xl font-bold text-gray-800">{form.total_seats}</p>
<p className="text-sm text-gray-500">places</p>
</div>
<div className="text-center">
<p className="text-2xl font-bold text-gray-800">{form.estimated_duration}</p>
<p className="text-sm text-gray-500">minutes</p>
</div>
<div className="text-center">
<p className="text-2xl font-bold text-gray-800">{formatDistance(form.distance_km)}</p>
<p className="text-sm text-gray-500">distance</p>
</div>
</div>

{/* Additional Info */}
<div className="pt-4 border-t border-gray-200 space-y-2">
<p><span className="font-medium">Type:</span> {form.type === 'oneway' ? 'Aller simple' : form.type === 'return' ? 'Retour' : 'Aller-retour'}</p>
<p><span className="font-medium">Paiement:</span> {form.payment_modes.map(mode => mode === 'cash' ? 'Cash' : 'UniCard').join(', ')}</p>
<p><span className="font-medium">Rayon:</span> {form.radius_km} km</p>
{form.meeting_point && <p><span className="font-medium">Point de rencontre:</span> {form.meeting_point}</p>}
{form.tags.length > 0 && <p><span className="font-medium">Préférences:</span> {form.tags.map(tag => tag === 'non_smoke' ? 'Non-fumeur' : 'Femmes uniquement').join(', ')}</p>}
</div>
</div>
</div>
)}
</div>

{/* Footer */}
<div className="bg-white px-6 py-4 border-t border-gray-100 flex justify-between">
<button 
type="button" 
onClick={() => setShowCreateTrip(false)} 
className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm"
>
Annuler
</button>
<div className="flex gap-2">
{currentStep !== 'details' && (
<button 
type="button" 
onClick={prevStep} 
className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all text-sm"
>
Précédent
</button>
)}
<button 
type="button" 
onClick={currentStep === 'review' ? handleSubmit : nextStep} 
className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-all text-sm"
>
{currentStep === 'review' ? (formMode === 'edit' ? 'Mettre à jour' : 'Publier') : 'Suivant'}
</button>
</div>
</div>
</motion.div>
</motion.div>
)}


{/* Trips List - Modern Design */}
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:border-gray-300 transition-all">
<div className="px-6 py-4 border-b border-gray-100">
<h2 className="text-xl font-bold text-gray-900">Mes trajets</h2>
</div>
<div className="divide-y divide-gray-100">
{driverTrips.map(trip => {
const tripReservations = driverBookings.filter(r => (r.trip_id?._id || r.trip_id) === trip._id)
return (
<div key={trip._id || trip.id} className={`p-6 transition-all hover:bg-gray-50 ${
  trip.status === 'completed' ? 'opacity-80' : 'border border-gray-200'
}`}>
{/* Trip Header */}
<div className="flex items-start justify-between mb-4">
<div className="flex-1">
<div className="flex items-center gap-3 mb-2">
<div className="w-2 h-2 bg-green-500 rounded-full" />
<p className="font-medium text-gray-900 text-sm">{trip.departure?.address || trip.departure_text}</p>
</div>
<div className="flex items-center gap-3 mb-3">
<div className="w-2 h-2 bg-red-500 rounded-full" />
<p className="font-medium text-gray-900 text-sm">{trip.arrival?.address || trip.arrival_text}</p>
</div>
<div className="flex items-center gap-2 mb-3">
<span className={`px-3 py-1 rounded-full text-xs font-medium ${
  trip.status === 'published' ? 'bg-blue-100 text-blue-700' :
  trip.status === 'scheduled' ? 'bg-yellow-100 text-yellow-700' :
  trip.status === 'active' ? 'bg-green-100 text-green-700' :
  trip.status === 'completed' ? 'bg-gray-100 text-gray-700' :
  'bg-red-100 text-red-700'
}`}>
  {trip.status === 'published' ? 'Publié' :
   trip.status === 'scheduled' ? 'Programmé' :
   trip.status === 'active' ? 'En cours' :
   trip.status === 'completed' ? 'Terminé' :
   'Annulé'}
</span>
{trip.status === 'completed' && (
  <span className="text-xs text-gray-500">
    Terminé
  </span>
)}
</div>
<div className="flex items-center gap-4 text-sm text-gray-600">
<div className="flex items-center gap-1">
<Calendar className="w-4 h-4" />
{new Date(trip.departure_time).toLocaleDateString('fr-FR')}
</div>
<div className="flex items-center gap-1">
<Clock className="w-4 h-4" />
{new Date(trip.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
</div>
<div className="flex items-center gap-1">
<Users className="w-4 h-4" />
<span className="whitespace-nowrap">{trip.available_seats}/{trip.total_seats} places</span>
</div>
<div className="flex items-center gap-2">
<span className="text-gray-900 font-semibold whitespace-nowrap">{trip.price_per_seat} MAD</span>
{trip.tags?.includes('non_smoke') && (
  <Ban className="w-3 h-3 text-red-500" />
)}
{trip.tags?.includes('female_only') && (
  <UserCheck className="w-3 h-3 text-red-500" />
)}
</div>
</div>
</div>
{/* Action Buttons */}
<div className="flex flex-col gap-3">
  {/* Main Action Buttons */}
  <div className="flex items-center gap-2">
    {trip.status === 'published' || trip.status === 'scheduled' ? (
      <button 
        onClick={async () => {
          try {
            const token = localStorage.getItem('unigo_token')
            const response = await fetch(`${API_BASE_URL}/trips/${trip._id}/start`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setDriverTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'active' } : t))
            toast.success('Trajet démarré!')
          } catch (e) {
            console.error('Error starting trip:', e)
            toast.error('Erreur lors du démarrage du trajet')
          }
        }}
        className="px-4 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors font-medium flex items-center gap-2"
        title="Démarrer le trajet"
      >
        <Play className="w-4 h-4" />
        Démarrer
      </button>
    ) : trip.status === 'active' ? (
      <button 
        onClick={async () => {
          try {
            const token = localStorage.getItem('unigo_token')
            const response = await fetch(`${API_BASE_URL}/trips/${trip._id}/complete`, {
              method: 'PUT',
              headers: { 'Authorization': `Bearer ${token}` }
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setDriverTrips(prev => prev.map(t => t._id === trip._id ? { ...t, status: 'completed' } : t))
            toast.success('Trajet terminé! Vous pouvez maintenant évaluer vos passagers.')
          } catch (e) {
            console.error('Error completing trip:', e)
            toast.error('Erreur lors de la finalisation du trajet')
          }
        }}
        className="px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition-colors font-medium flex items-center gap-2"
        title="Terminer le trajet"
      >
        <Square className="w-4 h-4" />
        Terminer
      </button>
    ) : null}
    
    {/* Desktop Edit/Delete Buttons */}
    {trip.status !== 'completed' && (
      <>
        <button onClick={() => handleEditTrip(trip)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors hidden md:flex" title="Modifier le trajet">
          <Edit2 className="w-5 h-5" />
        </button>
        <button onClick={() => handleDeleteTrip(trip)} className="p-2 text-gray-600 hover:bg-red-50 rounded-lg transition-colors hidden md:flex" title="Supprimer le trajet">
          <Trash2 className="w-5 h-5" />
        </button>
      </>
    )}
    
    {trip.status === 'completed' && (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg whitespace-nowrap">
          ✓ Terminé
        </span>
      </div>
    )}
  </div>
  
  {/* Mobile Edit/Delete Buttons */}
  {trip.status !== 'completed' && (
    <div className="flex flex-col gap-1 md:hidden">
      <button onClick={() => handleEditTrip(trip)} className="px-1 py-0.5 text-[9px] text-gray-600 hover:bg-gray-100 rounded-sm transition-colors flex items-center justify-center gap-0.5 border border-gray-200">
        <Edit2 className="w-2 h-2" />
        Modifier
      </button>
      <button onClick={() => handleDeleteTrip(trip)} className="px-1 py-0.5 text-[9px] text-red-600 hover:bg-red-50 rounded-sm transition-colors flex items-center justify-center gap-0.5 border border-red-200">
        <Trash2 className="w-2 h-2" />
        Supprimer
      </button>
    </div>
  )}
</div>
</div>
{tripReservations.length > 0 && (
<div className="border-t border-gray-100 pt-4 mt-4">
<p className="text-sm font-medium text-gray-700 mb-3">{tripReservations.length} réservation(s)</p>
<div className="space-y-3">
{tripReservations.map(res => (
<div key={res._id || res.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
<div className="flex items-center gap-3">
<div>
<p className="font-medium text-gray-900 text-sm">{res.passenger_id?.first_name?.toUpperCase()} {res.passenger_id?.last_name?.toUpperCase()}</p>
<p className="text-xs text-gray-600">{res.seats_booked} place(s) • {res.payment_method} • {res.total_price} MAD</p>
{res.passenger_notes && <p className="text-xs text-gray-500 mt-1">{res.passenger_notes}</p>}
{res.cancellation?.reason && <p className="text-xs text-red-600 mt-1">Annulation: {res.cancellation.reason}</p>}
{res.cancellation?.refund_amount > 0 && <p className="text-xs text-green-600 mt-1">Remboursé: {res.cancellation.refund_amount} pts</p>}
{res.payment_method === 'cash' && res.payment_status === 'pending' && <p className="text-xs text-orange-600 mt-1">Paiement à la rencontre</p>}
</div>
</div>
<div className="flex items-center gap-2">
<span className={`px-3 py-1 rounded-full text-xs font-medium ${res.status === 'confirmed' ? 'bg-green-100 text-green-700' : res.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{res.status}</span>
{res.status === 'pending' && (
  <>
  <button onClick={async () => {
    try {
      const token = localStorage.getItem('unigo_token')
      const r = await fetch(`${API_BASE_URL}/bookings/${res._id}/driver-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'confirm' })
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const updated = await r.json()
      setDriverBookings(prev => prev.map(b => (b._id === res._id ? updated.booking : b)))
      toast.success('Réservation confirmée')
    } catch (e) {
      toast.error('Erreur de confirmation')
    }
  }} className="px-3 py-1 text-xs bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors">Confirmer</button>
  <button onClick={async () => {
    const reason = prompt('Motif d\'annulation:') || 'Cancelled by driver'
    try {
      const token = localStorage.getItem('unigo_token')
      const r = await fetch(`${API_BASE_URL}/bookings/${res._id}/driver-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'cancel', reason })
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const updated = await r.json()
      setDriverBookings(prev => prev.map(b => (b._id === res._id ? updated.booking : b)))
      toast.success('Réservation annulée')
    } catch (e) {
      toast.error('Erreur d\'annulation')
    }
  }} className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors">Annuler</button>
  </>
)}
{res.status === 'completed' && (() => {
  const reviewKey = `${trip._id}-${res.passenger_id._id || res.passenger_id}`
  const hasReviewed = reviewStatus[reviewKey]
  
  return (
    <div className="flex items-center gap-2">
      {hasReviewed ? (
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-medium">
          ✓ Évalué
        </span>
      ) : (
        <button 
          onClick={() => handleReviewPassenger(res.passenger_id, trip)}
          className="px-3 py-1 bg-black text-white text-xs rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          Évaluer
        </button>
      )}
      {canReportIncident(res) && (
        <button 
          onClick={() => openIncidentModal(res)} 
          className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded-md text-[10px] font-medium hover:bg-red-200 transition-colors flex items-center gap-0.5"
        >
          <Flag className="w-2.5 h-2.5" />
          Signaler
        </button>
      )}
    </div>
  )
})()}
</div>
</div>
))}
</div>
</div>
)}
</div>
)
})}
</div>

{driverTrips.length === 0 && (
<div className="text-center py-12">
<p className="text-gray-500 mb-4">Vous n'avez pas encore publié de trajet</p>
<button onClick={() => setShowCreateTrip(true)} className="px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all">
Créer votre premier trajet
</button>
</div>
)}
</div>
</div>

{showCancelTrip && selectedTrip && (
<motion.div 
  initial={{ opacity: 0 }} 
  animate={{ opacity: 1 }} 
  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
  onClick={() => setShowCancelTrip(false)}
>
<motion.div 
  initial={{ scale: 0.9 }} 
  animate={{ scale: 1 }} 
  onClick={(e) => e.stopPropagation()} 
  className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full"
>
<div className="flex items-center justify-between mb-6">
<h2 className="text-xl font-bold text-gray-900">Annuler le trajet</h2>
<button onClick={() => setShowCancelTrip(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
<X className="w-5 h-5 text-gray-500" />
</button>
</div>
<div className="mb-6">
<label className="block text-sm font-medium text-gray-700 mb-2">Raison de l'annulation *</label>
<select value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white">
<option value="">Sélectionner une raison</option>
{cancellationReasons.map(reason => (
<option key={reason.value} value={reason.value}>{reason.label}</option>
))}
</select>
</div>
<div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
<p className="text-sm text-gray-700 font-medium mb-2">Important:</p>
<p className="text-xs text-gray-600">Les passagers seront automatiquement notifiés et remboursés intégralement. Votre score de fiabilité sera affecté.</p>
</div>
<div className="flex gap-3">
<button onClick={() => setShowCancelTrip(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
Retour
</button>
<button onClick={handleCancelTripSubmit} disabled={!cancelReason} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
Continuer
</button>
</div>
</motion.div>
</motion.div>
)}

{showConfirmCancel && selectedTrip && (() => {
const tripReservations = driverBookings.filter(r => (r.trip_id?._id || r.trip_id) === selectedTrip._id && r.status === 'confirmed')
const totalPassengers = tripReservations.reduce((sum, r) => sum + r.seats_booked, 0)

return (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowConfirmCancel(false)}>
<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-bold text-gray-800">Confirmer l'annulation</h2>
<button onClick={() => setShowConfirmCancel(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
<X className="w-5 h-5" />
</button>
</div>
<div className="mb-6">
<p className="text-gray-700 mb-4">Êtes-vous sûr de vouloir annuler ce trajet?</p>
<div className="bg-gray-50 rounded-xl p-4 space-y-2">
<div className="flex justify-between">
<span className="text-gray-600">Passagers affectés</span>
<span className="font-semibold">{totalPassengers}</span>
</div>
<div className="flex justify-between">
<span className="text-gray-600">Réservations</span>
<span className="font-semibold">{tripReservations.length}</span>
</div>
<div className="flex justify-between border-t border-gray-200 pt-2">
<span className="text-gray-600">Remboursement total</span>
<span className="font-bold text-primary">100%</span>
</div>
</div>
<div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
<p className="text-xs text-red-700 flex items-center gap-1">
<AlertTriangle className="w-4 h-4" />
Cette action est irréversible et affectera votre score de fiabilité
</p>
</div>
</div>
<div className="flex gap-4">
<button onClick={() => setShowConfirmCancel(false)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
Non, garder
</button>
<button onClick={confirmTripCancellation} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all">
Oui, annuler
</button>
</div>
</motion.div>
</motion.div>
)
})()}

{/* Review Modal */}
{showReviewModal && selectedPassenger && selectedTripForReview && (
<motion.div 
  initial={{ opacity: 0 }} 
  animate={{ opacity: 1 }} 
  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
  onClick={() => setShowReviewModal(false)}
>
<motion.div 
  initial={{ scale: 0.9 }} 
  animate={{ scale: 1 }} 
  onClick={(e) => e.stopPropagation()} 
  className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-md w-full"
>
<div className="flex items-center justify-between mb-6">
<h2 className="text-xl font-bold text-gray-900">Évaluer le passager</h2>
<button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
<X className="w-5 h-5 text-gray-500" />
</button>
</div>

<div className="mb-6">
<div className="flex items-center gap-3 mb-4">
{selectedPassenger.profile_picture || selectedPassenger.selfie_url ? (
<img 
  src={`${import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:5000'}/uploads/${selectedPassenger.profile_picture || selectedPassenger.selfie_url}`} 
  alt="Passenger" 
  className="w-12 h-12 rounded-full object-cover"
/>
) : (
<div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-lg font-bold">
{selectedPassenger.first_name?.charAt(0)}
</div>
)}
<div>
<p className="font-semibold text-gray-800">{selectedPassenger.first_name?.toUpperCase()} {selectedPassenger.last_name?.toUpperCase()}</p>
<p className="text-sm text-gray-600">Passager</p>
</div>
</div>
</div>

<form onSubmit={handleReviewSubmit} className="space-y-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Note *</label>
<div className="flex gap-2">
{[1, 2, 3, 4, 5].map(star => (
<button
key={star}
type="button"
onClick={() => setReviewForm({ ...reviewForm, rating: star })}
className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
reviewForm.rating >= star 
? 'text-yellow-400 bg-yellow-50' 
: 'text-gray-300 hover:text-yellow-400'
}`}
>
★
</button>
))}
</div>
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
<textarea
value={reviewForm.comment}
onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
placeholder="Partagez votre expérience avec ce passager..."
className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all resize-none bg-white"
rows={3}
maxLength={500}
/>
<p className="text-xs text-gray-500 mt-1">{reviewForm.comment.length}/500 caractères</p>
</div>

<div className="flex gap-3">
<button 
type="button"
onClick={() => setShowReviewModal(false)} 
className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
>
Annuler
</button>
<button 
type="submit"
className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
>
Envoyer l'avis
</button>
</div>
</form>
</motion.div>
</motion.div>
)}

{/* Incident Reporting Modal */}
{showIncidentModal && selectedBookingForIncident && (
  <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" 
    onClick={() => setShowIncidentModal(false)}
  >
    <motion.div 
      initial={{ scale: 0.9 }} 
      animate={{ scale: 1 }} 
      onClick={(e) => e.stopPropagation()} 
      className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 max-w-lg max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Flag className="w-5 h-5 text-red-500" />
          Signaler un incident
        </h3>
        <button onClick={() => setShowIncidentModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      
      <div className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Trajet concerné</h4>
          <p className="text-sm text-gray-600">
            {selectedBookingForIncident?.trip_id?.origin || 'Origine'} → {selectedBookingForIncident?.trip_id?.destination || 'Destination'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Passager: {selectedBookingForIncident?.passenger_id?.first_name || 'N/A'} {selectedBookingForIncident?.passenger_id?.last_name || ''}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'incident *</label>
          <input
            type="text"
            value={incidentForm.title}
            onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
            placeholder="Ex: Comportement inapproprié, dommage au véhicule..."
            maxLength={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type d'incident *</label>
          <select
            value={incidentForm.type}
            onChange={(e) => setIncidentForm({...incidentForm, type: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
          >
            <option value="safety">Sécurité / Conduite dangereuse</option>
            <option value="harassment">Harcèlement</option>
            <option value="vehicle_damage">Dommage au véhicule</option>
            <option value="payment_issue">Problème de paiement</option>
            <option value="cancellation_abuse">Annulation abusive</option>
            <option value="fraud">Fraude</option>
            <option value="other">Autre</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gravité</label>
          <select
            value={incidentForm.severity}
            onChange={(e) => setIncidentForm({...incidentForm, severity: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
          >
            <option value="low">Faible</option>
            <option value="medium">Moyenne</option>
            <option value="high">Élevée</option>
            <option value="critical">Critique</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description détaillée *</label>
          <textarea
            value={incidentForm.description}
            onChange={(e) => setIncidentForm({...incidentForm, description: e.target.value})}
            rows={4}
            maxLength={1000}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all resize-none"
            placeholder="Décrivez l'incident en détail, incluant l'heure, le lieu, et les circonstances..."
          />
          <p className="text-xs text-gray-500 mt-1">{incidentForm.description.length}/1000 caractères</p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p>• Les signalements sont traités par notre équipe administrative</p>
              <p>• Vous ne pouvez signaler que les trajets terminés</p>
              <p>• Délai de signalement: 48h après la fin du trajet</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button 
          onClick={() => setShowIncidentModal(false)} 
          className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
        >
          Annuler
        </button>
        <button 
          onClick={submitIncidentReport}
          className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
        >
          Signaler l'incident
        </button>
      </div>
    </motion.div>
  </motion.div>
)}
</div>
)
}

export default DriverDashboard