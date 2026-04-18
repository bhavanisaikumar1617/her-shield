import { motion } from 'framer-motion'

function AnimatedCard({ title, description, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1, ease: 'easeOut' }}
      whileHover={{ scale: 1.05 }}
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-lg"
    >
      <h3 className="text-lg font-semibold text-[#0B3D91]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </motion.article>
  )
}

export default AnimatedCard
