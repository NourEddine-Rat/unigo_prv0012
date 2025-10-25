import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Download, Eye, CheckCircle, XCircle, 
  AlertTriangle, User, CreditCard, Clock, Calendar, 
  ChevronLeft, ChevronRight, RefreshCw, DollarSign,
  FileText, Banknote, Receipt
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DocumentViewer from '../components/DocumentViewer'

const PaymentsManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showDocumentViewer, setShowDocumentViewer] = useState(false)
  const [userDocuments, setUserDocuments] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pagination, setPagination] = useState({})
  const { getAuthHeaders } = useAuth()

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    role: '',
    page: 1,
    limit: 10
  })


  const statusOptions = [
    { value: 'pending_payment', label: 'En attente de paiement', color: 'yellow', icon: Clock },
    { value: 'verified', label: 'Paiements vérifiés', color: 'green', icon: CheckCircle },
    { value: 'rejected', label: 'Paiements rejetés', color: 'red', icon: XCircle },
    { value: 'renewal_pending', label: 'Renouvellements en attente', color: 'orange', icon: RefreshCw },
    { value: 'expired', label: 'Abonnements expirés', color: 'red', icon: AlertTriangle },
    { value: 'all', label: 'Tous', color: 'gray', icon: CreditCard }
  ]

  const roleOptions = [
    { value: 'passenger', label: 'Passager', icon: User, color: 'blue' },
    { value: 'driver', label: 'Conducteur', icon: User, color: 'green' },
    { value: 'admin', label: 'Administrateur', icon: User, color: 'purple' }
  ]

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key])
      })
      

      if (filters.status && filters.status !== 'all') {
        queryParams.append('payment_status', filters.status)
      }

      const response = await fetch(`http://localhost:5000/api/admin/users?${queryParams}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.users)
        setPagination(data.pagination)
      } else {
        setError('Erreur lors du chargement des utilisateurs')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filters])


  const openPaymentModal = (user) => {
    setSelectedUser(user)
    setShowPaymentModal(true)
  }


  const openDocumentViewer = async (user) => {
    setSelectedUser(user)
    setShowPaymentModal(false)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}/documents`, {
        headers: getAuthHeaders()
      })
      if (response.ok) {
        const data = await response.json()
        setUserDocuments({
          ...data.documents,
          selfie_url: data.selfie_url || user.selfie_url
        })
        setShowDocumentViewer(true)
      } else {
        setError('Erreur lors du chargement des documents')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const handlePaymentVerification = async (data) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${selectedUser._id}/verify-payment`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const updatedUser = await response.json()
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user._id === selectedUser._id 
              ? { ...user, ...updatedUser }
              : user
          )
        )
        setSelectedUser(updatedUser)
        setSuccess('Paiement vérifié avec succès')
        fetchUsers()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la vérification')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const handleIndividualDocumentVerification = (updatedUser) => {
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user._id === updatedUser._id 
          ? { ...user, ...updatedUser }
          : user
      )
    )
    setSelectedUser(updatedUser)
    fetchUsers()
  }


  const closeModals = () => {
    setShowPaymentModal(false)
    setShowDocumentViewer(false)
    setSelectedUser(null)
    setUserDocuments({})
    setError('')
    setSuccess('')
  }


  const getPaymentStatusInfo = (user) => {

    if (user.subscription_renewal_pending) {
      return { label: 'Renouvellement en attente', color: 'orange', icon: RefreshCw }
    }
    

    if (user.subscription_status === 'expired') {
      return { label: 'Abonnement expiré', color: 'red', icon: AlertTriangle }
    }
    

    if (user.payment_verified) {
      return { label: 'Vérifié', color: 'green', icon: CheckCircle }
    } else if (user.status === 'pending_payment') {
      return { label: 'En attente', color: 'yellow', icon: Clock }
    } else {
      return { label: 'Rejeté', color: 'red', icon: XCircle }
    }
  }


  const getSubscriptionInfo = (user) => {
    if (!user.subscription_end_date) {
      return null
    }
    
    const now = new Date()
    const endDate = new Date(user.subscription_end_date)
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    
    if (daysRemaining < 0) {
      return { text: 'Expiré', color: 'red' }
    } else if (daysRemaining < 7) {
      return { text: `${daysRemaining}j restants`, color: 'orange' }
    } else {
      return { text: endDate.toLocaleDateString('fr-FR'), color: 'green' }
    }
  }


  const getRoleInfo = (role) => {
    return roleOptions.find(r => r.value === role) || roleOptions[0]
  }




  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {success}
          </motion.div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Rechercher un utilisateur..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value, page: 1 })}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Tous les rôles</option>
              {roleOptions.map(role => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
            <button
              onClick={() => setFilters({ search: '', status: 'all', role: '', page: 1, limit: 10 })}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
            >
              <Filter className="w-4 h-4" />
              Effacer
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Utilisateur
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Abonnement</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => {
                      const paymentStatusInfo = getPaymentStatusInfo(user)
                      const roleInfo = getRoleInfo(user.role)
                      const subscriptionInfo = getSubscriptionInfo(user)
                      
                      return (
                        <motion.tr
                          key={user._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="relative group">
                                {user.selfie_url ? (
                                  <img
                                    src={`http://localhost:5000/uploads/${user.selfie_url}`}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 hover:border-primary transition-all duration-200 flex-shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                  />
                                ) : null}
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-primary transition-all duration-200 flex-shrink-0 ${
                                  user.selfie_url ? 'hidden' : 'flex'
                                }`}>
                                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                                </div>
                                {/* Payment status indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white flex items-center justify-center ${
                                  user.payment_verified ? 'bg-green-500' : 'bg-yellow-500'
                                }`} title={user.payment_verified ? 'Paiement vérifié' : 'Paiement en attente'}>
                                  {user.payment_verified ? (
                                    <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                                  ) : (
                                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                                  )}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                                <div className="text-xs text-gray-400">{user.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <roleInfo.icon className={`w-4 h-4 text-${roleInfo.color}-500`} />
                              <span className={`px-2 py-1 bg-${roleInfo.color}-100 text-${roleInfo.color}-700 rounded-full text-xs font-medium`}>
                                {roleInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <paymentStatusInfo.icon className={`w-4 h-4 text-${paymentStatusInfo.color}-500`} />
                              <span className={`px-2 py-1 bg-${paymentStatusInfo.color}-100 text-${paymentStatusInfo.color}-700 rounded-full text-xs font-medium`}>
                                {paymentStatusInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {subscriptionInfo ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className={`text-sm font-medium text-${subscriptionInfo.color}-600`}>
                                  {subscriptionInfo.text}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Non défini</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="text-sm font-medium text-gray-900">
                                99 MAD
                              </span>
                              <span className="text-xs text-gray-500">/{user.role === 'driver' ? 'mois' : 'an'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openPaymentModal(user)}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                            >
                              <Eye className="w-4 h-4" />
                              Voir
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

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
                        Affichage de <span className="font-medium">{((pagination.currentPage - 1) * filters.limit) + 1}</span> à{' '}
                        <span className="font-medium">
                          {Math.min(pagination.currentPage * filters.limit, pagination.totalUsers)}
                        </span>{' '}
                        sur <span className="font-medium">{pagination.totalUsers}</span> résultats
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
                                ? 'z-10 bg-primary border-primary text-white'
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

          {!loading && users.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">Aucun paiement trouvé</h3>
              <p className="text-gray-400">Ajustez vos filtres pour voir plus de résultats</p>
              <div className="mt-4 text-sm text-gray-500">
                <p>Total utilisateurs: {users.length}</p>
                <p>Filtre actuel: {filters.status}</p>
                <p>Recherche: {filters.search || 'Aucune'}</p>
                <p>Rôle: {filters.role || 'Tous'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Verification Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeModals}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Paiement</h2>
                <button
                  onClick={closeModals}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                {/* User Info - Compact */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-gray-700 mb-1">Utilisateur</h3>
                      <p className="text-sm text-gray-900 font-medium">{selectedUser.first_name} {selectedUser.last_name}</p>
                      <p className="text-xs text-gray-500">{selectedUser.email}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full capitalize font-medium">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>

                {/* Payment Status & Amount - Combined */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="text-xs font-semibold text-gray-700 mb-1">Abonnement</h3>
                    <p className="text-sm font-bold text-green-600">
                      99 MAD/{selectedUser.role === 'driver' ? 'mois' : 'an'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h3 className="text-xs font-semibold text-gray-700 mb-1">Statut</h3>
                    <div className="flex items-center gap-1">
                      {selectedUser.payment_verified ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-xs font-medium text-green-700">Vérifié</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-yellow-500" />
                          <span className="text-xs font-medium text-yellow-700">En attente</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscription Info - Compact */}
                {selectedUser.subscription_end_date && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h3 className="text-xs font-semibold text-blue-900 mb-1">Abonnement</h3>
                    <div className="text-xs text-blue-700 space-y-0.5">
                      <p>Expire le: {new Date(selectedUser.subscription_end_date).toLocaleDateString('fr-FR')}</p>
                      {selectedUser.subscription_renewal_pending && (
                        <p className="font-medium text-orange-600">⏳ Renouvellement en attente</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes - Only if exists */}
                {selectedUser.payment_verification_notes && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="text-xs font-semibold text-yellow-900 mb-1">Notes</h3>
                    <p className="text-xs text-yellow-700">{selectedUser.payment_verification_notes}</p>
                  </div>
                )}

                {/* Quick Info */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <span className="font-medium">Inscription:</span>
                      <p>{new Date(selectedUser.createdAt).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <span className="font-medium">UniCard:</span>
                      <p>{selectedUser.unicard_balance || 0} pts</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t mt-4">
                {(selectedUser?.subscription_renewal_pending || selectedUser?.documents?.payment_receipt) && (
                  <button
                    onClick={() => openDocumentViewer(selectedUser)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Voir Documents
                  </button>
                )}
                <button
                  onClick={closeModals}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg hover:bg-gray-800 transition-all"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Viewer */}
      {showDocumentViewer && selectedUser && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={closeModals}
          user={selectedUser}
          documents={userDocuments}
          onVerifyPayment={handlePaymentVerification}
          onVerifyDocuments={handleIndividualDocumentVerification}
        />
      )}
    </div>
  )
}

export default PaymentsManagement
