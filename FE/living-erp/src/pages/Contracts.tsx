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
  Description as DescriptionIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { createApiUrl, createErrorMessage } from '../config/api';
import { getReservationsByStatus } from '../services/reservationService';

interface Contract {
  id: number;
  contractNumber: string;
  residentName: string;
  residentId: number;
  unitId: number; // 호실 ID 추가
  buildingName: string;
  buildingAddress: string; // 건물 주소 추가
  unitNumber: string;
  startDate: string;
  endDate: string;
  deposit: number;
  monthlyRent: number;
  monthlyManagementFee: number;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
  contractImageUrl?: string; // 계약서 이미지 URL
  createdAt: string;
  updatedAt: string;
}

interface Resident {
  id: number;
  username: string;
  name: string;
}

interface Unit {
  id: number;
  unitNumber: string;
  buildingName: string;
  buildingId: number; // 건물 ID 추가
  monthlyRent: number;
  monthlyManagementFee: number;
  deposit?: number; // 보증금 필드 추가 (선택적)
}

interface Building {
  id: number;
  name: string;
  address: string;
  addressDetail: string;
  zipCode: string;
  buildingType: string;
  totalFloors: number;
  totalUnits: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ContractFormData {
  contractNumber: string;
  residentId: string;
  unitId: string;
  startDate: Dayjs;
  endDate: Dayjs;
  deposit: string;
  monthlyRent: string;
  status: string;
  contractImageUrl: string; // 계약서 이미지 URL
}

interface Reservation {
  id: number;
  buildingId: number;
  unitId: number;
  name: string;
  email: string;
  phone: string;
  age: string;
  occupation: string;
  currentResidence: string;
  moveInDate: string;
  residencePeriod: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Contracts() {
  const theme = useTheme();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmedReservations, setConfirmedReservations] = useState<Reservation[]>([]);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [formData, setFormData] = useState<ContractFormData>({
    contractNumber: '',
    residentId: '',
    unitId: '',
    startDate: dayjs(),
    endDate: dayjs().add(1, 'year'),
    deposit: '',
    monthlyRent: '',
    status: 'PENDING',
    contractImageUrl: '',
  });
  const [contractImageFile, setContractImageFile] = useState<File | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // 계약 목록, 입주자 목록, 호실 목록 조회
  useEffect(() => {
    fetchData();
  }, []);

