import { useState, useEffect, useRef } from 'react'
import { Logo } from '../../components/ui/Logo'
import { Navbar } from '../../components/layout/Navbar/Navbar'

// ── Hooks ─────────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration])
  return count
}

function useFadeIn() {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.opacity = '0'
    el.style.transform = 'translateY(32px)'
    el.style.transition = 'opacity 0.7s ease, transform 0.7s ease'
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.opacity = '1'
          el.style.transform = 'translateY(0)'
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return ref
}

// ── Navbar ────────────────────────────────────────────────────────────────────

/*

Esto se quitara despues, ya se añadio a /components/layout/Navbar/Navbar.tsx, esto es solo para mostrarlo en la landing page sin tener que usar el layout completo

function LandingNavbar() {
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
*/

// ── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  const [tripName, setTripName] = useState('')
  const [dates, setDates] = useState('')
  const [destination, setDestination] = useState('')
  const [people, setPeople] = useState('')
  const groupCount = useCountUp(1200)

  return (
    <section className="relative bg-primary-dark min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-20">
      {/* Beach background image */}
      <img
        src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=900&fit=crop"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Strong purple overlay — image barely perceptible */}
      <div className="absolute inset-0 bg-[#1E0A4E]/85" />

      {/* Background gradient glow + dot grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/30 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Badge */}
      <div className="relative inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-1.5 mb-6">
        <span className="relative flex w-2 h-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75" />
          <span className="relative inline-flex rounded-full w-2 h-2 bg-green" />
        </span>
        <span className="font-body text-xs text-white/80">Colaboración en tiempo real</span>
      </div>

      {/* Headline */}
      <h1 className="relative font-heading font-bold text-white text-5xl md:text-6xl leading-tight max-w-2xl mb-4">
        Planifica tu viaje grupal{' '}
        <span className="bg-gradient-to-r from-[#1E6FD9] to-[#7A4FD6] bg-clip-text text-transparent">sin el caos.</span>
      </h1>

      <p className="relative font-body text-white/60 text-base max-w-md mb-8">
        Itinerarios, presupuestos y reservas — todo en un solo lugar.
      </p>

      {/* CTAs */}
      <div className="relative flex flex-col sm:flex-row items-center gap-3 mb-4">
        <button className="font-body font-medium text-sm bg-green text-white rounded-lg px-6 py-3 hover:opacity-90 transition-opacity">
          Crear mi primer viaje
        </button>
        <button className="font-body font-medium text-sm border border-[rgba(255,255,255,0.35)] text-white rounded-lg px-6 py-3 hover:bg-white/10 transition-colors">
          Ver cómo funciona
        </button>
      </div>

      <p className="relative font-body text-white/40 text-xs mb-8">
        ¿Ya tienes? Inicia con código →
      </p>

      {/* Search form */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl p-2 flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex flex-col px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
          <label className="font-body text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nombre del viaje</label>
          <input
            type="text"
            placeholder="Mi aventura 2025"
            value={tripName}
            onChange={e => setTripName(e.target.value)}
            className="font-body text-sm text-primary-dark placeholder-gray-300 outline-none"
          />
        </div>
        <div className="flex-1 flex flex-col px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
          <label className="font-body text-[10px] text-gray-400 uppercase tracking-wider mb-1">Fechas</label>
          <input
            type="text"
            placeholder="¿A dónde vamos?"
            value={dates}
            onChange={e => setDates(e.target.value)}
            className="font-body text-sm text-primary-dark placeholder-gray-300 outline-none"
          />
        </div>
        <div className="w-24 flex flex-col px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
          <label className="font-body text-[10px] text-gray-400 uppercase tracking-wider mb-1">Desde</label>
          <input
            type="text"
            placeholder="Agregar"
            value={destination}
            onChange={e => setDestination(e.target.value)}
            className="font-body text-sm text-primary-dark placeholder-gray-300 outline-none"
          />
        </div>
        <div className="w-20 flex flex-col px-3 py-2">
          <label className="font-body text-[10px] text-gray-400 uppercase tracking-wider mb-1">Personas</label>
          <input
            type="number"
            placeholder="2"
            value={people}
            onChange={e => setPeople(e.target.value)}
            className="font-body text-sm text-primary-dark placeholder-gray-300 outline-none w-full"
          />
        </div>
        <button className="font-body font-medium text-sm bg-blue text-white rounded-xl px-5 py-3 hover:bg-blue/90 transition-colors whitespace-nowrap">
          Crear Itinerario
        </button>
      </div>

      {/* Social proof */}
      <div className="relative flex items-center gap-3 mt-6">
        <div className="flex -space-x-2">
          {['#7A4FD6', '#35C56A', '#1E6FD9'].map((color, i) => (
            <div
              key={i}
              className="w-7 h-7 rounded-full border-2 border-primary-dark"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <p className="font-body text-white/50 text-xs">
          {groupCount.toLocaleString('en-US')}+ grupos creados este mes
        </p>
      </div>
    </section>
  )
}

// ── Stats ─────────────────────────────────────────────────────────────────────

const stats = [
  { value: '1,200+', label: 'grupos creados' },
  { value: '50+',    label: 'destinos disponibles' },
  { value: '98%',    label: 'satisfacción' },
  { value: '100%',   label: 'completamente gratis' },
]

function StatsSection() {
  return (
    <section className="bg-white border-b border-[#E2E8F0] py-10 px-4">
      <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {stats.map((s) => (
          <div key={s.label}>
            <p className="font-heading font-bold text-[#1E0A4E] text-3xl mb-1">{s.value}</p>
            <p className="font-body text-[#7A8799] text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    title: 'Busca vuelos y hoteles',
    description: 'Amadeus y Google Maps integrados. Compara precios en MXN.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue">
        <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
        <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/>
      </svg>
    ),
    title: 'Itinerario colaborativo',
    description: 'Agrega actividades, vota y bloquea el plan del grupo en tiempo real.',
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-blue">
        <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Presupuesto grupal',
    description: 'Todos ven los gastos actualizados al instante. Sin sorpresas.',
  },
]

function FeaturesSection() {
  const ref = useFadeIn()
  return (
    <section id="features" ref={ref} className="bg-white py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="font-body text-xs text-gray-400 uppercase tracking-widest text-center mb-3">
          ¿Qué puedes hacer?
        </p>
        <h2 className="font-heading font-bold text-primary-dark text-3xl md:text-4xl text-center mb-14">
          Todo lo que necesitas para planear en grupo
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-[#1E6FD9]/30 transition-all duration-300">
              <div className="w-10 h-10 bg-blue/10 rounded-xl flex items-center justify-center mb-4">
                {f.icon}
              </div>
              <h3 className="font-heading font-semibold text-primary-dark text-base mb-2">{f.title}</h3>
              <p className="font-body text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Demo / In Action ──────────────────────────────────────────────────────────

const demoPoints = [
  'Sidebar con días del itinerario',
  'Tarjetas confirmadas y pendientes',
  'Chat del grupo en tiempo real',
  'Presupuesto actualizado al instante',
]

function DemoSection() {
  const ref = useFadeIn()
  return (
    <section ref={ref} className="bg-primary-dark py-24 px-4">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
        {/* Left */}
        <div className="flex-1">
          <h2 className="font-heading font-bold text-white text-3xl md:text-4xl mb-8">
            Así se ve Ithera en acción
          </h2>
          <ul className="space-y-4">
            {demoPoints.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-green shrink-0" />
                <span className="font-body text-white/70 text-sm">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Right — app mockup placeholder */}
        <div className="flex-1 w-full max-w-sm">
          <div className="bg-primary/40 rounded-2xl border border-white/10 aspect-[4/3] flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-white/50">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <line x1="9" y1="13" x2="13" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Destinations ──────────────────────────────────────────────────────────────

const destinations = [
  {
    name: 'Cancún',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=600&fit=crop',
    fallback: '#4B8A6E',
  },
  {
    name: 'Ciudad de México',
    image: 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=400&h=600&fit=crop',
    fallback: '#8A6E4B',
  },
  {
    name: 'Oaxaca',
    image: 'https://images.unsplash.com/photo-1518638150340-f706e86654de?w=400&h=600&fit=crop',
    fallback: '#8A4B6E',
  },
  {
    name: 'Los Cabos',
    image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=600&fit=crop',
    fallback: '#4B6E8A',
  },
  {
    name: 'Puerto Vallarta',
    image: 'https://images.unsplash.com/photo-1510097467424-192d713fd8b2?w=400&h=600&fit=crop',
    fallback: '#6E4B8A',
  },
]

function DestinationsSection() {
  const ref = useFadeIn()
  return (
    <section ref={ref} className="bg-white py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <h2 className="font-heading font-bold text-primary-dark text-2xl md:text-3xl">
            Destinos populares para grupos
          </h2>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary-dark transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-primary-dark transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {destinations.map((dest) => (
            <div
              key={dest.name}
              className="shrink-0 w-44 h-56 rounded-2xl relative overflow-hidden cursor-pointer group transition-transform duration-300 hover:scale-105"
              style={{ backgroundColor: dest.fallback }}
            >
              <img
                src={dest.image}
                alt={dest.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-heading font-semibold text-white text-sm">{dest.name}</p>
                <p className="font-body text-xs text-white/60 group-hover:text-white group-hover:font-medium transition-all duration-300">
                  Ver paquetes →
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────

const testimonials = [
  {
    quote: 'Organizamos el viaje de generación de 12 personas en 3 días. Sin Ithera nos habría tomado semanas de coordinación.',
    name: 'Ana Martínez',
    role: 'Estudiante · UNAM',
    color: '#1E6FD9',
  },
  {
    quote: 'El presupuesto compartido fue un game changer. Todos sabíamos exactamente cuánto llevábamos gastado en tiempo real.',
    name: 'Carlos Herrera',
    role: 'Ingeniero · Monterrey',
    color: '#7A4FD6',
  },
  {
    quote: 'Invité a mis amigos con un link, votamos destinos y en 20 minutos teníamos el itinerario completo listo.',
    name: 'Sofía Ramírez',
    role: 'Diseñadora · CDMX',
    color: '#35C56A',
  },
]

function TestimonialsSection() {
  const ref = useFadeIn()
  return (
    <section ref={ref} className="bg-[#F4F6F8] py-24 px-4">
      <div className="max-w-5xl mx-auto">
        <p className="font-body text-xs text-[#7A8799] uppercase tracking-widest text-center mb-3">
          Lo que dicen los viajeros
        </p>
        <h2 className="font-heading font-bold text-[#1E0A4E] text-3xl md:text-4xl text-center mb-14">
          Miles de grupos ya planean con Ithera
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-sm flex flex-col gap-4 hover:shadow-md transition-shadow duration-300"
            >
              {/* Stars */}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                ))}
              </div>

              <p className="font-body text-[#3D4A5C] text-sm leading-relaxed flex-1">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-heading font-bold text-sm shrink-0"
                  style={{ backgroundColor: t.color }}
                >
                  {t.name[0]}
                </div>
                <div>
                  <p className="font-heading font-semibold text-[#1E0A4E] text-sm">{t.name}</p>
                  <p className="font-body text-[#7A8799] text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

const steps = [
  {
    number: '1',
    color: '#1E6FD9',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#1E6FD9]">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Crea el grupo',
    description: 'Define nombre, fechas y destino',
  },
  {
    number: '2',
    color: '#7A4FD6',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#7A4FD6]">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Invita a tu gente',
    description: 'Comparte el enlace o código QR',
  },
  {
    number: '3',
    color: '#35C56A',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#35C56A]">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
    title: 'Planeen juntos',
    description: 'Propuestas, votos y presupuesto en tiempo real',
  },
]

function HowItWorksSection() {
  const ref = useFadeIn()
  return (
    <section id="how" ref={ref} className="bg-background py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-heading font-bold text-primary-dark text-3xl md:text-4xl mb-16">
          ¿Cómo funciona?
        </h2>

        <div className="grid md:grid-cols-3 gap-10">
          {steps.map((step) => (
            <div key={step.number} className="flex flex-col items-center">
              <div
                className="relative w-16 h-16 rounded-full border-2 flex items-center justify-center mb-4"
                style={{ borderColor: `${step.color}50` }}
              >
                <span
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-white font-heading font-bold text-xs flex items-center justify-center"
                  style={{ backgroundColor: step.color }}
                >
                  {step.number}
                </span>
                {step.icon}
              </div>
              <h3 className="font-heading font-semibold text-primary-dark text-base mb-2">{step.title}</h3>
              <p className="font-body text-gray-500 text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── CTA Banner ────────────────────────────────────────────────────────────────

function CTASection() {
  const ref = useFadeIn()
  return (
    <section ref={ref} className="bg-primary-dark py-24 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <h2 className="font-heading font-bold text-white text-4xl md:text-5xl mb-4">
          ¿Listo para tu próxima aventura?
        </h2>
        <p className="font-body text-white/60 text-sm mb-10">
          Crea tu grupo gratis en menos de 2 minutos.
        </p>
        <button className="font-body font-medium text-sm border border-white/40 text-white rounded-full px-8 py-3 hover:bg-white/10 transition-colors inline-flex items-center gap-2">
          Empezar ahora — es gratis
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <p className="font-body text-white/30 text-xs mt-4">Sin tarjeta de crédito · Sin instalación</p>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

const footerLinks = {
  Producto:  ['Explorar', 'Cómo funciona', 'Precios', 'Testimonios'],
  Compañía:  ['Acerca de', 'Blog', 'Carreras', 'Contacto'],
  Legal:     ['Privacidad', 'Términos', 'Cookies', 'Soporte'],
}

function Footer() {
  return (
    <footer className="bg-primary-dark border-t border-white/10 py-14 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <Logo variant="white" height={40} />
            </div>
            <p className="font-body text-white/40 text-xs leading-relaxed mb-4">
              Planifica viajes grupales sin complicaciones.
            </p>
            <div className="flex gap-3">
              {['ig', 'tw', 'in', 'yt'].map((social) => (
                <a
                  key={social}
                  href="#"
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={social}
                >
                  <span className="font-body text-white/60 text-[9px] uppercase">{social}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([col, links]) => (
            <div key={col}>
              <p className="font-heading font-semibold text-white text-xs uppercase tracking-wider mb-4">{col}</p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link}>
                    <a href="#" className="font-body text-white/40 text-xs hover:text-white/70 transition-colors">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="font-body text-white/25 text-xs text-center">
            © 2025 Ithera. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="font-body">
      <Navbar />
      <HeroSection />
      <StatsSection />
      <FeaturesSection />
      <DemoSection />
      <DestinationsSection />
      <TestimonialsSection />
      <HowItWorksSection />
      <CTASection />
      <Footer />
    </div>
  )
}
