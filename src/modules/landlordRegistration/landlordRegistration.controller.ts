import { Request, Response } from 'express';
import { db } from '../../config/database';
import { landlordRegistrations, users } from '../../db/schema';
import { eq, desc } from 'drizzle-orm';

export class LandlordRegistrationController {
  
  // User registers as landlord
  async registerAsLandlord(req: Request, res: Response) {
    try {
      const {
        businessName,
        businessType,
        businessAddress,
        businessPhone,
        businessEmail,
        taxId,
        bankAccountName,
        bankAccountNumber,
        bankName,
        identityCardUrl = null,
        businessLicenseUrl = null,
        taxDocumentUrl = null
      } = req.body;

      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      // Check if user already has pending registration
      const existingRegistration = await db
        .select()
        .from(landlordRegistrations)
        .where(eq(landlordRegistrations.userId, userId))
        .limit(1);

      if (existingRegistration.length > 0) {
        const registration = existingRegistration[0];
        if (registration.status === 'PENDING') {
          return res.status(400).json({
            success: false,
            error: 'You already have a pending landlord registration'
          });
        }
        if (registration.status === 'APPROVED') {
          return res.status(400).json({
            success: false,
            error: 'You are already a registered landlord'
          });
        }
      }

      // Create new registration
      const [registration] = await db
        .insert(landlordRegistrations)
        .values({
          userId,
          businessName,
          businessType,
          businessAddress,
          businessPhone,
          businessEmail,
          taxId,
          bankAccountName,
          bankAccountNumber,
          bankName,
          identityCardUrl,
          businessLicenseUrl,
          taxDocumentUrl,
          status: 'PENDING'
        })
        .returning();

      res.status(201).json({
        success: true,
        message: 'Landlord registration submitted successfully. Please wait for admin approval.',
        data: {
          registrationId: registration.id,
          status: registration.status,
          submittedAt: registration.createdAt
        }
      });

    } catch (error) {
      console.error('Error registering landlord:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit landlord registration',
        details: (error as Error).message
      });
    }
  }

  // Get user's registration status
  async getMyRegistrationStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'User not authenticated'
        });
      }

      const registration = await db
        .select()
        .from(landlordRegistrations)
        .where(eq(landlordRegistrations.userId, userId))
        .orderBy(desc(landlordRegistrations.createdAt))
        .limit(1);

      if (registration.length === 0) {
        return res.json({
          success: true,
          data: {
            hasRegistration: false,
            status: null,
            message: 'No landlord registration found'
          }
        });
      }

      const reg = registration[0];
      res.json({
        success: true,
        data: {
          hasRegistration: true,
          registrationId: reg.id,
          status: reg.status,
          businessName: reg.businessName,
          submittedAt: reg.createdAt,
          approvedAt: reg.approvedAt,
          rejectedAt: reg.rejectedAt,
          rejectionReason: reg.rejectionReason
        }
      });

    } catch (error) {
      console.error('Error getting registration status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get registration status',
        details: (error as Error).message
      });
    }
  }

  // Admin: Get all registrations
  async getAllRegistrations(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = db
        .select({
          id: landlordRegistrations.id,
          userId: landlordRegistrations.userId,
          businessName: landlordRegistrations.businessName,
          businessType: landlordRegistrations.businessType,
          businessEmail: landlordRegistrations.businessEmail,
          status: landlordRegistrations.status,
          createdAt: landlordRegistrations.createdAt,
          approvedAt: landlordRegistrations.approvedAt,
          rejectedAt: landlordRegistrations.rejectedAt,
          // User info
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email
        })
        .from(landlordRegistrations)
        .leftJoin(users, eq(landlordRegistrations.userId, users.id))
        .orderBy(desc(landlordRegistrations.createdAt));

      if (status) {
        query = query.where(eq(landlordRegistrations.status, status as any));
      }

      const registrations = await query.limit(Number(limit)).offset(offset);

      res.json({
        success: true,
        data: {
          registrations,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: registrations.length
          }
        }
      });

    } catch (error) {
      console.error('Error getting registrations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get registrations',
        details: (error as Error).message
      });
    }
  }

  // Admin: Get registration details
  async getRegistrationById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const registration = await db
        .select({
          // Registration info
          id: landlordRegistrations.id,
          userId: landlordRegistrations.userId,
          businessName: landlordRegistrations.businessName,
          businessType: landlordRegistrations.businessType,
          businessAddress: landlordRegistrations.businessAddress,
          businessPhone: landlordRegistrations.businessPhone,
          businessEmail: landlordRegistrations.businessEmail,
          taxId: landlordRegistrations.taxId,
          bankAccountName: landlordRegistrations.bankAccountName,
          bankAccountNumber: landlordRegistrations.bankAccountNumber,
          bankName: landlordRegistrations.bankName,
          identityCardUrl: landlordRegistrations.identityCardUrl,
          businessLicenseUrl: landlordRegistrations.businessLicenseUrl,
          taxDocumentUrl: landlordRegistrations.taxDocumentUrl,
          status: landlordRegistrations.status,
          rejectionReason: landlordRegistrations.rejectionReason,
          createdAt: landlordRegistrations.createdAt,
          approvedAt: landlordRegistrations.approvedAt,
          rejectedAt: landlordRegistrations.rejectedAt,
          // User info
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
          userPhone: users.phone
        })
        .from(landlordRegistrations)
        .leftJoin(users, eq(landlordRegistrations.userId, users.id))
        .where(eq(landlordRegistrations.id, id))
        .limit(1);

      if (registration.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Registration not found'
        });
      }

      res.json({
        success: true,
        data: registration[0]
      });

    } catch (error) {
      console.error('Error getting registration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get registration',
        details: (error as Error).message
      });
    }
  }

  // Admin: Approve registration
  async approveRegistration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin not authenticated'
        });
      }

      // Get registration
      const registration = await db
        .select()
        .from(landlordRegistrations)
        .where(eq(landlordRegistrations.id, id))
        .limit(1);

      if (registration.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Registration not found'
        });
      }

      const reg = registration[0];

      if (reg.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'Registration is not pending'
        });
      }

      // Update registration status
      await db
        .update(landlordRegistrations)
        .set({
          status: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(landlordRegistrations.id, id));

      // Update user role to LANDLORD
      await db
        .update(users)
        .set({
          role: 'LANDLORD',
          updatedAt: new Date()
        })
        .where(eq(users.id, reg.userId));

      res.json({
        success: true,
        message: 'Registration approved successfully. User role updated to LANDLORD.'
      });

    } catch (error) {
      console.error('Error approving registration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to approve registration',
        details: (error as Error).message
      });
    }
  }

  // Admin: Reject registration
  async rejectRegistration(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;
      const adminId = req.user?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Admin not authenticated'
        });
      }

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required'
        });
      }

      // Get registration
      const registration = await db
        .select()
        .from(landlordRegistrations)
        .where(eq(landlordRegistrations.id, id))
        .limit(1);

      if (registration.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Registration not found'
        });
      }

      const reg = registration[0];

      if (reg.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          error: 'Registration is not pending'
        });
      }

      // Update registration status
      await db
        .update(landlordRegistrations)
        .set({
          status: 'REJECTED',
          rejectionReason,
          rejectedBy: adminId,
          rejectedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(landlordRegistrations.id, id));

      res.json({
        success: true,
        message: 'Registration rejected successfully.'
      });

    } catch (error) {
      console.error('Error rejecting registration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reject registration',
        details: (error as Error).message
      });
    }
  }
}

export default new LandlordRegistrationController();
