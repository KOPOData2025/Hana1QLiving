import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Container,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Snackbar,
  AlertTitle,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import {
  Clear,
  ContentCopy,
  ExpandMore,
  SmartToy,
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
} from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  callAIQuery,
  AI_QUERY_MODES,
  AI_SOURCE_TYPE_COLORS,
  AI_SOURCE_TYPE_LABELS,
  SQL_QUERY_TYPE_COLORS,
} from "../config/api";
import type { AIQueryRequest, AIQueryResponse } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

export default function InternalSearch() {
  // 기존 인증 시스템 사용
  const { token, user } = useAuth();

  // AI 쿼리 관련 상태 변수들
  const [aiQuery, setAiQuery] = useState("");
  const [aiMode] = useState<"AUTO" | "BASIC" | "DATA">("DATA"); // 데이터 모드 고정
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<AIQueryResponse | null>(null);
  const [aiError, setAiError] = useState<string>("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("info");

  // AI 쿼리 실행 함수
  const handleAIQuery = async () => {
    if (!aiQuery.trim()) {
      setSnackbarMessage("질문을 입력해주세요.");
      setSnackbarSeverity("error");
      setShowSnackbar(true);
      return;
    }

    if (!token) {
      setSnackbarMessage("로그인이 필요합니다.");
      setSnackbarSeverity("error");
      setShowSnackbar(true);
      return;
    }

    setIsAiLoading(true);
    setAiError("");
    setAiResponse(null);

    try {
      const request: AIQueryRequest = {
        userInput: aiQuery.trim(),
        mode: aiMode,
        contextHints: undefined,
        uiCapabilities: { supportsCitations: true },
        debug: false,
      };

      const response = await callAIQuery(request, token);

      setAiResponse(response);
      setSnackbarMessage("AI 쿼리가 성공적으로 완료되었습니다.");
      setSnackbarSeverity("success");
      setShowSnackbar(true);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "알 수 없는 오류가 발생했습니다.";
      setAiError(errorMessage);
      setSnackbarMessage(`AI 쿼리 실패: ${errorMessage}`);
      setSnackbarSeverity("error");
      setShowSnackbar(true);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumb Navigation */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <HomeIcon sx={{ fontSize: 16 }} />
        <Typography
          variant="body2"
          sx={{ color: "#6b7280", fontSize: "0.875rem" }}
        >
          홈
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
        <Typography
          variant="body2"
          sx={{ color: "#6b7280", fontSize: "0.875rem" }}
        >
          검색 및 조회
        </Typography>
        <ChevronRightIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
        <Typography
          variant="body2"
          sx={{ color: "#1f2937", fontSize: "0.875rem", fontWeight: 500 }}
        >
          내부정보 검색
        </Typography>
      </Box>

      {/* 페이지 헤더 */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 2, color: "#1e293b" }}
        >
          내부정보 검색
        </Typography>
        <Typography
          variant="body1"
          sx={{ color: "#64748b", maxWidth: 600, mx: "auto", mb: 2 }}
        >
          ChatGPT와 같은 프롬프트 기반으로 회사 내부정보를 빠르게 검색하고
          분석할 수 있습니다.
        </Typography>

        {/* Markdown 라이브러리 로딩 상태 */}
        {/* Removed Markdown library loading indicator as it's now handled by react-markdown */}

        {/* 로그인 안내 */}
        {!token && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="info" sx={{ maxWidth: 500, mx: "auto" }}>
              AI 쿼리 기능을 사용하려면 먼저 로그인이 필요합니다.
            </Alert>
          </Box>
        )}
      </Box>

      {/* AI 쿼리 섹션 */}
      <Paper
        elevation={3}
        sx={{ p: 4, mb: 4, borderRadius: 3, backgroundColor: "#f8fafc" }}
      >
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600, color: "#1e293b" }}>
            AI 쿼리 시스템
          </Typography>
        </Box>

        <Typography variant="body1" sx={{ color: "#64748b", mb: 3 }}>
          자연어로 질문하면 AI가 회사 내부 데이터를 분석하여 답변을 제공합니다.
        </Typography>

        {/* AI 쿼리 입력 영역 */}
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            placeholder="예시: '2024년 건물별 임대료 수익 현황을 분석해줘' 또는 '계약 만료 예정인 사용자 중 갱신 가능성이 높은 고객을 찾아줘'"
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontSize: "1.1rem",
                backgroundColor: "white",
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#008485",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#008485",
                  borderWidth: 2,
                },
              },
            }}
          />
        </Box>

        {/* AI 쿼리 실행 버튼 */}
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleAIQuery}
            disabled={!aiQuery.trim() || !token || isAiLoading}
            startIcon={
              isAiLoading ? <CircularProgress size={20} /> : <SmartToy />
            }
            sx={{
              backgroundColor: "#008485",
              "&:hover": { backgroundColor: "#007575" },
              px: 4,
              py: 1.5,
              borderRadius: 2,
              fontSize: "1rem",
              fontWeight: 600,
            }}
          >
            {isAiLoading ? "AI 분석 중..." : "AI 쿼리 실행"}
          </Button>

          <Button
            variant="outlined"
            size="large"
            onClick={() => {
              setAiQuery("");
              setAiResponse(null);
              setAiError("");
            }}
            disabled={!aiQuery.trim()}
            startIcon={<Clear />}
            sx={{
              borderColor: "#e2e8f0",
              color: "#64748b",
              px: 3,
              py: 1.5,
              borderRadius: 2,
              "&:hover": {
                borderColor: "#ED1651",
                color: "#ED1651",
              },
            }}
          >
            지우기
          </Button>
        </Box>

        {/* 토큰이 없을 때 안내 메시지 */}
        {!token && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <AlertTitle>로그인이 필요합니다</AlertTitle>
            AI 쿼리를 사용하려면 먼저 로그인이 필요합니다. 상단 메뉴에서 로그인
            후 이용해주세요.
          </Alert>
        )}

        {/* AI 에러 메시지 */}
        {aiError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            <AlertTitle>AI 쿼리 오류</AlertTitle>
            {aiError}
          </Alert>
        )}

        {/* AI 응답 결과 */}
        {aiResponse && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                sx={{ color: "#1e293b", fontWeight: 600 }}
              >
                AI 응답 결과
              </Typography>
            </Box>

            {/* AI 답변 카드 */}
            <Card
              sx={{
                mb: 3,
                backgroundColor: "#fefefe",
                border: "1px solid #e2e8f0",
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* AI 답변 전체를 ReactMarkdown으로 렌더링 */}
                <Box sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, color: "#1e293b" }}
                    >
                      AI 답변
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopy />}
                        onClick={() => {
                          navigator.clipboard.writeText(aiQuery);
                          setSnackbarMessage("요청이 복사되었습니다.");
                          setSnackbarSeverity("success");
                          setShowSnackbar(true);
                        }}
                        sx={{ fontSize: "0.75rem", py: 0.5 }}
                      >
                        요청 복사
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<ContentCopy />}
                        onClick={() => {
                          const responseText =
                            aiResponse.text ||
                            (aiResponse as any).answer ||
                            (aiResponse as any).content ||
                            (aiResponse as any).message ||
                            "";
                          navigator.clipboard.writeText(responseText);
                          setSnackbarMessage("응답이 복사되었습니다.");
                          setSnackbarSeverity("success");
                          setShowSnackbar(true);
                        }}
                        sx={{ fontSize: "0.75rem", py: 0.5 }}
                      >
                        응답 복사
                      </Button>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      lineHeight: 1.8,
                      color: "#1e293b",
                      p: 3,
                      backgroundColor: "#f8fafc",
                      borderRadius: 2,
                      border: "1px solid #e2e8f0",
                      "& h1, & h2, & h3, & h4, & h5, & h6": {
                        color: "#1e293b",
                        fontWeight: 600,
                        mb: 2,
                        mt: 3,
                      },
                      "& p": {
                        mb: 0.5,
                        mt: 0,
                      },
                      "& ul, & ol": {
                        mb: 2,
                        pl: 3,
                      },
                      "& li": {
                        mb: 1,
                      },
                      "& strong": {
                        fontWeight: 600,
                        color: "#008485",
                        display: "block",
                        mt: 3,
                        mb: 0.5,
                      },
                      "& table": {
                        width: "100%",
                        borderCollapse: "separate",
                        borderSpacing: 0,
                        mb: 3,
                        backgroundColor: "#1e293b",
                        borderRadius: "8px",
                        overflow: "hidden",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                      },
                      "& thead": {
                        backgroundColor: "#0f172a",
                      },
                      "& th": {
                        fontWeight: 700,
                        color: "#ffffff",
                        borderBottom: "2px solid #334155",
                        padding: "14px 16px",
                        textAlign: "left",
                        fontSize: "0.875rem",
                        letterSpacing: "0.5px",
                        "&:first-of-type": {
                          paddingLeft: "20px",
                        },
                        "&:last-of-type": {
                          paddingRight: "20px",
                        },
                      },
                      "& td": {
                        fontSize: "0.875rem",
                        color: "#ffffff",
                        borderBottom: "1px solid #334155",
                        padding: "12px 16px",
                        fontFamily:
                          'Consolas, Monaco, "Courier New", monospace',
                        "&:first-of-type": {
                          paddingLeft: "20px",
                          fontWeight: 500,
                        },
                        "&:last-of-type": {
                          paddingRight: "20px",
                        },
                      },
                      "& tbody tr": {
                        backgroundColor: "#1e293b",
                        transition: "all 0.2s ease",
                        "&:nth-of-type(even)": {
                          backgroundColor: "#1a2332",
                        },
                        "&:hover": {
                          backgroundColor: "#2d3748",
                        },
                        "&:last-of-type td": {
                          borderBottom: "none",
                        },
                      },
                      "& pre": {
                        backgroundColor: "#1e293b",
                        color: "#e2e8f0",
                        padding: "16px",
                        borderRadius: "8px",
                        overflow: "auto",
                        fontSize: "0.875rem",
                      },
                      "& code": {
                        backgroundColor: "#1e293b",
                        color: "#e2e8f0",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      },
                      "& pre code": {
                        backgroundColor: "transparent",
                        padding: 0,
                      },
                    }}
                  >
                    {aiResponse.text ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiResponse.text}
                      </ReactMarkdown>
                    ) : (aiResponse as any).answer ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(aiResponse as any).answer}
                      </ReactMarkdown>
                    ) : (aiResponse as any).content ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(aiResponse as any).content}
                      </ReactMarkdown>
                    ) : (aiResponse as any).message ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {(aiResponse as any).message}
                      </ReactMarkdown>
                    ) : (
                      <Box>
                        <Alert severity="warning" sx={{ mb: 2 }}>
                          AI 응답 텍스트를 찾을 수 없습니다. 응답 구조를
                          확인해주세요.
                        </Alert>
                        <Typography variant="body2" color="text.secondary">
                          응답 데이터: {JSON.stringify(aiResponse, null, 2)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                {/* 인용 정보 */}
                {aiResponse.citations && aiResponse.citations.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}
                    >
                      참고 자료
                    </Typography>
                    <Grid container spacing={1}>
                      {aiResponse.citations.map((citation, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                          <Chip
                            label={citation.title}
                            size="small"
                            sx={{
                              backgroundColor: `${
                                AI_SOURCE_TYPE_COLORS[citation.sourceType]
                              }20`,
                              color: AI_SOURCE_TYPE_COLORS[citation.sourceType],
                              border: `1px solid ${
                                AI_SOURCE_TYPE_COLORS[citation.sourceType]
                              }`,
                            }}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}

                {/* 후속 질문 */}
                {aiResponse.followUps && aiResponse.followUps.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}
                    >
                      관련 질문
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {aiResponse.followUps.map((followUp, index) => (
                        <Chip
                          key={index}
                          label={followUp}
                          size="small"
                          onClick={() => setAiQuery(followUp)}
                          sx={{
                            cursor: "pointer",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #e2e8f0",
                            "&:hover": {
                              backgroundColor: "#e2e8f0",
                              transform: "translateY(-1px)",
                              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                            },
                            transition: "all 0.2s ease-in-out",
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 상세 JSON 응답 (접을 수 있음) */}
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 600, color: "#64748b" }}
                >
                  상세 응답 데이터 보기
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box
                  component="pre"
                  sx={{
                    backgroundColor: "#1e293b",
                    color: "#e2e8f0",
                    p: 2,
                    borderRadius: 1,
                    fontSize: "0.875rem",
                    overflow: "auto",
                    maxHeight: 400,
                  }}
                >
                  {JSON.stringify(aiResponse, null, 2)}
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        )}
      </Paper>

      {/* Snackbar 알림 */}
      <Snackbar
        open={showSnackbar}
        autoHideDuration={4000}
        onClose={() => setShowSnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
