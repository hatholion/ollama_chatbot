# progress.md — Local LLM Chat (프론트엔드)

> 새 세션을 시작하면 **이 파일을 가장 먼저 읽는다.** 다음 순서로 파악한다:
> 1. 이 파일(progress.md) — 지금까지 뭘 했고 왜 그렇게 했는지, 현재 상태
> 2. `tasks.md` — 뭐가 끝났고 다음에 뭘 할지
> 3. `requirements.md` — 세부 스펙이 필요할 때 참조

## 현재 상태 (요약)

**v1.0 기능 요구사항 완료.** `frontend/src/main.jsx` / `App.jsx` / `App.css` 3파일로 구성된 채팅 UI가 실제 백엔드(`POST /chat`, `GET /models`)와 연동되어 동작하며, 실제 Ollama 모델로 end-to-end 검증까지 마쳤다. 추가로 요청받은 새 기능은 없음.

## 실행/확인 방법

```bash
# 1) Ollama (이미 떠 있으면 생략)
ollama serve

# 2) 백엔드
cd backend && uv run main.py        # http://127.0.0.1:8000

# 3) 프론트엔드
cd frontend && npm run dev          # 터미널에 뜨는 http://localhost:xxxx 접속
```
확인 포인트: 좌측 모델 select가 실제 `ollama list` 결과로 채워지는지 → 메시지 전송 시 로딩 인디케이터 후 실제 응답이 마크다운(굵게/번호목록) 서식으로 오는지 → 대화 초기화가 confirm 후 동작하는지. 백엔드를 꺼둔 채 전송하면 빨간 인라인 에러 메시지가 뜨는 것도 정상(의도된 동작).

## 진행 순서와 핵심 결정 (시간순)

1. **PRD 초안 → 확정(v1.0)**: `chat_ui_설계도.png` 기반으로 화면 요소를 정리하고, 이미지만으로 알 수 없던 12개 항목("모델 목록 하드코딩 vs 동적", 파라미터 min/max, 새로고침 아이콘 용도, 로딩/에러 UI 형태, 초기화 confirm 여부, 반응형 여부 등)을 사용자에게 확인 후 확정. 근거는 이미 존재하던 `backend/schema.py`(파라미터 범위), `backend/main.py`(`/models` 엔드포인트 존재) 코드에서 가져옴. 프로젝트 성격은 "포트폴리오/데모용, 데스크톱 전용"으로 확인받음.
2. **기술 스펙 확정**: 3파일 구조, state 설계표, `POST /chat`/`GET /models` 요청·응답 스펙, 라이브러리 계획을 문서화. Context7 MCP가 이 환경에 없어 WebFetch/WebSearch로 react.dev/vite.dev 공식 문서를 대신 확인 — 요점: 사용자 액션으로 트리거되는 요청은 `useEffect`가 아니라 이벤트 핸들러에서 처리해야 한다(React 공식 권장), 백엔드가 비스트리밍이라 스트리밍 처리 불필요.
3. **향후 화면 확장 대비 라우팅 골격 추가**: 지금 당장 여러 페이지가 필요한 건 아니지만 요청에 따라 `react-router` v8(선언적 모드, `BrowserRouter`/`Routes`/`Route`)을 `App.jsx` 안에 추가. `react-router-dom`은 v8에서 제거되어 `react-router` 패키지만 설치.
4. **프로젝트 초기화**: Vite 스캐폴드 기본 파일(로고 이미지, `index.css`, `public/icons.svg`) 제거, 3파일 구조로 정리. `npm run dev`로 빈 화면 무오류 렌더링 확인.
5. **정적 레이아웃**: state/핸들러 없이 마크업+CSS만으로 디자인 목업과 시각적으로 대조. 더미 메시지 1~2개 하드코딩.
6. **state 연결(mock)**: 실제 API 호출 없이 `setTimeout` 더미 응답으로 전송→리스트 반영→초기화 흐름만 먼저 검증.
7. **실제 `POST /chat` 연동**: fetch 요청/응답을 requirements.md §7 형태로 구현. 요청 전 재확인한 결과, 백엔드가 스트리밍을 쓰지 않는 것으로 재확인되어 스트리밍 코드는 작성하지 않음. Ollama 파라미터 range는 Ollama 자체가 강제하는 게 아니라 백엔드 스키마가 정한 값임을 확인 — 기존 range 유지.
8. **PRD/기술스펙 대조 리뷰**: 코드를 다시 스펙과 대조하다가 아래 4개 gap을 발견해 수정함.
   - 모델 select가 여전히 하드코딩 옵션 1개뿐이었음 → `GET /models` 동적 로드로 교체
   - 새로고침 아이콘 버튼에 `onClick`이 아예 없었음(눌러도 아무 일도 안 일어남) → `fetchModels` 연결
   - AI 응답을 `<p>`로만 렌더링해서 마크다운 굵게/번호목록이 요구사항인데도 원문 그대로 노출됐음 → `react-markdown` 설치 후 assistant 메시지에만 적용
   - 입력창이 `<input>`이라 안내 문구("Shift+Enter: 줄바꿈")와 달리 애초에 줄바꿈이 불가능했음 → `<textarea>`로 교체, `aria-label` 추가(접근성 체크리스트에서 label 누락도 함께 발견)
   - 부수적으로 언마운트 후 state 갱신을 막는 `isMountedRef` 가드를 추가함
