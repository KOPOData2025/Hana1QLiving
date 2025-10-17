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
  Tabs,
  Tab,
  Divider,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  TrendingUp as TrendingUpIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { reitService } from '../services/reitService';
import { getBuildings } from '../services/buildingService';
import type { ReitProduct, ReitBuildingMapping } from '../types/reit';
import type { Building } from '../types/building';
import DividendManagement from '../components/DividendManagement';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

export default function ReitProductDetail() {
  const navigate = useNavigate();
  const { productCode } = useParams<{ productCode: string }>();

  const [product, setProduct] = useState<ReitProduct | null>(null);
  const [buildingMappings, setBuildingMappings] = useState<ReitBuildingMapping[]>([]);
  const [availableBuildings, setAvailableBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  // 다이얼로그 상태
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [selectedBuildingId, setSelectedBuildingId] = useState<number | ''>('');
  const [inclusionDate, setInclusionDate] = useState(new Date().toISOString().split('T')[0]);

  // 스낵바
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  useEffect(() => {
    if (productCode) {
      loadProductData();
      loadBuildingMappings();
      loadAvailableBuildings();
    }
  }, [productCode]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      const data = await reitService.products.getProductByCode(productCode!);
      setProduct(data);
    } catch (error) {
      console.error('리츠 상품 조회 실패:', error);
      setSnackbar({ open: true, message: '리츠 상품 조회에 실패했습니다.', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadBuildingMappings = async () => {
    try {
      const data = await reitService.buildings.getBuildingsByProduct(productCode!);
      setBuildingMappings(data);
    } catch (error) {
      console.error('건물 매핑 조회 실패:', error);
    }
  };

  // 사용 가능한 건물 목록 로드
  const loadAvailableBuildings = async () => {
    try {
      const data = await getBuildings();
      setAvailableBuildings(data);
    } catch (error) {
      console.error('건물 목록 조회 실패:', error);
      setSnackbar({ open: true, message: '건물 목록 조회에 실패했습니다.', severity: 'error' });
    }
  };

  const handleAddBuilding = async () => {
    if (!selectedBuildingId) {
      setSnackbar({ open: true, message: '건물을 선택해주세요.', severity: 'error' });
      return;
    }

    try {
      await reitService.buildings.addBuildingToProduct(productCode!, {
        productCode: productCode!,
        buildingId: selectedBuildingId as number,
        inclusionDate,
      });

      setSnackbar({ open: true, message: '건물이 성공적으로 추가되었습니다.', severity: 'success' });
      setOpenAddDialog(false);
      setSelectedBuildingId('');
      setInclusionDate(new Date().toISOString().split('T')[0]);
      loadBuildingMappings();
    } catch (error: any) {
      console.error('건물 추가 실패:', error);
      const message = error.response?.data?.message || '건물 추가에 실패했습니다.';
      setSnackbar({ open: true, message, severity: 'error' });
    }
  };

  const handleRemoveBuilding = async (mappingId: number) => {
    if (window.confirm('정말로 이 건물을 리츠 상품에서 제외하시겠습니까?')) {
      try {
        await reitService.buildings.removeBuildingFromProduct(mappingId);
        setSnackbar({ open: true, message: '건물이 성공적으로 제외되었습니다.', severity: 'success' });
        loadBuildingMappings();
      } catch (error: any) {
        console.error('건물 제외 실패:', error);
        const message = error.response?.data?.message || '건물 제외에 실패했습니다.';
        setSnackbar({ open: true, message, severity: 'error' });
      }
    }
  };

  const getActiveBuildingsCount = () => {
    return buildingMappings.filter(mapping => !mapping.exclusionDate).length;
  };

  const getTotalUnitsCount = () => {
    return buildingMappings
      .filter(mapping => !mapping.exclusionDate)
      .reduce((total, mapping) => {
        const building = availableBuildings.find(b => b.id === mapping.buildingId);
        return total + (building?.totalUnits || 0);
      }, 0);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          리츠 상품을 찾을 수 없습니다.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* 브레드크럼 */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/reit-products');
          }}
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon fontSize="small" />
          리츠 상품 관리
        </Link>
        <Typography color="text.primary">{product.productName}</Typography>
      </Breadcrumbs>

      {/* 헤더 */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/reit-products')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e3a8a' }}>
            {product.productName}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            상품코드: {product.productCode} | 상장일: {new Date(product.listingDate).toLocaleDateString('ko-KR')}
          </Typography>
        </Box>
      </Box>

      {/* 통계 카드 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'white', border: '1px solid #e2e8f0' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b' }}>
                    {getActiveBuildingsCount()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    포함 건물 수
                  </Typography>
                </Box>
                <BusinessIcon sx={{ fontSize: 40, color: '#64748b' }} />
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
                    {getTotalUnitsCount()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    총 호실 수
                  </Typography>
                </Box>
                <HomeIcon sx={{ fontSize: 40, color: '#64748b' }} />
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
                    {buildingMappings.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    전체 이력
                  </Typography>
                </Box>
                <CalendarIcon sx={{ fontSize: 40, color: '#64748b' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 탭 */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
            <Tab label="포함 건물 관리" />
            <Tab label="배당 관리" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          {/* 건물 추가 버튼 */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenAddDialog(true)}
              sx={{ bgcolor: '#009595', '&:hover': { bgcolor: '#007b7b' } }}
            >
              건물 추가
            </Button>
          </Box>

          {/* 건물 목록 테이블 */}
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>건물명</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>주소</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>층수</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>호실수</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>포함일</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>상태</TableCell>
                  <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>작업</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {buildingMappings.map((mapping) => {
                  const building = availableBuildings.find(b => b.id === mapping.buildingId);
                  return (
                    <TableRow key={mapping.mappingId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {mapping.buildingName || building?.name || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>{mapping.buildingAddress || building?.address || '-'}</TableCell>
                      <TableCell>{building?.totalFloors || '-'}</TableCell>
                      <TableCell>{building?.totalUnits || '-'}</TableCell>
                      <TableCell>
                        {new Date(mapping.inclusionDate).toLocaleDateString('ko-KR')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mapping.exclusionDate ? '제외됨' : '포함중'}
                          size="small"
                          sx={{
                            bgcolor: mapping.exclusionDate ? '#fee2e2' : '#dcfce7',
                            color: mapping.exclusionDate ? '#dc2626' : '#16a34a',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {!mapping.exclusionDate && (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveBuilding(mapping.mappingId)}
                            sx={{ color: '#dc2626' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {buildingMappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography color="text.secondary">
                        포함된 건물이 없습니다.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <DividendManagement productCode={productCode!} product={product} />
        </TabPanel>
      </Card>

      {/* 건물 추가 다이얼로그 */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          리츠 상품에 건물 추가
        </DialogTitle>
        <DialogContent sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sx={{ mt: 2 }}>
              <FormControl fullWidth required>
                <InputLabel>건물 선택</InputLabel>
                <Select
                  value={selectedBuildingId}
                  label="건물 선택"
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                >
                  {availableBuildings
                    .filter(building => !buildingMappings.some(mapping =>
                      mapping.buildingId === building.id && !mapping.exclusionDate
                    ))
                    .map((building) => (
                      <MenuItem key={building.id} value={building.id}>
                        {building.name} - {building.address}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="포함일"
                type="date"
                value={inclusionDate}
                onChange={(e) => setInclusionDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button onClick={() => setOpenAddDialog(false)}>취소</Button>
          <Button
            variant="contained"
            onClick={handleAddBuilding}
            sx={{ bgcolor: '#009595', '&:hover': { bgcolor: '#007b7b' } }}
          >
            추가
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