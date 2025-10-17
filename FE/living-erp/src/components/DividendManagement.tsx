import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  Chip,
  Divider,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Calculate as CalculateIcon,
  MonetizationOn as MonetizationOnIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import axios from 'axios';
import { createApiUrl } from '../config/api';
import type { ReitProduct } from '../types/reit';

interface DividendManagementProps {
  productCode: string;
  product: ReitProduct | null;
}

interface DividendInfo {
  productCode: string;
  productName: string;
  totalShares: number;
  availableDividendAmount: number;
  maxDividendPerShare: number;
  calculationDetails?: {
    period: string;
    startDate: string;
    endDate: string;
    buildingCount: number;
    totalRentalIncome: number;
    totalBuildingExpenses: number;
    commonExpenses: number;
    totalExpenses: number;
    taxableIncome: number;
    dividendRate: number;
    availableDividend: number;
    buildingDetails: Array<{
      buildingId: number;
      buildingName: string;
      rentalIncome: number;
      expenses: number;
      netIncome: number;
    }>;
  };
}

interface DividendCalculationResult {
  dividendId: number;
  productCode: string;
  dividendYear: number;
  dividendQuarter: number;
  dividendPerShare: number;
  totalShares: number;
  totalDividendAmount: number;
  recordDate: string;
  paymentDate: string;
  status: string;
}

