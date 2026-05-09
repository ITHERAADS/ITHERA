import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { emitCheckoutUpdated, emitDashboardUpdated } from '../../infrastructure/sockets/socket.gateway';
import { getLocalUserId } from '../groups/groups.service';
import * as NotificationsService from '../notifications/notifications.service';
import { sendEmail } from '../../services/email.service';
import { baseTemplate } from '../../infrastructure/email/templates/baseTemplate';
import { SimulatedCheckoutPayload } from './checkout.entity';
import { validateFakeCard } from './payment-simulator.service';
import { generateFlightTicketPdf, generateHotelVoucherPdf } from './pdf.service';

const BUCKET = 'trip-documents';

type ProposalType = 'vuelo' | 'hospedaje';

type ProposalRow = {
  id_propuesta: number;
  grupo_id: number;
  tipo_item: ProposalType | 'actividad';
  titulo: string;
  estado: string;
  payload?: Record<string, unknown> | null;
  bloqueado_por?: number | null;
  fecha_bloqueo?: string | null;
};

type ServiceError = Error & { statusCode?: number };

type CheckoutDocument = {
  id: string;
  file_url: string;
  file_name: string;
  file_path: string;
  [key: string]: unknown;
};

const createError = (message: string, statusCode: number): ServiceError => {
  const err = new Error(message) as ServiceError;
  err.statusCode = statusCode;
  return err;
};

const formatMoney = (amount: unknown, currency: unknown): string => {
  const numeric = Number(amount ?? 0);
  const safeCurrency = String(currency ?? 'MXN');
  if (!Number.isFinite(numeric)) return `0 ${safeCurrency}`;
  return `${numeric.toFixed(2)} ${safeCurrency}`;
};

const parseAmount = (amount: unknown): number => {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : 0;
};

const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const normalizeEmail = (email: unknown): string | null => {
  const value = String(email ?? '').trim();
  const emailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  return emailRegex.test(value) ? value : null;
};

