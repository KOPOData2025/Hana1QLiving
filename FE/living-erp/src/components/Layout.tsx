import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Chip,
  useTheme,
  useMediaQuery,
  Button,
  Collapse,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Business,
  Home,
  People,
  Description,
  Payment,
  EventNote,
  Notifications,
  AccountCircle,
  Logout,
  Settings,
  Security,
  Search,
  Timeline,
  AccountBalance,
  Receipt,
  Analytics,
  Assessment,
  MoneyOff,
  Apartment,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const drawerWidth = 280;

const menuCategories = [
  {
    title: '검색 및 조회',
    items: [
      { text: '내부정보 검색', icon: <Search />, path: '/' },
    ]
  },
  {
    title: '부동산 관리',
    items: [
      { text: '건물 관리', icon: <Business />, path: '/buildings' },
      { text: '호실 관리', icon: <Home />, path: '/units' },
    ]
  },
  {
    title: '계약 및 고객관리',
    items: [
      { text: '사용자 관리', icon: <People />, path: '/users' },
      { text: '계약 관리', icon: <Description />, path: '/contracts' },
      { text: '방문 예약 관리', icon: <EventNote />, path: '/reservations' },
    ]
  },
  {
    title: '결제 관리',
    items: [
      { text: '납부 관리', icon: <Payment />, path: '/payments' },
      { text: '자동이체 관리', icon: <AccountBalance />, path: '/auto-payment' },
    ]
  },
  {
    title: '재무 관리',
    items: [
      { text: '재무 대시보드', icon: <Analytics />, path: '/financial' },
      { text: '지출 관리', icon: <MoneyOff />, path: '/expenses' },
      { text: '재무 보고서', icon: <Assessment />, path: '/reports' },
    ]
  },
  {
    title: '투자 상품',
    items: [
      { text: '리츠 상품 관리', icon: <Apartment />, path: '/reit-products' },
    ]
  },
  {
    title: '시스템 관리',
    items: [
      { text: '시스템 모니터링', icon: <Timeline />, path: '/monitoring' },
    ]
  }
];



