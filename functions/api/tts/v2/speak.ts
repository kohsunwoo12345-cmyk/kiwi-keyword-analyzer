// Ported from SUPERPLACE: POST /api/tts/v2/speak — 다중 엔진 TTS (Google / OpenAI / ElevenLabs / HuggingFace)
const PARLER_VOICE_DESC: Record<string, string> = {
  'Jon':    "Jon's voice is monotone yet slightly fast in delivery, with a very close recording that almost has no background noise.",
  'Lea':    "Lea speaks with a slightly expressive and animated voice, at a moderate speed. The recording is of very high quality.",
  'Gary':   "Gary's voice is deep and resonant, speaking at a slow and deliberate pace. Very clear audio with no background noise.",
  'Jenna':  "Jenna speaks with a clear, bright female voice at a slightly fast pace. The recording is very close and clean.",
  'Mike':   "Mike's voice is confident and authoritative, speaking at a moderate pace. High quality recording, very close microphone.",
  'Laura':  "Laura speaks softly with a warm tone, at a slightly slow pace. The recording is crisp and very close up.",
  'Rick':   "Rick has a gravelly, deep voice with a slow deliberate delivery. The recording is of very high quality.",
  'Alisa':  "Alisa speaks with a bright, energetic female voice at a fast pace. Very clear audio quality.",
  'Patrick':"Patrick speaks with a calm, measured tone at a moderate speed. Clean recording with no background noise.",
  'Rose':   "Rose has a gentle, warm female voice with a soft tone. Speaking at a slow, careful pace. High quality audio.",
  'Daniel': "Daniel speaks with a clear, professional male voice at a moderate pace. Very close recording.",
  'Olivia': "Olivia speaks with a lively, expressive female voice at a slightly fast pace. Crystal clear audio.",
  'George': "George has a deep, authoritative voice with a slow deliberate delivery. Very high quality recording.",
  'Naomi':  "Naomi speaks with a gentle, melodic female voice at a moderate speed. The recording is very close and clean.",
  'Ken':    "Ken has a bright, enthusiastic male voice with a fast-paced delivery. High quality, close microphone.",
}

function getMmsTtsModel(voiceId: string): string {
  if (voiceId.includes('/')) return voiceId

  const lp = voiceId.slice(0, 5).toLowerCase()
  const MAP: Record<string, string> = {
    'ko-kr': 'facebook/mms-tts-kor', 'ko': 'facebook/mms-tts-kor',
    'en-us': 'facebook/mms-tts-eng', 'en-gb': 'facebook/mms-tts-eng',
    'en':    'facebook/mms-tts-eng',
    'ja-jp': 'facebook/mms-tts-jpn', 'ja': 'facebook/mms-tts-jpn',
    'zh-cn': 'facebook/mms-tts-cmn', 'zh': 'facebook/mms-tts-cmn',
    'es-es': 'facebook/mms-tts-spa', 'es': 'facebook/mms-tts-spa',
    'fr-fr': 'facebook/mms-tts-fra', 'fr': 'facebook/mms-tts-fra',
    'de-de': 'facebook/mms-tts-deu', 'de': 'facebook/mms-tts-deu',
    'pt-br': 'facebook/mms-tts-por', 'pt': 'facebook/mms-tts-por',
    'hi-in': 'facebook/mms-tts-hin', 'hi': 'facebook/mms-tts-hin',
    'ru-ru': 'facebook/mms-tts-rus', 'ru': 'facebook/mms-tts-rus',
    'ar-sa': 'facebook/mms-tts-arb', 'ar': 'facebook/mms-tts-arb',
    'it-it': 'facebook/mms-tts-ita', 'it': 'facebook/mms-tts-ita',
    'tr-tr': 'facebook/mms-tts-tur', 'tr': 'facebook/mms-tts-tur',
    'vi-vn': 'facebook/mms-tts-vie', 'vi': 'facebook/mms-tts-vie',
    'th-th': 'facebook/mms-tts-tha', 'th': 'facebook/mms-tts-tha',
    'nl-nl': 'facebook/mms-tts-nld', 'nl': 'facebook/mms-tts-nld',
    'pl-pl': 'facebook/mms-tts-pol', 'pl': 'facebook/mms-tts-pol',
    'sv-se': 'facebook/mms-tts-swe', 'sv': 'facebook/mms-tts-swe',
  }
  return MAP[lp] || MAP[voiceId.slice(0, 2).toLowerCase()] || 'facebook/mms-tts-kor'
}

