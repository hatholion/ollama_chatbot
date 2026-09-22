# requirements.md — Local LLM Chat (프론트엔드)

> 이 파일 하나로 "무엇을, 왜, 어떤 스펙으로 만드는지"가 전부 설명되어야 한다.
> 새 세션(또는 새 AI)이 `PRD.md`/`기술스펙.md`/이전 대화 없이 **이 세 파일(requirements.md, tasks.md, progress.md)만**
> 읽고도 지금과 동일한 결과물을 다시 만들 수 있는 것을 목표로 작성한다.
> (기존 `frontend/docs/PRD.md`, `frontend/docs/기술스펙.md`, `frontend/docs/프롬프트.md`는
> 이 프로젝트가 어떤 과정으로 만들어졌는지 보여주는 히스토리 기록으로 그대로 둔다. 이 폴더가 "현재 기준"이다.)

## 1. 목적 및 배경

Local LLM Chat은 React 프론트엔드 + FastAPI 백엔드 + Ollama 기반 로컬 AI 채팅 웹 앱이다. 외부 클라우드에 데이터를 보내지 않고 로컬에서 LLM을 구동해, 민감 정보 유출 없이 오프라인 환경에서도 AI 채팅을 쓸 수 있게 하는 것이 목적이다. 사용자는 좌측 패널에서 모델·시스템 프롬프트·생성 파라미터(Temperature/Top P/Num Predict)를 조정하고 우측에서 대화한다.

## 2. 사용자 시나리오

- 로컬 AI를 실험/학습하려는 개발자·학생 (여러 모델·파라미터 비교)
- 민감 정보를 다루는 사용자 (클라우드 전송 없이 로컬 처리)
- 오프라인/저지연 환경 사용자
- 특정 페르소나가 필요한 사용자 (시스템 프롬프트 커스터마이징)

## 3. 시스템 구성 (전제 조건)

- **백엔드는 이미 구현되어 있고, 이 문서의 수정 대상이 아니다.** 프론트엔드는 아래 계약을 그대로 신뢰하고 맞춰 만든다.
  - `backend/main.py`: FastAPI 앱, CORS `allow_origins=["*"]`, `uvicorn.run(host="127.0.0.1", port=8000)`
  - `backend/schema.py`: `ChatRequest`/`ChatResponse` Pydantic 모델
  - `backend/ollama_chat.py`: Ollama 파이썬 클라이언트로 `chat()` 호출(스트리밍 아님), `GET /models`용 모델 목록 조회
- 프론트엔드 API 베이스 URL: `http://127.0.0.1:8000` (백엔드 실행 주소와 동일해야 함)

## 4. 파일 구조 제약 (절대 규칙)

```
frontend/src/
├── main.jsx   # 엔트리. createRoot로 App 렌더링 외 로직 없음
├── App.jsx    # 전체 로직 + 마크업 (상태, 핸들러, JSX 전부)
└── App.css    # 전체 스타일
```

- 이 3개 파일 구조를 절대 벗어나지 않는다. `components/`, `hooks/`, `utils/` 등 추가 파일·폴더 금지.
- 파일 **개수** 제한이지 함수 개수 제한이 아니다 — `App.jsx` 안에 여러 함수형 컴포넌트/헬퍼 함수를 두는 것은 허용.
- `index.html`, `package.json`, `vite.config.js`, `eslint.config.js` 등 빌드에 필수인 파일은 예외(3파일 규칙 대상 아님).
- `public/favicon.svg`는 유지, 그 외 Vite 스캐폴드 기본 자산(로고 이미지, `index.css` 등)은 사용하지 않는다.

## 5. 화면 요구사항

### 5-1. 좌측 사이드바 (고정폭 280px, 옅은 회색 배경)

| 요소 | 타입 | 기본값 | 세부 스펙 |
|---|---|---|---|
| 패널 제목 | 정적 텍스트 | "모델 설정" | |
| 모델 선택 | `<select>` | 최초 로드 후 목록의 첫 번째 항목 | 옵션은 하드코딩 금지 — `GET /models` 응답으로 동적 채움 |
| 시스템 프롬프트 | `<textarea>` (4행) | `"너는 초보자를 돕는 친절한 AI 강사다. 답변은 명확하고 간결하게 작성한다."` | 고정 초기값(placeholder 아님), 자유 수정 가능 |
| Temperature 슬라이더 | `<input type="range">` | `0.6` | `min=0, max=2, step=0.1`. 라벨에 `Temperature: 0.6` 형태로 소수 1자리 표시 |
| Top P 슬라이더 | `<input type="range">` | `0.7` | `min=0, max=1, step=0.05`. 라벨에 `Top P: 0.70` 형태로 소수 2자리 표시 |
| Num Predict | `<input type="number">` | `256` | `min=1, max=2048, step=1` (단위: 토큰) |