export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 현재 활성 페이지가 속한 카테고리 찾기
  const getActiveCategoryIndex = () => {
    return menuCategories.findIndex(category =>
      category.items.some(item => item.path === location.pathname)
    );
  };

  // 컴포넌트 마운트 시 활성 카테고리 펼치기
  React.useEffect(() => {
    const activeCategoryIndex = getActiveCategoryIndex();
    if (activeCategoryIndex !== -1) {
      setExpandedCategories(new Set([activeCategoryIndex]));
    }
  }, [location.pathname]);

  // 카테고리 토글 함수
  const toggleCategory = (categoryIndex: number) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryIndex)) {
        newSet.delete(categoryIndex);
      } else {
        newSet.add(categoryIndex);
      }
      return newSet;
    });
  };

  // 역할 표시를 위한 헬퍼 함수들
  const getRoleLabel = (role: string): string => {
    const roleLabels: { [key: string]: string } = {
      'SUPER_ADMIN': '최고관리자',
      'ADMIN': '관리자',
      'USER': '사용자',
      'MANAGER': '매니저',
      'STAFF': '직원'
    };
    return roleLabels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const roleColors: { [key: string]: string } = {
      'SUPER_ADMIN': '#008485', // 하나그린
      'ADMIN': '#009595', // 하나그린 변형
      'USER': '#1e3a8a', // 하나블루
      'MANAGER': '#f59e0b', // 오렌지
      'STAFF': '#64748b' // 그레이
    };
    return roleColors[role] || '#64748b';
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      handleMenuClose();
    } catch (error) {
      // 에러가 발생해도 로그인 페이지로 이동
      navigate('/login');
      handleMenuClose();
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 금융권 ERP 헤더 */}
      <Box
        sx={{
          background: 'white', // 로고 배경에 맞춰 흰색으로 변경
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          height: '64px', // AppBar와 정확히 동일하게
          minHeight: '64px',
          maxHeight: '64px',
          display: 'flex',
          alignItems: 'center',
        }}
      >

        {/* 메인 브랜드 섹션 */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1.5,
            }}
          >
            <Box
              component="img"
              src="/hana-trust2.svg"
              alt="하나자산신탁"
              sx={{
                width: 120,
                height: 'auto',
                backgroundColor: 'transparent', // 배경 투명화
                display: 'block',
                margin: '0 auto', // 이미지 자체도 중앙 정렬
              }}
            />
            <Typography
              variant="h6"
              sx={{
                fontSize: '0.9rem',
                color: '#008485', // 하나그린
                fontWeight: 700,
                letterSpacing: '0.8px',
                lineHeight: 1,
                textAlign: 'center',
                width: '100%', // 텍스트가 전체 너비 사용
              }}
            >
              통합관리시스템
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* 사용자 정보 섹션을 별도 박스로 분리 */}
      <Box sx={{ p: 1, borderBottom: '1px solid #e2e8f0' }}>
        {/* 사용자 정보 카드 - 사원증 스타일 */}
        {user && (
          <Box
            sx={{
              backgroundColor: 'white',
              border: '2px solid #008485', // 하나그린 테두리
              borderRadius: 2,
              p: 1,
              boxShadow: '0 4px 8px rgba(0, 132, 133, 0.15)',
            }}
          >
            {/* 헤더 - 하나자산신탁 */}
            <Box sx={{ textAlign: 'center', mb: 2, mt: 0.5 }}>
              <Typography
                variant="caption"
                sx={{
                  color: '#008485',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}
              >
                HANA ASSET TRUST
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
              {/* 증명사진 */}
              <Box
                sx={{
                  width: 95,
                  height: 115,
                  borderRadius: 1,
                  overflow: 'hidden',
                  border: '2px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Box
                  component="img"
                  src="/faceimg.png"
                  alt="사원증명사진"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                  onError={(e) => {
                    // 이미지 로드 실패 시 대체 텍스트 표시
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML = `
                      <div style="
                        width: 100%;
                        height: 100%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: #008485;
                        color: white;
                        font-weight: 700;
                        font-size: 1.2rem;
                      ">
                        ${user?.name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                      </div>
                    `;
                  }}
                />
              </Box>

              {/* 사원 정보 */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{
                      color: '#1e293b',
                      fontWeight: 700,
                      fontSize: '1rem',
                      letterSpacing: '0.3px',
                    }}
                  >
                    {user.name || user.username}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={handleLogout}
                    sx={{
                      color: '#64748b',
                      padding: 0.5,
                      '&:hover': {
                        color: '#ED1651',
                        backgroundColor: 'rgba(237, 22, 81, 0.08)',
                      },
                    }}
                  >
                    <Logout sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 1 }}>
                  {/* 사원번호 */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#64748b',
                        fontSize: '0.75rem',
                        fontWeight: 300,
                      }}
                    >
                      사원번호
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#1e293b',
                        fontWeight: 300,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                      }}
                    >
                      {user.employeeNumber || '00000000'}
                    </Typography>
                  </Box>

                  {/* 부서 정보 */}
                  {(user.department || user.dept) && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#64748b',
                          fontSize: '0.75rem',
                          fontWeight: 300,
                        }}
                      >
                        부서
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#1e293b',
                          fontWeight: 300,
                          fontSize: '0.8rem',
                        }}
                      >
                        {user.department || user.dept}
                      </Typography>
                    </Box>
                  )}
                </Box>

                <Box>
                  <Chip
                    label={getRoleLabel(user.role)}
                    size="small"
                    variant="outlined"
                    sx={{
                      borderColor: getRoleColor(user.role),
                      color: getRoleColor(user.role),
                      backgroundColor: 'transparent',
                      fontWeight: 600,
                      fontSize: '0.7rem',
                      borderRadius: 0.5,
                      height: 22,
                      '& .MuiChip-label': {
                        px: 1,
                      },
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      {/* 네비게이션 메뉴 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Box sx={{ pt: 2, pb: 2 }}>
          {menuCategories.map((category, categoryIndex) => {
            const isExpanded = expandedCategories.has(categoryIndex);
            return (
              <Box key={category.title}>
                {/* 카테고리 헤더 - 클릭 가능한 버튼 */}
                <ListItemButton
                  onClick={() => toggleCategory(categoryIndex)}
                  sx={{
                    px: 3,
                    py: 1.5,
                    mt: categoryIndex > 0 ? 1 : 0,
                    '&:hover': {
                      backgroundColor: 'rgba(30, 58, 138, 0.08)',
                    },
                    borderRadius: 0,
                  }}
                >
                  <ListItemText
                    primary={category.title}
                    primaryTypographyProps={{
                      variant: 'body1',
                      sx: {
                        color: '#1e3a8a',
                        fontWeight: 700,
                        fontSize: '1.1rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      },
                    }}
                  />
                  <ListItemIcon sx={{ minWidth: 'auto', ml: 1 }}>
                    {isExpanded ? (
                      <ExpandLess sx={{ fontSize: 18, color: '#1e3a8a' }} />
                    ) : (
                      <ExpandMore sx={{ fontSize: 18, color: '#1e3a8a' }} />
                    )}
                  </ListItemIcon>
                </ListItemButton>

                {/* 카테고리 메뉴 아이템들 - Collapse로 감싸기 */}
                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                  <List sx={{ py: 0 }}>
                    {category.items.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <ListItem key={item.text} disablePadding>
                          <ListItemButton
                            onClick={() => handleNavigation(item.path)}
                            sx={{
                              mx: 2,
                              mb: 1,
                              py: 1.5,
                              borderRadius: 2,
                              backgroundColor: isActive ? 'rgba(0, 149, 149, 0.08)' : 'transparent',
                              color: isActive ? '#009595' : '#64748b',
                              '&:hover': {
                                backgroundColor: isActive
                                  ? 'rgba(0, 149, 149, 0.12)'
                                  : 'rgba(100, 116, 139, 0.08)',
                              },
                              '& .MuiListItemIcon-root': {
                                color: isActive ? '#009595' : '#64748b',
                              },
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 44 }}>
                              {item.icon}
                            </ListItemIcon>
                            <ListItemText
                              primary={item.text}
                              primaryTypographyProps={{
                                fontWeight: isActive ? 600 : 500,
                                fontSize: '1rem',
                              }}
                            />
                            {isActive && (
                              <Box
                                sx={{
                                  width: 4,
                                  height: 24,
                                  backgroundColor: '#009595',
                                  borderRadius: '2px',
                                  ml: 'auto',
                                }}
                              />
                            )}
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </List>
                </Collapse>

                {/* 카테고리 구분선 (마지막 카테고리 제외) */}
                {categoryIndex < menuCategories.length - 1 && (
                  <Divider sx={{ mx: 2, my: 1, borderColor: '#e2e8f0' }} />
                )}
              </Box>
            );
          })}
        </Box>
      </Box>


    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', width: '100vw' }}>
      {/* 사이드바 */}
      <Box
        component="nav"
        sx={{
          width: { md: drawerWidth },
          flexShrink: { md: 0 },
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 1200, // 높은 z-index로 사이드바를 최상단에 배치
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.1)',
        }}
      >
        {/* 모바일 사이드바 */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            zIndex: 1300, // 모바일에서는 더 높은 z-index
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: '1px solid #e2e8f0',
            },
          }}
        >
          {drawerContent}
        </Drawer>

        {/* 데스크톱 사이드바 */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: '#ffffff',
              borderRight: '1px solid #e2e8f0',
              position: 'fixed', // 고정 위치
              left: 0,
              top: 0,
              height: '100vh',
              zIndex: 1200,
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      </Box>

      {/* 메인 콘텐츠 영역 */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          backgroundColor: '#f8fafc',
          ml: { xs: 0, md: `${drawerWidth}px` }, // 사이드바 너비만큼 왼쪽 여백 추가
          position: 'relative', // 상대 위치로 설정
          zIndex: 1, // 낮은 z-index로 사이드바 뒤에 배치
        }}
      >
        {/* 상단 앱바 */}
        <AppBar
          position="fixed"
          sx={{
            width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
            ml: { xs: 0, md: `${drawerWidth}px` },
            backgroundColor: '#ffffff',
            color: '#1e293b',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            borderBottom: '1px solid #e2e8f0',
            zIndex: theme.zIndex.appBar,
            height: '66px',
            minHeight: '66px',
            maxHeight: '66px',
          }}
        >
          <Toolbar sx={{
            justifyContent: 'space-between',
            height: '66px',
            minHeight: '66px !important',
            maxHeight: '66px',
          }}>
            {/* 모바일 메뉴 버튼 */}
            <IconButton
              color="inherit"
              aria-label="메뉴 열기"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </IconButton>

            {/* 페이지 제목 */}
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              {(() => {
                const path = location.pathname;
                if (path === '/') return '내부정보 검색';
                if (path === '/buildings') return '건물 관리';
                if (path === '/units') return '호실 관리';
                if (path === '/users') return '사용자 관리';
                if (path === '/contracts') return '계약 관리';
                if (path === '/payments') return '납부 관리';
                if (path === '/reservations') return '방문 예약 관리';
                if (path === '/auto-payment') return '자동이체 관리';
                if (path === '/auto-billing') return '자동납부 관리';
                if (path === '/financial') return '재무 대시보드';
                if (path === '/expenses') return '지출 관리';
                if (path === '/reports') return '재무 보고서';
                if (path === '/reit-products') return '리츠 상품 관리';
                if (path === '/monitoring') return '시스템 모니터링';
                if (path === '/internal-search') return '내부정보 검색';
                return '하나원큐리빙 ERP';
              })()}
            </Typography>

            {/* 우측 사용자 메뉴 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* 알림 아이콘 */}
              <IconButton
                size="large"
                aria-label="알림"
                sx={{
                  color: '#64748b',
                  '&:hover': { backgroundColor: '#f1f5f9' },
                }}
              >
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>

              {/* 사용자 메뉴 */}
              <IconButton
                size="large"
                aria-label="사용자 메뉴"
                onClick={handleMenuOpen}
                sx={{
                  color: '#64748b',
                  '&:hover': { backgroundColor: '#f1f5f9' },
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    backgroundColor: '#009595', // 하나그린
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {user?.name?.charAt(0) || user?.username?.charAt(0) || 'A'}
                </Avatar>
              </IconButton>

              {/* 사용자 메뉴 드롭다운 */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                PaperProps={{
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                  },
                }}
              >
                <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <AccountCircle fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="프로필" 
                    secondary={user?.email || user?.username}
                    primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}
                    secondaryTypographyProps={{ fontSize: '0.75rem' }}
                  />
                </MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Settings fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="설정" 
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </MenuItem>
                <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Security fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="보안" 
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </MenuItem>
                <Divider sx={{ my: 1 }} />
                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="로그아웃" 
                    primaryTypographyProps={{ fontSize: '0.875rem' }}
                  />
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        {/* 페이지 콘텐츠 */}
        <Box
          sx={{
            pt: { xs: 7, md: 8 }, // 앱바 높이만큼 상단 여백
            minHeight: '100vh',
            backgroundColor: '#f8fafc',
            width: '100%', // 전체 너비 사용
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
