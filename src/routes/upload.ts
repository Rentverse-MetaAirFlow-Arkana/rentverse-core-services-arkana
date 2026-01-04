import express from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import fileUploadService from '../utils/fileUpload';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * @swagger
 * /api/v1/upload/single:
 *   post:
 *     summary: Upload single file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               folder:
 *                 type: string
 *                 default: uploads
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/single', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided',
      });
    }

    const folder = req.body.folder || 'uploads';
    const result = await fileUploadService.uploadFile(req.file, folder);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     summary: Upload multiple files
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               folder:
 *                 type: string
 *                 default: uploads
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       400:
 *         description: Invalid files or validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const folder = req.body.folder || 'uploads';
    const results = await fileUploadService.uploadMultipleFiles(req.files, folder);

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: results,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/v1/upload/delete:
 *   delete:
 *     summary: Delete file
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - filePath
 *             properties:
 *               filePath:
 *                 type: string
 *     responses:
 *       200:
 *         description: File deleted successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.delete('/delete', auth, async (req, res) => {
  try {
    const { filePath, fileUrl } = req.body;
    const pathToDelete = filePath || fileUrl;

    if (!pathToDelete) {
      return res.status(400).json({
        success: false,
        error: 'File path is required',
      });
    }

    const result = await fileUploadService.deleteFile(pathToDelete);

    res.json({
      success: true,
      message: 'File deleted successfully',
      data: result,
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
