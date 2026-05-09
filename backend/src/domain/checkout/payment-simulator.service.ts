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

  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
};

const hasTooManyConsecutiveEqualDigits = (digits: string, limit = 3): boolean => {
  let streak = 1;
  for (let i = 1; i < digits.length; i += 1) {
    streak = digits[i] === digits[i - 1] ? streak + 1 : 1;
    if (streak > limit) return true;
  }
  return false;
};

const isSameDigitRepeated = (digits: string): boolean => /^([0-9])\1+$/.test(digits);

const validateExpiry = (monthValue: string, yearValue: string): void => {
  const month = Number(onlyDigits(monthValue));
  const yearDigits = onlyDigits(yearValue);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const fullYear = yearDigits.length === 2 ? Number(`20${yearDigits}`) : Number(yearDigits);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('El mes de vencimiento debe estar entre 01 y 12');
  }

  if (!Number.isInteger(fullYear) || fullYear < currentYear) {
    throw new Error('El año de vencimiento no puede estar vencido');
  }

  if (fullYear === currentYear && month < currentMonth) {
    throw new Error('La tarjeta no puede estar vencida');
  }

  if (fullYear > currentYear + 10) {
    throw new Error('La vigencia no puede superar 10 años hacia adelante');
  }
};

const validateEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const buildAuthorizationCode = (): string => {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `AUTH-${suffix}`;
};

export const validateSimulatedPaymentPayload = (payload: SimulatedCheckoutPayload): void => {
  if (!payload.cardHolder?.trim()) throw new Error('El nombre del titular es obligatorio');
  if (!payload.email?.trim()) throw new Error('El correo para recibir los boletos es obligatorio');
  if (!validateEmail(payload.email)) throw new Error('El correo para recibir los boletos no es valido');
  if (!payload.cardNumber?.trim()) throw new Error('El numero de tarjeta es obligatorio');
  if (!payload.expirationMonth?.trim() || !payload.expirationYear?.trim()) {
    throw new Error('La fecha de expiracion es obligatoria');
  }
  if (!payload.cvv?.trim()) throw new Error('El CVV es obligatorio');

  const cleanCard = onlyDigits(payload.cardNumber);
  const cleanCvv = onlyDigits(payload.cvv);

  if (cleanCard.length < 13 || cleanCard.length > 19) {
    throw new Error('El numero de tarjeta debe tener entre 13 y 19 digitos');
  }

  if (isSameDigitRepeated(cleanCard)) {
    throw new Error('El numero de tarjeta no puede estar formado por un solo digito repetido');
  }

  if (hasTooManyConsecutiveEqualDigits(cleanCard)) {
    throw new Error('El numero de tarjeta no puede contener mas de 3 digitos iguales consecutivos');
  }

  if (!luhnCheck(cleanCard)) {
    throw new Error('El numero de tarjeta no pasa la validacion Luhn');
  }

  validateExpiry(payload.expirationMonth, payload.expirationYear);

  if (cleanCvv.length < 3 || cleanCvv.length > 4) {
    throw new Error('El CVV debe tener 3 o 4 digitos');
  }

  if (isSameDigitRepeated(cleanCvv)) {
    throw new Error('El CVV no puede estar formado por digitos iguales');
  }
};

export const validateFakeCard = (payload: SimulatedCheckoutPayload): SimulatedPaymentResult => {
  validateSimulatedPaymentPayload(payload);

  const cleanCard = onlyDigits(payload.cardNumber);

  if (cleanCard === '4000000000000002') {
    return {
      approved: false,
      status: 'declined',
      message: 'Tarjeta rechazada por el banco emisor',
    };
  }

  if (cleanCard === '4000002500003155') {
    return {
      approved: false,
      status: 'requires_validation',
      message: 'La tarjeta requiere validacion adicional',
    };
  }

  return {
    approved: true,
    status: 'approved',
    message: 'Pago aprobado',
    authorizationCode: buildAuthorizationCode(),
  };
};
