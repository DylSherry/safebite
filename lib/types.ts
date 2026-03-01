export type UserRole = "user" | "admin" | "moderator";

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  preferences?: {
    emailNotifications?: boolean;
    marketingEmails?: boolean;
    theme?: "light" | "dark";
  };
  allergies?: string[];
  wishlist?: string[];
  dietary?: {
    allergies?: string[];
    restrictions?: string[];
    cuisinePreferences?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface PermissionSet {
  canEdit: boolean;
  canDelete: boolean;
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canModerateContent: boolean;
  canManageProducts: boolean;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  price: number;
  stock?: number;
  image_url?: string;
  allergens?: string[];
  tags?: string[];
  ingredients?: string;
  /** 0-100 safety score derived from allergen list (higher is safer) */
  safety_score?: number;
  /** Approximate lifetime units sold – used to rank top sellers */
  salesCount?: number;
  /** Whether this product is currently on promotion */
  isOnPromotion?: boolean;
  /** Discounted price shown when isOnPromotion is true */
  promotionPrice?: number;
  /** Whether this product is manually featured by an admin */
  isFeatured?: boolean;
  /** Product category, e.g. "Snacks", "Beverages", "Dairy" */
  category?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
