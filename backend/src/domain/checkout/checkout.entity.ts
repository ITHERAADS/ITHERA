export type CheckoutKind = 'vuelo' | 'hospedaje';

export interface SimulatedCheckoutPayload {
  cardHolder: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
  email: string;
  phone?: string | null;
  passengers?: Array<{
    fullName: string;
    documentNumber?: string | null;
  }>;
  guests?: Array<{
    fullName: string;
    documentNumber?: string | null;
  }>;
  notes?: string | null;
}

export interface SimulatedPaymentResult {
  approved: boolean;
  status: 'approved' | 'declined' | 'requires_validation';
  message: string;
  authorizationCode?: string;
}
