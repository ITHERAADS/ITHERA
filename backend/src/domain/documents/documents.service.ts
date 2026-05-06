import { supabaseAdmin } from '../../infrastructure/db/supabase.client';
import { TripDocument } from './documents.entity';

const BUCKET = 'trip-documents';

/** Verifica si un usuario pertenece al grupo antes de cualquier operación */
async function assertUserIsMember(tripId: string | number, userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('grupo_miembros')
    .select('id')
    .eq('grupo_id', tripId)
    .eq('usuario_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('No tienes acceso a este grupo de viaje');
}

export const uploadDocument = async (data: {
  tripId: string | number;
  userId: string;
  fileBuffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
  category: string;
}): Promise<TripDocument> => {
  await assertUserIsMember(data.tripId, data.userId);

  const timestamp = Date.now();
  const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${data.tripId}/${timestamp}-${safeName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath, data.fileBuffer, {
      contentType: data.mimeType,
      upsert: false,
    });

  if (uploadError) throw new Error(`Error en Storage: ${uploadError.message}`);

  const { data: publicUrlData } = supabaseAdmin.storage
    .from(BUCKET)
    .getPublicUrl(storagePath);

  const { data: doc, error: dbError } = await supabaseAdmin
    .from('trip_documents')
    .insert({
      trip_id: data.tripId,
      user_id: data.userId,
      file_name: data.fileName,
      file_path: storagePath,
      file_url: publicUrlData.publicUrl,
      mime_type: data.mimeType,
      file_size: data.fileSize,
      category: data.category,
    })
    .select()
    .single();

  if (dbError) {
    await supabaseAdmin.storage.from(BUCKET).remove([storagePath]);
    throw dbError;
  }

  return doc as TripDocument;
};

export const getDocumentsByTrip = async (
  tripId: string | number,
  userId: string
): Promise<TripDocument[]> => {
  await assertUserIsMember(tripId, userId);

  const { data, error } = await supabaseAdmin
    .from('trip_documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as TripDocument[];
};

export const deleteDocument = async (
  docId: string,
  tripId: string | number,
  userId: string
): Promise<void> => {
  await assertUserIsMember(tripId, userId);

  const { data: doc, error: fetchError } = await supabaseAdmin
    .from('trip_documents')
    .select('*')
    .eq('id', docId)
    .single();

  if (fetchError || !doc) throw new Error('Documento no encontrado');
  if (doc.user_id !== userId) throw new Error('Solo el autor puede eliminar el documento');

  await supabaseAdmin.storage.from(BUCKET).remove([doc.file_path]);
  await supabaseAdmin.from('trip_documents').delete().eq('id', docId);
};
