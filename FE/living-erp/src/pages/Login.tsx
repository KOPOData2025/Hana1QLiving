import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business,
  Security,
  Speed,
  AdminPanelSettings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('사번과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(username, password);
      navigate('/');
    } catch (error: any) {
      // 백엔드에서 오는 구체적인 에러 메시지를 사용
      const errorMessage = error.message || '관리자 로그인에 실패했습니다.';
      setError(errorMessage);
      console.error('로그인 에러:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(135deg, #009595 0%, #00b3b3 100%)', // 하나그린 그라데이션
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0,
        m: 0,
        overflow: 'hidden',
        zIndex: 9999,
        '& *': {
          boxSizing: 'border-box',
        },
      }}
      component="div"
    >
      <Container 
        component="main" 
        maxWidth={false}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          m: 0,
          minHeight: '100vh',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            gap: { xs: 2, sm: 3, md: 4 },
          }}
        >
          {/* 하나금융그룹 로고 및 브랜딩 */}
          <Box
            sx={{
              textAlign: 'center',
              mb: { xs: 2, sm: 3, md: 4 },
              color: 'white',
              width: '100%',
              flexShrink: 0,
            }}
          >
            <Box
              component="img"
              src="/hana-logo-white.svg"
              alt="하나금융그룹"
              sx={{
                width: { xs: 100, sm: 120, md: 140 },
                height: 'auto',
                mb: { xs: 1.5, sm: 2, md: 2.5 },
              }}
            />
            <Typography 
              variant="h3" 
              component="h1" 
              sx={{ 
                fontWeight: 700, 
                mb: 0.5,
                fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.75rem' },
              }}
            >
              하나원큐리빙
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 400, 
                opacity: 0.9,
                fontSize: { xs: '0.875rem', sm: '1.125rem', md: '1.375rem' },
              }}
            >
              관리자 시스템
            </Typography>
          </Box>

          {/* 로그인 폼 */}
          <Paper
            elevation={24}
            sx={{
              padding: { xs: 2.5, sm: 3.5, md: 4 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: { xs: '95%', sm: '380px', md: '420px' },
              maxWidth: '450px',
              borderRadius: 3,
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              flexShrink: 0,
            }}
          >
            <Typography component="h2" variant="h5" gutterBottom sx={{ 
              fontWeight: 600, 
              color: '#1e293b', 
              mb: { xs: 2, sm: 2.5, md: 3 },
              fontSize: { xs: '1.25rem', sm: '1.5rem', md: '1.75rem' },
            }}>
              관리자 로그인
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  width: '100%', 
                  mb: { xs: 2, sm: 2.5, md: 3 },
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    color: '#ED1651', // 하나레드로 변경
                  },
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
              <TextField
                margin="dense"
                required
                fullWidth
                id="employeeId"
                label="사번"
                name="employeeId"
                autoComplete="username"
                autoFocus
                placeholder="예: 12345678"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    height: '56px', // 입력칸 높이 증가
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00b3b3', // 하나그린 라이트
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#009595', // 하나그린
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#64748b',
                    '&.Mui-focused': {
                      color: '#009595', // 하나그린
                    },
                  },
                }}
              />
              
              <TextField
                margin="dense"
                required
                fullWidth
                name="password"
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        sx={{ color: '#64748b' }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    height: '56px', // 입력칸 높이 증가
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#00b3b3', // 하나그린 라이트
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#009595', // 하나그린
                      borderWidth: '2px',
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#64748b',
                    '&.Mui-focused': {
                      color: '#009595', // 하나그린
                    },
                  },
                }}
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: { xs: 3, sm: 3.5, md: 4 }, 
                  mb: { xs: 1.5, sm: 2, md: 2.5 },
                  py: { xs: 1.25, sm: 1.5, md: 1.75 },
                  borderRadius: 2,
                  backgroundColor: '#009595', // 하나그린
                  fontWeight: 600,
                  fontSize: { xs: '0.875rem', sm: '1rem', md: '1.125rem' },
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#007a7a', // 하나그린 다크
                    boxShadow: '0 8px 25px rgba(0, 149, 149, 0.3)',
                  },
                  '&:disabled': {
                    backgroundColor: '#94a3b8',
                  },
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <CircularProgress size={20} sx={{ color: 'white' }} />
                ) : (
                  '로그인'
                )}
              </Button>

              {/* 관리자 등록 버튼 */}
              <Button
                fullWidth
                variant="outlined"
                onClick={() => navigate('/admin/register')}
                sx={{ 
                  mt: 2,
                  py: 1.5,
                  borderRadius: 2,
                  borderColor: '#009595',
                  color: '#009595',
                  fontWeight: 600,
                  fontSize: { xs: '0.85rem', sm: '0.9rem', md: '0.95rem' },
                  textTransform: 'none',
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  '&:hover': {
                    borderColor: '#007a7a',
                    backgroundColor: 'white',
                    color: '#007a7a',
                    boxShadow: '0 4px 12px rgba(0, 149, 149, 0.3)',
                  },
                }}
              >
                <AdminPanelSettings sx={{ mr: 1.5, fontSize: '1.2em' }} />
                관리자 등록
              </Button>
            </Box>

            {/* 시스템 특징 */}
            <Divider sx={{ width: '100%', my: { xs: 2, sm: 2.5, md: 3 } }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-around', width: '100%', textAlign: 'center' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Business sx={{ color: '#009595', fontSize: { xs: 24, sm: 26, md: 28 } }} /> {/* 하나그린 */}
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                  전문성
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Security sx={{ color: '#009595', fontSize: { xs: 24, sm: 26, md: 28 } }} /> {/* 하나그린 */}
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                  보안성
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <Speed sx={{ color: '#009595', fontSize: { xs: 24, sm: 26, md: 28 } }} /> {/* 하나그린 */}
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500, fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' } }}>
                  효율성
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* 하단 정보 */}
          <Box sx={{ 
            mt: { xs: 2, sm: 3, md: 4 }, 
            textAlign: 'center', 
            color: 'white',
            width: '100%',
            flexShrink: 0,
          }}>
            <Typography variant="caption" sx={{ 
              opacity: 0.8, 
              display: 'block', 
              mb: 0.5,
              fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
            }}>
              © 2024 하나금융그룹. 모든 권리 보유.
            </Typography>
            <Typography variant="caption" sx={{ 
              opacity: 0.7, 
              fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' },
            }}>
              하나원큐리빙 관리자 시스템 v2.1.0
            </Typography>
            <Typography variant="caption" sx={{ 
              opacity: 0.6, 
              fontSize: { xs: '0.5rem', sm: '0.55rem', md: '0.6rem' },
              display: 'block', 
              mt: 0.25 
            }}>
              보안 등급: A등급 | 최종 업데이트: 2024-01-20
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
