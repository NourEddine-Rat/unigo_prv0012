import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, Calendar, DollarSign, Users, TrendingUp, MapPin, Clock, Edit2, Trash2, 
  Navigation, X, Search, Map, Car, Star, MessageCircle, Bell, Settings,
  ChevronRight, ChevronLeft, CheckCircle, AlertCircle, MoreVertical,
  UserCheck, UserX, Eye, Phone, Mail, Navigation as NavigationIcon
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { trips, cancellationReasons, districts } from '../data/mockData'
import { getCurrentPosition, searchPlaces, geocodeAddress, calculateDistance, formatDistance } from '../utils/geolocation'
import { useGeolocation } from '../hooks/useGeolocation'
import useUniversities from '../hooks/useUniversities'
import MapView from '../components/MapView'
import MessageWidget from '../components/MessageWidget'
import toast from 'react-hot-toast'

// API configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

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

const DriverDashboardModern = () => {
  const { user } = useAuth()
  const { getLocationWithAddress } = useGeolocation()
  const { universities } = useUniversities()
  
  // State management
  const [showCreateTrip, setShowCreateTrip] = useState(false)
  const [showCancelTrip, setShowCancelTrip] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [showConfirmCancel, setShowConfirmCancel] = useState(false)
  const [currentStep, setCurrentStep] = useState('details')
  const [mapSelectionMode, setMapSelectionMode] = useState(null)
  const [suggestions, setSuggestions] = useState({ departure: [], arrival: [] })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeField, setActiveField] = useState(null)
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false)
  const [searchTimeout, setSearchTimeout] = useState(null)
  const [driverTrips, setDriverTrips] = useState([])
  const [isBackendConnected, setIsBackendConnected] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)
  const [formMode, setFormMode] = useState('create')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedPassenger, setSelectedPassenger] = useState(null)
  const [selectedTripForReview, setSelectedTripForReview] = useState(null)
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: ''
  })
  const [reviewStatus, setReviewStatus] = useState({})
  const [driverBookings, setDriverBookings] = useState([])
  const [isLoadingBookings, setIsLoadingBookings] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
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

  const driverReservations = driverBookings

  // Calculate statistics
  const publishedTrips = driverTrips.filter(trip => trip.status === 'published' || trip.status === 'scheduled' || trip.status === 'active')
  const totalPassengers = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length
  const totalEarnings = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').reduce((sum, r) => {
    const trip = driverTrips.find(t => t._id === (r.trip_id?._id || r.trip_id))
    return sum + (trip?.price_per_seat || 0) * r.seats_booked
  }, 0)

  const totalBookingRequests = driverReservations.length
  const acceptedBookings = driverReservations.filter(r => r.status === 'confirmed' || r.status === 'completed').length
  const acceptanceRate = totalBookingRequests > 0 ? Math.round((acceptedBookings / totalBookingRequests) * 100) : 100

  const completedTrips = driverTrips.filter(trip => trip.status === 'completed').length
  const activeTrips = driverTrips.filter(trip => trip.status === 'active').length
  const pendingBookings = driverReservations.filter(r => r.status === 'pending').length

  const stats = [
    { icon: Car, label: 'Trajets', value: driverTrips.length, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', iconColor: 'text-blue-600' },
    { icon: Users, label: 'Passagers', value: totalPassengers, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', iconColor: 'text-purple-600' },
    { icon: DollarSign, label: 'Revenus', value: `${totalEarnings} MAD`, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', iconColor: 'text-green-600' },
    { icon: TrendingUp, label: 'Taux', value: `${acceptanceRate}%`, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', iconColor: 'text-orange-600' }
  ]

  const allLocations = [...universities, ...districts]

  // All the existing functions from the original component
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

    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    if ((field === 'departure_text' || field === 'arrival_text') && value.length > 1) {
      const predefinedMatches = allLocations.filter(loc =>
        loc.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 3)

      setSuggestions({ ...suggestions, [field]: predefinedMatches })
      setShowSuggestions(true)

      const timeout = setTimeout(async () => {
        setIsSearchingPlaces(true)
        try {
          const placeMatches = await searchPlaces(value, 7)
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
      }, 300)

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

    const locationData = {
      address: location.name,
      coordinates: location.coordinates || location.coords
    }

    if (field === 'departure_text') {
      setForm({ ...form, departure_text: location.name, departure_coords: locationData.coordinates })
    } else if (field === 'arrival_text') {
      setForm({ ...form, arrival_text: location.name, arrival_coords: locationData.coordinates })
    }

    if (field === 'departure_text' && form.arrival_coords) {
      calculateTripDetails(locationData.coordinates, form.arrival_coords)
    } else if (field === 'arrival_text' && form.departure_coords) {
      calculateTripDetails(form.departure_coords, locationData.coordinates)
    }
  }

  const calculateTripDetails = (departure, arrival) => {
    const distance = calculateDistance(departure.lat, departure.lng, arrival.lat, arrival.lng)
    const duration = Math.round((distance / 30) * 60)

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
      await cancelTrip(selectedTrip._id, cancelReason)
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

  const handleEditTrip = (trip) => {
    setEditingTrip(trip)
    setFormMode('edit')
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

  const handleDeleteTrip = async (trip) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce trajet ?')) {
      try {
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

        setDriverTrips(prevTrips => prevTrips.filter(t => t._id !== trip._id))
        toast.success('Trajet supprimé avec succès!')
      } catch (error) {
        console.error('Error deleting trip:', error)
        toast.error('Erreur lors de la suppression du trajet. Veuillez réessayer.')
      }
    }
  }

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
        headers: { times: 'Bearer ${token}' }
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
    } else if (currentStep === 'review') {
      try {
        const tripData = formatTripForAPI(form, user?._id)

        if (formMode === 'edit' && editingTrip && editingTrip._id) {
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
          setDriverTrips(prevTrips => prevTrips.map(trip => 
            trip._id === editingTrip._id ? updatedTrip.trip : trip
          ))

          toast.success('Trajet modifié avec succès!')
          setEditingTrip(null)
          setFormMode('create')
        } else {
          console.log('Creating trip with data:', tripData)
          const response = await createTrip(tripData)
          console.log('Trip creation response:', response)
          setDriverTrips(prevTrips => [response.trip, ...prevTrips])
          toast.success('Trajet créé avec succès!')
        }

        setShowCreateTrip(false)
        resetForm()
      } catch (error) {
        console.error('Error saving trip:', error)
        if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
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
          const initialTrips = trips.filter(t => t.driver_id === user?._id)
          setDriverTrips(initialTrips)
          if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
            toast('Serveur non disponible - Utilisation des données locales', { 
              icon: '⚠️',
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

  useEffect(() => {
    if (driverBookings.length > 0) {
      loadReviewStatuses(driverBookings)
    }
  }, [driverBookings])

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

  // Mobile sidebar component
  const MobileSidebar = () => (
    <AnimatePresence>
      {sidebarOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-50 lg:hidden"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <Car className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900">UniGo</h2>
                    <p className="text-sm text-gray-500">Conducteur</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <nav className="space-y-2">
                {[
                  { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
                  { id: 'trips', label: 'Mes trajets', icon: Car },
                  { id: 'bookings', label: 'Réservations', icon: Users },
                  { id: 'messages', label: 'Messages', icon: MessageCircle },
                  { id: 'settings', label: 'Paramètres', icon: Settings }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id)
                      setSidebarOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      activeTab === item.id 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-6 h-6" />
            </button>
            <div>
              <h1 className="font-bold text-gray-900">Tableau de bord</h1>
              <p className="text-sm text-gray-500">Conducteur</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Conducteur</h1>
              <p className="text-gray-600">Bienvenue, {user?.first_name?.toUpperCase()} !</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isBackendConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {isBackendConnected ? 'Connecté' : 'Hors ligne'}
                </span>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setFormMode('create'); setEditingTrip(null); setShowCreateTrip(true) }}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Nouveau trajet</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-64 bg-white shadow-sm border-r min-h-screen">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">UniGo</h2>
                <p className="text-sm text-gray-500">Conducteur</p>
              </div>
            </div>
            
            <nav className="space-y-2">
              {[
                { id: 'overview', label: 'Vue d\'ensemble', icon: TrendingUp },
                { id: 'trips', label: 'Mes trajets', icon: Car },
                { id: 'bookings', label: 'Réservations', icon: Users },
                { id: 'messages', label: 'Messages', icon: MessageCircle },
                { id: 'settings', label: 'Paramètres', icon: Settings }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === item.id 
                      ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-6">
          {/* Mobile Create Trip Button */}
          <div className="lg:hidden mb-6">
            <button 
              onClick={() => { setFormMode('create'); setEditingTrip(null); setShowCreateTrip(true) }}
              className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Créer un nouveau trajet
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                  <motion.div 
                    key={stat.label} 
                    initial={{ opacity: 0, scale: 0.9 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    transition={{ delay: i * 0.1 }}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                  >
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center mb-3`}>
                      <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-sm text-gray-600">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <button 
                    onClick={() => { setFormMode('create'); setEditingTrip(null); setShowCreateTrip(true) }}
                    className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Plus className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Nouveau trajet</p>
                        <p className="text-sm text-gray-500">Publier un trajet</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <NavigationIcon className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Navigation</p>
                        <p className="text-sm text-gray-500">Ouvrir GPS</p>
                      </div>
                    </div>
                  </button>
                  
                  <button className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Messages</p>
                        <p className="text-sm text-gray-500">Voir conversations</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activité récente</h3>
                <div className="space-y-3">
                  {driverTrips.slice(0, 3).map((trip) => (
                    <div key={trip._id || trip.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-3 h-3 rounded-full ${
                        trip.status === 'active' ? 'bg-green-500' :
                        trip.status === 'published' ? 'bg-blue-500' :
                        trip.status === 'completed' ? 'bg-gray-500' :
                        'bg-red-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {trip.departure?.address || trip.departure_text} → {trip.arrival?.address || trip.arrival_text}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(trip.departure_time).toLocaleDateString('fr-FR')} • {trip.price_per_seat} MAD
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
                  {driverTrips.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Aucune activité récente</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'trips' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Mes trajets</h3>
                </div>
                <div className="divide-y divide-gray-100">
                  {driverTrips.map(trip => {
                    const tripReservations = driverBookings.filter(r => (r.trip_id?._id || r.trip_id) === trip._id)
                    return (
                      <div key={trip._id || trip.id} className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full" />
                              <p className="font-semibold text-gray-900">{trip.departure?.address || trip.departure_text}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-red-500 rounded-full" />
                              <p className="font-semibold text-gray-900">{trip.arrival?.address || trip.arrival_text}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
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
                                {trip.available_seats}/{trip.total_seats} places
                              </div>
                              <div className="text-blue-600 font-semibold">{trip.price_per_seat} MAD</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
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
                                className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                              >
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
                                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Terminer
                              </button>
                            ) : null}
                            {trip.status !== 'completed' && (
                              <>
                                <button onClick={() => handleEditTrip(trip)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeleteTrip(trip)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {tripReservations.length > 0 && (
                          <div className="border-t border-gray-100 pt-4 mt-4">
                            <p className="text-sm font-medium text-gray-700 mb-3">{tripReservations.length} réservation(s)</p>
                            <div className="space-y-3">
                              {tripReservations.map(res => (
                                <div key={res._id || res.id} className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {res.passenger_id?.first_name?.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{res.passenger_id?.first_name?.toUpperCase()} {res.passenger_id?.last_name?.toUpperCase()}</p>
                                        <p className="text-xs text-gray-500">{res.seats_booked} place(s) • {res.payment_method} • {res.total_price} MAD</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        res.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                                        res.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                                        res.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                                        'bg-gray-100 text-gray-700'
                                      }`}>
                                        {res.status}
                                      </span>
                                      {res.status === 'pending' && (
                                        <>
                                          <button 
                                            onClick={async () => {
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
                                            }}
                                            className="px-3 py-1 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                          >
                                            Confirmer
                                          </button>
                                          <button 
                                            onClick={async () => {
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
                                            }}
                                            className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                          >
                                            Annuler
                                          </button>
                                        </>
                                      )}
                                      {res.status === 'completed' && (() => {
                                        const reviewKey = `${trip._id}-${res.passenger_id._id || res.passenger_id}`
                                        const hasReviewed = reviewStatus[reviewKey]
                                        
                                        return hasReviewed ? (
                                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                                            ✓ Évalué
                                          </span>
                                        ) : (
                                          <button 
                                            onClick={() => handleReviewPassenger(res.passenger_id, trip)}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                          >
                                            Évaluer
                                          </button>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {driverTrips.length === 0 && (
                    <div className="p-12 text-center">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">Vous n'avez pas encore publié de trajet</p>
                      <button 
                        onClick={() => { setFormMode('create'); setEditingTrip(null); setShowCreateTrip(true) }}
                        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                      >
                        Créer votre premier trajet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">Réservations</h3>
              </div>
              <div className="p-6">
                {isLoadingBookings ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="text-gray-500 mt-2">Chargement des réservations...</p>
                  </div>
                ) : driverBookings.length > 0 ? (
                  <div className="space-y-4">
                    {driverBookings.map(booking => (
                      <div key={booking._id || booking.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                              {booking.passenger_id?.first_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{booking.passenger_id?.first_name?.toUpperCase()} {booking.passenger_id?.last_name?.toUpperCase()}</p>
                              <p className="text-sm text-gray-500">{booking.seats_booked} place(s) • {booking.total_price} MAD</p>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 
                            booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                            booking.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Aucune réservation pour le moment</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <MessageWidget />
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Notifications</p>
                      <p className="text-sm text-gray-500">Recevoir des notifications pour les nouvelles réservations</p>
                    </div>
                    <button className="w-12 h-6 bg-blue-500 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5"></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">Mode sombre</p>
                      <p className="text-sm text-gray-500">Activer le thème sombre</p>
                    </div>
                    <button className="w-12 h-6 bg-gray-300 rounded-full relative">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar />

      {/* Create Trip Modal */}
      {showCreateTrip && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
          onClick={() => setShowCreateTrip(false)}
        >
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 lg:p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg lg:text-2xl font-bold">
                  {editingTrip ? 'Modifier le trajet' : 'Créer un nouveau trajet'}
                </h2>
                <button 
                  onClick={() => { setShowCreateTrip(false); setFormMode('create'); setEditingTrip(null) }} 
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 lg:w-6 lg:h-6" />
                </button>
              </div>
              {/* Progress Steps */}
              <div className="flex items-center justify-center mt-4 space-x-2 lg:space-x-4">
                {[
                  { key: 'details', label: 'Détails' }, 
                  { key: 'map', label: 'Carte' }, 
                  { key: 'review', label: 'Récapitulatif' }
                ].map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-semibold ${
                      currentStep === step.key ? 'bg-white text-blue-600' : 
                      index < ['details', 'map', 'review'].indexOf(currentStep) ? 'bg-white/30 text-white' : 'bg-white/20 text-white/70'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="ml-1 lg:ml-2 text-xs lg:text-sm font-medium hidden sm:block">{step.label}</span>
                    {index < 2 && <div className="w-4 lg:w-8 h-0.5 bg-white/30 mx-2 lg:mx-4" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-4 lg:p-6 max-h-[60vh] overflow-y-auto">
              {currentStep === 'details' && (
                <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                  <div className="grid grid-cols-1 gap-4 lg:gap-6">
                    {/* Departure */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Départ *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                        <input 
                          type="text" 
                          value={form.departure_text} 
                          onChange={(e) => handleInputChange('departure_text', e.target.value)} 
                          required 
                          className="w-full pl-10 pr-12 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                          placeholder="Ville, quartier, université..." 
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            type="button"
                            onClick={() => startMapSelection('departure')}
                            className="p-1 text-green-500 hover:text-green-600 transition-colors"
                            title="Sélectionner sur la carte"
                          >
                            <Map className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleLocationClick('departure')} 
                            className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                            title="Utiliser ma position"
                          >
                            <Navigation className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Arrival */}
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Arrivée *</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 lg:w-5 lg:h-5 text-gray-400" />
                        <input 
                          type="text" 
                          value={form.arrival_text} 
                          onChange={(e) => handleInputChange('arrival_text', e.target.value)} 
                          required 
                          className="w-full pl-10 pr-12 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                          placeholder="Ville, quartier, université..." 
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                          <button 
                            type="button"
                            onClick={() => startMapSelection('arrival')}
                            className="p-1 text-red-500 hover:text-red-600 transition-colors"
                            title="Sélectionner sur la carte"
                          >
                            <Map className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => handleLocationClick('arrival')} 
                            className="p-1 text-blue-500 hover:text-blue-600 transition-colors"
                            title="Utiliser ma position"
                          >
                            <Navigation className="w-4 h-4 lg:w-5 lg:h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Trip Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Type de trajet</label>
                      <select 
                        value={form.type} 
                        onChange={(e) => setForm({ ...form, type: e.target.value })} 
                        className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base"
                      >
                        <option value="oneway">Aller simple</option>
                        <option value="return">Retour</option>
                        <option value="roundtrip">Aller-retour</option>
                      </select>
                    </div>

                    {/* Date and Time */}
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date et heure de départ *</label>
                        <input 
                          type="datetime-local" 
                          value={form.date_time} 
                          onChange={(e) => setForm({ ...form, date_time: e.target.value })} 
                          required 
                          className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                        />
                      </div>
                      {form.type === 'roundtrip' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Date et heure de retour</label>
                          <input 
                            type="datetime-local" 
                            value={form.return_date_time} 
                            onChange={(e) => setForm({ ...form, return_date_time: e.target.value })} 
                            className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                          />
                        </div>
                      )}
                    </div>

                    {/* Price and Seats */}
                    <div className="grid grid-cols-2 gap-4 lg:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Prix par place (MAD) *</label>
                        <input 
                          type="number" 
                          value={form.price_per_seat} 
                          onChange={(e) => setForm({ ...form, price_per_seat: e.target.value })} 
                          required 
                          min="1" 
                          className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de places *</label>
                        <input 
                          type="number" 
                          value={form.total_seats} 
                          onChange={(e) => setForm({ ...form, total_seats: Number(e.target.value) })} 
                          required 
                          min="1" 
                          max="8" 
                          className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                        />
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Rayon de recherche (km)</label>
                        <select 
                          value={form.radius_km} 
                          onChange={(e) => setForm({ ...form, radius_km: Number(e.target.value) })} 
                          className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base"
                        >
                          {[1, 2, 5, 10, 30, 60].map(r => <option key={r} value={r}>{r} km</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Point de rencontre</label>
                        <input 
                          type="text" 
                          value={form.meeting_point} 
                          onChange={(e) => setForm({ ...form, meeting_point: e.target.value })} 
                          className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base" 
                          placeholder="Ex: Devant l'entrée principale" 
                        />
                      </div>
                    </div>

                    {/* Payment Modes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Modes de paiement acceptés</label>
                      <div className="flex gap-4 lg:gap-6">
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={form.payment_modes.includes('cash')} 
                            onChange={(e) => {
                              const modes = e.target.checked ? [...form.payment_modes, 'cash'] : form.payment_modes.filter(m => m !== 'cash')
                              setForm({ ...form, payment_modes: modes })
                            }} 
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700">💵 Cash</span>
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={form.payment_modes.includes('unicard')} 
                            onChange={(e) => {
                              const modes = e.target.checked ? [...form.payment_modes, 'unicard'] : form.payment_modes.filter(m => m !== 'unicard')
                              setForm({ ...form, payment_modes: modes })
                            }} 
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700">💳 UniCard</span>
                        </label>
                      </div>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Préférences</label>
                      <div className="flex gap-4 lg:gap-6">
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={form.tags.includes('non_smoke')} 
                            onChange={(e) => {
                              const tags = e.target.checked ? [...form.tags, 'non_smoke'] : form.tags.filter(t => t !== 'non_smoke')
                              setForm({ ...form, tags })
                            }} 
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700">🚭 Non-fumeur</span>
                        </label>
                        <label className="flex items-center">
                          <input 
                            type="checkbox" 
                            checked={form.tags.includes('female_only')} 
                            onChange={(e) => {
                              const tags = e.target.checked ? [...form.tags, 'female_only'] : form.tags.filter(t => t !== 'female_only')
                              setForm({ ...form, tags })
                            }} 
                            className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500" 
                          />
                          <span className="ml-2 text-sm text-gray-700">👩 Femmes uniquement</span>
                        </label>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Description (optionnel)</label>
                      <textarea 
                        value={form.description} 
                        onChange={(e) => setForm({ ...form, description: e.target.value })} 
                        rows={3} 
                        className="w-full px-4 py-2 lg:py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base resize-none" 
                        placeholder="Informations supplémentaires sur le trajet..." 
                      />
                    </div>
                  </div>
                </form>
              )}

              {currentStep === 'map' && (
                <div className="space-y-4 lg:space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">Sélectionnez les points sur la carte</h3>
                    <p className="text-sm lg:text-base text-gray-600">Cliquez sur la carte pour confirmer les coordonnées de départ et d'arrivée</p>
                  </div>
                  <div className="h-64 lg:h-96 rounded-xl overflow-hidden border border-gray-200">
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
                      <button 
                        onClick={cancelMapSelection} 
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm lg:text-base"
                      >
                        Annuler la sélection
                      </button>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'review' && (
                <div className="space-y-4 lg:space-y-6">
                  <div className="text-center">
                    <h3 className="text-lg lg:text-xl font-semibold text-gray-800 mb-2">Récapitulatif du trajet</h3>
                    <p className="text-sm lg:text-base text-gray-600">Vérifiez les informations avant de publier</p>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4 lg:p-6 space-y-4">
                    {/* Route */}
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm lg:text-base">{form.departure_text}</p>
                        <p className="text-xs lg:text-sm text-gray-500">Départ</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm lg:text-base">{form.arrival_text}</p>
                        <p className="text-xs lg:text-sm text-gray-500">Arrivée</p>
                      </div>
                    </div>

                    {/* Trip Details */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
                      <div className="text-center">
                        <p className="text-lg lg:text-2xl font-bold text-blue-600">{form.price_per_seat} MAD</p>
                        <p className="text-xs lg:text-sm text-gray-500">par place</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg lg:text-2xl font-bold text-gray-800">{form.total_seats}</p>
                        <p className="text-xs lg:text-sm text-gray-500">places</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg lg:text-2xl font-bold text-gray-800">{form.estimated_duration}</p>
                        <p className="text-xs lg:text-sm text-gray-500">minutes</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg lg:text-2xl font-bold text-gray-800">{formatDistance(form.distance_km)}</p>
                        <p className="text-xs lg:text-sm text-gray-500">distance</p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      <p className="text-sm lg:text-base"><span className="font-medium">Type:</span> {form.type === 'oneway' ? 'Aller simple' : form.type === 'return' ? 'Retour' : 'Aller-retour'}</p>
                      <p className="text-sm lg:text-base"><span className="font-medium">Paiement:</span> {form.payment_modes.map(mode => mode === 'cash' ? 'Cash' : 'UniCard').join(', ')}</p>
                      <p className="text-sm lg:text-base"><span className="font-medium">Rayon:</span> {form.radius_km} km</p>
                      {form.meeting_point && <p className="text-sm lg:text-base"><span className="font-medium">Point de rencontre:</span> {form.meeting_point}</p>}
                      {form.tags.length > 0 && <p className="text-sm lg:text-base"><span className="font-medium">Préférences:</span> {form.tags.map(tag => tag === 'non_smoke' ? 'Non-fumeur' : 'Femmes uniquement').join(', ')}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 lg:px-6 py-4 flex justify-between">
              <button 
                type="button" 
                onClick={() => setShowCreateTrip(false)} 
                className="px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm lg:text-base"
              >
                Annuler
              </button>
              <div className="flex gap-2 lg:gap-3">
                {currentStep !== 'details' && (
                  <button 
                    type="button" 
                    onClick={prevStep} 
                    className="px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm lg:text-base"
                  >
                    Précédent
                  </button>
                )}
                <button 
                  type="button" 
                  onClick={currentStep === 'review' ? handleSubmit : nextStep} 
                  className="px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm lg:text-base"
                >
                  {currentStep === 'review' ? (formMode === 'edit' ? 'Mettre à jour' : 'Publier') : 'Suivant'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && (suggestions.departure_text?.length > 0 || suggestions.arrival_text?.length > 0) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: -10 }}
          className="fixed z-50 w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 max-h-60 overflow-y-auto"
          style={{ 
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
          }}
        >
          {(suggestions[activeField] || []).map((loc, index) => (
            <button 
              key={`${activeField}-${loc._id || loc.id || index}`} 
              onClick={() => selectSuggestion(activeField, loc)} 
              className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate text-sm">{loc.name}</p>
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
                <span className="text-xs">Recherche de lieux...</span>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Cancel Trip Modal */}
      {showCancelTrip && selectedTrip && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
          onClick={() => setShowCancelTrip(false)}
        >
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl p-6 lg:p-8 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-800">Annuler le trajet</h2>
              <button 
                onClick={() => setShowCancelTrip(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 lg:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Raison de l'annulation *</label>
              <select 
                value={cancelReason} 
                onChange={(e) => setCancelReason(e.target.value)} 
                required 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm lg:text-base"
              >
                <option value="">Sélectionner une raison</option>
                {cancellationReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 lg:mb-6">
              <p className="text-sm text-gray-700 font-medium mb-2">Important:</p>
              <p className="text-xs text-gray-600">Les passagers seront automatiquement notifiés et remboursés intégralement. Votre score de fiabilité sera affecté.</p>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowCancelTrip(false)} 
                className="flex-1 px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm lg:text-base"
              >
                Retour
              </button>
              <button 
                onClick={handleCancelTripSubmit} 
                disabled={!cancelReason} 
                className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base"
              >
                Continuer
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Confirm Cancel Modal */}
      {showConfirmCancel && selectedTrip && (() => {
        const tripReservations = driverBookings.filter(r => (r.trip_id?._id || r.trip_id) === selectedTrip._id && r.status === 'confirmed')
        const totalPassengers = tripReservations.reduce((sum, r) => sum + r.seats_booked, 0)

        return (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
            onClick={() => setShowConfirmCancel(false)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              onClick={(e) => e.stopPropagation()} 
              className="bg-white rounded-3xl shadow-2xl p-6 lg:p-8 max-w-md w-full"
            >
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h2 className="text-lg lg:text-2xl font-bold text-gray-800">Confirmer l'annulation</h2>
                <button 
                  onClick={() => setShowConfirmCancel(false)} 
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4 lg:mb-6">
                <p className="text-gray-700 mb-4 text-sm lg:text-base">Êtes-vous sûr de vouloir annuler ce trajet?</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm lg:text-base">Passagers affectés</span>
                    <span className="font-semibold text-sm lg:text-base">{totalPassengers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 text-sm lg:text-base">Réservations</span>
                    <span className="font-semibold text-sm lg:text-base">{tripReservations.length}</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-2">
                    <span className="text-gray-600 text-sm lg:text-base">Remboursement total</span>
                    <span className="font-bold text-blue-600 text-sm lg:text-base">100%</span>
                  </div>
                </div>
                <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-700">⚠️ Cette action est irréversible et affectera votre score de fiabilité</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowConfirmCancel(false)} 
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm lg:text-base"
                >
                  Non, garder
                </button>
                <button 
                  onClick={confirmTripCancellation} 
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all text-sm lg:text-base"
                >
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" 
          onClick={() => setShowReviewModal(false)}
        >
          <motion.div 
            initial={{ scale: 0.9 }} 
            animate={{ scale: 1 }} 
            onClick={(e) => e.stopPropagation()} 
            className="bg-white rounded-3xl shadow-2xl p-6 lg:p-8 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h2 className="text-lg lg:text-2xl font-bold text-gray-800">Évaluer le passager</h2>
              <button 
                onClick={() => setShowReviewModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 lg:mb-6">
              <div className="flex items-center gap-3 mb-4">
                {selectedPassenger.profile_picture || selectedPassenger.selfie_url ? (
                  <img 
                    src={`${import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:5000'}/uploads/${selectedPassenger.profile_picture || selectedPassenger.selfie_url}`} 
                    alt="Passenger" 
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm lg:text-lg font-bold">
                    {selectedPassenger.first_name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-gray-800 text-sm lg:text-base">{selectedPassenger.first_name?.toUpperCase()} {selectedPassenger.last_name?.toUpperCase()}</p>
                  <p className="text-xs lg:text-sm text-gray-600">Passager</p>
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
                      className={`w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center text-sm lg:text-lg transition-all ${
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
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none text-sm lg:text-base"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">{reviewForm.comment.length}/500 caractères</p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="button"
                  onClick={() => setShowReviewModal(false)} 
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all text-sm lg:text-base"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all text-sm lg:text-base"
                >
                  Envoyer l'avis
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}

export default DriverDashboardModern