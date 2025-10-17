import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Buildings from './pages/Buildings';
import Units from './pages/Units';
import Users from './pages/Users';
import AdminRegistration from './pages/AdminRegistration';
import Contracts from './pages/Contracts';
import Payments from './pages/Payments';
import Reservations from './pages/Reservations';
import AutoPaymentDashboard from './pages/AutoPaymentDashboard';

import InternalSearch from './pages/InternalSearch';
import MonitoringPage from './pages/MonitoringPage';
import FinancialDashboard from './pages/FinancialDashboard';
import ExpenseManagement from './pages/ExpenseManagement';
import FinancialReport from './pages/FinancialReport';
import ReitProducts from './pages/ReitProducts';
import ReitProductDetail from './pages/ReitProductDetail';
import 'dayjs/locale/ko';

// 하나금융그룹 브랜드 컬러 기반 전문적 ERP 테마
const theme = createTheme({
  palette: {
    primary: {
      main: '#009595', // 하나그린 (공식 브랜드 컬러)
      light: '#00b3b3',
      dark: '#007a7a',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#1e3a8a', // 하나블루 (기존 컬러 유지)
      light: '#3b82f6',
      dark: '#1e40af',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f8fafc', // 밝은 그레이 배경
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // 진한 다크 그레이
      secondary: '#64748b',
    },
    error: {
      main: '#ED1651', // 하나레드 (공식 브랜드 컬러)
      light: '#ff4d7a',
      dark: '#d4003a',
    },
    warning: {
      main: '#f59e0b', // 전문적인 오렌지
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#009595', // 하나그린 (공식 브랜드 컬러)
      light: '#00b3b3',
      dark: '#007a7a',
    },
    info: {
      main: '#1e3a8a', // 하나블루
      light: '#3b82f6',
      dark: '#1e40af',
    },
    divider: '#e2e8f0',
  },
  typography: {
    fontFamily: '"Pretendard", "Noto Sans KR", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.25rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#1e293b',
    },
    h2: {
      fontSize: '1.875rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#1e293b',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#1e293b',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.6,
      color: '#374151',
    },
    body2: {
      fontSize: '0.8125rem',
      lineHeight: 1.6,
      color: '#6b7280',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.875rem',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#6b7280',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 149, 149, 0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 149, 149, 0.25)',
          },
        },
        outlined: {
          borderWidth: '1.5px',
          '&:hover': {
            borderWidth: '1.5px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
        },
        elevation1: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        },
        elevation2: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        elevation3: {
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc',
          '& .MuiTableCell-head': {
            backgroundColor: '#f8fafc',
            borderBottom: '2px solid #e2e8f0',
            fontWeight: 700,
            fontSize: '0.875rem',
            color: '#374151',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #f1f5f9',
          padding: '16px',
          fontSize: '0.875rem',
        },
        body: {
          color: '#374151',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
          '&:nth-of-type(even)': {
            backgroundColor: '#fafbfc',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 12,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3b82f6',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1e3a8a',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '2px solid #e2e8f0',
          '& .MuiTab-root': {
            fontWeight: 600,
            fontSize: '0.875rem',
            textTransform: 'none',
            minHeight: '48px',
            '&.Mui-selected': {
              color: '#1e3a8a',
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#1e3a8a',
            height: '3px',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&:hover': {
            backgroundColor: '#f1f5f9',
          },
        },
      },
    },
  },
});

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
        }}
      >
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          gap={2}
        >
          <Box
            component="img"
            src="/hana-logo.svg"
            alt="하나금융그룹"
            sx={{
              width: 120,
              height: 'auto',
              mb: 2,
            }}
          />
          <Box
            sx={{
              width: 40,
              height: 40,
              border: '3px solid #e2e8f0',
              borderTop: '3px solid #1e3a8a',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' },
              },
            }}
          />
        </Box>
      </Box>
    );
  }

  // 사용자 인증 상태 검증
  const isAuthenticated = user && 
    typeof user === 'object' && 
    user.username && 
    user.role && 
    Object.keys(user).length > 0;

  return (
    <Router>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/admin/register" element={isAuthenticated ? <Navigate to="/" /> : <AdminRegistration />} />
        
        {/* 보호된 라우트 */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Layout />
            ) : (
              <Navigate to="/login" />
            )
          }
        >
          <Route index element={<InternalSearch />} />
          <Route path="buildings" element={<Buildings />} />
          <Route path="units" element={<Units />} />
          <Route path="users" element={<Users />} />
          <Route path="contracts" element={<Contracts />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="auto-payment" element={<AutoPaymentDashboard />} />
          <Route path="internal-search" element={<InternalSearch />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="financial" element={<FinancialDashboard />} />
          <Route path="expenses" element={<ExpenseManagement />} />
          <Route path="reports" element={<FinancialReport />} />
          <Route path="reit-products" element={<ReitProducts />} />
          <Route path="reit-products/:productCode" element={<ReitProductDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="ko">
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
