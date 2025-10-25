import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search, Calendar, CreditCard, User, AlertCircle, Clock, MapPin, X, Flag, FileText, Ban, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { cancellationReasons } from '../data/mockData'
import MessageWidget from '../components/MessageWidget'
import toast from 'react-hot-toast'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'

const PassengerDashboard = () => {
const { user } = useAuth()
const [hideCompleted, setHideCompleted] = useState(false)
const [showCancelModal, setShowCancelModal] = useState(false)
const [selectedReservation, setSelectedReservation] = useState(null)
const [cancelReason, setCancelReason] = useState('')
const [showConfirmCancel, setShowConfirmCancel] = useState(false)
const [bookings, setBookings] = useState([])
const [isLoading, setIsLoading] = useState(false)
const [showReviewModal, setShowReviewModal] = useState(false)
const [reviewTarget, setReviewTarget] = useState(null)
const [reviewRating, setReviewRating] = useState(5)
const [reviewComment, setReviewComment] = useState('')
const [reviewStatus, setReviewStatus] = useState({}) // Track review status
const [showIncidentModal, setShowIncidentModal] = useState(false)
const [selectedTripForIncident, setSelectedTripForIncident] = useState(null)
const [incidentForm, setIncidentForm] = useState({
  title: '',
  description: '',
  type: 'other',
  severity: 'medium'
})


const sortedReservations = [...bookings].sort((a, b) => {
  const aIsUpcoming = a.status === 'confirmed' || a.status === 'pending'
  const bIsUpcoming = b.status === 'confirmed' || b.status === 'pending'
  
  if (aIsUpcoming && !bIsUpcoming) return -1
  if (!aIsUpcoming && bIsUpcoming) return 1
  return 0
})


const filteredReservations = sortedReservations.filter(reservation => {
  const isCompleted = reservation.status === 'completed' || reservation.status === 'cancelled'

  return !hideCompleted || !isCompleted
})


const upcomingCount = bookings.filter(r => r.status === 'confirmed' || r.status === 'pending').length
const completedCount = bookings.filter(r => r.status === 'completed' || r.status === 'cancelled').length

console.log('Passenger Dashboard Statistics:', {
  totalBookings: bookings.length,
  upcomingReservations: upcomingCount,
  completedReservations: completedCount,
  bookingsData: bookings.map(booking => ({
    id: booking._id,
    status: booking.status,
    tripId: booking.trip_id?._id || booking.trip_id,
    driverName: booking.driver_id?.first_name || 'Unknown'
  }))
})

const stats = [
{ icon: Calendar, label: 'Réservations', value: bookings.length },
{ icon: CreditCard, label: 'UniCard', value: `${user?.unicard_balance || 0} pts` },
{ icon: Clock, label: 'À venir', value: upcomingCount }
]

const fetchBookings = async () => {
  try {
    setIsLoading(true)
    const token = localStorage.getItem('unigo_token')
    console.log('Fetching bookings for user:', user?._id)
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    const bookingsData = Array.isArray(data) ? data : (data.bookings || [])
    console.log('Bookings loaded:', bookingsData.length, 'bookings')
    console.log('Bookings data:', bookingsData)
    setBookings(bookingsData)
  } catch (e) {
    console.error('Failed to load bookings', e)
    toast.error("Impossible de charger vos réservations")
  } finally {
    setIsLoading(false)
  }
}

useEffect(() => {
  fetchBookings()

}, [])


useEffect(() => {
  if (bookings.length > 0) {
    loadReviewStatuses(bookings)
  }
}, [bookings])

const loadReviewStatuses = async (bookings) => {
  const completedBookings = bookings.filter(booking => booking.status === 'completed')
  const statusPromises = []
  
  for (const booking of completedBookings) {
    const reviewKey = `${booking.trip_id?._id || booking.trip_id}-${booking.driver_id._id || booking.driver_id}`
    statusPromises.push(
      checkReviewStatus(booking.trip_id?._id || booking.trip_id, booking.driver_id._id || booking.driver_id)
        .then(hasReviewed => ({ key: reviewKey, hasReviewed }))
    )
  }
  
  const results = await Promise.all(statusPromises)
  const newReviewStatus = {}
  results.forEach(({ key, hasReviewed }) => {
    if (hasReviewed) newReviewStatus[key] = true
  })
  setReviewStatus(prev => ({ ...prev, ...newReviewStatus }))
}

const checkReviewStatus = async (tripId, driverId) => {
  try {
    const token = localStorage.getItem('unigo_token')
    const response = await fetch(`${API_BASE_URL}/reviews/check/${tripId}/${driverId}`, {
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

const handleCancelClick = (reservation) => {
setSelectedReservation(reservation)
setShowCancelModal(true)
}

const handleCancelSubmit = () => {
  if (!cancelReason) return
  setShowCancelModal(false)
  setShowConfirmCancel(true)
}

const confirmCancellation = async () => {
  try {
    const token = localStorage.getItem('unigo_token')
    const res = await fetch(`${API_BASE_URL}/bookings/${selectedReservation._id || selectedReservation.id}/cancel`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ reason: cancelReason })
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    toast.success('Réservation annulée')
    setShowConfirmCancel(false)
    setCancelReason('')
    setSelectedReservation(null)
    fetchBookings()
  } catch (e) {
    console.error('Cancel booking failed', e)
    toast.error("Échec de l'annulation")
  }
}


const openIncidentModal = (trip) => {
  setSelectedTripForIncident(trip)
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
    

    console.log('Reporting incident for booking:', selectedTripForIncident)
    console.log('Booking status:', selectedTripForIncident.status)
    console.log('Trip ID:', selectedTripForIncident.trip_id?._id || selectedTripForIncident.trip_id)
    
    const res = await fetch(`${API_BASE_URL}/incidents/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        ...incidentForm,
        trip_id: selectedTripForIncident.trip_id?._id || selectedTripForIncident.trip_id,
        reported_against_user_id: selectedTripForIncident.driver_id?._id || selectedTripForIncident.driver_id
      })
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || `HTTP ${res.status}`)
    }

    toast.success('Incident signalé avec succès')
    setShowIncidentModal(false)
    setSelectedTripForIncident(null)
    setIncidentForm({ title: '', description: '', type: 'other', severity: 'medium' })
  } catch (e) {
    console.error('Incident reporting failed', e)
    toast.error(`Échec du signalement: ${e.message}`)
  }
}


const canReportIncident = (trip) => {

  if (!trip || !['completed', 'cancelled'].includes(trip.status)) return false
  


  const tripEndTime = trip.status === 'completed' 
    ? (trip.trip_id?.arrival_time || trip.updated_at || trip.created_at)
    : (trip.updated_at || trip.created_at)
  
  if (!tripEndTime) return false
  
  const hoursSinceTripEnd = (new Date() - new Date(tripEndTime)) / (1000 * 60 * 60)
  
  return hoursSinceTripEnd <= 48
}

return (
<div className="min-h-screen bg-gray-50">
{/* Modern Header */}
<motion.div 
  initial={{ opacity: 0, y: 20 }} 
  animate={{ opacity: 1, y: 0 }} 
  className="bg-white border-b border-gray-100 sticky top-0 z-20"
>
  <div className="max-w-7xl mx-auto px-4 py-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Passager</h1>
        <p className="text-gray-600 text-sm">Bienvenue, {user?.first_name?.toUpperCase()} !</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
        <span className="text-xs text-gray-500">En ligne</span>
      </div>
    </div>
  </div>
</motion.div>

<div className="max-w-7xl mx-auto px-4 py-6">

{/* Statistics Cards - Modern Design */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
{/* Quick Actions */}
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
<Link to="/search" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group">
<div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<Search className="w-6 h-6 text-gray-600" />
</div>
<h3 className="text-xl font-bold text-gray-900 mb-2">Rechercher un trajet</h3>
<p className="text-gray-600">Trouvez votre prochain trajet</p>
</Link>

<Link to="/unicard" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group">
<div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<CreditCard className="w-6 h-6 text-gray-600" />
</div>
<h3 className="text-xl font-bold text-gray-900 mb-2">UniCard</h3>
<p className="text-gray-600">Gérer vos points et paiements</p>
</Link>

<Link to="/profile" className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all group sm:col-span-2">
<div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
<User className="w-6 h-6 text-gray-600" />
</div>
<h3 className="text-xl font-bold text-gray-900 mb-2">Mon profil</h3>
<p className="text-gray-600">Modifier vos informations</p>
</Link>
</div>

{/* Messages Widget */}
<MessageWidget />
</div>

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:border-gray-300 transition-all">
<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-bold text-gray-900">Mes réservations</h2>
<div className="flex items-center gap-3">

<label className="flex items-center gap-2 cursor-pointer">
  <input 
    type="checkbox" 
    checked={hideCompleted} 
    onChange={(e) => setHideCompleted(e.target.checked)}
    className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2"
  />
  <span className="text-sm text-gray-700">Masquer les terminées</span>
</label>
</div>
</div>

<div className="space-y-4">
{filteredReservations.map(reservation => {
const trip = reservation.trip_id || {}
const tripId = trip._id || reservation.trip_id
return (
<div key={reservation._id || reservation.id} className={`border rounded-xl p-4 hover:shadow-md transition-all ${
  reservation.status === 'completed' ? 'border-gray-200 bg-gray-50/50' : 'border-gray-200 hover:border-gray-300'
}`}>
<div className="flex items-start justify-between mb-3">
<div>
<div className="flex items-center gap-2 mb-1">
<div className="w-2 h-2 bg-green-500 rounded-full" />
<p className="font-semibold text-gray-900">{trip?.departure?.address || trip?.departure_text}</p>
</div>
<div className="flex items-center gap-2">
<div className="w-2 h-2 bg-red-500 rounded-full" />
<p className="font-semibold text-gray-900">{trip?.arrival?.address || trip?.arrival_text}</p>
</div>
</div>
<div className="flex items-center gap-2">
<span className={`px-3 py-1 rounded-full text-xs font-medium ${
reservation.status === 'confirmed' ? 'bg-green-100 text-green-700' :
reservation.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
reservation.status === 'cancelled' ? 'bg-red-100 text-red-700' :
'bg-gray-100 text-gray-700'
}`}>
{reservation.status === 'confirmed' ? 'Confirmé' :
reservation.status === 'pending' ? 'En attente' :
reservation.status === 'cancelled' ? 'Annulé' : 'Terminé'}
</span>
{canReportIncident(reservation) && (
  <button 
    onClick={() => openIncidentModal(reservation)} 
    className="p-1.5 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
    title="Signaler un incident"
  >
    <Flag className="w-4 h-4" />
  </button>
)}
</div>
</div>
<div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
<div className="flex items-center gap-1">
<Calendar className="w-4 h-4" />
{trip?.departure_time ? new Date(trip.departure_time).toLocaleDateString('fr-FR') : ''}
</div>
<div className="flex items-center gap-1">
<Clock className="w-4 h-4" />
{trip?.departure_time ? new Date(trip.departure_time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}
</div>
<div className="flex items-center gap-2">
<span className="text-gray-900 font-semibold">{reservation.total_price} MAD</span>
{trip?.tags?.includes('non_smoke') && (
  <Ban className="w-3 h-3 text-red-500" />
)}
{trip?.tags?.includes('female_only') && (
  <Users className="w-3 h-3 text-red-500" />
)}
</div>
</div>
<div className="flex gap-2">
<Link to={`/trip/${tripId}`} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
Détails
</Link>
{reservation.status === 'confirmed' && reservation.driver_id && (user?._id !== (reservation.driver_id._id || reservation.driver_id)) && (
<Link to={`/chat/${reservation.driver_id._id || reservation.driver_id}`} className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors">
Contact
</Link>
)}
{reservation.status === 'completed' && reservation.driver_id && (() => {
  const reviewKey = `${reservation.trip_id?._id || reservation.trip_id}-${reservation.driver_id._id || reservation.driver_id}`
  const hasReviewed = reviewStatus[reviewKey]
  
  return hasReviewed ? (
    <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
      ✓ Évalué
    </span>
  ) : (
    <button onClick={() => { setReviewTarget(reservation); setReviewRating(5); setReviewComment(''); setShowReviewModal(true); }} className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors">
      Donner un avis
    </button>
  )
})()}
{(reservation.status === 'confirmed' || reservation.status === 'pending') && (
<button onClick={() => handleCancelClick(reservation)} className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
Annuler
</button>
)}
</div>
</div>
)
})}
{filteredReservations.length === 0 && (
<div className="text-center py-12">
<AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
<p className="text-gray-500">
  {hideCompleted ? 'Aucune réservation à venir' : 'Aucune réservation trouvée'}
</p>
{hideCompleted && completedCount > 0 && (
<p className="text-sm text-gray-400 mt-2">
  {completedCount} réservation(s) terminée(s) masquée(s)
</p>
)}
</div>
)}
</div>
</motion.div>

{showCancelModal && selectedReservation && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowCancelModal(false)}>
<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
<div className="flex items-center justify-between mb-6">
<h2 className="text-xl font-bold text-gray-900">Annuler la réservation</h2>
<button onClick={() => setShowCancelModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
<p className="text-sm text-gray-700 font-medium mb-2">Politique de remboursement:</p>
<ul className="text-xs text-gray-600 space-y-1">
<li>• &gt;24h avant: Remboursement complet (100%)</li>
<li>• 1-24h avant: Remboursement partiel (50%)</li>
<li>• &lt;1h avant: Aucun remboursement (0%)</li>
</ul>
</div>
<div className="flex gap-3">
<button onClick={() => setShowCancelModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
Retour
</button>
<button onClick={handleCancelSubmit} disabled={!cancelReason} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
Continuer
</button>
</div>
</motion.div>
</motion.div>
)}

{showConfirmCancel && selectedReservation && (() => {
const trip = selectedReservation.trip_id || {}
const tripTime = trip?.departure_time ? new Date(trip.departure_time) : new Date()
const now = new Date()
const hoursUntilTrip = (tripTime - now) / (1000 * 60 * 60)
let refundPercentage = 0
if (hoursUntilTrip > 24) refundPercentage = 100
else if (hoursUntilTrip >= 1) refundPercentage = 50

return (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowConfirmCancel(false)}>
<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-8 max-w-md w-full">
<div className="flex items-center justify-between mb-6">
<h2 className="text-xl font-bold text-gray-900">Confirmer l'annulation</h2>
<button onClick={() => setShowConfirmCancel(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
<X className="w-5 h-5 text-gray-500" />
</button>
</div>
<div className="mb-6">
<p className="text-gray-700 mb-4">Êtes-vous sûr de vouloir annuler cette réservation?</p>
<div className="bg-gray-50 rounded-xl p-4 space-y-2">
<div className="flex justify-between">
<span className="text-gray-600">Places réservées</span>
<span className="font-semibold">{selectedReservation.seats_booked}</span>
</div>
<div className="flex justify-between">
<span className="text-gray-600">Montant payé</span>
<span className="font-semibold">{selectedReservation.total_price} MAD</span>
</div>
<div className="flex justify-between border-t border-gray-200 pt-2">
<span className="text-gray-600">Remboursement</span>
<span className="font-bold text-gray-900">{refundPercentage}% ({(selectedReservation.total_price * refundPercentage / 100).toFixed(0)} MAD)</span>
</div>
</div>
</div>
<div className="flex gap-3">
<button onClick={() => setShowConfirmCancel(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
Non, garder
</button>
<button onClick={confirmCancellation} className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all">
Oui, annuler
</button>
</div>
</motion.div>
</motion.div>
)
})()}

{/* Review Modal */}
{showReviewModal && reviewTarget && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowReviewModal(false)}>
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Donner un avis</h3>
        <button onClick={() => setShowReviewModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
          <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white">
            {[5,4,3,2,1].map(n => (
              <option key={n} value={n}>{n} / 5</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Commentaire (optionnel)</label>
          <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={4} maxLength={500} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all resize-none bg-white" placeholder="Partagez votre expérience..."></textarea>
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={() => setShowReviewModal(false)} className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">Annuler</button>
        <button onClick={async () => {
          try {
            const token = localStorage.getItem('unigo_token')
            const driverId = reviewTarget.driver_id._id || reviewTarget.driver_id
            const res = await fetch(`${API_BASE_URL}/reviews`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ trip_id: reviewTarget.trip_id?._id || reviewTarget.trip_id, reviewed_user_id: driverId, rating: reviewRating, comment: reviewComment })
            })
            if (!res.ok) {
              const err = await res.json().catch(() => ({}))
              throw new Error(err.error || `HTTP ${res.status}`)
            }

            const reviewKey = `${reviewTarget.trip_id?._id || reviewTarget.trip_id}-${driverId}`
            setReviewStatus(prev => ({ ...prev, [reviewKey]: true }))
            
            toast.success('Merci pour votre avis!')
            setShowReviewModal(false)
          } catch (e) {
            toast.error(e.message)
          }
        }} className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all">Publier</button>
      </div>
    </motion.div>
  </motion.div>
)}

{/* Incident Reporting Modal */}
{showIncidentModal && selectedTripForIncident && (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setShowIncidentModal(false)}>
    <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
            {selectedTripForIncident?.trip_id?.origin || 'Origine'} → {selectedTripForIncident?.trip_id?.destination || 'Destination'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Conducteur: {selectedTripForIncident?.driver_id?.first_name || 'N/A'} {selectedTripForIncident?.driver_id?.last_name || ''}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Titre de l'incident *</label>
          <input
            type="text"
            value={incidentForm.title}
            onChange={(e) => setIncidentForm({...incidentForm, title: e.target.value})}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-none transition-all"
            placeholder="Ex: Conduite dangereuse, retard important..."
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
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p>• Les signalements sont traités par notre équipe administrative</p>
              <p>• Vous ne pouvez signaler que les trajets terminés ou annulés</p>
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
</div>
)
}

export default PassengerDashboard