export default function DividendManagement({ productCode, product }: DividendManagementProps) {
  const [dividendInfo, setDividendInfo] = useState<DividendInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current_year');

  // 배당 계산 다이얼로그 상태
  const [openCalculateDialog, setOpenCalculateDialog] = useState(false);
  const [dividendPerShare, setDividendPerShare] = useState('');
  const [dividendYear, setDividendYear] = useState(new Date().getFullYear());
  const [dividendQuarter, setDividendQuarter] = useState<number | ''>('');
  const [recordDate, setRecordDate] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [basePrice, setBasePrice] = useState(''); // 배당락일 기준 주가

  // 총 발행주식수 수정 다이얼로그 상태
  const [openSharesDialog, setOpenSharesDialog] = useState(false);
  const [totalShares, setTotalShares] = useState('');

  // 결과 상태
  const [calculationResult, setCalculationResult] = useState<DividendCalculationResult | null>(null);

  // 스낵바 상태
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  useEffect(() => {
    if (productCode && product) {
      loadDividendInfo();
    }
  }, [productCode, product, selectedPeriod]);

  const loadDividendInfo = async () => {
    try {
      setLoading(true);
      const response = await axios.get(createApiUrl(`/api/dividend-management/product/${productCode}/info?period=${selectedPeriod}`));

      if (response.data.success) {
        setDividendInfo(response.data.data);
      }
    } catch (error) {
      console.error('배당 정보 로딩 실패:', error);
      setSnackbar({
        open: true,
        message: '배당 정보를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateDividend = async () => {
    if (!dividendPerShare || !recordDate || !paymentDate) {
      setSnackbar({
        open: true,
        message: '모든 필수 항목을 입력해주세요.',
        severity: 'error',
      });
      return;
    }

    // 배당 가능 금액 초과 검증
    if (dividendInfo?.availableDividendAmount && dividendInfo?.totalShares) {
      const requestedTotalDividend = parseFloat(dividendPerShare) * dividendInfo.totalShares;
      if (requestedTotalDividend > dividendInfo.availableDividendAmount) {
        setSnackbar({
          open: true,
          message: `요청한 총 배당금 ₩${requestedTotalDividend.toLocaleString()}이 배당 가능 금액 ₩${dividendInfo.availableDividendAmount.toLocaleString()}을 초과합니다.`,
          severity: 'error',
        });
        return;
      }
    }

    try {
      setLoading(true);

      const requestData = {
        dividendPerShare: parseFloat(dividendPerShare),
        dividendYear,
        dividendQuarter: dividendQuarter || null,
        recordDate,
        paymentDate,
        basePrice: basePrice ? parseFloat(basePrice) : null, // 배당락일 기준 주가
      };

      const response = await axios.post(
        createApiUrl(`/api/dividend-management/product/${productCode}/calculate`),
        requestData
      );

      if (response.data.success) {
        setCalculationResult(response.data.data);
        setSnackbar({
          open: true,
          message: '배당이 성공적으로 등록되었습니다.',
          severity: 'success',
        });
        setOpenCalculateDialog(false);
        loadDividendInfo(); // 정보 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '배당 계산에 실패했습니다.',
          severity: 'error',
        });
      }
    } catch (error: any) {
      console.error('배당 계산 실패:', error);
      const message = error.response?.data?.message || '배당 계산에 실패했습니다.';
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTotalShares = async () => {
    if (!totalShares || parseInt(totalShares) <= 0) {
      setSnackbar({
        open: true,
        message: '올바른 발행주식수를 입력해주세요.',
        severity: 'error',
      });
      return;
    }

    try {
      setLoading(true);

      const response = await axios.put(
        createApiUrl(`/api/dividend-management/product/${productCode}/total-shares`),
        { totalShares: parseInt(totalShares) }
      );

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message,
          severity: 'success',
        });
        setOpenSharesDialog(false);
        loadDividendInfo(); // 정보 새로고침
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || '발행주식수 업데이트에 실패했습니다.',
          severity: 'error',
        });
      }
    } catch (error: any) {
      console.error('발행주식수 업데이트 실패:', error);
      const message = error.response?.data?.message || '발행주식수 업데이트에 실패했습니다.';
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerKsdScheduler = async () => {
    try {
      setLoading(true);

      setSnackbar({
        open: true,
        message: 'KSD 서버에 배당락일 스케줄러 실행을 요청하고 있습니다...',
        severity: 'success',
      });

      const response = await axios.post(
        createApiUrl(`/api/dividend-management/product/${productCode}/trigger-ksd-scheduler`)
      );

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: `✅ ${response.data.message}`,
          severity: 'success',
        });
      } else {
        setSnackbar({
          open: true,
          message: response.data.message || 'KSD 스케줄러 실행 요청에 실패했습니다.',
          severity: 'error',
        });
      }
    } catch (error: any) {
      console.error('KSD 스케줄러 트리거 실패:', error);
      const message = error.response?.data?.message || 'KSD 스케줄러 실행 요청에 실패했습니다.';
      setSnackbar({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ko-KR').format(num);
  };

  if (loading && !dividendInfo) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>배당 정보를 불러오는 중...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* 기간 선택 */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
          배당 계산 기간
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              onClick={() => setSelectedPeriod('current_quarter')}
              sx={{
                p: 2,
                border: selectedPeriod === 'current_quarter' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedPeriod === 'current_quarter' ? '#eff6ff' : 'white',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                당분기
              </Typography>
              <Typography variant="body2" color="text.secondary">
                2025년 3분기
              </Typography>
              <Typography variant="caption" color="text.secondary">
                7월 ~ 현재
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              onClick={() => setSelectedPeriod('current_year')}
              sx={{
                p: 2,
                border: selectedPeriod === 'current_year' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedPeriod === 'current_year' ? '#eff6ff' : 'white',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                당해연도
              </Typography>
              <Typography variant="body2" color="text.secondary">
                2025년 연간
              </Typography>
              <Typography variant="caption" color="text.secondary">
                1월 ~ 현재
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box
              onClick={() => setSelectedPeriod('last_year')}
              sx={{
                p: 2,
                border: selectedPeriod === 'last_year' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedPeriod === 'last_year' ? '#eff6ff' : 'white',
                transition: 'all 0.2s ease',
                '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' }
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1e293b' }}>
                작년 전체
              </Typography>
              <Typography variant="body2" color="text.secondary">
                2024년 연간
              </Typography>
              <Typography variant="caption" color="text.secondary">
                1월 ~ 12월
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, textAlign: 'center', display: 'flex', alignItems: 'center', height: '100%' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                회계연도 기준으로<br />
                임대수익을 집계하여<br />
                배당가능금액을 산출
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 상품 기본 정보 */}
      <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8fafc' }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          리츠 상품 기본 정보
          <Chip
            label={
              selectedPeriod === 'current_quarter' ? '당분기 기준' :
              selectedPeriod === 'current_year' ? '당해연도 기준' :
              selectedPeriod === 'last_year' ? '작년 기준' : '당해연도 기준'
            }
            size="small"
            sx={{ ml: 2, bgcolor: '#e3f2fd' }}
          />
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatNumber(dividendInfo?.totalShares || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                총 발행주식수 (주)
              </Typography>
              <Button
                size="small"
                startIcon={<EditIcon />}
                onClick={() => {
                  setTotalShares((dividendInfo?.totalShares || 0).toString());
                  setOpenSharesDialog(true);
                }}
                sx={{ mt: 1 }}
              >
                수정
              </Button>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(dividendInfo?.availableDividendAmount || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                배당 가능 금액
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatCurrency(dividendInfo?.maxDividendPerShare || 0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                주당 최대 배당금
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Chip
                label="법정 90% 배당률 적용"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 배당 계산 상세 내역 */}
      {dividendInfo?.calculationDetails && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: 'white', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1e293b' }}>
            배당 계산 상세 내역
            <Chip
              label={`${dividendInfo.calculationDetails.startDate} ~ ${dividendInfo.calculationDetails.endDate}`}
              size="small"
              sx={{ ml: 2, bgcolor: '#f0f9ff' }}
            />
          </Typography>

          {/* 계산 과정 요약 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#059669' }}>
                  수익 부분
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">총 임대수익</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(dividendInfo.calculationDetails.totalRentalIncome)}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: '#dc2626' }}>
                  비용 부분
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">건물 운영비용</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(dividendInfo.calculationDetails.totalBuildingExpenses)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">공통 운영비용</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(dividendInfo.calculationDetails.commonExpenses)}
                  </Typography>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600}>총 비용</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatCurrency(dividendInfo.calculationDetails.totalExpenses)}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>

          {/* 최종 계산 */}
          <Paper sx={{ p: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
              배당 계산 결과
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {formatCurrency(dividendInfo.calculationDetails.taxableIncome)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    과세소득 (임대수익-비용)
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {(dividendInfo.calculationDetails.dividendRate * 100).toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    법정 배당률
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {formatCurrency(dividendInfo.calculationDetails.availableDividend)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    최대 배당 가능 금액
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {formatCurrency(dividendInfo.calculationDetails.taxableIncome - dividendInfo.calculationDetails.availableDividend)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    유보 가능 금액 (10%)
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* 건물별 상세 내역 */}
          {dividendInfo.calculationDetails.buildingDetails.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                건물별 상세 내역
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>건물명</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>임대수익</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>운영비용</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>순수익</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {dividendInfo.calculationDetails.buildingDetails.map((building) => (
                      <TableRow key={building.buildingId} hover>
                        <TableCell>{building.buildingName}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(building.rentalIncome)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(building.expenses)}
                        </TableCell>
                        <TableCell align="right" sx={{
                          fontWeight: 600,
                          color: building.netIncome >= 0 ? '#059669' : '#dc2626'
                        }}>
                          {formatCurrency(building.netIncome)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </Paper>
      )}

      {/* 배당 등록 결과 */}
      {calculationResult && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8fafc', border: '1px solid #e2e8f0' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: '#1e293b' }}>
            최근 배당 등록 결과
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">배당 연도</Typography>
              <Typography variant="body1" fontWeight={600}>
                {calculationResult.dividendYear}년
                {calculationResult.dividendQuarter > 0 && ` ${calculationResult.dividendQuarter}분기`}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">주당 배당금</Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatCurrency(calculationResult.dividendPerShare)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">총 배당금</Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatCurrency(calculationResult.totalDividendAmount)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">배당 기준일</Typography>
              <Typography variant="body1" fontWeight={600}>
                {new Date(calculationResult.recordDate).toLocaleDateString('ko-KR')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">배당 지급일</Typography>
              <Typography variant="body1" fontWeight={600}>
                {new Date(calculationResult.paymentDate).toLocaleDateString('ko-KR')}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Typography variant="body2" color="text.secondary">처리 상태</Typography>
              <Chip
                label={calculationResult.status}
                color="success"
                size="small"
                sx={{ fontWeight: 600 }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* 배당 관리 버튼들 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<CalculateIcon />}
          onClick={() => {
            // 기본값 설정
            const today = new Date();
            const nextMonth = new Date(today.setMonth(today.getMonth() + 1));
            const recordDateStr = nextMonth.toISOString().split('T')[0];

            const paymentDateObj = new Date(nextMonth);
            paymentDateObj.setMonth(paymentDateObj.getMonth() + 1);
            const paymentDateStr = paymentDateObj.toISOString().split('T')[0];

            setRecordDate(recordDateStr);
            setPaymentDate(paymentDateStr);
            setOpenCalculateDialog(true);
          }}
          sx={{
            bgcolor: '#008485',
            '&:hover': { bgcolor: '#007575' },
            px: 4,
            py: 1.5,
            fontSize: '16px',
          }}
        >
          배당 기준일 설정 및 계산
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<TrendingUpIcon />}
          onClick={handleTriggerKsdScheduler}
          disabled={loading}
          sx={{
            borderColor: '#008485',
            color: '#008485',
            '&:hover': {
              borderColor: '#007575',
              bgcolor: '#f0fafb',
            },
            px: 4,
            py: 1.5,
            fontSize: '16px',
          }}
        >
          {loading ? '처리 중...' : 'KSD 배당락일 스케줄러 실행'}
        </Button>
      </Box>

      {/* 배당 계산 다이얼로그 */}
      <Dialog open={openCalculateDialog} onClose={() => setOpenCalculateDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          배당 기준일 설정 및 계산
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="주당 배당금 (원)"
                type="number"
                value={dividendPerShare}
                onChange={(e) => setDividendPerShare(e.target.value)}
                inputProps={{ min: 0, step: 10 }}
                required
                helperText={`최대 ${formatCurrency(dividendInfo?.maxDividendPerShare || 0)}`}
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="배당 연도"
                type="number"
                value={dividendYear}
                onChange={(e) => setDividendYear(parseInt(e.target.value))}
                inputProps={{ min: 2020, max: 2030 }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>분기 (선택)</InputLabel>
                <Select
                  value={dividendQuarter}
                  label="분기 (선택)"
                  onChange={(e) => setDividendQuarter(e.target.value as number)}
                >
                  <MenuItem value="">연배당</MenuItem>
                  <MenuItem value={1}>1분기</MenuItem>
                  <MenuItem value={2}>2분기</MenuItem>
                  <MenuItem value={3}>3분기</MenuItem>
                  <MenuItem value={4}>4분기</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="배당 기준일"
                type="date"
                value={recordDate}
                onChange={(e) => setRecordDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="배당락일 기준 주가 (원)"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                inputProps={{ min: 0, step: 100 }}
                helperText="수익률 계산에 사용되는 기준가"
              />
            </Grid>
            <Grid item xs={12} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="배당 지급일"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
                helperText="기준일 이후 날짜로 설정해주세요"
              />
            </Grid>
            {dividendPerShare && dividendInfo && (
              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 1 }}>
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
                    계산 미리보기
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        총 발행주식수
                      </Typography>
                      <Typography variant="body1" fontWeight={600}>
                        {formatNumber(dividendInfo.totalShares)} 주
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        예상 총 배당금
                      </Typography>
                      <Typography variant="body1" fontWeight={600} color="#dc2626">
                        {formatCurrency(parseFloat(dividendPerShare) * dividendInfo.totalShares)}
                      </Typography>
                    </Grid>
                    {basePrice && (
                      <Grid item xs={4}>
                        <Typography variant="body2" color="text.secondary">
                          예상 배당 수익률
                        </Typography>
                        <Typography variant="body1" fontWeight={600} color="#059669">
                          {((parseFloat(dividendPerShare) / parseFloat(basePrice)) * 100).toFixed(2)}%
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setOpenCalculateDialog(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleCalculateDividend}
            disabled={loading}
            sx={{ bgcolor: '#008485', '&:hover': { bgcolor: '#007575' } }}
          >
            {loading ? '처리 중...' : '배당 등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 총 발행주식수 수정 다이얼로그 */}
      <Dialog open={openSharesDialog} onClose={() => setOpenSharesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>총 발행주식수 수정</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="총 발행주식수"
              type="number"
              value={totalShares}
              onChange={(e) => setTotalShares(e.target.value)}
              inputProps={{ min: 1 }}
              required
              helperText="현재 시장에 발행된 전체 주식의 수를 입력하세요"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenSharesDialog(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleUpdateTotalShares}
            disabled={loading}
          >
            {loading ? '처리 중...' : '수정'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}