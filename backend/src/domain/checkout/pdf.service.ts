import { inflateSync, deflateSync } from 'zlib';

type PdfLine = {
  label?: string;
  value: string;
};

type PdfSection = {
  title: string;
  lines: PdfLine[];
};

type PdfImage = {
  width: number;
  height: number;
  colorSpace: '/DeviceRGB' | '/DeviceGray';
  bitsPerComponent: number;
  filter: '/DCTDecode' | '/FlateDecode';
  data: Buffer;
  smask?: PdfImage;
};

type PdfDocumentData = {
  title: string;
  subtitle: string;
  folio: string;
  total?: string | null;
  authCode?: string | null;
  recipientEmail?: string | null;
  heroImageUrl?: string | null;
  sections: PdfSection[];
};

const ITHERA_LOGO_URL = 'https://bkbsxmrrjwvmefazbtra.supabase.co/storage/v1/object/public/public-assets/ITHERA-logo-com.png';

const toPdfSafeText = (value: string): string =>
  String(value ?? '')
    .normalize('NFC')
    .replace(/[áàäâ]/gi, (m) => (m === m.toUpperCase() ? 'A' : 'a'))
    .replace(/[éèëê]/gi, (m) => (m === m.toUpperCase() ? 'E' : 'e'))
    .replace(/[íìïî]/gi, (m) => (m === m.toUpperCase() ? 'I' : 'i'))
    .replace(/[óòöô]/gi, (m) => (m === m.toUpperCase() ? 'O' : 'o'))
    .replace(/[úùüû]/gi, (m) => (m === m.toUpperCase() ? 'U' : 'u'))
    .replace(/ñ/gi, (m) => (m === 'Ñ' ? 'N' : 'n'))
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '');

const escapePdfText = (value: string): string =>
  toPdfSafeText(value).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const moneyText = (value?: string | null): string => value || 'No especificado';

const wrapText = (text: string, maxChars: number): string[] => {
  const words = toPdfSafeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const addText = (commands: string[], text: string, x: number, y: number, size = 10, font = 'F1', color = '0 0 0'): void => {
  commands.push('BT');
  commands.push(`${color} rg`);
  commands.push(`/${font} ${size} Tf`);
  commands.push(`${x} ${y} Td`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push('ET');
};

const addRect = (commands: string[], x: number, y: number, width: number, height: number, color: string): void => {
  commands.push('q');
  commands.push(`${color} rg`);
  commands.push(`${x} ${y} ${width} ${height} re f`);
  commands.push('Q');
};

const addImage = (commands: string[], name: string, x: number, y: number, width: number, height: number): void => {
  commands.push('q');
  commands.push(`${width} 0 0 ${height} ${x} ${y} cm`);
  commands.push(`/${name} Do`);
  commands.push('Q');
};

const paeth = (a: number, b: number, c: number): number => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
};

const readPng = (buffer: Buffer): PdfImage | null => {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset += length + 12;
  }

  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType)) return null;

  const channels = colorType === 6 ? 4 : 3;
  const bytesPerPixel = channels;
  const stride = width * channels;
  const inflated = inflateSync(Buffer.concat(idat));
  const raw = Buffer.alloc(width * height * channels);
  let inOffset = 0;
  let outOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[inOffset];
    inOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const value = inflated[inOffset + x];
      const left = x >= bytesPerPixel ? raw[outOffset + x - bytesPerPixel] : 0;
      const up = y > 0 ? raw[outOffset + x - stride] : 0;
      const upLeft = y > 0 && x >= bytesPerPixel ? raw[outOffset + x - stride - bytesPerPixel] : 0;
      let decoded = value;
      if (filter === 1) decoded = (value + left) & 0xff;
      else if (filter === 2) decoded = (value + up) & 0xff;
      else if (filter === 3) decoded = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) decoded = (value + paeth(left, up, upLeft)) & 0xff;
      raw[outOffset + x] = decoded;
    }
    inOffset += stride;
    outOffset += stride;
  }

  if (colorType === 2) {
    return { width, height, colorSpace: '/DeviceRGB', bitsPerComponent: 8, filter: '/FlateDecode', data: deflateSync(raw) };
  }

  const rgb = Buffer.alloc(width * height * 3);
  const alpha = Buffer.alloc(width * height);
  for (let i = 0, r = 0, a = 0; i < raw.length; i += 4, r += 3, a += 1) {
    rgb[r] = raw[i];
    rgb[r + 1] = raw[i + 1];
    rgb[r + 2] = raw[i + 2];
    alpha[a] = raw[i + 3];
  }

  return {
    width,
    height,
    colorSpace: '/DeviceRGB',
    bitsPerComponent: 8,
    filter: '/FlateDecode',
    data: deflateSync(rgb),
    smask: {
      width,
      height,
      colorSpace: '/DeviceGray',
      bitsPerComponent: 8,
      filter: '/FlateDecode',
      data: deflateSync(alpha),
    },
  };
};

