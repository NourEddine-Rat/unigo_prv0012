import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Send, ArrowLeft, Image as ImageIcon, Paperclip, 
  X, Download, Check, CheckCheck, Circle, User,
  Search, MoreVertical, Phone, Video
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import io from 'socket.io-client'

const Chat = () => {
  const { userId, conversationId } = useParams() // Get userId or conversationId from URL
  const { user, getAuthHeaders } = useAuth()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typingUsers, setTypingUsers] = useState(new Set())
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loadingUser, setLoadingUser] = useState(false)
  
  const fileInputRef = useRef(null)
  const socket = useRef(null)
  const typingTimeout = useRef(null)

  // Initialize Socket.io
  useEffect(() => {
    socket.current = io('http://localhost:5000')
    
    socket.current.on('connect', () => {
      console.log('🔌 Connected to Socket.io')
      if (user?._id) {
        socket.current.emit('user_online', user._id)
      }
    })

    socket.current.on('new_message', (message) => {
      console.log('📨 New message received:', message)
      
      // Update conversations list
      fetchConversations()
      
      // If message is for current conversation, add it
      if (selectedConversation && 
          (message.sender_id._id === selectedConversation.otherUser._id || 
           message.receiver_id._id === selectedConversation.otherUser._id)) {
        setMessages(prev => [...prev, message])
      }
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

    socket.current.on('messages_read', ({ conversation_id }) => {
      // Update read status in messages
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

  // Fetch conversations
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

  useEffect(() => {
    fetchConversations()
  }, [])

  // Fetch user by ID and start conversation
  const fetchUserAndStartConversation = async (targetUserId) => {
    setLoadingUser(true)
    try {
      const response = await fetch(`http://localhost:5000/api/users/${targetUserId}`, {
        headers: getAuthHeaders()
      })
      
      if (response.ok) {
        const userData = await response.json()
        // Create a conversation object for this user
        const conv = {
          otherUser: userData,
          lastMessage: null,
          unreadCount: 0,
          _id: `new_${targetUserId}`
        }
        setSelectedConversation(conv)
        fetchMessages(targetUserId)
      } else {
        console.error('User not found')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoadingUser(false)
    }
  }

  // Handle conversationId from URL parameter (from notifications)
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      // Find conversation by conversation_id
      const existingConv = conversations.find(
        conv => conv.conversation_id === conversationId
      )
      
      if (existingConv) {
        selectConversation(existingConv)
      }
    }
  }, [conversationId, conversations])

  // Handle userId from URL parameter
  useEffect(() => {
    if (!userId) return
    if (userId === user?._id) return // Prevent self-chat

    // Try to find existing conversation; if not, start one directly
    const existingConv = conversations.find(
      conv => conv.otherUser._id === userId
    )
    
    if (existingConv) {
      selectConversation(existingConv)
    } else {
      fetchUserAndStartConversation(userId)
    }
  }, [userId, conversations])

  // Fetch messages for selected conversation
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

  // Send message
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
        fetchConversations() // Refresh conversations
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSending(false)
    }
  }

  // Handle typing
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

  // Handle file selection
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)

    // Create preview for images
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

  // Select conversation
  const selectConversation = (conv) => {
    setSelectedConversation(conv)
    fetchMessages(conv.otherUser._id)
  }


  // Filtered conversations
  const filteredConversations = conversations.filter(conv =>
    conv.otherUser?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.otherUser?.last_name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Format message time
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
    <div className="flex bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - 80px)' }}>
      {/* Conversations Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col bg-white border-r border-gray-200 overflow-hidden`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-center">Aucune conversation</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <motion.div
                key={conv._id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => selectConversation(conv)}
                className={`flex items-center gap-3 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedConversation?._id === conv._id ? 'bg-gray-50 border-l-4 border-l-black' : ''
                }`}
              >
                <div className="relative">
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
                    <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {conv.otherUser?.first_name} {conv.otherUser?.last_name}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {formatTime(conv.lastMessage?.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate">
                      {conv.lastMessage?.content || 'Fichier envoyé'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Chat Header */}
          <div className="bg-white border-b border-gray-200 p-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <div className="relative">
                  {selectedConversation.otherUser?.selfie_url ? (
                    <img
                      src={`http://localhost:5000/uploads/${selectedConversation.otherUser.selfie_url}`}
                      alt={selectedConversation.otherUser.first_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold">
                      {selectedConversation.otherUser?.first_name?.charAt(0)}
                    </div>
                  )}
                  {onlineUsers.has(selectedConversation.otherUser?._id) && (
                    <Circle className="absolute bottom-0 right-0 w-3 h-3 text-green-500 fill-green-500" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">
                    {selectedConversation.otherUser?.first_name} {selectedConversation.otherUser?.last_name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.has(selectedConversation.otherUser?._id) ? 'En ligne' : 'Hors ligne'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <Video className="w-5 h-5 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((msg, index) => {
              const isOwn = msg.sender_id._id === user._id
              const showDate = index === 0 || formatDate(messages[index - 1].createdAt) !== formatDate(msg.createdAt)

              return (
                <div key={msg._id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                        {formatDate(msg.createdAt)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                      {msg.message_type === 'text' && (
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwn 
                            ? 'bg-black text-white' 
                            : 'bg-gray-200 text-gray-900'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      )}
                      {msg.message_type === 'image' && (
                        <div className="rounded-xl overflow-hidden">
                          <img
                            src={`http://localhost:5000/uploads/${msg.file_url}`}
                            alt="Shared image"
                            className="max-w-full h-auto"
                          />
                        </div>
                      )}
                      {msg.message_type === 'file' && (
                        <div className={`px-4 py-3 rounded-xl flex items-center gap-3 ${
                          isOwn ? 'bg-black text-white' : 'bg-gray-200 text-gray-900'
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
                            className="p-1 hover:bg-white/10 rounded transition-colors"
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
            })}
            {typingUsers.has(selectedConversation.otherUser?._id) && (
              <div className="flex justify-start">
                <div className="bg-gray-200 px-4 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* File Preview */}
          <AnimatePresence>
            {selectedFile && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mx-4 p-3 bg-gray-100 rounded-xl flex items-center gap-3"
              >
                {filePreview ? (
                  <img src={filePreview} alt="Preview" className="w-16 h-16 object-cover rounded" />
                ) : (
                  <div className="w-16 h-16 bg-gray-300 rounded flex items-center justify-center">
                    <Paperclip className="w-6 h-6 text-gray-600" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedFile(null)
                    setFilePreview(null)
                  }}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Message Input */}
          <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200 flex-shrink-0">
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
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white"
              />
              <button
                type="submit"
                disabled={sending || (!messageInput.trim() && !selectedFile)}
                className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sélectionnez une conversation
            </h3>
            <p className="text-gray-500">
              Choisissez une conversation pour commencer à discuter
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Chat
