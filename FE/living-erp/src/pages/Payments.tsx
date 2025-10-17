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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tabs,
  Tab,
  CircularProgress,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle, Warning, Payment as PaymentIcon, Receipt, AttachMoney, Home as HomeIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import axios from 'axios';
import { createApiUrl, extractApiData, createErrorMessage } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Payment {
  id: number;
  contractId: number;
  userId: number;
  unitId: number;
  buildingId: number;
  paymentType: string;
  paymentCategory: string;
  title: string;
  description: string;
  amount: number;
  dueDate: string;
  status: string;
  paidDate: string | null;
  paymentDate: string | null;
  paymentMethod: string | null;
  managementChargeId: number | null;
  hanaBankTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
  unitNumber: string;
  buildingName: string;
}

interface ManagementFeeCharge {
  id: number;
  unitId: number;
  unitNumber: string;
  buildingName: string;
  chargeAmount: number;
  chargeDescription: string;
  chargeDate: string;
  dueDate: string;
  status: string;
  autoPaymentTriggered: string;
  paymentId?: number;
  chargedByUserName: string;
}

interface Contract {
  id: number;
  residentName: string;
  buildingName: string;
  unitNumber: string;
  monthlyRent: number;
  monthlyManagementFee: number;
}

export default function Payments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [managementFeeCharges, setManagementFeeCharges] = useState<ManagementFeeCharge[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChargesLoading, setIsChargesLoading] = useState(true);
  const [formData, setFormData] = useState({
    contractId: '',
    paymentType: 'RENT',
    amount: '',
    dueDate: dayjs(),
    paymentDate: null as any,
    status: 'PENDING',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [mainTabValue, setMainTabValue] = useState(0);
  const [paymentTabValue, setPaymentTabValue] = useState(1); // 납부 완료 탭을 기본값으로 설정

  useEffect(() => {
    if (token) {
      fetchPayments();
      fetchManagementFeeCharges();
      fetchContracts();
    }
  }, [token]);


  const fetchPayments = async () => {
    if (!token) {
      console.error('토큰이 없습니다.');
      setPayments([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(createApiUrl('/api/payments'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      // 하나원큐리빙 백엔드 ApiResponse 구조 처리
      if (response.data && response.data.success && response.data.data) {
        setPayments(response.data.data);
      } else if (Array.isArray(response.data)) {
        setPayments(response.data);
      } else {
        setPayments([]);
      }
    } catch (error: any) {
      console.error('납부 목록 조회 실패:', error);
      setPayments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchManagementFeeCharges = async () => {
    if (!token) {
      console.error('토큰이 없습니다.');
      setManagementFeeCharges([]);
      setIsChargesLoading(false);
      return;
    }

    try {
      setIsChargesLoading(true);
      const response = await axios.get(createApiUrl('/api/management-fee/charges/all'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 하나원큐리빙 백엔드 ApiResponse 구조 처리
      console.log('관리비 요금 API 응답:', response.data);

      if (response.data && response.data.success && response.data.data) {
        console.log('관리비 요금 데이터:', response.data.data);
        setManagementFeeCharges(response.data.data);
      } else if (Array.isArray(response.data)) {
        console.log('관리비 요금 배열 데이터:', response.data);
        setManagementFeeCharges(response.data);
      } else {
        console.log('관리비 요금 데이터 형식이 예상과 다름:', response.data);
        setManagementFeeCharges([]);
      }
    } catch (error: any) {
      console.error('관리비 요금 조회 실패:', error);
      setManagementFeeCharges([]);
    } finally {
      setIsChargesLoading(false);
    }
  };

  const fetchContracts = async () => {
    if (!token) {
      console.error('토큰이 없습니다.');
      setContracts([]);
      return;
    }

    try {
      const response = await axios.get(createApiUrl('/api/contracts'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 하나원큐리빙 백엔드 ApiResponse 구조 처리
      if (response.data && response.data.success && response.data.data) {
        setContracts(response.data.data);
      } else if (Array.isArray(response.data)) {
        setContracts(response.data);
      } else {
        setContracts([]);
      }
    } catch (error: any) {
      console.error('계약 목록 조회 실패:', error);
      setContracts([]);
    }
  };

  const handleOpen = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setFormData({
        contractId: '', // 계약 ID는 별도로 매핑 필요
        paymentType: payment.paymentType,
        amount: payment.amount.toString(),
        dueDate: dayjs(payment.dueDate),
        paymentDate: payment.paymentDate ? dayjs(payment.paymentDate) : null,
        status: payment.status,
      });
    } else {
      setEditingPayment(null);
      setFormData({
        contractId: '',
        paymentType: 'RENT',
        amount: '',
        dueDate: dayjs().add(1, 'month'),
        paymentDate: null,
        status: 'PENDING',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingPayment(null);
    setFormData({
      contractId: '',
      paymentType: 'RENT',
      amount: '',
      dueDate: dayjs().add(1, 'month'),
      paymentDate: null,
      status: 'PENDING',
    });
  };

  const handleSubmit = async () => {
    if (!token) {
      console.error('토큰이 없습니다.');
      setSnackbar({ open: true, message: '인증 토큰이 없습니다.', severity: 'error' });
      return;
    }

    try {
      const requestData = {
        ...formData,
        contractId: parseInt(formData.contractId),
        amount: parseInt(formData.amount),
        dueDate: formData.dueDate.format('YYYY-MM-DD'),
        paymentDate: formData.paymentDate ? formData.paymentDate.format('YYYY-MM-DD') : null,
      };

      if (editingPayment) {
        await axios.put(createApiUrl(`/api/payments/${editingPayment.id}`), requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: '납부 정보가 수정되었습니다.', severity: 'success' });
      } else {
        await axios.post(createApiUrl('/api/payments'), requestData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: '새 납부가 추가되었습니다.', severity: 'success' });
      }
      fetchPayments();
      handleClose();
    } catch (error) {
      console.error('납부 저장 실패:', error);
      setSnackbar({ open: true, message: '저장에 실패했습니다.', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!token) {
      console.error('토큰이 없습니다.');
      setSnackbar({ open: true, message: '인증 토큰이 없습니다.', severity: 'error' });
      return;
    }

    if (window.confirm('정말로 이 납부를 삭제하시겠습니까?')) {
      try {
        await axios.delete(createApiUrl(`/api/payments/${id}`), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSnackbar({ open: true, message: '납부가 삭제되었습니다.', severity: 'success' });
        fetchPayments();
      } catch (error) {
        console.error('납부 삭제 실패:', error);
        setSnackbar({ open: true, message: '삭제에 실패했습니다.', severity: 'error' });
      }
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      PENDING: { label: '대기', color: 'warning' as const, icon: <Warning /> },
      PAID: { label: '납부 완료', color: 'success' as const, icon: <CheckCircle /> },
      COMPLETED: { label: '납부 완료', color: 'success' as const, icon: <CheckCircle /> },
      OVERDUE: { label: '연체', color: 'error' as const, icon: <Warning /> },
      CANCELLED: { label: '취소', color: 'default' as const, icon: <Warning /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig];

    // status가 정의되지 않았거나 매핑되지 않은 경우 기본값 사용
    if (!config) {
      console.warn('Unknown status:', status);
      return <Chip label={status || '알 수 없음'} color="default" size="small" icon={<Warning />} />;
    }

    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  const getPaymentTypeLabel = (type: string) => {
    const typeConfig = {
      RENT: '월세',
      MANAGEMENT_FEE: '관리비',
      DEPOSIT: '보증금',
    };
    const label = typeConfig[type as keyof typeof typeConfig];
    return label || type || '기타';
  };


  const filteredPayments = payments.filter(payment => {
    if (paymentTabValue === 0) return payment.status === 'PENDING';
    if (paymentTabValue === 1) return payment.status === 'PAID' || payment.status === 'COMPLETED';
    if (paymentTabValue === 2) return payment.status === 'OVERDUE';
    return true;
  });


  const filteredCharges = managementFeeCharges.filter(charge => {
    if (paymentTabValue === 0) return charge.status === 'PENDING';
    if (paymentTabValue === 1) return charge.status === 'PAID' || charge.status === 'COMPLETED';
    if (paymentTabValue === 2) return charge.status === 'CANCELLED';
    return true;
  });

  const getTotalAmount = (data: any[]) => {
    return data.reduce((sum, item) => sum + (item.amount || item.chargeAmount || 0), 0);
  };

  const getChargeStatusChip = (status: string) => {
    const statusConfig = {
      PENDING: { label: '대기', color: 'warning' as const, icon: <Warning /> },
      PAID: { label: '납부 완료', color: 'success' as const, icon: <CheckCircle /> },
      CANCELLED: { label: '취소', color: 'error' as const, icon: <Warning /> },
    };
    const config = statusConfig[status as keyof typeof statusConfig];

    // status가 정의되지 않았거나 매핑되지 않은 경우 기본값 사용
    if (!config) {
      console.warn('Unknown charge status:', status);
      return <Chip label={status || '알 수 없음'} color="default" size="small" icon={<Warning />} />;
    }

    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
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
          결제 관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          납부 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PaymentIcon sx={{ fontSize: 32, color: '#009595' }} />
          <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
            납부 관리
          </Typography>
        </Box>
      </Box>

      {/* 메인 탭 */}
      <Tabs
        value={mainTabValue}
        onChange={(e, newValue) => setMainTabValue(newValue)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: '#64748b',
            fontWeight: 500,
            '&.Mui-selected': {
              color: '#009595',
              fontWeight: 600,
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#009595',
          },
        }}
      >
        <Tab label="일반 납부 관리" icon={<PaymentIcon />} />
        <Tab label="관리비 요금 관리" icon={<Receipt />} />
      </Tabs>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AttachMoney sx={{ color: '#009595' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {mainTabValue === 0
                      ? getTotalAmount(filteredPayments).toLocaleString() + '원'
                      : getTotalAmount(filteredCharges).toLocaleString() + '원'
                    }
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 금액
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Receipt sx={{ color: '#f59e0b' }} />
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {mainTabValue === 0
                      ? filteredPayments.filter(p => p.status === 'PENDING').length
                      : filteredCharges.filter(c => c.status === 'PENDING').length
                    }건
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    대기 중
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 상태별 서브 탭 */}
      <Tabs
        value={paymentTabValue}
        onChange={(e, newValue) => setPaymentTabValue(newValue)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: '#64748b',
            fontWeight: 500,
            '&.Mui-selected': {
              color: '#009595',
              fontWeight: 600,
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#009595',
          },
        }}
      >
        <Tab label="대기 중" />
        <Tab label={mainTabValue === 0 ? "납부 완료" : "납부 완료"} />
        <Tab label={mainTabValue === 0 ? "연체" : "취소"} />
        <Tab label="전체" />
      </Tabs>

      {/* 테이블 */}
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
                {mainTabValue === 0 ? (
                  // 일반 납부 관리 테이블 헤더
                  <>
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
                      호실
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      입주자명
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      납부 유형
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      금액 (원)
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      납부 기한
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      납부일
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
                  </>
                ) : (
                  // 관리비 요금 관리 테이블 헤더
                  <>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      ID
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
                      호실 번호
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      요금 설명
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      요금 (원)
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      청구일
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      마감일
                    </TableCell>
                    <TableCell sx={{
                      fontWeight: 600,
                      backgroundColor: '#f8fafc',
                      borderBottom: '2px solid #e2e8f0',
                      color: '#374151',
                      fontSize: '0.875rem',
                      py: 2,
                    }}>
                      자동 납부
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
                      청구자
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {(mainTabValue === 0 ? isLoading : isChargesLoading) ? (
                <TableRow>
                  <TableCell colSpan={mainTabValue === 0 ? 8 : 10} align="center" sx={{ py: 4 }}>
                    <CircularProgress sx={{ color: '#009595' }} />
                  </TableCell>
                </TableRow>
              ) : (mainTabValue === 0 ? filteredPayments : filteredCharges).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={mainTabValue === 0 ? 8 : 10} align="center" sx={{ py: 4 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      데이터가 없습니다.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : mainTabValue === 0 ? (
                // 일반 납부 관리 테이블 바디
                filteredPayments.map((payment) => (
                  <TableRow
                    key={payment.id}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' },
                      '&:hover': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {payment.buildingName || '정보 없음'}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {payment.unitNumber || '정보 없음'}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {payment.userName || payment.residentName || `사용자 ${payment.userId}`}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {getPaymentTypeLabel(payment.paymentCategory || payment.paymentType)}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                    }}>
                      {payment.amount?.toLocaleString() || '0'}원
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {payment.dueDate}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {payment.paidDate || payment.paymentDate || '-'}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {getStatusChip(payment.status)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                // 관리비 요금 관리 테이블 바디
                filteredCharges.map((charge) => (
                  <TableRow
                    key={charge.id}
                    hover
                    sx={{
                      '&:nth-of-type(odd)': { backgroundColor: '#f9fafb' },
                      '&:hover': { backgroundColor: '#f3f4f6' }
                    }}
                  >
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      #{charge.id}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.buildingName}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.unitNumber}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.chargeDescription}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                      fontWeight: 600,
                    }}>
                      {charge.chargeAmount.toLocaleString()}원
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.chargeDate}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.dueDate}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      <Chip
                        label={charge.autoPaymentTriggered === 'Y' ? '자동' : '수동'}
                        color={charge.autoPaymentTriggered === 'Y' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {getChargeStatusChip(charge.status)}
                    </TableCell>
                    <TableCell sx={{
                      fontSize: '0.875rem',
                      color: '#374151',
                      borderBottom: '1px solid #e5e7eb',
                    }}>
                      {charge.chargedByUserName}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <DialogTitle sx={{
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          color: '#1e293b',
          fontWeight: 600,
        }}>
          {editingPayment ? '납부 정보 수정' : '새 납부 추가'}
        </DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>계약</InputLabel>
            <Select
              value={formData.contractId}
              label="계약"
              onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
            >
              {contracts.map((contract) => (
                <MenuItem key={contract.id} value={contract.id}>
                  {contract.residentName} - {contract.buildingName} {contract.unitNumber}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" required>
            <InputLabel>납부 유형</InputLabel>
            <Select
              value={formData.paymentType}
              label="납부 유형"
              onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
            >
              <MenuItem value="RENT">월세</MenuItem>
              <MenuItem value="MANAGEMENT_FEE">관리비</MenuItem>
              <MenuItem value="DEPOSIT">보증금</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="금액 (원)"
            type="number"
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            margin="normal"
            required
          />
          <DatePicker
            label="납부 기한"
            value={formData.dueDate}
            onChange={(newValue) => setFormData({ ...formData, dueDate: newValue || dayjs() })}
            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
          />
          <DatePicker
            label="납부일 (선택사항)"
            value={formData.paymentDate}
            onChange={(newValue) => setFormData({ ...formData, paymentDate: newValue })}
            slotProps={{ textField: { fullWidth: true, margin: 'normal' } }}
          />
          <FormControl fullWidth margin="normal" required>
            <InputLabel>상태</InputLabel>
            <Select
              value={formData.status}
              label="상태"
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <MenuItem value="PENDING">대기</MenuItem>
              <MenuItem value="PAID">납부 완료</MenuItem>
              <MenuItem value="OVERDUE">연체</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>취소</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingPayment ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: '1.25rem',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
