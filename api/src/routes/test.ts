import { Router, Request, Response } from 'express';
import { sentEmails } from '../lib/email';
import { config } from '../config';

const router = Router();

router.get('/test/emails', (_req: Request, res: Response) => {
  if (!config.mockEmail) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(sentEmails);
});

router.post('/test/emails/clear', (_req: Request, res: Response) => {
  if (!config.mockEmail) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  sentEmails.length = 0;
  res.json({ message: 'Emails cleared' });
});

export default router;
