import { useState, useEffect } from 'react'

const useUniversities = () => {
  const [universities, setUniversities] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:5000/api/universities')
        
        if (!response.ok) {
          throw new Error('Failed to fetch universities')
        }
        
        const data = await response.json()
        setUniversities(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching universities:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUniversities()
  }, [])

  return { universities, loading, error }
}

export default useUniversities
