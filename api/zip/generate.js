import archiver from 'archiver';
import { cors } from '../lib/cors.js';

export default function handler(req, res) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}.zip"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const file of files) {
      archive.append(file.content, { name: file.name });
    }

    archive.finalize();
  } catch (error) {
    console.error('ZIP generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate ZIP' });
  }
}
