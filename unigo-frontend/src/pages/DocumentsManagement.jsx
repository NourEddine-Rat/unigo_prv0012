import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Filter, Download, Eye, CheckCircle, XCircle, 
  AlertTriangle, User, FileText, Clock, Calendar, 
  ChevronLeft, ChevronRight, RefreshCw, UserCheck
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import DocumentViewer from '../components/DocumentViewer'

const DocumentsManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
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
    { value: 'pending_verification', label: 'En attente de vérification', color: 'yellow', icon: Clock },
    { value: 'verified', label: 'Vérifiés', color: 'green', icon: CheckCircle },
    { value: 'rejected', label: 'Rejetés', color: 'red', icon: XCircle },
    { value: 'all', label: 'Tous', color: 'gray', icon: FileText }
  ]

  const roleOptions = [
    { value: 'passenger', label: 'Passager', icon: User, color: 'blue' },
    { value: 'driver', label: 'Conducteur', icon: UserCheck, color: 'green' },
    { value: 'admin', label: 'Administrateur', icon: UserCheck, color: 'purple' }
  ]


  const fetchUsers = async () => {
    try {
      setLoading(true)
      console.log('🔍 DOCUMENTS - Starting fetchUsers...')
      console.log('🔍 DOCUMENTS - Current filters:', filters)
      
      const queryParams = new URLSearchParams()
      Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key])
      })
      

      if (filters.status && filters.status !== 'all') {
        queryParams.append('documents_status', filters.status)
        console.log('🔍 DOCUMENTS - Added documents_status filter:', filters.status)
      }

      const url = `http://localhost:5000/api/admin/users?${queryParams}`
      console.log('🔍 DOCUMENTS - API URL:', url)
      console.log('🔍 DOCUMENTS - Auth headers:', getAuthHeaders())

      const response = await fetch(url, {
        headers: getAuthHeaders()
      })

      console.log('🔍 DOCUMENTS - Response status:', response.status)
      console.log('🔍 DOCUMENTS - Response ok:', response.ok)

      if (response.ok) {
        const data = await response.json()
        console.log('🔍 DOCUMENTS - API Response:', data)
        console.log('🔍 DOCUMENTS - Users count:', data.users ? data.users.length : 'NO USERS PROPERTY')
        console.log('🔍 DOCUMENTS - Full response structure:', JSON.stringify(data, null, 2))
        setUsers(data.users || [])
        setPagination(data.pagination || {})
      } else {
        const errorData = await response.json()
        console.error('🔍 DOCUMENTS - API Error:', errorData)
        setError('Erreur lors du chargement des utilisateurs: ' + (errorData.error || 'Unknown error'))
      }
    } catch (err) {
      console.error('🔍 DOCUMENTS - Network Error:', err)
      setError('Erreur de connexion: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filters])


  const handleDocumentVerification = async (data) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${selectedUser._id}/verify-documents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
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
        setSuccess('Documents vérifiés avec succès')
        setShowDocumentViewer(false)
        fetchUsers()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la vérification')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const handleIndividualDocumentVerification = async (updatedUser) => {
    console.log('🔍 DOCUMENTS MANAGEMENT - Received updated user:', updatedUser)
    console.log('🔍 DOCUMENTS MANAGEMENT - Document verification status:', updatedUser.document_verification)
    

    setUsers(prevUsers => 
      prevUsers.map(user => 
        user._id === updatedUser._id 
          ? { ...user, ...updatedUser }
          : user
      )
    )

    setSelectedUser(updatedUser)
    console.log('🔍 DOCUMENTS MANAGEMENT - Updated selected user:', updatedUser)
  }


  const handlePaymentVerification = async (data) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${selectedUser._id}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
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


  const openDocumentViewer = async (user) => {
    setSelectedUser(user)
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


  const closeModals = () => {
    setShowDocumentViewer(false)
    setSelectedUser(null)
    setUserDocuments({})
    setError('')
    setSuccess('')
  }


  const getStatusInfo = (user) => {
    if (user.documents_verified) {
      return { label: 'Vérifiés', color: 'green', icon: CheckCircle }
    } else if (user.status === 'pending_verification') {
      return { label: 'En attente', color: 'yellow', icon: Clock }
    } else {
      return { label: 'Rejetés', color: 'red', icon: XCircle }
    }
  }


  const getRoleInfo = (role) => {
    return roleOptions.find(r => r.value === role) || roleOptions[0]
  }



  

  console.log('🔍 DOCUMENTS - Component render:')
  console.log('🔍 DOCUMENTS - Users state:', users.length)
  console.log('🔍 DOCUMENTS - Loading state:', loading)
  console.log('🔍 DOCUMENTS - Error state:', error)
  console.log('🔍 DOCUMENTS - Filters:', filters)

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
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
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
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut Documents</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inscription</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
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
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="relative group">
                                {user.selfie_url ? (
                                  <img
                                    src={`http://localhost:5000/uploads/${user.selfie_url}`}
                                    alt={`${user.first_name} ${user.last_name}`}
                                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-gray-200 hover:border-primary transition-all duration-200 cursor-pointer flex-shrink-0"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'flex'
                                    }}
                                    onClick={() => openDocumentViewer(user)}
                                    title="Cliquer pour voir les documents"
                                  />
                                ) : null}
                                <div className={`w-14 h-14 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-primary transition-all duration-200 cursor-pointer flex-shrink-0 ${
                                  user.selfie_url ? 'hidden' : 'flex'
                                }`} onClick={() => openDocumentViewer(user)} title="Cliquer pour voir les documents">
                                  <User className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" />
                                </div>
                                {/* Verification status indicator */}
                                <div className={`absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-white flex items-center justify-center ${
                                  user.documents_verified ? 'bg-green-500' : 'bg-yellow-500'
                                }`} title={user.documents_verified ? 'Documents vérifiés' : 'Documents en attente'}>
                                  {user.documents_verified ? (
                                    <CheckCircle className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                                  ) : (
                                    <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-white" />
                                  )}
                                </div>
                                {/* Hover overlay */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full transition-all duration-200 flex items-center justify-center">
                                  <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
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
                              <statusInfo.icon className={`w-4 h-4 text-${statusInfo.color}-500`} />
                              <span className={`px-2 py-1 bg-${statusInfo.color}-100 text-${statusInfo.color}-700 rounded-full text-xs font-medium`}>
                                {statusInfo.label}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${user.payment_verified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-xs text-gray-500">Paiement</span>
                              <div className={`w-2 h-2 rounded-full ${user.documents_verified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <span className="text-xs text-gray-500">Documents</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => openDocumentViewer(user)}
                              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-all"
                            >
                              <Eye className="w-4 h-4" />
                              Vérifier
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

          {!loading && users.length === 0 && (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-500 mb-2">Aucun document trouvé</h3>
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

      {/* Document Viewer */}
      {showDocumentViewer && selectedUser && (
        <DocumentViewer
          isOpen={showDocumentViewer}
          onClose={closeModals}
          user={selectedUser}
          documents={userDocuments}
          onVerifyDocument={handleDocumentVerification}
          onVerifyPayment={handlePaymentVerification}
          onVerifyDocuments={handleIndividualDocumentVerification}
        />
      )}
    </div>
  )
}

export default DocumentsManagement
