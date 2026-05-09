import { apiClient } from './apiClient'

export type CheckoutPerson = {
  fullName: string
  documentNumber?: string | null
}

export interface SimulatedCheckoutPayload {
  cardHolder: string
  cardNumber: string
  expirationMonth: string
  expirationYear: string
  cvv: string
  email: string
  phone?: string | null
  passengers?: CheckoutPerson[]
  guests?: CheckoutPerson[]
  notes?: string | null
}

export interface SimulatedCheckoutResult {
  folio: string
  status: string
  document?: {
    id?: string
    file_url?: string
    file_name?: string
  }
  payment?: {
    approved: boolean
    status: string
    message: string
    authorizationCode?: string
  }
}

type CheckoutResponse = {
  ok: boolean
  message: string
  data: SimulatedCheckoutResult
}

export const checkoutService = {
  simulateFlightPayment: async (
    proposalId: string,
    body: SimulatedCheckoutPayload,
    token: string,
  ) => {
    return apiClient.post<CheckoutResponse>(
      `/checkout/flight/${proposalId}/pay`,
      body,
      token,
    )
  },

  simulateHotelReservation: async (
    proposalId: string,
    body: SimulatedCheckoutPayload,
    token: string,
  ) => {
    return apiClient.post<CheckoutResponse>(
      `/checkout/hotel/${proposalId}/reserve`,
      body,
      token,
    )
  },
}
