import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  CreditCard, Send, History, TrendingUp, ArrowUpRight, ArrowDownLeft, 
  Copy, Check, Plus, Wallet, Shield, Zap, RefreshCw, AlertCircle,
  ChevronRight, Star, Clock, DollarSign, Users, Settings
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import RechargeModal from '../components/RechargeModal'

const UniCard = () => {
const { user } = useAuth()
const [showTransfer, setShowTransfer] = useState(false)
const [showRecharge, setShowRecharge] = useState(false)
const [copied, setCopied] = useState(false)
const [form, setForm] = useState({ recipient_uni_id: '', points: '' })
const [recipientInfo, setRecipientInfo] = useState(null)
const [lookupLoading, setLookupLoading] = useState(false)
const [transactions, setTransactions] = useState([])
const [transactionsLoading, setTransactionsLoading] = useState(true)
const [limits, setLimits] = useState(null)
const [limitsLoading, setLimitsLoading] = useState(true)
const [transferLoading, setTransferLoading] = useState(false)
const [userBalance, setUserBalance] = useState(user?.unicard_balance || 0)
const [balanceLoading, setBalanceLoading] = useState(true)

const copyUniId = async () => {
try {
await navigator.clipboard.writeText(user?.uni_id || '')
setCopied(true)
setTimeout(() => setCopied(false), 2000)
} catch (err) {
console.error('Failed to copy UNI-ID:', err)
}
}

const lookupUserByUniId = async (uniId) => {
if (!uniId || uniId.length < 6) {
setRecipientInfo(null)
return
}

setLookupLoading(true)
try {
const token = localStorage.getItem('unigo_token')
const response = await fetch(`http://localhost:5000/api/users/by-uni-id/${uniId}`, {
headers: {
'Authorization': `Bearer ${token}`
}
})

if (response.ok) {
const userInfo = await response.json()
setRecipientInfo(userInfo)
} else {
setRecipientInfo(null)
}
} catch (error) {
console.error('Error looking up user:', error)
setRecipientInfo(null)
} finally {
setLookupLoading(false)
}
}

const loadTransactions = async () => {
try {
setTransactionsLoading(true)
const token = localStorage.getItem('unigo_token')
const response = await fetch('http://localhost:5000/api/transactions/history?limit=10', {
headers: {
'Authorization': `Bearer ${token}`
}
})

if (response.ok) {
const data = await response.json()
setTransactions(data.transactions)
} else {
console.error('Failed to load transactions')
}
} catch (error) {
console.error('Error loading transactions:', error)
} finally {
setTransactionsLoading(false)
}
}

const loadLimits = async () => {
try {
setLimitsLoading(true)
const token = localStorage.getItem('unigo_token')
const response = await fetch('http://localhost:5000/api/transactions/limits', {
headers: {
'Authorization': `Bearer ${token}`
}
})

if (response.ok) {
const data = await response.json()
setLimits(data)
} else {
console.error('Failed to load limits')
}
} catch (error) {
console.error('Error loading limits:', error)
} finally {
setLimitsLoading(false)
}
}

const loadUserProfile = async () => {
try {
setBalanceLoading(true)
const token = localStorage.getItem('unigo_token')
const response = await fetch('http://localhost:5000/api/auth/profile', {
headers: {
'Authorization': `Bearer ${token}`
}
})

if (response.ok) {
const userData = await response.json()
setUserBalance(userData.unicard_balance || 0)

localStorage.setItem('unigo_user', JSON.stringify(userData))
} else {
console.error('Failed to load user profile')
}
} catch (error) {
console.error('Error loading user profile:', error)
} finally {
setBalanceLoading(false)
}
}

useEffect(() => {
if (user) {
loadUserProfile()
loadTransactions()
loadLimits()
}
}, [user])

const handleTransfer = async (e) => {
e.preventDefault()
setTransferLoading(true)
try {
const token = localStorage.getItem('unigo_token')
const response = await fetch('http://localhost:5000/api/transactions/transfer', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify({
to_uni_id: form.recipient_uni_id,
points: Number(form.points),
description: `Transfer to ${recipientInfo?.first_name?.toUpperCase()} ${recipientInfo?.last_name?.toUpperCase()}`
})
})

const data = await response.json()

if (response.ok) {

setUserBalance(data.new_balance)


await Promise.all([loadUserProfile(), loadTransactions(), loadLimits()])

setShowTransfer(false)
setForm({ recipient_uni_id: '', points: '' })
setRecipientInfo(null)
} else {
alert(data.error || 'Transfer failed')
}
} catch (error) {
console.error('Transfer error:', error)
alert('Network error. Please try again.')
} finally {
setTransferLoading(false)
}
}

