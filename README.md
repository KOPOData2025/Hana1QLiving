# [프로젝트명] 하나원큐리빙

<img width="2000" height="546" alt="Image" src="https://github.com/user-attachments/assets/f875941a-0688-4e57-bfeb-70a90c2e467e" />

---

# 프로젝트 개요
## 프로젝트 배경
<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/ed502536-9af3-4ec3-85fa-5e08919eb73a" />
<br><br>
- 전세 사기 증가로 인한 월세 상승에 따라 증가하는 오피스텔 수익률 + 청년층의 부동산 투자에 대한 관심<br><br>
- 하지만 부동산 구매할 자금이 없는 청년층 <br><br>=> 리츠를 통해 누구나 소액으로 부동산에 투자할 수 있게 하자

## 프로젝트 목표

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/44ab3f18-6a59-4f83-a9e5-c601a2607b6c" />
<br><br>
- 한국의 리츠가 배당률이 높음에도 불구하고 인기가 없음<br><br>
- 많은 문제점 中 "불투명한 정보 공개"에 집중하여 프로젝트 기획<br><br>
- 입주자와 투자자가 공존하는 앱을  통해 입주자에게는 편리한 오피스텔 관리 서비스 제공, <br>
  투자자에게는 정확하고 상세한 오피스텔 관리 데이터를 통해 투자 지표로 활용하도록 함


---

# 주요 기능
<br>※ 입주자가 아닌 투자자도 투자 기능을 사용할 수 있습니다.
<br><br>
1. 거주 편의 기능
2. 리츠 투자 기능
3. 오피스텔 운영 관리 기능
<br><br>
---

## 거주 편의 기능 [입주자 측면]
- [ ] **오피스텔 방문 예약** - 방문 예약 후, 투어부터 계약까지 한번에<br><br>
- [ ] **간편 전월세 보증금 대출** - 복잡한 전월세 대출을 간편하게<br><br>
- [ ] **월세 관리비 자동이체** - 계약 정보를 불러와 월세·관리비 자동이체를 간편하게<br><br>

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/79bee7ba-b428-42b0-bcc9-0ba6f57e25fe" />

## 리츠 투자 기능 [투자자 측면]
- [ ] **내가 사는 오피스텔 간접 투자 기능** - 내가 사는 오피스텔이 어떤 리츠의 포트폴리오에 포함되어 있는지 한눈에 확인<br><br>
- [ ] **지역 기반으로 리츠 투자 기능** - 특정 지역의 부동산 시장에 관심이 있다면, 그 지역 오피스텔을 포함한 리츠를 통해 간접 투자<br><br>
- [ ] **운영 데이터 기반 투자 정보 제공** - 오피스텔 운영 데이터를 리츠 투자 지표로 제공 <br><br>
- [ ] **리츠 투자 시뮬레이션** - 과거 데이터를 바탕으로, 투자자의 투자 조건에 맞춘 리츠 수익률 백테스팅 결과 제공<br><br>

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/7321012c-5100-4941-8991-7288d19a17ba" />

## 오피스텔 운영 관리 기능 [관리자 측면]
- [ ] **생성형AI 기반 데이터 조회** - 관리자 통합관리 시스템에 없는 기능이라도, 자연어로 입력하면 필요한 정보를 바로 확인<br><br>
- [ ] **배당금 지급액 산정 기능** - 복잡한 배당금 지급액도 자동 산정<br><br>

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/950f7e0a-09f5-47fe-a382-0f361dad844e" />

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/9357cda4-53b5-4c90-9ac6-98930d688344" />


---
# 서비스 아키텍처

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/99d7883f-1dd1-403c-8dff-bda6588b564d" />



# 시스템 아키텍처

<img width="2000" height="1414" alt="Image" src="https://github.com/user-attachments/assets/72696cfb-7f13-4c94-807d-61a3ef10360e" />

---

# 프로젝트 기간
- **개발 기간**: 2025.08.20 ~ 2025.10.12
- **참여 인원**: 1명

