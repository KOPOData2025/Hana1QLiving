import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Grid,
  Alert,
  Snackbar,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  AccountBalance as AccountBalanceIcon,
  AccountTree as PortfolioIcon,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { reitService } from '../services/reitService';
import type { ReitProduct, ReitProductRequest } from '../types/reit';
import { STOCK_EXCHANGES } from '../types/reit';

export default function ReitProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<ReitProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ReitProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');

  // 다이얼로그 상태
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ReitProduct | null>(null);
  const [deleteProductCode, setDeleteProductCode] = useState<string | null>(null);

  // 폼 데이터
  const [formData, setFormData] = useState<ReitProductRequest>({
    productCode: '',
    productName: '',
    stockExchange: 'KOSPI',
    listingDate: '',
    managementFee: undefined,
  });

  // 스낵바
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchKeyword]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await reitService.products.getAllProducts();
      // API 응답이 배열이 아닌 경우 방어 로직
      const products = Array.isArray(data) ? data : [];
      setProducts(products);
    } catch (error) {
      console.error('리츠 상품 조회 실패:', error);
      setProducts([]); // 에러 발생시 빈 배열로 초기화
      setSnackbar({ open: true, message: '리츠 상품 조회에 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    // products가 배열이 아닌 경우 방어 로직
    let filtered = Array.isArray(products) ? products : [];

    // "하나"로 시작하는 상품만 필터링
    filtered = filtered.filter(product =>
      product.productName.startsWith('하나')
    );

    if (searchKeyword) {
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        product.productCode.toLowerCase().includes(searchKeyword.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleOpenDialog = (product?: ReitProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        productCode: product.productCode,
        productName: product.productName,
        stockExchange: product.stockExchange,
        listingDate: product.listingDate.split('T')[0], // Date only
        managementFee: product.managementFee,
      });
    } else {
      setEditingProduct(null);
      setFormData({
        productCode: '',
        productName: '',
        stockExchange: 'KOSPI',
        listingDate: '',
        managementFee: undefined,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async () => {
    try {
      if (editingProduct) {
        await reitService.products.updateProduct(editingProduct.productCode, formData);
        setSnackbar({ open: true, message: '리츠 상품이 성공적으로 수정되었습니다.', severity: 'success' });
      } else {
        await reitService.products.createProduct(formData);
        setSnackbar({ open: true, message: '리츠 상품이 성공적으로 등록되었습니다.', severity: 'success' });
      }

      handleCloseDialog();
      loadProducts();
    } catch (error: any) {
      console.error('리츠 상품 저장 실패:', error);
      const message = error.response?.data?.message || '저장에 실패했습니다.';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const handleDeleteProduct = async (productCode: string) => {
    if (window.confirm('정말로 이 리츠 상품을 삭제하시겠습니까?')) {
      try {
        await reitService.products.deleteProduct(productCode);
        setSnackbar({ open: true, message: '리츠 상품이 성공적으로 삭제되었습니다.', severity: 'success' });
        loadProducts();
      } catch (error: any) {
        console.error('리츠 상품 삭제 실패:', error);
        const message = error.response?.data?.message || '삭제에 실패했습니다.';
        setSnackbar({ open: true, message, severity: 'error' });
      }
    }
  };

  const handleViewDetails = (productCode: string) => {
    navigate(`/reit-products/${productCode}`);
  };


  return (
    <Box sx={{ p: 3 }}>
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
          투자 상품
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          리츠 상품 관리
        </Typography>
      </Box>

      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1, fontWeight: 700, color: '#1e3a8a' }}>
          리츠 상품 관리
        </Typography>
        <Typography variant="body2" color="text.secondary">
          부동산투자신탁(리츠) 상품을 생성하고 관리합니다.
        </Typography>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {Array.isArray(filteredProducts) ? filteredProducts.length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 리츠 상품
                  </Typography>
                </Box>
                <AccountBalanceIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {Array.isArray(filteredProducts) ? filteredProducts.length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    상장 상품
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 검색 및 필터 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="상품명 또는 상품코드 검색"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setSearchKeyword('');
                  }}
                >
                  검색 초기화
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{ bgcolor: '#009595', '&:hover': { bgcolor: '#007b7b' } }}
                >
                  리츠 상품 등록
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 상품 테이블 */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>상품코드</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>상품명</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>상장일</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>운용보수</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>등록일</TableCell>
                <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>작업</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      데이터를 불러오는 중...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : Array.isArray(filteredProducts) && filteredProducts.map((product) => (
                <TableRow key={product.productCode} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} color="primary">
                      {product.productCode}
                    </Typography>
                  </TableCell>
                  <TableCell>{product.productName}</TableCell>
                  <TableCell>
                    {product.listingDate ? new Date(product.listingDate).toLocaleDateString('ko-KR') : '-'}
                  </TableCell>
                  <TableCell>
                    {product.managementFee ? `${product.managementFee}%` : '-'}
                  </TableCell>
                  <TableCell>
                    {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<PortfolioIcon />}
                      onClick={() => handleViewDetails(product.productCode)}
                      sx={{
                        mr: 1,
                        color: '#009595',
                        borderColor: '#009595',
                        '&:hover': {
                          bgcolor: '#f0fdf9',
                          borderColor: '#009595'
                        }
                      }}
                    >
                      포트폴리오 관리
                    </Button>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(product)}
                      sx={{ color: '#1e3a8a' }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteProduct(product.productCode)}
                      sx={{ color: '#dc2626' }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && (!Array.isArray(filteredProducts) || filteredProducts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">
                      {searchKeyword
                        ? '검색 조건에 맞는 리츠 상품이 없습니다.'
                        : '등록된 리츠 상품이 없습니다.'}
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 등록/수정 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          {editingProduct ? '리츠 상품 수정' : '리츠 상품 등록'}
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="상품코드"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                disabled={!!editingProduct}
                helperText="주식종목번호를 입력하세요"
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="상품명"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="거래소"
                value="KOSPI"
                disabled
                helperText="리츠는 KOSPI에 상장됩니다"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="상장일"
                type="date"
                value={formData.listingDate}
                onChange={(e) => setFormData({ ...formData, listingDate: e.target.value })}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="운용보수"
                type="number"
                value={formData.managementFee || ''}
                onChange={(e) => setFormData({ ...formData, managementFee: e.target.value ? parseFloat(e.target.value) : undefined })}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>
                }}
                inputProps={{
                  step: 0.01,
                  min: 0,
                  max: 10
                }}
                helperText="연간 운용보수율 (예: 0.8)"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={handleCloseDialog}>취소</Button>
          <Button
            variant="contained"
            onClick={handleSaveProduct}
            sx={{ bgcolor: '#009595', '&:hover': { bgcolor: '#007b7b' } }}
          >
            {editingProduct ? '수정' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}