import { Router } from 'express';
import { createZip } from '../services/zipBuilder.js';

const router = Router();

router.post('/generate', (req, res) => {
  try {
    const { zipName, appCode, envContent, requirementsContent } = req.body;

    if (!zipName || !appCode) {
      return res.status(400).json({ error: 'ZIP name and app code are required' });
    }

    const files = [
      { name: 'app.py', content: appCode },
      { name: '.env', content: envContent || '' },
    ];

    if (requirementsContent && requirementsContent.trim()) {
      files.push({ name: 'requirements.txt', content: requirementsContent });
    }

    createZip(res, zipName, files);
  } catch (error) {
    console.error('ZIP generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ZIP' });
  }
});

export default router;