const fetchPdfImage = async (url?: string | null): Promise<PdfImage | null> => {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    const buffer = Buffer.from(await response.arrayBuffer());
    if (contentType.includes('jpeg') || contentType.includes('jpg') || buffer.subarray(0, 2).toString('hex') === 'ffd8') {
      return { width: 900, height: 520, colorSpace: '/DeviceRGB', bitsPerComponent: 8, filter: '/DCTDecode', data: buffer };
    }
    return readPng(buffer);
  } catch (error) {
    console.error('[checkout-pdf] No se pudo cargar imagen remota:', error);
    return null;
  }
};

const fitImage = (image: PdfImage, maxWidth: number, maxHeight: number): { width: number; height: number } => {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);
  return { width: image.width * ratio, height: image.height * ratio };
};

const buildImageObjects = (images: Record<string, PdfImage>, startId: number) => {
  const objects: string[] = [];
  const names: Record<string, number> = {};
  let nextId = startId;

  Object.entries(images).forEach(([name, image]) => {
    let smaskId: number | null = null;
    if (image.smask) {
      smaskId = nextId;
      objects.push(`${nextId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.smask.width} /Height ${image.smask.height} /ColorSpace ${image.smask.colorSpace} /BitsPerComponent ${image.smask.bitsPerComponent} /Filter ${image.smask.filter} /Length ${image.smask.data.length} >>\nstream\n${image.smask.data.toString('binary')}\nendstream\nendobj\n`);
      nextId += 1;
    }

    names[name] = nextId;
    objects.push(`${nextId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace ${image.colorSpace} /BitsPerComponent ${image.bitsPerComponent} /Filter ${image.filter}${smaskId ? ` /SMask ${smaskId} 0 R` : ''} /Length ${image.data.length} >>\nstream\n${image.data.toString('binary')}\nendstream\nendobj\n`);
    nextId += 1;
  });

  return { objects, names };
};

