function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p>© {new Date().getFullYear()} HerShield. Women Safety & Emergency Assistance Platform.</p>
        <p className="text-[#0B3D91]">Trusted support when every second matters.</p>
      </div>
    </footer>
  )
}

export default Footer
