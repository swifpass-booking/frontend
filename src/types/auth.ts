export type UserRole = 'traveller' | 'operator_staff' | 'gate_agent' | 'admin';

export interface AuthUser {
  id: string;
  fullName: string;
  email?: string;
  phoneE164?: string;
  locale?: string;
  role: UserRole;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
}

export interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (fullName: string, identifier: string, password: string) => Promise<AuthUser>;
  logout: () => void;
}
