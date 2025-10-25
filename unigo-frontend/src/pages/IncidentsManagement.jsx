import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  AlertTriangle, 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Trash2, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  Calendar,
  Flag,
  MessageSquare,
  FileText,
  ChevronLeft,
  ChevronRight,
  Download,
  ZoomIn
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const IncidentsManagement = () => {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIncident, setSelectedIncident] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all',
    severity: 'all',
    priority: 'all',
    page: 1,
    limit: 10
  })
  const [pagination, setPagination] = useState({})
  const { getAuthHeaders } = useAuth()

  // Fetch incidents from API
  const fetchIncidents = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          queryParams.append(key, value)
        }
      })

      const response = await fetch(`http://localhost:5000/api/admin/incidents?${queryParams}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setIncidents(data.incidents)
        setPagination(data.pagination)
      } else {
        setError('Erreur lors du chargement des incidents')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIncidents()
  }, [filters])

  // Handle incident status update
  const handleStatusUpdate = async (incidentId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/incidents/${incidentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setSuccess('Statut mis à jour avec succès')
        fetchIncidents()
        setShowModal(false)
      } else {
        setError('Erreur lors de la mise à jour')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }

  // Handle incident deletion
  const handleDelete = async (incidentId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet incident ?')) return

    try {
      const response = await fetch(`http://localhost:5000/api/admin/incidents/${incidentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        setSuccess('Incident supprimé avec succès')
        fetchIncidents()
      } else {
        setError('Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }

  // Handle user profile view
  const handleViewProfile = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${userId}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const user = await response.json()
        setSelectedUser(user)
        setShowProfileModal(true)
      } else {
        setError('Erreur lors du chargement du profil')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }

  // Handle evidence download
  const handleDownloadEvidence = (evidence) => {
    if (evidence.url) {
      const link = document.createElement('a')
      link.href = `http://localhost:5000/uploads/${evidence.url}`
      link.download = evidence.url
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // Handle image zoom
  const handleImageZoom = (evidence) => {
    if (evidence.type === 'image' && evidence.url) {
      setSelectedImage(evidence)
      setShowImageModal(true)
    }
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'reported': return 'bg-red-100 text-red-700'
      case 'investigating': return 'bg-yellow-100 text-yellow-700'
      case 'resolved': return 'bg-green-100 text-green-700'
      case 'dismissed': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Get severity color
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'critical': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Get priority color
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-700'
      case 'normal': return 'bg-blue-100 text-blue-700'
      case 'high': return 'bg-orange-100 text-orange-700'
      case 'urgent': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Get type label
  const getTypeLabel = (type) => {
    const types = {
      safety: 'Sécurité',
      fraud: 'Fraude',
      harassment: 'Harcèlement',
      vehicle_damage: 'Dommage véhicule',
      payment_issue: 'Problème paiement',
      cancellation_abuse: 'Annulation abusive',
      other: 'Autre'
    }
    return types[type] || type
  }

  // Get status label
  const getStatusLabel = (status) => {
    const statuses = {
      reported: 'Signalé',
      investigating: 'En cours',
      resolved: 'Résolu',
      dismissed: 'Rejeté'
    }
    return statuses[status] || status
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Tous les statuts</option>
            <option value="reported">Signalé</option>
            <option value="investigating">En cours</option>
            <option value="resolved">Résolu</option>
            <option value="dismissed">Rejeté</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Tous les types</option>
            <option value="safety">Sécurité</option>
            <option value="fraud">Fraude</option>
            <option value="harassment">Harcèlement</option>
            <option value="vehicle_damage">Dommage véhicule</option>
            <option value="payment_issue">Problème paiement</option>
            <option value="cancellation_abuse">Annulation abusive</option>
            <option value="other">Autre</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity}
            onChange={(e) => setFilters({ ...filters, severity: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Toutes les gravités</option>
            <option value="low">Faible</option>
            <option value="medium">Moyen</option>
            <option value="high">Élevé</option>
            <option value="critical">Critique</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value, page: 1 })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="all">Toutes les priorités</option>
            <option value="low">Faible</option>
            <option value="normal">Normale</option>
            <option value="high">Élevée</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Incidents Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-500">Chargement des incidents...</p>
          </div>
        ) : incidents.length === 0 ? (
          <div className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Aucun incident trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Incident
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signalé par
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signalé contre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Gravité
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {incidents.map((incident) => (
                  <tr key={incident._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {incident.title}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {incident.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div 
                        className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => handleViewProfile(incident.reported_by._id)}
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {incident.reported_by?.first_name} {incident.reported_by?.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {incident.reported_by?.email}
                          </div>
                          <div className="text-xs text-blue-600 mt-1">
                            Cliquer pour voir le profil
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {incident.reported_against ? (
                        <div 
                          className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                          onClick={() => handleViewProfile(incident.reported_against._id)}
                        >
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                            <User className="w-4 h-4 text-red-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {incident.reported_against?.first_name} {incident.reported_against?.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {incident.reported_against?.email}
                            </div>
                            <div className="text-xs text-blue-600 mt-1">
                              Cliquer pour voir le profil
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">Non spécifié</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {getTypeLabel(incident.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(incident.status)}`}>
                        {getStatusLabel(incident.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {incident.created_at ? new Date(incident.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedIncident(incident)
                            setShowModal(true)
                          }}
                          className="text-primary hover:text-secondary"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(incident._id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <button
                  onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                  disabled={!pagination.hasNext}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Affichage de <span className="font-medium">{((filters.page - 1) * filters.limit) + 1}</span> à{' '}
                    <span className="font-medium">
                      {Math.min(filters.page * filters.limit, pagination.totalIncidents)}
                    </span>{' '}
                    sur <span className="font-medium">{pagination.totalIncidents}</span> résultats
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      {filters.page} / {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {showModal && selectedIncident && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Détails de l'incident
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
                <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900 text-lg">{selectedIncident.title}</h4>
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-700 mb-2">Description complète:</h5>
                    <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedIncident.description}</p>
                  </div>
                </div>

                {/* Evidence Section */}
                {selectedIncident.evidence && selectedIncident.evidence.length > 0 && (
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Preuves fournies ({selectedIncident.evidence.length})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedIncident.evidence.map((evidence, index) => (
                        <div key={index} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {evidence.type === 'image' ? 'Image' : 
                               evidence.type === 'video' ? 'Vidéo' : 
                               evidence.type === 'document' ? 'Document' : 
                               evidence.type === 'message' ? 'Message' : evidence.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {evidence.uploaded_at ? new Date(evidence.uploaded_at).toLocaleDateString('fr-FR') : ''}
                            </span>
                          </div>
                          {evidence.url && (
                            <div className="mb-2 relative group">
                              {evidence.type === 'image' ? (
                                <div className="relative">
                                  <img 
                                    src={`http://localhost:5000/uploads/${evidence.url}`} 
                                    alt={`Preuve ${index + 1}`}
                                    className="w-full h-32 object-cover rounded border cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => handleImageZoom(evidence)}
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      e.target.nextSibling.style.display = 'block'
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 rounded border flex items-center justify-center">
                                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                                  <FileText className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                              <div style={{display: 'none'}} className="w-full h-32 bg-gray-100 rounded border flex items-center justify-center">
                                <span className="text-gray-500 text-sm">Image non disponible</span>
                              </div>
                            </div>
                          )}
                          {evidence.description && (
                            <p className="text-sm text-gray-600 mb-3">{evidence.description}</p>
                          )}
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => handleDownloadEvidence(evidence)}
                              className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                            >
                              <Download className="w-3 h-3" />
                              Télécharger
                            </button>
                            {evidence.type === 'image' && (
                              <button
                                onClick={() => handleImageZoom(evidence)}
                                className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                              >
                                <ZoomIn className="w-3 h-3" />
                                Zoom
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reporter and Reported Person Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-blue-600" />
                      Signalé par
                    </h5>
                    <div 
                      className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                      onClick={() => handleViewProfile(selectedIncident.reported_by._id)}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedIncident.reported_by?.first_name} {selectedIncident.reported_by?.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{selectedIncident.reported_by?.email}</p>
                        <p className="text-xs text-blue-600 mt-1">Cliquer pour voir le profil</p>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 mb-2 flex items-center">
                      <User className="w-4 h-4 mr-2 text-red-600" />
                      Signalé contre
                    </h5>
                    {selectedIncident.reported_against ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {selectedIncident.reported_against?.first_name} {selectedIncident.reported_against?.last_name}
                          </p>
                          <p className="text-sm text-gray-500">{selectedIncident.reported_against?.email}</p>
                          <button
                            onClick={() => handleViewProfile(selectedIncident.reported_against._id)}
                            className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                          >
                            Voir le profil complet →
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Non spécifié</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Type:</span>
                    <p className="text-sm text-gray-900">{getTypeLabel(selectedIncident.type)}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Gravité:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedIncident.severity)}`}>
                      {selectedIncident.severity}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Statut:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedIncident.status)}`}>
                      {getStatusLabel(selectedIncident.status)}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Priorité:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedIncident.priority)}`}>
                      {selectedIncident.priority}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Date de signalement:</span>
                    <p className="text-sm text-gray-900">
                      {selectedIncident.createdAt ? new Date(selectedIncident.createdAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Date inconnue'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Dernière mise à jour:</span>
                    <p className="text-sm text-gray-900">
                      {selectedIncident.updatedAt ? new Date(selectedIncident.updatedAt).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Date inconnue'}
                    </p>
                  </div>
                </div>

                {selectedIncident.admin_notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Notes admin:</span>
                    <p className="text-sm text-gray-900 mt-1">{selectedIncident.admin_notes}</p>
                  </div>
                )}

                {selectedIncident.resolution_notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Notes de résolution:</span>
                    <p className="text-sm text-gray-900 mt-1">{selectedIncident.resolution_notes}</p>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4 border-t">
                  {selectedIncident.status === 'reported' && (
                    <button
                      onClick={() => handleStatusUpdate(selectedIncident._id, 'investigating')}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                    >
                      Mettre en cours
                    </button>
                  )}
                  {selectedIncident.status === 'investigating' && (
                    <>
                      <button
                        onClick={() => handleStatusUpdate(selectedIncident._id, 'resolved')}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Résoudre
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(selectedIncident._id, 'dismissed')}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Rejeter
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showProfileModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Profil de l'utilisateur signalé
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-6">
                {/* User Basic Info */}
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                    {selectedUser.selfie_url ? (
                      <img 
                        src={`http://localhost:5000/uploads/${selectedUser.selfie_url}`} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-semibold text-gray-900">
                      {selectedUser.first_name} {selectedUser.last_name}
                    </h4>
                    <p className="text-gray-600">{selectedUser.email}</p>
                    <p className="text-gray-500">{selectedUser.phone}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.role === 'driver' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedUser.role === 'driver' ? 'Conducteur' : 'Passager'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.status === 'active' ? 'bg-green-100 text-green-700' :
                        selectedUser.status === 'pending_verification' ? 'bg-yellow-100 text-yellow-700' :
                        selectedUser.status === 'pending_payment' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.status === 'active' ? 'Actif' :
                         selectedUser.status === 'pending_verification' ? 'En attente de vérification' :
                         selectedUser.status === 'pending_payment' ? 'En attente de paiement' :
                         selectedUser.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* User Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Genre:</span>
                    <p className="text-sm text-gray-900 capitalize">{selectedUser.gender}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Note moyenne:</span>
                    <p className="text-sm text-gray-900">{selectedUser.rating_average || 0}/5</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Trajets:</span>
                    <p className="text-sm text-gray-900">{selectedUser.total_trips || 0}</p>
                  </div>
                  
                  
                  <div>
                    <span className="text-sm font-medium text-gray-500">Solde UniCard:</span>
                    <p className="text-sm text-gray-900">{selectedUser.unicard_balance || 0} points</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Dernière connexion:</span>
                    <p className="text-sm text-gray-900">
                      {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleDateString('fr-FR') : 'Jamais'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Membre depuis:</span>
                    <p className="text-sm text-gray-900">
                      {selectedUser.created_at || selectedUser.createdAt ? new Date(selectedUser.created_at || selectedUser.createdAt).toLocaleDateString('fr-FR') : 'Date inconnue'}
                    </p>
                  </div>
                </div>

                {/* Verification Status */}
                <div className="border-t pt-4">
                  <h5 className="font-medium text-gray-900 mb-3">Statut de vérification</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Documents:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.documents_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.documents_verified ? 'Vérifiés' : 'Non vérifiés'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Paiement:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.payment_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {selectedUser.payment_verified ? 'Vérifié' : 'Non vérifié'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Vehicle Info (if driver) */}
                {selectedUser.role === 'driver' && selectedUser.vehicle_info && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Informations véhicule</h5>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Modèle:</span>
                        <p className="text-sm text-gray-900">{selectedUser.vehicle_info.make_model || 'Non spécifié'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Plaque:</span>
                        <p className="text-sm text-gray-900">{selectedUser.vehicle_info.plate_number || 'Non spécifiée'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Notes */}
                {(selectedUser.documents_verification_notes || selectedUser.payment_verification_notes) && (
                  <div className="border-t pt-4">
                    <h5 className="font-medium text-gray-900 mb-3">Notes admin</h5>
                    {selectedUser.documents_verification_notes && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-500">Documents:</span>
                        <p className="text-sm text-gray-900">{selectedUser.documents_verification_notes}</p>
                      </div>
                    )}
                    {selectedUser.payment_verification_notes && (
                      <div>
                        <span className="text-sm font-medium text-gray-500">Paiement:</span>
                        <p className="text-sm text-gray-900">{selectedUser.payment_verification_notes}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end space-x-2 pt-4 border-t">
                  <button
                    onClick={() => {
                      setShowProfileModal(false)
                      // You can add navigation to user management here
                    }}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileModal(false)
                      // You can add navigation to user management here
                      window.open(`/admin/users?search=${selectedUser.email}`, '_blank')
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-secondary transition-colors"
                  >
                    Voir dans la gestion des utilisateurs
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <XCircle className="w-6 h-6 text-gray-600" />
            </button>
            <div className="bg-white rounded-lg overflow-hidden shadow-xl">
              <img 
                src={`http://localhost:5000/uploads/${selectedImage.url}`} 
                alt={selectedImage.description || 'Preuve'}
                className="max-w-full max-h-[80vh] object-contain"
                onError={(e) => {
                  e.target.style.display = 'none'
                  e.target.nextSibling.style.display = 'flex'
                }}
              />
              <div style={{display: 'none'}} className="w-full h-64 bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500">Image non disponible</span>
              </div>
              <div className="p-4 bg-gray-50">
                <h4 className="font-medium text-gray-900 mb-2">{selectedImage.description || 'Preuve'}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {selectedImage.uploaded_at ? new Date(selectedImage.uploaded_at).toLocaleDateString('fr-FR') : ''}
                  </span>
                  <button
                    onClick={() => handleDownloadEvidence(selectedImage)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Télécharger
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default IncidentsManagement
