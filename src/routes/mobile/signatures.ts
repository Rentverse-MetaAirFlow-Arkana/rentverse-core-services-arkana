import express from 'express';
import multer from 'multer';
import { auth } from '../../middleware/auth';
import fileUploadService from '../../utils/fileUpload';
import { db } from '../../config/database';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Configure multer for signature uploads
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Upload signature
router.post('/upload', auth, upload.single('signature'), async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No signature file provided',
      });
    }

    // Validate image file
    if (!req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        error: 'Only image files are allowed for signatures',
      });
    }

    // Deactivate existing signatures
    try {
      await db.execute(sql`UPDATE user_signatures SET "isActive" = false WHERE "userId" = ${userId}`);
    } catch (error) {
      console.log('No existing signatures to deactivate');
    }

    // Upload to storage
    const result = await fileUploadService.uploadSignature(req.file, 'signatures');
    console.log('File uploaded successfully:', result.url);

    // Save to database with simpler approach
    console.log('Saving to database for user:', userId);
    await db.execute(sql`
      INSERT INTO user_signatures ("userId", "signatureUrl", "fileName", "isActive") 
      VALUES (${userId}, ${result.url}, ${req.file.originalname}, true)
    `);
    console.log('Database insert completed');

    // Get the inserted signature
    console.log('Retrieving saved signature...');
    const getResult = await db.execute(sql`
      SELECT id, "signatureUrl", "fileName", "createdAt" 
      FROM user_signatures 
      WHERE "userId" = ${userId} AND "isActive" = true 
      ORDER BY "createdAt" DESC 
      LIMIT 1
    `);
    console.log('Query result:', getResult);
    console.log('Query result rows:', getResult.rows);
    console.log('Query result length:', getResult.rows?.length);

    // Check different possible formats
    const signature = getResult.rows?.[0] || getResult[0] || (Array.isArray(getResult) ? getResult[0] : null);
    console.log('Signature data:', signature);

    if (!signature) {
      throw new Error('Failed to retrieve saved signature');
    }

    res.json({
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        id: signature.id,
        signatureUrl: signature.signatureUrl,
        fileName: signature.fileName,
        createdAt: signature.createdAt,
      }
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// Get user's signature
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await db.execute(sql`
      SELECT id, "signatureUrl", "fileName", "createdAt" 
      FROM user_signatures 
      WHERE "userId" = ${userId} AND "isActive" = true 
      LIMIT 1
    `);

    console.log('Get signature result:', result);

    // Check different possible formats
    const signature = result.rows?.[0] || result[0] || (Array.isArray(result) ? result[0] : null);

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'No active signature found'
      });
    }

    res.json({
      success: true,
      data: {
        id: signature.id,
        signatureUrl: signature.signatureUrl,
        fileName: signature.fileName,
        createdAt: signature.createdAt,
      }
    });

  } catch (error) {
    console.error('Get signature error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

// Delete signature
router.delete('/:signatureId', auth, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { signatureId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    const result = await db.execute(sql`
      SELECT "signatureUrl" FROM user_signatures 
      WHERE id = ${signatureId} AND "userId" = ${userId}
      LIMIT 1
    `);

    console.log('Delete signature result:', result);

    // Check different possible formats
    const signature = result.rows?.[0] || result[0] || (Array.isArray(result) ? result[0] : null);

    if (!signature) {
      return res.status(404).json({
        success: false,
        error: 'Signature not found'
      });
    }

    // Delete from storage
    const fileName = signature.signatureUrl.split('/').pop();
    if (fileName) {
      try {
        await fileUploadService.deleteFile(fileName);
      } catch (error) {
        console.log('File delete error (continuing):', error);
      }
    }

    // Delete from database
    await db.execute(sql`DELETE FROM user_signatures WHERE id = ${signatureId}`);

    res.json({
      success: true,
      message: 'Signature deleted successfully'
    });

  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(400).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
