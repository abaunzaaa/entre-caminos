export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