const handleUniIdChange = (e) => {
const value = e.target.value.toUpperCase()
setForm({ ...form, recipient_uni_id: value })

setTimeout(() => {
lookupUserByUniId(value)
}, 500)
}

return (
<div className="min-h-screen bg-gray-50">
<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
<h1 className="text-3xl font-bold text-gray-900 mb-2">UniCard</h1>
<p className="text-gray-600">Gérez vos points et effectuez des transferts</p>
</motion.div>

<motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="mb-8">
<div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
<div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-36 translate-x-36" />
<div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-28 -translate-x-28" />
<div className="relative">
<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
<div className="flex items-center gap-4">
<div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
<Wallet className="w-7 h-7" />
</div>
<div>
<p className="text-white/80 text-sm font-medium">Solde disponible</p>
<p className="text-4xl sm:text-5xl font-bold">
{balanceLoading ? (
<span className="animate-pulse">--- pts</span>
) : (
`${userBalance} pts`
)}
</p>
{user?.uni_id && (
<div className="mt-3 flex items-center gap-2">
<p className="text-white/60 text-xs font-mono">UNI-ID: {user.uni_id}</p>
<button
onClick={copyUniId}
className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
title="Copier l'UNI-ID"
>
{copied ? (
<Check className="w-3 h-3 text-green-300" />
) : (
<Copy className="w-3 h-3 text-white/60" />
)}
</button>
</div>
)}
</div>
</div>
<button onClick={() => setShowTransfer(true)} className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 self-start sm:self-auto">
<Send className="w-5 h-5" />
Transférer
</button>
</div>
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
<div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
<div className="flex items-center gap-3 mb-2">
<Shield className="w-5 h-5 text-white/70" />
<p className="text-white/70 text-sm font-medium">Limite journalière</p>
</div>
<p className="text-2xl font-bold">
{limitsLoading ? (
<span className="animate-pulse">---</span>
) : (
`${limits?.daily_limit || 1000} pts`
)}
</p>
</div>
<div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
<div className="flex items-center gap-3 mb-2">
<TrendingUp className="w-5 h-5 text-white/70" />
<p className="text-white/70 text-sm font-medium">Utilisé aujourd'hui</p>
</div>
<p className="text-2xl font-bold mb-3">
{limitsLoading ? (
<span className="animate-pulse">---</span>
) : (
`${limits?.daily_used || 0} pts`
)}
</p>
{limits && !limitsLoading && (
<div className="space-y-2">
<div className="w-full bg-white/20 rounded-full h-2">
<div 
className="bg-white rounded-full h-2 transition-all duration-500"
style={{ 
width: `${Math.min((limits.daily_used / limits.daily_limit) * 100, 100)}%` 
}}
></div>
</div>
<p className="text-white/60 text-xs">
{limits.daily_remaining} pts restants
</p>
</div>
)}
</div>
<div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 sm:p-6">
<div className="flex items-center gap-3 mb-2">
<History className="w-5 h-5 text-white/70" />
<p className="text-white/70 text-sm font-medium">Transactions</p>
</div>
<p className="text-2xl font-bold">
{transactionsLoading ? (
<span className="animate-pulse">---</span>
) : (
transactions.length
)}
</p>
</div>
</div>
</div>
</div>
</motion.div>

<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
{[
{ icon: TrendingUp, label: 'Gagner des points', desc: 'Complétez des trajets pour gagner des points', color: 'from-green-500 to-green-600', onClick: () => {} },
{ icon: Plus, label: 'Recharger', desc: 'Ajouter des points à votre compte', color: 'from-blue-500 to-blue-600', onClick: () => setShowRecharge(true) },
{ icon: History, label: 'Historique', desc: 'Voir toutes les transactions', color: 'from-purple-500 to-purple-600', onClick: () => {} }
].map((action, i) => (
<motion.button 
  key={action.label} 
  onClick={action.onClick} 
  initial={{ opacity: 0, y: 20 }} 
  animate={{ opacity: 1, y: 0 }} 
  transition={{ delay: 0.2 + i * 0.1 }} 
  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-left group cursor-pointer border border-gray-100 hover:border-gray-200"
>
<div className="flex items-start justify-between mb-4">
<div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
<action.icon className="w-6 h-6 text-white" />
</div>
<ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
</div>
<h3 className="text-lg font-bold text-gray-900 mb-2">{action.label}</h3>
<p className="text-gray-600 text-sm leading-relaxed">{action.desc}</p>
</motion.button>
))}
</div>

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
<div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
<h2 className="text-2xl font-bold text-gray-900">Historique des transactions</h2>
<button 
onClick={() => {
loadUserProfile()
loadTransactions()
loadLimits()
}}
className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-all flex items-center gap-2 self-start sm:self-auto"
>
<RefreshCw className="w-4 h-4" />
Actualiser
</button>
</div>
<div className="space-y-3">
{transactionsLoading ? (
<div className="text-center py-12">
<div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
<p className="text-gray-500">Chargement des transactions...</p>
</div>
) : transactions.length > 0 ? (
transactions.map(transaction => {
const isReceived = transaction.to_user._id === user?.id
const isRecharge = transaction.transaction_type === 'bonus' && transaction.from_uni_id === 'ADMIN'
const otherUser = isReceived ? transaction.from_user : transaction.to_user

return (
<div key={transaction._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100">
<div className="flex items-center gap-4 flex-1 min-w-0">
<div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
isRecharge ? 'bg-blue-100' : isReceived ? 'bg-green-100' : 'bg-red-100'
}`}>
{isRecharge ? (
<CreditCard className="w-6 h-6 text-blue-600" />
) : isReceived ? (
<ArrowDownLeft className="w-6 h-6 text-green-600" />
) : (
<ArrowUpRight className="w-6 h-6 text-red-600" />
)}
</div>
<div className="flex-1 min-w-0">
<p className="font-semibold text-gray-900 truncate">
{isRecharge ? 'Recharge approuvée' : 
 isReceived ? `Reçu de ${otherUser?.first_name?.toUpperCase()} ${otherUser?.last_name?.toUpperCase()}` : 
 `Envoyé à ${otherUser?.first_name?.toUpperCase()} ${otherUser?.last_name?.toUpperCase()}`}
</p>
<div className="flex items-center gap-2 mt-1">
<p className="text-sm text-gray-500">
{isRecharge ? 'Système' : `${otherUser?.uni_id}`}
</p>
<span className="text-gray-300">•</span>
<p className="text-sm text-gray-500">
{new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
</p>
</div>
{transaction.description && (
<p className="text-xs text-gray-400 mt-1 truncate">{transaction.description}</p>
)}
</div>
</div>
<div className="text-right flex-shrink-0 ml-4">
<p className={`text-xl font-bold ${
isRecharge ? 'text-blue-600' : isReceived ? 'text-green-600' : 'text-red-600'
}`}>
{isRecharge ? '+' : isReceived ? '+' : '-'}{transaction.points} pts
</p>
<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
transaction.status === 'completed' ? 'bg-green-100 text-green-700' :
transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
transaction.status === 'failed' ? 'bg-red-100 text-red-700' :
'bg-gray-100 text-gray-700'
}`}>
{transaction.status === 'completed' ? 'Complété' : 
 transaction.status === 'pending' ? 'En attente' : 
 transaction.status === 'failed' ? 'Échoué' : 
 transaction.status === 'refunded' ? 'Remboursé' : 'Annulé'}
</span>
</div>
</div>
)
})
) : (
<div className="text-center py-12">
<div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
<History className="w-8 h-8 text-gray-400" />
</div>
<p className="text-gray-500 font-medium">Aucune transaction pour le moment</p>
<p className="text-sm text-gray-400 mt-1">Vos transactions apparaîtront ici</p>
</div>
)}
{transactions.length > 0 && (
<div className="mt-6 text-center">
<button className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 mx-auto">
<History className="w-5 h-5" />
Voir toutes les transactions
</button>
<p className="text-sm text-gray-500 mt-2">Affichage des 10 dernières transactions</p>
</div>
)}
</div>
</motion.div>

