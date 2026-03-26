import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import questionRoutes from './routes/question.js';
import testcasesRoutes from './routes/testcases.js';
import jsonRoutes from './routes/json.js';
import zipRoutes from './routes/zip.js';
import uuidRoutes from './routes/uuid.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/question', questionRoutes);
app.use('/api/testcases', testcasesRoutes);
app.use('/api/json', jsonRoutes);
app.use('/api/zip', zipRoutes);
app.use('/api/uuid', uuidRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