const sendCheckoutConfirmationEmail = async (data: {
  to: unknown;
  type: ProposalType;
  folio: string;
  title: string;
  holderName: string;
  amount: number;
  currency: string;
  documentUrl: string;
  authCode?: string | null;
  details: Array<{ label: string; value: unknown }>;
}): Promise<boolean> => {
  const to = normalizeEmail(data.to);

  if (!to) {
    console.warn('[checkout-email] No se envió correo: email de confirmación vacío o inválido.', data.to);
    return false;
  }

  const itemLabel = data.type === 'vuelo' ? 'boleto de vuelo' : 'voucher de hospedaje';
  const actionLabel = data.type === 'vuelo' ? 'compra' : 'reserva';
  const subject = `ITHERA - ${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} confirmada ${data.folio}`;
  const safeDetails = data.details
    .filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '')
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0; color:#64748b; font-weight:700; width:38%;">${escapeHtml(item.label)}</td>
          <td style="padding:8px 0; color:#21094e; font-weight:700;">${escapeHtml(item.value)}</td>
        </tr>`,
    )
    .join('');

  const html = baseTemplate({
    title: `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} confirmada`,
    content: `
      <p style="margin:0 0 18px 0;">Hola ${escapeHtml(data.holderName)}, tu ${itemLabel} fue generado correctamente.</p>

      <div style="background:#f1f5ff; border-radius:14px; padding:18px; margin:18px 0; text-align:left;">
        <p style="margin:0 0 6px 0; color:#64748b; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Folio</p>
        <p style="margin:0; color:#21094e; font-size:22px; font-weight:800;">${escapeHtml(data.folio)}</p>
        <p style="margin:12px 0 0 0; color:#64748b; font-size:13px; font-weight:700; text-transform:uppercase; letter-spacing:.08em;">Total</p>
        <p style="margin:0; color:#21094e; font-size:22px; font-weight:800;">${escapeHtml(formatMoney(data.amount, data.currency))}</p>
      </div>

      <table style="width:100%; border-collapse:collapse; margin:16px 0; text-align:left; font-size:14px;">
        <tbody>
          <tr>
            <td style="padding:8px 0; color:#64748b; font-weight:700; width:38%;">Concepto</td>
            <td style="padding:8px 0; color:#21094e; font-weight:700;">${escapeHtml(data.title)}</td>
          </tr>
          <tr>
            <td style="padding:8px 0; color:#64748b; font-weight:700; width:38%;">Autorización</td>
            <td style="padding:8px 0; color:#21094e; font-weight:700;">${escapeHtml(data.authCode ?? 'N/A')}</td>
          </tr>
          ${safeDetails}
        </tbody>
      </table>

      <a href="${escapeHtml(data.documentUrl)}" style="display:inline-block; margin-top:14px; padding:13px 22px; border-radius:999px; background:#2674da; color:#ffffff; text-decoration:none; font-weight:800;">
        Ver PDF
      </a>

      <p style="margin:18px 0 0 0; color:#64748b; font-size:13px;">También puedes consultar este documento desde la bóveda del viaje en ITHERA.</p>
    `,
  });

  try {
    await sendEmail({ to, subject, html });
    return true;
  } catch (error) {
    console.error('[checkout-email] No se pudo enviar el correo de confirmación:', error);
    return false;
  }
};

const normalizePeople = (
  people: Array<{ fullName: string; documentNumber?: string | null }> | undefined,
  fallback: string,
) => {
  if (!people || people.length === 0) {
    return [{ fullName: fallback, documentNumber: null }];
  }

  return people.map((person, index) => ({
    fullName: person.fullName?.trim() || `${fallback} ${index + 1}`,
    documentNumber: person.documentNumber ?? null,
  }));
};

const generateFolio = (prefix: 'FLT' | 'HTL'): string => {
  const date = new Date();
  const stamp = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(100000 + Math.random() * 900000);
  return `ITH-${prefix}-${stamp}-${random}`;
};

const getApprovedProposal = async (proposalId: number, expectedType: ProposalType): Promise<ProposalRow> => {
  const { data, error } = await supabaseAdmin
    .from('propuestas')
    .select('id_propuesta, grupo_id, tipo_item, titulo, estado, payload, bloqueado_por, fecha_bloqueo')
    .eq('id_propuesta', proposalId)
    .eq('tipo_item', expectedType)
    .maybeSingle();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('La propuesta no existe', 404);
  if (String((data as ProposalRow).estado) !== 'aprobada') {
    throw createError('Solo puedes comprar o reservar una propuesta aprobada', 409);
  }

  return data as ProposalRow;
};

const assertUserBelongsToGroup = async (groupId: string | number, authUserId: string): Promise<number> => {
  const localUserId = await getLocalUserId(authUserId);

  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', groupId)
    .eq('usuario_id', localUserId)
    .maybeSingle();

  if (error) throw createError(error.message, 500);
  if (!data) throw createError('No tienes acceso a este grupo', 403);

  return Number(localUserId);
};

const acquireProposalCheckoutLock = async (proposalId: number, localUserId: number): Promise<void> => {
  const lockTime = new Date().toISOString();
  const staleLimit = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: proposal, error: readError } = await supabaseAdmin
    .from('propuestas')
    .select('bloqueado_por, fecha_bloqueo')
    .eq('id_propuesta', proposalId)
    .single();

  if (readError) throw createError(readError.message, 500);

  const lockedBy = Number((proposal as ProposalRow).bloqueado_por ?? 0);
  const lockDate = (proposal as ProposalRow).fecha_bloqueo ? String((proposal as ProposalRow).fecha_bloqueo) : null;
  const isLockedByAnotherUser = lockedBy > 0 && lockedBy !== localUserId && (!lockDate || lockDate > staleLimit);

  if (isLockedByAnotherUser) {
    throw createError('Otra persona está realizando el checkout de esta propuesta. Intenta de nuevo en unos minutos.', 409);
  }

  const { data, error } = await supabaseAdmin
    .from('propuestas')
    .update({ bloqueado_por: localUserId, fecha_bloqueo: lockTime, ultima_actualizacion: lockTime })
    .eq('id_propuesta', proposalId)
    .select('id_propuesta')
    .single();

  if (error || !data) throw createError(error?.message ?? 'No se pudo bloquear la propuesta para checkout', 409);
};

const releaseProposalCheckoutLock = async (proposalId: number, localUserId: number): Promise<void> => {
  await supabaseAdmin
    .from('propuestas')
    .update({ bloqueado_por: null, fecha_bloqueo: null, ultima_actualizacion: new Date().toISOString() })
    .eq('id_propuesta', proposalId)
    .eq('bloqueado_por', localUserId);
};

const discardSameTypeProposals = async (groupId: number, proposalId: number, type: ProposalType): Promise<void> => {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin
    .from('propuestas')
    .update({ estado: 'descartada', fecha_cierre: now, ultima_actualizacion: now })
    .eq('grupo_id', groupId)
    .eq('tipo_item', type)
    .neq('id_propuesta', proposalId)
    .neq('estado', 'descartada');

  if (error) throw createError(error.message, 500);
};

const uploadCheckoutPdfToVault = async (data: {
  groupId: number;
  authUserId: string;
  fileName: string;
  buffer: Buffer;
  linkedType: ProposalType;
  linkedId: number;
  folio: string;
  metadata: Record<string, unknown>;
}): Promise<CheckoutDocument> => {
  const timestamp = Date.now();
  const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${data.groupId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, data.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) throw createError(`Error al guardar PDF en Storage: ${uploadError.message}`, 500);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const insertPayload = {
    trip_id: data.groupId,
    user_id: data.authUserId,
    file_name: data.fileName,
    file_path: storagePath,
    file_url: publicUrlData.publicUrl,
    mime_type: 'application/pdf',
    file_size: data.buffer.length,
    category: data.linkedType,
    linked_type: data.linkedType,
    linked_id: data.linkedId,
    notas: `Documento generado automáticamente por checkout simulado. Folio: ${data.folio}`,
    metadata: {
      ...data.metadata,
      linked_entity_type: data.linkedType,
      linked_entity_id: String(data.linkedId),
      folio: data.folio,
      generatedBy: 'checkout_simulation',
    },
  };

  const { data: doc, error: dbError } = await supabaseAdmin
    .from('trip_documents')
    .insert(insertPayload)
    .select()
    .single();

  if (dbError || !doc) {
    console.error('[checkout] Error al insertar trip_documents:', dbError, insertPayload);
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw createError(`El PDF se generó, pero no pudo registrarse en la bóveda: ${dbError?.message ?? 'sin detalle'}`, 500);
  }

  return doc as CheckoutDocument;
};

const createCheckoutExpense = async (data: {
  groupId: number;
  localUserId: number;
  amount: number;
  category: 'transporte' | 'hospedaje';
  description: string;
  documentId: string;
}): Promise<{ id: number } | null> => {
  if (data.amount <= 0) return null;

  try {
    const { data: members, error: membersError } = await supabaseAdmin
      .from('grupo_miembros')
      .select('usuario_id')
      .eq('grupo_id', data.groupId);

    if (membersError) throw membersError;

    const memberIds = (members ?? [])
      .map((item: any) => Number(item.usuario_id))
      .filter((id) => Number.isFinite(id));

    if (memberIds.length === 0) return null;

    const today = new Date().toISOString().slice(0, 10);
    const { data: expense, error: expenseError } = await supabaseAdmin
      .from('expenses')
      .insert({
        group_id: data.groupId,
        paid_by_user_id: data.localUserId,
        amount: data.amount,
        description: data.description,
        category: data.category,
        split_type: 'equitativa',
        expense_date: today,
      })
      .select('id')
      .single();

    if (expenseError || !expense) throw expenseError ?? new Error('No se creó el gasto');

    const baseShare = Math.round((data.amount / memberIds.length) * 100) / 100;
    const splits = memberIds.map((userId, index) => ({
      expense_id: Number((expense as any).id),
      user_id: userId,
      share: index === memberIds.length - 1
        ? Math.round((data.amount - baseShare * (memberIds.length - 1)) * 100) / 100
        : baseShare,
      settled: false,
    }));

    const { error: splitError } = await supabaseAdmin.from('expense_splits').insert(splits);
    if (splitError) throw splitError;

    await supabaseAdmin
      .from('expense_documents')
      .insert({
        expense_id: Number((expense as any).id),
        trip_document_id: data.documentId,
      });

    return { id: Number((expense as any).id) };
  } catch (error) {
    console.error('[checkout] No se pudo reflejar el gasto en presupuesto:', error);
    return null;
  }
};

export const simulateFlightPurchase = async (
  authUserId: string,
  proposalId: number,
  payload: SimulatedCheckoutPayload,
) => {
  const proposal = await getApprovedProposal(proposalId, 'vuelo');
  const localUserId = await assertUserBelongsToGroup(proposal.grupo_id, authUserId);
  await acquireProposalCheckoutLock(proposalId, localUserId);

  try {
    const payment = validateFakeCard(payload);

    if (!payment.approved) {
      throw createError(payment.message, payment.status === 'requires_validation' ? 409 : 402);
    }

    const { data: flight, error: flightError } = await supabaseAdmin
      .from('vuelos')
      .select('*')
      .eq('propuesta_id', proposalId)
      .maybeSingle();

    if (flightError) throw createError(flightError.message, 500);
    if (!flight) throw createError('No se encontró el detalle del vuelo', 404);

    if ((flight as any).compra_estado === 'confirmada_simulada') {
      throw createError('Este vuelo ya tiene una compra simulada confirmada', 409);
    }

    const { data: startedFlight, error: startError } = await supabaseAdmin
      .from('vuelos')
      .update({ compra_estado: 'checkout_iniciado', ultima_actualizacion: new Date().toISOString() })
      .eq('propuesta_id', proposalId)
      .neq('compra_estado', 'confirmada_simulada')
      .select('id_vuelo')
      .maybeSingle();

    if (startError) throw createError(startError.message, 500);
    if (!startedFlight) throw createError('Este vuelo ya fue confirmado por otra persona', 409);

    const folio = generateFolio('FLT');
    const passengers = normalizePeople(payload.passengers, payload.cardHolder);
    const now = new Date().toISOString();
    const amount = parseAmount((flight as any).precio);
    const checkoutPayload = {
      folio,
      status: 'confirmada_simulada',
      paidAt: now,
      paidByUserId: localUserId,
      amount,
      currency: (flight as any).moneda ?? 'MXN',
      payment: {
        status: payment.status,
        authorizationCode: payment.authorizationCode,
        last4: payload.cardNumber.replace(/\D/g, '').slice(-4),
        cardHolder: payload.cardHolder,
        email: payload.email,
      },
      passengers,
      notes: payload.notes ?? null,
    };

    const pdf = await generateFlightTicketPdf({
      folio,
      title: proposal.titulo,
      passengerNames: passengers.map((item) => item.fullName),
      airline: (flight as any).aerolinea,
      flightNumber: (flight as any).numero_vuelo,
      origin: `${(flight as any).origen_nombre ?? ''} ${(flight as any).origen_codigo ? `(${(flight as any).origen_codigo})` : ''}`.trim(),
      destination: `${(flight as any).destino_nombre ?? ''} ${(flight as any).destino_codigo ? `(${(flight as any).destino_codigo})` : ''}`.trim(),
      departure: (flight as any).salida,
      arrival: (flight as any).llegada,
      price: formatMoney((flight as any).precio, (flight as any).moneda),
      authCode: payment.authorizationCode,
    });

    const { error: updateError } = await supabaseAdmin
      .from('vuelos')
      .update({
        compra_estado: 'confirmada_simulada',
        compra_payload: checkoutPayload,
        folio_compra: folio,
        ultima_actualizacion: now,
      })
      .eq('propuesta_id', proposalId)
      .neq('compra_estado', 'confirmada_simulada');

    if (updateError) throw createError(updateError.message, 500);

    await discardSameTypeProposals(Number(proposal.grupo_id), proposalId, 'vuelo');

    const document = await uploadCheckoutPdfToVault({
      groupId: Number(proposal.grupo_id),
      authUserId,
      fileName: `boleto-vuelo-${folio}.pdf`,
      buffer: pdf,
      linkedType: 'vuelo',
      linkedId: Number((flight as any).id_vuelo),
      folio,
      metadata: checkoutPayload,
    });

    const emailSent = await sendCheckoutConfirmationEmail({
      to: payload.email,
      type: 'vuelo',
      folio,
      title: proposal.titulo,
      holderName: passengers[0]?.fullName ?? payload.cardHolder,
      amount,
      currency: (flight as any).moneda ?? 'MXN',
      documentUrl: String(document.file_url),
      authCode: payment.authorizationCode,
      details: [
        { label: 'Pasajero principal', value: passengers[0]?.fullName },
        { label: 'Aerolínea', value: (flight as any).aerolinea },
        { label: 'Vuelo', value: (flight as any).numero_vuelo },
        { label: 'Origen', value: `${(flight as any).origen_nombre ?? ''} ${(flight as any).origen_codigo ? `(${(flight as any).origen_codigo})` : ''}`.trim() },
        { label: 'Destino', value: `${(flight as any).destino_nombre ?? ''} ${(flight as any).destino_codigo ? `(${(flight as any).destino_codigo})` : ''}`.trim() },
        { label: 'Salida', value: (flight as any).salida },
        { label: 'Llegada', value: (flight as any).llegada },
      ],
    });

    const expense = await createCheckoutExpense({
      groupId: Number(proposal.grupo_id),
      localUserId,
      amount,
      category: 'transporte',
      description: `Compra de vuelo: ${proposal.titulo} (${folio})`,
      documentId: String(document.id),
    });

    await NotificationsService.createNotificationForGroupMembers(
      Number(proposal.grupo_id),
      Number(localUserId),
      {
        tipo: 'compra_vuelo_simulada',
        titulo: 'Vuelo comprado en simulación',
        mensaje: `Se generó el boleto simulado para "${proposal.titulo}".`,
        entidadTipo: 'propuesta',
        entidadId: proposalId,
        metadata: { folio, documentId: document.id, expenseId: expense?.id ?? null, emailSent },
      },
    );

    emitCheckoutUpdated({ groupId: Number(proposal.grupo_id), proposalId, type: 'vuelo', status: 'confirmada_simulada', folio });
    emitDashboardUpdated({ groupId: Number(proposal.grupo_id), tipo: 'checkout_vuelo', entidadTipo: 'propuesta', entidadId: proposalId, metadata: { folio, documentId: document.id, expenseId: expense?.id ?? null, emailSent } });

    await releaseProposalCheckoutLock(proposalId, localUserId);

    return { folio, status: 'confirmada_simulada', document, payment, expense, emailSent };
  } catch (error) {
    await releaseProposalCheckoutLock(proposalId, localUserId);
    throw error;
  }
};

export const simulateHotelReservation = async (
  authUserId: string,
  proposalId: number,
  payload: SimulatedCheckoutPayload,
) => {
  const proposal = await getApprovedProposal(proposalId, 'hospedaje');
  const localUserId = await assertUserBelongsToGroup(proposal.grupo_id, authUserId);
  await acquireProposalCheckoutLock(proposalId, localUserId);

  try {
    const payment = validateFakeCard(payload);

    if (!payment.approved) {
      throw createError(payment.message, payment.status === 'requires_validation' ? 409 : 402);
    }

    const { data: hotel, error: hotelError } = await supabaseAdmin
      .from('hospedajes')
      .select('*')
      .eq('propuesta_id', proposalId)
      .maybeSingle();

    if (hotelError) throw createError(hotelError.message, 500);
    if (!hotel) throw createError('No se encontró el detalle del hospedaje', 404);

    if ((hotel as any).reserva_estado === 'confirmada_simulada') {
      throw createError('Este hospedaje ya tiene una reserva simulada confirmada', 409);
    }

    const folio = generateFolio('HTL');
    const guests = normalizePeople(payload.guests, payload.cardHolder);
    const now = new Date().toISOString();
    const amount = parseAmount((hotel as any).precio_total);
    const checkoutPayload = {
      folio,
      status: 'confirmada_simulada',
      reservedAt: now,
      reservedByUserId: localUserId,
      amount,
      currency: (hotel as any).moneda ?? 'MXN',
      payment: {
        status: payment.status,
        authorizationCode: payment.authorizationCode,
        last4: payload.cardNumber.replace(/\D/g, '').slice(-4),
        cardHolder: payload.cardHolder,
        email: payload.email,
      },
      guests,
      notes: payload.notes ?? null,
    };

    const pdf = await generateHotelVoucherPdf({
      folio,
      title: proposal.titulo,
      guestNames: guests.map((item) => item.fullName),
      hotelName: (hotel as any).nombre,
      address: (hotel as any).direccion,
      checkIn: (hotel as any).check_in,
      checkOut: (hotel as any).check_out,
      price: formatMoney((hotel as any).precio_total, (hotel as any).moneda),
      authCode: payment.authorizationCode,
    });

    const { data: updatedHotel, error: updateError } = await supabaseAdmin
      .from('hospedajes')
      .update({
        reserva_estado: 'confirmada_simulada',
        reserva_simulada_payload: checkoutPayload,
        folio_reserva: folio,
        ultima_actualizacion: now,
      })
      .eq('propuesta_id', proposalId)
      .neq('reserva_estado', 'confirmada_simulada')
      .select('id_hospedaje')
      .maybeSingle();

    if (updateError) throw createError(updateError.message, 500);
    if (!updatedHotel) throw createError('Este hospedaje ya fue reservado por otra persona', 409);

    await discardSameTypeProposals(Number(proposal.grupo_id), proposalId, 'hospedaje');

    const document = await uploadCheckoutPdfToVault({
      groupId: Number(proposal.grupo_id),
      authUserId,
      fileName: `voucher-hospedaje-${folio}.pdf`,
      buffer: pdf,
      linkedType: 'hospedaje',
      linkedId: Number((hotel as any).id_hospedaje),
      folio,
      metadata: checkoutPayload,
    });

    const emailSent = await sendCheckoutConfirmationEmail({
      to: payload.email,
      type: 'hospedaje',
      folio,
      title: proposal.titulo,
      holderName: guests[0]?.fullName ?? payload.cardHolder,
      amount,
      currency: (hotel as any).moneda ?? 'MXN',
      documentUrl: String(document.file_url),
      authCode: payment.authorizationCode,
      details: [
        { label: 'Huésped principal', value: guests[0]?.fullName },
        { label: 'Hotel', value: (hotel as any).nombre },
        { label: 'Dirección', value: (hotel as any).direccion },
        { label: 'Check-in', value: (hotel as any).check_in },
        { label: 'Check-out', value: (hotel as any).check_out },
        { label: 'Proveedor', value: (hotel as any).proveedor },
      ],
    });

    const expense = await createCheckoutExpense({
      groupId: Number(proposal.grupo_id),
      localUserId,
      amount,
      category: 'hospedaje',
      description: `Reserva de hospedaje: ${proposal.titulo} (${folio})`,
      documentId: String(document.id),
    });

    await NotificationsService.createNotificationForGroupMembers(
      Number(proposal.grupo_id),
      Number(localUserId),
      {
        tipo: 'reserva_hospedaje_simulada',
        titulo: 'Hospedaje reservado en simulación',
        mensaje: `Se generó el voucher simulado para "${proposal.titulo}".`,
        entidadTipo: 'propuesta',
        entidadId: proposalId,
        metadata: { folio, documentId: document.id, expenseId: expense?.id ?? null, emailSent },
      },
    );

    emitCheckoutUpdated({ groupId: Number(proposal.grupo_id), proposalId, type: 'hospedaje', status: 'confirmada_simulada', folio });
    emitDashboardUpdated({ groupId: Number(proposal.grupo_id), tipo: 'checkout_hospedaje', entidadTipo: 'propuesta', entidadId: proposalId, metadata: { folio, documentId: document.id, expenseId: expense?.id ?? null, emailSent } });

    await releaseProposalCheckoutLock(proposalId, localUserId);

    return { folio, status: 'confirmada_simulada', document, payment, expense, emailSent };
  } catch (error) {
    await releaseProposalCheckoutLock(proposalId, localUserId);
    throw error;
  }
};
