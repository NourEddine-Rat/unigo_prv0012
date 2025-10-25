import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, User, LogOut, Settings, Copy, Check, Search, HelpCircle, Home, CreditCard, Bell, Calendar } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'

const Navbar = () => {
  const [open, setOpen] = useState(false)
  const [dropdown, setDropdown] = useState(false)
  const [copied, setCopied] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const copyUniId = async () => {
    try {
      await navigator.clipboard.writeText(user?.uni_id || '')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy UNI-ID:', err)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    setDropdown(false)
  }

  const getSubscriptionInfo = () => {
    if (!user || user.role === 'admin') {
      console.log('Navbar - No subscription info (admin or no user)', { user: user?.role })
      return null
    }
    
    if (!user.subscription_end_date) {
      console.log('Navbar - No subscription_end_date found', { 
        hasUser: !!user, 
        role: user.role,
        subscription_end_date: user.subscription_end_date,
        subscription_status: user.subscription_status 
      })
      return null
    }
    
    const endDate = new Date(user.subscription_end_date)
    const now = new Date()
    const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
    
    let color = 'green'
    if (daysRemaining < 0) color = 'red'
    else if (daysRemaining <= 7) color = 'orange'
    
    console.log('Navbar - Subscription info calculated', {
      endDate: user.subscription_end_date,
      daysRemaining,
      color,
      isExpired: daysRemaining < 0
    })
    
    return {
      date: endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      daysRemaining,
      color,
      isExpired: daysRemaining < 0
    }
  }

  const subscriptionInfo = getSubscriptionInfo()

  const links = [
    { to: '/search', label: 'Rechercher' },
    { to: '/about', label: 'Comment ça marche' }
  ]

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center group">
            <span className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '-0.02em' }}>
              unigo
            </span>
          </Link>

          <div className="hidden md:flex items-center space-x-8">
            {links.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <div className="flex items-center gap-4">
                <NotificationBell />
                <div className="relative">
                  <button
                    onClick={() => setDropdown(!dropdown)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium text-gray-700"
                  >
                  <User className="w-4 h-4" />
                  <span>{user.first_name?.toUpperCase()}</span>
                </button>
                <AnimatePresence>
                  {dropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-lg py-2 border border-gray-200"
                    >
                      {user?.uni_id && (
                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Votre UNI-ID</p>
                              <p className="text-sm font-mono font-bold text-blue-600">{user.uni_id}</p>
                            </div>
                            <button
                              onClick={copyUniId}
                              className="p-2 hover:bg-white rounded-lg transition-colors"
                              title="Copier l'UNI-ID"
                            >
                              {copied ? (
                                <Check className="w-4 h-4 text-green-600" />
                              ) : (
                                <Copy className="w-4 h-4 text-gray-500" />
                              )}
                            </button>
                          </div>
                          {subscriptionInfo && (
                            <div className={`mt-2 px-2 py-1.5 rounded-lg text-xs flex items-center gap-1.5 ${
                              subscriptionInfo.color === 'red' ? 'bg-red-100 text-red-700' :
                              subscriptionInfo.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              <Calendar className="w-3 h-3" />
                              <span className="font-medium">
                                {subscriptionInfo.isExpired ? 'Expiré' : `Valide jusqu'au ${subscriptionInfo.date}`}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                      <Link
                        to={user.role === 'driver' ? '/dashboard/driver' : user.role === 'admin' ? '/admin' : '/dashboard/passenger'}
                        onClick={() => setDropdown(false)}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                      >
                        <Settings className="w-4 h-4 text-gray-400" />
                        <span>Tableau de bord</span>
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setDropdown(false)}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        <span>Profil</span>
                      </Link>
                      <Link
                        to="/unicard"
                        onClick={() => setDropdown(false)}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                      >
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        <span>UniCard</span>
                      </Link>
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 hover:bg-red-50 transition-colors w-full text-left text-red-600 text-sm font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Déconnexion</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors font-medium text-sm"
                >
                  Connexion
                </Link>
                <Link
                  to="/signup"
                  className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm hover:shadow-md"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {user && (
              <div className="p-1.5">
                <NotificationBell />
              </div>
            )}
            <button
              onClick={() => setOpen(!open)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            />
            
            {/* Slide-in Panel */}
          <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-gray-900" style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', letterSpacing: '-0.02em' }}>
                    unigo
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* User Info */}
              {user && (
                <div className="p-6 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center space-x-3">
                    {(() => {
                      const picture = user.profile_picture || user.selfie_url
                      const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:5000/api'
                      const BACKEND_BASE_URL = import.meta.env?.VITE_BACKEND_BASE_URL || (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL)
                      
                      if (picture) {
                        const isHttp = picture.startsWith('http')
                        const src = isHttp ? picture : `${BACKEND_BASE_URL}/uploads/${picture.replace(/^\/?uploads\/?/, '')}`
                        return (
                          <>
                            <img 
                              src={src}
                              alt={`${user.first_name?.toUpperCase()} ${user.last_name?.toUpperCase()}`}
                              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextSibling.style.display = 'flex'
                              }}
                            />
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm" style={{ display: 'none' }}>
                              <User className="w-6 h-6 text-white" />
                            </div>
                          </>
                        )
                      }
                      return (
                        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <User className="w-6 h-6 text-white" />
                        </div>
                      )
                    })()}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{user.first_name?.toUpperCase()} {user.last_name?.toUpperCase()}</p>
                      <p className="text-sm text-gray-500">{user.role === 'driver' ? 'Conducteur' : user.role === 'admin' ? 'Administrateur' : 'Passager'}</p>
                    </div>
                  </div>
                  {user?.uni_id && (
                    <div className="mt-3 space-y-2">
                      <div className="p-3 bg-white rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Votre UNI-ID</p>
                            <p className="text-sm font-mono font-bold text-primary">{user.uni_id}</p>
                          </div>
                          <button
                            onClick={copyUniId}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copier l'UNI-ID"
                          >
                            {copied ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      {subscriptionInfo && (
                        <div className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                          subscriptionInfo.color === 'red' ? 'bg-red-100 text-red-700 border border-red-200' :
                          subscriptionInfo.color === 'orange' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                          'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="font-semibold">
                              {subscriptionInfo.isExpired ? 'Abonnement expiré' : 'Abonnement actif'}
                            </p>
                            <p className="text-[10px] opacity-90">
                              {subscriptionInfo.isExpired 
                                ? 'Veuillez renouveler votre abonnement' 
                                : `Valide jusqu'au ${subscriptionInfo.date}`
                              }
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation Links */}
              <div className="flex-1 overflow-y-auto">
                <div className="p-6 space-y-2">
                  {/* Main Navigation */}
                  <div className="space-y-1">
                    <Link
                      to="/"
                      onClick={() => setOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <Home className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                      <span className="font-medium text-gray-900">Accueil</span>
                    </Link>
                    
                    <Link
                      to="/search"
                      onClick={() => setOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <Search className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                      <span className="font-medium text-gray-900">Rechercher</span>
                    </Link>

                    <Link
                      to="/about"
                      onClick={() => setOpen(false)}
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                    >
                      <HelpCircle className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                      <span className="font-medium text-gray-900">Comment ça marche</span>
                </Link>
                  </div>

                  {/* User-specific Navigation */}
              {user ? (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="space-y-1">
                  <Link
                    to={user.role === 'driver' ? '/dashboard/driver' : user.role === 'admin' ? '/admin' : '/dashboard/passenger'}
                    onClick={() => setOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                          <Settings className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                          <span className="font-medium text-gray-900">Tableau de bord</span>
                  </Link>
                        
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                          <User className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                          <span className="font-medium text-gray-900">Profil</span>
                  </Link>
                        
                  <Link
                    to="/unicard"
                    onClick={() => setOpen(false)}
                          className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-gray-100 transition-colors group"
                  >
                          <CreditCard className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                          <span className="font-medium text-gray-900">UniCard</span>
                  </Link>

                      </div>
                    </div>
                  ) : (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="space-y-3">
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                          className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                          <User className="w-5 h-5" />
                          <span className="font-medium">Connexion</span>
                  </Link>
                        
                  <Link
                    to="/signup"
                    onClick={() => setOpen(false)}
                          className="flex items-center justify-center space-x-2 px-4 py-3 rounded-xl bg-blue-600 text-white hover:bg-gray-800 transition-colors shadow-lg"
                  >
                          <User className="w-5 h-5" />
                          <span className="font-medium">S'inscrire</span>
                  </Link>
                      </div>
                    </div>
                  )}

                  {/* Logout Button */}
                  {user && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors group w-full text-left"
                      >
                        <LogOut className="w-5 h-5 text-red-600 group-hover:text-red-700" />
                        <span className="font-medium text-red-600 group-hover:text-red-700">Déconnexion</span>
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default Navbar