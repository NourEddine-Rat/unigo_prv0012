import React, { useState } from 'react';
import { X, Upload, CreditCard, Banknote, AlertCircle, CheckCircle } from 'lucide-react';

const RechargeModal = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState(1); // 1: amount, 2: payment, 3: success
  const [points, setPoints] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePointsChange = (e) => {
    const value = e.target.value;
    // Allow typing any characters, we'll validate on submit
    setPoints(value);
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      setScreenshot(file);
      setScreenshotPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async () => {
    const pointsNum = parseInt(points);
    if (!points || isNaN(pointsNum) || pointsNum < 100 || pointsNum > 10000 || !screenshot) {
      setError('Please enter a valid amount (100-10000) and upload a screenshot');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('points_requested', points);
      formData.append('payment_screenshot', screenshot);

      const token = localStorage.getItem('unigo_token') || localStorage.getItem('token');
      if (!token) {
        setError('Authentication required. Please log in again.');
        return;
      }
      
      const response = await fetch('http://localhost:5000/api/recharge/request', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess('Recharge request submitted successfully!');
        setStep(3);
        if (onSuccess) onSuccess();
      } else {
        const errorData = await response.json();
        setError(errorData.error || `Failed to submit recharge request (${response.status})`);
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setPoints('');
    setScreenshot(null);
    setScreenshotPreview(null);
    setError('');
    setSuccess('');
    onClose();
  };

  const bankAccount = {
    bank_name: 'Bank of Africa',
    account_holder: 'UNIGO SARL',
    account_number: '1234567890123456',
    rib: '007-1234567890123456-78'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recharger des points</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Step 1: Amount Selection */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Montant en points (100 - 10,000)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={points}
                    onChange={handlePointsChange}
                    min="100"
                    max="10000"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Entrez le nombre de points"
                  />
                  <Banknote className="absolute right-3 top-3 text-gray-400" size={20} />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Montant à payer: {points && !isNaN(parseInt(points)) ? `${parseInt(points)} MAD` : '0 MAD'}
                </p>
                {points && (isNaN(parseInt(points)) || parseInt(points) < 100 || parseInt(points) > 10000) && (
                  <p className="text-sm text-red-500 mt-1">
                    Veuillez entrer un montant entre 100 et 10,000 points
                  </p>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Informations de paiement</h3>
                <div className="space-y-2 text-sm text-blue-800">
                  <p><strong>Banque:</strong> {bankAccount.bank_name}</p>
                  <p><strong>Titulaire:</strong> {bankAccount.account_holder}</p>
                  <p><strong>N° Compte:</strong> {bankAccount.account_number}</p>
                  <p><strong>RIB:</strong> {bankAccount.rib}</p>
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!points || points.trim() === ''}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Continuer
              </button>
            </div>
          )}

          {/* Step 2: Payment Screenshot */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Capture d'écran du paiement
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotChange}
                    className="hidden"
                    id="screenshot-upload"
                  />
                  <label
                    htmlFor="screenshot-upload"
                    className="cursor-pointer flex flex-col items-center space-y-2"
                  >
                    <Upload className="text-gray-400" size={48} />
                    <span className="text-gray-600">
                      {screenshot ? 'Changer l\'image' : 'Cliquez pour télécharger'}
                    </span>
                    <span className="text-sm text-gray-500">
                      PNG, JPG jusqu'à 5MB
                    </span>
                  </label>
                </div>
                {screenshotPreview && (
                  <div className="mt-4">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="text-yellow-600 mt-0.5" size={16} />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Instructions importantes:</p>
                    <ul className="mt-1 space-y-1 list-disc list-inside">
                      <li>Effectuez le virement vers le compte bancaire ci-dessus</li>
                      <li>Prenez une capture d'écran de la confirmation de virement</li>
                      <li>Votre demande sera traitée dans les 24h</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!screenshot || loading || !points || isNaN(parseInt(points)) || parseInt(points) < 100 || parseInt(points) > 10000}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    'Soumettre'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Demande soumise avec succès!
                </h3>
                <p className="text-gray-600">
                  Votre demande de recharge de <strong>{points} points</strong> a été soumise.
                  Elle sera traitée dans les 24h.
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="text-red-600" size={16} />
                <span className="text-red-800 text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="text-green-600" size={16} />
                <span className="text-green-800 text-sm">{success}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RechargeModal;
