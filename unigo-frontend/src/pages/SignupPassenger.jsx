import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Upload, Camera, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import useUniversities from '../hooks/useUniversities'
import EmailVerificationModal from '../components/EmailVerificationModal'

const SignupPassenger = () => {
const [step, setStep] = useState(1)
const [form, setForm] = useState({
first_name: '',
last_name: '',
email: '',
phone: '',
password: '',
confirm_password: '',
gender: 'male',
university_id: ''
})
const [files, setFiles] = useState({
selfie: null,
cni_recto: null,
cni_verso: null,
student_card: null,
payment_receipt: null
})
const { register } = useAuth()
const navigate = useNavigate()
const [error, setError] = useState('')
const [loading, setLoading] = useState(false)
const [showEmailVerification, setShowEmailVerification] = useState(false)
const [emailError, setEmailError] = useState('')
const { universities, loading: universitiesLoading } = useUniversities()

const handleChange = (e) => {
setForm({ ...form, [e.target.name]: e.target.value })
if (e.target.name === 'email') {
  setEmailError('')
}
}

const validateEmail = async (email) => {
if (!email) return false

// Basic email format validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
if (!emailRegex.test(email)) {
  setEmailError('Format d\'email invalide')
  return false
}

// Email format is valid, clear any errors
setEmailError('')
return true
}

const handleFile = (name, file) => {
if (file && file.size <= 5 * 1024 * 1024) {
setFiles({ ...files, [name]: file })
}
}

const handleSubmit = async (e) => {
e.preventDefault()
setError('')

if (step < 5) {
setStep(step + 1)
} else {
// Validate email before submission
const isEmailValid = await validateEmail(form.email)
if (!isEmailValid) {
  return
}
setLoading(true)

try {
const formData = new FormData()

// Add all form fields
Object.keys(form).forEach(key => {
if (form[key] !== null && form[key] !== undefined && form[key] !== '') {
formData.append(key, form[key])
}
})

// Add role
formData.append('role', 'passenger')

// Add files
Object.keys(files).forEach(key => {
if (files[key]) {
formData.append(key, files[key])
}
})

const response = await fetch('http://localhost:5000/api/auth/register', {
method: 'POST',
body: formData
})

const data = await response.json()

if (response.ok) {
if (data.emailVerificationRequired) {
setShowEmailVerification(true)
} else {
// Admin user - store data and redirect
localStorage.setItem('unigo_token', data.token)
localStorage.setItem('user', JSON.stringify(data.user))
navigate('/dashboard/passenger')
}
} else {
setError(data.error || 'Erreur lors de l\'inscription')
}
} catch (err) {
setError('Erreur de connexion. Veuillez réessayer.')
} finally {
setLoading(false)
}
}
}

const steps_data = [
{ num: 1, title: 'Informations personnelles' },
{ num: 2, title: 'Selfie' },
{ num: 3, title: 'Abonnement' },
{ num: 4, title: 'Documents' },
{ num: 5, title: 'Validation' }
]

return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
<div className="max-w-2xl w-full">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all">
<div className="mb-8">
<h1 className="text-3xl font-bold text-gray-900 mb-2">Inscription Passager</h1>
{error && (
<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
{error}
</div>
)}
<div className="flex items-center space-x-2 mt-6">
{steps_data.map((s, i) => (
<div key={s.num} className="flex items-center flex-1">
<div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
s.num === step ? 'bg-black text-white scale-110' :
s.num < step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
}`}>
{s.num < step ? <Check className="w-5 h-5" /> : s.num}
</div>
{i < steps_data.length - 1 && <div className={`flex-1 h-1 mx-2 rounded ${
s.num < step ? 'bg-green-500' : 'bg-gray-200'
}`} />}
</div>
))}
</div>
<p className="text-gray-600 mt-4">{steps_data[step - 1].title}</p>
</div>

<form onSubmit={handleSubmit} className="space-y-6">
{step === 1 && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
<div className="grid grid-cols-2 gap-4">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Prénom</label>
<input type="text" name="first_name" value={form.first_name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Nom</label>
<input type="text" name="last_name" value={form.last_name} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" />
</div>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
<input 
  type="email" 
  name="email" 
  value={form.email} 
  onChange={handleChange}
  onBlur={() => validateEmail(form.email)}
  required 
  className={`w-full px-4 py-3 rounded-xl border outline-none transition-all bg-white ${
    emailError 
      ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' 
      : 'border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20'
  }`} 
/>
{emailError && (
  <p className="mt-2 text-sm text-red-600">{emailError}</p>
)}
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Téléphone</label>
<input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+212 6XX XX XX XX" required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
<select name="gender" value={form.gender} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white">
<option value="male">Homme</option>
<option value="female">Femme</option>
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Université</label>
<select name="university_id" value={form.university_id} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white">
<option value="">Sélectionnez votre université</option>
{universitiesLoading ? (
<option disabled>Chargement des universités...</option>
) : (
universities.map(uni => (
<option key={uni._id} value={uni._id}>{uni.name}</option>
))
)}
</select>
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
<input type="password" name="password" value={form.password} onChange={handleChange} required minLength={8} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" />
</div>
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Confirmer le mot de passe</label>
<input type="password" name="confirm_password" value={form.confirm_password} onChange={handleChange} required className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" />
</div>
</motion.div>
)}

{step === 2 && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
<div className="w-32 h-32 bg-gray-100 rounded-full mx-auto flex items-center justify-center">
<Camera className="w-12 h-12 text-gray-400" />
</div>
<p className="text-gray-600">Prenez un selfie clair avec votre visage bien visible</p>
<label className="inline-block px-6 py-3 bg-black text-white rounded-xl cursor-pointer hover:bg-gray-800 transition-all">
<input type="file" accept="image/*" onChange={(e) => handleFile('selfie', e.target.files[0])} className="hidden" />
Télécharger selfie
</label>
{files.selfie && <p className="text-green-600 text-sm">✓ Selfie téléchargé</p>}
</motion.div>
)}

{step === 3 && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all">
<h3 className="text-2xl font-bold text-gray-900 mb-6">Abonnement Passager</h3>
<div className="text-4xl font-bold text-gray-900 mb-2">99 MAD</div>
<p className="text-gray-600 mb-6 text-lg">par an</p>
<div className="space-y-3">
<div className="flex items-center gap-3">
<div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
<Check className="w-4 h-4 text-gray-600" />
</div>
<span className="text-gray-900 font-medium">Recherche illimitée</span>
</div>
<div className="flex items-center gap-3">
<div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
<Check className="w-4 h-4 text-gray-600" />
</div>
<span className="text-gray-900 font-medium">Réservations illimitées</span>
</div>
<div className="flex items-center gap-3">
<div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
<Check className="w-4 h-4 text-gray-600" />
</div>
<span className="text-gray-900 font-medium">UniCard incluse</span>
</div>
<div className="flex items-center gap-3">
<div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
<Check className="w-4 h-4 text-gray-600" />
</div>
<span className="text-gray-900 font-medium">Support 24/7</span>
</div>
</div>
</div>
<div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
<p className="text-lg font-semibold text-gray-900 mb-3">Instructions de paiement :</p>
<p className="text-gray-600 mb-4">Effectuez un virement bancaire vers :</p>
<div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
<div className="flex justify-between items-center py-2 border-b border-gray-100">
<span className="text-gray-600 font-medium">IBAN:</span>
<span className="text-gray-900 font-mono">MA00 0000 0000 0000 0000 0000</span>
</div>
<div className="flex justify-between items-center py-2 border-b border-gray-100">
<span className="text-gray-600 font-medium">Bénéficiaire:</span>
<span className="text-gray-900 font-semibold">UNIGO SARL</span>
</div>
<div className="flex justify-between items-center py-2">
<span className="text-gray-600 font-medium">Référence:</span>
<span className="text-gray-900 font-mono">PASS-{Date.now()}</span>
</div>
</div>
</div>
</motion.div>
)}

{step === 4 && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
{[
{ name: 'cni_recto', label: 'CNI Recto', required: true },
{ name: 'cni_verso', label: 'CNI Verso', required: true },
{ name: 'student_card', label: 'Carte étudiant / Attestation', required: true },
{ name: 'payment_receipt', label: 'Reçu de virement', required: true }
].map(doc => (
<div key={doc.name} className="border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-primary transition-colors">
<div className="flex items-center justify-between">
<div>
<p className="font-medium text-gray-800">{doc.label}</p>
<p className="text-sm text-gray-500">JPG, PNG ou PDF (max 5MB)</p>
</div>
<label className="px-4 py-2 bg-black text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
<input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={(e) => handleFile(doc.name, e.target.files[0])} className="hidden" />
<Upload className="w-5 h-5" />
</label>
</div>
{files[doc.name] && <p className="text-green-600 text-sm mt-2">✓ {files[doc.name].name}</p>}
</div>
))}
</motion.div>
)}

{step === 5 && (
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-4">
<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
<Check className="w-10 h-10 text-green-600" />
</div>
<h3 className="text-2xl font-bold text-gray-800">Prêt à soumettre</h3>
<p className="text-gray-600">Vos documents seront vérifiés sous 24-72h</p>
</motion.div>
)}

<div className="flex gap-4 pt-6">
{step > 1 && (
<button type="button" onClick={() => setStep(step - 1)} className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">
Retour
</button>
)}
<button 
type="submit" 
disabled={loading}
className="flex-1 px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
>
{loading ? (
<div className="flex items-center justify-center">
<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
{step === 5 ? 'Création...' : 'Chargement...'}
</div>
) : (
step === 5 ? 'Soumettre' : 'Continuer'
)}
</button>
</div>
</form>
</motion.div>
</div>

{/* Email Verification Modal */}
<EmailVerificationModal 
  isOpen={showEmailVerification}
  onClose={() => setShowEmailVerification(false)}
  onSuccess={() => navigate('/dashboard/passenger')}
  userEmail={form.email}
/>
</div>
)
}

export default SignupPassenger