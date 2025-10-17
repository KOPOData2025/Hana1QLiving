package com.living.hana.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 한국투자증권 API - 주식 현재가 호가 조회 응답 DTO
 */
public class KisStockPriceDto {
    
    // 현재가 정보
    @JsonProperty("stck_prpr")
    private String stck_prpr; // 주식 현재가
    
    @JsonProperty("prdy_ctrt")
    private String prdy_ctrt; // 전일대비율
    
    @JsonProperty("acml_vol")
    private String acml_vol;  // 누적거래량
    
    @JsonProperty("prdy_vrss_sign")
    private String prdy_vrss_sign; // 전일대비부호
    
    @JsonProperty("prdy_vrss")
    private String prdy_vrss; // 전일대비
    
    // 매도호가 (1~10단계)
    @JsonProperty("askp1")
    private String askp1;
    @JsonProperty("askp2")
    private String askp2;
    @JsonProperty("askp3")
    private String askp3;
    @JsonProperty("askp4")
    private String askp4;
    @JsonProperty("askp5")
    private String askp5;
    @JsonProperty("askp6")
    private String askp6;
    @JsonProperty("askp7")
    private String askp7;
    @JsonProperty("askp8")
    private String askp8;
    @JsonProperty("askp9")
    private String askp9;
    @JsonProperty("askp10")
    private String askp10;
    
    // 매수호가 (1~10단계)  
    @JsonProperty("bidp1")
    private String bidp1;
    @JsonProperty("bidp2")
    private String bidp2;
    @JsonProperty("bidp3")
    private String bidp3;
    @JsonProperty("bidp4")
    private String bidp4;
    @JsonProperty("bidp5")
    private String bidp5;
    @JsonProperty("bidp6")
    private String bidp6;
    @JsonProperty("bidp7")
    private String bidp7;
    @JsonProperty("bidp8")
    private String bidp8;
    @JsonProperty("bidp9")
    private String bidp9;
    @JsonProperty("bidp10")
    private String bidp10;
    
    // 매도호가 수량
    @JsonProperty("askp_rsqn1")
    private String askp_rsqn1;
    @JsonProperty("askp_rsqn2")
    private String askp_rsqn2;
    @JsonProperty("askp_rsqn3")
    private String askp_rsqn3;
    @JsonProperty("askp_rsqn4")
    private String askp_rsqn4;
    @JsonProperty("askp_rsqn5")
    private String askp_rsqn5;
    @JsonProperty("askp_rsqn6")
    private String askp_rsqn6;
    @JsonProperty("askp_rsqn7")
    private String askp_rsqn7;
    @JsonProperty("askp_rsqn8")
    private String askp_rsqn8;
    @JsonProperty("askp_rsqn9")
    private String askp_rsqn9;
    @JsonProperty("askp_rsqn10")
    private String askp_rsqn10;
    
    // 매수호가 수량
    @JsonProperty("bidp_rsqn1")
    private String bidp_rsqn1;
    @JsonProperty("bidp_rsqn2")
    private String bidp_rsqn2;
    @JsonProperty("bidp_rsqn3")
    private String bidp_rsqn3;
    @JsonProperty("bidp_rsqn4")
    private String bidp_rsqn4;
    @JsonProperty("bidp_rsqn5")
    private String bidp_rsqn5;
    @JsonProperty("bidp_rsqn6")
    private String bidp_rsqn6;
    @JsonProperty("bidp_rsqn7")
    private String bidp_rsqn7;
    @JsonProperty("bidp_rsqn8")
    private String bidp_rsqn8;
    @JsonProperty("bidp_rsqn9")
    private String bidp_rsqn9;
    @JsonProperty("bidp_rsqn10")
    private String bidp_rsqn10;

    // 생성자
    public KisStockPriceDto() {}

    // Getter & Setter
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

    // 매도호가 Getter & Setter
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

    // 매수호가 Getter & Setter
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

    // 매도호가 수량 Getter & Setter
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

    // 매수호가 수량 Getter & Setter
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
    
    // 6-10단계 매도호가 getter/setter
    public String getAskp6() { return askp6; }
    public void setAskp6(String askp6) { this.askp6 = askp6; }
    public String getAskp7() { return askp7; }
    public void setAskp7(String askp7) { this.askp7 = askp7; }
    public String getAskp8() { return askp8; }
    public void setAskp8(String askp8) { this.askp8 = askp8; }
    public String getAskp9() { return askp9; }
    public void setAskp9(String askp9) { this.askp9 = askp9; }
    public String getAskp10() { return askp10; }
    public void setAskp10(String askp10) { this.askp10 = askp10; }
    
    // 6-10단계 매수호가 getter/setter
    public String getBidp6() { return bidp6; }
    public void setBidp6(String bidp6) { this.bidp6 = bidp6; }
    public String getBidp7() { return bidp7; }
    public void setBidp7(String bidp7) { this.bidp7 = bidp7; }
    public String getBidp8() { return bidp8; }
    public void setBidp8(String bidp8) { this.bidp8 = bidp8; }
    public String getBidp9() { return bidp9; }
    public void setBidp9(String bidp9) { this.bidp9 = bidp9; }
    public String getBidp10() { return bidp10; }
    public void setBidp10(String bidp10) { this.bidp10 = bidp10; }
    
    // 6-10단계 매도 수량 getter/setter
    public String getAskp_rsqn6() { return askp_rsqn6; }
    public void setAskp_rsqn6(String askp_rsqn6) { this.askp_rsqn6 = askp_rsqn6; }
    public String getAskp_rsqn7() { return askp_rsqn7; }
    public void setAskp_rsqn7(String askp_rsqn7) { this.askp_rsqn7 = askp_rsqn7; }
    public String getAskp_rsqn8() { return askp_rsqn8; }
    public void setAskp_rsqn8(String askp_rsqn8) { this.askp_rsqn8 = askp_rsqn8; }
    public String getAskp_rsqn9() { return askp_rsqn9; }
    public void setAskp_rsqn9(String askp_rsqn9) { this.askp_rsqn9 = askp_rsqn9; }
    public String getAskp_rsqn10() { return askp_rsqn10; }
    public void setAskp_rsqn10(String askp_rsqn10) { this.askp_rsqn10 = askp_rsqn10; }
    
    // 6-10단계 매수 수량 getter/setter
    public String getBidp_rsqn6() { return bidp_rsqn6; }
    public void setBidp_rsqn6(String bidp_rsqn6) { this.bidp_rsqn6 = bidp_rsqn6; }
    public String getBidp_rsqn7() { return bidp_rsqn7; }
    public void setBidp_rsqn7(String bidp_rsqn7) { this.bidp_rsqn7 = bidp_rsqn7; }
    public String getBidp_rsqn8() { return bidp_rsqn8; }
    public void setBidp_rsqn8(String bidp_rsqn8) { this.bidp_rsqn8 = bidp_rsqn8; }
    public String getBidp_rsqn9() { return bidp_rsqn9; }
    public void setBidp_rsqn9(String bidp_rsqn9) { this.bidp_rsqn9 = bidp_rsqn9; }
    public String getBidp_rsqn10() { return bidp_rsqn10; }
    public void setBidp_rsqn10(String bidp_rsqn10) { this.bidp_rsqn10 = bidp_rsqn10; }
}