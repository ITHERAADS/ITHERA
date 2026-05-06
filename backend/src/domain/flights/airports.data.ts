export interface AirportCatalogItem {
  code: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  aliases: string[];
}

export const AIRPORT_CATALOG: AirportCatalogItem[] = [
  { code: 'MEX', name: 'Aeropuerto Internacional Benito Juárez', city: 'Ciudad de México', state: 'Ciudad de México', country: 'México', countryCode: 'MX', latitude: 19.4363, longitude: -99.0721, aliases: ['cdmx', 'mexico city', 'ciudad de mexico', 'aicm', 'benito juarez'] },
  { code: 'NLU', name: 'Aeropuerto Internacional Felipe Ángeles', city: 'Santa Lucía', state: 'Estado de México', country: 'México', countryCode: 'MX', latitude: 19.7421, longitude: -99.0164, aliases: ['aifa', 'felipe angeles', 'santa lucia', 'ciudad de mexico'] },
  { code: 'CUN', name: 'Aeropuerto Internacional de Cancún', city: 'Cancún', state: 'Quintana Roo', country: 'México', countryCode: 'MX', latitude: 21.0365, longitude: -86.8771, aliases: ['cancun', 'quintana roo', 'riviera maya', 'playa del carmen', 'tulum'] },
  { code: 'ACA', name: 'Aeropuerto Internacional General Juan N. Álvarez', city: 'Acapulco', state: 'Guerrero', country: 'México', countryCode: 'MX', latitude: 16.7571, longitude: -99.7530, aliases: ['acapulco', 'guerrero', 'general juan n alvarez'] },
  { code: 'GDL', name: 'Aeropuerto Internacional Miguel Hidalgo y Costilla', city: 'Guadalajara', state: 'Jalisco', country: 'México', countryCode: 'MX', latitude: 20.5218, longitude: -103.3112, aliases: ['guadalajara', 'jalisco', 'miguel hidalgo'] },
  { code: 'MTY', name: 'Aeropuerto Internacional de Monterrey', city: 'Monterrey', state: 'Nuevo León', country: 'México', countryCode: 'MX', latitude: 25.7785, longitude: -100.1069, aliases: ['monterrey', 'nuevo leon', 'apodaca'] },
  { code: 'PVR', name: 'Aeropuerto Internacional Licenciado Gustavo Díaz Ordaz', city: 'Puerto Vallarta', state: 'Jalisco', country: 'México', countryCode: 'MX', latitude: 20.6801, longitude: -105.2542, aliases: ['puerto vallarta', 'vallarta', 'riviera nayarit', 'nuevo vallarta'] },
  { code: 'SJD', name: 'Aeropuerto Internacional de Los Cabos', city: 'San José del Cabo', state: 'Baja California Sur', country: 'México', countryCode: 'MX', latitude: 23.1518, longitude: -109.7210, aliases: ['los cabos', 'cabo san lucas', 'san jose del cabo', 'baja california sur'] },
  { code: 'MID', name: 'Aeropuerto Internacional Manuel Crescencio Rejón', city: 'Mérida', state: 'Yucatán', country: 'México', countryCode: 'MX', latitude: 20.9370, longitude: -89.6577, aliases: ['merida', 'yucatan', 'manuel crescencio rejon'] },
  { code: 'TIJ', name: 'Aeropuerto Internacional de Tijuana', city: 'Tijuana', state: 'Baja California', country: 'México', countryCode: 'MX', latitude: 32.5411, longitude: -116.9702, aliases: ['tijuana', 'baja california', 'cbx'] },
  { code: 'OAX', name: 'Aeropuerto Internacional de Oaxaca', city: 'Oaxaca', state: 'Oaxaca', country: 'México', countryCode: 'MX', latitude: 16.9999, longitude: -96.7266, aliases: ['oaxaca', 'xoxocotlan', 'oaxaca de juarez'] },
  { code: 'HUX', name: 'Aeropuerto Internacional de Bahías de Huatulco', city: 'Huatulco', state: 'Oaxaca', country: 'México', countryCode: 'MX', latitude: 15.7753, longitude: -96.2626, aliases: ['huatulco', 'bahias de huatulco', 'santa maria huatulco', 'la crucecita'] },
  { code: 'ZIH', name: 'Aeropuerto Internacional de Ixtapa-Zihuatanejo', city: 'Ixtapa-Zihuatanejo', state: 'Guerrero', country: 'México', countryCode: 'MX', latitude: 17.6016, longitude: -101.4605, aliases: ['ixtapa', 'zihuatanejo', 'ixtapa zihuatanejo'] },
  { code: 'BJX', name: 'Aeropuerto Internacional del Bajío', city: 'León', state: 'Guanajuato', country: 'México', countryCode: 'MX', latitude: 20.9935, longitude: -101.4808, aliases: ['leon', 'guanajuato', 'bajio', 'silao'] },
  { code: 'QRO', name: 'Aeropuerto Intercontinental de Querétaro', city: 'Querétaro', state: 'Querétaro', country: 'México', countryCode: 'MX', latitude: 20.6173, longitude: -100.1857, aliases: ['queretaro', 'qro'] },
  { code: 'PBC', name: 'Aeropuerto Internacional Hermanos Serdán', city: 'Puebla', state: 'Puebla', country: 'México', countryCode: 'MX', latitude: 19.1581, longitude: -98.3714, aliases: ['puebla', 'hermanos serdan'] },
  { code: 'VER', name: 'Aeropuerto Internacional General Heriberto Jara', city: 'Veracruz', state: 'Veracruz', country: 'México', countryCode: 'MX', latitude: 19.1459, longitude: -96.1873, aliases: ['veracruz', 'heriberto jara'] },
  { code: 'TAM', name: 'Aeropuerto Internacional General Francisco Javier Mina', city: 'Tampico', state: 'Tamaulipas', country: 'México', countryCode: 'MX', latitude: 22.2964, longitude: -97.8659, aliases: ['tampico', 'tamaulipas'] },
  { code: 'VSA', name: 'Aeropuerto Internacional Carlos Rovirosa Pérez', city: 'Villahermosa', state: 'Tabasco', country: 'México', countryCode: 'MX', latitude: 17.9969, longitude: -92.8174, aliases: ['villahermosa', 'tabasco'] },
  { code: 'TGZ', name: 'Aeropuerto Internacional Ángel Albino Corzo', city: 'Tuxtla Gutiérrez', state: 'Chiapas', country: 'México', countryCode: 'MX', latitude: 16.5636, longitude: -93.0225, aliases: ['tuxtla', 'tuxtla gutierrez', 'chiapas', 'san cristobal de las casas'] },
  { code: 'CZM', name: 'Aeropuerto Internacional de Cozumel', city: 'Cozumel', state: 'Quintana Roo', country: 'México', countryCode: 'MX', latitude: 20.5224, longitude: -86.9256, aliases: ['cozumel', 'quintana roo'] },
  { code: 'CTM', name: 'Aeropuerto Internacional de Chetumal', city: 'Chetumal', state: 'Quintana Roo', country: 'México', countryCode: 'MX', latitude: 18.5047, longitude: -88.3268, aliases: ['chetumal', 'bacalar', 'quintana roo'] },
  { code: 'CUL', name: 'Aeropuerto Internacional de Culiacán', city: 'Culiacán', state: 'Sinaloa', country: 'México', countryCode: 'MX', latitude: 24.7645, longitude: -107.4747, aliases: ['culiacan', 'sinaloa'] },
  { code: 'MZT', name: 'Aeropuerto Internacional General Rafael Buelna', city: 'Mazatlán', state: 'Sinaloa', country: 'México', countryCode: 'MX', latitude: 23.1614, longitude: -106.2661, aliases: ['mazatlan', 'sinaloa'] },
  { code: 'HMO', name: 'Aeropuerto Internacional General Ignacio Pesqueira García', city: 'Hermosillo', state: 'Sonora', country: 'México', countryCode: 'MX', latitude: 29.0959, longitude: -111.0479, aliases: ['hermosillo', 'sonora'] },
  { code: 'CUU', name: 'Aeropuerto Internacional General Roberto Fierro Villalobos', city: 'Chihuahua', state: 'Chihuahua', country: 'México', countryCode: 'MX', latitude: 28.7029, longitude: -105.9646, aliases: ['chihuahua'] },
  { code: 'CJS', name: 'Aeropuerto Internacional Abraham González', city: 'Ciudad Juárez', state: 'Chihuahua', country: 'México', countryCode: 'MX', latitude: 31.6361, longitude: -106.4287, aliases: ['ciudad juarez', 'juarez', 'chihuahua'] },
  { code: 'SLP', name: 'Aeropuerto Internacional Ponciano Arriaga', city: 'San Luis Potosí', state: 'San Luis Potosí', country: 'México', countryCode: 'MX', latitude: 22.2543, longitude: -100.9308, aliases: ['san luis potosi', 'slp'] },
  { code: 'AGU', name: 'Aeropuerto Internacional Jesús Terán Peredo', city: 'Aguascalientes', state: 'Aguascalientes', country: 'México', countryCode: 'MX', latitude: 21.7056, longitude: -102.3179, aliases: ['aguascalientes'] },
  { code: 'ZCL', name: 'Aeropuerto Internacional General Leobardo C. Ruiz', city: 'Zacatecas', state: 'Zacatecas', country: 'México', countryCode: 'MX', latitude: 22.8971, longitude: -102.6869, aliases: ['zacatecas'] },
  { code: 'DGO', name: 'Aeropuerto Internacional Guadalupe Victoria', city: 'Durango', state: 'Durango', country: 'México', countryCode: 'MX', latitude: 24.1242, longitude: -104.5280, aliases: ['durango'] },
  { code: 'TRC', name: 'Aeropuerto Internacional Francisco Sarabia', city: 'Torreón', state: 'Coahuila', country: 'México', countryCode: 'MX', latitude: 25.5683, longitude: -103.4106, aliases: ['torreon', 'coahuila', 'la laguna'] },
  { code: 'REX', name: 'Aeropuerto Internacional General Lucio Blanco', city: 'Reynosa', state: 'Tamaulipas', country: 'México', countryCode: 'MX', latitude: 26.0089, longitude: -98.2285, aliases: ['reynosa', 'tamaulipas'] },
  { code: 'LAP', name: 'Aeropuerto Internacional Manuel Márquez de León', city: 'La Paz', state: 'Baja California Sur', country: 'México', countryCode: 'MX', latitude: 24.0727, longitude: -110.3625, aliases: ['la paz', 'baja california sur'] },
  { code: 'MXL', name: 'Aeropuerto Internacional General Rodolfo Sánchez Taboada', city: 'Mexicali', state: 'Baja California', country: 'México', countryCode: 'MX', latitude: 32.6306, longitude: -115.2416, aliases: ['mexicali', 'baja california'] },
  { code: 'MLM', name: 'Aeropuerto Internacional General Francisco J. Mujica', city: 'Morelia', state: 'Michoacán', country: 'México', countryCode: 'MX', latitude: 19.8499, longitude: -101.0255, aliases: ['morelia', 'michoacan'] },
  { code: 'TLC', name: 'Aeropuerto Internacional de Toluca', city: 'Toluca', state: 'Estado de México', country: 'México', countryCode: 'MX', latitude: 19.3371, longitude: -99.5660, aliases: ['toluca', 'estado de mexico'] },
  { code: 'CLQ', name: 'Aeropuerto Nacional de Colima', city: 'Colima', state: 'Colima', country: 'México', countryCode: 'MX', latitude: 19.2770, longitude: -103.5770, aliases: ['colima', 'manzanillo'] },
  { code: 'TAP', name: 'Aeropuerto Internacional de Tapachula', city: 'Tapachula', state: 'Chiapas', country: 'México', countryCode: 'MX', latitude: 14.7943, longitude: -92.3700, aliases: ['tapachula', 'chiapas'] },
  { code: 'NLD', name: 'Aeropuerto Internacional Quetzalcóatl', city: 'Nuevo Laredo', state: 'Tamaulipas', country: 'México', countryCode: 'MX', latitude: 27.4439, longitude: -99.5705, aliases: ['nuevo laredo', 'tamaulipas'] },
  { code: 'MAD', name: 'Aeropuerto Adolfo Suárez Madrid-Barajas', city: 'Madrid', country: 'España', countryCode: 'ES', latitude: 40.4983, longitude: -3.5676, aliases: ['madrid', 'barajas', 'espana', 'spain'] },
  { code: 'BCN', name: 'Aeropuerto Josep Tarradellas Barcelona-El Prat', city: 'Barcelona', country: 'España', countryCode: 'ES', latitude: 41.2974, longitude: 2.0833, aliases: ['barcelona', 'el prat', 'espana', 'spain'] },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'Nueva York', country: 'Estados Unidos', countryCode: 'US', latitude: 40.6413, longitude: -73.7781, aliases: ['new york', 'nueva york', 'nyc', 'john f kennedy'] },
  { code: 'EWR', name: 'Newark Liberty International Airport', city: 'Newark / Nueva York', country: 'Estados Unidos', countryCode: 'US', latitude: 40.6895, longitude: -74.1745, aliases: ['newark', 'new york', 'nueva york', 'nyc'] },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Ángeles', country: 'Estados Unidos', countryCode: 'US', latitude: 33.9416, longitude: -118.4085, aliases: ['los angeles', 'la', 'california'] },
  { code: 'MIA', name: 'Miami International Airport', city: 'Miami', country: 'Estados Unidos', countryCode: 'US', latitude: 25.7959, longitude: -80.2870, aliases: ['miami', 'florida'] },
  { code: 'ORD', name: 'Chicago O’Hare International Airport', city: 'Chicago', country: 'Estados Unidos', countryCode: 'US', latitude: 41.9742, longitude: -87.9073, aliases: ['chicago', 'ohare'] },
  { code: 'DFW', name: 'Dallas Fort Worth International Airport', city: 'Dallas', country: 'Estados Unidos', countryCode: 'US', latitude: 32.8998, longitude: -97.0403, aliases: ['dallas', 'fort worth', 'texas'] },
  { code: 'IAH', name: 'George Bush Intercontinental Airport', city: 'Houston', country: 'Estados Unidos', countryCode: 'US', latitude: 29.9902, longitude: -95.3368, aliases: ['houston', 'texas'] },
  { code: 'YYZ', name: 'Toronto Pearson International Airport', city: 'Toronto', country: 'Canadá', countryCode: 'CA', latitude: 43.6777, longitude: -79.6248, aliases: ['toronto', 'canada'] },
  { code: 'YVR', name: 'Vancouver International Airport', city: 'Vancouver', country: 'Canadá', countryCode: 'CA', latitude: 49.1967, longitude: -123.1815, aliases: ['vancouver', 'canada'] },
  { code: 'CDG', name: 'Paris Charles de Gaulle Airport', city: 'París', country: 'Francia', countryCode: 'FR', latitude: 49.0097, longitude: 2.5479, aliases: ['paris', 'charles de gaulle', 'francia', 'france'] },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'Londres', country: 'Reino Unido', countryCode: 'GB', latitude: 51.4700, longitude: -0.4543, aliases: ['london', 'londres', 'heathrow', 'reino unido', 'uk'] },
  { code: 'FCO', name: 'Leonardo da Vinci-Fiumicino Airport', city: 'Roma', country: 'Italia', countryCode: 'IT', latitude: 41.8003, longitude: 12.2389, aliases: ['roma', 'rome', 'italia', 'italy'] },
  { code: 'NRT', name: 'Narita International Airport', city: 'Tokio', country: 'Japón', countryCode: 'JP', latitude: 35.7720, longitude: 140.3929, aliases: ['tokio', 'tokyo', 'narita', 'japon', 'japan'] },
  { code: 'HND', name: 'Tokyo Haneda Airport', city: 'Tokio', country: 'Japón', countryCode: 'JP', latitude: 35.5494, longitude: 139.7798, aliases: ['tokio', 'tokyo', 'haneda', 'japon', 'japan'] },
  { code: 'BOG', name: 'Aeropuerto Internacional El Dorado', city: 'Bogotá', country: 'Colombia', countryCode: 'CO', latitude: 4.7016, longitude: -74.1469, aliases: ['bogota', 'colombia', 'el dorado'] },
  { code: 'LIM', name: 'Aeropuerto Internacional Jorge Chávez', city: 'Lima', country: 'Perú', countryCode: 'PE', latitude: -12.0219, longitude: -77.1143, aliases: ['lima', 'peru', 'jorge chavez'] },
  { code: 'EZE', name: 'Aeropuerto Internacional Ministro Pistarini', city: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', latitude: -34.8222, longitude: -58.5358, aliases: ['buenos aires', 'argentina', 'ezeiza'] },
  { code: 'SCL', name: 'Aeropuerto Internacional Arturo Merino Benítez', city: 'Santiago', country: 'Chile', countryCode: 'CL', latitude: -33.3928, longitude: -70.7858, aliases: ['santiago', 'chile'] },
];
