export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  createdAt: Date;
  role: { name: string };
  phone?: string | null;
  country?: string | null;
  department?: string | null;
  city?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    status: user.status,
    role: user.role.name,
    createdAt: user.createdAt,
    phone: user.phone ?? null,
    country: user.country ?? null,
    department: user.department ?? null,
    city: user.city ?? null,
    address: user.address ?? null,
    avatarUrl: user.avatarUrl ?? null,
  };
}
