import { randomUUID } from 'crypto';
import { Readable } from 'stream';
import fs from 'fs/promises';
import path from 'path';
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from '@workspace/api-zod';
import { Router, type IRouter, type Request, type Response } from 'express';
import multer from 'multer';

import { ObjectStorageService, objectStorageClient } from '../lib/objectStorage';
import { ObjectNotFoundError } from '../lib/objectStorage';

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// Local fallback directory (used when GCS is unavailable in dev).
// NEVER used in production: files on the local filesystem are lost on redeploy,
// so in production a GCS failure is a hard error instead of a silent fallback.
const LOCAL_UPLOAD_DIR = path.join(process.cwd(), '.local-uploads');
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

async function saveLocally(id: string, buffer: Buffer, mimeType: string): Promise<void> {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, id), buffer);
  await fs.writeFile(path.join(LOCAL_UPLOAD_DIR, `${id}.meta`), mimeType);
}

async function readLocally(id: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    const buffer = await fs.readFile(path.join(LOCAL_UPLOAD_DIR, id));
    let mimeType = 'application/octet-stream';
    try { mimeType = await fs.readFile(path.join(LOCAL_UPLOAD_DIR, `${id}.meta`), 'utf8'); } catch {}
    return { buffer, mimeType };
  } catch {
    return null;
  }
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const slashIdx = p.indexOf('/');
  if (slashIdx === -1) return { bucketName: p, objectName: '' };
  return { bucketName: p.slice(0, slashIdx), objectName: p.slice(slashIdx + 1) };
}

/**
 * POST /storage/uploads
 *
 * Direct multipart file upload. Tries GCS first; falls back to local filesystem
 * when GCS credentials are unavailable (e.g. in development).
 */
router.post(
  '/storage/uploads',
  upload.single('file'),
  async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const objectId = randomUUID();

    // --- Try GCS first ---
    try {
      const privateObjectDir = objectStorageService.getPrivateObjectDir();
      const fullPath = `${privateObjectDir}/uploads/${objectId}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);

      const gcsFile = objectStorageClient.bucket(bucketName).file(objectName);
      await gcsFile.save(file.buffer, {
        contentType: file.mimetype || 'application/octet-stream',
        resumable: false,
      });

      res.json({ objectPath: `/objects/uploads/${objectId}` });
      return;
    } catch (gcsError) {
      if (IS_PRODUCTION) {
        // In production the local filesystem is ephemeral — never fall back.
        req.log.error({ err: gcsError }, 'GCS upload failed in production');
        res.status(500).json({ error: 'Failed to upload file to object storage' });
        return;
      }
      req.log.warn({ err: gcsError }, 'GCS upload failed — falling back to local filesystem (dev only)');
    }

    // --- Local filesystem fallback (development only) ---
    try {
      await saveLocally(objectId, file.buffer, file.mimetype || 'application/octet-stream');
      res.json({ objectPath: `/objects/uploads/${objectId}`, _local: true });
    } catch (localError) {
      req.log.error({ err: localError }, 'Local upload also failed');
      res.status(500).json({ error: 'Failed to upload file' });
    }
  },
);

/**
 * POST /storage/uploads/request-url
 */
router.post(
  '/storage/uploads/request-url',
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Missing or invalid required fields' });
      return;
    }

    try {
      const { name, size, contentType } = parsed.data;

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
    } catch (error) {
      req.log.error({ err: error }, 'Error generating upload URL');
      res.status(500).json({ error: 'Failed to generate upload URL' });
    }
  },
);

/**
 * GET /storage/public-objects/*
 */
router.get(
  '/storage/public-objects/*filePath',
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join('/') : raw;
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        res.status(404).json({ error: 'File not found' });
        return;
      }

      const response = await objectStorageService.downloadObject(file);

      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));

      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      req.log.error({ err: error }, 'Error serving public object');
      res.status(500).json({ error: 'Failed to serve public object' });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serves files from GCS, falling back to the local filesystem when GCS is unavailable.
 */
router.get('/storage/objects/*path', async (req: Request, res: Response) => {
  const raw = req.params.path;
  const wildcardPath = Array.isArray(raw) ? raw.join('/') : raw;
  const objectPath = `/objects/${wildcardPath}`;

  // --- Try GCS first ---
  try {
    const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
    const response = await objectStorageService.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(
        response.body as ReadableStream<Uint8Array>,
      );
      nodeStream.pipe(res);
    } else {
      res.end();
    }
    return;
  } catch (gcsError) {
    if (!(gcsError instanceof ObjectNotFoundError)) {
      req.log.warn({ err: gcsError }, 'GCS serve failed — trying local fallback');
    }
  }

  // --- Local filesystem fallback (development only) ---
  // wildcardPath is like "uploads/<uuid>"
  const localId = wildcardPath.replace(/^uploads\//, '');
  const local = IS_PRODUCTION ? null : await readLocally(localId);
  if (local) {
    res.set('Content-Type', local.mimeType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(local.buffer);
    return;
  }

  res.status(404).json({ error: 'Object not found' });
});

export default router;
