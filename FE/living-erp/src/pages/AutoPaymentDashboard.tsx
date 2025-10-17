import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Chip,
  Button,
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
  Alert,
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon,
  Assessment as AssessmentIcon,
  AccountBalance as BankIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import {
  getAutoPaymentStats,
  getAutoPaymentContracts,
  getAutoPaymentHistory,
  getMonthlyStats,
  suspendAutoPaymentContract,
  resumeAutoPaymentContract,
  cancelAutoPaymentContract,
  executeRentAutoPayments,
  type AutoPaymentContract,
  type AutoPaymentHistory,
  type DashboardStats,
  type MonthlyStats,
  type ExecutionSummary
} from '../services/autoPaymentService';

// 인터페이스는 이미 서비스에서 import 됨

const COLORS = ['#009595', '#007b7b', '#1FB896', '#32CBA4'];

export default function AutoPaymentDashboard() {
  const { token } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [contracts, setContracts] = useState<AutoPaymentContract[]>([]);
  const [history, setHistory] = useState<AutoPaymentHistory[]>([]);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalContracts: 0,
    activeContracts: 0,
    suspendedContracts: 0,
    cancelledContracts: 0,
    monthlyTransferAmount: 0,
    successRate: 0,
    totalTransferAmount: 0,
    todayExecutions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedContract, setSelectedContract] = useState<AutoPaymentContract | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'suspend' | 'resume' | 'cancel' | null;
    contract: AutoPaymentContract | null;
  }>({ open: false, action: null, contract: null });
  const [executionResult, setExecutionResult] = useState<ExecutionSummary | null>(null);
  const [executionDialog, setExecutionDialog] = useState(false);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // 30초마다 새로고침
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 실제 API 서비스 호출
      const [statsData, contractsData, historyData, monthlyStatsData] = await Promise.all([
        getAutoPaymentStats(token),
        getAutoPaymentContracts(undefined, token),
        getAutoPaymentHistory(undefined, token),
        getMonthlyStats(new Date().getFullYear(), token)
      ]);

      setStats(statsData);
      setContracts(contractsData);
      setHistory(historyData);
      setMonthlyStats(monthlyStatsData);

    } catch (error) {
      console.error('대시보드 데이터 로딩 실패:', error);
      // 에러 발생 시 기본값 설정
      setStats({
        totalContracts: 0,
        activeContracts: 0,
        suspendedContracts: 0,
        cancelledContracts: 0,
        monthlyTransferAmount: 0,
        successRate: 0,
        totalTransferAmount: 0,
        todayExecutions: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContractAction = async (action: 'suspend' | 'resume' | 'cancel', contract: AutoPaymentContract) => {
    try {
      // 실제 API 서비스 호출
      if (action === 'suspend') {
        await suspendAutoPaymentContract(contract.id, token);
      } else if (action === 'resume') {
        await resumeAutoPaymentContract(contract.id, token);
      } else if (action === 'cancel') {
        await cancelAutoPaymentContract(contract.id, '관리자 요청', token);
      }

      setActionDialog({ open: false, action: null, contract: null });
      fetchDashboardData(); // 데이터 새로고침
    } catch (error) {
      console.error('계약 상태 변경 실패:', error);
    }
  };

  const handleExecuteRentPayments = async () => {
    if (!window.confirm('오늘 결제일인 모든 월세를 즉시 이체하시겠습니까?')) {
      return;
    }

    setExecuting(true);
    try {
      const result = await executeRentAutoPayments(token);
      setExecutionResult(result);
      setExecutionDialog(true);
      fetchDashboardData(); // 데이터 새로고침
    } catch (error) {
      console.error('월세 자동송금 실행 실패:', error);
      alert('월세 자동송금 실행에 실패했습니다: ' + (error as Error).message);
    } finally {
      setExecuting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'SUSPENDED': return 'warning';
      case 'CANCELLED': return 'error';
      case 'SUCCESS': return 'success';
      case 'FAILED': return 'error';
      case 'PENDING': return 'info';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE': return '정상';
      case 'SUSPENDED': return '일시정지';
      case 'CANCELLED': return '해지';
      case 'SUCCESS': return '성공';
      case 'FAILED': return '실패';
      case 'PENDING': return '처리중';
      default: return status;
    }
  };

  // 차트 데이터 준비
  const statusDistribution = [
    { name: '정상', value: stats.activeContracts, color: '#009595' },
    { name: '일시정지', value: stats.suspendedContracts, color: '#007b7b' },
    { name: '해지', value: stats.cancelledContracts, color: '#1FB896' }
  ].filter(item => item.value > 0);

  // 월별 통계 데이터를 차트 형식으로 변환
  const monthlyData = monthlyStats.map(stat => ({
    month: stat.month,
    success: stat.successCount,
    failed: stat.failedCount,
    executions: stat.successCount + stat.failedCount,
    amount: stat.totalAmount
  }));

  return (
    <Box sx={{ p: 3, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
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
          자동이체 관리
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: '#1e293b', fontWeight: 'bold' }}>
          자동이체 관리 대시보드
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExecuteRentPayments}
            disabled={executing || loading}
            sx={{
              bgcolor: '#009595',
              '&:hover': { bgcolor: '#007b7b' }
            }}
          >
            {executing ? '실행 중...' : '오늘 월세 자동송금 실행'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchDashboardData}
            disabled={loading}
          >
            새로고침
          </Button>
        </Box>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="text.secondary">총 계약 수</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.totalContracts}
                  </Typography>
                </div>
                <BankIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="text.secondary">활성 계약</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.activeContracts}
                  </Typography>
                </div>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="text.secondary">성공률</Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {stats.successRate.toFixed(1)}%
                  </Typography>
                </div>
                <AssessmentIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Typography variant="body2" color="text.secondary">월 총 이체금액</Typography>
                  <Typography variant="h3" sx={{ fontWeight: 'bold', fontSize: '1.5rem' }}>
                    {formatCurrency(stats.monthlyTransferAmount)}
                  </Typography>
                </div>
                <TrendingDownIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 차트 섹션 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>월별 이체 실행 현황</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Bar dataKey="success" stackId="a" fill="#009595" name="성공" />
                  <Bar dataKey="failed" stackId="a" fill="#007b7b" name="실패" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>계약 상태 분포</Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 섹션 */}
      <Card>
        <Tabs 
          value={tabValue} 
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="계약 관리" />
          <Tab label="실행 이력" />
        </Tabs>

        {tabValue === 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>계약ID</TableCell>
                  <TableCell>사용자</TableCell>
                  <TableCell>출금계좌</TableCell>
                  <TableCell>이체금액</TableCell>
                  <TableCell>이체일</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>다음 이체일</TableCell>
                  <TableCell>성공률</TableCell>
                  <TableCell>관리</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {contracts.map((contract) => (
                  <TableRow key={contract.id}>
                    <TableCell>{contract.id}</TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight="bold">
                          {contract.userName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {contract.buildingName} {contract.unitNumber}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{contract.fromAccount}</TableCell>
                    <TableCell>{formatCurrency(contract.amount)}</TableCell>
                    <TableCell>매월 {contract.transferDay}일</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(contract.status)} 
                        color={getStatusColor(contract.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{formatDate(contract.nextTransferDate)}</TableCell>
                    <TableCell>
                      {contract.totalExecutions > 0 
                        ? `${((contract.successfulExecutions / contract.totalExecutions) * 100).toFixed(1)}%`
                        : 'N/A'
                      }
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {contract.status === 'ACTIVE' && (
                          <Tooltip title="일시정지">
                            <IconButton
                              size="small"
                              onClick={() => setActionDialog({
                                open: true,
                                action: 'suspend',
                                contract
                              })}
                            >
                              <PauseIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {contract.status === 'SUSPENDED' && (
                          <Tooltip title="재개">
                            <IconButton
                              size="small"
                              onClick={() => setActionDialog({
                                open: true,
                                action: 'resume',
                                contract
                              })}
                            >
                              <PlayArrowIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                        {(contract.status === 'ACTIVE' || contract.status === 'SUSPENDED') && (
                          <Tooltip title="해지">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setActionDialog({
                                open: true,
                                action: 'cancel',
                                contract
                              })}
                            >
                              <StopIcon />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {tabValue === 1 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>실행ID</TableCell>
                  <TableCell>계약ID</TableCell>
                  <TableCell>실행일시</TableCell>
                  <TableCell>예정일</TableCell>
                  <TableCell>이체금액</TableCell>
                  <TableCell>상태</TableCell>
                  <TableCell>거래번호</TableCell>
                  <TableCell>실패사유</TableCell>
                  <TableCell>재시도</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.id}</TableCell>
                    <TableCell>{record.contractId}</TableCell>
                    <TableCell>
                      {new Date(record.transferDate).toLocaleString('ko-KR')}
                    </TableCell>
                    <TableCell>{formatDate(record.transferDate)}</TableCell>
                    <TableCell>{formatCurrency(record.amount)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={getStatusText(record.status)} 
                        color={getStatusColor(record.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>
                      {record.errorMessage && (
                        <Typography variant="caption" color="error">
                          {record.errorMessage}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* 액션 확인 다이얼로그 */}
      <Dialog
        open={actionDialog.open}
        onClose={() => setActionDialog({ open: false, action: null, contract: null })}
      >
        <DialogTitle>
          {actionDialog.action === 'suspend' && '자동이체 일시정지'}
          {actionDialog.action === 'resume' && '자동이체 재개'}
          {actionDialog.action === 'cancel' && '자동이체 해지'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            계약 ID {actionDialog.contract?.id}의 자동이체를{' '}
            {actionDialog.action === 'suspend' && '일시정지'}
            {actionDialog.action === 'resume' && '재개'}
            {actionDialog.action === 'cancel' && '해지'}
            하시겠습니까?
          </Typography>
          {actionDialog.action === 'cancel' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              해지된 계약은 복구할 수 없습니다.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, action: null, contract: null })}>
            취소
          </Button>
          <Button
            onClick={() => actionDialog.contract && actionDialog.action &&
              handleContractAction(actionDialog.action, actionDialog.contract)}
            color={actionDialog.action === 'cancel' ? 'error' : 'primary'}
            variant="contained"
          >
            확인
          </Button>
        </DialogActions>
      </Dialog>

      {/* 월세 자동송금 실행 결과 다이얼로그 */}
      <Dialog
        open={executionDialog}
        onClose={() => setExecutionDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>월세 자동송금 실행 결과</DialogTitle>
        <DialogContent>
          {executionResult && (
            <Box>
              <Alert severity={executionResult.failureCount === 0 ? 'success' : 'warning'} sx={{ mb: 2 }}>
                전체 {executionResult.totalCount}건 중 성공 {executionResult.successCount}건, 실패 {executionResult.failureCount}건
              </Alert>

              {executionResult.successResults.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" sx={{ mb: 1, color: '#009595' }}>성공 ({executionResult.successCount}건)</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>사용자</TableCell>
                          <TableCell>호실</TableCell>
                          <TableCell>금액</TableCell>
                          <TableCell>거래번호</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {executionResult.successResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.userName}</TableCell>
                            <TableCell>{result.building} {result.unit}</TableCell>
                            <TableCell>{formatCurrency(result.amount)}</TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary">
                                {result.transactionId}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {executionResult.failureResults.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 1, color: '#d32f2f' }}>실패 ({executionResult.failureCount}건)</Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>사용자</TableCell>
                          <TableCell>호실</TableCell>
                          <TableCell>금액</TableCell>
                          <TableCell>실패 사유</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {executionResult.failureResults.map((result, index) => (
                          <TableRow key={index}>
                            <TableCell>{result.userName}</TableCell>
                            <TableCell>{result.building} {result.unit}</TableCell>
                            <TableCell>{formatCurrency(result.amount)}</TableCell>
                            <TableCell>
                              <Typography variant="caption" color="error">
                                {result.reason}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExecutionDialog(false)} variant="contained">
            확인
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}