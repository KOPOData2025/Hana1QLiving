import { StyleSheet } from 'react-native';
import { Colors, Shadows } from './Colors';

export const CommonStyles = StyleSheet.create({
  // 레이아웃
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  
  // 섹션
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  
  // 카드
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Shadows.medium,
  },
  cardCompact: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...Shadows.small,
  },
  
  // 버튼
  buttonPrimary: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.small,
  },
  buttonSecondary: {
    backgroundColor: Colors.light.surface,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.textInverse,
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.primary,
  },
  
  // 입력 필드
  input: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  inputFocused: {
    borderColor: Colors.light.primary,
    borderWidth: 2,
  },
  
  // 그리드
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  column: {
    flexDirection: 'column',
  },
  
  // 간격
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  
  // 텍스트
  textLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.light.text,
  },
  textMedium: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  textSmall: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.light.textSecondary,
  },
  textCaption: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.light.textDisabled,
  },
});

export const DarkStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.background,
  },
  safeArea: {
    backgroundColor: Colors.dark.background,
  },
  card: {
    backgroundColor: Colors.dark.surface,
  },
  cardCompact: {
    backgroundColor: Colors.dark.surface,
  },
  buttonSecondary: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.primary,
  },
  input: {
    backgroundColor: Colors.dark.surface,
    borderColor: Colors.dark.border,
  },
  textLarge: {
    color: Colors.dark.text,
  },
  textMedium: {
    color: Colors.dark.text,
  },
  textSmall: {
    color: Colors.dark.textSecondary,
  },
  textCaption: {
    color: Colors.dark.textDisabled,
  },
});
