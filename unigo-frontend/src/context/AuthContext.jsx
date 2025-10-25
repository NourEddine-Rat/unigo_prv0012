import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const useAuth = () => {
const context = useContext(AuthContext)
if (!context) throw new Error('useAuth must be used within AuthProvider')
return context
}

export const AuthProvider = ({ children }) => {
const [user, setUser] = useState(null)
const [loading, setLoading] = useState(true)

const API_BASE_URL = 'http://localhost:5000/api'

// Fetch fresh user data from server
const fetchUserProfile = async () => {
  try {
    const token = localStorage.getItem('unigo_token')
    if (!token) return
    
    const response = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    if (response.ok) {
      const userData = await response.json()
      setUser(userData)
      localStorage.setItem('unigo_user', JSON.stringify(userData))
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
  }
}

useEffect(() => {
  const storedUser = localStorage.getItem('unigo_user')
  const storedToken = localStorage.getItem('unigo_token')
  
  if (storedUser && storedToken) {
    // Set cached user first for immediate display
    setUser(JSON.parse(storedUser))
    // Then fetch fresh data from server
    fetchUserProfile()
  }
  setLoading(false)
}, [])

const login = async (credentials) => {
try {
const response = await fetch(`${API_BASE_URL}/auth/login`, {
method: 'POST',
headers: {
'Content-Type': 'application/json',
},
body: JSON.stringify(credentials)
})

const data = await response.json()

if (response.ok) {
setUser(data.user)
localStorage.setItem('unigo_user', JSON.stringify(data.user))
localStorage.setItem('unigo_token', data.token)
return { success: true, user: data.user }
} else {
return { success: false, error: data.error }
}
} catch (error) {
return { success: false, error: 'Network error. Please try again.' }
}
}

const register = async (userData) => {
try {
const formData = new FormData()
Object.keys(userData).forEach(key => {
if (key === 'documents' && userData[key]) {
Object.keys(userData[key]).forEach(docKey => {
if (userData[key][docKey]) {
formData.append(docKey, userData[key][docKey])
}
})
} else if (userData[key] !== null && userData[key] !== undefined) {
formData.append(key, userData[key])
}
})

const response = await fetch(`${API_BASE_URL}/auth/register`, {
method: 'POST',
body: formData
})

const data = await response.json()

if (response.ok) {
setUser(data.user)
localStorage.setItem('unigo_user', JSON.stringify(data.user))
localStorage.setItem('unigo_token', data.token)
return { 
  success: true, 
  user: data.user, 
  emailVerificationRequired: data.emailVerificationRequired,
  message: data.message
}
} else {
return { success: false, error: data.error }
}
} catch (error) {
return { success: false, error: 'Network error. Please try again.' }
}
}

const logout = () => {
setUser(null)
localStorage.removeItem('unigo_user')
localStorage.removeItem('unigo_token')
}

const updateUser = async (updates) => {
try {
const token = localStorage.getItem('unigo_token')
const response = await fetch(`${API_BASE_URL}/auth/profile`, {
method: 'PUT',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
},
body: JSON.stringify(updates)
})

const data = await response.json()

if (response.ok) {
setUser(data)
localStorage.setItem('unigo_user', JSON.stringify(data))
return { success: true, user: data }
} else {
return { success: false, error: data.error }
}
} catch (error) {
return { success: false, error: 'Network error. Please try again.' }
}
}

const getAuthHeaders = () => {
const token = localStorage.getItem('unigo_token')
return {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`
}
}

return (
<AuthContext.Provider value={{ 
user, 
loading, 
login, 
register, 
logout, 
updateUser, 
getAuthHeaders,
refreshUser: fetchUserProfile
}}>
{children}
</AuthContext.Provider>
)
}

export default AuthContext