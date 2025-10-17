-- ========================================
-- REIT 투자 시뮬레이션 PL/SQL 패키지 (BULK COLLECT 최적화 버전)
-- ========================================

-- 패키지 스펙 생성
CREATE OR REPLACE PACKAGE PKG_REIT_SIMULATION AS

    -- 메인 시뮬레이션 프로시저
    PROCEDURE RUN_SIMULATION(
        p_start_date IN VARCHAR2,              -- 시작일 (YYYY-MM-DD)
        p_end_date IN VARCHAR2,                -- 종료일 (YYYY-MM-DD)
        p_initial_investment IN NUMBER,        -- 초기 투자금
        p_recurring_amount IN NUMBER,          -- 정기 투자 금액
        p_recurring_frequency IN VARCHAR2,     -- 정기 투자 주기 (NONE/DAILY/WEEKLY/MONTHLY)
        p_dividend_reinvest IN VARCHAR2,       -- 배당 재투자 (ALL/NONE)
        p_result_cursor OUT SYS_REFCURSOR,     -- 결과 Ref Cursor
        p_price_query_count OUT NUMBER         -- 가격 조회 연산 횟수
    );

END PKG_REIT_SIMULATION;
/

-- 패키지 바디 생성
CREATE OR REPLACE PACKAGE BODY PKG_REIT_SIMULATION AS

    -- 가격 데이터를 저장할 타입 정의
    TYPE price_record IS RECORD (
        trade_date DATE,
        closing_price NUMBER
    );
    TYPE price_table IS TABLE OF price_record;

    -- 배당 데이터를 저장할 타입 정의
    TYPE dividend_record IS RECORD (
        ex_dividend_date DATE,
        dividend_per_share NUMBER,
        payment_date DATE
    );
    TYPE dividend_table IS TABLE OF dividend_record;

    -- 메모리에 로드된 가격 데이터에서 특정 날짜의 종가 조회
    FUNCTION GET_PRICE_FROM_MEMORY(
        p_prices IN price_table,
        p_date IN DATE
    ) RETURN NUMBER IS
    BEGIN
        -- 1차: 정확한 날짜 매칭 시도
        FOR i IN 1..p_prices.COUNT LOOP
            IF p_prices(i).trade_date = p_date THEN
                RETURN p_prices(i).closing_price;
            END IF;
        END LOOP;

        -- 2차: 해당 날짜 이후의 가장 가까운 거래일 찾기
        FOR i IN 1..p_prices.COUNT LOOP
            IF p_prices(i).trade_date >= p_date THEN
                RETURN p_prices(i).closing_price;
            END IF;
        END LOOP;

        RETURN 0;
    EXCEPTION
        WHEN OTHERS THEN
            RETURN 0;
    END GET_PRICE_FROM_MEMORY;

    -- 다음 매수일 계산
    FUNCTION GET_NEXT_PURCHASE_DATE(
        p_current_date IN DATE,
        p_frequency IN VARCHAR2
    ) RETURN DATE IS
    BEGIN
        CASE p_frequency
            WHEN 'DAILY' THEN
                RETURN p_current_date + 1;
            WHEN 'WEEKLY' THEN
                RETURN p_current_date + 7;
            WHEN 'MONTHLY' THEN
                RETURN ADD_MONTHS(p_current_date, 1);
            ELSE
                RETURN p_current_date + 36500; -- NONE인 경우
        END CASE;
    END GET_NEXT_PURCHASE_DATE;

    -- 메인 시뮬레이션 프로시저
    PROCEDURE RUN_SIMULATION(
        p_start_date IN VARCHAR2,
        p_end_date IN VARCHAR2,
        p_initial_investment IN NUMBER,
        p_recurring_amount IN NUMBER,
        p_recurring_frequency IN VARCHAR2,
        p_dividend_reinvest IN VARCHAR2,
        p_result_cursor OUT SYS_REFCURSOR,
        p_price_query_count OUT NUMBER
    ) IS
        v_start_date DATE;
        v_end_date DATE;
        v_price_query_count NUMBER := 0;

        -- BULK COLLECT용 변수
        TYPE product_code_table IS TABLE OF VARCHAR2(20);
        v_product_codes product_code_table;

    BEGIN
        -- 날짜 변환
        v_start_date := TO_DATE(p_start_date, 'YYYY-MM-DD');
        v_end_date := TO_DATE(p_end_date, 'YYYY-MM-DD');
        v_price_query_count := 0;

        -- 1번 실행 테스트
        FOR iteration IN 1..1 LOOP
            -- 임시 테이블 초기화 (이전 데이터 삭제)
            DELETE FROM TEMP_SIMULATION_RESULTS;

            -- 모든 REIT 상품 코드를 BULK COLLECT로 한 번에 로드
            SELECT DISTINCT PRODUCT_CODE
            BULK COLLECT INTO v_product_codes
            FROM REIT_DAILY_PRICES
            ORDER BY PRODUCT_CODE;

            -- 각 REIT 상품에 대해 시뮬레이션 실행
            FOR i IN 1..v_product_codes.COUNT LOOP
                DECLARE
                    v_product_code VARCHAR2(20);
                    v_product_name VARCHAR2(200);
                    v_product_type VARCHAR2(50);
                    v_prices price_table;
                    v_dividends dividend_table;
                    v_skip_reit BOOLEAN := FALSE;

                    -- 계산 변수
                    v_initial_price NUMBER;
                    v_initial_shares NUMBER;
                    v_initial_amount NUMBER;
                    v_total_shares NUMBER;
                    v_total_investment NUMBER;
                    v_total_cash_dividends NUMBER;

                    -- 정기 매수 변수
                    v_recurring_total_amount NUMBER;
                    v_recurring_total_shares NUMBER;
                    v_recurring_count NUMBER;
                    v_next_purchase_date DATE;
                    v_purchase_price NUMBER;
                    v_purchase_shares NUMBER;
                    v_purchase_amount NUMBER;

                    -- 배당 변수
                    v_dividend_total_amount NUMBER;
                    v_dividend_total_shares NUMBER;
                    v_dividend_count NUMBER;
                    v_dividend_amount NUMBER;
                    v_dividend_shares NUMBER;
                    v_dividend_price NUMBER;

                    -- 최종 평가 변수
                    v_final_price NUMBER;
                    v_final_value NUMBER;
                    v_profit NUMBER;
                    v_return_rate NUMBER;
                    v_annualized_return NUMBER;
                    v_days NUMBER;
                    v_years NUMBER;
                    v_avg_purchase_price NUMBER;
                    v_total_purchase_amount NUMBER;
                    v_dividend_avg_yield NUMBER;
                    v_investment_years NUMBER;

                BEGIN
                    v_product_code := v_product_codes(i);

                    -- 상품 정보 조회
                    BEGIN
                        SELECT PRODUCT_NAME, PRODUCT_TYPE
                        INTO v_product_name, v_product_type
                        FROM REITS_PRODUCTS
                        WHERE PRODUCT_ID = v_product_code;
                    EXCEPTION
                        WHEN NO_DATA_FOUND THEN
                            v_skip_reit := TRUE;
                    END;

                    IF NOT v_skip_reit THEN
                        -- 가격 데이터를 BULK COLLECT로 한 번에 로드
                        SELECT TRADE_DATE, CLOSING_PRICE
                        BULK COLLECT INTO v_prices
                        FROM REIT_DAILY_PRICES
                        WHERE PRODUCT_CODE = v_product_code
                          AND TRADE_DATE BETWEEN v_start_date AND v_end_date
                        ORDER BY TRADE_DATE ASC;

                        -- 배당 데이터를 BULK COLLECT로 한 번에 로드
                        SELECT EX_DIVIDEND_DATE, DIVIDEND_PER_SHARE, PAYMENT_DATE
                        BULK COLLECT INTO v_dividends
                        FROM REIT_DIVIDENDS
                        WHERE PRODUCT_CODE = v_product_code
                          AND EX_DIVIDEND_DATE BETWEEN v_start_date AND v_end_date
                        ORDER BY EX_DIVIDEND_DATE;

                        -- 가격 데이터가 없으면 스킵
                        IF v_prices.COUNT = 0 THEN
                            v_skip_reit := TRUE;
                        END IF;

                        -- 첫 거래일 확인
                        IF NOT v_skip_reit THEN
                            v_initial_price := v_prices(1).closing_price;

                            -- 첫 거래일이 시작일보다 30일 이상 늦으면 제외
                            IF v_prices(1).trade_date - v_start_date > 30 THEN
                                v_skip_reit := TRUE;
                            END IF;

                            IF v_initial_price = 0 THEN
                                v_skip_reit := TRUE;
                            END IF;
                        END IF;
                    END IF;

                    -- 스킵 여부 최종 확인
                    IF NOT v_skip_reit THEN
                        -- 초기 매수
                        v_initial_shares := FLOOR(p_initial_investment / v_initial_price);
                        v_initial_amount := v_initial_shares * v_initial_price;
                        v_total_shares := v_initial_shares;
                        v_total_investment := v_initial_amount;
                        v_total_cash_dividends := 0;

                        -- 정기 매수 처리
                        v_recurring_total_amount := 0;
                        v_recurring_total_shares := 0;
                        v_recurring_count := 0;

                        IF p_recurring_frequency != 'NONE' AND p_recurring_amount > 0 THEN
                            v_next_purchase_date := GET_NEXT_PURCHASE_DATE(v_start_date, p_recurring_frequency);

                            WHILE v_next_purchase_date <= v_end_date LOOP
                                v_purchase_price := GET_PRICE_FROM_MEMORY(v_prices, v_next_purchase_date);
                                v_price_query_count := v_price_query_count + 1;

                                IF v_purchase_price > 0 THEN
                                    v_purchase_shares := FLOOR(p_recurring_amount / v_purchase_price);
                                    IF v_purchase_shares > 0 THEN
                                        v_purchase_amount := v_purchase_shares * v_purchase_price;
                                        v_total_shares := v_total_shares + v_purchase_shares;
                                        v_total_investment := v_total_investment + v_purchase_amount;
                                        v_recurring_total_amount := v_recurring_total_amount + v_purchase_amount;
                                        v_recurring_total_shares := v_recurring_total_shares + v_purchase_shares;
                                        v_recurring_count := v_recurring_count + 1;
                                    END IF;
                                END IF;

                                v_next_purchase_date := GET_NEXT_PURCHASE_DATE(v_next_purchase_date, p_recurring_frequency);
                            END LOOP;
                        END IF;

                        -- 배당 처리 (BULK COLLECT로 로드된 데이터 사용)
                        v_dividend_total_amount := 0;
                        v_dividend_total_shares := 0;
                        v_dividend_count := 0;

                        FOR j IN 1..v_dividends.COUNT LOOP
                            v_dividend_amount := v_total_shares * v_dividends(j).dividend_per_share;
                            v_dividend_total_amount := v_dividend_total_amount + v_dividend_amount;
                            v_dividend_count := v_dividend_count + 1;

                            -- 배당 재투자
                            IF p_dividend_reinvest = 'ALL' AND v_dividend_amount > 0 THEN
                                IF NVL(v_dividends(j).payment_date, v_dividends(j).ex_dividend_date) <= v_end_date THEN
                                    v_dividend_price := GET_PRICE_FROM_MEMORY(v_prices, NVL(v_dividends(j).payment_date, v_dividends(j).ex_dividend_date));
                                    v_price_query_count := v_price_query_count + 1;

                                    IF v_dividend_price > 0 THEN
                                        v_dividend_shares := FLOOR(v_dividend_amount / v_dividend_price);
                                        IF v_dividend_shares > 0 THEN
                                            v_total_shares := v_total_shares + v_dividend_shares;
                                            v_dividend_total_shares := v_dividend_total_shares + v_dividend_shares;
                                        END IF;
                                    ELSE
                                        v_total_cash_dividends := v_total_cash_dividends + v_dividend_amount;
                                    END IF;
                                ELSE
                                    v_total_cash_dividends := v_total_cash_dividends + v_dividend_amount;
                                END IF;
                            ELSE
                                v_total_cash_dividends := v_total_cash_dividends + v_dividend_amount;
                            END IF;
                        END LOOP;

                        -- 최종 평가
                        IF v_prices.COUNT > 0 THEN
                            v_final_price := v_prices(v_prices.COUNT).closing_price;
                            v_price_query_count := v_price_query_count + 1;
                        ELSE
                            v_final_price := v_initial_price;
                        END IF;

                        v_final_value := (v_total_shares * v_final_price) + v_total_cash_dividends;
                        v_profit := v_final_value - v_total_investment;
                        v_return_rate := (v_profit / v_total_investment) * 100;

                        -- 연환산 수익률 계산
                        v_days := v_end_date - v_start_date;
                        v_years := v_days / 365.0;
                        IF v_years > 0 THEN
                            v_annualized_return := (POWER(v_final_value / v_total_investment, 1.0 / v_years) - 1) * 100;
                        ELSE
                            v_annualized_return := 0;
                        END IF;

                        -- 평균 매수 단가 계산
                        v_total_purchase_amount := v_total_investment + v_dividend_total_amount;
                        IF v_total_shares > 0 THEN
                            v_avg_purchase_price := v_total_purchase_amount / v_total_shares;
                        ELSE
                            v_avg_purchase_price := 0;
                        END IF;

                        -- 배당 수익률 계산
                        IF v_total_investment > 0 THEN
                            v_investment_years := v_days / 365.0;
                            IF v_investment_years > 0 THEN
                                v_dividend_avg_yield := ((v_dividend_total_amount / v_total_investment) * 100) / v_investment_years;
                            ELSE
                                v_dividend_avg_yield := 0;
                            END IF;
                        ELSE
                            v_dividend_avg_yield := 0;
                        END IF;

                        -- 결과 저장
                        INSERT INTO TEMP_SIMULATION_RESULTS VALUES (
                            v_product_code,
                            v_product_name,
                            v_product_type,
                            v_total_investment,
                            v_final_value,
                            v_profit,
                            v_return_rate,
                            v_annualized_return,
                            v_initial_amount,
                            v_initial_shares,
                            v_initial_price,
                            1,
                            v_recurring_total_amount,
                            v_recurring_total_shares,
                            CASE WHEN v_recurring_total_shares > 0 THEN v_recurring_total_amount / v_recurring_total_shares ELSE 0 END,
                            v_recurring_count,
                            CASE WHEN p_dividend_reinvest = 'ALL' THEN v_dividend_total_amount ELSE 0 END,
                            CASE WHEN p_dividend_reinvest = 'ALL' THEN v_dividend_total_shares ELSE 0 END,
                            CASE WHEN v_dividend_total_shares > 0 THEN v_dividend_total_amount / v_dividend_total_shares ELSE 0 END,
                            v_dividend_count,
                            v_dividend_total_amount,
                            v_dividend_count,
                            v_dividend_avg_yield,
                            v_total_shares,
                            v_final_price,
                            v_avg_purchase_price
                        );
                    END IF;

                EXCEPTION
                    WHEN OTHERS THEN
                        NULL; -- 에러 발생 시 해당 REIT 스킵
                END;
            END LOOP; -- product 루프 종료
        END LOOP; -- iteration 20회 반복 루프 종료

        -- 결과를 수익률 순으로 정렬하여 Ref Cursor로 반환
        OPEN p_result_cursor FOR
            SELECT
                ROW_NUMBER() OVER (ORDER BY RETURN_RATE DESC) AS RANK,
                PRODUCT_CODE,
                PRODUCT_NAME,
                PRODUCT_TYPE,
                TOTAL_INVESTMENT,
                FINAL_VALUE,
                PROFIT,
                RETURN_RATE,
                ANNUALIZED_RETURN,
                INITIAL_AMOUNT,
                INITIAL_SHARES,
                INITIAL_AVG_PRICE,
                INITIAL_COUNT,
                RECURRING_AMOUNT,
                RECURRING_SHARES,
                RECURRING_AVG_PRICE,
                RECURRING_COUNT,
                DIVIDEND_REINVEST_AMOUNT,
                DIVIDEND_REINVEST_SHARES,
                DIVIDEND_REINVEST_AVG_PRICE,
                DIVIDEND_REINVEST_COUNT,
                DIVIDEND_TOTAL_AMOUNT,
                DIVIDEND_COUNT,
                DIVIDEND_AVG_YIELD,
                TOTAL_SHARES,
                CURRENT_PRICE,
                AVERAGE_PURCHASE_PRICE
            FROM TEMP_SIMULATION_RESULTS
            ORDER BY RETURN_RATE DESC;

        -- OUT 파라미터 설정
        p_price_query_count := v_price_query_count;

    EXCEPTION
        WHEN OTHERS THEN
            -- 에러 발생 시 임시 데이터 정리
            DELETE FROM TEMP_SIMULATION_RESULTS;
            RAISE;
    END RUN_SIMULATION;

END PKG_REIT_SIMULATION;
/
