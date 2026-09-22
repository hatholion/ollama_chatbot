from fastapi import FastAPI, HTTPException
import uvicorn
# ollama_chat 모듈의 call_ollama_chat 함수 로딩
from ollama_chat import call_ollama_chat, get_ollama_models
# 마찬가지로 schema 모듈의 ChatRequest, ChatResponse 함수 로딩
from schema import ChatRequest, ChatResponse


# FastAPI 객체 app 생성
app = FastAPI(
    title="Local LLM Chat API",
    description="Ollama 기반 로컬 LLM 채팅 백엔드 API",
    version="0.1.0",
)

# http://localhost:8000/models
# /chat API 구현
@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    # 비즈니스 로직처리
    # return_value = {
    #     "model": "aaaa",
    #     "ai_message": "ai_message",
    #     "걸린시간" : "걸린시간"
    # }
    try:

      return_value = call_ollama_chat(
              message=request.message,
              model=request.model,
              system_prompt=request.system_prompt,
              temperature=request.temperature,
              top_p=request.top_p,
              num_predict=request.num_predict,
          )


      return return_value
    except Exception as exc:
      raise HTTPException(
          status_code=500,
          detail=f"채팅 처리 중 오류가 발생했습니다: {exc}"
      ) 

# model 목록 가져오기
# http://localhost:8000/models
@app.get("/models")
def list_models():
    try:
       print("진입") # CPU 제어 넘어갔는지 확인하는 print 문.
       models = get_ollama_models()
       print(models)
       return {"models": models}
    except Exception as exc:
       raise HTTPException(
          status_code = 500,
          detail = f"모델 목록 조회 중 오류가 발생했습니다.: {exc}"
       )

# uv run main.py
if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
    )




# main.py 실행시 import 부터 마지막까지 쫙 실행됨. 필요한 함수 부분들 다 정의됨. 
# 즉, 서버 구동 중이라고 할 수 있음. 이 때, 프런트 엔드는 클라이언트가 됨.
# 프런트엔드 연결 시 프런트 엔드에서 값 등 입력하면 /chat으로 JSON을 보냄.
# 서버가 그 요청을 받아 등록해 둔 chat() 함수를 실행하고, 그 안에서 Ollama에 물어봄.
# 서버가 결과를 JSON으로 돌려주고, 프론트가 그 값을 화면에 그림.

# [프론트엔드]                [FastAPI 서버]              [Ollama 서버]
# 사용자가 질문 입력
#    │ ① POST /chat (JSON)
#    ├──────────────────────► chat() 함수 실행
#    │                          └ call_ollama_chat() ──► ② 모델이 답변 생성
#    │                                                  ◄── 답변 반환
#    │ ③ 응답 (JSON)            ◄─┘
#    ◄──────────────────────── {"model", "message", "elapsed_time"}
# 화면에 답변 표시