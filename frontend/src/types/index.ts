export type RoleName = "SUPER_ADMIN" | "ADMIN" | "USER";

export type AvatarConfig = {
  version: 1;
  skinTone: string;
  face: string;
  hairStyle: string;
  hairColor: string;
  outfit: string;
  outfitColor: string;
  accessory?: string;
  glasses?: string;
};

export type ProfileImageType = "PHOTO" | "AVATAR";

export type UserOnboardingProfile = {
  country: string | null;
  department: string | null;
  city: string | null;
  neighborhood: string | null;
  addressReference: string | null;
  latitude: number | null;
  longitude: number | null;
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  profileImageType: ProfileImageType;
  avatarConfig: AvatarConfig;
  interests: string[];
  companions: string[];
  places: string[];
  music: string[];
  budget: string[];
  climate: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt: string | null;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  role: RoleName;
  createdAt: string;
  permissions?: string[];
  profile?: UserOnboardingProfile | null;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  icon?: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  _count?: { experiences: number };
};

export type ExperienceStatus = "DRAFT" | "PENDING" | "PUBLISHED" | "ARCHIVED" | "REJECTED";

export type Experience = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  price: string | number;
  location: string;
  latitude: string | number | null;
  longitude: string | number | null;
  externalUrl?: string | null;
  duration?: string | null;
  durationValue?: number | null;
  durationUnit?: "MINUTES" | "HOURS" | "DAYS" | null;
  availability?: unknown;
  howToGetThere?: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  status: ExperienceStatus;
  createdBy: string;
  submittedAt?: string | null;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  createdAt: string;
  category?: Category;
  creator?: { id: string; name: string; email: string };
  reviewedBy?: { id: string; name: string; email: string } | null;
};

export type AdminNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  entity: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
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
  createdCategories?: number;
  createdExperiences?: number;
  administrators?: PublicUser[];
  recentCategories?: Category[];
  recentExperiences?: Experience[];
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