9. **버그 발견 및 수정 (중요, 재발 방지용 기록)**: 8번에서 추가한 `isMountedRef` 가드가 `useEffect` cleanup에서만 `false`로 내리고 `true`로 되돌리는 코드가 없었음. React 19 `StrictMode`는 개발 모드에서 mount → cleanup → remount를 한 번 더 시뮬레이션하는데, 이 cleanup 때 `false`로 내려간 뒤 다시 `true`가 되지 않아 **모델 목록이 영원히 "불러오는 중..."에 멈추는 버그**가 실제로 재현됐다. playwright로 두 번째 `GET /models` 응답이 와도 화면이 갱신 안 되는 것을 확인하고 원인을 특정 → `useEffect(() => { isMountedRef.current = true; return () => { isMountedRef.current = false } }, [])` 형태로 수정해 해결. **앞으로 비슷한 언마운트 가드를 추가할 때 이 패턴(반드시 effect 시작 시점에 true로 재설정)을 그대로 따를 것.**
10. **3-file-system 문서 체계 도입 (이번 작업)**: 사용자가 요청한 "PRD/tasks/progress" 3-파일 세션 연속성 시스템을 `docs/3-file-system/`에 별도로 구성. 기존 `PRD.md`/`기술스펙.md`/`프롬프트.md`는 과정 기록으로 보존하고, 이 폴더가 앞으로의 "현재 기준" 문서가 된다.

## 자기 검증 결과 ("이 세 파일만으로 처음부터 다시 만들어도 되는가")

`requirements.md`에 다음을 모두 포함시켜서, 원본 코드나 PRD/기술스펙 문서 없이도 재구현 가능하도록 만들었다.

- 정확한 파일 구조 제약과 예외(빌드 필수 파일)
- state 10개의 이름/타입/초기값/용도 표
- `POST /chat`, `GET /models`의 정확한 요청·응답 JSON과 필드별 의미
- 정확한 라이브러리명·버전·설치 사유(특히 `react-router`가 아닌 `react-router-dom`을 쓰면 안 된다는 것, `react-markdown` 도입 사유)
- 실제 구현에서 확정된 디자인 토큰(색상 hex 값 전부)
- 9번에서 발견한 `isMountedRef` 버그와 올바른 패턴 — 재구현 시 같은 실수를 반복하지 않도록 requirements.md §6에도 명시해둠
- ESLint `react-hooks/set-state-in-effect` 규칙에 걸리는 것이 정상이며 disable 처리해야 한다는 것

위 항목이 모두 requirements.md 안에 들어있음을 확인했고, 이를 근거로 3-file-system 문서를 생성했다.

## 다음 세션에서 할 일

`tasks.md`의 "다음 작업" 섹션 참고 — 현재는 없음. 사용자가 새 기능/변경을 요청하면:
1. `requirements.md`를 먼저 갱신(무엇이 왜 바뀌는지)
2. `tasks.md`에 새 체크리스트 섹션 추가
3. 작업 완료 후 이 `progress.md`에 결정 이력 한 줄 추가
