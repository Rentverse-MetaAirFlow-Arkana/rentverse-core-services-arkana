-- SQL Query untuk membuat tabel landlord_registrations
-- Eksekusi query ini di database Anda

CREATE TYPE "LandlordRegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "landlord_registrations" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "businessName" VARCHAR(255) NOT NULL,
    "businessType" VARCHAR(100) NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "businessPhone" VARCHAR(20) NOT NULL,
    "businessEmail" VARCHAR(255) NOT NULL,
    "taxId" VARCHAR(50),
    "bankAccountName" VARCHAR(255) NOT NULL,
    "bankAccountNumber" VARCHAR(50) NOT NULL,
    "bankName" VARCHAR(100) NOT NULL,
    "identityCardUrl" TEXT,
    "businessLicenseUrl" TEXT,
    "taxDocumentUrl" TEXT,
    "status" "LandlordRegistrationStatus" DEFAULT 'PENDING' NOT NULL,
    "rejectionReason" TEXT,
    "approvedBy" TEXT REFERENCES "users"("id"),
    "approvedAt" TIMESTAMP,
    "rejectedBy" TEXT REFERENCES "users"("id"),
    "rejectedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create partial unique index for pending registrations
CREATE UNIQUE INDEX "unique_user_pending_registration" 
ON "landlord_registrations"("userId") 
WHERE "status" = 'PENDING';

-- Indexes for better performance
CREATE INDEX "idx_landlord_registrations_user_id" ON "landlord_registrations"("userId");
CREATE INDEX "idx_landlord_registrations_status" ON "landlord_registrations"("status");
CREATE INDEX "idx_landlord_registrations_created_at" ON "landlord_registrations"("createdAt");

-- Comments
COMMENT ON TABLE "landlord_registrations" IS 'Table for storing landlord registration applications';
COMMENT ON COLUMN "landlord_registrations"."status" IS 'Registration status: PENDING, APPROVED, REJECTED';
