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
  certifications?: string[];
  ingredients?: string;
  risk_level?: string;
  createdAt?: Date;
  updatedAt?: Date;
}
