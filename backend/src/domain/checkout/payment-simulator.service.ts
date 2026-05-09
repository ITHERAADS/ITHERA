import { SimulatedCheckoutPayload, SimulatedPaymentResult } from './checkout.entity';

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const luhnCheck = (cardNumber: string): boolean => {
  const digits = onlyDigits(cardNumber);
  let sum = 0;
  let doubleDigit = false;

  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return digits.length >= 13 && sum % 10 === 0;
};

const buildAuthorizationCode = (): string => {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `AUTH-${suffix}`;
};

export const validateSimulatedPaymentPayload = (payload: SimulatedCheckoutPayload): void => {
  if (!payload.cardHolder?.trim()) throw new Error('El nombre del titular es obligatorio');
  if (!payload.email?.trim()) throw new Error('El correo de confirmacion es obligatorio');
  if (!payload.cardNumber?.trim()) throw new Error('El numero de tarjeta es obligatorio');
  if (!payload.expirationMonth?.trim() || !payload.expirationYear?.trim()) {
    throw new Error('La fecha de expiracion es obligatoria');
  }
  if (!payload.cvv?.trim()) throw new Error('El CVV es obligatorio');

  const cleanCvv = onlyDigits(payload.cvv);
  if (cleanCvv.length < 3 || cleanCvv.length > 4) {
    throw new Error('El CVV debe tener 3 o 4 digitos');
  }
};

export const validateFakeCard = (payload: SimulatedCheckoutPayload): SimulatedPaymentResult => {
  validateSimulatedPaymentPayload(payload);

  const cleanCard = onlyDigits(payload.cardNumber);

  if (cleanCard === '4000000000000002') {
    return {
      approved: false,
      status: 'declined',
      message: 'Tarjeta rechazada en modo simulacion',
    };
  }

  if (cleanCard === '4000002500003155') {
    return {
      approved: false,
      status: 'requires_validation',
      message: 'La tarjeta requiere validacion adicional simulada',
    };
  }

  if (cleanCard !== '4242424242424242' && !luhnCheck(cleanCard)) {
    return {
      approved: false,
      status: 'declined',
      message: 'Numero de tarjeta invalido para la simulacion',
    };
  }

  return {
    approved: true,
    status: 'approved',
    message: 'Pago aprobado en modo simulacion',
    authorizationCode: buildAuthorizationCode(),
  };
};
