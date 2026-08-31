export function publicUser(user: {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  status: string;
  createdAt: Date;
  role: { name: string };
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    status: user.status,
    role: user.role.name,
    createdAt: user.createdAt,
  };
}
