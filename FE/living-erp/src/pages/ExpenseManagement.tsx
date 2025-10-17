import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Snackbar,
  SnackbarContent,
  Fab
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FilterList,
  Search,
  Download,
  Upload,
  Business,
  Category,
  DateRange,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  type Expense
} from '../services/financialService';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { createApiUrl } from '../config/api';

// 건물 인터페이스
interface Building {
  id: number;
  name: string;
  address: string;
  addressDetail: string;
  buildingType: string;
}

// 지출 카테고리 목록
const EXPENSE_CATEGORIES = [
  { value: '유지보수', label: '유지보수' },
  { value: '운영비', label: '운영비' },
  { value: '청소비', label: '청소비' },
  { value: '보안비', label: '보안비' },
  { value: '공과금', label: '공과금' },
  { value: '마케팅비', label: '마케팅비' },
  { value: '급여', label: '급여' },
  { value: '기타', label: '기타' }
];

// 포맷팅 함수들
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ko-KR');
};

export default function ExpenseManagement() {
  const { token, user } = useAuth();

  // 상태 관리
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 다이얼로그 상태
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);

  // 페이지네이션
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 필터 상태
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 폼 데이터
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    buildingId: '' as number | ''
  });

  // 스낵바
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  // 건물 목록 로드
  const loadBuildings = async () => {
    try {
      const response = await axios.get(createApiUrl('/api/buildings'));
      if (response.data.success) {
        setBuildings(response.data.data || []);
      }
    } catch (err: any) {
      console.error('건물 목록 로드 실패:', err);
    }
  };

  // 데이터 로드
  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);

      const buildingId = selectedBuilding || undefined;
      const category = selectedCategory || undefined;
      const start = startDate || undefined;
      const end = endDate || undefined;

      const data = await getExpenses(buildingId, category, start, end, token);
      setExpenses(data);
    } catch (err: any) {
      setError(err.message || '지출 데이터 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, selectedBuilding, startDate, endDate]);

  // 초기 데이터 로드
  useEffect(() => {
    loadBuildings();
  }, []);

  // 다이얼로그 열기
  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setFormData({
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        expenseDate: expense.expenseDate,
        buildingId: expense.buildingId || ''
      });
    } else {
      setEditingExpense(null);
      setFormData({
        category: '',
        description: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        buildingId: ''
      });
    }
    setDialogOpen(true);
  };

  // 폼 제출
  const handleSubmit = async () => {
    try {
      // 유효성 검사
      if (!formData.category || !formData.description || !formData.amount || !formData.expenseDate) {
        setSnackbar({
          open: true,
          message: '모든 필수 필드를 입력해주세요.',
          severity: 'error'
        });
        return;
      }

      if (editingExpense) {
        // 수정
        await updateExpense(editingExpense.id, {
          category: formData.category,
          description: formData.description,
          amount: Number(formData.amount),
          expenseDate: formData.expenseDate,
          buildingId: formData.buildingId || undefined
        }, token);
        setSnackbar({
          open: true,
          message: '지출이 수정되었습니다.',
          severity: 'success'
        });
      } else {
        // 추가
        await createExpense({
          category: formData.category,
          description: formData.description,
          amount: Number(formData.amount),
          expenseDate: formData.expenseDate,
          buildingId: formData.buildingId || undefined,
          createdBy: user?.id || 1 // 로그인한 사용자 ID 사용
        }, token);
        setSnackbar({
          open: true,
          message: '지출이 등록되었습니다.',
          severity: 'success'
        });
      }

      setDialogOpen(false);
      loadExpenses();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || '지출 저장에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 지출 삭제 확인 다이얼로그 열기
  const handleOpenDeleteDialog = (expense: Expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
  };

  // 지출 삭제
  const handleDelete = async () => {
    if (!expenseToDelete) return;

    try {
      await deleteExpense(expenseToDelete.id, token);
      setSnackbar({
        open: true,
        message: '지출이 삭제되었습니다.',
        severity: 'success'
      });
      setDeleteDialogOpen(false);
      loadExpenses();
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: err.message || '지출 삭제에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  // 필터 초기화
  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedBuilding('');
    setStartDate('');
    setEndDate('');
  };

  // 페이지네이션 처리
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 현재 페이지의 데이터
  const paginatedExpenses = expenses.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

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
          지출 관리
        </Typography>
      </Box>

      <Typography variant="h4" component="h1" sx={{ mb: 3, color: '#1e293b' }}>
        지출 관리
      </Typography>

      {/* 필터 섹션 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
          <FilterList sx={{ mr: 1 }} />
          필터 조건
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={selectedCategory}
                label="카테고리"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="">전체</MenuItem>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>건물</InputLabel>
              <Select
                value={selectedBuilding}
                label="건물"
                onChange={(e) => setSelectedBuilding(e.target.value as number | '')}
              >
                <MenuItem value="">전체</MenuItem>
                {buildings.map((building) => (
                  <MenuItem key={building.id} value={building.id}>
                    {building.name}
                  </MenuItem>
                ))}
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
              <Button variant="contained" onClick={loadExpenses} startIcon={<Search />}>
                검색
              </Button>
              <Button variant="outlined" onClick={handleResetFilters}>
                초기화
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* 지출 목록 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            지출 내역 ({expenses.length}건)
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            지출 등록
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ p: 3 }}>
            <Alert severity="error" action={
              <Button color="inherit" size="small" onClick={loadExpenses}>
                다시 시도
              </Button>
            }>
              {error}
            </Alert>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>지출일</TableCell>
                    <TableCell>카테고리</TableCell>
                    <TableCell>지출 내용</TableCell>
                    <TableCell align="right">금액</TableCell>
                    <TableCell>건물</TableCell>
                    <TableCell>등록자</TableCell>
                    <TableCell>등록일</TableCell>
                    <TableCell align="center">작업</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedExpenses.map((expense) => (
                    <TableRow key={expense.id} hover>
                      <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                      <TableCell>
                        <Chip
                          label={expense.category}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold', color: '#f44336' }}>
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        {expense.buildingName ? (
                          <Chip
                            icon={<Business />}
                            label={expense.buildingName}
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label="전체"
                            size="small"
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell>{expense.createdByName || '-'}</TableCell>
                      <TableCell>{formatDate(expense.createdAt)}</TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(expense)}
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDeleteDialog(expense)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  {paginatedExpenses.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        지출 데이터가 없습니다.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={expenses.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="페이지당 행 수:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} / ${count}개`}
            />
          </>
        )}
      </Paper>

      {/* 지출 추가/수정 다이얼로그 */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingExpense ? '지출 수정' : '지출 등록'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>카테고리</InputLabel>
                  <Select
                    value={formData.category}
                    label="카테고리"
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>건물</InputLabel>
                  <Select
                    value={formData.buildingId}
                    label="건물"
                    onChange={(e) => setFormData({ ...formData, buildingId: e.target.value as number | '' })}
                  >
                    <MenuItem value="">전체</MenuItem>
                    {buildings.map((building) => (
                      <MenuItem key={building.id} value={building.id}>
                        {building.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  label="지출 내용"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="지출 내용을 입력하세요"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="number"
                  label="금액"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0"
                  InputProps={{
                    endAdornment: '원'
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  type="date"
                  label="지출일"
                  value={formData.expenseDate}
                  onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingExpense ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>지출 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            다음 지출을 삭제하시겠습니까?
          </Typography>
          {expenseToDelete && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
              <Typography variant="body2"><strong>카테고리:</strong> {expenseToDelete.category}</Typography>
              <Typography variant="body2"><strong>내용:</strong> {expenseToDelete.description}</Typography>
              <Typography variant="body2"><strong>금액:</strong> {formatCurrency(expenseToDelete.amount)}</Typography>
              <Typography variant="body2"><strong>지출일:</strong> {formatDate(expenseToDelete.expenseDate)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            취소
          </Button>
          <Button onClick={handleDelete} variant="contained" color="error">
            삭제
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <SnackbarContent
          message={snackbar.message}
          sx={{
            backgroundColor: snackbar.severity === 'success' ? '#4caf50' : '#f44336',
          }}
        />
      </Snackbar>
    </Box>
  );
}