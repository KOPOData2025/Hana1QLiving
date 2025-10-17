/**
 * 하나금융그룹 브랜드 컬러 기반 색상 시스템
 * 전문적이고 신뢰감 있는 금융 서비스에 적합한 색상 팔레트
 */

// 하나금융 공식 색상 기반 팔레트
export const Colors = {
  light: {
    // 하나금융 공식 색상 (필요할 때만 사용)
    primary: '#009178',      // 하나금융 정확한 초록색
    secondary: '#DC221E',    // 하나금융 빨간색 (경고/에러용만)
    
    // 배경 및 표면
    background: '#FFFFFF',   // 순백
    surface: '#F8FAFC',      // 연한 그레이
    surfaceVariant: '#F1F5F9', // 더 연한 그레이
    
    // 텍스트 (기본은 검은색과 회색)
    text: '#0F172A',         // 진한 블랙 (기본 텍스트)
    textSecondary: '#64748B', // 중간 그레이 (보조 텍스트)
    textTertiary: '#94A3B8', // 연한 그레이 (3차 텍스트)
    
    // 테두리 및 그림자
    border: '#E2E8F0',       // 연한 그레이
    shadow: '#1E293B',       // 그림자용
    
    // 상태 색상 (필요할 때만 사용)
    success: '#009178',      // 하나금융 정확한 초록색
    error: '#DC221E',        // 하나금융 빨간색 (에러만)
    warning: '#64748B',      // 경고용 회색 (차분한 느낌)
    info: '#3B82F6',         // 정보 블루
    
    // 탭 및 아이콘
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#009178',
    tint: '#009178',
  },
  dark: {
    // 다크 모드 (필요시)
    primary: '#009178',
    secondary: '#DC221E',
    background: '#0F172A',
    surface: '#1E293B',
    text: '#F8FAFC',
    border: '#334155',
  }
};

// 그라디언트 (하나금융 브랜드)
export const Gradients = {
  primary: ['#009178', '#0EA5E9'],
  secondary: ['#DC221E', '#EF4444'],
  background: ['#FFFFFF', '#F8FAFC'],
};

// 그림자 효과
export const Shadows = {
  small: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  large: {
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
};
