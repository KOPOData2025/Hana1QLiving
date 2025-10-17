import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { createApiUrl, createErrorMessage } from '../config/api';

interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  employeeNumber: string;
  department: string;
  phone: string;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  username: string;
  name: string;
  email: string;
  role: string;
  employeeNumber: string;
  department: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export default function Users() {
  const theme = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    name: '',
    email: '',
    role: 'ADMIN',
    employeeNumber: '',
    department: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // 관리자 목록 조회
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(createApiUrl('/api/admin/users'));
      
      if (response.data.success) {
        setUsers(response.data.data || []);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '관리자 목록을 불러오는데 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('관리자 목록 조회 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeNumber: user.employeeNumber || '',
        department: user.department || '',
        phone: user.phone || '',
        password: '',
        confirmPassword: '',
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        name: '',
        email: '',
        role: 'ADMIN',
        employeeNumber: '',
        department: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      email: '',
      role: 'ADMIN',
      employeeNumber: '',
      department: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
  };

  const handleInputChange = (field: keyof UserFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    // 폼 유효성 검사
    if (!formData.username || !formData.name || !formData.email || !formData.role) {
      setSnackbar({
        open: true,
        message: '필수 항목을 모두 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    // 새 관리자 추가 시 비밀번호 확인
    if (!editingUser && (!formData.password || formData.password !== formData.confirmPassword)) {
      setSnackbar({
        open: true,
        message: '비밀번호가 일치하지 않습니다.',
        severity: 'warning'
      });
      return;
    }

    try {
      const userData = {
        username: formData.username,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        employeeNumber: formData.employeeNumber,
        department: formData.department,
        phone: formData.phone,
        ...(formData.password && { password: formData.password }), // 비밀번호가 있을 때만 포함
      };

      if (editingUser) {
        // 관리자 수정
        const response = await axios.put(
          createApiUrl('/api/admin/users', editingUser.id),
          userData
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '관리자 정보가 수정되었습니다.',
            severity: 'success'
          });
          fetchUsers(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '관리자 수정에 실패했습니다.',
            severity: 'error'
          });
        }
      } else {
        // 새 관리자 추가
        const response = await axios.post(
          createApiUrl('/api/admin/users'),
          userData
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '새 관리자가 추가되었습니다.',
            severity: 'success'
          });
          fetchUsers(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
      } else {
          setSnackbar({
            open: true,
            message: response.data.message || '관리자 추가에 실패했습니다.',
            severity: 'error'
          });
        }
      }
      
      // 성공 시에만 모달 닫기 (위에서 이미 처리됨)
      // handleCloseDialog(); // 이 줄 제거
    } catch (error: any) {
      console.error('관리자 저장 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id: number) => {
            if (!window.confirm('정말로 이 관리자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(createApiUrl('/api/admin/users', id));
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: '관리자가 삭제되었습니다.',
          severity: 'success'
        });
        fetchUsers(); // 목록 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '관리자 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('관리자 삭제 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '#ED1651'; // 하나레드
      case 'ADMIN':
        return '#009595'; // 하나그린
      case 'MANAGER':
        return '#f59e0b'; // 오렌지
      case 'STAFF':
        return '#64748b'; // 그레이
      default:
        return '#1e3a8a'; // 하나블루
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return '최고관리자';
      case 'ADMIN':
        return '관리자';
      case 'MANAGER':
        return '매니저';
      case 'STAFF':
        return '직원';
      default:
        return role;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleDateString('ko-KR');
    } catch {
      return dateString;
    }
  };

  return (
    <Box sx={{
      p: 3,
      minHeight: '100vh',
      width: '100%',
      backgroundColor: '#f8fafc'
    }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '0.875rem',
        color: '#6b7280'
      }}>
        <HomeIcon sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          홈
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          계약 및 고객관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          사용자 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PeopleIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
            관리자 관리
        </Typography>
        </Box>
          <Button
            variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          }}
        >
          새 관리자 추가
          </Button>
      </Box>

      <Paper sx={{ 
        width: '100%', 
        overflow: 'hidden',
        borderRadius: 1,
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }}>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  사용자명
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  이름
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  이메일
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  사원번호
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  부서
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  역할
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  마지막 로그인
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  작업
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={40} />
                                        <Typography variant="body1" sx={{ color: '#6b7280' }}>
                    관리자 목록을 불러오는 중...
                  </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    color: '#6b7280',
                    fontSize: '0.875rem',
                  }}>
                                         <Typography variant="body1" sx={{ color: '#6b7280' }}>
                       등록된 관리자가 없습니다.
                     </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id} hover sx={{
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                    },
                    '& td': {
                      borderBottom: '1px solid #f3f4f6',
                      py: 2,
                      fontSize: '0.875rem',
                    }
                  }}>
                    <TableCell sx={{ fontWeight: 500, color: '#1f2937' }}>
                      {user.username}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {user.name}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {user.email}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {user.employeeNumber || '-'}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {user.department || '-'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        size="small"
                        sx={{
                          backgroundColor: getRoleColor(user.role),
                          color: 'white',
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      {formatDate(user.lastLoginAt)}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(user)}
                        sx={{ 
                          color: theme.palette.primary.main,
                          '&:hover': {
                            backgroundColor: 'rgba(0, 149, 149, 0.08)',
                          }
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => handleDelete(user.id)}
                        sx={{ 
                          color: theme.palette.error.main,
                          '&:hover': {
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                          }
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 사용자 추가/수정 다이얼로그 */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e2e8f0',
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#f8fafc',
          color: '#1e293b',
          fontWeight: 600,
          fontSize: '1.125rem',
          borderBottom: '1px solid #e2e8f0',
          py: 2.5,
        }}>
          {editingUser ? '관리자 정보 수정' : '새 관리자 추가'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            {/* 사용자명 */}
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="사용자명"
            value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
            required
                                 placeholder="관리자명을 입력하세요"
                variant="outlined"
                size="medium"
                                 disabled={!!editingUser} // 수정 시 관리자명 변경 불가
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: editingUser ? '#f9fafb' : '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>

            {/* 이름 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="이름"
            value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
            required
                placeholder="이름을 입력하세요"
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
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
            required
                placeholder="이메일을 입력하세요"
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>

            {/* 역할 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>역할</InputLabel>
                <Select
                  value={formData.role}
                  label="역할"
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  variant="outlined"
                  size="medium"
                  sx={{
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  <MenuItem value="SUPER_ADMIN">최고관리자</MenuItem>
                  <MenuItem value="ADMIN">관리자</MenuItem>
                  <MenuItem value="MANAGER">매니저</MenuItem>
                  <MenuItem value="STAFF">직원</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 사원번호 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="사원번호"
                value={formData.employeeNumber}
                onChange={(e) => handleInputChange('employeeNumber', e.target.value)}
                placeholder="사원번호를 입력하세요"
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>

            {/* 부서 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="부서"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                placeholder="부서를 입력하세요"
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>

            {/* 전화번호 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="전화번호"
            value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="전화번호를 입력하세요"
                variant="outlined"
                size="medium"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                    backgroundColor: '#ffffff',
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: theme.palette.primary.main,
                    },
                  },
                  '& .MuiInputLabel-root': {
                    color: '#6b7280',
                    '&.Mui-focused': {
                      color: theme.palette.primary.main,
                    },
                  },
                }}
              />
            </Grid>

            {/* 비밀번호 (새 사용자 추가 시에만) */}
            {!editingUser && (
              <>
                <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="비밀번호"
            type="password"
            value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    required
                    placeholder="비밀번호를 입력하세요"
                    variant="outlined"
                    size="medium"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: '#ffffff',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: theme.palette.primary.main,
                        },
                      },
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="비밀번호 확인"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    placeholder="비밀번호를 다시 입력하세요"
                    variant="outlined"
                    size="medium"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 1,
                        backgroundColor: '#ffffff',
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: theme.palette.primary.main,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: theme.palette.primary.main,
                        },
                      },
                    }}
                  />
                </Grid>
              </>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <Button 
            onClick={handleCloseDialog} 
            variant="outlined" 
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 1,
              borderColor: '#d1d5db',
              color: '#6b7280',
              fontWeight: 500,
              '&:hover': {
                borderColor: '#9ca3af',
                color: '#374151',
                backgroundColor: '#f9fafb',
              }
            }}
          >
            취소
          </Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained" 
            sx={{ 
              px: 3, 
              py: 1.5,
              borderRadius: 1,
              backgroundColor: theme.palette.primary.main,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }
            }}
          >
            {editingUser ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
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



