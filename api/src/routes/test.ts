import { Router, Request, Response } from 'express';
import { sentEmails } from '../lib/email';
import { config } from '../config';
import { logger } from '../lib/logger';

const router = Router();

router.get('/test/emails', (_req: Request, res: Response) => {
  try {
    if (!config.mockEmail) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(sentEmails);
  } catch (err) {
    logger.error(err, 'Test emails error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

router.post('/test/emails/clear', (_req: Request, res: Response) => {
  try {
    if (!config.mockEmail) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    sentEmails.length = 0;
    res.json({ message: 'Emails cleared' });
  } catch (err) {
    logger.error(err, 'Test emails clear error');
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
