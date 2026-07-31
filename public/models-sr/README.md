# 빠른 초해상 모델 (rdn-medium-x4.onnx)

"화질 올리기 · 빠르게" 에서 쓰는 가벼운 초해상 모델이다.
기본(최고 화질)은 Real-ESRGAN 계열을 그대로 쓰고, 이 파일은 사용자가 "빠르게" 를 고를 때만 받는다.

## 출처
UpscalerJS 의 `@upscalerjs/esrgan-medium@1.0.0` (MIT, © 2022 Kevin Scott)
https://github.com/thekevinscott/upscaler — RDN ×4, 파라미터 704,611
라이선스 전문: LICENSE-esrgan-medium.txt

## 왜 우리가 직접 올려 두나
원본은 TensorFlow.js 형식이라 우리 실행기(onnxruntime-web)로는 못 돌린다.
model.json 의 그래프와 가중치를 읽어 ONNX 로 옮겼다(Conv2D·ReLU·Concatenate·Add·UpSampling2D →
Conv·Relu·Concat·Add·Resize). 외부에서 받아오지 않고 우리 서버에서 바로 주므로,
외부 저장소가 죽어도 이 기능은 계속 동작한다.

## 그래프 안에 넣어 둔 것
원본은 0~255 를 받고 0~255 를 내놓는데 우리 파이프라인은 0~1 을 주고받는다.
제품 코드를 갈라지게 두지 않으려고 입력 ×255 · 출력 ÷255 · Clip(0,1) 을 그래프에 넣었다.
그래서 기본 모델과 같은 방식으로 호출된다.

## 옮긴 게 맞는지
같은 입력을 원본(tfjs)과 이 파일(onnxruntime-web)에 넣어 픽셀로 대조했다 —
평균 0.0000/255 · 최대 0.000/255 로 완전히 같다.

## 화질·속도 (정답을 놓고 측정, 4배 축소 → 4배 복원)
                  파라미터      시간      PSNR      SSIM
  모델 없이 늘림          —        —   16.35dB   0.5523
  이 파일(medium)   704,611   10배 빠름  17.07dB   0.6369
  기본(thick 급)  7,260,740     1.00배  17.09dB   0.6627
PSNR 은 0.02dB 차이로 사실상 같고, SSIM 이 0.026 낮다(미세한 질감 차이).
