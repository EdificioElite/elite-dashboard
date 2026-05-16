import nodemailer from 'nodemailer';
import { config } from '../config';

export interface SentEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
  url: string;
  token: string;
  sentAt: Date;
}

export const sentEmails: SentEmail[] = [];

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

const emailStyles = `<style>
  body { font-family: Arial, sans-serif; color: #333; background-color: #f9f9f9; padding: 20px; }
  .container { background-color: #ffffff; border-radius: 8px; padding: 20px; max-width: 600px; margin: auto; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
  h2 { color: #005eaa; }
  p { font-size: 16px; line-height: 1.5; }
  .footer { margin-top: 30px; font-size: 14px; color: #888; }
  a { color: #005eaa; }
</style>`;

const frontendLink = config.frontendUrl;

const emailSignature = `Un saludo,

CP Edificio Elite (${frontendLink})
Este es un mensaje automático. Cualquier duda o sugerencia, responda a este email directamente.`;

const emailSignatureHtml = `<p>Un saludo,</p>
<p><strong>CP <a href="${frontendLink}">Edificio Elite</a></strong></p>
<div class="footer">
  Este es un mensaje automático. Cualquier duda o sugerencia, responda a este email directamente.
</div>`;

function wrapHtml(title: string, body: string): string {
  return `<html>
  <head>${emailStyles}</head>
  <body>
    <div class="container">
      ${title ? `<h2>${title}</h2>` : ''}
      ${body}
      ${emailSignatureHtml}
    </div>
  </body>
</html>`;
}

const replyTo = config.adminEmail || undefined;

export async function sendInviteEmail(to: string, piso: string, token: string) {
  const url = `${config.frontendUrl}/registro?token=${token}`;
  if (config.mockEmail) {
    sentEmails.push({ to, subject: 'Invitación', text: '', html: '', url, token, sentAt: new Date() });
    return;
  }
  await transporter.sendMail({
    from: `"Edificio Elite" <${config.smtpUser}>`,
    to,
    replyTo,
    subject: 'Invitación para registrarte en la página web del Edificio Elite',
    text: `Hola vecino del piso ${piso},\n\nHas sido invitado a registrarte en la página web del Edificio Elite (${frontendLink}). En ella podrás consultar tus consumos históricos y en tiempo real de aerotermia, tener a mano información relevante de la comunidad (horarios de piscina, contactos, etc.) y acceder a todas las actas de las juntas.\n\nHaz clic en el siguiente enlace para completar tu registro:\n\n${url}\n\nEste enlace expirará en 30 días.\n\n${emailSignature}`,
    html: wrapHtml('', `<p>Hola vecino del piso <strong>${piso}</strong>,</p>
<p>Has sido invitado a registrarte en la página web del <a href="${frontendLink}">Edificio Elite</a>. En ella podrás consultar tus consumos históricos y en tiempo real de aerotermia, tener a mano información relevante de la comunidad (horarios de piscina, contactos, etc.) y acceder a todas las actas de las juntas.</p>
<p>Haz clic en el siguiente enlace para completar tu registro:</p>
<p><a href="${url}">${url}</a></p>
<p>Este enlace expirará en 30 días.</p>`),
  });
}

export async function sendResetEmail(to: string, token: string) {
  const url = `${config.frontendUrl}/resetear-contrasena?token=${token}`;
  if (config.mockEmail) {
    sentEmails.push({ to, subject: 'Reset', text: '', html: '', url, token, sentAt: new Date() });
    return;
  }
  await transporter.sendMail({
    from: `"Edificio Elite" <${config.smtpUser}>`,
    to,
    replyTo,
    subject: 'Recuperación de contraseña - Edificio Elite',
    text: `Hola,\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para establecer una nueva contraseña:\n\n${url}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, ignora este email.\n\n${emailSignature}`,
    html: wrapHtml('', `<p>Hola,</p>
<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
<p><a href="${url}">${url}</a></p>
<p>Este enlace expirará en 1 hora.</p>
<p>Si no solicitaste este cambio, ignora este email.</p>`),
  });
}
