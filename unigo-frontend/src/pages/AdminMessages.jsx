import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, Search, MessageSquare, User, 
  Image as ImageIcon, Paperclip, Download,
  Check, CheckCheck, Circle, X, Filter,
  Users, Clock, AlertCircle, Menu
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import io from 'socket.io-client'

const AdminMessages = () => {
  const { user, getAuthHeaders } = useAuth()
  const [conversations, setConversations] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [stats, setStats] = useState({ total: 0, unread: 0, today: 0 })
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)
  
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)
  const socket = useRef(null)
  const typingTimeout = useRef(null)


  useEffect(() => {
    socket.current = io('http://localhost:5000')
    
    socket.current.on('connect', () => {
      console.log('🔌 Admin connected to Socket.io')
      if (user?._id) {
        socket.current.emit('user_online', user._id)
      }
    })

    socket.current.on('new_message', (message) => {
      console.log('📨 New message received:', message)
      

      fetchConversations()
      

      if (selectedConversation && 
          (message.sender_id._id === selectedConversation.otherUser._id || 
           message.receiver_id._id === selectedConversation.otherUser._id)) {
        setMessages(prev => [...prev, message])
      }


      fetchStats()
    })

    socket.current.on('user_typing', ({ senderId }) => {
      setTypingUsers(prev => new Set(prev).add(senderId))
    })

    socket.current.on('user_stop_typing', ({ senderId }) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev)
        newSet.delete(senderId)
        return newSet
      })
    })

    socket.current.on('user_status_changed', ({ userId, status }) => {
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

    socket.current.on('messages_read', () => {
      setMessages(prev => prev.map(msg => ({
        ...msg,
        read: true
      })))
    })

    return () => {
      if (socket.current) {
        socket.current.disconnect()
      }
    }
  }, [user, selectedConversation])


  const fetchConversations = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/messages/conversations', {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }


  const fetchAllUsers = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/users?limit=100', {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setAllUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }


  const fetchStats = async () => {
    try {
      const unreadRes = await fetch('http://localhost:5000/api/messages/unread/count', {
        headers: getAuthHeaders()
      })
      if (unreadRes.ok) {
        const unreadData = await unreadRes.json()
        setStats(prev => ({ ...prev, unread: unreadData.count }))
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  useEffect(() => {
    fetchConversations()
    fetchAllUsers()
    fetchStats()
  }, [])


  const fetchMessages = async (otherUserId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/messages/${otherUserId}`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }


  const handleSendMessage = async (e) => {
    e?.preventDefault()
    
    if (!messageInput.trim() && !selectedFile) return
    if (!selectedConversation) return

    setSending(true)

    try {
      const formData = new FormData()
      formData.append('receiver_id', selectedConversation.otherUser._id)
      
      if (selectedFile) {
        formData.append('file', selectedFile)
        formData.append('message_type', selectedFile.type.startsWith('image/') ? 'image' : 'file')
      } else {
        formData.append('content', messageInput)
        formData.append('message_type', 'text')
      }

      const response = await fetch('http://localhost:5000/api/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('unigo_token') || localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setMessageInput('')
        setSelectedFile(null)
        setFilePreview(null)
        fetchConversations()
        fetchStats()
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }


  const handleTyping = () => {
    if (selectedConversation && socket.current) {
      socket.current.emit('typing', {
        receiverId: selectedConversation.otherUser._id,
        senderId: user._id
      })

      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => {
        socket.current.emit('stop_typing', {
          receiverId: selectedConversation.otherUser._id,
          senderId: user._id
        })
      }, 1000)
    }
  }


  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFilePreview(reader.result)
      }
      reader.readAsDataURL(file)
    } else {
      setFilePreview(null)
    }
  }


  const startNewConversation = (selectedUser) => {
    const conv = {
      otherUser: selectedUser,
      lastMessage: null,
      unreadCount: 0
    }
    setSelectedConversation(conv)
    setMessages([])
    setShowNewChat(false)
  }


  const selectConversation = (conv) => {
    setSelectedConversation(conv)
    fetchMessages(conv.otherUser._id)
  }


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  const filteredConversations = conversations.filter(conv =>
    conv.otherUser?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.otherUser?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.otherUser?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = 
      u.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = filterRole === 'all' || u.role === filterRole
    
    return matchesSearch && matchesRole && u._id !== user._id
  })


  const formatTime = (date) => {
    const d = new Date(date)
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui'
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Hier'
    } else {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">Messages Admin</h1>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Gérer les conversations avec les utilisateurs</p>
          </div>
          <button
            onClick={() => setShowNewChat(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all text-sm sm:text-base"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Nouvelle conversation</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-blue-50 p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600" />
              <span className="text-xs text-blue-600 font-medium">Conversations</span>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{conversations.length}</p>
          </div>
          <div className="bg-red-50 p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-600" />
              <span className="text-xs text-red-600 font-medium">Non lus</span>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.unread}</p>
          </div>
          <div className="bg-green-50 p-2 sm:p-3 rounded-lg sm:rounded-xl">
            <div className="flex items-center gap-1 sm:gap-2 mb-1">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
              <span className="text-xs text-green-600 font-medium">En ligne</span>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{onlineUsers.size}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {showMobileSidebar && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />
        )}

        {/* Conversations Sidebar */}
        <div className={`bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ${
          showMobileSidebar ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:w-96 w-80 fixed md:relative z-50 md:z-auto h-screen md:h-full top-0 left-0`}>
          {/* Search */}
          <div className="p-3 sm:p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <button
                onClick={() => setShowMobileSidebar(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Rechercher une conversation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-gray-500 text-center text-sm">Aucune conversation</p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="mt-4 text-black hover:underline text-sm"
                >
                  Commencer une nouvelle conversation
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <motion.div
                  key={conv._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    selectConversation(conv)
                    setShowMobileSidebar(false) // Close mobile sidebar when conversation is selected
                  }}
                  className={`flex items-center gap-3 p-3 sm:p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    selectedConversation?._id === conv._id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="relative">
                    {conv.otherUser?.selfie_url ? (
                      <img
                        src={`http://localhost:5000/uploads/${conv.otherUser.selfie_url}`}
                        alt={conv.otherUser.first_name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                        {conv.otherUser?.first_name?.charAt(0)}
                      </div>
                    )}
                    {onlineUsers.has(conv.otherUser?._id) && (
                      <Circle className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-800 truncate text-sm sm:text-base">
                        {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                      </h3>
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs sm:text-sm text-gray-600 truncate">
                        {conv.lastMessage?.content || 'Fichier envoyé'}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center flex-shrink-0">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        conv.otherUser?.role === 'passenger' ? 'bg-blue-100 text-blue-700' :
                        conv.otherUser?.role === 'driver' ? 'bg-green-100 text-green-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>
                        {conv.otherUser?.role === 'passenger' ? 'Passager' :
                         conv.otherUser?.role === 'driver' ? 'Conducteur' : 'Admin'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-3 sm:p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Button */}
                  <button
                    onClick={() => setShowMobileSidebar(true)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  <div className="relative">
                    {selectedConversation.otherUser?.selfie_url ? (
                      <img
                        src={`http://localhost:5000/uploads/${selectedConversation.otherUser.selfie_url}`}
                        alt={selectedConversation.otherUser.first_name}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base">
                        {selectedConversation.otherUser?.first_name?.charAt(0)}
                      </div>
                    )}
                    {onlineUsers.has(selectedConversation.otherUser?._id) && (
                      <Circle className="absolute bottom-0 right-0 w-2 h-2 sm:w-3 sm:h-3 text-green-500 fill-green-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800 text-sm sm:text-base">
                      {selectedConversation.otherUser?.first_name} {selectedConversation.otherUser?.last_name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-gray-500">
                        {onlineUsers.has(selectedConversation.otherUser?._id) ? 'En ligne' : 'Hors ligne'}
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{selectedConversation.otherUser?.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-500">Aucun message</p>
                  <p className="text-sm text-gray-400">Commencez la conversation</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isOwn = msg.sender_id._id === user._id
                  const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt)

                  return (
                    <div key={msg._id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <span className="text-xs text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm">
                            {formatDate(msg.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                          {msg.message_type === 'text' && (
                            <div className={`px-4 py-2 rounded-2xl ${
                              isOwn 
                                ? 'bg-primary text-white' 
                                : 'bg-white text-gray-800 shadow-sm'
                            }`}>
                              <p className="text-sm">{msg.content}</p>
                            </div>
                          )}
                          {msg.message_type === 'image' && (
                            <div className="rounded-xl overflow-hidden shadow-md">
                              <img
                                src={`http://localhost:5000/uploads/${msg.file_url}`}
                                alt="Shared image"
                                className="max-w-full h-auto"
                              />
                            </div>
                          )}
                          {msg.message_type === 'file' && (
                            <div className={`px-4 py-3 rounded-xl flex items-center gap-3 shadow-sm ${
                              isOwn ? 'bg-primary text-white' : 'bg-white text-gray-800'
                            }`}>
                              <Paperclip className="w-5 h-5" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{msg.file_name}</p>
                                <p className="text-xs opacity-75">
                                  {(msg.file_size / 1024).toFixed(2)} KB
                                </p>
                              </div>
                              <a
                                href={`http://localhost:5000/uploads/${msg.file_url}`}
                                download
                                className="p-1 hover:bg-black/10 rounded"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                          <div className={`flex items-center gap-1 mt-1 text-xs ${
                            isOwn ? 'justify-end text-gray-500' : 'text-gray-500'
                          }`}>
                            <span>{formatTime(msg.createdAt)}</span>
                            {isOwn && (
                              msg.read ? (
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              {typingUsers.has(selectedConversation.otherUser?._id) && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-2 rounded-2xl shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Preview */}
            <AnimatePresence>
              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="mx-4 p-3 bg-white rounded-xl flex items-center gap-3 shadow-md"
                >
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <Paperclip className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedFile(null)
                      setFilePreview(null)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.txt"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value)
                    handleTyping()
                  }}
                  placeholder="Écrivez votre message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || (!messageInput.trim() && !selectedFile)}
                  className="p-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (

          conversations.length > 0 ? (
            <div className="md:hidden flex-1 flex flex-col bg-white">
              {/* Mobile Conversation List Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
                  <button
                    onClick={() => setShowNewChat(true)}
                    className="px-3 py-1 bg-black text-white rounded-lg hover:bg-gray-800 transition-all text-sm"
                  >
                    Nouveau
                  </button>
                </div>
              </div>
              
              {/* Mobile Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.map((conv) => (
                  <motion.div
                    key={conv._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => {
                      selectConversation(conv)
                      setShowMobileSidebar(false)
                    }}
                    className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedConversation?._id === conv._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      {conv.otherUser?.selfie_url ? (
                        <img
                          src={`http://localhost:5000/uploads/${conv.otherUser.selfie_url}`}
                          alt={conv.otherUser.first_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                          {conv.otherUser?.first_name?.charAt(0)}
                        </div>
                      )}
                      {onlineUsers.has(conv.otherUser?._id) && (
                        <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-800 truncate">
                          {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                        </h3>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {conv.lastMessage && formatTime(conv.lastMessage.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conv.lastMessage?.content || 'Fichier envoyé'}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <MessageSquare className="w-24 h-24 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Aucune conversation
                </h3>
                <p className="text-gray-500 mb-4">
                  Commencez une nouvelle conversation
                </p>
                <button
                  onClick={() => setShowNewChat(true)}
                  className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-all"
                >
                  Nouvelle conversation
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* New Chat Modal */}
      <AnimatePresence>
        {showNewChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setShowNewChat(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800">Nouvelle Conversation</h2>
                <button
                  onClick={() => setShowNewChat(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Rechercher un utilisateur..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  <option value="all">Tous les rôles</option>
                  <option value="passenger">Passagers</option>
                  <option value="driver">Conducteurs</option>
                </select>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u._id}
                    onClick={() => startNewConversation(u)}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors"
                  >
                    {u.selfie_url ? (
                      <img
                        src={`http://localhost:5000/uploads/${u.selfie_url}`}
                        alt={u.first_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                        {u.first_name?.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-800">
                        {u.first_name} {u.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      u.role === 'passenger' ? 'bg-blue-100 text-blue-700' :
                      u.role === 'driver' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {u.role === 'passenger' ? 'Passager' :
                       u.role === 'driver' ? 'Conducteur' : 'Admin'}
                    </span>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <div className="text-center py-8">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Aucun utilisateur trouvé</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default AdminMessages