> 파라미터 범위는 Ollama 공식 문서가 강제하는 값이 아니라 `backend/schema.py`의 `ge/le` 제약과 동일하게 맞춘 것이다(Ollama 서버 자체는 값 검증을 하지 않음). 백엔드 스키마가 바뀌면 이 범위도 같이 바뀌어야 한다.

### 5-2. 우측 메인

| 요소 | 타입 | 스펙 |
|---|---|---|
| 앱 타이틀 | 정적 텍스트 | "Local LLM Chat" |
| 서브타이틀 | 정적 텍스트 | "React + FastAPI + Ollama 기반 로컬 AI 채팅 앱" |
| 대화 초기화 버튼 | `<button>` | 클릭 시 `window.confirm("대화 내용을 모두 삭제하시겠습니까?")` → 확인해야 `messages` 비움. 메시지가 0개면 confirm도 띄우지 않고 아무 동작 안 함 |
| 새로고침 아이콘 버튼 | `<button>` (텍스트 없는 원형, 28×28px, `border-radius: 50%`, 빨간 배경) | `aria-label="모델 목록 새로고침"`. 클릭 시 `GET /models` 재조회. 로딩 중엔 `disabled`(투명도 낮춤) |
| 메시지 리스트 | 스크롤 영역 | 사용자 메시지: 우측 정렬·파란 말풍선. AI 응답: 좌측 정렬·흰 배경+테두리 말풍선, **마크다운(굵게, 번호 목록) 렌더링 필수** — 일반 텍스트로 렌더링하면 안 됨 |
| 로딩 인디케이터 | 메시지 리스트 하단 | 요청 대기 중에만 표시, AI 말풍선 자리에 점 3개 바운스 애니메이션 |
| 에러 메시지 | 메시지 리스트 내 항목 | 요청 실패 시 빨간 톤 인라인 말풍선으로 추가(모달/토스트 금지). 문구: `오류가 발생했습니다: <원인>` |
| 메시지 입력창 | `<textarea>` (1행, 자동 줄바꿈 없이 `resize: none`) | placeholder: `"질문을 입력하세요. 예: FastAPI와 React를 연결하는 이유를 설명해줘. (Shift+Enter: 줄바꿈)"`. **일반 `<input>`이 아니라 `<textarea>`여야 함** — Shift+Enter 줄바꿈이 실제로 되려면 textarea가 필수. `aria-label="메시지 입력"` 필수(placeholder는 label 대체 아님) |
| 전송 버튼 | `<button>` | 입력값이 공백이 아니고 요청 대기 중이 아닐 때만 활성화(파란 배경). 그 외엔 비활성화(회색) |

## 6. 상태(State) 설계표 — `App.jsx` 내부

| state | 타입 | 초기값 | 용도 |
|---|---|---|---|
| `models` | `string[]` | `[]` | 모델 select 옵션 |
| `isModelsLoading` | `boolean` | `true` | 모델 목록 로딩 중 여부 (select/새로고침 버튼 비활성화에 사용) |
| `selectedModel` | `string` | `""` | 모델 select 값. `models` 로드 후 `models[0]`으로 자동 설정 |
| `systemPrompt` | `string` | 위 5-1 기본값 | 시스템 프롬프트 textarea |
| `temperature` | `number` | `0.6` | Temperature 슬라이더 |
| `topP` | `number` | `0.7` | Top P 슬라이더 |
| `numPredict` | `number` | `256` | Num Predict 입력 |
| `messages` | `{id, role: 'user'\|'assistant'\|'error', content}[]` | `[]` | 메시지 리스트. `error`는 별도 state가 아니라 이 배열의 role로 처리 |
| `inputValue` | `string` | `""` | 입력창 값 |
| `isSending` | `boolean` | `false` | 요청 대기 중 여부 (전송 버튼/입력창 비활성화, 로딩 인디케이터 표시) |

**설계 원칙 (반드시 지킬 것)**
- 에러는 별도 state를 만들지 말고 `messages` 배열에 `role: 'error'`로 append한다.
- 초기화 confirm은 별도 모달 state 없이 `window.confirm()` 사용.
- 모델 목록 로드 실패/빈 배열은 별도 에러 state 없이 `models.length === 0 && !isModelsLoading` 조건으로 판단, select 비활성화 + 안내 옵션 텍스트로 표시.
- 파라미터(state) 변경은 `messages`에 영향을 주지 않는다. 다음 전송 시점의 값만 요청에 실린다.
- **언마운트 후 늦게 도착한 fetch 응답이 state를 갱신하지 않도록 mounted-ref 가드를 둔다.** 단, `useRef(false)`로 시작해서 **`useEffect` 본문 시작 지점에서 `true`로 설정하고 cleanup에서 `false`로 내리는 형태**여야 한다. cleanup에서만 false로 내리고 true로 되돌리는 코드가 없으면, React 19 `StrictMode`의 개발 모드 mount→cleanup→remount 시뮬레이션 때문에 모든 fetch 응답이 영원히 무시되어 "모델 목록 불러오는 중..."에 멈추는 버그가 실제로 발생한다(재현·수정 이력 있음 — `progress.md` 참고).

## 7. 백엔드 통신 스펙

### `POST http://127.0.0.1:8000/chat`

요청 바디:
```json
{
  "message": "string, 필수",
  "model": "string",
  "system_prompt": "string",
  "temperature": 0.6,
  "top_p": 0.7,
  "num_predict": 256
}
```

정상 응답(200):
```json
{ "model": "string", "message": "string", "elapsed_time": 1.732 }
```
- `message` 필드를 그대로 assistant 메시지 content로 사용한다. `elapsed_time`은 화면에 표시하지 않는다.
- **스트리밍이 아니다.** 응답을 한 번에 받아 `messages`에 append한다. `ReadableStream`을 읽는 코드는 작성하지 않는다.

에러 응답(4xx/5xx):
```json
{ "detail": "string" }
```
- `!response.ok`거나 `fetch` 자체가 실패(네트워크 예외)하면 `data?.detail`(없으면 `요청이 실패했습니다. (HTTP {status})`)을 메시지로 `role: 'error'` 항목을 추가한다.

### `GET http://127.0.0.1:8000/models`

응답(200):
```json
{ "models": ["gemma4:e2b", "llama3.1:latest", "..."] }
```
- `data.models` 배열을 그대로 `models` state에 저장, 기존 `selectedModel`이 새 목록에 없으면 `models[0]`으로 교체.
- 호출 시점: (1) 컴포넌트 마운트 시 1회, (2) 새로고침 아이콘 클릭 시.

## 8. 사용자 인터랙션 플로우

1. **메시지 전송**: 입력값이 있고 대기 중이 아닐 때 전송 버튼 클릭 또는 입력창에서 `Enter`(Shift 없이) → user 메시지 append → 입력창 비움 → 대기 상태 진입(로딩 인디케이터 표시, 입력창/전송 버튼 비활성화) → `POST /chat` → 성공 시 assistant 메시지 append, 실패 시 error 메시지 append → 대기 상태 해제. `Shift+Enter`는 textarea에 줄바꿈만 추가하고 전송하지 않는다.
2. **대화 초기화**: 클릭 시 confirm → 확인 시 `messages` 전체 삭제. 메시지가 이미 없으면 아무 동작 안 함.
3. **파라미터 변경**: 좌측 패널 값 변경은 즉시 화면(라벨 숫자 등)에 반영되고, 별도 저장 버튼 없이 다음 전송부터 적용된다. 기존 대화 내용에는 영향 없음.
4. **모델 목록 새로고침**: 새로고침 아이콘 클릭 → `GET /models` 재호출 → select 옵션 갱신.

## 9. 라이브러리 결정 (설치 시 정확히 이 버전/사유를 따를 것)

| 라이브러리 | 버전 | 사유 |
|---|---|---|
| `react`, `react-dom` | `^19.2.8` | 기본 프레임워크 |
| `vite`, `@vitejs/plugin-react` | `vite ^8.3.0` | 빌드 도구 |
| `react-router` | `^8.4.0` (패키지명은 `react-router`, `react-router-dom` 아님 — v8에서 제거됨) | 향후 화면 확장 대비 라우팅 골격. `main.jsx`/`App.css`는 건드리지 않고 `App.jsx` 안에서 `BrowserRouter`/`Routes`/`Route`(선언적 모드)만 사용. 현재는 `path="/"` 라우트 1개만 존재 |
| `react-markdown` | `^10.1.0` | AI 응답의 굵게/번호 목록 렌더링 요건 때문에 설치한 유일한 예외 의존성. 정규식으로 직접 마크다운을 파싱하지 않는다 |
| 그 외(axios, TanStack Query, Redux, Zustand, Context API 등) | 설치 금지 | 요청이 2개(`POST /chat`, `GET /models`)뿐이고 상태가 한 컴포넌트 안에서만 쓰여 불필요 |

- 데이터 페칭은 브라우저 내장 `fetch`만 사용.
- `useEffect`는 마운트 시 1회 `GET /models` 호출에만 사용한다. 사용자 액션(전송 버튼 클릭)으로 트리거되는 요청은 이벤트 핸들러에서 직접 처리하고 `useEffect`에 넣지 않는다.
- React 19의 `use()` 훅은 Suspense/에러 바운더리 구조가 필요해 이번 3파일 구조에서는 도입하지 않는다.
- ESLint(`eslint-plugin-react-hooks` v7 계열)의 `react-hooks/set-state-in-effect` 규칙이 "마운트 시 fetch → setState" 패턴을 경고하는데, 이는 프레임워크 없는 SPA에서 불가피한 정당한 패턴이므로 해당 줄에 `// eslint-disable-next-line react-hooks/set-state-in-effect`와 사유 주석을 남기고 넘어간다(룰 자체를 끄지 않는다).

## 10. 디자인 토큰 (라이트 테마)

| 용도 | 값 |
|---|---|
| 배경(전체) | `#ffffff` |
| 본문 텍스트 | `#1f2023` |
| 사이드바 배경 | `#f4f5f7` |
| 공통 테두리 | `#e3e4e8` (입력 요소 테두리는 `#d6d7dc`) |
| 서브타이틀 텍스트 | `#7a7c83` |
| 사용자 말풍선 배경/텍스트 | `#2f6fed` / `#ffffff` |
| 전송 버튼 활성 배경/hover | `#2f6fed` / `#2559c4` |
| 전송 버튼 비활성 배경/텍스트 | `#e5e6ea` / `#9a9ba1` |
| 새로고침 아이콘 배경 | `#e6483c` |
| 에러 말풍선 배경/텍스트/테두리 | `#fdecec` / `#b3261e` / `#f3b7b3` |
| 타이핑 인디케이터 점 색상 | `#b7b9c2` |
| 사이드바 고정폭 | `280px` |
| 기본 폰트 | `system-ui, 'Segoe UI', Roboto, sans-serif`, 본문 15px |

## 11. 비기능 요구사항

- **에러 처리**: 위 §5-2, §7 참고. 모달/토스트 없이 인라인 메시지만.
- **로딩 상태**: 점 3개 바운스 인디케이터. 요청 중 입력창/전송 버튼 비활성화.
- **반응형**: 미지원(의도적). 데스크톱 전용 2단 레이아웃만 구현하고 미디어 쿼리를 넣지 않는다.
- **접근성**: 모든 폼 요소는 `label htmlFor` ↔ `id` 연결 또는(아이콘 버튼·입력창처럼 시각적 라벨이 없는 경우) `aria-label` 필수. 그 이상의 ARIA 라이브 리전 등 고급 접근성은 이번 범위 밖(향후 개선 항목).
- **성능**: 백엔드가 비스트리밍이므로 별도 스트리밍 최적화 불필요.

## 12. 명시적 제외 범위 (Out of scope)

- 다중 대화(세션/스레드), 대화 히스토리 영구 저장/DB 연동
- 사용자 인증/로그인, 다중 사용자
- 파일 업로드/이미지 등 멀티모달 입력
- 다국어(i18n), 다크 모드
- 모델 다운로드/설치·관리(목록 새로고침만 지원)
- 대화 내보내기/공유
- 모바일/태블릿 반응형
- 스트리밍(타이핑 효과) 응답
- 위에서 명시한 것 이상의 접근성(ARIA 라이브 리전 등), 자동화 테스트
