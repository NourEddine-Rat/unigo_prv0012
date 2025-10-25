import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, FileText, DollarSign, AlertTriangle, CheckCircle, XCircle, Eye, Download, MapPin, GraduationCap, CreditCard, MessageSquare, Settings, Shield, Activity, TrendingUp, ChevronRight, Menu, X } from 'lucide-react'
import DistrictsManagement from './DistrictsManagement'
import UsersManagement from './UsersManagement'
import DocumentsManagement from './DocumentsManagement'
import PaymentsManagement from './PaymentsManagement'
import IncidentsManagement from './IncidentsManagement'
import UniversitiesManagement from './UniversitiesManagement'
import AdminRechargeRequests from './AdminRechargeRequests'
import AdminMessages from './AdminMessages'
import { useAuth } from '../context/AuthContext'

const AdminDashboard = () => {
const [activeTab, setActiveTab] = useState('users')
const [stats, setStats] = useState({})
const [loading, setLoading] = useState(true)
const [isHeaderVisible, setIsHeaderVisible] = useState(true)
const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
const { getAuthHeaders } = useAuth()

// Removed mock data - using real API data

// Fetch real stats from API
useEffect(() => {
  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Error fetching stats:', err)
    } finally {
      setLoading(false)
    }
  }
  fetchStats()
}, [])

// Handle scroll to hide header
useEffect(() => {
  const handleScroll = () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop
    setIsHeaderVisible(scrollTop < 100)
  }
  
  window.addEventListener('scroll', handleScroll)
  return () => window.removeEventListener('scroll', handleScroll)
}, [])

const statsCards = [
{ icon: Users, label: 'Utilisateurs actifs', value: stats.activeUsers || 0 },
{ icon: FileText, label: 'Documents en attente', value: stats.pendingVerification || 0 },
{ icon: DollarSign, label: 'Paiements à vérifier', value: stats.pendingPayment || 0 },
{ icon: AlertTriangle, label: 'Incidents ouverts', value: stats.openIncidents || 0 },
{ icon: GraduationCap, label: 'Universités', value: stats.activeUniversities || 0 },
{ icon: MapPin, label: 'Districts', value: 0 }
]


return (
<div className="min-h-screen bg-gray-50 pb-16 md:pb-0">
<style jsx>{`
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`}</style>
{/* Header */}
<AnimatePresence>
{isHeaderVisible && (
<motion.div 
  initial={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -50 }}
  className="bg-white border-b border-gray-100 sticky top-0 z-20"
>
  
</motion.div>
)}
</AnimatePresence>

<div className="px-2 sm:px-4 py-4 sm:py-6">
<div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
{/* Statistics Cards */}
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-4">
{statsCards.map((stat, i) => (
<motion.div 
  key={stat.label} 
  initial={{ opacity: 0, scale: 0.9 }} 
  animate={{ opacity: 1, scale: 1 }} 
  transition={{ delay: i * 0.1 }}
  className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all"
>
  <div className="flex items-center justify-between mb-2 sm:mb-3">
    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-lg sm:rounded-xl flex items-center justify-center">
      <stat.icon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
    </div>
  </div>
  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-1">{stat.value}</div>
  <div className="text-xs sm:text-xs text-gray-600 leading-tight line-clamp-2">{stat.label}</div>
</motion.div>
))}
</div>

{/* Navigation Tabs */}
<div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
{/* Desktop Navigation */}
<div className="hidden md:flex border-b border-gray-200">
{[
{ id: 'users', label: 'Utilisateurs', icon: Users },
{ id: 'documents', label: 'Documents', icon: FileText },
{ id: 'payments', label: 'Paiements', icon: DollarSign },
{ id: 'messages', label: 'Messages', icon: MessageSquare },
{ id: 'incidents', label: 'Incidents', icon: AlertTriangle },
{ id: 'universities', label: 'Universités', icon: GraduationCap },
{ id: 'districts', label: 'Districts', icon: MapPin },
{ id: 'recharge', label: 'Recharges', icon: CreditCard }
].map(tab => (
<button 
  key={tab.id} 
  onClick={() => setActiveTab(tab.id)} 
  className={`flex items-center gap-2 px-4 lg:px-6 py-3 lg:py-4 font-medium transition-all border-b-2 text-sm lg:text-base ${
    activeTab === tab.id 
      ? 'text-black border-black bg-gray-50' 
      : 'text-gray-600 border-transparent hover:text-black hover:bg-gray-50'
  }`}
>
  <tab.icon className="w-4 h-4" />
  <span className="hidden lg:inline">{tab.label}</span>
  <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
</button>
))}
</div>

{/* Mobile Navigation */}
<AnimatePresence>
{isMobileMenuOpen && (
<motion.div 
  initial={{ opacity: 0, height: 0 }}
  animate={{ opacity: 1, height: 'auto' }}
  exit={{ opacity: 0, height: 0 }}
  className="md:hidden border-b border-gray-200"
>
  <div className="p-3 sm:p-4 space-y-1 sm:space-y-2">
{[
{ id: 'users', label: 'Utilisateurs', icon: Users },
{ id: 'documents', label: 'Documents', icon: FileText },
{ id: 'payments', label: 'Paiements', icon: DollarSign },
{ id: 'messages', label: 'Messages', icon: MessageSquare },
{ id: 'incidents', label: 'Incidents', icon: AlertTriangle },
{ id: 'universities', label: 'Universités', icon: GraduationCap },
{ id: 'districts', label: 'Districts', icon: MapPin },
{ id: 'recharge', label: 'Recharges', icon: CreditCard }
].map(tab => (
<button 
  key={tab.id} 
  onClick={() => {
    setActiveTab(tab.id)
    setIsMobileMenuOpen(false)
  }} 
  className={`w-full flex items-center gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-all text-sm sm:text-base ${
    activeTab === tab.id 
      ? 'text-black bg-gray-100' 
      : 'text-gray-600 hover:text-black hover:bg-gray-50'
  }`}
>
  <tab.icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
  <span className="flex-1 text-left">{tab.label}</span>
  <ChevronRight className="w-4 h-4 flex-shrink-0" />
</button>
))}
  </div>
</motion.div>
)}
</AnimatePresence>

{/* Mobile Tab Bar - Always visible on mobile */}
<div className="md:hidden bg-white border-t border-gray-200 sticky bottom-0 z-10">
  <div className="flex w-full">
    {[
      { id: 'users', label: 'Users', icon: Users },
      { id: 'documents', label: 'Docs', icon: FileText },
      { id: 'payments', label: 'Pay', icon: DollarSign },
      { id: 'messages', label: 'Msg', icon: MessageSquare },
      { id: 'incidents', label: 'Inc', icon: AlertTriangle },
      { id: 'universities', label: 'Univ', icon: GraduationCap },
      { id: 'districts', label: 'Dist', icon: MapPin },
      { id: 'recharge', label: 'Rech', icon: CreditCard }
    ].map(tab => (
      <button 
        key={tab.id} 
        onClick={() => setActiveTab(tab.id)} 
        className={`flex flex-col items-center gap-1 px-2 py-2 flex-1 transition-all ${
          activeTab === tab.id 
            ? 'text-black bg-gray-50' 
            : 'text-gray-500 hover:text-black hover:bg-gray-50'
        }`}
      >
        <tab.icon className="w-4 h-4" />
        <span className="text-xs font-medium truncate">{tab.label}</span>
      </button>
    ))}
  </div>
</div>

{/* Content */}
<div className="p-2 sm:p-4 lg:p-6">
{activeTab === 'documents' && <DocumentsManagement />}
{activeTab === 'payments' && <PaymentsManagement />}
{activeTab === 'messages' && <AdminMessages />}
{activeTab === 'incidents' && <IncidentsManagement />}
{activeTab === 'universities' && <UniversitiesManagement />}
{activeTab === 'users' && <UsersManagement />}
{activeTab === 'districts' && <DistrictsManagement />}
{activeTab === 'recharge' && <AdminRechargeRequests />}
</div>
</div>
</div>
</div>
</div>
)
}

export default AdminDashboard