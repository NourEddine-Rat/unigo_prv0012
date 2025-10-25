import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Calendar, Clock, Users, DollarSign, Star, MessageCircle, AlertCircle, ArrowLeft, User, Navigation, Car, Shield, CheckCircle, ChevronDown, ChevronUp, X, Ban, UserCheck, CreditCard, Banknote, Coins } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'
const BACKEND_BASE_URL = import.meta.env?.VITE_BACKEND_BASE_URL || (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL)

const TripDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [seats, setSeats] = useState(1)
  const [showReserve, setShowReserve] = useState(false)
  const [trip, setTrip] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isBooking, setIsBooking] = useState(false)
  const [bookingPayment, setBookingPayment] = useState('unicard')
  const [bookingUniAmount, setBookingUniAmount] = useState(0)
  const [activeTab, setActiveTab] = useState('details')

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const token = localStorage.getItem('unigo_token')
        const res = await fetch(`${API_BASE_URL}/trips/${id}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
      if (!res.ok) throw new Error('Failed to load trip')
      const data = await res.json()
      const tripData = data.trip || data
      setTrip(tripData)
      } catch (e) {
        console.error('Trip fetch error:', e)
        toast.error('Erreur lors du chargement du trajet')
      } finally {
        setIsLoading(false)
      }
    }
    fetchTrip()
  }, [id])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">Chargement du trajet...</p>
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Trajet introuvable</p>
          <button 
            onClick={() => navigate(-1)}
            className="bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    )
  }

  const handleReserve = () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (trip.driver_id?._id === user._id) {
      toast.error('Vous ne pouvez pas réserver votre propre trajet')
      return
    }
    setBookingUniAmount(trip.price_per_seat * seats)
    setShowReserve(true)
  }

  const handleContact = () => {
    if (!user) {
      navigate('/login')
      return
    }
    if (trip.driver_id?._id === user._id) {
      toast.error('Vous ne pouvez pas vous contacter vous-même')
      return
    }
    navigate(`/chat/${trip.driver_id._id}`)
  }

  const confirmReservation = async () => {
    if (!trip || !user) return
    
    // Check if user account is verified and active
    if (user.status !== 'active') {
      toast.error('Votre compte n\'est pas encore actif. Vous ne pouvez pas réserver de trajets.')
      return
    }
    
    try {
      setIsBooking(true)
      const total = trip.price_per_seat * seats
      let unicard_amount = 0
      let cash_amount = 0
      
      if (bookingPayment === 'unicard') {
        unicard_amount = total
      } else if (bookingPayment === 'cash') {
        cash_amount = total
      } else {
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
      const response = await fetch(`${API_BASE_URL}/trips/${trip._id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          seats_booked: seats,
          payment_method: bookingPayment,
          unicard_amount,
          cash_amount,
          total_price: total
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erreur lors de la réservation')
      }

      const data = await response.json()
      toast.success('Réservation confirmée!')
      setShowReserve(false)
      navigate('/dashboard/passenger')
    } catch (error) {
      console.error('Booking error:', error)
      toast.error(error.message || 'Erreur lors de la réservation')
    } finally {
      setIsBooking(false)
    }
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { 
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <div className="flex items-center gap-4 p-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ChevronDown className="w-5 h-5 rotate-90 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-lg text-gray-900">Détails du trajet</h1>
            <p className="text-gray-500 text-sm">{formatDate(trip.departure_time || trip.date_time)}</p>
          </div>
        </div>
      </div>

      {/* Route Overview */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center pt-1">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <div className="w-0.5 h-12 bg-gray-300 my-1"></div>
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          </div>
          <div className="flex-1">
            <div className="mb-4">
              <p className="text-gray-500 text-sm">Départ</p>
              <p className="font-medium text-lg text-gray-900">{trip.departure?.address || trip.departure_text}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Arrivée</p>
              <p className="font-medium text-lg text-gray-900">{trip.arrival?.address || trip.arrival_text}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between bg-gray-50 rounded-2xl p-4">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Heure</p>
            <p className="font-semibold text-gray-900">{formatTime(trip.departure_time || trip.date_time)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">Durée</p>
            <p className="font-semibold text-gray-900">{Math.round(trip.estimated_duration / 60)} min</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">Distance</p>
            <p className="font-semibold text-gray-900">{trip.distance_km?.toFixed(1)} km</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex px-4">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'details' 
                ? 'border-black text-gray-900' 
                : 'border-transparent text-gray-500'
            }`}
          >
            Détails
          </button>
          <button
            onClick={() => setActiveTab('driver')}
            className={`flex-1 py-4 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'driver' 
                ? 'border-black text-gray-900' 
                : 'border-transparent text-gray-500'
            }`}
          >
            Message
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-center font-medium border-b-2 transition-colors ${
              activeTab === 'info' 
                ? 'border-black text-gray-900' 
                : 'border-transparent text-gray-500'
            }`}
          >
            Info
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'details' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Trip Details */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <Car className="w-5 h-5 text-blue-500" />
                  Informations du trajet
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-500">Date</span>
                    <span className="font-medium text-gray-900">{formatDate(trip.departure_time || trip.date_time)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200">
                    <span className="text-gray-500">Places disponibles</span>
                    <span className="font-medium text-gray-900">{trip.available_seats} / {trip.total_seats}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Rayon de recherche</span>
                    <span className="font-medium text-gray-900">{trip.radius_km} km</span>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              {(trip.tags?.length > 0 || trip.description) && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-semibold mb-3 text-gray-900">Préférences</h3>
                  {trip.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {trip.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm flex items-center gap-1">
                          {tag === 'non_smoke' ? <Ban className="w-3 h-3 text-red-500" /> : tag === 'female_only' ? <Users className="w-3 h-3 text-red-500" /> : null}
                          {tag === 'non_smoke' ? 'Non-fumeur' : tag === 'female_only' ? 'Femmes uniquement' : tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {trip.description && (
                    <p className="text-gray-600 text-sm">{trip.description}</p>
                  )}
                </div>
              )}

              {/* Meeting Point */}
              {trip.meeting_point && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                    <Navigation className="w-5 h-5 text-blue-500" />
                    Point de rencontre
                  </h3>
                  <p className="text-gray-600 text-sm">{trip.meeting_point}</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'driver' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Driver Profile */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-4 mb-4">
                  {(trip.driver_id?.profile_picture || trip.driver_id?.selfie_url) ? (
                    <img 
                      src={`${BACKEND_BASE_URL}/uploads/${trip.driver_id.profile_picture || trip.driver_id.selfie_url}`}
                      alt="Conducteur"
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {trip.driver_id?.first_name?.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-lg text-gray-900">{trip.driver_id?.first_name?.toUpperCase()} {trip.driver_id?.last_name?.toUpperCase()}</p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm text-gray-700">
                          {trip.driver_id?.rating_average?.toFixed(1) || '5.0'}
                        </span>
                      </div>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 text-sm">{trip.driver_id?.total_trips || 0} trajets</span>
                    </div>
                  </div>
                </div>

                {/* Verification Badges */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {trip.driver_id?.email_verified && (
                    <div className="flex items-center gap-2 p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-700">Email vérifié</span>
                    </div>
                  )}
                  {trip.driver_id?.document_verification?.cni_recto && (
                    <div className="flex items-center gap-2 p-2 bg-blue-100 rounded-lg">
                      <Shield className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-blue-700">CNI vérifiée</span>
                    </div>
                  )}
                  {trip.driver_id?.document_verification?.student_card && (
                    <div className="flex items-center gap-2 p-2 bg-purple-100 rounded-lg">
                      <User className="w-4 h-4 text-purple-500" />
                      <span className="text-xs text-purple-700">Carte étudiante</span>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleContact}
                  disabled={trip.driver_id?._id === user?._id}
                  className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5" />
                  {trip.driver_id?._id === user?._id ? 'Votre trajet' : 'Contacter le conducteur'}
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'info' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Payment Methods */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <DollarSign className="w-5 h-5 text-blue-500" />
                  Modes de paiement
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trip.payment_modes?.map(mode => (
                    <span key={mode} className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center gap-1">
                      {mode === 'cash' ? <Banknote className="w-4 h-4" /> : mode === 'unicard' ? <CreditCard className="w-4 h-4" /> : <Coins className="w-4 h-4" />}
                      {mode === 'cash' ? 'Espèces' : mode === 'unicard' ? 'UniCard' : 'Mixte'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-gray-900">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Politique d'annulation
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div>
                    <p className="font-semibold text-gray-900 mb-2">Pour les passagers:</p>
                    <ul className="space-y-1 ml-4">
                      <li>• <span className="font-medium">Plus de 24h avant:</span> Remboursement 100%</li>
                      <li>• <span className="font-medium">1h-24h avant:</span> Remboursement 50%</li>
                      <li>• <span className="font-medium">Moins d'1h:</span> Aucun remboursement</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Fixed Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <p className="text-2xl font-bold text-gray-900">{trip.price_per_seat} MAD</p>
            <p className="text-gray-500 text-sm">par place</p>
          </div>
          <button 
            onClick={handleReserve} 
            disabled={trip.available_seats === 0}
            className="bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {trip.available_seats === 0 ? 'Complet' : 'Réserver'}
          </button>
        </div>
      </div>

      {/* Reservation Modal */}
      {showReserve && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setShowReserve(false)}>
          <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                {/* Drag handle */}
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-1 bg-gray-300 rounded-full"></div>
                </div>

                <h2 className="text-2xl font-bold mb-6 text-gray-900">Confirmer</h2>

                <div className="space-y-6">
                  {/* Seats Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Nombre de places</label>
                    <div className="grid grid-cols-4 gap-2">
                      {Array.from({ length: Math.min(trip.available_seats, 4) }, (_, i) => i + 1).map(n => (
                        <button
                          key={n}
                          onClick={() => setSeats(n)}
                          className={`py-3 rounded-xl border-2 transition-all ${
                            seats === n 
                              ? 'border-black bg-black text-white' 
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Mode de paiement</label>
                    <div className="space-y-2">
                      {/* Always show all payment methods since trip.payment_modes is undefined */}
                      <label className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="payment"
                          value="unicard"
                          checked={bookingPayment === 'unicard'}
                          onChange={(e) => setBookingPayment(e.target.value)}
                          className="w-5 h-5 text-blue-500"
                        />
                        <span className="flex-1 font-medium text-gray-700 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Payer avec UniCard
                        </span>
                      </label>
                      <label className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="payment"
                          value="cash"
                          checked={bookingPayment === 'cash'}
                          onChange={(e) => setBookingPayment(e.target.value)}
                          className="w-5 h-5 text-blue-500"
                        />
                        <span className="flex-1 font-medium text-gray-700 flex items-center gap-2">
                          <Banknote className="w-4 h-4" />
                          Payer en espèces
                        </span>
                      </label>
                      <label className="flex items-center gap-4 p-4 border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="radio"
                          name="payment"
                          value="mixed"
                          checked={bookingPayment === 'mixed'}
                          onChange={(e) => setBookingPayment(e.target.value)}
                          className="w-5 h-5 text-blue-500"
                        />
                        <span className="flex-1 font-medium text-gray-700 flex items-center gap-2">
                          <Coins className="w-4 h-4" />
                          Paiement mixte
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Mixed Payment Amount */}
                  {bookingPayment === 'mixed' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant UniCard
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={trip.price_per_seat * seats}
                        value={bookingUniAmount}
                        onChange={(e) => setBookingUniAmount(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-gray-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {/* Price Summary */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">{trip.price_per_seat} MAD × {seats} place{seats > 1 ? 's' : ''}</span>
                        <span className="font-medium text-gray-900">{trip.price_per_seat * seats} MAD</span>
                      </div>
                      <div className="border-t border-gray-300 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-lg text-gray-900">Total</span>
                          <span className="text-2xl font-bold text-gray-900">{trip.price_per_seat * seats} MAD</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 mt-8">
                  <button 
                    onClick={() => setShowReserve(false)}
                    className="flex-1 py-4 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={confirmReservation}
                    disabled={isBooking}
                    className="flex-1 py-4 bg-black text-white rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBooking ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Réservation...
                      </div>
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TripDetail