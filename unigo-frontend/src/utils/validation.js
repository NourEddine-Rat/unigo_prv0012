export const validateEmail = (email) => {
const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
return regex.test(email)
}

export const validatePhone = (phone) => {
const regex = /^\+212\s?[5-7]\d{2}\s?\d{2}\s?\d{2}\s?\d{2}$/
return regex.test(phone)
}

export const validatePassword = (password) => {
if (password.length < 8) return { valid: false, message: 'Le mot de passe doit contenir au moins 8 caractères' }
if (!/[A-Z]/.test(password)) return { valid: false, message: 'Le mot de passe doit contenir au moins une majuscule' }
if (!/[a-z]/.test(password)) return { valid: false, message: 'Le mot de passe doit contenir au moins une minuscule' }
if (!/[0-9]/.test(password)) return { valid: false, message: 'Le mot de passe doit contenir au moins un chiffre' }
return { valid: true, message: '' }
}

export const validateFileSize = (file, maxSizeMB = 5) => {
const maxBytes = maxSizeMB * 1024 * 1024
return file.size <= maxBytes
}

export const validateFileType = (file, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) => {
return allowedTypes.includes(file.type)
}