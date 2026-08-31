export type RoleName = "SUPER_ADMIN" | "ADMIN" | "USER";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  role: RoleName;
  createdAt: string;
  permissions?: string[];
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  _count?: { experiences: number };
};

export type ExperienceStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED";

export type Experience = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  price: string | number;
  location: string;
  latitude: string | number | null;
  longitude: string | number | null;
  imageUrl: string | null;
  status: ExperienceStatus;
  createdBy: string;
  createdAt: string;
  category?: Category;
};

export type Role = {
  id: string;
  name: string;
  permissions: Array<{ permission: { id: string; name: string } }>;
  _count?: { users: number };
};

export type Permission = {
  id: string;
  name: string;
};

export type AuthUser = PublicUser;
export type Administrator = PublicUser;

export type DashboardStats = {
  users: number;
  admins: number;
  categories: number;
  experiences: number;
  published: number;
  recentLogs?: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
    user?: { name: string; email: string };
  }>;
};

export type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  error?: { code: string; message: string; details?: unknown };
};
