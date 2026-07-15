// ─────────────────────────────────────────────────────────────
//  SUPERVIDEO 5.0  -  숏폼/비디오스튜/유튜브/릴스 스타일 원클릭 영상 제작기
//  ① 템플릿 선택 (30개+ 고퀄리티 프리셋 - 숏폼/VideoStudio/유튜브/릴스 호환)
//  ② 대본 입력 or AI 자동 생성
//  ③ 원클릭 "영상 만들기" → 씬마다 Picsum/Unsplash 사진 자동 매칭
//  ④ 목소리: 100개+ (언어/피치/속도 조합으로 실제 다른 소리)
//  ⑤ BGM 200개+ 장르별
//  ⑥ 편집 옵션: 트랜지션 30+, 필터 25+, 자막 20+, 광고/홍보 기능
//  ⑦ 갤러리: 제작한 영상 저장 및 관리
//  ⑧ MediaRecorder WebM 안정 다운로드
// ─────────────────────────────────────────────────────────────

export const videoMakerPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>🎬 영상 제작 - BYGENCY</title>
  <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;500;600;700;800;900&family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    .tw{display:inline-block;vertical-align:middle;pointer-events:none;user-select:none;width:14px;height:14px;flex-shrink:0;}
    :root{
      --primary:#2563eb;--primary-light:#3b82f6;--primary-dark:#1d4ed8;
      --accent:#2563eb;--accent2:#3b82f6;
      --bg:#f6f7f9;--surface:#ffffff;--surface2:#f1f3f6;
      --border:#e5e7eb;--border2:#d0d5dd;
      --text:#0f172a;--text2:#1e293b;--text3:#64748b;--text4:#94a3b8;
      --success:#0ea472;--warning:#f59e0b;--danger:#f43f5e;
      --shadow:0 1px 3px rgba(15,23,42,.06),0 4px 14px rgba(15,23,42,.05);
      --shadow-lg:0 8px 32px rgba(15,23,42,.12);
      --shadow-xl:0 16px 48px rgba(15,23,42,.16);
    }
    html,body{height:100%;overflow:hidden}
    body{font-family:'Pretendard','Noto Sans KR',sans-serif;background:var(--bg);color:var(--text);font-size:13px}

    /* ── TOP BAR ── */
    .tb{
      display:flex;align-items:center;gap:10px;
      padding:0 22px;height:58px;
      background:#14161d;
      position:relative;z-index:50;
      box-shadow:0 1px 0 rgba(255,255,255,.04),0 2px 14px rgba(0,0,0,.16);
      border-bottom:1px solid rgba(255,255,255,.06);
    }
    .tb::after{ content:none; }
    .tb>*{position:relative;z-index:1}
    .tb-logo{font-size:17px;font-weight:900;color:#fff;white-space:nowrap;letter-spacing:-.4px;text-shadow:0 1px 4px rgba(0,0,0,.18)}
    .tb-logo span{font-size:12px;font-weight:500;opacity:.8;margin-left:6px;letter-spacing:.2px}
    .tb-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700;letter-spacing:.3px}
    .tb-back{
      padding:7px 16px;background:rgba(255,255,255,.16);border:1.5px solid rgba(255,255,255,.3);
      color:#fff;border-radius:10px;cursor:pointer;font-size:11px;font-weight:700;
      font-family:inherit;transition:all .18s;white-space:nowrap;backdrop-filter:blur(6px);
    }
    .tb-back:hover{background:rgba(255,255,255,.28);transform:translateY(-1px);box-shadow:0 3px 12px rgba(0,0,0,.12)}
    .tb-gallery-btn{
      padding:8px 18px;
      background:rgba(255,255,255,.95);
      border:none;color:var(--primary);border-radius:10px;cursor:pointer;font-size:11px;font-weight:800;
      font-family:inherit;margin-left:auto;transition:all .18s;white-space:nowrap;
      box-shadow:0 3px 12px rgba(0,0,0,.15);letter-spacing:.1px;
    }
    .tb-gallery-btn:hover{background:#fff;box-shadow:0 6px 20px rgba(0,0,0,.2);transform:translateY(-1px)}
    .tb-status{
      font-size:10px;color:rgba(255,255,255,.95);background:rgba(255,255,255,.16);
      padding:4px 13px;border-radius:20px;border:1px solid rgba(255,255,255,.28);
      white-space:nowrap;font-weight:600;backdrop-filter:blur(6px);
    }

    /* ── MAIN LAYOUT ── */
    .app{
      display:grid;grid-template-columns:390px 1fr;
      height:calc(100vh - 58px);
      overflow:hidden;
    }

    /* ── LEFT PANEL ── */
    .lp{
      background:#fff;border-right:1.5px solid var(--border);
      display:flex;flex-direction:column;overflow:hidden;
      box-shadow:2px 0 18px rgba(37,99,235,.07);
    }

    /* ── STEP TABS ── */
    .ltabs{
      display:flex;background:var(--surface2);border-bottom:1.5px solid var(--border);
      flex-shrink:0;overflow-x:auto;scrollbar-width:none;
      position:relative;z-index:10;
    }
    .ltabs::-webkit-scrollbar{display:none}
    .ltab{
      flex:1;min-width:52px;padding:12px 4px 9px;text-align:center;
      font-size:9px;font-weight:700;color:var(--text4);cursor:pointer;
      transition:all .18s;border-bottom:3px solid transparent;
      white-space:nowrap;letter-spacing:.2px;
      user-select:none;-webkit-user-select:none;
      position:relative;z-index:10;
    }
    .ltab:hover{color:var(--primary);background:rgba(37,99,235,.06)}
    .ltab.on{color:var(--primary);border-bottom-color:var(--primary);background:#fff;font-weight:900;box-shadow:inset 0 -2px 0 var(--primary)}
    .ltab-panel{display:none;flex-direction:column;position:relative}
    .ltab-panel.on{display:flex;flex:1;min-height:0;overflow:hidden}
    .lp-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:0;min-height:0}
    .lp-sec{padding:16px 16px;border-bottom:1px solid var(--border)}
    .lp-title{
      font-size:10px;font-weight:800;color:var(--text3);
      letter-spacing:.7px;text-transform:uppercase;margin-bottom:12px;
      display:flex;align-items:center;gap:7px;
    }
    .lp-title::before{content:'';width:3px;height:13px;background:linear-gradient(180deg,var(--primary),var(--accent));border-radius:2px;flex-shrink:0}

    /* ── FORMAT SELECTOR ── */
    .fmt-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
    .fo{
      padding:13px 4px;background:#fff;border:2px solid var(--border);
      border-radius:13px;text-align:center;cursor:pointer;transition:all .2s;
      font-size:9px;font-weight:800;color:var(--text3);
      user-select:none;-webkit-user-select:none;
      box-shadow:0 1px 4px rgba(37,99,235,.06);
    }
    .fo:hover{border-color:var(--primary-light);color:var(--primary);background:rgba(37,99,235,.04);transform:translateY(-1px)}
    .fo.on{border-color:var(--primary);background:linear-gradient(145deg,rgba(37,99,235,.08),rgba(37,99,235,.08));color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.12),0 3px 12px rgba(37,99,235,.1)}
    .fo-ico{font-size:22px;display:block;margin-bottom:5px}
    .dur-row{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}
    .dc{
      padding:5px 11px;background:var(--surface2);border:1.5px solid var(--border);
      border-radius:8px;font-size:10px;font-weight:700;color:var(--text3);
      cursor:pointer;transition:all .15s;user-select:none;
    }
    .dc:hover{border-color:var(--primary-light);color:var(--primary)}
    .dc.on{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}

    /* ── TEMPLATE GRID ── */
    .tpl-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:14px}
    .tc{
      border:2px solid var(--border);border-radius:14px;overflow:hidden;
      cursor:pointer;transition:all .22s cubic-bezier(.34,1.56,.64,1);background:#fff;position:relative;
      box-shadow:0 2px 8px rgba(37,99,235,.07);
    }
    .tc:hover{border-color:var(--primary-light);box-shadow:0 8px 28px rgba(37,99,235,.2);transform:translateY(-4px) scale(1.01)}
    .tc.on{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.18),0 8px 28px rgba(37,99,235,.22)}
    .tc-preview{height:95px;position:relative;overflow:hidden;border-radius:10px 10px 0 0;pointer-events:none}
    .tc-badge{
      position:absolute;top:6px;right:6px;padding:2px 7px;border-radius:5px;
      font-size:8px;font-weight:800;letter-spacing:.3px;z-index:1;
    }
    .tc-check{
      position:absolute;top:6px;left:6px;width:22px;height:22px;
      background:var(--primary);border-radius:50%;display:none;
      align-items:center;justify-content:center;font-size:11px;color:#fff;z-index:2;
      box-shadow:0 2px 6px rgba(37,99,235,.4);
    }
    .tc.on .tc-check{display:flex}
    .tc-info{padding:8px 10px 10px}
    .tc-name{font-size:10px;font-weight:800;color:var(--text);margin-bottom:2px}
    .tc-cat{font-size:9px;color:var(--text4);font-weight:500}
    .tc-use{
      display:inline-flex;align-items:center;justify-content:center;gap:3px;
      margin-top:7px;padding:6px 0;width:100%;
      background:linear-gradient(135deg,var(--primary),var(--accent));
      border:none;color:#fff;
      border-radius:8px;font-size:9px;font-weight:800;cursor:pointer;font-family:inherit;
      transition:all .18s;box-shadow:0 2px 8px rgba(37,99,235,.25);
    }
    .tc-use:hover{box-shadow:0 4px 14px rgba(37,99,235,.4);transform:translateY(-1px)}
    .tc-use:active{transform:translateY(0)}

    /* ── SCRIPT TABS ── */
    .script-mode-tabs{
      display:flex;gap:0;border:1.5px solid var(--border);border-radius:11px;
      overflow:hidden;margin-bottom:14px;
      box-shadow:0 1px 4px rgba(37,99,235,.06);
    }
    .smt{
      flex:1;padding:8px 4px;text-align:center;font-size:10px;font-weight:800;
      color:var(--text3);cursor:pointer;transition:all .15s;background:#fff;
      user-select:none;-webkit-user-select:none;
    }
    .smt:not(:last-child){border-right:1px solid var(--border)}
    .smt:hover{color:var(--primary);background:rgba(37,99,235,.05)}
    .smt.on{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff}

    /* ── AI BOX ── */
    .ai-box{
      background:linear-gradient(135deg,rgba(37,99,235,.07),rgba(139,92,246,.07));
      border:1.5px solid rgba(37,99,235,.22);border-radius:14px;padding:16px;
    }
    .ai-box label{font-size:10px;font-weight:800;color:var(--text2);display:block;margin-bottom:6px}
    .ai-box input,.ai-box select,.ai-box textarea{
      width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:9px;
      font-size:12px;font-family:inherit;background:#fff;color:var(--text);
      outline:none;transition:border-color .15s;
    }
    .ai-box input:focus,.ai-box select:focus,.ai-box textarea:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
    .tone-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:5px}
    .tone-btn{
      padding:8px 5px;background:#fff;border:1.5px solid var(--border);
      border-radius:9px;text-align:center;cursor:pointer;transition:all .15s;
      font-size:10px;font-weight:700;color:var(--text3);
      user-select:none;-webkit-user-select:none;
    }
    .tone-btn:hover{border-color:var(--primary-light);color:var(--primary);background:rgba(37,99,235,.05)}
    .tone-btn.on{background:var(--primary);border-color:var(--primary);color:#fff}
    .cnt-row{display:flex;gap:5px;margin-top:6px;flex-wrap:wrap}
    .cnt-btn{
      padding:5px 12px;background:#fff;border:1.5px solid var(--border);border-radius:8px;
      font-size:10px;font-weight:700;color:var(--text3);cursor:pointer;transition:all .15s;
      user-select:none;
    }
    .cnt-btn:hover{border-color:var(--primary-light);color:var(--primary)}
    .cnt-btn.on{background:var(--primary);border-color:var(--primary);color:#fff}

    /* ── SCENE CARDS ── */
    .scene-cards{display:flex;flex-direction:column;gap:9px}
    .sc-card{
      background:#fff;border:1.5px solid var(--border);border-radius:12px;
      overflow:hidden;transition:border-color .15s;box-shadow:0 1px 4px rgba(0,0,0,.04);
    }
    .sc-card.active{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
    .sc-hd{
      display:flex;align-items:center;gap:8px;padding:10px 13px;
      background:var(--surface2);cursor:pointer;
      user-select:none;-webkit-user-select:none;
    }
    .sc-num{
      width:24px;height:24px;border-radius:50%;
      background:linear-gradient(135deg,var(--primary),var(--accent));
      color:#fff;font-size:9px;font-weight:900;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .sc-title-txt{flex:1;font-size:11px;font-weight:700;color:var(--text);min-width:0}
    .sc-dur-badge{
      font-size:9px;background:rgba(37,99,235,.12);color:var(--primary);
      padding:2px 8px;border-radius:6px;font-weight:800;flex-shrink:0;
    }
    .sc-del{
      width:22px;height:22px;border-radius:6px;background:transparent;
      border:1px solid var(--border);color:var(--text4);cursor:pointer;
      font-size:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
      transition:all .15s;
    }
    .sc-del:hover{background:var(--danger);border-color:var(--danger);color:#fff}
    .sc-body{padding:12px 13px;display:none}
    .sc-card.open .sc-body{display:block}
    .sc-field label{font-size:9px;font-weight:800;color:var(--text3);display:block;margin-bottom:4px;letter-spacing:.3px;text-transform:uppercase}
    .sc-field{margin-bottom:9px}
    .sc-field input,.sc-field textarea,.sc-field select{
      width:100%;padding:8px 11px;border:1.5px solid var(--border);border-radius:8px;
      font-size:11px;font-family:inherit;background:#fff;color:var(--text);
      outline:none;transition:border-color .15s;resize:none;
    }
    .sc-field input:focus,.sc-field textarea:focus,.sc-field select:focus{border-color:var(--primary)}
    .sc-meta{display:flex;gap:5px;margin-top:8px;align-items:center;flex-wrap:wrap}
    .sc-img-thumb{
      width:46px;height:46px;border-radius:8px;object-fit:cover;
      border:1.5px solid var(--border);cursor:pointer;flex-shrink:0;
    }
    .sc-img-btn{
      flex:1;padding:7px 10px;background:var(--surface2);border:1.5px dashed var(--border);
      border-radius:8px;color:var(--text4);cursor:pointer;font-size:10px;
      font-weight:600;font-family:inherit;transition:all .15s;text-align:center;
    }
    .sc-img-btn:hover{border-color:var(--primary);color:var(--primary);background:rgba(37,99,235,.05)}
    .sc-trans-sel{
      width:100%;padding:6px 10px;border:1.5px solid var(--border);border-radius:8px;
      font-size:10px;font-family:inherit;background:#fff;color:var(--text);
      outline:none;cursor:pointer;
    }
    .sc-trans-sel:focus{border-color:var(--primary)}
    /* 씬 더블클릭 편집 하이라이트 */
    .sc-ta:focus{background:rgba(37,99,235,.03);border-color:var(--primary)}
    /* 전환효과 미리보기 overlay */
    #trans-overlay{
      position:absolute;inset:0;pointer-events:none;z-index:10;
      border-radius:inherit;overflow:hidden;
    }
    .add-sc{
      display:flex;align-items:center;justify-content:center;gap:5px;width:100%;
      padding:11px;border:2px dashed var(--border);border-radius:11px;
      background:transparent;color:var(--text4);cursor:pointer;font-size:11px;
      font-weight:700;font-family:inherit;transition:all .15s;margin-top:7px;
    }
    .add-sc:hover{border-color:var(--primary);color:var(--primary);background:rgba(37,99,235,.05)}

    /* ── VOICE / BGM ── */
    .v-filters,.bgm-filters{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
    .vf,.bf{
      padding:5px 11px;background:#fff;border:1.5px solid var(--border);
      border-radius:20px;font-size:10px;font-weight:700;color:var(--text3);
      cursor:pointer;transition:all .15s;user-select:none;
    }
    .vf:hover,.bf:hover{border-color:var(--primary-light);color:var(--primary)}
    .vf.on,.bf.on{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.25)}
    .v-search,.bgm-search{
      width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:10px;
      font-size:11px;font-family:inherit;background:#fff;color:var(--text);
      outline:none;transition:border-color .15s;margin-bottom:10px;
    }
    .v-search:focus,.bgm-search:focus{border-color:var(--primary);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
    .v-list,.bgm-list{
      display:flex;flex-direction:column;gap:5px;max-height:300px;overflow-y:auto;
    }
    .vi{
      display:flex;align-items:center;gap:9px;padding:9px 12px;
      background:#fff;border:1.5px solid var(--border);border-radius:11px;
      cursor:pointer;transition:all .15s;
    }
    .vi:hover{border-color:var(--primary-light);background:rgba(37,99,235,.04);transform:translateX(2px)}
    .vi.on{border-color:var(--primary);background:rgba(37,99,235,.07);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
    .vi-ico{
      width:32px;height:32px;border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:14px;flex-shrink:0;color:#fff;
    }
    .vi-info{flex:1;min-width:0}
    .vi-name{font-size:10px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .vi-desc{font-size:9px;color:var(--text4)}
    .vi-play{
      width:28px;height:28px;border-radius:50%;background:var(--surface2);
      border:1.5px solid var(--border);color:var(--text3);cursor:pointer;
      font-size:10px;display:flex;align-items:center;justify-content:center;
      flex-shrink:0;font-family:inherit;transition:all .15s;
    }
    .vi-play:hover{background:var(--primary);border-color:var(--primary);color:#fff}
    .vc-row{display:flex;align-items:center;gap:9px;margin-top:8px}
    .vc-lbl{font-size:9px;color:var(--text4);min-width:36px;font-weight:700}
    .vc-val{font-size:9px;color:var(--primary);min-width:30px;text-align:right;font-weight:800}
    .bi{
      display:flex;align-items:center;gap:9px;padding:9px 12px;
      background:#fff;border:1.5px solid var(--border);border-radius:11px;
      cursor:pointer;transition:all .15s;
    }
    .bi:hover{border-color:var(--primary-light);background:rgba(37,99,235,.04);transform:translateX(2px)}
    .bi.on{border-color:var(--primary);background:rgba(37,99,235,.07);box-shadow:0 0 0 3px rgba(37,99,235,.1)}
    .bi-ico{font-size:17px;flex-shrink:0}
    .bi-info{flex:1;min-width:0}
    .bi-name{font-size:10px;font-weight:700;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bi-meta{font-size:9px;color:var(--text4)}
    .bi-play{
      width:28px;height:28px;border-radius:50%;background:var(--surface2);
      border:1.5px solid var(--border);color:var(--text3);cursor:pointer;
      font-size:10px;display:flex;align-items:center;justify-content:center;
      flex-shrink:0;font-family:inherit;transition:all .15s;
    }
    .bi-play:hover{background:var(--primary);border-color:var(--primary);color:#fff}

    /* ── BUTTONS ── */
    .btn{
      display:inline-flex;align-items:center;gap:6px;
      padding:8px 16px;border-radius:10px;border:none;
      font-size:11px;font-weight:800;cursor:pointer;font-family:inherit;
      transition:all .18s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;
    }
    .btn-p{background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;box-shadow:0 2px 10px rgba(37,99,235,.32)}
    .btn-p:hover{box-shadow:0 5px 20px rgba(37,99,235,.44);transform:translateY(-1px)}
    .btn-s{background:#fff;color:var(--text2);border:1.5px solid var(--border);box-shadow:0 1px 4px rgba(37,99,235,.06)}
    .btn-s:hover{border-color:var(--primary-light);color:var(--primary);background:rgba(37,99,235,.04);transform:translateY(-1px)}
    .btn-g{background:linear-gradient(135deg,var(--success),#059669);color:#fff;box-shadow:0 2px 10px rgba(14,164,114,.3)}
    .btn-g:hover{box-shadow:0 5px 18px rgba(14,164,114,.4);transform:translateY(-1px)}
    .btn-r{background:var(--danger);color:#fff}
    .btn-sm{padding:6px 12px;font-size:10px;border-radius:8px}

    /* ── SCENE NAV ── */
    .scene-nav{display:flex;gap:4px;flex-wrap:wrap;align-items:center}
    .sn{
      width:30px;height:30px;border-radius:8px;
      background:var(--surface2);border:1.5px solid var(--border);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:800;color:var(--text4);cursor:pointer;
      transition:all .15s;position:relative;
    }
    .sn:hover{border-color:var(--primary-light);color:var(--primary);background:rgba(37,99,235,.06)}
    .sn.cur{background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 2px 8px rgba(37,99,235,.3)}
    .sn.has-img::after{
      content:'';position:absolute;bottom:2px;right:2px;
      width:5px;height:5px;background:var(--success);border-radius:50%;
    }

    /* ── RIGHT PANEL ── */
    .rp{
      background:linear-gradient(160deg,#f2f5ff 0%,#eaedff 60%,#f0f0ff 100%);
      display:flex;flex-direction:column;overflow:hidden;
    }
    .rp-top{
      display:flex;align-items:center;gap:6px;padding:11px 18px;
      background:rgba(255,255,255,.95);border-bottom:1.5px solid var(--border);flex-wrap:wrap;flex-shrink:0;
      box-shadow:0 2px 10px rgba(37,99,235,.07);backdrop-filter:blur(8px);
    }
    .rp-canvas-wrap{
      flex:1;display:flex;align-items:center;justify-content:center;
      overflow:hidden;padding:20px;min-height:0;
    }
    .canvas-outer{
      display:inline-block;
      box-shadow:0 16px 56px rgba(37,99,235,.25),0 4px 16px rgba(0,0,0,.1),0 0 0 1px rgba(37,99,235,.1);
      border-radius:18px;overflow:visible;
    }
    #pv{ border-radius:18px; }
    .rp-bottom{
      padding:15px 18px;background:rgba(255,255,255,.95);border-top:1.5px solid var(--border);flex-shrink:0;
      box-shadow:0 -2px 10px rgba(37,99,235,.07);backdrop-filter:blur(8px);
    }

    /* ── MAKE BUTTON ── */
    .make-btn{
      width:100%;padding:18px;
      background:linear-gradient(135deg,#1d4ed8 0%,#2563eb 100%);
      color:#fff;border:none;border-radius:14px;
      font-size:17px;font-weight:900;cursor:pointer;font-family:inherit;
      transition:all .28s cubic-bezier(.34,1.56,.64,1);
      box-shadow:0 8px 28px rgba(37,99,235,.48),0 2px 6px rgba(37,99,235,.3);
      letter-spacing:.3px;position:relative;overflow:hidden;
    }
    .make-btn::after{
      content:'';position:absolute;inset:0;
      background:linear-gradient(180deg,rgba(255,255,255,.12) 0%,transparent 100%);
      pointer-events:none;
    }
    .make-btn:hover{box-shadow:0 14px 42px rgba(37,99,235,.62),0 4px 12px rgba(37,99,235,.35);transform:translateY(-3px) scale(1.005)}
    .make-btn:active{transform:translateY(0) scale(0.997);box-shadow:0 4px 16px rgba(37,99,235,.35)}
    .make-btn:disabled{opacity:.6;cursor:not-allowed;transform:none;box-shadow:0 4px 14px rgba(37,99,235,.25)}

    /* ── PROGRESS BOX ── */
    .prog-box{background:linear-gradient(145deg,rgba(37,99,235,.05),rgba(37,99,235,.05));border:1.5px solid rgba(37,99,235,.15);border-radius:16px;padding:18px}
    .prog-title{font-size:13px;font-weight:800;color:var(--text);margin-bottom:7px}
    .prog-pct{font-size:28px;font-weight:900;color:var(--primary);margin-bottom:5px}
    .prog-bar-bg{width:100%;height:9px;background:rgba(37,99,235,.1);border-radius:5px;overflow:hidden;margin-bottom:7px}
    .prog-bar{height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));border-radius:5px;transition:width .3s;box-shadow:0 0 8px rgba(37,99,235,.3)}
    .prog-scene{font-size:10px;color:var(--text3);margin-bottom:3px}
    .prog-log{font-size:9px;color:var(--text4);max-height:50px;overflow-y:auto}

    /* ── RESULT BOX ── */
    .result-box{text-align:center}
    .result-video{width:100%;max-height:220px;border-radius:12px;margin-top:10px;border:2px solid var(--border);box-shadow:0 4px 20px rgba(37,99,235,.15)}

    /* ── EDITING OPTIONS ── */
    .ed-section{margin-bottom:16px}
    .ed-section-title{font-size:10px;font-weight:800;color:var(--text3);margin-bottom:8px;display:flex;align-items:center;gap:5px;letter-spacing:.5px;text-transform:uppercase}
    .ed-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:4px}
    .ed-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:5px;margin-bottom:4px}
    .ed-tab{padding:5px 9px;background:var(--surface2);border:1.5px solid var(--border);border-radius:8px;font-size:9px;font-weight:700;color:var(--text4);cursor:pointer;font-family:inherit;transition:all .15s;white-space:nowrap}
    .ed-tab:hover{border-color:var(--primary-light);color:var(--primary)}
    .ed-tab.on{background:var(--primary);border-color:var(--primary);color:#fff}
    .ed-panel{animation:fadeIn .15s ease}
    .ed-opt{
      background:#fff;border:1.5px solid var(--border);border-radius:10px;
      padding:8px 9px;cursor:pointer;transition:all .15s;text-align:center;
      user-select:none;
    }
    .ed-opt:hover{border-color:var(--primary-light);background:rgba(37,99,235,.05)}
    .ed-opt.on{border-color:var(--primary);background:rgba(37,99,235,.09);box-shadow:0 0 0 2px rgba(37,99,235,.15)}
    .ed-opt-ico{font-size:17px;display:block;margin-bottom:3px}
    .ed-opt-name{font-size:9px;color:var(--text3);font-weight:600;line-height:1.2}
    .ed-opt.on .ed-opt-name{color:var(--primary);font-weight:700}
    .ed-slider-row{display:flex;align-items:center;gap:9px;margin:7px 0}
    .ed-slider-lbl{font-size:9px;color:var(--text4);min-width:40px;flex-shrink:0;font-weight:700}
    .ed-slider-val{font-size:9px;color:var(--primary);min-width:32px;text-align:right;flex-shrink:0;font-weight:800}
    input[type=range]{flex:1;accent-color:var(--primary)}
    .sub-style-row{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:7px}
    .ss{
      padding:5px 11px;background:#fff;border:1.5px solid var(--border);
      border-radius:8px;font-size:9px;font-weight:700;color:var(--text4);
      cursor:pointer;transition:all .15s;user-select:none;
    }
    .ss:hover{border-color:var(--primary-light);color:var(--primary)}
    .ss.on{background:var(--primary);border-color:var(--primary);color:#fff}

    /* ── GALLERY MODAL ── */
    .gallery-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 16px}
    .gv-card{
      background:#fff;border:1.5px solid var(--border);border-radius:14px;
      overflow:hidden;cursor:pointer;transition:all .2s;box-shadow:var(--shadow);
    }
    .gv-card:hover{border-color:var(--primary);transform:translateY(-3px);box-shadow:var(--shadow-lg)}
    .gv-thumb{width:100%;aspect-ratio:9/16;background:var(--surface2);position:relative;overflow:hidden}
    .gv-thumb-long{aspect-ratio:16/9}
    .gv-thumb-sq{aspect-ratio:1/1}
    .gv-thumb canvas{width:100%;height:100%;object-fit:cover}
    .gv-play-ico{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      width:40px;height:40px;background:rgba(37,99,235,.88);border-radius:50%;
      display:flex;align-items:center;justify-content:center;font-size:17px;color:#fff;
      box-shadow:0 4px 12px rgba(37,99,235,.4);
    }
    .gv-info{padding:10px 12px 5px}
    .gv-name{font-size:10px;font-weight:800;color:var(--text);margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .gv-meta{font-size:9px;color:var(--text4)}
    .gv-actions{display:flex;gap:5px;padding:5px 12px 12px}
    .gv-btn{
      flex:1;padding:6px;background:var(--surface2);border:1.5px solid var(--border);
      color:var(--text3);border-radius:8px;cursor:pointer;font-size:9px;
      font-weight:800;font-family:inherit;transition:all .15s;
    }
    .gv-btn:hover{background:var(--primary);border-color:var(--primary);color:#fff}
    .gallery-empty{text-align:center;padding:48px 16px;color:var(--text4)}
    .gallery-empty-ico{font-size:42px;margin-bottom:12px}
    .gallery-empty-txt{font-size:11px;line-height:1.8;color:var(--text3)}

    /* ── PLATFORM FILTER ── */


    /* ── CANVAS LABEL ── */
    .canvas-lbl{
      text-align:center;margin-top:10px;font-size:10px;color:var(--text3);
      background:rgba(255,255,255,.9);padding:4px 12px;border-radius:20px;
      display:inline-block;backdrop-filter:blur(8px);font-weight:600;
      box-shadow:0 2px 8px rgba(37,99,235,.1);
    }

    /* ── TOAST ── */
    .toast{
      position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(90px);
      background:linear-gradient(135deg,rgba(15,18,45,.94),rgba(30,25,60,.94));color:#fff;padding:12px 26px;border-radius:32px;
      font-size:12px;font-weight:700;z-index:9999;transition:transform .38s cubic-bezier(.34,1.56,.64,1),opacity .25s;
      pointer-events:none;backdrop-filter:blur(12px);white-space:nowrap;
      box-shadow:0 10px 32px rgba(0,0,0,.28),0 0 0 1px rgba(255,255,255,.06);
      opacity:0;
    }
    .toast.show{transform:translateX(-50%) translateY(0);opacity:1}

    /* ── SCROLLBAR ── */
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(37,99,235,.25);border-radius:3px}
    ::-webkit-scrollbar-thumb:hover{background:var(--primary)}

    /* ── SCENE NAV EXTRA ── */
    .sn{
      width:30px;height:30px;border-radius:8px;
      background:#fff;border:1.5px solid var(--border);
      display:flex;align-items:center;justify-content:center;
      font-size:9px;font-weight:800;color:var(--text4);cursor:pointer;
      transition:all .18s;position:relative;
      box-shadow:0 1px 3px rgba(37,99,235,.06);
    }
    .sn:hover{border-color:var(--primary-light);color:var(--primary);background:rgba(37,99,235,.05);transform:translateY(-1px)}
    .sn.cur{background:linear-gradient(135deg,var(--primary),var(--accent));border-color:var(--primary);color:#fff;box-shadow:0 3px 10px rgba(37,99,235,.32)}
    .sn.has-img::after{
      content:'';position:absolute;bottom:2px;right:2px;
      width:5px;height:5px;background:var(--success);border-radius:50%;box-shadow:0 0 0 1px #fff;
    }
    /* ══════════════════════════════════════════════
       RESPONSIVE / MOBILE OPTIMIZATION
    ══════════════════════════════════════════════ */

    /* 태블릿 (768px ~ 900px) */
    @media(max-width:900px){
      .app{grid-template-columns:320px 1fr}
    }

    /* 작은 태블릿 (601px ~ 768px) */
    @media(min-width:601px) and (max-width:768px){
      .app{grid-template-columns:1fr;grid-template-rows:auto 1fr}
      .lp{max-height:50vh}
      .tb{padding:0 16px;gap:8px}
      .tb-badge{display:none}
      .tb-status{display:none}
    }

    /* ══ 모바일 완전 최적화 (600px 이하) ══ */
    @media(max-width:600px){
      html,body{overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch}

      /* ── 탑바 ── */
      .tb{
        padding:0 10px;height:48px;gap:6px;
        position:sticky;top:0;z-index:100;
      }
      .tb-logo{font-size:13px;letter-spacing:-.3px}
      .tb-logo span{display:none}
      .tb-back{padding:5px 10px;font-size:10px;border-radius:8px}
      .tb-gallery-btn{padding:5px 10px;font-size:10px;border-radius:8px}
      .tb-status{display:none}
      .tb .tb-badge{display:none}

      /* ── 메인 레이아웃: 세로 단일 컬럼 ── */
      .app{
        display:flex;flex-direction:column;
        height:auto;min-height:calc(100vh - 48px);overflow:visible;
      }

      /* ── 왼쪽 패널 (모바일에서는 전체 너비) ── */
      .lp{
        width:100%;max-height:none;height:auto;
        border-right:none;border-bottom:2px solid var(--border);
        overflow:visible;order:2;
      }
      .lp-scroll{overflow:visible;max-height:none;padding-bottom:10px}

      /* ── 탭 ── */
      .ltabs{
        overflow-x:auto;-webkit-overflow-scrolling:touch;
        scrollbar-width:none;padding:0 4px;
        display:flex;gap:2px;
      }
      .ltabs::-webkit-scrollbar{display:none}
      .ltab{
        flex-shrink:0;min-width:50px;max-width:70px;
        padding:9px 4px 7px;font-size:9px;border-radius:10px 10px 0 0;
      }
      .ltab-panel{padding:0}

      /* ── 씬 카드 ── */
      .sc{padding:8px 10px;gap:8px}
      .sc-num{width:26px;height:26px;font-size:11px}
      .sc-title-txt{font-size:11px}
      .sc-btns{gap:4px}

      /* ── 오른쪽 패널 (모바일에서 위로 = 캔버스 먼저 보임) ── */
      .rp{overflow:visible;height:auto;order:1}
      .rp-inner{padding:8px;overflow:visible}

      /* ── 캔버스 프리뷰 ── */
      #pv-wrap{
        width:100% !important;
        max-width:100% !important;
        margin:0 auto;
      }
      canvas#pv{
        max-width:100% !important;
        height:auto !important;
        display:block;margin:0 auto;
        border-radius:12px;
      }

      /* ── 씬 네비게이션 ── */
      .scene-nav{flex-wrap:wrap;gap:4px;padding:6px 0}
      .sn{width:28px;height:28px;font-size:9px;border-radius:8px}

      /* ── 버튼들 ── */
      .btn{font-size:12px;padding:10px 14px;border-radius:10px}
      .make-btn-wrap{padding:10px;position:sticky;bottom:0;z-index:50;background:var(--surface);border-top:1px solid var(--border)}
      #make-btn{width:100%;font-size:14px;padding:14px;border-radius:12px}

      /* ── 진행/결과 박스 ── */
      .prog-box{margin:8px;padding:16px;border-radius:14px}
      .result-box{margin:8px;padding:12px;border-radius:14px}
      .result-video{max-width:100%;width:100%;height:auto;border-radius:10px}
      .prog-pct{font-size:36px}
      #prog-bar-wrap{height:14px;border-radius:7px}

      /* ── 텍스트/폼 ── */
      .lp-title{font-size:11px;padding:6px 10px}
      .lp-sec{padding:8px 10px}
      input[type=range]{width:100%;height:20px}
      textarea{font-size:13px;border-radius:10px}
      select{font-size:13px;border-radius:8px;padding:8px 10px}
      input[type=text]{font-size:13px}

      /* ── 음성/BGM 컨트롤 ── */
      .vc-row,.bc-row{gap:6px}
      .vc-lbl,.vc-val{font-size:10px}

      /* ── 템플릿 그리드 ── */
      .tpl-grid{grid-template-columns:repeat(2,1fr) !important;gap:8px !important}

      /* ── 다운로드 버튼 ── */
      #result-info{font-size:11px}
      .result-box .btn{width:100%;margin-top:8px;font-size:13px;padding:12px}

      /* ── 로그 패널 ── */
      #log-panel{max-height:120px;font-size:10px}

      /* ── 편집 슬라이더 ── */
      .ed-slider-lbl{font-size:10px;min-width:36px}
      .ed-slider-val{font-size:10px}

      /* ── 갤러리 ── */
      .gal-grid{grid-template-columns:1fr 1fr !important;gap:8px}
    }

    /* ── 매우 작은 화면 (375px 이하) ── */
    @media(max-width:375px){
      .tb{height:44px;padding:0 8px}
      .tb-logo{font-size:12px}
      .ltab{min-width:44px;font-size:8.5px}
      #make-btn{font-size:13px;padding:12px}
      .tpl-grid{grid-template-columns:1fr 1fr !important}
    }

  </style>
  <style id="hub-iframe-style"></style>
  <script>if(window.self!==window.top){document.getElementById('hub-iframe-style').textContent='.hub-back-btn{display:none!important}';}</script>
</head>
<body>
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>

<!-- TOP BAR -->
<div class="tb">
  <button class="tb-back hub-back-btn" onclick="window.location.href='/super1647'">← 뒤로</button>
  <div class="tb-logo"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> SUPERVIDEO <span>5.0</span></div>

  <a href="/tools/my-videos" class="tb-gallery-btn" style="text-decoration:none"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f39e.svg" class="tw" alt="🎞"> 내 영상 <span id="gallery-count" style="display:inline-flex;align-items:center;justify-content:center;background:var(--primary);color:#fff;width:18px;height:18px;border-radius:50%;font-size:9px;font-weight:900;margin-left:3px">0</span></a>
</div>

<div class="app">

<!-- ══════════ LEFT PANEL ══════════ -->
<div class="lp">
  <div class="ltabs" id="ltabs">
    <div class="ltab on" id="ltab-tmpl" onclick="switchLTab('tmpl',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a8.svg" class="tw" alt="🎨"><br>템플릿</div>
    <div class="ltab" id="ltab-fmt" onclick="switchLTab('fmt',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4d0.svg" class="tw" alt="📐"><br>형식</div>
    <div class="ltab" id="ltab-script" onclick="switchLTab('script',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" class="tw" alt="📝"><br>대본</div>
    <div class="ltab" id="ltab-voice" onclick="switchLTab('voice',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f399.svg" class="tw" alt="🎙"><br>목소리</div>
    <div class="ltab" id="ltab-bgm" onclick="switchLTab('bgm',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" class="tw" alt="🎵"><br>BGM</div>
    <div class="ltab" id="ltab-edit" onclick="switchLTab('edit',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2702.svg" class="tw" alt="✂️"><br>편집</div>
  </div>

  <!-- 템플릿 패널 -->
  <div class="ltab-panel on" id="ltp-tmpl">
    <div class="lp-scroll">
      <div class="tpl-grid" id="tpl-grid"></div>

      <!-- 씬 수 + 생성 시작 -->
      <div style="padding:12px 14px 14px;border-top:1px solid var(--border);margin-top:4px">
        <div class="lp-title" style="margin-bottom:8px"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 씬 수 선택</div>
        <div class="cnt-row" id="tpl-cnt-row" style="margin-bottom:10px">
          <div class="cnt-btn" onclick="selTplCnt(5,this)">5개</div>
          <div class="cnt-btn on" onclick="selTplCnt(7,this)">7개</div>
          <div class="cnt-btn" onclick="selTplCnt(10,this)">10개</div>
          <div class="cnt-btn" onclick="selTplCnt(15,this)">15개</div>
        </div>
        <button class="btn btn-p" style="width:100%;justify-content:center;font-size:13px;padding:12px" onclick="startFromTemplate()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 영상 제작 시작</button>
      </div>
    </div>
  </div>

  <!-- 형식 패널 -->
  <div class="ltab-panel" id="ltp-fmt">
    <div class="lp-scroll">
      <div class="lp-sec">
        <div class="lp-title">영상 형식</div>
        <div class="fmt-row">
          <div class="fo on" id="fo-short" onclick="setFmt('short')">
            <span class="fo-ico"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" class="tw" alt="📱"></span>숏폼<br><span style="font-size:8px;font-weight:500;color:var(--text4)">9:16</span>
          </div>
          <div class="fo" id="fo-long" onclick="setFmt('long')">
            <span class="fo-ico"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5a5.svg" class="tw" alt="🖥"></span>롱폼<br><span style="font-size:8px;font-weight:500;color:var(--text4)">16:9</span>
          </div>
          <div class="fo" id="fo-sq" onclick="setFmt('sq')">
            <span class="fo-ico">⬜</span>정방형<br><span style="font-size:8px;font-weight:500;color:var(--text4)">1:1</span>
          </div>
        </div>
        <div style="margin-top:10px">
          <div style="font-size:9px;color:var(--text4);line-height:1.5;padding:6px 8px;background:rgba(37,99,235,.07);border-radius:7px">⏱ 영상 길이는 대본/음성에 맞춰 자동 조절됩니다</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 대본 패널 -->
  <div class="ltab-panel" id="ltp-script">
    <div class="lp-scroll">
      <div class="lp-sec">
        <div class="script-mode-tabs">
          <div class="smt on" id="sm-full" onclick="setScriptMode('full')"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4dd.svg" class="tw" alt="📝"> 직접 입력</div>
          <div class="smt" id="sm-scene" onclick="setScriptMode('scene')"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 씬 편집</div>
        </div>

        <!-- AI 모드 (숨김) -->
        <div id="script-ai-box" style="display:none"></div>

        <!-- 직접 입력 모드 -->
        <div id="script-full-box" style="display:block">
          <div style="font-size:10px;color:var(--text4);margin-bottom:6px;line-height:1.6">한 줄 = 한 씬이 됩니다. 엔터로 구분하세요.</div>
          <textarea id="full-script" rows="10" placeholder="예:&#10;오늘의 다이어트 비결 공개합니다!&#10;첫 번째, 아침 공복 물 한 잔&#10;두 번째, 저녁 7시 이후 금식&#10;세 번째, 30분 걷기 습관&#10;여기까지입니다! 좋아요와 구독 부탁해요"
            style="width:100%;border:1.5px solid var(--border);border-radius:9px;padding:10px;font-size:11px;font-family:inherit;resize:vertical;outline:none;transition:border-color .15s;"
            onfocus="this.style.borderColor='var(--primary)'" onblur="this.style.borderColor='var(--border)'"></textarea>
          <div style="display:flex;gap:6px;margin-top:8px">
            <button class="btn btn-p" style="flex:1;justify-content:center" onclick="splitToScenes()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 씬으로 분리 + 사진 매칭</button>
            <button class="btn btn-s btn-sm" onclick="loadSample()">샘플</button>
          </div>
        </div>

        <!-- 씬 편집 모드 -->
        <div id="script-scene-box" style="display:none">
          <div style="display:flex;gap:6px;margin-bottom:10px">
            <button class="btn btn-s btn-sm" onclick="autoMatchMedia()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" class="tw" alt="🖼"> 전체 사진 매칭</button>
            <button class="btn btn-p btn-sm" style="flex:1;justify-content:center" onclick="addScene()">+ 씬 추가</button>
          </div>
          <div class="scene-cards" id="scene-list"></div>
          <button class="add-sc" onclick="addScene()">＋ 씬 추가</button>
        </div>
      </div>
    </div>
  </div>

  <!-- 목소리 패널 -->
  <div class="ltab-panel" id="ltp-voice">
    <div class="lp-scroll">
      <div class="lp-sec">
        <div class="lp-title">목소리 선택 <span id="voice-count-lbl" style="font-weight:500;color:var(--text4);text-transform:none;letter-spacing:0"></span></div>
        <div class="v-filters" id="v-filters">
          <span class="vf on" onclick="filterVTag('all',this)">전체</span>
          <span class="vf" onclick="filterVTag('google',this)" style="background:#4ade80;color:#000;font-weight:700">⭐ Google AI</span>
          <span class="vf" onclick="filterVTag('openai',this)" style="background:#0ea5e9;color:#fff;font-weight:700"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" class="tw" alt="🤖"> OpenAI 전체</span>
          <span class="vf" onclick="filterVTag('openai-tts1',this)" style="background:#0284c7;color:#fff;font-weight:700"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" class="tw" alt="🤖"> tts-1</span>
          <span class="vf" onclick="filterVTag('openai-tts1hd',this)" style="background:#0c4a6e;color:#fff;font-weight:700"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" class="tw" alt="🤖"> tts-1-hd</span>
          <span class="vf" onclick="filterVTag('openai-4omini',this)" style="background:#1e3a8a;color:#fff;font-weight:700"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" class="tw" alt="🤖"> gpt-4o-mini-tts</span>
          <span class="vf" onclick="filterVTag('elevenlabs',this)" style="background:#7c3aed;color:#fff;font-weight:700">🔊 ElevenLabs</span>
          <span class="vf" onclick="filterVTag('female',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f469.svg" class="tw" alt="👩"> 여성</span>
          <span class="vf" onclick="filterVTag('male',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f468.svg" class="tw" alt="👨"> 남성</span>
        </div>
        <input class="v-search" id="v-search" type="text" placeholder="🔍 목소리 검색..."
          oninput="filterVoiceBySearch(this.value)">
        <div class="v-list" id="v-list"></div>
        <!-- TTS 테스트 상태 박스: ▶ 누를 때 어느 API 호출 중인지 표시 -->
        <div id="tts-status-box" style="display:none"></div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--border)">
          <div class="lp-title">목소리 조절</div>
          <div class="vc-row">
            <span class="vc-lbl">속도</span>
            <input type="range" min="0.5" max="3" step="0.05" value="1.25" id="vc-speed"
              oninput="onSpeedSliderChange(this.value)">
            <span class="vc-val" id="vc-speed-val">1.25x</span>
          </div>
          <div class="vc-row">
            <span class="vc-lbl">피치</span>
            <input type="range" min="0.5" max="2" step="0.05" value="1" id="vc-pitch"
              oninput="document.getElementById('vc-pitch-val').textContent=parseFloat(this.value).toFixed(2)">
            <span class="vc-val" id="vc-pitch-val">1.00</span>
          </div>
          <div style="font-size:10px;color:#0ea5e9;padding:2px 0 6px;opacity:.85"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f916.svg" class="tw" alt="🤖"> OpenAI·Google AI 목소리에 피치·배속 모두 적용됩니다.</div>
          <div class="vc-row">
            <span class="vc-lbl">볼륨</span>
            <input type="range" min="0" max="1" step="0.05" value="1" id="vc-vol"
              oninput="document.getElementById('vc-vol-val').textContent=Math.round(this.value*100)+'%'">
            <span class="vc-val" id="vc-vol-val">100%</span>
          </div>
          <button class="btn btn-s btn-sm" style="margin-top:6px" onclick="speakCurScene()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f50a.svg" class="tw" alt="🔊"> 현재 씬 듣기</button>
        </div>
      </div>
    </div>
  </div>

  <!-- BGM 패널 -->
  <div class="ltab-panel" id="ltp-bgm">
    <div class="lp-scroll">
      <div class="lp-sec">
        <div class="lp-title">배경음악 선택 <span id="bgm-count-lbl" style="font-weight:500;color:var(--text4);text-transform:none;letter-spacing:0"></span></div>
        <!-- BGM 탭 전환 -->
        <div style="display:flex;gap:4px;margin-bottom:8px">
          <button id="bgm-tab-local" onclick="switchBGMTab('local')" style="flex:1;padding:5px;font-size:10px;font-weight:700;border:1.5px solid var(--primary);border-radius:7px;background:var(--primary);color:#fff;cursor:pointer">내장 BGM</button>
          <button id="bgm-tab-pixabay" onclick="switchBGMTab('pixabay')" style="flex:1;padding:5px;font-size:10px;font-weight:700;border:1.5px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text2);cursor:pointer">🔍 Pixabay 검색</button>
        </div>
        <!-- Pixabay 검색 패널 -->
        <div id="bgm-pixabay-panel" style="display:none">
          <div style="display:flex;gap:5px;margin-bottom:6px">
            <input id="pixabay-bgm-q" type="text" placeholder="🔍 장르·무드 검색 (영문)..." style="flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:11px;background:var(--bg);color:var(--text1)" onkeydown="if(event.key==='Enter')searchPixabayBGM()">
            <button onclick="searchPixabayBGM()" style="padding:7px 12px;background:var(--primary);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer">검색</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:3px;margin-bottom:8px">
            <span onclick="pixabayBGMQuick('happy upbeat')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">😊 Happy</span>
            <span onclick="pixabayBGMQuick('cinematic epic')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">🎬 Epic</span>
            <span onclick="pixabayBGMQuick('lofi chill')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">🎧 Lo-Fi</span>
            <span onclick="pixabayBGMQuick('jazz cafe')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">☕ Jazz</span>
            <span onclick="pixabayBGMQuick('corporate motivational')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">💼 기업</span>
            <span onclick="pixabayBGMQuick('acoustic guitar')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">🎸 어쿠스틱</span>
            <span onclick="pixabayBGMQuick('pop dance')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">🕺 댄스</span>
            <span onclick="pixabayBGMQuick('ambient relaxing')" style="padding:3px 7px;background:var(--bg2);border-radius:5px;font-size:9px;cursor:pointer">🌿 앰비언트</span>
          </div>
          <div id="pixabay-bgm-list" style="min-height:60px"></div>
          <div id="pixabay-bgm-more" style="display:none;text-align:center;margin-top:6px">
            <button onclick="searchPixabayBGMMore()" style="padding:5px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:7px;font-size:10px;cursor:pointer">더 보기</button>
          </div>
        </div>
        <!-- 내장 BGM 패널 -->
        <div id="bgm-local-panel">
        <div class="bgm-filters" id="bgm-filters">
          <span class="bf on" onclick="filterBTag('all',this)">전체</span>
          <span class="bf" onclick="filterBTag('upbeat',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/26a1.svg" class="tw" alt="⚡"> 업비트</span>
          <span class="bf" onclick="filterBTag('calm',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f60c.svg" class="tw" alt="😌"> 잔잔</span>
          <span class="bf" onclick="filterBTag('cinematic',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 시네마틱</span>
          <span class="bf" onclick="filterBTag('electronic',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f39b.svg" class="tw" alt="🎛"> 일렉</span>
          <span class="bf" onclick="filterBTag('jazz',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b7.svg" class="tw" alt="🎷"> 재즈</span>
          <span class="bf" onclick="filterBTag('pop',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" class="tw" alt="🎵"> 팝</span>
          <span class="bf" onclick="filterBTag('classical',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3bb.svg" class="tw" alt="🎻"> 클래식</span>
          <span class="bf" onclick="filterBTag('hiphop',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a4.svg" class="tw" alt="🎤"> 힙합</span>
          <span class="bf" onclick="filterBTag('ambient',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f319.svg" class="tw" alt="🌙"> 앰비언트</span>
          <span class="bf" onclick="filterBTag('lofi',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a7.svg" class="tw" alt="🎧"> Lo-Fi</span>
          <span class="bf" onclick="filterBTag('kpop',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3a4.svg" class="tw" alt="🎤"> K-POP</span>
          <span class="bf" onclick="filterBTag('trap',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f525.svg" class="tw" alt="🔥"> 트랩</span>
          <span class="bf" onclick="filterBTag('acoustic',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b8.svg" class="tw" alt="🎸"> 어쿠스틱</span>
          <span class="bf" onclick="filterBTag('rnb',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b7.svg" class="tw" alt="🎷"> R&B</span>
          <span class="bf" onclick="filterBTag('folk',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f33e.svg" class="tw" alt="🌾"> 포크</span>
          <span class="bf" onclick="filterBTag('synthwave',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f306.svg" class="tw" alt="🌆"> 신스웨이브</span>
          <span class="bf" onclick="filterBTag('nature',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f33f.svg" class="tw" alt="🌿"> 자연</span>
          <span class="bf" onclick="filterBTag('corporate',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4bc.svg" class="tw" alt="💼"> 기업</span>
          <span class="bf" onclick="filterBTag('kdrama',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f495.svg" class="tw" alt="💕"> K-드라마</span>
          <span class="bf" onclick="filterBTag('lounge',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2708.svg" class="tw" alt="✈️"> 라운지</span>
          <span class="bf" onclick="filterBTag('soul',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b5.svg" class="tw" alt="🎵"> 소울</span>
          <span class="bf" onclick="filterBTag('epic',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4a5.svg" class="tw" alt="💥"> 에픽</span>
          <span class="bf" onclick="filterBTag('chill',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2744.svg" class="tw" alt="❄️"> 칠</span>
          <span class="bf" onclick="filterBTag('rock',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3b8.svg" class="tw" alt="🎸"> 록</span>
          <span class="bf" onclick="filterBTag('happy',this)"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f60a.svg" class="tw" alt="😊"> 해피</span>
        </div>
        <input class="bgm-search" id="bgm-search" type="text" placeholder="🔍 BGM 검색..."
          oninput="filterBGMBySearch(this.value)">
        <div class="bgm-list" id="bgm-list"></div>
        </div><!-- /bgm-local-panel -->
        <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border)">
          <div class="vc-row">
            <span class="vc-lbl" style="min-width:50px">BGM 볼륨</span>
            <input type="range" min="0" max="1" step="0.05" value="0.2" id="bgm-vol"
              oninput="bgmVol=parseFloat(this.value);document.getElementById('bgm-vol-val').textContent=Math.round(bgmVol*100)+'%'">
            <span class="vc-val" id="bgm-vol-val">20%</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 편집 패널 -->
  <div class="ltab-panel" id="ltp-edit" style="overflow-y:auto">
    <div class="lp-sec">
      <!-- 미디어 첨부 버튼 -->
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:12px">
        <div class="lp-title" style="margin-bottom:2px"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f8.svg" class="tw" alt="📸"> 씬 미디어</div>
        <button onclick="openPexelsModal()" style="width:100%;padding:9px 10px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;border:none;border-radius:10px;font-size:10px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
          <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" class="tw" alt="🖼️"> 무료 사진/영상 라이브러리
        </button>
        <button onclick="triggerUploadForScene(curScene)" style="width:100%;padding:9px 10px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:10px;font-size:10px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px">
          <img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f2.svg" class="tw" alt="📲"> 내 사진/동영상 첨부
        </button>
      </div>
      <div id="edit-opts-container"></div>
    </div>
  </div>

</div><!-- /lp -->

<!-- 갤러리 모달 제거 - /tools/my-videos 페이지로 대체 -->

<!-- ══════════ RIGHT PANEL ══════════ -->
<div class="rp">
  <div class="rp-top">
    <div class="scene-nav" id="scene-nav"></div>
    <div style="margin-left:auto;display:flex;gap:5px;flex-wrap:wrap;align-items:center">
      <button class="btn btn-s btn-sm" onclick="autoMatchMedia()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" class="tw" alt="🖼"> 사진</button>
      <button class="btn btn-s btn-sm" onclick="prevScene2()">◀</button>
      <button class="btn btn-s btn-sm" id="play-prev-btn" onclick="togglePlayPreview()">▶ 미리보기</button>
      <button class="btn btn-s btn-sm" onclick="nextScene2()">▶</button>
      <button class="btn btn-s btn-sm" onclick="speakCurScene()"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f50a.svg" class="tw" alt="🔊"></button>
    </div>
  </div>

  <div class="rp-canvas-wrap" id="canvas-wrap">
    <div style="text-align:center;display:flex;flex-direction:column;align-items:center;gap:6px">
      <div class="canvas-outer" style="position:relative" id="canvas-outer-wrap">
        <canvas id="pv" style="display:block;cursor:grab"
          onclick="onCanvasClick(event)" ondblclick="onCanvasDblClick(event)"
          onmousedown="onCanvasMouseDown(event)" onmousemove="onCanvasMouseMove(event)"
          onmouseup="onCanvasMouseUp()" onmouseleave="onCanvasMouseUp()"
          ontouchstart="onCanvasTouchStart(event)" ontouchmove="onCanvasTouchMove(event)"
          ontouchend="onCanvasMouseUp()" onwheel="onCanvasWheel(event)"></canvas>
        <!-- 미디어 줌 인디케이터 -->
        <div id="media-zoom-badge" style="display:none;position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);color:#fff;font-size:10px;font-weight:700;padding:3px 8px;border-radius:8px;pointer-events:none;z-index:20">🔍 100%</div>

        <!-- ══ 직접편집 블록: 더블클릭으로 열림, 드래그로 위치 이동 ══ -->
        <style>
          /* ══ 캔바/캡컷 스타일 텍스트 블록 ══ */
          .blk-wrap {
            opacity:1;
            transition:opacity .15s;
          }
          /* 선택(active) 상태 */
          .blk-wrap.blk-selected .blk-ce {
            border-color:#2563eb !important;
            border-style:solid !important;
            box-shadow:0 0 0 2px rgba(37,99,235,0.28) !important;
          }
          .blk-wrap.blk-selected .blk-tb { opacity:1 !important; pointer-events:auto !important; }
          /* 툴바: 선택 전엔 숨김 */
          .blk-tb { opacity:0; pointer-events:none; transition:opacity .15s; }
          /* blk-wrap: 드래그 커서 */
          .blk-wrap { cursor:move !important; }
          /* 편집 영역 — 평소엔 점선 테두리 표시 (위치 인식 가능) */
          .blk-ce {
            outline:none;
            min-height:1.2em; min-width:80px;
            padding:2px 4px;
            cursor:move;
            border:1.5px dashed rgba(255,255,255,0.45);
            border-radius:3px;
            background:transparent;
            white-space:pre-wrap; word-break:break-word;
            transition:border-color .12s;
            user-select:none;
            color:transparent;                 /* 평소엔 투명 — Canvas 텍스트가 보임 */
            caret-color:transparent;
            line-height:inherit;
          }
          /* 비선택 블록은 hover시 연한 테두리 */
          .blk-wrap:not(.blk-selected) .blk-ce:hover {
            border-color:rgba(255,255,255,0.6);
          }
          .blk-wrap:not(.blk-selected) .blk-ce {
            border-color:rgba(255,255,255,0.3);
          }
          /* 편집 중 아닐 때도 투명 유지 */
          .blk-ce:not(.blk-editing) {
            color:transparent !important;
            caret-color:transparent !important;
          }
          /* 편집 모드: 배경 없음, 텍스트 그 자리에서 바로 수정 — 캔바/미리캔버스 방식 */
          .blk-ce.blk-editing {
            cursor:text !important;
            border-color:rgba(37,99,235,0.7) !important;
            border-style:solid !important;
            background:transparent !important; /* ★ 배경 없음 — Canvas 위에서 바로 편집 */
            user-select:text !important;
            color:inherit !important;          /* ★ _applyBlkStyle이 실제 색상 주입 */
            caret-color:auto;                  /* ★ 텍스트 색에 맞춰 자동 */
            padding:0 !important;              /* ★ padding 0 유지 — 위치 밀림 없음 */
          }
          /* 터치 스크롤 차단 — 드래그 전용 */
          .blk-wrap { touch-action: none; }
          /* 선택 핸들 (8개 모서리/엣지) */
          .blk-handle {
            position:absolute; width:8px; height:8px;
            background:#fff; border:1.5px solid #2563eb;
            border-radius:2px; z-index:35;
            display:none;
          }
          .blk-wrap.blk-selected .blk-handle { display:block; }
          .blk-handle.nw { top:-4px; left:-4px; cursor:nw-resize; }
          .blk-handle.n  { top:-4px; left:calc(50% - 4px); cursor:n-resize; }
          .blk-handle.ne { top:-4px; right:-4px; cursor:ne-resize; }
          .blk-handle.e  { top:calc(50% - 4px); right:-4px; cursor:e-resize; }
          .blk-handle.se { bottom:-4px; right:-4px; cursor:se-resize; }
          .blk-handle.s  { bottom:-4px; left:calc(50% - 4px); cursor:s-resize; }
          .blk-handle.sw { bottom:-4px; left:-4px; cursor:sw-resize; }
          .blk-handle.w  { top:calc(50% - 4px); left:-4px; cursor:w-resize; }
          /* 툴바 스타일 */
          .blk-tb {
            position:absolute; top:-42px; left:0;
            height:38px;
            background:rgba(15,15,35,0.97);
            border-radius:8px;
            display:flex; align-items:center; gap:2px;
            padding:0 8px;
            white-space:nowrap;
            border:1px solid rgba(37,99,235,0.45);
            box-shadow:0 4px 16px rgba(0,0,0,0.45);
            cursor:grab;
            user-select:none;
            z-index:40;
            min-width:max-content;
          }
          .blk-tb:active { cursor:grabbing; }
          .blk-tb-sep { width:1px; height:18px; background:rgba(255,255,255,0.15); margin:0 3px; flex-shrink:0; }
          .blk-tb-btn {
            background:transparent; border:none; color:#e2e8f0;
            font-size:11px; cursor:pointer; padding:3px 5px;
            border-radius:4px; line-height:1; transition:background .12s;
            flex-shrink:0;
          }
          .blk-tb-btn:hover { background:rgba(255,255,255,0.12); }
          .blk-tb-btn.active { background:rgba(37,99,235,0.35); color:#a5b4fc; }
          .blk-tb-label { font-size:8px; font-weight:700; color:#a5b4fc; pointer-events:none; flex-shrink:0; }
          .blk-tb-szinput {
            width:30px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18);
            color:#e2e8f0; font-size:10px; text-align:center; border-radius:3px;
            padding:1px 2px; outline:none; flex-shrink:0;
          }
          .blk-tb-font {
            background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.18);
            color:#e2e8f0; font-size:9px; border-radius:3px; padding:1px 3px;
            outline:none; cursor:pointer; max-width:88px; flex-shrink:0;
          }
          /* 클릭 힌트 */
          #canvas-dbl-hint {
            position:absolute; bottom:6px; left:50%; transform:translateX(-50%);
            font-size:9px; color:rgba(255,255,255,0.38); pointer-events:none;
            background:rgba(0,0,0,0.28); padding:2px 8px; border-radius:10px;
            white-space:nowrap; z-index:30; transition:opacity .3s;
          }
        </style>

        <!-- ── 제목 블록 ── -->
        <div id="blk-title" class="blk-wrap" style="display:none;position:absolute;z-index:25;box-sizing:border-box;"
             onpointerdown="_blkSelect(event,'title')">
          <!-- 핸들 8개 -->
          <div class="blk-handle nw"></div><div class="blk-handle n"></div><div class="blk-handle ne"></div>
          <div class="blk-handle e"></div><div class="blk-handle se"></div><div class="blk-handle s"></div>
          <div class="blk-handle sw"></div><div class="blk-handle w"></div>
          <!-- 툴바 -->
          <div id="blk-title-tb" class="blk-tb"
               onpointerdown="_blkDragStart(event,'title')">
            <!-- 드래그 핸들 -->
            <span class="blk-tb-label" style="cursor:grab;margin-right:2px;">⠿</span>
            <span class="blk-tb-label">제목</span>
            <div class="blk-tb-sep"></div>
            <!-- 폰트 패밀리 -->
            <select id="blk-title-font" class="blk-tb-font" onmousedown="event.stopPropagation()" onchange="_blkFontFamily('title',this.value)">
              <option value="Noto Sans KR">Noto Sans KR</option>
              <option value="Black Han Sans">Black Han Sans</option>
              <option value="Nanum Gothic">Nanum Gothic</option>
              <option value="Nanum Myeongjo">Nanum Myeongjo</option>
              <option value="Gmarket Sans">Gmarket Sans</option>
              <option value="sans-serif">기본 고딕</option>
              <option value="serif">명조</option>
            </select>
            <div class="blk-tb-sep"></div>
            <!-- 크기 -->
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('title',-2)" title="글자 작게">A−</button>
            <input id="blk-title-sz-lbl" class="blk-tb-szinput" type="number" min="8" max="120" value="16"
                   onmousedown="event.stopPropagation()"
                   onchange="_blkFontSizeDirect('title',+this.value)" title="글자 크기">
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('title',2)" title="글자 크게">A+</button>
            <div class="blk-tb-sep"></div>
            <!-- 굵기·이탤릭·밑줄 -->
            <button id="blk-title-bold" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('title','bold')" title="굵게"><b>B</b></button>
            <button id="blk-title-italic" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('title','italic')" title="이탤릭"><i>I</i></button>
            <button id="blk-title-underline" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('title','underline')" title="밑줄"><u>U</u></button>
            <div class="blk-tb-sep"></div>
            <!-- 정렬 -->
            <button id="blk-title-al-l" class="blk-tb-btn active" onmousedown="event.stopPropagation()" onclick="_blkAlign('title','left')" title="왼쪽 정렬">≡←</button>
            <button id="blk-title-al-c" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('title','center')" title="가운데 정렬">≡</button>
            <button id="blk-title-al-r" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('title','right')" title="오른쪽 정렬">≡→</button>
            <div class="blk-tb-sep"></div>
            <!-- 색상 -->
            <input type="color" id="blk-title-clr" value="#ffffff" title="글자 색상"
                   onmousedown="event.stopPropagation()" oninput="_blkColorChange('title',this.value)"
                   style="width:22px;height:22px;border:1.5px solid rgba(255,255,255,0.25);border-radius:4px;cursor:pointer;padding:0;background:none;flex-shrink:0;">
          </div>
          <!-- 직접 입력 영역 -->
          <div id="blk-title-ce" class="blk-ce"
               contenteditable="false"
               spellcheck="false"
               oninput="_blkInput(event,'title')"
               onkeydown="_blkKey(event,'title')"
               ondblclick="_blkDblClick(event,'title')"
               style="color:#fff;font-size:16px;font-weight:700;line-height:1.4;font-family:'Noto Sans KR',sans-serif;"
               onfocus="_blkFocus('title')" onblur="_blkBlur(event,'title')">
          </div>
        </div>

        <!-- ── 본문 블록 ── -->
        <div id="blk-body" class="blk-wrap" style="display:none;position:absolute;z-index:25;box-sizing:border-box;"
             onpointerdown="_blkSelect(event,'body')">
          <!-- 핸들 8개 -->
          <div class="blk-handle nw"></div><div class="blk-handle n"></div><div class="blk-handle ne"></div>
          <div class="blk-handle e"></div><div class="blk-handle se"></div><div class="blk-handle s"></div>
          <div class="blk-handle sw"></div><div class="blk-handle w"></div>
          <!-- 툴바 -->
          <div id="blk-body-tb" class="blk-tb"
               onpointerdown="_blkDragStart(event,'body')">
            <span class="blk-tb-label" style="cursor:grab;margin-right:2px;">⠿</span>
            <span class="blk-tb-label">본문</span>
            <div class="blk-tb-sep"></div>
            <select id="blk-body-font" class="blk-tb-font" onmousedown="event.stopPropagation()" onchange="_blkFontFamily('body',this.value)">
              <option value="Noto Sans KR">Noto Sans KR</option>
              <option value="Black Han Sans">Black Han Sans</option>
              <option value="Nanum Gothic">Nanum Gothic</option>
              <option value="Nanum Myeongjo">Nanum Myeongjo</option>
              <option value="Gmarket Sans">Gmarket Sans</option>
              <option value="sans-serif">기본 고딕</option>
              <option value="serif">명조</option>
            </select>
            <div class="blk-tb-sep"></div>
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('body',-2)" title="글자 작게">A−</button>
            <input id="blk-body-sz-lbl" class="blk-tb-szinput" type="number" min="8" max="120" value="12"
                   onmousedown="event.stopPropagation()"
                   onchange="_blkFontSizeDirect('body',+this.value)" title="글자 크기">
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('body',2)" title="글자 크게">A+</button>
            <div class="blk-tb-sep"></div>
            <button id="blk-body-bold" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('body','bold')" title="굵게"><b>B</b></button>
            <button id="blk-body-italic" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('body','italic')" title="이탤릭"><i>I</i></button>
            <button id="blk-body-underline" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('body','underline')" title="밑줄"><u>U</u></button>
            <div class="blk-tb-sep"></div>
            <button id="blk-body-al-l" class="blk-tb-btn active" onmousedown="event.stopPropagation()" onclick="_blkAlign('body','left')" title="왼쪽 정렬">≡←</button>
            <button id="blk-body-al-c" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('body','center')" title="가운데 정렬">≡</button>
            <button id="blk-body-al-r" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('body','right')" title="오른쪽 정렬">≡→</button>
            <div class="blk-tb-sep"></div>
            <input type="color" id="blk-body-clr" value="#e2e8f0" title="글자 색상"
                   onmousedown="event.stopPropagation()" oninput="_blkColorChange('body',this.value)"
                   style="width:22px;height:22px;border:1.5px solid rgba(255,255,255,0.25);border-radius:4px;cursor:pointer;padding:0;background:none;flex-shrink:0;">
          </div>
          <!-- 직접 입력 영역 -->
          <div id="blk-body-ce" class="blk-ce body-ce"
               contenteditable="false"
               spellcheck="false"
               oninput="_blkInput(event,'body')"
               onkeydown="_blkKey(event,'body')"
               ondblclick="_blkDblClick(event,'body')"
               style="color:#e2e8f0;font-size:12px;font-weight:500;line-height:1.55;font-family:'Noto Sans KR',sans-serif;"
               onfocus="_blkFocus('body')" onblur="_blkBlur(event,'body')">
          </div>
        </div>
        <!-- ── 장식 레이블 블록 ── -->
        <div id="blk-label" class="blk-wrap" style="display:none;position:absolute;z-index:25;box-sizing:border-box;"
             onpointerdown="_blkSelect(event,'label')">
          <!-- 핸들 8개 -->
          <div class="blk-handle nw"></div><div class="blk-handle n"></div><div class="blk-handle ne"></div>
          <div class="blk-handle e"></div><div class="blk-handle se"></div><div class="blk-handle s"></div>
          <div class="blk-handle sw"></div><div class="blk-handle w"></div>
          <!-- 툴바 -->
          <div id="blk-label-tb" class="blk-tb"
               onpointerdown="_blkDragStart(event,'label')">
            <span class="blk-tb-label" style="cursor:grab;margin-right:2px;">⠿</span>
            <span class="blk-tb-label">장식</span>
            <div class="blk-tb-sep"></div>
            <select id="blk-label-font" class="blk-tb-font" onmousedown="event.stopPropagation()" onchange="_blkFontFamily('label',this.value)">
              <option value="Noto Sans KR">Noto Sans KR</option>
              <option value="Black Han Sans">Black Han Sans</option>
              <option value="Nanum Gothic">Nanum Gothic</option>
              <option value="Nanum Myeongjo">Nanum Myeongjo</option>
              <option value="Gmarket Sans">Gmarket Sans</option>
              <option value="sans-serif">기본 고딕</option>
              <option value="serif">명조</option>
            </select>
            <div class="blk-tb-sep"></div>
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('label',-2)" title="글자 작게">A−</button>
            <input id="blk-label-sz-lbl" class="blk-tb-szinput" type="number" min="8" max="120" value="10"
                   onmousedown="event.stopPropagation()"
                   onchange="_blkFontSizeDirect('label',+this.value)" title="글자 크기">
            <button class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkFontSize('label',2)" title="글자 크게">A+</button>
            <div class="blk-tb-sep"></div>
            <button id="blk-label-bold" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('label','bold')" title="굵게"><b>B</b></button>
            <button id="blk-label-italic" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkToggle('label','italic')" title="이탤릭"><i>I</i></button>
            <div class="blk-tb-sep"></div>
            <button id="blk-label-al-l" class="blk-tb-btn active" onmousedown="event.stopPropagation()" onclick="_blkAlign('label','left')" title="왼쪽 정렬">≡←</button>
            <button id="blk-label-al-c" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('label','center')" title="가운데 정렬">≡</button>
            <button id="blk-label-al-r" class="blk-tb-btn" onmousedown="event.stopPropagation()" onclick="_blkAlign('label','right')" title="오른쪽 정렬">≡→</button>
            <div class="blk-tb-sep"></div>
            <input type="color" id="blk-label-clr" value="#a5b4fc" title="글자 색상"
                   onmousedown="event.stopPropagation()" oninput="_blkColorChange('label',this.value)"
                   style="width:22px;height:22px;border:1.5px solid rgba(255,255,255,0.25);border-radius:4px;cursor:pointer;padding:0;background:none;flex-shrink:0;">
            <div class="blk-tb-sep"></div>
            <button class="blk-tb-btn" style="color:#f87171;" onmousedown="event.stopPropagation()" onclick="_blkDeleteLabel()" title="장식 텍스트 숨기기">✕ 숨김</button>
          </div>
          <!-- 직접 입력 영역 -->
          <div id="blk-label-ce" class="blk-ce"
               contenteditable="false"
               spellcheck="false"
               oninput="_blkInput(event,'label')"
               onkeydown="_blkKey(event,'label')"
               ondblclick="_blkDblClick(event,'label')"
               style="color:#a5b4fc;font-size:10px;font-weight:700;line-height:1.4;font-family:'Noto Sans KR',sans-serif;letter-spacing:0.08em;"
               onfocus="_blkFocus('label')" onblur="_blkBlur(event,'label')">
          </div>
        </div>
        <!-- 클릭 힌트 -->
        <div id="canvas-dbl-hint">✎ 클릭 → 선택 · 한 번 더 클릭 → 편집 · 드래그 → 이동</div>
      </div>
      <!-- 캔버스 하단 툴바 -->
      <div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:rgba(255,255,255,.92);border-top:1px solid var(--border);flex-wrap:wrap">
        <button onclick="previewTextAnim()" title="텍스트 애니메이션 미리보기" style="padding:4px 10px;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;border:none;border-radius:7px;font-size:9px;font-weight:700;cursor:pointer;flex-shrink:0">▶ 텍스트 미리보기</button>
        <span style="font-size:9px;color:#64748b;font-weight:700;flex-shrink:0">🔍 사진·영상 크기</span>
        <input type="range" id="media-size-slider" min="20" max="300" step="5" value="100"
               oninput="setMediaZoom(this.value)"
               title="사진/영상 크기 조절 (드래그로 위치 이동)"
               style="flex:1;min-width:90px;accent-color:#2563eb;cursor:pointer">
        <span id="media-size-val" style="font-size:9px;font-weight:800;color:#4f46e5;min-width:34px;text-align:right;flex-shrink:0">100%</span>
        <button onclick="resetMediaTransform()" title="위치·크기 초기화" style="padding:4px 8px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:7px;font-size:9px;cursor:pointer;flex-shrink:0">↺ 초기화</button>
      </div>
      <div style="font-size:8.5px;color:#94a3b8;text-align:center;padding:0 8px 4px;background:rgba(255,255,255,.92)">💡 캔버스에서 <b>드래그</b>하면 위치 이동 · 위 <b>슬라이더</b>로 크기 조절 (스크롤/핀치도 가능)</div>
      <div class="canvas-lbl" id="canvas-lbl"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f1.svg" class="tw" alt="📱"> 숏폼 9:16 · 30초</div>
    </div>
  </div>

  <!-- ── TIMELINE BAR ── -->
  <div id="timeline-wrap" style="padding:8px 16px 8px;background:rgba(255,255,255,.97);border-top:1.5px solid var(--border);flex-shrink:0">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span id="tl-total-dur" style="font-size:9px;color:var(--text4)"></span>
      <button onclick="addScene()" style="margin-left:auto;padding:4px 12px;background:var(--primary);color:#fff;border:none;border-radius:7px;font-size:9px;font-weight:700;cursor:pointer">+ 씬 추가</button>
    </div>
    <!-- 씬 도트 타임라인 -->
    <div id="timeline-bar" style="position:relative;height:36px;display:flex;align-items:center"></div>

  </div>

  <div class="rp-bottom">
    <input type="file" id="scene-media-upload" accept="image/*,video/*" style="display:none" onchange="handleSceneMediaUpload(event)">
    <button class="make-btn" id="make-btn" onclick="makeVideo()">
      영상 만들기
    </button>
    <!-- prog-box / result-box: 숨김 유지 (팝업 모달로 대체) -->
    <div id="prog-box" style="display:none" class="prog-box">
      <div class="prog-title" id="prog-title">영상 제작 중...</div>
      <div class="prog-pct" id="prog-pct">0%</div>
      <div class="prog-bar-bg"><div class="prog-bar" id="prog-bar" style="width:0%"></div></div>
      <div class="prog-scene" id="prog-scene"></div>
      <div class="prog-log" id="prog-log"></div>
    </div>
    <div id="result-box" style="display:none" class="result-box">
      <div id="result-info"></div>
      <video id="result-video" controls class="result-video" playsinline></video>
    </div>
  </div>
</div><!-- /rp -->

</div><!-- /app -->

<!-- ══ 렌더링 진행 팝업 모달 ══ -->
<div id="render-modal" style="display:none;position:fixed;inset:0;z-index:2000;background:rgba(10,10,20,.82);backdrop-filter:blur(12px)">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(92vw,480px);background:linear-gradient(145deg,#13132b,#1e1b4b);border:1.5px solid rgba(37,99,235,.3);border-radius:24px;padding:32px 28px;box-shadow:0 32px 80px rgba(0,0,0,.7);text-align:center">
    <!-- 아이콘 애니메이션 -->
    <div style="width:72px;height:72px;margin:0 auto 20px;position:relative">
      <svg viewBox="0 0 72 72" style="width:72px;height:72px;animation:renderSpin 2.4s linear infinite">
        <circle cx="36" cy="36" r="30" fill="none" stroke="rgba(37,99,235,.2)" stroke-width="5"/>
        <circle cx="36" cy="36" r="30" fill="none" stroke="url(#rg)" stroke-width="5" stroke-linecap="round" stroke-dasharray="100 90" stroke-dashoffset="0"/>
        <defs><linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#2563eb"/><stop offset="100%" stop-color="#3b82f6"/></linearGradient></defs>
      </svg>
      <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:26px">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="4" fill="#2563eb" opacity=".15"/><path d="M8 5v14l11-7-11-7z" fill="#60a5fa"/></svg>
      </div>
    </div>
    <div id="render-modal-title" style="color:#e2e8f0;font-size:18px;font-weight:900;margin-bottom:6px;letter-spacing:-.3px">영상 제작 중...</div>
    <div id="render-modal-pct" style="color:#a5b4fc;font-size:28px;font-weight:900;margin:8px 0 4px;font-family:monospace">0%</div>
    <!-- 프로그레스 바 -->
    <div style="background:rgba(255,255,255,.08);border-radius:99px;height:8px;margin:10px 0 14px;overflow:hidden">
      <div id="render-modal-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#2563eb,#3b82f6,#2563eb);border-radius:99px;transition:width .3s;box-shadow:0 0 12px rgba(37,99,235,.6)"></div>
    </div>
    <!-- 씬 도트 -->
    <div id="render-modal-scene" style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin-bottom:12px;min-height:22px"></div>
    <!-- 로그 -->
    <div id="render-modal-log" style="background:rgba(0,0,0,.35);border-radius:10px;padding:10px 12px;font-size:10px;color:#64748b;font-family:monospace;text-align:left;max-height:80px;overflow-y:auto;margin-bottom:16px;border:1px solid rgba(255,255,255,.06)"></div>
    <button onclick="cancelMake()" style="background:rgba(239,68,68,.12);color:#f87171;border:1px solid rgba(239,68,68,.25);border-radius:12px;padding:10px 28px;font-size:12px;font-weight:800;cursor:pointer;transition:all .2s" onmouseover="this.style.background='rgba(239,68,68,.22)'" onmouseout="this.style.background='rgba(239,68,68,.12)'">
      ⏹ 제작 취소
    </button>
  </div>
</div>

<!-- ══ 완료 다운로드 팝업 모달 ══ -->
<div id="done-modal" style="display:none;position:fixed;inset:0;z-index:2000;background:rgba(10,10,20,.85);backdrop-filter:blur(14px)">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(92vw,520px);background:linear-gradient(145deg,#0a1a0a,#0f2d0f);border:1.5px solid rgba(16,185,129,.3);border-radius:24px;padding:32px 28px;box-shadow:0 32px 80px rgba(0,0,0,.7);text-align:center">
    <!-- 완료 아이콘 -->
    <div style="width:76px;height:76px;margin:0 auto 20px;background:linear-gradient(135deg,#059669,#10b981);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 32px rgba(16,185,129,.4);animation:donePop .5s cubic-bezier(.34,1.56,.64,1)">
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </div>
    <div style="color:#ecfdf5;font-size:22px;font-weight:900;margin-bottom:4px;letter-spacing:-.5px">영상 완성!</div>
    <div id="done-modal-info" style="color:#6ee7b7;font-size:12px;margin-bottom:18px"></div>
    <!-- 미리보기 비디오 -->
    <video id="done-modal-video" controls playsinline style="width:100%;max-height:240px;border-radius:14px;border:2px solid rgba(16,185,129,.25);box-shadow:0 8px 32px rgba(0,0,0,.5);margin-bottom:18px;background:#000;display:block"></video>
    <!-- 액션 버튼 -->
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button onclick="doDownload();trackDoneModal('download')" style="flex:1;min-width:120px;background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:none;border-radius:14px;padding:13px 20px;font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;box-shadow:0 4px 20px rgba(16,185,129,.35);transition:all .2s" onmouseover="this.style.filter='brightness(1.1)'" onmouseout="this.style.filter=''">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 3v13M5 16l7 7 7-7" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        다운로드
      </button>
      <button onclick="saveToGallery()" style="flex:1;min-width:110px;background:rgba(37,99,235,.15);color:#a5b4fc;border:1.5px solid rgba(37,99,235,.3);border-radius:14px;padding:13px 20px;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s" onmouseover="this.style.background='rgba(37,99,235,.25)'" onmouseout="this.style.background='rgba(37,99,235,.15)'">
        갤러리 저장
      </button>
      <button onclick="closeDoneModal()" style="flex:1;min-width:100px;background:rgba(255,255,255,.06);color:#94a3b8;border:1.5px solid rgba(255,255,255,.1);border-radius:14px;padding:13px 20px;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s" onmouseover="this.style.background='rgba(255,255,255,.12)'" onmouseout="this.style.background='rgba(255,255,255,.06)'">
        다시 제작
      </button>
    </div>
  </div>
</div>

<style>
@keyframes renderSpin{to{transform:rotate(360deg)}}
@keyframes donePop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
</style>

<!-- ══ PEXELS 무료 미디어 라이브러리 모달 ══ -->
<div id="pexels-modal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.72);backdrop-filter:blur(6px)">
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(90vw,780px);max-height:88vh;background:#fff;border-radius:20px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 64px rgba(0,0,0,.4)">
    <!-- 모달 헤더 -->
    <div style="display:flex;align-items:center;gap:10px;padding:16px 20px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;flex-shrink:0">
      <span style="font-size:18px;font-weight:900"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f5bc.svg" class="tw" alt="🖼"> 무료 미디어 라이브러리</span>
      <span style="font-size:10px;opacity:.8;background:rgba(255,255,255,.2);padding:2px 8px;border-radius:10px">Pexels + Pixabay · 200,000+ 무료 사진/영상</span>
      <button onclick="closePexelsModal()" style="margin-left:auto;background:rgba(255,255,255,.2);border:none;color:#fff;border-radius:8px;padding:6px 14px;cursor:pointer;font-size:11px;font-weight:700"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/2715.svg" class="tw" alt="✕"> 닫기</button>
    </div>
    <!-- 소스 선택 탭 -->
    <div style="display:flex;gap:0;border-bottom:2px solid #e5e7eb;background:#f9fafb;flex-shrink:0">
      <button id="media-tab-pexels" onclick="switchMediaSource('pexels')" style="flex:1;padding:10px;font-size:11px;font-weight:800;border:none;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;cursor:pointer;border-radius:0"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f30a.svg" class="tw" alt="🌊"> Pexels</button>
      <button id="media-tab-pixabay" onclick="switchMediaSource('pixabay')" style="flex:1;padding:10px;font-size:11px;font-weight:700;border:none;background:#f9fafb;color:#64748b;cursor:pointer;border-radius:0"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f338.svg" class="tw" alt="🌸"> Pixabay</button>
    </div>
    <!-- 검색 바 -->
    <div style="padding:14px 20px;border-bottom:1px solid #e5e7eb;flex-shrink:0;display:flex;gap:8px;align-items:center">
      <input id="pexels-search-input" type="text" placeholder="키워드 검색... (예: 학원, 공부, 선생님, 행복)" style="flex:1;padding:10px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:12px;outline:none;font-family:inherit" onkeydown="if(event.key==='Enter'){if(_currentMediaSource==='pixabay')searchPixabay();else searchPexels();}" oninput="onPexelsSearchInput()">
      <button onclick="if(_currentMediaSource==='pixabay'){searchPixabay();}else{searchPexels();}" style="padding:10px 18px;background:linear-gradient(135deg,#06b6d4,#0891b2);color:#fff;border:none;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f50d.svg" class="tw" alt="🔍"> 검색</button>
      <select id="pexels-type-sel" onchange="if(_currentMediaSource==='pixabay'){searchPixabay();}else{searchPexels();}" style="padding:10px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:11px;font-family:inherit;outline:none">
        <option value="photos"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f4f7.svg" class="tw" alt="📷"> 사진</option>
        <option value="videos"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f3ac.svg" class="tw" alt="🎬"> 영상</option>
      </select>
    </div>
    <!-- 빠른 카테고리 -->
    <div style="padding:10px 20px;border-bottom:1px solid #f3f4f6;flex-shrink:0;display:flex;gap:6px;flex-wrap:wrap">
      <span style="font-size:9px;color:#9ca3af;font-weight:700;align-self:center">빠른 검색:</span>
      <button class="pexels-cat-btn" onclick="quickPexels('학원')">학원</button>
      <button class="pexels-cat-btn" onclick="quickPexels('공부')">공부</button>
      <button class="pexels-cat-btn" onclick="quickPexels('선생님')">선생님</button>
      <button class="pexels-cat-btn" onclick="quickPexels('학생')">학생</button>
      <button class="pexels-cat-btn" onclick="quickPexels('교육')">교육</button>
      <button class="pexels-cat-btn" onclick="quickPexels('비즈니스')">비즈니스</button>
      <button class="pexels-cat-btn" onclick="quickPexels('자연')">자연</button>
      <button class="pexels-cat-btn" onclick="quickPexels('도시')">도시</button>
      <button class="pexels-cat-btn" onclick="quickPexels('기술')">기술</button>
      <button class="pexels-cat-btn" onclick="quickPexels('음식')">음식</button>
      <button class="pexels-cat-btn" onclick="quickPexels('fitness')">피트니스</button>
      <button class="pexels-cat-btn" onclick="quickPexels('office')">오피스</button>
      <button class="pexels-cat-btn" onclick="quickPexels('background')">배경</button>
      <button class="pexels-cat-btn" onclick="quickPexels('abstract')">추상</button>
    </div>
    <!-- 그리드 -->
    <div id="pexels-grid" style="flex:1;overflow-y:auto;padding:14px 20px;display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px;min-height:200px">
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af"><img src="https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/1f50d.svg" class="tw" alt="🔍"> 검색어를 입력하거나 위 카테고리를 클릭하세요</div>
    </div>
    <!-- 하단 로드 더 버튼 -->
    <div style="padding:12px 20px;border-top:1px solid #f3f4f6;flex-shrink:0;display:flex;gap:8px;align-items:center">
      <span id="pexels-count-lbl" style="font-size:10px;color:#6b7280"></span>
      <button id="pexels-load-more" onclick="loadMorePexels()" style="display:none;margin-left:auto;padding:8px 18px;background:#f3f4f6;border:none;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;color:#374151">더 불러오기</button>
    </div>
  </div>
</div>

<style>
.pexels-cat-btn{padding:4px 10px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:12px;font-size:9px;font-weight:700;color:#0369a1;cursor:pointer;transition:all .15s}
.pexels-cat-btn:hover{background:#0891b2;color:#fff;border-color:#0891b2}
.pexels-item{position:relative;border-radius:10px;overflow:hidden;cursor:pointer;aspect-ratio:4/3;border:2px solid transparent;transition:all .18s;background:#f3f4f6}
.pexels-item:hover{border-color:#06b6d4;transform:scale(1.02);box-shadow:0 4px 16px rgba(6,182,212,.25)}
.pexels-item img,.pexels-item video{width:100%;height:100%;object-fit:cover}
.pexels-item-overlay{position:absolute;inset:0;background:rgba(0,0,0,0);transition:background .15s;display:flex;align-items:center;justify-content:center}
.pexels-item:hover .pexels-item-overlay{background:rgba(0,0,0,.35)}
.pexels-item-use{display:none;padding:6px 14px;background:rgba(6,182,212,.95);color:#fff;border:none;border-radius:8px;font-size:10px;font-weight:800;cursor:pointer}
.pexels-item:hover .pexels-item-use{display:block}
.pexels-item-type{position:absolute;top:4px;left:4px;font-size:8px;padding:2px 5px;border-radius:4px;font-weight:700}
/* 타임라인 진행바 + 씬 도트 */
.tl-track{
  position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);
  height:4px;background:#e0e7ff;border-radius:2px;
}
.tl-track-fill{
  height:100%;background:linear-gradient(90deg,var(--primary),var(--accent));
  border-radius:2px;transition:width .2s;
}
.tl-dot{
  position:absolute;top:50%;transform:translate(-50%,-50%);
  width:18px;height:18px;border-radius:50%;
  background:#fff;border:3px solid var(--primary);
  cursor:pointer;transition:all .15s;z-index:5;
  box-shadow:0 2px 8px rgba(37,99,235,.25);
}
.tl-dot.active{
  width:22px;height:22px;
  background:var(--primary);border-color:#fff;
  box-shadow:0 0 0 3px rgba(37,99,235,.3),0 2px 8px rgba(37,99,235,.4);
}
.tl-dot:hover:not(.active){
  width:20px;height:20px;
  background:var(--primary);border-color:#fff;opacity:.85;
}
.tl-dot-label{
  position:absolute;bottom:calc(100% + 5px);left:50%;transform:translateX(-50%);
  font-size:7px;font-weight:800;color:var(--primary);
  white-space:nowrap;pointer-events:none;
}
.tl-dur-popup{
  position:fixed;background:#fff;border:1.5px solid var(--primary);
  border-radius:10px;padding:8px 14px;font-size:11px;font-weight:700;
  box-shadow:0 4px 16px rgba(0,0,0,.15);z-index:999;pointer-events:none;
  color:var(--text1);min-width:100px;text-align:center;
}
.tl-dur-slider{
  width:100%;-webkit-appearance:none;height:4px;border-radius:2px;
  background:var(--primary);outline:none;cursor:pointer;
  pointer-events:auto;margin-top:6px;
}
.tl-dur-slider::-webkit-slider-thumb{
  -webkit-appearance:none;width:14px;height:14px;
  border-radius:50%;background:var(--primary);cursor:pointer;
}
.embed .tb{display:none!important}.embed .app{height:100vh!important}
</style>

<script>
// ══════════════════════════════════════════════════════════════
//  BUILD MARKER — tts-v2-20260422-ICN-fix
//  브라우저 콘솔에서 window.__TTS_BUILD_ID 값으로 확인 가능.
//  이 값이 안 나오면 캐시된 옛 JS 를 사용 중이라는 뜻 → Ctrl+Shift+R 필요.
// ══════════════════════════════════════════════════════════════
window.__TTS_BUILD_ID = 'v8-20260424-timeslice1000-clean-rewrite';
console.log('%c[VideoMaker Build]', 'color:#10b981;font-weight:bold', window.__TTS_BUILD_ID, '- timeslice=1000ms clean rewrite, onstop direct _buildResult');

// 🧹 혹시 등록된 Service Worker 있으면 자동 해제 (401 캐시 원인 제거)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs){
    regs.forEach(function(r){
      console.warn('[VideoMaker] Service Worker 감지 → 해제:', r.scope);
      r.unregister();
    });
  }).catch(function(){});
}
// 🧹 Cache Storage API 에 저장된 예전 응답도 모두 삭제
if ('caches' in window) {
  caches.keys().then(function(names){
    names.forEach(function(n){
      console.warn('[VideoMaker] Cache 삭제:', n);
      caches.delete(n);
    });
  }).catch(function(){});
}

// ══════════════════════════════════════════════════════════════
//  STATE
// ══════════════════════════════════════════════════════════════
var S = {
  fmt: 'short',
  dur: 30,
  tplId: 0,
  voiceIdx: -1,
  voiceGId: 'openai:gpt-4o-mini-tts:echo', // gId 기반 저장 (재빌드 후에도 목소리 유지)
  bgmIdx: 0,
  scenes: []
};
var curScene = 0;
var allVoices = [];
var filteredVoices = [];
var curVTag = 'all';
// ── 현재 선택된 목소리 안전하게 반환 (gId 기반 재동기화 포함) ──
function getCurVoice(){
  var _gId = S.voiceGId || 'openai:gpt-4o-mini-tts:echo';
  // voiceIdx가 가리키는 목소리의 gId가 다르면 재탐색
  var _cur = allVoices[S.voiceIdx];
  if(_cur && _cur.gId === _gId) return _cur;
  var _idx = allVoices.findIndex(function(v){ return v.gId === _gId; });
  if(_idx >= 0){ S.voiceIdx = _idx; return allVoices[_idx]; }
  // fallback: Echo 4o
  var _echo = allVoices.findIndex(function(v){ return v.gId==='openai:gpt-4o-mini-tts:echo'; });
  if(_echo >= 0){ S.voiceIdx=_echo; S.voiceGId='openai:gpt-4o-mini-tts:echo'; return allVoices[_echo]; }
  // ── 최후 fallback: allVoices가 비어있어도 Echo 4o 객체 직접 반환 ──
  // (buildVoiceList가 아직 실행되지 않았을 때 null 반환 방지)
  var _anyIdx = S.voiceIdx >= 0 && S.voiceIdx < allVoices.length ? S.voiceIdx : -1;
  if(_anyIdx >= 0) return allVoices[_anyIdx];
  // 완전히 비어있을 때 Echo 4o 기본 객체 반환
  return {
    name:'Echo 4o (OpenAI·남성)', lang:'ko-KR', gender:'male',
    pitch:1.0, rate:1.0, ico:'🔊', bg:'#1e40af',
    desc:'OpenAI Echo (gpt-4o-mini-tts): 최신 모델 남성',
    special:null, gId:'openai:gpt-4o-mini-tts:echo',
    gPitch:0, gRate:1.0,
    isGoogleTTS:true, isHFTTS:false, isOpenAITTS:true,
    sysVoice:null
  };
}
var filteredBGM = [];
var curBTag = 'all';
var bgmVol = 0.2;
var previewPlaying = false;
var previewRAF = null;
var previewStopped = false; // 미리보기 TTS 중지 전용 플래그
var cancelledRender = false;
var previewBGMCtx = null; // 미리보기 BGM AudioContext
var previewBGMAudio = null; // URL 기반 미리보기 BGM <audio>
var _previewTTSCtx = null; // 미리보기 TTS 단일 AudioContext (갭 없는 연속 재생)
var _recBGMCtx = null; // 녹화용 BGM AudioContext (중복 방지)
var _recBGMAudio = null; // URL 기반 녹화 BGM <audio>
var previewSceneIdx = 0; // TTS 씬 인덱스 (TTS 완료 시 갱신)
var renderedBlob = null;
var mediaRec = null;
var recChunks = [];
var audioCtx = null;
var bgmOsc = null;
var sceneImgs = {};

// ══════════════════════════════════════════════════════════════
//  EDITING OPTIONS STATE
// ══════════════════════════════════════════════════════════════
var editOpts = {
  transition: 'none',    // 트랜지션
  filter: 'none',        // 색감 필터
  subtitle: 'none',      // 자막 스타일
  overlay: 'none',       // 오버레이 효과
  mood: 'normal',        // 분위기
  adsBadge: false,       // 광고 배지
  adsPrice: false,       // 가격 표시
  adsCTA: false,         // CTA 버튼
  adsSale: false,        // 할인 배너
  textAnim: 'slide',     // 텍스트 애니메이션
  platform: 'short',     // 플랫폼 최적화
  subSize: 1.0,          // 자막 크기
  subPos: 0.85,          // 자막 위치
  vidSpeed: 1.0,         // 영상 속도
  brightness: 1.0,       // 밝기
  contrast: 1.0,         // 대비
  saturation: 1.0,       // 채도
  textAlign: 'center',   // 텍스트 정렬
  titleSize: 1.0,        // 제목 크기 배율
  bodySize: 1.0,         // 본문 크기 배율
  watermark: '',         // 워터마크 텍스트
  brandName: '',         // 학원/채널 이름 (sp-* 템플릿 헤더에 표시)
  viewCount: '',         // 조회수 (앱광고형 제목 하단에 표시)
  bgFit: 'cover',        // 배경 이미지 맞춤
  titleColor: '',        // 제목 색상 (비어있으면 템플릿 기본값)
  bodyColor: '',         // 본문 색상
  bgColor: '',           // 배경 단색
  bgGradient: 'none'     // 배경 그라디언트
};

// Gallery storage
var videoGallery = [];  // [{name, blob, url, fmt, dur, tpl, date, thumb}]

// Template platform filter
var curTplPlatform = 'all';

// ══════════════════════════════════════════════════════════════
//  TREND TEMPLATES 2025-2026 — TikTok·릴스·쇼츠 실제 유행 스타일
//  Each has: bg colors, text layout, accent color, fx, platforms
// ══════════════════════════════════════════════════════════════
var TPLS = [
  // ── BYGENCY 숏폼 전용 템플릿 ──
  {n:'앱광고형',cat:'숏폼',badge:'📱 APP AD',badgeClr:'#4a2d7a',
   bg:['#ffffff','#f5f5f5'],acc:'#4a2d7a',
   txt:{titleClr:'#111111',bodyClr:'#444444',align:'left',titleFont:'900',pos:'sp-app-ad'},fx:'none',
   platforms:['capcut','reels','ads']},

  {n:'인스타광고형',cat:'숏폼',badge:'📸 INSTA',badgeClr:'#5b5ef4',
   bg:['#f5f5f0','#eeeee8'],acc:'#5bc4e8',
   txt:{titleClr:'#111111',bodyClr:'#2a2a2a',align:'center',titleFont:'900',pos:'sp-insta-ad'},fx:'none',
   platforms:['reels','ads','capcut']},

  {n:'배너강조형',cat:'숏폼',badge:'🎯 BANNER',badgeClr:'#3a76d8',
   bg:['#ffffff','#f0f4ff'],acc:'#3a76d8',
   txt:{titleClr:'#111111',bodyClr:'#222222',align:'left',titleFont:'900',pos:'sp-banner'},fx:'none',
   platforms:['capcut','youtube','reels']},

  // ── 3. Swiss Clean  ─ 스위스 타이포그래피 미니멀 ──
  // 2026 디자인 트렌드 1위: 타이포가 전부인 흰 배경 레이아웃
  {n:'Swiss Clean',cat:'미니멀',badge:'✦ DESIGN',badgeClr:'#000000',
   bg:['#f8f8f8','#efefef'],acc:'#ff0050',
   txt:{titleClr:'#0a0a0a',bodyClr:'#444444',align:'left',titleFont:'900',pos:'swiss-clean'},fx:'none',
   platforms:['capcut','reels','youtube','ads']},

  // ── 5. Zine Cut  ─ 콜라주/진 미학 (2026 그래픽 트렌드 TOP) ──
  // 불규칙한 텍스트 블록, 잘린 레이아웃, 날 것의 에너지
  {n:'Zine Cut',cat:'트렌디',badge:'✂ ZINE',badgeClr:'#dc2626',
   bg:['#f0ebe3','#e8e0d5'],acc:'#dc2626',
   txt:{titleClr:'#0a0a0a',bodyClr:'#2a2a2a',align:'left',titleFont:'900',pos:'zine-cut'},fx:'none',
   platforms:['reels','capcut','ads']},


  // ── 14. Minimal Line  ─ 극미니멀 라인 아트 ──
  // 선 하나로 구성하는 고급 미니멀 레이아웃, 럭셔리 브랜드 감성
  {n:'Minimal Line',cat:'미니멀',badge:'━ LINE',badgeClr:'#18181b',
   bg:['#fafafa','#f4f4f5'],acc:'#18181b',
   txt:{titleClr:'#09090b',bodyClr:'#52525b',align:'left',titleFont:'300',pos:'minimal-line'},fx:'none',
   platforms:['ads','reels','youtube']},

  // ── 17. Magazine Cut  ─ 매거진 컷아웃 레이아웃 ──
  // Vogue/i-D 스타일: 대형 세리프 + 사진 오버랩 레이아웃
  {n:'Magazine Cut',cat:'드라마',badge:'📰 MAG',badgeClr:'#991b1b',
   bg:['#fef2f2','#fff1f2'],acc:'#dc2626',
   txt:{titleClr:'#1c1917',bodyClr:'#44403c',align:'left',titleFont:'900',pos:'magazine-cut'},fx:'none',
   platforms:['reels','ads','capcut']},

  // ── 18. Shorts Frame  ─ 유튜브 숏츠 스타일 ──
  // 상단 제목 + 중앙 미디어 박스 + 하단 자막바 레이아웃
  {n:'Shorts Frame',cat:'숏폼',badge:'▶ SHORTS',badgeClr:'#ff0000',
   bg:['#ffffff','#f0f0f0'],acc:'#ff0000',
   txt:{titleClr:'#0a0a0a',bodyClr:'#1a1a1a',align:'center',titleFont:'900',pos:'shorts-frame'},fx:'none',
   platforms:['youtube','reels','capcut']},

];

// ══════════════════════════════════════════════════════════════
// TTS 음성 정의
// - Google Cloud TTS: gId가 "gtts:ko-KR-Neural2-A" 형식
//   → 환경변수 [Text_to_Speech] (Google Cloud TTS API 키) 사용
// - HuggingFace TTS: gId가 "hf:Jon" / "ko-KR-f-1" 형식
//   → 환경변수 [HF_TOKEN] (HuggingFace API 토큰) 사용
// ══════════════════════════════════════════════════════════════
// ── Google Cloud TTS 음성 (Neural2/WaveNet - 실제 다양한 목소리) ──
// 환경변수 Text_to_Speech 에 Google Cloud TTS API Key 설정 필요
var GOOGLE_TTS_VOICES = [
  // ─── 🇰🇷 한국어 Neural2 (최고 품질, 공식 존재 목소리만: A여,B여,C남) ───
  {name:'지수 (한국어·여·Neural2-A)', lang:'ko-KR',gender:'female',ico:'✨',bg:'#15803d',desc:'Google Neural2 한국어 여성1',gId:'gtts:ko-KR-Neural2-A',gPitch:0,  gRate:1.0},
  {name:'수아 (한국어·여·Neural2-B)', lang:'ko-KR',gender:'female',ico:'💎',bg:'#166534',desc:'Google Neural2 한국어 여성2',gId:'gtts:ko-KR-Neural2-B',gPitch:2,  gRate:1.0},
  {name:'준서 (한국어·남·Neural2-C)', lang:'ko-KR',gender:'male',  ico:'⭐',bg:'#1e3a8a',desc:'Google Neural2 한국어 남성1',gId:'gtts:ko-KR-Neural2-C',gPitch:0,  gRate:1.0},
  // ─── 🇰🇷 한국어 WaveNet (A여,B여,C남,D남) ───
  {name:'아라 (한국어·여·WaveNet-A)',  lang:'ko-KR',gender:'female',ico:'🌸',bg:'#0f766e',desc:'Google WaveNet 한국어 여성A',gId:'gtts:ko-KR-Wavenet-A',gPitch:1,  gRate:1.0},
  {name:'나래 (한국어·여·WaveNet-B)',  lang:'ko-KR',gender:'female',ico:'🎵',bg:'#0d9488',desc:'Google WaveNet 한국어 여성B',gId:'gtts:ko-KR-Wavenet-B',gPitch:3,  gRate:1.0},
  {name:'도현 (한국어·남·WaveNet-C)',  lang:'ko-KR',gender:'male',  ico:'🎙️',bg:'#1d4ed8',desc:'Google WaveNet 한국어 남성C',gId:'gtts:ko-KR-Wavenet-C',gPitch:-1, gRate:1.0},
  {name:'강민 (한국어·남·WaveNet-D)',  lang:'ko-KR',gender:'male',  ico:'🏆',bg:'#1e40af',desc:'Google WaveNet 한국어 남성D',gId:'gtts:ko-KR-Wavenet-D',gPitch:-3, gRate:1.0},
  // ─── 🇰🇷 한국어 Standard (A여,B여,C남,D남) ───
  {name:'소이 (한국어·여·Standard-A)', lang:'ko-KR',gender:'female',ico:'🌟',bg:'#065f46',desc:'Google Standard 한국어 여성A',gId:'gtts:ko-KR-Standard-A',gPitch:0,  gRate:1.0},
  {name:'하은 (한국어·여·Standard-B)', lang:'ko-KR',gender:'female',ico:'💐',bg:'#134e4a',desc:'Google Standard 한국어 여성B',gId:'gtts:ko-KR-Standard-B',gPitch:2,  gRate:1.0},
  {name:'재원 (한국어·남·Standard-C)', lang:'ko-KR',gender:'male',  ico:'🎧',bg:'#1e3a5f',desc:'Google Standard 한국어 남성C',gId:'gtts:ko-KR-Standard-C',gPitch:0,  gRate:1.0},
  {name:'민준 (한국어·남·Standard-D)', lang:'ko-KR',gender:'male',  ico:'📻',bg:'#1e2a4a',desc:'Google Standard 한국어 남성D',gId:'gtts:ko-KR-Standard-D',gPitch:-2, gRate:1.0},
  // ─── 🇺🇸 영어 Neural2 ───
  // en-US-Neural2: A남,B남,C여,D남,E여,F여
  // (참고: 영어는 실제 다양한 목소리이므로 Google TTS 키 필요)
  {name:'Aria (EN·여·Neural2-C)',      lang:'en-US',gender:'female',ico:'👩',bg:'#059669',desc:'Google Neural2 English Female C',gId:'gtts:en-US-Neural2-C',gPitch:0, gRate:1.0},
  {name:'Brandon (EN·남·Neural2-B)',   lang:'en-US',gender:'male',  ico:'👨',bg:'#374151',desc:'Google Neural2 English Male B',   gId:'gtts:en-US-Neural2-B',gPitch:0, gRate:1.0},
  {name:'Chloe (EN·여·Neural2-E)',     lang:'en-US',gender:'female',ico:'✨',bg:'#0891b2',desc:'Google Neural2 English Female E',gId:'gtts:en-US-Neural2-E',gPitch:2, gRate:1.0},
  {name:'Dylan (EN·남·Neural2-D)',     lang:'en-US',gender:'male',  ico:'🎤',bg:'#1d4ed8',desc:'Google Neural2 English Male D',   gId:'gtts:en-US-Neural2-D',gPitch:-2,gRate:1.0},
  {name:'Evelyn (EN·여·Neural2-F)',    lang:'en-US',gender:'female',ico:'🌸',bg:'#065f46',desc:'Google Neural2 English Female F',gId:'gtts:en-US-Neural2-F',gPitch:1, gRate:1.0},
  {name:'Frank (EN·남·Neural2-A)',     lang:'en-US',gender:'male',  ico:'🎙️',bg:'#1e3a8a',desc:'Google Neural2 English Male A',   gId:'gtts:en-US-Neural2-A',gPitch:-3,gRate:1.0},
  // ─── 🇬🇧 영국 영어 Neural2 (A여,B남,C여,D남,F여) ───
  {name:'Alice (EN-GB·여·Neural2-A)', lang:'en-GB',gender:'female',ico:'🇬🇧',bg:'#0369a1',desc:'Google Neural2 British Female A',gId:'gtts:en-GB-Neural2-A',gPitch:0, gRate:1.0},
  {name:'George (EN-GB·남·Neural2-B)',lang:'en-GB',gender:'male',  ico:'🏰',bg:'#0c4a6e',desc:'Google Neural2 British Male B', gId:'gtts:en-GB-Neural2-B',gPitch:-2,gRate:1.0},
];

// ── OpenAI TTS 음성 (OpenAI_Text_to_speech 환경변수 필요) ──
// OpenAI TTS API: tts-1 모델, 6가지 고품질 목소리 (한국어 포함 다국어 지원)
// OpenAI TTS 모델: tts-1(빠름), tts-1-hd(고품질), gpt-4o-mini-tts(최신)
// voiceId 형식: "openai:voice" 또는 "openai:model:voice"
// 예: "openai:alloy" → tts-1 기본, "openai:tts-1-hd:nova" → tts-1-hd로 nova 목소리
var OPENAI_TTS_VOICES = [
  // ── tts-1 (기본·빠름) ──
  {name:'Alloy (OpenAI·중성)', lang:'ko-KR',gender:'female',ico:'🤖',bg:'#0ea5e9',desc:'OpenAI Alloy (tts-1): 중성적이고 균형잡힌 목소리',gId:'openai:alloy',gPitch:0,gRate:1.0},
  {name:'Echo (OpenAI·남성)',  lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#0369a1',desc:'OpenAI Echo (tts-1): 낮고 안정적인 남성 목소리',  gId:'openai:echo', gPitch:0,gRate:1.0},
  {name:'Fable (OpenAI·남성)',lang:'ko-KR',gender:'male',  ico:'📖',bg:'#1e3a8a',desc:'OpenAI Fable (tts-1): 영국식 억양의 남성 목소리', gId:'openai:fable',gPitch:0,gRate:1.0},
  {name:'Onyx (OpenAI·남성)', lang:'ko-KR',gender:'male',  ico:'⬛',bg:'#0f172a',desc:'OpenAI Onyx (tts-1): 깊고 굵은 남성 목소리',     gId:'openai:onyx', gPitch:0,gRate:1.0},
  {name:'Nova (OpenAI·여성)', lang:'ko-KR',gender:'female',ico:'✨',bg:'#6d28d9',desc:'OpenAI Nova (tts-1): 밝고 에너지 넘치는 여성',    gId:'openai:nova', gPitch:0,gRate:1.0},
  {name:'Shimmer (OpenAI·여성)',lang:'ko-KR',gender:'female',ico:'💫',bg:'#7c3aed',desc:'OpenAI Shimmer (tts-1): 부드럽고 따뜻한 여성',  gId:'openai:shimmer',gPitch:0,gRate:1.0},
  {name:'Ash (OpenAI·중성)',  lang:'ko-KR',gender:'neutral',ico:'🌿',bg:'#059669',desc:'OpenAI Ash (tts-1): 자연스럽고 차분한 중성 목소리', gId:'openai:ash', gPitch:0,gRate:1.0},
  {name:'Coral (OpenAI·여성)',lang:'ko-KR',gender:'female', ico:'🪸',bg:'#e11d48',desc:'OpenAI Coral (tts-1): 따뜻하고 친근한 여성 목소리',gId:'openai:coral',gPitch:0,gRate:1.0},
  {name:'Sage (OpenAI·중성)', lang:'ko-KR',gender:'neutral',ico:'🌱',bg:'#0d9488',desc:'OpenAI Sage (tts-1): 지적이고 차분한 중성 목소리', gId:'openai:sage', gPitch:0,gRate:1.0},
  // ── tts-1-hd (고품질) ──
  {name:'Alloy HD (OpenAI·중성)', lang:'ko-KR',gender:'female',ico:'🤖',bg:'#0284c7',desc:'OpenAI Alloy (tts-1-hd): 고품질 중성 목소리',gId:'openai:tts-1-hd:alloy',gPitch:0,gRate:1.0},
  {name:'Echo HD (OpenAI·남성)',  lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#0c4a6e',desc:'OpenAI Echo (tts-1-hd): 고품질 남성 목소리',  gId:'openai:tts-1-hd:echo', gPitch:0,gRate:1.0},
  {name:'Nova HD (OpenAI·여성)', lang:'ko-KR',gender:'female',ico:'✨',bg:'#581c87',desc:'OpenAI Nova (tts-1-hd): 고품질 여성 목소리',    gId:'openai:tts-1-hd:nova', gPitch:0,gRate:1.0},
  {name:'Shimmer HD (OpenAI·여성)',lang:'ko-KR',gender:'female',ico:'💫',bg:'#4c1d95',desc:'OpenAI Shimmer (tts-1-hd): 고품질 부드러운 여성',gId:'openai:tts-1-hd:shimmer',gPitch:0,gRate:1.0},
  {name:'Onyx HD (OpenAI·남성)', lang:'ko-KR',gender:'male',  ico:'⬛',bg:'#1c1917',desc:'OpenAI Onyx (tts-1-hd): 고품질 깊은 남성',     gId:'openai:tts-1-hd:onyx', gPitch:0,gRate:1.0},
  // ── gpt-4o-mini-tts (최신·자연스러운) ──
  {name:'Alloy 4o (OpenAI·중성)', lang:'ko-KR',gender:'female',ico:'🤖',bg:'#0ea5e9',desc:'OpenAI Alloy (gpt-4o-mini-tts): 최신 모델 중성',gId:'openai:gpt-4o-mini-tts:alloy',gPitch:0,gRate:1.0},
  {name:'Nova 4o (OpenAI·여성)', lang:'ko-KR',gender:'female',ico:'✨',bg:'#7c3aed',desc:'OpenAI Nova (gpt-4o-mini-tts): 최신 모델 여성',  gId:'openai:gpt-4o-mini-tts:nova', gPitch:0,gRate:1.0},
  {name:'Shimmer 4o (OpenAI·여성)',lang:'ko-KR',gender:'female',ico:'💫',bg:'#6d28d9',desc:'OpenAI Shimmer (gpt-4o-mini-tts): 최신 부드러운 여성',gId:'openai:gpt-4o-mini-tts:shimmer',gPitch:0,gRate:1.0},
  {name:'Echo 4o (OpenAI·남성)',  lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#1e40af',desc:'OpenAI Echo (gpt-4o-mini-tts): 최신 모델 남성',  gId:'openai:gpt-4o-mini-tts:echo', gPitch:0,gRate:1.0},
  {name:'Onyx 4o (OpenAI·남성)', lang:'ko-KR',gender:'male',  ico:'⬛',bg:'#18181b',desc:'OpenAI Onyx (gpt-4o-mini-tts): 최신 깊은 남성',  gId:'openai:gpt-4o-mini-tts:onyx', gPitch:0,gRate:1.0},
  {name:'Coral 4o (OpenAI·여성)',lang:'ko-KR',gender:'female', ico:'🪸',bg:'#be123c',desc:'OpenAI Coral (gpt-4o-mini-tts): 최신 친근한 여성',gId:'openai:gpt-4o-mini-tts:coral',gPitch:0,gRate:1.0},
];

// ── HuggingFace TTS 음성 (HF_TOKEN 필요) ──
// 영어: parler-tts-mini-v1 (다양한 화자) → gId: "hf:Jon", "hf:Lea" 등
// 한국어/일본어/중국어 등: MMS-TTS (단일화자) → gId: "ko-KR-f-1" 형식
var HF_TTS_VOICES = [
  // ─── 🇰🇷 한국어 (MMS-TTS-KOR, facebook/mms-tts-kor 단일화자) ───
  {name:'민지 (한국어·MMS)',lang:'ko-KR',gender:'female',ico:'🤗',bg:'#6d28d9',desc:'HuggingFace MMS 한국어',gId:'ko-KR-f-1',gPitch:0,gRate:1.0},
  // ─── 🇺🇸 영어 parler-tts (실제 다양한 화자) ───
  // hf: 접두사 + 화자이름 → 백엔드에서 parler-tts-mini-v1 사용
  {name:'Jon (EN·Parler)',  lang:'en-US',gender:'male',  ico:'🤗',bg:'#374151',desc:'Parler-TTS Jon: 모노톤 빠른 전달',   gId:'hf:Jon',    gPitch:0,gRate:1.0},
  {name:'Lea (EN·Parler)',  lang:'en-US',gender:'female',ico:'🤗',bg:'#059669',desc:'Parler-TTS Lea: 표현력 있고 생동감', gId:'hf:Lea',    gPitch:0,gRate:1.0},
  {name:'Gary (EN·Parler)', lang:'en-US',gender:'male',  ico:'🤗',bg:'#1e3a8a',desc:'Parler-TTS Gary: 깊고 낮은 목소리', gId:'hf:Gary',   gPitch:0,gRate:1.0},
  {name:'Jenna (EN·Parler)',lang:'en-US',gender:'female',ico:'🤗',bg:'#0891b2',desc:'Parler-TTS Jenna: 밝고 빠른 여성',  gId:'hf:Jenna',  gPitch:0,gRate:1.0},
  {name:'Mike (EN·Parler)', lang:'en-US',gender:'male',  ico:'🤗',bg:'#0f766e',desc:'Parler-TTS Mike: 자신감 있는 남성', gId:'hf:Mike',   gPitch:0,gRate:1.0},
  {name:'Laura (EN·Parler)',lang:'en-US',gender:'female',ico:'🤗',bg:'#065f46',desc:'Parler-TTS Laura: 따뜻하고 부드럽', gId:'hf:Laura',  gPitch:0,gRate:1.0},
  {name:'Rick (EN·Parler)', lang:'en-US',gender:'male',  ico:'🤗',bg:'#1e40af',desc:'Parler-TTS Rick: 거칠고 낮은 남성', gId:'hf:Rick',   gPitch:0,gRate:1.0},
  {name:'Alisa (EN·Parler)',lang:'en-US',gender:'female',ico:'🤗',bg:'#7e22ce',desc:'Parler-TTS Alisa: 밝고 활기찬 여성',gId:'hf:Alisa',  gPitch:0,gRate:1.0},
  {name:'Daniel (EN·Parler)',lang:'en-US',gender:'male', ico:'🤗',bg:'#1d4ed8',desc:'Parler-TTS Daniel: 전문적인 남성',  gId:'hf:Daniel', gPitch:0,gRate:1.0},
  {name:'Olivia (EN·Parler)',lang:'en-US',gender:'female',ico:'🤗',bg:'#0369a1',desc:'Parler-TTS Olivia: 활발한 여성',   gId:'hf:Olivia', gPitch:0,gRate:1.0},
];

// ── ElevenLabs TTS 목소리 (ElevenLabs_API_KEY 환경변수 필요) ──
// gId 형식: "el:VOICE_ID"  →  백엔드에서 ElevenLabs API 호출
var ELEVENLABS_TTS_VOICES = [
  // ─── 🇰🇷 한국어 지원 다국어 목소리 ───
  {name:'Rachel (EL·다국어)',  lang:'ko-KR',gender:'female',ico:'🔊',bg:'#7c3aed',desc:'ElevenLabs Rachel: 부드럽고 전문적',  gId:'el:21m00Tcm4TlvDq8ikWAM', gPitch:0,gRate:1.0},
  {name:'Domi (EL·다국어)',    lang:'ko-KR',gender:'female',ico:'🔊',bg:'#6d28d9',desc:'ElevenLabs Domi: 강하고 자신감 있는', gId:'el:AZnzlk1XvdvUeBnXmlld',  gPitch:0,gRate:1.0},
  {name:'Bella (EL·다국어)',   lang:'ko-KR',gender:'female',ico:'🔊',bg:'#5b21b6',desc:'ElevenLabs Bella: 부드럽고 따뜻한',   gId:'el:EXAVITQu4vr4xnSDxMaL',  gPitch:0,gRate:1.0},
  {name:'Antoni (EL·다국어)',  lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#1d4ed8',desc:'ElevenLabs Antoni: 잘 조율된 남성',   gId:'el:ErXwobaYiN019PkySvjV',  gPitch:0,gRate:1.0},
  {name:'Elli (EL·다국어)',    lang:'ko-KR',gender:'female',ico:'🔊',bg:'#0891b2',desc:'ElevenLabs Elli: 감정이 풍부한 여성', gId:'el:MF3mGyEYCl7XYWbV9V6O',  gPitch:0,gRate:1.0},
  {name:'Josh (EL·다국어)',    lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#065f46',desc:'ElevenLabs Josh: 젊고 활기찬 남성',   gId:'el:TxGEqnHWrfWFTfGW9XjX',  gPitch:0,gRate:1.0},
  {name:'Arnold (EL·다국어)', lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#1e3a8a',desc:'ElevenLabs Arnold: 힘차고 강인한',    gId:'el:VR6AewLTigWG4xSOukaG',  gPitch:0,gRate:1.0},
  {name:'Adam (EL·다국어)',   lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#3730a3',desc:'ElevenLabs Adam: 깊고 안정적인 남성', gId:'el:pNInz4obpRclQ5WKvqLj',  gPitch:0,gRate:1.0},
  {name:'Sam (EL·다국어)',    lang:'ko-KR',gender:'male',  ico:'🔊',bg:'#0f766e',desc:'ElevenLabs Sam: 거칠고 개성 있는',    gId:'el:yoZ06aMxZJJ28mfd3POQ',  gPitch:0,gRate:1.0},
  // ─── 고품질 신규 목소리 (Turbo v2.5) ───
  {name:'Sarah (EL·고품질)',  lang:'ko-KR',gender:'female',ico:'🔊',bg:'#be185d',desc:'ElevenLabs Sarah: 자연스럽고 친근한', gId:'el:EXAVITQu4vr4xnSDxMaL',  gPitch:0,gRate:1.0},
  {name:'Charlie (EL·고품질)',lang:'en-US',gender:'male',  ico:'🔊',bg:'#b45309',desc:'ElevenLabs Charlie: 캐주얼하고 자연스', gId:'el:IKne3meq5aSn9XLyUdCD', gPitch:0,gRate:1.0},
  {name:'Laura (EL·고품질)', lang:'en-US',gender:'female',ico:'🔊',bg:'#0369a1',desc:'ElevenLabs Laura: 업비트하고 명확한',  gId:'el:FGY2WhTYpPnrIDTdsKH5',  gPitch:0,gRate:1.0},
  {name:'George (EL·고품질)',lang:'en-US',gender:'male',  ico:'🔊',bg:'#1e40af',desc:'ElevenLabs George: 따뜻하고 느긋한',  gId:'el:JBFqnCBsd6RMkjVDRZzb',  gPitch:0,gRate:1.0},
  {name:'Callum (EL·고품질)',lang:'en-US',gender:'male',  ico:'🔊',bg:'#374151',desc:'ElevenLabs Callum: 강렬하고 불안정한', gId:'el:N2lVS1w4EtoT3dr4eOWO', gPitch:0,gRate:1.0},
];

var VOICE_DEFS = [
  // ─── 🎭 특수 효과 목소리 (릴스/쇼츠 인기) ───
  {name:'🤖 로봇 (Robot)',lang:'ko-KR',gender:'special',pitch:0.5,rate:0.85,ico:'🤖',bg:'#374151',desc:'기계 로봇 느낌 저음',special:'robot'},
  {name:'😈 악당 (Villain)',lang:'ko-KR',gender:'special',pitch:0.4,rate:0.75,ico:'😈',bg:'#1a1a2e',desc:'다크하고 느린 악당 보이스',special:'villain'},
  {name:'🧚 요정 (Fairy)',lang:'ko-KR',gender:'special',pitch:2.0,rate:1.4,ico:'🧚',bg:'#e879f9',desc:'높고 귀여운 요정 목소리',special:'fairy'},
  {name:'📺 뉴스앵커',lang:'ko-KR',gender:'special',pitch:1.0,rate:0.92,ico:'📺',bg:'#0f172a',desc:'뉴스 아나운서 스타일',special:'news'},
  {name:'🎧 ASMR',lang:'ko-KR',gender:'special',pitch:0.95,rate:0.7,ico:'🎧',bg:'#0f766e',desc:'매우 느리고 부드러운 ASMR',special:'asmr'},
  {name:'⚡ 에너지 MAX',lang:'ko-KR',gender:'special',pitch:1.5,rate:1.9,ico:'⚡',bg:'#b45309',desc:'최고속·고에너지 목소리',special:'energy'},
  {name:'🎙️ 내레이터',lang:'ko-KR',gender:'special',pitch:0.85,rate:0.88,ico:'🎙️',bg:'#1e3a8a',desc:'차분한 다큐 내레이터',special:'narrator'},
  {name:'👶 어린이',lang:'ko-KR',gender:'special',pitch:1.9,rate:1.2,ico:'👶',bg:'#fb923c',desc:'귀여운 어린이 목소리',special:'child'},
  {name:'👴 할아버지',lang:'ko-KR',gender:'special',pitch:0.55,rate:0.75,ico:'👴',bg:'#78350f',desc:'낮고 느린 어르신 목소리',special:'grandpa'},
  {name:'🤫 속삭임 (Whisper)',lang:'ko-KR',gender:'special',pitch:1.1,rate:0.8,ico:'🤫',bg:'#4c1d95',desc:'부드러운 속삭임',special:'whisper'},
  {name:'😱 흥분 MAX!!',lang:'ko-KR',gender:'special',pitch:1.7,rate:2.0,ico:'😱',bg:'#e11d48',desc:'매우 빠르고 흥분된',special:'excited'},
  {name:'🎪 개그맨 (Comedian)',lang:'ko-KR',gender:'special',pitch:1.6,rate:1.3,ico:'🎪',bg:'#f59e0b',desc:'재미있고 과장된 개그 스타일',special:'comedian'},
  {name:'👻 공포 (Horror)',lang:'ko-KR',gender:'special',pitch:0.35,rate:0.65,ico:'👻',bg:'#111827',desc:'소름끼치는 공포 목소리',special:'horror'},
  {name:'🤓 박사님 (Professor)',lang:'ko-KR',gender:'special',pitch:0.9,rate:0.82,ico:'🤓',bg:'#1e40af',desc:'학자 느낌의 설명체',special:'professor'},
  {name:'😭 드라마 (Dramatic)',lang:'ko-KR',gender:'special',pitch:1.3,rate:0.78,ico:'😭',bg:'#7e22ce',desc:'드라마틱하고 감정적인',special:'dramatic'},
  {name:'🎵 노래 스타일',lang:'ko-KR',gender:'special',pitch:1.8,rate:0.95,ico:'🎵',bg:'#db2777',desc:'노래하듯 높은 음정',special:'singing'},
  {name:'🌙 새벽 감성',lang:'ko-KR',gender:'special',pitch:0.88,rate:0.72,ico:'🌙',bg:'#312e81',desc:'새벽 감성의 느리고 나른한',special:'midnight'},
  {name:'💬 SNS 인플루언서',lang:'ko-KR',gender:'special',pitch:1.4,rate:1.6,ico:'💬',bg:'#ec4899',desc:'빠르고 밝은 SNS 스타일',special:'influencer'},
  {name:'🏋️ 운동 코치',lang:'ko-KR',gender:'special',pitch:1.1,rate:1.5,ico:'🏋️',bg:'#16a34a',desc:'파이팅! 힘찬 코치 보이스',special:'coach'},
  {name:'🎭 성우 (Voice Actor)',lang:'ko-KR',gender:'special',pitch:1.0,rate:0.95,ico:'🎭',bg:'#0891b2',desc:'프로 성우 스타일',special:'voiceactor'},
  {name:'😴 수면 유도',lang:'ko-KR',gender:'special',pitch:0.82,rate:0.6,ico:'😴',bg:'#1e1b4b',desc:'매우 느리고 졸리는 목소리',special:'sleepy'},
  {name:'🔮 신비로운',lang:'ko-KR',gender:'special',pitch:1.55,rate:0.85,ico:'🔮',bg:'#5b21b6',desc:'신비롭고 몽환적인 분위기',special:'mystic'},
  // ─── Korean Female ───
  {name:'수지 (한국어)',lang:'ko-KR',gender:'female',pitch:1.2,rate:1.0,ico:'👩',bg:'#7c3aed',desc:'밝고 친근한'},
  {name:'지현 (한국어)',lang:'ko-KR',gender:'female',pitch:1.4,rate:0.95,ico:'👱‍♀️',bg:'#9333ea',desc:'차분하고 부드러운'},
  {name:'민지 (한국어)',lang:'ko-KR',gender:'female',pitch:1.1,rate:1.1,ico:'🎤',bg:'#a855f7',desc:'빠르고 활기찬'},
  {name:'예은 (한국어)',lang:'ko-KR',gender:'female',pitch:1.6,rate:0.9,ico:'🌸',bg:'#c084fc',desc:'높고 부드러운'},
  {name:'채원 (한국어)',lang:'ko-KR',gender:'female',pitch:0.95,rate:1.0,ico:'💼',bg:'#7e22ce',desc:'낮고 전문적인'},
  {name:'하은 (한국어)',lang:'ko-KR',gender:'female',pitch:1.3,rate:1.15,ico:'⭐',bg:'#6d28d9',desc:'밝고 빠른'},
  {name:'서윤 (한국어)',lang:'ko-KR',gender:'female',pitch:1.5,rate:0.85,ico:'🌺',bg:'#8b5cf6',desc:'느리고 감성적인'},
  {name:'나연 (한국어)',lang:'ko-KR',gender:'female',pitch:1.0,rate:1.05,ico:'🎵',bg:'#7c3aed',desc:'보통 톤의 여성'},
  {name:'아름 (한국어)',lang:'ko-KR',gender:'female',pitch:1.35,rate:1.2,ico:'✨',bg:'#9333ea',desc:'에너지 넘치는'},
  {name:'보람 (한국어)',lang:'ko-KR',gender:'female',pitch:0.85,rate:0.95,ico:'📻',bg:'#6d28d9',desc:'낮고 차분한'},
  {name:'유리 (한국어)',lang:'ko-KR',gender:'female',pitch:1.45,rate:1.05,ico:'💎',bg:'#7c3aed',desc:'청아하고 맑은'},
  {name:'소희 (한국어)',lang:'ko-KR',gender:'female',pitch:1.25,rate:0.88,ico:'🌙',bg:'#6d28d9',desc:'달콤하고 느긋한'},
  {name:'지수 (한국어)',lang:'ko-KR',gender:'female',pitch:1.55,rate:1.25,ico:'🎀',bg:'#9333ea',desc:'귀엽고 명랑한'},
  {name:'혜리 (한국어)',lang:'ko-KR',gender:'female',pitch:0.9,rate:1.0,ico:'🎭',bg:'#4c1d95',desc:'성숙한 여성'},
  {name:'다인 (한국어)',lang:'ko-KR',gender:'female',pitch:1.7,rate:0.95,ico:'🌟',bg:'#c084fc',desc:'매우 높은 여성'},
  // ─── Korean Male ───
  {name:'민준 (한국어)',lang:'ko-KR',gender:'male',pitch:0.8,rate:1.0,ico:'👨',bg:'#1d4ed8',desc:'보통 남성 목소리'},
  {name:'현우 (한국어)',lang:'ko-KR',gender:'male',pitch:0.65,rate:0.95,ico:'🎙️',bg:'#1e40af',desc:'낮고 깊은 남성'},
  {name:'지훈 (한국어)',lang:'ko-KR',gender:'male',pitch:0.9,rate:1.1,ico:'🎤',bg:'#2563eb',desc:'활기찬 남성'},
  {name:'태양 (한국어)',lang:'ko-KR',gender:'male',pitch:0.75,rate:1.0,ico:'🔊',bg:'#1d4ed8',desc:'중저음 남성'},
  {name:'성민 (한국어)',lang:'ko-KR',gender:'male',pitch:0.95,rate:1.15,ico:'⚡',bg:'#3730a3',desc:'빠르고 에너지 있는'},
  {name:'동현 (한국어)',lang:'ko-KR',gender:'male',pitch:0.7,rate:0.9,ico:'🎭',bg:'#1e3a8a',desc:'느리고 깊은'},
  {name:'재원 (한국어)',lang:'ko-KR',gender:'male',pitch:1.0,rate:1.0,ico:'💡',bg:'#2563eb',desc:'중성적인 남성'},
  {name:'준혁 (한국어)',lang:'ko-KR',gender:'male',pitch:0.85,rate:1.05,ico:'🎸',bg:'#1d4ed8',desc:'자연스러운 남성'},
  {name:'도윤 (한국어)',lang:'ko-KR',gender:'male',pitch:0.6,rate:0.85,ico:'🎬',bg:'#1e40af',desc:'낮고 느린 내레이터'},
  {name:'시우 (한국어)',lang:'ko-KR',gender:'male',pitch:0.9,rate:1.2,ico:'🔥',bg:'#3730a3',desc:'빠르고 강렬한'},
  {name:'강준 (한국어)',lang:'ko-KR',gender:'male',pitch:0.72,rate:0.92,ico:'🏆',bg:'#1e40af',desc:'묵직하고 카리스마'},
  {name:'이안 (한국어)',lang:'ko-KR',gender:'male',pitch:1.0,rate:1.3,ico:'🚀',bg:'#3730a3',desc:'매우 빠른 남성'},
  {name:'서준 (한국어)',lang:'ko-KR',gender:'male',pitch:0.82,rate:0.98,ico:'🎵',bg:'#1d4ed8',desc:'따뜻한 남성'},
  // ─── English Female (US) ───
  {name:'Emma (EN-US)',lang:'en-US',gender:'female',pitch:1.2,rate:1.0,ico:'👩‍🦳',bg:'#059669',desc:'Clear American'},
  {name:'Olivia (EN-US)',lang:'en-US',gender:'female',pitch:1.4,rate:0.95,ico:'🌸',bg:'#047857',desc:'Soft & Gentle'},
  {name:'Sophia (EN-US)',lang:'en-US',gender:'female',pitch:1.1,rate:1.1,ico:'🎤',bg:'#065f46',desc:'Energetic'},
  {name:'Isabella (EN-US)',lang:'en-US',gender:'female',pitch:1.6,rate:0.9,ico:'💫',bg:'#10b981',desc:'High Pitch Soft'},
  {name:'Mia (EN-US)',lang:'en-US',gender:'female',pitch:0.95,rate:1.0,ico:'💼',bg:'#059669',desc:'Professional'},
  {name:'Charlotte (EN-US)',lang:'en-US',gender:'female',pitch:1.3,rate:1.15,ico:'⭐',bg:'#047857',desc:'Bright & Fast'},
  {name:'Ava (EN-US)',lang:'en-US',gender:'female',pitch:1.0,rate:1.2,ico:'🚀',bg:'#065f46',desc:'Fast Paced'},
  {name:'Luna (EN-US)',lang:'en-US',gender:'female',pitch:1.5,rate:0.85,ico:'🌙',bg:'#10b981',desc:'Dreamy & Slow'},
  // ─── English Male (US) ───
  {name:'Liam (EN-US)',lang:'en-US',gender:'male',pitch:0.8,rate:1.0,ico:'👨',bg:'#dc2626',desc:'Standard American'},
  {name:'Noah (EN-US)',lang:'en-US',gender:'male',pitch:0.65,rate:0.95,ico:'🎙️',bg:'#b91c1c',desc:'Deep & Slow'},
  {name:'James (EN-US)',lang:'en-US',gender:'male',pitch:0.9,rate:1.1,ico:'🎤',bg:'#991b1b',desc:'Energetic Male'},
  {name:'William (EN-US)',lang:'en-US',gender:'male',pitch:0.75,rate:0.9,ico:'📢',bg:'#dc2626',desc:'Low Narrator'},
  {name:'Oliver (EN-US)',lang:'en-US',gender:'male',pitch:0.95,rate:1.15,ico:'⚡',bg:'#b91c1c',desc:'Fast Speaking'},
  {name:'Benjamin (EN-US)',lang:'en-US',gender:'male',pitch:0.7,rate:0.85,ico:'🎭',bg:'#991b1b',desc:'Deep Dramatic'},
  // ─── English UK ───
  {name:'Charlotte (EN-GB)',lang:'en-GB',gender:'female',pitch:1.2,rate:0.95,ico:'🇬🇧',bg:'#0369a1',desc:'British Female'},
  {name:'Oliver (EN-GB)',lang:'en-GB',gender:'male',pitch:0.85,rate:0.95,ico:'🇬🇧',bg:'#0c4a6e',desc:'British Male'},
  {name:'Emily (EN-GB)',lang:'en-GB',gender:'female',pitch:1.3,rate:1.0,ico:'🎩',bg:'#0369a1',desc:'Proper British'},
  {name:'Harry (EN-GB)',lang:'en-GB',gender:'male',pitch:0.7,rate:0.9,ico:'🏰',bg:'#0c4a6e',desc:'Deep British'},
  // ─── English AU ───
  {name:'Zoe (EN-AU)',lang:'en-AU',gender:'female',pitch:1.25,rate:1.0,ico:'🦘',bg:'#b45309',desc:'Australian Female'},
  {name:'Jack (EN-AU)',lang:'en-AU',gender:'male',pitch:0.85,rate:1.0,ico:'🐨',bg:'#92400e',desc:'Australian Male'},
  // ─── 🎭 추가 특수 효과 목소리 ───
  {name:'🎤 MC (힙합 MC)',lang:'ko-KR',gender:'special',pitch:1.15,rate:1.55,ico:'🎤',bg:'#7c3aed',desc:'힙합 MC 스타일',special:'mc'},
  {name:'☎️ 전화통화',lang:'ko-KR',gender:'special',pitch:1.05,rate:1.0,ico:'☎️',bg:'#0369a1',desc:'전화 통화 필터 효과',special:'phone'},
  {name:'🎸 록스타',lang:'ko-KR',gender:'special',pitch:1.2,rate:1.3,ico:'🎸',bg:'#dc2626',desc:'록스타 에너지 넘치는',special:'rockstar'},
  {name:'🌊 딥 베이스',lang:'ko-KR',gender:'special',pitch:0.3,rate:0.8,ico:'🌊',bg:'#0c4a6e',desc:'깊고 묵직한 저음',special:'deepbass'},
  {name:'🦁 카리스마',lang:'ko-KR',gender:'special',pitch:0.75,rate:0.9,ico:'🦁',bg:'#92400e',desc:'카리스마 넘치는 강한 목소리',special:'charisma'},
  {name:'🌺 하와이안',lang:'ko-KR',gender:'special',pitch:1.25,rate:0.9,ico:'🌺',bg:'#0891b2',desc:'여유롭고 따뜻한 하와이안 스타일',special:'hawaiian'},
  {name:'🎓 강의 (Lecture)',lang:'ko-KR',gender:'special',pitch:0.95,rate:0.85,ico:'🎓',bg:'#1e40af',desc:'교수 강의 스타일',special:'lecture'},
  {name:'📣 광고 (Ad Voice)',lang:'ko-KR',gender:'special',pitch:1.1,rate:1.2,ico:'📣',bg:'#f59e0b',desc:'광고/CF 나레이션 스타일',special:'ad'},
  {name:'🤩 팬미팅 MC',lang:'ko-KR',gender:'special',pitch:1.35,rate:1.4,ico:'🤩',bg:'#db2777',desc:'아이돌 팬미팅 MC 스타일',special:'fanmeet'},
  {name:'🏠 실내 감성',lang:'ko-KR',gender:'special',pitch:1.0,rate:0.75,ico:'🏠',bg:'#065f46',desc:'잔잔하고 고요한 실내 분위기',special:'indoor'},
  // ─── 추가 Korean Female ───
  {name:'하은 (한국어)',lang:'ko-KR',gender:'female',pitch:1.6,rate:0.88,ico:'🌺',bg:'#be185d',desc:'부드럽고 감성적'},
  {name:'소이 (한국어)',lang:'ko-KR',gender:'female',pitch:1.0,rate:1.15,ico:'⚡',bg:'#7c3aed',desc:'활발하고 또렷한'},
  {name:'예린 (한국어)',lang:'ko-KR',gender:'female',pitch:1.3,rate:0.82,ico:'🌙',bg:'#4f46e5',desc:'차분하고 지적인'},
  {name:'다인 (한국어)',lang:'ko-KR',gender:'female',pitch:1.7,rate:1.0,ico:'🎵',bg:'#9333ea',desc:'밝고 귀여운'},
  // ─── 추가 Korean Male ───
  {name:'태양 (한국어)',lang:'ko-KR',gender:'male',pitch:0.8,rate:1.1,ico:'☀️',bg:'#0284c7',desc:'에너지 넘치는 남성'},
  {name:'준혁 (한국어)',lang:'ko-KR',gender:'male',pitch:0.6,rate:0.85,ico:'🎙️',bg:'#1e3a8a',desc:'깊고 안정적인 남성'},
  {name:'재원 (한국어)',lang:'ko-KR',gender:'male',pitch:0.75,rate:0.9,ico:'🎭',bg:'#134e4a',desc:'성숙하고 신뢰감 있는'},
  {name:'민호 (한국어)',lang:'ko-KR',gender:'male',pitch:0.9,rate:1.2,ico:'🔥',bg:'#7f1d1d',desc:'열정적이고 힘찬 남성'}
];

// ══════════════════════════════════════════════════════════════
//  BGM DATA — 각 항목마다 고유 멜로디/화음/리듬 패턴
//  melody: 음 인덱스 배열 (scale 기준)
//  rhythm: 박자 패턴 (1=1박, 0.5=반박, 2=2박)
//  chord: 화음 오프셋 배열 (동시 울리는 음의 반음 차이)
// ══════════════════════════════════════════════════════════════
var BGM_DATA = [
  {n:'BGM 없음',t:'none',icon:'🔇',bpm:0},
  // ══ 실제 음악 (Kevin MacLeod – CC BY, incompetech.com) ══
  // ── Upbeat / Pop ──
  {n:'팝 업비트 (Carefree)',t:'upbeat,pop,happy',icon:'🎵',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'},
  {n:'에너지 업비트 (Hustle)',t:'upbeat,electronic,corporate',icon:'⚡',bpm:130,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hustle.mp3'},
  {n:'신나는 비트 (Hyperfun)',t:'upbeat,happy,pop',icon:'🎉',bpm:128,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hyperfun.mp3'},
  {n:'힙합 그루브 (Crypto)',t:'upbeat,hiphop,trap',icon:'🕺',bpm:125,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crypto.mp3'},
  {n:'모티베이션 (Inspired)',t:'upbeat,corporate,cinematic',icon:'🌟',bpm:110,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Inspired.mp3'},
  {n:'펑크 그루브 (Funkorama)',t:'upbeat,funk,soul',icon:'🎛️',bpm:105,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funkorama.mp3'},
  // ── Calm / Piano / Acoustic ──
  {n:'잔잔한 피아노 (Wholesome)',t:'calm,piano,acoustic',icon:'🎹',bpm:70,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3'},
  {n:'힐링 어쿠스틱 (Slow Burn)',t:'calm,acoustic,ambient',icon:'🌿',bpm:75,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Slow%20Burn.mp3'},
  {n:'따뜻한 멜로디 (Beauty Flow)',t:'calm,ambient,chill',icon:'💫',bpm:68,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Beauty%20Flow.mp3'},
  // ── Jazz ──
  {n:'카페 재즈 (Sneaky Snitch)',t:'calm,jazz',icon:'☕',bpm:88,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3'},
  {n:'재즈 스윙 (Breaktime)',t:'jazz,pop',icon:'🎷',bpm:95,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Breaktime.mp3'},
  {n:'보사노바 (Arcadia)',t:'jazz,calm,lounge',icon:'🌴',bpm:100,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Arcadia.mp3'},
  // ── Cinematic / Epic ──
  {n:'시네마틱 서사 (Pamgaea)',t:'cinematic,epic',icon:'🎭',bpm:90,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pamgaea.mp3'},
  {n:'히어로 테마 (Killers)',t:'cinematic,epic,rock',icon:'🦸',bpm:130,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Killers.mp3'},
  {n:'웅장한 모험 (Undaunted)',t:'cinematic,epic',icon:'💥',bpm:112,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Undaunted.mp3'},
  {n:'모험의 시작 (Call to Adventure)',t:'cinematic,epic,upbeat',icon:'🗺️',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Call%20to%20Adventure.mp3'},
  // ── Lo-Fi / Chill ──
  {n:'Lo-Fi 스터디 (Bittersweet)',t:'lofi,calm,chill',icon:'📚',bpm:80,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bittersweet.mp3'},
  {n:'Lo-Fi 카페 (Americana)',t:'lofi,folk,acoustic',icon:'☕',bpm:75,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Americana.mp3'},
  {n:'긴장감 (Chase)',t:'cinematic,rock,upbeat',icon:'🚗',bpm:145,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Chase.mp3'},
  // ══ 합성 음악 (Web Audio API) ══
  // ── Upbeat / Dance ──
  {n:'에너지 업비트',t:'upbeat',icon:'⚡',bpm:128,
    scale:[277.18,311.13,349.23,369.99,415.30,466.16,523.25],
    melody:[0,2,4,2,0,3,5,3,1,4,6,4,2,5,0,3],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,1],
    osc:'square',chord:[7,12]},
  {n:'팝 댄스 그루브',t:'upbeat',icon:'🕺',bpm:120,
    scale:[293.66,329.63,369.99,392.00,440.00,493.88,554.37],
    melody:[0,0,2,3,4,3,2,0,1,3,5,3,1,0,4,2],
    rhythm:[0.5,0.5,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,1],
    osc:'sawtooth',chord:[4,7]},
  {n:'신나는 팝',t:'upbeat',icon:'🎉',bpm:132,
    scale:[261.63,293.66,329.63,349.23,392.00,440.00,493.88],
    melody:[0,2,4,5,6,5,4,2,0,3,5,6,4,2,1,0],
    rhythm:[1,0.5,0.5,0.5,0.5,0.5,0.5,1,1,0.5,0.5,0.5,0.5,0.5,0.5,1],
    osc:'triangle',chord:[7]},
  {n:'파티 바이브',t:'upbeat',icon:'🎊',bpm:140,
    scale:[349.23,392.00,440.00,493.88,523.25,587.33,659.25],
    melody:[0,1,2,3,4,3,2,1,0,2,4,6,4,2,0,3],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,1],
    osc:'sawtooth',chord:[5,9,12]},
  {n:'유로 댄스',t:'upbeat,electronic',icon:'🎵',bpm:138,
    scale:[220.00,246.94,261.63,293.66,329.63,349.23,392.00],
    melody:[0,4,2,5,1,4,3,6,0,3,5,2,4,0,3,6],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,1],
    osc:'sawtooth',chord:[7,12]},
  {n:'모티베이션 록',t:'upbeat',icon:'🎸',bpm:135,
    scale:[82.41,110.00,130.81,164.81,196.00,220.00,246.94],
    melody:[0,0,2,2,4,4,5,4,2,2,0,0,3,3,5,4],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,1],
    osc:'sawtooth',chord:[12,19]},
  // ── Calm / Piano ──
  {n:'잔잔한 피아노',t:'calm,piano',icon:'🎹',bpm:70,
    scale:[261.63,293.66,329.63,349.23,392.00,440.00,493.88],
    melody:[0,2,4,2,0,4,3,1,0,2,4,6,5,3,2,0],
    rhythm:[1,1,2,1,1,2,1,1,2,1,1,1,1,1,2,2],
    osc:'sine',chord:[4,7]},
  {n:'힐링 어쿠스틱',t:'calm',icon:'🌿',bpm:75,
    scale:[196.00,220.00,246.94,261.63,293.66,329.63,369.99],
    melody:[0,1,3,5,6,5,3,1,0,2,4,5,3,1,0,2],
    rhythm:[1,1,1,1,2,1,1,2,1,1,1,1,2,1,1,2],
    osc:'sine',chord:[7]},
  {n:'명상 앰비언트',t:'calm',icon:'🧘',bpm:60,
    scale:[174.61,195.99,220.00,246.94,261.63,293.66,329.63],
    melody:[0,2,4,6,5,3,1,0,2,5,4,2,0,3,6,4],
    rhythm:[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    osc:'sine',chord:[7,12]},
  {n:'클래식 피아노',t:'piano,calm',icon:'🎹',bpm:75,
    scale:[261.63,329.63,392.00,440.00,523.25,587.33,659.25],
    melody:[0,2,4,0,2,4,6,4,2,0,4,6,5,3,1,0],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,1,0.5,0.5,1,1,0.5,1],
    osc:'sine',chord:[4]},
  {n:'감성 발라드',t:'piano,calm',icon:'💔',bpm:68,
    scale:[246.94,261.63,293.66,329.63,349.23,392.00,440.00],
    melody:[0,1,3,5,4,2,0,3,5,6,4,2,1,0,3,5],
    rhythm:[1,1,1,2,1,1,2,1,1,2,1,1,1,2,1,2],
    osc:'sine',chord:[3,7]},
  // ── Jazz ──
  {n:'카페 재즈',t:'calm,jazz',icon:'☕',bpm:85,
    scale:[261.63,277.18,311.13,349.23,369.99,415.30,466.16],
    melody:[0,2,1,3,4,3,1,2,0,4,2,5,3,1,4,2],
    rhythm:[1,0.5,0.5,1,0.5,0.5,1,1,0.5,0.5,1,0.5,0.5,1,0.5,1],
    osc:'triangle',chord:[3,7]},
  {n:'재즈 스탠다드',t:'jazz',icon:'🎷',bpm:100,
    scale:[261.63,311.13,349.23,369.99,415.30,466.16,523.25],
    melody:[0,2,4,5,3,1,4,2,0,5,3,6,4,2,1,3],
    rhythm:[0.5,1,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,1,0.5],
    osc:'triangle',chord:[4,7,11]},
  {n:'스윙 재즈',t:'jazz',icon:'🎼',bpm:110,
    scale:[233.08,261.63,293.66,311.13,349.23,392.00,415.30],
    melody:[0,3,2,4,1,5,3,6,2,4,0,3,5,2,4,1],
    rhythm:[0.67,0.33,0.67,0.33,1,0.67,0.33,1,0.67,0.33,0.67,0.33,1,0.67,0.33,1],
    osc:'triangle',chord:[3,6,10]},
  {n:'보사노바',t:'jazz,calm',icon:'🌴',bpm:105,
    scale:[261.63,277.18,311.13,329.63,369.99,392.00,440.00],
    melody:[0,1,3,2,4,3,5,4,2,1,0,3,5,4,2,0],
    rhythm:[1,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,1],
    osc:'sine',chord:[4,7]},
  // ── Hip-Hop ──
  {n:'올드스쿨 힙합',t:'hiphop',icon:'🎤',bpm:90,
    scale:[65.41,82.41,98.00,110.00,130.81,146.83,164.81],
    melody:[0,0,2,0,3,0,2,4,0,0,5,3,2,0,4,2],
    rhythm:[0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,1],
    osc:'sawtooth',chord:[12]},
  {n:'트랩 비트',t:'hiphop',icon:'🔊',bpm:140,
    scale:[55.00,65.41,73.42,82.41,87.31,98.00,110.00],
    melody:[0,0,0,2,0,0,3,0,0,0,4,0,2,0,0,5],
    rhythm:[0.5,0.25,0.25,0.5,0.5,0.25,0.25,0.5,0.5,0.25,0.25,0.5,0.5,0.25,0.25,0.5],
    osc:'sawtooth',chord:[7,12]},
  {n:'Lo-Fi 힙합',t:'hiphop,lofi',icon:'📻',bpm:80,
    scale:[130.81,146.83,164.81,174.61,196.00,220.00,233.08],
    melody:[0,2,1,3,2,4,3,5,1,3,0,4,2,5,3,1],
    rhythm:[1,1,0.5,0.5,1,1,0.5,0.5,1,1,0.5,0.5,1,0.5,0.5,1],
    osc:'triangle',chord:[7]},
  // ── Electronic ──
  {n:'하우스 빌드업',t:'electronic,upbeat',icon:'🎛️',bpm:128,
    scale:[130.81,164.81,196.00,220.00,261.63,329.63,392.00],
    melody:[0,2,4,6,5,3,1,0,2,4,6,4,2,0,3,5],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,1],
    osc:'sawtooth',chord:[7,12]},
  {n:'EDM 드롭',t:'electronic,upbeat',icon:'💥',bpm:150,
    scale:[220.00,261.63,293.66,329.63,392.00,440.00,523.25],
    melody:[0,4,2,6,3,5,1,4,0,3,6,2,5,1,4,0],
    rhythm:[0.5,0.5,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    osc:'sawtooth',chord:[5,9,14]},
  {n:'신스웨이브',t:'electronic',icon:'🌆',bpm:105,
    scale:[110.00,130.81,146.83,164.81,196.00,220.00,246.94],
    melody:[0,3,5,4,2,5,3,6,1,4,2,5,0,3,6,4],
    rhythm:[1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1],
    osc:'sawtooth',chord:[7,10]},
  {n:'테크노 비트',t:'electronic',icon:'🎚️',bpm:135,
    scale:[82.41,110.00,130.81,164.81,220.00,261.63,329.63],
    melody:[0,0,4,0,0,2,0,5,0,0,3,0,0,4,0,2],
    rhythm:[0.5,0.25,0.25,0.5,0.25,0.25,0.5,0.5,0.25,0.25,0.5,0.25,0.25,0.5,0.5,0.5],
    osc:'square',chord:[12]},
  // ── Cinematic ──
  {n:'서사시 오케스트라',t:'cinematic',icon:'🎭',bpm:90,
    scale:[130.81,146.83,164.81,174.61,196.00,220.00,246.94],
    melody:[0,2,4,6,5,3,1,0,4,6,5,3,2,0,4,2],
    rhythm:[1,1,1,2,1,1,2,1,1,2,1,1,2,1,1,2],
    osc:'triangle',chord:[4,7,11]},
  {n:'드라마틱 빌드업',t:'cinematic',icon:'📽️',bpm:85,
    scale:[87.31,98.00,110.00,116.54,130.81,146.83,164.81],
    melody:[0,1,2,3,4,5,6,5,4,3,2,1,0,2,4,6],
    rhythm:[1,1,1,1,1,1,2,1,1,1,1,1,2,1,1,2],
    osc:'triangle',chord:[7,12]},
  {n:'히어로 테마',t:'cinematic',icon:'🦸',bpm:95,
    scale:[196.00,220.00,246.94,261.63,293.66,329.63,369.99],
    melody:[0,0,4,0,5,4,2,0,3,5,4,2,1,0,3,5],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,1],
    osc:'square',chord:[7,10,14]},
  {n:'감동 스코어',t:'cinematic,calm',icon:'😢',bpm:78,
    scale:[220.00,246.94,261.63,293.66,329.63,349.23,392.00],
    melody:[0,2,4,3,1,0,3,5,4,2,1,3,5,6,4,2],
    rhythm:[1,1,1,1,2,1,1,2,1,1,1,2,1,1,2,2],
    osc:'sine',chord:[3,7]},
  {n:'전쟁 서사시',t:'cinematic',icon:'⚔️',bpm:100,
    scale:[73.42,82.41,92.50,98.00,110.00,123.47,130.81],
    melody:[0,0,0,2,0,3,2,4,0,0,2,4,3,2,0,4],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,1],
    osc:'square',chord:[7,12,16]},
  // ── Lo-Fi / Chill ──
  {n:'Lo-Fi 스터디',t:'lofi,calm',icon:'📚',bpm:75,
    scale:[174.61,196.00,207.65,233.08,261.63,293.66,311.13],
    melody:[0,2,4,3,5,4,2,1,0,3,5,4,2,0,3,5],
    rhythm:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    osc:'triangle',chord:[7]},
  {n:'Lo-Fi 카페',t:'lofi,calm',icon:'☕',bpm:80,
    scale:[130.81,155.56,174.61,196.00,220.00,246.94,261.63],
    melody:[0,1,3,5,4,2,0,3,5,6,4,2,1,0,4,3],
    rhythm:[1,0.5,0.5,1,0.5,0.5,1,1,0.5,0.5,1,0.5,0.5,1,0.5,1],
    osc:'sine',chord:[7,10]},
  {n:'Lo-Fi 빗소리',t:'lofi,calm',icon:'🌧️',bpm:72,
    scale:[155.56,174.61,196.00,220.00,233.08,261.63,293.66],
    melody:[0,2,4,3,1,0,2,4,5,4,2,0,3,5,4,2],
    rhythm:[2,1,1,2,2,1,1,2,2,1,1,2,1,1,2,2],
    osc:'sine',chord:[4,7]},
  // ── K-POP ──
  {n:'K-POP 댄스팝',t:'kpop,upbeat',icon:'🇰🇷',bpm:130,
    scale:[293.66,329.63,369.99,392.00,440.00,493.88,554.37],
    melody:[0,2,3,4,3,2,0,1,3,5,4,3,1,0,2,4],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5],
    osc:'sawtooth',chord:[7]},
  {n:'K-POP 발라드',t:'kpop,calm',icon:'💫',bpm:72,
    scale:[261.63,293.66,311.13,349.23,392.00,415.30,466.16],
    melody:[0,3,5,4,2,0,3,6,5,3,1,0,4,3,1,0],
    rhythm:[1,1,1,1,2,1,1,2,1,1,1,2,1,1,2,2],
    osc:'sine',chord:[3,7]},
  {n:'K-POP 힙합',t:'kpop,hiphop',icon:'🎤',bpm:90,
    scale:[130.81,155.56,174.61,196.00,220.00,246.94,261.63],
    melody:[0,0,3,0,4,3,0,5,0,2,4,3,2,0,5,3],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,1],
    osc:'sawtooth',chord:[7,12]},
  {n:'K-POP 아이돌',t:'kpop,upbeat',icon:'✨',bpm:125,
    scale:[329.63,369.99,392.00,440.00,493.88,523.25,587.33],
    melody:[0,1,2,3,4,5,4,3,2,1,0,3,5,4,2,0],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,1],
    osc:'triangle',chord:[4,7]},
  // ── Retro / Funk ──
  {n:'레트로 펑크',t:'funk,upbeat',icon:'🕹️',bpm:112,
    scale:[196.00,220.00,233.08,261.63,293.66,311.13,349.23],
    melody:[0,2,1,3,2,4,3,5,1,4,2,5,0,3,6,4],
    rhythm:[0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,1],
    osc:'sawtooth',chord:[3,7,10]},
  {n:'80s 팝',t:'retro,upbeat',icon:'📼',bpm:118,
    scale:[261.63,277.18,311.13,349.23,369.99,415.30,466.16],
    melody:[0,2,4,5,3,1,0,4,2,5,6,4,2,0,3,5],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,0.5,1,0.5,1],
    osc:'square',chord:[7]},
  {n:'디스코 그루브',t:'disco,upbeat',icon:'🪩',bpm:122,
    scale:[220.00,246.94,261.63,293.66,329.63,349.23,392.00],
    melody:[0,3,5,4,2,5,3,6,1,4,2,5,3,0,4,2],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,1,0.5,1],
    osc:'sawtooth',chord:[4,7,10]},
  // ── Seasonal / Special ──
  {n:'크리스마스 종소리',t:'christmas,calm',icon:'🎄',bpm:80,
    scale:[261.63,293.66,329.63,349.23,392.00,440.00,523.25],
    melody:[4,4,4,4,4,5,3,2,0,4,5,6,5,4,3,0],
    rhythm:[0.5,0.5,1,0.5,0.5,1,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,0.5,1],
    osc:'sine',chord:[4,7]},
  {n:'여름 해변',t:'summer,upbeat',icon:'🏖️',bpm:110,
    scale:[277.18,311.13,349.23,369.99,415.30,466.16,523.25],
    melody:[0,2,4,3,5,4,2,0,3,5,6,4,2,1,4,0],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,0.5,0.5,0.5,1,0.5,0.5,1],
    osc:'triangle',chord:[4,9]},
  {n:'스프링 왈츠',t:'spring,calm',icon:'🌸',bpm:90,
    scale:[261.63,293.66,329.63,369.99,415.30,466.16,523.25],
    melody:[0,2,4,0,2,4,3,5,3,1,3,5,2,4,6,4],
    rhythm:[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    osc:'sine',chord:[4,7]},
  // ── Kids / Happy ──
  {n:'귀여운 동요',t:'kids,calm',icon:'🐣',bpm:100,
    scale:[261.63,293.66,329.63,349.23,392.00,440.00,493.88],
    melody:[4,3,4,5,4,3,2,0,2,3,4,2,0,4,3,4],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,1,1,0.5,0.5,0.5,0.5,1,0.5,0.5,1],
    osc:'sine',chord:[4]},
  {n:'게임 승리',t:'game,upbeat',icon:'🎮',bpm:145,
    scale:[392.00,440.00,493.88,523.25,587.33,659.25,698.46],
    melody:[0,2,4,6,5,4,2,0,3,5,4,2,1,3,5,6],
    rhythm:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],
    osc:'square',chord:[7,12]},
  // ── Dark / Mysterious ──
  {n:'미스터리 앰비언트',t:'dark,calm',icon:'🌑',bpm:65,
    scale:[138.59,155.56,164.81,184.99,207.65,220.00,246.94],
    melody:[0,2,1,3,0,4,2,5,1,3,0,4,2,1,3,0],
    rhythm:[2,1,1,2,2,1,1,2,2,1,1,2,1,1,2,2],
    osc:'sine',chord:[6,10]},
  {n:'호러 분위기',t:'dark,horror',icon:'👻',bpm:70,
    scale:[116.54,130.81,138.59,155.56,164.81,174.61,184.99],
    melody:[0,1,0,2,0,3,1,4,0,2,5,3,1,0,4,2],
    rhythm:[1,0.5,0.5,1,0.5,0.5,1,1,0.5,0.5,1,0.5,0.5,1,0.5,1],
    osc:'sawtooth',chord:[3,6]},
  // ── Meditation / Nature ──
  {n:'자연의 소리',t:'nature,calm',icon:'🌿',bpm:55,
    scale:[174.61,207.65,220.00,261.63,293.66,329.63,349.23],
    melody:[0,2,4,6,5,3,1,0,4,6,5,3,2,0,3,5],
    rhythm:[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    osc:'sine',chord:[7]},
  {n:'우주 탐험',t:'space,electronic',icon:'🚀',bpm:88,
    scale:[65.41,73.42,82.41,87.31,98.00,110.00,116.54],
    melody:[0,3,6,5,3,1,4,6,2,5,3,0,4,6,2,5],
    rhythm:[1,1,1,2,1,1,2,1,1,2,1,1,1,2,1,2],
    osc:'sine',chord:[7,12]},
  {n:'명상 만트라',t:'meditation,calm',icon:'🕉️',bpm:50,
    scale:[110.00,123.47,130.81,146.83,164.81,174.61,195.99],
    melody:[0,0,2,4,4,2,0,0,3,3,5,3,3,5,2,0],
    rhythm:[2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2],
    osc:'sine',chord:[7,12,16]},
  // ══ Mixkit (무료 고퀄리티 음악) ══
  // ── Upbeat / Corporate ──




  // ── Cinematic / Epic ──


  // ── Lo-Fi / Chill ──


  // ── K-POP / K-Drama Style ──


  // ── Electronic / Synth ──


  // ── Acoustic / Folk ──


  // ── Hip-Hop / Trap ──


  // ── Ambient / Nature ──


  // ── Christmas / Holiday ──
  // ── R&B / Soul ──

  // ── Kevin MacLeod 로열티프리 (incompetech.com - CC BY) ──
  {n:'Sneaky Snitch',t:'jazz,upbeat',icon:'🎷',bpm:116,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Sneaky%20Snitch.mp3'},
  {n:'Monkeys Spinning Monkeys',t:'upbeat,fun',icon:'🐒',bpm:172,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Monkeys%20Spinning%20Monkeys.mp3'},
  {n:'Perspectives',t:'cinematic,emotional',icon:'🎬',bpm:80,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Perspectives.mp3'},
  {n:'Investigations',t:'cinematic,dark',icon:'🔍',bpm:90,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Investigations.mp3'},
  {n:'Local Forecast - Elevator',t:'easy,lounge',icon:'🛗',bpm:95,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Local%20Forecast%20-%20Elevator.mp3'},
  {n:'Deuces',t:'upbeat,pop',icon:'🎯',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Deuces.mp3'},
  {n:'Airport Lounge',t:'lounge,chill',icon:'✈️',bpm:90,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Airport%20Lounge.mp3'},
  {n:'Carefree',t:'happy,upbeat',icon:'😊',bpm:104,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Carefree.mp3'},
  {n:'Lobby Time',t:'easy,background',icon:'🏢',bpm:85,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lobby%20Time.mp3'},
  {n:'Gymnopedie No.1',t:'classical,calm',icon:'🎹',bpm:60,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Gymnopedie%20No%201.mp3'},
  {n:'Happy Bee',t:'happy,children',icon:'🐝',bpm:140,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Happy%20Bee.mp3'},
  {n:'Hitman',t:'cinematic,action',icon:'🎯',bpm:130,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Hitman.mp3'},
  {n:'Wallpaper',t:'chill,indie',icon:'🖼',bpm:95,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wallpaper.mp3'},
  {n:'Impact Moderato',t:'cinematic,epic',icon:'💥',bpm:100,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Impact%20Moderato.mp3'},
  {n:'Clean Soul',t:'soul,r&b',icon:'🎵',bpm:85,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Clean%20Soul.mp3'},
  {n:'Call to Adventure',t:'epic,adventure',icon:'⚔️',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Call%20to%20Adventure.mp3'},
  {n:'Chill',t:'chill,lofi',icon:'❄️',bpm:75,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Chill.mp3'},
  {n:'Electro Sketch',t:'electronic,upbeat',icon:'⚡',bpm:128,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Electro%20Sketch.mp3'},
  {n:'Beauty Flow',t:'calm,background',icon:'🌸',bpm:80,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Beauty%20Flow.mp3'},
  {n:'Lightless Dawn',t:'dark,cinematic',icon:'🌑',bpm:70,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Lightless%20Dawn.mp3'},
  // ── SoundHelix 다양한 장르 ──
  {n:'SH 재즈 스윙',t:'jazz,swing',icon:'🎷',bpm:110,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3'},
  {n:'SH 앰비언트',t:'ambient,calm',icon:'🌊',bpm:70,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3'},
  {n:'SH 록',t:'rock,energy',icon:'🎸',bpm:140,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'},
  {n:'SH 클래식',t:'classical,background',icon:'🎻',bpm:90,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3'},
  {n:'SH 드라마틱',t:'cinematic,dramatic',icon:'🎭',bpm:85,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3'},
  {n:'SH 팝 발라드',t:'pop,emotional',icon:'💕',bpm:75,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3'},
  {n:'SH 테크노',t:'electronic,techno',icon:'🤖',bpm:138,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3'},
  {n:'SH 어쿠스틱',t:'acoustic,chill',icon:'🎸',bpm:95,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3'},
  {n:'SH 펑크',t:'funk,upbeat',icon:'🕺',bpm:105,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3'},
  {n:'SH 소울',t:'soul,r&b',icon:'🎤',bpm:88,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3'},
  {n:'SH 오케스트라',t:'classical,epic',icon:'🎼',bpm:92,
    url:'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3'},

  // ── Kevin MacLeod 추가 (CC BY) ──
  {n:'Bittersweet',t:'emotional,piano',icon:'💔',bpm:75,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Bittersweet.mp3'},
  {n:'Long Note Four',t:'ambient,meditation',icon:'🧘',bpm:60,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Long%20Note%20Four.mp3'},
  {n:'Easy Lemon',t:'happy,upbeat',icon:'🍋',bpm:108,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Easy%20Lemon.mp3'},
  {n:'Fluffing a Duck',t:'fun,upbeat',icon:'🦆',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Fluffing%20a%20Duck.mp3'},
  {n:'Take a Chance',t:'upbeat,pop',icon:'🎲',bpm:122,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Take%20a%20Chance.mp3'},
  {n:'Wholesome',t:'calm,feel-good',icon:'🌈',bpm:84,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Wholesome.mp3'},
  {n:'Life of Riley',t:'happy,background',icon:'😊',bpm:108,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Life%20of%20Riley.mp3'},
  {n:'Disco con Tutti',t:'disco,upbeat',icon:'🪩',bpm:128,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Disco%20con%20Tutti.mp3'},
  {n:'Funkorama',t:'funk,upbeat',icon:'🎸',bpm:120,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Funkorama.mp3'},
  {n:'Strength of the Titans',t:'epic,cinematic',icon:'⚔️',bpm:105,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Strength%20of%20the%20Titans.mp3'},
  {n:'Run Amok',t:'upbeat,electronic',icon:'🏃',bpm:135,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Run%20Amok.mp3'},
  {n:'George Street Shuffle',t:'jazz,upbeat',icon:'🎷',bpm:110,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/George%20Street%20Shuffle.mp3'},
  {n:'Scheming Weasel',t:'fun,cartoon',icon:'🦊',bpm:145,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Scheming%20Weasel%20faster.mp3'},
  {n:'Quirky Dog',t:'fun,quirky',icon:'🐕',bpm:112,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Quirky%20Dog.mp3'},
  {n:'Pamgaea',t:'cinematic,epic',icon:'🌍',bpm:95,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Pamgaea.mp3'},
  {n:'Crossing the Divide',t:'cinematic,dramatic',icon:'🌉',bpm:88,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Crossing%20the%20Divide.mp3'},
  {n:'Darkest Child',t:'dark,cinematic',icon:'🌑',bpm:80,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Darkest%20Child.mp3'},
  {n:'Dreamer',t:'emotional,inspirational',icon:'✨',bpm:72,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Dreamer.mp3'},
  {n:'Decisions',t:'upbeat,pop',icon:'💡',bpm:115,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Decisions.mp3'},
  {n:'Rising Tide',t:'cinematic,suspense',icon:'🌊',bpm:90,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Rising%20Tide.mp3'},
  {n:'Comic Plodding',t:'fun,cartoon',icon:'😄',bpm:85,
    url:'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Comic%20Plodding.mp3'},

];

// ══════════════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════════════
function init() {
  // ── 로그인 체크 (BYGENCY 대시보드 임베드: 접근 제어는 대시보드 세션이 담당하므로 클라이언트 체크 생략) ──
  try { var _u = JSON.parse(localStorage.getItem('user')||'null'); if(!_u||!_u.id){ localStorage.setItem('user', JSON.stringify({id:'bygency', name:'BYGENCY'})); } } catch(e) { try{ localStorage.setItem('user', JSON.stringify({id:'bygency', name:'BYGENCY'})); }catch(_){} }
  renderTemplates();
  initDefaultScenes();
  loadBGMList();
  setupCanvas();
  loadVoices();
  initEditingOptions();
  loadGallery();
}

function initDefaultScenes() {
  S.scenes = [
    {title:'오프닝 🎬',text:'안녕하세요! 오늘은 특별한 이야기를 들려드릴게요.',kw:'opening introduction',dur:5},
    {title:'핵심 내용 1️⃣',text:'첫 번째로 중요한 것은 바로 이것입니다!',kw:'tips advice concept',dur:5},
    {title:'핵심 내용 2️⃣',text:'두 번째로 알아야 할 핵심 포인트입니다.',kw:'strategy method steps',dur:5},
    {title:'핵심 내용 3️⃣',text:'세 번째 비결, 이것이 가장 중요합니다!',kw:'success result achievement',dur:5},
    {title:'마무리 🙏',text:'도움이 되셨나요? 좋아요와 구독 부탁드려요!',kw:'ending thank conclusion',dur:5}
  ];
  renderSceneList();
  renderSceneNav();
}

// ══════════════════════════════════════════════════════════════
//  TEMPLATE RENDERING
// ══════════════════════════════════════════════════════════════
function renderTemplates(filtered) {
  var grid = document.getElementById('tpl-grid');
  if(!grid) return;
  var html = '';
  var list = filtered || TPLS;
  if(list.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:32px 16px;color:var(--text4);font-size:11px">해당 플랫폼 템플릿이 없습니다</div>';
    return;
  }
  list.forEach(function(tpl, fi) {
    var i = TPLS.indexOf(tpl);
    var onCls=(i===S.tplId)?' on':'';
    // Platform icons
    var pltIcos = '';
    if(tpl.platforms){
      var pMap={capcut:'📱',reels:'🎞️',youtube:'▶️',videostudio:'🎬',ads:'📢'};
      tpl.platforms.slice(0,2).forEach(function(p){pltIcos+='<span style="font-size:8px;opacity:.85">'+( pMap[p]||'')+'</span>';});
    }
    var badgeHtml = tpl.badge ? '<div class="tc-badge" style="background:'+tpl.badgeClr+';color:#fff">'+tpl.badge+'</div>' : '';
    html += '<div class="tc'+onCls+'" id="tc-'+i+'" onclick="selectTpl('+i+')">';
    html += '<div class="tc-check">✓</div>';
    html += '<div class="tc-preview" id="tc-pv-'+i+'">';
    html += badgeHtml;
    html += '<canvas id="tc-cv-'+i+'" width="160" height="100" style="width:100%;height:100%;display:block"></canvas>';
    html += '</div>';
    html += '<div class="tc-info">';
    html += '<div class="tc-name">'+esc(tpl.n)+'<span style="margin-left:4px;letter-spacing:1px">'+pltIcos+'</span></div>';
    html += '<div class="tc-cat">'+esc(tpl.cat)+'</div>';
    html += '<button class="tc-use" data-tpl="'+i+'" onclick="event.stopPropagation();useTpl(this)">✨ 이 템플릿 사용</button>';
    html += '</div>';
    html += '</div>';
  });
  grid.innerHTML = html;
  // Draw template previews after DOM is ready
  setTimeout(function(){
    list.forEach(function(tpl){
      var i=TPLS.indexOf(tpl);
      drawTplPreview(i);
    });
  }, 80);
}

function filterTpl(platform, el) {
  curTplPlatform = platform;
  document.querySelectorAll('.plt').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  if(platform === 'all') {
    renderTemplates(TPLS);
  } else {
    var filtered = TPLS.filter(function(t){
      return t.platforms && t.platforms.indexOf(platform) >= 0;
    });
    renderTemplates(filtered);
  }
}

function filterCat(cat, el) {
  document.querySelectorAll('.plt').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  var filtered = TPLS.filter(function(t){ return t.cat === cat; });
  renderTemplates(filtered);
}

function drawTplPreview(i) {
  var cv = document.getElementById('tc-cv-'+i);
  if(!cv) return;
  var ctx = cv.getContext('2d');
  var W=160,H=100;
  var tpl = TPLS[i];
  var pos = tpl.txt.pos;
  var acc = tpl.acc;
  var isLight=(tpl.bg[0].startsWith('#f')||tpl.bg[0].startsWith('#e')||tpl.bg[0]==='#fff0f8');

  // ── 배경 ──
  var bgGr = ctx.createLinearGradient(0,0,W,H);
  bgGr.addColorStop(0,tpl.bg[0]);
  bgGr.addColorStop(1,tpl.bg[tpl.bg.length-1]);
  ctx.fillStyle=bgGr; ctx.fillRect(0,0,W,H);

  // ── pos별 미리보기 ──
  if(pos==='tiktok-bold') {
    // 9:16 하단 중앙 자막 영역
    var tbGr=ctx.createLinearGradient(0,H*0.48,0,H);
    tbGr.addColorStop(0,'rgba(0,0,0,0)'); tbGr.addColorStop(1,'rgba(0,0,0,0.92)');
    ctx.fillStyle=tbGr; ctx.fillRect(0,H*0.48,W,H*0.52);
    // 대형 흰 텍스트 블록
    ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillRect(W*0.08,H*0.56,W*0.84,H*0.09);
    // 핵심 단어 노랑 블록
    ctx.fillStyle=acc; ctx.fillRect(W*0.08,H*0.68,W*0.42,H*0.09);
    ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.fillRect(W*0.53,H*0.68,W*0.39,H*0.09);
    // 보조 텍스트
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillRect(W*0.2,H*0.81,W*0.6,H*0.05);
  } else if(pos==='word-highlight') {
    // 중앙 단어 하이라이트 블록들
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.06,H*0.3,W*0.36,H*0.1);
    ctx.fillStyle=acc; ctx.fillRect(W*0.44,H*0.3,W*0.28,H*0.1);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.74,H*0.3,W*0.2,H*0.1);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.06,H*0.46,W*0.24,H*0.1);
    ctx.fillStyle=acc; ctx.fillRect(W*0.32,H*0.46,W*0.38,H*0.1);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.72,H*0.46,W*0.22,H*0.1);
    // 서브 텍스트
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(W*0.16,H*0.62,W*0.68,H*0.05);
  } else if(pos==='swiss-clean') {
    // 스위스 타이포 — 좌정렬 굵은 선 레이아웃
    ctx.fillStyle=acc; ctx.fillRect(W*0.06,H*0.1,Math.max(2,W*0.015),H*0.18);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(W*0.1,H*0.12,W*0.62,H*0.08);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(W*0.1,H*0.24,W*0.78,H*0.08);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(W*0.1,H*0.36,W*0.55,H*0.08);
    ctx.fillStyle='rgba(0,0,0,0.18)'; ctx.fillRect(W*0.1,H*0.5,W*0.85,H*0.002);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.1,H*0.56,W*0.72,H*0.05);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.1,H*0.64,W*0.6,H*0.05);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.1,H*0.72,W*0.68,H*0.05);
    // 하단 풀라인 레드바
    ctx.fillStyle=acc; ctx.fillRect(0,H*0.9,W,H*0.08);
  } else if(pos==='neon-noir') {
    // 사이버펑크 네온 좌정렬
    var nnGr=ctx.createLinearGradient(0,0,W,H);
    nnGr.addColorStop(0,'rgba(168,85,247,0.15)'); nnGr.addColorStop(1,'rgba(0,255,255,0.06)');
    ctx.fillStyle=nnGr; ctx.fillRect(0,0,W,H);
    // 좌측 세로 네온 바
    var nlBar=ctx.createLinearGradient(0,H*0.1,0,H*0.8);
    nlBar.addColorStop(0,'rgba(168,85,247,0)'); nlBar.addColorStop(0.5,acc); nlBar.addColorStop(1,'rgba(168,85,247,0)');
    ctx.fillStyle=nlBar; ctx.fillRect(W*0.04,H*0.1,Math.max(2,W*0.012),H*0.7);
    // 텍스트 블록 (퍼플 글로우)
    ctx.fillStyle='rgba(224,195,255,0.9)'; ctx.fillRect(W*0.1,H*0.16,W*0.55,H*0.08);
    ctx.fillStyle='rgba(224,195,255,0.75)'; ctx.fillRect(W*0.1,H*0.28,W*0.72,H*0.08);
    ctx.fillStyle='rgba(224,195,255,0.6)'; ctx.fillRect(W*0.1,H*0.4,W*0.48,H*0.08);
    ctx.fillStyle='rgba(192,150,255,0.35)'; ctx.fillRect(W*0.1,H*0.56,W*0.65,H*0.05);
    ctx.fillStyle='rgba(192,150,255,0.35)'; ctx.fillRect(W*0.1,H*0.64,W*0.5,H*0.05);
    // 하단 사이버 패널
    var nnBot=ctx.createLinearGradient(0,H*0.78,0,H);
    nnBot.addColorStop(0,'rgba(168,85,247,0.12)'); nnBot.addColorStop(1,'rgba(168,85,247,0.25)');
    ctx.fillStyle=nnBot; ctx.fillRect(0,H*0.78,W,H*0.22);
    ctx.fillStyle=acc; ctx.fillRect(0,H*0.78,W,Math.max(1,H*0.012));
  } else if(pos==='zine-cut') {
    // 진/콜라주 — 불규칙 블록 레이아웃
    ctx.fillStyle='rgba(220,38,38,0.9)'; ctx.fillRect(0,H*0.06,W*0.55,H*0.22);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(W*0.58,H*0.06,W*0.42,H*0.14);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,H*0.32,W*0.85,H*0.1);
    ctx.fillStyle='rgba(0,0,0,0.88)'; ctx.fillRect(0,H*0.46,W*0.65,H*0.1);
    ctx.fillStyle='rgba(220,38,38,0.12)'; ctx.fillRect(0,H*0.6,W,H*0.4);
    ctx.fillStyle='rgba(220,38,38,0.85)'; ctx.fillRect(0,H*0.6,W,Math.max(2,H*0.015));
    ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(W*0.06,H*0.68,W*0.7,H*0.06);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(W*0.06,H*0.78,W*0.55,H*0.05);
  } else if(pos==='cinematic-dark') {
    // 시네마 레터박스
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H*0.14); ctx.fillRect(0,H*0.86,W,H*0.14);
    // 중앙 골드 텍스트
    var cdMid=ctx.createLinearGradient(0,H*0.35,0,H*0.65);
    cdMid.addColorStop(0,'rgba(0,0,0,0)'); cdMid.addColorStop(0.5,'rgba(0,0,0,0.65)'); cdMid.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=cdMid; ctx.fillRect(0,H*0.3,W,H*0.4);
    ctx.fillStyle='rgba(200,169,110,0.9)'; ctx.fillRect(W*0.1,H*0.38,W*0.8,H*0.08);
    ctx.fillStyle='rgba(200,169,110,0.7)'; ctx.fillRect(W*0.2,H*0.5,W*0.6,H*0.06);
    ctx.fillStyle='rgba(200,169,110,0.4)'; ctx.fillRect(W*0.3,H*0.6,W*0.4,H*0.04);
    // 골드 씬 번호선
    ctx.fillStyle='rgba(200,169,110,0.5)'; ctx.fillRect(W*0.04,H*0.33,W*0.04,Math.max(1,H*0.001));
  } else if(pos==='aurora') {
    // 오로라 그라디언트
    var auGr=ctx.createRadialGradient(W*0.5,H*0.3,W*0.05,W*0.5,H*0.5,W*0.9);
    auGr.addColorStop(0,'rgba(232,121,249,0.4)'); auGr.addColorStop(0.5,'rgba(139,92,246,0.2)'); auGr.addColorStop(1,'rgba(14,165,233,0.15)');
    ctx.fillStyle=auGr; ctx.fillRect(0,0,W,H);
    // 중앙 흰 텍스트 블록들
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.1,H*0.28,W*0.8,H*0.09);
    ctx.fillStyle='rgba(255,255,255,0.75)'; ctx.fillRect(W*0.15,H*0.41,W*0.7,H*0.09);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(W*0.22,H*0.54,W*0.56,H*0.06);
    // 글로우 도트
    ctx.globalAlpha=0.6;
    ctx.beginPath();ctx.arc(W*0.5,H*0.18,W*0.04,0,Math.PI*2);ctx.fillStyle=acc;ctx.fill();
    ctx.globalAlpha=0.2;
    ctx.beginPath();ctx.arc(W*0.5,H*0.18,W*0.1,0,Math.PI*2);ctx.fillStyle=acc;ctx.fill();
    ctx.globalAlpha=1;
  } else if(pos==='vhs-retro') {
    // VHS 레트로 스캔라인
    ctx.save(); ctx.globalAlpha=0.08;
    for(var vhsl=0;vhsl<25;vhsl++){ctx.fillStyle='rgba(0,0,0,1)';ctx.fillRect(0,vhsl*4,W,2);}
    ctx.restore();
    // 크로마틱 어버레이션 텍스트 (시안+마젠타)
    ctx.fillStyle='rgba(255,0,255,0.5)'; ctx.fillRect(W*0.07,H*0.24,W*0.7,H*0.1);
    ctx.fillStyle='rgba(0,255,255,0.5)'; ctx.fillRect(W*0.1,H*0.26,W*0.7,H*0.1);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.08,H*0.25,W*0.7,H*0.1);
    ctx.fillStyle='rgba(255,0,255,0.4)'; ctx.fillRect(W*0.1,H*0.4,W*0.55,H*0.08);
    ctx.fillStyle='rgba(0,255,255,0.4)'; ctx.fillRect(W*0.12,H*0.42,W*0.55,H*0.08);
    ctx.fillStyle='rgba(255,255,255,0.8)'; ctx.fillRect(W*0.11,H*0.41,W*0.55,H*0.08);
    // VHS 노이즈 바
    ctx.fillStyle='rgba(255,255,255,0.06)'; ctx.fillRect(0,H*0.68,W,H*0.04);
    // 하단 타임코드
    ctx.fillStyle='rgba(0,255,255,0.6)'; ctx.fillRect(W*0.04,H*0.78,W*0.4,H*0.05);
    ctx.fillStyle='rgba(255,0,255,0.6)'; ctx.fillRect(W*0.5,H*0.78,W*0.25,H*0.05);
  } else if(pos==='sp-app-ad') {
    // ── 앱광고형 썸네일: 흰배경 | 보라헤더 | 제목+메타 | 이미지(16:9 크게)+버튼 ──
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    // 보라 헤더바
    ctx.fillStyle='#4a2d7a'; ctx.fillRect(0,0,W,H*0.12);
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(W*0.04,H*0.03,W*0.046,H*0.018); // 햄버거 줄1
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(W*0.04,H*0.055,W*0.046,H*0.018); // 줄2
    ctx.fillStyle='rgba(255,255,255,0.18)'; ctx.fillRect(W*0.04,H*0.080,W*0.046,H*0.018); // 줄3
    ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillRect(W*0.20,H*0.040,W*0.46,H*0.040); // 채널명
    ctx.fillStyle='rgba(255,255,255,0.35)'; ctx.fillRect(W*0.80,H*0.040,W*0.14,H*0.040); // 검색
    // 포스트 제목
    ctx.fillStyle='rgba(0,0,0,0.80)'; ctx.fillRect(W*0.05,H*0.14,W*0.82,H*0.050);
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(W*0.05,H*0.20,W*0.44,H*0.030);
    // 구분선
    ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.fillRect(0,H*0.24,W,H*0.003);
    // 이미지 박스 — 16:9 크게 (44%~95%)
    var saImgX=W*0.04, saImgW=W*0.92, saImgH=saImgW*(9/16), saImgY=H*0.27;
    var saIGr=ctx.createLinearGradient(0,saImgY,0,saImgY+saImgH);
    saIGr.addColorStop(0,'#dde7f2'); saIGr.addColorStop(1,'#b8cad8');
    ctx.fillStyle=saIGr; ctx.fillRect(saImgX,saImgY,saImgW,saImgH);
    // 이미지 위 오버레이 버튼 (우측 하단 4개)
    var saBX=saImgX+saImgW-W*0.13;
    var saBotY=saImgY+saImgH-H*0.02;
    ['','','',''].forEach(function(_,bi){
      ctx.fillStyle='rgba(0,0,0,0.22)'; ctx.fillRect(saBX,saBotY-bi*(H*0.065),W*0.10,H*0.048);
    });

  } else if(pos==='sp-insta-ad') {
    // ── 인스타광고형 썸네일: 격자bg | 프로필 헤더 | 이미지(크게) | 훅카피 | 액션바 ──
    ctx.fillStyle='#f5f5f0'; ctx.fillRect(0,0,W,H);
    ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#a8a8a8'; ctx.lineWidth=0.5;
    var sbG=W*0.11;
    for(var gi=0;gi*sbG<W*2;gi++){
      ctx.beginPath();ctx.moveTo(gi*sbG,0);ctx.lineTo(gi*sbG,H);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,gi*sbG);ctx.lineTo(W,gi*sbG);ctx.stroke();
    }
    ctx.restore();
    // 프로필 헤더
    var sbPfR=H*0.040;
    var sbPfGr2=ctx.createRadialGradient(W*0.07,H*0.06,0,W*0.07,H*0.06,sbPfR);
    sbPfGr2.addColorStop(0,'#f8a04b'); sbPfGr2.addColorStop(1,'#833ab4');
    ctx.fillStyle=sbPfGr2; ctx.beginPath(); ctx.arc(W*0.07,H*0.06,sbPfR,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(0,0,0,0.70)'; ctx.fillRect(W*0.14,H*0.038,W*0.40,H*0.026);
    ctx.fillStyle='rgba(0,0,0,0.30)'; ctx.fillRect(W*0.14,H*0.070,W*0.22,H*0.020);
    // 이미지 (정사각형, 크게)
    var sbTImgX=W*0.02, sbTImgW=W*0.96, sbTImgH=sbTImgW, sbTImgY=H*0.115;
    var sbTIGr=ctx.createLinearGradient(0,sbTImgY,0,sbTImgY+sbTImgH);
    sbTIGr.addColorStop(0,'#c8d8ea'); sbTIGr.addColorStop(1,'#a0b8cc');
    ctx.fillStyle=sbTIGr; ctx.fillRect(sbTImgX,sbTImgY,sbTImgW,sbTImgH);
    // 훅 카피 텍스트 (이미지 아래)
    var sbTActY2=sbTImgY+sbTImgH+H*0.012;
    ctx.fillStyle='rgba(0,0,0,0.78)'; ctx.fillRect(W*0.05,sbTActY2,W*0.72,H*0.040);
    ctx.fillStyle='#e0406b'; ctx.fillRect(W*0.05,sbTActY2+H*0.046,W*0.58,H*0.038);
    // 액션 바
    var sbTActY=sbTActY2+H*0.092;
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.05,sbTActY,W*0.10,H*0.032);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.20,sbTActY,W*0.10,H*0.032);
    ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(W*0.35,sbTActY,W*0.10,H*0.032);
    ctx.fillStyle='rgba(0,0,0,0.30)'; ctx.fillRect(W*0.78,sbTActY,W*0.10,H*0.032);

  } else if(pos==='sp-banner') {
    // ── 배너강조형 썸네일: 파란배너(최상단) | 제목+서브 | 이미지(크게, 거의 전체) ──
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,W,H);
    // 파란 배너 — 최상단
    ctx.fillStyle='#3a76d8'; ctx.fillRect(0,0,W,H*0.085);
    ctx.fillStyle='rgba(255,255,255,0.88)'; ctx.fillRect(W*0.22,H*0.024,W*0.56,H*0.038); // 채널명
    // 제목 텍스트
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(W*0.05,H*0.100,W*0.82,H*0.048);
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(W*0.05,H*0.156,W*0.66,H*0.048);
    // 서브 텍스트
    ctx.fillStyle='rgba(0,0,0,0.38)'; ctx.fillRect(W*0.05,H*0.216,W*0.88,H*0.028);
    ctx.fillStyle='rgba(0,0,0,0.26)'; ctx.fillRect(W*0.05,H*0.250,W*0.72,H*0.024);
    // 이미지 풀너비 (큰 영역)
    var scImgX2=0, scImgW2=W, scImgH2=H-H*0.288, scImgY2=H*0.288;
    var scIGr2=ctx.createLinearGradient(0,scImgY2,0,scImgY2+scImgH2);
    scIGr2.addColorStop(0,'#dde8f5'); scIGr2.addColorStop(1,'#b8cce0');
    ctx.fillStyle=scIGr2; ctx.fillRect(scImgX2,scImgY2,scImgW2,scImgH2);
    // 이미지 위 오버레이 버튼 (우측 하단, 5개)
    var scBX2=scImgW2-W*0.15;
    var scBotY2=scImgY2+scImgH2-H*0.02;
    [0,1,2,3,4].forEach(function(bi){
      ctx.fillStyle='rgba(255,255,255,0.22)'; ctx.fillRect(scBX2,scBotY2-bi*(H*0.068),W*0.12,H*0.050);
    });

  } else if(pos==='shorts-frame') {
    // ── Shorts Frame 스켈레톤: 유튜브 숏츠 앱 UI 프레임 ──
    // 1) 전체 흰 배경
    ctx.fillStyle='#f8f9fa'; ctx.fillRect(0,0,W,H);
    // 2) 상단 하늘색 헤더바 (← Shorts ☆ ≡)
    ctx.fillStyle='#a8d8ea'; ctx.fillRect(0,0,W,H*0.075);
    // 헤더 아이콘 블록들
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(W*0.04,H*0.022,W*0.04,H*0.030); // ← 뒤로
    ctx.fillStyle='rgba(0,0,0,0.5)';  ctx.fillRect(W*0.22,H*0.022,W*0.35,H*0.030); // Shorts 텍스트
    ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(W*0.72,H*0.022,W*0.07,H*0.030); // 🔍
    ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(W*0.82,H*0.022,W*0.07,H*0.030); // ☆
    ctx.fillStyle='rgba(0,0,0,0.3)';  ctx.fillRect(W*0.92,H*0.022,W*0.05,H*0.030); // ≡
    // 3) 탭 메뉴 바 (구독·라이브·렌즈·트렌드)
    ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.fillRect(0,H*0.075,W,H*0.042);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(W*0.04,H*0.085,W*0.13,H*0.020);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(W*0.22,H*0.085,W*0.13,H*0.020);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(W*0.40,H*0.085,W*0.10,H*0.020);
    ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(W*0.55,H*0.085,W*0.13,H*0.020);
    // 4) 제목+조회수 영역
    ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(W*0.04,H*0.130,W*0.82,H*0.040);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fillRect(W*0.04,H*0.175,W*0.50,H*0.020);
    // 5) 중앙 미디어 박스
    ctx.fillStyle='rgba(0,0,0,0.06)'; ctx.fillRect(0,H*0.205,W,H*0.52);
    ctx.strokeStyle='rgba(0,0,0,0.08)'; ctx.lineWidth=1;
    ctx.strokeRect(0,H*0.205,W,H*0.52);
    ctx.fillStyle='rgba(0,0,0,0.10)'; ctx.font='12px sans-serif'; ctx.textAlign='center';
    ctx.fillText('▶',W*0.5,H*0.465);
    // 6) 하단 채널/자막 영역
    ctx.fillStyle='rgba(0,0,0,0.82)'; ctx.fillRect(0,H*0.728,W,H*0.18);
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillRect(W*0.14,H*0.742,W*0.6,H*0.025);
    ctx.fillStyle='rgba(255,255,255,0.45)'; ctx.fillRect(W*0.14,H*0.775,W*0.45,H*0.020);
    // 7) 최하단 내비 바
    ctx.fillStyle='#111111'; ctx.fillRect(0,H*0.910,W,H*0.09);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(W*0.08,H*0.920,W*0.10,H*0.035);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(W*0.29,H*0.920,W*0.10,H*0.035);
    ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.fillRect(W*0.45,H*0.916,W*0.12,H*0.042);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(W*0.63,H*0.920,W*0.10,H*0.035);
    ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.fillRect(W*0.82,H*0.920,W*0.10,H*0.035);
  } else {
    var fbGr=ctx.createLinearGradient(0,H*0.55,0,H);
    fbGr.addColorStop(0,'rgba(0,0,0,0)'); fbGr.addColorStop(1,'rgba(0,0,0,0.8)');
    ctx.fillStyle=fbGr; ctx.fillRect(0,H*0.55,W,H*0.45);
    ctx.fillStyle=acc; ctx.fillRect(8,H*0.58,3,H*0.12);
  }

  // ── 배지 (우상단) ──
  var bdgTxt=tpl.badge||'';
  if(bdgTxt){
    var bdgSz=7.5;
    ctx.font='bold '+bdgSz+'px Noto Sans KR,sans-serif';
    var bdgW=ctx.measureText(bdgTxt).width+10;
    ctx.fillStyle=tpl.badgeClr||acc;
    ctx.fillRect(W-bdgW-4,3,bdgW,bdgSz+6);
    ctx.fillStyle='#fff'; ctx.textAlign='right';
    ctx.shadowColor='rgba(0,0,0,0.3)'; ctx.shadowBlur=2;
    ctx.fillText(bdgTxt,W-7,bdgSz+5);
    ctx.shadowBlur=0;
  }

  // ── 템플릿 이름 (좌하단) ──
  ctx.fillStyle=isLight?'rgba(0,0,0,0.72)':'rgba(255,255,255,0.9)';
  ctx.font='bold 8.5px Noto Sans KR,sans-serif';
  ctx.textAlign='left';
  ctx.shadowColor=isLight?'rgba(255,255,255,0.5)':'rgba(0,0,0,0.8)'; ctx.shadowBlur=3;
  ctx.fillText(tpl.n, 5, H-5);
  ctx.shadowBlur=0;

  // ── FX 힌트 파티클 ──
  if(tpl.fx==='particles'||tpl.fx==='aurora'){
    ctx.save(); ctx.globalAlpha=0.35;
    for(var fp=0;fp<5;fp++){
      ctx.beginPath();ctx.arc(fp*32+8,(fp*17+8)%42,2.5,0,Math.PI*2);
      ctx.fillStyle=acc;ctx.fill();
    }
    ctx.restore();
  }
  if(tpl.fx==='sparkles'){
    ctx.save(); ctx.globalAlpha=0.5;
    [[0.15,0.1],[0.85,0.12],[0.5,0.06],[0.92,0.45],[0.08,0.5]].forEach(function(p){
      ctx.beginPath();ctx.arc(p[0]*W,p[1]*H,2,0,Math.PI*2);ctx.fillStyle=acc;ctx.fill();
    });
    ctx.restore();
  }
  if(tpl.fx==='scanlines'){
    ctx.save(); ctx.globalAlpha=0.06;
    for(var sl=0;sl<25;sl++){ctx.fillStyle='#000';ctx.fillRect(0,sl*4,W,2);}
    ctx.restore();
  }
}

function selectTpl(i) {
  S.tplId = i;
  document.querySelectorAll('.tc').forEach(function(el,idx){el.classList.toggle('on',idx===i);});
  drawScene(curScene,1);
  _refreshBlks(curScene);
}

// ══════════════════════════════════════════════════════════════
//  CANVAS SETUP
// ══════════════════════════════════════════════════════════════
function setupCanvas() {
  resizeCanvas();
  drawScene(curScene,0);
  _refreshBlks(curScene);
}
function resizeCanvas() {
  var canvas=document.getElementById('pv');
  var wrap=document.getElementById('canvas-wrap');
  // 모바일에서는 화면 전체 너비 기준으로 계산
  var isMobile=window.innerWidth<=600;
  var availW=isMobile ? (window.innerWidth-20) : (wrap.clientWidth-30||400);
  // -80: 패딩(40) + 하단 툴바바(40) 확보 → 캔버스 위 잘림 방지
  var availH=isMobile ? Math.round(window.innerHeight*0.55) : (wrap.clientHeight-80||460);
  var maxH=Math.max(availH,200);
  var maxW=Math.max(availW,200);
  if(S.fmt==='short'){
    var h=Math.min(maxH,460);
    var w=Math.round(h*9/16);
    if(w>maxW){w=maxW;h=Math.round(w*16/9);}
    canvas.width=1080;canvas.height=1920;
    canvas.style.width=w+'px';canvas.style.height=h+'px';
  } else if(S.fmt==='long'){
    var w2=Math.min(maxW,580);
    var h2=Math.round(w2*9/16);
    if(h2>maxH){h2=maxH;w2=Math.round(h2*16/9);}
    canvas.width=1920;canvas.height=1080;
    canvas.style.width=w2+'px';canvas.style.height=h2+'px';
  } else {
    var s=Math.min(maxW,maxH,isMobile?maxW:380);
    canvas.width=1080;canvas.height=1080;
    canvas.style.width=s+'px';canvas.style.height=s+'px';
  }
  // canvas.width 재할당 시 getContext 상태 리셋 → ctx 캐시 무효화
  _invalidatePvCtx();
  var _totalDurLbl=S.scenes.length>0?S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0):0;
  var _durLbl=_totalDurLbl>0?('≈'+Math.round(_totalDurLbl)+'초'):'(대본 후 자동 계산)';
  document.getElementById('canvas-lbl').textContent=
    (S.fmt==='short'?'📱 숏폼 9:16':S.fmt==='long'?'🖥️ 롱폼 16:9':'⬜ 정방형 1:1')+' | '+_durLbl;
}

// ══════════════════════════════════════════════════════════════
//  CANVAS / CTX  캐시 — 매 프레임 DOM 쿼리 제거 (성능 최적화)
// ══════════════════════════════════════════════════════════════
var _pvCanvas = null;
var _pvCtx    = null;
function _getPvCtx(){
  if(!_pvCanvas || !_pvCanvas.isConnected){
    _pvCanvas = document.getElementById('pv');
    _pvCtx    = null; // canvas 교체 시 ctx 재취득
  }
  if(_pvCanvas && !_pvCtx){
    _pvCtx = _pvCanvas.getContext('2d', {alpha:false, willReadFrequently:false});
  }
  return _pvCtx;
}
function _invalidatePvCtx(){ _pvCanvas=null; _pvCtx=null; }

// ══════════════════════════════════════════════════════════════
//  DRAW SCENE  — High Quality 숏폼 스타일 렌더링
// ══════════════════════════════════════════════════════════════
function drawScene(idx, animProg) {
  var ctx=_getPvCtx();
  if(!ctx) return;
  var canvas=_pvCanvas;
  var W=canvas.width,H=canvas.height;
  var sc=S.scenes[idx]||{title:'씬 '+(idx+1),text:'',kw:''};
  var tpl=TPLS[S.tplId]||TPLS[0];
  if(animProg===undefined) animProg=1;
  ctx.clearRect(0,0,W,H);

  // ── sp-* 템플릿: 씬 전환 효과/Ken Burns 없이 이미지만 교체 ──
  var _isSpTpl=(tpl.txt&&(tpl.txt.pos==='sp-app-ad'||tpl.txt.pos==='sp-insta-ad'||tpl.txt.pos==='sp-banner'));
  if(_isSpTpl){
    // 비디오 씬이면 live video element 우선, 없으면 스냅샷
    var _spScObj=S.scenes[idx];
    var _spLiveVid=(_spScObj&&_spScObj._vidEl&&_spScObj.customMedia&&_spScObj.customMedia.type==='video'&&_spScObj._vidEl.readyState>=2)?_spScObj._vidEl:null;
    var _spImg=_spLiveVid||sceneImgs[idx];
    // sp-* 는 drawTextLayout 에서 UI+이미지 모두 처리 (transform/alpha 없이 고정 렌더)
    ctx.save();
    drawTextLayout(ctx,W,H,sc,tpl,1,_spImg);
    ctx.restore();
    // 진행 바 표시
    if(animProg>0&&animProg<1){
      ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fillRect(0,H-4,W,4);
      ctx.fillStyle=(tpl.acc||'#4a2d7a');ctx.fillRect(0,H-4,W*animProg,4);
    }
    return;
  }

  // ── 씬 전환 효과 (씬 진입 첫 12%에서 transitionProg 0→1, easeOut) ──
  var trans=sc.transition||'none';
  var rawProg=animProg<0.12?(animProg/0.12):1;
  // easeOutCubic: 빠르게 시작해서 부드럽게 안착
  var transitionProg=1-Math.pow(1-rawProg,3);
  var tp=transitionProg; // shorthand

  // 전환 transform 설정
  ctx.save();
  if(trans!=='none' && tp<1){
    var inv=1-tp; // 0→1 진행 시 0에서 1로 (초기에 효과 강하고 점차 사라짐)
    switch(trans){
      case 'slide_left':
        ctx.translate(-W*inv,0); break;
      case 'slide_right':
        ctx.translate(W*inv,0); break;
      case 'slide_up':
        ctx.translate(0,-H*inv); break;
      case 'slide_down':
        ctx.translate(0,H*inv); break;
      case 'zoom_in':
        var zs=1+inv*0.5;
        ctx.translate(W/2,H/2);ctx.scale(zs,zs);ctx.translate(-W/2,-H/2); break;
      case 'zoom_out':
        var zs2=1-inv*0.4;
        ctx.translate(W/2,H/2);ctx.scale(Math.max(0.1,zs2),Math.max(0.1,zs2));ctx.translate(-W/2,-H/2); break;
      case 'spin':
        ctx.translate(W/2,H/2);ctx.rotate(inv*Math.PI*2);ctx.translate(-W/2,-H/2); break;
      case 'bounce':
        ctx.translate(0,-Math.abs(Math.sin(inv*Math.PI))*H*0.15); break;
      case 'wipe_left':
        ctx.beginPath();ctx.rect(W*tp,0,W,H);ctx.clip(); break;
      case 'wipe_right':
        ctx.beginPath();ctx.rect(0,0,W*tp,H);ctx.clip(); break;
      default: break;
    }
    // 페이드/블러/플래시/글리치는 alpha로 처리 (아래에서)
    if(trans==='fade'||trans==='blur'||trans==='flash'||trans==='glitch'){
      ctx.globalAlpha=tp;
    }
  }

  // 1. BACKGROUND
  // 비디오 씬: live video element 우선, 없으면 sceneImgs 스냅샷
  var _scObj=S.scenes[idx];
  var _liveVid=(_scObj&&_scObj._vidEl&&_scObj.customMedia&&_scObj.customMedia.type==='video'&&_scObj._vidEl.readyState>=2)?_scObj._vidEl:null;
  var img=_liveVid||sceneImgs[idx];
  // live video는 naturalWidth/Height 대신 videoWidth/Height 사용
  var _imgW=_liveVid?(_liveVid.videoWidth||640):((img&&img.naturalWidth)||0);
  var _imgH=_liveVid?(_liveVid.videoHeight||360):((img&&img.naturalHeight)||0);
  // shorts-frame: 이미지는 중앙 미디어 박스에만 그림 (렌더 블록에서 처리) → 배경 섹션 스킵
  var _isShortsFrame=(tpl.txt&&tpl.txt.pos==='shorts-frame');
  if(!_isShortsFrame && img && _imgW>0 && (img.complete||_liveVid)){
    if(editOpts.bgFit==='contain'){
      // 여백 유지 (letterbox)
      var scaleC=Math.min(W/Math.max(_imgW,1),H/Math.max(_imgH,1));
      var dwC=_imgW*scaleC,dhC=_imgH*scaleC;
      ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
      ctx.drawImage(img,(W-dwC)/2,(H-dhC)/2,dwC,dhC);
    } else {
      // 비디오 씬은 Ken Burns 없이 단순 cover 렌더
      var kbProg=_liveVid?0:Math.min(1,animProg);
      var isZoomOut=(idx%2===1);
      var kbZoom=_liveVid?1:(isZoomOut?(1.06-kbProg*0.06):(1.0+kbProg*0.06));
      var coverScale=Math.max(W/Math.max(_imgW,1),H/Math.max(_imgH,1));
      // 사용자 미디어 줌/패닝 오프셋 적용
      var _mZoom=(_scObj&&_scObj.mediaZoom)||1.0;
      var _mOx=(_scObj&&_scObj.mediaOffsetX)||0;
      var _mOy=(_scObj&&_scObj.mediaOffsetY)||0;
      var scale=coverScale*kbZoom*_mZoom;
      var panDir=idx%4;
      var panAmt=_liveVid?0:(kbProg*W*0.025);
      var dw=_imgW*scale,dh=_imgH*scale;
      var bx=(W-dw)/2+_mOx,by=(H-dh)/2+_mOy;
      if(panDir===1){bx+=(panAmt);}
      else if(panDir===2){bx-=(panAmt);}
      else if(panDir===3){by+=(panAmt*0.5);}
      else if(panDir===0){by-=(panAmt*0.3);} // 살짝 위로
      // 미디어가 프레임을 꽉 채우지 않을 때(축소/이동) 빈 공간을 블러 배경으로 채움
      var _coversFull=(dw>=W-0.5 && dh>=H-0.5 && bx<=0.5 && by<=0.5 && bx+dw>=W-0.5 && by+dh>=H-0.5);
      if(!_coversFull){
        try{
          ctx.save();
          if('filter' in ctx){ ctx.filter='blur(26px) brightness(0.62)'; }
          else { ctx.globalAlpha=0.55; }
          var _bs=coverScale*1.14;
          var _bw=_imgW*_bs,_bh=_imgH*_bs;
          ctx.drawImage(img,(W-_bw)/2,(H-_bh)/2,_bw,_bh);
          ctx.restore();
        }catch(e){
          ctx.save();ctx.fillStyle='#0b1020';ctx.fillRect(0,0,W,H);ctx.restore();
        }
      }
      ctx.drawImage(img,bx,by,dw,dh);
    }
    var pos2=tpl.txt&&tpl.txt.pos||'lower-third';
    // 사용자 지정 오버레이만 적용
    if(tpl.txt.overlay){ctx.fillStyle=tpl.txt.overlay;ctx.fillRect(0,0,W,H);}
  } else if(!_isShortsFrame) {
    // 사용자 설정 배경 그라디언트/색상 우선 적용
    var bgGrad=editOpts.bgGradient||'none';
    var bgGradData=null;
    if(bgGrad!=='none'&&typeof BG_GRADIENTS!=='undefined'){
      for(var bgi=0;bgi<BG_GRADIENTS.length;bgi++){
        if(BG_GRADIENTS[bgi].id===bgGrad){ bgGradData=BG_GRADIENTS[bgi]; break; }
      }
    }
    if(bgGradData&&bgGradData.css){
      // CSS 그라디언트를 Canvas에 파싱하여 적용
      var m=bgGradData.css.match(/linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]{3,8}),\s*(#[0-9a-fA-F]{3,8})\)/);
      if(m){
        var ang=(parseInt(m[1])-90)*Math.PI/180;
        var gx2=W/2+Math.cos(ang)*W;var gy2=H/2+Math.sin(ang)*H;
        var gr2=ctx.createLinearGradient(W/2-Math.cos(ang)*W,H/2-Math.sin(ang)*H,gx2,gy2);
        gr2.addColorStop(0,m[2]);gr2.addColorStop(1,m[3]);
        ctx.fillStyle=gr2;
      } else {
        ctx.fillStyle=editOpts.bgColor||tpl.bg[0]||'#1a1a2e';
      }
    } else if(editOpts.bgColor&&editOpts.bgColor!=='#0f0f1a'){
      ctx.fillStyle=editOpts.bgColor;
    } else {
      var gr=ctx.createLinearGradient(0,0,W,H);
      gr.addColorStop(0,tpl.bg[0]);
      gr.addColorStop(1,tpl.bg[tpl.bg.length-1]);
      ctx.fillStyle=gr;
    }
    ctx.fillRect(0,0,W,H);
  }
  // shorts-frame: 배경색(흰색)으로 전체 채우기 (이미지는 렌더 블록에서 중앙 박스에 그림)
  if(_isShortsFrame){
    var sfBg=editOpts.bgColor&&editOpts.bgColor!=='#0f0f1a'?editOpts.bgColor:(tpl.bg[0]||'#ffffff');
    ctx.fillStyle=sfBg;
    ctx.fillRect(0,0,W,H);
  }

  // 2. SPECIAL FX
  drawFx(ctx,W,H,tpl,animProg);

  // 3. TEXT LAYOUT — 미리보기/다운로드 항상 Canvas에 텍스트 렌더
  drawTextLayout(ctx,W,H,sc,tpl,animProg,img);

  ctx.restore(); // 전환 transform 복원

  // 글리치 효과 (restore 후 별도 처리)
  if(trans==='glitch' && tp<1){
    var gi=(1-tp);
    for(var gg=0;gg<5;gg++){
      var gx=Math.random()*W-W*0.1;
      var gy=Math.random()*H;
      var gw=Math.random()*W*0.4*gi+10;
      var gh=Math.random()*8+2;
      ctx.save();
      ctx.globalAlpha=gi*0.4;
      ctx.fillStyle=gg%2===0?'rgba(255,0,100,0.6)':'rgba(0,200,255,0.6)';
      ctx.fillRect(gx,gy,gw,gh);
      ctx.restore();
    }
  }

  // 4. PROGRESS BAR
  if(animProg>0 && animProg<1){
    ctx.fillStyle='rgba(255,255,255,0.1)';
    ctx.fillRect(0,H-4,W,4);
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,H-4,W*animProg,4);
  }

  // 5. 전환 효과 플래시 오버레이
  if(trans==='flash' && tp<1){
    ctx.save();
    ctx.globalAlpha=(1-tp)*0.8;
    ctx.fillStyle='#fff';
    ctx.fillRect(0,0,W,H);
    ctx.restore();
  }

  // 6. 스티커/이모지 렌더링
  if(sc.stickers && sc.stickers.length>0){
    sc.stickers.forEach(function(st){
      ctx.save();
      var sz=Math.round(W*(st.size||0.12));
      ctx.font=sz+'px serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.globalAlpha=0.95;
      ctx.fillText(st.emoji, W*st.x, H*st.y);
      ctx.restore();
    });
  }

  // 7. 워터마크
  if(editOpts.watermark){
    ctx.save();
    ctx.globalAlpha=0.55;
    var wmSz=Math.round(W*0.028);
    ctx.font='600 '+wmSz+'px Noto Sans KR,sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.strokeStyle='rgba(0,0,0,0.5)';
    ctx.lineWidth=2;
    ctx.textAlign='right';
    ctx.shadowColor='rgba(0,0,0,0.7)';ctx.shadowBlur=6;
    ctx.strokeText(editOpts.watermark,W-W*0.03,H*0.97);
    ctx.fillText(editOpts.watermark,W-W*0.03,H*0.97);
    ctx.restore();
  }
}

function drawFx(ctx,W,H,tpl,prog) {
  var fx=tpl.fx;
  if(!fx||fx==='none') return;
  if(fx==='particles'){
    ctx.save();ctx.globalAlpha=0.12;
    for(var i=0;i<10;i++){ctx.beginPath();ctx.arc(W*(0.05+i*0.1),H*(0.15+Math.sin(i*1.3)*0.25),W*0.04,0,Math.PI*2);ctx.fillStyle=tpl.acc;ctx.fill();}
    ctx.restore();
  }
  if(fx==='scanlines'){
    ctx.save();ctx.globalAlpha=0.07;
    for(var y=0;y<H;y+=4){ctx.fillStyle='rgba(0,0,0,1)';ctx.fillRect(0,y,W,2);}
    ctx.restore();
  }
  if(fx==='stars'){
    ctx.save();ctx.globalAlpha=0.7;
    for(var s=0;s<200;s++){
      var sx=(s*7919+1234)%W,sy=(s*6271+5678)%H,sr=(s%5<1)?2:1;
      ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);
      ctx.fillStyle='rgba(255,255,255,'+(0.2+(s%5)*0.15)+')';ctx.fill();
    }
    ctx.restore();
  }
  if(fx==='news_bar'){
    ctx.fillStyle=tpl.acc;ctx.fillRect(0,0,W,Math.round(H*0.012));
    ctx.fillStyle='rgba(239,68,68,0.92)';ctx.fillRect(0,H-Math.round(H*0.1),W,Math.round(H*0.1));
    ctx.fillStyle='#fff';ctx.font='bold '+Math.round(H*0.032)+'px Noto Sans KR';
    ctx.textAlign='left'; var _lt2Lbl=_lblTxt('BREAKING  |  BYGENCY NEWS'); if(_lt2Lbl) ctx.fillText(_lt2Lbl,_tx(Math.round(W*0.02),'label'),_ty(H-Math.round(H*0.03),'label'));
  }
  if(fx==='letterbox'){
    var bar=Math.round(H*0.1);
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,bar);ctx.fillRect(0,H-bar,W,bar);
  }
  if(fx==='grid_lines'){
    ctx.save();ctx.globalAlpha=0.07;
    for(var gi=0;gi<8;gi++){
      ctx.strokeStyle='#60a5fa';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(gi*W/8,0);ctx.lineTo(gi*W/8,H);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,gi*H/8);ctx.lineTo(W,gi*H/8);ctx.stroke();
    }
    ctx.restore();
  }
  if(fx==='sparkles'){
    ctx.save();ctx.globalAlpha=0.3;
    var pts=[[0.1,0.1],[0.85,0.15],[0.15,0.85],[0.8,0.75],[0.5,0.05],[0.92,0.5],[0.05,0.5]];
    pts.forEach(function(p){ctx.beginPath();ctx.arc(p[0]*W,p[1]*H,W*0.015,0,Math.PI*2);ctx.fillStyle=tpl.acc;ctx.fill();});
    ctx.restore();
  }
  if(fx==='golden_particles'){
    ctx.save();ctx.globalAlpha=0.18;
    for(var gi2=0;gi2<16;gi2++){
      ctx.beginPath();ctx.arc(W*(gi2*0.065),H*(0.1+gi2*0.055%0.85),W*0.018,0,Math.PI*2);
      ctx.fillStyle='#fbbf24';ctx.fill();
    }
    ctx.restore();
  }
  if(fx==='waves'){
    ctx.save();ctx.globalAlpha=0.12;
    ctx.strokeStyle='#00d4ff';ctx.lineWidth=3;
    for(var wi=0;wi<3;wi++){
      ctx.beginPath();
      for(var x=0;x<W;x+=6){
        var wy=H*(0.65+wi*0.1)+Math.sin(x/W*Math.PI*5+wi*1.5)*H*0.04;
        if(x===0)ctx.moveTo(x,wy);else ctx.lineTo(x,wy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if(fx==='aurora'){
    ctx.save();
    var agr=ctx.createLinearGradient(0,0,W,H);
    agr.addColorStop(0,'rgba(103,232,249,0.18)');
    agr.addColorStop(0.5,'rgba(167,139,250,0.12)');
    agr.addColorStop(1,'rgba(52,211,153,0.15)');
    ctx.fillStyle=agr;ctx.fillRect(0,0,W,H);
    ctx.restore();
  }
  if(fx==='film_grain'){
    ctx.save();ctx.globalAlpha=0.05;
    for(var fi=0;fi<600;fi++){
      ctx.fillStyle='rgba(255,200,100,1)';
      ctx.fillRect(Math.floor(Math.random()*W),Math.floor(Math.random()*H),2,2);
    }
    ctx.restore();
  }
  if(fx==='glitch'||fx==='glitch2'){
    ctx.save();ctx.globalAlpha=0.08;
    for(var gx=0;gx<3;gx++){
      var gy=H*(0.2+gx*0.25),gh=H*0.04;
      ctx.fillStyle=gx===0?'rgba(255,0,0,0.5)':'rgba(0,255,255,0.5)';
      ctx.fillRect(W*0.03,gy,W*0.94,gh);
    }
    ctx.restore();
  }
  if(fx==='matrix'){
    ctx.save();ctx.globalAlpha=0.08;
    ctx.fillStyle='#22c55e';ctx.font=Math.round(W*0.018)+'px monospace';
    var chars='01';
    for(var mc=0;mc<20;mc++){
      var mx=(mc*(W/20)),mytxt='';
      for(var mr=0;mr<8;mr++) mytxt+=chars[Math.floor((mc+mr)%2)];
      ctx.fillText(mytxt,mx,H*(0.1+mc*0.06));
    }
    ctx.restore();
  }
}

function drawTextLayout(ctx,W,H,sc,tpl,animProg,img) {
  var t=Object.assign({},tpl.txt); // 복사본 생성
  // 사용자 정의 색상 오버라이드
  if(editOpts.titleColor) t.titleClr=editOpts.titleColor;
  if(editOpts.bodyColor)  t.bodyClr=editOpts.bodyColor;
  var pos=t.pos||'lower-third';
  // editOpts.textAlign override (또는 씬별 sc.textAlign)
  var align=sc.textAlign||editOpts.textAlign||t.align||'left';
  // ★ 대본분리 씬(sc.title='', sc.text=내용) vs 수동씬(sc.title=제목, sc.text=본문)
  // hasTitle: sc.title이 실제로 값이 있는지 여부
  var hasTitle=!!(sc.title&&sc.title.trim().length>0);
  // titleText: 제목이 있으면 제목, 없으면 sc.text(대본분리씬 → sc.text가 전체 내용)
  var titleText=hasTitle?sc.title:sc.text||'';
  // bodyText: 제목이 있으면 sc.text(본문), 없으면 ''(대본분리씬은 titleText로 전체 표시)
  var bodyText=hasTitle?(sc.text||''):'';
  // 학원이름 플레이스홀더 치환 — 모든 템플릿에서 '학원이름' → 실제 학원명
  (function(){ var _bn=(editOpts.brandName||'').trim(); if(_bn){ titleText=titleText.replace(/학원이름/g,_bn); bodyText=bodyText.replace(/학원이름/g,_bn); } })();  // Animation
  var alpha=Math.min(1,animProg*2.5);
  var slideY=(1-Math.min(1,animProg*3.5))*H*0.04;
  // 드래그 이동 오프셋: display pixel 단위로 저장 → canvas pixel로 변환
  var _cvScale=(_pvCanvas&&_pvCanvas.clientWidth)?W/Math.max(1,_pvCanvas.clientWidth):1;
  var _tOx=(sc.textOffsetX||0)*_cvScale, _tOy=(sc.textOffsetY||0)*_cvScale;
  // 사용자 지정 글자 크기 (A+/A- 버튼) — CSS px → canvas px 변환
  var _userTsz = sc.titleFontSize ? Math.round(sc.titleFontSize*_cvScale) : 0;
  var _userBsz = sc.bodyFontSize  ? Math.round(sc.bodyFontSize*_cvScale)  : 0;
  var _bOx=(sc.bodyOffsetX||0)*_cvScale, _bOy=(sc.bodyOffsetY||0)*_cvScale;
  var _lOx=(sc.labelOffsetX||0)*_cvScale, _lOy=(sc.labelOffsetY||0)*_cvScale;
  var _lblHidden=(sc.labelHidden===true);
  // ★ 편집 중인 블록 파악 — 편집 중이면 Canvas에서 해당 텍스트 숨김 (ce가 표시 담당)
  var _editingTitle=false, _editingBody=false, _editingLabel=false;
  (function(){
    var tce=document.getElementById('blk-title-ce');
    var bce=document.getElementById('blk-body-ce');
    var lce=document.getElementById('blk-label-ce');
    if(tce&&tce.contentEditable==='true') _editingTitle=true;
    if(bce&&bce.contentEditable==='true') _editingBody=true;
    if(lce&&lce.contentEditable==='true') _editingLabel=true;
  })();
  ctx.save();
  ctx.globalAlpha=alpha;
  // ── 텍스트 전용 offset 헬퍼 ──
  function _tx(x,isTitle){ return x+(isTitle==='label'?_lOx:isTitle?_tOx:_bOx); }
  function _ty(y,isTitle){ return y+(isTitle==='label'?_lOy:isTitle?(_tOy+slideY):_bOy); }
  // 장식 텍스트 헬퍼: 숨김이거나 편집 중이면 '', sc.labelText → brandName → 기본값
  function _lblTxt(def){ var _bd=(editOpts.brandName||'').trim(); return (_lblHidden||_editingLabel)?'':((sc.labelText!==undefined&&sc.labelText!==null)?sc.labelText:(_bd||def)); }
  // 편집 중인 블록은 Canvas에서 빈 문자열로 (CE가 표시)
  if(_editingTitle){ titleText=''; }
  if(_editingBody){ bodyText=''; }
  // ★ shorts-frame: sfBText = hasTitle ? bodyText : titleText
  // body 편집 중이고 hasTitle=false이면 titleText도 숨겨야 sfBText가 ''가 됨
  if(_editingBody && !(sc.title&&sc.title.trim().length>0)){ titleText=''; }
  // ── 고화질 텍스트 렌더링 설정 ──
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality='high';

  var isLight=(tpl.bg[0]==='#ffffff'||tpl.bg[0]==='#f8fafc'||tpl.bg[0]==='#f0fdf4'||tpl.bg[0]==='#eff6ff'||tpl.bg[0]==='#f1f5f9');
  // ── 텍스트 그림자 강화 (선명도 향상) ──
  var shadowClr=isLight?'rgba(0,0,0,0.6)':'rgba(0,0,0,0.92)';
  var tszBase=Math.round(W*(S.fmt==='long'?0.048:0.058));
  var bszBase=Math.round(W*(S.fmt==='long'?0.030:0.037));
  // 크기 배율 적용
  var tsz=_userTsz||Math.round(tszBase*(editOpts.titleSize||1.0));
  var bsz=_userBsz||Math.round(bszBase*(editOpts.bodySize||1.0));

  // ── 고품질 텍스트 드로잉 헬퍼: 강한 그림자+아웃라인으로 선명도 극대화 ──
  function drawHQText(text, x, y, fillClr, outlineClr, fontSize, blur) {
    if(!text) return;
    var lw=Math.max(3, fontSize*0.07); // 아웃라인 굵기 = 폰트크기의 7%
    ctx.save();
    // ── 1단계: 두꺼운 그림자 레이어 (가장 바깥) ──
    ctx.strokeStyle='rgba(0,0,0,0.95)';
    ctx.lineWidth=lw*1.8;
    ctx.lineJoin='round';
    ctx.miterLimit=2;
    ctx.shadowColor='rgba(0,0,0,0.95)';
    ctx.shadowBlur=Math.max(blur||8,fontSize*0.18);
    ctx.shadowOffsetX=0;
    ctx.shadowOffsetY=fontSize*0.06;
    ctx.strokeText(text,x,y);
    // ── 2단계: 일반 아웃라인 ──
    ctx.strokeStyle=outlineClr||'rgba(0,0,0,0.92)';
    ctx.lineWidth=lw;
    ctx.shadowBlur=Math.max(blur||6,fontSize*0.10);
    ctx.shadowOffsetY=fontSize*0.04;
    ctx.strokeText(text,x,y);
    // ── 3단계: 내부 채우기 ──
    ctx.shadowBlur=(blur||4)*0.4;
    ctx.shadowOffsetY=fontSize*0.02;
    ctx.fillStyle=fillClr;
    ctx.fillText(text,x,y);
    // ── 4단계: 하이라이트 (미세한 상단 광택) ──
    ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
    var savedAlpha=ctx.globalAlpha;
    ctx.globalAlpha=savedAlpha*0.06;
    ctx.fillStyle='rgba(255,255,255,1)';
    ctx.fillText(text,x,y-fontSize*0.025);
    ctx.globalAlpha=savedAlpha;
    ctx.restore();
  }

  if(pos==='lower-third') {
    // ★ 대본분리씬(hasTitle=false): sc.text 전체를 titleText로 크게 표시 (noTitle 분기)
    // 수동씬(hasTitle=true): title 위쪽, body 아래쪽으로 분리 표시
    var noTitle=!hasTitle;
    var boxY=H*(noTitle?0.45:0.55);
    var boxH=H*(noTitle?0.52:0.42);
    var padX=W*0.06;

    // Gradient overlay
    var bGr=ctx.createLinearGradient(0,boxY,0,boxY+boxH);
    bGr.addColorStop(0,'rgba(0,0,0,0)');
    bGr.addColorStop(0.15,'rgba(0,0,0,0.72)');
    bGr.addColorStop(1,'rgba(0,0,0,0.92)');
    ctx.fillStyle=bGr;ctx.fillRect(0,boxY,W,boxH);

    // Accent bar
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(padX,boxY+H*0.035,W*0.007,noTitle?tsz*1.6:tsz*1.05);

    var contentX=align==='right'?W-padX:align==='center'?W/2:padX+W*0.018;
    ctx.textAlign=align;
    ctx.shadowColor=shadowClr;ctx.shadowBlur=10;ctx.shadowOffsetY=2;

    if(noTitle){
      var bigSz=Math.round(W*(S.fmt==='long'?0.038:0.048));
      ctx.font=t.titleFont+' '+bigSz+'px Noto Sans KR,Black Han Sans,sans-serif';
      ctx.fillStyle=t.titleClr;
      var bBigLines=wrapTxt(ctx,titleText,W*(align==='center'?0.84:0.80));
      var bBigY=boxY+H*0.07;
      bBigLines.slice(0,4).forEach(function(line,li){ctx.fillText(line,_tx(contentX,true),_ty(bBigY+li*bigSz*1.35,true));});
    } else {
      ctx.font=t.titleFont+' '+tsz+'px Noto Sans KR,Black Han Sans,sans-serif';
      ctx.fillStyle=t.titleClr;
      var tLines=wrapTxt(ctx,titleText,W*(align==='center'?0.82:0.78));
      var tY=boxY+H*0.06;
      tLines.slice(0,2).forEach(function(line,li){ctx.fillText(line,_tx(contentX,true),_ty(tY+li*tsz*1.25,true));});
      ctx.font=bsz+'px Noto Sans KR,sans-serif';
      ctx.fillStyle=t.bodyClr;ctx.shadowBlur=6;
      var bY=tY+Math.min(tLines.length,2)*tsz*1.25+bsz*0.6;
      var bLines=wrapTxt(ctx,bodyText,W*(align==='center'?0.82:0.78));
      bLines.slice(0,3).forEach(function(line,li){ctx.fillText(line,_tx(contentX,false),_ty(bY+li*bsz*1.5,false));});
    }

  } else if(pos==='center-box') {
    // Center card style
    var cBoxW=W*0.88,cBoxH=H*(S.fmt==='long'?0.6:0.45);
    var cBoxX=(W-cBoxW)/2,cBoxY=(H-cBoxH)/2;
    ctx.fillStyle='rgba(0,0,0,0.62)';
    roundRect(ctx,cBoxX,cBoxY,cBoxW,cBoxH,W*0.025);
    ctx.strokeStyle=tpl.acc;ctx.lineWidth=W*0.004;
    roundRectStroke(ctx,cBoxX,cBoxY,cBoxW,cBoxH,W*0.025);
    // Accent top bar
    ctx.fillStyle=tpl.acc;
    roundRect(ctx,cBoxX,cBoxY,cBoxW,W*0.008,W*0.004);
    // Title
    ctx.font=t.titleFont+' '+tsz+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center';ctx.shadowColor=shadowClr;ctx.shadowBlur=10;
    ctx.fillStyle=t.titleClr;
    var ctLines=wrapTxt(ctx,titleText,cBoxW*0.88);
    var ctY=cBoxY+cBoxH*0.22;
    ctLines.slice(0,2).forEach(function(line,li){ctx.fillText(line,_tx(W/2,true),_ty(ctY+li*tsz*1.25,true));});
    ctx.font=bsz+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr;ctx.shadowBlur=5;
    var cbY=ctY+Math.min(ctLines.length,2)*tsz*1.3+bsz*0.5;
    var cbLines=wrapTxt(ctx,bodyText,cBoxW*0.85);
    cbLines.slice(0,4).forEach(function(line,li){ctx.fillText(line,_tx(W/2,false),_ty(cbY+li*bsz*1.5,false));});

  } else if(pos==='news-bar') {
    // Top title area
    ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,W,H*0.18);
    ctx.fillStyle=tpl.acc;ctx.fillRect(0,0,W*0.008,H*0.18);
    ctx.font=t.titleFont+' '+tsz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left';ctx.shadowColor=shadowClr;ctx.shadowBlur=8;
    ctx.fillStyle=t.titleClr;
    ctx.fillText(titleText,_tx(W*0.02,true),_ty(H*0.11,true));
    ctx.font=bsz+'px Noto Sans KR,sans-serif';ctx.shadowBlur=4;
    ctx.fillStyle='#fff';
    ctx.fillText(hasTitle?bodyText:titleText,_tx(W*0.02,false),_ty(H-H*0.06,false));

  } else if(pos==='cinematic') {
    // Cinematic: center title big, body below
    ctx.font=t.titleFont+' '+Math.round(tsz*1.2)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center';ctx.shadowColor=shadowClr;ctx.shadowBlur=20;
    ctx.fillStyle=t.titleClr;
    var cinLines=wrapTxt(ctx,titleText,W*0.82);
    var cinY=H*0.38;
    cinLines.slice(0,2).forEach(function(line,li){ctx.fillText(line,_tx(W/2,true),_ty(cinY+li*tsz*1.35,true));});
    ctx.font=bsz+'px Noto Sans KR,sans-serif';ctx.shadowBlur=8;
    ctx.fillStyle=t.bodyClr;
    var cinbY=cinY+Math.min(cinLines.length,2)*tsz*1.35+bsz*0.8;
    var cinbLines=wrapTxt(ctx,bodyText,W*0.8);
    cinbLines.slice(0,3).forEach(function(line,li){ctx.fillText(line,_tx(W/2,false),_ty(cinbY+li*bsz*1.55,false));});

  } else if(pos==='lesson') {
    // Top lesson box
    ctx.fillStyle='rgba(0,0,0,0.7)';ctx.fillRect(0,0,W,H*0.22);
    ctx.fillStyle=tpl.acc;ctx.fillRect(0,H*0.22,W,W*0.006);
    ctx.font=t.titleFont+' '+Math.round(tsz*0.95)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left';ctx.shadowColor=shadowClr;ctx.shadowBlur=8;
    ctx.fillStyle=t.titleClr;
    ctx.fillText(titleText,_tx(W*0.05,true),_ty(H*0.14,true));
    var lesboxY=H*0.55;
    var lesbGr=ctx.createLinearGradient(0,lesboxY,0,lesboxY+H*0.42);
    lesbGr.addColorStop(0,'rgba(0,0,0,0)');
    lesbGr.addColorStop(0.3,'rgba(0,0,0,0.7)');
    lesbGr.addColorStop(1,'rgba(0,0,0,0.88)');
    ctx.fillStyle=lesbGr;ctx.fillRect(0,lesboxY,W,H*0.45);
    ctx.font=bsz+'px Noto Sans KR,sans-serif';ctx.fillStyle=t.bodyClr;ctx.shadowBlur=5;
    var lesbLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.88);
    lesbLines.slice(0,4).forEach(function(line,li){ctx.fillText(line,_tx(W*0.06,false),_ty(lesboxY+H*0.08+li*bsz*1.5,false));});

  } else if(pos==='sticky-top') {
    // ── 상단 고정 헤더 (릴스 유행 스타일) ──
    // 상단 반투명 헤더바
    var stBarH=H*0.14;
    ctx.fillStyle='rgba(0,0,0,0.78)';
    ctx.fillRect(0,0,W,stBarH);
    // 좌측 액센트 세로선
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,0,W*0.006,stBarH);
    // 상단 제목
    ctx.font=t.titleFont+' '+Math.round(tsz*0.92)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left';ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=10;
    ctx.fillStyle=t.titleClr;
    var stLines=wrapTxt(ctx,titleText,W*0.86);
    stLines.slice(0,2).forEach(function(line,li){
      ctx.fillText(line,_tx(W*0.04,true),_ty(stBarH*0.42+li*tsz*1.1,true));
    });
    var stBodyY=H*0.72;
    var stBGr=ctx.createLinearGradient(0,stBodyY-H*0.06,0,H);
    stBGr.addColorStop(0,'rgba(0,0,0,0)');
    stBGr.addColorStop(0.35,'rgba(0,0,0,0.75)');
    stBGr.addColorStop(1,'rgba(0,0,0,0.92)');
    ctx.fillStyle=stBGr;ctx.fillRect(0,stBodyY-H*0.06,W,H*0.34);
    ctx.font=bsz+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr;ctx.shadowBlur=6;
    var stBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.88);
    stBLines.slice(0,3).forEach(function(line,li){
      ctx.fillText(line,_tx(W*0.05,false),_ty(stBodyY+li*bsz*1.5,false));
    });

  } else if(pos==='newsletter') {
    // ── 뉴스레터 스타일 (흰/다크 배경 위에 깔끔한 타이포그래피) ──
    var isLightNL=(tpl.bg[0]==='#fafafa'||tpl.bg[0]==='#ffffff'||tpl.bg[0]==='#fff8f0'||tpl.bg[0]==='#fdf2f8'||tpl.bg[0]==='#f8f7f4');
    var nlPadX=W*0.06;
    // 상단 카테고리 레이블
    var nlLblSz=Math.round(W*0.028);
    ctx.font='700 '+nlLblSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left';ctx.shadowBlur=0;ctx.shadowColor='transparent';
    ctx.fillStyle=tpl.acc;
    var _nlCatLbl=_lblTxt((tpl.cat||'NEWSLETTER').toUpperCase()); if(_nlCatLbl) ctx.fillText(_nlCatLbl,_tx(nlPadX,'label'),_ty(H*0.11,'label'));
    // 얇은 구분선
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(nlPadX,H*0.135,W*0.12,Math.max(2,W*0.004));
    // 메인 제목 (크게, 줄바꿈)
    var nlTsz=_userTsz||Math.round(W*(S.fmt==='long'?0.06:0.072)*(editOpts.titleSize||1.0));
    ctx.font=t.titleFont+' '+nlTsz+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.fillStyle=t.titleClr;
    ctx.shadowColor=isLightNL?'rgba(0,0,0,0.15)':'rgba(0,0,0,0.7)';
    ctx.shadowBlur=isLightNL?4:10;
    var nlTLines=wrapTxt(ctx,titleText,W*0.88);
    var nlTY=H*0.19;
    nlTLines.slice(0,3).forEach(function(line,li){
      ctx.fillText(line,_tx(nlPadX,true),_ty(nlTY+li*nlTsz*1.22,true));
    });
    var nlBsz=_userBsz||Math.round(W*(S.fmt==='long'?0.032:0.038)*(editOpts.bodySize||1.0));
    ctx.font=nlBsz+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr;
    ctx.shadowBlur=isLightNL?2:6;
    var nlBY=nlTY+Math.min(nlTLines.length,3)*nlTsz*1.22+nlBsz*1.0;
    var nlBLines=wrapTxt(ctx,bodyText,W*0.88);
    nlBLines.slice(0,6).forEach(function(line,li){
      ctx.fillText(line,_tx(nlPadX,false),_ty(nlBY+li*nlBsz*1.75,false));
    });
    // 하단 구분선 + 날짜/출처 표시
    var nlFooterY=H*0.88;
    ctx.fillStyle=isLightNL?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.12)';
    ctx.fillRect(nlPadX,nlFooterY,W*(1-0.12),1);
    ctx.font='500 '+Math.round(W*0.026)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=isLightNL?'rgba(0,0,0,0.35)':'rgba(255,255,255,0.35)';
    ctx.shadowBlur=0;
    var _nlLbl=_lblTxt('BYGENCY'); if(_nlLbl) ctx.fillText(_nlLbl,_tx(nlPadX,'label'),_ty(H*0.935,'label'));

  } else if(pos==='subtitle-bar') {
    // ── 자막바 스타일 (릴스/쇼츠 하단 굵은 자막) ──
    // 제목: 하단 강조 자막바
    var sbTitleY=H*0.76;
    var sbTitleH=H*0.12;
    // 반투명 다크 바
    ctx.fillStyle='rgba(0,0,0,0.82)';
    ctx.fillRect(0,sbTitleY-sbTitleH*0.15,W,sbTitleH*1.3);
    // 좌우 액센트 라인
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,sbTitleY-sbTitleH*0.15,W,Math.max(3,H*0.004));
    // 제목 텍스트 (크고 굵게)
    var sbTsz=_userTsz||Math.round(W*(S.fmt==='long'?0.046:0.058))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(sbTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,1)';ctx.shadowBlur=12;
    ctx.fillStyle=t.titleClr;
    ctx.fillText(titleText.slice(0,30),_tx(W*0.5,true),_ty(sbTitleY+sbTitleH*0.42,true));
    var sbBodyY=H*0.89;
    var sbBodyH=H*0.095;
    ctx.fillStyle='rgba(0,0,0,0.70)';
    ctx.fillRect(0,sbBodyY-sbBodyH*0.2,W,sbBodyH*1.35);
    var sbBsz=_userBsz||Math.round(W*(S.fmt==='long'?0.030:0.036))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(sbBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr;ctx.shadowBlur=8;
    ctx.fillText((hasTitle?bodyText:titleText).slice(0,45),_tx(W*0.5,false),_ty(sbBodyY+sbBodyH*0.42,false));

  } else if(pos==='edu-card') {
    // ── 교육 프로모 카드 (Video 1 스타일) ──
    // 상단 다크 헤더바 (높이 약 9%)
    var ecHdrH=Math.round(H*0.09);
    ctx.fillStyle='#222428';
    ctx.fillRect(0,0,W,ecHdrH);
    // 헤더바 하단 액센트 라인
    ctx.fillStyle=tpl.acc||'#0ea5e9';
    ctx.fillRect(0,ecHdrH-Math.max(2,H*0.003),W,Math.max(2,H*0.003));
    // 헤더 내 제목 텍스트 (중앙 흰색 굵음)
    var ecTsz=Math.round(W*(S.fmt==='long'?0.042:0.052))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(ecTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center';
    ctx.shadowColor='rgba(0,0,0,0.8)';ctx.shadowBlur=6;
    ctx.fillStyle=t.titleClr;
    ctx.fillText(titleText.slice(0,32),_tx(W*0.5,true),_ty(ecHdrH*0.68,true));
    var ecBarY=Math.round(H*0.50);
    var ecBarH=Math.round(H*0.13);
    ctx.fillStyle='rgba(20,24,30,0.78)';
    ctx.fillRect(0,ecBarY,W,ecBarH);
    ctx.fillStyle=tpl.acc||'#0ea5e9';
    ctx.fillRect(0,ecBarY,W,Math.max(2,H*0.003));
    var ecBsz=Math.round(W*(S.fmt==='long'?0.032:0.038))*(editOpts.bodySize||1.0);
    ctx.font='600 '+Math.round(ecBsz)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center';ctx.shadowColor='rgba(0,0,0,0.95)';ctx.shadowBlur=8;
    ctx.fillStyle=t.bodyClr;
    var ecBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.88);
    ecBLines.slice(0,2).forEach(function(line,li){
      ctx.fillText(line,_tx(W*0.5,false),_ty(ecBarY+ecBarH*0.44+li*ecBsz*1.5,false));
    });
    // 하단 브랜드바 (둥근 어두운 스트립)
    var ecBrandY=Math.round(H*0.88);
    var ecBrandH=Math.round(H*0.07);
    ctx.fillStyle='rgba(20,24,30,0.90)';
    roundRect(ctx,W*0.12,ecBrandY,W*0.76,ecBrandH,ecBrandH*0.45);
    ctx.font='700 '+Math.round(W*0.022)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center';ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,0.55)';
    var _ecLbl=_lblTxt('BYGENCY'); if(_ecLbl) ctx.fillText(_ecLbl,_tx(W*0.5,'label'),_ty(ecBrandY+ecBrandH*0.68,'label'));

  } else if(pos==='news-article') {
    // ── 뉴스/아티클 카드 (Video 2 스타일) ──
    // 상단 마스트헤드 (진한 청록/네이비 그라디언트, 높이 약 18%)
    var naHdrH=Math.round(H*0.18);
    var naHdrGr=ctx.createLinearGradient(0,0,0,naHdrH);
    naHdrGr.addColorStop(0,'#0D1B24');
    naHdrGr.addColorStop(1,'#1A3A47');
    ctx.fillStyle=naHdrGr;
    ctx.fillRect(0,0,W,naHdrH);
    // 마스트헤드 내 채널명/브랜드 (작은 흰 텍스트, 좌정렬)
    ctx.font='700 '+Math.round(W*0.026)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left';ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=4;
    ctx.fillStyle='rgba(255,255,255,0.90)';
    var _naHdrLbl=_lblTxt('BYGENCY NEWS'); if(_naHdrLbl) ctx.fillText(_naHdrLbl,_tx(W*0.05,'label'),_ty(naHdrH*0.60,'label'));
    // 마스트헤드 하단 액센트 라인
    ctx.fillStyle='#38bdf8';
    ctx.fillRect(0,naHdrH,W,Math.max(2,H*0.003));
    // 제목: 크고 굵은 검은색, 좌정렬, 마스트헤드 아래 ~20-50% 영역
    var naTsz=Math.round(W*(S.fmt==='long'?0.050:0.060))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(naTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left';ctx.shadowColor='rgba(0,0,0,0.15)';ctx.shadowBlur=3;
    ctx.fillStyle=t.titleClr;
    var naTLines=wrapTxt(ctx,titleText,W*0.90);
    var naTY=naHdrH+Math.round(H*0.07);
    naTLines.slice(0,3).forEach(function(line,li){
      ctx.fillText(line,_tx(W*0.05,true),_ty(naTY+li*naTsz*1.28,true));
    });
    var naMetaY=naTY+Math.min(naTLines.length,3)*naTsz*1.28+Math.round(H*0.025);
    ctx.font='400 '+Math.round(W*0.024)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle='rgba(75,85,99,0.80)';ctx.shadowBlur=0;
    var _naLbl=_lblTxt('2026 · BYGENCY'); if(_naLbl) ctx.fillText(_naLbl,_tx(W*0.05,'label'),_ty(naMetaY,'label'));
    var naDivY=naMetaY+Math.round(H*0.022);
    ctx.fillStyle='rgba(0,0,0,0.12)';
    ctx.fillRect(W*0.05,naDivY,W*0.90,Math.max(1,H*0.002));
    var naBsz=Math.round(W*(S.fmt==='long'?0.028:0.033))*(editOpts.bodySize||1.0);
    ctx.font='400 '+Math.round(naBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr;ctx.shadowBlur=0;
    var naBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.90);
    var naBY=naDivY+Math.round(H*0.030);
    naBLines.slice(0,5).forEach(function(line,li){
      ctx.fillText(line,_tx(W*0.05,false),_ty(naBY+li*naBsz*1.65,false));
    });

  // ══════════════════════════════════════════════════════════════
  // 2026 트렌드 템플릿 pos 렌더링 (12개) — 고품질 씬 렌더링
  // ══════════════════════════════════════════════════════════════

  } else if(pos==='swiss-clean') {
    // ── 3. Swiss Clean: 스위스 타이포그래피 미니멀 ──
    var swPadX=W*0.07;
    var swW=W*0.86;
    var swIsLight=(tpl.bg[0].startsWith('#f')||tpl.bg[0].startsWith('#e'));
    var swTextClr=swIsLight?t.titleClr:'#0a0a0a';
    var swBodyClr=swIsLight?t.bodyClr:'#333333';

    // ── 좌측 두꺼운 액센트 컬러 세로바 ──
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,0,Math.max(6,W*0.018),H);

    // ── 카테고리 라벨 (소문자, 트래킹 넓게) ──
    var swLblSz=Math.round(W*0.024);
    ctx.font='700 '+swLblSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.shadowBlur=0; ctx.shadowColor='transparent';
    ctx.fillStyle=tpl.acc;
    var _swCatLbl=_lblTxt((tpl.cat||'MINIMAL').toUpperCase()); if(_swCatLbl) ctx.fillText(_swCatLbl,_tx(swPadX,'label'),_ty(H*0.10,'label'));

    // ── 가는 가로선 ──
    ctx.fillStyle=swIsLight?'rgba(0,0,0,0.12)':'rgba(0,0,0,0.08)';
    ctx.fillRect(swPadX,H*0.13,W*0.88,Math.max(1,H*0.002));

    // ── 메인 제목 (초대형 블랙 타이포) ──
    var swTsz=_userTsz||Math.round(W*(S.fmt==='long'?0.068:0.082))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(swTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.fillStyle=swTextClr;
    ctx.shadowColor=swIsLight?'rgba(0,0,0,0.08)':'rgba(0,0,0,0.12)';
    ctx.shadowBlur=swIsLight?2:3;
    var swTLines=wrapTxt(ctx,titleText,swW);
    var swTY=H*0.20;
    swTLines.slice(0,3).forEach(function(line,li){ ctx.fillText(line,_tx(swPadX,true),_ty(swTY+li*swTsz*1.18,true)); });

    // ── 두꺼운 가로선 구분 ──
    var swDivY=swTY+Math.min(swTLines.length,3)*swTsz*1.18+H*0.025;
    ctx.fillStyle=swIsLight?'rgba(0,0,0,0.85)':'rgba(0,0,0,0.7)';
    ctx.fillRect(swPadX,swDivY,W*0.88,Math.max(2,H*0.004));

    // ── 본문 (라이트 웨이트, 줄간격 넓게) ──
    var swBsz=_userBsz||Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font='400 '+Math.round(swBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=swBodyClr; ctx.shadowBlur=0;
    var swBody=hasTitle?bodyText:titleText;
    var swBLines=wrapTxt(ctx,swBody,swW);
    var swBY=swDivY+H*0.035;
    swBLines.slice(0,5).forEach(function(line,li){ ctx.fillText(line,_tx(swPadX,false),_ty(swBY+li*swBsz*1.85,false)); });

    // ── 하단 풀 컬러 바 + 브랜드 ──
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,H*0.91,W,H*0.09);
    ctx.fillStyle='#ffffff'; ctx.font='700 '+Math.round(W*0.022)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='right'; ctx.shadowBlur=0;
    var _swLbl=_lblTxt('BYGENCY'); if(_swLbl) ctx.fillText(_swLbl,_tx(W-swPadX,'label'),_ty(H*0.965,'label'));

  } else if(pos==='zine-cut') {
    // ── 5. Zine Cut: 진/콜라주 미학 — 2026 그래픽 트렌드 ──
    var znPadX=W*0.05;
    var znW=W*0.90;
    // 배경 텍스처 노이즈 (콜라주 느낌)
    ctx.save(); ctx.globalAlpha=0.04;
    for(var zni=0;zni<80;zni++){
      ctx.fillStyle=(zni%3===0)?tpl.acc:(zni%3===1)?'#000':'#fff';
      ctx.fillRect(Math.random()*W,Math.random()*H,Math.random()*3+1,Math.random()*3+1);
    }
    ctx.restore();
    // 상단 와이드 레드 컬러블록 (잘린 느낌)
    ctx.save();
    ctx.fillStyle=tpl.acc;
    ctx.beginPath();
    ctx.moveTo(0,H*0.04); ctx.lineTo(W*0.72,H*0.04);
    ctx.lineTo(W*0.78,H*0.20); ctx.lineTo(0,H*0.20);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // 상단 블록 내 흰 텍스트
    var znHSz=Math.round(W*(S.fmt==='long'?0.038:0.046));
    ctx.font='900 '+Math.round(znHSz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#ffffff'; ctx.shadowBlur=0;
    var _znCatLbl=_lblTxt((tpl.cat||'ZINE').toUpperCase()); if(_znCatLbl) ctx.fillText(_znCatLbl,_tx(znPadX,'label'),_ty(H*0.155,'label'));
    // 메인 제목 (초대형, 검정, 대문자)
    var znTsz=_userTsz||Math.round(W*(S.fmt==='long'?0.070:0.085))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(znTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.fillStyle=t.titleClr; ctx.shadowColor='rgba(0,0,0,0.1)'; ctx.shadowBlur=2;
    var znTLines=wrapTxt(ctx,titleText,znW);
    var znTY=H*0.30;
    znTLines.slice(0,2).forEach(function(line,li){ ctx.fillText(line,_tx(znPadX,true),_ty(znTY+li*znTsz*1.15,true)); });
    // 찢긴 듯한 구분선
    ctx.fillStyle=tpl.acc;
    var znDivY=znTY+Math.min(znTLines.length,2)*znTsz*1.15+H*0.02;
    ctx.fillRect(znPadX,znDivY,W*0.55,Math.max(4,H*0.008));
    ctx.fillRect(znPadX+W*0.58,znDivY+H*0.005,W*0.22,Math.max(2,H*0.004));
    // 본문 (읽기 쉬운 크기)
    var znBsz=_userBsz||Math.round(W*(S.fmt==='long'?0.030:0.036))*(editOpts.bodySize||1.0);
    ctx.font='500 '+Math.round(znBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=0;
    var znBody=hasTitle?bodyText:titleText;
    var znBLines=wrapTxt(ctx,znBody,znW);
    var znBY=znDivY+H*0.035;
    znBLines.slice(0,4).forEach(function(line,li){ctx.fillText(line,_tx(znPadX,false),_ty(znBY+li*znBsz*1.7,false));});
    // 우하단 레드 작은 블록 (진 미학 장식)
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(W*0.82,H*0.88,W*0.18,H*0.12);
    ctx.fillStyle='#ffffff'; ctx.font='700 '+Math.round(W*0.022)+'px sans-serif';
    ctx.textAlign='center'; ctx.shadowBlur=0;
    ctx.fillText('01',W*0.91,H*0.965);

  } else if(pos==='minimal-line') {
    // ── 14. Minimal Line: 극미니멀 라인 아트 레이아웃 ──
    // 얇은 수평선 2개 + 대형 제목 + 좌측 정렬 본문
    var mlPadX=W*0.1;
    var mlCenterY=H*0.44;
    // 상단 얇은 라인
    ctx.strokeStyle=tpl.acc; ctx.lineWidth=Math.max(1,W*0.002);
    ctx.globalAlpha=0.7;
    ctx.beginPath(); ctx.moveTo(mlPadX,mlCenterY-H*0.12); ctx.lineTo(W-mlPadX,mlCenterY-H*0.12); ctx.stroke();
    ctx.globalAlpha=1;
    // 카테고리 소문자 레이블
    var mlCatSz=Math.round(W*0.019);
    ctx.font='400 '+mlCatSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#71717a';
    ctx.shadowBlur=0;
    var _mlCatLbl=_lblTxt((tpl.cat||'DESIGN').toLowerCase()); if(_mlCatLbl) ctx.fillText(_mlCatLbl,_tx(mlPadX,'label'),_ty(mlCenterY-H*0.065,'label'));
    // 메인 대형 제목 (라이트 웨이트)
    var mlTsz=_userTsz||Math.round(W*(S&&S.fmt==='long'?0.060:0.072))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(mlTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle=t.titleClr;
    ctx.shadowColor='rgba(0,0,0,0.06)'; ctx.shadowBlur=2;
    var mlTLines=wrapTxt(ctx,titleText,W*0.78);
    mlTLines.slice(0,2).forEach(function(l,li){ctx.fillText(l,_tx(mlPadX,true),_ty(mlCenterY+li*mlTsz*1.18,true));});
    // 하단 액센트 라인 (굵음)
    var mlLineY=mlCenterY+Math.min(mlTLines.length,2)*mlTsz*1.18+H*0.018;
    ctx.fillStyle=tpl.acc; ctx.globalAlpha=1;
    ctx.fillRect(mlPadX,mlLineY,W*0.12,Math.max(3,H*0.005));
    // 본문 (가는 폰트)
    var mlBsz=_userBsz||Math.round(W*(S&&S.fmt==='long'?0.025:0.030))*(editOpts&&editOpts.bodySize||1.0);
    ctx.font='400 '+Math.round(mlBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=0;
    ctx.textAlign='left';
    var mlBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.78);
    mlBLines.slice(0,3).forEach(function(l,li){ctx.fillText(l,_tx(mlPadX,false),_ty(mlLineY+H*0.04+li*mlBsz*1.7,false));});

  } else if(pos==='magazine-cut') {
    // ── 17. Magazine Cut: 매거진 컷아웃 레이아웃 ──
    // 대형 세리프 제목(상단) + 컬러 액센트 블록 + 하단 본문 컬럼
    var mcPadX=W*0.07;
    var mcIsLight=(tpl.bg[0].startsWith('#f')||tpl.bg[0].startsWith('#e'));
    // 상단 레드 액센트 바
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(0,0,W,Math.max(4,H*0.007));
    // 이슈/번호 소텍스트
    var mcNumSz=Math.round(W*0.02);
    ctx.font='700 '+mcNumSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle=tpl.acc;
    ctx.shadowBlur=0;
    var _mcLbl=_lblTxt('VOL.01 · '+(tpl.cat||'EDITORIAL').toUpperCase()); if(_mcLbl) ctx.fillText(_mcLbl,_tx(mcPadX,'label'),_ty(H*0.09,'label'));
    // 수평 분리선
    ctx.fillStyle=mcIsLight?'rgba(0,0,0,0.12)':'rgba(255,255,255,0.12)';
    ctx.fillRect(mcPadX,H*0.11,W-mcPadX*2,Math.max(1,H*0.0015));
    // 메인 대형 제목 (세리프 감성)
    var mcTsz=_userTsz||Math.round(W*(S&&S.fmt==='long'?0.064:0.076))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(mcTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle=t.titleClr;
    ctx.shadowColor=mcIsLight?'rgba(0,0,0,0.08)':'rgba(0,0,0,0.5)'; ctx.shadowBlur=4;
    var mcTLines=wrapTxt(ctx,titleText,W*0.82);
    mcTLines.slice(0,2).forEach(function(l,li){ctx.fillText(l,_tx(mcPadX,true),_ty(H*0.22+li*mcTsz*1.2,true));});
    // 레드 키워드 하이라이트 블록
    var mcKwY=H*0.22+Math.min(mcTLines.length,2)*mcTsz*1.2+H*0.01;
    var mcKwSz=Math.round(W*0.025);
    if(sc.kw||tpl.cat){
      var mcKw=(sc.kw||(tpl.cat||'')).toUpperCase();
      ctx.font='900 '+mcKwSz+'px Noto Sans KR,sans-serif';
      var mcKwW=ctx.measureText(mcKw).width+W*0.04;
      ctx.fillStyle=tpl.acc;
      ctx.fillRect(mcPadX,mcKwY,mcKwW,mcKwSz*1.6);
      ctx.fillStyle='#fff'; ctx.shadowBlur=0;
      ctx.fillText(mcKw,mcPadX+W*0.02,mcKwY+mcKwSz*1.15);
    }
    // 수평 분리선 (중간)
    var mcDivY=mcKwY+mcKwSz*2.0;
    ctx.fillStyle=tpl.acc; ctx.globalAlpha=0.4;
    ctx.fillRect(mcPadX,mcDivY,W*0.25,Math.max(2,H*0.004));
    ctx.globalAlpha=1;
    // 본문 2컬럼 느낌 (1컬럼으로 단순화)
    var mcBsz=_userBsz||Math.round(W*(S&&S.fmt==='long'?0.026:0.030))*(editOpts&&editOpts.bodySize||1.0);
    ctx.font='400 '+Math.round(mcBsz)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle=t.bodyClr; ctx.shadowBlur=0;
    var mcBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.82);
    mcBLines.slice(0,4).forEach(function(l,li){ctx.fillText(l,_tx(mcPadX,false),_ty(mcDivY+H*0.045+li*mcBsz*1.7,false));});

  } else if(pos==='tiktok-bold') {
    // ── TikTok Bold: 9:16 하단 자막 스타일 ──
    var tbPadX=W*0.06;
    // 하단 그라디언트 오버레이 (배경 고정)
    var tbGrO=ctx.createLinearGradient(0,H*0.48,0,H);
    tbGrO.addColorStop(0,'rgba(0,0,0,0)'); tbGrO.addColorStop(1,'rgba(0,0,0,0.92)');
    ctx.fillStyle=tbGrO; ctx.fillRect(0,H*0.48,W,H*0.52);
    // 메인 제목 (대형 흰 텍스트 + 노랑 강조)
    var tbTsz=Math.round(W*(S.fmt==='long'?0.052:0.064))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(tbTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=14;
    var tbTLines=wrapTxt(ctx,titleText,W*0.86);
    var tbTY=H*0.57;
    tbTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(tbPadX,true),_ty(tbTY+li*tbTsz*1.22,true),t.titleClr,'rgba(0,0,0,0.9)',Math.round(tbTsz),10); });
    // 본문 (작은 흰 텍스트)
    var tbBsz=Math.round(W*(S.fmt==='long'?0.030:0.036))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(tbBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowColor='rgba(0,0,0,0.88)'; ctx.shadowBlur=8;
    var tbBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.84);
    var tbBY=tbTY+Math.min(tbTLines.length,2)*tbTsz*1.22+tbBsz*0.6;
    tbBLines.slice(0,2).forEach(function(l,li){ ctx.fillText(l,_tx(tbPadX,false),_ty(tbBY+li*tbBsz*1.5,false)); });

  } else if(pos==='word-highlight') {
    // ── Word Highlight: 중앙 단어 하이라이트 ──
    var whPadX=W*0.06;
    // 중앙 오버레이
    ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.fillRect(0,H*0.22,W,H*0.60);
    // 제목 (중앙, 대형)
    var whTsz=Math.round(W*(S.fmt==='long'?0.054:0.066))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(whTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center'; ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=16;
    var whTLines=wrapTxt(ctx,titleText,W*0.84);
    var whTY=H*0.38;
    whTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(W/2,true),_ty(whTY+li*whTsz*1.22,true),t.titleClr,'rgba(0,0,0,0.9)',Math.round(whTsz),12); });
    // 본문
    var whBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(whBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=6;
    var whBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.82);
    var whBY=whTY+Math.min(whTLines.length,2)*whTsz*1.22+whBsz*0.8;
    whBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(W/2,false),_ty(whBY+li*whBsz*1.6,false)); });

  } else if(pos==='neon-noir') {
    // ── Neon Noir: 사이버펑크 네온 ──
    var nnPadX=W*0.10;
    // 좌측 네온 글로우 바 (배경 고정)
    var nnBarGr=ctx.createLinearGradient(0,H*0.1,0,H*0.8);
    nnBarGr.addColorStop(0,'rgba(168,85,247,0)'); nnBarGr.addColorStop(0.5,tpl.acc); nnBarGr.addColorStop(1,'rgba(168,85,247,0)');
    ctx.fillStyle=nnBarGr; ctx.fillRect(W*0.04,H*0.1,Math.max(2,W*0.012),H*0.7);
    // 제목 (네온 글로우)
    var nnTsz=Math.round(W*(S.fmt==='long'?0.054:0.066))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(nnTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.shadowColor='rgba(168,85,247,0.8)'; ctx.shadowBlur=18;
    var nnTLines=wrapTxt(ctx,titleText,W*0.80);
    var nnTY=H*0.28;
    nnTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(nnPadX,true),_ty(nnTY+li*nnTsz*1.22,true),t.titleClr,'rgba(168,85,247,0.6)',Math.round(nnTsz),10); });
    // 본문
    var nnBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(nnBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowColor='rgba(168,85,247,0.4)'; ctx.shadowBlur=8;
    var nnBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.80);
    var nnBY=nnTY+Math.min(nnTLines.length,2)*nnTsz*1.22+nnBsz*0.8;
    nnBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(nnPadX,false),_ty(nnBY+li*nnBsz*1.65,false)); });
    // 하단 사이버 패널 라인 (배경 고정)
    ctx.fillStyle=tpl.acc; ctx.fillRect(0,H*0.78,W,Math.max(1,H*0.012));

  } else if(pos==='aurora') {
    // ── Aurora: 오로라 그라디언트 ──
    // 제목 (중앙, 크게)
    var auTsz=Math.round(W*(S.fmt==='long'?0.054:0.066))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(auTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center'; ctx.shadowColor='rgba(139,92,246,0.7)'; ctx.shadowBlur=20;
    var auTLines=wrapTxt(ctx,titleText,W*0.78);
    var auTY=H*0.28;
    auTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(W/2,true),_ty(auTY+li*auTsz*1.22,true),t.titleClr,'rgba(139,92,246,0.5)',Math.round(auTsz),12); });
    // 본문
    var auBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(auBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=6;
    var auBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.78);
    var auBY=auTY+Math.min(auTLines.length,2)*auTsz*1.22+auBsz*0.8;
    auBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(W/2,false),_ty(auBY+li*auBsz*1.65,false)); });

  } else if(pos==='vhs-retro') {
    // ── VHS Retro: 레트로 VHS 스타일 ──
    var vhsPadX=W*0.08;
    // 제목 (크로마틱 어버레이션 효과)
    var vhsTsz=Math.round(W*(S.fmt==='long'?0.052:0.063))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(vhsTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.shadowColor='rgba(0,0,0,0.88)'; ctx.shadowBlur=10;
    var vhsTLines=wrapTxt(ctx,titleText,W*0.80);
    var vhsTY=H*0.30;
    // 크로마틱 효과: 마젠타/시안 오프셋 → 메인 흰 텍스트
    ctx.save();
    ctx.globalAlpha=0.5; ctx.fillStyle='rgba(255,0,255,1)';
    vhsTLines.slice(0,2).forEach(function(l,li){ ctx.fillText(l,_tx(vhsPadX+2,true),_ty(vhsTY+li*vhsTsz*1.25,true)); });
    ctx.fillStyle='rgba(0,255,255,1)';
    vhsTLines.slice(0,2).forEach(function(l,li){ ctx.fillText(l,_tx(vhsPadX-2,true),_ty(vhsTY+2+li*vhsTsz*1.25,true)); });
    ctx.restore();
    ctx.fillStyle=t.titleClr; ctx.shadowBlur=0;
    vhsTLines.slice(0,2).forEach(function(l,li){ ctx.fillText(l,_tx(vhsPadX,true),_ty(vhsTY+li*vhsTsz*1.25,true)); });
    // 본문
    var vhsBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(vhsBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowColor='rgba(0,255,255,0.5)'; ctx.shadowBlur=5;
    var vhsBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.80);
    var vhsBY=vhsTY+Math.min(vhsTLines.length,2)*vhsTsz*1.25+vhsBsz*0.8;
    vhsBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(vhsPadX,false),_ty(vhsBY+li*vhsBsz*1.65,false)); });

  } else if(pos==='cinematic-dark') {
    // ── Cinematic Dark: 시네마 레터박스 골드 ──
    // 레터박스 (배경 고정)
    ctx.fillStyle='#000'; ctx.fillRect(0,0,W,H*0.14); ctx.fillRect(0,H*0.86,W,H*0.14);
    // 골드 씬 라인 (배경 고정)
    ctx.fillStyle='rgba(200,169,110,0.4)'; ctx.fillRect(W*0.04,H*0.33,W*0.92,Math.max(1,H*0.001));
    // 제목 (중앙, 골드)
    var cdTsz=Math.round(W*(S.fmt==='long'?0.052:0.062))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(cdTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center'; ctx.shadowColor='rgba(0,0,0,0.95)'; ctx.shadowBlur=16;
    var cdTLines=wrapTxt(ctx,titleText,W*0.78);
    var cdTY=H*0.32;
    cdTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(W/2,true),_ty(cdTY+li*cdTsz*1.22,true),t.titleClr,'rgba(0,0,0,0.9)',Math.round(cdTsz),12); });
    // 본문
    var cdBsz=Math.round(W*(S.fmt==='long'?0.026:0.032))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(cdBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=6;
    var cdBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.76);
    var cdBY=cdTY+Math.min(cdTLines.length,2)*cdTsz*1.22+cdBsz*0.8;
    cdBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(W/2,false),_ty(cdBY+li*cdBsz*1.6,false)); });

  } else if(pos==='gradient-wave') {
    // ── Gradient Wave: 웨이브 그라디언트 ──
    var gwPadX=W*0.07;
    // 제목 (중앙 하단, 크게)
    var gwTsz=Math.round(W*(S.fmt==='long'?0.054:0.066))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(gwTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='center'; ctx.shadowColor='rgba(0,0,0,0.88)'; ctx.shadowBlur=16;
    var gwTLines=wrapTxt(ctx,titleText,W*0.84);
    var gwTY=H*0.50;
    gwTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(W/2,true),_ty(gwTY+li*gwTsz*1.22,true),t.titleClr,'rgba(0,0,0,0.8)',Math.round(gwTsz),10); });
    // 본문
    var gwBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(gwBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=6;
    var gwBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.82);
    var gwBY=gwTY+Math.min(gwTLines.length,2)*gwTsz*1.22+gwBsz*0.6;
    gwBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(W/2,false),_ty(gwBY+li*gwBsz*1.6,false)); });

  } else if(pos==='neon-tokyo') {
    // ── Neon Tokyo: 도쿄 네온 스타일 ──
    var ntPadX=W*0.07;
    // 상단 네온 라인 장식 (배경 고정)
    var ntLineGr=ctx.createLinearGradient(0,0,W,0);
    ntLineGr.addColorStop(0,'transparent'); ntLineGr.addColorStop(0.5,tpl.acc); ntLineGr.addColorStop(1,'transparent');
    ctx.fillStyle=ntLineGr; ctx.fillRect(0,H*0.08,W,Math.max(2,H*0.004));
    // 제목 (좌정렬, 강한 글로우)
    var ntTsz=Math.round(W*(S.fmt==='long'?0.054:0.066))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(ntTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.shadowColor=tpl.acc||'rgba(255,0,128,0.9)'; ctx.shadowBlur=20;
    var ntTLines=wrapTxt(ctx,titleText,W*0.84);
    var ntTY=H*0.38;
    ntTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(ntPadX,true),_ty(ntTY+li*ntTsz*1.22,true),t.titleClr,tpl.acc||'rgba(255,0,128,0.5)',Math.round(ntTsz),12); });
    // 본문
    var ntBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(ntBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowColor=tpl.acc||'rgba(255,0,128,0.4)'; ctx.shadowBlur=8;
    var ntBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.84);
    var ntBY=ntTY+Math.min(ntTLines.length,2)*ntTsz*1.22+ntBsz*0.8;
    ntBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(ntPadX,false),_ty(ntBY+li*ntBsz*1.65,false)); });
    // 하단 네온 라인 (배경 고정)
    ctx.fillStyle=ntLineGr; ctx.fillRect(0,H*0.92,W,Math.max(2,H*0.003));

  } else if(pos==='retro-sunset') {
    // ── Retro Sunset: 레트로 선셋 ──
    var rsPadX=W*0.07;
    // 수평선 그라디언트 오버레이 (배경 고정)
    var rsHorGr=ctx.createLinearGradient(0,H*0.55,0,H);
    rsHorGr.addColorStop(0,'rgba(0,0,0,0)'); rsHorGr.addColorStop(1,'rgba(0,0,0,0.75)');
    ctx.fillStyle=rsHorGr; ctx.fillRect(0,H*0.55,W,H*0.45);
    // 제목 (좌정렬, 큰 레트로 타이포)
    var rsTsz=Math.round(W*(S.fmt==='long'?0.054:0.065))*(editOpts.titleSize||1.0);
    ctx.font=t.titleFont+' '+Math.round(rsTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.shadowColor='rgba(0,0,0,0.92)'; ctx.shadowBlur=14;
    var rsTLines=wrapTxt(ctx,titleText,W*0.84);
    var rsTY=H*0.28;
    rsTLines.slice(0,2).forEach(function(l,li){ drawHQText(l,_tx(rsPadX,true),_ty(rsTY+li*rsTsz*1.22,true),t.titleClr,'rgba(0,0,0,0.85)',Math.round(rsTsz),10); });
    // 액센트 라인 (배경 고정)
    ctx.fillStyle=tpl.acc;
    ctx.fillRect(rsPadX,rsTY+Math.min(rsTLines.length,2)*rsTsz*1.22+H*0.01,W*0.20,Math.max(3,H*0.005));
    // 본문
    var rsBsz=Math.round(W*(S.fmt==='long'?0.028:0.034))*(editOpts.bodySize||1.0);
    ctx.font=Math.round(rsBsz)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle=t.bodyClr; ctx.shadowBlur=6;
    var rsBLines=wrapTxt(ctx,hasTitle?bodyText:titleText,W*0.84);
    var rsBY=rsTY+Math.min(rsTLines.length,2)*rsTsz*1.22+rsBsz*0.8+H*0.04;
    rsBLines.slice(0,3).forEach(function(l,li){ ctx.fillText(l,_tx(rsPadX,false),_ty(rsBY+li*rsBsz*1.65,false)); });

  } else if(pos==='sp-app-ad') {
    // ══════════════════════════════════════════════════════════
    // ── 앱광고형 (t1): 유튜브/틱톡 Shorts 스타일
    // 흰배경 | 보라 헤더바 | 제목+메타 | [이미지 중앙, 크게] | 액션버튼(이미지 우측)
    // ══════════════════════════════════════════════════════════
    ctx.restore(); ctx.save(); ctx.globalAlpha=1;
    var _spBrand=editOpts.brandName||'학원이름';
    var saW=W, saPad=W*0.04;

    // 1. 전체 흰 배경
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,saW,H);

    // 2. 보라 헤더바
    var saHH=H*0.072;
    ctx.fillStyle='#4a2d7a'; ctx.fillRect(0,0,saW,saHH);
    // 햄버거 아이콘 SVG-style (3줄)
    var saHamX=saPad, saHamY=saHH*0.28, saHamW=saW*0.048, saHamH=Math.max(2,saHH*0.08), saHamGap=saHH*0.18;
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.fillRect(saHamX, saHamY, saHamW, saHamH);
    ctx.fillRect(saHamX, saHamY+saHamGap, saHamW, saHamH);
    ctx.fillRect(saHamX, saHamY+saHamGap*2, saHamW, saHamH);
    // 채널명 (브랜드이름)
    ctx.font='700 '+Math.round(saW*0.036)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center'; ctx.fillStyle='#ffffff'; ctx.shadowBlur=0;
    ctx.fillText(_spBrand, saW*0.5, saHH*0.68);
    // 검색 아이콘 (원+막대)
    var saSearchX=saW-saPad-saW*0.07, saSearchY=saHH*0.38, saSearchR=saW*0.022;
    ctx.beginPath(); ctx.arc(saSearchX, saSearchY, saSearchR, 0, Math.PI*2);
    ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=Math.max(1.5,saW*0.005); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(saSearchX+saSearchR*0.7, saSearchY+saSearchR*0.7);
    ctx.lineTo(saSearchX+saSearchR*0.7+saSearchR*0.6, saSearchY+saSearchR*0.7+saSearchR*0.6);
    ctx.stroke(); ctx.lineWidth=1;
    // 더보기 점 3개
    var saDotX=saW-saPad*0.7, saDotY=saHH*0.5, saDotR=Math.max(1.5,saW*0.008);
    ctx.fillStyle='rgba(255,255,255,0.85)';
    [-1,0,1].forEach(function(d){ ctx.beginPath(); ctx.arc(saDotX,saDotY+d*saDotR*2.6,saDotR,0,Math.PI*2); ctx.fill(); });

    // 3. 포스트 헤더 (흰 배경)
    var saPostY=saHH+H*0.012;
    var saTsz=_userTsz||Math.round(saW*(S&&S.fmt==='long'?0.036:0.044))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font='900 '+saTsz+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#111111';
    ctx.shadowColor='rgba(0,0,0,0.04)'; ctx.shadowBlur=1;
    var _saTSrc=sc.title||sc.text||'';
    var saTLines=wrapTxt(ctx,_editingTitle?_saTSrc:titleText,saW*0.88);
    if(!_editingTitle){
      saTLines.slice(0,2).forEach(function(l,li){
        ctx.fillText(l,saPad+_tOx,saPostY+_tOy+li*saTsz*1.18+saTsz*0.85);
      });
    }
    var saTEndY=saPostY+Math.max(Math.min(saTLines.length,2),1)*saTsz*1.18+saTsz*0.05;
    // 포스트 메타 (조회수 | 학원이름)
    var saMetaY=saTEndY+H*0.006;
    ctx.font='400 '+Math.round(saW*0.022)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='rgba(0,0,0,0.42)'; ctx.shadowBlur=0;
    var _saViews=editOpts.viewCount||'2,823,810';
    ctx.fillText('조회수 '+_saViews+'  |  '+_spBrand, saPad, saMetaY);
    // 구분선
    ctx.fillStyle='rgba(0,0,0,0.07)';
    ctx.fillRect(0, saMetaY+H*0.016, saW, Math.max(1,H*0.002));

    // 4. 이미지 박스 — 남은 공간 전체 중앙에 크게
    var saImgMgn=saW*0.04;
    var saImgX=saImgMgn;
    var saImgW=saW-saImgMgn*2;
    // 헤더+제목+메타 아래 ~ 화면 하단(H*0.015 여백) 사이 공간을 전부 이미지에 할당
    var saImgAreaTop=saMetaY+H*0.018;
    var saImgAreaBot=H-H*0.015;
    var saImgH=saImgAreaBot-saImgAreaTop;
    if(saImgH<saImgW*(9/16)) saImgH=saImgW*(9/16); // 최소 16:9 보장
    // 이미지를 남은 공간 수직 중앙에 배치
    var saImgY=saImgAreaTop+(saImgAreaBot-saImgAreaTop-saImgH)/2;
    if(saImgY<saImgAreaTop) saImgY=saImgAreaTop;
    // 이미지 박스 (rounded 12px)
    var saR=Math.round(saW*0.031);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(saImgX+saR,saImgY);
    ctx.lineTo(saImgX+saImgW-saR,saImgY);
    ctx.arcTo(saImgX+saImgW,saImgY,saImgX+saImgW,saImgY+saR,saR);
    ctx.lineTo(saImgX+saImgW,saImgY+saImgH-saR);
    ctx.arcTo(saImgX+saImgW,saImgY+saImgH,saImgX+saImgW-saR,saImgY+saImgH,saR);
    ctx.lineTo(saImgX+saR,saImgY+saImgH);
    ctx.arcTo(saImgX,saImgY+saImgH,saImgX,saImgY+saImgH-saR,saR);
    ctx.lineTo(saImgX,saImgY+saR);
    ctx.arcTo(saImgX,saImgY,saImgX+saR,saImgY,saR);
    ctx.closePath(); ctx.clip();
    var _saVid=(img&&img.tagName==='VIDEO'); var _saIW=_saVid?img.videoWidth:(img&&img.naturalWidth||0); var _saIH=_saVid?img.videoHeight:(img&&img.naturalHeight||0);
    if(img&&(_saIW>0)&&(_saVid?img.readyState>=2:img.complete)){
      var saISc=Math.max(saImgW/Math.max(_saIW,1),saImgH/Math.max(_saIH,1));
      ctx.drawImage(img,saImgX+(saImgW-_saIW*saISc)/2,saImgY+(saImgH-_saIH*saISc)/2,_saIW*saISc,_saIH*saISc);
    } else {
      var saIGr=ctx.createLinearGradient(0,saImgY,0,saImgY+saImgH);
      saIGr.addColorStop(0,'#dde7f2'); saIGr.addColorStop(1,'#c0d0e0');
      ctx.fillStyle=saIGr; ctx.fillRect(saImgX,saImgY,saImgW,saImgH);
      // 카메라 아이콘 SVG-style
      var saIcoX=saImgX+saImgW/2, saIcoY=saImgY+saImgH*0.5;
      ctx.fillStyle='rgba(255,255,255,0.55)';
      roundRect(ctx,saIcoX-saW*0.065,saIcoY-saW*0.045,saW*0.13,saW*0.09,saW*0.012);
      ctx.beginPath(); ctx.arc(saIcoX,saIcoY,saW*0.025,0,Math.PI*2); ctx.fillStyle='rgba(150,170,195,0.8)'; ctx.fill();
    }
    ctx.restore();
    // 우측 액션버튼 SVG-style — 이미지 위 오버레이
    var saBtnSz=Math.round(saW*0.068);
    var saBtnTxtSz=Math.round(saW*0.020);
    var saBtnGap=saBtnSz*1.55;
    var saBtnX=saImgX+saImgW-saW*0.048;
    var saBtnBotY=saImgY+saImgH-saW*0.03;
    // 버튼 데이터: [label, color, shape]
    var saActData=[
      {lbl:'공유',clr:'rgba(255,255,255,0.92)',shape:'arrow'},
      {lbl:'0',clr:'rgba(255,255,255,0.92)',shape:'comment'},
      {lbl:'싫어요',clr:'rgba(255,255,255,0.92)',shape:'thumb_down'},
      {lbl:'596',clr:'rgba(255,255,255,0.92)',shape:'thumb_up'}
    ];
    saActData.forEach(function(d,di){
      var bY=saBtnBotY-di*saBtnGap;
      // 반투명 원형 배경
      ctx.save();
      ctx.globalAlpha=0.22;
      ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(saBtnX,bY-saBtnSz*0.25,saBtnSz*0.6,0,Math.PI*2); ctx.fill();
      ctx.restore();
      // SVG-style 아이콘 (Canvas 드로잉)
      ctx.fillStyle=d.clr; ctx.strokeStyle=d.clr;
      ctx.lineWidth=Math.max(1.5,saW*0.005);
      ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=3;
      var ix=saBtnX, iy=bY-saBtnSz*0.4, is=saBtnSz*0.38;
      if(d.shape==='thumb_up'){
        // 엄지척 ↑
        ctx.beginPath();
        ctx.moveTo(ix-is*0.5,iy+is*0.2); ctx.lineTo(ix-is*0.5,iy+is);
        ctx.lineTo(ix+is*0.5,iy+is); ctx.lineTo(ix+is*0.5,iy+is*0.2);
        ctx.lineTo(ix+is*0.1,iy+is*0.2); ctx.lineTo(ix+is*0.1,iy-is*0.8);
        ctx.lineTo(ix-is*0.2,iy-is*0.8); ctx.lineTo(ix-is*0.5,iy+is*0.2);
        ctx.fill();
      } else if(d.shape==='thumb_down'){
        // 엄지 ↓
        ctx.beginPath();
        ctx.moveTo(ix-is*0.5,iy-is*0.2); ctx.lineTo(ix-is*0.5,iy-is);
        ctx.lineTo(ix+is*0.5,iy-is); ctx.lineTo(ix+is*0.5,iy-is*0.2);
        ctx.lineTo(ix+is*0.1,iy-is*0.2); ctx.lineTo(ix+is*0.1,iy+is*0.8);
        ctx.lineTo(ix-is*0.2,iy+is*0.8); ctx.lineTo(ix-is*0.5,iy-is*0.2);
        ctx.fill();
      } else if(d.shape==='comment'){
        // 말풍선
        ctx.beginPath();
        ctx.moveTo(ix-is*0.7+is*0.18,iy-is*0.7); ctx.lineTo(ix+is*0.7-is*0.18,iy-is*0.7); ctx.arcTo(ix+is*0.7,iy-is*0.7,ix+is*0.7,iy-is*0.7+is*0.18,is*0.18); ctx.lineTo(ix+is*0.7,iy+is*0.4-is*0.18); ctx.arcTo(ix+is*0.7,iy+is*0.4,ix+is*0.7-is*0.18,iy+is*0.4,is*0.18); ctx.lineTo(ix-is*0.7+is*0.18,iy+is*0.4); ctx.arcTo(ix-is*0.7,iy+is*0.4,ix-is*0.7,iy+is*0.4-is*0.18,is*0.18); ctx.lineTo(ix-is*0.7,iy-is*0.7+is*0.18); ctx.arcTo(ix-is*0.7,iy-is*0.7,ix-is*0.7+is*0.18,iy-is*0.7,is*0.18);
        ctx.fill();
        ctx.fillRect(ix-is*0.2,iy+is*0.42,is*0.35,is*0.35);
      } else if(d.shape==='arrow'){
        // 공유 화살표
        ctx.beginPath();
        ctx.moveTo(ix,iy-is*0.6); ctx.lineTo(ix+is*0.55,iy); ctx.lineTo(ix,iy+is*0.6);
        ctx.moveTo(ix+is*0.55,iy); ctx.lineTo(ix-is*0.55,iy);
        ctx.stroke();
      }
      ctx.shadowBlur=0; ctx.lineWidth=1;
      // 레이블
      ctx.font='700 '+saBtnTxtSz+'px Noto Sans KR,sans-serif';
      ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=2;
      ctx.fillText(d.lbl,saBtnX,bY+saBtnTxtSz*0.3);
      ctx.shadowBlur=0;
    });

  } else if(pos==='sp-insta-ad') {
    // sp-* 고정 렌더
    ctx.restore(); ctx.save(); ctx.globalAlpha=1;
    // ── 인스타광고형: 격자배경 | 상단 학원명 | 이미지(크게 중앙) | 훅카피 | 액션바 ──
    var _spBrand2=editOpts.brandName||'학원이름';
    var sbW=W, sbPad=W*0.05;

    // 1. 격자 배경 (#f5f5f0)
    ctx.fillStyle='#f5f5f0'; ctx.fillRect(0,0,sbW,H);
    // 격자 선 그리기
    ctx.save(); ctx.globalAlpha=0.18; ctx.strokeStyle='#b4b4b4'; ctx.lineWidth=0.6;
    var sbGrid=H*0.040;
    for(var sbgi=0;sbgi*sbGrid<sbW;sbgi++){
      ctx.beginPath();ctx.moveTo(sbgi*sbGrid,0);ctx.lineTo(sbgi*sbGrid,H);ctx.stroke();
    }
    for(var sbgj=0;sbgj*sbGrid<H;sbgj++){
      ctx.beginPath();ctx.moveTo(0,sbgj*sbGrid);ctx.lineTo(sbW,sbgj*sbGrid);ctx.stroke();
    }
    ctx.restore();

    // 2. 상단 학원명 + 인스타그램 스타일 헤더
    var sbTopH=H*0.065;
    // 프로필 원
    var sbPfR=sbTopH*0.38;
    ctx.save();
    var sbPfGr=ctx.createRadialGradient(sbPad+sbPfR,sbTopH*0.5,0,sbPad+sbPfR,sbTopH*0.5,sbPfR);
    sbPfGr.addColorStop(0,'#f8a04b'); sbPfGr.addColorStop(0.5,'#e0406b'); sbPfGr.addColorStop(1,'#833ab4');
    ctx.fillStyle=sbPfGr;
    ctx.beginPath(); ctx.arc(sbPad+sbPfR,sbTopH*0.5,sbPfR,0,Math.PI*2); ctx.fill();
    // 흰 글자 이니셜
    ctx.fillStyle='#fff'; ctx.font='700 '+Math.round(sbPfR*1.1)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center';
    var sbInitial=(_spBrand2.length>0)?_spBrand2[0]:'A';
    ctx.fillText(sbInitial,sbPad+sbPfR,sbTopH*0.5+sbPfR*0.38);
    ctx.restore();
    // 학원명
    ctx.font='700 '+Math.round(sbW*0.033)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#111'; ctx.shadowBlur=0;
    ctx.fillText(_spBrand2,sbPad+sbPfR*2+sbW*0.02,sbTopH*0.45);
    ctx.font='400 '+Math.round(sbW*0.024)+'px Noto Sans KR,sans-serif';
    ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillText('광고', sbPad+sbPfR*2+sbW*0.02, sbTopH*0.80);
    // 더보기 점 3개 (우측)
    var sbDotX=sbW-sbPad, sbDotY=sbTopH*0.5, sbDotR2=Math.max(1.5,sbW*0.007);
    ctx.fillStyle='rgba(0,0,0,0.5)';
    [-1,0,1].forEach(function(d){ ctx.beginPath(); ctx.arc(sbDotX+d*sbDotR2*2.6,sbDotY,sbDotR2,0,Math.PI*2); ctx.fill(); });

    // 3. 이미지 — 화면 중앙에 크게 (거의 정사각형, 좌우 작은 마진)
    var sbImgMgn=sbW*0.025;
    var sbImgX=sbImgMgn;
    var sbImgY=sbTopH+H*0.008;
    var sbImgW=sbW-sbImgMgn*2;
    var sbImgH=sbImgW; // 정사각형 (인스타 스타일)
    // 남은 공간 고려
    var sbHookSz=Math.round(sbW*(S&&S.fmt==='long'?0.038:0.046));
    var sbActSzH=Math.round(sbW*0.046);
    var sbNeeded=sbTopH+H*0.008+sbImgH+H*0.01+sbHookSz*2.6+H*0.01+sbActSzH*1.2;
    if(sbNeeded>H){ sbImgH=H-sbTopH-H*0.01-sbHookSz*2.6-H*0.012-sbActSzH*1.2-H*0.01; sbImgH=Math.max(sbImgH,H*0.35); }
    ctx.save();
    ctx.beginPath();
    ctx.rect(sbImgX,sbImgY,sbImgW,sbImgH); ctx.clip();
    var _sbVid=(img&&img.tagName==='VIDEO'); var _sbIW=_sbVid?img.videoWidth:(img&&img.naturalWidth||0); var _sbIH=_sbVid?img.videoHeight:(img&&img.naturalHeight||0);
    if(img&&(_sbIW>0)&&(_sbVid?img.readyState>=2:img.complete)){
      var sbISc=Math.max(sbImgW/Math.max(_sbIW,1),sbImgH/Math.max(_sbIH,1));
      ctx.drawImage(img,sbImgX+(sbImgW-_sbIW*sbISc)/2,sbImgY+(sbImgH-_sbIH*sbISc)/2,_sbIW*sbISc,_sbIH*sbISc);
    } else {
      var sbIGr=ctx.createLinearGradient(0,sbImgY,0,sbImgY+sbImgH);
      sbIGr.addColorStop(0,'#c8d8ea'); sbIGr.addColorStop(1,'#a0b8cc');
      ctx.fillStyle=sbIGr; ctx.fillRect(sbImgX,sbImgY,sbImgW,sbImgH);
      // 이미지 아이콘 SVG-style
      var sbIcoX=sbImgX+sbImgW/2, sbIcoY=sbImgY+sbImgH*0.5;
      ctx.fillStyle='rgba(255,255,255,0.5)';
      roundRect(ctx,sbIcoX-sbW*0.075,sbIcoY-sbW*0.05,sbW*0.15,sbW*0.10,sbW*0.014);
      ctx.fillStyle='rgba(180,200,220,0.9)';
      ctx.beginPath(); ctx.arc(sbIcoX,sbIcoY,sbW*0.028,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();

    // 4. 훅 카피 텍스트 (이미지 아래, 중앙 정렬)
    var sbHookY2=sbImgY+sbImgH+H*0.010;
    var sbHSz=_userTsz||Math.round(sbW*(S&&S.fmt==='long'?0.038:0.046))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font='900 '+sbHSz+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#111111';
    ctx.shadowColor='rgba(0,0,0,0.04)'; ctx.shadowBlur=1;
    var _sbTSrc=sc.title||sc.text||'';
    var sbTLines=wrapTxt(ctx,_editingTitle?_sbTSrc:titleText,sbW*0.88);
    if(!_editingTitle){
      sbTLines.slice(0,2).forEach(function(l,li){
        ctx.fillStyle=li===1?'#e0406b':'#111111';
        ctx.fillText(l,sbPad+_tOx,sbHookY2+_tOy+li*sbHSz*1.20+sbHSz*0.85);
      });
    }
    var sbHookEndY=sbHookY2+Math.max(Math.min(sbTLines.length,2),1)*sbHSz*1.20+sbHSz*0.05;
    ctx.shadowBlur=0;

    // 5. 인스타 액션 바 (이미지 아래) — SVG-style 아이콘
    var sbActY=sbHookEndY+H*0.010;
    var sbActSz=Math.round(sbW*0.046);
    var sbAIcoColor='rgba(0,0,0,0.75)';
    ctx.lineWidth=Math.max(1.5,sbW*0.005); ctx.strokeStyle=sbAIcoColor; ctx.fillStyle=sbAIcoColor;
    // 하트 ♡
    var hx=sbPad+sbActSz*0.5, hy=sbActY+sbActSz*0.4, hr=sbActSz*0.34;
    ctx.save(); ctx.scale(1,1);
    ctx.beginPath();
    ctx.moveTo(hx,hy+hr*0.9);
    ctx.bezierCurveTo(hx,hy+hr*0.4,hx-hr*1.2,hy-hr*0.6,hx-hr*0.8,hy-hr*1.0);
    ctx.bezierCurveTo(hx-hr*0.4,hy-hr*1.4,hx,hy-hr*0.7,hx,hy-hr*0.4);
    ctx.bezierCurveTo(hx,hy-hr*0.7,hx+hr*0.4,hy-hr*1.4,hx+hr*0.8,hy-hr*1.0);
    ctx.bezierCurveTo(hx+hr*1.2,hy-hr*0.6,hx,hy+hr*0.4,hx,hy+hr*0.9);
    ctx.strokeStyle=sbAIcoColor; ctx.lineWidth=Math.max(1.5,sbW*0.005); ctx.stroke();
    ctx.restore();
    // 댓글 말풍선
    var cx2=sbPad+sbActSz*2.2, cy2=sbActY+sbActSz*0.4, cr2=sbActSz*0.36;
    roundRectStroke(ctx,cx2-cr2,cy2-cr2,cr2*2,cr2*1.5,cr2*0.2);
    ctx.beginPath(); ctx.moveTo(cx2-cr2*0.3,cy2+cr2*0.52); ctx.lineTo(cx2-cr2*0.7,cy2+cr2*1.0); ctx.lineTo(cx2+cr2*0.1,cy2+cr2*0.52); ctx.stroke();
    // 공유 화살표
    var ax2=sbPad+sbActSz*3.9, ay2=sbActY+sbActSz*0.4, ar2=sbActSz*0.36;
    ctx.beginPath(); ctx.moveTo(ax2,ay2-ar2*0.7); ctx.lineTo(ax2+ar2*0.7,ay2); ctx.lineTo(ax2,ay2+ar2*0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax2+ar2*0.7,ay2); ctx.lineTo(ax2-ar2*0.7,ay2); ctx.stroke();
    // 북마크 (우측)
    var bkX=sbW-sbPad-sbActSz*0.5, bkY=sbActY+sbActSz*0.05, bkW=sbActSz*0.5, bkH=sbActSz*0.7;
    ctx.beginPath();
    ctx.moveTo(bkX-bkW/2,bkY); ctx.lineTo(bkX+bkW/2,bkY); ctx.lineTo(bkX+bkW/2,bkY+bkH);
    ctx.lineTo(bkX,bkY+bkH*0.72); ctx.lineTo(bkX-bkW/2,bkY+bkH); ctx.closePath(); ctx.stroke();
    ctx.lineWidth=1;

  } else if(pos==='sp-banner') {
    // sp-* 고정 렌더
    ctx.restore(); ctx.save(); ctx.globalAlpha=1;
    // ── 배너강조형: 파란배너(최상단) | 제목+서브 | [이미지 크게 중앙] | 액션버튼(이미지 우측)
    var _spBrand3=editOpts.brandName||'학원이름';
    var scW=W, scPad=W*0.04;

    // 1. 전체 흰 배경
    ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,scW,H);

    // 2. 파란 배너 — 최상단 (검정 상태바/헤더 없음)
    var scBanY=0;
    var scBanH=H*0.075;
    ctx.fillStyle='#3a76d8'; ctx.fillRect(0,scBanY,scW,scBanH);
    // 뒤로가기 < 아이콘 SVG
    ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=Math.max(1.5,scW*0.006);
    ctx.beginPath();
    ctx.moveTo(scPad+scW*0.018,scBanH*0.35); ctx.lineTo(scPad,scBanH*0.5); ctx.lineTo(scPad+scW*0.018,scBanH*0.65);
    ctx.stroke(); ctx.lineWidth=1;
    // 학원명 중앙
    ctx.font='700 '+Math.round(scW*0.032)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center'; ctx.fillStyle='#ffffff';
    ctx.shadowColor='rgba(0,0,30,0.25)'; ctx.shadowBlur=2;
    ctx.fillText(_spBrand3,scW*0.5,scBanY+scBanH*0.66);
    ctx.shadowBlur=0;
    // 공유 아이콘 SVG (우측)
    var scShX=scW-scPad-scW*0.02, scShY=scBanH*0.5, scShR=scW*0.022;
    ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=Math.max(1.5,scW*0.005);
    ctx.beginPath(); ctx.arc(scShX,scShY,scShR,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(scShX+scShR*0.7,scShY+scShR*0.7); ctx.lineTo(scShX+scShR*1.4,scShY+scShR*1.4); ctx.stroke();
    ctx.lineWidth=1;

    // 3. 제목 텍스트 (흰 배경)
    var scTitleBaseY=scBanH+H*0.010;
    var scTitleY=scTitleBaseY+_tOy;
    var scTsz=_userTsz||Math.round(scW*(S&&S.fmt==='long'?0.044:0.054))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font='900 '+scTsz+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#111111';
    ctx.shadowColor='rgba(0,0,0,0.04)'; ctx.shadowBlur=1;
    var _scTSrc=sc.title||sc.text||'';
    var scTLines=wrapTxt(ctx,_editingTitle?_scTSrc:titleText,scW*0.88);
    if(!_editingTitle){
      scTLines.slice(0,2).forEach(function(l,li){
        ctx.fillText(l,scPad+_tOx,scTitleY+li*scTsz*1.18+scTsz*0.85);
      });
    }
    var scTCount=Math.max(Math.min(scTLines.length,2),1);
    var scTitleEndY=scTitleBaseY+scTCount*scTsz*1.18+scTsz*0.05;
    ctx.shadowBlur=0;

    // 4. 서브 텍스트
    var scSubBaseY=scTitleEndY+H*0.006;
    var scSubY=scSubBaseY+_bOy;
    var scBsz=_userBsz||Math.round(scW*(S&&S.fmt==='long'?0.024:0.030))*(editOpts&&editOpts.bodySize||1.0);
    ctx.font='400 '+scBsz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='rgba(0,0,0,0.60)';
    var scBText=hasTitle?(sc.text||''):(sc.title||sc.text||'');
    var scBLines=wrapTxt(ctx,_editingBody?'':scBText,scW*0.90);
    scBLines.slice(0,2).forEach(function(l,li){
      ctx.fillText(l,scPad+_bOx,scSubY+li*scBsz*1.45);
    });
    var scBCount=Math.max(Math.min(scBLines.length,2),1);
    var scBEndY=scSubBaseY+scBCount*scBsz*1.45+scBsz*0.10;

    // 5. 이미지 — 크게, 거의 남은 화면 전체 (full-width)
    var scImgX=0;
    var scImgY=scBEndY+H*0.010;
    var scImgW=scW;
    var scImgH=H-scImgY-H*0.01; // 하단 여백만 남기고 최대
    if(scImgH<H*0.35) scImgH=H*0.35;

    var _scVid=(img&&img.tagName==='VIDEO'); var _scIW=_scVid?img.videoWidth:(img&&img.naturalWidth||0); var _scIH=_scVid?img.videoHeight:(img&&img.naturalHeight||0);
    if(img&&(_scIW>0)&&(_scVid?img.readyState>=2:img.complete)){
      ctx.save();
      ctx.beginPath(); ctx.rect(scImgX,scImgY,scImgW,scImgH); ctx.clip();
      var scISc=Math.max(scImgW/Math.max(_scIW,1),scImgH/Math.max(_scIH,1));
      ctx.drawImage(img,scImgX+(scImgW-_scIW*scISc)/2,scImgY+(scImgH-_scIH*scISc)/2,_scIW*scISc,_scIH*scISc);
      ctx.restore();
    } else {
      var scIGr=ctx.createLinearGradient(0,scImgY,0,scImgY+scImgH);
      scIGr.addColorStop(0,'#dde8f5'); scIGr.addColorStop(1,'#b8cce0');
      ctx.fillStyle=scIGr; ctx.fillRect(scImgX,scImgY,scImgW,scImgH);
      var scIcoX=scImgX+scImgW/2, scIcoY=scImgY+scImgH*0.5;
      ctx.fillStyle='rgba(255,255,255,0.45)';
      roundRect(ctx,scIcoX-scW*0.07,scIcoY-scW*0.048,scW*0.14,scW*0.096,scW*0.014);
      ctx.fillStyle='rgba(180,205,225,0.9)';
      ctx.beginPath(); ctx.arc(scIcoX,scIcoY,scW*0.03,0,Math.PI*2); ctx.fill();
    }

    // 6. 우측 액션 버튼 — SVG-style, 이미지 위 오버레이
    var scAIcoSz=Math.round(scW*0.054);
    var scATxtSz=Math.round(scW*0.020);
    var scAGap=scAIcoSz*1.6;
    var scActBtnX=scImgX+scImgW-scW*0.048;
    var scActBotY=scImgY+scImgH-scW*0.04;
    var scActData=[
      {lbl:'리믹스',shape:'remix'},
      {lbl:'공유',shape:'share'},
      {lbl:'0',shape:'comment'},
      {lbl:'싫어요',shape:'thumb_down'},
      {lbl:'7',shape:'thumb_up'}
    ];
    scActData.forEach(function(d,di){
      var bY=scActBotY-di*scAGap;
      ctx.save(); ctx.globalAlpha=0.22; ctx.fillStyle='#000';
      ctx.beginPath(); ctx.arc(scActBtnX,bY-scAIcoSz*0.25,scAIcoSz*0.58,0,Math.PI*2); ctx.fill();
      ctx.restore();
      var ix2=scActBtnX, iy2=bY-scAIcoSz*0.45, is2=scAIcoSz*0.34;
      ctx.fillStyle='rgba(255,255,255,0.92)'; ctx.strokeStyle='rgba(255,255,255,0.92)';
      ctx.lineWidth=Math.max(1.5,scW*0.005);
      ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=3;
      if(d.shape==='thumb_up'){
        ctx.beginPath();
        ctx.moveTo(ix2-is2*0.5,iy2+is2*0.2); ctx.lineTo(ix2-is2*0.5,iy2+is2);
        ctx.lineTo(ix2+is2*0.5,iy2+is2); ctx.lineTo(ix2+is2*0.5,iy2+is2*0.2);
        ctx.lineTo(ix2+is2*0.1,iy2+is2*0.2); ctx.lineTo(ix2+is2*0.1,iy2-is2*0.8);
        ctx.lineTo(ix2-is2*0.2,iy2-is2*0.8); ctx.lineTo(ix2-is2*0.5,iy2+is2*0.2); ctx.fill();
      } else if(d.shape==='thumb_down'){
        ctx.beginPath();
        ctx.moveTo(ix2-is2*0.5,iy2-is2*0.2); ctx.lineTo(ix2-is2*0.5,iy2-is2);
        ctx.lineTo(ix2+is2*0.5,iy2-is2); ctx.lineTo(ix2+is2*0.5,iy2-is2*0.2);
        ctx.lineTo(ix2+is2*0.1,iy2-is2*0.2); ctx.lineTo(ix2+is2*0.1,iy2+is2*0.8);
        ctx.lineTo(ix2-is2*0.2,iy2+is2*0.8); ctx.lineTo(ix2-is2*0.5,iy2-is2*0.2); ctx.fill();
      } else if(d.shape==='comment'){
        roundRect(ctx,ix2-is2*0.7,iy2-is2*0.6,is2*1.4,is2*1.1,is2*0.18);
        ctx.fillRect(ix2-is2*0.2,iy2+is2*0.52,is2*0.35,is2*0.35);
      } else if(d.shape==='share'){
        ctx.beginPath(); ctx.moveTo(ix2,iy2-is2*0.6); ctx.lineTo(ix2+is2*0.55,iy2); ctx.lineTo(ix2,iy2+is2*0.6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix2+is2*0.55,iy2); ctx.lineTo(ix2-is2*0.55,iy2); ctx.stroke();
      } else if(d.shape==='remix'){
        // 두 화살표 순환
        ctx.beginPath(); ctx.arc(ix2,iy2,is2*0.55,Math.PI*0.2,Math.PI*1.1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix2+is2*0.55*Math.cos(Math.PI*1.1)-is2*0.2,iy2+is2*0.55*Math.sin(Math.PI*1.1));
        ctx.lineTo(ix2+is2*0.55*Math.cos(Math.PI*1.1),iy2+is2*0.55*Math.sin(Math.PI*1.1));
        ctx.lineTo(ix2+is2*0.55*Math.cos(Math.PI*1.1),iy2+is2*0.55*Math.sin(Math.PI*1.1)+is2*0.2); ctx.stroke();
        ctx.beginPath(); ctx.arc(ix2,iy2,is2*0.55,Math.PI*1.2,Math.PI*2.0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(ix2+is2*0.55*Math.cos(Math.PI*0.2)+is2*0.2,iy2+is2*0.55*Math.sin(Math.PI*0.2));
        ctx.lineTo(ix2+is2*0.55*Math.cos(Math.PI*0.2),iy2+is2*0.55*Math.sin(Math.PI*0.2));
        ctx.lineTo(ix2+is2*0.55*Math.cos(Math.PI*0.2),iy2+is2*0.55*Math.sin(Math.PI*0.2)-is2*0.2); ctx.stroke();
      }
      ctx.shadowBlur=0; ctx.lineWidth=1;
      ctx.font='700 '+scATxtSz+'px Noto Sans KR,sans-serif';
      ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=2;
      ctx.fillText(d.lbl,scActBtnX,bY+scATxtSz*0.3);
      ctx.shadowBlur=0;
    });

  } else if(pos==='shorts-frame') {
    // ══════════════════════════════════════════════════════
    // ── 18. Shorts Frame: 유튜브 숏츠 앱 UI 완전 재현 ──
    // 구조:
    //  [하늘색 헤더바: ← Shorts ☆ ≡]
    //  [탭: 구독·라이브·렌즈·트렌드]
    //  [제목 텍스트 (굵게)]
    //  [조회수·날짜 소텍스트]
    //  [미디어 박스: 사진/영상 full-width]
    //  [채널 프로필 + 구독버튼 + 설명]
    //  [검색바 + 노래 정보]
    //  [하단 내비 바: 홈·Shorts·+ ·구독·내페이지]
    // ══════════════════════════════════════════════════════
    var sfW = W;
    var sfPadX = W*0.045;

    // ─── 전체 배경 ───
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, sfW, H);

    // ─── 1. 상단 하늘색 헤더바 ───
    var sfHdrH = H*0.072;
    ctx.fillStyle = '#87ceeb';   // 하늘색
    ctx.fillRect(0, 0, sfW, sfHdrH);
    // 뒤로가기 ‹
    var sfHdrSz = Math.round(sfW*0.042);
    ctx.font = '500 '+sfHdrSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#1a1a1a';
    ctx.shadowBlur = 0;
    ctx.fillText('‹', sfPadX, sfHdrH*0.72);
    // "Shorts" 타이틀
    ctx.font = '700 '+Math.round(sfW*0.040)+'px Noto Sans KR,sans-serif';
    ctx.textAlign = 'center'; ctx.fillStyle = '#1a1a1a';
    ctx.fillText('Shorts', sfW*0.5, sfHdrH*0.72);
    // 우측 아이콘들 🔍 ☆ ≡
    ctx.font = Math.round(sfW*0.035)+'px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('🔍', sfW*0.76, sfHdrH*0.70);
    ctx.fillText('☆', sfW*0.87, sfHdrH*0.70);
    ctx.fillText('≡', sfW*0.97, sfHdrH*0.70);

    // ─── 2. 탭 메뉴 (구독·라이브·렌즈·트렌드) ───
    var sfTabY = sfHdrH;
    var sfTabH = H*0.040;
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, sfTabY, sfW, sfTabH);
    var sfTabs = ['구독','라이브','렌즈','트렌드'];
    var sfTabSz = Math.round(sfW*0.026);
    ctx.font = '600 '+sfTabSz+'px Noto Sans KR,sans-serif';
    var sfTabXs = [sfPadX, sfW*0.22, sfW*0.40, sfW*0.58];
    sfTabs.forEach(function(tab,ti){
      ctx.textAlign='left'; ctx.fillStyle= ti===0?'#111':'rgba(0,0,0,0.42)';
      ctx.fillText(tab, sfTabXs[ti], sfTabY+sfTabH*0.72);
      // 선택된 탭 밑줄
      if(ti===0){
        var tw=ctx.measureText(tab).width;
        ctx.fillStyle='#111';
        ctx.fillRect(sfTabXs[ti], sfTabY+sfTabH-Math.max(1,H*0.003), tw, Math.max(1,H*0.003));
      }
    });

    // ─── 3. 제목 텍스트 영역 (textOffset 적용: 제목만 이동) ───
    var sfTitleBaseY = sfTabY + sfTabH + H*0.012;
    var sfTitleY = sfTitleBaseY + _tOy;  // 제목 Y 오프셋
    var sfTitleX = sfPadX + _tOx;        // 제목 X 오프셋
    var sfTsz = _userTsz||Math.round(sfW*(S&&S.fmt==='long'?0.048:0.060))*(editOpts&&editOpts.titleSize||1.0);
    ctx.font = t.titleFont+' '+Math.round(sfTsz)+'px Noto Sans KR,Black Han Sans,sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = '#0a0a0a';
    ctx.shadowColor = 'rgba(0,0,0,0.06)'; ctx.shadowBlur = 1;
    // 편집 중일 때도 실제 텍스트로 줄 수 계산 (sfTitleEndY 고정 목적)
    var _sfTitleSrc = sc.title||sc.text||'';
    var sfTLines = wrapTxt(ctx, _editingTitle?_sfTitleSrc:titleText, sfW*0.88);
    if(!_editingTitle){
      sfTLines.slice(0,2).forEach(function(l,li){
        ctx.fillText(l, sfTitleX, sfTitleY + li*sfTsz*1.20 + sfTsz*0.85);
      });
    }
    // ★ 레이아웃 기준선은 항상 2줄 높이로 고정 — 편집 중 레이아웃 붕괴 방지
    var sfTitleLineCount = Math.max(Math.min(sfTLines.length,2), 1);
    var sfTitleEndY = sfTitleBaseY + sfTitleLineCount*sfTsz*1.20 + sfTsz*0.1;

    // ─── 4. 조회수·날짜 소텍스트 (고정 UI) ───
    var sfMetaSz = Math.round(sfW*0.025);
    var sfMetaY = sfTitleEndY + H*0.010;
    ctx.font = '400 '+sfMetaSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.shadowBlur = 0;
    ctx.fillText('○○  |  19:25  |  조회수 158,486', sfPadX, sfMetaY);

    // ─── 5. 미디어 박스 (full-width, 사진/영상) ───
    var sfMedY = sfMetaY + H*0.022;
    var sfMedH = H*0.480;   // 숏츠 화면에서 미디어가 차지하는 높이
    if(img && img.complete && img.naturalWidth>0){
      ctx.save();
      ctx.beginPath(); ctx.rect(0, sfMedY, sfW, sfMedH); ctx.clip();
      var sfSc = Math.max(sfW/Math.max(img.naturalWidth,1), sfMedH/Math.max(img.naturalHeight,1));
      var sfDw = img.naturalWidth*sfSc, sfDh = img.naturalHeight*sfSc;
      ctx.drawImage(img, (sfW-sfDw)/2, sfMedY+(sfMedH-sfDh)/2, sfDw, sfDh);
      ctx.restore();
    } else {
      // 플레이스홀더
      var sfPhGr2 = ctx.createLinearGradient(0,sfMedY,0,sfMedY+sfMedH);
      sfPhGr2.addColorStop(0,'#e4e8ed'); sfPhGr2.addColorStop(1,'#cdd2d8');
      ctx.fillStyle = sfPhGr2; ctx.fillRect(0, sfMedY, sfW, sfMedH);
      ctx.fillStyle='rgba(0,0,0,0.15)';
      ctx.font=Math.round(sfW*0.10)+'px sans-serif'; ctx.textAlign='center';
      ctx.fillText('🖼', sfW*0.5, sfMedY+sfMedH*0.52);
    }

    // ─── 6. 채널 정보 + 구독버튼 ───
    var sfChanY = sfMedY + sfMedH + H*0.014;
    var sfChanSz = Math.round(sfW*0.030);
    // 채널 아이콘 원
    ctx.save();
    ctx.beginPath(); ctx.arc(sfPadX+sfW*0.030, sfChanY+sfChanSz*0.5, sfW*0.028, 0, Math.PI*2);
    ctx.fillStyle = '#cccccc'; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.1)'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
    // 채널명
    ctx.font='700 '+sfChanSz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='#111';
    var _sfChan=(sc&&sc.kw&&sc.kw.trim())||(editOpts.brandName&&editOpts.brandName.trim())||'채널명';
    ctx.fillText('@'+_sfChan, sfPadX+sfW*0.075, sfChanY+sfChanSz*0.78);
    // 구독 버튼
    var sfSubW=sfW*0.165, sfSubH=sfChanSz*1.4;
    ctx.fillStyle='#111';
    roundRect(ctx,sfW*0.72, sfChanY, sfSubW, sfSubH, sfSubH*0.5);
    ctx.font='700 '+Math.round(sfW*0.026)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='center'; ctx.fillStyle='#fff';
    ctx.fillText('구독', sfW*0.72+sfSubW/2, sfChanY+sfSubH*0.72);

    // ─── 7. 설명 텍스트 (본문, bodyOffset 적용) ───
    var sfDescBaseY = sfChanY + sfChanSz*1.8;
    var sfDescY = sfDescBaseY + _bOy;  // 본문 Y 오프셋
    var sfDescX = sfPadX + _bOx;       // 본문 X 오프셋
    var sfBsz = _userBsz||Math.round(sfW*(S&&S.fmt==='long'?0.026:0.030))*(editOpts&&editOpts.bodySize||1.0);
    ctx.font='400 '+sfBsz+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='rgba(0,0,0,0.70)';
    // ★ sc 에서 직접 읽기 — _editingBody 플래그로 인한 본문 소실 방지
    // hasTitle: 제목+본문 분리된 씬 → sc.text가 본문
    // 아닐 경우: sc.text가 전체 내용 (제목 영역에 표시되므로 설명 영역에도 그대로)
    var sfBText = hasTitle ? (sc.text||'') : (sc.title||sc.text||'');
    var sfBLines = wrapTxt(ctx, _editingBody?'':sfBText, sfW*0.82);
    sfBLines.slice(0,1).forEach(function(l,li){
      ctx.fillText(l, sfDescX, sfDescY+li*sfBsz*1.4);
    });
    if(sfBLines.length>1){
      ctx.fillStyle='rgba(0,0,0,0.35)';
      ctx.fillText('(공유마감)', sfDescX+ctx.measureText(sfBLines[0]).width+sfW*0.02, sfDescY);
    }

    // ─── 8. 음악 정보 바 ───
    var sfMusicY = sfDescY + sfBsz*1.8;
    ctx.font='400 '+Math.round(sfW*0.024)+'px Noto Sans KR,sans-serif';
    ctx.textAlign='left'; ctx.fillStyle='rgba(0,0,0,0.45)';
    ctx.fillText('♪  White Color · Lunatic Souls', sfPadX, sfMusicY);

    // ─── 9. 하단 내비게이션 바 ───
    var sfNavY = H*0.908;
    var sfNavH = H - sfNavY;
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, sfNavY, sfW, sfNavH);
    // 내비 아이템
    var sfNavItems = ['🏠','Shorts','＋','구독','내 페이지'];
    var sfNavSz = Math.round(sfW*0.024);
    sfNavItems.forEach(function(item,ni){
      var nx = sfW*(0.10+ni*0.195);
      ctx.font=Math.round(sfW*0.032)+'px sans-serif';
      ctx.textAlign='center'; ctx.fillStyle='rgba(255,255,255,0.75)';
      // + 버튼은 강조
      if(ni===2){
        ctx.fillStyle='rgba(255,255,255,0.95)';
        ctx.font='bold '+Math.round(sfW*0.038)+'px sans-serif';
        ctx.fillText(item, nx, sfNavY+sfNavH*0.52);
      } else {
        ctx.fillText(item.length>2?'●':item, nx, sfNavY+sfNavH*0.44);
        ctx.font=sfNavSz+'px Noto Sans KR,sans-serif';
        ctx.fillStyle='rgba(255,255,255,0.55)';
        ctx.fillText(item.length>2?item:'', nx, sfNavY+sfNavH*0.82);
      }
    });

  }

  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();ctx.fill();
}
function roundRectStroke(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();ctx.stroke();
}

function wrapTxt(ctx,text,maxW){
  if(!text) return [''];
  var words=text.split('');
  var lines=[],cur='';
  // For Korean: wrap by measuring
  for(var i=0;i<text.length;i++){
    var test=cur+text[i];
    if(ctx.measureText(test).width>maxW && cur.length>0){lines.push(cur);cur=text[i];}
    else cur=test;
  }
  if(cur) lines.push(cur);
  return lines.length?lines:[''];
}

// ══════════════════════════════════════════════════════════════
//  SCENE LIST RENDERING
// ══════════════════════════════════════════════════════════════
var SCENE_TRANS=[
  {v:'none',   l:'✕ 없음'},
  {v:'fade',   l:'🌫 페이드'},
  {v:'slide_left',  l:'◀ 슬라이드←'},
  {v:'slide_right', l:'▶ 슬라이드→'},
  {v:'slide_up',    l:'▲ 슬라이드↑'},
  {v:'slide_down',  l:'▼ 슬라이드↓'},
  {v:'zoom_in',     l:'🔍 줌인'},
  {v:'zoom_out',    l:'🔎 줌아웃'},
  {v:'blur',        l:'💫 블러'},
  {v:'flash',       l:'⚡ 플래시'},
  {v:'wipe_left',   l:'◀◀ 와이프←'},
  {v:'wipe_right',  l:'▶▶ 와이프→'},
  {v:'spin',        l:'🌀 스핀'},
  {v:'bounce',      l:'🎾 바운스'},
  {v:'glitch',      l:'📺 글리치'}
];

function renderSceneList(){
  var container=document.getElementById('scene-list');
  if(!container) return;
  var html='';
  S.scenes.forEach(function(sc,i){
    var hasImg=!!(sceneImgs[i]&&sceneImgs[i].complete&&sceneImgs[i].naturalWidth>0);
    var scCls='sc-card'+(i===curScene?' active':'');
    var trans=sc.transition||'none';
    html+='<div class="'+scCls+'" id="sc-'+i+'">';
    html+='<div class="sc-hd" onclick="toggleSCard('+i+')">';
    html+='<div class="sc-num">'+(i+1)+'</div>';
    // title이 없으면 text 앞 20자 표시 (읽기 전용 미리보기)
    var displayTitle=sc.title?sc.title:(sc.text||'').slice(0,20)+((sc.text||'').length>20?'...':'');
    html+='<span class="sc-ttl-lbl" style="flex:1;font-size:11px;font-weight:600;color:#334155;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;padding:0 4px" title="'+esc(sc.text||'')+'">'+esc(displayTitle)+'</span>';
    if(hasImg) html+='<span class="sc-img-badge">🖼</span>';
    // 전환효과 배지 (none이 아닐 때 표시)
    if(trans!=='none'){var tl=SCENE_TRANS.find(function(t){return t.v===trans;});if(tl) html+='<span style="font-size:8px;background:#7c3aed;color:#fff;padding:2px 5px;border-radius:4px;flex-shrink:0">'+tl.l.split(' ')[0]+'</span>';}
    html+='<button class="sc-del" onclick="event.stopPropagation();delScene('+i+')" title="삭제">✕</button>';
    html+='</div>';
    html+='<div class="sc-body">';
    // 더블클릭 편집 힌트
    html+='<div style="font-size:9px;color:#94a3b8;margin-bottom:4px">✏️ 더블클릭 또는 직접 수정 가능</div>';
    html+='<textarea class="sc-ta" rows="3" ondblclick="event.stopPropagation()" oninput="S.scenes['+i+'].text=this.value;if('+i+'===curScene){_refreshBlks('+i+');}drawScene('+i+',1);" onchange="S.scenes['+i+'].text=this.value;if('+i+'===curScene){_refreshBlks('+i+');}drawScene('+i+',1);" style="cursor:text">'+esc(sc.text||'')+'</textarea>';
    // 전환효과 선택 드롭다운
    html+='<div class="sc-field" style="margin-top:7px">';
    html+='<label>↔ 전환 효과 (씬 진입 시)</label>';
    html+='<select class="sc-trans-sel" onchange="S.scenes['+i+'].transition=this.value;drawScene('+i+',0.5)">';
    SCENE_TRANS.forEach(function(t){html+='<option value="'+t.v+'"'+(trans===t.v?' selected':'')+'>'+t.l+'</option>';});
    html+='</select>';
    html+='</div>';
    html+='<div class="sc-meta">';
    html+='<input class="sc-kw-inp" placeholder="사진 키워드 (영어)" value="'+esc(sc.kw||'')+'" onchange="S.scenes['+i+'].kw=this.value" title="Unsplash 검색 키워드" onclick="event.stopPropagation()">';
    html+='<select class="sc-dur" onchange="S.scenes['+i+'].dur=parseInt(this.value)" onclick="event.stopPropagation()">';
    [3,4,5,6,7,8,10].forEach(function(d){html+='<option value="'+d+'"'+(sc.dur===d?' selected':'')+'>'+d+'초</option>';});
    html+='</select>';
    var _isVidScene=sc.customMedia&&sc.customMedia.type==='video';
    if(hasImg) html+='<div style="position:relative;display:inline-block"><img class="sc-img-thumb" src="'+sceneImgs[i].src+'" onclick="event.stopPropagation();gotoScene('+i+');openPexelsModal()" title="클릭하면 미디어 변경">'+(_isVidScene?'<span style="position:absolute;bottom:1px;right:1px;background:rgba(220,38,38,.9);color:#fff;font-size:7px;font-weight:700;padding:1px 3px;border-radius:2px">🎬</span>':'')+'</div>';
    html+='<button class="btn btn-s btn-sm" onclick="event.stopPropagation();gotoScene('+i+');openPexelsModal()" style="flex-shrink:0;font-size:9px">'+(_isVidScene?'🎬 영상':'🖼 사진')+'</button>';
    html+='<button class="btn btn-s btn-sm" onclick="event.stopPropagation();triggerUploadForScene('+i+')" style="flex-shrink:0;font-size:9px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none">📁 내 파일</button>';
    // 미디어 조절 (해당 씬이 현재 씬이고 이미지가 있을 때)
    if(hasImg) html+='<button class="btn btn-s btn-sm" onclick="event.stopPropagation();gotoScene('+i+');resetMediaTransform()" title="위치·줌 초기화" style="flex-shrink:0;font-size:9px">↺ 초기화</button>';
    html+=_getVidOffsetBtn(i);
    html+='</div></div></div>';
  });
  container.innerHTML=html;
}

function renderSceneNav(){
  var nav=document.getElementById('scene-nav');
  var html='';
  S.scenes.forEach(function(sc,i){
    var hasImg=!!(sceneImgs[i]&&sceneImgs[i].complete&&sceneImgs[i].naturalWidth>0);
    var snCls='sn'+(i===curScene?' on':'')+(hasImg?' has-img':'');
    html+='<div class="'+snCls+'" onclick="gotoScene('+i+')" title="씬 '+(i+1)+': '+esc(sc.title||'')+'">'+(i+1)+'</div>';
  });
  nav.innerHTML=html;
}

function gotoScene(i){curScene=i;_handleSceneVideoSwitch(i);renderSceneNav();renderSceneList();drawScene(i,1);renderTimeline();_refreshBlks(i);if(typeof _updateZoomBadge==='function')_updateZoomBadge();}
function toggleSCard(i){curScene=i;_handleSceneVideoSwitch(i);renderSceneList();drawScene(i,1);renderSceneNav();_refreshBlks(i);}
function addScene(){
  var n=S.scenes.length+1;
  S.scenes.push({title:'씬 '+n,text:'내용을 입력하세요.',kw:'background abstract',dur:5});
  curScene=S.scenes.length-1;
  renderSceneList();renderSceneNav();
}
function delScene(i){
  if(S.scenes.length<=1) return;
  S.scenes.splice(i,1);
  delete sceneImgs[i];
  // Re-index sceneImgs
  var newImgs={};
  Object.keys(sceneImgs).forEach(function(k){var ki=parseInt(k);if(ki>i) newImgs[ki-1]=sceneImgs[k]; else if(ki<i) newImgs[ki]=sceneImgs[k];});
  sceneImgs=newImgs;
  if(curScene>=S.scenes.length) curScene=S.scenes.length-1;
  renderSceneList();renderSceneNav();drawScene(curScene,1);
}
function prevScene2(){if(curScene>0) gotoScene(curScene-1);}
function nextScene2(){if(curScene<S.scenes.length-1) gotoScene(curScene+1);}

// ══════════════════════════════════════════════════════════════
//  씬 더블클릭 인라인 텍스트 편집 (캔버스 위 오버레이)

function closeSceneTextEditor(){
  // 기존 팝업 오버레이 (canvas-edit-overlay) 닫기 — 레거시 호환
  var overlay=document.getElementById('canvas-edit-overlay');
  if(overlay){overlay.style.display='none';overlay.innerHTML='';}
  // 인라인 편집도 같이 닫기
  cancelInlineEdit();
}

// ══════════════════════════════════════════════════════════════
//  AUTO MEDIA  — Pexels API 우선 + Picsum 폴백 (고화질 사진 자동 매칭)
// ══════════════════════════════════════════════════════════════
// Keyword → Picsum seed mapping (Pexels 실패 시 폴백용)
var KW_SEEDS = {
  'opening':10,'introduction':11,'greeting':12,'start':13,'begin':14,
  'tips':20,'advice':21,'guide':22,'how':23,'steps':24,'method':25,
  'success':30,'achievement':31,'goal':32,'result':33,'win':34,
  'health':40,'fitness':41,'gym':42,'diet':43,'food':44,'cooking':45,
  'travel':50,'nature':51,'landscape':52,'mountain':53,'ocean':54,'beach':55,
  'business':60,'office':61,'finance':62,'money':63,'strategy':64,
  'technology':70,'tech':71,'computer':72,'digital':73,'modern':74,
  'fashion':80,'beauty':81,'style':82,'cosmetics':83,
  'music':90,'concert':91,'entertainment':92,'movie':93,
  'education':100,'study':101,'learning':102,'book':103,
  'ending':110,'conclusion':111,'thank':112,'final':113,
  'motivation':120,'energy':121,'power':122,'strength':123,
  'city':130,'urban':131,'architecture':132,'building':133,
  'background':140,'abstract':141,'pattern':142,'texture':143
};

function getImgUrl(kw, idx, W, H) {
  var kwLo=(kw||'background').toLowerCase().trim();
  var seed=0;
  var kwWords=kwLo.split(/[ ,]+/);
  for(var ki=0;ki<kwWords.length;ki++){
    var w=kwWords[ki];
    if(KW_SEEDS[w]!==undefined){seed=KW_SEEDS[w];break;}
  }
  if(seed===0) seed=(idx*17+43)%150+10;
  // picsum은 CORS + Service Worker 간섭 문제로 /api/img-proxy 경유
  var picsumUrl='https://picsum.photos/seed/'+(seed+idx*3+7)+'/'+W+'/'+H;
  return '/api/img-proxy?url='+encodeURIComponent(picsumUrl);
}

// ── Pexels API로 씬 이미지를 가져오는 고품질 매칭 함수 ──
function fetchSceneImgViaPexels(kw, idx, W, H) {
  return new Promise(function(resolve) {
    // 한글 키워드를 영어로 변환
    var engKw = _translateQuery ? _translateQuery(kw) : kw;
    // 씬마다 다른 페이지 번호로 다양한 사진 선택
    var page = (idx % 5) + 1;
    var proxyUrl = '/api/pexels/search?q=' + encodeURIComponent(engKw) + '&type=photos&page=' + page + '&per_page=5&orientation=' + (S.fmt==='long'?'landscape':'portrait');
    fetch(proxyUrl)
      .then(function(r){ return r.json(); })
      .then(function(data) {
        if(data.ok && data.items && data.items.length > 0) {
          // 씬 인덱스로 결과 중 하나 선택 (다양성)
          var item = data.items[idx % data.items.length];
          // 최대 해상도 URL 사용: Pexels는 원본 URL 제공
          var imgUrl = item.url || item.thumb;
          // 해상도 파라미터 추가 (Pexels URL에 w= 파라미터 지원)
          if(imgUrl && imgUrl.indexOf('images.pexels.com') >= 0) {
            var qIdx = imgUrl.indexOf('?');
            var baseUrl = qIdx >= 0 ? imgUrl.substring(0, qIdx) : imgUrl;
            imgUrl = baseUrl + '?auto=compress&cs=tinysrgb&w=' + W + '&h=' + H + '&fit=crop';
          }
          // images.pexels.com도 Service Worker CORS 간섭 방지를 위해 프록시 경유
          if(imgUrl && imgUrl.indexOf('https://') === 0) {
            imgUrl = '/api/img-proxy?url=' + encodeURIComponent(imgUrl);
          }
          resolve(imgUrl);
        } else {
          resolve(null); // 폴백으로
        }
      })
      .catch(function() { resolve(null); });
  });
}

function fetchSceneImg(idx){
  return new Promise(function(resolve){
    var sc=S.scenes[idx];
    var kw=(sc.kw&&sc.kw.trim())?sc.kw.trim():extractKeyword(sc.title+' '+sc.text);
    // ── 실제 캔버스 해상도와 동일한 고해상도 이미지 요청 ──
    var W=S.fmt==='long'?1920:1080;
    var H=S.fmt==='long'?1080:1920;

    function applyImg(url) {
      var img=new Image();
      img.crossOrigin='anonymous';
      img.onload=function(){
        sceneImgs[idx]=img;
        var badge=document.querySelector('#sc-'+idx+' .sc-img-badge');
        if(!badge){
          var hd=document.querySelector('#sc-'+idx+' .sc-hd');
          if(hd){var sp=document.createElement('span');sp.className='sc-img-badge';sp.textContent='🖼';hd.insertBefore(sp,hd.lastChild);}
        }
        if(idx===curScene) drawScene(curScene,1);
        resolve(img);
      };
      img.onerror=function(){
        // 최종 폴백: Picsum
        var fb=new Image();
        fb.crossOrigin='anonymous';
        fb.src=getImgUrl(kw,idx,W,H);
        fb.onload=function(){sceneImgs[idx]=fb;if(idx===curScene)drawScene(curScene,1);resolve(fb);};
        fb.onerror=function(){resolve(null);};
      };
      img.src=url;
    }

    // 1차 시도: Pexels API (키워드 기반 고화질 사진)
    fetchSceneImgViaPexels(kw, idx, W, H).then(function(pexelsUrl) {
      if(pexelsUrl) {
        applyImg(pexelsUrl);
      } else {
        // 2차 시도: Picsum (폴백)
        applyImg(getImgUrl(kw,idx,W,H));
      }
    });
  });
}

function autoMatchMedia(){
  setStatus('🖼 배경 사진 자동 매칭 중...');
  var promises=S.scenes.map(function(_,i){return fetchSceneImg(i);});
  Promise.all(promises).then(function(){
    setStatus('✅ 배경 사진 매칭 완료!');
    renderSceneList();renderSceneNav();drawScene(curScene,1);
    setTimeout(function(){setStatus('준비 완료');},2000);
  }).catch(function(){
    setStatus('사진 일부 로드 실패 (계속 가능)');
  });
}

// ── 씬 본문에서 자동 제목 생성 ──
// 본문 첫 구절을 12자 이내로 잘라 제목으로 사용
// 문장 부호(. ! ? 。) 앞까지, 또는 12자까지
function _autoTitle(text){
  if(!text) return '';
  var t=text.trim();
  // 문장 부호 앞까지 자르기
  var m=t.match(/^([^.!?。！？]{2,20})[.!?。！？]/);
  if(m) return m[1].trim().slice(0,15);
  // 없으면 앞 12자 (한국어는 12자면 적당한 제목 길이)
  if(t.length<=12) return t;
  return t.slice(0,12).trim();
}

function extractKeyword(text){
  var kmap={
    '다이어트':'diet fitness health','건강':'health lifestyle wellness',
    '음식':'food cooking meal','여행':'travel landscape adventure',
    '패션':'fashion style clothing','뷰티':'beauty cosmetics skincare',
    '운동':'fitness gym workout','요리':'cooking food kitchen',
    '공부':'education study learning','돈':'money finance wealth',
    '성공':'success achievement goal','비즈니스':'business office corporate',
    '기술':'technology digital innovation','음악':'music concert audio',
    '게임':'gaming technology entertainment','자연':'nature landscape outdoor',
    '도시':'city urban modern','바다':'ocean beach water','산':'mountain nature hiking',
    '카페':'cafe coffee shop','오프닝':'opening introduction greeting',
    '마무리':'ending conclusion final','소개':'introduction overview presentation',
    '핵심':'tips guide key','방법':'steps method process','팁':'tips advice guide',
    '결론':'conclusion final summary','동기':'motivation energy inspiration',
    '강의':'education learning lecture','습관':'lifestyle routine wellness',
    '마케팅':'marketing business strategy','부동산':'real estate architecture building',
    '주식':'finance investment money','독서':'book education reading',
    '명상':'meditation wellness calm','요가':'yoga fitness wellness',
    '스타트업':'startup business innovation','디자인':'design art creative',
    '사랑':'love relationship heart','가족':'family home lifestyle',
    '직장':'office work career','취미':'hobby lifestyle fun',
    '쇼핑':'shopping retail fashion','뉴스':'news information media',
    '리뷰':'review product analysis','인터뷰':'interview business professional'
  };
  for(var k in kmap){if(text.indexOf(k)>=0) return kmap[k];}
  var eng=text.match(/[a-zA-Z]{4,}/);
  if(eng) return eng[0].toLowerCase()+' background';
  return 'background abstract modern';
}

// ══════════════════════════════════════════════════════════════
//  SCRIPT TOOLS
// ══════════════════════════════════════════════════════════════
function setScriptMode(mode){
  // AI 모드는 숨겼으므로 'full'로 대체
  if(mode==='ai') mode='full';
  document.querySelectorAll('.smt').forEach(function(b){b.classList.remove('on');});
  var smBtn = document.getElementById('sm-'+mode);
  if(smBtn) smBtn.classList.add('on');
  var boxes = {'ai':'script-ai-box','full':'script-full-box','scene':'script-scene-box'};
  Object.keys(boxes).forEach(function(k){
    var el = document.getElementById(boxes[k]);
    if(el) el.style.display = (k===mode)?'block':'none';
  });
  if(mode==='scene') renderSceneList();
}

function splitToScenes(){
  var el=document.getElementById('full-script');
  if(!el){alert('대본 입력창을 찾을 수 없습니다');return;}
  var txt=el.value.trim();
  if(!txt){alert('대본을 입력해주세요');return;}

  var lines=[];

  // 1단계: 줄바꿈으로 분리 (CR+LF, LF 모두 처리)
  var NL=String.fromCharCode(10);
  var CR=String.fromCharCode(13);
  var normalizedTxt=txt.replace(new RegExp(CR+NL,'g'),NL).replace(new RegExp(CR,'g'),NL);
  var byNewline=normalizedTxt.split(NL).map(function(l){return l.trim();}).filter(function(l){return l.length>1;});
  if(byNewline.length>=2){
    lines=byNewline;
  } else {
    // 2단계: 문장 부호로 분리 (한국어 문장부호 + 영문 마침표 포함)
    var bySentence=normalizedTxt.replace(/([.!?。！？]+)\s*/g,'$1'+NL).split(NL)
      .map(function(l){return l.trim();}).filter(function(l){return l.length>1;});
    if(bySentence.length>=2){
      lines=bySentence;
    } else {
      // 3단계: 20~50자 단위로 자연스럽게 분리 (공백 기준)
      lines=[];
      var flatTxt=normalizedTxt.replace(new RegExp(NL,'g'),' ').replace(/ +/g,' ');
      // 한국어는 공백 없이 이어지므로 글자 수 기준으로 분리
      var chunkSize=40;
      if(flatTxt.length<=chunkSize){
        lines=[flatTxt];
      } else {
        // 공백 기준 단어 분리 시도, 없으면 글자 수 기준
        var words=flatTxt.split(' ');
        if(words.length>=2){
          var cur='';
          words.forEach(function(w){
            if(!w) return;
            var next=cur?cur+' '+w:w;
            if(next.length>chunkSize&&cur.length>=10){
              lines.push(cur.trim());
              cur=w;
            } else {
              cur=next;
            }
          });
          if(cur.trim().length>0) lines.push(cur.trim());
        } else {
          // 공백 없는 연속 한국어 텍스트: 글자 수로 분리
          for(var ci=0;ci<flatTxt.length;ci+=chunkSize){
            var chunk=flatTxt.slice(ci,ci+chunkSize).trim();
            if(chunk.length>1) lines.push(chunk);
          }
        }
      }
    }
  }

  // 너무 짧은 줄(2자 미만) 제거, 너무 긴 줄은 분할
  var finalLines=[];
  lines.forEach(function(line){
    var l=line.trim();
    if(!l||l.length<2) return;
    if(l.length<=80){
      finalLines.push(l);
    } else {
      // 80자 초과 시 문장 부호 기준으로 한번 더 분할
      var NL2=String.fromCharCode(10);
      var sub=l.replace(/([.!?。！？]+) */g,'$1'+NL2).split(NL2)
        .map(function(s){return s.trim();}).filter(function(s){return s.length>1;});
      sub.forEach(function(s){finalLines.push(s);});
    }
  });
  if(!finalLines.length) finalLines=[txt];

  // 씬 생성 - title 없이 text만 (본문 텍스트 = TTS 읽힘)
  // 속도 슬라이더 값 반영: 빠를수록 씬 길이 짧아짐
  var _speedEl=document.getElementById('vc-speed')||document.getElementById('v-speed');
  var _spd=_speedEl?parseFloat(_speedEl.value)||1.0:1.0;
  var _voiceRate=(getCurVoice()&&getCurVoice().gRate)||(1.0);
  var _effectiveRate=Math.max(0.5,Math.min(3.0,_spd*_voiceRate));
  // ── 첫 번째 씬의 제목(또는 전체 공통 제목) 추출 ──
  // 전체 대본의 핵심 키워드를 첫 줄에서 추출하여 모든 씬의 공통 제목으로 사용
  var commonTitle = _autoTitle(finalLines[0]||'');
  S.scenes=finalLines.map(function(line,li){
    var clean=line.trim();
    var kw=extractKeyword(clean);
    // 읽기 속도: 한국어 평균 3.5자/초 기준, 속도 슬라이더 반영, 최소 2초 최대 20초
    var estimatedSec=Math.round((clean.length/3.5/_effectiveRate)*10)/10;
    var dur=Math.max(2,Math.min(20,estimatedSec));
    // ★ 자동 제목: 첫 씬 → 공통 제목, 나머지 → 각 씬 본문에서 추출
    var autoT = (li===0) ? commonTitle : _autoTitle(clean);
    return {title:autoT, text:clean, kw:kw, dur:dur};
  });
  sceneImgs={};
  renderSceneList();renderSceneNav();
  setScriptMode('scene');drawScene(0,1);curScene=0;
  _refreshBlks(0);  // 대본 분리 직후 블록에 첫 씬 텍스트 반영
  autoMatchMedia();
  addLog('📝 대본 분리 완료: '+S.scenes.length+'개 씬');
  // NOTE: adjustSceneDurationsByTTS 제거 — 대본 분리 시 씬마다 TTS API 호출하면
  // 영상 제작 전부터 API가 씬 수만큼 순차 호출되어 수십 초 지연 발생.
  // 씬 길이는 텍스트 글자 수 추정값(dur)으로 충분함.
}

// ── 속도 슬라이더 변경 시: UI 업데이트 + 씬 길이 추정치 재계산 + 타임라인 갱신 ──
// 배속을 움직이면 바로 화면에 반영되고, 영상 제작 시 배속에 맞춰 TTS / 씬 길이 / 영상 길이가 조정됨.
function onSpeedSliderChange(val){
  var v=parseFloat(val);
  if(!isFinite(v)||v<=0) v=1.0;
  var disp=document.getElementById('vc-speed-val');
  if(disp) disp.textContent=v.toFixed(2)+'x';
  // 씬이 이미 존재하면 글자 수 기반 추정 duration 을 배속에 맞춰 재계산 (실제 재생은 녹화 직전 TTS 측정으로 최종 확정)
  if(S&&S.scenes&&S.scenes.length){
    var voiceRate=(getCurVoice()&&getCurVoice().gRate)||1.0;
    var eff=Math.max(0.25,Math.min(4.0,v*voiceRate));
    S.scenes.forEach(function(sc){
      var clean=(sc.text||sc.title||'').trim();
      if(!clean) return;
      // 한국어 평균 3.5자/초 기준 + 배속 반영, 최소 2초
      var est=Math.round((clean.length/3.5/eff)*10)/10;
      sc.dur=Math.max(2,est);
    });
    if(typeof renderSceneList==='function') renderSceneList();
    if(typeof renderTimeline==='function') renderTimeline();
    var lbl=document.getElementById('canvas-lbl');
    if(lbl){
      var total=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
      var fmtStr=S.fmt==='short'?'📱 숏폼 9:16':S.fmt==='long'?'🖥️ 롱폼 16:9':'⬜ 정방형 1:1';
      lbl.textContent=fmtStr+' | ≈'+Math.round(total)+'초 ('+v.toFixed(2)+'x)';
    }
  }
}

// TTS 오디오 실제 길이로 씬 duration 자동 조정
function adjustSceneDurationsByTTS(v){
  var pending=S.scenes.length;
  // Google TTS는 5000자, OpenAI TTS는 4096자, HF TTS는 500자 제한
  var isGoogleEngine=v.gId&&v.gId.startsWith('gtts:');
  var isOpenAIEngine=v.gId&&v.gId.startsWith('openai:');
  var maxLen=isGoogleEngine?5000:isOpenAIEngine?4096:500;
  // ★ 속도 슬라이더 반영 (이전엔 v.gRate만 사용 → 슬라이더 무시 버그)
  var _sEl=document.getElementById('vc-speed')||document.getElementById('v-speed');
  var _slSpd=_sEl?parseFloat(_sEl.value)||1.0:1.0;
  var _adjRate=Math.max(0.25,Math.min(4.0,(v.gRate||1.0)*_slSpd));
  S.scenes.forEach(function(sc,i){
    var text=(sc.text||'').trim().slice(0,maxLen);
    if(!text){pending--;if(pending<=0)renderSceneList();return;}
    // TTS 음성을 받아서 실제 오디오 duration 측정 (슬라이더 배속 반영)
    fetch('/api/tts/v2/speak',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({text:text,voice_id:v.gId,pitch:v.gPitch||0,speaking_rate:_adjRate})
    }).then(function(r){
      if(!r.ok) throw new Error('TTS '+r.status);
      return r.arrayBuffer();
    })
    .then(function(buf){
      // JSON 에러 응답을 audio/mpeg 200 OK로 감싼 경우 조기 감지
      if(buf.byteLength>0){
        var fb=new Uint8Array(buf,0,1)[0];
        if(fb===0x7B||fb===0x5B){
          try{var jerr=JSON.parse(new TextDecoder().decode(buf));addLog('⚠️ 씬'+(i+1)+' 길이측정 TTS: JSON에러 → '+( jerr.error||'').slice(0,60));}catch(_){}
          throw new Error('TTS JSON 에러 응답 (씬'+(i+1)+')');
        }
      }
      // CSP 대응: blob URL <audio> → AudioContext.decodeAudioData 로 duration 측정
      var tmpCtx2;
      try{ tmpCtx2=new(window.AudioContext||window.webkitAudioContext)(); }
      catch(e){ pending--;if(pending<=0){renderSceneList();renderTimeline();} return; }
      var copyBuf2;
      try{ copyBuf2=buf.slice(0); }catch(_){ copyBuf2=buf; }
      var dp2;
      try{ dp2=tmpCtx2.decodeAudioData(copyBuf2); }catch(e){ dp2=Promise.reject(e); }
      Promise.resolve(dp2).then(function(ab){
        try{tmpCtx2.close();}catch(_){}
        var durSec=ab.duration||0;
        if(durSec>0){
          S.scenes[i].dur=Math.max(3,Math.min(15,Math.ceil(durSec+1.5)));
          addLog('🎙 씬'+(i+1)+' 길이: '+S.scenes[i].dur+'초');
        }
        pending--;
        if(pending<=0){renderSceneList();renderTimeline();addLog('✅ 씬 길이 자동 조정 완료');}
      }).catch(function(){
        try{tmpCtx2.close();}catch(_){}
        pending--;
        if(pending<=0){renderSceneList();renderTimeline();}
      });
    }).catch(function(){pending--;if(pending<=0){renderSceneList();renderTimeline();}});
  });
}

function aiAutoScript(){
  var topic=(document.getElementById('ai-topic').value||'').trim()||'건강한 생활 습관';
  var tone=document.getElementById('ai-tone').value||'friendly';
  var count=parseInt(document.getElementById('ai-count').value)||7;
  var scripts={
    friendly:[
      {t:'안녕하세요! 👋',b:'오늘은 '+topic+'에 대해 알려드릴게요! 끝까지 봐주세요 😊',kw:'greeting friendly'},
      {t:topic+' 핵심 포인트',b:topic+'의 가장 중요한 핵심을 알려드릴게요.',kw:'tips advice key'},
      {t:'이것만 알면 돼요!',b:'생각보다 간단합니다. 바로 이것이에요!',kw:'simple easy guide'},
      {t:'실제로 해봤어요',b:'직접 해본 결과, 정말 효과가 있었어요!',kw:'experience result'},
      {t:'주의할 점은?',b:'이것만 조심하면 완벽합니다. 꼭 기억하세요.',kw:'warning caution note'},
      {t:'핵심 요약 ✅',b:topic+'의 핵심 3가지를 기억하세요!',kw:'summary key points'},
      {t:'마무리 🙏',b:'도움이 되셨나요? 좋아요와 구독 부탁드려요!',kw:'ending thank you'},
      {t:'보너스 팁 🎁',b:'마지막으로 하나 더! 이건 잘 알려지지 않은 비법이에요.',kw:'bonus tips secret'},
      {t:topic+' 추천 도구',b:'이런 도구를 활용하면 훨씬 쉬워져요!',kw:'tools resources'},
      {t:'다음 편 예고 👀',b:'다음 영상도 기대해주세요! 더 좋은 내용으로 찾아올게요.',kw:'preview next episode'}
    ],
    pro:[
      {t:topic+' 개요',b:topic+'란 무엇인가? 전문가 관점에서 분석합니다.',kw:'professional overview analysis'},
      {t:'데이터로 본 현황',b:'최근 데이터를 보면 이런 패턴이 나타납니다.',kw:'data statistics chart'},
      {t:'핵심 원리 1',b:topic+'의 첫 번째 핵심 원리를 설명합니다.',kw:'principle concept theory'},
      {t:'핵심 원리 2',b:'두 번째 원리는 실제 적용에서 매우 중요합니다.',kw:'implementation strategy'},
      {t:'케이스 스터디',b:'성공적인 사례를 통해 배울 수 있는 교훈입니다.',kw:'case study success business'},
      {t:'실전 적용법',b:topic+'을 실제로 적용하는 구체적인 방법입니다.',kw:'action steps method'},
      {t:'리스크와 대응',b:'주의해야 할 리스크와 대응 전략을 알아봅니다.',kw:'risk management strategy'},
      {t:'성과 측정',b:'결과를 어떻게 측정하고 개선할 수 있는지 설명합니다.',kw:'metrics measurement growth'},
      {t:'결론 및 제언',b:topic+'을 통해 더 나은 결과를 만드는 방법입니다.',kw:'conclusion recommendation'},
      {t:'Q&A',b:'자주 묻는 질문들에 답변합니다.',kw:'question answer FAQ'}
    ],
    funny:[
      {t:'충격 🤯 '+topic,b:'여러분 이거 알고 계셨어요?! 저도 몰랐어요 ㄷㄷ',kw:'surprised shocked reaction'},
      {t:'진짜 실화?!',b:topic+'에 대한 충격적인 진실을 밝힙니다...',kw:'truth reveal shocking'},
      {t:'직접 해봤는데... 😅',b:'해봤더니 결과가 예상과 완전 달랐어요 ㅋㅋ',kw:'experiment funny reaction'},
      {t:'기대와 현실 😂',b:'사람들이 생각하는 것 vs 실제로 일어나는 것!',kw:'expectation reality contrast'},
      {t:'반전 주의! ⚡',b:'사실 이게 진짜였어요! 반전 있음 주의!',kw:'surprise twist reveal'},
      {t:'꿀팁 대방출 🍯',b:'이런 팁 어디서도 못 들어봤죠? 독점 공개!',kw:'tips exclusive secret'},
      {t:'실패 모음 🙈',b:'저 이렇게 망했어요... 여러분은 따라하지 마세요 ㅎ',kw:'fail failure funny'},
      {t:'드디어 성공! 🎉',b:'수많은 실패 끝에 드디어 해냈어요!',kw:'success celebration achievement'},
      {t:'마무리 🎉',b:'재미있으셨나요? 좋아요는 제 원동력입니다 💪',kw:'ending thank celebration'},
      {t:'다음 예고 👀',b:'다음 편엔 더 웃긴 거 가져올게요!',kw:'preview next funny'}
    ],
    emotional:[
      {t:'나의 이야기 ❤️',b:topic+'과 함께한 나의 진솔한 이야기를 들려드립니다.',kw:'personal story emotion heart'},
      {t:'그 때를 기억하나요',b:'처음 시작했을 때의 막막함... 여러분도 그런 적 있죠?',kw:'memory nostalgia beginning'},
      {t:'힘들었던 순간들',b:'포기하고 싶었던 순간이 한두 번이 아니었어요.',kw:'struggle overcome difficult'},
      {t:'작은 변화의 시작',b:'거창한 것이 아니라 작은 한 걸음이 전부였어요.',kw:'change small beginning step'},
      {t:'그게 전환점이었어',b:topic+'을 통해 내 삶의 방향이 완전히 바뀌었습니다.',kw:'turning point change transformation'},
      {t:'드디어 달라졌어요',b:'노력이 결실을 맺기 시작했어요. 믿어주세요.',kw:'success result growth achieved'},
      {t:'여러분께',b:'이 영상을 보고 있는 당신에게 전하고 싶은 말이 있어요.',kw:'message audience personal'},
      {t:'우리는 할 수 있어',b:'당신도 반드시 할 수 있습니다. 진심으로 응원해요.',kw:'motivation hope inspiration support'},
      {t:'감사합니다 🙏',b:'함께해주셔서 정말 감사해요. 덕분에 여기까지 왔어요.',kw:'thank grateful appreciation'},
      {t:'앞으로도 함께해요',b:'앞으로도 함께 성장해가요. 항상 여러분 편이에요.',kw:'together future journey'}
    ],
    energy:[
      {t:'🔥 지금 당장 '+topic,b:topic+'? 어렵다고요? 지금 바로 시작합시다!!',kw:'challenge energy fire start'},
      {t:'한계를 깨라! ⚡',b:'당신의 한계는 어디인가요? 지금 뛰어넘어보세요!',kw:'breakthrough limits power'},
      {t:'두려워하지 마라',b:'두려움은 성공 직전에 찾아옵니다. 돌파하세요!',kw:'fearless courage bold action'},
      {t:'진짜 강자는 달라',b:topic+'에서 진짜 결과를 내는 사람들의 비밀!',kw:'winner champion strong'},
      {t:'망설이면 질 뿐!',b:'결정하고 행동하세요. 생각만 하면 아무것도 안 바뀝니다.',kw:'action decisive move forward'},
      {t:'오늘이 최고의 날',b:'내일은 없어요. 지금이 바로 시작할 최고의 순간!',kw:'today now best moment'},
      {t:'결과가 증명한다',b:topic+'으로 모든 것을 바꿀 수 있습니다. 저를 보세요!',kw:'results proof evidence'},
      {t:'끝까지 해라 💪',b:'포기는 패배자의 선택입니다. 우리는 끝까지 갑니다!',kw:'persistence determination fight'},
      {t:'승리는 가깝다!',b:'조금만 더! 승리는 바로 당신 앞에 있습니다!',kw:'victory close success near'},
      {t:'지금 GO! 🚀',b:'영상 끝나면 바로 시작하세요. 3, 2, 1, 행동!',kw:'launch start action blast'}
    ],
    tutorial:[
      {t:'📚 '+topic+' 완벽 가이드',b:topic+'을 처음부터 끝까지 단계별로 알려드립니다!',kw:'guide tutorial complete education'},
      {t:'1단계: 준비하기',b:'시작하기 전에 이것들을 준비해주세요.',kw:'preparation setup tools materials'},
      {t:'2단계: 기초 설정',b:'기본 설정을 이렇게 해주시면 됩니다.',kw:'setup configuration basic settings'},
      {t:'3단계: 핵심 과정',b:'이 단계가 가장 중요합니다. 집중해주세요!',kw:'process core important step'},
      {t:'4단계: 세부 조정',b:'세세한 부분을 조정하면 훨씬 좋아집니다.',kw:'adjustment fine-tune detail'},
      {t:'5단계: 최종 확인',b:'완성 전에 이것들을 반드시 확인해주세요.',kw:'check verify final review'},
      {t:'완성! 🎉',b:'이제 완성되었습니다! 어렵지 않죠?',kw:'complete done finished success'},
      {t:'자주 하는 실수 ⚠️',b:'초보자들이 자주 하는 실수와 해결법입니다.',kw:'mistake error common fix'},
      {t:'고급 팁 🚀',b:'더 잘하고 싶다면 이 팁들을 활용해보세요!',kw:'advanced tips expert pro'},
      {t:'마무리 정리',b:'오늘 배운 내용을 간단히 정리해드릴게요.',kw:'summary review conclusion'}
    ],
    review:[
      {t:'⭐ '+topic+' 리뷰',b:topic+'을 직접 사용해본 솔직한 리뷰입니다!',kw:'review product honest test'},
      {t:'첫인상은?',b:'처음 접했을 때의 솔직한 느낌을 말씀드릴게요.',kw:'first impression initial reaction'},
      {t:'장점 👍',b:topic+'의 가장 좋았던 점들을 알려드릴게요.',kw:'pros advantage benefit good'},
      {t:'단점 👎',b:'아쉬웠던 점도 솔직하게 이야기할게요.',kw:'cons disadvantage problem issue'},
      {t:'가격 대비 성능',b:'가격을 생각하면 이 정도면 충분할까요?',kw:'value price cost worth'},
      {t:'경쟁 제품 비교',b:'비슷한 것들과 비교해보면 어떨까요?',kw:'comparison competitor alternative'},
      {t:'추천 대상은?',b:'이런 분들에게 강력 추천합니다!',kw:'recommendation target audience'},
      {t:'비추천 대상',b:'이런 분들에게는 맞지 않을 수도 있어요.',kw:'not recommended wrong fit'},
      {t:'총점과 한줄평',b:'최종 점수는 5점 만점에... 그 이유는?',kw:'rating score verdict'},
      {t:'결론 및 구매 권장',b:'구매할 가치가 있을까요? 최종 결론입니다.',kw:'conclusion recommendation buy'}
    ]
  };
  var chosen=scripts[tone]||scripts.friendly;
  var sliceCount=Math.min(count,chosen.length);
  while(chosen.length<count) chosen=chosen.concat(chosen);
  S.scenes=chosen.slice(0,count).map(function(s,i){
    return {title:s.t,text:s.b.split('$topic').join(topic),kw:s.kw,dur:Math.max(4,Math.ceil((s.b.length)/12))};
  });
  sceneImgs={};
  renderSceneList();renderSceneNav();drawScene(0,1);curScene=0;
  setScriptMode('scene');
  switchLTab('script',document.getElementById('ltab-script'));
  autoMatchMedia();
}

function loadSample(){
  var NL=String.fromCharCode(10);
  document.getElementById('full-script').value=
    '안녕하세요! 오늘은 다이어트 꿀팁 3가지를 알려드릴게요.'+NL+
    '첫 번째, 아침밥을 꼭 드세요. 아침을 먹으면 신진대사가 활발해집니다.'+NL+
    '두 번째, 물을 하루에 최소 2리터 마셔보세요. 놀라운 변화가 생깁니다.'+NL+
    '세 번째, 잠들기 전 10분 스트레칭을 해주세요. 수면의 질이 높아져요.'+NL+
    '오늘 내용이 도움이 되셨나요? 좋아요와 구독 부탁드립니다!';
}

// ══════════════════════════════════════════════════════════════
//  VOICES — 브라우저 실제 목소리 + Google TTS + 특수효과
// ══════════════════════════════════════════════════════════════
function loadVoices(){
  var _voiceListBuilt=false;  // 중복 buildVoiceList 호출 방지 플래그
  function buildVoiceList(svList){
    // ── 중복 호출 방지: onvoiceschanged + setTimeout 동시 실행 시 allVoices 두 배 증가 버그 방지 ──
    // 단, 브라우저 목소리가 처음엔 0개였다가 나중에 로드된 경우는 재빌드 허용
    var newSvCount=(svList||[]).length;
    if(_voiceListBuilt && newSvCount===0) return;  // 이미 빌드됐고 새 브라우저 목소리 없으면 스킵
    _voiceListBuilt=true;
    allVoices=[];
    var langBg={ko:'#7c3aed',en:'#059669',ja:'#b45309',zh:'#be123c',es:'#ea580c',fr:'#0284c7',de:'#374151',it:'#15803d',pt:'#15803d',hi:'#d97706',ru:'#dc2626',ar:'#065f46'};
    var svArr=svList||[];
    var koVoices=svArr.filter(function(sv){return sv.lang&&sv.lang.indexOf('ko')===0;});
    var enVoices=svArr.filter(function(sv){return sv.lang&&sv.lang.indexOf('en')===0;});
    var koBase=koVoices[0]||null;
    var enBase=enVoices[0]||null;
    var anyBase=koBase||enBase||(svArr.length?svArr[0]:null);

    // ── 1) Google Cloud TTS 목소리 (Neural2/WaveNet) — GOOGLE_TTS_KEY 환경변수 필요 ──
    GOOGLE_TTS_VOICES.forEach(function(gv){
      var langCode=gv.lang.slice(0,2);
      var fallbackSv=svArr.find(function(sv){return sv.lang&&sv.lang.indexOf(langCode)===0;})||anyBase||null;
      allVoices.push({
        name:gv.name, lang:gv.lang, gender:gv.gender||'neutral',
        pitch:1.0, rate:1.0,
        ico:gv.ico||'🎤', bg:gv.bg||'#1a1a2e',
        desc:gv.desc||'', special:null,
        gId:gv.gId,   // "gtts:ko-KR-Neural2-A" 형식 → 백엔드에서 Google TTS 엔진 사용
        gPitch:gv.gPitch||0, gRate:gv.gRate||1.0,
        isGoogleTTS:true,  // Google Cloud TTS 엔진 사용
        isHFTTS:false,
        sysVoice:fallbackSv
      });
    });

    // ── 2b) OpenAI TTS 목소리 — OpenAI_Text_to_speech 환경변수 필요 ──
    OPENAI_TTS_VOICES.forEach(function(ov){
      var fallbackSv=svArr.find(function(sv){return sv.lang&&sv.lang.indexOf('ko')===0;})||anyBase||null;
      allVoices.push({
        name:ov.name, lang:ov.lang, gender:ov.gender||'neutral',
        pitch:1.0, rate:1.0,
        ico:ov.ico||'🤖', bg:ov.bg||'#0ea5e9',
        desc:ov.desc||'', special:null,
        gId:ov.gId,   // "openai:alloy" 형식 → 백엔드에서 OpenAI TTS 엔진 사용
        gPitch:ov.gPitch||0, gRate:ov.gRate||1.0,
        isGoogleTTS:true,  // TTS API 사용 (동일한 경로)
        isHFTTS:false,
        isOpenAITTS:true,  // OpenAI 엔진 구분용
        sysVoice:fallbackSv
      });
    });

    // ── 2c) ElevenLabs TTS 목소리 — ElevenLabs_API_KEY 환경변수 필요 ──
    ELEVENLABS_TTS_VOICES.forEach(function(ev){
      var langCode=ev.lang.slice(0,2);
      var fallbackSv=svArr.find(function(sv){return sv.lang&&sv.lang.indexOf(langCode)===0;})||anyBase||null;
      allVoices.push({
        name:ev.name, lang:ev.lang, gender:ev.gender||'female',
        pitch:1.0, rate:1.0,
        ico:ev.ico||'🔊', bg:ev.bg||'#7c3aed',
        desc:ev.desc||'', special:null,
        gId:ev.gId,
        gPitch:ev.gPitch||0, gRate:ev.gRate||1.0,
        isGoogleTTS:true,
        isHFTTS:false,
        isOpenAITTS:false,
        isElevenLabsTTS:true,
        sysVoice:fallbackSv
      });
    });

    // ── 3) 정렬 ── OpenAI TTS 먼저, 그 다음 Google TTS 순
    allVoices.sort(function(a,b){
      var o=function(v){
        // OpenAI TTS 모델별 정렬: gpt-4o-mini-tts(최신) → tts-1-hd → tts-1
        if(v.isOpenAITTS){
          var gId=v.gId||'';
          if(gId.startsWith('openai:gpt-4o-mini-tts:')) return 1;  // gpt-4o-mini-tts 최신
          if(gId.startsWith('openai:tts-1-hd:')) return 2;         // tts-1-hd 고품질
          return 3;                                                  // tts-1 기본
        }
        if(v.isElevenLabsTTS) return 4;                                // ElevenLabs TTS
        if(v.isGoogleTTS&&!v.isHFTTS&&!v.isOpenAITTS) return 5;       // Google Cloud TTS
        if(v.lang.indexOf('ko')===0) return 6;
        if(v.lang.indexOf('en')===0) return 6;
        if(v.lang.indexOf('ja')===0) return 7;
        if(v.lang.indexOf('zh')===0) return 8;
        return 9;
      };
      var oa=o(a), ob=o(b);
      if(oa!==ob) return oa-ob;
      // 같은 그룹 내에서는 이름순 정렬
      return (a.name||'').localeCompare(b.name||'');
    });

    filteredVoices=allVoices.slice();
    var countEl=document.getElementById('voice-count-label')||document.getElementById('voice-count-lbl');
    if(countEl) countEl.textContent='('+allVoices.length+'개)';
    var infoEl=document.getElementById('voice-info-box');
    if(infoEl){
      var oaiCount=allVoices.filter(function(v){return !!v.isOpenAITTS;}).length;
      var gtCount=allVoices.filter(function(v){return v.isGoogleTTS&&!v.isHFTTS&&!v.isOpenAITTS;}).length;
      infoEl.textContent='✅ 총 '+allVoices.length+'개';
    }
    // ── buildVoiceList 재빌드 시 voiceIdx 재동기화 (gId 기반, 항상 실행) ──
    // 브라우저 목소리가 나중에 로드돼 재빌드되면 allVoices 순서가 바뀌어
    // S.voiceIdx 가 다른(브라우저) 목소리를 가리키는 버그 방지
    var _targetGId = S.voiceGId || 'openai:gpt-4o-mini-tts:echo';
    var _restoredIdx = allVoices.findIndex(function(v){ return v.gId === _targetGId; });
    if(_restoredIdx >= 0){
      S.voiceIdx = _restoredIdx;
    } else {
      // 타깃 gId 없으면 Echo 4o 기본
      var _echo4oIdx=allVoices.findIndex(function(v){ return v.gId==='openai:gpt-4o-mini-tts:echo'; });
      S.voiceIdx=_echo4oIdx>=0?_echo4oIdx:0;
      S.voiceGId=(allVoices[S.voiceIdx]&&allVoices[S.voiceIdx].gId)||'openai:gpt-4o-mini-tts:echo';
    }
    allVoices.__prevSelGId = S.voiceGId;
    renderVList(filteredVoices);
  }

  if(window.speechSynthesis){
    var svs=window.speechSynthesis.getVoices();
    if(svs&&svs.length>0){buildVoiceList(svs);}
    else{
      window.speechSynthesis.onvoiceschanged=function(){
        var svs2=window.speechSynthesis.getVoices()||[];
        if(svs2.length>0) buildVoiceList(svs2);  // 브라우저 목소리 로드됐을 때만 재빌드
      };
      setTimeout(function(){
        var svs2=window.speechSynthesis.getVoices()||[];
        buildVoiceList(svs2);  // 1.5초 후 브라우저 목소리 포함 빌드
      },1500);
      setTimeout(function(){
        // 3초 후에도 브라우저 목소리가 안 들어온 경우에만 재빌드 (중복 방지)
        var svs2=window.speechSynthesis.getVoices()||[];
        if(!_voiceListBuilt || svs2.length>0) buildVoiceList(svs2);
      },3000);
    }
  } else {
    buildVoiceList([]);
    var infoEl=document.getElementById('voice-info-box');
    if(infoEl) infoEl.textContent='⚠️ Chrome 브라우저를 사용해주세요. (Web Speech API 필요)';
  }
}

function renderVList(voices){
  var list=document.getElementById('v-list');
  if(!voices.length){list.innerHTML='<div style="text-align:center;padding:14px;color:#475569;font-size:11px">검색 결과 없음</div>';return;}
  var html='';
  var showLimit=300; // 200→300으로 늘려 OpenAI 목소리가 항상 표시되도록
  var lastGroupHeader=''; // 그룹 헤더 중복 방지
  voices.slice(0,showLimit).forEach(function(v){
    var ri=allVoices.indexOf(v);
    var isOn=ri===S.voiceIdx;
    var isSpecial=v.gender==='special';
    var isElevenLabsTTS=!!v.isElevenLabsTTS;                         // ElevenLabs TTS
    var isGoogleTTS=v.isGoogleTTS&&!v.isHFTTS&&!v.isOpenAITTS&&!v.isElevenLabsTTS;  // Google Cloud TTS
    var isHFTTS=!!v.isHFTTS;                                         // HuggingFace TTS
    var isOpenAITTS=!!v.isOpenAITTS;                                 // OpenAI TTS
    var isApiTTS=isGoogleTTS||isHFTTS||isOpenAITTS||isElevenLabsTTS; // API 호출 필요
    var borderColor=isElevenLabsTTS?'#7c3aed':isGoogleTTS?'#4ade80':isOpenAITTS?'#0ea5e9':isHFTTS?'#a78bfa':isSpecial?'#f59e0b':'transparent';
    var viCls='vi'+(isOn?' on':'')+(isSpecial||isApiTTS?' special-voice':'');

    // ── OpenAI 목소리: 모델별 그룹 헤더 표시 ──
    if(isOpenAITTS && v.gId){
      var gId=v.gId;
      var modelLabel='';
      if(gId.startsWith('openai:gpt-4o-mini-tts:')) modelLabel='🔥 gpt-4o-mini-tts (최신·자연스러운)';
      else if(gId.startsWith('openai:tts-1-hd:')) modelLabel='💎 tts-1-hd (고품질)';
      else if(gId.startsWith('openai:') && gId.split(':').length===2) modelLabel='⚡ tts-1 (빠름·기본)';
      if(modelLabel && modelLabel!==lastGroupHeader){
        lastGroupHeader=modelLabel;
        html+='<div style="padding:6px 10px 4px;font-size:10px;font-weight:800;color:#0ea5e9;letter-spacing:.3px;background:rgba(14,165,233,.07);border-radius:8px;margin:6px 0 3px">'+modelLabel+'</div>';
      }
    } else if(!isOpenAITTS && lastGroupHeader && lastGroupHeader!=='elevenlabs'){
      lastGroupHeader=''; // 비-OpenAI 섹션에서 헤더 리셋
    }
    // ── ElevenLabs 목소리: 그룹 헤더 표시 ──
    if(isElevenLabsTTS && lastGroupHeader!=='elevenlabs'){
      lastGroupHeader='elevenlabs';
      html+='<div style="padding:6px 10px 4px;font-size:10px;font-weight:800;color:#7c3aed;letter-spacing:.3px;background:rgba(124,58,237,.07);border-radius:8px;margin:6px 0 3px">🔊 ElevenLabs (하이엔드 AI 목소리)</div>';
    } else if(!isElevenLabsTTS && lastGroupHeader==='elevenlabs'){
      lastGroupHeader='';
    }

    html+='<div class="'+viCls+'" id="vi-'+ri+'" onclick="selectVoice('+ri+')" style="border-left:3px solid '+borderColor+';">';
    html+='<div class="vi-ico" style="background:'+(v.bg||'#2a2a35')+'">'+(v.ico||'🎤')+'</div>';
    html+='<div class="vi-info">';
    var badges='';
    if(isGoogleTTS)      badges+='<span style="font-size:9px;background:#4ade80;color:#000;padding:1px 4px;border-radius:3px;margin-right:4px">AI</span>';
    else if(isOpenAITTS) {
      // 모델명 배지 표시
      var modelBadge='OpenAI';
      if(v.gId&&v.gId.startsWith('openai:gpt-4o-mini-tts:')) modelBadge='4o-mini';
      else if(v.gId&&v.gId.startsWith('openai:tts-1-hd:')) modelBadge='tts-1-hd';
      else modelBadge='tts-1';
      badges+='<span style="font-size:9px;background:#0ea5e9;color:#fff;padding:1px 4px;border-radius:3px;margin-right:4px">'+modelBadge+'</span>';
    }
    else if(isElevenLabsTTS) badges+='<span style="font-size:9px;background:#7c3aed;color:#fff;padding:1px 4px;border-radius:3px;margin-right:4px">EL</span>';
    else if(isHFTTS)     badges+='<span style="font-size:9px;background:#a78bfa;color:#000;padding:1px 4px;border-radius:3px;margin-right:4px">AI</span>';
    else if(isSpecial)   badges+='<span style="font-size:9px;background:#f59e0b;color:#000;padding:1px 4px;border-radius:3px;margin-right:4px">특수</span>';
    html+='<div class="vi-name">'+badges+esc(v.name)+'</div>';
    var isParler=isHFTTS&&v.gId&&v.gId.startsWith('hf:');
    var metaType=isElevenLabsTTS?'고품질(ElevenLabs)':isGoogleTTS?'고품질':isOpenAITTS?'고품질(OpenAI)':isParler?'고품질':isHFTTS?'고품질':isSpecial?'특수효과':'기본';
    html+='<div class="vi-meta">'+esc(v.lang)+' · '+metaType+(v.desc?' · '+esc(v.desc):'')+'</div>';
    html+='</div>';
    var playBtnStyle=isElevenLabsTTS?'background:#7c3aed;color:#fff;':isGoogleTTS?'background:#4ade80;color:#000;':isOpenAITTS?'background:#0ea5e9;color:#fff;':isHFTTS?'background:#a78bfa;color:#000;':'';
    html+='<button class="vi-play" onclick="event.stopPropagation();testVoice('+ri+')" title="미리듣기 ▶" style="'+playBtnStyle+'">▶</button>';
    html+='</div>';
  });
  if(voices.length>showLimit) html+='<div style="text-align:center;padding:5px;color:#475569;font-size:9px">'+showLimit+'/'+voices.length+'개 표시 (검색으로 필터링)</div>';
  list.innerHTML=html;
}

function selectVoice(i){
  S.voiceIdx=i;
  // gId 저장 → buildVoiceList 재빌드 시 동일 목소리 복원
  if(allVoices[i] && allVoices[i].gId) {
    S.voiceGId = allVoices[i].gId;
    allVoices.__prevSelGId = allVoices[i].gId;
  }
  document.querySelectorAll('.vi').forEach(function(el){el.classList.remove('on');});
  var el=document.getElementById('vi-'+i);
  if(el){el.classList.add('on');el.scrollIntoView({block:'nearest'});}
}

// ══════════════════════════════════════════════════════════════
// HuggingFace MMS-TTS 호출 헬퍼 (구 googleTTS — 이름 유지)
// ══════════════════════════════════════════════════════════════
// TTS API 호출 헬퍼
// voice_id가 "gtts:..." → 백엔드에서 Google Cloud TTS (GOOGLE_TTS_KEY 필요)
// voice_id가 "ko-KR-f-1" 등 → 백엔드에서 HuggingFace MMS-TTS (HF_TOKEN 필요)
// ══════════════════════════════════════════════════════════════
function googleTTS(text, voiceId, gPitch, gRate, onAudio, onError){
  if(!text||!voiceId){if(onError)onError('텍스트 또는 voice_id 없음');return;}
  var speedEl=document.getElementById('vc-speed')||document.getElementById('v-speed');
  var pitchEl=document.getElementById('vc-pitch')||document.getElementById('v-pitch');
  var sliderSpeed=speedEl?parseFloat(speedEl.value)||1.0:1.0;
  var sliderPitch=pitchEl?parseFloat(pitchEl.value)||1.0:1.0;
  var finalPitch=Math.max(-20, Math.min(20, (gPitch||0) + (sliderPitch-1)*20));
  var finalRate=Math.max(0.25, Math.min(4.0, (gRate||1.0) * sliderSpeed));

  // voiceId 체계: "gtts:ko-KR-Neural2-A" → Google TTS, "openai:alloy" → OpenAI TTS, "el:VOICE_ID" → ElevenLabs, "hf:Jon" → parler-tts, "ko-KR-f-1" → MMS
  var isGoogleEngine=voiceId.startsWith('gtts:');
  var isOpenAIEngine=voiceId.startsWith('openai:');
  var isElevenLabsEngine=voiceId.startsWith('el:');
  var isHFEngine=voiceId.startsWith('hf:') || (!isGoogleEngine&&!isOpenAIEngine&&!isElevenLabsEngine);
  var maxLen=isGoogleEngine?5000:isOpenAIEngine?4096:isElevenLabsEngine?5000:500;

  var reqBody={text:text.slice(0,maxLen), voice_id:voiceId, pitch:finalPitch, speaking_rate:finalRate};
  console.log('[TTSv2] POST /api/tts/v2/speak', reqBody);

  fetch('/api/tts/v2/speak',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(reqBody)
  })
  .then(function(r){
    // ★ 실제 엔진 확인 — X-TTS-Engine: openai:gpt-4o-mini-tts:alloy 형식
    //                     X-TTS-Fallback: google  이면 폴백된 것
    var xEngine=r.headers.get('X-TTS-Engine')||r.headers.get('x-tts-engine')||'(없음)';
    var xFallback=r.headers.get('X-TTS-Fallback')||r.headers.get('x-tts-fallback')||null;
    console.log('[googleTTS] response status:', r.status, r.headers.get('content-type'),
      '| X-TTS-Engine:', xEngine,
      xFallback ? '⚠️ FALLBACK→'+xFallback : '');
    if(xFallback){
      console.warn('[googleTTS] ⚠️ 백엔드가 Google TTS로 폴백함! 원인:', r.headers.get('X-TTS-Original-Error')||'unknown');
    }
    if(!r.ok){
      // 서버가 돌려주는 전체 진단 정보를 콘솔에 풀로그로 찍어서 원인 파악을 쉽게 한다.
      return r.text().then(function(rawTxt){
        console.group('[googleTTS] ❌ 서버 오류 응답 전체');
        console.log('status:', r.status);
        console.log('content-type:', r.headers.get('content-type'));
        console.log('raw body:', rawTxt);
        try {
          var j = JSON.parse(rawTxt);
          console.log('parsed:', j);
          if(j.keyPreview) console.log('🔑 keyPreview:', j.keyPreview, '(length:', j.keyLength, ')');
          if(j.triedModels) console.log('🔁 triedModels:', j.triedModels);
          if(j.detail) console.log('📋 OpenAI detail:', j.detail);
          if(j.hint) console.log('💡 hint:', j.hint);
          console.groupEnd();
          throw new Error(j.error || ('TTS 오류 '+r.status));
        } catch(parseErr) {
          console.groupEnd();
          // 이미 throw 한 Error 를 그대로 전파
          if(parseErr instanceof Error && parseErr.message !== rawTxt) throw parseErr;
          throw new Error('TTS 오류 '+r.status+': '+rawTxt.slice(0,200));
        }
      });
    }
    // Google TTS → audio/mpeg, HF TTS → audio/flac 또는 audio/wav
    var ct=r.headers.get('content-type')||'';
    return r.arrayBuffer().then(function(buf){
      var mime='audio/mpeg';
      if(ct.indexOf('flac')>=0) mime='audio/flac';
      else if(ct.indexOf('wav')>=0) mime='audio/wav';
      else if(ct.indexOf('ogg')>=0) mime='audio/ogg';
      // ── MP3 매직 바이트 검증 ──────────────────────────────────────────
      // 서버가 200 OK + audio/mpeg 헤더를 반환해도 실제 바디가 JSON 에러일 수 있음.
      // 첫 4바이트로 유효성 확인: ID3 태그(0x49443300), FF FB/FA/F3/F2/FE(MP3 프레임), RIFF(WAV)
      var byteHead='(empty)';
      if(buf.byteLength>0){
        var hv=new Uint8Array(buf,0,Math.min(16,buf.byteLength));
        byteHead=Array.from(hv).map(function(b){return ('0'+b.toString(16).toUpperCase()).slice(-2);}).join(' ');
      }
      console.log('[googleTTS] audio received:', buf.byteLength, 'bytes, mime:', mime, '| head bytes:', byteHead);
      // JSON 에러 감지: 첫 바이트가 '{' (0x7B) 또는 '[' (0x5B) 이면 JSON 응답
      if(buf.byteLength>0){
        var firstByte=new Uint8Array(buf,0,1)[0];
        if(firstByte===0x7B||firstByte===0x5B){
          // 실제 바디를 텍스트로 읽어서 에러 메시지 추출
          try{
            var jsonStr=new TextDecoder().decode(buf);
            var jsonErr=JSON.parse(jsonStr);
            console.error('[googleTTS] ❌ 서버가 200 OK로 JSON 에러를 반환:', jsonErr);
            throw new Error(jsonErr.error||jsonErr.message||'서버 오류 (JSON body with audio/mpeg header)');
          }catch(je){
            if(je instanceof Error && je.message!=='') throw je;
            throw new Error('서버 응답이 오디오가 아닌 JSON입니다.');
          }
        }
        // MP3 / WAV / OGG 여부 확인 (경고 수준 — 재생 시도는 유지)
        var b0=new Uint8Array(buf,0,4);
        var isID3=(b0[0]===0x49&&b0[1]===0x44&&b0[2]===0x33); // "ID3"
        var isMpegFrame=(b0[0]===0xFF&&(b0[1]&0xE0)===0xE0);   // FF Ex/Fx
        var isRIFF=(b0[0]===0x52&&b0[1]===0x49&&b0[2]===0x46&&b0[3]===0x46); // "RIFF"
        var isOgg=(b0[0]===0x4F&&b0[1]===0x67&&b0[2]===0x67&&b0[3]===0x53);  // "OggS"
        if(!isID3&&!isMpegFrame&&!isRIFF&&!isOgg){
          console.warn('[googleTTS] ⚠️ 알 수 없는 오디오 포맷, 첫 4바이트:',
            '0x'+b0[0].toString(16),'0x'+b0[1].toString(16),'0x'+b0[2].toString(16),'0x'+b0[3].toString(16),
            '— 재생 시도는 계속합니다.');
        } else {
          console.log('[googleTTS] ✅ 오디오 포맷 확인:', isID3?'MP3(ID3)':isMpegFrame?'MP3(Frame)':isRIFF?'WAV/RIFF':isOgg?'OGG':'Unknown');
        }
      }
      return {buf:buf, mime:mime};
    });
  })
  .then(function(d){
    if(!d.buf || d.buf.byteLength===0){
      if(onError) onError('오디오 데이터가 비어 있습니다.');
      return;
    }
    // ── CSP 대응: blob URL 대신 Web Audio API(AudioContext)로 직접 재생 ──
    // 이유: wearesuperplace.com의 CSP "default-src 'self'"가 media-src를 상속받아
    //       blob: URL로 만든 <audio>.src 를 완전 차단함 → audio.onerror 발생
    // 해결: ArrayBuffer → AudioContext.decodeAudioData → BufferSource.start()
    //       AudioContext는 CSP media-src 정책을 우회하여 정상 재생됨
    //
    // ★ 중요: AudioContext는 play() 시점에 새로 생성해야 함.
    //   fetch + decodeAudioData 완료까지 수백ms~수초가 걸리므로,
    //   그 사이에 user gesture 컨텍스트가 만료되어 미리 만든 ctx는
    //   suspended 상태로 고정되고 resume()도 브라우저 정책에 의해 거부됨.
    //   → 디코딩은 임시 ctx로 수행, play()에서 새 ctx 생성 후 즉시 start().

    // Step 1: 임시 AudioContext로 디코딩만 수행 (user gesture 불필요)
    var _decodeCtx=null;
    var _decodedBuf=null;
    var _playCtx=null;   // play() 시점에 생성할 재생용 ctx
    var _src=null;
    var _ended=false;

    function _cleanupCtx(){
      if(_src){try{_src.stop();}catch(_){} _src=null;}
      if(_playCtx){try{_playCtx.close();}catch(_){} _playCtx=null;}
      if(_decodeCtx){try{_decodeCtx.close();}catch(_){} _decodeCtx=null;}
    }

    try{
      _decodeCtx=new(window.AudioContext||window.webkitAudioContext)();
    }catch(ctxErr){
      if(onError) onError('AudioContext 생성 실패: '+ctxErr);
      return;
    }

    // AudioBuffer 복제 후 디코딩 (decodeAudioData가 buf를 소비하므로)
    var copyBuf;
    try{ copyBuf=d.buf.slice(0); }catch(_){ copyBuf=d.buf; }

    var decodePromise;
    try{ decodePromise=_decodeCtx.decodeAudioData(copyBuf); }
    catch(syncErr){ decodePromise=Promise.reject(syncErr); }

    Promise.resolve(decodePromise).then(function(audioBuffer){
      // 디코딩 완료 후 임시 ctx 닫기 (리소스 해제)
      try{_decodeCtx.close();}catch(_){} _decodeCtx=null;
      _decodedBuf=audioBuffer;
      console.log('[googleTTS] ✅ AudioContext decode OK, duration:', audioBuffer.duration.toFixed(2)+'s');

      if(onAudio){
        // onAudio 콜백: audio 대신 AudioContext 제어 객체를 넘김
        // testVoice에서 audio.play() / audio.pause() / audio.onended 를 사용하므로
        // 동일 인터페이스를 가진 래퍼 객체를 만들어 전달
        var _wrapper={
          _isAudioCtxWrapper: true,
          _buf: audioBuffer,
          _blobUrl: null, // blob URL 없음
          duration: audioBuffer.duration,
          onended: null,
          onerror: null,
          pause: function(){
            if(_src){try{_src.stop();}catch(_){} _src=null;}
            if(_playCtx){try{_playCtx.close();}catch(_){} _playCtx=null;}
          },
          play: function(){
            // ★ play() 호출 시점 = 사용자 클릭 직후 → 여기서 새 AudioContext 생성
            // 이 시점은 user gesture 컨텍스트가 살아있으므로 running 상태로 생성됨
            if(_ended) return Promise.resolve();
            var self=this;
            try{
              if(_playCtx){try{_playCtx.close();}catch(_){}} // 이전 ctx 정리
              _playCtx=new(window.AudioContext||window.webkitAudioContext)();
            }catch(e){
              console.warn('[googleTTS] play() AudioContext 생성 실패:', e);
              return Promise.resolve();
            }
            console.log('[googleTTS] play() ctx.state=', _playCtx.state);
            function _doStart(){
              _src=_playCtx.createBufferSource();
              _src.buffer=audioBuffer;
              _src.connect(_playCtx.destination);
              _src.onended=function(){
                _ended=true;
                if(_playCtx){try{_playCtx.close();}catch(_){} _playCtx=null;}
                if(self.onended) self.onended();
              };
              _src.start(0);
              console.log('[googleTTS] ▶ start(0) called, ctx.state=', _playCtx.state);
            }
            if(_playCtx.state==='suspended'){
              return _playCtx.resume().then(function(){
                if(!_ended && _playCtx) _doStart();
              }).catch(function(e){
                console.warn('[googleTTS] resume 실패:', e);
                if(!_ended && _playCtx) _doStart();
              });
            }
            _doStart();
            return Promise.resolve();
          }
        };
        onAudio(_wrapper);
      } else {
        // onAudio 없으면 즉시 재생 (비동기 컨텍스트이므로 별도 ctx 생성)
        try{
          var _imCtx=new(window.AudioContext||window.webkitAudioContext)();
          var _imSrc=_imCtx.createBufferSource();
          _imSrc.buffer=audioBuffer;
          _imSrc.connect(_imCtx.destination);
          _imSrc.onended=function(){try{_imCtx.close();}catch(_){}};
          _imSrc.start(0);
        }catch(e){ console.warn('[googleTTS] 즉시재생 오류:', e); }
      }
    }).catch(function(decodeErr){
      console.warn('[googleTTS] AudioContext decode 실패:', decodeErr);
      _cleanupCtx();
      if(onError) onError('오디오 디코딩 실패: '+( decodeErr.message||String(decodeErr)));
    });
  })
  .catch(function(e){
    console.warn('[googleTTS] 오류:',e);
    if(onError) onError(e.message||String(e));
  });
}

// ── 목소리 효과 적용 헬퍼 (pitch/rate를 utter에 반영) ──
function applyVoiceEffect(utter, v){
  if(!v) return;
  var pitchEl=document.getElementById('vc-pitch')||document.getElementById('v-pitch');
  var speedEl=document.getElementById('vc-speed')||document.getElementById('v-speed');
  var sliderPitch=pitchEl?parseFloat(pitchEl.value):1.0;
  var sliderRate=speedEl?parseFloat(speedEl.value):1.0;

  if(v.special){
    // 특수 효과 목소리: VOICE_DEFS 값 우선 적용 (슬라이더로 미세 조정)
    var basePitch=v.pitch||1.0;
    var baseRate=v.rate||1.0;
    // 슬라이더가 기본값(1.0)에서 벗어나면 곱하기로 조정
    utter.pitch=Math.min(2.0, Math.max(0.1, basePitch*(sliderPitch!==1.0?sliderPitch:1.0)));
    utter.rate=Math.min(2.0, Math.max(0.1, baseRate*(sliderRate!==1.0?sliderRate:1.0)));
    // 특정 특수 효과 오버라이드
    switch(v.special){
      case 'shyagal':   utter.pitch=Math.min(2.0,2.0*(sliderPitch||1)); utter.rate=Math.min(2.0,1.9*(sliderRate||1)); break;
      case 'robot':     utter.pitch=0.5*(sliderPitch||1); utter.rate=0.85*(sliderRate||1); break;
      case 'villain':   utter.pitch=0.4*(sliderPitch||1); utter.rate=0.75*(sliderRate||1); break;
      case 'fairy':     utter.pitch=Math.min(2.0,2.0*(sliderPitch||1)); utter.rate=1.4*(sliderRate||1); break;
      case 'news':      utter.pitch=1.0*(sliderPitch||1); utter.rate=0.92*(sliderRate||1); break;
      case 'asmr':      utter.pitch=0.95*(sliderPitch||1); utter.rate=0.65*(sliderRate||1); break;
      case 'energy':    utter.pitch=Math.min(2.0,1.5*(sliderPitch||1)); utter.rate=Math.min(2.0,1.9*(sliderRate||1)); break;
      case 'narrator':  utter.pitch=0.85*(sliderPitch||1); utter.rate=0.88*(sliderRate||1); break;
      case 'child':     utter.pitch=Math.min(2.0,1.9*(sliderPitch||1)); utter.rate=1.2*(sliderRate||1); break;
      case 'grandpa':   utter.pitch=0.55*(sliderPitch||1); utter.rate=0.75*(sliderRate||1); break;
      case 'whisper':   utter.pitch=1.1*(sliderPitch||1); utter.rate=0.8*(sliderRate||1); break;
      case 'excited':   utter.pitch=Math.min(2.0,1.7*(sliderPitch||1)); utter.rate=Math.min(2.0,2.0*(sliderRate||1)); break;
      case 'comedian':  utter.pitch=Math.min(2.0,1.6*(sliderPitch||1)); utter.rate=1.3*(sliderRate||1); break;
      case 'horror':    utter.pitch=0.35*(sliderPitch||1); utter.rate=0.65*(sliderRate||1); break;
      case 'professor': utter.pitch=0.9*(sliderPitch||1); utter.rate=0.82*(sliderRate||1); break;
      case 'dramatic':  utter.pitch=1.3*(sliderPitch||1); utter.rate=0.78*(sliderRate||1); break;
      case 'singing':   utter.pitch=Math.min(2.0,1.8*(sliderPitch||1)); utter.rate=0.95*(sliderRate||1); break;
      case 'midnight':  utter.pitch=0.88*(sliderPitch||1); utter.rate=0.72*(sliderRate||1); break;
      case 'influencer':utter.pitch=Math.min(2.0,1.4*(sliderPitch||1)); utter.rate=Math.min(2.0,1.6*(sliderRate||1)); break;
      case 'coach':     utter.pitch=1.1*(sliderPitch||1); utter.rate=Math.min(2.0,1.5*(sliderRate||1)); break;
      case 'voiceactor':utter.pitch=1.0*(sliderPitch||1); utter.rate=0.95*(sliderRate||1); break;
      case 'sleepy':    utter.pitch=0.82*(sliderPitch||1); utter.rate=0.6*(sliderRate||1); break;
      case 'mystic':    utter.pitch=Math.min(2.0,1.55*(sliderPitch||1)); utter.rate=0.85*(sliderRate||1); break;
    }
    // 범위 클램핑
    utter.pitch=Math.min(2.0,Math.max(0.1,utter.pitch));
    utter.rate=Math.min(2.0,Math.max(0.1,utter.rate));
  } else {
    // 일반 목소리: VOICE_DEFS pitch/rate + 슬라이더 오버라이드
    utter.pitch=sliderPitch!==1.0?sliderPitch:(v.pitch||1.0);
    utter.rate=sliderRate!==1.0?sliderRate:(v.rate||1.0);
  }
}

// 특수 효과별 샘플 텍스트
var _SPECIAL_TEXTS={
  robot:'저는 로봇입니다. 삐빅. 명령을 수행합니다. 시스템 정상.',
  villain:'흠... 내 계획이 시작된다... 크크크. 아무도 막을 수 없어.',
  fairy:'안녕~ 나는 요정이야! 반짝반짝! 꿈이 이루어질 거야!',
  news:'안녕하십니까. 오늘의 주요 뉴스를 전해드립니다. 속보입니다.',
  asmr:'안녕하세요... 오늘도 편안한 하루 되세요... 천천히 쉬어가요...',
  energy:'지금 당장 시작하세요!! 파이팅!! 할 수 있어!! 포기하지 마!!',
  narrator:'그것은 아무도 예상하지 못했던 일이었습니다. 그 날 이후 모든 것이 바뀌었다.',
  child:'안녕하세요! 저 오늘 너무 신나요! 학교 가기 싫어요!',
  grandpa:'그래... 젊었을 때는 말이야... 참 좋은 시절이었지... 너희들은 몰라.',
  whisper:'잘 들어봐... 이건 비밀인데... 쉿... 아무한테도 말하지 마...',
  excited:'세상에!! 이게 가능하다고요?! 말도 안돼!! 완전 대박이에요!!',
  comedian:'어이쿠~ 이거 어떻게 된 거야~ 야 진짜~ 웃기지도 않아~ 하하하!',
  horror:'조심해... 뒤에 있어... 도망쳐... 너무 늦었어...',
  professor:'오늘은 이 개념에 대해 차근차근 설명해 드리겠습니다. 주목해 주시기 바랍니다.',
  dramatic:'믿을 수가 없어... 어떻게 이런 일이... 이건 운명이야... 흐느낌...',
  singing:'라라라~ 오늘도 행복해~ 노래를 불러요~ 즐거운 하루~',
  midnight:'깊은 밤... 홀로 남겨진 그대... 바람만이 속삭이네...',
  influencer:'여러분 안녕하세요! 오늘도 제 채널에 와주셔서 감사해요! 구독 눌러주세요!',
  coach:'자! 준비됐나요? 포기하면 안 돼요! 파이팅! 한 번 더! 할 수 있어요!',
  voiceactor:'그는 천천히 고개를 돌렸다. 그 눈빛에는 분노와 슬픔이 교차했다.',
  sleepy:'음... 오늘도... 피곤하네요... 잠깐 눈을... 좀... 감을게요...',
  mystic:'별들이 속삭인다... 운명의 실타래가... 풀리기 시작했다...'
};

function _getSampleText(v){
  var lang=v.lang||'ko-KR';
  if(v.special && _SPECIAL_TEXTS[v.special]) return _SPECIAL_TEXTS[v.special];
  if(lang.indexOf('ko')===0) return '안녕하세요! 저는 '+v.name.replace(/[\u{1F300}-\u{1F9FF}]/gu,'').trim()+' 입니다. 잘 부탁드립니다!';
  if(lang.indexOf('ja')===0) return 'こんにちは！私は'+v.name+'です。よろしくお願いします。';
  if(lang.indexOf('zh')===0) return '你好！我是AI语音助手，很高兴认识你。';
  if(lang.indexOf('es')===0) return '¡Hola! Me llamo '+v.name+'. Encantado!';
  if(lang.indexOf('fr')===0) return 'Bonjour! Je suis '+v.name+'. Comment allez-vous?';
  if(lang.indexOf('de')===0) return 'Hallo! Ich bin '+v.name+'. Wie geht es Ihnen?';
  if(lang.indexOf('it')===0) return 'Ciao! Sono '+v.name+'. Piacere di conoscerti!';
  if(lang.indexOf('pt')===0) return 'Olá! Eu sou '+v.name+'. Muito prazer!';
  return 'Hello! I am '+v.name+'. Nice to meet you!';
}

// ── TTS 상태 박스 헬퍼 ────────────────────────────────────────────────────────
// ※ 사용자 요청: 화면에 "목소리 재생 중", "재생이 안됨", "서비스 오류" 등이 뜨지 않도록
//   UI 출력은 완전히 제거하고 콘솔 로그만 남김. 상태 박스가 남아있으면 숨김 처리.
function addTTSLog(msg, color){
  console.log('[TTS]', msg);
  var box=document.getElementById('tts-status-box');
  if(box) box.style.display='none';
}
function clearTTSLog(){
  var box=document.getElementById('tts-status-box');
  if(box){box.style.display='none';box.innerHTML='';}
}

var curTestVoiceIdx=-1;
var _elTestAudio=null;

// 현재 테스트 오디오를 완전히 해제
function _stopTestAudio(){
  if(_elTestAudio){
    try{
      _elTestAudio.pause();
      // AudioContext 래퍼는 src 프로퍼티가 없음 — 일반 <audio>만 src='' 처리
      if(!_elTestAudio._isAudioCtxWrapper) _elTestAudio.src='';
      if(_elTestAudio._blobUrl){URL.revokeObjectURL(_elTestAudio._blobUrl);_elTestAudio._blobUrl=null;}
    }catch(e){}
    _elTestAudio=null;
  }
  try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}
}

function testVoice(i){
  var v=allVoices[i];
  if(!v) return;

  // ── 같은 버튼 재클릭 → 정지(토글) ──
  if(curTestVoiceIdx===i){
    _stopTestAudio();
    var prevBtn=document.querySelector('#vi-'+i+' .vi-play');
    if(prevBtn){prevBtn.textContent='▶';prevBtn.style.background='';prevBtn.style.color='';}
    clearTTSLog();
    curTestVoiceIdx=-1;
    return;
  }

  // ── 이전 재생 완전 중지 + 버튼 초기화 ──
  _stopTestAudio();
  if(curTestVoiceIdx>=0){
    var oldBtn=document.querySelector('#vi-'+curTestVoiceIdx+' .vi-play');
    if(oldBtn){oldBtn.textContent='▶';oldBtn.style.background='';oldBtn.style.color='';}
  }
  curTestVoiceIdx=i;

  var btn=document.querySelector('#vi-'+i+' .vi-play');
  var resetBtn=function(){
    if(btn){btn.textContent='▶';btn.style.background='';btn.style.color='';}
    if(curTestVoiceIdx===i) curTestVoiceIdx=-1;
  };

  if(btn){
    var btnBg=v.isOpenAITTS?'#0ea5e9':(v.isGoogleTTS&&!v.isHFTTS?'#4ade80':v.isHFTTS?'#a78bfa':'#7c3aed');
    var btnTxt=v.isOpenAITTS?'#fff':'#000';
    btn.textContent='⏹';btn.style.background=btnBg;btn.style.color=btnTxt;
  }

  var text=_getSampleText(v);

  // ── TTS API 목소리 (Google Cloud TTS / OpenAI TTS / HuggingFace TTS) ──
  if(v.isGoogleTTS && v.gId){
    var isParler=v.gId.startsWith('hf:');
    var isGoogle=v.gId.startsWith('gtts:');
    var isOpenAI=v.gId.startsWith('openai:');
    var engineLabel, engineColor, apiInfo;

    if(isOpenAI){
      engineLabel='OpenAI 음성';
      engineColor='#0ea5e9';
      apiInfo='';
    } else if(isGoogle){
      engineLabel='Google 음성';
      engineColor='#4ade80';
      apiInfo='';
    } else if(isParler){
      engineLabel='HF Parler 음성';
      engineColor='#a78bfa';
      apiInfo='';
    } else {
      engineLabel='HF MMS 음성';
      engineColor='#818cf8';
      apiInfo='';
    }

    addTTSLog('⏳ 음성 로딩 중...', engineColor);
    console.log('[TTS Test]', isOpenAI?'OpenAI TTS':isGoogle?'Google TTS':isParler?'HF Parler':'HF MMS', 'voice_id:', v.gId);

    googleTTS(text, v.gId, v.gPitch||0, v.gRate||1.0, function(audio){
      // 이미 다른 목소리가 선택됐으면 버림
      if(curTestVoiceIdx!==i){
        try{audio.pause();if(audio._blobUrl){URL.revokeObjectURL(audio._blobUrl);audio._blobUrl=null;}}catch(e){}
        return;
      }
      _elTestAudio=audio;
      addTTSLog('🔊 재생 중', engineColor);

      // ─── 이벤트 핸들러: onerror가 null로 초기화된 상태에서 깔끔하게 등록 ───
      audio.onended=function(){
        // AudioContext 래퍼: ctx는 래퍼 내부 onended에서 이미 close()됨
        if(audio._blobUrl){try{URL.revokeObjectURL(audio._blobUrl);}catch(_){} audio._blobUrl=null;}
        _elTestAudio=null;
        resetBtn();
        clearTTSLog();
      };
      // AudioContext 래퍼는 CSP 때문에 onerror가 발생하지 않으므로 등록만 해 둠
      audio.onerror=function(){
        if(audio._blobUrl){try{URL.revokeObjectURL(audio._blobUrl);}catch(_){} audio._blobUrl=null;}
        if(audio._isAudioCtxWrapper){try{audio.pause();}catch(_){}}
        _elTestAudio=null;
        resetBtn();
        addTTSLog('❌ 재생 오류가 발생했습니다.', '#ef4444');
      };

      // play() 호출 — 사용자 클릭 이벤트 직후이므로 autoplay 정책 통과
      var playPromise=audio.play();
      if(playPromise!==undefined){
        playPromise.catch(function(e){
          console.warn('[testVoice] play() rejected:', e);
          // NotAllowedError: autoplay 차단 → 사용자 안내
          if(e.name==='NotAllowedError'){
            addTTSLog('▶ 재생 버튼을 한 번 더 눌러주세요.', '#f59e0b');
          } else {
            addTTSLog('❌ 재생할 수 없습니다. ('+e.name+')', '#ef4444');
          }
          _elTestAudio=null;
          resetBtn();
        });
      }
    }, function(err){
      if(curTestVoiceIdx!==i) return; // 이미 다른 목소리로 넘어간 경우 무시
      resetBtn();
      console.warn('[TTS] error:', err);
      if(err && (err.indexOf('로딩')>=0 || err.indexOf('503')>=0)){
        addTTSLog('⏳ 음성 모델 준비 중... 20~30초 후 다시 눌러주세요', '#f59e0b');
        return;
      }
      if(err && (err.indexOf('미설정')>=0 || err.indexOf('401')>=0 || err.indexOf('403')>=0 || err.indexOf('API 키')>=0)){
        addTTSLog('❌ 서비스 오류가 발생했습니다.', '#ef4444');
        return;
      }
      // OpenAI / Google TTS 오류 → 폴백 없이 에러 표시
      // (isOpenAI/isGoogle은 위 gId 분기에서 이미 선언됨)
      if(isOpenAI){
        addTTSLog('❌ OpenAI 목소리 오류: '+(err||'알 수 없는 오류').slice(0,100), '#ef4444');
        return;
      }
      if(isGoogle){
        addTTSLog('❌ Google 목소리 오류: '+(err||'알 수 없는 오류').slice(0,100), '#ef4444');
        return;
      }
      // HF TTS 오류만 → Web Speech 폴백 (HF는 모델 로딩 실패 시 폴백이 자연스러움)
      addTTSLog('⚠️ AI 음성 실패 → 브라우저 기본 음성으로 재생 중...', '#f59e0b');
      setTimeout(function(){
        if(curTestVoiceIdx===i) _webSpeechTestVoice(v, text, btn, resetBtn);
      }, 150);
    });
    return;
  }

  // ── 브라우저 TTS (특수효과·일반 목소리) ──
  if(!window.speechSynthesis){
    addTTSLog('❌ 이 브라우저는 음성 합성을 지원하지 않습니다.', '#ef4444');
    resetBtn(); return;
  }
  addTTSLog('🔊 재생 중', '#94a3b8');
  setTimeout(function(){_webSpeechTestVoice(v, text, btn, resetBtn);}, 150);
}

function _webSpeechTestVoice(v, text, btn, resetBtn){
  var utter=new SpeechSynthesisUtterance(text);
  utter.lang=v.lang||'ko-KR';
  applyVoiceEffect(utter, v);
  var volEl=document.getElementById('vc-vol')||document.getElementById('v-vol');
  var userVol=volEl?parseFloat(volEl.value)||1:1;
  if(v.special==='asmr') utter.volume=Math.min(userVol,0.55);
  else if(v.special==='whisper') utter.volume=Math.min(userVol,0.38);
  else utter.volume=userVol;
  if(v.sysVoice){try{utter.voice=v.sysVoice;}catch(e){}}
  utter.onend=function(){if(resetBtn)resetBtn();clearTTSLog();};
  utter.onerror=function(e){if(resetBtn)resetBtn();var em=e.error||String(e);addTTSLog('❌ 음성 재생 오류','#ef4444');console.warn('TTS testVoice error:',em);};
  try{window.speechSynthesis.speak(utter);}
  catch(e){if(resetBtn)resetBtn();console.error('speak() failed:',e);}
}

function filterV(){var q=(document.getElementById('v-q')||document.getElementById('v-search')||{value:''}).value.toLowerCase();applyVFilter(curVTag,q);}
function filterVoiceBySearch(q){applyVFilter(curVTag,(q||'').toLowerCase());}
function filterVTag(tag,el){
  curVTag=tag;
  document.querySelectorAll('.vf').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  var q=(document.getElementById('v-q')||document.getElementById('v-search')||{value:''}).value.toLowerCase();
  applyVFilter(tag,q);
}
function applyVFilter(tag,q){
  filteredVoices=allVoices.filter(function(v){
    var gId=v.gId||'';
    var matchTag=tag==='all'
      ||(tag==='google'&&v.isGoogleTTS&&!v.isHFTTS&&!v.isOpenAITTS)  // Google Cloud TTS만
      ||(tag==='openai'&&v.isOpenAITTS)                                // OpenAI TTS 전체
      ||(tag==='openai-tts1'&&v.isOpenAITTS&&gId.startsWith('openai:')&&!gId.startsWith('openai:tts-1-hd:')&&!gId.startsWith('openai:gpt-4o-mini-tts:')&&gId.split(':').length===2) // tts-1 기본 모델만
      ||(tag==='openai-tts1hd'&&v.isOpenAITTS&&gId.startsWith('openai:tts-1-hd:'))  // tts-1-hd 모델만
      ||(tag==='openai-4omini'&&v.isOpenAITTS&&gId.startsWith('openai:gpt-4o-mini-tts:'))  // gpt-4o-mini-tts 모델만
      ||(tag==='elevenlabs'&&v.isElevenLabsTTS)                        // ElevenLabs TTS만
      ||(tag==='hf'&&v.isHFTTS)                                        // HuggingFace TTS만
      ||(tag==='api'&&(v.isGoogleTTS||v.isOpenAITTS||v.isElevenLabsTTS))  // API TTS 전체
      ||(tag==='special'&&(v.gender==='special'||v.special))
      ||(tag==='female'&&v.gender==='female')
      ||(tag==='male'&&v.gender==='male')
      ||(tag==='ko'&&v.lang.indexOf('ko')===0)
      ||(tag==='en'&&v.lang.indexOf('en')===0)
      ||(tag!=='all'&&tag!=='google'&&tag!=='openai'&&tag!=='openai-tts1'&&tag!=='openai-tts1hd'&&tag!=='openai-4omini'&&tag!=='elevenlabs'&&tag!=='hf'&&tag!=='api'&&tag!=='special'&&tag!=='female'&&tag!=='male'&&tag!=='ko'&&tag!=='en'&&v.lang.indexOf(tag)===0);
    var matchQ=!q||v.name.toLowerCase().indexOf(q)>=0||v.lang.toLowerCase().indexOf(q)>=0||(v.desc&&v.desc.toLowerCase().indexOf(q)>=0)||(v.special&&v.special.toLowerCase().indexOf(q)>=0)||(v.isGoogleTTS&&!v.isHFTTS&&!v.isOpenAITTS&&!v.isElevenLabsTTS&&'google'.indexOf(q)>=0)||(v.isOpenAITTS&&'openai'.indexOf(q)>=0)||(v.isElevenLabsTTS&&'elevenlabs el'.indexOf(q)>=0)||(v.isHFTTS&&'huggingface hf'.indexOf(q)>=0);
    return matchTag&&matchQ;
  });
  renderVList(filteredVoices);
}
// BGM 검색 (HTML에서 filterBGMBySearch 및 filterBTag 호출)
function filterBGMBySearch(q){applyBGMFilter(curBTag,(q||'').toLowerCase());}
function filterBTag(tag,el){
  curBTag=tag;
  document.querySelectorAll('.bf').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  var q=(document.getElementById('bgm-q')||document.getElementById('bgm-search')||{value:''}).value.toLowerCase();
  applyBGMFilter(tag,q);
}

var _speakCurSceneAudio=null;
function speakCurScene(){
  var sc=S.scenes[curScene];if(!sc) return;
  var v=getCurVoice();
  // ★ 대본분리 씬은 sc.text=내용, sc.title='' → sc.text 우선
  var text=(sc.text||sc.title||'').trim();
  if(!text){
    showToast('씬에 텍스트가 없습니다. 대본을 먼저 입력해주세요.');
    return;
  }

  // 이전 재생 중지
  if(_speakCurSceneAudio){
    try{
      _speakCurSceneAudio.pause();
      if(_speakCurSceneAudio._blobUrl){URL.revokeObjectURL(_speakCurSceneAudio._blobUrl);_speakCurSceneAudio._blobUrl=null;}
      _speakCurSceneAudio=null;
    }catch(e){}
  }
  try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}

  // ── TTS API 음성 (Google Cloud TTS / OpenAI TTS / HuggingFace TTS): API 호출 ──
  if(v&&v.isGoogleTTS&&v.gId){
    var isGE=v.gId.startsWith('gtts:');
    var isOAI=v.gId.startsWith('openai:');
    var maxL=isGE?5000:isOAI?4096:500;
    googleTTS(text.slice(0,maxL), v.gId, v.gPitch||0, v.gRate||1.0, function(audio){
      _speakCurSceneAudio=audio;
      audio.play().catch(function(e){console.warn('speakCurScene TTS play:',e);});
    }, function(err){
      console.warn('speakCurScene TTS error:',err);
      if(isOAI){
        // OpenAI TTS 오류: 토스트로 사용자에게 명확히 안내
        var msg='❌ OpenAI 목소리 오류';
        if(err&&(err.indexOf('미설정')>=0||err.indexOf('API 키')>=0)){
          msg='⚠️ OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.';
        } else if(err&&(err.indexOf('401')>=0||err.indexOf('403')>=0||err.indexOf('Unauthorized')>=0)){
          msg='⚠️ OpenAI API 키 권한 오류. 유효한 키인지 확인하세요.';
        } else if(err&&(err.indexOf('429')>=0||err.indexOf('rate')>=0)){
          msg='⚠️ OpenAI API 한도 초과. 잠시 후 다시 시도하세요.';
        } else if(err){
          msg='❌ 목소리 오류: '+err.slice(0,80);
        }
        showToast(msg, 3500);
        addLog(msg);
        return;
      }
      // 모델 로딩 중이면 사용자 알림
      if(err&&err.indexOf('로딩')>=0){
        addLog('⏳ '+err);
        return; // 폴백 없이 대기
      }
      addLog('⚠️ 음성 로딩 실패, 대체 목소리 사용');
      setTimeout(function(){_webSpeakText(text, v);}, 150);
    });
    return;
  }

  // ── 일반 목소리: Web Speech API ──
  setTimeout(function(){_webSpeakText(text, v);}, 150);
}

// ── Web Speech API 목소리 준비 헬퍼 (목소리 로드 대기) ──
function _getReadyVoice(lang, sysVoice, cb){
  var svs=window.speechSynthesis.getVoices()||[];
  if(svs.length>0){
    // 이미 로드됨
    var matched=null;
    if(sysVoice) matched=sysVoice;
    if(!matched){
      // lang 코드로 탐색
      matched=svs.find(function(sv){return sv.lang&&sv.lang===lang;})
        ||svs.find(function(sv){return sv.lang&&sv.lang.indexOf((lang||'ko').slice(0,2))===0;});
    }
    cb(matched);
    return;
  }
  // 아직 로드 안 됨 → onvoiceschanged 대기 (최대 3초)
  var done=false;
  var timer=setTimeout(function(){if(!done){done=true;cb(sysVoice);}},3000);
  window.speechSynthesis.onvoiceschanged=function(){
    if(done) return;
    done=true; clearTimeout(timer);
    var svs2=window.speechSynthesis.getVoices()||[];
    var matched2=sysVoice
      ||svs2.find(function(sv){return sv.lang&&sv.lang===lang;})
      ||svs2.find(function(sv){return sv.lang&&sv.lang.indexOf((lang||'ko').slice(0,2))===0;});
    cb(matched2);
  };
}

function _webSpeakText(text, v){
  if(!window.speechSynthesis) return;
  var lang=v?v.lang||'ko-KR':'ko-KR';
  var volEl=document.getElementById('vc-vol')||document.getElementById('v-vol');
  var vol=volEl?parseFloat(volEl.value)||1:1;
  _getReadyVoice(lang, v&&v.sysVoice||null, function(voice){
    try{window.speechSynthesis.cancel();}catch(e){}
    setTimeout(function(){
      var utter=new SpeechSynthesisUtterance(text);
      utter.lang=lang;
      applyVoiceEffect(utter, v);
      if(v&&v.special==='asmr') utter.volume=Math.min(vol,0.55);
      else if(v&&v.special==='whisper') utter.volume=Math.min(vol,0.38);
      else utter.volume=Math.min(Math.max(vol||1,0.1),1.0);
      if(voice){try{utter.voice=voice;}catch(e){}}
      try{window.speechSynthesis.speak(utter);}catch(e){console.warn('speakCurScene error:',e);}
    },80);
  });
}

// ══════════════════════════════════════════════════════════════
//  BGM
// ══════════════════════════════════════════════════════════════

// ── BGM 탭 전환 ──
var _bgmTab='local';
function switchBGMTab(tab){
  _bgmTab=tab;
  var localPanel=document.getElementById('bgm-local-panel');
  var pixabayPanel=document.getElementById('bgm-pixabay-panel');
  var btnLocal=document.getElementById('bgm-tab-local');
  var btnPixabay=document.getElementById('bgm-tab-pixabay');
  if(tab==='pixabay'){
    if(localPanel) localPanel.style.display='none';
    if(pixabayPanel) pixabayPanel.style.display='block';
    if(btnLocal){btnLocal.style.background='var(--bg)';btnLocal.style.color='var(--text2)';btnLocal.style.borderColor='var(--border)';}
    if(btnPixabay){btnPixabay.style.background='var(--primary)';btnPixabay.style.color='#fff';btnPixabay.style.borderColor='var(--primary)';}
  } else {
    if(localPanel) localPanel.style.display='block';
    if(pixabayPanel) pixabayPanel.style.display='none';
    if(btnLocal){btnLocal.style.background='var(--primary)';btnLocal.style.color='#fff';btnLocal.style.borderColor='var(--primary)';}
    if(btnPixabay){btnPixabay.style.background='var(--bg)';btnPixabay.style.color='var(--text2)';btnPixabay.style.borderColor='var(--border)';}
  }
}

// ── Pixabay BGM 검색 ──
var _pixabayBGMPage=1;
var _pixabayBGMQ='';
var _pixabayBGMTotal=0;
var _pixabayBGMItems=[];

function pixabayBGMQuick(q){
  var inp=document.getElementById('pixabay-bgm-q');
  if(inp) inp.value=q;
  _pixabayBGMQ=q;
  _pixabayBGMPage=1;
  _pixabayBGMItems=[];
  _doPixabayBGMSearch();
}

function searchPixabayBGM(){
  var inp=document.getElementById('pixabay-bgm-q');
  _pixabayBGMQ=(inp?inp.value.trim():'')||'background music';
  _pixabayBGMPage=1;
  _pixabayBGMItems=[];
  _doPixabayBGMSearch();
}

function searchPixabayBGMMore(){
  _pixabayBGMPage++;
  _doPixabayBGMSearch(true);
}

function _doPixabayBGMSearch(append){
  var listEl=document.getElementById('pixabay-bgm-list');
  if(!append && listEl) listEl.innerHTML='<div style="text-align:center;padding:16px;color:var(--text4);font-size:11px">검색 중...</div>';
  fetch('/api/bgm/search?q='+encodeURIComponent(_pixabayBGMQ||'background music')+'&page='+_pixabayBGMPage+'&per_page=20&order=popular')
    .then(function(r){return r.json();})
    .then(function(data){
      if(!data.ok){
        if(listEl) listEl.innerHTML='<div style="text-align:center;padding:12px;color:#ef4444;font-size:10px">검색 실패: '+(data.error||'오류')+'</div>';
        return;
      }
      _pixabayBGMTotal=data.total||0;
      if(append){
        _pixabayBGMItems=_pixabayBGMItems.concat(data.items||[]);
      } else {
        _pixabayBGMItems=data.items||[];
      }
      _renderPixabayBGMList();
    })
    .catch(function(e){
      if(listEl) listEl.innerHTML='<div style="text-align:center;padding:12px;color:#ef4444;font-size:10px">네트워크 오류</div>';
    });
}

function _renderPixabayBGMList(){
  var listEl=document.getElementById('pixabay-bgm-list');
  var moreEl=document.getElementById('pixabay-bgm-more');
  if(!listEl) return;
  if(!_pixabayBGMItems.length){
    listEl.innerHTML='<div style="text-align:center;padding:12px;color:var(--text4);font-size:10px">결과 없음</div>';
    if(moreEl) moreEl.style.display='none';
    return;
  }
  var html='';
  _pixabayBGMItems.forEach(function(item,idx){
    var dur=item.duration?Math.floor(item.duration/60)+':'+String(item.duration%60).padStart(2,'0'):'--:--';
    html+='<div style="display:flex;align-items:center;gap:7px;padding:7px 8px;border-radius:8px;margin-bottom:3px;background:var(--bg2);cursor:pointer" onclick="selectPixabayBGM('+idx+')" id="pbgi-'+idx+'">';
    html+='<div style="font-size:16px">🎵</div>';
    html+='<div style="flex:1;min-width:0"><div style="font-size:10px;font-weight:700;color:var(--text1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(item.title)+'</div>';
    html+='<div style="font-size:9px;color:var(--text4)">'+esc(item.artist)+' · '+dur+'</div></div>';
    html+='<button onclick="event.stopPropagation();previewPixabayBGM('+idx+')" style="padding:4px 8px;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:10px;cursor:pointer" id="pbgbtn-'+idx+'">▶</button>';
    html+='</div>';
  });
  listEl.innerHTML=html;
  if(moreEl) moreEl.style.display=(_pixabayBGMItems.length<_pixabayBGMTotal)?'block':'none';
}

var _pbgPlayingIdx=-1;
var _pbgAudioCtx=null;
var _pbgSourceNode=null;

function previewPixabayBGM(idx){
  if(_pbgPlayingIdx===idx){
    _stopPixabayBGMPreview();
    return;
  }
  _stopPixabayBGMPreview();
  var item=_pixabayBGMItems[idx];
  if(!item||!item.url) return;
  _pbgPlayingIdx=idx;
  var btn=document.getElementById('pbgbtn-'+idx);
  if(btn){btn.textContent='⏹';btn.style.background='#ef4444';}

  var proxyUrl='/api/audio-proxy?url='+encodeURIComponent(item.url);
  _pbgAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(_pbgAudioCtx.state==='suspended') _pbgAudioCtx.resume();
  var capturedIdx=idx;
  var localCtx=_pbgAudioCtx;

  fetch(proxyUrl)
    .then(function(r){if(!r.ok) throw new Error('HTTP '+r.status);return r.arrayBuffer();})
    .then(function(buf){if(_pbgPlayingIdx!==capturedIdx){try{localCtx.close();}catch(e){}return;} return localCtx.decodeAudioData(buf);})
    .then(function(decoded){
      if(!decoded||_pbgPlayingIdx!==capturedIdx){try{localCtx.close();}catch(e){}return;}
      var gain=localCtx.createGain();
      gain.gain.value=Math.min(Math.max(bgmVol||0.3,0.1),1);
      gain.connect(localCtx.destination);
      var src=localCtx.createBufferSource();
      src.buffer=decoded;
      src.connect(gain);
      src.start(0);
      _pbgSourceNode=src;
      src.onended=function(){if(_pbgPlayingIdx===capturedIdx) _stopPixabayBGMPreview();};
      setTimeout(function(){if(_pbgPlayingIdx===capturedIdx) _stopPixabayBGMPreview();},30000);
    })
    .catch(function(e){
      console.warn('Pixabay BGM preview error:',e);
      _stopPixabayBGMPreview();
    });
}

function _stopPixabayBGMPreview(){
  if(_pbgSourceNode){try{_pbgSourceNode.stop();}catch(e){} _pbgSourceNode=null;}
  if(_pbgAudioCtx){try{_pbgAudioCtx.close();}catch(e){} _pbgAudioCtx=null;}
  if(_pbgPlayingIdx>=0){
    var btn=document.getElementById('pbgbtn-'+_pbgPlayingIdx);
    if(btn){btn.textContent='▶';btn.style.background='var(--primary)';}
  }
  _pbgPlayingIdx=-1;
}

function selectPixabayBGM(idx){
  var item=_pixabayBGMItems[idx];
  if(!item||!item.url) return;
  // BGM_DATA에 동적으로 추가 (중복 방지)
  var proxyUrl='/api/audio-proxy?url='+encodeURIComponent(item.url);
  var existing=-1;
  for(var i=0;i<BGM_DATA.length;i++){
    if(BGM_DATA[i].url&&BGM_DATA[i].url===item.url) {existing=i;break;}
  }
  var newIdx=existing;
  if(existing<0){
    BGM_DATA.push({n:'[P] '+item.title,t:'pixabay',icon:'🎵',bpm:0,url:item.url,_artist:item.artist,_dur:item.duration});
    newIdx=BGM_DATA.length-1;
  }
  selectBGM(newIdx);
  // 선택 시각 피드백
  document.querySelectorAll('[id^="pbgi-"]').forEach(function(el){el.style.background='var(--bg2)';el.style.outline='';});
  var el=document.getElementById('pbgi-'+idx);
  if(el){el.style.background='#dcfce7';el.style.outline='2px solid #22c55e';}
}

function loadBGMList(){filteredBGM=BGM_DATA.slice();renderBGMList(filteredBGM);}
function renderBGMList(list){
  var el=document.getElementById('bgm-list');
  if(!list.length){el.innerHTML='<div style="text-align:center;padding:12px;color:#475569;font-size:10px">없음</div>';return;}
  var html='';
  list.slice(0,150).forEach(function(b){
    var ri=BGM_DATA.indexOf(b);
    var biCls='bi'+(ri===S.bgmIdx?' on':'');
    html+='<div class="'+biCls+'" id="bi-'+ri+'" onclick="selectBGM('+ri+')">';
    html+='<div class="bi-ico">'+(b.icon||'🎵')+'</div>';
    html+='<div class="bi-info"><div class="bi-name">'+esc(b.n)+(b.url?' <span style="font-size:9px;background:#dcfce7;color:#166534;border-radius:3px;padding:1px 4px;vertical-align:middle">실제음악</span>':'')+'</div>';
    html+='<div class="bi-meta">'+(b.bpm>0?b.bpm+'BPM · ':'')+b.t.split(',')[0]+'</div></div>';
    html+='<button class="bi-play" onclick="event.stopPropagation();previewBGM('+ri+')" title="미리듣기">▶</button>';
    html+='</div>';
  });
  if(list.length>150) html+='<div style="text-align:center;padding:5px;color:#475569;font-size:9px">'+list.length+'곡 중 150곡 표시</div>';
  el.innerHTML=html;
}
function selectBGM(i){
  S.bgmIdx=i;
  document.querySelectorAll('.bi').forEach(function(el){el.classList.remove('on');});
  var el=document.getElementById('bi-'+i);
  if(el){el.classList.add('on');el.scrollIntoView({block:'nearest'});}
}
function filterBGM(){var q=document.getElementById('bgm-q').value.toLowerCase();applyBGMFilter(curBTag,q);}
function filterBGMTag(tag,el){
  curBTag=tag;
  document.querySelectorAll('.bf').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  applyBGMFilter(tag,document.getElementById('bgm-q').value.toLowerCase());
}
function applyBGMFilter(tag,q){
  filteredBGM=BGM_DATA.filter(function(b){
    var matchTag=tag==='all'||b.t.indexOf(tag)>=0||b.n.toLowerCase().indexOf(tag)>=0;
    var matchQ=!q||b.n.toLowerCase().indexOf(q)>=0||b.t.indexOf(q)>=0;
    return matchTag&&matchQ;
  });
  renderBGMList(filteredBGM);
}
var bgmPreviewNode=null;
var bgmPreviewCtx=null;
var bgmPreviewAudio=null;
var _bgmPlayingIdx=-1;          // 현재 재생 중인 BGM 인덱스 (-1=정지)
var _bgmStopTimer=null;         // 자동 정지 타이머

// ── BGM 버튼 상태 업데이트 헬퍼
function _updateBgmBtnState(idx, playing){
  // 모든 버튼 ▶ 로 초기화
  document.querySelectorAll('.bi-play').forEach(function(btn){
    btn.textContent='▶';
    btn.style.background='';
    btn.style.color='';
    btn.title='미리듣기';
  });
  if(playing && idx>=0){
    var btn=document.querySelector('#bi-'+idx+' .bi-play');
    if(btn){
      btn.textContent='⏹';
      btn.style.background='var(--primary)';
      btn.style.color='#fff';
      btn.title='정지';
    }
  }
}

function previewBGM(i){
  // 같은 곡 다시 누르면 정지
  if(_bgmPlayingIdx===i){
    stopBGMPreview();
    return;
  }
  stopBGMPreview();
  if(BGM_DATA[i]&&BGM_DATA[i].t==='none') return;
  var b=BGM_DATA[i];
  _bgmPlayingIdx=i;
  _updateBgmBtnState(i, true);

  // 자동 정지 타이머 공통 설정
  function _setAutoStop(ms){
    if(_bgmStopTimer) clearTimeout(_bgmStopTimer);
    _bgmStopTimer=setTimeout(function(){stopBGMPreview();},ms);
  }

  try{
    // ── URL 기반 실제 음악: proxy → AudioContext 디코딩 → 재생
    if(b&&b.url){
      var proxyUrl='/api/audio-proxy?url='+encodeURIComponent(b.url);
      bgmPreviewCtx=new(window.AudioContext||window.webkitAudioContext)();
      if(bgmPreviewCtx.state==='suspended') bgmPreviewCtx.resume();
      var localCtx=bgmPreviewCtx;
      var capturedIdx=i;

      fetch(proxyUrl)
        .then(function(r){
          if(!r.ok) throw new Error('HTTP '+r.status);
          return r.arrayBuffer();
        })
        .then(function(buf){
          // 이미 다른 곡으로 바뀌었으면 취소
          if(_bgmPlayingIdx!==capturedIdx){try{localCtx.close();}catch(ex){}return;}
          return localCtx.decodeAudioData(buf);
        })
        .then(function(decoded){
          if(!decoded) return;
          if(_bgmPlayingIdx!==capturedIdx){try{localCtx.close();}catch(ex){}return;}

          var gainNode=localCtx.createGain();
          gainNode.gain.value=Math.min(Math.max(bgmVol,0.15),1);
          gainNode.connect(localCtx.destination);

          var src=localCtx.createBufferSource();
          src.buffer=decoded;
          src.loop=false;
          src.connect(gainNode);
          src.start(0);
          src.onended=function(){
            if(_bgmPlayingIdx===capturedIdx) stopBGMPreview();
          };

          bgmPreviewNode={stop:function(){
            try{src.stop();}catch(ex){}
            try{localCtx.close();}catch(ex){}
            bgmPreviewCtx=null;
          }};
          // 최대 30초 재생
          _setAutoStop(Math.min(decoded.duration*1000, 30000));
        })
        .catch(function(e){
          console.warn('BGM proxy 실패, Audio fallback:', e);
          if(bgmPreviewCtx){try{bgmPreviewCtx.close();}catch(ex){}bgmPreviewCtx=null;}
          if(_bgmPlayingIdx!==capturedIdx) return;
          // fallback: <audio> 직접 재생
          bgmPreviewAudio=new Audio();
          bgmPreviewAudio.src=b.url;
          bgmPreviewAudio.volume=Math.min(Math.max(bgmVol,0.15),1);
          bgmPreviewAudio.onended=function(){if(_bgmPlayingIdx===capturedIdx) stopBGMPreview();};
          bgmPreviewAudio.onerror=function(){
            console.warn('BGM Audio fallback 오류');
            if(_bgmPlayingIdx===capturedIdx) stopBGMPreview();
          };
          bgmPreviewAudio.play().catch(function(e2){
            console.warn('BGM play() 실패:', e2);
            if(_bgmPlayingIdx===capturedIdx) stopBGMPreview();
          });
          bgmPreviewNode={stop:function(){
            if(bgmPreviewAudio){try{bgmPreviewAudio.pause();bgmPreviewAudio.src='';}catch(ex){}bgmPreviewAudio=null;}
          }};
          _setAutoStop(30000);
        });
      return;
    }

    // ── 합성 BGM: AudioContext 패턴 재생
    bgmPreviewCtx=new(window.AudioContext||window.webkitAudioContext)();
    if(bgmPreviewCtx.state==='suspended') bgmPreviewCtx.resume();
    playBGMPattern(bgmPreviewCtx,bgmPreviewCtx.destination,b,6,bgmVol);
    bgmPreviewNode={stop:function(){if(bgmPreviewCtx){try{bgmPreviewCtx.close();}catch(e){}bgmPreviewCtx=null;}}};
    _setAutoStop(6000);

  }catch(e){
    console.warn('BGM 미리듣기 오류:', e.message);
    stopBGMPreview();
  }
}

function stopBGMPreview(){
  if(_bgmStopTimer){clearTimeout(_bgmStopTimer);_bgmStopTimer=null;}
  _updateBgmBtnState(-1, false);
  _bgmPlayingIdx=-1;
  if(bgmPreviewNode){try{bgmPreviewNode.stop();}catch(e){}bgmPreviewNode=null;}
  if(bgmPreviewAudio){try{bgmPreviewAudio.pause();bgmPreviewAudio.src='';}catch(e){}bgmPreviewAudio=null;}
  if(bgmPreviewCtx){try{bgmPreviewCtx.close();}catch(e){}bgmPreviewCtx=null;}
}

// ══════════════════════════════════════════════════════════════
//  PREVIEW PLAYBACK
// ══════════════════════════════════════════════════════════════
function togglePlayPreview(){if(previewPlaying)stopPreview();else startPreview();}
function startPreview(){
  // 이전 미리보기 완전 정리
  stopPreview();
  previewPlaying=true;
  previewStopped=false;
  previewSceneIdx=0;
  document.getElementById('play-prev-btn').textContent='⏹ 정지';

  // ── 미리보기 BGM ──
  try{
    if(previewBGMCtx){try{previewBGMCtx.close();}catch(e){}previewBGMCtx=null;}
    if(previewBGMAudio){try{previewBGMAudio.pause();previewBGMAudio.src='';}catch(e){}previewBGMAudio=null;}
    var bgmData=BGM_DATA[S.bgmIdx];
    if(bgmData&&bgmData.t!=='none'){
      if(bgmData.url){
        // 실제 음악 파일: proxy를 통해 AudioContext로 재생 (CORS 우회)
        var prevProxyUrl='/api/audio-proxy?url='+encodeURIComponent(bgmData.url);
        previewBGMCtx=new(window.AudioContext||window.webkitAudioContext)();
        if(previewBGMCtx.state==='suspended') previewBGMCtx.resume().catch(function(){});
        var _pvCtx=previewBGMCtx;
        var _pvGain=_pvCtx.createGain();
        _pvGain.gain.value=Math.min(Math.max(bgmVol*0.5,0),1);
        _pvGain.connect(_pvCtx.destination);
        fetch(prevProxyUrl)
          .then(function(r){if(!r.ok) throw new Error('proxy '+r.status); return r.arrayBuffer();})
          .then(function(buf){return _pvCtx.decodeAudioData(buf);})
          .then(function(decoded){
            if(!previewBGMCtx) return;
            var src=_pvCtx.createBufferSource();
            src.buffer=decoded; src.loop=true;
            src.connect(_pvGain); src.start(0);
          })
          .catch(function(e){
            console.warn('미리보기 BGM proxy 실패, Audio fallback:',e);
            if(previewBGMCtx){try{previewBGMCtx.close();}catch(ex){}previewBGMCtx=null;}
            previewBGMAudio=new Audio();
            previewBGMAudio.src=bgmData.url;
            previewBGMAudio.loop=true;
            previewBGMAudio.volume=Math.min(Math.max(bgmVol*0.5,0),1);
            previewBGMAudio.play().catch(function(e2){console.warn('미리보기 BGM fallback 오류:',e2);});
          });
      } else {
        previewBGMCtx=new(window.AudioContext||window.webkitAudioContext)();
        if(previewBGMCtx.state==='suspended') previewBGMCtx.resume().catch(function(){});
        var totalDurSec=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
        playBGMPattern(previewBGMCtx,previewBGMCtx.destination,bgmData,totalDurSec,bgmVol*0.5);
      }
    }
  }catch(e){console.warn('미리보기 BGM 오류:',e);}

  // ── TTS 재생 ──
  setTimeout(function(){
    if(!previewStopped) playTTSLive();
  }, 200);

  // ── 씬 애니메이션 (TTS 기반 동기화) ──
  // OpenAI TTS는 API 응답 후 재생 → onended 시 ttsLiveIdx 증가
  // 씬은 오직 ttsLiveIdx 변화에만 따라감 (타이머 fallback 제거 → 씬/대본 어긋남 방지)
  var scIdx=0,frame=0,fps=30;
  var scFrames=Math.max(3,((S.scenes[0]||{}).dur||5))*fps;
  var lastTTSIdx=-1;
  var v_preview=getCurVoice();
  var isApiVoice=v_preview&&v_preview.isGoogleTTS&&v_preview.gId;  // Google/OpenAI/HF TTS API 목소리
  function tick(){
    if(!previewPlaying) return;

    // TTS 씬 인덱스와 동기화: ttsLiveIdx가 바뀌면 즉시 씬 전환
    if(ttsLiveIdx!==lastTTSIdx && ttsLiveIdx<S.scenes.length){
      scIdx=ttsLiveIdx;
      curScene=scIdx;
      frame=0;
      scFrames=Math.max(3,((S.scenes[scIdx]||{}).dur||5))*fps;
      renderSceneNav();
    }
    lastTTSIdx=ttsLiveIdx;

    var prog=scFrames>0?frame/scFrames:1;
    drawScene(scIdx,Math.min(prog,1));
    frame++;

    // 타이머 fallback: API TTS 목소리는 타이머로 씬 넘기지 않음 (오디오 onended가 제어)
    // 브라우저 Web Speech API 목소리만 타이머 fallback 허용
    if(!isApiVoice && frame>=scFrames){
      frame=0;
      scIdx=(scIdx+1)%S.scenes.length;
      curScene=scIdx;
      scFrames=Math.max(3,((S.scenes[scIdx]||{}).dur||5))*fps;
      renderSceneNav();
    }
    previewRAF=requestAnimationFrame(tick);
  }
  previewRAF=requestAnimationFrame(tick);
}

function stopPreview(){
  previewPlaying=false;
  previewStopped=true;
  if(previewRAF){cancelAnimationFrame(previewRAF);previewRAF=null;}

  // TTS 즉시 중지
  ttsLiveIdx=9999; // speakNextGT/speakNext 루프 차단
  if(_ttsLiveAudio){
    try{_ttsLiveAudio.pause();_ttsLiveAudio.src='';_ttsLiveAudio=null;}catch(e){_ttsLiveAudio=null;}
  }
  try{if(window.speechSynthesis){window.speechSynthesis.cancel();}}catch(e){}
  // TTS 단일 AudioContext 정리 (갭 없는 연속 재생용)
  if(_previewTTSCtx){try{_previewTTSCtx.close();}catch(e){}_previewTTSCtx=null;}

  // BGM 중지 (합성 BGM)
  if(previewBGMCtx){try{previewBGMCtx.close();}catch(e){}previewBGMCtx=null;}
  // BGM 중지 (URL 기반 실제 음악)
  if(previewBGMAudio){try{previewBGMAudio.pause();previewBGMAudio.src='';}catch(e){}previewBGMAudio=null;}

  // 녹화용 AudioContext도 정리 (미리보기 중단 시)
  if(_recBGMCtx){try{_recBGMCtx.close();}catch(e){}_recBGMCtx=null;}
  if(_recBGMAudio){try{_recBGMAudio.pause();_recBGMAudio.src='';}catch(e){}_recBGMAudio=null;}

  var btn=document.getElementById('play-prev-btn');
  if(btn) btn.textContent='▶ 미리보기';
  drawScene(curScene,1);
}

// ══════════════════════════════════════════════════════════════
//  MAKE VIDEO  — TTS + BGM + MediaRecorder pipeline
// ══════════════════════════════════════════════════════════════
function showRenderModal(){
  var m=document.getElementById('render-modal');
  if(m) m.style.display='flex';
}
function hideRenderModal(){
  var m=document.getElementById('render-modal');
  if(m) m.style.display='none';
}
function updateRenderModal(pct, logMsg, sceneIdx){
  try{
    var p=document.getElementById('render-modal-pct');
    if(p) p.textContent=Math.round(pct)+'%';
    var b=document.getElementById('render-modal-bar');
    if(b) b.style.width=Math.round(pct)+'%';
    if(logMsg!==undefined){
      var l=document.getElementById('render-modal-log');
      if(l){l.innerHTML=logMsg;l.scrollTop=l.scrollHeight;}
    }
    if(sceneIdx!==undefined){
      var s=document.getElementById('render-modal-scene');
      if(s) s.textContent='씬 '+(sceneIdx+1)+' / '+S.scenes.length+' 처리 중';
    }
  }catch(e){}
}

function makeVideo(){
  if(previewPlaying) stopPreview();
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  cancelledRender=false;
  recChunks=[];
  renderedBlob=null;
  // render-modal 표시
  showRenderModal();
  updateRenderModal(0,'🚀 영상 제작 시작...',0);
  document.getElementById('result-box').style.display='none';
  document.getElementById('make-btn').disabled=true;
  // prog-box 내부 요소도 동기화 (addLog/setStatus가 prog-box DOM을 쓰므로)
  try{document.getElementById('prog-pct').textContent='0%';}catch(e){}
  try{document.getElementById('prog-bar').style.width='0%';}catch(e){}
  try{document.getElementById('prog-log').innerHTML='';}catch(e){}
  var pScene=document.getElementById('prog-scene');
  if(pScene) pScene.innerHTML=S.scenes.map(function(_,i){return '<div class="ps pending" id="ps-'+i+'">'+(i+1)+'</div>';}).join('');
  setStatus('🎬 영상 제작 중...');
  addLog('🚀 영상 제작 시작 - '+S.scenes.length+'개 씬');

  var needsFetch=S.scenes.some(function(_,i){return !sceneImgs[i]||!sceneImgs[i].complete||!sceneImgs[i].naturalWidth;});
  if(needsFetch){
    addLog('🖼 배경 사진 준비 중...');
    Promise.all(S.scenes.map(function(_,i){return fetchSceneImg(i);}))
      .then(function(){addLog('✅ 사진 준비 완료');renderSceneList();prepareTTSThenRecord();})
      .catch(function(){addLog('⚠️ 일부 사진 로드 실패');prepareTTSThenRecord();});
  } else {
    prepareTTSThenRecord();
  }
}

// ── 영상 제작 진입점: HuggingFace TTS 병렬 미리 받기 ──
// 변경: 순차(씬1→씬2→씬3) → 병렬(모든 씬 동시 fetch) 으로 변경
// 씬 5개 기준: 순차 ~15초 → 병렬 ~3초 (가장 느린 씬 시간만큼)
function prepareTTSThenRecord(){
  addLog('🎬 영상 제작 준비 중...');
  // ── allVoices가 비어있으면 강제 재빌드 ──
  if(!allVoices || allVoices.length === 0){
    addLog('⚠️ allVoices 비어있음 → 강제 buildVoiceList');
    var _svs = (window.speechSynthesis && window.speechSynthesis.getVoices()) || [];
    buildVoiceList(_svs);
  }
  // voiceGId 기반으로 목소리 탐색 (voiceIdx는 재빌드 후 어긋날 수 있음)
  var _gId = S.voiceGId || 'openai:gpt-4o-mini-tts:echo';
  var _byGId = allVoices.findIndex(function(v){ return v.gId === _gId; });
  if(_byGId >= 0) S.voiceIdx = _byGId; // idx 재동기화
  var v=getCurVoice();
  // fallback: voiceGId가 'openai:gpt-4o-mini-tts:echo'인데 목소리를 못 찾으면 직접 생성
  if(!v || !v.gId){
    addLog('⚠️ getCurVoice() null → Echo 4o 직접 fallback');
    v = {
      name:'Echo 4o (OpenAI·남성)', lang:'ko-KR', gender:'male',
      pitch:1.0, rate:1.0, ico:'🔊', bg:'#1e40af',
      desc:'OpenAI Echo (gpt-4o-mini-tts): 최신 모델 남성',
      special:null, gId:'openai:gpt-4o-mini-tts:echo',
      gPitch:0, gRate:1.0,
      isGoogleTTS:true, isHFTTS:false, isOpenAITTS:true,
      sysVoice:null
    };
  }
  addLog('🎤 선택 목소리: '+(v?v.name:'(없음)')+' gId='+(v&&v.gId||'없음'));
  // isGoogleTTS 또는 gId가 있으면 (OpenAI/Google/HF 포함) TTS fetch 진행
  if(v&&v.gId&&S.scenes.length>0){
    // 속도 슬라이더 읽기
    var speedEl=document.getElementById('vc-speed')||document.getElementById('v-speed');
    var sliderSpeed=speedEl?parseFloat(speedEl.value)||1.0:1.0;
    var finalRate=Math.max(0.25,Math.min(4.0,(v.gRate||1.0)*sliderSpeed));
    var pitchEl=document.getElementById('vc-pitch')||document.getElementById('v-pitch');
    var sliderPitch=pitchEl?parseFloat(pitchEl.value)||1.0:1.0;
    var finalPitch=Math.max(-20,Math.min(20,(v.gPitch||0)+(sliderPitch-1)*20));
    var isGoogleEngine=v.gId&&v.gId.startsWith('gtts:');
    var isOpenAIEngine=v.gId&&v.gId.startsWith('openai:');
    var maxTextLen=isGoogleEngine?5000:isOpenAIEngine?4096:500;
    addLog('🎤 음성 로딩 중... ('+S.scenes.length+'개 씬, 속도:'+finalRate.toFixed(2)+'x)');
    var preFetched=new Array(S.scenes.length).fill(null);
    var promises=S.scenes.map(function(sc,i){
      var text=(sc.text||sc.title||'').trim().slice(0,maxTextLen);
      if(!text) return Promise.resolve(null);
      addLog('🔊 씬'+(i+1)+' TTS 요청: voice_id='+v.gId);
      return fetch('/api/tts/v2/speak',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({text:text,voice_id:v.gId,pitch:finalPitch,speaking_rate:finalRate})
      }).then(function(r){
        var engine=r.headers.get('X-TTS-Engine')||r.headers.get('X-TTS-Fallback')||'unknown';
        addLog('🔊 씬'+(i+1)+' TTS 응답: status='+r.status+' engine='+engine);
        if(!r.ok) throw new Error('TTS '+r.status);
        return r.arrayBuffer();
      }).then(function(buf){
        // ── MP3 시그니처 검증 ─────────────────────────────────────────
        if(buf.byteLength>0){
          var firstByte=new Uint8Array(buf,0,1)[0];
          if(firstByte===0x7B||firstByte===0x5B){
            // 첫 바이트가 '{' 또는 '[' → JSON 에러 응답을 200 OK로 감쌌음
            try{
              var jsonStr=new TextDecoder().decode(buf);
              var jsonErr=JSON.parse(jsonStr);
              addLog('❌ 씬'+(i+1)+' TTS: 서버가 JSON 에러 반환 → '+( jsonErr.error||JSON.stringify(jsonErr).slice(0,80)));
              console.error('[TTS:비디오] 씬'+(i+1)+' JSON 에러:', jsonErr);
            }catch(_){ addLog('❌ 씬'+(i+1)+' TTS: JSON 파싱 실패 (비MP3 응답)'); }
            throw new Error('TTS 응답이 오디오가 아닌 JSON입니다 (씬'+(i+1)+')');
          }
          var b0=new Uint8Array(buf,0,4);
          var isID3=(b0[0]===0x49&&b0[1]===0x44&&b0[2]===0x33);
          var isMpegFrame=(b0[0]===0xFF&&(b0[1]&0xE0)===0xE0);
          var isRIFF=(b0[0]===0x52&&b0[1]===0x49&&b0[2]===0x46&&b0[3]===0x46);
          var isOgg=(b0[0]===0x4F&&b0[1]===0x67&&b0[2]===0x67&&b0[3]===0x53);
          if(isID3||isMpegFrame||isRIFF||isOgg){
            addLog('✅ 씬'+(i+1)+' TTS 오디오 검증: '+(isID3?'MP3(ID3)':isMpegFrame?'MP3(Frame)':isRIFF?'WAV':isOgg?'OGG':'OK')+' '+buf.byteLength+'B');
          } else {
            var hb=new Uint8Array(buf,0,4);
            addLog('⚠️ 씬'+(i+1)+' TTS: 알 수 없는 포맷 (0x'+hb[0].toString(16)+' 0x'+hb[1].toString(16)+') — 재생 시도 계속');
          }
        }
        // ── CSP 대응: blob URL <audio> 대신 AudioContext.decodeAudioData로 duration 측정 ──
        // wearesuperplace.com CSP "default-src 'self'"가 blob: media를 차단하므로
        // <audio src="blob:..."> 방식 완전 제거. AudioContext는 CSP media-src 미적용.
        // _ttsArrayBuffer 는 원본 유지 (녹화 시 bgmCtx 에서 재디코딩에 사용됨)
        var durAudio={_blobUrl:null, _ttsArrayBuffer:buf, _ttsDurSec:0};
        return new Promise(function(resolve){
          var resolved=false;
          function finish(dur){
            if(resolved) return;
            resolved=true;
            if(dur&&dur>0&&isFinite(dur)){
              durAudio._ttsDurSec=dur;
              S.scenes[i].dur=Math.max(2, Math.round((dur+0.6)*10)/10);
              addLog('🎙 씬 '+(i+1)+' 음성 준비 ('+dur.toFixed(2)+'s → 씬 '+S.scenes[i].dur+'s)');
            } else {
              addLog('🎙 씬 '+(i+1)+' 음성 준비 (duration 미확인)');
            }
            preFetched[i]=durAudio;
            resolve(durAudio);
          }
          // AudioContext로 디코딩하여 duration 측정 (blob URL 생성 없음)
          var tmpCtx;
          try{ tmpCtx=new(window.AudioContext||window.webkitAudioContext)(); }
          catch(e){ finish(0); return; }
          var copyBuf;
          try{ copyBuf=buf.slice(0); }catch(_){ copyBuf=buf; }
          var dp;
          try{ dp=tmpCtx.decodeAudioData(copyBuf); }catch(e){ dp=Promise.reject(e); }
          Promise.resolve(dp).then(function(ab){
            try{tmpCtx.close();}catch(_){}
            finish(ab.duration);
          }).catch(function(e){
            try{tmpCtx.close();}catch(_){}
            console.warn('[TTS dur] 씬'+(i+1)+' decode 실패:', e.message);
            finish(0);
          });
          // 5초 타임아웃
          setTimeout(function(){ if(!resolved){try{tmpCtx.close();}catch(_){}finish(0);} }, 5000);
        });
      }).catch(function(e){
        console.warn('TTS 로딩 실패 씬'+(i+1)+':',e);
        return null;
      });
    });
    Promise.all(promises).then(function(){
      var ok=preFetched.filter(function(x){return !!x;}).length;
      var totalDur=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
      addLog('✅ 음성 준비 완료 ('+ok+'/'+S.scenes.length+'개) 전체 '+totalDur.toFixed(1)+'s');
      // 씬 목록/타임라인 업데이트
      if(typeof renderSceneList==='function') renderSceneList();
      if(typeof renderTimeline==='function') renderTimeline();
      // canvas-lbl 업데이트 (실제 TTS 기반 길이)
      var lbl=document.getElementById('canvas-lbl');
      if(lbl){
        var fmtStr=S.fmt==='short'?'📱 숏폼 9:16':S.fmt==='long'?'🖥️ 롱폼 16:9':'⬜ 정방형 1:1';
        lbl.textContent=fmtStr+' | ≈'+Math.round(totalDur)+'초';
      }
      startRecording(preFetched);
    });
  } else {
    startRecording(null);
  }
}

// ── 녹화 시작 (Canvas → MediaRecorder 핵심 파이프라인) ──
function startRecording(preFetchedTTS){
  // 이전 AudioContext / BGM Audio 정리 (중복 방지)
  if(_recBGMCtx){try{_recBGMCtx.close();}catch(e){}_recBGMCtx=null;}
  if(_recBGMAudio){try{_recBGMAudio.pause();_recBGMAudio.src='';}catch(e){}_recBGMAudio=null;}
  // 미리보기 TTS 완전 중지
  ttsLiveIdx=9999;
  if(_ttsLiveAudio){try{_ttsLiveAudio.pause();_ttsLiveAudio.src='';_ttsLiveAudio=null;}catch(e){_ttsLiveAudio=null;}}
  try{if(window.speechSynthesis) window.speechSynthesis.cancel();}catch(e){}

  // 캐시 무효화 후 재취득 (이전 녹화 세션 캔버스 잔류 방지)
  _invalidatePvCtx();
  var canvas=document.getElementById('pv');
  if(!canvas){showErr('캔버스를 찾을 수 없습니다.');return;}
  // ctx 캐시 사전 워밍업 + 고화질 렌더링 옵션 1회 설정 (매 프레임 재설정 불필요)
  _pvCanvas=canvas;
  _pvCtx=canvas.getContext('2d', {alpha:false, willReadFrequently:false});
  if(_pvCtx){
    _pvCtx.imageSmoothingEnabled=true;
    _pvCtx.imageSmoothingQuality='high';
  }
  // fps 설정: 30fps 고화질 녹화
  var fps=30;
  var W=canvas.width,H=canvas.height;
  // ── 브라우저 MediaRecorder 가 실제로 지속 가능한 비트레이트 설정 ──
  //   과거 40Mbps 는 Chrome 이 버퍼링 실패로 청크를 떨어뜨려 "영상이 중간에 끊김/화질 이상" 의 원인이었음.
  //   실측 안정 범위:  1080p → 8Mbps,  720p → 6Mbps,  sub-720p → 4Mbps
  //   (유튜브/인스타 권장 업로드 비트레이트도 H.264 1080p 기준 8~12Mbps)
  var pixelCount=W*H;
  var bitrate=pixelCount>=2000000?12000000
             :pixelCount>=1000000?8000000
             :pixelCount>=900000?6000000
             :4000000;
  addLog('📐 '+W+'x'+H+' | '+fps+'fps | '+Math.round(bitrate/1000000)+'Mbps (고화질·안정)');

  // ── Step 1: Canvas 스트림 캡처 ──
  var canvasStream;
  try{
    canvasStream=canvas.captureStream(fps);
    var vt=canvasStream.getVideoTracks();
    if(!vt||vt.length===0){showErr('캔버스 비디오 트랙이 없습니다. Chrome/Edge를 사용해주세요.');return;}
    addLog('📹 캔버스 스트림: '+vt.length+'개 트랙');
  }catch(e){
    showErr('captureStream 오류: '+e.message+' (Chrome/Edge만 지원)');
    return;
  }

  // ── Step 2: AudioContext 준비 + BGM 사전 로딩 후 녹화 시작 ──
  var bgmCtx=null;
  var bgmDest=null;
  var audioTracksAdded=false;
  var preBgmBuffer=null; // BGM URL 사전 로딩된 AudioBuffer

  // BGM 사전 로딩 Promise — URL BGM인 경우 녹화 전에 반드시 로딩 완료
  var bgmData=BGM_DATA[S.bgmIdx];
  var totalDurSec=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
  var bgmPreloadPromise=Promise.resolve(null);
  if(bgmData&&bgmData.t!=='none'&&bgmData.url){
    var proxyUrl='/api/audio-proxy?url='+encodeURIComponent(bgmData.url);
    addLog('🎵 BGM 사전 로딩 중: '+bgmData.n+'...');
    bgmPreloadPromise=fetch(proxyUrl).then(function(r){
      if(!r.ok) throw new Error('proxy '+r.status);
      return r.arrayBuffer();
    }).then(function(buf){
      // AudioContext가 아직 없으므로 임시 컨텍스트로 디코딩
      var tmpCtx=new(window.AudioContext||window.webkitAudioContext)();
      return tmpCtx.decodeAudioData(buf).then(function(decoded){
        try{tmpCtx.close();}catch(ex){}
        return decoded;
      });
    }).catch(function(e){
      addLog('⚠️ BGM 사전 로딩 실패: '+e.message+' → 합성 BGM 사용');
      return null;
    });
  }

  // BGM 로딩 완료 후 실제 녹화 준비
  bgmPreloadPromise.then(function(loadedBgmBuffer){
    if(cancelledRender) return;
    preBgmBuffer=loadedBgmBuffer;
    if(loadedBgmBuffer){
      addLog('✅ BGM 로딩 완료: '+bgmData.n);
    }

    try{
      bgmCtx=new(window.AudioContext||window.webkitAudioContext)();
      _recBGMCtx=bgmCtx;
      if(bgmCtx.state==='suspended') bgmCtx.resume().catch(function(){});
      bgmDest=bgmCtx.createMediaStreamDestination();

      // 무음 oscillator - 오디오 스트림 항상 활성화
      var silentOsc=bgmCtx.createOscillator();
      var silentGain=bgmCtx.createGain();
      silentGain.gain.value=0.00001;
      silentOsc.connect(silentGain);
      silentGain.connect(bgmDest);
      silentOsc.start();

      // ★★★ 씬 dur 최종 확정 — 실제 TTS 길이로 = 배정 (배속 반영, 누적 버그 제거) ★★★
      //   _ttsDurSec 은 prepareTTSThenRecord 에서 AudioContext.decodeAudioData 로 측정된 정확한 값
      //   이전 코드는 Math.max(oldDur, newDur) 때문에 배속이 빨라져도 씬 dur 이 줄어들지 않아
      //   TTS 끝난 후 긴 무음 구간이 생기고 영상이 중간에 끊긴 것처럼 보였음 → 여기서 수정.
      if(preFetchedTTS&&preFetchedTTS.length>0){
        preFetchedTTS.forEach(function(a,ii){
          if(!a||!S.scenes[ii]) return;
          var d=(a._ttsDurSec&&a._ttsDurSec>0)?a._ttsDurSec:0;
          if(d>0){
            // = 로 직접 배정: 실제 TTS 길이 + 0.6s tail 여유. 최소 2초.
            S.scenes[ii].dur=Math.max(2, Math.round((d+0.6)*10)/10);
          } else {
            // TTS duration 측정 실패 시만 기존 추정값 유지
            if(!S.scenes[ii].dur||S.scenes[ii].dur<2) S.scenes[ii].dur=3;
          }
        });
        totalDurSec=S.scenes.reduce(function(s,sc){return s+(sc.dur||3);},0);
        addLog('⏱ 최종 영상 길이: '+totalDurSec.toFixed(1)+'s (씬 '+S.scenes.length+'개, TTS 기준)');
      }

      // ★ 녹화·TTS 공통 워밍업 (렌더링 시작 오프셋과 정확히 동일해야 동기화됨)
      var warmup=0.25;

      // BGM 재생 (이미 로딩 완료된 버퍼 또는 합성 BGM)
      if(bgmData&&bgmData.t!=='none'){
        if(preBgmBuffer){
          // ✅ 사전 로딩된 버퍼: 녹화 시작과 정확히 동기화하여 처음부터 재생
          var bgmGainNode=bgmCtx.createGain();
          bgmGainNode.gain.value=Math.min(Math.max(bgmVol*0.5,0),1);
          bgmGainNode.connect(bgmDest);
          var durLeft=totalDurSec+2;
          var loopStart=bgmCtx.currentTime+warmup; // TTS와 동일한 시작 시점
          while(durLeft>0){
            var loopSrc=bgmCtx.createBufferSource();
            loopSrc.buffer=preBgmBuffer;
            loopSrc.connect(bgmGainNode);
            loopSrc.start(loopStart);
            loopStart+=preBgmBuffer.duration;
            durLeft-=preBgmBuffer.duration;
          }
          addLog('🎵 BGM: '+bgmData.n+' (녹화와 동기화 재생)');
        } else if(bgmData.url){
          // AudioBuffer 디코딩 실패 → <audio> 엘리먼트 + MediaElementSource 로 폴백
          try{
            var bgmEl=new Audio();
            bgmEl.crossOrigin='anonymous';
            bgmEl.src='/api/audio-proxy?url='+encodeURIComponent(bgmData.url);
            bgmEl.loop=true;
            bgmEl.volume=Math.min(Math.max(bgmVol*0.6,0),1);
            _recBGMAudio=bgmEl;
            var mes=bgmCtx.createMediaElementSource(bgmEl);
            var bgmGain2=bgmCtx.createGain();
            bgmGain2.gain.value=1.0;
            mes.connect(bgmGain2);
            bgmGain2.connect(bgmDest);
            // 녹화 시작과 함께 재생
            setTimeout(function(){ bgmEl.play().catch(function(){}); }, warmup*1000);
            addLog('🎵 BGM: '+bgmData.n+' (MediaElement 폴백 재생)');
          }catch(fe){
            try{playBGMPattern(bgmCtx,bgmDest,bgmData,totalDurSec,bgmVol);}catch(e2){}
            addLog('🎵 BGM: '+bgmData.n+' (합성 BGM 폴백)');
          }
        } else {
          // 합성 BGM
          playBGMPattern(bgmCtx,bgmDest,bgmData,totalDurSec,bgmVol);
          addLog('🎵 BGM: '+bgmData.n+' (BPM:'+bgmData.bpm+')');
        }
      } else {
        addLog('🔇 BGM 없음');
      }

      // ★ TTS 미리받은 오디오를 AudioContext로 디코딩하여 씬 타이밍에 정확히 맞춰 예약 재생
      if(preFetchedTTS&&preFetchedTTS.length>0){
        addLog('🎙 음성 스케줄링 중... ('+preFetchedTTS.length+'개 씬)');
        var vol=parseFloat((document.getElementById('vc-vol')||document.getElementById('v-vol')||{value:'1'}).value||'1')||1;
        var ttsGain=bgmCtx.createGain();
        ttsGain.gain.value=Math.min(Math.max(vol,0.1),1.2);
        ttsGain.connect(bgmDest);

        // 각 씬의 시작 시간(초) = 이전 씬 dur 의 누적합
        var sceneStartTimes=[];
        var scAcc=0;
        for(var si=0;si<S.scenes.length;si++){
          sceneStartTimes.push(scAcc);
          scAcc+=(S.scenes[si].dur||5);
        }

        // ★ 각 씬 TTS 를 bgmCtx 로 디코딩해 정확한 시간에 예약 재생
        //   (prepareTTSThenRecord 에서 캐싱하지 않는 이유: 다른 AudioContext 의 AudioBuffer 는
        //    재생 실패/잡음 원인이므로 항상 녹화용 bgmCtx 에서 디코딩)
        preFetchedTTS.forEach(function(audio,ii){
          if(!audio) return;
          var startAt=sceneStartTimes[ii]||0;
          var srcBuf=audio._ttsArrayBuffer;
          if(!srcBuf){
            console.warn('[TTS] 씬'+(ii+1)+': ArrayBuffer 없음 → <audio> 폴백');
            _fallbackPlayAudio(audio, startAt);
            return;
          }
          // ArrayBuffer 복제 (decodeAudioData 가 ArrayBuffer 를 소비하므로)
          var copyBuf;
          try{ copyBuf=srcBuf.slice(0); }catch(_e){ copyBuf=srcBuf; }
          // Promise 체이닝 (브라우저 간 호환)
          var p;
          try{ p=bgmCtx.decodeAudioData(copyBuf); }catch(_e2){ p=null; }
          if(p && p.then){
            p.then(function(audioBuffer){
              if(cancelledRender) return;
              try{
                var src=bgmCtx.createBufferSource();
                src.buffer=audioBuffer;
                src.connect(ttsGain);
                var when=bgmCtx.currentTime+warmup+startAt;
                src.start(Math.max(when,bgmCtx.currentTime+0.02));
                addLog('🎙 씬'+(ii+1)+' 예약 @'+startAt.toFixed(2)+'s ('+audioBuffer.duration.toFixed(2)+'s)');
              }catch(ex){
                console.warn('[TTS] 씬'+(ii+1)+' schedule 실패, 폴백:',ex);
                _fallbackPlayAudio(audio, startAt);
              }
            }).catch(function(e){
              // decodeAudioData 실패 로그 강화 — 첫 바이트 정보 포함
              var hintBytes='';
              if(srcBuf&&srcBuf.byteLength>0){
                var hbArr=new Uint8Array(srcBuf,0,Math.min(8,srcBuf.byteLength));
                hintBytes=Array.from(hbArr).map(function(b){return ('0'+b.toString(16).toUpperCase()).slice(-2);}).join(' ');
              }
              addLog('❌ 씬'+(ii+1)+' TTS decodeAudioData 실패: '+e.message+' [head:'+hintBytes+'] → 폴백 재생');
              console.warn('[TTS] 씬'+(ii+1)+' decode 실패 [head bytes:'+hintBytes+']:',e);
              _fallbackPlayAudio(audio, startAt);
            });
          } else {
            // 브라우저가 promise 버전 미지원 → 바로 폴백
            _fallbackPlayAudio(audio, startAt);
          }
        });

        // 폴백 재생: <audio> 엘리먼트 + MediaElementSource → bgmDest 로 라우팅
        function _fallbackPlayAudio(audio, startAt){
          try{
            var url=audio._blobUrl || (audio._ttsArrayBuffer ? URL.createObjectURL(new Blob([audio._ttsArrayBuffer],{type:'audio/mpeg'})) : audio.src);
            var a2=new Audio(url);
            a2.volume=Math.min(Math.max(vol,0.1),1.0);
            var mesT=bgmCtx.createMediaElementSource(a2);
            var gT=bgmCtx.createGain();
            gT.gain.value=1.0;
            mesT.connect(gT); gT.connect(bgmDest);
            setTimeout(function(){ a2.play().catch(function(err){ console.warn('[TTS] play 실패:',err); }); }, (warmup+startAt)*1000);
            addLog('🎙 씬'+'(폴백)' +' MediaElement 재생 @'+startAt.toFixed(2)+'s');
          }catch(ee){
            console.warn('[TTS] 폴백 실패:',ee);
          }
        }
      }
      // ※ Web Speech API는 목소리 중복 방지를 위해 영상 제작 시 사용 안 함

      // 오디오 트랙 스트림에 추가
      var ats=bgmDest.stream.getAudioTracks();
      if(ats.length>0){
        ats.forEach(function(t){canvasStream.addTrack(t);});
        audioTracksAdded=true;
        addLog('🎧 오디오 트랙 추가: '+ats.length+'개');
      } else {
        addLog('⚠️ 오디오 트랙 없음');
      }
    }catch(e){
      addLog('⚠️ 오디오 설정 실패: '+e.message);
    }

    // ── Step 3: MediaRecorder 설정 (MP4 우선 시도, 불가 시 WebM) ──
    var mime='';
    var mimesToTry=audioTracksAdded
      ? [
          'video/mp4;codecs=avc1,mp4a.40.2',
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus',
          'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'
        ]
      : [
          'video/mp4;codecs=avc1,mp4a.40.2',
          'video/mp4;codecs=avc1',
          'video/mp4',
          'video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'
        ];
    for(var mi=0;mi<mimesToTry.length;mi++){
      try{if(MediaRecorder.isTypeSupported(mimesToTry[mi])){mime=mimesToTry[mi];break;}}catch(e){}
    }
    if(!mime){showErr('녹화 미지원 브라우저입니다. Chrome/Edge/Safari를 사용해주세요.');return;}
    var isMp4=mime.indexOf('mp4')!==-1;
    addLog('🎬 코덱: '+(mime.split(';codecs=')[1]||mime)+' ('+(isMp4?'MP4':'WebM')+')');

    try{
      var recOpts={mimeType:mime};
      if(bitrate) recOpts.videoBitsPerSecond=bitrate;
      // 오디오 고품질 설정 (320kbps)
      recOpts.audioBitsPerSecond=320000;
      mediaRec=new MediaRecorder(canvasStream,recOpts);
    }catch(e){
      try{mediaRec=new MediaRecorder(canvasStream,{mimeType:'video/webm'});}
      catch(e2){showErr('MediaRecorder 생성 실패: '+e2.message);return;}
    }

    mediaRec.ondataavailable=function(ev){
      if(ev.data&&ev.data.size>0) recChunks.push(ev.data);
    };

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 완료 흐름 (단방향, 단순 명확):
    //   pacerTick → nowFrame >= totalFrames
    //   → _doStop(): 인터벌 정지 → mediaRec.stop()
    //   → onstop 발화 (W3C: ondataavailable 모두 처리된 후)
    //   → _buildResult(): Blob 생성 → onComplete()
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    var _stopCalled  = false;
    var _resultBuilt = false;
    var _pacerId     = null;

    function _safeUI(){
      try{document.getElementById('prog-box').style.display='none';}catch(e){}
      try{document.getElementById('make-btn').disabled=false;}catch(e){}
      hideRenderModal();
    }

    function _buildResult(){
      if(_resultBuilt) return;
      _resultBuilt = true;

      if(bgmOsc){try{bgmOsc.stop();}catch(ex){}bgmOsc=null;}
      if(bgmCtx){try{bgmCtx.close();}catch(ex){}}
      if(preFetchedTTS) preFetchedTTS.forEach(function(a){
        if(a&&a._blobUrl){try{URL.revokeObjectURL(a._blobUrl);}catch(e){}}
      });

      if(cancelledRender){ addLog('✋ 취소'); _safeUI(); return; }

      var tb = recChunks.reduce(function(s,c){return s+c.size;},0);
      addLog('⏹ 종료 | 청크 '+recChunks.length+'개 | '+Math.round(tb/1024)+'KB');

      if(!recChunks.length || tb<100){
        addLog('❌ 녹화 데이터 없음');
        _safeUI();
        showErr('녹화 데이터가 없습니다. 페이지를 새로고침 후 Chrome/Edge에서 다시 시도해주세요.');
        return;
      }
      try{
        var bt=(mime||'video/webm').split(';')[0]||'video/webm';
        renderedBlob=new Blob(recChunks,{type:bt});
        renderedBlob._isMp4=isMp4;
        addLog('💾 '+(renderedBlob.size/1024/1024).toFixed(2)+'MB ('+(isMp4?'MP4':'WebM')+')');
        onComplete(renderedBlob);
      }catch(e){
        addLog('❌ Blob 오류: '+(e.message||e));
        _safeUI();
      }
    }

    function _doStop(){
      if(_stopCalled) return;
      _stopCalled = true;

      // 인터벌 전부 정지
      clearInterval(dataPoller);
      if(_pacerId){clearInterval(_pacerId);_pacerId=null;}
      if(bgmOsc){try{bgmOsc.stop();}catch(ex){}bgmOsc=null;}

      addLog('⏹ 녹화 종료 요청...');

      try{
        var st=mediaRec.state;
        if(st==='recording'||st==='paused'){
          mediaRec.stop();  // → ondataavailable(last) → onstop → _buildResult
          addLog('⏹ mediaRec.stop() 완료 (state='+st+')');
        } else {
          addLog('⚠️ 이미 '+st+' → _buildResult 직접 호출');
          _buildResult();
        }
      }catch(e){
        addLog('⚠️ stop 예외: '+(e.message||e));
        _buildResult();
      }

      // 안전망: 8초 내 결과 미생성 시 강제 호출
      setTimeout(function(){
        if(!_resultBuilt){
          addLog('⚠️ 8초 안전망 → 강제 _buildResult (청크:'+recChunks.length+')');
          _buildResult();
        }
      }, 8000);
    }

    mediaRec.onstop = function(){
      addLog('🔴 onstop → _buildResult');
      _buildResult();
    };

    mediaRec.onerror = function(ev){
      var msg=(ev.error&&ev.error.message)||'오류';
      addLog('❌ MediaRecorder 오류: '+msg);
      _safeUI();
      showErr('녹화 오류: '+msg);
    };

    // ── Step 4: 녹화 시작 ──
    var totalDur=S.scenes.reduce(function(s,sc){return s+(sc.dur||3);},0);
    var totalFrames=Math.ceil(totalDur*fps);
    var sceneBoundaries=[];
    var _acc2=0;
    for(var sbi=0;sbi<S.scenes.length;sbi++){
      _acc2+=(S.scenes[sbi].dur||3);
      sceneBoundaries.push(_acc2);
    }

    // dataPoller: 1초마다 requestData로 청크 확보 (timeslice=1000 대신 수동 방식)
    var dataPoller=setInterval(function(){
      if(!_stopCalled && mediaRec && mediaRec.state==='recording'){
        try{mediaRec.requestData();}catch(ex){}
      }
    }, 1000);

    // FADE_SEC: 씬 전환 페이드 길이 — 0.06s(2프레임)로 경량화 (원래 0.12 → 버벅임 원인)
    var FADE_SEC   = 0.06;
    var FADE_FRAMES= Math.round(fps*FADE_SEC);
    var renderStartMs  = 0;
    var lastDrawnFrame = -1;

    function currentFrameIdx(){
      return Math.floor(((performance.now()-renderStartMs)/1000)*fps);
    }

    // 녹화용 비디오 씬 초기화: 비디오가 있는 씬은 offset부터 재생 준비
    S.scenes.forEach(function(sc,si){
      if(sc._vidEl&&sc.customMedia&&sc.customMedia.type==='video'){
        sc._vidEl.muted=true; sc._vidEl.loop=false;
        sc._vidEl.currentTime=sc._vidOffset||0;
      }
    });
    var _lastRecScIdx=-1;

    function drawAt(frameIdx){
      var t=frameIdx/fps;
      var scIdx=0, scStart=0;
      for(var i=0;i<sceneBoundaries.length;i++){
        if(t<sceneBoundaries[i]){scIdx=i;scStart=i>0?sceneBoundaries[i-1]:0;break;}
        if(i===sceneBoundaries.length-1){scIdx=i;scStart=i>0?sceneBoundaries[i-1]:0;}
      }
      curScene=scIdx;
      var scDur=S.scenes[scIdx].dur||3;
      var scElapsed=t-scStart;
      var prog=scDur>0?Math.min(scElapsed/scDur,1):1;
      // 비디오 씬: _vidOffset + scElapsed 로 currentTime 동기화 → drawScene이 _liveVid 자동 감지
      var curScObj=S.scenes[scIdx];
      if(curScObj&&curScObj._vidEl&&curScObj.customMedia&&curScObj.customMedia.type==='video'){
        var vEl=curScObj._vidEl;
        var _vOffset=curScObj._vidOffset||0;
        var _vDur=curScObj._vidDuration||(vEl.duration||999);
        // 씬 전환 시 offset부터 재생 시작
        if(_lastRecScIdx!==scIdx){
          _lastRecScIdx=scIdx;
          vEl.currentTime=_vOffset;
          vEl.play().catch(function(){});
        }
        // 씬 경과 시간에 맞춰 video currentTime 동기화 (드리프트 방지)
        var targetT=_vOffset+scElapsed;
        if(targetT<=_vDur&&Math.abs(vEl.currentTime-targetT)>0.15){
          try{vEl.currentTime=targetT;}catch(e){}
        }
        // 씬 종료 시 정지 (씬 길이 초과 시)
        if(scElapsed>=scDur){try{vEl.pause();}catch(e){}}
        // sceneImgs 갱신 제거 — drawScene이 _liveVid(_vidEl.readyState>=2) 자동 감지
      } else {
        if(_lastRecScIdx!==scIdx) _lastRecScIdx=scIdx;
      }
      drawScene(scIdx,prog);

      var fadeAlpha=0;
      if(scIdx<S.scenes.length-1){
        var rem=scDur-scElapsed;
        if(rem<FADE_SEC) fadeAlpha=Math.min(0.75,(FADE_SEC-rem)/FADE_SEC*0.75);
      }
      if(scIdx>0&&scElapsed<FADE_SEC){
        fadeAlpha=Math.max(fadeAlpha,(1-(scElapsed/FADE_SEC))*0.75);
      }
      if(fadeAlpha>0){
        var ctx2=_getPvCtx();
        if(ctx2&&_pvCanvas){
          ctx2.save();ctx2.globalAlpha=fadeAlpha;
          ctx2.fillStyle='#000';ctx2.fillRect(0,0,_pvCanvas.width,_pvCanvas.height);
          ctx2.restore();
        }
      }

      document.querySelectorAll('.ps').forEach(function(d,di){if(di<scIdx)d.className='ps done';});
      var dot=document.getElementById('ps-'+scIdx);
      if(dot) dot.className='ps rendering';
      var pct=Math.min(100,Math.round((frameIdx+1)/totalFrames*100));
      var pctEl=document.getElementById('prog-pct');
      var barEl=document.getElementById('prog-bar');
      var titleEl=document.getElementById('prog-title');
      if(pctEl) pctEl.textContent=pct+'%';
      if(barEl) barEl.style.width=pct+'%';
      if(titleEl) titleEl.textContent='🎬 씬 '+(scIdx+1)+'/'+S.scenes.length+' ('+pct+'%)';
      // render-modal 동기화
      try{
        var rp=document.getElementById('render-modal-pct');if(rp)rp.textContent=pct+'%';
        var rb=document.getElementById('render-modal-bar');if(rb)rb.style.width=pct+'%';
        var rs=document.getElementById('render-modal-scene');if(rs)rs.textContent='씬 '+(scIdx+1)+' / '+S.scenes.length+' 처리 중 ('+pct+'%)';
      }catch(e){}
    }

    function pacerTick(){
      if(cancelledRender){
        clearInterval(dataPoller);
        if(_pacerId){clearInterval(_pacerId);_pacerId=null;}
        try{if(mediaRec&&mediaRec.state!=='inactive') mediaRec.stop();}catch(e){}
        return;
      }
      var nowFrame=currentFrameIdx();
      if(nowFrame>=totalFrames && !_stopCalled){
        // 마지막 프레임 그리기 (100% 표시)
        drawAt(totalFrames-1);
        lastDrawnFrame=totalFrames-1;
        addLog('✅ 렌더 완료 ('+totalFrames+'f, '+totalDur.toFixed(1)+'s)');
        _doStop();
        return;
      }
      if(nowFrame>lastDrawnFrame){
        // ★ 최적화: 중간 프레임 스킵 — 밀린 경우 최신 프레임 1개만 렌더
        // (구 코드: for 루프로 최대 3프레임 순차 처리 → 한 인터벌에 복수 drawScene 호출)
        drawAt(nowFrame);
        lastDrawnFrame=nowFrame;
      }
    }

    try{drawScene(0,0);}catch(_e){}
    setTimeout(function(){
      if(cancelledRender) return;
      if(bgmCtx&&bgmCtx.state==='suspended') bgmCtx.resume().catch(function(){});
      try{
        // timeslice=1000ms: 1초마다 ondataavailable 발화 → 안정적 데이터 수집
        // ondataavailable 미발화 위험(timeslice 없는 경우)을 완전히 제거
        mediaRec.start(1000);
        addLog('▶ 녹화 시작 ('+Math.round(bitrate/1000000)+'Mbps, '+fps+'fps, timeslice=1s)');
      }catch(e){addLog('❌ MediaRecorder 시작 실패: '+e.message);return;}
      setTimeout(function(){
        if(cancelledRender) return;
        addLog('🎬 렌더링 시작 (총 '+totalDur.toFixed(1)+'s / '+totalFrames+'f)');
        renderStartMs=performance.now();
        _pacerId=setInterval(pacerTick, Math.floor(1000/fps));
      }, warmup*1000);
    }, 50);

  }).catch(function(bgmErr){
    // ★ BGM 로드 오류가 발생해도 영상 제작을 중단하지 않고 BGM 없이 재시도
    addLog('⚠️ BGM 로드 실패 — BGM 없이 녹화 재시작: '+(bgmErr&&bgmErr.message||bgmErr));
    try{
      // BGM_DATA에서 none 타입 인덱스 찾기
      var noneIdx=0;
      for(var _bi=0;_bi<BGM_DATA.length;_bi++){
        if(BGM_DATA[_bi]&&BGM_DATA[_bi].t==='none'){noneIdx=_bi;break;}
      }
      var prevBgmIdx=S.bgmIdx;
      S.bgmIdx=noneIdx; // BGM 없음으로 강제
      addLog('🔄 BGM 없이 영상 제작 재시작 (bgmIdx='+noneIdx+')...');
      startRecording(null); // TTS도 없이 순수 영상만 녹화 (이미 TTS는 앞 단계에서 fetch 완료)
      S.bgmIdx=prevBgmIdx; // bgmIdx 원복 (UI 상태 유지)
    }catch(retryErr){
      addLog('❌ 재시도 실패: '+(retryErr&&retryErr.message||retryErr));
      try{document.getElementById('prog-box').style.display='none';}catch(e){}
      try{document.getElementById('make-btn').disabled=false;}catch(e){}
      hideRenderModal();
      showErr('BGM 오류로 영상 생성에 실패했습니다. BGM을 "없음"으로 변경 후 다시 시도해주세요.');
    }
  }); // bgmPreloadPromise.then 종료
}

// ── BGM 멜로디 패턴 재생 (각 BGM마다 고유한 멜로디/리듬/화성) ──
// URL 기반 BGM 재생 (실제 음악 파일)
function playBGMUrl(url, vol, loopDest){
  var audio=new Audio();
  // crossOrigin 제거 – SoundHelix 등 외부 URL CORS 오류 방지
  audio.src=url;
  audio.loop=true;
  audio.volume=Math.min(Math.max(vol*0.7,0),1);
  audio.play().catch(function(e){console.warn('BGM URL play error:',e);});
  return audio;
}

function playBGMPattern(ctx,dest,bgmData,totalSec,vol){
  // ── URL 기반 실제 음악 파일 우선 재생 ──
  if(bgmData&&bgmData.url){
    var audio=playBGMUrl(bgmData.url,vol,dest);
    bgmOsc={stop:function(){try{audio.pause();audio.src='';}catch(e){}},audio:audio};
    return;
  }

  var masterGain=ctx.createGain();
  masterGain.gain.value=vol*0.18;
  masterGain.connect(dest);

  var bpm=bgmData.bpm||90;
  var beatSec=60/bpm;
  var t=ctx.currentTime+0.05;

  // BGM 고유 데이터 사용 (없으면 기본값 fallback)
  var scale=bgmData.scale||[261.63,293.66,329.63,349.23,392.00,440.00,493.88];
  var melody=bgmData.melody||[0,2,4,2,3,1,0,4,2,0,3,2,4,0,1,2];
  var rhythm=bgmData.rhythm||[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1];
  var oscType=bgmData.osc||'triangle';
  var chords=bgmData.chord||[];

  var noteIdx=0;
  var rhythmIdx=0;

  function scheduleNotes(startT){
    var scheduled=0;
    var maxNotes=Math.ceil(totalSec/beatSec)+8;
    for(var ni=0;ni<maxNotes;ni++){
      if(startT>totalSec+ctx.currentTime+0.1) break;
      var rhythmMult=rhythm[rhythmIdx%rhythm.length]||1;
      var noteDur=beatSec*rhythmMult;
      var noteFreq=scale[melody[noteIdx%melody.length]%scale.length];

      // 메인 멜로디 노트
      (function(f,st,nd,ot){
        var osc=ctx.createOscillator();
        var env=ctx.createGain();
        osc.type=ot;
        osc.frequency.value=f;
        osc.connect(env);env.connect(masterGain);
        env.gain.setValueAtTime(0,st);
        env.gain.linearRampToValueAtTime(0.9,st+Math.min(0.02,nd*0.1));
        env.gain.setValueAtTime(0.9,st+nd*0.65);
        env.gain.linearRampToValueAtTime(0,st+nd*0.95);
        osc.start(st);
        osc.stop(st+nd);
      })(noteFreq,startT,noteDur,oscType);

      // 화음 (chord) — 선택된 BGM의 화성 패턴
      chords.forEach(function(semitones){
        var chordFreq=noteFreq*Math.pow(2,semitones/12);
        (function(f,st,nd){
          var osc2=ctx.createOscillator();
          var env2=ctx.createGain();
          osc2.type=(oscType==='sawtooth')?'triangle':oscType;
          osc2.frequency.value=f;
          osc2.connect(env2);env2.connect(masterGain);
          env2.gain.setValueAtTime(0,st);
          env2.gain.linearRampToValueAtTime(0.25,st+Math.min(0.03,nd*0.1));
          env2.gain.setValueAtTime(0.25,st+nd*0.7);
          env2.gain.linearRampToValueAtTime(0,st+nd*0.9);
          osc2.start(st);
          osc2.stop(st+nd);
        })(chordFreq,startT,noteDur);
      });

      // 베이스 라인 (4박마다, hip-hop/electronic은 2박마다)
      var bassInterval=(bgmData.t&&(bgmData.t.indexOf('hiphop')>=0||bgmData.t.indexOf('electronic')>=0))?2:4;
      if(ni%bassInterval===0){
        (function(f,st,nd){
          var bass=ctx.createOscillator();
          var bassEnv=ctx.createGain();
          bass.type='sine';
          bass.frequency.value=f/2;
          bass.connect(bassEnv);bassEnv.connect(masterGain);
          bassEnv.gain.setValueAtTime(0,st);
          bassEnv.gain.linearRampToValueAtTime(0.6,st+0.04);
          bassEnv.gain.setValueAtTime(0.6,st+beatSec*0.4);
          bassEnv.gain.linearRampToValueAtTime(0,st+beatSec*0.8);
          bass.start(st);
          bass.stop(st+beatSec);
        })(noteFreq,startT,noteDur);
      }

      // 킥 드럼 효과 (upbeat/hiphop/electronic)
      if(bgmData.t&&(bgmData.t.indexOf('upbeat')>=0||bgmData.t.indexOf('hiphop')>=0||bgmData.t.indexOf('electronic')>=0)){
        if(ni%Math.round(4/rhythmMult)===0){
          (function(st){
            var kick=ctx.createOscillator();
            var kickEnv=ctx.createGain();
            kick.type='sine';
            kick.frequency.setValueAtTime(120,st);
            kick.frequency.exponentialRampToValueAtTime(40,st+0.08);
            kick.connect(kickEnv);kickEnv.connect(masterGain);
            kickEnv.gain.setValueAtTime(0.5,st);
            kickEnv.gain.exponentialRampToValueAtTime(0.001,st+0.1);
            kick.start(st);
            kick.stop(st+0.12);
          })(startT);
        }
        // 하이햇
        if(ni%2===1){
          (function(st){
            var hihat=ctx.createOscillator();
            var hhEnv=ctx.createGain();
            hihat.type='square';
            hihat.frequency.value=8000;
            hihat.connect(hhEnv);hhEnv.connect(masterGain);
            hhEnv.gain.setValueAtTime(0.04,st);
            hhEnv.gain.linearRampToValueAtTime(0,st+0.03);
            hihat.start(st);
            hihat.stop(st+0.04);
          })(startT);
        }
      }

      startT+=noteDur;
      noteIdx++;
      rhythmIdx++;
      scheduled++;
    }
  }

  scheduleNotes(t);
  bgmOsc={stop:function(){masterGain.disconnect();}};
}

// ── 실시간 TTS 재생 (ElevenLabs + Web Speech API + 특수 효과 목소리 지원) ──
var ttsLiveIdx=0;
var _ttsLiveAudio=null;
function isTTSStopped(){return previewStopped||cancelledRender||(ttsLiveIdx>=9999);}

function playTTSLive(){
  ttsLiveIdx=0;
  previewStopped=false;
  if(_ttsLiveAudio){try{_ttsLiveAudio.pause();_ttsLiveAudio.src='';}catch(e){}_ttsLiveAudio=null;}
  try{if(window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}

  var v=getCurVoice();
  var vol=parseFloat((document.getElementById('vc-vol')||document.getElementById('v-vol')||{value:'1'}).value||'1')||1;

  // ── TTS API 목소리: 모든 씬 병렬 프리패치 → 단일 AudioContext 갭 없는 연속 재생 ──
  if(v&&v.isGoogleTTS&&v.gId){
    var isGEng=v.gId.startsWith('gtts:');
    var isOpenAIEng=v.gId.startsWith('openai:');
    var maxLenLive=isGEng?5000:isOpenAIEng?4096:500;
    var _pvScenes=S.scenes, _pvN=_pvScenes.length;
    if(!_pvN) return;
    var _prevBtn2=document.getElementById('play-prev-btn');
    if(_prevBtn2) _prevBtn2.textContent='⏳ 로딩 중...';
    // 씬별 디코딩된 AudioBuffer 저장
    var _pvBufs=[];
    for(var _pi=0;_pi<_pvN;_pi++) _pvBufs.push(null);
    // 패치가 필요한 씬 수 카운트
    var _pvPending=0;
    _pvScenes.forEach(function(sc){ if((sc.text||sc.title||'').trim().slice(0,maxLenLive)) _pvPending++; });
    var _pvStarted=false;
    function _pvOnAllReady(){
      if(_pvStarted||isTTSStopped()) return;
      _pvStarted=true;
      var ctx=new(window.AudioContext||window.webkitAudioContext)();
      if(ctx.state==='suspended') ctx.resume().catch(function(){});
      _previewTTSCtx=ctx;
      var gain=ctx.createGain(); gain.gain.value=vol; gain.connect(ctx.destination);
      var _pvTimes=[], t=ctx.currentTime+0.1;
      for(var i=0;i<_pvN;i++){
        _pvTimes[i]=t;
        var buf=_pvBufs[i];
        if(buf){ var src=ctx.createBufferSource(); src.buffer=buf; src.connect(gain); src.start(t); t+=buf.duration; }
        else { t+=(_pvScenes[i].dur||5); }
      }
      var _pvEndTime=t;
      if(_prevBtn2) _prevBtn2.textContent='⏹ 정지';
      ttsLiveIdx=0;
      (function _pvSync(){
        if(isTTSStopped()) return;
        var now=ctx.currentTime;
        if(now>=_pvEndTime){ stopPreview(); return; }
        var si=0;
        for(var j=_pvN-1;j>=0;j--){ if(now>=_pvTimes[j]){ si=j; break; } }
        if(si!==ttsLiveIdx){ ttsLiveIdx=si; curScene=si; drawScene(si,1); }
        setTimeout(_pvSync,50);
      })();
    }
    if(!_pvPending){ _pvOnAllReady(); return; }
    // 모든 씬 병렬 패치
    _pvScenes.forEach(function(sc,idx){
      var text=(sc.text||sc.title||'').trim().slice(0,maxLenLive);
      if(!text) return;
      googleTTS(text, v.gId, v.gPitch||0, v.gRate||1.0,
        function(wrapper){
          if(!isTTSStopped()) _pvBufs[idx]=wrapper._buf||null;
          _pvPending--; if(_pvPending<=0) _pvOnAllReady();
        },
        function(err){
          console.warn('[preview] 씬',idx,'TTS 오류:',err);
          _pvPending--; if(_pvPending<=0) _pvOnAllReady();
        }
      );
    });
    return;
  }

  // ── 일반 목소리: Web Speech API ──
  if(!S.scenes.length) return;

  function speakNext(){
    if(isTTSStopped()) return;
    if(ttsLiveIdx>=S.scenes.length) return;
    var sc=S.scenes[ttsLiveIdx];
    var text=(sc.text||sc.title||'').trim().slice(0,500);
    if(!text){ttsLiveIdx++;speakNext();return;}
    _webSpeakLiveScene(sc, v, vol, function(){ttsLiveIdx++;setTimeout(speakNext,200);});
  }
  speakNext();
}

function _webSpeakLiveScene(sc, v, vol, onDone){
  if(!window.speechSynthesis){if(onDone)onDone();return;}
  // 씬 텍스트를 그대로 사용 (sc.text 우선, 없으면 sc.title)
  var text=(sc.text||sc.title||'').trim().slice(0,500);
  if(!text){if(onDone)onDone();return;}

  var lang=v?v.lang||'ko-KR':'ko-KR';
  var safeDur=Math.max(((sc.dur||5)+3)*1000, 4000);

  _getReadyVoice(lang, v&&v.sysVoice||null, function(voice){
    try{window.speechSynthesis.cancel();}catch(e){}
    setTimeout(function(){
      var utter=new SpeechSynthesisUtterance(text);
      utter.lang=lang;
      applyVoiceEffect(utter, v);
      if(v&&v.special==='asmr') utter.volume=Math.min(vol,0.55);
      else if(v&&v.special==='whisper') utter.volume=Math.min(vol,0.38);
      else utter.volume=Math.min(Math.max(vol||1,0.1),1.0);
      if(voice){try{utter.voice=voice;}catch(e){}}

      var done=false;
      function finish(){if(done) return; done=true; clearTimeout(safeTimer); if(onDone)onDone();}
      var safeTimer=setTimeout(function(){
        try{window.speechSynthesis.cancel();}catch(e){}
        finish();
      }, safeDur);
      utter.onend=finish;
      utter.onerror=function(e){
        console.warn('TTS 오류:',e.error,'|',text.slice(0,30));
        finish();
      };
      try{window.speechSynthesis.speak(utter);}catch(e){
        console.warn('speak error:',e);
        finish();
      }
    }, 100);
  });
}

function showDoneModal(blob){
  var m=document.getElementById('done-modal');
  if(!m) return;
  m.style.display='flex';
  try{
    var size=(blob.size/1024/1024).toFixed(2);
    var ratio=S.fmt==='short'?'9:16':S.fmt==='long'?'16:9':'1:1';
    var fmtLabel=blob._isMp4?'MP4 (고화질)':'WebM';
    var _dur=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
    var infoEl=document.getElementById('done-modal-info');
    if(infoEl) infoEl.textContent=fmtLabel+' · '+size+' MB · '+ratio+' · ≈'+Math.round(_dur)+'초';
    var vid=document.getElementById('done-modal-video');
    if(vid){
      if(vid._blobUrl){try{URL.revokeObjectURL(vid._blobUrl);}catch(e){}}
      var url=URL.createObjectURL(blob);
      vid._blobUrl=url;
      vid._isMp4=blob._isMp4;
      vid.src=url;
      try{vid.load();}catch(e){}
      vid.play().catch(function(){});
    }
  }catch(e){}
}

function closeDoneModal(){
  var m=document.getElementById('done-modal');
  if(m) m.style.display='none';
  var vid=document.getElementById('done-modal-video');
  if(vid){try{vid.pause();vid.src='';}catch(e){}}
  document.getElementById('make-btn').disabled=false;
  renderedBlob=null; recChunks=[];
  setStatus('새 영상을 제작하세요');
}

function trackDoneModal(action){
  // analytics stub — 필요 시 실제 트래킹 코드 삽입
  try{console.log('[done-modal]',action);}catch(e){}
}

function onComplete(blob){
  // ── 무조건 UI 전환 (어떤 에러가 발생해도 prog-box/render-modal은 사라짐) ──
  try{document.getElementById('prog-box').style.display='none';}catch(e){}
  try{document.getElementById('result-box').style.display='none';}catch(e){}
  try{document.getElementById('make-btn').disabled=false;}catch(e){}
  hideRenderModal();

  if(!blob){
    addLog('❌ onComplete: blob이 null입니다');
    setStatus('❌ 영상 생성 실패');
    return;
  }

  try{
    var size=(blob.size/1024/1024).toFixed(2);
    var fmtLabel=blob._isMp4?'MP4 (고화질)':'WebM';
    setStatus('✅ 영상 완성! '+size+'MB ('+fmtLabel+')');
    addLog('🎉 완료! '+size+'MB ('+fmtLabel+')');
    // result-box도 동기화 (갤러리 저장 등 result-box 의존 코드 호환)
    try{
      var ratio=S.fmt==='short'?'9:16':S.fmt==='long'?'16:9':'1:1';
      var _realDur=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
      try{document.getElementById('result-info').textContent=fmtLabel+' | '+size+' MB | '+ratio+' | ≈'+Math.round(_realDur)+'초';}catch(e){}
      var vid=document.getElementById('result-video');
      if(vid){
        if(vid._blobUrl){try{URL.revokeObjectURL(vid._blobUrl);}catch(e){}}
        var url=URL.createObjectURL(blob);
        vid._blobUrl=url;
        vid._isMp4=blob._isMp4;
        vid.src=url;
      }
    }catch(e){}
    // done-modal 표시
    showDoneModal(blob);
  }catch(err){
    addLog('⚠️ onComplete 내부 오류: '+(err&&err.message||String(err)));
    setStatus('⚠️ 영상 완성 (표시 오류 있음)');
    // 오류 시에도 done-modal 시도
    try{showDoneModal(blob);}catch(e){}
  }

  // ── R2 업로드 (백그라운드) ──
  try{uploadVideoToR2(blob);}catch(e){addLog('⚠️ R2 업로드 오류: '+(e&&e.message||e));}
}

// ── R2 영상 업로드 ──
function uploadVideoToR2(blob){
  if(!blob||blob.size<1000){addLog('⚠️ 업로드 건너뜀 (파일 너무 작음)');return;}
  // 로그인 사용자 확인
  var user=null;
  try{user=JSON.parse(localStorage.getItem('user')||'null');}catch(e){}
  if(!user||!user.id){addLog('⚠️ 로그인 필요 - 로컬 갤러리에만 저장됩니다.');return;}

  var firstSc=S.scenes[0]||{};
  var title=firstSc.title||(firstSc.text||'').slice(0,20)||'영상';
  var tplName=(TPLS[S.tplId]&&TPLS[S.tplId].n)||'';
  var now=new Date();
  var ratio=S.fmt==='short'?'9:16':S.fmt==='long'?'16:9':'1:1';
  var sizeMb=(blob.size/1024/1024).toFixed(2);
  // 캔버스 썸네일 캡처
  var thumb='';
  try{
    var cv=document.getElementById('pv');
    if(cv) thumb=cv.toDataURL('image/jpeg',0.5);
  }catch(e){}
  var _actualDur=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
  var meta={
    name:title.slice(0,50),
    fmt:S.fmt,
    tplName:tplName,
    dur:Math.round(_actualDur),
    title:title.slice(0,50)
  };
  addLog('☁️ R2 업로드 중...');
  var fileExt=blob._isMp4?'mp4':'webm';
  var fd=new FormData();
  fd.append('video',blob,'video_'+now.getTime()+'.'+fileExt); // 필드명: 'video'
  fd.append('meta',JSON.stringify(meta));
  fd.append('thumbnail',thumb);
  var headers={'X-User-Id':String(user.id)};
  fetch('/api/videos/upload',{method:'POST',headers:headers,body:fd})
    .then(function(r){return r.json();})
    .then(function(d){
      if(d.ok){
        addLog('✅ 갤러리 저장 완료! 내 영상 보관함에서 확인하세요.');
        updateGalleryCount();
      }else{
        addLog('⚠️ 갤러리 저장 실패: '+(d.error||'unknown'));
      }
    })
    .catch(function(e){addLog('⚠️ 업로드 오류: '+e.message);});
}

// 로컬 스토리지에 메타 저장 (갤러리용)
function saveVideoMetaLocal(meta,key,url){
  try{
    var list=JSON.parse(localStorage.getItem('sv_videos')||'[]');
    list.unshift({key:key,url:url,meta:meta});
    if(list.length>50) list=list.slice(0,50);
    localStorage.setItem('sv_videos',JSON.stringify(list));
  }catch(e){}
}

function doDownload(){
  var dateStr=new Date().toISOString().slice(0,10);
  var fname='superplace_video_'+dateStr+'.mp4';

  // ① renderedBlob 우선 (가장 신뢰할 수 있는 경로)
  if(renderedBlob && renderedBlob.size > 100){
    try{
      var url=URL.createObjectURL(renderedBlob);
      var a=document.createElement('a');
      a.style.display='none';
      a.href=url;
      a.download=fname;
      a.setAttribute('download',fname);
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        try{document.body.removeChild(a);}catch(e){}
        URL.revokeObjectURL(url);
      },8000);
      setStatus('⬇️ 다운로드 시작됨 ('+(renderedBlob._isMp4?'MP4':'WebM')+')');
      addLog('⬇️ 다운로드: '+fname+' | '+(renderedBlob.size/1024/1024).toFixed(2)+'MB | '+(renderedBlob._isMp4?'네이티브 MP4':'WebM'));
      return;
    }catch(err){
      addLog('⚠️ createObjectURL 실패, 폴백 시도: '+err.message);
    }
  }

  // ② video element _blobUrl 폴백
  var vid=document.getElementById('result-video');
  if(vid&&vid._blobUrl){
    try{
      var a2=document.createElement('a');
      a2.style.display='none';
      a2.href=vid._blobUrl;
      a2.download=fname;
      a2.setAttribute('download',fname);
      document.body.appendChild(a2);
      a2.click();
      setTimeout(function(){try{document.body.removeChild(a2);}catch(e){}},3000);
      setStatus('⬇️ 다운로드 시작됨 (폴백)');
      addLog('⬇️ 다운로드 폴백: _blobUrl 사용');
      return;
    }catch(e2){
      addLog('⚠️ 폴백 다운로드도 실패: '+e2.message);
    }
  }

  // ③ video.src가 blob: URL인 경우
  if(vid&&vid.src&&vid.src.startsWith('blob:')){
    try{
      var a3=document.createElement('a');
      a3.style.display='none';
      a3.href=vid.src;
      a3.download=fname;
      document.body.appendChild(a3);
      a3.click();
      setTimeout(function(){try{document.body.removeChild(a3);}catch(e){}},3000);
      setStatus('⬇️ 다운로드 시작됨 (src 폴백)');
      addLog('⬇️ 다운로드 폴백: video.src 사용');
      return;
    }catch(e3){
      addLog('⚠️ src 폴백도 실패: '+e3.message);
    }
  }

  // ④ 완전히 실패한 경우
  addLog('❌ 다운로드 실패: renderedBlob 및 blobUrl 모두 없음');
  alert('영상 데이터가 없습니다. 먼저 영상을 제작해주세요.');
}

function resetResult(){
  document.getElementById('result-box').style.display='none';
  closeDoneModal();
  document.getElementById('make-btn').disabled=false;
  renderedBlob=null;recChunks=[];
}

function cancelMake(){
  cancelledRender=true;
  if(window.speechSynthesis) window.speechSynthesis.cancel();
  if(mediaRec&&mediaRec.state!=='inactive'){try{mediaRec.requestData();mediaRec.stop();}catch(e){}}
  if(bgmOsc){try{bgmOsc.stop();}catch(e){}bgmOsc=null;}
  if(_recBGMAudio){try{_recBGMAudio.pause();_recBGMAudio.src='';}catch(e){}_recBGMAudio=null;}
  if(_recBGMCtx){try{_recBGMCtx.close();}catch(e){}_recBGMCtx=null;}
  try{document.getElementById('prog-box').style.display='none';}catch(e){}
  try{document.getElementById('make-btn').disabled=false;}catch(e){}
  hideRenderModal();
  setStatus('취소됨');
}

function showErr(msg){
  try{document.getElementById('prog-box').style.display='none';}catch(e){}
  try{document.getElementById('make-btn').disabled=false;}catch(e){}
  hideRenderModal();
  alert('오류: '+msg);
  setStatus('오류 발생');
}

// ══════════════════════════════════════════════════════════════
//  FORMAT / DURATION / TAB SWITCHING
// ══════════════════════════════════════════════════════════════
function setFmt(f){
  S.fmt=f;
  ['short','long','sq'].forEach(function(x){document.getElementById('fo-'+x).classList.remove('on');});
  document.getElementById('fo-'+f).classList.add('on');
  sceneImgs={};
  resizeCanvas();drawScene(curScene,1);
  autoMatchMedia();
}

function setDur(d,el){
  S.dur=d;
  document.querySelectorAll('.dc').forEach(function(e){e.classList.remove('on');});
  if(el) el.classList.add('on');
  var perScene=Math.max(3,Math.floor(d/Math.max(S.scenes.length,1)));
  S.scenes.forEach(function(sc){sc.dur=perScene;});
  resizeCanvas();
}

function switchLTab(tab,el){
  document.querySelectorAll('.ltab').forEach(function(t){t.classList.remove('on');});
  document.querySelectorAll('.ltab-panel').forEach(function(p){p.classList.remove('on');});
  if(el) el.classList.add('on');
  var panel=document.getElementById('ltp-'+tab);
  if(panel) panel.classList.add('on');
}

function useTpl(btn){
  var idx=parseInt(btn.getAttribute('data-tpl'),10);
  selectTpl(idx);
  // ★ 바로 씬 편집 화면으로 진입 (씬 수 선택 없이 기본값 7개로 즉시 시작)
  startFromTemplate();
}

function selTone(el){
  document.querySelectorAll('.tone-btn').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
}
function selCnt(n,el){
  var row=el.closest('.cnt-row')||document.getElementById('cnt-row');
  if(row) row.querySelectorAll('.cnt-btn').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
  el.dataset.cnt = n;
}
// 템플릿 패널 씬 수 선택
function selTplCnt(n,el){
  var row=document.getElementById('tpl-cnt-row');
  if(row) row.querySelectorAll('.cnt-btn').forEach(function(b){b.classList.remove('on');});
  el.classList.add('on');
  el.dataset.cnt = n;
}
function getTplCnt(){
  var row=document.getElementById('tpl-cnt-row');
  if(!row) return 7;
  var el=row.querySelector('.cnt-btn.on');
  return el ? parseInt(el.dataset.cnt||'7') : 7;
}
// 템플릿 선택 후 씬 수 지정 → 즉시 씬 편집 패널로 이동해 씬 생성
function startFromTemplate(){
  var count=getTplCnt();
  // 항상 씬을 새로 생성 (선택한 씬 수 기준)
  S.scenes=[];
  for(var i=0;i<count;i++){
    S.scenes.push({title:'씬 '+(i+1),text:'',kw:'',dur:5,transition:'none',img:null,imgBlob:null});
  }
  sceneImgs={};
  switchLTab('script',document.getElementById('ltab-script'));
  setScriptMode('scene');
  renderSceneList();
  renderSceneNav();
  drawScene(0,1);
  curScene=0;
  autoMatchMedia();
}
function getSelTone(){
  var el=document.querySelector('.tone-btn.on');
  return el ? el.dataset.tone : 'friendly';
}
function getSelCnt(){
  var row=document.getElementById('cnt-row');
  var el=row?row.querySelector('.cnt-btn.on'):document.querySelector('.cnt-btn.on');
  return el ? parseInt(el.dataset.cnt||'7') : 7;
}

// ══════════════════════════════════════════════════════════════
//  UTILS
// ══════════════════════════════════════════════════════════════
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function setStatus(msg){var el=document.getElementById('status-txt');if(el)el.textContent=msg;}
function addLog(msg){
  var el=document.getElementById('prog-log');if(el){el.innerHTML+=msg+'<br>';el.scrollTop=el.scrollHeight;}
  // render-modal 로그 동기화
  var ml=document.getElementById('render-modal-log');if(ml){ml.innerHTML+=msg+'<br>';ml.scrollTop=ml.scrollHeight;}
}
var _toastTimer=null;
function showToast(msg,dur){
  dur=dur||2200;
  var t=document.getElementById('sv-toast');
  if(!t){t=document.createElement('div');t.id='sv-toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg;
  if(_toastTimer) clearTimeout(_toastTimer);
  requestAnimationFrame(function(){t.classList.add('show');});
  _toastTimer=setTimeout(function(){t.classList.remove('show');},dur);
}

// ══════════════════════════════════════════════════════════════
//  EDITING OPTIONS — 100+ Trend-based options
// ══════════════════════════════════════════════════════════════
var TRANSITIONS = [
  {id:'none',n:'없음',ico:'⬜'},{id:'fade',n:'페이드',ico:'🌫️'},{id:'slide_left',n:'좌슬라이드',ico:'⬅️'},
  {id:'slide_right',n:'우슬라이드',ico:'➡️'},{id:'slide_up',n:'위슬라이드',ico:'⬆️'},{id:'slide_down',n:'아래',ico:'⬇️'},
  {id:'zoom_in',n:'줌인',ico:'🔍'},{id:'zoom_out',n:'줌아웃',ico:'🔎'},{id:'rotate',n:'회전',ico:'🔄'},
  {id:'flip_h',n:'좌우반전',ico:'↔️'},{id:'flip_v',n:'상하반전',ico:'↕️'},{id:'dissolve',n:'디졸브',ico:'✨'},
  {id:'wipe_left',n:'와이프좌',ico:'🃏'},{id:'wipe_right',n:'와이프우',ico:'🎴'},{id:'wipe_up',n:'와이프위',ico:'📤'},
  {id:'flash',n:'플래시',ico:'⚡'},{id:'glitch',n:'글리치',ico:'📺'},{id:'spin',n:'스핀',ico:'💫'},
  {id:'cube',n:'큐브',ico:'🎲'},{id:'split_h',n:'수평분할',ico:'〰️'},{id:'split_v',n:'수직분할',ico:'|'},
  {id:'bounce',n:'바운스',ico:'🏀'},{id:'push_left',n:'푸시좌',ico:'◀'},{id:'push_right',n:'푸시우',ico:'▶'},
  {id:'pull_left',n:'풀좌',ico:'⏪'},{id:'pull_right',n:'풀우',ico:'⏩'},{id:'cross_zoom',n:'크로스줌',ico:'✖️'},
  {id:'blur',n:'블러인',ico:'🌀'},{id:'pixelate',n:'픽셀화',ico:'🔲'},{id:'spiral',n:'스파이럴',ico:'🌀'},
  {id:'morph',n:'모프',ico:'🔮'},{id:'particle',n:'파티클',ico:'🎆'}
];

var FILTERS = [
  {id:'none',n:'원본',ico:'🎨'},{id:'vintage',n:'빈티지',ico:'📷'},{id:'cinema',n:'시네마',ico:'🎬'},
  {id:'bright',n:'밝게',ico:'☀️'},{id:'dark',n:'어둡게',ico:'🌙'},{id:'vivid',n:'비비드',ico:'🌈'},
  {id:'pastel',n:'파스텔',ico:'🌸'},{id:'mono',n:'흑백',ico:'⬛'},{id:'sepia',n:'세피아',ico:'🟤'},
  {id:'cool',n:'쿨톤',ico:'❄️'},{id:'warm',n:'웜톤',ico:'🔥'},{id:'neon',n:'네온',ico:'💜'},
  {id:'hdr',n:'HDR',ico:'🌟'},{id:'fade',n:'페이디드',ico:'🌫️'},{id:'matte',n:'매트',ico:'🎭'},
  {id:'golden',n:'골든아워',ico:'🌅'},{id:'night',n:'나이트',ico:'🌃'},{id:'fog',n:'포그',ico:'🌁'},
  {id:'pop',n:'팝아트',ico:'🎪'},{id:'film',n:'필름',ico:'📽️'},{id:'dreamy',n:'드리미',ico:'💭'},
  {id:'sharp',n:'샤프',ico:'🔪'},{id:'soft',n:'소프트',ico:'🌙'},{id:'contrast',n:'고대비',ico:'⚡'},
  {id:'summer',n:'썸머',ico:'🏖️'}
];

var SUBTITLE_STYLES = [
  {id:'none',n:'없음'},{id:'bold_white',n:'흰색 굵게'},{id:'yellow_outline',n:'노란 외곽선'},
  {id:'black_box',n:'검은 박스'},{id:'gradient_bg',n:'그라디언트'},{id:'neon_glow',n:'네온 글로우'},
  {id:'minimal',n:'미니멀'},{id:'capcut_style',n:'숏폼 스타일'},{id:'reels_style',n:'릴스 스타일'},
  {id:'youtube_style',n:'유튜브 스타일'},{id:'karaoke',n:'노래방 스타일'},{id:'bounce_anim',n:'바운스'},
  {id:'type_effect',n:'타이핑 효과'},{id:'fade_in',n:'페이드인'},{id:'slide_up',n:'슬라이드업'},
  {id:'pop_up',n:'팝업'},{id:'shadow_bold',n:'진한 그림자'},{id:'outline_color',n:'컬러 외곽선'},
  {id:'rounded_bg',n:'라운드 박스'},{id:'blur_bg',n:'블러 배경'}
];

var OVERLAY_EFFECTS = [
  {id:'none',n:'없음',ico:'⬜'},{id:'particles',n:'파티클',ico:'✨'},{id:'stars',n:'별',ico:'⭐'},
  {id:'snow',n:'눈',ico:'❄️'},{id:'rain',n:'비',ico:'🌧️'},{id:'confetti',n:'컨페티',ico:'🎊'},
  {id:'sparkle',n:'스파클',ico:'💫'},{id:'hearts',n:'하트',ico:'❤️'},{id:'fire',n:'불꽃',ico:'🔥'},
  {id:'bubbles',n:'버블',ico:'🫧'},{id:'lightning',n:'번개',ico:'⚡'},{id:'smoke',n:'스모크',ico:'💨'},
  {id:'lens_flare',n:'렌즈플레어',ico:'🌟'},{id:'grain',n:'노이즈',ico:'📺'},{id:'vignette',n:'비네트',ico:'🔵'},
  {id:'scanlines',n:'스캔라인',ico:'📡'}
];

var MOOD_OPTS = [
  {id:'normal',n:'기본',ico:'📹'},{id:'dramatic',n:'드라마틱',ico:'🎭'},
  {id:'upbeat',n:'업비트',ico:'⚡'},{id:'calm',n:'잔잔한',ico:'🌊'},
  {id:'cinematic',n:'시네마틱',ico:'🎬'},{id:'dreamy',n:'몽환',ico:'💭'},
  {id:'intense',n:'강렬한',ico:'🔥'},{id:'minimal',n:'미니멀',ico:'✨'}
];

var ADS_OPTS = [
  {id:'adsBadge',n:'광고 배지',ico:'📢'},{id:'adsPrice',n:'가격 표시',ico:'💰'},
  {id:'adsCTA',n:'CTA 버튼',ico:'👆'},{id:'adsSale',n:'할인 배너',ico:'🏷️'},
  {id:'adsTimer',n:'한정 타이머',ico:'⏰'},{id:'adsBrand',n:'브랜드 로고',ico:'🔲'},
  {id:'adsReviews',n:'리뷰 별점',ico:'⭐'},{id:'adsPhone',n:'전화번호',ico:'📞'}
];

var TEXT_ANIMS = [
  {id:'slide',n:'슬라이드',ico:'→'},{id:'fade',n:'페이드',ico:'🌫'},{id:'bounce',n:'바운스',ico:'↕'},
  {id:'pop',n:'팝',ico:'💥'},{id:'type',n:'타이핑',ico:'⌨'},{id:'spin',n:'스핀',ico:'🔄'},
  {id:'zoom',n:'줌',ico:'🔍'},{id:'wave',n:'웨이브',ico:'〰'},{id:'glitch',n:'글리치',ico:'📺'},
  {id:'float',n:'플로팅',ico:'💭'},{id:'shake',n:'쉐이크',ico:'📳'},{id:'neon',n:'네온',ico:'💜'}
];

var PLATFORM_OPTS = [
  {id:'short',n:'숏폼 9:16',ico:'📱'},{id:'youtube',n:'유튜브 16:9',ico:'▶️'},
  {id:'reels',n:'릴스 9:16',ico:'🎭'},{id:'capcut',n:'숏폼',ico:'📱'},
  {id:'tiktok',n:'틱톡 9:16',ico:'🎵'},{id:'square',n:'정방형 1:1',ico:'⬜'},
  {id:'story',n:'스토리 9:16',ico:'📖'},{id:'thumbnail',n:'썸네일',ico:'🖼️'}
];

function initEditingOptions() {
  var container = document.getElementById('edit-opts-container');
  if (!container) return;

  // ── 편집 탭 구조 주입 ──
  container.innerHTML = [
    // 탭 버튼
    '<div id="ed-tabs" style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:10px">',
      '<button class="ed-tab on" data-tab="0">🎬 전환</button>',
      '<button class="ed-tab" data-tab="1">🎨 필터</button>',
      '<button class="ed-tab" data-tab="2">💬 자막</button>',
      '<button class="ed-tab" data-tab="3">🌈 오버레이</button>',
      '<button class="ed-tab" data-tab="4">✨ 텍스트</button>',
      '<button class="ed-tab" data-tab="5">🎚 조정</button>',
      '<button class="ed-tab" data-tab="6">📢 광고</button>',
      '<button class="ed-tab" data-tab="7">📐 포맷</button>',
    '</div>',

    // 패널 0: 전환 효과
    '<div class="ed-panel" id="edp-0">',
      '<div class="lp-title" style="margin-bottom:6px">↔ 씬 전환 효과</div>',
      '<div class="ed-grid-3" id="transition-opts"></div>',
    '</div>',

    // 패널 1: 필터
    '<div class="ed-panel" id="edp-1" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">🎨 색감 필터</div>',
      '<div class="ed-grid-3" id="filter-opts"></div>',
      // 세부 조정 슬라이더
      '<div class="lp-title" style="margin:10px 0 6px">🔆 세부 조정</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">밝기</span><input type="range" id="sl-bright" min="50" max="200" value="100" step="5"><span class="ed-slider-val" id="sv-bright">100%</span></div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">대비</span><input type="range" id="sl-contrast" min="50" max="200" value="100" step="5"><span class="ed-slider-val" id="sv-contrast">100%</span></div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">채도</span><input type="range" id="sl-sat" min="0" max="300" value="100" step="5"><span class="ed-slider-val" id="sv-sat">100%</span></div>',
    '</div>',

    // 패널 2: 자막
    '<div class="ed-panel" id="edp-2" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">💬 자막 스타일</div>',
      '<div class="sub-style-row" id="subtitle-opts"></div>',
      '<div class="lp-title" style="margin:10px 0 6px">📐 자막 위치/크기</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">위치</span><input type="range" id="sl-subpos" min="50" max="98" value="85" step="1"><span class="ed-slider-val" id="sv-subpos">85%</span></div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">크기</span><input type="range" id="sl-subsize" min="60" max="200" value="100" step="5"><span class="ed-slider-val" id="sv-subsize">100%</span></div>',
      // 학원/채널 이름 — 모든 템플릿 실시간 반영
      '<div class="lp-title" style="margin:10px 0 6px">🏫 학원/채널 이름</div>',
      '<input id="inp-brandname" type="text" placeholder="예) 강남영어학원" maxlength="20" oninput="editOpts.brandName=this.value.trim();drawScene(curScene,1);_refreshBlks(curScene);" style="width:100%;box-sizing:border-box;padding:6px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:10px;font-family:inherit;outline:none;background:var(--surface2);color:var(--text)">',
      '<div style="font-size:9px;color:var(--text-muted);margin-top:4px;padding:0 2px">입력하는 즉시 모든 템플릿 브랜드명·장식 텍스트에 반영됩니다</div>',
      // 조회수 (앱광고형 제목 하단)
      '<div class="lp-title" style="margin:10px 0 6px">👁 조회수 <span style="font-size:9px;font-weight:400;color:var(--text-muted)">(앱광고형 제목 하단)</span></div>',
      '<div style="display:flex;gap:6px;align-items:center">',
        '<input id="inp-viewcount" type="text" placeholder="예) 2,823,810" maxlength="15" style="flex:1;padding:6px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:10px;font-family:inherit;outline:none;background:var(--surface2);color:var(--text)">',
        '<button onclick="applyViewCount()" style="padding:6px 10px;background:var(--primary);color:#fff;border:none;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer">적용</button>',
      '</div>',
      // 워터마크
      '<div class="lp-title" style="margin:10px 0 6px">🔏 워터마크 텍스트</div>',
      '<div style="display:flex;gap:6px;align-items:center">',
        '<input id="inp-watermark" type="text" placeholder="예) @내채널" maxlength="30" style="flex:1;padding:6px 9px;border:1.5px solid var(--border);border-radius:7px;font-size:10px;font-family:inherit;outline:none;background:var(--surface2);color:var(--text)">',
        '<button onclick="applyWatermark()" style="padding:6px 10px;background:var(--primary);color:#fff;border:none;border-radius:7px;font-size:10px;font-weight:700;cursor:pointer">적용</button>',
      '</div>',
    '</div>',

    // 패널 3: 오버레이
    '<div class="ed-panel" id="edp-3" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">🌈 오버레이 효과</div>',
      '<div class="ed-grid-3" id="overlay-opts"></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🎭 분위기</div>',
      '<div class="ed-grid-3" id="mood-opts"></div>',
    '</div>',

    // 패널 4: 텍스트 애니메이션
    '<div class="ed-panel" id="edp-4" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">✨ 텍스트 애니메이션</div>',
      '<div class="ed-grid-3" id="anim-opts"></div>',
      '<div class="lp-title" style="margin:10px 0 6px">📝 텍스트 정렬</div>',
      '<div class="ed-grid-3" id="textalign-opts">',
        '<div class="ed-opt'+(editOpts.textAlign==='left'?' on':'')+' ed-act" data-key="textAlign" data-val="left"><span class="ed-opt-ico">◀</span><div class="ed-opt-name">왼쪽</div></div>',
        '<div class="ed-opt'+(editOpts.textAlign==='center'||!editOpts.textAlign?' on':'')+' ed-act" data-key="textAlign" data-val="center"><span class="ed-opt-ico">☰</span><div class="ed-opt-name">가운데</div></div>',
        '<div class="ed-opt'+(editOpts.textAlign==='right'?' on':'')+' ed-act" data-key="textAlign" data-val="right"><span class="ed-opt-ico">▶</span><div class="ed-opt-name">오른쪽</div></div>',
      '</div>',
      '<div class="lp-title" style="margin:10px 0 6px">📏 텍스트 크기</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">제목</span><input type="range" id="sl-titlesize" min="60" max="200" value="100" step="5"><span class="ed-slider-val" id="sv-titlesize">100%</span></div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">본문</span><input type="range" id="sl-bodysize" min="60" max="200" value="100" step="5"><span class="ed-slider-val" id="sv-bodysize">100%</span></div>',
    '</div>',

    // 패널 5: 세부 조정
    '<div class="ed-panel" id="edp-5" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">⏱ 재생 속도</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">속도</span><input type="range" id="sl-speed" min="50" max="200" value="100" step="10"><span class="ed-slider-val" id="sv-speed">1.0x</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🔊 BGM 볼륨</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">볼륨</span><input type="range" id="sl-bgmvol2" min="0" max="100" value="20" step="5"><span class="ed-slider-val" id="sv-bgmvol2">20%</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🎙 목소리 볼륨</div>',
      '<div class="ed-slider-row"><span class="ed-slider-lbl">볼륨</span><input type="range" id="sl-vcvol2" min="0" max="100" value="100" step="5"><span class="ed-slider-val" id="sv-vcvol2">100%</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">📐 배경 여백</div>',
      '<div class="ed-grid" id="bgfit-opts">',
        '<div class="ed-opt'+(editOpts.bgFit==='cover'||!editOpts.bgFit?' on':'')+' ed-act" data-key="bgFit" data-val="cover"><span class="ed-opt-ico">⬛</span><div class="ed-opt-name">꽉 채움</div></div>',
        '<div class="ed-opt'+(editOpts.bgFit==='contain'?' on':'')+' ed-act" data-key="bgFit" data-val="contain"><span class="ed-opt-ico">⬜</span><div class="ed-opt-name">여백 유지</div></div>',
      '</div>',
    '</div>',

    // 패널 6: 광고 요소
    '<div class="ed-panel" id="edp-6" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">📢 광고 요소</div>',
      '<div class="ed-grid" id="ads-opts"></div>',
    '</div>',

    // 패널 7: 포맷/플랫폼
    '<div class="ed-panel" id="edp-7" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">📐 플랫폼 최적화</div>',
      '<div class="ed-grid" id="platform-opts"></div>',
    '</div>',

    // 패널 8: 색상 설정
    '<div class="ed-panel" id="edp-8" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">🎨 제목 색상</div>',
      '<div class="color-grid" id="title-color-grid"></div>',
      '<div class="color-custom-row"><label>직접입력</label><input type="color" id="title-color-custom" value="#ffffff"><span id="title-color-hex" style="font-size:9px;color:var(--text4);font-weight:700">#ffffff</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🖊 본문 색상</div>',
      '<div class="color-grid" id="body-color-grid"></div>',
      '<div class="color-custom-row"><label>직접입력</label><input type="color" id="body-color-custom" value="#e2e8f0"><span id="body-color-hex" style="font-size:9px;color:var(--text4);font-weight:700">#e2e8f0</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🖼 배경 색상</div>',
      '<div class="color-grid" id="bg-color-grid"></div>',
      '<div class="color-custom-row"><label>직접입력</label><input type="color" id="bg-color-custom" value="#0f0f1a"><span id="bg-color-hex" style="font-size:9px;color:var(--text4);font-weight:700">#0f0f1a</span></div>',
      '<div class="lp-title" style="margin:10px 0 6px">🌈 배경 그라디언트</div>',
      '<div class="ed-grid" id="bg-gradient-opts"></div>',
    '</div>',

    // 패널 9: 스티커/이모지
    '<div class="ed-panel" id="edp-9" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">😀 씬에 스티커 추가</div>',
      '<div style="font-size:9px;color:var(--text4);margin-bottom:6px">클릭하면 현재 씬에 스티커가 추가됩니다</div>',
      '<div class="lp-title" style="font-size:9px;margin-bottom:4px">감정</div>',
      '<div class="sticker-grid" id="sticker-emotion"></div>',
      '<div class="lp-title" style="font-size:9px;margin:8px 0 4px">비즈니스</div>',
      '<div class="sticker-grid" id="sticker-biz"></div>',
      '<div class="lp-title" style="font-size:9px;margin:8px 0 4px">트렌드</div>',
      '<div class="sticker-grid" id="sticker-trend"></div>',
      '<div class="lp-title" style="margin:10px 0 6px">📋 씬 스티커 목록</div>',
      '<div id="sticker-list" style="font-size:9px;color:var(--text4)">선택된 스티커 없음</div>',
      '<button onclick="clearSceneStickers()" style="margin-top:6px;width:100%;padding:6px;background:rgba(239,68,68,.1);color:#ef4444;border:1px solid rgba(239,68,68,.3);border-radius:7px;font-size:9px;font-weight:700;cursor:pointer">🗑 스티커 전체 제거</button>',
    '</div>',

    // 패널 10: 씬별 BGM
    '<div class="ed-panel" id="edp-10" style="display:none">',
      '<div class="lp-title" style="margin-bottom:6px">🎵 씬별 개별 BGM</div>',
      '<div style="font-size:9px;color:var(--text4);margin-bottom:8px">각 씬마다 다른 배경음악을 지정할 수 있습니다. 비워두면 전체 BGM이 사용됩니다.</div>',
      '<div id="scene-bgm-list"></div>',
    '</div>',
  ].join('');

  // 탭 스위치 이벤트
  container.querySelectorAll('.ed-tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      var tab = btn.getAttribute('data-tab');
      container.querySelectorAll('.ed-tab').forEach(function(b){b.classList.remove('on');});
      container.querySelectorAll('.ed-panel').forEach(function(p){p.style.display='none';});
      btn.classList.add('on');
      var panel = document.getElementById('edp-'+tab);
      if(panel) panel.style.display='block';
    });
  });

  // ── 각 섹션 데이터 채우기 ──
  var transEl = document.getElementById('transition-opts');
  if(transEl) {
    transEl.innerHTML = TRANSITIONS.map(function(t){
      return '<div class="ed-opt'+(editOpts.transition===t.id?' on':'')+' ed-act" data-key="transition" data-val="'+t.id+'" title="'+t.n+'">'+
        '<span class="ed-opt-ico">'+t.ico+'</span>'+
        '<div class="ed-opt-name">'+t.n+'</div></div>';
    }).join('');
  }
  var filtEl = document.getElementById('filter-opts');
  if(filtEl) {
    filtEl.innerHTML = FILTERS.map(function(f){
      return '<div class="ed-opt'+(editOpts.filter===f.id?' on':'')+' ed-act" data-key="filter" data-val="'+f.id+'" title="'+f.n+'">'+
        '<span class="ed-opt-ico">'+f.ico+'</span>'+
        '<div class="ed-opt-name">'+f.n+'</div></div>';
    }).join('');
  }
  var subEl = document.getElementById('subtitle-opts');
  if(subEl) {
    subEl.innerHTML = SUBTITLE_STYLES.map(function(s){
      return '<span class="ss'+(editOpts.subtitle===s.id?' on':'')+' ed-act" data-key="subtitle" data-val="'+s.id+'">'+s.n+'</span>';
    }).join('');
  }
  var ovEl = document.getElementById('overlay-opts');
  if(ovEl) {
    ovEl.innerHTML = OVERLAY_EFFECTS.map(function(o){
      return '<div class="ed-opt'+(editOpts.overlay===o.id?' on':'')+' ed-act" data-key="overlay" data-val="'+o.id+'" title="'+o.n+'">'+
        '<span class="ed-opt-ico">'+o.ico+'</span>'+
        '<div class="ed-opt-name">'+o.n+'</div></div>';
    }).join('');
  }
  var moodEl = document.getElementById('mood-opts');
  if(moodEl) {
    moodEl.innerHTML = MOOD_OPTS.map(function(m){
      return '<div class="ed-opt'+(editOpts.mood===m.id?' on':'')+' ed-act" data-key="mood" data-val="'+m.id+'" title="'+m.n+'">'+
        '<span class="ed-opt-ico">'+m.ico+'</span>'+
        '<div class="ed-opt-name">'+m.n+'</div></div>';
    }).join('');
  }
  var adsEl = document.getElementById('ads-opts');
  if(adsEl) {
    adsEl.innerHTML = ADS_OPTS.map(function(a){
      var on = editOpts[a.id] ? ' on' : '';
      return '<div class="ed-opt'+on+' ads-act" data-ads-id="'+a.id+'" title="'+a.n+'">'+
        '<span class="ed-opt-ico">'+a.ico+'</span>'+
        '<div class="ed-opt-name">'+a.n+'</div></div>';
    }).join('');
  }
  var animEl = document.getElementById('anim-opts');
  if(animEl) {
    animEl.innerHTML = TEXT_ANIMS.map(function(a){
      return '<div class="ed-opt'+(editOpts.textAnim===a.id?' on':'')+' ed-act" data-key="textAnim" data-val="'+a.id+'" title="'+a.n+'">'+
        '<span class="ed-opt-ico">'+a.ico+'</span>'+
        '<div class="ed-opt-name">'+a.n+'</div></div>';
    }).join('');
  }
  var platEl = document.getElementById('platform-opts');
  if(platEl) {
    platEl.innerHTML = PLATFORM_OPTS.map(function(p){
      return '<div class="ed-opt'+(editOpts.platform===p.id?' on':'')+' plat-act" data-plat-id="'+p.id+'" title="'+p.n+'">'+
        '<span class="ed-opt-ico">'+p.ico+'</span>'+
        '<div class="ed-opt-name">'+p.n+'</div></div>';
    }).join('');
  }

  // ── 슬라이더 이벤트 ──
  _bindSlider('sl-bright','sv-bright',function(v){
    editOpts.brightness=v/100;
    applyAdjustToCanvas();
  },function(v){return v+'%';});
  _bindSlider('sl-contrast','sv-contrast',function(v){
    editOpts.contrast=v/100;
    applyAdjustToCanvas();
  },function(v){return v+'%';});
  _bindSlider('sl-sat','sv-sat',function(v){
    editOpts.saturation=v/100;
    applyAdjustToCanvas();
  },function(v){return v+'%';});
  _bindSlider('sl-subpos','sv-subpos',function(v){
    editOpts.subPos=v/100;
    drawScene(curScene,1);
  },function(v){return v+'%';});
  _bindSlider('sl-subsize','sv-subsize',function(v){
    editOpts.subSize=v/100;
    drawScene(curScene,1);
  },function(v){return v+'%';});
  _bindSlider('sl-speed','sv-speed',function(v){
    editOpts.vidSpeed=v/100;
  },function(v){return (v/100).toFixed(1)+'x';});
  _bindSlider('sl-bgmvol2','sv-bgmvol2',function(v){
    bgmVol=v/100;
    var bgmEl=document.getElementById('bgm-vol');
    if(bgmEl) bgmEl.value=String(bgmVol);
    var bgmValEl=document.getElementById('bgm-vol-val');
    if(bgmValEl) bgmValEl.textContent=v+'%';
  },function(v){return v+'%';});
  _bindSlider('sl-vcvol2','sv-vcvol2',function(v){
    var vcEl=document.getElementById('vc-vol');
    if(vcEl) { vcEl.value=String(v/100); }
  },function(v){return v+'%';});
  _bindSlider('sl-titlesize','sv-titlesize',function(v){
    editOpts.titleSize=v/100;
    drawScene(curScene,1);
  },function(v){return v+'%';});
  _bindSlider('sl-bodysize','sv-bodysize',function(v){
    editOpts.bodySize=v/100;
    drawScene(curScene,1);
  },function(v){return v+'%';});

  // ── 색상 패널 초기화 ──
  _initColorPanels();

  // ── 스티커 패널 초기화 ──
  _initStickerPanel();

  // ── 씬 BGM 패널 초기화 ──
  renderSceneBGMList();

  // ── 이벤트 리스너 연결 ──
  attachEditingListeners();
}

// ══════════════════════════════════════════════════════════════
//  색상 선택 패널 초기화
// ══════════════════════════════════════════════════════════════
var COLOR_PALETTE = [
  '#ffffff','#f8fafc','#e2e8f0','#94a3b8','#64748b','#334155','#1e293b','#0f172a',
  '#fef2f2','#fee2e2','#fca5a5','#ef4444','#dc2626','#b91c1c','#7f1d1d','#450a0a',
  '#fff7ed','#ffedd5','#fed7aa','#fb923c','#f97316','#ea580c','#9a3412','#431407',
  '#fefce8','#fef9c3','#fde047','#facc15','#eab308','#ca8a04','#854d0e','#422006',
  '#f0fdf4','#dcfce7','#86efac','#4ade80','#22c55e','#16a34a','#166534','#052e16',
  '#ecfdf5','#d1fae5','#6ee7b7','#34d399','#10b981','#059669','#065f46','#022c22',
  '#f0f9ff','#e0f2fe','#7dd3fc','#38bdf8','#0ea5e9','#0284c7','#075985','#082f49',
  '#eff6ff','#dbeafe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e3a8a',
  '#f5f3ff','#ede9fe','#c4b5fd','#a78bfa','#8b5cf6','#7c3aed','#6d28d9','#4c1d95',
  '#fdf4ff','#fae8ff','#e879f9','#d946ef','#c026d3','#a21caf','#7e22ce','#3b0764',
  '#fff1f2','#ffe4e6','#fda4af','#fb7185','#f43f5e','#e11d48','#9f1239','#4c0519',
  '#18181b','#27272a','#3f3f46','#52525b','#71717a','#a1a1aa','#d4d4d8','#f4f4f5'
];

var BG_GRADIENTS = [
  {id:'none',n:'없음',css:''},
  {id:'purple_blue',n:'보라↗파랑',css:'linear-gradient(135deg,#667eea,#764ba2)'},
  {id:'sunset',n:'선셋',css:'linear-gradient(135deg,#f093fb,#f5576c)'},
  {id:'ocean',n:'오션',css:'linear-gradient(135deg,#4facfe,#00f2fe)'},
  {id:'forest',n:'포레스트',css:'linear-gradient(135deg,#43e97b,#38f9d7)'},
  {id:'fire',n:'파이어',css:'linear-gradient(135deg,#fa709a,#fee140)'},
  {id:'night',n:'나이트',css:'linear-gradient(135deg,#0c3483,#a2b6df)'},
  {id:'gold',n:'골드',css:'linear-gradient(135deg,#f7971e,#ffd200)'},
  {id:'rose',n:'로즈',css:'linear-gradient(135deg,#fc5c7d,#6a3093)'},
  {id:'mint',n:'민트',css:'linear-gradient(135deg,#0ba360,#3cba92)'},
  {id:'dark_pro',n:'다크프로',css:'linear-gradient(135deg,#1a1a2e,#16213e)'},
  {id:'neon_purple',n:'네온보라',css:'linear-gradient(135deg,#6e45e2,#88d3ce)'},
  {id:'black_gold',n:'블랙골드',css:'linear-gradient(135deg,#373b44,#4286f4)'},
  {id:'aurora',n:'오로라',css:'linear-gradient(135deg,#a8edea,#fed6e3)'}
];

function _initColorPanels(){
  // 제목 색상
  var titleGrid=document.getElementById('title-color-grid');
  if(titleGrid){
    titleGrid.innerHTML=COLOR_PALETTE.map(function(c){
      var on=(editOpts.titleColor||'#ffffff')===c?' on':'';
      return '<div class="color-swatch'+on+'" style="background:'+c+'" data-color="'+c+'" data-target="titleColor" title="'+c+'"></div>';
    }).join('');
  }
  // 본문 색상
  var bodyGrid=document.getElementById('body-color-grid');
  if(bodyGrid){
    bodyGrid.innerHTML=COLOR_PALETTE.map(function(c){
      var on=(editOpts.bodyColor||'#e2e8f0')===c?' on':'';
      return '<div class="color-swatch'+on+'" style="background:'+c+'" data-color="'+c+'" data-target="bodyColor" title="'+c+'"></div>';
    }).join('');
  }
  // 배경 색상
  var bgGrid=document.getElementById('bg-color-grid');
  if(bgGrid){
    bgGrid.innerHTML=COLOR_PALETTE.map(function(c){
      var on=(editOpts.bgColor||'#0f0f1a')===c?' on':'';
      return '<div class="color-swatch'+on+'" style="background:'+c+';border:1px solid rgba(255,255,255,.2)" data-color="'+c+'" data-target="bgColor" title="'+c+'"></div>';
    }).join('');
  }
  // 배경 그라디언트
  var bgGradEl=document.getElementById('bg-gradient-opts');
  if(bgGradEl){
    bgGradEl.innerHTML=BG_GRADIENTS.map(function(g){
      var on=(editOpts.bgGradient||'none')===g.id?' on':'';
      var bg=g.css||'#1e1e2e';
      return '<div class="ed-opt'+on+'" data-grad="'+g.id+'" title="'+g.n+'" style="background:'+bg+';border:1.5px solid rgba(255,255,255,.15);cursor:pointer">'+
        '<div style="height:20px;border-radius:5px;background:'+bg+'"></div>'+
        '<div class="ed-opt-name" style="color:#fff">'+g.n+'</div></div>';
    }).join('');
    bgGradEl.querySelectorAll('.ed-opt').forEach(function(el){
      el.addEventListener('click',function(){setBgGradient(el.getAttribute('data-grad'),el);});
    });
  }
  // 색상 클릭 이벤트
  document.querySelectorAll('.color-swatch').forEach(function(el){
    el.addEventListener('click',function(){
      var color=el.getAttribute('data-color');
      var target=el.getAttribute('data-target');
      _applyColor(target,color);
      el.closest('.color-grid').querySelectorAll('.color-swatch').forEach(function(s){s.classList.remove('on');});
      el.classList.add('on');
    });
  });
  // 커스텀 색상 입력
  _bindColorCustom('title-color-custom','title-color-hex','titleColor');
  _bindColorCustom('body-color-custom','body-color-hex','bodyColor');
  _bindColorCustom('bg-color-custom','bg-color-hex','bgColor');
}

function _bindColorCustom(inputId, hexId, target){
  var inp=document.getElementById(inputId);
  var hex=document.getElementById(hexId);
  if(!inp) return;
  inp.addEventListener('input',function(){
    var c=this.value;
    if(hex) hex.textContent=c;
    _applyColor(target,c);
  });
}

function _applyColor(target, color){
  editOpts[target]=color;
  drawScene(curScene,1);
}

function setBgGradient(id, el){
  editOpts.bgGradient=id;
  if(el){
    var parent=el.parentElement;
    if(parent) parent.querySelectorAll('.ed-opt').forEach(function(e){e.classList.remove('on');});
    el.classList.add('on');
  }
  drawScene(curScene,1);
}

// ══════════════════════════════════════════════════════════════
//  스티커/이모지 패널
// ══════════════════════════════════════════════════════════════
// Twemoji SVG 스티커 (emoji + CDN URL 쌍)
// Base: https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/{codepoint}.svg
var _TW='https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/svg/';
function _tw(cp){return _TW+cp+'.svg';}
var STICKERS_EMOTION=[
  {e:'😀',u:_tw('1f600')},{e:'😂',u:_tw('1f602')},{e:'🥰',u:_tw('1f970')},
  {e:'😍',u:_tw('1f60d')},{e:'🤩',u:_tw('1f929')},{e:'😎',u:_tw('1f60e')},
  {e:'🥳',u:_tw('1f973')},{e:'🎉',u:_tw('1f389')},{e:'❤️',u:_tw('2764')},
  {e:'💕',u:_tw('1f495')},{e:'🔥',u:_tw('1f525')},{e:'⚡',u:_tw('26a1')},
  {e:'💯',u:_tw('1f4af')},{e:'👍',u:_tw('1f44d')},{e:'🙌',u:_tw('1f64c')},
  {e:'✨',u:_tw('2728')},{e:'💪',u:_tw('1f4aa')},{e:'🎯',u:_tw('1f3af')},
  {e:'🚀',u:_tw('1f680')},{e:'💡',u:_tw('1f4a1')},{e:'🌟',u:_tw('1f31f')},
  {e:'⭐',u:_tw('2b50')},{e:'🏆',u:_tw('1f3c6')},{e:'🎊',u:_tw('1f38a')},
  {e:'💥',u:_tw('1f4a5')},{e:'👏',u:_tw('1f44f')},{e:'🤝',u:_tw('1f91d')},
  {e:'😱',u:_tw('1f631')},{e:'🥺',u:_tw('1f97a')},{e:'😤',u:_tw('1f624')}
];
var STICKERS_BIZ=[
  {e:'📢',u:_tw('1f4e2')},{e:'💰',u:_tw('1f4b0')},{e:'💎',u:_tw('1f48e')},
  {e:'📱',u:_tw('1f4f1')},{e:'💻',u:_tw('1f4bb')},{e:'📊',u:_tw('1f4ca')},
  {e:'📈',u:_tw('1f4c8')},{e:'🎯',u:_tw('1f3af')},{e:'🔑',u:_tw('1f511')},
  {e:'💼',u:_tw('1f4bc')},{e:'🏆',u:_tw('1f3c6')},{e:'⭐',u:_tw('2b50')},
  {e:'📌',u:_tw('1f4cc')},{e:'🔔',u:_tw('1f514')},{e:'✅',u:_tw('2705')},
  {e:'❌',u:_tw('274c')},{e:'⚠️',u:_tw('26a0')},{e:'💡',u:_tw('1f4a1')},
  {e:'🔥',u:_tw('1f525')},{e:'🌐',u:_tw('1f310')},{e:'📧',u:_tw('1f4e7')},
  {e:'📞',u:_tw('1f4de')},{e:'🛒',u:_tw('1f6d2')},{e:'💳',u:_tw('1f4b3')},
  {e:'📦',u:_tw('1f4e6')},{e:'🚚',u:_tw('1f69a')},{e:'🎁',u:_tw('1f381')},
  {e:'💝',u:_tw('1f49d')},{e:'📣',u:_tw('1f4e3')},{e:'🤑',u:_tw('1f911')}
];
var STICKERS_TREND=[
  {e:'🌈',u:_tw('1f308')},{e:'🦋',u:_tw('1f98b')},{e:'🌸',u:_tw('1f338')},
  {e:'🌺',u:_tw('1f33a')},{e:'🍀',u:_tw('1f340')},{e:'🌙',u:_tw('1f319')},
  {e:'☀️',u:_tw('2600')},{e:'🌊',u:_tw('1f30a')},{e:'🎵',u:_tw('1f3b5')},
  {e:'🎶',u:_tw('1f3b6')},{e:'🎸',u:_tw('1f3b8')},{e:'🎤',u:_tw('1f3a4')},
  {e:'🎬',u:_tw('1f3ac')},{e:'📸',u:_tw('1f4f8')},{e:'🎨',u:_tw('1f3a8')},
  {e:'🎭',u:_tw('1f3ad')},{e:'🌴',u:_tw('1f334')},{e:'🦚',u:_tw('1f99a')},
  {e:'🌻',u:_tw('1f33b')},{e:'💐',u:_tw('1f490')},{e:'🍓',u:_tw('1f353')},
  {e:'🍉',u:_tw('1f349')},{e:'🌮',u:_tw('1f32e')},{e:'🍕',u:_tw('1f355')},
  {e:'☕',u:_tw('2615')},{e:'🧋',u:_tw('1f9cb')},{e:'🍰',u:_tw('1f370')},
  {e:'🌿',u:_tw('1f33f')},{e:'🦄',u:_tw('1f984')},{e:'🐬',u:_tw('1f42c')}
];

function _initStickerPanel(){
  _fillStickerGrid('sticker-emotion', STICKERS_EMOTION);
  _fillStickerGrid('sticker-biz', STICKERS_BIZ);
  _fillStickerGrid('sticker-trend', STICKERS_TREND);
  _refreshStickerList();
}

function _fillStickerGrid(id, list){
  var el=document.getElementById(id);
  if(!el) return;
  el.innerHTML=list.map(function(s){
    var item=typeof s==='object'?s:{e:s,u:null};
    var oe="this.style.display=\u0027none\u0027;this.nextSibling.style.display=\u0027inline\u0027";
    var inner=item.u
      ?'<img src="'+item.u+'" style="width:28px;height:28px;pointer-events:none" loading="lazy" onerror="'+oe+'">'
       +'<span style="display:none;font-size:22px">'+item.e+'</span>'
      :'<span style="font-size:22px">'+item.e+'</span>';
    return '<div class="sticker-btn" data-emoji="'+item.e+'" title="추가">'+inner+'</div>';
  }).join('');
  el.querySelectorAll('.sticker-btn').forEach(function(btn){
    btn.addEventListener('click',function(){addStickerToScene(btn.getAttribute('data-emoji'));});
  });
}

function addStickerToScene(emoji){
  var sc=S.scenes[curScene];
  if(!sc) return;
  if(!sc.stickers) sc.stickers=[];
  // 기본 위치: 랜덤하게 배치
  var x=0.3+Math.random()*0.4;
  var y=0.3+Math.random()*0.4;
  sc.stickers.push({emoji:emoji,x:x,y:y,size:0.12});
  _refreshStickerList();
  drawScene(curScene,1);
  showToastMsg('스티커 추가: '+emoji);
}

function clearSceneStickers(){
  var sc=S.scenes[curScene];
  if(sc){ sc.stickers=[]; }
  _refreshStickerList();
  drawScene(curScene,1);
}

function _refreshStickerList(){
  var el=document.getElementById('sticker-list');
  if(!el) return;
  var sc=S.scenes[curScene];
  var stickers=(sc&&sc.stickers)||[];
  if(stickers.length===0){
    el.textContent='선택된 스티커 없음';
    return;
  }
  el.innerHTML=stickers.map(function(s,i){
    return '<span style="display:inline-flex;align-items:center;gap:3px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 7px;margin:2px;font-size:11px">'
      +s.emoji
      +'<button onclick="removeStickerFromScene('+i+')" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:10px;padding:0">✕</button>'
      +'</span>';
  }).join('');
}

function removeStickerFromScene(i){
  var sc=S.scenes[curScene];
  if(sc&&sc.stickers) sc.stickers.splice(i,1);
  _refreshStickerList();
  drawScene(curScene,1);
}

function showToastMsg(msg){
  var t=document.getElementById('vm-toast');
  if(!t){ t=document.createElement('div'); t.id='vm-toast';
    t.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(30,30,50,.95);color:#fff;padding:8px 18px;border-radius:20px;font-size:11px;font-weight:700;z-index:9999;pointer-events:none;transition:opacity .3s';
    document.body.appendChild(t);
  }
  t.textContent=msg; t.style.opacity='1';
  clearTimeout(t._tid);
  t._tid=setTimeout(function(){t.style.opacity='0';},1800);
}

// ══════════════════════════════════════════════════════════════
//  씬별 BGM 패널
// ══════════════════════════════════════════════════════════════
function renderSceneBGMList(){
  var el=document.getElementById('scene-bgm-list');
  if(!el) return;
  if(!S.scenes||S.scenes.length===0){ el.innerHTML='<div style="font-size:9px;color:var(--text4)">씬 없음</div>'; return; }
  var bgmNames=['없음(전체BGM 사용)'].concat(BGM_DATA.map(function(b){return b.name;}));
  el.innerHTML=S.scenes.map(function(sc,i){
    var selVal=sc.bgmIdx!=null?sc.bgmIdx:-1;
    var opts='<option value="-1"'+(selVal===-1?' selected':'')+'>전체 BGM</option>'+
      BGM_DATA.map(function(b,bi){
        return '<option value="'+bi+'"'+(selVal===bi?' selected':'')+'>'+b.name+'</option>';
      }).join('');
    return '<div class="scene-bgm-row">'
      +'<span class="scene-bgm-label">S'+(i+1)+'</span>'
      +'<select style="flex:1;padding:4px 7px;border:1.5px solid var(--border);border-radius:7px;font-size:9px;font-family:inherit;background:var(--surface2);color:var(--text);outline:none" onchange="setSceneBGM('+i+',parseInt(this.value))">'
      +opts
      +'</select>'
      +'</div>';
  }).join('');
}

function setSceneBGM(sceneIdx, bgmIdx){
  if(S.scenes[sceneIdx]) S.scenes[sceneIdx].bgmIdx=bgmIdx;
}

function _bindSlider(slId, valId, onChange, fmt){
  var sl=document.getElementById(slId);
  var vl=document.getElementById(valId);
  if(!sl||!vl) return;
  sl.addEventListener('input',function(){
    var v=parseInt(this.value);
    vl.textContent=fmt(v);
    onChange(v);
  });
}

function applyWatermark(){
  var inp=document.getElementById('inp-watermark');
  if(inp){ editOpts.watermark=inp.value; drawScene(curScene,1); }
}

function applyBrandName(){
  var inp=document.getElementById('inp-brandname');
  if(inp){ editOpts.brandName=inp.value.trim(); drawScene(curScene,1); }
}

function applyViewCount(){
  var inp=document.getElementById('inp-viewcount');
  if(inp){ editOpts.viewCount=inp.value.trim(); drawScene(curScene,1); }
}

function applyAdjustToCanvas(){
  var canvas=document.getElementById('pv');
  if(!canvas) return;
  var b=editOpts.brightness||1;
  var c=editOpts.contrast||1;
  var s=editOpts.saturation||1;
  // 기존 filter 효과와 병합
  var base=_getBaseFilterStr(editOpts.filter||'none');
  canvas.style.filter=base+(base?' ':'')+
    'brightness('+b+') contrast('+c+') saturate('+s+')';
}

function _getBaseFilterStr(filterId){
  var filters={
    none:'',vintage:'sepia(0.5) contrast(1.2) brightness(0.9)',
    cinema:'contrast(1.3) saturate(0.8) brightness(0.85)',
    bright:'brightness(1.3) contrast(1.1)',dark:'brightness(0.6) contrast(1.2)',
    vivid:'saturate(2) contrast(1.15)',pastel:'saturate(0.6) brightness(1.2)',
    mono:'grayscale(1)',sepia:'sepia(0.8)',
    cool:'hue-rotate(200deg) saturate(1.2)',warm:'sepia(0.3) saturate(1.3)',
    neon:'saturate(2.5) contrast(1.4) brightness(0.8)',
    hdr:'contrast(1.5) saturate(1.5) brightness(1.1)',
    fade:'opacity(0.75) brightness(1.2) saturate(0.7)',
    matte:'contrast(0.9) saturate(0.8) brightness(0.95)',
    golden:'sepia(0.4) saturate(1.3) brightness(1.1)',
    dreamy:'brightness(1.15) saturate(0.8)',soft:'brightness(1.1)',
    contrast:'contrast(2)',summer:'sepia(0.2) saturate(1.5) brightness(1.1) hue-rotate(-10deg)'
  };
  return filters[filterId]||'';
}

function attachEditingListeners() {
  document.querySelectorAll('.ed-act').forEach(function(el){
    el.addEventListener('click', function(){
      var key = el.getAttribute('data-key');
      var val = el.getAttribute('data-val');
      if(key === 'filter') {
        setEditOpt(key, val, el);
        applyFilterToCanvas(val);
      } else {
        setEditOpt(key, val, el);
      }
    });
  });
  document.querySelectorAll('.ads-act').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-ads-id');
      toggleAdsOpt(id, el);
    });
  });
  document.querySelectorAll('.plat-act').forEach(function(el){
    el.addEventListener('click', function(){
      var id = el.getAttribute('data-plat-id');
      setPlatformOpt(id, el);
    });
  });
}

function setEditOpt(key, val, el) {
  editOpts[key] = val;
  // Update UI - deselect all in parent container, select clicked
  if(el) {
    var parent = el.parentElement;
    if(parent) parent.querySelectorAll('.ed-opt,.ss').forEach(function(e){e.classList.remove('on');});
    el.classList.add('on');
  }
  drawScene(curScene,1);
}

function toggleAdsOpt(key, el) {
  editOpts[key] = !editOpts[key];
  if(el) el.classList.toggle('on', editOpts[key]);
  drawScene(curScene,1);
}

function setPlatformOpt(val, el) {
  editOpts.platform = val;
  if(el) {
    var parent = el.parentElement;
    if(parent) parent.querySelectorAll('.ed-opt').forEach(function(e){e.classList.remove('on');});
    el.classList.add('on');
  }
  // Update format to match platform
  if(val==='youtube') setFmt('long');
  else if(val==='square') setFmt('sq');
  else setFmt('short');
}

function applyFilterToCanvas(filterId) {
  editOpts.filter = filterId;
  applyAdjustToCanvas();
}

// ══════════════════════════════════════════════════════════════
//  GALLERY — Save, display, manage produced videos
// ══════════════════════════════════════════════════════════════
function loadGallery() {
  updateGalleryCount();
}

function updateGalleryCount() {
  // 서버에서 영상 수 조회
  var user=null;
  try{user=JSON.parse(localStorage.getItem('user')||'null');}catch(e){}
  if(!user||!user.id) return;
  fetch('/api/videos/list?limit=1',{headers:{'X-User-Id':String(user.id)}})
    .then(function(r){return r.json();})
    .then(function(d){
      var el=document.getElementById('gallery-count');
      if(el&&d.ok) el.textContent=d.total||0;
    })
    .catch(function(){});
}

function saveToGallery() {
  // 내 영상 보관함 페이지로 이동
  window.location.href = '/tools/my-videos';
}

function showGallery() {
  window.location.href = '/tools/my-videos';
}

function closeGallery() {}
function renderGallery() {}
function galleryDownload(idx) {}
function galleryDelete(idx) {}


// 씬 이동 + 타임라인 업데이트
function goToScene(idx){
  if(idx<0||idx>=S.scenes.length) return;
  curScene=idx;
  drawScene(idx,1);
  renderSceneNav();
  renderTimeline();
}

// ══════════════════════════════════════════════════════════════
//  TIMELINE 렌더링 – 진행선 + 씬 도트 방식
// ══════════════════════════════════════════════════════════════
var _tlPopupActive = -1; // 팝업 열린 씬 인덱스

function renderTimeline(){
  var bar=document.getElementById('timeline-bar');
  if(!bar) return;
  var totalDur=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
  var totalEl=document.getElementById('tl-total-dur');
  if(totalEl) totalEl.textContent='총 ≈'+Math.round(totalDur)+'초';

  bar.innerHTML='';
  if(!S.scenes.length) return;

  var barW=bar.clientWidth||300;

  // ── 배경 트랙 선 ──
  var track=document.createElement('div');
  track.className='tl-track';
  var fill=document.createElement('div');
  fill.className='tl-track-fill';
  // 현재 씬 위치까지 채우기
  var elapsed=0;
  for(var fi=0;fi<curScene;fi++) elapsed+=(S.scenes[fi].dur||5);
  elapsed+=(S.scenes[curScene]?(S.scenes[curScene].dur||5)*0.5:0);
  fill.style.width=(totalDur>0?Math.min(100,elapsed/totalDur*100):0)+'%';
  track.appendChild(fill);
  bar.appendChild(track);

  // ── 씬 도트 배치 ──
  var accum=0; // 누적 시간
  S.scenes.forEach(function(sc,i){
    var dur=sc.dur||5;
    var pct= totalDur>0 ? accum/totalDur : i/S.scenes.length;
    // 맨 앞/뒤 도트가 잘리지 않도록 여백 확보
    var MARGIN=11; // px (도트 반지름)
    var leftPx=MARGIN + pct*(barW-MARGIN*2);

    var dot=document.createElement('div');
    dot.className='tl-dot'+(i===curScene?' active':'');
    dot.style.left=leftPx+'px';

    // 씬 번호 라벨 (위)
    var lbl=document.createElement('div');
    lbl.className='tl-dot-label';
    lbl.textContent='S'+(i+1);
    dot.appendChild(lbl);

    // 클릭 → 씬 선택 + 팝업 열기
    (function(idx){
      dot.addEventListener('click',function(e){
        e.stopPropagation();
        curScene=idx;
        drawScene(idx,1);
        renderSceneNav();
        renderTimeline();
        _showDurPopup(idx, dot);
      });
    })(i);

    bar.appendChild(dot);
    accum+=dur;
  });

  // 팝업이 열려 있던 씬이면 다시 열기
  if(_tlPopupActive>=0 && _tlPopupActive<S.scenes.length && _tlPopupActive===curScene){
    var activeDot=bar.querySelectorAll('.tl-dot')[_tlPopupActive];
    if(activeDot) _showDurPopup(_tlPopupActive, activeDot);
  }
}

function _showDurPopup(idx, dotEl){
  _tlPopupActive=idx;
  var existing=document.getElementById('tl-dur-popup-el');
  if(existing) existing.remove();

  var sc=S.scenes[idx];
  if(!sc) return;

  var popup=document.createElement('div');
  popup.id='tl-dur-popup-el';
  popup.className='tl-dur-popup';

  var rect=dotEl.getBoundingClientRect();
  var wrapRect=document.getElementById('timeline-wrap').getBoundingClientRect();

  // 팝업 내용: 씬 이름 + 재생시간 슬라이더
  var title=document.createElement('div');
  title.style.cssText='font-size:10px;font-weight:800;color:var(--primary);margin-bottom:4px';
  title.textContent='S'+(idx+1)+' '+(sc.title||(sc.text||'').slice(0,10)||'씬 '+(idx+1));
  popup.appendChild(title);

  var durLbl=document.createElement('div');
  durLbl.style.cssText='font-size:11px;color:var(--text2);margin-bottom:4px';
  durLbl.textContent='⏱ '+(sc.dur||5)+'초';
  popup.appendChild(durLbl);

  var slider=document.createElement('input');
  slider.type='range';
  slider.min='1'; slider.max='20'; slider.step='1';
  slider.value=String(sc.dur||5);
  slider.className='tl-dur-slider';
  slider.style.pointerEvents='auto';
  slider.addEventListener('input',function(){
    var v=parseInt(slider.value);
    S.scenes[idx].dur=v;
    durLbl.textContent='⏱ '+v+'초';
    var totalEl=document.getElementById('tl-total-dur');
    if(totalEl){
      var tot=S.scenes.reduce(function(s,sc){return s+(sc.dur||5);},0);
      totalEl.textContent='총 ≈'+Math.round(tot)+'초';
    }
    renderSceneList();
  });
  slider.addEventListener('change',function(){renderTimeline();});
  popup.appendChild(slider);

  // 위치 설정: 도트 위에 표시
  popup.style.pointerEvents='auto';
  document.body.appendChild(popup);
  var pw=popup.offsetWidth||130;
  var ph=popup.offsetHeight||80;
  var left=rect.left+rect.width/2-pw/2;
  var top=rect.top-ph-10+window.scrollY;
  // 화면 밖 방지
  if(left<8) left=8;
  if(left+pw>window.innerWidth-8) left=window.innerWidth-pw-8;
  if(top<8) top=rect.bottom+10+window.scrollY;
  popup.style.left=left+'px';
  popup.style.top=top+'px';

  // 바깥 클릭 시 닫기
  function onOutside(e){
    if(!popup.contains(e.target)){
      popup.remove();
      _tlPopupActive=-1;
      document.removeEventListener('click',onOutside);
    }
  }
  setTimeout(function(){document.addEventListener('click',onOutside);},50);
}

// ══════════════════════════════════════════════════════════════
//  미디어 직접 업로드 (씬별 사진/동영상 첨부)
//  CSP 대응: blob URL을 video 엘리먼트에 직접 사용 (media-src blob: 허용됨)
//  오프셋 기능: sc._vidOffset (초) 로 영상 시작 지점 지정
// ══════════════════════════════════════════════════════════════
var _uploadTargetScene=0;

// ── 비디오 라이브 렌더링 RAF 루프 ──
var _vidRafMap={}; // sceneIdx → rafId
function _stopVidRaf(idx){
  if(_vidRafMap[idx]){cancelAnimationFrame(_vidRafMap[idx]);delete _vidRafMap[idx];}
}
function _startVidRaf(idx){
  _stopVidRaf(idx);
  var _lastFrameTime=0;
  function _tick(now){
    if(curScene!==idx || !S.scenes[idx] || !S.scenes[idx]._vidEl) return;
    var v=S.scenes[idx]._vidEl;
    // 30fps 캡 (너무 자주 캔버스 그리면 성능 저하)
    if(now-_lastFrameTime>=32){
      _lastFrameTime=now;
      if(v.readyState>=2){
        drawScene(idx,1); // sceneImgs 갱신 없이 캔버스만 다시 그림 (아래 drawScene에서 vid 직접 사용)
      }
    }
    _vidRafMap[idx]=requestAnimationFrame(_tick);
  }
  _vidRafMap[idx]=requestAnimationFrame(_tick);
}

// ── 비디오 프레임 → sceneImgs 스냅샷 (썸네일/정지 상태용) ──
function _snapVideoFrame(idx, vid, onDone){
  try{
    var fc=document.createElement('canvas');
    fc.width=vid.videoWidth||640; fc.height=vid.videoHeight||360;
    fc.getContext('2d').drawImage(vid,0,0,fc.width,fc.height);
    var snap=new Image();
    snap.onload=function(){ sceneImgs[idx]=snap; if(onDone) onDone(); };
    snap.src=fc.toDataURL('image/jpeg',0.85);
  }catch(e){ if(onDone) onDone(); }
}

function triggerUploadForScene(idx){
  _uploadTargetScene=idx;
  var inp=document.getElementById('scene-media-upload');
  if(inp){inp.value='';inp.click();}
}

function handleSceneMediaUpload(event){
  var file=event.target.files&&event.target.files[0];
  if(!file) return;
  var idx=_uploadTargetScene;
  if(!S.scenes[idx]) return;

  // 기존 비디오 정리
  var oldVid=S.scenes[idx]._vidEl;
  if(oldVid){
    try{oldVid.pause();}catch(e){}
    try{var olds=oldVid.src;oldVid.src='';URL.revokeObjectURL(olds);}catch(e){}
    S.scenes[idx]._vidEl=null;
  }
  _stopVidRaf(idx);

  var isVideo=file.type.startsWith('video/');
  // blob URL 생성 (media-src blob: CSP 허용으로 video 엘리먼트에서 직접 사용 가능)
  var blobUrl=URL.createObjectURL(file);
  S.scenes[idx].customMedia={url:blobUrl,type:isVideo?'video':'image',name:file.name};

  if(isVideo){
    var vid=document.createElement('video');
    vid.crossOrigin='anonymous';
    vid.muted=true;
    vid.loop=false;
    vid.playsInline=true;
    vid.preload='auto';
    // blob URL 직접 할당 (CSP media-src blob: 허용)
    vid.src=blobUrl;
    S.scenes[idx]._vidEl=vid;

    var _seekDone=false;
    function _doFirstSnap(){
      if(_seekDone) return; _seekDone=true;
      _snapVideoFrame(idx, vid, function(){
        drawScene(curScene,1);
        renderTimeline();
        renderSceneList();
        // 오프셋 UI 표시
        _showVideoOffsetUI(idx);
      });
      // 현재 씬이면 라이브 렌더 시작
      if(curScene===idx){
        var offset=S.scenes[idx]._vidOffset||0;
        vid.currentTime=offset;
        vid.play().catch(function(e){ console.warn('vid.play fail:',e); });
        _startVidRaf(idx);
      }
    }

    vid.onloadedmetadata=function(){
      // 비디오 총 길이 저장
      S.scenes[idx]._vidDuration=vid.duration||0;
      // 씬 길이가 영상보다 길면 씬 길이를 영상 길이로 맞춤
      if(vid.duration>0 && (S.scenes[idx].dur||5)>vid.duration){
        S.scenes[idx].dur=Math.floor(vid.duration);
      }
      var offset=S.scenes[idx]._vidOffset||0;
      vid.currentTime=Math.min(offset, Math.max(0, vid.duration-0.1));
    };
    vid.onseeked=function(){ _doFirstSnap(); };
    // Safari 등 onseeked 안 오는 경우 대비
    vid.oncanplay=function(){
      if(!_seekDone){ setTimeout(_doFirstSnap,200); }
    };
    vid.onerror=function(e){
      setStatus('⚠️ 동영상 로드 실패: '+file.name+' ('+file.type+')');
      console.warn('video error',e, vid.error);
    };
    vid.load();
    setStatus('⏳ 씬 '+(idx+1)+' 동영상 로딩 중...');

  } else {
    // 이미지
    var img2=new Image();
    img2.onload=function(){
      sceneImgs[idx]=img2;
      drawScene(curScene,1);
      renderTimeline();
      renderSceneList();
    };
    img2.onerror=function(){ setStatus('⚠️ 이미지 로드 실패'); };
    img2.src=blobUrl;
    setStatus('✅ 씬 '+(idx+1)+' 이미지 첨부 완료!');
  }
  setTimeout(function(){if(document.querySelector('.status')&&document.querySelector('.status').textContent.indexOf('✅')===0)setStatus('준비 완료');},3500);
}

// ── 씬 전환 시 비디오 재생/정지 제어 ──
function _handleSceneVideoSwitch(newIdx){
  S.scenes.forEach(function(sc,i){
    if(i!==newIdx && sc._vidEl){
      try{sc._vidEl.pause();}catch(e){}
      _stopVidRaf(i);
    }
  });
  var newSc=S.scenes[newIdx];
  if(newSc&&newSc._vidEl&&newSc.customMedia&&newSc.customMedia.type==='video'){
    var v=newSc._vidEl;
    var offset=newSc._vidOffset||0;
    // 오프셋부터 재생
    try{ v.currentTime=offset; }catch(e){}
    v.play().catch(function(){});
    _startVidRaf(newIdx);
  }
}

// ── 동영상 오프셋(시작 지점) 설정 UI ──
function _showVideoOffsetUI(idx){
  // 기존 오프셋 패널 제거
  var old=document.getElementById('vid-offset-panel');
  if(old) old.remove();

  var sc=S.scenes[idx];
  if(!sc||!sc._vidEl) return;
  var totalDur=sc._vidDuration||sc._vidEl.duration||0;
  var sceneDur=sc.dur||5;
  var currentOffset=sc._vidOffset||0;
  // 최대 오프셋 = 영상길이 - 씬길이 (마지막 부분까지 선택 가능하되, 씬 길이 보장)
  var maxOffset=Math.max(0, totalDur-sceneDur);

  var panel=document.createElement('div');
  panel.id='vid-offset-panel';
  panel.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:9999;background:#1e1e2e;color:#fff;border-radius:14px;padding:14px 18px;box-shadow:0 8px 32px rgba(0,0,0,0.55);min-width:280px;max-width:340px;font-size:12px;border:1px solid rgba(255,255,255,0.12)';

  var durMin=Math.floor(totalDur/60), durSec=Math.floor(totalDur%60);
  // innerHTML 대신 DOM API 사용 — onclick 속성 내 따옴표 이스케이프 문제 방지
  function _mkEl(tag, css, txt){
    var el=document.createElement(tag);
    if(css) el.style.cssText=css;
    if(txt) el.textContent=txt;
    return el;
  }
  function _closePanel(){ var p=document.getElementById('vid-offset-panel'); if(p) p.remove(); }

  // 헤더 행
  var hdr=_mkEl('div','font-weight:800;font-size:13px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center');
  var hdrTitle=_mkEl('span','','🎬 동영상 시작 지점');
  var hdrClose=_mkEl('button','background:none;border:none;color:rgba(255,255,255,0.5);font-size:16px;cursor:pointer;line-height:1','×');
  hdrClose.addEventListener('click',_closePanel);
  hdr.appendChild(hdrTitle); hdr.appendChild(hdrClose);

  // 영상 정보
  var info=_mkEl('div','font-size:10px;color:rgba(255,255,255,0.55);margin-bottom:10px',
    '영상 총 길이: '+(durMin>0?durMin+'분 ':'')+durSec+'초 | 씬 재생: '+sceneDur+'초');

  // 슬라이더 행
  var sliderRow=_mkEl('div','display:flex;align-items:center;gap:8px');
  var sliderLabel=_mkEl('span','color:rgba(255,255,255,0.6);font-size:10px;white-space:nowrap','시작');
  var slider=document.createElement('input');
  slider.type='range'; slider.id='vid-offset-slider';
  slider.min='0'; slider.max=String(Math.max(0,Math.floor(maxOffset*10)));
  slider.step='1'; slider.value=String(Math.round(currentOffset*10));
  slider.style.cssText='flex:1;accent-color:#a78bfa';
  var label=_mkEl('span','color:#a78bfa;font-weight:800;font-size:11px;min-width:36px;text-align:right',currentOffset.toFixed(1)+'s');
  label.id='vid-offset-label';
  sliderRow.appendChild(sliderLabel); sliderRow.appendChild(slider); sliderRow.appendChild(label);

  // 설명
  var desc=_mkEl('div','margin-top:8px;font-size:10px;color:rgba(255,255,255,0.4)','슬라이더로 영상의 어느 부분을 사용할지 설정하세요');

  // 버튼 행
  var btnRow=_mkEl('div','margin-top:10px;display:flex;gap:6px');
  var applyBtn=_mkEl('button','flex:1;padding:7px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer','✔ 적용');
  applyBtn.addEventListener('click',function(){ _applyVidOffset(idx); });
  var closeBtn=_mkEl('button','padding:7px 12px;background:rgba(255,255,255,0.08);color:#fff;border:none;border-radius:8px;font-size:11px;cursor:pointer','닫기');
  closeBtn.addEventListener('click',_closePanel);
  btnRow.appendChild(applyBtn); btnRow.appendChild(closeBtn);

  panel.appendChild(hdr); panel.appendChild(info); panel.appendChild(sliderRow);
  panel.appendChild(desc); panel.appendChild(btnRow);
  document.body.appendChild(panel);

  // 슬라이더 실시간 프리뷰
  slider.addEventListener('input',function(){
    var v2=parseInt(slider.value)/10;
    label.textContent=v2.toFixed(1)+'s';
    // 프리뷰: 비디오 해당 시점으로 seek → 스냅샷
    var vid2=S.scenes[idx]._vidEl;
    if(vid2){
      _stopVidRaf(idx);
      try{ vid2.pause(); vid2.currentTime=v2; }catch(e){}
      vid2.onseeked=function(){
        _snapVideoFrame(idx, vid2, function(){ drawScene(curScene,1); });
        vid2.onseeked=null;
      };
    }
  });
}

function _applyVidOffset(idx){
  var slider=document.getElementById('vid-offset-slider');
  if(!slider) return;
  var offset=parseInt(slider.value)/10;
  S.scenes[idx]._vidOffset=offset;
  var vid=S.scenes[idx]._vidEl;
  if(vid){
    try{ vid.currentTime=offset; }catch(e){}
    // 씬이 활성이면 재생 재개
    if(curScene===idx){
      vid.play().catch(function(){});
      _startVidRaf(idx);
    } else {
      _snapVideoFrame(idx,vid,function(){ drawScene(curScene,1); renderSceneList(); });
    }
  }
  setStatus('✅ 씬 '+(idx+1)+' 시작 지점 '+offset.toFixed(1)+'s 적용');
  var panel=document.getElementById('vid-offset-panel');
  if(panel) panel.remove();
}

// ── 씬 카드에 동영상 오프셋 버튼 표시 (renderSceneList에서 호출) ──
function _getVidOffsetBtn(idx){
  var sc=S.scenes[idx];
  if(!sc||!sc._vidEl||!sc.customMedia||sc.customMedia.type!=='video') return '';
  var offset=sc._vidOffset||0;
  return '<button onclick="event.stopPropagation();_showVideoOffsetUI('+idx+')" style="flex-shrink:0;font-size:9px;padding:3px 6px;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;border:none;border-radius:5px;cursor:pointer" title="동영상 시작 지점 설정">✂ '+offset.toFixed(1)+'s~</button>';
}

// ══════════════════════════════════════════════════════════════
//  PEXELS 무료 미디어 라이브러리 (10만장+ 사진/영상)
// ══════════════════════════════════════════════════════════════
var _pexelsPage=1;
var _pexelsQuery='';
var _pexelsType='photos';
var _pexelsTotal=0;
var _pexelsTargetScene=-1;
var _pexelsSearchTimer=null;

// Pexels/Pixabay 검색은 서버 프록시(/api/pexels/search)를 통해 처리 — 클라이언트에 API 키를 노출하지 않음

// ── 미디어 소스 전환 (Pexels ↔ Pixabay) ──
var _currentMediaSource = 'pexels';
function switchMediaSource(src) {
  _currentMediaSource = src;
  var tabP = document.getElementById('media-tab-pexels');
  var tabX = document.getElementById('media-tab-pixabay');
  if(src === 'pexels') {
    tabP.style.background = 'linear-gradient(135deg,#06b6d4,#0891b2)';
    tabP.style.color = '#fff';
    tabP.style.fontWeight = '800';
    tabX.style.background = '#f9fafb';
    tabX.style.color = '#64748b';
    tabX.style.fontWeight = '700';
    searchPexels();
  } else {
    tabX.style.background = 'linear-gradient(135deg,#e879f9,#a855f7)';
    tabX.style.color = '#fff';
    tabX.style.fontWeight = '800';
    tabP.style.background = '#f9fafb';
    tabP.style.color = '#64748b';
    tabP.style.fontWeight = '700';
    searchPixabay();
  }
}

// ── Pixabay 검색 ──
var _pixabayPage = 1;
var _pixabayQuery = 'background';
var _pixabayType = 'photos';

function searchPixabay() {
  _pixabayPage = 1;
  var q = document.getElementById('pexels-search-input').value.trim() || 'background';
  _pixabayQuery = q;
  _pixabayType = document.getElementById('pexels-type-sel').value;
  var grid = document.getElementById('pexels-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280"><div style="font-size:24px;margin-bottom:8px">🌸</div>Pixabay 검색 중...</div>';
  fetchPixabay(q, _pixabayType, 1);
}

function fetchPixabay(q, type, page) {
  var isVideo = (type === 'videos');
  var url = '/api/pixabay/search?q=' + encodeURIComponent(q) + '&type=' + type + '&page=' + page + '&per_page=24';
  fetch(url)
    .then(function(r){ return r.json(); })
    .then(function(data) {
      var grid = document.getElementById('pexels-grid');
      // Pixabay API 키 미설정 시 자동으로 Pexels로 전환 (타입 유지)
      if(!data.ok && data.error && data.error.indexOf('not configured') >= 0) {
        // 현재 타입(사진/영상) 유지하면서 Pexels로 전환
        var typeEl2=document.getElementById('pexels-type-sel');
        if(typeEl2) typeEl2.value = type; // 현재 선택된 타입 유지
        _pexelsType = type;
        _pexelsPage = 1;
        _pexelsQuery = q;
        // UI 탭 전환 (Pexels로)
        var tabP2 = document.getElementById('media-tab-pexels');
        var tabX2 = document.getElementById('media-tab-pixabay');
        if(tabP2){tabP2.style.background='linear-gradient(135deg,#06b6d4,#0891b2)';tabP2.style.color='#fff';tabP2.style.fontWeight='800';}
        if(tabX2){tabX2.style.background='#f9fafb';tabX2.style.color='#64748b';tabX2.style.fontWeight='700';}
        _currentMediaSource = 'pexels';
        // Pexels 결과를 로딩 메시지와 함께 보여줌
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:#6b7280"><div style="font-size:18px;margin-bottom:4px">🌊</div>Pexels 결과를 불러오는 중...</div>';
        _fetchPexels(q, type, 1, function(results, total) {
          _renderPexelsGrid(results, false);
          _pexelsTotal = total || 0;
        });
        return;
      }
      if(!data.ok || !data.items || data.items.length === 0) {
        if(isVideo) {
          // 영상 결과 없음 - Pexels 영상으로 폴백
          var typeEl=document.getElementById('pexels-type-sel');
          if(typeEl) typeEl.value='videos';
          _pexelsType = 'videos';
          _pexelsPage = 1;
          _pexelsQuery = q;
          var tabP3 = document.getElementById('media-tab-pexels');
          var tabX3 = document.getElementById('media-tab-pixabay');
          if(tabP3){tabP3.style.background='linear-gradient(135deg,#06b6d4,#0891b2)';tabP3.style.color='#fff';tabP3.style.fontWeight='800';}
          if(tabX3){tabX3.style.background='#f9fafb';tabX3.style.color='#64748b';tabX3.style.fontWeight='700';}
          _currentMediaSource = 'pexels';
          _fetchPexels(q, 'videos', 1);
          return;
        }
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280">검색 결과가 없습니다</div>';
        return;
      }
      var html = '';
      data.items.forEach(function(item) {
        var encUrl = item.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        var encThumb = item.thumb.replace(/&/g,'&amp;').replace(/"/g,'&quot;');
        if(item.type === 'video') {
          html += '<div data-pxurl="'+encUrl+'" data-pxtype="video" class="px-item" style="cursor:pointer;border-radius:10px;overflow:hidden;position:relative;aspect-ratio:16/9;background:#000;border:2px solid transparent;transition:all .15s">';
          html += '<img src="'+encThumb+'" style="width:100%;height:100%;object-fit:cover;opacity:.85">';
          html += '<div style="position:absolute;top:4px;left:4px;background:#a855f7;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px">🎬 Pixabay</div>';
          html += '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center"><div style="background:rgba(168,85,247,.9);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:16px">▶</div></div>';
          html += '</div>';
        } else {
          html += '<div data-pxurl="'+encUrl+'" data-pxtype="image" class="px-item" style="cursor:pointer;border-radius:10px;overflow:hidden;position:relative;aspect-ratio:3/2;border:2px solid transparent;transition:all .15s">';
          html += '<img src="'+encThumb+'" style="width:100%;height:100%;object-fit:cover" loading="lazy">';
          html += '<div style="position:absolute;top:4px;left:4px;background:#a855f7;color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:4px">🌸 Pixabay</div>';
          html += '</div>';
        }
      });
      if(page === 1) {
        grid.innerHTML = html;
      } else {
        grid.insertAdjacentHTML('beforeend', html);
      }
      // bind px-item clicks
      grid.querySelectorAll('.px-item').forEach(function(el){
        el.addEventListener('click',function(){
          selectPexelsMedia(this.getAttribute('data-pxurl'),this.getAttribute('data-pxtype'));
        });
      });
    })
    .catch(function(e) {
      var grid = document.getElementById('pexels-grid');
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#ef4444">Pixabay 오류: ' + e.message + '</div>';
    });
}

function openPexelsModal(){
  _pexelsTargetScene=curScene;
  document.getElementById('pexels-modal').style.display='block';
  // 기본 검색어: 현재 씬 키워드
  var sc=S.scenes[curScene];
  var kw=(sc&&sc.kw)||'';
  if(!kw&&sc) kw=sc.title||'';
  if(kw){
    document.getElementById('pexels-search-input').value=kw.slice(0,20);
    searchPexels();
  } else {
    quickPexels('background');
  }
}
function closePexelsModal(){
  document.getElementById('pexels-modal').style.display='none';
}
function onPexelsSearchInput(){
  clearTimeout(_pexelsSearchTimer);
  _pexelsSearchTimer=setTimeout(function(){
    if(_currentMediaSource==='pixabay') searchPixabay();
    else searchPexels();
  },500);
}
function quickPexels(q){
  document.getElementById('pexels-search-input').value=q;
  if(_currentMediaSource==='pixabay') searchPixabay();
  else searchPexels();
}
function searchPexels(){
  _pexelsPage=1;
  var q=document.getElementById('pexels-search-input').value.trim()||'background';
  _pexelsQuery=q;
  _pexelsType=document.getElementById('pexels-type-sel').value;
  var grid=document.getElementById('pexels-grid');
  grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#6b7280"><div style="font-size:24px;margin-bottom:8px">🔍</div>검색 중...</div>';
  _fetchPexels(q,_pexelsType,1,function(results,total){
    _pexelsTotal=total||0;
    var lbl=document.getElementById('pexels-count-lbl');
    if(lbl) lbl.textContent=_pexelsTotal.toLocaleString()+'개 결과';
    _renderPexelsGrid(results,false);
    var moreBtn=document.getElementById('pexels-load-more');
    if(moreBtn) moreBtn.style.display=results.length>=15?'block':'none';
  });
}
function loadMorePexels(){
  _pexelsPage++;
  _fetchPexels(_pexelsQuery,_pexelsType,_pexelsPage,function(results){
    _renderPexelsGrid(results,true);
  });
}
// 한글 → 영어 키워드 변환
var KW_TRANS={
  '학원':'academy education','공부':'study learning','선생님':'teacher classroom',
  '학생':'student young','교육':'education school','비즈니스':'business professional',
  '자연':'nature landscape','도시':'city urban','기술':'technology digital',
  '음식':'food restaurant','건강':'health fitness','여행':'travel adventure',
  '성공':'success achievement','오피스':'office workspace','피트니스':'fitness gym',
  '배경':'background abstract','추상':'abstract pattern','행복':'happy smiling',
  '인물':'people portrait','아이':'children kids','가족':'family together',
  '책':'books reading','컴퓨터':'computer laptop','스마트폰':'smartphone mobile',
  '오픈':'opening introduction','마케팅':'marketing business','학교':'school education',
  '강의':'lecture teaching','연습':'practice training','시험':'exam study'
};
function _translateQuery(q){
  var eng=q;
  Object.keys(KW_TRANS).forEach(function(k){if(q.indexOf(k)>=0) eng=KW_TRANS[k];});
  return eng;
}

function _fetchPexels(query,type,page,cb){
  // 서버 프록시로 Pexels API 호출 (CORS 우회)
  var perPage=20;
  var engQuery=_translateQuery(query);
  var proxyUrl='/api/pexels/search?q='+encodeURIComponent(engQuery)+'&type='+type+'&page='+page+'&per_page='+perPage;
  fetch(proxyUrl)
    .then(function(r){return r.json();})
    .then(function(data){
      if(data.ok && data.items && data.items.length>0){
        cb(data.items, data.total||0);
      } else {
        // 프록시 실패 시 Picsum 폴백
        _fetchPicsumFallback(query,page,cb);
      }
    })
    .catch(function(){_fetchPicsumFallback(query,page,cb);});
}
function _fetchPicsumFallback(query,page,cb){
  // Picsum Photos (무료, 랜덤 고품질 사진)
  var perPage=20;
  var items=[];
  var seed=_hashStr(query);
  for(var i=0;i<perPage;i++){
    var imgId=((seed+(page-1)*perPage+i)%1000)+1;
    var w=800,h=600;
    var thumbRaw='https://picsum.photos/id/'+imgId+'/400/300';
    var urlRaw='https://picsum.photos/id/'+imgId+'/'+w+'/'+h;
    items.push({
      type:'image',
      thumb:'/api/img-proxy?url='+encodeURIComponent(thumbRaw),
      url:'/api/img-proxy?url='+encodeURIComponent(urlRaw),
      width:w,height:h,id:imgId,
      credit:'Picsum Photos (무료)'
    });
  }
  cb(items,100000);
}
function _hashStr(s){
  var h=0;
  for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}
  return Math.abs(h);
}
function _renderPexelsGrid(items,append){
  var grid=document.getElementById('pexels-grid');
  if(!append) grid.innerHTML='';
  if(!items.length&&!append){
    grid.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:40px;color:#9ca3af">결과가 없습니다. 다른 키워드를 시도해보세요.</div>';
    return;
  }
  items.forEach(function(item){
    var div=document.createElement('div');
    div.className='pexels-item';
    var isVid=item.type==='video';
    // ── 영상: thumb는 항상 JPEG 포스터 이미지 → <img>로 표시, hover 시 previewUrl로 video 교체
    // ── 사진: thumb를 <img>로 표시
    var mediaEl='<img src="'+item.thumb+'" loading="lazy" style="width:100%;height:100%;object-fit:cover" alt="미디어">';
    var dur=isVid&&item.duration?' '+item.duration+'s':'';
    div.innerHTML=mediaEl
      +'<div class="pexels-item-overlay">'
      +'<button class="pexels-item-use">'+(isVid?'🎬 영상 적용':'✓ 이 씬에 적용')+'</button>'
      +'</div>'
      +'<span class="pexels-item-type" style="background:'+(isVid?'rgba(220,38,38,.85)':'rgba(0,0,0,.5)')+';color:#fff">'+(isVid?'🎬 영상'+dur:'📷 사진')+'</span>';
    var useBtn=div.querySelector('.pexels-item-use');
    if(useBtn){
      (function(u,t,previewU){
        useBtn.addEventListener('click',function(){applyPexelsItem(u,t,previewU);});
      })(item.url, item.type, item.previewUrl||item.url);
    }
    // hover 시 영상 미리보기 (previewUrl 있으면 video로 교체)
    if(isVid && item.previewUrl){
      (function(d, thumbSrc, previewSrc){
        var vidEl=null;
        d.addEventListener('mouseenter',function(){
          if(!vidEl){
            vidEl=document.createElement('video');
            vidEl.src=previewSrc;
            vidEl.muted=true;
            vidEl.loop=true;
            vidEl.playsInline=true;
            vidEl.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:1';
            d.style.position='relative';
            d.insertBefore(vidEl,d.firstChild);
          }
          vidEl.play().catch(function(){});
        });
        d.addEventListener('mouseleave',function(){
          if(vidEl){vidEl.pause();vidEl.currentTime=0;}
        });
      })(div, item.thumb, item.previewUrl);
    }
    grid.appendChild(div);
  });
}
function applyPexelsItem(url,type,previewUrl){
  var idx=_pexelsTargetScene>=0?_pexelsTargetScene:curScene;
  if(!S.scenes[idx]) return;
  S.scenes[idx].customMedia={url:url,type:type,name:'Pexels',previewUrl:previewUrl||url};
  closePexelsModal();
  curScene=idx;

  if(type==='video'){
    // ── 영상: 비디오 엘리먼트로 첫 프레임 추출 후 미리보기 → sceneImgs에 저장
    var vid=document.createElement('video');
    vid.crossOrigin='anonymous';
    vid.muted=true;
    vid.playsInline=true;
    // previewUrl(SD) 먼저 시도, 없으면 url(HD)
    vid.src=previewUrl||url;
    S.scenes[idx]._vidEl=vid; // 나중에 녹화 시 사용 가능
    var frameExtracted=false;
    var extractFrame=function(){
      if(frameExtracted) return;
      frameExtracted=true;
      try{
        var fc=document.createElement('canvas');
        fc.width=vid.videoWidth||1280;
        fc.height=vid.videoHeight||720;
        fc.getContext('2d').drawImage(vid,0,0,fc.width,fc.height);
        var img=new Image();
        img.src=fc.toDataURL('image/jpeg',0.85);
        img.onload=function(){
          sceneImgs[idx]=img;
          drawScene(curScene,1);
          renderSceneList();
          renderTimeline();
        };
      }catch(e){
        // CORS 차단 시 썸네일 URL로 대체
        _applyImageFallback(idx, previewUrl||url);
      }
    };
    vid.addEventListener('loadeddata', extractFrame);
    vid.addEventListener('seeked', extractFrame);
    vid.addEventListener('error', function(){
      _applyImageFallback(idx, previewUrl||url);
    });
    vid.load();
    vid.currentTime=0.5;
  } else {
    // ── 사진
    var img2=new Image();
    img2.crossOrigin='anonymous';
    img2.src=url;
    img2.onload=function(){
      sceneImgs[idx]=img2;
      drawScene(curScene,1);
      renderSceneList();
      renderTimeline();
    };
    img2.onerror=function(){
      _applyImageFallback(idx, url);
    };
    sceneImgs[idx]=img2;
  }
  drawScene(curScene,1);
  renderSceneNav();
  renderTimeline();
}
function _applyImageFallback(idx, hintUrl){
  // CORS/에러 시 picsum 랜덤 이미지로 폴백 (/api/img-proxy 경유)
  var seed2=_hashStr(hintUrl||'');
  var imgId=(seed2%1000)+1;
  var fb=new Image();
  fb.crossOrigin='anonymous';
  var picsumRaw='https://picsum.photos/id/'+imgId+'/800/600';
  fb.src='/api/img-proxy?url='+encodeURIComponent(picsumRaw);
  fb.onload=function(){sceneImgs[idx]=fb;drawScene(curScene,1);renderTimeline();};
  sceneImgs[idx]=fb;
}

// ══════════════════════════════════════════════════════════════
//  항상-표시 직접편집 시스템 (편집모드 없음)
//  - 블록 항상 표시, 클릭 즉시 타이핑
//  - 툴바: 글자크기 A-/A+, 색상 피커, 드래그 이동
//  - 팝업/완료버튼 없음
// ══════════════════════════════════════════════════════════════

// 하위 호환 더미 (외부에서 cancelInlineEdit() 호출하는 코드 대비)
var _inlineEditActive=false;
var _blkEditTarget='title';

// ── 드래그 상태 ──
var _blkDragSt={active:false,which:'',sx:0,sy:0,ox:0,oy:0};
var _blkDragMoved=false;

// ── 현재 선택된 블록 ──
var _blkSelected=''; // 'title' | 'body' | 'label' | ''

// ── 블록별 위치/스타일 상태 (캔바 수준 확장) ──
var _blkState={
  title:{left:0,top:0,fontSize:16,color:'#ffffff',fontFamily:'Noto Sans KR',
         bold:true,italic:false,underline:false,align:'left',init:false},
  body: {left:0,top:0,fontSize:12,color:'#e2e8f0',fontFamily:'Noto Sans KR',
         bold:false,italic:false,underline:false,align:'left',init:false},
  label:{left:0,top:0,fontSize:10,color:'#a5b4fc',fontFamily:'Noto Sans KR',
         bold:true,italic:false,underline:false,align:'left',init:false}
};

// ─────────────────────────────────────────
// 블록 초기 위치 계산
// ─────────────────────────────────────────
function _blkBasePos(which,cW,cH,pos){
  var bW=Math.round(cW*0.88);
  var bX=Math.round((cW-bW)/2);
  var tY,bY;
  // ── 모든 pos 에 정확한 Y 매핑 (drawTextLayout 렌더 좌표와 일치) ──
  if(pos==='sp-app-ad'){
    // saPostY=H*0.102, baseline=H*0.102+W*0.044*0.85 → text top≈cH*0.105
    bX=Math.round(cW*0.05); bW=Math.round(cW*0.88);
    tY=Math.round(cH*0.10); bY=Math.round(cH*0.18);
  } else if(pos==='sp-insta-ad'){
    // sbHookY2≈H*0.617, baseline+sbHSz*0.85 → text top≈cH*0.620
    bX=Math.round(cW*0.05); bW=Math.round(cW*0.88);
    tY=Math.round(cH*0.62); bY=Math.round(cH*0.74);
  } else if(pos==='sp-banner'){
    // scTitleBaseY=H*0.085, baseline+scTsz*0.85 → text top≈cH*0.089
    bX=Math.round(cW*0.04); bW=Math.round(cW*0.90);
    tY=Math.round(cH*0.09); bY=Math.round(cH*0.15);
  } else if(pos==='center-box'||pos==='cinematic'){          tY=Math.round(cH*0.30); bY=Math.round(cH*0.50); }
  else if(pos==='news-bar'){                           tY=Math.round(cH*0.04); bY=Math.round(cH*0.86); }
  else if(pos==='lesson'||pos==='sticky-top'){         tY=Math.round(cH*0.04); bY=Math.round(cH*0.60); }
  else if(pos==='newsletter'){                         tY=Math.round(cH*0.08); bY=Math.round(cH*0.30); }
  else if(pos==='subtitle-bar'){                       tY=Math.round(cH*0.73); bY=Math.round(cH*0.88); }
  else if(pos==='edu-card'){                           tY=Math.round(cH*0.04); bY=Math.round(cH*0.51); }
  else if(pos==='news-article'){                       tY=Math.round(cH*0.22); bY=Math.round(cH*0.55); }
  // ── tiktok-bold / word-highlight / neon-noir / aurora / vhs-retro ──
  else if(pos==='tiktok-bold'||pos==='word-highlight'){ tY=Math.round(cH*0.40); bY=Math.round(cH*0.65); }
  else if(pos==='neon-noir'){                          tY=Math.round(cH*0.30); bY=Math.round(cH*0.58); }
  else if(pos==='aurora'){                             tY=Math.round(cH*0.28); bY=Math.round(cH*0.54); }
  else if(pos==='vhs-retro'){                          tY=Math.round(cH*0.32); bY=Math.round(cH*0.58); }
  else if(pos==='swiss-clean'){                        tY=Math.round(cH*0.17); bY=Math.round(cH*0.30); bX=Math.round(cW*0.07); bW=Math.round(cW*0.86); }
  else if(pos==='zine-cut'){                           tY=Math.round(cH*0.27); bY=Math.round(cH*0.40); bX=Math.round(cW*0.05); bW=Math.round(cW*0.88); }
  else if(pos==='broadcast-pro'){                      tY=Math.round(cH*0.06); bY=Math.round(cH*0.55); bX=Math.round(cW*0.06); bW=Math.round(cW*0.88); }
  else if(pos==='cinematic-dark'){                     tY=Math.round(cH*0.32); bY=Math.round(cH*0.55); }
  else if(pos==='breaking-news'){                      tY=Math.round(cH*0.04); bY=Math.round(cH*0.40); bX=Math.round(cW*0.06); bW=Math.round(cW*0.88); }
  else if(pos==='pastel-pop'){                         tY=Math.round(cH*0.22); bY=Math.round(cH*0.52); }
  // ── 신규 템플릿 pos ──
  else if(pos==='gradient-wave'){                      tY=Math.round(cH*0.50); bY=Math.round(cH*0.72); }
  else if(pos==='minimal-line'){                       tY=Math.round(cH*0.41); bY=Math.round(cH*0.53); bX=Math.round(cW*0.10); bW=Math.round(cW*0.78); }
  else if(pos==='split-screen'){                       tY=Math.round(cH*0.28); bY=Math.round(cH*0.52); bX=Math.round(cW*0.40); bW=Math.round(cW*0.55); }
  else if(pos==='neon-tokyo'){                         tY=Math.round(cH*0.38); bY=Math.round(cH*0.63); }
  else if(pos==='magazine-cut'){                       tY=Math.round(cH*0.19); bY=Math.round(cH*0.34); bX=Math.round(cW*0.07); bW=Math.round(cW*0.82); }
  else if(pos==='retro-sunset'){                       tY=Math.round(cH*0.28); bY=Math.round(cH*0.55); }
  else if(pos==='shorts-frame'){
    // ★ Canvas 실제 좌표와 1:1 일치 — _refreshBlks._sfBlkCoords 와 동일 공식
    (function(){
      var _sfW=cW, _sfH=cH;
      var _hdrH=_sfH*0.072, _tabH=_sfH*0.040;
      var _tsz=Math.round(_sfW*(S&&S.fmt==='long'?0.048:0.060));
      var _titleBase=_hdrH+_tabH+_sfH*0.012;
      // 제목 blk top = sfTitleBaseY (텍스트 시작 상단)
      tY=Math.round(_titleBase);
      // 본문 blk top = sfDescBaseY
      var _medY=_titleBase+Math.round(_tsz*0.85)+Math.max(2,_sfH*0.040)+_sfH*0.022;
      var _chanY=_medY+_sfH*0.480+_sfH*0.014;
      var _chanSz=Math.round(_sfW*0.030);
      bY=Math.round(_chanY+_chanSz*1.8);
      bX=Math.round(_sfW*0.045); bW=Math.round(_sfW*0.88);
    })();
  }
  else if(pos==='coquette'){                            tY=Math.round(cH*0.25); bY=Math.round(cH*0.52); }
  else if(pos==='y2k-chrome'){                          tY=Math.round(cH*0.26); bY=Math.round(cH*0.52); bX=Math.round(cW*0.06); bW=Math.round(cW*0.88); }
  else if(pos==='lofi-cafe'){                           tY=Math.round(cH*0.20); bY=Math.round(cH*0.48); bX=Math.round(cW*0.08); bW=Math.round(cW*0.84); }
  else {                                               tY=Math.round(cH*0.58); bY=Math.round(cH*0.76); }
  if(which==='title') return {x:bX,y:tY,w:bW};
  if(which==='body')  return {x:bX,y:bY,w:bW};
  // 'label': 템플릿별 장식 텍스트 기본 위치
  var lX=bX, lY, lW=bW;
  if(pos==='newsletter'||pos==='swiss-clean'){ lX=Math.round(cW*0.06); lY=Math.round(cH*0.93); lW=Math.round(cW*0.55); }
  else if(pos==='edu-card'){                   lX=Math.round(cW*0.12); lY=Math.round(cH*0.89); lW=Math.round(cW*0.76); }
  else if(pos==='news-article'){               lX=Math.round(cW*0.05); lY=Math.round(cH*0.10); lW=Math.round(cW*0.55); }
  else if(pos==='breaking-news'){              lX=Math.round(cW*0.17); lY=Math.round(cH*0.91); lW=Math.round(cW*0.80); }
  else if(pos==='broadcast-pro'){             lX=Math.round(cW*0.02); lY=Math.round(cH*0.89); lW=Math.round(cW*0.88); }
  else if(pos==='zine-cut'){                   lX=Math.round(cW*0.05); lY=Math.round(cH*0.09); lW=Math.round(cW*0.88); }
  else if(pos==='minimal-line'){               lX=Math.round(cW*0.10); lY=Math.round(cH*0.31); lW=Math.round(cW*0.78); }
  else if(pos==='split-screen'){               lX=Math.round(cW*0.06); lY=Math.round(cH*0.58); lW=Math.round(cW*0.28); }
  else if(pos==='magazine-cut'){               lX=Math.round(cW*0.07); lY=Math.round(cH*0.07); lW=Math.round(cW*0.86); }
  else if(pos==='pastel-pop'){                 lX=Math.round(cW*0.28); lY=Math.round(cH*0.16); lW=Math.round(cW*0.44); }
  else { lY=Math.round(cH*0.92); }
  return {x:lX,y:lY,w:lW};
}

function _blkClamp(v,mn,mx){ return Math.max(mn,Math.min(mx,v)); }

// ═══════════════════════════════════════════════════════════════
// 캔바/캡컷 수준 텍스트 블록 시스템
// ═══════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════
// _applyBlkStyle: Canvas 실제 렌더 스타일을 ce에 1:1 동기화
// → 편집 시 팝업 없이 텍스트 그 자리에서 바로 수정 (캔바/미리캔버스 방식)
// ══════════════════════════════════════════════════════════════════
function _applyBlkStyle(which){
  var st=_blkState[which];
  var ce=document.getElementById('blk-'+which+'-ce');
  if(!ce) return;
  var canvas=document.getElementById('pv');
  var tpl=TPLS[S.tplId]||TPLS[0];
  var t=tpl.txt||{};
  var pos=t.pos||'lower-third';
  var cW=canvas?canvas.clientWidth:320;
  var sc=S.scenes[curScene]||{};

  // ── Canvas 실제 폰트 크기 계산 (drawTextLayout 과 동일 공식) ──
  var isLong=(S&&S.fmt==='long');
  var tszBase=Math.round(cW*(isLong?0.048:0.058));
  var bszBase=Math.round(cW*(isLong?0.030:0.037));
  var titleSzCanvas = sc.titleFontSize || Math.round(tszBase*(editOpts&&editOpts.titleSize||1.0));
  var bodySzCanvas  = sc.bodyFontSize  || Math.round(bszBase*(editOpts&&editOpts.bodySize||1.0));

  // ── Canvas 실제 색상 (tpl.txt.titleClr / bodyClr, 사용자 오버라이드 포함) ──
  var titleClrCanvas = sc.titleColor || (editOpts&&editOpts.titleColor) || t.titleClr || '#ffffff';
  var bodyClrCanvas  = sc.bodyColor  || (editOpts&&editOpts.bodyColor)  || t.bodyClr  || '#e2e8f0';
  // label은 기존 st.color 사용
  var labelClrCanvas = sc.labelColor || st.color || '#a5b4fc';

  // ── 템플릿별 특수 폰트/크기 오버라이드 ──
  if(pos==='shorts-frame'){
    titleSzCanvas = sc.titleFontSize || Math.round(cW*(isLong?0.048:0.060));
    bodySzCanvas  = sc.bodyFontSize  || Math.round(cW*(isLong?0.026:0.030));
    titleClrCanvas= sc.titleColor || '#0a0a0a';
    bodyClrCanvas = sc.bodyColor  || 'rgba(0,0,0,0.70)';
  }

  // ── ce에 적용 ──
  var fsz, clr, fw, fam, lh;
  if(which==='title'){
    fsz = titleSzCanvas;
    clr = titleClrCanvas;
    fw  = sc.titleBold===false?'700':(t.titleFont||'700');
    fam = sc.titleFontFamily||(pos==='shorts-frame'?"'Noto Sans KR','Black Han Sans',sans-serif":"'Noto Sans KR',sans-serif");
    lh  = pos==='shorts-frame'?'1.20':'1.3';
  } else if(which==='body'){
    fsz = bodySzCanvas;
    clr = bodyClrCanvas;
    fw  = sc.bodyBold?'700':'400';
    fam = sc.bodyFontFamily||"'Noto Sans KR',sans-serif";
    lh  = pos==='shorts-frame'?'1.4':'1.5';
  } else { // label
    fsz = sc.labelFontSize || st.fontSize || 10;
    clr = labelClrCanvas;
    fw  = sc.labelBold!==false?'700':'400';
    fam = sc.labelFontFamily||"'Noto Sans KR',sans-serif";
    lh  = '1.2';
  }
  // st 동기화 (툴바 표시용)
  st.fontSize=fsz; st.color=clr;

  ce.style.fontSize  = fsz+'px';
  ce.style.color     = clr;
  ce.style.fontFamily= fam;
  ce.style.fontWeight= fw;
  ce.style.fontStyle = st.italic?'italic':'normal';
  ce.style.textDecoration=st.underline?'underline':'none';
  ce.style.textAlign = st.align||t.align||'left';
  ce.style.lineHeight= lh;

  // caret-color: 밝은 배경이면 검정, 어두운 배경이면 흰색
  var isDarkText=(clr==='#ffffff'||clr.indexOf('255,255,255')>=0||clr.indexOf('rgba(255')===0);
  ce.style.caretColor= isDarkText?'#ffffff':'#111111';

  // 툴바 버튼 active 상태 반영
  var boldBtn=document.getElementById('blk-'+which+'-bold');
  var italicBtn=document.getElementById('blk-'+which+'-italic');
  var ulBtn=document.getElementById('blk-'+which+'-underline');
  if(boldBtn){boldBtn.classList.toggle('active',!!st.bold);}
  if(italicBtn){italicBtn.classList.toggle('active',!!st.italic);}
  if(ulBtn){ulBtn.classList.toggle('active',!!st.underline);}
  ['l','c','r'].forEach(function(d){
    var btn=document.getElementById('blk-'+which+'-al-'+d);
    if(btn) btn.classList.toggle('active',st.align===(d==='l'?'left':d==='c'?'center':'right'));
  });
  var szIn=document.getElementById('blk-'+which+'-sz-lbl');
  if(szIn) szIn.value=String(fsz);
  var clrIn=document.getElementById('blk-'+which+'-clr');
  if(clrIn){
    // <input type="color">는 #rrggbb 형식만 허용 — rgba/rgb를 hex로 변환
    var clrVal=st.color||'#ffffff';
    if(clrVal.indexOf('rgba')===0||clrVal.indexOf('rgb(')===0){
      var m=clrVal.match(/[\d.]+/g);
      if(m&&m.length>=3){
        var r2=parseInt(m[0]),g2=parseInt(m[1]),b2=parseInt(m[2]);
        clrVal='#'+('0'+r2.toString(16)).slice(-2)+('0'+g2.toString(16)).slice(-2)+('0'+b2.toString(16)).slice(-2);
      } else { clrVal='#ffffff'; }
    }
    // hex가 3자리 단축형이면 6자리로 확장
    if(/^#[0-9a-fA-F]{3}$/.test(clrVal)){
      clrVal='#'+clrVal[1]+clrVal[1]+clrVal[2]+clrVal[2]+clrVal[3]+clrVal[3];
    }
    clrIn.value=clrVal;
  }
  var fntSel=document.getElementById('blk-'+which+'-font');
  if(fntSel) fntSel.value=st.fontFamily;
}

// 학원이름 → 실제 브랜드명 치환 (블록 표시용)
function _brandSub(t){ var bn=(editOpts.brandName||'').trim(); return bn&&t?t.replace(/학원이름/g,bn):t||''; }

// ── 블록 선택 + 드래그 시작 ──
function _blkSelect(e,which){
  var ce=document.getElementById('blk-'+which+'-ce');
  if(ce && ce.contentEditable==='true') return;
  if(e.target&&(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT')) return;
  e.stopPropagation();
  var tb=document.getElementById('blk-'+which+'-tb');
  var inTb=tb&&tb.contains(e.target);
  _blkSetSelected(which);
  // 항상 드래그 시작 (선택됐든 아니든) — 더블클릭만 편집 모드
  if(!inTb){
    _blkDragStart(e,which);
  }
}

function _blkSetSelected(which){
  // 이전 선택 해제
  ['title','body','label'].forEach(function(w){
    var b=document.getElementById('blk-'+w);
    if(b) b.classList.remove('blk-selected');
  });
  _blkSelected=which;
  if(which){
    var blk=document.getElementById('blk-'+which);
    if(blk) blk.classList.add('blk-selected');
  }
}

// 캔버스 빈 곳 클릭 → 선택 해제
document.addEventListener('click',function(e){
  var pv=document.getElementById('pv');
  var wrap=document.getElementById('canvas-wrap');
  if(!wrap) return;
  // 블록 내부 클릭이면 무시
  var inBlock=['blk-title','blk-body','blk-label'].some(function(id){
    var el=document.getElementById(id);
    return el&&el.contains(e.target);
  });
  if(!inBlock && wrap.contains(e.target)){
    _blkSetSelected('');
    // 편집 중인 블록 blur
    ['title','body','label'].forEach(function(w){
      var ce=document.getElementById('blk-'+w+'-ce');
      if(ce&&ce.contentEditable==='true'){ce.contentEditable='false';ce.classList.remove('blk-editing');ce.blur();}
    });
  }
});

// ── 더블클릭 → 편집 모드 진입 ──
function _blkDblClick(e,which){
  e.stopPropagation();
  _blkSetSelected(which);
  var ce=document.getElementById('blk-'+which+'-ce');
  if(ce){
    // ★ 편집 진입 전 최신 텍스트를 ce에 채워넣기 (Canvas 텍스트와 동기화)
    var sc=S.scenes[curScene]||{};
    var tpl=TPLS[S.tplId]||TPLS[0];
    var _pos=(TPLS[S.tplId]||TPLS[0]).txt&&(TPLS[S.tplId]||TPLS[0]).txt.pos||'lower-third';
    if(which==='title'){
      ce.textContent = _brandSub(sc.title || sc.text || '');
    } else if(which==='body'){
      // shorts-frame: sc.title 유무와 무관하게 sc.text가 본문
      // 일반: sc.title 있으면 sc.text가 본문, 없으면 전체 내용이 제목 블록에 있음
      // ★ body: sc.title 있으면 sc.text(본문), 없으면 sc.text(대본 전체 — 화면에 표시되는 텍스트)
      ce.textContent = _brandSub(sc.text || '');
    } else if(which==='label'){
      ce.textContent = _brandSub(sc.labelText!==undefined ? sc.labelText : _labelDefault(tpl.txt&&tpl.txt.pos||'lower-third', tpl));
    }
    // ★ _applyBlkStyle: Canvas 실제 색상/폰트/크기를 ce에 정확히 주입
    // → 편집 시 배경 없이 텍스트 그 자리에서 바로 수정 (캔바 방식)
    _applyBlkStyle(which);
    ce.contentEditable='true';
    ce.classList.add('blk-editing');
    ce.focus();
    // 커서를 끝으로
    try{
      var range=document.createRange();
      var sel=window.getSelection();
      range.selectNodeContents(ce);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }catch(ex){}
  }
}

// ─────────────────────────────────────────
// 블록 새로고침 (씬/템플릿 변경 시 호출)
// ─────────────────────────────────────────
function _refreshBlks(idx){
  var canvas=document.getElementById('pv');
  if(!canvas) return;
  var sc=S.scenes[idx]||{};
  var tpl=TPLS[S.tplId]||TPLS[0];
  var pos=(tpl.txt&&tpl.txt.pos)||'lower-third';
  var cW=canvas.clientWidth, cH=canvas.clientHeight;

  // ★ Shorts Frame 전용: Canvas 실제 렌더 좌표와 1:1 일치 계산
  var _sfBlkCoords=null;
  if(pos==='shorts-frame'){
    var sfW=cW, sfH=cH;
    var sfPadX=sfW*0.045;
    var sfHdrH=sfH*0.072;
    var sfTabH=sfH*0.040;
    var sfTabY=sfHdrH;
    // 제목: sfTitleBaseY (Canvas와 동일)
    var sfTitleBaseY=sfTabY+sfTabH+sfH*0.012;
    var sfTsz=Math.round(sfW*(S&&S.fmt==='long'?0.048:0.060));
    // 본문 좌표: 미디어 박스 아래 채널 섹션 아래
    var sfMetaSz=Math.round(sfW*0.025);
    var sfMedY=sfTitleBaseY + Math.round(sfTsz*0.85) + Math.max(2,sfH*0.040) + sfH*0.022;
    var sfMedH=sfH*0.480;
    var sfChanSz=Math.round(sfW*0.030);
    var sfChanY=sfMedY+sfMedH+sfH*0.014;
    var sfDescBaseY=sfChanY+sfChanSz*1.8;
    var sfBsz=Math.round(sfW*(S&&S.fmt==='long'?0.026:0.030));
    _sfBlkCoords={
      title:{ x:sfPadX, y:sfTitleBaseY, w:sfW*0.88, fontSize:sfTsz, lineH:sfTsz*1.20 },
      body: { x:sfPadX, y:sfDescBaseY,  w:sfW*0.82, fontSize:sfBsz, lineH:sfBsz*1.4  }
    };
  }

  ['title','body'].forEach(function(which){
    var bp=_blkBasePos(which,cW,cH,pos);
    var ox=(which==='title')?(sc.textOffsetX||0):(sc.bodyOffsetX||0);
    var oy=(which==='title')?(sc.textOffsetY||0):(sc.bodyOffsetY||0);
    var st=_blkState[which];
    // ★ Shorts Frame: 정밀 좌표 오버라이드
    if(_sfBlkCoords&&_sfBlkCoords[which]){
      var sfc=_sfBlkCoords[which];
      bp={x:sfc.x, y:sfc.y, w:sfc.w};
      // 실제 Canvas 폰트 크기를 st에 반영 (사용자가 직접 변경하지 않은 경우)
      if(which==='title'&&!sc.titleFontSize) st.fontSize=sfc.fontSize;
      if(which==='body'&&!sc.bodyFontSize)   st.fontSize=sfc.fontSize;
    }
    st.left=bp.x+ox; st.top=bp.y+oy;
    if(!st.init){
      st.fontSize=(which==='title')?16:12;
      st.color=(which==='title')?(tpl.txt&&tpl.txt.titleClr||'#ffffff'):(tpl.txt&&tpl.txt.bodyClr||'#e2e8f0');
      st.fontFamily='Noto Sans KR';
      st.bold=(which==='title');
      st.italic=false; st.underline=false; st.align='left';
      st.init=true;
    }
    // 씬별 저장된 스타일 복원
    if(sc.titleFontSize&&which==='title') st.fontSize=sc.titleFontSize;
    if(sc.bodyFontSize&&which==='body') st.fontSize=sc.bodyFontSize;
    if(sc.titleColor&&which==='title') st.color=sc.titleColor;
    if(sc.bodyColor&&which==='body') st.color=sc.bodyColor;
    if(sc.titleFontFamily&&which==='title') st.fontFamily=sc.titleFontFamily;
    if(sc.bodyFontFamily&&which==='body') st.fontFamily=sc.bodyFontFamily;
    if(sc.titleBold!==undefined&&which==='title') st.bold=sc.titleBold;
    if(sc.bodyBold!==undefined&&which==='body') st.bold=sc.bodyBold;
    if(sc.titleItalic!==undefined&&which==='title') st.italic=sc.titleItalic;
    if(sc.bodyItalic!==undefined&&which==='body') st.italic=sc.bodyItalic;
    if(sc.titleAlign&&which==='title') st.align=sc.titleAlign;
    if(sc.bodyAlign&&which==='body') st.align=sc.bodyAlign;

    var blk=document.getElementById('blk-'+which);
    var ce=document.getElementById('blk-'+which+'-ce');
    if(blk){
      blk.style.left=st.left+'px';
      blk.style.top=st.top+'px';
      blk.style.width=bp.w+'px';
      blk.style.display='block';
    }
    if(ce){
      if(ce.contentEditable!=='true'){
        if(which==='title') ce.textContent=_brandSub(sc.title||sc.text||'');
        else ce.textContent=_brandSub(sc.text||'');
      }
      _applyBlkStyle(which);
    }
  });

  // ── label 블록 (장식 텍스트) ──
  var hasLabel = _labelHasPos(pos);
  var lblBlk=document.getElementById('blk-label');
  var lblCe=document.getElementById('blk-label-ce');
  if(hasLabel && sc.labelHidden!==true){
    var lbp=_blkBasePos('label',cW,cH,pos);
    var lox=(sc.labelOffsetX||0), loy=(sc.labelOffsetY||0);
    var lst=_blkState['label'];
    lst.left=lbp.x+lox; lst.top=lbp.y+loy;
    if(!lst.init){
      lst.fontSize=10; lst.color='#a5b4fc'; lst.fontFamily='Noto Sans KR';
      lst.bold=true; lst.italic=false; lst.underline=false; lst.align='left';
      lst.init=true;
    }
    if(sc.labelFontSize) lst.fontSize=sc.labelFontSize;
    if(sc.labelColor) lst.color=sc.labelColor;
    if(sc.labelFontFamily) lst.fontFamily=sc.labelFontFamily;
    if(sc.labelBold!==undefined) lst.bold=sc.labelBold;
    if(sc.labelAlign) lst.align=sc.labelAlign;
    if(lblBlk){
      lblBlk.style.left=lst.left+'px'; lblBlk.style.top=lst.top+'px';
      lblBlk.style.width=lbp.w+'px'; lblBlk.style.display='block';
    }
    if(lblCe && lblCe.contentEditable!=='true'){
      lblCe.textContent=_brandSub(sc.labelText!==undefined?sc.labelText:_labelDefault(pos,tpl));
      _applyBlkStyle('label');
    }
  } else {
    if(lblBlk) lblBlk.style.display='none';
  }
}

// 장식 텍스트가 있는 pos인지 확인
function _labelHasPos(pos){
  return ['newsletter','swiss-clean','edu-card','news-article','breaking-news',
          'broadcast-pro','zine-cut','minimal-line','split-screen','magazine-cut','pastel-pop',
          'lower-third','center-box','cinematic','lesson','sticky-top','subtitle-bar',
          'tiktok-bold','word-highlight','neon-noir','aurora','vhs-retro','cinematic-dark',
          'gradient-wave','neon-tokyo','retro-sunset','news-bar'].indexOf(pos)>=0;
}

// 템플릿별 기본 장식 텍스트 — brandName 설정 시 우선 사용
function _labelDefault(pos, tpl){
  var brand=(editOpts.brandName||'').trim();
  var cat=(tpl&&tpl.cat)||'';
  if(pos==='newsletter') return brand||(cat||'NEWSLETTER').toUpperCase();
  if(pos==='swiss-clean') return brand||'BYGENCY';
  if(pos==='edu-card') return brand||'BYGENCY';
  if(pos==='news-article') return brand?(brand+' NEWS'):'BYGENCY NEWS';
  if(pos==='breaking-news') return brand?(brand+' · 2026 · LIVE'):'BYGENCY NEWS · 2026 · LIVE';
  if(pos==='broadcast-pro') return brand?(brand+' · BROADCAST'):'BYGENCY BROADCAST · 2026';
  if(pos==='zine-cut') return brand||(cat||'ZINE').toUpperCase();
  if(pos==='minimal-line') return (brand||cat||'DESIGN').toLowerCase();
  if(pos==='split-screen') return brand||(cat||'SPLIT').toUpperCase();
  if(pos==='magazine-cut') return 'VOL.01 · '+(brand||cat||'EDITORIAL').toUpperCase();
  if(pos==='pastel-pop') return brand||(cat||'CUTE').toUpperCase();
  return (brand||cat||'BYGENCY').toUpperCase();
}

// 장식 텍스트 숨기기 (✕ 버튼)
function _blkDeleteLabel(){
  var sc=S.scenes[curScene];
  if(sc) sc.labelHidden=true;
  _blkSetSelected('');
  var lblBlk=document.getElementById('blk-label');
  if(lblBlk) lblBlk.style.display='none';
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// contenteditable 입력 → 실시간 캔버스 반영
// ─────────────────────────────────────────
function _blkInput(e,which){
  var ce=e.target||e.srcElement;
  var sc=S.scenes[curScene];
  if(!sc||!ce) return;
  var txt=ce.innerText||ce.textContent||'';
  if(which==='title'){
    sc.title=txt; sc.text=txt;
    renderSceneNav();
  } else if(which==='label'){
    sc.labelText=txt;
  } else {
    sc.text=txt;
  }
  drawScene(curScene,1);
  if(which!=='label'){
    var ta=document.querySelector('#sc-'+curScene+' .sc-ta');
    if(ta && document.activeElement!==ta) ta.value=sc.text||'';
  }
}

// ─────────────────────────────────────────
// 포커스/블러
// ─────────────────────────────────────────
function _blkFocus(which){
  var hint=document.getElementById('canvas-dbl-hint');
  if(hint) hint.style.opacity='0';
}
function _blkBlur(e,which){
  // 편집 모드 해제
  var ce=document.getElementById('blk-'+which+'-ce');
  var hint=document.getElementById('canvas-dbl-hint');
  if(hint) hint.style.opacity='1';
  var sc=S.scenes[curScene];
  if(sc&&ce){
    var txt=ce.innerText||ce.textContent||'';
    if(which==='title'){ sc.title=txt; sc.text=txt; }
    else if(which==='label'){ sc.labelText=txt; }
    else { sc.text=txt; }
    if(which==='title') ce.textContent=_brandSub(sc.title||sc.text||'');
    else if(which==='label') ce.textContent=_brandSub(sc.labelText||'');
    else ce.textContent=_brandSub(sc.text||'');
    ce.contentEditable='false';
    ce.classList.remove('blk-editing');
    drawScene(curScene,1);
    renderSceneList();
    renderTimeline();
  } else if(ce){
    ce.textContent='';
    ce.contentEditable='false';
    ce.classList.remove('blk-editing');
  }
}

// ─────────────────────────────────────────
// 키보드: ESC → blur, 편집 종료
// ─────────────────────────────────────────
function _blkKey(e,which){
  if(e.key==='Escape'){
    var ce=document.getElementById('blk-'+which+'-ce');
    if(ce){
      // ★ ESC: 편집 내용 저장 후 CE 초기화 — Canvas 텍스트로 복귀
      var sc=S.scenes[curScene];
      if(sc){
        var txt=ce.innerText||ce.textContent||'';
        if(which==='title'){ sc.title=txt; sc.text=txt; }
        else if(which==='label'){ sc.labelText=txt; }
        else { sc.text=txt; }
      }
      var sc2=S.scenes[curScene];
      if(sc2){
        if(which==='title') ce.textContent=_brandSub(sc2.title||sc2.text||'');
        else if(which==='label') ce.textContent=_brandSub(sc2.labelText||'');
        else ce.textContent=_brandSub(sc2.text||'');
      } else { ce.textContent=''; }
      ce.contentEditable='false';
      ce.classList.remove('blk-editing');
      ce.blur();
    }
    _blkSetSelected('');
    drawScene(curScene,1);
    e.preventDefault();
  }
}

// ─────────────────────────────────────────
// 글자크기 변경 (A+/A- 버튼)
// ─────────────────────────────────────────
function _blkFontSize(which,delta){
  var st=_blkState[which];
  st.fontSize=Math.max(8,Math.min(120,st.fontSize+delta));
  var sc=S.scenes[curScene];
  if(sc){ if(which==='title') sc.titleFontSize=st.fontSize; else if(which==='label') sc.labelFontSize=st.fontSize; else sc.bodyFontSize=st.fontSize; }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}
function _blkFontSizeDirect(which,val){
  var st=_blkState[which];
  st.fontSize=Math.max(8,Math.min(120,val||st.fontSize));
  var sc=S.scenes[curScene];
  if(sc){ if(which==='title') sc.titleFontSize=st.fontSize; else if(which==='label') sc.labelFontSize=st.fontSize; else sc.bodyFontSize=st.fontSize; }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// 폰트 패밀리 변경
// ─────────────────────────────────────────
function _blkFontFamily(which,val){
  _blkState[which].fontFamily=val;
  var sc=S.scenes[curScene];
  if(sc){ if(which==='title') sc.titleFontFamily=val; else if(which==='label') sc.labelFontFamily=val; else sc.bodyFontFamily=val; }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// 굵기/이탤릭/밑줄 토글
// ─────────────────────────────────────────
function _blkToggle(which,prop){
  var st=_blkState[which];
  st[prop]=!st[prop];
  var sc=S.scenes[curScene];
  if(sc){
    var prefix=which==='title'?'title':which==='label'?'label':'body';
    sc[prefix+prop.charAt(0).toUpperCase()+prop.slice(1)]=st[prop];
  }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// 텍스트 정렬
// ─────────────────────────────────────────
function _blkAlign(which,dir){
  _blkState[which].align=dir;
  var sc=S.scenes[curScene];
  if(sc){ if(which==='title') sc.titleAlign=dir; else if(which==='label') sc.labelAlign=dir; else sc.bodyAlign=dir; }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// 글자색 변경
// ─────────────────────────────────────────
function _blkColorChange(which,val){
  _blkState[which].color=val;
  var sc=S.scenes[curScene];
  if(sc){ if(which==='title') sc.titleColor=val; else if(which==='label') sc.labelColor=val; else sc.bodyColor=val; }
  _applyBlkStyle(which);
  drawScene(curScene,1);
}

// ─────────────────────────────────────────
// 드래그 이동 — pointerdown + setPointerCapture 방식
// ─────────────────────────────────────────
function _blkDragStart(e,which){
  if(e.target&&(e.target.tagName==='BUTTON'||e.target.tagName==='INPUT'||e.target.tagName==='SELECT')) return;
  var ce=document.getElementById('blk-'+which+'-ce');
  if(ce&&ce.contentEditable==='true') return;
  e.preventDefault();
  e.stopPropagation();
  var sc=S.scenes[curScene];
  var tpl=TPLS[S.tplId]||TPLS[0];
  var pos=(tpl.txt&&tpl.txt.pos)||'lower-third';
  var canvas=document.getElementById('pv');
  var cW=canvas?canvas.clientWidth:320, cH=canvas?canvas.clientHeight:568;
  var bp=_blkBasePos(which,cW,cH,pos);
  _blkDragSt.active=true;
  _blkDragSt.which=which;
  _blkDragSt.sx=e.clientX;
  _blkDragSt.sy=e.clientY;
  _blkDragSt.pointerId=(e.pointerId!=null)?e.pointerId:-1;
  _blkDragSt.bpX=bp.x; _blkDragSt.bpY=bp.y;
  if(sc){
    if(which==='title')      { _blkDragSt.startOffX=sc.textOffsetX||0;  _blkDragSt.startOffY=sc.textOffsetY||0; }
    else if(which==='label') { _blkDragSt.startOffX=sc.labelOffsetX||0; _blkDragSt.startOffY=sc.labelOffsetY||0; }
    else                     { _blkDragSt.startOffX=sc.bodyOffsetX||0;  _blkDragSt.startOffY=sc.bodyOffsetY||0; }
  } else { _blkDragSt.startOffX=0; _blkDragSt.startOffY=0; }
  _blkDragMoved=false;
  var blk=document.getElementById('blk-'+which);
  if(blk) blk.style.cursor='grabbing';
}

// ── document-레벨 pointermove (항상 등록, active 체크) ──
document.addEventListener('pointermove',function(e){
  if(!_blkDragSt.active) return;
  if(_blkDragSt.pointerId>=0&&e.pointerId!==_blkDragSt.pointerId) return;
  if(e.cancelable) e.preventDefault();
  var dx=e.clientX-_blkDragSt.sx, dy=e.clientY-_blkDragSt.sy;
  if(Math.abs(dx)>2||Math.abs(dy)>2) _blkDragMoved=true;
  if(!_blkDragMoved) return;
  var which=_blkDragSt.which;
  var newOffX=_blkDragSt.startOffX+Math.round(dx);
  var newOffY=_blkDragSt.startOffY+Math.round(dy);
  var newL=_blkDragSt.bpX+newOffX;
  var newT=_blkDragSt.bpY+newOffY;
  var blk=document.getElementById('blk-'+which);
  if(blk){ blk.style.left=newL+'px'; blk.style.top=newT+'px'; }
  _blkState[which].left=newL; _blkState[which].top=newT;
  var sc=S.scenes[curScene];
  if(sc){
    if(which==='title')      { sc.textOffsetX=newOffX; sc.textOffsetY=newOffY; }
    else if(which==='label') { sc.labelOffsetX=newOffX; sc.labelOffsetY=newOffY; }
    else                     { sc.bodyOffsetX=newOffX; sc.bodyOffsetY=newOffY; }
  }
  drawScene(curScene,1);
},{passive:false});

document.addEventListener('pointerup',function(e){
  if(!_blkDragSt.active) return;
  if(_blkDragSt.pointerId>=0&&e.pointerId!==_blkDragSt.pointerId) return;
  _blkDragEnd();
});
document.addEventListener('pointercancel',function(){
  if(_blkDragSt.active) _blkDragEnd();
});

function _blkDragEnd(){
  if(!_blkDragSt.active) return;
  var which=_blkDragSt.which;
  var wasMoved=_blkDragMoved;
  _blkDragSt.active=false;
  var blk=document.getElementById('blk-'+which);
  if(blk) blk.style.cursor='move';
  // 드래그 없이 순수 클릭 → 즉시 편집 진입
  if(!wasMoved){
    var ce=document.getElementById('blk-'+which+'-ce');
    if(ce && ce.contentEditable!=='true'){
      _blkDblClick({stopPropagation:function(){}}, which);
    }
  }
}

// ─────────────────────────────────────────
// 하위 호환 래퍼들
// ─────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────
// canvas 더블클릭 → 가장 가까운 텍스트 블록에 포커스 (직접편집 UX)
// ─────────────────────────────────────────────────────────────────
function onCanvasClick(e){
  // ★ Shorts Frame: Canvas 단일 클릭으로 가장 가까운 텍스트 블록 즉시 선택
  // (두 번째 클릭 시 _blkSelect → _blkDblClick 으로 편집 진입)
  var tpl=TPLS[S.tplId]||TPLS[0];
  var pos=(tpl.txt&&tpl.txt.pos)||'lower-third';
  if(pos!=='shorts-frame') return;
  var canvas=document.getElementById('pv');
  if(!canvas) return;
  var rect=canvas.getBoundingClientRect();
  var mx=e.clientX-rect.left, my=e.clientY-rect.top;
  var cW=canvas.clientWidth, cH=canvas.clientHeight;
  var sc=S.scenes[curScene]||{};
  var tbp=_blkBasePos('title',cW,cH,pos);
  var bbp=_blkBasePos('body',cW,cH,pos);
  var _cvR=cW/Math.max(1,canvas.width||1080);
  var tox=Math.round((sc.textOffsetX||0)*_cvR), toy=Math.round((sc.textOffsetY||0)*_cvR);
  var box=Math.round((sc.bodyOffsetX||0)*_cvR), boy=Math.round((sc.bodyOffsetY||0)*_cvR);
  var tCx=tbp.x+tbp.w/2+tox, tCy=tbp.y+24+toy;
  var bCx=bbp.x+bbp.w/2+box, bCy=bbp.y+16+boy;
  var dTitle=Math.hypot(mx-tCx, my-tCy);
  var dBody =Math.hypot(mx-bCx, my-bCy);
  var target=(dTitle<=dBody)?'title':'body';
  // 이미 같은 블록이 선택돼 있으면 즉시 편집 진입
  if(_blkSelected===target){
    _blkDblClick(e, target);
  } else {
    _blkSetSelected(target);
  }
}
function onCanvasDblClick(e){
  var canvas=document.getElementById('pv');
  if(!canvas) return;
  var rect=canvas.getBoundingClientRect();
  var mx=e.clientX-rect.left, my=e.clientY-rect.top;
  var cW=canvas.clientWidth, cH=canvas.clientHeight;
  var tpl=TPLS[S.tplId]||TPLS[0];
  var pos=(tpl.txt&&tpl.txt.pos)||'lower-third';
  var tbp=_blkBasePos('title',cW,cH,pos);
  var bbp=_blkBasePos('body',cW,cH,pos);
  var sc=S.scenes[curScene]||{};
  var _cvR2=cW/Math.max(1,canvas.width||1080);
  var tox=Math.round((sc.textOffsetX||0)*_cvR2), toy=Math.round((sc.textOffsetY||0)*_cvR2);
  var box=Math.round((sc.bodyOffsetX||0)*_cvR2), boy=Math.round((sc.bodyOffsetY||0)*_cvR2);
  var lox=Math.round((sc.labelOffsetX||0)*_cvR2), loy=Math.round((sc.labelOffsetY||0)*_cvR2);
  var tCx=tbp.x+tbp.w/2+tox, tCy=tbp.y+40+toy;
  var bCx=bbp.x+bbp.w/2+box, bCy=bbp.y+40+boy;
  var dTitle=Math.hypot(mx-tCx, my-tCy);
  var dBody =Math.hypot(mx-bCx, my-bCy);
  var target=(dTitle<=dBody)?'title':'body';
  if(_labelHasPos(pos) && sc.labelHidden!==true){
    var lbp=_blkBasePos('label',cW,cH,pos);
    var lCx=lbp.x+lbp.w/2+lox, lCy=lbp.y+20+loy;
    var dLabel=Math.hypot(mx-lCx, my-lCy);
    if(dLabel<dTitle && dLabel<dBody) target='label';
  }
  // ★ _blkDblClick으로 위임 — 텍스트 채우기 + 편집 모드 진입을 한 곳에서 처리
  _blkDblClick(e, target);
  showToast('✏️ 편집 모드 — ESC 또는 외부 클릭으로 완료',1800);
}
function openSceneTextEditor(idx){ _refreshBlks(idx!==undefined?idx:curScene); }
function cancelInlineEdit(){ /* 편집모드 개념 없음 */ }
function commitInlineEdit(){}
function _positionBlocks(idx){ _refreshBlks(idx); }
function onBlkDown(e,w){ _blkDragStart(e,w); }
function onBlkClick(e,w){}
function onBlkCEClick(e,w){}
function onBlkCEInput(e,w){ _blkInput(e,w); }
function onBlkCEBlur(e,w){ _blkBlur(e,w); }
function onBlkCEKey(e,w){ _blkKey(e,w); }
function onBlkHandleDown(e,w){ _blkDragStart(e,w); }
function onBlkEditorInput(){ drawScene(curScene,1); }
function closeBlkEditor(s){ if(s){ drawScene(curScene,1); renderSceneList(); } }
function onInlineTitleInput(el){ drawScene(curScene,1); }
function onInlineBodyInput(el){ drawScene(curScene,1); }

function autoMatchMediaForScene(idx){
  var sc=S.scenes[idx];if(!sc) return;
  // fetchSceneImg를 재사용하여 Pexels API 우선 시도
  fetchSceneImg(idx).then(function(img){
    if(img && curScene===idx) drawScene(idx,1);
  });
}

// ══════════════════════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════════════════════
// ── 폰트 사전 로드 (렌더링 전 Canvas 폰트 준비 보장) ──
function preloadFonts() {
  return new Promise(function(resolve) {
    if(!document.fonts || !document.fonts.ready) { resolve(); return; }
    // 주요 폰트 사전 로드 트리거
    var fontTests = [
      { font: '900 48px "Noto Sans KR"', text: '가나다라마바사' },
      { font: '700 48px "Noto Sans KR"', text: '가나다라마바사' },
      { font: '400 48px "Noto Sans KR"', text: 'ABCabc123' },
      { font: '800 48px "Pretendard"', text: 'ABCabc123' }
    ];
    var cv = document.createElement('canvas');
    cv.width = 200; cv.height = 60;
    var ctx2 = cv.getContext('2d');
    fontTests.forEach(function(ft) {
      try { ctx2.font = ft.font; ctx2.fillText(ft.text, 0, 48); } catch(e) {}
    });
    document.fonts.ready.then(function() {
      // 폰트 로드 완료 후 추가로 캔버스에 강제 렌더링하여 캐시 확보
      fontTests.forEach(function(ft) {
        try { ctx2.font = ft.font; ctx2.fillText(ft.text, 0, 48); } catch(e) {}
      });
      resolve();
    }).catch(resolve);
  });
}

// DOMContentLoaded 즉시 init → 폰트는 백그라운드 비동기 로드
document.addEventListener('DOMContentLoaded',function(){
  init();
  setTimeout(autoMatchMedia,800);
  setTimeout(renderTimeline,400);
  // 폰트는 백그라운드에서 조용히 로드 → 완료 시 캔버스 재드로우
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(function(){
      try{ drawScene(curScene,0); }catch(e){}
    }).catch(function(){});
  }
});
window.addEventListener('resize',function(){resizeCanvas();drawScene(curScene,1);renderTimeline();});

// ══════════════════════════════════════════════════════════════
// 미디어 드래그 · 핀치줌 — 배경 사진/영상 직관적 위치/크기 조절
// ══════════════════════════════════════════════════════════════
var _mediaDragging=false,_mediaTouching=false;
var _mediaDragStartX=0,_mediaDragStartY=0;
var _mediaDragBaseOx=0,_mediaDragBaseOy=0;
var _mediaTouchDist0=1,_mediaTouchZoom0=1.0;

function _mediaHasContent(idx){ return !!(sceneImgs[idx]&&sceneImgs[idx].complete&&sceneImgs[idx].naturalWidth>0)||(S.scenes[idx]&&S.scenes[idx]._vidEl); }

function _updateZoomBadge(){
  var badge=document.getElementById('media-zoom-badge');
  if(!badge) return;
  var sc=S.scenes[curScene];
  var z=Math.round(((sc&&sc.mediaZoom)||1.0)*100);
  var ox=Math.round((sc&&sc.mediaOffsetX)||0);
  var oy=Math.round((sc&&sc.mediaOffsetY)||0);
  var hasChange=(z!==100||ox!==0||oy!==0);
  badge.style.display=hasChange?'block':'none';
  badge.textContent='🔍 '+z+'%'+(hasChange&&(ox||oy)?' · 위치조정':'');
  _syncMediaSizeUI();
}

// 슬라이더 ↔ mediaZoom 동기화
function _syncMediaSizeUI(){
  var sc=S.scenes[curScene];
  var z=Math.round(((sc&&sc.mediaZoom)||1.0)*100);
  var sl=document.getElementById('media-size-slider');
  var vl=document.getElementById('media-size-val');
  if(sl && document.activeElement!==sl) sl.value=z;
  if(vl) vl.textContent=z+'%';
}

// 슬라이더로 사진/영상 크기 조절 (20%~300%)
function setMediaZoom(v){
  var sc=S.scenes[curScene];
  if(!sc){ return; }
  if(!_mediaHasContent(curScene)){
    // 미디어가 없으면 안내
    var vl=document.getElementById('media-size-val'); if(vl) vl.textContent='—';
    return;
  }
  sc.mediaZoom=Math.max(0.2,Math.min(3.0,(parseFloat(v)||100)/100));
  drawScene(curScene,1); _updateZoomBadge();
}

function onCanvasMouseDown(e){
  if(_blkSelected) return; // 텍스트 블록 선택 중이면 무시
  if(!_mediaHasContent(curScene)) return;
  _mediaDragging=true;
  _mediaDragStartX=e.clientX; _mediaDragStartY=e.clientY;
  var sc=S.scenes[curScene]||{};
  _mediaDragBaseOx=sc.mediaOffsetX||0; _mediaDragBaseOy=sc.mediaOffsetY||0;
  var c=document.getElementById('pv');
  if(c) c.style.cursor='grabbing';
  e.preventDefault();
}
function onCanvasMouseMove(e){
  if(!_mediaDragging) return;
  var sc=S.scenes[curScene]; if(!sc) return;
  var canvas=document.getElementById('pv');
  var ratio=canvas?((canvas.width||1080)/Math.max(1,canvas.clientWidth)):1;
  sc.mediaOffsetX=_mediaDragBaseOx+(e.clientX-_mediaDragStartX)*ratio;
  sc.mediaOffsetY=_mediaDragBaseOy+(e.clientY-_mediaDragStartY)*ratio;
  drawScene(curScene,1); _updateZoomBadge();
  e.preventDefault();
}
function onCanvasMouseUp(){
  if(_mediaDragging){ _mediaDragging=false; var c=document.getElementById('pv'); if(c) c.style.cursor='grab'; }
  _mediaTouching=false;
}
function onCanvasTouchStart(e){
  if(e.touches.length===1&&!_blkSelected&&_mediaHasContent(curScene)){
    _mediaDragging=true;
    _mediaDragStartX=e.touches[0].clientX; _mediaDragStartY=e.touches[0].clientY;
    var sc=S.scenes[curScene]||{}; _mediaDragBaseOx=sc.mediaOffsetX||0; _mediaDragBaseOy=sc.mediaOffsetY||0;
  } else if(e.touches.length===2){
    _mediaDragging=false; _mediaTouching=true;
    var t0=e.touches[0],t1=e.touches[1];
    _mediaDragStartX=(t0.clientX+t1.clientX)/2; _mediaDragStartY=(t0.clientY+t1.clientY)/2;
    var dx=t0.clientX-t1.clientX,dy=t0.clientY-t1.clientY;
    _mediaTouchDist0=Math.max(1,Math.sqrt(dx*dx+dy*dy));
    var sc=S.scenes[curScene]||{}; _mediaTouchZoom0=sc.mediaZoom||1.0;
    _mediaDragBaseOx=sc.mediaOffsetX||0; _mediaDragBaseOy=sc.mediaOffsetY||0;
  }
}
function onCanvasTouchMove(e){
  var sc=S.scenes[curScene]; if(!sc) return;
  var canvas=document.getElementById('pv');
  var ratio=canvas?((canvas.width||1080)/Math.max(1,canvas.clientWidth)):1;
  if(e.touches.length===2&&_mediaTouching){
    var t0=e.touches[0],t1=e.touches[1];
    var dx=t0.clientX-t1.clientX,dy=t0.clientY-t1.clientY;
    var dist=Math.max(1,Math.sqrt(dx*dx+dy*dy));
    sc.mediaZoom=Math.max(0.2,Math.min(3.0,Math.round(_mediaTouchZoom0*(dist/_mediaTouchDist0)*100)/100));
    sc.mediaOffsetX=_mediaDragBaseOx+((t0.clientX+t1.clientX)/2-_mediaDragStartX)*ratio;
    sc.mediaOffsetY=_mediaDragBaseOy+((t0.clientY+t1.clientY)/2-_mediaDragStartY)*ratio;
    drawScene(curScene,1); _updateZoomBadge(); e.preventDefault();
  } else if(e.touches.length===1&&_mediaDragging&&!_blkSelected){
    sc.mediaOffsetX=_mediaDragBaseOx+(e.touches[0].clientX-_mediaDragStartX)*ratio;
    sc.mediaOffsetY=_mediaDragBaseOy+(e.touches[0].clientY-_mediaDragStartY)*ratio;
    drawScene(curScene,1); _updateZoomBadge(); e.preventDefault();
  }
}
function onCanvasWheel(e){
  var sc=S.scenes[curScene];
  if(!sc||!_mediaHasContent(curScene)) return;
  e.preventDefault();
  var delta=e.deltaY>0?-0.05:0.05;
  sc.mediaZoom=Math.max(0.2,Math.min(3.0,Math.round(((sc.mediaZoom||1.0)+delta)*100)/100));
  drawScene(curScene,1); _updateZoomBadge();
}
function resetMediaTransform(){
  var sc=S.scenes[curScene];
  if(sc){ sc.mediaZoom=1.0; sc.mediaOffsetX=0; sc.mediaOffsetY=0; drawScene(curScene,1); _updateZoomBadge(); }
}

// ══════════════════════════════════════════════════════════════
// 텍스트 애니메이션 미리보기 (Vrew 스타일 인-플레이스 재생)
// ══════════════════════════════════════════════════════════════
var _animPreviewRaf=null;
function previewTextAnim(){
  if(_animPreviewRaf){ cancelAnimationFrame(_animPreviewRaf); _animPreviewRaf=null; }
  var start=null, dur=900;
  function frame(ts){
    if(!start) start=ts;
    var prog=Math.min(1,(ts-start)/dur);
    drawScene(curScene,prog);
    if(prog<1){ _animPreviewRaf=requestAnimationFrame(frame); }
    else { _animPreviewRaf=null; }
  }
  _animPreviewRaf=requestAnimationFrame(frame);
}

// ESC 키로 오버레이/모달 닫기 (클릭 불능 방지)
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'||e.keyCode===27){
    var overlay=document.getElementById('canvas-edit-overlay');
    if(overlay&&overlay.style.display!=='none') closeSceneTextEditor();
    var pm=document.getElementById('pexels-modal');
    if(pm&&pm.style.display==='block') closePexelsModal();
    // 인라인 편집 취소
    var inlineBar=document.getElementById('inline-edit-bar');
    if(inlineBar&&inlineBar.style.display!=='none') cancelInlineEdit();
    // render-modal 취소 (ESC는 취소 동작)
    var rm=document.getElementById('render-modal');
    if(rm&&rm.style.display!=='none') cancelMake();
    // done-modal 닫기
    var dm=document.getElementById('done-modal');
    if(dm&&dm.style.display!=='none') closeDoneModal();
  }
});
</script>
</body>
</html>`;

export default { videoMakerPage };
