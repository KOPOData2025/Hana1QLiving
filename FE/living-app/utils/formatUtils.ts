/**
 * 금액을 한국어 단위로 포맷하는 유틸리티 함수
 */

/**
 * 원 단위 금액을 "1천만원", "5천원", "1억원" 등의 형태로 변환
 * @param amount 원 단위 금액
 * @returns 포맷된 문자열
 */
export function formatKoreanCurrency(amount: number): string {
  if (amount === 0) return '0원';

  // 안전하게 정수로 변환
  const intAmount = Math.floor(Number(amount));

  // 간단하고 명확한 단위 계산
  if (intAmount >= 100000000) {
    // 억 단위
    const eok = Math.floor(intAmount / 100000000);
    const remainder = intAmount % 100000000;

    if (remainder === 0) {
      return `${eok}억원`;
    } else if (remainder >= 10000) {
      const man = Math.floor(remainder / 10000);
      const finalRemainder = remainder % 10000;
      if (finalRemainder === 0) {
        return `${eok}억${man}만원`;
      } else {
        return `${eok}억${man}만${finalRemainder}원`;
      }
    } else {
      return `${eok}억${remainder}원`;
    }
  } else if (intAmount >= 10000) {
    // 만 단위
    const man = Math.floor(intAmount / 10000);
    const remainder = intAmount % 10000;

    if (remainder === 0) {
      return `${man}만원`;
    } else {
      return `${man}만${remainder}원`;
    }
  } else {
    // 원 단위
    return `${intAmount}원`;
  }
}

/**
 * 만원 단위 금액을 한국어 단위로 변환
 * @param manAmount 만원 단위 금액
 * @returns 포맷된 문자열
 */
export function formatKoreanCurrencyFromMan(manAmount: number): string {
  return formatKoreanCurrency(manAmount * 10000);
}

/**
 * 간단한 만원 단위 표시 (기존 방식 호환용)
 * @param amount 원 단위 금액
 * @returns "1,000만원" 형태의 문자열
 */
export function formatSimpleManwon(amount: number): string {
  const manAmount = Math.floor(amount / 10000);
  return `${manAmount.toLocaleString()}만원`;
}

/**
 * 금액 입력용 천단위 콤마 포맷
 * @param value 숫자 문자열
 * @returns 천단위 콤마가 추가된 문자열
 */
export function formatNumberWithCommas(value: string): string {
  const numericValue = value.replace(/[^0-9]/g, '');
  if (numericValue === '') return '';
  return parseInt(numericValue).toLocaleString();
}