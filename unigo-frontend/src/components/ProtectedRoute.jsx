import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AlertTriangle, Upload, FileText, CreditCard } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import RejectedDocumentsModal from './RejectedDocumentsModal'

const TruckLoader = () => {
  return (
    <StyledWrapper>
      <div className="loader">
        <div className="truckWrapper">
          <div className="truckBody">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 198 93" className="trucksvg">
              <path strokeWidth={3} stroke="#282828" fill="#F83D3D" d="M135 22.5H177.264C178.295 22.5 179.22 23.133 179.594 24.0939L192.33 56.8443C192.442 57.1332 192.5 57.4404 192.5 57.7504V89C192.5 90.3807 191.381 91.5 190 91.5H135C133.619 91.5 132.5 90.3807 132.5 89V25C132.5 23.6193 133.619 22.5 135 22.5Z" />
              <path strokeWidth={3} stroke="#282828" fill="#7D7C7C" d="M146 33.5H181.741C182.779 33.5 183.709 34.1415 184.078 35.112L190.538 52.112C191.16 53.748 189.951 55.5 188.201 55.5H146C144.619 55.5 143.5 54.3807 143.5 53V36C143.5 34.6193 144.619 33.5 146 33.5Z" />
              <path strokeWidth={2} stroke="#282828" fill="#282828" d="M150 65C150 65.39 149.763 65.8656 149.127 66.2893C148.499 66.7083 147.573 67 146.5 67C145.427 67 144.501 66.7083 143.873 66.2893C143.237 65.8656 143 65.39 143 65C143 64.61 143.237 64.1344 143.873 63.7107C144.501 63.2917 145.427 63 146.5 63C147.573 63 148.499 63.2917 149.127 63.7107C149.763 64.1344 150 64.61 150 65Z" />
              <rect strokeWidth={2} stroke="#282828" fill="#FFFCAB" rx={1} height={7} width={5} y={63} x={187} />
              <rect strokeWidth={2} stroke="#282828" fill="#282828" rx={1} height={11} width={4} y={81} x={193} />
              <rect strokeWidth={3} stroke="#282828" fill="#DFDFDF" rx="2.5" height={90} width={121} y="1.5" x="6.5" />
              <rect strokeWidth={2} stroke="#282828" fill="#DFDFDF" rx={2} height={4} width={6} y={84} x={1} />
            </svg>
          </div>
          <div className="truckTires">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="tiresvg">
              <circle strokeWidth={3} stroke="#282828" fill="#282828" r="13.5" cy={15} cx={15} />
              <circle fill="#DFDFDF" r={7} cy={15} cx={15} />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 30 30" className="tiresvg">
              <circle strokeWidth={3} stroke="#282828" fill="#282828" r="13.5" cy={15} cx={15} />
              <circle fill="#DFDFDF" r={7} cy={15} cx={15} />
            </svg>
          </div>
          <div className="road" />
          <svg xmlSpace="preserve" viewBox="0 0 453.459 453.459" xmlnsXlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg" id="Capa_1" version="1.1" fill="#000000" className="lampPost">
            <path d="M252.882,0c-37.781,0-68.686,29.953-70.245,67.358h-6.917v8.954c-26.109,2.163-45.463,10.011-45.463,19.366h9.993
      c-1.65,5.146-2.507,10.54-2.507,16.017c0,28.956,23.558,52.514,52.514,52.514c28.956,0,52.514-23.558,52.514-52.514
      c0-5.478-0.856-10.872-2.506-16.017h9.992c0-9.354-19.352-17.204-45.463-19.366v-8.954h-6.149C200.189,38.779,223.924,16,252.882,16
      c29.952,0,54.32,24.368,54.32,54.32c0,28.774-11.078,37.009-25.105,47.437c-17.444,12.968-37.216,27.667-37.216,78.884v113.914
      h-0.797c-5.068,0-9.174,4.108-9.174,9.177c0,2.844,1.293,5.383,3.321,7.066c-3.432,27.933-26.851,95.744-8.226,115.459v11.202h45.75
      v-11.202c18.625-19.715-4.794-87.527-8.227-115.459c2.029-1.683,3.322-4.223,3.322-7.066c0-5.068-4.107-9.177-9.176-9.177h-0.795
      V196.641c0-43.174,14.942-54.283,30.762-66.043c14.793-10.997,31.559-23.461,31.559-60.277C323.202,31.545,291.656,0,252.882,0z
      M232.77,111.694c0,23.442-19.071,42.514-42.514,42.514c-23.442,0-42.514-19.072-42.514-42.514c0-5.531,1.078-10.957,3.141-16.017
      h78.747C231.693,100.736,232.77,106.162,232.77,111.694z" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .loader {
    width: fit-content;
    height: fit-content;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .truckWrapper {
    width: 120px;
    height: 60px;
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    justify-content: flex-end;
    overflow-x: hidden;
  }
  .truckBody {
    width: 80px;
    height: fit-content;
    margin-bottom: 4px;
    animation: motion 1s linear infinite;
  }
  @keyframes motion {
    0% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(3px);
    }
    100% {
      transform: translateY(0px);
    }
  }
  .truckTires {
    width: 80px;
    height: fit-content;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0px 6px 0px 9px;
    position: absolute;
    bottom: 0;
  }
  .truckTires svg {
    width: 14px;
  }

  .road {
    width: 100%;
    height: 1px;
    background-color: #282828;
    position: relative;
    bottom: 0;
    align-self: flex-end;
    border-radius: 2px;
  }
  .road::before {
    content: "";
    position: absolute;
    width: 12px;
    height: 100%;
    background-color: #282828;
    right: -50%;
    border-radius: 2px;
    animation: roadAnimation 1.4s linear infinite;
    border-left: 6px solid white;
  }
  .road::after {
    content: "";
    position: absolute;
    width: 6px;
    height: 100%;
    background-color: #282828;
    right: -65%;
    border-radius: 2px;
    animation: roadAnimation 1.4s linear infinite;
    border-left: 2px solid white;
  }

  .lampPost {
    position: absolute;
    bottom: 0;
    right: -90%;
    height: 54px;
    animation: roadAnimation 1.4s linear infinite;
  }

  @keyframes roadAnimation {
    0% {
      transform: translateX(0px);
    }
    100% {
      transform: translateX(-350px);
    }
  }`;

const SubscriptionRenewalModal = ({ user, onClose }) => {
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Le fichier doit être inférieur à 5 MB')
        return
      }
      setSelectedFile(file)
      setError('')
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('renewal_receipt', selectedFile)

      const token = localStorage.getItem('unigo_token')
      const response = await fetch('http://localhost:5000/api/auth/upload-renewal-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        setSuccess('Reçu de renouvellement soumis avec succès!')
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.error || 'Erreur lors du téléchargement')
      }
    } catch (err) {
      setError('Erreur de connexion')
    } finally {
      setUploading(false)
    }
  }

  const renewalCost = user?.role === 'driver' ? '99 MAD/mois' : '99 MAD/an'

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md w-full">
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <CreditCard className="w-8 h-8 text-orange-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-3 text-center">Renouvellement requis</h2>
      <p className="text-gray-600 mb-6 text-center">
        Votre abonnement a expiré. Veuillez payer et soumettre votre reçu de paiement pour continuer.
      </p>

      <div className="bg-orange-50 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-orange-900 mb-2">Montant à payer:</p>
        <p className="text-2xl font-bold text-orange-600">{renewalCost}</p>
        <p className="text-xs text-orange-700 mt-2">
          {user?.role === 'driver' ? 'Abonnement mensuel pour conducteurs' : 'Abonnement annuel pour passagers'}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{success}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Télécharger le reçu de paiement
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
          />
          {selectedFile && (
            <p className="mt-2 text-sm text-gray-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {selectedFile.name}
            </p>
          )}
        </div>

        <button
          onClick={handleUpload}
          disabled={uploading || !selectedFile}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
              Téléchargement...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Soumettre le reçu
            </>
          )}
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Une fois soumis, votre reçu sera vérifié par nos administrateurs dans un délai de 24-72 heures.
        </p>
      </div>
    </div>
  )
}

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth()
  const [subscriptionStatus, setSubscriptionStatus] = useState(null)
  const [checkingSubscription, setCheckingSubscription] = useState(true)
  const [showRejectedDocumentsModal, setShowRejectedDocumentsModal] = useState(false)

  useEffect(() => {
    const checkSubscription = async () => {
      if (user && user.role !== 'admin') {
        const now = new Date()
        const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null
        
        if (endDate && now > endDate) {
          setSubscriptionStatus('expired')
        } else {
          setSubscriptionStatus(user.subscription_status)
        }
      }
      setCheckingSubscription(false)
    }

    if (!loading) {
      checkSubscription()
    }
  }, [user, loading])

  if (loading || checkingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to="/search" replace />
  }

  if (user.role !== 'admin' && subscriptionStatus === 'expired' && !user.subscription_renewal_pending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <SubscriptionRenewalModal user={user} />
      </div>
    )
  }

  if (user.role !== 'admin' && user.subscription_renewal_pending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center hover:shadow-md transition-all">
          <div className="flex items-center justify-center mb-6">
            <TruckLoader />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Renouvellement en cours</h2>
          <p className="text-gray-600 mb-4 text-lg">
            Votre reçu de renouvellement est en cours de vérification.
          </p>
          <p className="text-gray-500 text-[10px] mb-4">
            Nous vous notifierons une fois que votre paiement sera approuvé.
          </p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 font-medium">Délai estimé: 24-72 heures</p>
          </div>
        </div>
      </div>
    )
  }

  const hasRejectedDocuments = user.role !== 'admin' && user.document_verification && 
    Object.values(user.document_verification).some(status => status === 'rejected')

  if (hasRejectedDocuments) {
    return (
      <>
        <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center hover:shadow-md transition-all">
            <div className="flex items-center justify-center mb-6">
              <TruckLoader />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Documents Rejetés</h2>
            <p className="text-gray-600 mb-4 text-lg">
              Certains de vos documents ont été rejetés.
            </p>
            <p className="text-gray-500 text-[10px] mb-4">
              Veuillez télécharger à nouveau les documents rejetés.
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 font-medium">
                Consultez vos notifications pour plus de détails
              </p>
            </div>
            <button
              onClick={() => setShowRejectedDocumentsModal(true)}
              className="w-full px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors"
            >
              Voir les Documents Rejetés
            </button>
          </div>
        </div>
        <RejectedDocumentsModal
          isOpen={showRejectedDocumentsModal}
          onClose={() => setShowRejectedDocumentsModal(false)}
          user={user}
        />
      </>
    )
  }

  if (user.role !== 'admin' && (user.status === 'pending_payment' || user.status === 'pending_verification')) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center hover:shadow-md transition-all">
          <div className="flex items-center justify-center mb-6">
            <TruckLoader />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Vérification en cours</h2>
          <p className="text-gray-600 mb-4 text-lg">
            {user.status === 'pending_payment' ? 'Votre paiement est en cours de vérification.' : 'Vos documents sont en cours de vérification.'}
          </p>
          <p className="text-gray-500 text-[10px] mb-4">
            Nous vous notifierons une fois que votre compte sera approuvé.
          </p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500 font-medium">Délai estimé: 24-72 heures</p>
          </div>
        </div>
      </div>
    )
  }

  if (user.status === 'suspended' || user.status === 'banned') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-md text-center hover:shadow-md transition-all">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Compte {user.status === 'suspended' ? 'suspendu' : 'bloqué'}</h2>
          <p className="text-gray-600 mb-4">Contactez le support pour plus d'informations.</p>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-500">Email: support@unigo.ma</p>
          </div>
        </div>
      </div>
    )
  }

  return children
}

export default ProtectedRoute