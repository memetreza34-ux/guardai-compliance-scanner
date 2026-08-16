export type AuthSessionStatus = 'loading' | 'anonymous' | 'authenticated' | 'unavailable';

export interface AuthenticatedUserSummary {
  id: string;
  email: string | null;
}

export interface AuthSessionSnapshot {
  status: AuthSessionStatus;
  user: AuthenticatedUserSummary | null;
  unavailableReason?: string;
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export interface AuthSessionAdapter {
  getSnapshot(): AuthSessionSnapshot;
  subscribe(listener: (snapshot: AuthSessionSnapshot) => void): () => void;
  getAccessToken(): Promise<string | null>;
  signInWithPassword(credentials: EmailPasswordCredentials): Promise<void>;
  signUpWithPassword(credentials: EmailPasswordCredentials): Promise<void>;
  signOut(): Promise<void>;
}
