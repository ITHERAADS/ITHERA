const API_URL = import.meta.env.VITE_API_URL as string

export type TripDocumentCategory = 'vuelo' | 'hospedaje' | 'gasto' | 'actividad' | 'otro'

export interface TripDocument {
  id: string
  trip_id: string | number
  user_id: string
  file_name: string
  file_path: string
  file_url: string
  mime_type?: string
  file_size?: number
  category: string
  metadata?: {
    linked_entity_type?: string | null
    linked_entity_id?: string | null
    person_reference?: string | null
    expense_reason?: string | null
    expense_amount?: number | null
    notes?: string | null
    [key: string]: unknown
  }
  created_at?: string
}

export interface DocumentMetadataInput {
  linked_entity_type?: string | null
  linked_entity_id?: string | null
  person_reference?: string | null
  person_references?: string[] | null
  expense_reason?: string | null
  expense_amount?: number | null
  notes?: string | null
  immutable?: boolean
  immutable_kind?: string | null
  receipt_debtor_user_id?: string | null
  receipt_creditor_user_id?: string | null
  receipt_folio?: string | null
}

const authHeaders = (token?: string): Record<string, string> => (
  token ? { Authorization: `Bearer ${token}` } : {}
)

const resolveApiRoots = (): string[] => {
  const normalized = API_URL.replace(/\/+$/, '')
  const roots = [normalized]

  if (normalized.endsWith('/groups')) {
    roots.push(normalized.slice(0, -'/groups'.length))
  }

  return Array.from(new Set(roots))
}

const endpointsForTrip = (tripId: string) => [
  `/documents/${tripId}`,
  `/groups/${tripId}/documents`,
  `/groups/${tripId}/vault`,
]

const toErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const contentType = response.headers.get('content-type') ?? ''
  const isJson = contentType.toLowerCase().includes('application/json')
  const raw = await response.text()

  if (isJson && raw) {
    try {
      const parsed = JSON.parse(raw) as { error?: string; details?: string }
      return parsed.error || parsed.details || fallback
    } catch {
      return fallback
    }
  }

  return raw || fallback
}

export const documentsService = {
  async list(tripId: string, token: string): Promise<TripDocument[]> {
    const endpoints = endpointsForTrip(tripId)
    const roots = resolveApiRoots()
    let lastError = 'No se pudieron cargar los documentos'

    for (const root of roots) {
      for (const endpoint of endpoints) {
        const response = await fetch(`${root}${endpoint}`, {
          method: 'GET',
          headers: {
            ...authHeaders(token),
          },
        })

        if (response.ok) {
          const payload = (await response.json()) as { documents?: TripDocument[] }
          return payload.documents ?? []
        }

        const message = await toErrorMessage(response, 'No se pudieron cargar los documentos')
        lastError = message
        const looksLikeWrongBase =
          message.includes('invalid input syntax for type bigint: "documents"')
        if (looksLikeWrongBase) continue
        if (response.status !== 404 && !message.includes('Cannot GET')) {
          break
        }
      }
    }

    throw new Error(lastError)
  },

  async upload(
    tripId: string,
    file: File,
    category: TripDocumentCategory,
    metadata: DocumentMetadataInput,
    token: string,
  ): Promise<TripDocument> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('category', category)
    if (metadata.linked_entity_type) formData.append('linked_entity_type', metadata.linked_entity_type)
    if (metadata.linked_entity_id) formData.append('linked_entity_id', metadata.linked_entity_id)
    if (metadata.person_reference) formData.append('person_reference', metadata.person_reference)
    if (metadata.person_references?.length) formData.append('person_references', JSON.stringify(metadata.person_references))
    if (metadata.expense_reason) formData.append('expense_reason', metadata.expense_reason)
    if (metadata.expense_amount != null) formData.append('expense_amount', String(metadata.expense_amount))
    if (metadata.notes) formData.append('notes', metadata.notes)
    if (metadata.immutable != null) formData.append('immutable', String(metadata.immutable))
    if (metadata.immutable_kind) formData.append('immutable_kind', metadata.immutable_kind)
    if (metadata.receipt_debtor_user_id) formData.append('receipt_debtor_user_id', metadata.receipt_debtor_user_id)
    if (metadata.receipt_creditor_user_id) formData.append('receipt_creditor_user_id', metadata.receipt_creditor_user_id)
    if (metadata.receipt_folio) formData.append('receipt_folio', metadata.receipt_folio)

    const endpoints = endpointsForTrip(tripId)
    const roots = resolveApiRoots()
    let lastError = 'No se pudo subir el documento'

    for (const root of roots) {
      for (const endpoint of endpoints) {
        const response = await fetch(`${root}${endpoint}`, {
          method: 'POST',
          headers: {
            ...authHeaders(token),
          },
          body: formData,
        })

        if (response.ok) {
          const payload = (await response.json()) as { document: TripDocument }
          return payload.document
        }

        const message = await toErrorMessage(response, 'No se pudo subir el documento')
        lastError = message
        const looksLikeWrongBase =
          message.includes('invalid input syntax for type bigint: "documents"')
        if (looksLikeWrongBase) continue
        if (response.status !== 404 && !message.includes('Cannot POST')) {
          break
        }
      }
    }

    throw new Error(lastError)
  },

  async remove(tripId: string, docId: string, token: string): Promise<void> {
    const roots = resolveApiRoots()
    const endpoints = [
      `/documents/${tripId}/${docId}`,
      `/groups/${tripId}/documents/${docId}`,
      `/groups/${tripId}/vault/${docId}`,
    ]

    let lastError = 'No se pudo eliminar el documento'
    for (const root of roots) {
      for (const endpoint of endpoints) {
        const response = await fetch(`${root}${endpoint}`, {
          method: 'DELETE',
          headers: {
            ...authHeaders(token),
          },
        })

        if (response.ok) return

        const message = await toErrorMessage(response, 'No se pudo eliminar el documento')
        lastError = message
        const looksLikeWrongBase =
          message.includes('invalid input syntax for type bigint: "documents"')
        if (looksLikeWrongBase) continue
        if (response.status !== 404 && !message.includes('Cannot DELETE')) {
          break
        }
      }
    }

    throw new Error(lastError)
  },
}
