import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Container,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Business,
  Security,
  Person,
  Email,
  Phone,
  Badge,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface AdminRegistrationRequest {
  employeeNumber: string;    // 사번
  username: string;          // 사용자명
  password: string;          // 비밀번호
  name: string;              // 이름
  email: string;             // 이메일
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';  // 역할
  department: string;        // 부서
  phone: string;             // 전화번호
  isActive: boolean;         // 활성화 상태
}

interface ValidationErrors {
  employeeNumber?: string;
  username?: string;
  password?: string;
  name?: string;
  email?: string;
  department?: string;
  phone?: string;
}

export default function AdminRegistration() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  
  const [formData, setFormData] = useState<AdminRegistrationRequest>({
    employeeNumber: '',
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'MANAGER',
    department: '',
    phone: '',
    isActive: true,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});

  // 유효성 검사 함수들
  const validateEmployeeNumber = (value: string): string | undefined => {
    if (!value) return '사번을 입력해주세요.';
    if (!/^\d{8}$/.test(value)) return '사번은 8자리 숫자만 입력 가능합니다.';
    return undefined;
  };

  const validateUsername = (value: string): string | undefined => {
    if (!value) return '사용자명을 입력해주세요.';
    if (value.length < 3 || value.length > 20) return '사용자명은 3-20자 사이여야 합니다.';
    if (!/^[a-zA-Z0-9가-힣]+$/.test(value)) return '사용자명은 영문, 한글, 숫자만 입력 가능합니다.';
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) return '비밀번호를 입력해주세요.';
    if (value.length < 8) return '비밀번호는 최소 8자 이상이어야 합니다.';
    if (!/^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(value)) {
      return '비밀번호는 영문, 숫자, 특수문자를 포함해야 합니다.';
    }
    return undefined;
  };

  const validateName = (value: string): string | undefined => {
    if (!value) return '이름을 입력해주세요.';
    if (value.length < 2) return '이름은 최소 2자 이상이어야 합니다.';
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value) return '이메일을 입력해주세요.';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return '올바른 이메일 형식을 입력해주세요.';
    return undefined;
  };

  const validateDepartment = (value: string): string | undefined => {
    if (!value) return '부서를 입력해주세요.';
    return undefined;
  };

  const validatePhone = (value: string): string | undefined => {
    if (!value) return '전화번호를 입력해주세요.';
    const phoneRegex = /^010-\d{4}-\d{4}$/;
    if (!phoneRegex.test(value)) return '전화번호는 010-0000-0000 형식으로 입력해주세요.';
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    newErrors.employeeNumber = validateEmployeeNumber(formData.employeeNumber);
    newErrors.username = validateUsername(formData.username);
    newErrors.password = validatePassword(formData.password);
    newErrors.name = validateName(formData.name);
    newErrors.email = validateEmail(formData.email);
    newErrors.department = validateDepartment(formData.department);
    newErrors.phone = validatePhone(formData.phone);

    setErrors(newErrors);
    
    return !Object.values(newErrors).some(error => error !== undefined);
  };

  const handleInputChange = (field: keyof AdminRegistrationRequest, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // 실시간 유효성 검사
    if (errors[field as keyof ValidationErrors]) {
      let error: string | undefined;
      
      switch (field) {
        case 'employeeNumber':
          error = validateEmployeeNumber(value);
          break;
        case 'username':
          error = validateUsername(value);
          break;
        case 'password':
          error = validatePassword(value);
          break;
        case 'name':
          error = validateName(value);
          break;
        case 'email':
          error = validateEmail(value);
          break;
        case 'department':
          error = validateDepartment(value);
          break;
        case 'phone':
          error = validatePhone(value);
          break;
      }
      
      if (error === undefined) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    }
  };

  const handlePhoneChange = (value: string) => {
    // 전화번호 자동 포맷팅 (010-0000-0000)
    let formatted = value.replace(/[^0-9]/g, '');
    
    if (formatted.length <= 3) {
      formatted = formatted;
    } else if (formatted.length <= 7) {
      formatted = formatted.slice(0, 3) + '-' + formatted.slice(3);
    } else {
      formatted = formatted.slice(0, 3) + '-' + formatted.slice(3, 7) + '-' + formatted.slice(7, 11);
    }
    
    handleInputChange('phone', formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setSnackbar({
        open: true,
        message: '입력 정보를 확인해주세요.',
        severity: 'error'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8080/api/admin/register', formData);
      
      setSnackbar({
        open: true,
        message: '관리자 등록이 완료되었습니다.',
        severity: 'success'
      });
      
      // 성공 후 폼 초기화
      setTimeout(() => {
        navigate('/users');
      }, 2000);
      
    } catch (error: any) {
      console.error('관리자 등록 실패:', error);
      
      let errorMessage = '관리자 등록에 실패했습니다.';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      py: 4
    }}>
      <Container maxWidth="lg">
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ 
            color: '#009595', 
            fontWeight: 'bold',
            fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' }
          }}>
            <Business sx={{ mr: 2, verticalAlign: 'middle', fontSize: 'inherit' }} />
            관리자 등록
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ 
            opacity: 0.8,
            fontSize: { xs: '1rem', sm: '1.1rem', md: '1.2rem' }
          }}>
            OneQLiving 시스템에 새로운 관리자를 등록합니다.
          </Typography>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* 등록 폼 */}
        <form onSubmit={handleSubmit}>
          <Grid container spacing={4}>
                         {/* 사번 */}
             <Grid item xs={12} md={6}>
               <TextField
                 fullWidth
                 label="사번"
                 value={formData.employeeNumber}
                 onChange={(e) => {
                   const value = e.target.value;
                   // 8자리까지만 입력 허용
                   if (value.length <= 8) {
                     handleInputChange('employeeNumber', value);
                   }
                 }}
                 inputProps={{
                   maxLength: 8, // HTML 속성으로도 제한
                   pattern: '[0-9]*', // 숫자만 입력 가능
                 }}
                 error={!!errors.employeeNumber}
                 helperText={errors.employeeNumber || '8자리 숫자만 입력 가능합니다.'}
                 InputProps={{
                   startAdornment: (
                     <InputAdornment position="start">
                       <Badge />
                     </InputAdornment>
                   ),
                 }}
                 placeholder="12345678"
               />
             </Grid>

            {/* 사용자명 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="사용자명"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                error={!!errors.username}
                helperText={errors.username || '3-20자, 영문/한글/숫자 조합'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
                placeholder="사용자명"
              />
            </Grid>

            {/* 비밀번호 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="비밀번호"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                error={!!errors.password}
                helperText={errors.password || '영문, 숫자, 특수문자 포함 8자 이상'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Security />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                placeholder="비밀번호"
              />
            </Grid>

            {/* 이름 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이름"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name || '실명을 입력해주세요.'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Person />
                    </InputAdornment>
                  ),
                }}
                placeholder="홍길동"
              />
            </Grid>

            {/* 이메일 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="이메일"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email || '표준 이메일 형식으로 입력해주세요.'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
                placeholder="example@hana.com"
              />
            </Grid>

            {/* 역할 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={false}>
                <InputLabel>역할</InputLabel>
                <Select
                  value={formData.role}
                  label="역할"
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <Security />
                    </InputAdornment>
                  }
                >
                  <MenuItem value="MANAGER">매니저</MenuItem>
                  <MenuItem value="ADMIN">관리자</MenuItem>
                  <MenuItem value="SUPER_ADMIN">슈퍼 관리자</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 부서 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                error={!!errors.department}
                helperText={errors.department || '소속 부서를 입력해주세요.'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business />
                    </InputAdornment>
                  ),
                }}
                placeholder="IT개발팀"
              />
            </Grid>

            {/* 전화번호 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="전화번호"
                value={formData.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                error={!!errors.phone}
                helperText={errors.phone || '010-0000-0000 형식으로 입력해주세요.'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Phone />
                    </InputAdornment>
                  ),
                }}
                placeholder="010-1234-5678"
              />
            </Grid>

            {/* 활성화 상태 */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    color="primary"
                  />
                }
                label="계정 활성화"
              />
              <Typography variant="caption" display="block" color="text.secondary" sx={{ ml: 4 }}>
                활성화된 계정만 시스템에 로그인할 수 있습니다.
              </Typography>
            </Grid>
          </Grid>

          {/* 버튼 영역 */}
          <Box sx={{ mt: 6, display: 'flex', gap: 3, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={handleCancel}
              size="large"
              sx={{ 
                minWidth: 140,
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                borderColor: '#009595',
                color: '#009595',
                '&:hover': {
                  borderColor: '#007a7a',
                  backgroundColor: 'rgba(0, 149, 149, 0.05)'
                }
              }}
            >
              취소
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              size="large"
              sx={{ 
                minWidth: 140,
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                fontWeight: 600,
                backgroundColor: '#009595',
                '&:hover': {
                  backgroundColor: '#007a7a',
                  boxShadow: '0 6px 20px rgba(0, 149, 149, 0.3)'
                }
              }}
            >
              {isLoading ? <CircularProgress size={24} /> : '등록'}
            </Button>
          </Box>
        </form>
              </Paper>
      </Container>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
