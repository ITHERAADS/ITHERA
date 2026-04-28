import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="bg-[#1E0A4E] text-gray-300 py-12 px-6 border-t border-white/10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Columna 1 */}
        <div className="col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-[#1E6FD9] text-2xl">✈️</span>
            <span className="font-bold text-xl text-white tracking-wide">ITHERA</span>
          </div>
          <p className="text-sm text-gray-400 mb-6 pr-4">
            Planifica tu viaje grupal sin el caos. La mejor forma de organizar tu próxima aventura.
          </p>
          <div className="flex space-x-3">
             <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer flex items-center justify-center transition-colors">𝕏</div>
             <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer flex items-center justify-center transition-colors">In</div>
             <div className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer flex items-center justify-center transition-colors">Ig</div>
          </div>
        </div>
        
        {/* Columna 2 */}
        <div>
          <h4 className="text-white font-semibold mb-4">Producto</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/destinos" className="hover:text-white transition-colors">Destinos</Link></li>
            <li><Link to="/como-funciona" className="hover:text-white transition-colors">Cómo funciona</Link></li>
            <li><Link to="/precios" className="hover:text-white transition-colors">Precios</Link></li>
          </ul>
        </div>

        {/* Columna 3 */}
        <div>
          <h4 className="text-white font-semibold mb-4">Compañía</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/nosotros" className="hover:text-white transition-colors">Sobre nosotros</Link></li>
            <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
            <li><Link to="/contacto" className="hover:text-white transition-colors">Contacto</Link></li>
          </ul>
        </div>

        {/* Columna 4 */}
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-3 text-sm">
            <li><Link to="/privacidad" className="hover:text-white transition-colors">Privacidad</Link></li>
            <li><Link to="/terminos" className="hover:text-white transition-colors">Términos y Condiciones</Link></li>
            <li><Link to="/cookies" className="hover:text-white transition-colors">Cookies</Link></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} Ithera. Todos los derechos reservados.
      </div>
    </footer>
  );
};