const buildElegantPdf = async (data: PdfDocumentData): Promise<Buffer> => {
  const commands: string[] = [];
  const logo = await fetchPdfImage(ITHERA_LOGO_URL);
  const heroImage = await fetchPdfImage(data.heroImageUrl);
  const images: Record<string, PdfImage> = {};
  if (logo) images.ImLogo = logo;
  if (heroImage) images.ImHero = heroImage;

  addRect(commands, 0, 720, 612, 72, '0.118 0.039 0.306');
  addRect(commands, 390, 720, 222, 72, '1 1 1');
  addRect(commands, 390, 720, 1, 72, '0.875 0.906 0.953');
  addText(commands, 'ITHERA', 48, 758, 18, 'F2', '1 1 1');
  addText(commands, data.title, 48, 735, 15, 'F2', '1 1 1');

  if (logo) {
    const fitted = fitImage(logo, 154, 50);
    addImage(commands, 'ImLogo', 424 + (154 - fitted.width) / 2, 731 + (50 - fitted.height) / 2, fitted.width, fitted.height);
  } else {
    addText(commands, data.subtitle, 408, 744, 9, 'F1', '0.118 0.039 0.306');
  }

  addRect(commands, 48, 654, 516, 46, '0.948 0.965 0.996');
  addText(commands, 'Folio', 64, 681, 8, 'F2', '0.392 0.455 0.545');
  addText(commands, data.folio, 64, 665, 13, 'F2', '0.118 0.039 0.306');
  addText(commands, 'Total', 330, 681, 8, 'F2', '0.392 0.455 0.545');
  addText(commands, moneyText(data.total), 330, 665, 13, 'F2', '0.118 0.039 0.306');
  addText(commands, 'Autorizacion', 448, 681, 8, 'F2', '0.392 0.455 0.545');
  addText(commands, data.authCode ?? 'N/A', 448, 665, 13, 'F2', '0.118 0.039 0.306');

  let y = 622;
  if (heroImage) {
    addRect(commands, 48, 500, 516, 112, '0.948 0.965 0.996');
    const fitted = fitImage(heroImage, 516, 112);
    addImage(commands, 'ImHero', 48 + (516 - fitted.width) / 2, 500 + (112 - fitted.height) / 2, fitted.width, fitted.height);
    y = 466;
  }

  data.sections.forEach((section) => {
    addText(commands, section.title, 48, y, 12, 'F2', '0.118 0.039 0.306');
    y -= 14;
    addRect(commands, 48, y - 7, 516, 1, '0.875 0.906 0.953');
    y -= 22;

    section.lines.forEach((line) => {
      const label = line.label ? `${line.label}:` : '';
      if (label) addText(commands, label, 64, y, 9, 'F2', '0.392 0.455 0.545');
      const valueX = label ? 180 : 64;
      const wrapped = wrapText(line.value, label ? 58 : 86).slice(0, 4);
      wrapped.forEach((textLine, index) => {
        addText(commands, textLine, valueX, y - index * 12, 9, 'F1', '0.118 0.039 0.306');
      });
      y -= Math.max(18, wrapped.length * 12 + 6);
    });

    y -= 8;
  });

  addRect(commands, 48, 54, 516, 40, '0.948 0.965 0.996');
  addText(commands, 'Documento generado por ITHERA. Conserva este comprobante en la boveda del viaje.', 64, 77, 9, 'F1', '0.118 0.039 0.306');
  if (data.recipientEmail) addText(commands, `PDF enviado a: ${data.recipientEmail}`, 64, 63, 8, 'F1', '0.392 0.455 0.545');

  const imageData = buildImageObjects(images, 7);
  const xObjectEntries = Object.entries(imageData.names).map(([name, id]) => `/${name} ${id} 0 R`).join(' ');
  const content = commands.join('\n');
  const contentLength = Buffer.byteLength(content, 'binary');

  const baseObjects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObjectEntries ? ` /XObject << ${xObjectEntries} >>` : ''} >> /Contents 6 0 R >>\nendobj\n`,
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${contentLength} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  const objects = [...baseObjects, ...imageData.objects];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'binary'));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'binary');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'binary');
};

export const generateFlightTicketPdf = async (data: {
  folio: string;
  title: string;
  passengerNames: string[];
  airline?: string | null;
  flightNumber?: string | null;
  origin?: string | null;
  destination?: string | null;
  departure?: string | null;
  arrival?: string | null;
  price?: string | null;
  authCode?: string | null;
  recipientEmail?: string | null;
  passengersSummary?: string | null;
  provider?: string | null;
}): Promise<Buffer> => {
  return buildElegantPdf({
    title: 'Boleto de vuelo',
    subtitle: 'Compra gestionada mediante ITHERA',
    folio: data.folio,
    total: data.price,
    authCode: data.authCode,
    recipientEmail: data.recipientEmail,
    sections: [
      {
        title: 'Datos del vuelo',
        lines: [
          { label: 'Vuelo', value: data.title },
          { label: 'Pasajero principal', value: data.passengerNames[0] ?? 'No especificado' },
          { label: 'N. de pasajeros', value: data.passengersSummary ?? `${Math.max(data.passengerNames.length, 1)} pasajero(s)` },
          { label: 'Aerolínea', value: data.airline ?? 'No especificada' },
          { label: 'N. de vuelo', value: data.flightNumber ?? 'No especificado' },
          { label: 'Proveedor', value: data.provider ?? 'ITHERA' },
        ],
      },
      {
        title: 'Itinerario',
        lines: [
          { label: 'Origen', value: data.origin ?? 'No especificado' },
          { label: 'Destino', value: data.destination ?? 'No especificado' },
          { label: 'Salida', value: data.departure ?? 'No especificada' },
          { label: 'Llegada', value: data.arrival ?? 'No especificada' },
        ],
      },
    ],
  });
};

export const generateHotelVoucherPdf = async (data: {
  folio: string;
  title: string;
  guestNames: string[];
  hotelName?: string | null;
  address?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  price?: string | null;
  authCode?: string | null;
  recipientEmail?: string | null;
  provider?: string | null;
  heroImageUrl?: string | null;
  guestSummary?: string | null;
  roomName?: string | null;
  boardPolicy?: string | null;
}): Promise<Buffer> => {
  return buildElegantPdf({
    title: 'Voucher de hospedaje',
    subtitle: 'Reserva gestionada mediante ITHERA',
    folio: data.folio,
    total: data.price,
    authCode: data.authCode,
    recipientEmail: data.recipientEmail,
    heroImageUrl: data.heroImageUrl,
    sections: [
      {
        title: 'Datos de la reserva',
        lines: [
          { label: 'Hotel', value: data.hotelName ?? data.title },
          { label: 'Huesped principal', value: data.guestNames[0] ?? 'No especificado' },
          { label: 'N. de huespedes', value: data.guestSummary ?? `${Math.max(data.guestNames.length, 1)} huesped(es)` },
          { label: 'Habitacion', value: data.roomName ?? 'No especificada' },
          { label: 'Regimen y politicas', value: data.boardPolicy ?? 'No especificado' },
          { label: 'Proveedor', value: data.provider ?? 'ITHERA' },
        ],
      },
      {
        title: 'Estancia',
        lines: [
          { label: 'Direccion', value: data.address ?? 'No especificada' },
          { label: 'Check-in', value: data.checkIn ?? 'No especificado' },
          { label: 'Check-out', value: data.checkOut ?? 'No especificado' },
        ],
      },
    ],
  });
};
