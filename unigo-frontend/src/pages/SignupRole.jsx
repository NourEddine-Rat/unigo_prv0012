import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Car } from 'lucide-react'

const SignupRole = () => {
const roles = [
{
to: '/signup/passenger',
icon: User,
title: 'Passager',
desc: 'Trouvez des trajets et voyagez à moindre coût',
price: '99 MAD/année',
features: ['Recherche illimitée', 'UniCard', 'Support 24/7']
},
{
to: '/signup/driver',
icon: Car,
title: 'Conducteur',
desc: 'Proposez vos trajets et gagnez de l\'argent',
price: '99 MAD/mois',
features: ['Trajets illimités', 'Gestion avancée', 'Statistiques']
}
]

return (
<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8 md:py-12">
<div className="max-w-5xl w-full">
<motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8 md:mb-12">
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 md:mb-4">Choisissez votre profil</h1>
<p className="text-lg md:text-xl text-gray-600 px-4">Sélectionnez le type de compte que vous souhaitez créer</p>
</motion.div>

<div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 max-w-4xl mx-auto">
{roles.map((role, i) => (
<motion.div key={role.to} initial={{ opacity: 0, x: i === 0 ? -20 : 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
<Link to={role.to} className="block group">
<div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all h-full">
<div className="text-center">
<div className="w-16 h-16 md:w-20 md:h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 group-hover:scale-110 transition-transform">
<role.icon className="w-8 h-8 md:w-10 md:h-10 text-gray-600" />
</div>
<h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{role.title}</h2>
<p className="text-gray-600 mb-4 text-sm md:text-base leading-relaxed">{role.desc}</p>
<div className="bg-black text-white rounded-xl px-4 py-2 inline-block mb-4 md:mb-6 font-semibold text-sm md:text-base">{role.price}</div>
</div>
<table className="mx-auto mb-6 md:mb-8">
<tbody>
{role.features.map((feature, index) => (
<tr key={feature} className={index > 0 ? "h-8 md:h-10" : ""}>
<td className="w-8 text-center">
<div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
<span className="text-gray-600 text-xs">✓</span>
</div>
</td>
<td className="text-gray-700 text-sm md:text-base pl-2">{feature}</td>
</tr>
))}
</tbody>
</table>
<div className="text-center">
<span className="text-black font-semibold group-hover:underline text-sm md:text-base">Continuer →</span>
</div>
</div>
</Link>
</motion.div>
))}
</div>

<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-center mt-6 md:mt-8">
<p className="text-gray-600 text-sm md:text-base">Vous avez déjà un compte ? <Link to="/login" className="text-black font-semibold hover:underline">Connectez-vous</Link></p>
</motion.div>
</div>
</div>
)
}

export default SignupRole