  // 확정된 예약 불러오기
  const fetchConfirmedReservations = async () => {
    try {
      const reservations = await getReservationsByStatus('CONFIRMED');
      setConfirmedReservations(reservations);
    } catch (error: any) {
      console.error('확정된 예약 조회 실패:', error);
      setSnackbar({
        open: true,
        message: '확정된 예약을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // 입주자 목록과 호실 목록을 병렬로 가져오기
      const [residentsResponse, unitsResponse] = await Promise.all([
        axios.get(createApiUrl('/api/users')),
        axios.get(createApiUrl('/api/units'))
      ]);
      
      // 입주자 목록 설정
      if (residentsResponse.data.success) {
        setResidents(residentsResponse.data.data || []);
      }
      
      // 호실 목록 설정
      if (unitsResponse.data.success) {
        setUnits(unitsResponse.data.data || []);
      }
      
      // 계약 목록 조회
      const contractsResponse = await axios.get(createApiUrl('/api/contracts'));
      
      if (contractsResponse.data.success) {
        const contractsData = contractsResponse.data.data || [];
        
        // 각 계약에 대해 사용자와 호실 정보를 병렬로 가져오기
        const enrichedContracts = await Promise.all(
          contractsData.map(async (contract: any) => {
            const [userInfo, unitInfo] = await Promise.all([
              fetchUserInfo(contract.userId || contract.residentId),
              fetchUnitInfo(contract.unitId)
            ]);
            
            // 호실 정보가 있으면 건물 정보도 가져오기
            let buildingInfo = null;
            if (unitInfo && unitInfo.buildingId) {
              buildingInfo = await fetchBuildingInfo(unitInfo.buildingId);
            }
            
            return {
              ...contract,
              residentId: contract.userId || contract.residentId, // userId가 있으면 사용, 없으면 residentId 사용
              unitId: contract.unitId, // unitId 추가
              residentName: userInfo ? userInfo.name : '사용자 정보 없음',
              buildingName: buildingInfo ? buildingInfo.name : (unitInfo ? unitInfo.buildingName : '건물 정보 없음'),
              buildingAddress: buildingInfo ? `${buildingInfo.address} ${buildingInfo.addressDetail}` : '',
              unitNumber: unitInfo ? unitInfo.unitNumber : '호실 정보 없음',
            };
          })
        );
        
        setContracts(enrichedContracts);
      } else {
        setSnackbar({
          open: true,
          message: contractsResponse.data.message || '계약 목록을 불러오는데 실패했습니다.',
          severity: 'error'
        });
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

  // 사용자 정보를 가져오는 함수
  const fetchUserInfo = async (userId: number) => {
    try {
      const response = await axios.get(createApiUrl(`/api/users/${userId}`));
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`사용자 ${userId} 정보 조회 실패:`, error);
      return null;
    }
  };

  // 호실 정보를 가져오는 함수
  const fetchUnitInfo = async (unitId: number) => {
    try {
      const response = await axios.get(createApiUrl(`/api/units/${unitId}`));
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`호실 ${unitId} 정보 조회 실패:`, error);
      return null;
    }
  };

  // 건물 정보를 가져오는 함수
  const fetchBuildingInfo = async (buildingId: number) => {
    try {
      const response = await axios.get(createApiUrl(`/api/buildings/${buildingId}`));
      if (response.data.success) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error(`건물 ${buildingId} 정보 조회 실패:`, error);
      return null;
    }
  };

  // 예약에서 계약 정보 불러오기
  const handleSelectReservation = async (reservation: Reservation) => {
    try {
      console.log('예약 정보 적용 시작:', reservation);
      
      // 예약 정보를 바탕으로 사용자 찾기 또는 생성
      let matchingResident = residents.find(r => r.name === reservation.name);
      console.log('매칭된 입주자:', matchingResident);
      
      if (!matchingResident) {
        // 사용자가 없으면 새로 생성하거나 기본값 사용
        console.log('예약자와 일치하는 입주자를 찾을 수 없습니다:', reservation.name);
      }

      // 호실 정보 확인
      const matchingUnit = units.find(u => u.id === reservation.unitId);
      console.log('매칭된 호실:', matchingUnit);
      
      if (!matchingUnit) {
        console.log('호실을 찾을 수 없습니다. unitId:', reservation.unitId);
        setSnackbar({
          open: true,
          message: '해당 호실 정보를 찾을 수 없습니다.',
          severity: 'warning'
        });
        return;
      }

      // 계약번호 자동 생성 (예: CON-YYYYMMDD-XXX)
      const today = new Date();
      const dateStr = today.getFullYear().toString() + 
                     (today.getMonth() + 1).toString().padStart(2, '0') + 
                     today.getDate().toString().padStart(2, '0');
      const contractNumber = `CON-${dateStr}-${String(Date.now()).slice(-3)}`;
      console.log('생성된 계약번호:', contractNumber);

      // 거주 기간에서 숫자만 추출 (예: "6개월" -> 6)
      const residencePeriodNumber = parseInt(reservation.residencePeriod.replace(/[^0-9]/g, '')) || 12;
      console.log('거주 기간:', reservation.residencePeriod, '-> 숫자:', residencePeriodNumber);

      // 날짜 파싱 확인
      const startDate = dayjs(reservation.moveInDate);
      const endDate = startDate.add(residencePeriodNumber, 'month');
      console.log('시작일:', startDate.format('YYYY-MM-DD'), '종료일:', endDate.format('YYYY-MM-DD'));

      // 호실 정보에서 보증금, 월세(관리비 포함) 가져오기
      const baseRent = matchingUnit?.monthlyRent || 0;
      const managementFee = matchingUnit?.monthlyManagementFee || 0;
      const totalMonthlyRent = baseRent + managementFee; // 월세 + 관리비
      const deposit = matchingUnit?.deposit || (totalMonthlyRent ? totalMonthlyRent * 10 : 0); // 보증금이 없으면 총 월세의 10배로 계산

      // 폼 데이터 설정
      const newFormData = {
        contractNumber: contractNumber,
        residentId: matchingResident ? matchingResident.id?.toString() || '' : '',
        unitId: reservation.unitId ? reservation.unitId.toString() : '',
        startDate: startDate,
        endDate: endDate,
        deposit: deposit.toString(),
        monthlyRent: totalMonthlyRent.toString(), // 월세 + 관리비
        status: 'PENDING',
      };
      
      console.log('설정할 폼 데이터:', newFormData);
      setFormData(newFormData);

      setShowReservationDialog(false);
      
      setSnackbar({
        open: true,
        message: '예약 정보가 계약 폼에 적용되었습니다.',
        severity: 'success'
      });

    } catch (error: any) {
      console.error('예약 정보 적용 실패:', error);
      console.error('에러 스택:', error.stack);
      setSnackbar({
        open: true,
        message: `예약 정보를 적용하는데 실패했습니다: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleOpenDialog = (contract?: Contract) => {
    if (contract) {
      setEditingContract(contract);
      setFormData({
        contractNumber: contract.contractNumber,
        residentId: contract.residentId.toString(),
        unitId: contract.unitId ? contract.unitId.toString() : '', // 호실 ID 설정
        startDate: dayjs(contract.startDate),
        endDate: dayjs(contract.endDate),
        deposit: contract.deposit.toString(),
        monthlyRent: contract.monthlyRent.toString(),
        status: contract.status,
        contractImageUrl: contract.contractImageUrl || '',
      });
      setContractImageFile(null);
    } else {
      setEditingContract(null);
      setFormData({
        contractNumber: '',
        residentId: '',
        unitId: '',
        startDate: dayjs(),
        endDate: dayjs().add(1, 'year'),
        deposit: '',
        monthlyRent: '',
        status: 'PENDING',
        contractImageUrl: '',
      });
      setContractImageFile(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingContract(null);
    setFormData({
      contractNumber: '',
      residentId: '',
      unitId: '',
      startDate: dayjs(),
      endDate: dayjs().add(1, 'year'),
      deposit: '',
      monthlyRent: '',
      status: 'PENDING',
      contractImageUrl: '',
    });
    setContractImageFile(null);
  };

  const handleInputChange = (field: keyof ContractFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setContractImageFile(file);
    }
  };

  const handleSubmit = async () => {
    // 폼 유효성 검사
    if (!formData.contractNumber || !formData.residentId || !formData.unitId || !formData.startDate || !formData.endDate) {
      setSnackbar({
        open: true,
        message: '필수 항목을 모두 입력해주세요.',
        severity: 'warning'
      });
      return;
    }

    try {
      // 파일 업로드 처리
      let imageUrl = formData.contractImageUrl;
      if (contractImageFile) {
        const formDataForUpload = new FormData();
        formDataForUpload.append('file', contractImageFile);

        try {
          const uploadResponse = await axios.post(
            createApiUrl('/api/files/upload'),
            formDataForUpload,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );

          if (uploadResponse.data.success) {
            imageUrl = uploadResponse.data.data.url || uploadResponse.data.data;
          }
        } catch (uploadError) {
          console.error('파일 업로드 실패:', uploadError);
          setSnackbar({
            open: true,
            message: '이미지 업로드에 실패했습니다.',
            severity: 'error'
          });
          return;
        }
      }

      const contractData = {
        contractNumber: formData.contractNumber,
        userId: parseInt(formData.residentId), // residentId를 userId로 매핑
        unitId: parseInt(formData.unitId),
        startDate: formData.startDate.format('YYYY-MM-DD'),
        endDate: formData.endDate.format('YYYY-MM-DD'),
        deposit: parseInt(formData.deposit) || 0,
        monthlyRent: parseInt(formData.monthlyRent) || 0,
        status: formData.status,
        moveInDate: formData.startDate.format('YYYY-MM-DD'), // 입주일은 시작일과 동일하게 설정
        paymentDay: parseInt(formData.startDate.format('DD')), // 납부일은 시작일의 일자로 설정
        contractImageUrl: imageUrl || null
      };

      if (editingContract) {
        // 계약 수정
        const response = await axios.put(
          createApiUrl('/api/contracts', editingContract.id),
          contractData
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '계약 정보가 수정되었습니다.',
            severity: 'success'
          });
          fetchData(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
        } else {
          setSnackbar({
            open: true,
            message: response.data.message || '계약 수정에 실패했습니다.',
            severity: 'error'
          });
        }
      } else {
        // 새 계약 추가
        const response = await axios.post(
          createApiUrl('/api/contracts'),
          contractData
        );
        
        if (response.data.success) {
          setSnackbar({
            open: true,
            message: '새 계약이 추가되었습니다.',
            severity: 'success'
          });
          fetchData(); // 목록 새로고침
          handleCloseDialog(); // 모달 닫기
      } else {
          setSnackbar({
            open: true,
            message: response.data.message || '계약 추가에 실패했습니다.',
            severity: 'error'
          });
        }
      }
    } catch (error: any) {
      console.error('계약 저장 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('정말로 이 계약을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const response = await axios.delete(createApiUrl('/api/contracts', id));
      
      if (response.data.success) {
        setSnackbar({
          open: true,
          message: '계약이 삭제되었습니다.',
          severity: 'success'
        });
        fetchData(); // 목록 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '계약 삭제에 실패했습니다.',
          severity: 'error'
        });
      }
    } catch (error: any) {
        console.error('계약 삭제 실패:', error);
      const errorMessage = createErrorMessage(error);
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: 'error'
      });
    }
  };

  // 계약 상태에 따른 색상 및 라벨
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#f59e0b'; // 오렌지 (대기중)
      case 'ACTIVE':
        return '#10b981'; // 그린 (활성)
      case 'EXPIRED':
        return '#ef4444'; // 레드 (만료)
      case 'TERMINATED':
        return '#6b7280'; // 그레이 (종료)
      default:
        return '#1e3a8a';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '계약대기';
      case 'ACTIVE':
        return '계약완료';
      case 'EXPIRED':
        return '계약만료';
      case 'TERMINATED':
        return '계약종료';
      default:
        return status;
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount);
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
          계약 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <DescriptionIcon sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
          계약 관리
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
          새 계약 추가
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
                  계약번호
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  입주자
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  건물/호실
                </TableCell>
                <TableCell sx={{ 
                  fontWeight: 600, 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0',
                  color: '#374151',
                  fontSize: '0.875rem',
                  py: 2,
                }}>
                  계약기간
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
                  <TableCell colSpan={8} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                  }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <CircularProgress size={40} />
                      <Typography variant="body1" sx={{ color: '#6b7280' }}>
                        계약 목록을 불러오는 중...
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : contracts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} sx={{ 
                    textAlign: 'center', 
                    py: 6,
                    color: '#6b7280',
                    fontSize: '0.875rem',
                  }}>
                    <Typography variant="body1" sx={{ color: '#6b7280' }}>
                    등록된 계약이 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                contracts.map((contract) => (
                  <TableRow key={contract.id} hover sx={{
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
                      {contract.contractNumber}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {contract.residentName}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                          {contract.buildingName} / {contract.unitNumber}
                        </Typography>
                        {contract.buildingAddress && (
                          <Typography variant="caption" sx={{ color: '#6b7280', display: 'block' }}>
                            {contract.buildingAddress}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {formatDate(contract.startDate)} ~ {formatDate(contract.endDate)}
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {formatCurrency(contract.deposit)}원
                    </TableCell>
                    <TableCell sx={{ color: '#4b5563' }}>
                      {formatCurrency(contract.monthlyRent)}원
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(contract.status)}
                        size="small"
                        sx={{
                          backgroundColor: getStatusColor(contract.status),
                          color: 'white',
                          borderRadius: 1,
                          fontWeight: 500,
                          fontSize: '0.75rem',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        onClick={() => handleOpenDialog(contract)}
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
                        onClick={() => handleDelete(contract.id)}
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

      {/* 계약 추가/수정 다이얼로그 */}
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
          {editingContract ? '계약 정보 수정' : '새 계약 추가'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 3 }}>
          {/* 확정된 예약에서 불러오기 버튼 */}
          {!editingContract && (
            <Box sx={{ mt: 3, mb: 3, p: 2, backgroundColor: '#f0f9ff', borderRadius: 1, border: '1px solid #bfdbfe' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#1e40af', fontWeight: 600 }}>
                    확정된 방문 예약에서 정보 불러오기
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#3b82f6', display: 'block', mt: 0.5 }}>
                    확정된 방문 예약 정보를 기반으로 계약을 빠르게 생성할 수 있습니다.
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    fetchConfirmedReservations();
                    setShowReservationDialog(true);
                  }}
                  sx={{
                    borderColor: '#3b82f6',
                    color: '#1e40af',
                    '&:hover': {
                      borderColor: '#1e40af',
                      backgroundColor: '#dbeafe',
                    }
                  }}
                >
                  예약 불러오기
                </Button>
              </Box>
            </Box>
          )}

          <Grid container spacing={2.5}>
            {/* 계약번호 */}
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
          <TextField
            fullWidth
                label="계약번호"
            value={formData.contractNumber}
                onChange={(e) => handleInputChange('contractNumber', e.target.value)}
            required
                placeholder="계약번호를 입력하세요"
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

            {/* 입주자 */}
            <Grid item xs={12} md={6} sx={{ mt: 3 }}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>입주자</InputLabel>
            <Select
              value={formData.residentId}
              label="입주자"
                  onChange={(e) => handleInputChange('residentId', e.target.value)}
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
              {residents.map((resident) => (
                <MenuItem key={resident.id} value={resident.id}>
                  {resident.name} ({resident.username})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
            </Grid>

            {/* 호실 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>호실</InputLabel>
            <Select
              value={formData.unitId}
                  label="호실"
                  onChange={(e) => handleInputChange('unitId', e.target.value)}
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
              {units.map((unit) => (
                <MenuItem key={unit.id} value={unit.id}>
                  {unit.buildingName} {unit.unitNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
            </Grid>

            {/* 계약상태 */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth required>
                <InputLabel sx={{ color: '#6b7280' }}>계약상태</InputLabel>
                <Select
                  value={formData.status}
                  label="계약상태"
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
                  <MenuItem value="PENDING">계약대기</MenuItem>
                  <MenuItem value="ACTIVE">계약완료</MenuItem>
                  <MenuItem value="EXPIRED">계약만료</MenuItem>
                  <MenuItem value="TERMINATED">계약종료</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* 계약시작일 */}
            <Grid item xs={12} md={6}>
          <DatePicker
                label="계약시작일"
            value={formData.startDate}
                onChange={(date) => handleInputChange('startDate', date)}
                sx={{
                  width: '100%',
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

            {/* 계약종료일 */}
            <Grid item xs={12} md={6}>
          <DatePicker
                label="계약종료일"
            value={formData.endDate}
                onChange={(date) => handleInputChange('endDate', date)}
                sx={{
                  width: '100%',
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
                placeholder="월세를 입력하세요"
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

            {/* 계약서 이미지 업로드 */}
            <Grid item xs={12}>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#6b7280', fontWeight: 500 }}>
                  계약서 이미지
                </Typography>
                <Button
                  variant="outlined"
                  component="label"
                  sx={{
                    borderRadius: 1,
                    borderColor: '#d1d5db',
                    color: '#6b7280',
                    textTransform: 'none',
                    '&:hover': {
                      borderColor: '#9ca3af',
                      backgroundColor: '#f9fafb',
                    }
                  }}
                >
                  파일 선택
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleFileChange}
                  />
                </Button>
                {contractImageFile && (
                  <Typography variant="body2" sx={{ mt: 1, color: '#4b5563' }}>
                    선택된 파일: {contractImageFile.name}
                  </Typography>
                )}
                {!contractImageFile && formData.contractImageUrl && (
                  <Typography variant="body2" sx={{ mt: 1, color: '#4b5563' }}>
                    현재 이미지: <a href={formData.contractImageUrl} target="_blank" rel="noopener noreferrer">보기</a>
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
            {editingContract ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 확정된 예약 선택 다이얼로그 */}
      <Dialog 
        open={showReservationDialog} 
        onClose={() => setShowReservationDialog(false)} 
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
          확정된 방문 예약 선택
        </DialogTitle>
        
        <DialogContent sx={{ p: 0 }}>
          {confirmedReservations.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#6b7280' }}>
                확정된 방문 예약이 없습니다.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      예약자명
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      연락처
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      호실 ID
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      입주 희망일
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      거주 예정 기간
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      작업
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {confirmedReservations.map((reservation) => (
                    <TableRow key={reservation.id} hover>
                      <TableCell sx={{ py: 2 }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: '#1f2937' }}>
                            {reservation.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6b7280' }}>
                            {reservation.email}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#4b5563' }}>
                        {reservation.phone}
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#4b5563' }}>
                        {reservation.unitId}
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#4b5563' }}>
                        {new Date(reservation.moveInDate).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell sx={{ py: 2, color: '#4b5563' }}>
                        {reservation.residencePeriod}
                      </TableCell>
                      <TableCell sx={{ py: 2 }}>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleSelectReservation(reservation)}
                          sx={{
                            backgroundColor: theme.palette.primary.main,
                            '&:hover': {
                              backgroundColor: theme.palette.primary.dark,
                            }
                          }}
                        >
                          선택
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          <Button 
            onClick={() => setShowReservationDialog(false)} 
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



