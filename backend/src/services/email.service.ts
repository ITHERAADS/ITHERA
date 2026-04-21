import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const response = await resend.emails.send({
      from: process.env.MAIL_FROM!,
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