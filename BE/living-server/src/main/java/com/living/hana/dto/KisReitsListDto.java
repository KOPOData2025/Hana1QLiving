package com.living.hana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 한국투자증권 API - 리츠 종목 정보 DTO
 */
public class KisReitsListDto {
    
    @JsonProperty("stck_shrn_iscd")
    private String stck_shrn_iscd; // 종목코드
    
    @JsonProperty("hts_kor_isnm")
    private String hts_kor_isnm;   // 종목명
    
    @JsonProperty("stck_prpr")
    private String stck_prpr;      // 현재가
    
    @JsonProperty("prdy_ctrt")
    private String prdy_ctrt;      // 전일대비율
    
    @JsonProperty("acml_vol")
    private String acml_vol;       // 누적거래량
    
    @JsonProperty("prdy_vrss_sign")
    private String prdy_vrss_sign; // 전일대비부호
    
    @JsonProperty("prdy_vrss")
    private String prdy_vrss;      // 전일대비
    
    @JsonProperty("mktc_code")
    private String mktc_code;      // 시장구분코드
    
    @JsonProperty("nav")
    private String nav;            // NAV (순자산가치)
    
    @JsonProperty("dividend_yield")
    private String dividend_yield; // 배당수익률
    
    @JsonProperty("total_assets")
    private String total_assets;   // 총자산
    
    // 호가 정보 추가
    @JsonProperty("askp1")
    private String askp1;          // 매도호가1
    @JsonProperty("askp2") 
    private String askp2;          // 매도호가2
    @JsonProperty("askp3")
    private String askp3;          // 매도호가3
    @JsonProperty("askp4")
    private String askp4;          // 매도호가4  
    @JsonProperty("askp5")
    private String askp5;          // 매도호가5
    
    @JsonProperty("bidp1")
    private String bidp1;          // 매수호가1
    @JsonProperty("bidp2")
    private String bidp2;          // 매수호가2
    @JsonProperty("bidp3")
    private String bidp3;          // 매수호가3
    @JsonProperty("bidp4")
    private String bidp4;          // 매수호가4
    @JsonProperty("bidp5")
    private String bidp5;          // 매수호가5
    
    @JsonProperty("askp_rsqn1")
    private String askp_rsqn1;     // 매도호가수량1
    @JsonProperty("askp_rsqn2")
    private String askp_rsqn2;     // 매도호가수량2
    @JsonProperty("askp_rsqn3")
    private String askp_rsqn3;     // 매도호가수량3
    @JsonProperty("askp_rsqn4")
    private String askp_rsqn4;     // 매도호가수량4
    @JsonProperty("askp_rsqn5")
    private String askp_rsqn5;     // 매도호가수량5
    
    @JsonProperty("bidp_rsqn1")
    private String bidp_rsqn1;     // 매수호가수량1
    @JsonProperty("bidp_rsqn2")
    private String bidp_rsqn2;     // 매수호가수량2
    @JsonProperty("bidp_rsqn3")
    private String bidp_rsqn3;     // 매수호가수량3
    @JsonProperty("bidp_rsqn4")
    private String bidp_rsqn4;     // 매수호가수량4
    @JsonProperty("bidp_rsqn5")
    private String bidp_rsqn5;     // 매수호가수량5

    // 기본 생성자
    public KisReitsListDto() {}

    // 전체 생성자
    public KisReitsListDto(String stck_shrn_iscd, String hts_kor_isnm, String stck_prpr, 
                          String prdy_ctrt, String acml_vol, String prdy_vrss_sign, 
                          String prdy_vrss, String mktc_code, String nav, 
                          String dividend_yield, String total_assets) {
        this.stck_shrn_iscd = stck_shrn_iscd;
        this.hts_kor_isnm = hts_kor_isnm;
        this.stck_prpr = stck_prpr;
        this.prdy_ctrt = prdy_ctrt;
        this.acml_vol = acml_vol;
        this.prdy_vrss_sign = prdy_vrss_sign;
        this.prdy_vrss = prdy_vrss;
        this.mktc_code = mktc_code;
        this.nav = nav;
        this.dividend_yield = dividend_yield;
        this.total_assets = total_assets;
    }

    // Getter & Setter
    public String getStck_shrn_iscd() {
        return stck_shrn_iscd;
    }

    public void setStck_shrn_iscd(String stck_shrn_iscd) {
        this.stck_shrn_iscd = stck_shrn_iscd;
    }

    public String getHts_kor_isnm() {
        return hts_kor_isnm;
    }

    public void setHts_kor_isnm(String hts_kor_isnm) {
        this.hts_kor_isnm = hts_kor_isnm;
    }

    public String getStck_prpr() {
        return stck_prpr;
    }

