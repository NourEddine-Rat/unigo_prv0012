import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { mockUsers } from '../data/mockData'

const Login = () => {
const [form, setForm] = useState({ email: '', password: '' })
const [show, setShow] = useState(false)
const [error, setError] = useState('')
const { login } = useAuth()
const navigate = useNavigate()

const handleSubmit = async (e) => {
e.preventDefault()
setError('')

const result = await login(form)
if (result.success) {
const route = result.user.role === 'driver' ? '/dashboard/driver' : result.user.role === 'admin' ? '/admin' : '/dashboard/passenger'
navigate(route)
} else {
setError(result.error || 'Email ou mot de passe incorrect')
}
}

return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full">
<div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-all">
<div className="text-center mb-8">
<h1 className="text-3xl font-bold text-gray-900 mb-2">Connexion</h1>
<p className="text-gray-600">Connectez-vous à votre compte UNIGO</p>
</div>

{error && (
<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6">
{error}
</div>
)}

<form onSubmit={handleSubmit} className="space-y-6">
<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
<div className="relative">
<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" placeholder="votre@email.com" />
</div>
</div>

<div>
<label className="block text-sm font-medium text-gray-700 mb-2">Mot de passe</label>
<div className="relative">
<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
<input type={show ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none transition-all bg-white" placeholder="••••••••" />
<button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
</button>
</div>
</div>

<div className="flex items-center justify-between text-sm">
<label className="flex items-center">
<input type="checkbox" className="w-4 h-4 text-black border-gray-300 rounded focus:ring-black focus:ring-2" />
<span className="ml-2 text-gray-600">Se souvenir de moi</span>
</label>
<Link to="/forgot-password" className="text-black hover:text-gray-700 transition-colors">Mot de passe oublié ?</Link>
</div>

<button type="submit" className="w-full px-6 py-3 bg-black text-white rounded-xl font-semibold hover:bg-gray-800 transition-all">
Se connecter
</button>
</form>

<div className="mt-6 text-center">
<p className="text-gray-600">Vous n'avez pas de compte ? <Link to="/signup" className="text-black font-semibold hover:text-gray-700 transition-colors">S'inscrire</Link></p>
</div>
</div>
</motion.div>
</div>
)
}

export default Login