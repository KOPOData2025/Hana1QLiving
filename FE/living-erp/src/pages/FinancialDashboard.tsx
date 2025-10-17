import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  AccountBalance,
  Business,
  DateRange,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  getFinancialDashboard,
  getFinancialSummary,
  getProfitabilityAnalysis,
  getBuildingsComparison,
  type FinancialDashboard as FinancialDashboardType,
  type FinancialSummary,
  type BuildingSummary
} from '../services/financialService';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

// 수치 포맷팅 함수
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`;
};

// 수익률 등급에 따른 색상
const getProfitGradeColor = (grade: string) => {
  switch (grade) {
    case 'EXCELLENT': return '#4caf50';
    case 'GOOD': return '#8bc34a';
    case 'AVERAGE': return '#ff9800';
    case 'POOR': return '#ff5722';
    case 'LOSS': return '#f44336';
    default: return '#9e9e9e';
  }
};

const getProfitGradeLabel = (grade: string) => {
  switch (grade) {
    case 'EXCELLENT': return '우수';
    case 'GOOD': return '양호';
    case 'AVERAGE': return '보통';
    case 'POOR': return '부진';
    case 'LOSS': return '손실';
    default: return '미확인';
  }
};

// 수익률에 따른 등급 계산
const getProfitGrade = (profitMargin: number): string => {
  if (profitMargin >= 20) return 'EXCELLENT';
  if (profitMargin >= 15) return 'GOOD';
  if (profitMargin >= 10) return 'AVERAGE';
  if (profitMargin >= 5) return 'POOR';
  return 'LOSS';
};

export default function FinancialDashboard() {
  const { token } = useAuth();

  // 상태 관리
  const [dashboard, setDashboard] = useState<FinancialDashboardType | null>(null);
  const [profitAnalysis, setProfitAnalysis] = useState<any>(null);
  const [buildingComparison, setBuildingComparison] = useState<BuildingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // API 호출 중복 방지
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  // 데이터 로드
  const loadDashboardData = async () => {
    if (isLoadingRef) return; // 이미 로딩 중이면 중단

    try {
      setIsLoadingRef(true);
      setLoading(true);
      setError(null);

      const buildingId = selectedBuilding ? Number(selectedBuilding) : undefined;
      const start = startDate && startDate.trim() ? startDate : undefined;
      const end = endDate && endDate.trim() ? endDate : undefined;

      // 메인 대시보드 데이터 먼저 로드
      const dashboardData = await getFinancialDashboard(buildingId, start, end, token);

      // 추가 데이터는 대시보드 데이터에서 파생하거나 필요시에만 로드
      const profitData = {
        profitGrade: getProfitGrade(dashboardData.profitMargin),
        riskLevel: 'LOW',
        recommendations: []
      };

      // 건물 비교 데이터 처리
      let buildingsData: any[] = [];

      if (!selectedBuilding) {
        // 대시보드에서 건물 데이터 우선 사용
        if (dashboardData.buildingData && dashboardData.buildingData.length > 0) {
          buildingsData = dashboardData.buildingData.map((building: any) => ({
            buildingId: building.buildingId,
            buildingName: building.buildingName,
            revenue: building.revenue || 0,
            expense: building.expense || 0,
            profit: building.profit || 0
          }));
        } else {
          // 대시보드에 없으면 별도 API 호출
          buildingsData = await getBuildingsComparison(start, end, token);
        }
      }

      setDashboard(dashboardData);
      setProfitAnalysis(profitData);
      setBuildingComparison(buildingsData);

    } catch (err: any) {
      setError(err.message || '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
      setIsLoadingRef(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboardData();
    }
  }, [token]);

  // 필터 적용
  const handleFilterApply = () => {
    loadDashboardData();
  };

  // 필터 초기화
  const handleFilterReset = () => {
    setSelectedBuilding('');
    setStartDate('');
    setEndDate('');
  };

  // 로딩 중일 때
  if (loading) {
    return (
      <Box sx={{
        p: 3,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '50vh'
      }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>재무 데이터를 로드하는 중...</Typography>
      </Box>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadDashboardData}>
            다시 시도
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  // 데이터가 없을 때
  if (!dashboard) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">재무 데이터를 불러올 수 없습니다.</Alert>
      </Box>
    );
  }

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
          재무 관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          재무 대시보드
        </Typography>
      </Box>

      <Typography variant="h4" component="h1" sx={{ mb: 3, color: '#1e293b' }}>
        재무 대시보드
      </Typography>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          조회 조건
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>건물 선택</InputLabel>
              <Select
                value={selectedBuilding}
                label="건물 선택"
                onChange={(e) => setSelectedBuilding(e.target.value as number | '')}
              >
                <MenuItem value="">전체</MenuItem>
                <MenuItem value={1}>하나타워</MenuItem>
                <MenuItem value={2}>하나플레이스</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="시작일"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              type="date"
              label="종료일"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleFilterApply} startIcon={<DateRange />}>
                조회
              </Button>
              <Button variant="outlined" onClick={handleFilterReset}>
                초기화
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 핵심 지표 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AttachMoney sx={{ color: '#4caf50', mr: 1 }} />
                <Typography variant="h6" color="#4caf50">
                  총 수익
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(dashboard.totalRevenue)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dashboard.totalRevenueCount}건
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingDown sx={{ color: '#f44336', mr: 1 }} />
                <Typography variant="h6" color="#f44336">
                  총 지출
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(dashboard.totalExpense)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {dashboard.totalExpenseCount}건
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUp sx={{ color: '#2196f3', mr: 1 }} />
                <Typography variant="h6" color="#2196f3">
                  순이익
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ mb: 1 }}>
                {formatCurrency(dashboard.netProfit)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                수익 - 지출
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance sx={{ color: '#ff9800', mr: 1 }} />
                <Typography variant="h6" color="#ff9800">
                  수익률
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="h4" sx={{ mr: 2 }}>
                  {formatPercent(dashboard.profitMargin)}
                </Typography>
                {profitAnalysis && (
                  <Chip
                    label={getProfitGradeLabel(profitAnalysis.profitGrade)}
                    sx={{
                      backgroundColor: getProfitGradeColor(profitAnalysis.profitGrade),
                      color: 'white'
                    }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="textSecondary">
                순이익 / 총수익
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 차트 섹션 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* 월별 손익 추이 */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                월별 손익 추이
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dashboard.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}만원`} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), '']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#4caf50"
                    name="수익"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="expense"
                    stroke="#f44336"
                    name="지출"
                    strokeWidth={3}
                  />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#2196f3"
                    name="순이익"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 수익 구조 (파이 차트) */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                수익 구조
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dashboard.revenueByCategory}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name} ${percentage?.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {dashboard.revenueByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 지출 구조 및 건물별 비교 */}
      <Grid container spacing={3}>
        {/* 지출 구조 (막대 차트) */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                지출 구조
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboard.expenseByCategory} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(value) => `${(value / 10000).toFixed(0)}만원`} />
                  <YAxis dataKey="category" type="category" width={80} />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value), '']}
                  />
                  <Bar dataKey="amount" fill="#ff9800" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* 건물별 비교 */}
        {!selectedBuilding && buildingComparison.length > 0 && (
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 3 }}>
                  건물별 수익성 비교
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>건물명</TableCell>
                        <TableCell align="right">수익</TableCell>
                        <TableCell align="right">지출</TableCell>
                        <TableCell align="right">순이익</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {buildingComparison.map((building) => (
                        <TableRow key={building.buildingId}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Business sx={{ mr: 1, color: 'primary.main' }} />
                              {building.buildingName}
                            </Box>
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(building.revenue)}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(building.expense)}
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              color={building.profit > 0 ? 'success.main' : 'error.main'}
                              fontWeight="bold"
                            >
                              {formatCurrency(building.profit)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}