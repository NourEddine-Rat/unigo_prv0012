import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const RejectedDocumentsModal = ({ isOpen, onClose, user }) => {
  const { getAuthHeaders } = useAuth()
  const [uploading, setUploading] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen || !user) return null

  // Get rejected documents
  const getRejectedDocuments = () => {
    if (!user.document_verification) return []
    
    const rejectedDocs = []
    const documentTypes = {
      'selfie_url': 'Selfie',
      'cni_recto': 'CNI (Recto)',
      'cni_verso': 'CNI (Verso)',
      'student_card': 'Carte Étudiante',
      'payment_receipt': 'Reçu de Paiement',
      'permit_recto': 'Permis de Conduire (Recto)',
      'permit_verso': 'Permis de Conduire (Verso)',
      'registration_doc': 'Carte Grise',
      'insurance_doc': 'Assurance'
    }

    Object.entries(user.document_verification).forEach(([docType, status]) => {
      if (status === 'rejected') {
        rejectedDocs.push({
          type: docType,
          name: documentTypes[docType] || docType,
          currentFile: user.documents?.[docType] || user[docType]
        })
      }
    })

    return rejectedDocs
  }

  const rejectedDocuments = getRejectedDocuments()

  const handleFileUpload = async (docType, file) => {
    if (!file) return

    setUploading(prev => ({ ...prev, [docType]: true }))
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', docType)

      const token = localStorage.getItem('unigo_token')
      const response = await fetch('http://localhost:5000/api/auth/upload-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Document ${getDocumentDisplayName(docType)} téléchargé avec succès`)
        // Refresh user data or close modal
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors du téléchargement')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setUploading(prev => ({ ...prev, [docType]: false }))
    }
  }

  // Helper function to get document display names
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending': return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      default: return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents Rejetés</h2>
            <p className="text-gray-600">
              Les documents suivants ont été rejetés et doivent être téléchargés à nouveau.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm">{success}</span>
          </div>
        )}

        <div className="space-y-4">
          {rejectedDocuments.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <p className="text-gray-600">Aucun document rejeté trouvé.</p>
            </div>
          ) : (
            rejectedDocuments.map((doc) => (
              <div key={doc.type} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon('rejected')}
                    <div>
                      <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                      <p className="text-sm text-gray-500">Statut: Rejeté</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Télécharger un nouveau fichier
                  </label>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(doc.type, e.target.files[0])}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
                  />
                  {uploading[doc.type] && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent" />
                      Téléchargement en cours...
                    </div>
                  )}
                </div>

                {doc.currentFile && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">Fichier actuel:</p>
                    <p className="text-sm font-medium text-gray-900">{doc.currentFile}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Instructions importantes:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Assurez-vous que le document est lisible et de bonne qualité</li>
                  <li>• Vérifiez que toutes les informations sont visibles</li>
                  <li>• Les formats acceptés sont: JPG, PNG, PDF</li>
                  <li>• Taille maximale: 5 MB</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Fermer
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default RejectedDocumentsModal
