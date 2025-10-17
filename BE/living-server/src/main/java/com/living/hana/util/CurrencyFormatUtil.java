package com.living.hana.util;

/**
 * 금액 포맷 유틸리티 클래스
 */
public class CurrencyFormatUtil {

    /**
     * 원 단위 금액을 한국어 형식으로 변환
     * 예: 10000000 → "1천만원"
     */
    public static String formatKoreanCurrency(long amount) {
        if (amount == 0) return "0원";

        long eok = amount / 100000000L; // 억
        long man = (amount % 100000000L) / 10000L; // 만
        long won = amount % 10000L; // 원

        StringBuilder result = new StringBuilder();

        if (eok > 0) {
            if (eok >= 1000) {
                long cheonEok = eok / 1000;
                long remainingEok = eok % 1000;
                if (cheonEok > 0) {
                    result.append(String.format("%,d천억", cheonEok));
                }
                if (remainingEok > 0) {
                    result.append(String.format("%d억", remainingEok));
                }
            } else {
                result.append(String.format("%d억", eok));
            }
        }

        if (man > 0) {
            if (man >= 1000) {
                long cheon = man / 1000;
                long remainingMan = man % 1000;
                if (cheon > 0) {
                    result.append(String.format("%d천", cheon));
                }
                if (remainingMan > 0) {
                    result.append(String.format("%d만", remainingMan));
                }
            } else {
                result.append(String.format("%d만", man));
            }
        }

        if (won > 0 || result.isEmpty()) {
            if (won >= 1000) {
                long cheon = won / 1000;
                long remainingWon = won % 1000;
                if (cheon > 0) {
                    result.append(String.format("%d천", cheon));
                }
                if (remainingWon > 0) {
                    result.append(String.format("%d", remainingWon));
                }
            } else if (won > 0) {
                result.append(String.format("%d", won));
            }
        }

        return result + "원";
    }

    /**
     * 원 단위와 만원 단위를 함께 표시
     * 예: 10000000 → "10,000,000원 (1천만원)"
     */
    public static String formatCurrencyWithBothUnits(long amount) {
        String koreanFormat = formatKoreanCurrency(amount);
        return String.format("%,d원 (%s)", amount, koreanFormat);
    }
}