export const onRequestPost: PagesFunction = async ({ request, env }) => {
  const cjson = (obj: any, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })

  const traceId = Math.random().toString(36).slice(2, 10)
  const cfRay = request.headers.get('cf-ray') || 'none'
  const userIp = request.headers.get('cf-connecting-ip') || 'unknown'
  const colo = request.headers.get('cf-ipcountry') || 'unknown'
  console.log(`[TTS:ENTRY:${traceId}] cf-ray=${cfRay} ip=${userIp} country=${colo}`)
  try {
    const body = await request.json() as {
      text?: string
      voice_id?: string
      pitch?: number
      speaking_rate?: number
    }

    const text = (body.text || '').trim()
    if (!text) return cjson({ error: 'text required', traceId }, 400)

    const voiceId = (body.voice_id || 'gtts:ko-KR-Neural2-A').trim()
    const pitch = typeof body.pitch === 'number' ? body.pitch : 0
    const speakingRate = typeof body.speaking_rate === 'number' ? body.speaking_rate : 1.0

    const isGoogleVoice = voiceId.startsWith('gtts:')
    const isOpenAIVoice = voiceId.startsWith('openai:')
    const isElevenLabsVoice = voiceId.startsWith('el:')
    console.log(`[TTS] voice_id="${voiceId}" engine=${isGoogleVoice?'Google':isOpenAIVoice?'OpenAI':isElevenLabsVoice?'ElevenLabs':'HuggingFace'} textLen=${text.length}`)

    if (isOpenAIVoice) {
      const openaiKeyRaw = (env as any).OpenAI_Text_to_speech || (env as any).OPENAI_API_KEY || (env as any).OPENAI_TTS_KEY
      const openaiKey = typeof openaiKeyRaw === 'string' ? openaiKeyRaw.trim() : ''
      const openaiBaseUrl = (
        typeof (env as any).OPENAI_BASE_URL === 'string'
          ? (env as any).OPENAI_BASE_URL.trim().replace(/\/+$/, '')
          : ''
      ) || 'https://api.openai.com/v1'
      if (!openaiKey) {
        return cjson({
          error: 'OpenAI TTS API 키 미설정. Cloudflare Pages → Settings → Environment Variables에서 OpenAI_Text_to_speech 변수에 OpenAI API 키를 설정하세요.'
        }, 500)
      }
      if (!/^sk-[\w-]+$/i.test(openaiKey)) {
        console.error('[TTS:OpenAI] 키 포맷 비정상 - length=', openaiKey.length, 'prefix=', openaiKey.slice(0,6))
        return cjson({
          error: 'OpenAI_Text_to_speech 값의 형식이 올바르지 않습니다. (sk- 로 시작하는 키여야 하며 공백/개행이 없어야 합니다)'
        }, 500)
      }
      const rest = voiceId.slice(7)
      const parts = rest.split(':')
      const validModels = ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts']
      let openaiModel = 'tts-1'
      let cleanVoiceId: string
      if (parts.length >= 2 && validModels.includes(parts[0])) {
        openaiModel = parts[0]
        cleanVoiceId = parts.slice(1).join(':')
      } else {
        cleanVoiceId = rest
      }
      const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer', 'ash', 'coral', 'sage']
      const openaiVoice = validVoices.includes(cleanVoiceId) ? cleanVoiceId : 'alloy'
      const openaiSpeed = Math.max(0.25, Math.min(4.0, speakingRate))
      console.log(`[TTS:OpenAI] model="${openaiModel}" voice="${openaiVoice}" speed=${openaiSpeed} textLen=${text.length}`)

      let openaiResp: Response | null = null
      let lastErrText = ''
      let usedModel = openaiModel
      let triedFallback = false
      const maxAttempts = 5
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const bodyObj: any = {
            model: usedModel,
            input: text.slice(0, 4096),
            voice: openaiVoice,
            response_format: 'mp3',
          }
          if (usedModel !== 'gpt-4o-mini-tts') bodyObj.speed = openaiSpeed
          const ttsEndpoint = openaiBaseUrl + '/audio/speech'
          console.log(`[TTS:OpenAI] attempt=${attempt+1} endpoint=${ttsEndpoint} model=${usedModel} voice=${openaiVoice}`)
          openaiResp = await fetch(ttsEndpoint, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openaiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyObj),
          })
        } catch (fetchErr: any) {
          console.error(`[TTS:OpenAI] attempt=${attempt+1} fetch 실패: ${fetchErr?.message||fetchErr}`)
          openaiResp = null
          await new Promise(r => setTimeout(r, 500))
          continue
        }
        if (openaiResp.ok) break
        lastErrText = await openaiResp.clone().text()
        console.error(`[TTS:OpenAI] attempt=${attempt+1} model=${usedModel} status=${openaiResp.status} body=${lastErrText.slice(0,300)}`)
        if (openaiResp.status === 403) break
        if (openaiResp.status === 401) {
          if (!triedFallback && usedModel !== 'tts-1') {
            console.warn(`[TTS:OpenAI] 401 수신 → 모델 ${usedModel} → tts-1 로 폴백 후 재시도`)
            usedModel = 'tts-1'
            triedFallback = true
            await new Promise(r => setTimeout(r, 300))
            continue
          }
          if (attempt >= 2) break
          await new Promise(r => setTimeout(r, 700))
          continue
        }
        const backoff = openaiResp.status === 429 ? 800 : 400
        await new Promise(r => setTimeout(r, backoff))
      }

      if (!openaiResp || !openaiResp.ok) {
        const status = openaiResp ? openaiResp.status : 500
        let openaiErrorCode = ''
        let openaiErrorMsg = ''
        try {
          const parsed = JSON.parse(lastErrText)
          openaiErrorCode = parsed?.error?.code || parsed?.error?.type || ''
          openaiErrorMsg = parsed?.error?.message || ''
        } catch {}
        console.error(`[TTS:FAIL:${traceId}] status=${status} errorCode=${openaiErrorCode} msg=${openaiErrorMsg}`)

        if (status === 403 && openaiErrorCode === 'unsupported_country_region_territory') {
          console.warn(`[TTS:OpenAI] 403 지역 차단 — OPENAI_BASE_URL을 Cloudflare AI Gateway로 설정하면 해결됩니다. trace=${traceId}`)
        }

        if (status === 401 || status === 403) {
          return cjson({
            error: `[v2] OpenAI TTS ${status} — trace=${traceId} cfRay=${cfRay} errorCode=${openaiErrorCode||'none'}`,
            traceId,
            cfRay,
            colo,
            detail: lastErrText.slice(0, 500),
            openaiErrorCode,
            openaiErrorMsg,
            keyPreview: openaiKey.slice(0, 7) + '...' + openaiKey.slice(-4),
            keyLength: openaiKey.length,
            triedModels: triedFallback ? [openaiModel, 'tts-1'] : [openaiModel],
            requestedVoice: openaiVoice,
          }, 401, { 'X-TTS-Trace': traceId, 'X-TTS-Fail-Code': openaiErrorCode || 'unknown' })
        }
        return cjson({ error: `[v2] OpenAI TTS 오류 ${status}: ${lastErrText.slice(0, 300)}`, openaiErrorCode, openaiErrorMsg, traceId }, 502)
      }

      const audioBuf = await openaiResp.arrayBuffer()
      console.log(`[TTS] OpenAI OK voice="${openaiVoice}" speed=${openaiSpeed} bytes=${audioBuf.byteLength}`)
      if (audioBuf.byteLength === 0) {
        console.error(`[TTS:OpenAI:${traceId}] ❌ OpenAI 응답 OK지만 오디오 바이트가 0`)
        return cjson({ error: '[v2] OpenAI TTS: 오디오 데이터 없음 (빈 응답)', traceId }, 502)
      }
      const firstByte = new Uint8Array(audioBuf, 0, 1)[0]
      if (firstByte === 0x7B || firstByte === 0x5B) {
        let bodyStr = ''
        try { bodyStr = new TextDecoder().decode(audioBuf).slice(0, 200) } catch (_) {}
        console.error(`[TTS:OpenAI:${traceId}] ❌ OpenAI가 JSON을 audio로 반환: ${bodyStr}`)
        return cjson({ error: '[v2] OpenAI TTS: JSON 응답 (비 오디오)', detail: bodyStr, traceId }, 502)
      }
      return new Response(audioBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'X-TTS-Engine': `openai:${usedModel}:${openaiVoice}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0',
        },
      })

    } else if (isElevenLabsVoice) {
      const elKeyRaw = (env as any).ElevenLabs_API_KEY || (env as any).ELEVENLABS_API_KEY
      const elKey = typeof elKeyRaw === 'string' ? elKeyRaw.trim() : ''
      if (!elKey) {
        return cjson({
          error: 'ElevenLabs API 키 미설정. Cloudflare Pages → Settings → Environment Variables에서 ElevenLabs_API_KEY 변수에 ElevenLabs API 키를 설정하세요.'
        }, 500)
      }

      const elVoiceId = voiceId.slice(3)
      const elSpeed = Math.max(0.5, Math.min(2.0, speakingRate))

      const elModel = 'eleven_turbo_v2_5'
      const elPayload = {
        text: text.slice(0, 5000),
        model_id: elModel,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speed: elSpeed,
        }
      }

      console.log(`[TTS:ElevenLabs] voice_id="${elVoiceId}" model="${elModel}" speed=${elSpeed} textLen=${text.length}`)

      let elResp: Response | null = null
      let elLastErr = ''
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          elResp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elVoiceId}`, {
            method: 'POST',
            headers: {
              'xi-api-key': elKey,
              'Content-Type': 'application/json',
              'Accept': 'audio/mpeg',
            },
            body: JSON.stringify(elPayload),
          })
        } catch (fetchErr: any) {
          console.error(`[TTS:ElevenLabs] attempt=${attempt+1} fetch 실패: ${fetchErr?.message||fetchErr}`)
          elResp = null
          await new Promise(r => setTimeout(r, 500))
          continue
        }
        if (elResp.ok) break
        elLastErr = await elResp.clone().text()
        console.error(`[TTS:ElevenLabs] attempt=${attempt+1} status=${elResp.status} body=${elLastErr.slice(0,200)}`)
        if (elResp.status === 401 || elResp.status === 403) break
        await new Promise(r => setTimeout(r, 400))
      }

      if (!elResp || !elResp.ok) {
        const status = elResp ? elResp.status : 500
        if (status === 401 || status === 403) {
          return cjson({ error: `ElevenLabs API 키가 유효하지 않습니다. (${status}) ElevenLabs_API_KEY 환경변수를 확인하세요.` }, status)
        }
        return cjson({ error: `ElevenLabs TTS 오류 ${status}: ${elLastErr.slice(0, 200)}` }, 502)
      }

      const elAudioBuf = await elResp.arrayBuffer()
      if (elAudioBuf.byteLength === 0) {
        return cjson({ error: 'ElevenLabs TTS: 오디오 데이터 없음 (빈 응답)' }, 502)
      }
      console.log(`[TTS] ElevenLabs OK voice="${elVoiceId}" bytes=${elAudioBuf.byteLength}`)
      return new Response(elAudioBuf, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'X-TTS-Engine': `elevenlabs:${elModel}:${elVoiceId}`,
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0',
        },
      })

    } else if (isGoogleVoice) {
      const googleKey = (env as any).Text_to_Speech || (env as any).GOOGLE_TTS_KEY
      if (!googleKey) {
        return cjson({
          error: 'Google TTS API 키 미설정. Cloudflare Pages → Settings → Environment Variables에서 Text_to_Speech 변수에 Google Cloud TTS API 키를 설정하세요.'
        }, 500)
      }

      const cleanVoiceId = voiceId.slice(5)

      let normalizedVoiceId = cleanVoiceId
        .replace(/^zh-CN-/, 'cmn-CN-')
        .replace(/^zh-TW-/, 'cmn-TW-')

      let langCode: string
      if (normalizedVoiceId.startsWith('cmn-')) {
        langCode = 'cmn-CN'
      } else {
        const parts = normalizedVoiceId.split('-')
        langCode = parts[0] + '-' + parts[1]
      }

      const googlePayload = {
        input: { text: text.slice(0, 5000) },
        voice: {
          languageCode: langCode,
          name: normalizedVoiceId,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          pitch: Math.max(-20, Math.min(20, pitch)),
          speakingRate: Math.max(0.25, Math.min(4.0, speakingRate)),
        },
      }

      const googleResp = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(googlePayload),
        }
      )

      if (!googleResp.ok) {
        const errText = await googleResp.text()
        console.error('Google TTS error:', googleResp.status, errText)
        if (googleResp.status === 400) {
          return cjson({ error: `Google TTS 음성 오류: "${cleanVoiceId}" → ${errText.slice(0, 200)}` }, 400)
        }
        if (googleResp.status === 401 || googleResp.status === 403) {
          return cjson({ error: 'Google TTS API 키가 유효하지 않습니다. Text_to_Speech 환경변수 값을 확인하세요.' }, 401)
        }
        return cjson({ error: `Google TTS 오류 ${googleResp.status}` }, 502)
      }

      const googleData = await googleResp.json() as { audioContent?: string }
      if (!googleData.audioContent) {
        return cjson({ error: 'Google TTS: 오디오 데이터 없음' }, 502)
      }

      const binaryStr = atob(googleData.audioContent)
      const bytes = new Uint8Array(binaryStr.length)
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)

      console.log(`[TTS] Google OK voice="${normalizedVoiceId}" lang="${langCode}" bytes=${bytes.length}`)
      if (bytes.length === 0) {
        return cjson({ error: '[v2] Google TTS: 오디오 데이터 없음 (빈 응답)', traceId }, 502)
      }
      return new Response(bytes.buffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0',
        },
      })

    } else {
      const hfToken = (env as any).HF_TOKEN
      if (!hfToken) {
        return cjson({
          error: 'HF_TOKEN 환경변수 미설정. Cloudflare Pages → Settings → Environment Variables에서 HF_TOKEN을 HuggingFace API 토큰으로 설정하세요.'
        }, 500)
      }

      const cleanVoiceId = voiceId.startsWith('hf:') ? voiceId.slice(3) : voiceId

      const isParlerVoice = PARLER_VOICE_DESC.hasOwnProperty(cleanVoiceId)
        || cleanVoiceId.startsWith('parler:')

      if (isParlerVoice) {
        const speakerName = cleanVoiceId.startsWith('parler:') ? cleanVoiceId.slice(7) : cleanVoiceId
        const description = PARLER_VOICE_DESC[speakerName]
          || `${speakerName}'s voice is clear and natural with a moderate pace. Very high quality recording.`

        const hfUrl = 'https://router.huggingface.co/hf-inference/models/parler-tts/parler-tts-mini-v1'

        const hfResp = await fetch(hfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'Accept': 'audio/wav,audio/flac,audio/*',
          },
          body: JSON.stringify({
            inputs: text.slice(0, 300),
            parameters: { description },
          }),
        })

        if (!hfResp.ok) {
          const errText = await hfResp.text()
          console.error('Parler TTS error:', hfResp.status, errText)
          if (hfResp.status === 503) {
            return cjson({ error: '🔄 HuggingFace 모델 로딩 중... 20~30초 후 다시 시도하세요' }, 503)
          }
          if (hfResp.status === 401 || hfResp.status === 403) {
            return cjson({ error: 'HF_TOKEN이 유효하지 않습니다.' }, 401)
          }
          return cjson({ error: `Parler TTS 오류 ${hfResp.status}: ${errText.slice(0, 150)}` }, 502)
        }

        const audioBuf = await hfResp.arrayBuffer()
        const ct = hfResp.headers.get('content-type') || 'audio/wav'
        console.log(`[TTS] Parler OK speaker="${speakerName}" bytes=${audioBuf.byteLength}`)

        return new Response(audioBuf, {
          status: 200,
          headers: {
            'Content-Type': ct,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0',
            'Content-Length': String(audioBuf.byteLength),
          },
        })

      } else {
        const modelId = getMmsTtsModel(cleanVoiceId)
        console.log(`[TTS] MMS voice_id="${cleanVoiceId}" model="${modelId}"`)
        const hfUrl = `https://router.huggingface.co/hf-inference/models/${modelId}`

        const hfResp = await fetch(hfUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
            'Accept': 'audio/flac,audio/wav,audio/*',
          },
          body: JSON.stringify({ inputs: text.slice(0, 500) }),
        })

        if (!hfResp.ok) {
          const errText = await hfResp.text()
          console.error('MMS TTS error:', hfResp.status, errText)
          if (hfResp.status === 503) {
            return cjson({ error: '🔄 HuggingFace 모델 로딩 중... 잠시 후 다시 시도하세요' }, 503)
          }
          if (hfResp.status === 401 || hfResp.status === 403) {
            return cjson({ error: 'HF_TOKEN이 유효하지 않습니다.' }, 401)
          }
          return cjson({ error: `MMS TTS 오류 ${hfResp.status}: ${errText.slice(0, 150)}` }, 502)
        }

        const audioBuf = await hfResp.arrayBuffer()
        const ct = hfResp.headers.get('content-type') || 'audio/flac'
        console.log(`[TTS] MMS OK model="${modelId}" bytes=${audioBuf.byteLength}`)

        return new Response(audioBuf, {
          status: 200,
          headers: {
            'Content-Type': ct,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0',
            'Content-Length': String(audioBuf.byteLength),
          },
        })
      }
    }
  } catch (e: any) {
    console.error('TTS route error:', e)
    return cjson({ error: 'TTS 처리 중 오류가 발생했습니다.' }, 500)
  }
}