# 프로젝트 구조
```
project/
├── HanaOneQLiving/           # 하나원큐리빙 서비스
│   ├── BE_OneQLiving/        # 백엔드 
│   ├── FE_hanaLiving_APP/    # 모바일 앱 
│   ├── FE_hanaLiving_ERP/    # 관리자 웹 ERP
│   └── AI_Orchestration/      # 관리자 AI 서비스
├── HanaBank/                 # 하나은행 서비스
│   └── BE-hana-bank/         # 백엔드 
├── HanaSecurities/           # 증권 서비스
│   └── BE-hana-bank/         # 백엔드 
└── ksd/                      # 한국예탁결제원 서비스
    └── BE-hana-bank/         # 백엔드
```


# 본인 소개

<table>
<tr>
<td rowspan="9" width="200" align="center">

<img width="1024" height="1536" alt="Image" src="https://github.com/user-attachments/assets/4bf05d1b-f176-45f3-8870-404775a901ab" />

</td>
<td colspan="4">

**기본 정보**

</td>
</tr>
<tr>
<td><b>이름</b></td>
<td>박현서</td>
<td><b>대학교</b></td>
<td>명지대학교</td>
</tr>
<tr>
<td><b>이메일</b></td>
<td>withgustj@naver.com</td>
<td><b>학과</b></td>
<td>컴퓨터공학과</td>
</tr>
<tr>
<td colspan="4">

**Skill Set**

</td>
</tr>
<tr>
<td><b>Backend</b></td>
<td colspan="3">Java, Spring Boot, MyBatis, JPA, FastAPI, Python</td>
</tr>
<tr>
<td><b>Database</b></td>
<td colspan="3">Oracle DB, MySQL, ChromaDB</td>
</tr>
<tr>
<td><b>Frontend</b></td>
<td colspan="3">React, React Native, TypeScript, JavaScript, HTML5, CSS3</td>
</tr>
<tr>
<td><b>생성형AI</b></td>
<td colspan="3">LangChain, OpenAI</td>
</tr>
<tr>
<td><b>DevOps</b></td>
<td colspan="3">Google Cloud, Docker, Grafana, Prometheus, Git, Gradle</td>
</tr>
<tr>
<td colspan="5">

**자격증**

</td>
</tr>
<tr>
<td><b>자격증명</b></td>
<td><b>발급 기관</b></td>
<td><b>취득 날짜</b></td>
<td colspan="2"><b>비고</b></td>
</tr>
<tr>
<td>SQLD</td>
<td>한국데이터산업진흥원</td>
<td>2023.12.15</td>
<td colspan="2">합격</td>
</tr>
<tr>
<td>정보처리기사</td>
<td>한국산업인력공단</td>
<td>2023.09.01</td>
<td colspan="2">합격</td>
</tr>
<tr>
<td colspan="5">

**수상 경력**

</td>
</tr>
<tr>
<td><b>수상명</b></td>
<td><b>주최 기관</b></td>
<td><b>수상 날짜</b></td>
<td><b>상세 내용</b></td>
<td><b>비고</b></td>
</tr>
<tr>
<td>프로젝트작품 경진대회 금상</td>
<td>한국폴리텍대학</td>
<td>2025.10.15</td>
<td>하나원큐리빙 개발</td>
<td>개인프로젝트</td>
</tr>
<tr>
<td>벤처창업아이템 경진대회 본선진출(동상 확보)</td>
<td>한국폴리텍대학</td>
<td>2025.10.01</td>
<td>창업 크라우드 펀딩 서비스 기획</td>
<td>팀프로젝트</td>
</tr>
<tr>
<td>캡스톤 디자인 금상</td>
<td>명지대학교 컴퓨터공학과</td>
<td>2023.06.12</td>
<td>공유 주차장 서비스 개발</td>
<td>팀프로젝트</td>
</tr>
<tr>
<td colspan="5">

**교육 이력**

</td>
</tr>
<tr>
<td><b>교육명</b></td>
<td><b>교육 기관</b></td>
<td><b>기간</b></td>
<td><b>주요 내용</b></td>
<td><b>비고</b></td>
</tr>
<tr>
<td>엔코아 부트캠프</td>
<td>엔코아</td>
<td>2024.02~2024.08</td>
<td>프론트, 백엔드, DB, 인프라</td>
<td>수료</td>
</tr>
<tr>
<td colspan="5">
