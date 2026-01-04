import express from 'express';
import multer from 'multer';
import { auth } from '../../middleware/auth';
import fileUploadService from '../../utils/fileUpload';

const router = express.Router();

// Configure multer for mobile uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
  },
});

/**
 * @swagger
 * /api/v1/m/upload/single:
 *   post:
 *     summary: Upload single file (Mobile)
 *     tags: [Mobile - Upload]
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
 *     responses:
 *       200:
 *         description: File uploaded successfully
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

    const result = await fileUploadService.uploadFile(req.file, 'mobile-uploads');

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/v1/m/upload/multiple:
 *   post:
 *     summary: Upload multiple files (Mobile)
 *     tags: [Mobile - Upload]
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
 *     responses:
 *       200:
 *         description: Files uploaded successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/multiple', auth, upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files provided',
      });
    }

    const uploadPromises = files.map(file => 
      fileUploadService.uploadFile(file, 'mobile-uploads')
    );
    
    const results = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${results.length} files uploaded successfully`,
      data: results,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

router.post('/profile-picture', auth, upload.single('profilePicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No profile picture provided',
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed for profile pictures',
      });
    }

    const result = await fileUploadService.uploadFile(req.file, 'profile-pictures');

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
