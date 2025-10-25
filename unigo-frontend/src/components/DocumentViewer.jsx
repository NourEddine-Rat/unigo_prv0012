import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Download, ZoomIn, ZoomOut, RotateCw, CheckCircle, XCircle, 
  FileText, Image, ChevronLeft, ChevronRight, Eye, AlertTriangle,
  User, Shield, CreditCard, FileImage, FileCheck, FileX
} from 'lucide-react'

const DocumentViewer = ({ 
  isOpen, 
  onClose, 
  user, 
  documents, 
  onVerifyDocument, 
  onVerifyPayment,
  onVerifyDocuments 
}) => {
  const [currentDocIndex, setCurrentDocIndex] = useState(0)
  const [zoom, setZoom] = useState(0.5)
  const [rotation, setRotation] = useState(0)
  const [verificationNotes, setVerificationNotes] = useState('')
  const [documentStatus, setDocumentStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showImagePopup, setShowImagePopup] = useState(false)
  const [popupImageUrl, setPopupImageUrl] = useState('')

  const getAuthHeaders = () => {
    const token = localStorage.getItem('unigo_token')
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  const documentTypes = [
    { key: 'selfie_url', label: 'Selfie', icon: User, required: true, category: 'identity' },
    { key: 'cni_recto', label: 'CNI Recto', icon: FileImage, required: true, category: 'identity' },
    { key: 'cni_verso', label: 'CNI Verso', icon: FileImage, required: true, category: 'identity' },
    { key: 'student_card', label: 'Carte Étudiant', icon: FileText, required: true, category: 'education' },
    { key: 'payment_receipt', label: 'Reçu de Paiement', icon: CreditCard, required: true, category: 'payment' },
    { key: 'permit_recto', label: 'Permis Recto', icon: FileImage, required: user?.role === 'driver', category: 'driver' },
    { key: 'permit_verso', label: 'Permis Verso', icon: FileImage, required: user?.role === 'driver', category: 'driver' },
    { key: 'registration_doc', label: 'Carte Grise', icon: FileText, required: user?.role === 'driver', category: 'driver' },
    { key: 'insurance_doc', label: 'Assurance', icon: FileText, required: user?.role === 'driver', category: 'driver' }
  ]

  const filteredDocuments = documentTypes.filter(doc => {
    if (doc.key === 'selfie_url') {
      return documents.selfie_url || user?.selfie_url
    }
    return documents[doc.key] || (doc.required && user?.role === 'driver')
  })

  const currentDocument = filteredDocuments[currentDocIndex]
  const currentDocUrl = currentDocument ? 
    (currentDocument.key === 'selfie_url' ? 
      (documents.selfie_url || user?.selfie_url) : 
     currentDocument.key === 'payment_receipt' && user?.subscription_renewal_receipt && user?.subscription_renewal_pending ?
      user.subscription_renewal_receipt :
      documents[currentDocument.key]
    ) : 
    null

  useEffect(() => {
    if (isOpen) {
      setCurrentDocIndex(0)
      setZoom(0.5)
      setRotation(0)
      setVerificationNotes('')
      setDocumentStatus('')
      
      // Prevent background scrolling - more robust approach
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.classList.add('modal-open')
    } else {
      // Restore background scrolling
      const scrollY = document.body.style.top
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.classList.remove('modal-open')
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1)
      }
    }
    
    // Cleanup function to restore scrolling when component unmounts
    return () => {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.width = ''
      document.body.classList.remove('modal-open')
    }
  }, [isOpen])

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
  }

  const handleDownload = () => {
    if (currentDocUrl) {
      const link = document.createElement('a')
      link.href = `http://localhost:5000/uploads/${currentDocUrl}`
      link.download = currentDocUrl
      link.click()
    }
  }

  const handleImageClick = () => {
    if (currentDocUrl) {
      setPopupImageUrl(`http://localhost:5000/uploads/${currentDocUrl}`)
      setShowImagePopup(true)
    }
  }

  const handleVerifyDocument = async (status) => {
    setLoading(true)
    try {
      await onVerifyDocument({
        documents_status: status,
        verification_notes: verificationNotes
      })
      setDocumentStatus(status)
      setSuccess('Documents vérifiés avec succès')
    } catch (error) {
      console.error('Error verifying document:', error)
      setError('Erreur lors de la vérification des documents')
    } finally {
      setLoading(false)
    }
  }

  const handleIndividualDocumentVerification = async (docKey, status) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}/verify-document/${docKey}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          status: status,
          notes: verificationNotes
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        console.log('🔍 DOCUMENT VERIFICATION - Updated user:', updatedUser)
        console.log('🔍 DOCUMENT VERIFICATION - Document verification status:', updatedUser.document_verification)
        setSuccess(`Document ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès`)
        // Update the user data in parent component
        if (onVerifyDocuments) {
          console.log('🔍 DOCUMENT VERIFICATION - Calling onVerifyDocuments with:', updatedUser)
          onVerifyDocuments(updatedUser)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la vérification du document')
      }
    } catch (error) {
      console.error('Error verifying individual document:', error)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  const handlePaymentVerification = async (status) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/${user._id}/verify-payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          payment_verified: status === 'approved',
          payment_verification_notes: verificationNotes
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        console.log('🔍 PAYMENT VERIFICATION - Updated user:', updatedUser)
        setSuccess(`Paiement ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès`)
        // Update the user data in parent component
        if (onVerifyDocuments) {
          console.log('🔍 PAYMENT VERIFICATION - Calling onVerifyDocuments with:', updatedUser)
          onVerifyDocuments(updatedUser)
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erreur lors de la vérification du paiement')
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }


  const getDocumentStatus = (docKey) => {
    if (docKey === 'payment_receipt') {
      return user?.payment_verified ? 'verified' : 'pending'
    }
    
    // Check if the specific document exists
    const hasDocument = (docKey === 'selfie_url' && (documents.selfie_url || user?.selfie_url)) ||
                       (docKey !== 'selfie_url' && documents[docKey])
    
    if (!hasDocument) {
      return 'missing'
    }
    
    // Check individual document verification status
    if (user?.document_verification && user.document_verification[docKey]) {
      const status = user.document_verification[docKey]
      switch (status) {
        case 'approved': return 'verified'
        case 'rejected': return 'rejected'
        case 'pending': return 'pending'
        default: return 'pending'
      }
    }
    
    // For selfie_url, if it doesn't exist in document_verification, return pending
    if (docKey === 'selfie_url' && user?.document_verification && !user.document_verification[docKey]) {
      return 'pending'
    }
    
    // Fallback to global status if individual status not available
    if (user?.documents_verified) {
      return 'verified'
    } else if (user?.documents_verification_notes && user.documents_verification_notes.trim() !== '') {
      return 'rejected'
    }
    
    return 'pending'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100'
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'rejected': return 'text-red-600 bg-red-100'
      case 'missing': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return CheckCircle
      case 'pending': return AlertTriangle
      case 'rejected': return XCircle
      case 'missing': return FileX
      default: return FileText
    }
  }

  const getOverallDocumentStatus = () => {
    // Check if any required document is rejected
    const hasRejectedDocument = filteredDocuments.some(doc => {
      const status = getDocumentStatus(doc.key)
      return status === 'rejected'
    })

    if (hasRejectedDocument) {
      return 'rejected'
    }

    // Check if all required documents are verified
    const allDocumentsVerified = filteredDocuments.every(doc => {
      const status = getDocumentStatus(doc.key)
      return status === 'verified'
    })

    if (allDocumentsVerified) {
      return 'verified'
    }

    // If some documents are pending or missing, return pending
    return 'pending'
  }

  const getOverallUserStatus = () => {
    const documentStatus = getOverallDocumentStatus()
    
    // If documents are rejected or pending, user status should be pending
    if (documentStatus === 'rejected' || documentStatus === 'pending') {
      return 'pending_verification'
    }
    
    // If documents are verified but payment is not verified, user status should be pending payment
    if (documentStatus === 'verified' && !user.payment_verified) {
      return 'pending_payment'
    }
    
    // If documents are verified and payment is verified, user can be active
    if (documentStatus === 'verified' && user.payment_verified) {
      return 'active'
    }
    
    // Default to user's current status
    return user.status
  }

  if (!isOpen || !user) return null

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-thin {
          scrollbar-width: thin;
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .modal-scroll-container {
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
        }
        body.modal-open {
          overflow: hidden !important;
          position: fixed;
          width: 100%;
        }
      `}</style>
      <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-1 sm:p-2 md:p-4 z-50"
        onClick={onClose}
        onWheel={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl sm:rounded-2xl w-full max-w-[98vw] sm:max-w-[95vw] h-[98vh] sm:h-[95vh] overflow-hidden shadow-2xl border border-gray-200 flex flex-col"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-white border-b border-gray-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">Vérification des Documents</h2>
                <p className="text-gray-600 text-xs sm:text-sm truncate">
                  {user.first_name} {user.last_name} - {user.role === 'driver' ? 'Conducteur' : 'Passager'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
              </button>
            </div>
            
            {/* Mobile Document Selector */}
            <div className="md:hidden mt-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                {filteredDocuments.map((doc, index) => {
                  const StatusIcon = getStatusIcon(getDocumentStatus(doc.key))
                  const status = getDocumentStatus(doc.key)
                  
                  return (
                    <button
                      key={doc.key}
                      onClick={() => setCurrentDocIndex(index)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs whitespace-nowrap transition-all ${
                        currentDocIndex === index 
                          ? 'bg-black text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <doc.icon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{doc.label}</span>
                      <StatusIcon className={`w-3 h-3 flex-shrink-0 ${
                        currentDocIndex === index ? 'text-white' : getStatusColor(status).split(' ')[0]
                      }`} />
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-3 mx-3 sm:mx-4 md:mx-6 mt-3 sm:mt-4 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">{error}</span>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 sm:px-4 py-3 mx-3 sm:mx-4 md:mx-6 mt-3 sm:mt-4 rounded-xl flex items-center gap-2">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">{success}</span>
            </div>
          )}

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Document List Sidebar */}
            <div className="hidden md:flex w-full md:w-80 bg-gray-50 border-b md:border-b-0 md:border-r border-gray-200 overflow-y-auto flex-col scrollbar-thin modal-scroll-container">
              <div className="p-3 sm:p-4 flex-1 overflow-y-auto scrollbar-thin modal-scroll-container">
                <h3 className="font-semibold text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Documents</h3>
                <div className="space-y-1 sm:space-y-2">
                  {filteredDocuments.map((doc, index) => {
                    const StatusIcon = getStatusIcon(getDocumentStatus(doc.key))
                    const status = getDocumentStatus(doc.key)
                    
                    return (
                      <button
                        key={doc.key}
                        onClick={() => setCurrentDocIndex(index)}
                        className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl text-left transition-all ${
                          currentDocIndex === index 
                            ? 'bg-black text-white' 
                            : 'bg-white hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        <doc.icon className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-xs sm:text-sm md:text-base">{doc.label}</p>
                          <p className="text-xs opacity-75 capitalize hidden sm:block">{doc.category}</p>
                        </div>
                        <StatusIcon className={`w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 ${
                          currentDocIndex === index ? 'text-white' : getStatusColor(status).split(' ')[0]
                        }`} />
                      </button>
                    )
                  })}
                </div>

                {/* Verification Summary */}
                <div className="mt-3 sm:mt-4 md:mt-6 p-3 sm:p-4 bg-white rounded-lg sm:rounded-xl border border-gray-200">
                  <h4 className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">Résumé</h4>
                  <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span>Documents:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(getOverallDocumentStatus())}`}>
                        {getOverallDocumentStatus() === 'verified' ? 'Vérifiés' : 
                         getOverallDocumentStatus() === 'rejected' ? 'Rejetés' : 'En attente'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Paiement:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.payment_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {user.payment_verified ? 'Vérifié' : 'En attente'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut:</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(getOverallUserStatus())}`}>
                        {getOverallUserStatus() === 'active' ? 'Actif' : 
                         getOverallUserStatus() === 'pending_verification' ? 'En attente de vérification' :
                         getOverallUserStatus() === 'pending_payment' ? 'En attente de paiement' : 'En attente'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Document Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {currentDocument && currentDocUrl ? (
                <>
                  {/* Document Controls */}
                  <div className="bg-white border-b border-gray-200 p-3 sm:p-4 overflow-y-auto max-h-[40vh] md:max-h-none scrollbar-thin modal-scroll-container">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{currentDocument.label}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          getStatusColor(getDocumentStatus(currentDocument.key))
                        }`}>
                          {(() => {
                            const status = getDocumentStatus(currentDocument.key)
                            switch (status) {
                              case 'verified': return 'Vérifié'
                              case 'rejected': return 'Rejeté'
                              case 'missing': return 'Manquant'
                              default: return 'En attente'
                            }
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <button
                          onClick={handleImageClick}
                          className="flex items-center gap-1 px-2 sm:px-3 py-1 bg-black text-white text-xs sm:text-sm rounded-lg hover:bg-gray-800 transition-colors"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Voir l'image</span>
                        </button>
                        <button
                          onClick={handleZoomOut}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <ZoomOut className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="text-xs sm:text-sm text-gray-500 px-1 sm:px-2">{Math.round(zoom * 100)}%</span>
                        <button
                          onClick={handleZoomIn}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={handleRotate}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <RotateCw className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={handleReset}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <button
                          onClick={handleDownload}
                          className="p-1 sm:p-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Individual Document/Payment Verification Buttons */}
                    <div className="mt-3 sm:mt-4 md:mt-6 p-3 sm:p-4 md:p-6 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
                      <h4 className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 text-center">
                        {currentDocument.key === 'payment_receipt' ? 'Vérification du paiement' : 'Vérification de ce document'}
                      </h4>
                      <div className="space-y-2 sm:space-y-3">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                            Notes de vérification
                          </label>
                          <textarea
                            value={verificationNotes}
                            onChange={(e) => setVerificationNotes(e.target.value)}
                            rows={2}
                            className="w-full px-2 sm:px-3 py-2 border border-gray-200 rounded-lg focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white text-xs sm:text-sm"
                            placeholder={currentDocument.key === 'payment_receipt' ? 'Ajoutez des notes sur ce paiement...' : 'Ajoutez des notes sur ce document...'}
                          />
                        </div>
                        <div className="flex gap-2 sm:gap-3">
                          <button
                            onClick={() => {
                              if (currentDocument.key === 'payment_receipt') {
                                handlePaymentVerification('approved')
                              } else {
                                handleIndividualDocumentVerification(currentDocument.key, 'approved')
                              }
                            }}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 shadow-sm text-xs sm:text-sm"
                          >
                            <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            Approuver
                          </button>
                          <button
                            onClick={() => {
                              if (currentDocument.key === 'payment_receipt') {
                                handlePaymentVerification('rejected')
                              } else {
                                handleIndividualDocumentVerification(currentDocument.key, 'rejected')
                              }
                            }}
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 shadow-sm text-xs sm:text-sm"
                          >
                            <XCircle className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document Display */}
                  <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-auto p-2 sm:p-4 scrollbar-thin modal-scroll-container">
                    <div className="relative max-w-full max-h-full">
                      {currentDocUrl ? (
                        <img
                          src={`http://localhost:5000/uploads/${currentDocUrl}`}
                          alt={currentDocument.label}
                          className="max-w-full max-h-full object-contain shadow-lg rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{
                            transform: `scale(${zoom}) rotate(${rotation}deg)`,
                            transition: 'transform 0.3s ease'
                          }}
                          onClick={handleImageClick}
                          onError={(e) => {
                            console.error('Image load error:', e.target.src)
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`${currentDocUrl ? 'hidden' : 'flex'} absolute inset-0 bg-gray-200 rounded-lg items-center justify-center`}>
                        <div className="text-center">
                          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-2 sm:mb-4" />
                          <p className="text-gray-500 text-sm sm:text-base">Document non disponible</p>
                          <p className="text-xs text-gray-400 mt-1 sm:mt-2">URL: {currentDocUrl}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Navigation */}
                  {filteredDocuments.length > 1 && (
                    <div className="bg-white border-t border-gray-200 p-3 sm:p-4">
                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => setCurrentDocIndex(prev => 
                            prev > 0 ? prev - 1 : filteredDocuments.length - 1
                          )}
                          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-sm"
                        >
                          <ChevronLeft className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">Précédent</span>
                        </button>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {currentDocIndex + 1} / {filteredDocuments.length}
                        </span>
                        <button
                          onClick={() => setCurrentDocIndex(prev => 
                            prev < filteredDocuments.length - 1 ? prev + 1 : 0
                          )}
                          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1 sm:py-2 text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-sm"
                        >
                          <span className="hidden sm:inline">Suivant</span>
                          <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-100 p-4">
                  <div className="text-center">
                    <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Aucun document sélectionné</h3>
                    <p className="text-gray-500 text-sm sm:text-base">Sélectionnez un document dans la liste pour le visualiser</p>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Image Popup Modal */}
      {showImagePopup && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowImagePopup(false)}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="relative max-w-[90vw] max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowImagePopup(false)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={popupImageUrl}
              alt="Document"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

export default DocumentViewer
