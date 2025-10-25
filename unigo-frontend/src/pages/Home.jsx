import { useNavigate } from 'react-router-dom'
import { Car, Shield, Wallet, Users, MapPin, Search, CalendarDays, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

const FeatureCard = ({ icon: Icon, title, description, color }) => (
  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-md hover:shadow-lg transition-shadow">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} mb-4`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-xl font-bold mt-4 mb-2 text-gray-900">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </div>
)

const StepCard = ({ num, title, description }) => (
  <div className="text-center md:text-left">
    <div className="flex items-center justify-center md:justify-start gap-4 mb-4">
      <div className="w-12 h-12 bg-gray-900 text-primary font-bold text-2xl rounded-full flex items-center justify-center">
        {num}
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
    </div>
    <p className="mt-2 text-gray-600 max-w-sm mx-auto md:mx-0 md:pl-16">
      {description}
    </p>
  </div>
)

const Home = () => {
  const navigate = useNavigate()

  const rideSearchAnimation = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, delay: 0.3 } }
  }

  return (
    <div className="bg-slate-50 font-sans">
      <section className="relative pt-32 pb-20 lg:pt-40 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-extrabold text-gray-900 mb-6 leading-tight"
            >
              Ton covoit',<br />version étudiante.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl text-gray-600 mb-8 max-w-md"
            >
              Rejoins des milliers d'étudiants et partage tes trajets partout au Maroc. Simple, sûr et économique.
            </motion.p>

            <motion.div
              variants={rideSearchAnimation}
              initial="hidden"
              animate="show"
              className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100"
            >
              <div className="grid md:grid-cols-3 gap-2">
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Départ"
                    className="w-full bg-slate-100 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                  />
                </div>
                <div className="relative">
                  <MapPin className="w-5 h-5 text-gray-400 absolute top-1/2 left-3 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Arrivée"
                    className="w-full bg-slate-100 rounded-lg p-3 pl-10 focus:outline-none focus:ring-2 focus:ring-primary text-gray-900"
                  />
                </div>
                <button
                  onClick={() => navigate('/search')}
                  className="w-full bg-gray-900 text-white font-bold p-3 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
                >
                  <Search className="w-5 h-5" />
                  <span>Rechercher</span>
                </button>
              </div>
            </motion.div>
          </div>

          <div className="hidden lg:block relative h-[500px]">
            <div className="absolute inset-0 flex items-center justify-center bg-secondary rounded-3xl shadow-xl">
              <Car className="w-48 h-48 text-primary opacity-80" />
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-primary">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 text-center mb-16">
            Voyagez en 3 clics.
          </h2>
          <div className="grid md:grid-cols-1 gap-12">
            <StepCard
              num="1"
              title="Recherchez votre trajet"
              description="Dites-nous où vous allez. Des centaines de destinations sont disponibles."
            />
            <StepCard
              num="2"
              title="Réservez votre place"
              description="Choisissez le conducteur et l'horaire qui vous arrangent. Payez en ligne en toute sécurité."
            />
            <StepCard
              num="3"
              title="Voyagez ensemble !"
              description="Retrouvez votre conducteur au point de rendez-vous et profitez du voyage."
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
              La route, mais en mieux.
            </h2>
            <p className="text-xl text-gray-600">
              UNIGO, c'est bien plus que du covoiturage. C'est une communauté conçue pour les étudiants.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={Shield}
              title="Sécurité Renforcée"
              description="Profils 100% étudiants vérifiés manuellement par notre équipe."
              color="bg-yellow-400"
            />
            <FeatureCard
              icon={Wallet}
              title="Prix Justes"
              description="Des tarifs bas et transparents pour respecter votre budget étudiant."
              color="bg-green-500"
            />
            <FeatureCard
              icon={Users}
              title="Communauté Fiable"
              description="Voyagez avec d'autres étudiants qui partagent les mêmes centres d'intérêt."
              color="bg-blue-500"
            />
            <FeatureCard
              icon={Car}
              title="Flexibilité Maximale"
              description="Des milliers de trajets chaque jour pour s'adapter à votre emploi du temps."
              color="bg-red-500"
            />
          </div>
        </div>
      </section>

      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center bg-gray-900 p-12 lg:p-16 rounded-3xl shadow-2xl">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
            Prêt(e) à prendre la route ?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Trouvez votre prochain trajet ou proposez vos places libres dès maintenant.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/search')}
              className="bg-primary text-gray-900 font-bold py-4 px-8 rounded-full text-lg hover:bg-yellow-500 transition-all shadow-lg hover:shadow-xl"
            >
              Trouver un trajet
            </button>
            <button
              onClick={() => navigate('/offer-ride')}
              className="bg-transparent border-2 border-primary text-primary font-bold py-4 px-8 rounded-full text-lg hover:bg-primary hover:text-gray-900 transition-all"
            >
              Proposer un trajet
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home