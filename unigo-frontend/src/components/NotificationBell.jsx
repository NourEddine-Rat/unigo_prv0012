import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, X, Check, CheckCheck, Trash2, MessageSquare, 
  CreditCard, FileText, Calendar, AlertCircle, Gift, Info
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast, { Toaster } from 'react-hot-toast'
import io from 'socket.io-client'
import NotificationsPage from './NotificationsPage'

const NotificationBell = () => {
  const { user, getAuthHeaders } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotificationsPage, setShowNotificationsPage] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const socket = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    socket.current = io('http://localhost:5000')
    
    socket.current.on('connect', () => {
      if (user?._id) {
        socket.current.emit('user_online', user._id)
      }
    })

    socket.current.on('new_notification', (notification) => {
      
      setNotifications(prev => [notification, ...prev])
      setUnreadCount(prev => prev + 1)
      
      showToastNotification(notification)
    })

    return () => {
      if (socket.current) {
        socket.current.disconnect()
      }
    }
  }, [user])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:5000/api/notifications?limit=10', {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      } else {
        setNotifications([])
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const showToastNotification = (notification) => {
    const icon = getNotificationIcon(notification.type)
    
    toast.custom((t) => (
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-white shadow-lg border border-gray-200 rounded-xl pointer-events-auto flex`}
        onClick={() => {
          handleNotificationClick(notification)
          toast.dismiss(t.id)
        }}
      >
        <div className="flex-1 w-0 p-4 cursor-pointer">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {icon}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-gray-900">
                {notification.title}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {notification.message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              toast.dismiss(t.id)
            }}
            className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-gray-500 hover:text-gray-600 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    ), {
      duration: 5000,
      position: 'top-right'
    })
  }

  const getNotificationIcon = (type) => {
    const iconClass = "w-10 h-10 p-2 rounded-full"
    
    switch (type) {
      case 'message':
        return <div className={`${iconClass} bg-gray-100`}><MessageSquare className="w-full h-full text-gray-600" /></div>
      case 'booking':
        return <div className={`${iconClass} bg-gray-100`}><Calendar className="w-full h-full text-gray-600" /></div>
      case 'payment':
      case 'recharge':
        return <div className={`${iconClass} bg-gray-100`}><CreditCard className="w-full h-full text-gray-600" /></div>
      case 'document_verification':
        return <div className={`${iconClass} bg-gray-100`}><FileText className="w-full h-full text-gray-600" /></div>
      case 'trip_update':
      case 'cancellation':
        return <div className={`${iconClass} bg-gray-100`}><AlertCircle className="w-full h-full text-gray-600" /></div>
      case 'trip_started':
      case 'trip_auto_started':
        return <div className={`${iconClass} bg-green-100`}><Calendar className="w-full h-full text-green-600" /></div>
      case 'trip_completed':
        return <div className={`${iconClass} bg-green-100`}><Check className="w-full h-full text-green-600" /></div>
      case 'welcome':
      case 'system':
        return <div className={`${iconClass} bg-gray-100`}><Info className="w-full h-full text-gray-600" /></div>
      default:
        return <div className={`${iconClass} bg-gray-100`}><Bell className="w-full h-full text-gray-600" /></div>
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      
      setNotifications(prev =>
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: getAuthHeaders()
      })
      
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('Toutes les notifications marquées comme lues')
    } catch (error) {
      console.error('Error marking all as read:', error)
      toast.error('Erreur lors du marquage')
    }
  }

  const deleteNotification = async (notificationId, e) => {
    e.stopPropagation()
    
    try {
      await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      
      setNotifications(prev => prev.filter(n => n._id !== notificationId))
      toast.success('Notification supprimée')
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id)
    }
  }

  const getDocumentDisplayName = (docType) => {
    const displayNames = {
      'selfie_url': 'Selfie',
      'cni_recto': 'CNI (Recto)',
      'cni_verso': 'CNI (Verso)',
      'student_card': 'Carte Étudiante',
      'payment_receipt': 'Reçu de Paiement',
      'permit_recto': 'Permis de Conduire (Recto)',
      'permit_verso': 'Permis de Conduire (Verso)',
      'registration_doc': 'Carte Grise',
      'insurance_doc': 'Assurance'
    };
    return displayNames[docType] || docType;
  };

  const formatTime = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return 'Date invalide'
    }
    
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (isNaN(diffMs) || diffMs < 0) return 'À l\'instant'
    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <>
      <Toaster />
      <NotificationsPage 
        isOpen={showNotificationsPage} 
        onClose={() => setShowNotificationsPage(false)} 
      />
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="relative p-1.5 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.span>
          )}
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-2 text-gray-900">
                  <Bell className="w-5 h-5" />
                  <h3 className="font-semibold">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="bg-black text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-gray-600 text-sm hover:text-black hover:bg-gray-100 px-2 py-1 rounded-lg transition-all"
                  >
                    <CheckCheck className="w-4 h-4" />
                    Tout lire
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8 px-4">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">Aucune notification</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-all ${
                        !notification.read ? 'bg-gray-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                              {notification.title}
                            </p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.data?.document_type && (
                            <div className="mt-2 flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                notification.data.verification_status === 'approved' ? 'bg-green-500' : 'bg-red-500'
                              }`}></div>
                              <span className="text-xs text-gray-500">
                                {getDocumentDisplayName(notification.data.document_type)}
                              </span>
                            </div>
                          )}
                          {!notification.read && (
                            <div className="flex items-center gap-1 mt-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <span className="text-xs text-red-600 font-medium">Non lu</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => deleteNotification(notification._id, e)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      setShowNotificationsPage(true)
                    }}
                    className="w-full text-center text-sm text-black hover:text-gray-700 font-medium transition-colors"
                  >
                    Voir toutes les notifications →
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

export default NotificationBell

