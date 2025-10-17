import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Tabs,
  Tab,
  TablePagination,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  Select,
  Grid,
  InputLabel,
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Flag,
  Search,
  FilterList,
  MoreVert,
  Email,
  Phone,
  Description,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import type {
  Reservation,
  ReservationStatus,
  ReservationStatusFilter,
} from '../types/reservation';
import {
  RESERVATION_STATUS_CONFIG,
} from '../types/reservation';
import {
  getReservations,
  confirmReservation,
  cancelReservation,
  completeReservation,
  getReservationStatistics,
} from '../services/reservationService';
import type {
  Building,
  Unit,
} from '../types/building';
import {
  getBuildings,
  getAvailableUnitsByBuildingId,
} from '../services/buildingService';
// 계약 관련 import 제거됨 - 계약은 별도 화면에서 처리

export default function Reservations() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filteredReservations, setFilteredReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 필터 및 검색 상태
  const [currentTab, setCurrentTab] = useState<ReservationStatusFilter>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // 모달 상태
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    reservationId: number | null;
    action: 'confirm' | 'cancel' | 'complete' | null;
    actionText: string;
  }>({
    open: false,
    reservationId: null,
    action: null,
    actionText: '',
  });

  // 메뉴 상태
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);

  // 상세 모달 상태
  const [detailModal, setDetailModal] = useState<{
    open: boolean;
    reservation: Reservation | null;
    editingData: Partial<Reservation>;
  }>({
    open: false,
    reservation: null,
    editingData: {},
  });

  // 건물 데이터 (정보 표시용)
  const [buildings, setBuildings] = useState<Building[]>([]);

  // 계약 관련 상태 제거됨 - 계약은 별도 화면에서 처리

  // 통계 상태
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
  });

  // 초기 데이터 로드
  useEffect(() => {
    loadReservations();
    loadStatistics();
    loadBuildings();
  }, []);

  // 필터링 및 검색
  useEffect(() => {
    filterReservations();
  }, [reservations, currentTab, searchQuery]);

  // 계약 관련 useEffect 제거됨

  const loadReservations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getReservations();
      setReservations(data);
    } catch (err: any) {
      console.error('예약 목록 로드 실패:', err);
      setError(err.message || '예약 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getReservationStatistics();
      setStatistics(stats);
    } catch (err: any) {
      console.error('예약 통계 로드 실패:', err);
    }
  };

  const loadBuildings = async () => {
    try {
      const data = await getBuildings();
      setBuildings(data);
    } catch (err: any) {
      console.error('건물 목록 로드 실패:', err);
    }
  };

  // 호실 관련 함수 제거됨 - 계약은 별도 화면에서 처리

  const filterReservations = () => {
    let filtered = [...reservations];

    // 상태별 필터링
    if (currentTab !== 'ALL') {
      filtered = filtered.filter(reservation => reservation.status === currentTab);
    }

    // 검색어 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(reservation => 
        reservation.name.toLowerCase().includes(query) ||
        reservation.email.toLowerCase().includes(query) ||
        reservation.phone.includes(query) ||
        reservation.occupation.toLowerCase().includes(query) ||
        reservation.currentResidence.toLowerCase().includes(query)
      );
    }

    setFilteredReservations(filtered);
    setPage(0); // 필터링 시 첫 페이지로 이동
  };

  const handleStatusChange = async (
    reservationId: number,
    action: 'confirm' | 'cancel' | 'complete'
  ) => {
    try {
      setLoading(true);
      
      let updatedReservation: Reservation;
      let message: string;

      switch (action) {
        case 'confirm':
          updatedReservation = await confirmReservation(reservationId);
          message = '예약이 성공적으로 확정되었습니다.';
          break;
        case 'cancel':
          updatedReservation = await cancelReservation(reservationId);
          message = '예약이 성공적으로 취소되었습니다.';
          break;
        case 'complete':
          updatedReservation = await completeReservation(reservationId);
          message = '예약이 성공적으로 완료되었습니다.';
          break;
        default:
          throw new Error('잘못된 액션입니다.');
      }

      // 로컬 상태 업데이트
      setReservations(prev => 
        prev.map(reservation => 
          reservation.id === reservationId ? updatedReservation : reservation
        )
      );

      // 필터링된 예약 목록도 즉시 업데이트
      setFilteredReservations(prev => 
        prev.map(reservation => 
          reservation.id === reservationId ? updatedReservation : reservation
        )
      );

      setSuccess(message);
      await loadStatistics(); // 통계 업데이트
      
      // 필터링 로직을 다시 실행하여 화면 즉시 갱신
      setTimeout(() => {
        filterReservations();
      }, 100);
    } catch (err: any) {
      console.error('예약 상태 변경 실패:', err);
      setError(err.message || '예약 상태 변경에 실패했습니다.');
    } finally {
      setLoading(false);
      setConfirmDialog({ open: false, reservationId: null, action: null, actionText: '' });
    }
  };

  const handleConfirmDialog = (
    reservationId: number,
    action: 'confirm' | 'cancel' | 'complete'
  ) => {
    const actionTexts = {
      confirm: '계약 성사로 처리',
      cancel: '예약 취소로 처리',
      complete: '예약 완료로 처리',
    };

    setConfirmDialog({
      open: true,
      reservationId,
      action,
      actionText: actionTexts[action],
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, reservation: Reservation) => {
    setAnchorEl(event.currentTarget);
    setSelectedReservation(reservation);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReservation(null);
  };

  const handleRowClick = (reservation: Reservation) => {
    setDetailModal({
      open: true,
      reservation,
      editingData: reservation, // 예약 정보 확인 및 수정용
    });
  };

  const handleDetailModalClose = () => {
    setDetailModal({
      open: false,
      reservation: null,
      editingData: {},
    });
  };

  // 편집 관련 함수는 더 이상 필요 없음 (항상 편집 모드)

  const handleFieldChange = (field: keyof Reservation, value: any) => {
    // 예약 정보 수정
    setDetailModal(prev => ({
      ...prev,
      editingData: {
        ...prev.editingData,
        [field]: value,
      },
    }));
  };



  // 계약 관련 함수들 제거됨 - 예약 확정만 처리

  const getStatusConfig = (status: ReservationStatus) => {
    return RESERVATION_STATUS_CONFIG[status];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPhoneNumber = (phone: string) => {
    return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  };

  // 헬퍼 함수들
  // getBuildingName, getUnitName 제거됨 - 항상 편집 모드에서만 Select 사용

  const getCurrentValue = (field: keyof Reservation) => {
    if (detailModal.editingData.hasOwnProperty(field)) {
      return detailModal.editingData[field];
    }
    return detailModal.reservation?.[field] || '';
  };

  // calculateEndDate 함수 제거됨

  // 페이지네이션 처리
  const paginatedReservations = filteredReservations.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading && reservations.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" color="text.secondary">
          예약 목록을 불러오는 중...
        </Typography>
      </Box>
    );
  }

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
          계약 및 고객관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          방문 예약 관리
        </Typography>
      </Box>

      {/* 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: '#1e293b', mb: 1 }}>
          방문 예약 관리
        </Typography>
        <Typography variant="body1" color="text.secondary">
          고객의 방문 예약을 관리하고 계약 성사로 처리할 수 있습니다.
        </Typography>
      </Box>



      {/* 필터 탭 */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          variant="fullWidth"
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              color: '#64748b', // 일반 상태는 회색
              '&.Mui-selected': {
                color: '#009595', // 선택된 탭은 하나그린
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#009595', // 인디케이터도 하나그린
            },
          }}
        >
          <Tab label="전체" value="ALL" />
          <Tab 
            label={`대기중 (${statistics.pending})`} 
            value="PENDING"
          />
          <Tab 
            label={`확정 (${statistics.confirmed})`} 
            value="CONFIRMED"
          />
          <Tab 
            label={`취소 (${statistics.cancelled})`} 
            value="CANCELLED"
          />
          <Tab 
            label={`완료 (${statistics.completed})`} 
            value="COMPLETED"
          />
        </Tabs>
      </Paper>

      {/* 검색 및 액션 바 */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="이름, 이메일, 전화번호로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1 }}
            size="small"
          />
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={loadReservations}
            disabled={loading}
          >
            새로고침
          </Button>
        </Box>
      </Paper>

      {/* 예약 테이블 */}
      <Paper sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>고객명</TableCell>
                <TableCell>연락처</TableCell>
                <TableCell>직업</TableCell>
                <TableCell>현재 거주지</TableCell>
                <TableCell>입주 희망일</TableCell>
                <TableCell>거주 기간</TableCell>
                <TableCell>상태</TableCell>
                <TableCell>신청일</TableCell>
                                 <TableCell align="center"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedReservations.map((reservation) => {
                const statusConfig = getStatusConfig(reservation.status);
                return (
                                     <TableRow 
                     key={reservation.id} 
                     hover 
                     onClick={() => handleRowClick(reservation)}
                     sx={{ cursor: 'pointer' }}
                   >
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {reservation.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {reservation.age}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Phone sx={{ fontSize: 14 }} />
                          {formatPhoneNumber(reservation.phone)}
                        </Typography>
                        <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Email sx={{ fontSize: 14 }} />
                          {reservation.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.occupation}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.currentResidence}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.moveInDate}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{reservation.residencePeriod}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={statusConfig.label}
                        size="small"
                        sx={{
                          backgroundColor: statusConfig.backgroundColor,
                          color: statusConfig.color,
                          fontWeight: 600,
                          '& .MuiChip-label': {
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          },
                        }}
                        icon={
                          <span style={{ fontSize: '12px' }}>{statusConfig.icon}</span>
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(reservation.createdAt)}
                      </Typography>
                    </TableCell>
                                         <TableCell align="center">
                       <IconButton
                         size="small"
                         onClick={(e) => {
                           e.stopPropagation(); // 행 클릭 이벤트 방지
                           handleMenuOpen(e, reservation);
                         }}
                       >
                         <MoreVert />
                       </IconButton>
                     </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* 페이지네이션 */}
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredReservations.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          labelRowsPerPage="페이지당 행 수:"
          labelDisplayedRows={({ from, to, count }) => 
            `${from}-${to} / 총 ${count !== -1 ? count : `${to}개 이상`}`
          }
        />
      </Paper>

      {/* 액션 메뉴 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
                 {selectedReservation?.status === 'PENDING' && selectedReservation && (
           <MenuItem
             onClick={() => {
               handleConfirmDialog(selectedReservation.id, 'confirm');
               handleMenuClose();
             }}
           >
             <ListItemIcon>
               <CheckCircle sx={{ color: RESERVATION_STATUS_CONFIG.CONFIRMED.color }} />
             </ListItemIcon>
             <ListItemText>계약 성사</ListItemText>
           </MenuItem>
         )}
         
         {selectedReservation && selectedReservation.status !== 'CANCELLED' && selectedReservation.status !== 'COMPLETED' && (
           <MenuItem
             onClick={() => {
               handleConfirmDialog(selectedReservation.id, 'cancel');
               handleMenuClose();
             }}
           >
             <ListItemIcon>
               <Cancel sx={{ color: RESERVATION_STATUS_CONFIG.CANCELLED.color }} />
             </ListItemIcon>
             <ListItemText>예약 취소</ListItemText>
           </MenuItem>
         )}

         {selectedReservation?.status === 'CONFIRMED' && selectedReservation && (
           <MenuItem
             onClick={() => {
               handleConfirmDialog(selectedReservation.id, 'complete');
               handleMenuClose();
             }}
           >
             <ListItemIcon>
               <Flag sx={{ color: RESERVATION_STATUS_CONFIG.COMPLETED.color }} />
             </ListItemIcon>
             <ListItemText>예약 완료</ListItemText>
           </MenuItem>
         )}
      </Menu>

             {/* 예약 상세 모달 */}
      <Dialog
        open={detailModal.open}
        onClose={handleDetailModalClose}
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1e293b' }}>
              방문 예약 정보 확인
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {detailModal.reservation && (
                <Chip
                  label={getStatusConfig(detailModal.reservation.status).label}
                  size="small"
                  sx={{
                    backgroundColor: getStatusConfig(detailModal.reservation.status).backgroundColor,
                    color: getStatusConfig(detailModal.reservation.status).color,
                    fontWeight: 600,
                    borderRadius: 1,
                  }}
                  icon={
                    <span style={{ fontSize: '12px' }}>
                      {getStatusConfig(detailModal.reservation.status).icon}
                    </span>
                  }
                />
              )}
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {detailModal.reservation && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {/* 고객 기본 정보 */}
              <Box sx={{
                mt: 3,
                p: 3,
                backgroundColor: '#ffffff',
                borderRadius: 1,
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 3, 
                  color: '#1e293b',
                  fontSize: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  pb: 2,
                }}>
                  👤 고객 기본 정보
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="이름 *"
                      value={getCurrentValue('name')}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      required
                      placeholder="고객 이름을 입력하세요"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="나이"
                      value={getCurrentValue('age')}
                      onChange={(e) => handleFieldChange('age', e.target.value)}
                      placeholder="나이를 입력하세요"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="이메일"
                      type="email"
                      value={getCurrentValue('email')}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      placeholder="이메일을 입력하세요"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="전화번호"
                      value={getCurrentValue('phone')}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      placeholder="01012345678"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="직업"
                      value={getCurrentValue('occupation')}
                      onChange={(e) => handleFieldChange('occupation', e.target.value)}
                      placeholder="직업을 입력하세요"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="현재 거주지"
                      value={getCurrentValue('currentResidence')}
                      onChange={(e) => handleFieldChange('currentResidence', e.target.value)}
                      placeholder="현재 거주지를 입력하세요"
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>

              {/* 입주 희망 정보 */}
              <Box sx={{ 
                p: 3, 
                backgroundColor: '#ffffff', 
                borderRadius: 1, 
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
              }}>
                <Typography variant="h6" sx={{ 
                  fontWeight: 600, 
                  mb: 3, 
                  color: '#1e293b',
                  fontSize: '1rem',
                  borderBottom: '1px solid #e2e8f0',
                  pb: 2,
                }}>
                  🏠 입주 희망 정보
                </Typography>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="입주 희망일"
                      type="date"
                      value={getCurrentValue('moveInDate')}
                      onChange={(e) => handleFieldChange('moveInDate', e.target.value)}
                      variant="outlined"
                      size="medium"
                      InputLabelProps={{ shrink: true }}
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
                            borderColor: '#009595',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: '#6b7280',
                          '&.Mui-focused': {
                            color: '#009595',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <FormControl fullWidth>
                      <InputLabel sx={{ color: '#6b7280' }}>거주 희망 기간</InputLabel>
                      <Select
                        value={getCurrentValue('residencePeriod') || ''}
                        label="거주 희망 기간"
                        onChange={(e) => handleFieldChange('residencePeriod', e.target.value)}
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
                            borderColor: '#009595',
                          },
                        }}
                      >
                        <MenuItem value="">거주 기간을 선택하세요</MenuItem>
                        <MenuItem value="6개월">6개월</MenuItem>
                        <MenuItem value="1년">1년</MenuItem>
                        <MenuItem value="2년">2년</MenuItem>
                        <MenuItem value="3년">3년</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="건물 ID"
                      value={getCurrentValue('buildingId') || ''}
                      variant="outlined"
                      size="medium"
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          backgroundColor: '#f8fafc',
                          '& fieldset': {
                            borderColor: '#d1d5db',
                          },
                        },
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} md={6} sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="호실 ID"
                      value={getCurrentValue('unitId') || ''}
                      variant="outlined"
                      size="medium"
                      InputProps={{ readOnly: true }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 1,
                          backgroundColor: '#f8fafc',
                          '& fieldset': {
                            borderColor: '#d1d5db',
                          },
                        },
                      }}
                    />
                  </Grid>
                </Grid>
              </Box>



              {/* 계약 정보 섹션 제거됨 - 계약은 별도 화면에서 처리 */}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ 
          p: 3, 
          pt: 2, 
          borderTop: '1px solid #e2e8f0', 
          backgroundColor: '#f8fafc',
          gap: 1.5
        }}>
          <Button
            onClick={handleDetailModalClose} 
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
            닫기
          </Button>

          {detailModal.reservation?.status === 'PENDING' && (
            <Button
              variant="contained"
              onClick={async () => {
                if (detailModal.reservation) {
                  await handleStatusChange(detailModal.reservation.id, 'confirm');
                  handleDetailModalClose();
                }
              }}
              startIcon={<CheckCircle />}
              sx={{ 
                px: 3, 
                py: 1.5,
                borderRadius: 1,
                backgroundColor: '#009595',
                fontWeight: 600,
                boxShadow: 'none',
                '&:hover': { 
                  backgroundColor: '#007a7a',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
                }
              }}
            >
              예약 확정
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* 확인 다이얼로그 */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, reservationId: null, action: null, actionText: '' })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>예약 상태 변경 확인</DialogTitle>
        <DialogContent>
          <Typography>
            정말로 이 예약을 <strong>{confirmDialog.actionText}</strong>하시겠습니까?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            이 작업은 되돌릴 수 없습니다.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, reservationId: null, action: null, actionText: '' })}
          >
            취소
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (confirmDialog.reservationId && confirmDialog.action) {
                handleStatusChange(confirmDialog.reservationId, confirmDialog.action);
              }
            }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : '확인'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 성공/에러 스낵바 */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
