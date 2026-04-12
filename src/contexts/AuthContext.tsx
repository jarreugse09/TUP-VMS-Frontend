import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  ReactNode,
} from 'react';

interface User {
  _id: string;
  role: string;
  firstName: string;
  surname: string;
  staffType?: string;
  photoURL?: string;
  mustCapturePhoto?: boolean;
  college?: string;
  collegeId?: string;
  department?: string;
  departmentId?: string;
  designation?: string;
  officeUnit?: string;
  supervisorId?: string;
  workScheduleId?: string;
  qrCode?: string;
  // DPA 2012 — consent fields
  consentGiven?: boolean;
  consentDate?: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  logout: () => void;
  hasAccess: (roles: string[], subRoles?: string[]) => boolean;
  needsConsent: boolean; // true when user is authenticated but consentGiven === false
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => {
      if (!prev) return prev;
      const nextUser = { ...prev, ...updates };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return nextUser;
    });
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const hasAccess = useMemo(() => {
    return (roles: string[], subRoles?: string[]) => {
      if (!user) return false;

      const userRole = user.role?.toLowerCase() || '';
      const userSubRole = user.subRole?.toLowerCase() || '';

      const allowedRoles = roles.map(role => role.toLowerCase());
      const allowedSubRoles = (subRoles ?? []).map(subRole =>
        subRole.toLowerCase(),
      );

      const roleMatch =
        allowedRoles.length === 0 || allowedRoles.includes(userRole);
      const subRoleMatch =
        allowedSubRoles.length === 0 || allowedSubRoles.includes(userSubRole);

      if (allowedRoles.length > 0 && allowedSubRoles.length > 0) {
        return roleMatch && subRoleMatch;
      }

      if (allowedSubRoles.length > 0) {
        return subRoleMatch;
      }

      return roleMatch;
    };
  }, [user]);

  // DPA 2012: needs consent when authenticated but consentGiven is explicitly false
  const needsConsent = Boolean(token && user && user.consentGiven === false);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        login,
        updateUser,
        logout,
        hasAccess,
        needsConsent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
