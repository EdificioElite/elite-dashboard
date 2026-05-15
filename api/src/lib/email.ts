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

export async function sendInviteEmail(to: string, piso: string, token: string) {
  const url = `${config.frontendUrl}/registro?token=${token}`;
  if (config.mockEmail) {
    sentEmails.push({ to, subject: 'Invitación', text: '', html: '', url, token, sentAt: new Date() });
    return;
  }
  await transporter.sendMail({
    from: `"Edificio Elite" <${config.smtpUser}>`,
    to,
    subject: 'Invitación para registrarte en el Dashboard de Edificio Elite',
    text: `Hola vecino del piso ${piso},\n\nHas sido invitado a registrarte en el dashboard del Edificio Elite. Haz clic en el siguiente enlace para completar tu registro:\n\n${url}\n\nEste enlace expirará en 30 días.\n\nSaludos,\nEdificio Elite`,
    html: `<p>Hola vecino del piso <strong>${piso}</strong>,</p>
<p>Has sido invitado a registrarte en el dashboard del Edificio Elite. Haz clic en el siguiente enlace para completar tu registro:</p>
<p><a href="${url}">${url}</a></p>
<p>Este enlace expirará en 30 días.</p>
<p>Saludos,<br>Edificio Elite</p>`,
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
    subject: 'Recuperación de contraseña - Edificio Elite',
    text: `Hola,\n\nHas solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para establecer una nueva contraseña:\n\n${url}\n\nEste enlace expirará en 1 hora.\n\nSi no solicitaste este cambio, ignora este email.\n\nSaludos,\nEdificio Elite`,
    html: `<p>Hola,</p>
<p>Has solicitado restablecer tu contraseña. Haz clic en el siguiente enlace para establecer una nueva contraseña:</p>
<p><a href="${url}">${url}</a></p>
<p>Este enlace expirará en 1 hora.</p>
<p>Si no solicitaste este cambio, ignora este email.</p>
<p>Saludos,<br>Edificio Elite</p>`,
  });
}
