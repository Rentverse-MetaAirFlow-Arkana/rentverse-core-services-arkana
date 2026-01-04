import { Router } from 'express';
import { db } from '../../db';
import { userSignatures } from '../../db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Test endpoint untuk signature tanpa auth
router.get('/test-signature/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('Testing signature for user:', userId);
    
    const signatures = await db.select()
      .from(userSignatures)
      .where(eq(userSignatures.userId, userId));
    
    res.json({
      success: true,
      signatures,
      count: signatures.length
    });
    
  } catch (error) {
    console.error('Test signature error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Test insert signature
router.post('/test-signature/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [signature] = await db.insert(userSignatures).values({
      userId,
      signatureUrl: 'https://test.com/test-signature.png',
      fileName: 'test-signature.png',
      isActive: true,
    }).returning();
    
    res.json({
      success: true,
      signature
    });
    
  } catch (error) {
    console.error('Test insert error:', error);
    res.status(500).json({ error: 'Insert failed' });
  }
});

export default router;