{showTransfer && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowTransfer(false)}>
<motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
<div className="flex items-center gap-3 mb-6">
<div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
<Send className="w-5 h-5 text-blue-600" />
</div>
<h2 className="text-2xl font-bold text-gray-900">Transférer des points</h2>
</div>
<form onSubmit={handleTransfer} className="space-y-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">UNI-ID du destinataire</label>
<div className="relative">
<input 
type="text" 
value={form.recipient_uni_id} 
onChange={handleUniIdChange}
required 
className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-mono text-center" 
placeholder="AB-123" 
maxLength="6"
/>
{lookupLoading && (
<div className="absolute right-3 top-1/2 transform -translate-y-1/2">
<div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
</div>
)}
</div>
{recipientInfo && (
<div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-2xl">
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center">
<span className="text-green-600 font-bold text-sm">{recipientInfo.first_name.charAt(0)}</span>
</div>
<div>
<p className="font-semibold text-gray-900">{recipientInfo.first_name?.toUpperCase()} {recipientInfo.last_name?.toUpperCase()}</p>
<p className="text-sm text-gray-600">UNI-ID: {recipientInfo.uni_id}</p>
</div>
</div>
</div>
)}
{form.recipient_uni_id && !recipientInfo && !lookupLoading && (
<div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
<div className="flex items-center gap-2">
<AlertCircle className="w-4 h-4 text-red-600" />
<p className="text-red-600 text-sm font-medium">Utilisateur non trouvé avec cet UNI-ID</p>
</div>
</div>
)}
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Nombre de points</label>
<input type="number" value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} required min="1" max="1000" className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-center" placeholder="100" />
<p className="text-sm text-gray-500 mt-2">Limite: 1000 points par jour</p>
</div>
<div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
<div className="flex items-start gap-3">
<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
<div>
<p className="text-sm text-amber-800 font-medium">Transfert immédiat</p>
<p className="text-xs text-amber-700 mt-1">Les transferts sont irréversibles</p>
</div>
</div>
</div>
<div className="flex gap-3 pt-2">
<button type="button" onClick={() => setShowTransfer(false)} className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-50 transition-all">
Annuler
</button>
<button 
type="submit" 
disabled={transferLoading || !recipientInfo}
className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
{transferLoading ? (
<>
<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
Transfert...
</>
) : (
'Transférer'
)}
</button>
</div>
</form>
</motion.div>
</motion.div>
)}
</div>

{/* Recharge Modal */}
<RechargeModal 
  isOpen={showRecharge} 
  onClose={() => setShowRecharge(false)}
  onSuccess={() => {
    loadUserProfile();
    loadTransactions();
    loadLimits();
  }}
/>
</div>
)
}

export default UniCard