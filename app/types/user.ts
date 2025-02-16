// declare user type
export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

// declare auth context type
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  getCurrentUser: () => Promise<void>;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: () => boolean;
  requireAuth: () => Promise<void>;
  requireAdmin: () => Promise<void>;
}

// declare confirmation context type
export interface ConfirmationContextType {
  status: 'loading' | 'success' | 'error';
  message: string;
}

// declare custom event type
export interface UserRegisteredEventDetail {
  id: string;
  email: string;
  username: string;
  role: string;
}

// declare custom event type
declare global {
  interface WindowEventMap {
    userRegistered: CustomEvent<UserRegisteredEventDetail>;
  }
}

// declare protected route type
export interface ProtectedRouteProps {
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

// declare user actions type
export interface UserActionsProps {
  user: {
    id: string;
    email: string;
    role?: string;
    username?: string;
  };
  currentUser: {
    id: string;
    email: string;
    role?: string;
  } | null;
  onActionComplete: () => void;
}