    public void setStck_prpr(String stck_prpr) {
        this.stck_prpr = stck_prpr;
    }

    public String getPrdy_ctrt() {
        return prdy_ctrt;
    }

    public void setPrdy_ctrt(String prdy_ctrt) {
        this.prdy_ctrt = prdy_ctrt;
    }

    public String getAcml_vol() {
        return acml_vol;
    }

    public void setAcml_vol(String acml_vol) {
        this.acml_vol = acml_vol;
    }

    public String getPrdy_vrss_sign() {
        return prdy_vrss_sign;
    }

    public void setPrdy_vrss_sign(String prdy_vrss_sign) {
        this.prdy_vrss_sign = prdy_vrss_sign;
    }

    public String getPrdy_vrss() {
        return prdy_vrss;
    }

    public void setPrdy_vrss(String prdy_vrss) {
        this.prdy_vrss = prdy_vrss;
    }

    public String getMktc_code() {
        return mktc_code;
    }

    public void setMktc_code(String mktc_code) {
        this.mktc_code = mktc_code;
    }

    public String getNav() {
        return nav;
    }

    public void setNav(String nav) {
        this.nav = nav;
    }

    public String getDividend_yield() {
        return dividend_yield;
    }

    public void setDividend_yield(String dividend_yield) {
        this.dividend_yield = dividend_yield;
    }

    public String getTotal_assets() {
        return total_assets;
    }

    public void setTotal_assets(String total_assets) {
        this.total_assets = total_assets;
    }
    
    // 호가 정보 getter/setter 추가
    public String getAskp1() { return askp1; }
    public void setAskp1(String askp1) { this.askp1 = askp1; }
    public String getAskp2() { return askp2; }
    public void setAskp2(String askp2) { this.askp2 = askp2; }
    public String getAskp3() { return askp3; }
    public void setAskp3(String askp3) { this.askp3 = askp3; }
    public String getAskp4() { return askp4; }
    public void setAskp4(String askp4) { this.askp4 = askp4; }
    public String getAskp5() { return askp5; }
    public void setAskp5(String askp5) { this.askp5 = askp5; }
    
    public String getBidp1() { return bidp1; }
    public void setBidp1(String bidp1) { this.bidp1 = bidp1; }
    public String getBidp2() { return bidp2; }
    public void setBidp2(String bidp2) { this.bidp2 = bidp2; }
    public String getBidp3() { return bidp3; }
    public void setBidp3(String bidp3) { this.bidp3 = bidp3; }
    public String getBidp4() { return bidp4; }
    public void setBidp4(String bidp4) { this.bidp4 = bidp4; }
    public String getBidp5() { return bidp5; }
    public void setBidp5(String bidp5) { this.bidp5 = bidp5; }
    
    public String getAskp_rsqn1() { return askp_rsqn1; }
    public void setAskp_rsqn1(String askp_rsqn1) { this.askp_rsqn1 = askp_rsqn1; }
    public String getAskp_rsqn2() { return askp_rsqn2; }
    public void setAskp_rsqn2(String askp_rsqn2) { this.askp_rsqn2 = askp_rsqn2; }
    public String getAskp_rsqn3() { return askp_rsqn3; }
    public void setAskp_rsqn3(String askp_rsqn3) { this.askp_rsqn3 = askp_rsqn3; }
    public String getAskp_rsqn4() { return askp_rsqn4; }
    public void setAskp_rsqn4(String askp_rsqn4) { this.askp_rsqn4 = askp_rsqn4; }
    public String getAskp_rsqn5() { return askp_rsqn5; }
    public void setAskp_rsqn5(String askp_rsqn5) { this.askp_rsqn5 = askp_rsqn5; }
    
    public String getBidp_rsqn1() { return bidp_rsqn1; }
    public void setBidp_rsqn1(String bidp_rsqn1) { this.bidp_rsqn1 = bidp_rsqn1; }
    public String getBidp_rsqn2() { return bidp_rsqn2; }
    public void setBidp_rsqn2(String bidp_rsqn2) { this.bidp_rsqn2 = bidp_rsqn2; }
    public String getBidp_rsqn3() { return bidp_rsqn3; }
    public void setBidp_rsqn3(String bidp_rsqn3) { this.bidp_rsqn3 = bidp_rsqn3; }
    public String getBidp_rsqn4() { return bidp_rsqn4; }
    public void setBidp_rsqn4(String bidp_rsqn4) { this.bidp_rsqn4 = bidp_rsqn4; }
    public String getBidp_rsqn5() { return bidp_rsqn5; }
    public void setBidp_rsqn5(String bidp_rsqn5) { this.bidp_rsqn5 = bidp_rsqn5; }
}