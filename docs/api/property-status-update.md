# Property Status Update API

## Endpoint
```
PATCH /api/v1/properties/:id/status
```

## Description
Update property listing status. Available for property owners and administrators.

## Authentication
- **Required**: Bearer Token
- **Permissions**: Property owner or ADMIN role

## Request Parameters

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Property UUID |

### Request Body
```json
{
  "status": "APPROVED"
}
```

| Field | Type | Required | Description | Valid Values |
|-------|------|----------|-------------|--------------|
| `status` | string | Yes | New property status | `PENDING_REVIEW`, `APPROVED`, `REJECTED` |

## Response

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Modern Apartment in KL",
    "status": "APPROVED",
    "updatedAt": "2026-01-19T12:22:51.000Z",
    "ownerId": "550e8400-e29b-41d4-a716-446655440001",
    // ... other property fields
  },
  "message": "Property status updated successfully"
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "success": false,
  "error": "Validation failed",
  "details": "Status must be PENDING_REVIEW, APPROVED, or REJECTED"
}
```

#### 401 - Unauthorized
```json
{
  "success": false,
  "error": "Access token required"
}
```

#### 403 - Forbidden
```json
{
  "success": false,
  "error": "You do not have permission to update this property status"
}
```

#### 404 - Not Found
```json
{
  "success": false,
  "error": "Property not found"
}
```

## Status Values

| Status | Description |
|--------|-------------|
| `PENDING_REVIEW` | Property awaiting admin review |
| `APPROVED` | Property approved and visible to users |
| `REJECTED` | Property rejected by admin |

## Usage Examples

### Approve Property (Admin)
```bash
curl -X PATCH "http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "APPROVED"}'
```

### Reject Property (Admin)
```bash
curl -X PATCH "http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "REJECTED"}'
```

### Resubmit Property (Owner)
```bash
curl -X PATCH "http://localhost:3000/api/v1/properties/550e8400-e29b-41d4-a716-446655440000/status" \
  -H "Authorization: Bearer YOUR_OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "PENDING_REVIEW"}'
```

## Notes
- Property owners can only update their own properties
- Administrators can update any property status
- Status changes automatically update the `updatedAt` timestamp
- This endpoint is typically used in admin panels for property moderation
