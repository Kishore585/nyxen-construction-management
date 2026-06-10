import React, { createContext, useContext, useReducer } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Project {
  id: string;
  name: string;
  location: string;
  state: string;
  progress: number;
  complianceScore: number;
  lastActivity: string;
  status: 'active' | 'completed' | 'pending';
}

export interface AnalysisResult {
  id: string;
  imageUrl: string;
  detectedElements: DetectedElement[];
  gpsData: GPSData | null;
  measurements: Measurement[];
  overallConfidence: number;
}

export interface DetectedElement {
  id: string;
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
}

export interface GPSData {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp: string;
}

export interface Measurement {
  id: string;
  sno: number;
  description: string;
  category: string;
  number: number;
  length: number;
  breadth: number;
  depthOrHeight: number;
  quantity: number; // Final resolved quantity
  
  // Dual measurement tracking
  aiQuantity?: number;
  manualQuantity?: number;

  unit: string;
  confidence: number;
  rate?: number;
  amount?: number;

  // Material Verification
  materialsCheck?: {
    materialUsed: string;
    engineerVerified: boolean;
    constructorVerified: boolean;
  };

  // Contract Violation
  violationWarning?: string | null;
}

interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  currentProject: Project | null;
  projects: Project[];
  analysisResults: AnalysisResult[];
  sidebarOpen: boolean;
  theme: 'dark' | 'light';
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'ADD_ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'TOGGLE_THEME' }
  | { type: 'LOGOUT' };

const initialState: AppState = {
  user: localStorage.getItem('nyxen_user')
    ? JSON.parse(localStorage.getItem('nyxen_user')!)
    : null,
  isAuthenticated: !!localStorage.getItem('nyxen_token'),
  currentProject: null,
  projects: [],
  analysisResults: [],
  sidebarOpen: false,
  theme: (localStorage.getItem('nyxen_theme') as 'dark' | 'light') || 'dark',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'ADD_ANALYSIS_RESULT':
      return { ...state, analysisResults: [...state.analysisResults, action.payload] };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    case 'TOGGLE_THEME': {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nyxen_theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      return { ...state, theme: newTheme };
    }
    case 'LOGOUT':
      localStorage.removeItem('nyxen_token');
      localStorage.removeItem('nyxen_user');
      return { ...initialState, user: null, isAuthenticated: false };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const login = async (username: string, password: string) => {
    const { api } = await import('../services/api');
    const { token, user } = await api.login(username, password);
    localStorage.setItem('nyxen_token', token);
    localStorage.setItem('nyxen_user', JSON.stringify(user));
    dispatch({ type: 'SET_USER', payload: user });
    dispatch({ type: 'SET_AUTHENTICATED', payload: true });
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT' });
  };

  return (
    <AppContext.Provider value={{ state, dispatch, login, logout }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
