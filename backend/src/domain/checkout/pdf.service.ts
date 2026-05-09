type PdfLine = {
  label?: string;
  value: string;
};

const escapePdfText = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const buildSimplePdf = (title: string, subtitle: string, lines: PdfLine[]): Buffer => {
  const streamLines: string[] = [];
  streamLines.push('BT');
  streamLines.push('/F1 20 Tf');
  streamLines.push('72 760 Td');
  streamLines.push(`(${escapePdfText(title)}) Tj`);
  streamLines.push('/F1 11 Tf');
  streamLines.push('0 -24 Td');
  streamLines.push(`(${escapePdfText(subtitle)}) Tj`);
  streamLines.push('0 -28 Td');

  lines.forEach((line) => {
    const text = line.label ? `${line.label}: ${line.value}` : line.value;
    streamLines.push(`(${escapePdfText(text)}) Tj`);
    streamLines.push('0 -18 Td');
  });

  streamLines.push('ET');

  const content = streamLines.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf8')} >>\nstream\n${content}\nendstream\nendobj\n`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
};

export const generateFlightTicketPdf = (data: {
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
}): Buffer => {
  return buildSimplePdf('ITHERA - Boleto de vuelo simulado', 'Este documento no representa una compra real.', [
    { label: 'Folio', value: data.folio },
    { label: 'Propuesta', value: data.title },
    { label: 'Pasajeros', value: data.passengerNames.length ? data.passengerNames.join(', ') : 'No especificados' },
    { label: 'Aerolinea', value: data.airline ?? 'No especificada' },
    { label: 'Vuelo', value: data.flightNumber ?? 'No especificado' },
    { label: 'Origen', value: data.origin ?? 'No especificado' },
    { label: 'Destino', value: data.destination ?? 'No especificado' },
    { label: 'Salida', value: data.departure ?? 'No especificada' },
    { label: 'Llegada', value: data.arrival ?? 'No especificada' },
    { label: 'Total simulado', value: data.price ?? 'No especificado' },
    { label: 'Autorizacion simulada', value: data.authCode ?? 'N/A' },
    { value: 'Guardado automaticamente en la boveda de documentos del viaje.' },
  ]);
};

export const generateHotelVoucherPdf = (data: {
  folio: string;
  title: string;
  guestNames: string[];
  hotelName?: string | null;
  address?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  price?: string | null;
  authCode?: string | null;
}): Buffer => {
  return buildSimplePdf('ITHERA - Voucher de hospedaje simulado', 'Este documento no representa una reserva real.', [
    { label: 'Folio', value: data.folio },
    { label: 'Propuesta', value: data.title },
    { label: 'Huespedes', value: data.guestNames.length ? data.guestNames.join(', ') : 'No especificados' },
    { label: 'Hotel', value: data.hotelName ?? 'No especificado' },
    { label: 'Direccion', value: data.address ?? 'No especificada' },
    { label: 'Check-in', value: data.checkIn ?? 'No especificado' },
    { label: 'Check-out', value: data.checkOut ?? 'No especificado' },
    { label: 'Total simulado', value: data.price ?? 'No especificado' },
    { label: 'Autorizacion simulada', value: data.authCode ?? 'N/A' },
    { value: 'Guardado automaticamente en la boveda de documentos del viaje.' },
  ]);
};
