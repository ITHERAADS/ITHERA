import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('RESEND_API_KEY no está configurada');
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

function getMailFrom(): string {
  const mailFrom = process.env.MAIL_FROM?.trim();

  if (!mailFrom) {
    throw new Error('MAIL_FROM no está configurado');
  }

  // Acepta:
  // 1) email@dominio.com
  // 2) Nombre <email@dominio.com>
  const emailOnlyRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  const namedEmailRegex = /^.+\s<[^<>\s@]+@[^\s@<>]+\.[^\s@<>]+>$/;

  if (!emailOnlyRegex.test(mailFrom) && !namedEmailRegex.test(mailFrom)) {
    throw new Error(
      'MAIL_FROM debe tener formato "email@dominio.com" o "Nombre <email@dominio.com>"'
    );
  }

  return mailFrom;
}

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const resend = getResendClient();
  const from = getMailFrom();

  try {
    const response = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    return response;
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
};