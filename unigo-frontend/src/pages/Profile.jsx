import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  User, Mail, Phone, MapPin, Save, Edit2, Shield, AlertCircle, 
  Copy, Check, Clock, CheckCircle, XCircle, Star, TrendingUp, Calendar,
  Award, Users, MessageSquare, Settings, CreditCard, FileText, Car
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useUniversities from '../hooks/useUniversities'

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'

const Profile = () => {
const { user, updateUser } = useAuth()
const [editing, setEditing] = useState(false)
const [copied, setCopied] = useState(false)
const [form, setForm] = useState({
first_name: user?.first_name || '',
last_name: user?.last_name || '',
phone: user?.phone || '',
university_id: user?.university_id || ''
})
const [reviewStats, setReviewStats] = useState({ 
  totalTrips: 0, 
  avgRating: 5, 
  responseRate: 100, 
  memberSince: new Date() 
})
const [recentReviews, setRecentReviews] = useState([])
const [loadingReviews, setLoadingReviews] = useState(false)
const { universities, loading: universitiesLoading } = useUniversities()

useEffect(() => {
  const loadReviews = async () => {
    try {
      setLoadingReviews(true)
      const res = await fetch(`${API_BASE_URL}/users/${user?._id}/reviews`)
      if (res.ok) {
        const data = await res.json()
        setReviewStats({
          totalTrips: data.totalTrips || 0,
          avgRating: data.avgRating || 5,
          responseRate: data.responseRate || 100,
          memberSince: data.memberSince ? new Date(data.memberSince) : new Date()
        })
        setRecentReviews((data.reviews || []).slice(0, 3))
      }
    } catch (e) {
      console.error('Error loading reviews:', e)
    } finally {
      setLoadingReviews(false)
    }
  }
  if (user?._id) loadReviews()
}, [user?._id])

const copyUniId = async () => {
try {
await navigator.clipboard.writeText(user?.uni_id || '')
setCopied(true)
setTimeout(() => setCopied(false), 2000)
} catch (err) {
console.error('Failed to copy UNI-ID:', err)
}
}

const handleSubmit = (e) => {
e.preventDefault()
updateUser(form)
setEditing(false)
}

const statusInfo = {
pending_payment: { text: 'Paiement en attente', color: 'yellow', icon: Clock },
pending_verification: { text: 'Documents en vérification', color: 'blue', icon: FileText },
active: { text: 'Compte actif', color: 'green', icon: CheckCircle },
suspended: { text: 'Compte suspendu', color: 'orange', icon: AlertCircle },
banned: { text: 'Compte bloqué', color: 'red', icon: XCircle }
}

const currentStatus = statusInfo[user?.status] || statusInfo.active
const university = universities.find(u => u._id === user?.university_id)

return (
<div className="min-h-screen bg-gray-50">
<div className="max-w-4xl mx-auto py-8 px-4">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
<h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Profil</h1>
<p className="text-gray-600">Gérez vos informations personnelles</p>
</motion.div>

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1">
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
<div className="relative inline-block mb-6">
  {user?.selfie_url ? (
    <img src={`http://localhost:5000/uploads/${user.selfie_url}`} alt="Selfie" className="w-32 h-32 rounded-full object-cover border-4 border-gray-100" />
  ) : (
    <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-5xl font-bold">
      {user?.first_name?.charAt(0)}
    </div>
  )}
</div>
<h2 className="text-2xl font-bold text-gray-900 mb-1">{user?.first_name?.toUpperCase()} {user?.last_name?.toUpperCase()}</h2>
<p className="text-gray-600 mb-2">{user?.role === 'driver' ? 'Conducteur' : user?.role === 'admin' ? 'Administrateur' : 'Passager'}</p>
{user?.uni_id && (
<div className="mb-4">
<div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
<div className="flex items-center justify-between">
<div>
<p className="text-xs text-gray-500 mb-1">Votre UNI-ID</p>
<p className="text-lg font-bold text-blue-600 font-mono">{user.uni_id}</p>
</div>
<button
onClick={copyUniId}
className="p-2 hover:bg-blue-100 rounded-lg transition-colors group"
title="Copier l'UNI-ID"
>
{copied ? (
<Check className="w-4 h-4 text-green-600" />
) : (
<Copy className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
)}
</button>
</div>
<p className="text-xs text-gray-500 mt-1">Partagez cet ID pour recevoir des points</p>
</div>
</div>
)}
<div className={`inline-flex items-center gap-2 px-4 py-2 bg-${currentStatus.color}-100 text-${currentStatus.color}-700 rounded-full text-sm font-medium mb-6`}>
<currentStatus.icon className="w-4 h-4" />
{currentStatus.text}
</div>
<div className="space-y-3 text-left">
<div className="flex items-center gap-3 text-gray-600">
<Mail className="w-5 h-5 text-gray-400" />
<span className="text-sm">{user?.email}</span>
</div>
<div className="flex items-center gap-3 text-gray-600">
<Phone className="w-5 h-5 text-gray-400" />
<span className="text-sm">{user?.phone}</span>
</div>
<div className="flex items-center gap-3 text-gray-600">
<MapPin className="w-5 h-5 text-gray-400" />
<span className="text-sm">{university?.name || 'Non renseigné'}</span>
</div>
</div>
</div>

<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
<Shield className="w-5 h-5 text-blue-600" />
Vérifications
</h3>
<div className="space-y-3">
{[
{ label: 'Email', verified: user?.email_verified || false, icon: Mail },
{ label: 'Téléphone', verified: user?.phone ? true : false, icon: Phone },
{ label: 'CNI', verified: user?.document_verification?.cni_recto === 'approved' && user?.document_verification?.cni_verso === 'approved', icon: CreditCard },
{ label: 'Carte étudiant', verified: user?.document_verification?.student_card === 'approved', icon: Award },
...(user?.role === 'driver' ? [
{ label: 'Permis de conduire', verified: user?.document_verification?.permit_recto === 'approved' && user?.document_verification?.permit_verso === 'approved', icon: Car },
{ label: 'Carte grise', verified: user?.document_verification?.registration_doc === 'approved', icon: FileText },
{ label: 'Assurance', verified: user?.document_verification?.insurance_doc === 'approved', icon: Shield }
] : [])
].map(item => (
<div key={item.label} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
<div className="flex items-center gap-3">
<item.icon className="w-4 h-4 text-gray-400" />
<span className="text-sm text-gray-700">{item.label}</span>
</div>
<span className={`inline-flex items-center gap-1 text-xs px-3 py-1 rounded-full ${
item.verified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
}`}>
{item.verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
{item.verified ? 'Vérifié' : 'En attente'}
</span>
</div>
))}
</div>
</div>
</motion.div>

<motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-2 space-y-6">
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
<div className="flex items-center justify-between mb-6">
<h2 className="text-2xl font-bold text-gray-900">Informations personnelles</h2>
{!editing ? (
<button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all flex items-center gap-2">
<Edit2 className="w-4 h-4" />
Modifier
</button>
) : (
<button onClick={() => setEditing(false)} className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all">
Annuler
</button>
)}
</div>

{editing ? (
<form onSubmit={handleSubmit} className="space-y-6">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
<input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
<input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
<input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Université</label>
<select value={form.university_id} onChange={(e) => setForm({ ...form, university_id: e.target.value })} className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all">
<option value="">Sélectionnez votre université</option>
{universitiesLoading ? (
<option disabled>Chargement des universités...</option>
) : (
universities.map(uni => (
<option key={uni._id} value={uni._id}>{uni.name}</option>
))
)}
</select>
</div>
<button type="submit" className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
<Save className="w-5 h-5" />
Enregistrer les modifications
</button>
</form>
) : (
<div className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<p className="text-sm text-gray-500 mb-1">Prénom</p>
<p className="text-gray-800 font-medium">{user?.first_name}</p>
</div>
<div>
<p className="text-sm text-gray-500 mb-1">Nom</p>
<p className="text-gray-800 font-medium">{user?.last_name}</p>
</div>
</div>
<div>
<p className="text-sm text-gray-500 mb-1">Email</p>
<p className="text-gray-800 font-medium">{user?.email}</p>
</div>
<div>
<p className="text-sm text-gray-500 mb-1">Téléphone</p>
<p className="text-gray-800 font-medium">{user?.phone}</p>
</div>
<div>
<p className="text-sm text-gray-500 mb-1">Université</p>
<p className="text-gray-800 font-medium">{university?.name || 'Non renseigné'}</p>
</div>
</div>
)}
</div>

{user?.status !== 'active' && (
<div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
<div className="flex items-start gap-3">
<AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
<div>
<h3 className="font-bold text-gray-800 mb-2">Action requise</h3>
<p className="text-sm text-gray-700 mb-3">
{user?.status === 'pending_payment' && 'Votre paiement est en cours de vérification. Vous recevrez un email une fois validé.'}
{user?.status === 'pending_verification' && 'Vos documents sont en cours de vérification par notre équipe. Délai estimé: 24-72h.'}
{user?.status === 'suspended' && 'Votre compte est temporairement suspendu. Contactez le support pour plus d\'informations.'}
{user?.status === 'banned' && 'Votre compte a été bloqué. Contactez le support si vous pensez qu\'il s\'agit d\'une erreur.'}
</p>
{(user?.status === 'suspended' || user?.status === 'banned') && (
<button className="px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-700 transition-all">
Contacter le support
</button>
)}
</div>
</div>
</div>
)}

<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
<h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
<TrendingUp className="w-5 h-5 text-blue-600" />
Statistiques
</h3>
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
{[
{ label: 'Trajets', value: String(user?.total_trips || reviewStats.totalTrips || 0), icon: Car },
{ label: 'Note moyenne', value: `${user?.rating_average || reviewStats.avgRating || 5}/5`, icon: Star },
{ label: 'Taux réponse', value: `${user?.response_rate || reviewStats.responseRate || 100}%`, icon: MessageSquare },
{ label: 'Membre depuis', value: new Date(user?.createdAt || reviewStats.memberSince || Date.now()).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }), icon: Calendar }
].map(stat => (
<div key={stat.label} className="text-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
<div className="flex items-center justify-center mb-2">
<stat.icon className="w-5 h-5 text-blue-600" />
</div>
<p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
<p className="text-sm text-gray-600">{stat.label}</p>
</div>
))}
</div>
</div>

<div className="bg-white rounded-2xl shadow-lg p-6">
  <h3 className="text-lg font-bold text-gray-800 mb-4">Avis récents</h3>
  {loadingReviews ? (
    <p className="text-sm text-gray-500">Chargement...</p>
  ) : recentReviews.length === 0 ? (
    <p className="text-sm text-gray-500">Aucun avis pour le moment.</p>
  ) : (
    <div className="space-y-3">
      {recentReviews.map(r => (
        <div key={r._id} className="p-3 border border-gray-100 rounded-xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-gray-800">{r.reviewer_id?.first_name?.toUpperCase()} {r.reviewer_id?.last_name?.toUpperCase()}</p>
            <span className="text-xs text-yellow-600">{r.rating}/5</span>
          </div>
          {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
        </div>
      ))}
    </div>
  )}
</div>
</motion.div>
</div>
</div>
</div>
)
}

export default Profile