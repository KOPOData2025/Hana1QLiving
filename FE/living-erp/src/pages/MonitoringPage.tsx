import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Button
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TimelineIcon from '@mui/icons-material/Timeline';
import StorageIcon from '@mui/icons-material/Storage';
import BugReportIcon from '@mui/icons-material/BugReport';
import { Home as HomeIcon, ChevronRight as ChevronRightIcon } from '@mui/icons-material';

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
      id={`monitoring-tabpanel-${index}`}
      aria-labelledby={`monitoring-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const MonitoringPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [kioskMode, setKioskMode] = useState(true);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRefresh = () => {
    // iframe 새로고침
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      iframe.src = iframe.src;
    });
  };

  const handleOpenInNew = (url: string) => {
    window.open(url, '_blank');
  };

  // Grafana URLs
  const grafanaBaseUrl = `http://${import.meta.env.VITE_BASE_IP}:${import.meta.env.VITE_GRAFANA_PORT}`;
  const metricsUrl = `${grafanaBaseUrl}/${kioskMode ? '?kiosk' : ''}`;
  const logsUrl = `${grafanaBaseUrl}/explore?orgId=1&left=%7B%22datasource%22:%22loki%22,%22queries%22:%5B%7B%22refId%22:%22A%22,%22expr%22:%22%7Bapplication%3D%5C%22hana-oneqliving%5C%22%7D%22%7D%5D%7D${kioskMode ? '&kiosk' : ''}`;
  const tracingUrl = `${grafanaBaseUrl}/explore?orgId=1&left=%7B%22datasource%22:%22tempo%22%7D${kioskMode ? '&kiosk' : ''}`;

  return (
    <Box sx={{ width: '100%', height: '100vh', bgcolor: 'background.default' }}>
      {/* Breadcrumb Navigation */}
      <Box sx={{
        p: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        fontSize: '0.875rem',
        color: '#6b7280',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <HomeIcon sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          홈
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#6b7280', fontSize: '0.875rem' }}>
          시스템 관리
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
        <Typography variant="body2" sx={{ color: '#1f2937', fontSize: '0.875rem', fontWeight: 500 }}>
          시스템 모니터링
        </Typography>
      </Box>

      {/* 헤더 */}
      <Paper elevation={1} sx={{ borderRadius: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 'bold' }}>
            시스템 모니터링 대시보드
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={kioskMode}
                  onChange={(e) => setKioskMode(e.target.checked)}
                />
              }
              label="전체화면 모드"
            />
            <Tooltip title="새로고침">
              <IconButton onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* 상태 카드 */}
        <Grid container spacing={2} sx={{ p: 2 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TimelineIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">메트릭 모니터링</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  JVM, DB, 네트워크 성능 지표
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <StorageIcon color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">로그 분석</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  실시간 로그 수집 및 검색
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <BugReportIcon color="warning" sx={{ mr: 1 }} />
                  <Typography variant="h6">분산 트레이싱</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  요청 흐름 추적 및 성능 분석
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* 탭 메뉴 */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab
            label="메트릭 대시보드"
            icon={<TimelineIcon />}
            iconPosition="start"
          />
          <Tab
            label="로그 분석"
            icon={<StorageIcon />}
            iconPosition="start"
          />
          <Tab
            label="분산 트레이싱"
            icon={<BugReportIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* 탭 컨텐츠 */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ height: 'calc(100vh - 280px)', position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <Tooltip title="새 창에서 열기">
              <IconButton
                size="small"
                onClick={() => handleOpenInNew(metricsUrl)}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.100' } }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <iframe
            src={metricsUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            title="메트릭 대시보드"
            style={{ borderRadius: '8px' }}
            allow="fullscreen"
          />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ height: 'calc(100vh - 280px)', position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <Tooltip title="새 창에서 열기">
              <IconButton
                size="small"
                onClick={() => handleOpenInNew(logsUrl)}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.100' } }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              gap: 3
            }}
          >
            <StorageIcon sx={{ fontSize: 80, color: 'success.main' }} />
            <Typography variant="h4" gutterBottom>
              로그 분석
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              애플리케이션 로그를 실시간으로 검색하고 분석하세요
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<OpenInNewIcon />}
              onClick={() => handleOpenInNew(logsUrl)}
              sx={{ px: 4, py: 2 }}
            >
              Grafana 로그 분석 열기
            </Button>
          </Box>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ height: 'calc(100vh - 280px)', position: 'relative' }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <Tooltip title="새 창에서 열기">
              <IconButton
                size="small"
                onClick={() => handleOpenInNew(tracingUrl)}
                sx={{ bgcolor: 'background.paper', '&:hover': { bgcolor: 'grey.100' } }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
              gap: 3
            }}
          >
            <BugReportIcon sx={{ fontSize: 80, color: 'warning.main' }} />
            <Typography variant="h4" gutterBottom>
              분산 트레이싱
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              요청 흐름을 추적하고 성능 병목 지점을 분석하세요
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<OpenInNewIcon />}
              onClick={() => handleOpenInNew(tracingUrl)}
              sx={{ px: 4, py: 2 }}
            >
              Grafana 트레이싱 열기
            </Button>
          </Box>
        </Paper>
      </TabPanel>
    </Box>
  );
};

export default MonitoringPage;