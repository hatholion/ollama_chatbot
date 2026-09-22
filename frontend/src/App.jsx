import { useEffect, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import ReactMarkdown from 'react-markdown'
import './App.css'

// backend/main.py의 uvicorn.run(host="127.0.0.1", port=8000)과 동일한 주소.
const API_BASE_URL = 'http://127.0.0.1:8000'

// 기술 스펙 §2-1(POST /chat) 요청/응답 형태 그대로 fetch 연동한다.
// 백엔드가 스트리밍이 아닌 완성된 JSON을 한 번에 반환하므로(§확정8),
// 토큰 단위 스트리밍 처리는 적용하지 않고 응답 1건을 그대로 messages에 append한다.
function ChatPage() {
  const [models, setModels] = useState([])
  const [isModelsLoading, setIsModelsLoading] = useState(true)
  const [selectedModel, setSelectedModel] = useState('')
  const [systemPrompt, setSystemPrompt] = useState(
    '너는 초보자를 돕는 친절한 AI 강사다. 답변은 명확하고 간결하게 작성한다.',
  )
  const [temperature, setTemperature] = useState(0.6)
  const [topP, setTopP] = useState(0.7)
  const [numPredict, setNumPredict] = useState(256)
  const [messages, setMessages] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)

  // 언마운트 후 fetch 응답이 늦게 도착해 state를 갱신하는 것을 막기 위한 가드.
  // StrictMode 개발 모드의 mount→cleanup→remount 시뮬레이션에서도 정확히 동작하도록
  // effect 시작 시 true로 되돌린다(cleanup에서만 false로 내리면 재마운트 후에도
  // 계속 false로 남아 정상 상태 업데이트까지 막히는 문제가 있었음).
  const isMountedRef = useRef(false)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // 기술 스펙 §2-2(GET /models): 마운트 시 1회 + 새로고침 아이콘 클릭 시 호출.
  // 실패/빈 목록은 별도 state 없이 models.length === 0 && !isModelsLoading 조건으로 판단한다.
  async function fetchModels() {
    setIsModelsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/models`)
      if (!response.ok) throw new Error('모델 목록 조회 실패')
      const data = await response.json()
      const list = Array.isArray(data.models) ? data.models : []
      if (!isMountedRef.current) return
      setModels(list)
      setSelectedModel((prev) => (list.includes(prev) ? prev : (list[0] ?? '')))
    } catch {
      if (!isMountedRef.current) return
      setModels([])
    } finally {
      if (isMountedRef.current) setIsModelsLoading(false)
    }
  }

  useEffect(() => {
    // 마운트 시 1회 실제 백엔드 데이터를 동기화하는 정당한 Effect 사용(기술 스펙 §3, 각주 1).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchModels()
  }, [])

  const canSend = inputValue.trim().length > 0 && !isSending

  async function handleSend() {
    const trimmed = inputValue.trim()
    if (!trimmed || isSending) return

    const userMessage = { id: crypto.randomUUID(), role: 'user', content: trimmed }
    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsSending(true)

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          model: selectedModel,
          system_prompt: systemPrompt,
          temperature,
          top_p: topP,
          num_predict: numPredict,
        }),
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const detail = data?.detail ?? `요청이 실패했습니다. (HTTP ${response.status})`
        throw new Error(detail)
      }

      if (!isMountedRef.current) return
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.message,
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      if (!isMountedRef.current) return
      const errorMessage = {
        id: crypto.randomUUID(),
        role: 'error',
        content: `오류가 발생했습니다: ${error.message || '백엔드에 연결할 수 없습니다.'}`,
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      if (isMountedRef.current) setIsSending(false)
    }
  }

  function handleInputKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  function handleReset() {
    if (messages.length === 0) return
    if (!window.confirm('대화 내용을 모두 삭제하시겠습니까?')) return
    setMessages([])
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h2 className="sidebar-title">모델 설정</h2>

        <div className="field-group">
          <label className="field-label" htmlFor="model-select">
            모델
          </label>
          <select
            id="model-select"
            className="field-select"
            value={selectedModel}
            onChange={(event) => setSelectedModel(event.target.value)}
            disabled={isModelsLoading || models.length === 0}
          >
            {models.length === 0 ? (
              <option value="">
                {isModelsLoading ? '모델 목록 불러오는 중...' : '모델 목록을 불러오지 못했습니다'}
              </option>
            ) : (
              models.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="system-prompt">
            시스템 프롬프트
          </label>
          <textarea
            id="system-prompt"
            className="field-textarea"
            rows={4}
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="temperature">
            Temperature: {temperature.toFixed(1)}
          </label>
          <input
            id="temperature"
            className="field-range"
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={temperature}
            onChange={(event) => setTemperature(Number(event.target.value))}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="top-p">
            Top P: {topP.toFixed(2)}
          </label>
          <input
            id="top-p"
            className="field-range"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={topP}
            onChange={(event) => setTopP(Number(event.target.value))}
          />
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor="num-predict">
            Num Predict
          </label>
          <input
            id="num-predict"
            className="field-number"
            type="number"
            min={1}
            max={2048}
            step={1}
            value={numPredict}
            onChange={(event) => setNumPredict(Number(event.target.value))}
          />
        </div>
      </aside>

      <main className="main">
        <header className="main-header">
          <div className="main-header-titles">
            <h1 className="main-title">Local LLM Chat</h1>
            <p className="main-subtitle">React + FastAPI + Ollama 기반 로컬 AI 채팅 앱</p>
          </div>
          <div className="main-header-actions">
            <button type="button" className="reset-button" onClick={handleReset}>
              대화 초기화
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="모델 목록 새로고침"
              onClick={fetchModels}
              disabled={isModelsLoading}
            />
          </div>
        </header>

        <section className="message-list">
          {messages.map((message) =>
            message.role === 'assistant' ? (
              <div key={message.id} className="message message-assistant">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            ) : (
              <div key={message.id} className={`message message-${message.role}`}>
                <p>{message.content}</p>
              </div>
            ),
          )}
          {isSending && (
            <div className="message message-assistant message-loading" aria-live="polite">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          )}
        </section>

        <footer className="composer">
          <textarea
            className="composer-input"
            rows={1}
            aria-label="메시지 입력"
            placeholder="질문을 입력하세요. 예: FastAPI와 React를 연결하는 이유를 설명해줘. (Shift+Enter: 줄바꿈)"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <button type="button" className="send-button" onClick={handleSend} disabled={!canSend}>
            전송
          </button>
        </footer>
      </main>
    </div>
  )
}

// 현재는 화면이 하나뿐이지만, 향후 화면이 늘어날 것을 대비해
// react-router의 선언적(Declarative) 모드로 라우팅 구조만 미리 잡아둔다.
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
