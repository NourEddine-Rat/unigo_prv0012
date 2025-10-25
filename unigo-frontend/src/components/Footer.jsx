const Footer = () => {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-gray-900 mb-1">UNIGO</h3>
            <p className="text-xs text-gray-500">Covoiturage étudiant au Maroc</p>
          </div>
          <div className="flex items-center gap-6 text-xs text-gray-500">
            <span>© {year} UNIGO</span>
            <span>•</span>
            <span>Tous droits réservés</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer