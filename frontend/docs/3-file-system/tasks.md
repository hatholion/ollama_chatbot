# tasks.md — Local LLM Chat (프론트엔드)

> `requirements.md`를 잘게 쪼갠 실행 단계 리스트. 위에서 아래로 순서대로 진행한다.
> 체크된 항목은 현재 `frontend/src/main.jsx`, `App.jsx`, `App.css`에 이미 구현·검증되어 있다.
> 새 세션에서는 이 파일에서 **첫 번째로 체크 안 된 항목**부터 이어서 하면 된다.

## 0. 준비

- [x] 백엔드(`backend/`)는 이미 구현되어 있음을 확인 (`/chat`, `/models` 엔드포인트, Pydantic 스키마) — 이번 작업 대상 아님
- [x] Ollama에 최소 1개 모델 설치되어 있고 `ollama serve` 실행 가능한지 확인

## 1. 파일 구조 초기화

- [x] `frontend/src/`를 `main.jsx` / `App.jsx` / `App.css` 3개로만 구성 (Vite 스캐폴드 잔재인 `index.css`, `assets/*`, `public/icons.svg` 등 제거)
- [x] `main.jsx`: `StrictMode` + `createRoot`로 `App`만 렌더링
- [x] `npm run dev` 실행 시 에러 없이 빈 화면 렌더링 확인

## 2. 정적 레이아웃 (state 없이 마크업+CSS만)

- [x] 좌측 사이드바(280px, `#f4f5f7` 배경): 모델 설정 타이틀, 모델 select, 시스템 프롬프트 textarea, Temperature/Top P 슬라이더, Num Predict
- [x] 우측 메인: 헤더(타이틀+서브타이틀+대화초기화 버튼+새로고침 아이콘), 스크롤 메시지 리스트, 하단 입력창+전송 버튼
- [x] 디자인 토큰(requirements.md §10) 색상 그대로 적용
- [x] 스크린샷으로 `chat_ui_설계도.png`와 시각적 대조 완료

## 3. state 연결 (더미 응답으로 흐름만 검증)

- [x] requirements.md §6 state 설계표대로 `useState` 10개 전부 연결 (당시엔 모델 관련 state 없이 시작 → 이후 5번에서 추가)
- [x] 전송(버튼/Enter) → `messages`에 user 메시지 추가 → `setTimeout` 더미 assistant 응답
- [x] 대화 초기화 → `window.confirm()` → `messages` 비우기
- [x] 입력→전송 시 리스트에 순서대로 쌓이고 초기화 정상 동작 확인 (playwright로 검증)

## 4. 실제 백엔드 연동

- [x] `handleSend`를 `POST http://127.0.0.1:8000/chat`로 교체 (requirements.md §7 요청/응답 형태 그대로)
- [x] 요청 실패 시 인라인 에러 메시지(`role: 'error'`) 표시
- [x] 요청 중 전송 버튼 비활성화 + 타이핑 인디케이터(점 3개) 표시
- [x] mock(강제 실패)·실제 백엔드 양쪽 다 playwright로 검증

## 5. PRD/기술스펙 대조 리뷰 및 gap 수정

- [x] 모델 select를 하드코딩에서 `GET /models` 동적 로드로 교체 (`models`, `isModelsLoading`, `selectedModel` 초기값 `""` 로 변경)
- [x] 새로고침 아이콘 버튼에 `onClick={fetchModels}` 연결 (기존엔 클릭해도 아무 동작 없었음)
- [x] AI 응답 마크다운 렌더링 — `react-markdown` 설치 후 `role === 'assistant'`일 때만 적용
- [x] 메시지 입력창을 `<input>` → `<textarea>`로 교체해 Shift+Enter 줄바꿈이 실제로 동작하도록 수정, `aria-label="메시지 입력"` 추가
- [x] 언마운트 후 state 갱신을 막는 `isMountedRef` 가드 추가
- [x] **버그 발견·수정**: 위 가드를 cleanup에서만 `false`로 내리고 있어서 React 19 `StrictMode`의 dev 모드 mount→cleanup→remount 시뮬레이션 때문에 모델 목록이 영원히 "불러오는 중"에 멈추는 문제 발견 → `useEffect` 시작 지점에서 `true`로 재설정하도록 수정 (자세한 재현 과정은 `progress.md` 참고)
- [x] `eslint`(react-hooks/set-state-in-effect 등) 클린, `vite build` 성공
- [x] 실제 Ollama 응답으로 마크다운(굵게+번호 목록) 렌더링, Shift+Enter 줄바꿈, 모델 목록 새로고침까지 playwright로 재검증

## 6. 문서 체계 정리 (현재 단계)

- [x] `docs/3-file-system/requirements.md` — PRD.md + 기술스펙.md 내용을 코드 기준으로 다시 통합해 하나의 스펙 파일로 확정
- [x] `docs/3-file-system/tasks.md` — 이 파일
- [x] `docs/3-file-system/progress.md` — 세션 로그/결정 기록
- [x] 세 파일만으로 처음부터 재구현해도 지장 없는지 자체 점검(색상 hex, 라이브러리 정확한 버전, API 계약, 알려진 버그/함정까지 requirements.md에 포함했는지 확인) 완료

## 7. 백로그 (현재 범위 아님 — requirements.md §12 Out of scope와 동일, 착수 금지 목록이 아니라 "하지 않기로 확정한" 목록)

- [ ] 모바일/태블릿 반응형 — **하지 않음**(의도적 제외)
- [ ] 스트리밍 응답(타이핑 효과) — **하지 않음**(백엔드가 비스트리밍이라 의미 없음)
- [ ] 다중 대화/히스토리 영구 저장, 로그인, 다국어, 다크모드, export — **하지 않음**
- [ ] ARIA 라이브 리전 등 심화 접근성, 자동화 테스트 — **범위 밖, 필요 시 별도 요청으로 시작**

> 체크박스가 비어 있다고 "할 일"이 아니라, requirements.md §12에서 이미 "안 하기로" 확정한 항목이라는 뜻이다. 새 세션에서 이 항목들을 임의로 시작하지 말 것.

## 다음 작업

현재 없음 — requirements.md 기준 기능 요구사항은 모두 충족된 상태(v1.0 완료). 사용자가 새 요구사항을 주면 여기(tasks.md)에 새 섹션을 추가하고 requirements.md도 함께 갱신한다.
