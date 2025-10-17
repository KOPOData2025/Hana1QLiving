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
  Home as HomeIcon,
  PhotoCamera as PhotoCameraIcon,
  Delete as DeleteImageIcon,
  CloudUpload as CloudUploadIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  History as HistoryIcon,
  FilterList as FilterListIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { createApiUrl, createErrorMessage } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

// 기본 호실 이미지
const DEFAULT_UNIT_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyMEg4MFY4MEgyMFYyMFoiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTMwIDMwSDcwVjcwSDMwVjMwWiIgZmlsbD0iI0QxRDNENiIvPgo8cGF0aCBkPSJNMzUgMzVINjVWNjVIMzVWMzVaIiBmaWxsPSIjOENBM0YwIi8+CjxwYXRoIGQ9Ik0yMCAyMEg4MFY4MEgyMFYyMFoiIHN0cm9rZT0iI0M3Q0QwQyIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPgo=';

// 이미지 URL을 절대 URL로 변환하는 함수
const getAbsoluteImageUrl = (imageUrl: string): string => {
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || imageUrl.startsWith('data:')) {
    return imageUrl;
  }
  
  // 상대 경로인 경우 백엔드 URL과 결합
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8091';
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

interface Unit {
  id: number;
  unitNumber: string;
  buildingId: number;
  buildingName: string;
  floor: number;
  unitType: string;
  area: number;
  monthlyRent: number;
  deposit: number;
  status: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

interface Building {
  id: number;
  name: string;
}

interface UnitFormData {
  unitNumber: string;
  buildingId: string;
  floor: string;
  unitType: string;
  area: string;
  monthlyRent: string;
  deposit: string;
  status: string;
}

interface ImageFile {
  file: File;
  preview: string;
  id: string;
}

interface ManagementFeeCharge {
  id: number;
  unitId: number;
  chargeAmount: number;
  chargeDescription: string;
  chargeDate: string;
  dueDate: string;
  status: string;
  unitNumber: string;
  buildingName: string;
  chargedByUserName: string;
}

interface ManagementFeeChargeForm {
  chargeAmount: string;
  chargeDescription: string;
  dueDate: string;
}

export default function Units() {
  const theme = useTheme();
  const { token } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<ImageFile[]>([]);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [formData, setFormData] = useState<UnitFormData>({
    unitNumber: '',
    buildingId: '',
    floor: '',
    unitType: 'ONE_BEDROOM',
    area: '',
    monthlyRent: '',
    deposit: '',
    status: 'AVAILABLE',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // 관리비 청구 관련 상태
  const [managementFeeDialog, setManagementFeeDialog] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [managementFeeForm, setManagementFeeForm] = useState<ManagementFeeChargeForm>({
    chargeAmount: '',
    chargeDescription: '',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 1주일 후
  });
  const [chargingFee, setChargingFee] = useState(false);
  const [managementFeeCharges, setManagementFeeCharges] = useState<ManagementFeeCharge[]>([]);
  const [showChargeHistory, setShowChargeHistory] = useState(false);

  // 호실 목록과 건물 목록 조회
  useEffect(() => {
    fetchData();
  }, []);

  // 건물별 필터링
  useEffect(() => {
    if (selectedBuildingId === '') {
      setFilteredUnits(units); // 전체 표시
    } else {
      const filtered = units.filter(unit => unit.buildingId === selectedBuildingId);
      setFilteredUnits(filtered);
    }
  }, [selectedBuildingId, units]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 건물 목록과 호실 목록을 병렬로 조회
      const [buildingsResponse, unitsResponse] = await Promise.all([
        axios.get(createApiUrl('/api/buildings'), {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(createApiUrl('/api/units'), {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      let buildingsData: Building[] = [];
      if (buildingsResponse.data.success) {
        buildingsData = buildingsResponse.data.data || [];
        setBuildings(buildingsData);
      }

      if (unitsResponse.data.success) {
        const unitsData = unitsResponse.data.data || [];
        
        // 건물명을 포함하여 표시하고 호실 타입 변환 및 이미지 파싱
        const unitsWithBuildingNames = unitsData.map((unit: any) => {
          const building = buildingsData.find(b => b.id === unit.buildingId);
          
          // 기존 STUDIO 타입을 ONE_BEDROOM으로 변환
          let convertedUnitType = unit.unitType;
          if (unit.unitType === 'STUDIO') {
            convertedUnitType = 'ONE_BEDROOM';
          }
          
          return { 
            ...unit, 
            unitType: convertedUnitType,
            buildingName: building ? building.name : `건물 ID: ${unit.buildingId}`,
            images: safeImageArray(unit.images)
          };
        });
        
        setUnits(unitsWithBuildingNames);
        setFilteredUnits(unitsWithBuildingNames); // 초기에는 모든 호실 표시
      }
    } catch (error: any) {
      console.error('데이터 조회 실패:', error);
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

  // 관리비 청구 관련 함수들
  const fetchManagementFeeCharges = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/management-fee/charges/all'), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.data.success) {
        setManagementFeeCharges(response.data.data || []);
      }
    } catch (error: any) {
      console.error('관리비 청구 이력 조회 실패:', error);
    }
  };

  const handleOpenManagementFeeDialog = (unit: Unit) => {
    setSelectedUnit(unit);
    setManagementFeeForm({
      chargeAmount: '',
      chargeDescription: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setManagementFeeDialog(true);
  };

  const handleCloseManagementFeeDialog = () => {
    setManagementFeeDialog(false);
    setSelectedUnit(null);
    setManagementFeeForm({
      chargeAmount: '',
      chargeDescription: '',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };

  const handleChargeManagementFee = async () => {
    if (!selectedUnit) return;

    try {
      setChargingFee(true);

      const requestData = {
        unitId: selectedUnit.id,
        chargeAmount: parseFloat(managementFeeForm.chargeAmount),
        chargeDescription: managementFeeForm.chargeDescription,
        dueDate: managementFeeForm.dueDate
      };

      const response = await axios.post(createApiUrl('/api/management-fee/charge'), requestData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `${selectedUnit.unitNumber}호에 관리비가 청구되었습니다. 자동이체가 실행됩니다.`,
          severity: 'success'
        });

        handleCloseManagementFeeDialog();
        fetchManagementFeeCharges(); // 청구 이력 새로고침
      } else {
        throw new Error(response.data.message || '관리비 청구에 실패했습니다.');
      }
    } catch (error: any) {
      console.error('관리비 청구 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    } finally {
      setChargingFee(false);
    }
  };

  const handleShowChargeHistory = () => {
    fetchManagementFeeCharges();
    setShowChargeHistory(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'OVERDUE':
        return 'error';
      case 'CANCELLED':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return '결제완료';
      case 'PENDING':
        return '결제대기';
      case 'OVERDUE':
        return '연체';
      case 'CANCELLED':
        return '취소됨';
      default:
        return status;
    }
  };

  const handleOpenDialog = (unit?: Unit) => {
    if (unit) {
      setEditingUnit(unit);
      // 기존 STUDIO 타입을 ONE_BEDROOM으로 변환
      let convertedUnitType = unit.unitType;
      if (unit.unitType === 'STUDIO') {
        convertedUnitType = 'ONE_BEDROOM';
      }
      
      setFormData({
        unitNumber: unit.unitNumber,
        buildingId: unit.buildingId.toString(),
        floor: unit.floor.toString(),
        unitType: convertedUnitType,
        area: unit.area.toString(),
        monthlyRent: unit.monthlyRent.toString(),
        deposit: unit.deposit.toString(),
        status: unit.status,
      });
      setExistingImages(unit.images || []);
      setSelectedImages([]);
    } else {
      setEditingUnit(null);
      setFormData({
        unitNumber: '',
        buildingId: '',
        floor: '',
        unitType: 'ONE_BEDROOM',
        area: '',
        monthlyRent: '',
        deposit: '',
        status: 'AVAILABLE',
      });
      setExistingImages([]);
      setSelectedImages([]);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUnit(null);
    setFormData({
      unitNumber: '',
      buildingId: '',
      floor: '',
      unitType: 'ONE_BEDROOM',
      area: '',
      monthlyRent: '',
      deposit: '',
      status: 'AVAILABLE',
    });
    setExistingImages([]);
    setSelectedImages([]);
  };

  const handleInputChange = (field: keyof UnitFormData, value: string) => {
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

      // 새 이미지 선택 시 기존 이미지를 모두 삭제하고 새 이미지로 교체
      if (editingUnit && existingImages.length > 0) {
        // 기존 이미지가 있는 경우, 사용자에게 확인
        if (window.confirm('새 이미지를 선택하면 기존 사진이 모두 삭제됩니다. 계속하시겠습니까?')) {
          setExistingImages([]);
          setSelectedImages(newImages);
        }
      } else {
        setSelectedImages(prev => [...prev, ...newImages]);
      }
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

  // 모든 기존 이미지 삭제 (새 이미지로 완전히 교체)
  const handleReplaceAllImages = () => {
    setExistingImages([]);
  };

  const handleSubmit = async () => {
    // 폼 유효성 검사
    if (!formData.unitNumber || !formData.buildingId || !formData.floor || 
        !formData.area || !formData.monthlyRent) {
      setSnackbar({
        open: true,
        message: '필수 항목을 모두 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      setUploadingImages(true);
      
      // FormData 생성
      const formDataToSend = new FormData();
      formDataToSend.append('unitNumber', formData.unitNumber);
      formDataToSend.append('buildingId', formData.buildingId);
      formDataToSend.append('floor', formData.floor);
      formDataToSend.append('unitType', formData.unitType);
      formDataToSend.append('area', formData.area);
      formDataToSend.append('monthlyRent', formData.monthlyRent);
      formDataToSend.append('deposit', formData.deposit || '0');
      formDataToSend.append('status', formData.status);

      if (editingUnit) {
        // 기존 이미지 추가
        existingImages.forEach(imageUrl => {
          formDataToSend.append('existingImages', imageUrl);
        });
        
        // 새 이미지 추가
        selectedImages.forEach(imageFile => {
          formDataToSend.append('images', imageFile.file);
        });
        
        // 호실 수정
        const response = await axios.put(
          createApiUrl('/api/units', editingUnit.id),
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '호실 정보가 수정되었습니다.',
            severity: 'success'
          });
          fetchData(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '호실 수정에 실패했습니다.',
            severity: 'error'
          });
        }
      } else {
        // 새 이미지 추가
        selectedImages.forEach(imageFile => {
          formDataToSend.append('images', imageFile.file);
        });
        
        // 새 호실 추가
        const response = await axios.post(
          createApiUrl('/api/units'),
          formDataToSend,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            }
          }
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '새 호실이 추가되었습니다.',
            severity: 'success'
          });
          fetchData(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '호실 추가에 실패했습니다.',
            severity: 'error'
          });
        }
      }
    } catch (error: any) {
      console.error('호실 저장 실패:', error);
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
    if (!window.confirm('정말로 이 호실을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(createApiUrl('/api/units', id), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: '호실이 삭제되었습니다.',
          severity: 'success'
        });
        fetchData(); // 목록 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '호실 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
      console.error('호실 삭제 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const getUnitStatusColor = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'success';
      case 'OCCUPIED':
        return 'error';
      case 'MAINTENANCE':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getUnitStatusLabel = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return '빈방';
      case 'OCCUPIED':
        return '입주중';
      case 'MAINTENANCE':
        return '점검중';
      default:
        return status;
    }
  };

  const getUnitTypeLabel = (type: string) => {
    switch (type) {
      case 'ONE_BEDROOM':
        return '원룸';
      case 'TWO_BEDROOM':
        return '투룸';
      case 'THREE_BEDROOM':
        return '쓰리룸';
      case 'FOUR_BEDROOM':
        return '포룸';
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
          호실 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HomeIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
              호실 관리
            </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleShowChargeHistory}
            sx={{
              borderColor: theme.palette.success.main,
              color: theme.palette.success.main,
              '&:hover': {
                backgroundColor: 'rgba(72, 187, 120, 0.08)',
                borderColor: theme.palette.success.main,
              }
            }}
          >
            관리비 이력
          </Button>
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
              새 호실 추가
            </Button>
        </Box>
      </Box>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 1, border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FilterListIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 600 }}>
            필터 조건
          </Typography>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: '#6b7280' }}>건물 선택</InputLabel>
                <Select
                  value={selectedBuildingId}
                  label="건물 선택"
                  onChange={(e) => setSelectedBuildingId(e.target.value as number | '')}
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
                  <MenuItem value="">전체 건물</MenuItem>
                  {buildings.map((building) => (
                    <MenuItem key={building.id} value={building.id}>
                      {building.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={9}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" sx={{ color: '#6b7280' }}>
                  총 {filteredUnits.length}개 호실
                  {selectedBuildingId && (
                    <>
                      {' '}(전체 {units.length}개 중)
                    </>
                  )}
                </Typography>
                {selectedBuildingId && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setSelectedBuildingId('')}
                    sx={{
                      borderColor: '#d1d5db',
                      color: '#6b7280',
                      fontSize: '0.75rem',
                      px: 2,
                      py: 0.5,
                      '&:hover': {
                        borderColor: '#9ca3af',
                        backgroundColor: '#f9fafb',
                      }
                    }}
                  >
                    필터 초기화
                  </Button>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

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
                  호실번호
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
                  층수
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  호실 유형
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  면적(㎡)
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  월세
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  보증금
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        호실 목록을 불러오는 중...
                      </Typography>
                    </Box>
                    </TableCell>
                  </TableRow>
                ) : filteredUnits.length === 0 ? (
                  <TableRow>
                  <TableCell colSpan={9} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    color: '#6b7280',
                    fontSize: '0.875rem',
                  }}>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>
                      {selectedBuildingId ? '선택한 건물에 등록된 호실이 없습니다.' : '등록된 호실이 없습니다.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUnits.map((unit) => (
                  <TableRow key={unit.id} hover sx={{
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
                      {unit.unitNumber}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {unit.buildingName}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {unit.floor}층
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {getUnitTypeLabel(unit.unitType)}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {unit.area}㎡
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {unit.monthlyRent.toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {unit.deposit.toLocaleString()}원
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getUnitStatusLabel(unit.status)}
                        color={getUnitStatusColor(unit.status) as any}
                        size="small"
                        sx={{
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                      <TableCell>
                          <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(unit)}
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
                            onClick={() => handleOpenManagementFeeDialog(unit)}
                            sx={{
                              color: theme.palette.success.main,
                              '&:hover': {
                                backgroundColor: 'rgba(72, 187, 120, 0.08)',
                              }
                            }}
                          >
                            <PaymentIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                        size="small"
                            onClick={() => handleDelete(unit.id)}
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

      {/* 호실 추가/수정 다이얼로그 */}
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
          {editingUnit ? '호실 정보 수정' : '새 호실 추가'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            {/* 호실번호 */}
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
          <TextField
            fullWidth
                label="호실번호"
            value={formData.unitNumber}
                onChange={(e) => handleInputChange('unitNumber', e.target.value)}
            required
                placeholder="호실번호를 입력하세요"
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

            {/* 건물 선택 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>건물</InputLabel>
            <Select
              value={formData.buildingId}
              label="건물"
                  onChange={(e) => handleInputChange('buildingId', e.target.value)}
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
              {buildings.map((building) => (
                <MenuItem key={building.id} value={building.id}>
                  {building.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
            </Grid>

            {/* 층수 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
                label="층수"
            type="number"
            value={formData.floor}
                onChange={(e) => handleInputChange('floor', e.target.value)}
            required
                placeholder="층수를 입력하세요"
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

            {/* 호실 유형 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>호실 유형</InputLabel>
            <Select
              value={formData.unitType}
                  label="호실 유형"
                  onChange={(e) => handleInputChange('unitType', e.target.value)}
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
              <MenuItem value="ONE_BEDROOM">원룸</MenuItem>
              <MenuItem value="TWO_BEDROOM">투룸</MenuItem>
              <MenuItem value="THREE_BEDROOM">쓰리룸</MenuItem>
              <MenuItem value="FOUR_BEDROOM">포룸</MenuItem>
            </Select>
          </FormControl>
            </Grid>

            {/* 면적 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
                label="면적(㎡)"
            type="number"
            value={formData.area}
                onChange={(e) => handleInputChange('area', e.target.value)}
            required
                placeholder="면적을 입력하세요"
                variant="outlined"
                size="medium"
                inputProps={{ min: 1, max: 1000, step: 0.1 }}
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

            {/* 월세 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
                label="월세(원)"
            type="number"
            value={formData.monthlyRent}
                onChange={(e) => handleInputChange('monthlyRent', e.target.value)}
            required
                placeholder="월세를 입력하세요"
                variant="outlined"
                size="medium"
                inputProps={{ min: 0, max: 10000000 }}
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

            {/* 보증금 */}
            <Grid item xs={12} md={6}>
          <TextField
            fullWidth
                label="보증금(원)"
            type="number"
            value={formData.deposit}
                onChange={(e) => handleInputChange('deposit', e.target.value)}
                placeholder="보증금을 입력하세요"
                variant="outlined"
                size="medium"
                inputProps={{ min: 0, max: 100000000 }}
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

            {/* 상태 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
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
                  <MenuItem value="AVAILABLE">빈방</MenuItem>
                  <MenuItem value="OCCUPIED">입주중</MenuItem>
                  <MenuItem value="MAINTENANCE">점검중</MenuItem>
            </Select>
          </FormControl>
            </Grid>

            {/* 이미지 업로드 섹션 */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2, mb: 1 }}>
                <Typography variant="subtitle1" sx={{ 
                  color: '#374151', 
                  fontWeight: 600,
                  mb: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <PhotoCameraIcon sx={{ fontSize: 20 }} />
                  호실 이미지 (최대 5장)
                </Typography>

                {/* 이미지 선택 버튼 */}
                <Box sx={{ mb: 2 }}>
                  <input
                    accept="image/*"
                    style={{ display: 'none' }}
                    id="unit-image-upload"
                    multiple
                    type="file"
                    onChange={handleImageSelect}
                  />
                  <label htmlFor="unit-image-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                      disabled={uploadingImages || (existingImages.length + selectedImages.length) >= 5}
                      sx={{
                        borderRadius: 1,
                        px: 3,
                        py: 1.5,
                        borderColor: '#d1d5db',
                        color: '#6b7280',
                        '&:hover': {
                          borderColor: '#9ca3af',
                          backgroundColor: '#f9fafb',
                        },
                        '&.Mui-disabled': {
                          borderColor: '#e5e7eb',
                          color: '#9ca3af',
                        }
                      }}
                    >
                      이미지 선택
                    </Button>
                  </label>
                </Box>

                {/* 기존 이미지 미리보기 */}
                {existingImages.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                        기존 이미지 ({existingImages.length}장)
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteImageIcon />}
                        onClick={handleReplaceAllImages}
                        sx={{
                          fontSize: '0.75rem',
                          py: 0.5,
                          px: 1.5,
                          borderRadius: 1,
                        }}
                      >
                        모두 삭제
                      </Button>
                    </Box>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      p: 2,
                      backgroundColor: '#f9fafb',
                      borderRadius: 1,
                      border: '1px solid #e5e7eb'
                    }}>
                      {existingImages.map((imageUrl, index) => (
                        <Box key={`existing-${index}`} sx={{ position: 'relative' }}>
                          <img
                            src={getAbsoluteImageUrl(imageUrl)}
                            alt={`기존 이미지 ${index + 1}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #e5e7eb'
                            }}
                          />
                          <IconButton
                            onClick={() => handleRemoveExistingImage(imageUrl)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: '#ef4444',
                              color: 'white',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                backgroundColor: '#dc2626',
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* 새로 선택된 이미지 미리보기 */}
                {selectedImages.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" sx={{ color: '#1e40af', fontWeight: 500 }}>
                        새로 선택된 이미지 ({selectedImages.length}장)
                      </Typography>
                      {existingImages.length === 0 && selectedImages.length > 0 && (
                        <Chip
                          label="기존 사진 모두 교체됨"
                          size="small"
                          sx={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                    <Box sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      p: 2,
                      backgroundColor: '#f0f9ff',
                      borderRadius: 1,
                      border: '1px solid #bfdbfe'
                    }}>
                      {selectedImages.map((imageFile, index) => (
                        <Box key={`new-${index}`} sx={{ position: 'relative' }}>
                          <img
                            src={imageFile.preview}
                            alt={`새 이미지 ${index + 1}`}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 4,
                              border: '1px solid #bfdbfe'
                            }}
                          />
                          <IconButton
                            onClick={() => handleRemoveSelectedImage(imageFile.id)}
                            sx={{
                              position: 'absolute',
                              top: -8,
                              right: -8,
                              backgroundColor: '#ef4444',
                              color: 'white',
                              width: 24,
                              height: 24,
                              '&:hover': {
                                backgroundColor: '#dc2626',
                              }
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                {/* 이미지 업로드 진행 중 표시 */}
                {uploadingImages && (
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 2, 
                    p: 2,
                    backgroundColor: '#fef3c7',
                    borderRadius: 1,
                    border: '1px solid #fbbf24'
                  }}>
                    <CircularProgress size={20} />
                    <Typography variant="body2" sx={{ color: '#92400e' }}>
                      이미지를 업로드하고 있습니다...
                    </Typography>
                  </Box>
                )}

                {/* 이미지 개수 제한 안내 */}
                {(existingImages.length + selectedImages.length) >= 5 && (
                  <Typography variant="body2" sx={{ 
                    color: '#dc2626', 
                    mt: 1,
                    fontSize: '0.875rem'
                  }}>
                    최대 5장까지만 업로드 가능합니다.
                  </Typography>
                )}
              </Box>
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
          >
            {editingUnit ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 관리비 청구 다이얼로그 */}
      <Dialog
        open={managementFeeDialog}
        onClose={handleCloseManagementFeeDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
          관리비 청구 - {selectedUnit?.unitNumber}호
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                label="청구 금액 (원)"
                type="number"
                value={managementFeeForm.chargeAmount}
                onChange={(e) => setManagementFeeForm({
                  ...managementFeeForm,
                  chargeAmount: e.target.value
                })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>청구 사유</InputLabel>
                <Select
                  value={managementFeeForm.chargeDescription}
                  onChange={(e) => setManagementFeeForm({
                    ...managementFeeForm,
                    chargeDescription: e.target.value
                  })}
                  label="청구 사유"
                  sx={{
                    borderRadius: 1,
                  }}
                >
                  <MenuItem value="월 관리비">월 관리비</MenuItem>
                  <MenuItem value="전기료">전기료</MenuItem>
                  <MenuItem value="수도료">수도료</MenuItem>
                  <MenuItem value="가스료">가스료</MenuItem>
                  <MenuItem value="인터넷료">인터넷료</MenuItem>
                  <MenuItem value="엘리베이터 유지비">엘리베이터 유지비</MenuItem>
                  <MenuItem value="청소비">청소비</MenuItem>
                  <MenuItem value="보안비">보안비</MenuItem>
                  <MenuItem value="시설 보수비">시설 보수비</MenuItem>
                  <MenuItem value="기타 관리비">기타 관리비</MenuItem>
                  <MenuItem value="연체료">연체료</MenuItem>
                  <MenuItem value="손해배상금">손해배상금</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="납부 마감일"
                type="date"
                value={managementFeeForm.dueDate}
                onChange={(e) => setManagementFeeForm({
                  ...managementFeeForm,
                  dueDate: e.target.value
                })}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1,
                  }
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Alert severity="info" sx={{ mt: 1 }}>
                관리비를 청구하면 해당 호실 입주자의 연결된 은행계좌에서 즉시 자동이체가 실행됩니다.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 2 }}>
          <Button
            onClick={handleCloseManagementFeeDialog}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 1,
              fontWeight: 600,
              color: '#374151',
              '&:hover': {
                backgroundColor: '#f3f4f6',
              }
            }}
          >
            취소
          </Button>
          <Button
            onClick={handleChargeManagementFee}
            variant="contained"
            disabled={chargingFee || !managementFeeForm.chargeAmount || !managementFeeForm.chargeDescription}
            startIcon={chargingFee ? <CircularProgress size={20} /> : <PaymentIcon />}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 1,
              backgroundColor: theme.palette.success.main,
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: theme.palette.success.dark,
              }
            }}
          >
            {chargingFee ? '처리 중...' : '관리비 청구'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 관리비 청구 이력 다이얼로그 */}
      <Dialog
        open={showChargeHistory}
        onClose={() => setShowChargeHistory(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 1,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
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
          관리비 청구 이력
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    건물명
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    호실
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    청구금액
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    청구사유
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    청구일시
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    납부마감일
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    상태
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc' }}>
                    청구자
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {managementFeeCharges.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: '#6b7280' }}>
                      관리비 청구 이력이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  managementFeeCharges.map((charge) => (
                    <TableRow key={charge.id} hover>
                      <TableCell>{charge.buildingName}</TableCell>
                      <TableCell>{charge.unitNumber}호</TableCell>
                      <TableCell>{formatCurrency(charge.chargeAmount)}</TableCell>
                      <TableCell>{charge.chargeDescription}</TableCell>
                      <TableCell>{new Date(charge.chargeDate).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>{new Date(charge.dueDate).toLocaleDateString('ko-KR')}</TableCell>
                      <TableCell>
                        <Chip
                          label={getStatusLabel(charge.status)}
                          color={getStatusColor(charge.status) as any}
                          size="small"
                          sx={{ borderRadius: 1, fontWeight: 500 }}
                        />
                      </TableCell>
                      <TableCell>{charge.chargedByUserName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setShowChargeHistory(false)}
            sx={{
              px: 3,
              py: 1.5,
              borderRadius: 1,
              fontWeight: 600,
            }}
          >
            닫기
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



