import { useState, useEffect } from 'react'
import { Logo } from '../../ui/Logo'

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-[#E2E8F0] px-6 flex items-center transition-shadow duration-300 ${
      scrolled ? 'shadow-sm' : ''
    }`}>
      <a href="#" className="shrink-0">
        <Logo variant="color" height={44} />
      </a>

      <div className="hidden md:flex items-center gap-6 ml-8">
        <a href="#features" className="font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Explorar</a>
        <a href="#how" className="font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Cómo funciona</a>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <a href="#" className="hidden md:block font-body text-sm text-[#7A8799] hover:text-[#1E0A4E] transition-colors">Mis viajes</a>
        <a href="/login" className="font-body text-sm border border-[#E2E8F0] text-[#3D4A5C] rounded-lg px-4 py-1.5 hover:border-[#1E6FD9] hover:text-[#1E6FD9] transition-colors">
          Iniciar sesión
        </a>
        <a href="/register" className="font-body text-sm font-medium bg-[#1E6FD9] text-white rounded-full px-4 py-1.5 hover:opacity-90 transition-opacity">
          Crear cuenta
        </a>
        
      
      </div>
    </nav>
  )
}