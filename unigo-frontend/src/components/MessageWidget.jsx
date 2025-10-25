import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageSquare, Send, Circle, Clock, ArrowRight, Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import io from 'socket.io-client'

const MessageWidget = () => {
  const { user, getAuthHeaders } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [unreadCount, setUnreadCount] = useState(0)
  const [onlineUsers, setOnlineUsers] = useState(new Set())

  // Socket.io connection
  useEffect(() => {
    const socket = io('http://localhost:5000')
    
    socket.on('connect', () => {
      if (user?._id) {
        socket.emit('user_online', user._id)
      }
    })

    socket.on('new_message', () => {
      fetchConversations()
      fetchUnreadCount()
    })

    socket.on('user_status_changed', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev)
        if (status === 'online') {
          newSet.add(userId)
        } else {
          newSet.delete(userId)
        }
        return newSet
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [user])

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/messages/conversations', {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        // Get only the 3 most recent conversations
        setConversations((data.conversations || []).slice(0, 3))
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/messages/unread/count', {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  useEffect(() => {
    fetchConversations()
    fetchUnreadCount()
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchConversations()
      fetchUnreadCount()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [])

  // Format time
  const formatTime = (date) => {
    const d = new Date(date)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'À l\'instant'
    if (diffMins < 60) return `${diffMins}m`
    if (diffHours < 24) return `${diffHours}h`
    if (diffDays < 7) return `${diffDays}j`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:border-gray-300 transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Messages</h2>
            <p className="text-xs text-gray-500">Conversations récentes</p>
          </div>
        </div>
        <Link
          to="/chat"
          className="flex items-center gap-2 text-sm text-black hover:text-gray-700 transition-colors font-medium"
        >
          Voir tout
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Unread Count Badge */}
      {unreadCount > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center gap-3"
        >
          <Mail className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {unreadCount} message{unreadCount > 1 ? 's' : ''} non lu{unreadCount > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-600">Vous avez de nouveaux messages</p>
          </div>
          <Link
            to="/chat"
            className="px-3 py-1 bg-black text-white text-xs rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Lire
          </Link>
        </motion.div>
      )}

      {/* Conversations List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm mb-2">Aucune conversation</p>
            <p className="text-gray-400 text-xs mb-4">Commencez à discuter avec d'autres utilisateurs</p>
            <Link
              to="/chat"
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white text-sm rounded-xl hover:bg-gray-800 transition-all font-medium"
            >
              <Send className="w-4 h-4" />
              Nouveau message
            </Link>
          </div>
        ) : (
          <>
            {conversations.map((conv) => (
              <Link
                key={conv._id}
                to={`/chat/${conv.otherUser._id}`}
                className="block p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 bg-gray-50/50"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {conv.otherUser?.selfie_url ? (
                      <img
                        src={`http://localhost:5000/uploads/${conv.otherUser.selfie_url}`}
                        alt={conv.otherUser.first_name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold">
                        {conv.otherUser?.first_name?.charAt(0)}
                      </div>
                    )}
                    {onlineUsers.has(conv.otherUser?._id) && (
                      <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">
                        {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600 truncate">
                        {conv.lastMessage?.content || 'Fichier envoyé'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conv.otherUser?.role === 'passenger' ? 'bg-gray-100 text-gray-700' :
                        conv.otherUser?.role === 'driver' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {conv.otherUser?.role === 'passenger' ? 'Passager' :
                         conv.otherUser?.role === 'driver' ? 'Conducteur' : 'Admin'}
                      </span>
                      {onlineUsers.has(conv.otherUser?._id) && (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Circle className="w-2 h-2 fill-green-600" />
                          En ligne
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}

            {/* View All Link */}
            <Link
              to="/chat"
              className="block text-center py-3 text-sm text-black hover:text-gray-700 font-medium transition-colors"
            >
              Voir toutes les conversations →
            </Link>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default MessageWidget

