import { Router } from 'express';

const router = Router();

router.get('/generate', async (req, res) => {
  try {
    const count = Math.max(1, Math.min(50, parseInt(req.query.count) || 5));
    const response = await fetch(`https://www.uuidgenerator.net/api/version4/${count}`);
    if (!response.ok) {
      throw new Error(`UUID generator returned ${response.status}`);
    }
    const text = await response.text();
    const uuids = text.trim().split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    res.json({ uuids });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to generate UUIDs' });
  }
});

export default router;
