import { AnimatePresence, motion } from 'framer-motion'
import useAppContext from '../hooks/useAppContext'

function Modal() {
  const { modalState, closeModal } = useAppContext()

  return (
    <AnimatePresence>
      {modalState.open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={closeModal}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="relative z-50 w-[90%] max-w-md rounded-xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close modal"
              className="absolute right-2 top-2 rounded-md p-1 text-gray-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              ✖
            </button>

            <h3 className="text-xl font-semibold text-[#0B3D91]">{modalState.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{modalState.message}</p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-5 rounded-md bg-[#0B3D91] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a367f]"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal
