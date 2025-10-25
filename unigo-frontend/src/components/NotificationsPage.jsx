import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bell, CheckCircle, AlertCircle, Info, Clock, User, Car, CreditCard, MessageSquare, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NotificationsPage = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, unread, read
  const { user } = useAuth()

  useEffect(() => {
    if (isOpen) {
      fetchNotifications()
    }
  }, [isOpen])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('unigo_token')
      
      if (!token) {
        console.error('No authentication token found')
        setNotifications([])
        return
      }
      
      const response = await fetch('http://localhost:5000/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        
        const normalizedNotifications = (data.notifications || []).map(notif => ({
          ...notif,
          isRead: notif.read || notif.isRead || false,
          createdAt: new Date(notif.createdAt)
        }))
        setNotifications(normalizedNotifications)
      } else {
        setNotifications([])
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('unigo_token')
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true, read: true } : notif
        )
      )
    } catch (error) {
      console.error('Error marking notification as read:', error)
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId ? { ...notif, isRead: true, read: true } : notif
        )
      )
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('unigo_token')
      await fetch('http://localhost:5000/api/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true, read: true }))
      )
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      setNotifications(prev => 
        prev.map(notif => ({ ...notif, isRead: true, read: true }))
      )
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'account_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'trip_completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'trip_booked':
        return <Car className="w-5 h-5 text-blue-600" />
      case 'payment_received':
        return <CreditCard className="w-5 h-5 text-green-600" />
      case 'trip_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      case 'system_update':
        return <Info className="w-5 h-5 text-blue-600" />
      default:
        return <Bell className="w-5 h-5 text-gray-600" />
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500'
      case 'medium':
        return 'border-l-yellow-500'
      case 'low':
        return 'border-l-gray-300'
      default:
        return 'border-l-gray-300'
    }
  }

  const formatTimeAgo = (date) => {
    if (!date || isNaN(new Date(date).getTime())) {
      return 'Date invalide'
    }
    
    const now = new Date()
    const notificationDate = new Date(date)
    const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60))
    
    if (isNaN(diffInMinutes) || diffInMinutes < 0) {
      return 'À l\'instant'
    }
    
    if (diffInMinutes < 1) {
      return 'À l\'instant'
    } else if (diffInMinutes < 60) {
      return `Il y a ${diffInMinutes} min`
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60)
      return `Il y a ${hours}h`
    } else {
      const days = Math.floor(diffInMinutes / 1440)
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`
    }
  }

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'unread') return !notif.isRead && !notif.read
    if (filter === 'read') return notif.isRead || notif.read
    return true
  })

  const unreadCount = notifications.filter(notif => !notif.isRead && !notif.read).length

  const handleNotificationClick = (notification) => {
    if (!notification.isRead && !notification.read) {
      markAsRead(notification._id)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
                    <p className="text-sm text-gray-500">
                      {unreadCount > 0 ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Toutes lues'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 border-b border-gray-200">
                <div className="flex gap-2">
                  {[
                    { key: 'all', label: 'Toutes' },
                    { key: 'unread', label: 'Non lues' },
                    { key: 'read', label: 'Lues' }
                  ].map(filterOption => (
                    <button
                      key={filterOption.key}
                      onClick={() => setFilter(filterOption.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        filter === filterOption.key
                          ? 'bg-black text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filterOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
                    <p className="text-gray-500">
                      {filter === 'unread' ? 'Vous n\'avez pas de notifications non lues' : 
                       filter === 'read' ? 'Vous n\'avez pas de notifications lues' : 
                       'Vous n\'avez pas encore de notifications'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredNotifications.map((notification) => (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 ${getPriorityColor(notification.priority)} ${
                          !notification.isRead && !notification.read ? 'bg-gray-50/50' : ''
                        }`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="text-sm font-semibold text-gray-900 mb-1">
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-gray-600 mb-2">
                                  {notification.message}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTimeAgo(notification.createdAt)}</span>
                                  {notification.priority === 'high' && (
                                    <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                                      Important
                                    </span>
                                  )}
                                </div>
                              </div>
                              {(!notification.isRead && !notification.read) && (
                                <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-2"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {notifications.length > 0 && unreadCount > 0 && (
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={markAllAsRead}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Marquer toutes comme lues
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default NotificationsPage
