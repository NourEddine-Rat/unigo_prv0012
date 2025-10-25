import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Download, Eye, Edit, Trash2, CheckCircle, XCircle, 
  AlertTriangle, User, Shield, CreditCard, FileText, MapPin, 
  Calendar, Phone, Mail, Users, UserCheck, UserX, Clock, 
  ChevronLeft, ChevronRight, MoreVertical, Star, Ban, Unlock, X
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const UsersManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({})
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDocumentsModal, setShowDocumentsModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pagination, setPagination] = useState({})
  const { getAuthHeaders } = useAuth()


  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    page: 1,
    limit: 10
  })

  const [statusForm, setStatusForm] = useState({
    status: '',
    reason: ''
  })

  const [paymentForm, setPaymentForm] = useState({
    payment_verified: false,
    payment_notes: ''
  })

  const [documentsForm, setDocumentsForm] = useState({
    documents_status: '',
    verification_notes: ''
  })

  const statusOptions = [
    { value: 'pending_payment', label: 'En attente de paiement', color: 'yellow', icon: Clock },
    { value: 'pending_verification', label: 'En attente de vérification', color: 'blue', icon: FileText },
    { value: 'active', label: 'Actif', color: 'green', icon: UserCheck },
    { value: 'suspended', label: 'Suspendu', color: 'orange', icon: UserX },
    { value: 'banned', label: 'Banni', color: 'red', icon: Ban }
  ]

  const roleOptions = [
    { value: 'passenger', label: 'Passager', icon: User, color: 'blue' },
    { value: 'driver', label: 'Conducteur', icon: Shield, color: 'green' },
    { value: 'admin', label: 'Administrateur', icon: UserCheck, color: 'purple' }
  ]


  const fetchUsers = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key])
      })

      const response = await fetch(`http://localhost:5000/api/admin/users?${queryParams}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users || [])
        setPagination(data.pagination || {})
      } else {
        const errorData = await response.json()
        setError('Erreur lors du chargement des utilisateurs: ' + (errorData.error || 'Unknown error'))
      }
    } catch (err) {
      setError('Erreur de connexion: ' + err.message)
    } finally {
      setLoading(false)
    }
  }


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
    }
  }

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [filters])



  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) return

    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        setSuccess('Utilisateur supprimé avec succès')
        fetchUsers()
        fetchStats()
      } else {
        setError('Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const openUserModal = (user) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const openStatusModal = (user) => {
    setSelectedUser(user)
    setStatusForm({ status: user.status, reason: user.status_reason || '' })
    setShowStatusModal(true)
  }

  const openPaymentModal = (user) => {
    setSelectedUser(user)
    setPaymentForm({ 
      payment_verified: user.payment_verified || false, 
      payment_notes: user.payment_verification_notes || '' 
    })
    setShowPaymentModal(true)
  }

  const openDocumentsModal = (user) => {
    setSelectedUser(user)
    setDocumentsForm({ 
      documents_status: user.documents_verified ? 'approved' : 'rejected', 
      verification_notes: user.documents_verification_notes || '' 
    })
    setShowDocumentsModal(true)
  }

  const openDocumentViewer = (user) => {

    window.location.href = '/admin/documents'
  }

  const closeModals = () => {
    setShowUserModal(false)
    setShowDocumentsModal(false)
    setShowStatusModal(false)
    setShowPaymentModal(false)
    setSelectedUser(null)
    setError('')
    setSuccess('')
  }


  const getRoleInfo = (role) => {
    return roleOptions.find(r => r.value === role) || roleOptions[0]
  }


  const getStatusInfo = (user) => {

    const statusMap = {
      'pending_payment': { label: 'En attente de paiement', color: 'yellow', icon: Clock },
      'pending_verification': { label: 'En attente de vérification', color: 'blue', icon: FileText },
      'active': { label: 'Actif', color: 'green', icon: UserCheck },
      'suspended': { label: 'Suspendu', color: 'orange', icon: UserX },
      'banned': { label: 'Banni', color: 'red', icon: Ban }
    }
    

    return statusMap[user.status] || statusMap['pending_payment']
  }

  return (
    <div className="space-y-4 sm:space-y-6">
        {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des Utilisateurs</h2>
          <p className="text-gray-600 text-sm hidden sm:block">Consultez les profils utilisateurs et gérez leurs statuts manuellement</p>
            </div>
        
        </div>

        {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
          { label: 'Actifs', value: stats.activeUsers || 0, color: 'bg-green-100', iconColor: 'text-green-600', icon: UserCheck },
            { 
              label: 'En Attente Vérification', 
              value: stats.pendingVerification || 0, 
            color: 'bg-yellow-100', 
            iconColor: 'text-yellow-600',
              icon: Clock,
              action: () => setFilters({ ...filters, status: 'pending_verification' })
            },
            { 
              label: 'En Attente Paiement', 
              value: stats.pendingPayment || 0, 
            color: 'bg-blue-100', 
            iconColor: 'text-blue-600',
              icon: CreditCard,
              action: () => setFilters({ ...filters, status: 'pending_payment' })
            },
          { label: 'Nouveaux (30j)', value: stats.newUsersLast30Days || 0, color: 'bg-purple-100', iconColor: 'text-purple-600', icon: Users }
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
            className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all ${
              stat.action ? 'cursor-pointer' : ''
              }`}
              onClick={stat.action}
            >
              <div className="flex items-center justify-between">
                <div>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{stat.label}</p>
                </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0`}>
                <stat.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${stat.iconColor}`} />
                  </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl"
          >
          <XCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl"
          >
            <CheckCircle className="w-5 h-5" />
            {success}
          </motion.div>
        )}

        {/* Filters */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white text-sm sm:text-base"
              />
            </div>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
            className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white text-sm sm:text-base"
            >
              <option value="">Tous les rôles</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white text-sm sm:text-base"
            >
              <option value="">Tous les statuts</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-')
                setFilters({ ...filters, sortBy, sortOrder, page: 1 })
              }}
            className="px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white text-sm sm:text-base"
            >
              <option value="createdAt-desc">Plus récent</option>
              <option value="createdAt-asc">Plus ancien</option>
              <option value="first_name-asc">Nom A-Z</option>
              <option value="first_name-desc">Nom Z-A</option>
            </select>
            <button
              onClick={() => setFilters({ search: '', role: '', status: '', sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 10 })}
            className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm sm:text-base"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Effacer</span>
              <span className="sm:hidden">Clear</span>
            </button>
          </div>
        </div>

        {/* Users Table */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span className="hidden sm:inline">Utilisateur</span>
                          <span className="sm:hidden">User</span>
                        </div>
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Rôle</span>
                        <span className="sm:hidden">Role</span>
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Statut</span>
                        <span className="sm:hidden">Status</span>
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Vérifications</span>
                        <span className="sm:hidden">Verif</span>
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Inscription</span>
                        <span className="sm:hidden">Date</span>
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <span className="hidden sm:inline">Actions</span>
                        <span className="sm:hidden">Act</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => {
                      const statusInfo = getStatusInfo(user)
                      const roleInfo = getRoleInfo(user.role)
                      
                      return (
                        <motion.tr
                          key={user._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="relative group flex-shrink-0">
                                {user.selfie_url ? (
                                  <img
                                    src={`http://localhost:5000/uploads/${user.selfie_url}`}
                                    alt={`${user.first_name} ${user.last_name}`}
                                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 hover:border-black transition-all duration-200 cursor-pointer"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                    onClick={() => openDocumentViewer(user)}
                                    title="Cliquer pour voir les documents"
                                  />
                                ) : null}
                              <div 
                                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200 hover:border-black transition-all duration-200 cursor-pointer ${user.selfie_url ? 'hidden' : 'flex'}`}
                                onClick={() => openDocumentViewer(user)}
                                title="Cliquer pour voir les documents"
                              >
                                <User className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                              </div>
                              </div>
                              <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                                <div className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                  {user.first_name} {user.last_name}
                                </div>
                              <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 truncate">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{user.email}</span>
                              </div>
                              <div className="text-xs sm:text-sm text-gray-500 flex items-center gap-1 truncate">
                                <Phone className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{user.phone}</span>
                              </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-${roleInfo.color}-100 rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <roleInfo.icon className={`w-4 h-4 sm:w-5 sm:h-5 text-${roleInfo.color}-600`} />
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-gray-900 truncate">{roleInfo.label}</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <statusInfo.icon className={`w-4 h-4 text-${statusInfo.color}-500 flex-shrink-0`} />
                              <span className={`px-2 py-1 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 rounded-full text-xs font-medium whitespace-nowrap`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 sm:gap-2">
                              <div className={`w-2 h-2 rounded-full ${user.payment_verified ? 'bg-green-500' : 'bg-red-500'} flex-shrink-0`}></div>
                              <span className="text-xs text-gray-500 hidden sm:inline">Paiement</span>
                              <span className="text-xs text-gray-500 sm:hidden">Pay</span>
                              <div className={`w-2 h-2 rounded-full ${user.documents_verified ? 'bg-green-500' : 'bg-red-500'} flex-shrink-0`}></div>
                              <span className="text-xs text-gray-500 hidden sm:inline">Documents</span>
                              <span className="text-xs text-gray-500 sm:hidden">Docs</span>
                            </div>
                          </td>
                          <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 flex-shrink-0" />
                            <span className="text-xs sm:text-sm">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-1 sm:gap-2 justify-end">
                              <button
                                onClick={() => openUserModal(user)}
                              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                              title="Voir les détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openStatusModal(user)}
                              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                              title="Modifier le statut"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(user._id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                title="Supprimer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

            {!loading && users.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-500 mb-2">Aucun utilisateur trouvé</h3>
                <p className="text-gray-400">Ajustez vos filtres pour voir plus de résultats</p>
              </div>
            )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Précédent
                    </button>
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                      disabled={!pagination.hasNext}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Suivant
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                      Affichage de <span className="font-medium">{pagination.startIndex}</span> à <span className="font-medium">{pagination.endIndex}</span> sur <span className="font-medium">{pagination.total}</span> résultats
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                          disabled={!pagination.hasPrev}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => setFilters({ ...filters, page })}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === pagination.currentPage
                              ? 'z-10 bg-black border-black text-white'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                          disabled={!pagination.hasNext}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
        )}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Détails de l'utilisateur</h2>
                <button
                  onClick={closeModals}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Informations personnelles</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">Nom:</span>
                        <span className="font-medium">{selectedUser.first_name} {selectedUser.last_name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">Email:</span>
                        <span className="font-medium">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">Téléphone:</span>
                        <span className="font-medium">{selectedUser.phone}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-gray-400" />
                        <span className="text-gray-600">Inscrit le:</span>
                        <span className="font-medium">{new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</span>
                      </div>
                      </div>
                    </div>
                  </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Statut et vérifications</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">Statut:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium bg-${getStatusInfo(selectedUser).color}-100 text-${getStatusInfo(selectedUser).color}-800`}>
                          {getStatusInfo(selectedUser).label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">Documents:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedUser.documents_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {selectedUser.documents_verified ? 'Vérifiés' : 'En attente'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">Paiement:</span>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${selectedUser.payment_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {selectedUser.payment_verified ? 'Vérifié' : 'En attente'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                        </div>
              
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => {
                    setShowUserModal(false)
                    openStatusModal(selectedUser)
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Modifier le statut
                </button>
                <button
                  onClick={() => window.location.href = '/admin/documents'}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Gérer les documents
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Modal */}
      <AnimatePresence>
        {showStatusModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Modifier le statut</h2>
                <button
                  onClick={closeModals}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault()
                try {
                  const response = await fetch(`http://localhost:5000/api/admin/users/${selectedUser._id}/status`, {
                    method: 'PUT',
                    headers: {
                      'Content-Type': 'application/json',
                      ...getAuthHeaders()
                    },
                    body: JSON.stringify(statusForm)
                  })
                  
                  if (response.ok) {
                    const updatedUser = await response.json()
                    setUsers(prevUsers => 
                      prevUsers.map(user => 
                        user._id === selectedUser._id ? { ...user, ...updatedUser } : user
                      )
                    )
                    setSelectedUser(updatedUser)
                    setSuccess('Statut mis à jour avec succès')
                    closeModals()
                    fetchStats()
                  } else {
                    const errorData = await response.json()
                    setError(errorData.error || 'Erreur lors de la mise à jour')
                  }
                } catch (err) {
                  setError('Erreur de connexion')
                }
              }}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau statut</label>
                  <select
                    value={statusForm.status}
                    onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white"
                  >
                    {statusOptions.map(status => (
                      <option key={status.value} value={status.value}>{status.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Raison (optionnel)</label>
                  <textarea
                    value={statusForm.reason}
                    onChange={(e) => setStatusForm({ ...statusForm, reason: e.target.value })}
                    rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white"
                    placeholder="Expliquez la raison du changement de statut..."
                  />
                </div>
              </div>

                <div className="mt-6 flex gap-3">
                <button
                    type="button"
                  onClick={closeModals}
                    className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Mettre à jour
                </button>
              </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default UsersManagement