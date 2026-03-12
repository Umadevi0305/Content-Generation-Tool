import archiver from 'archiver';

export function createZip(res, zipName, files) {
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
}
