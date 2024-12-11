"use client";

import React, { useEffect, useState } from "react";
import {
  Typography,
  TextField,
  Card,
  CardContent,
  Snackbar,
  Alert,
  Container,
  Box,
  LinearProgress,
} from "@mui/material";

interface MasteryMap {
  [key: string]: number;
}

const items = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const EPSILON = 0.2;
const MASTERY_STEP = 0.1;
const MASTERY_STORAGE_KEY = "masteryState";

// masteryMap을 받아 다음 문제를 결정하는 순수 함수
function pickNextQuestion(masteryMap: MasteryMap): string | null {
  if (!masteryMap || Object.keys(masteryMap).length === 0) return null;

  const r = Math.random();
  let chosenItem: string;

  if (r < EPSILON) {
    // 랜덤 탐색
    chosenItem = items[Math.floor(Math.random() * items.length)];
  } else {
    // 낮은 mastery 우선 선택
    const sortedByMastery = [...items].sort(
      (a, b) => masteryMap[a] - masteryMap[b]
    );
    const sliceCount = Math.max(1, Math.floor(items.length * 0.3));
    const topCandidates = sortedByMastery.slice(0, sliceCount);
    const selectedCandidate =
      topCandidates[Math.floor(Math.random() * topCandidates.length)];
    // selectedCandidate와 동일한 mastery를 가진 항목 중 랜덤 선택
    const candidates = items.filter(
      (item) => masteryMap[item] === masteryMap[selectedCandidate]
    );
    chosenItem = candidates[Math.floor(Math.random() * candidates.length)];
  }

  return chosenItem;
}

export default function Page() {
  const [masteryMap, setMasteryMap] = useState<MasteryMap>({});
  const [currentItem, setCurrentItem] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info" | "warning";
  }>({
    open: false,
    message: "",
    severity: "info",
  });

  // 초기 로딩 시 masteryMap을 가져오고 즉시 문제를 하나 선택
  useEffect(() => {
    let initialMastery: MasteryMap;
    const saved =
      typeof window !== "undefined"
        ? localStorage.getItem(MASTERY_STORAGE_KEY)
        : null;
    if (saved) {
      initialMastery = JSON.parse(saved);
      // 저장된 맵이 비어있을 경우 초기화
      if (!initialMastery || Object.keys(initialMastery).length === 0) {
        initialMastery = {};
        items.forEach((item) => {
          initialMastery[item] = 0.5;
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(
            MASTERY_STORAGE_KEY,
            JSON.stringify(initialMastery)
          );
        }
      }
    } else {
      // 저장된 것이 없으면 초기화
      initialMastery = {};
      items.forEach((item) => {
        initialMastery[item] = 0.5;
      });
      if (typeof window !== "undefined") {
        localStorage.setItem(
          MASTERY_STORAGE_KEY,
          JSON.stringify(initialMastery)
        );
      }
    }

    setMasteryMap(initialMastery);
    // masteryMap을 세팅한 직후 문제를 바로 선정
    const next = pickNextQuestion(initialMastery);
    setCurrentItem(next);
  }, []);

  const checkAnswer = () => {
    if (!currentItem) return;
    const correctIndex = items.indexOf(currentItem) + 1;
    const userVal = parseInt(userAnswer, 10);

    const correct = userVal === correctIndex;
    updateMastery(currentItem, correct);

    setFeedback({
      open: true,
      message: correct
        ? `Correct! "${currentItem}" is the ${correctIndex}th.`
        : `Incorrect! "${currentItem}" is the ${correctIndex}th.`,
      severity: correct ? "success" : "error",
    });
    setUserAnswer("");

    // 새로운 masteryMap 상태를 이용해 다음 문제 출제
    const next = pickNextQuestion({
      ...masteryMap,
      [currentItem]: Math.max(
        Math.min(
          masteryMap[currentItem] + (correct ? MASTERY_STEP : -MASTERY_STEP),
          1
        ),
        0
      ),
    });
    setCurrentItem(next);
  };

  const updateMastery = (item: string, correct: boolean) => {
    const newMastery = { ...masteryMap };
    const currentVal = newMastery[item];
    newMastery[item] = correct
      ? Math.min(currentVal + MASTERY_STEP, 1)
      : Math.max(currentVal - MASTERY_STEP, 0);

    setMasteryMap(newMastery);
    if (typeof window !== "undefined") {
      localStorage.setItem(MASTERY_STORAGE_KEY, JSON.stringify(newMastery));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      checkAnswer();
    }
  };

  return (
    <div>
      <Snackbar
        open={feedback.open}
        autoHideDuration={2000}
        onClose={() => setFeedback({ ...feedback, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={feedback.severity}
          onClose={() => setFeedback({ ...feedback, open: false })}
        >
          {feedback.message}
        </Alert>
      </Snackbar>
      <Container maxWidth="sm" style={{ marginTop: "6rem" }}>
        {currentItem && (
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                What number is &quot;{currentItem}&quot; in the alphabet?
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                label="Answer (number)"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                style={{ marginRight: "1rem" }}
              />
            </CardContent>
          </Card>
        )}
      </Container>
      <Container maxWidth="sm" style={{ marginTop: "2rem" }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Mastery Levels
            </Typography>
            {items.map((item) => (
              <Box key={item} display="flex" alignItems="center" mb={1}>
                <Typography style={{ width: "2rem" }}>{item}</Typography>
                <LinearProgress
                  variant="determinate"
                  value={(masteryMap[item] || 0) * 100}
                  style={{ width: "100%", marginLeft: "1rem" }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
      </Container>
    </div>
  );
}