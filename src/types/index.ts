import { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import {
  users,
  properties,
  propertyTypes,
  amenities,
  propertyAmenities,
  leases,
  propertyViews,
} from '../db/schema';

// User types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

// Property types
export type Property = InferSelectModel<typeof properties>;
export type NewProperty = InferInsertModel<typeof properties>;

// Property Type types
export type PropertyType = InferSelectModel<typeof propertyTypes>;
export type NewPropertyType = InferInsertModel<typeof propertyTypes>;

// Amenity types
export type Amenity = InferSelectModel<typeof amenities>;
export type NewAmenity = InferInsertModel<typeof amenities>;

// Property Amenity types
export type PropertyAmenity = InferSelectModel<typeof propertyAmenities>;
export type NewPropertyAmenity = InferInsertModel<typeof propertyAmenities>;

// Booking types
export type Booking = InferSelectModel<typeof leases>;
export type NewBooking = InferInsertModel<typeof leases>;

// Property View types
export type PropertyView = InferSelectModel<typeof propertyViews>;
export type NewPropertyView = InferInsertModel<typeof propertyViews>;

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth types
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

// Query types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PropertyQuery extends PaginationQuery {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  furnished?: boolean;
  propertyType?: string;
  search?: string;
  status?: 'PANDDING_REVIEW' | 'REJECTED' | 'APPROVED';
  ownerId?: string;
}
