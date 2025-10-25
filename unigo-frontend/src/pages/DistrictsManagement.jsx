import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Edit, Trash2, MapPin, Search, Filter, X, Save, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const DistrictsManagement = () => {
  const [districts, setDistricts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingDistrict, setEditingDistrict] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { getAuthHeaders } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    type: 'quartier',
    city: '',
    coords: { lat: '', lng: '' },
    address: '',
    description: '',
    is_active: true
  })

  const districtTypes = [
    { value: 'quartier', label: 'Quartier', icon: '🏘️' },
    { value: 'gare', label: 'Gare', icon: '🚉' },
    { value: 'tram_station', label: 'Station Tramway', icon: '🚊' },
    { value: 'university', label: 'Université', icon: '🎓' }
  ]

  const cities = ['Rabat', 'Salé', 'Témara', 'Casablanca', 'Fès', 'Marrakech']


  const fetchDistricts = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/districts')
      if (response.ok) {
        const data = await response.json()
        setDistricts(data)
      } else {
        setError('Erreur lors du chargement des districts')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDistricts()
  }, [])


  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const districtData = {
        ...formData,
        coords: {
          lat: parseFloat(formData.coords.lat),
          lng: parseFloat(formData.coords.lng)
        }
      }

      const url = editingDistrict ? `http://localhost:5000/api/districts/${editingDistrict._id}` : 'http://localhost:5000/api/districts'
      const method = editingDistrict ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify(districtData)
      })

      if (response.ok) {
        setSuccess(editingDistrict ? 'District modifié avec succès' : 'District créé avec succès')
        setShowModal(false)
        setEditingDistrict(null)
        resetForm()
        fetchDistricts()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la sauvegarde')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce district ?')) return

    try {
      const response = await fetch(`http://localhost:5000/api/districts/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      })

      if (response.ok) {
        setSuccess('District supprimé avec succès')
        fetchDistricts()
      } else {
        setError('Erreur lors de la suppression')
      }
    } catch (err) {
      setError('Erreur de connexion')
    }
  }


  const resetForm = () => {
    setFormData({
      name: '',
      type: 'quartier',
      city: '',
      coords: { lat: '', lng: '' },
      address: '',
      description: '',
      is_active: true
    })
  }


  const openEditModal = (district) => {
    setEditingDistrict(district)
    setFormData({
      name: district.name,
      type: district.type,
      city: district.city,
      coords: { lat: district.coords.lat.toString(), lng: district.coords.lng.toString() },
      address: district.address,
      description: district.description || '',
      is_active: district.is_active
    })
    setShowModal(true)
  }


  const openCreateModal = () => {
    setEditingDistrict(null)
    resetForm()
    setShowModal(true)
  }


  const closeModal = () => {
    setShowModal(false)
    setEditingDistrict(null)
    resetForm()
    setError('')
    setSuccess('')
  }


  const filteredDistricts = districts.filter(district => {
    const matchesSearch = district.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         district.address.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = !filterType || district.type === filterType
    const matchesCity = !filterCity || district.city === filterCity
    return matchesSearch && matchesType && matchesCity
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all shadow-sm"
            >
              <Plus className="w-5 h-5" />
              Nouveau District
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
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
                placeholder="Rechercher un district..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Tous les types</option>
              {districtTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            >
              <option value="">Toutes les villes</option>
              {cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <button
              onClick={() => {
                setSearchTerm('')
                setFilterType('')
                setFilterCity('')
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
            >
              <X className="w-4 h-4" />
              Effacer
            </button>
          </div>
        </div>

        {/* Districts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDistricts.map((district) => (
                <motion.div
                  key={district._id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center text-white text-xl">
                        {districtTypes.find(t => t.value === district.type)?.icon || '📍'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{district.name}</h3>
                        <p className="text-sm text-gray-500">{district.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(district)}
                        className="p-2 text-gray-400 hover:text-black transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(district._id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{district.address}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Type:</span> {districtTypes.find(t => t.value === district.type)?.label}
                    </div>
                    <div className="text-sm text-gray-500">
                      <span className="font-medium">Coordonnées:</span> {district.coords.lat.toFixed(4)}, {district.coords.lng.toFixed(4)}
                    </div>
                    {district.description && (
                      <div className="text-sm text-gray-600 mt-2">
                        {district.description}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      district.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {district.is_active ? 'Actif' : 'Inactif'}
                    </div>
                    <div className="text-xs text-gray-400">
                      Créé le {new Date(district.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {!loading && filteredDistricts.length === 0 && (
          <div className="text-center py-12">
            <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-500 mb-2">Aucun district trouvé</h3>
            <p className="text-gray-400">Commencez par ajouter votre premier district</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {editingDistrict ? 'Modifier le District' : 'Nouveau District'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nom du District *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="ex: Agdal"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      {districtTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.icon} {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ville *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Sélectionner une ville</option>
                      {cities.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse *
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="ex: Avenue des Nations Unies"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Latitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.coords.lat}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        coords: { ...formData.coords, lat: e.target.value }
                      })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="ex: 33.9716"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Longitude *
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={formData.coords.lng}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        coords: { ...formData.coords, lng: e.target.value }
                      })}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                      placeholder="ex: -6.8498"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="Description optionnelle du district..."
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-gray-700">District actif</span>
                  </label>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all"
                  >
                    {editingDistrict ? 'Modifier' : 'Créer'}
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

export default DistrictsManagement
