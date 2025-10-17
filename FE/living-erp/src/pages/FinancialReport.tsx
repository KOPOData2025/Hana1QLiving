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
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  IconButton
} from '@mui/material';
import {
  DateRange,
  PictureAsPdf,
  GetApp,
  TrendingUp,
  TrendingDown,
  Assessment,
  Business,
  AttachMoney,
  ShowChart,
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  getFinancialDashboard,
  getMonthlyTrend,
  getBuildingsComparison,
  getRevenues,
  getExpenses,
  type FinancialDashboard as FinancialDashboardType,
  type MonthlySummary,
  type BuildingSummary,
  type Revenue,
  type Expense
} from '../services/financialService';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d'];

// 포맷팅 함수들
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR');
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`financial-report-tabpanel-${index}`}
      aria-labelledby={`financial-report-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export default function FinancialReport() {
  const { token } = useAuth();

  // 상태 관리
  const [tabValue, setTabValue] = useState(0);
  const [dashboard, setDashboard] = useState<FinancialDashboardType | null>(null);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlySummary[]>([]);
  const [buildingComparison, setBuildingComparison] = useState<BuildingSummary[]>([]);
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 필터 상태
  const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportPeriod, setReportPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  // 데이터 로드
  // API 호출 중복 방지
  const [isLoadingRef, setIsLoadingRef] = useState(false);

  const loadReportData = async () => {
    if (isLoadingRef) return; // 이미 로딩 중이면 중단

    try {
      setIsLoadingRef(true);
      setLoading(true);
      setError(null);

      const buildingId = selectedBuilding ? Number(selectedBuilding) : undefined;
      const start = startDate && startDate.trim() ? startDate : undefined;
      const end = endDate && endDate.trim() ? endDate : undefined;

      const [
        dashboardData,
        monthlyData,
        buildingsData,
        revenuesData,
        expensesData
      ] = await Promise.all([
        getFinancialDashboard(buildingId, start, end, token),
        getMonthlyTrend(buildingId, start, end, token),
        getBuildingsComparison(start, end, token),
        getRevenues(buildingId, undefined, start, end, token),
        getExpenses(buildingId, undefined, start, end, token)
      ]);

      setDashboard(dashboardData);
      setMonthlyTrend(monthlyData);
      setBuildingComparison(buildingsData);
      setRevenues(revenuesData);
      setExpenses(expensesData);

    } catch (err: any) {
      setError(err.message || '데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
      setIsLoadingRef(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadReportData();
    }
  }, [token]);

  // 필터 적용
  const handleFilterApply = () => {
    loadReportData();
  };

  // 필터 초기화
  const handleFilterReset = () => {
    setSelectedBuilding('');
    setStartDate('');
    setEndDate('');
    setReportPeriod('month');
  };

  // 보고서 내보내기
  const handleExportPDF = () => {
    // PDF 내보내기 로직 (추후 구현)
    alert('PDF 내보내기 기능은 추후 구현됩니다.');
  };

  const handleExportExcel = () => {
    // Excel 내보내기 로직 (추후 구현)
    alert('Excel 내보내기 기능은 추후 구현됩니다.');
  };

  // 탭 변경 핸들러
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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
        <Typography sx={{ ml: 2 }}>재무 보고서 데이터를 로드하는 중...</Typography>
      </Box>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={loadReportData}>
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
        <Alert severity="info">재무 보고서 데이터를 불러올 수 없습니다.</Alert>
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
          재무 보고서
        </Typography>
      </Box>

      {/* 헤더 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: '#1e293b' }}>
          재무 보고서
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={handleExportPDF}
            sx={{
              backgroundColor: '#f44336',
              color: 'white',
              '&:hover': { backgroundColor: '#d32f2f' }
            }}
          >
            <PictureAsPdf />
          </IconButton>
          <IconButton
            onClick={handleExportExcel}
            sx={{
              backgroundColor: '#4caf50',
              color: 'white',
              '&:hover': { backgroundColor: '#388e3c' }
            }}
          >
            <GetApp />
          </IconButton>
        </Box>
      </Box>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          보고서 설정
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
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
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>기간 유형</InputLabel>
              <Select
                value={reportPeriod}
                label="기간 유형"
                onChange={(e) => setReportPeriod(e.target.value as 'month' | 'quarter' | 'year')}
              >
                <MenuItem value="month">월별</MenuItem>
                <MenuItem value="quarter">분기별</MenuItem>
                <MenuItem value="year">연별</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="시작일"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={2}>
            <TextField
              fullWidth
              type="date"
              label="종료일"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" onClick={handleFilterApply} startIcon={<DateRange />}>
                보고서 생성
              </Button>
              <Button variant="outlined" onClick={handleFilterReset}>
                초기화
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 탭 네비게이션 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="financial report tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 120,
              fontWeight: 600
            }
          }}
        >
          <Tab label="요약 보고서" icon={<Assessment />} />
          <Tab label="손익 분석" icon={<TrendingUp />} />
          <Tab label="건물별 현황" icon={<Business />} />
          <Tab label="수익/지출 내역" icon={<AttachMoney />} />
          <Tab label="추세 분석" icon={<ShowChart />} />
        </Tabs>

        {/* 탭 1: 요약 보고서 */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* 핵심 지표 */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2 }}>핵심 재무 지표</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <TrendingUp sx={{ fontSize: 40, color: '#4caf50', mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#4caf50' }}>
                        {formatCurrency(dashboard.totalRevenue)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        총 수익 ({dashboard.totalRevenueCount}건)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <TrendingDown sx={{ fontSize: 40, color: '#f44336', mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                        {formatCurrency(dashboard.totalExpense)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        총 지출 ({dashboard.totalExpenseCount}건)
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <AttachMoney sx={{ fontSize: 40, color: '#2196f3', mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#2196f3' }}>
                        {formatCurrency(dashboard.netProfit)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        순이익
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Assessment sx={{ fontSize: 40, color: '#ff9800', mb: 1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#ff9800' }}>
                        {formatPercent(dashboard.profitMargin)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        수익률
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>

            {/* 월별 추이 차트 */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>월별 손익 추이</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4caf50" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#4caf50" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f44336" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#f44336" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}만원`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#4caf50"
                        fillOpacity={1}
                        fill="url(#colorRevenue)"
                        name="수익"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#f44336"
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                        name="지출"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 탭 2: 손익 분석 */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>수익 구조 분석</Typography>
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
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>지출 구조 분석</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dashboard.expenseByCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}만원`} />
                      <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                      <Bar dataKey="amount" fill="#ff9800" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 탭 3: 건물별 현황 */}
        <TabPanel value={tabValue} index={2}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>건물별 수익성 비교</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>건물명</TableCell>
                      <TableCell align="right">수익</TableCell>
                      <TableCell align="right">지출</TableCell>
                      <TableCell align="right">순이익</TableCell>
                      <TableCell align="right">수익률</TableCell>
                      <TableCell align="center">성과 등급</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {buildingComparison.map((building) => {
                      const profitMargin = building.revenue > 0 ? (building.profit / building.revenue) * 100 : 0;
                      let grade = 'C';
                      let gradeColor = '#ff9800';
                      if (profitMargin >= 80) {
                        grade = 'A+';
                        gradeColor = '#4caf50';
                      } else if (profitMargin >= 60) {
                        grade = 'A';
                        gradeColor = '#8bc34a';
                      } else if (profitMargin >= 40) {
                        grade = 'B';
                        gradeColor = '#2196f3';
                      }

                      return (
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
                          <TableCell align="right">
                            {formatPercent(profitMargin)}
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={grade}
                              sx={{
                                backgroundColor: gradeColor,
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </TabPanel>

        {/* 탭 4: 수익/지출 내역 */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>최근 수익 내역</Typography>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>날짜</TableCell>
                          <TableCell>카테고리</TableCell>
                          <TableCell align="right">금액</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {revenues.slice(0, 10).map((revenue) => (
                          <TableRow key={revenue.id}>
                            <TableCell>{formatDate(revenue.paidDate || revenue.dueDate)}</TableCell>
                            <TableCell>{revenue.paymentCategory}</TableCell>
                            <TableCell align="right" sx={{ color: '#4caf50', fontWeight: 'bold' }}>
                              {formatCurrency(revenue.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>최근 지출 내역</Typography>
                  <TableContainer sx={{ maxHeight: 400 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>날짜</TableCell>
                          <TableCell>카테고리</TableCell>
                          <TableCell align="right">금액</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {expenses.slice(0, 10).map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell align="right" sx={{ color: '#f44336', fontWeight: 'bold' }}>
                              {formatCurrency(expense.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* 탭 5: 추세 분석 */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>월별 성장률 추세</Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyTrend.map((data, index) => {
                      const prevMonth = monthlyTrend[index - 1];
                      const revenueGrowth = prevMonth ?
                        ((data.revenue - prevMonth.revenue) / prevMonth.revenue * 100) : 0;
                      const profitGrowth = prevMonth ?
                        ((data.profit - prevMonth.profit) / Math.abs(prevMonth.profit) * 100) : 0;

                      return {
                        ...data,
                        revenueGrowth: index === 0 ? 0 : revenueGrowth,
                        profitGrowth: index === 0 ? 0 : profitGrowth
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `${value.toFixed(1)}%`} />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          `${value.toFixed(1)}%`,
                          name === 'revenueGrowth' ? '수익 성장률' : '순이익 성장률'
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenueGrowth"
                        stroke="#4caf50"
                        name="수익 성장률"
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="profitGrowth"
                        stroke="#2196f3"
                        name="순이익 성장률"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
}