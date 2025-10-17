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
  Card,
  CardMedia,
  CardActions,
  IconButton as MuiIconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteImageIcon,
  CloudUpload as CloudUploadIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { createApiUrl, createErrorMessage } from '../config/api';

// 기본 건물 이미지 (SVG 아이콘을 base64로 인코딩하거나 외부 이미지 URL 사용)
const DEFAULT_BUILDING_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg4MFY4MEgyMFYyMFoiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTMwIDMwSDcwVjcwSDMwVjMwWiIgZmlsbD0iI0QxRDNENiIvPgo8cGF0aCBkPSJNMzUgMzVINjVWNjVIMzVWMzVaIiBmaWxsPSIjOENBM0YwIi8+CjxwYXRoIGQ9Ik0yMCAyMEg4MFY4MEgyMFYyMFoiIHN0cm9rZT0iI0M3Q0QwQyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';

// 이미지 URL을 절대 URL로 변환하는 함수
const getAbsoluteImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // 상대 경로인 경우 백엔드 URL과 결합
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';
  return `${baseUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};

// 안전한 이미지 배열 처리 함수
const safeImageArray = (images: any): string[] => {
  // 이미 배열인 경우 그대로 반환
  if (Array.isArray(images)) {
    return images
      .filter(img => typeof img === 'string' && img.trim() !== '')
      .map(img => getAbsoluteImageUrl(img));
  }
  
  // 문자열인 경우 JSON 파싱 시도
  if (typeof images === 'string') {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(img => typeof img === 'string' && img.trim() !== '')
          .map(img => getAbsoluteImageUrl(img));
      }
      return [];
    } catch (error) {
      console.warn('JSON 파싱 실패:', images, error);
      return [];
    }
  }
  
  // 그 외의 경우 빈 배열 반환
  return [];
};

interface Building {
  id: number;
  name: string;
  address: string;
  addressDetail?: string;
  zipCode?: string;
  buildingType: string;
  totalFloors: number;
  totalUnits: number;
  status: string;
  city?: string; // 시/도
  district?: string; // 구/군
  latitude?: number; // 위도
  longitude?: number; // 경도
  images: string[]; // 백엔드에서 항상 배열로 오므로 필수로 변경
  createdAt: string;
  updatedAt: string;
}

interface BuildingFormData {
  name: string;
  address: string;
  addressDetail: string;
  zipCode: string;
  buildingType: string;
  totalFloors: string;
  totalUnits: string;
  status: string;
  city: string;
  district: string;
  latitude: string;
  longitude: string;
}

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

export default function Buildings() {
  const theme = useTheme();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [viewBuilding, setViewBuilding] = useState<Building | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [formData, setFormData] = useState<BuildingFormData>({
    name: '',
    address: '',
    addressDetail: '',
    zipCode: '',
    buildingType: 'OFFICETEL',
    totalFloors: '',
    totalUnits: '',
    status: 'ACTIVE',
    city: '',
    district: '',
    latitude: '',
    longitude: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // 건물 목록 조회
  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(createApiUrl('/api/buildings'));
      
      if (response.data.success) {
        // images 필드를 안전하게 배열로 변환
        const buildingsWithParsedImages = response.data.data.map((building: any) => ({
          ...building,
          images: safeImageArray(building.images)
        }));
        
        setBuildings(buildingsWithParsedImages);
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '건물 목록을 불러오는데 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('건물 목록 조회 실패:', error);
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

  const handleOpenDialog = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      setFormData({
        name: building.name,
        address: building.address,
        addressDetail: building.addressDetail || '',
        zipCode: building.zipCode || '',
        buildingType: building.buildingType,
        totalFloors: building.totalFloors.toString(),
        totalUnits: building.totalUnits.toString(),
        status: building.status,
        city: building.city || '',
        district: building.district || '',
        latitude: building.latitude?.toString() || '',
        longitude: building.longitude?.toString() || '',
      });
      setExistingImages(building.images || []);
      setSelectedImages([]);
    } else {
      setEditingBuilding(null);
      setFormData({
        name: '',
        address: '',
        addressDetail: '',
        zipCode: '',
        buildingType: 'OFFICETEL',
        totalFloors: '',
        totalUnits: '',
        status: 'ACTIVE',
        city: '',
        district: '',
        latitude: '',
        longitude: '',
      });
      setExistingImages([]);
      setSelectedImages([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBuilding(null);
    setFormData({
      name: '',
      address: '',
      addressDetail: '',
      zipCode: '',
      buildingType: 'OFFICETEL',
      totalFloors: '',
      totalUnits: '',
      status: 'ACTIVE',
      city: '',
      district: '',
      latitude: '',
      longitude: '',
    });
    setExistingImages([]);
    setSelectedImages([]);
  };

  const handleViewBuilding = (building: Building) => {
    setViewBuilding(building);
    setOpenViewDialog(true);
  };

  const handleCloseViewDialog = () => {
    setOpenViewDialog(false);
    setViewBuilding(null);
  };

  const handleInputChange = (field: keyof BuildingFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 이미지 선택 처리
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newImages: ImageFile[] = Array.from(files).map(file => ({
        file,
        preview: URL.createObjectURL(file),
        id: Math.random().toString(36).substr(2, 9)
      }));
      setSelectedImages(prev => [...prev, ...newImages]);
    }
  };

  // 선택된 이미지 삭제
  const handleRemoveSelectedImage = (imageId: string) => {
    setSelectedImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  };

  // 기존 이미지 삭제
  const handleRemoveExistingImage = (imageUrl: string) => {
    setExistingImages(prev => prev.filter(img => img !== imageUrl));
  };

  const handleSubmit = async () => {
    // 폼 유효성 검사
    if (!formData.name || !formData.address || !formData.totalFloors || !formData.totalUnits) {
      setSnackbar({
        open: true,
        message: '필수 항목을 모두 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      setUploadingImages(true);
      
      const buildingData = {
        name: formData.name,
        address: formData.address,
        addressDetail: formData.addressDetail,
        zipCode: formData.zipCode,
        buildingType: formData.buildingType,
        totalFloors: parseInt(formData.totalFloors),
        totalUnits: parseInt(formData.totalUnits),
        status: formData.status,
        city: formData.city,
        district: formData.district,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingBuilding) {
        // 건물 수정 - 이미지 포함
        const formDataToSend = new FormData();
        Object.entries(buildingData).forEach(([key, value]) => {
          formDataToSend.append(key, value.toString());
        });
        
        // 기존 이미지 URL들 추가
        existingImages.forEach(imageUrl => {
          formDataToSend.append('existingImages', imageUrl);
        });
        
        // 새로 선택된 이미지들 추가
        selectedImages.forEach(image => {
          formDataToSend.append('images', image.file);
        });

        const response = await axios.put(
          createApiUrl('/api/buildings', editingBuilding.id),
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '건물 정보가 수정되었습니다.',
            severity: 'success'
          });
          fetchBuildings();
          handleCloseDialog();
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '건물 수정에 실패했습니다.',
            severity: 'error'
          });
        }
      } else {
        // 새 건물 추가 - 이미지 포함
        const formDataToSend = new FormData();
        Object.entries(buildingData).forEach(([key, value]) => {
          formDataToSend.append(key, value.toString());
        });
        
        // 선택된 이미지들 추가
        selectedImages.forEach(image => {
          formDataToSend.append('images', image.file);
        });

        const response = await axios.post(
          createApiUrl('/api/buildings'),
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '새 건물이 추가되었습니다.',
            severity: 'success'
          });
          fetchBuildings();
          handleCloseDialog();
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '건물 추가에 실패했습니다.',
            severity: 'error'
          });
        }
      }
    } catch (error: any) {
      console.error('건물 저장 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 건물을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(createApiUrl('/api/buildings', id));
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: '건물이 삭제되었습니다.',
          severity: 'success'
        });
        fetchBuildings(); // 목록 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '건물 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('건물 삭제 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'INACTIVE':
        return 'error';
      case 'MAINTENANCE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '활성';
      case 'INACTIVE':
        return '비활성';
      case 'MAINTENANCE':
        return '점검중';
      default:
        return status;
    }
  };

  const getBuildingTypeLabel = (type: string) => {
    switch (type) {
      case 'OFFICETEL':
        return '오피스텔';
      case 'APARTMENT':
        return '아파트';
      case 'VILLA':
        return '빌라';
      case 'COMMERCIAL':
        return '상가';
      default:
        return type;
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
          부동산 관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          건물 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
              건물 관리
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
              새 건물 추가
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
                  width: '150px', // 이미지 컬럼 너비 확대
                }}>
                  이미지
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  건물명
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  주소
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  건물 유형
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  총 층수
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  총 호실수
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  상태
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  등록일
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
                  <TableCell colSpan={9} sx={{
                    textAlign: 'center',
                    py: 6,
                  }}>
                    <CircularProgress size={40} />
                    <Typography variant="body1" sx={{ color: '#6b7280', mt: 2 }}>
                      건물 목록을 불러오는 중...
                    </Typography>
                    </TableCell>
                  </TableRow>
                ) : buildings.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={9} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    color: '#6b7280',
                    fontSize: '0.875rem',
                  }}>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>
                      등록된 건물이 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  buildings.map((building) => (
                  <TableRow key={building.id} hover sx={{
                    '&:hover': {
                      backgroundColor: '#f9fafb',
                    },
                    '& td': {
                      borderBottom: '1px solid #f3f4f6',
                      py: 2,
                      fontSize: '0.875rem',
                    }
                  }}>
                    <TableCell>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {building.images && building.images.length > 0 ? (
                            building.images.map((imageUrl, index) => (
                              <Card key={index} sx={{ 
                                position: 'relative', 
                                width: 100, 
                                height: 100, 
                                borderRadius: 1,
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                                }
                              }}>
                                <CardMedia
                                  component="img"
                                  src={imageUrl}
                                  alt={`건물 이미지 ${index + 1}`}
                                  sx={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover', 
                                    borderRadius: 1 
                                  }}
                                  onError={(e) => {
                                    console.error(`이미지 로드 실패: ${imageUrl}`, e);
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                  }}
                                />
                              </Card>
                            ))
                          ) : (
                            <Card sx={{ 
                              width: 100, 
                              height: 100, 
                              borderRadius: 1, 
                              backgroundColor: '#f3f4f6',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              <HomeIcon sx={{ fontSize: 40, color: '#9ca3af' }} />
                            </Card>
                          )}
                        </Box>
                      </TableCell>
                    <TableCell sx={{ fontWeight: 500, color: '#1f2937' }}>
                      {building.name}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {building.address} {building.addressDetail}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {getBuildingTypeLabel(building.buildingType)}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {building.totalFloors}층
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {building.totalUnits}개
                      </TableCell>
                      <TableCell>
                      <Chip
                        label={getStatusLabel(building.status)}
                        color={getStatusColor(building.status) as any}
                        size="small"
                        sx={{
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#6b7280', fontSize: '0.8rem' }}>
                      {building.createdAt}
                      </TableCell>
                      <TableCell>
                          <IconButton 
                        size="small" 
                        onClick={() => handleViewBuilding(building)}
                            sx={{ 
                          color: theme.palette.info.main,
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.08)',
                          }
                        }}
                      >
                        <PhotoCameraIcon fontSize="small" />
                          </IconButton>
                          <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(building)}
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
                            onClick={() => handleDelete(building.id)} 
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

      {/* 건물 추가/수정 다이얼로그 */}
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
          {editingBuilding ? '건물 정보 수정' : '새 건물 추가'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            {/* 건물명 */}
            <Grid item xs={12} sx={{ mt: 3 }}>
          <TextField
            fullWidth
            label="건물명"
            value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
            required
                placeholder="건물명을 입력하세요"
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

            {/* 주소 */}
            <Grid item xs={12}>
          <TextField
            fullWidth
            label="주소"
            value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
            required
                placeholder="주소를 입력하세요"
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

            {/* 상세주소 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="상세주소"
            value={formData.addressDetail}
                onChange={(e) => handleInputChange('addressDetail', e.target.value)}
                placeholder="상세주소를 입력하세요"
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

            {/* 우편번호 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="우편번호"
            value={formData.zipCode}
                onChange={(e) => handleInputChange('zipCode', e.target.value)}
                placeholder="우편번호를 입력하세요"
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

            {/* 시/도 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6b7280' }}>시/도</InputLabel>
                <Select
                  value={formData.city}
                  label="시/도"
                  onChange={(e) => handleInputChange('city', e.target.value)}
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
                  <MenuItem value="서울특별시">서울특별시</MenuItem>
                  <MenuItem value="부산광역시">부산광역시</MenuItem>
                  <MenuItem value="대구광역시">대구광역시</MenuItem>
                  <MenuItem value="인천광역시">인천광역시</MenuItem>
                  <MenuItem value="광주광역시">광주광역시</MenuItem>
                  <MenuItem value="대전광역시">대전광역시</MenuItem>
                  <MenuItem value="울산광역시">울산광역시</MenuItem>
                  <MenuItem value="경기도">경기도</MenuItem>
                  <MenuItem value="강원도">강원도</MenuItem>
                  <MenuItem value="충청북도">충청북도</MenuItem>
                  <MenuItem value="충청남도">충청남도</MenuItem>
                  <MenuItem value="전라북도">전라북도</MenuItem>
                  <MenuItem value="전라남도">전라남도</MenuItem>
                  <MenuItem value="경상북도">경상북도</MenuItem>
                  <MenuItem value="경상남도">경상남도</MenuItem>
                  <MenuItem value="제주특별자치도">제주특별자치도</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 구/군/시 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="구/군/시"
                value={formData.district}
                onChange={(e) => handleInputChange('district', e.target.value)}
                placeholder="구/군/시를 입력하세요 (예: 강남구, 용인시)"
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

            {/* 건물 유형 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6b7280' }}>건물 유형</InputLabel>
            <Select
              value={formData.buildingType}
                  label="건물 유형"
                  onChange={(e) => handleInputChange('buildingType', e.target.value)}
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
              <MenuItem value="OFFICETEL">오피스텔</MenuItem>
              <MenuItem value="APARTMENT">아파트</MenuItem>
                  <MenuItem value="VILLA">빌라</MenuItem>
                  <MenuItem value="COMMERCIAL">상가</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 상태 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6b7280' }}>상태</InputLabel>
                <Select
                  value={formData.status}
                  label="상태"
                  onChange={(e) => handleInputChange('status', e.target.value)}
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
                  <MenuItem value="ACTIVE">활성</MenuItem>
                  <MenuItem value="INACTIVE">비활성</MenuItem>
                  <MenuItem value="MAINTENANCE">점검중</MenuItem>
            </Select>
          </FormControl>
            </Grid>

            {/* 총 층수 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="총 층수"
            type="number"
            value={formData.totalFloors}
                onChange={(e) => handleInputChange('totalFloors', e.target.value)}
            required
                placeholder="총 층수를 입력하세요"
                variant="outlined"
                size="medium"
                inputProps={{ min: 1, max: 200 }}
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

            {/* 총 호실수 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
                label="총 호실수"
            type="number"
            value={formData.totalUnits}
                onChange={(e) => handleInputChange('totalUnits', e.target.value)}
            required
                placeholder="총 호실수를 입력하세요"
                variant="outlined"
                size="medium"
                inputProps={{ min: 1, max: 10000 }}
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

            {/* 위도 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="위도"
                type="number"
                value={formData.latitude}
                onChange={(e) => handleInputChange('latitude', e.target.value)}
                placeholder="위도를 입력하세요 (예: 37.5665)"
                variant="outlined"
                size="medium"
                inputProps={{
                  step: "any",
                  min: -90,
                  max: 90
                }}
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

            {/* 경도 */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="경도"
                type="number"
                value={formData.longitude}
                onChange={(e) => handleInputChange('longitude', e.target.value)}
                placeholder="경도를 입력하세요 (예: 126.9780)"
                variant="outlined"
                size="medium"
                inputProps={{
                  step: "any",
                  min: -180,
                  max: 180
                }}
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

            {/* 이미지 업로드 */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 1 }}>
                건물 이미지
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {Array.isArray(existingImages) && existingImages.length > 0 ? (
                  existingImages.map((imageUrl, index) => (
                    <Card key={index} sx={{ position: 'relative', width: 100, height: 100, borderRadius: 1 }}>
                      <CardMedia
                        component="img"
                        src={imageUrl}
                        alt={`건물 이미지 ${index + 1}`}
                        sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                      />
                      <CardActions sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '0 4px 0 4px' }}>
                        <MuiIconButton size="small" onClick={() => handleRemoveExistingImage(imageUrl)}>
                          <DeleteImageIcon fontSize="small" sx={{ color: 'white' }} />
                        </MuiIconButton>
                      </CardActions>
                    </Card>
                  ))
                ) : (
                  <Card sx={{ width: 100, height: 100, borderRadius: 1, backgroundColor: '#f3f4f6' }}>
                    <CardMedia
                      component="img"
                      src={DEFAULT_BUILDING_IMAGE}
                      alt="기본 건물 이미지"
                      sx={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'cover', 
                        borderRadius: 1,
                        opacity: 0.7
                      }}
                    />
                  </Card>
                )}
                {selectedImages.map((image) => (
                  <Card key={image.id} sx={{ position: 'relative', width: 100, height: 100, borderRadius: 1 }}>
                    <CardMedia
                      component="img"
                      src={image.preview}
                      alt={`선택된 이미지 ${selectedImages.indexOf(image) + 1}`}
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 1 }}
                    />
                    <CardActions sx={{ position: 'absolute', top: 0, right: 0, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: '0 4px 0 4px' }}>
                      <MuiIconButton size="small" onClick={() => handleRemoveSelectedImage(image.id)}>
                        <DeleteImageIcon fontSize="small" sx={{ color: 'white' }} />
                      </MuiIconButton>
                    </CardActions>
                  </Card>
                ))}
              </Box>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="image-upload-input"
              />
              <label htmlFor="image-upload-input">
                <Button
                  variant="outlined"
                  component="span"
                  startIcon={<CloudUploadIcon />}
                  sx={{
                    mt: 2,
                    borderRadius: 1,
                    borderColor: '#d1d5db',
                    color: '#6b7280',
                    fontWeight: 500,
                    '&:hover': {
                      borderColor: '#9ca3af',
                      color: '#374151',
                      backgroundColor: '#f9fafb',
                    },
                  }}
                >
                  이미지 업로드
                </Button>
              </label>
            </Grid>
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
            disabled={uploadingImages}
          >
            {editingBuilding ? '수정' : '추가'}
            {uploadingImages && <CircularProgress size={20} sx={{ ml: 1 }} />}
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

      {/* 건물 상세보기 다이얼로그 */}
      <Dialog 
        open={openViewDialog} 
        onClose={handleCloseViewDialog} 
        maxWidth="lg" 
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
          건물 상세 정보
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {viewBuilding && (
            <Grid container spacing={3}>
              {/* 건물 기본 정보 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ color: '#1e293b', mb: 2, fontWeight: 600 }}>
                  기본 정보
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      건물명
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937', fontWeight: 500 }}>
                      {viewBuilding.name}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      주소
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937' }}>
                      {viewBuilding.address} {viewBuilding.addressDetail}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      우편번호
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937' }}>
                      {viewBuilding.zipCode || '미입력'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      건물 유형
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937' }}>
                      {getBuildingTypeLabel(viewBuilding.buildingType)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      총 층수
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937' }}>
                      {viewBuilding.totalFloors}층
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      총 호실수
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1f2937' }}>
                      {viewBuilding.totalUnits}개
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      상태
                    </Typography>
                    <Chip
                      label={getStatusLabel(viewBuilding.status)}
                      color={getStatusColor(viewBuilding.status) as any}
                      size="small"
                      sx={{
                        borderRadius: 1,
                        fontWeight: 500,
                        fontSize: '0.75rem',
                      }}
                    />
                  </Box>
                </Box>
              </Grid>

              {/* 건물 이미지 갤러리 */}
              <Grid item xs={12} md={6}>
                <Typography variant="h6" sx={{ color: '#1e293b', mb: 2, fontWeight: 600 }}>
                  건물 이미지
                </Typography>
                                 {viewBuilding.images && viewBuilding.images.length > 0 ? (
                   <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 2 }}>
                     {viewBuilding.images.map((imageUrl, index) => (
                       <Card key={index} sx={{ borderRadius: 1, overflow: 'hidden' }}>
                         <CardMedia
                           component="img"
                           src={imageUrl}
                           alt={`건물 이미지 ${index + 1}`}
                           sx={{ 
                             width: '100%', 
                             height: 150, 
                             objectFit: 'cover',
                             '&:hover': {
                               transform: 'scale(1.05)',
                               transition: 'transform 0.2s ease-in-out',
                             }
                           }}
                           onError={(e) => {
                             console.error(`상세보기 이미지 로드 실패: ${imageUrl}`, e);
                           }}
                         />
                      </Card>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: 200,
                    border: '2px dashed #d1d5db',
                    borderRadius: 1,
                    backgroundColor: '#f9fafb'
                  }}>
                                         <Card sx={{ width: 150, height: 150, borderRadius: 1, backgroundColor: '#f3f4f6', mb: 2 }}>
                       <CardMedia
                         component="img"
                         src={DEFAULT_BUILDING_IMAGE}
                         alt="기본 건물 이미지"
                         sx={{ 
                           width: '100%', 
                           height: '100%', 
                           objectFit: 'cover', 
                           borderRadius: 1,
                           opacity: 0.7
                         }}
                       />
                     </Card>
                    <Typography variant="body2" sx={{ color: '#9ca3af' }}>
                      등록된 이미지가 없습니다
                    </Typography>
                  </Box>
                )}
              </Grid>

              {/* 등록 정보 */}
              <Grid item xs={12}>
                <Typography variant="h6" sx={{ color: '#1e293b', mb: 2, fontWeight: 600 }}>
                  등록 정보
                </Typography>
                <Box sx={{ display: 'flex', gap: 4 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      등록일
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {viewBuilding.createdAt}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#6b7280', mb: 0.5 }}>
                      수정일
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#6b7280' }}>
                      {viewBuilding.updatedAt}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <Button 
            onClick={() => {
              handleCloseViewDialog();
              if (viewBuilding) {
                handleOpenDialog(viewBuilding);
              }
            }} 
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
            수정하기
          </Button>
          <Button 
            onClick={handleCloseViewDialog} 
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
            닫기
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



