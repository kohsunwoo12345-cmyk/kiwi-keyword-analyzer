// SUPERPLACE 퍼널·랜딩 성과분석 로직 — 원본(src/index.tsx)에서 그대로 이식.
// 스키마를 introspection 해 컬럼을 동적 매핑하므로 우리 D1 funnel_* 테이블에서도 동작한다.
// c 는 { env:{DB}, req:{url,query,json}, json } 형태의 shim 을 넘겨 사용한다.
/* eslint-disable */
function spFlaNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function spFlaFirst(c, sql, binds = []) {
  try {
    const stmt = c.env.DB.prepare(sql);
    return await (binds.length ? stmt.bind(...binds) : stmt).first();
  } catch (error) {
    console.warn('[funnel-landing-analytics] first skipped:', error && error.message ? error.message : error);
    return null;
  }
}

async function spFlaAll(c, sql, binds = []) {
  try {
    const stmt = c.env.DB.prepare(sql);
    const result = await (binds.length ? stmt.bind(...binds) : stmt).all();
    return result && result.results ? result.results : [];
  } catch (error) {
    console.warn('[funnel-landing-analytics] all skipped:', error && error.message ? error.message : error);
    return [];
  }
}

async function spFlaRun(c, sql, binds = []) {
  const stmt = c.env.DB.prepare(sql);
  return await (binds.length ? stmt.bind(...binds) : stmt).run();
}

async function spFlaRunQuiet(c, sql, binds = []) {
  try { return await spFlaRun(c, sql, binds); } catch (_) { return null; }
}

async function spFlaColumns(c, tableName) {
  try {
    const result = await c.env.DB.prepare('PRAGMA table_info(' + tableName + ')').all();
    return (result && result.results ? result.results : []).map((row) => String(row.name || '')).filter(Boolean);
  } catch (_) {
    return [];
  }
}

function spFlaPick(columns, names) {
  const lower = new Map(columns.map((column) => [String(column).toLowerCase(), column]));
  for (const name of names) {
    const found = lower.get(String(name).toLowerCase());
    if (found) return found;
  }
  return '';
}

function spFlaQ(identifier) {
  return '"' + String(identifier).replace(/"/g, '""') + '"';
}

function spFlaValue(row, names, fallback = '') {
  const safe = row || {};
  const lower = new Map(Object.keys(safe).map((key) => [String(key).toLowerCase(), safe[key]]));
  for (const name of names) {
    if (safe[name] !== undefined && safe[name] !== null && safe[name] !== '') return safe[name];
    const value = lower.get(String(name).toLowerCase());
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}

function spFlaDateRange(c) {
  const period = String(c.req.query('period') || '30d');
  const customStart = String(c.req.query('start') || '').slice(0, 10);
  const customEnd = String(c.req.query('end') || '').slice(0, 10);
  const now = new Date();
  const fmt = (d) => d.toISOString().slice(0, 10);
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  if (period === 'all') return { start: '', end: '', label: '전체 기간' };
  if (period === 'custom' && customStart && customEnd) return { start: customStart, end: customEnd, label: customStart + ' ~ ' + customEnd };
  if (period === 'month') return { start: fmt(startOfMonth), end: fmt(now), label: '이번 달' };
  const days = period === '7d' ? 7 : (period === '90d' ? 90 : 30);
  const start = new Date(now.getTime() - (days - 1) * 86400000);
  return { start: fmt(start), end: fmt(now), label: '최근 ' + days + '일' };
}

function spFlaApplyDate(where, binds, column, range) {
  if (!column || !range || !range.start || !range.end) return;
  where.push('date(' + spFlaQ(column) + ') >= date(?)');
  binds.push(range.start);
  where.push('date(' + spFlaQ(column) + ') <= date(?)');
  binds.push(range.end);
}

async function spFlaMapById(c, tableName) {
  const columns = await spFlaColumns(c, tableName);
  if (!columns.length) return new Map();
  const idColumn = spFlaPick(columns, ['id']);
  if (!idColumn) return new Map();
  const rows = await spFlaAll(c, 'SELECT * FROM ' + tableName + ' LIMIT 5000');
  const map = new Map();
  for (const row of rows) map.set(String(row[idColumn]), row);
  return map;
}

async function spFlaLoadPages(c, range, funnelFilter) {
  const groupMap = await spFlaMapById(c, 'funnel_groups');
  const funnelMap = await spFlaMapById(c, 'funnels');
  const userMap = await spFlaMapById(c, 'users');
  const pageTables = ['funnel_landing_pages'];
  const pages = [];
  const seen = new Set();
  for (const table of pageTables) {
    const columns = await spFlaColumns(c, table);
    if (!columns.length) continue;
    const idColumn = spFlaPick(columns, ['id', 'page_id', 'landing_page_id']);
    const titleColumn = spFlaPick(columns, ['title', 'name', 'page_title']);
    const slugColumn = spFlaPick(columns, ['slug', 'page_slug', 'landing_slug']);
    const groupColumn = spFlaPick(columns, ['group_id', 'funnel_group_id', 'node_id']);
    const funnelColumn = spFlaPick(columns, ['funnel_id']);
    const userColumn = spFlaPick(columns, ['user_id', 'owner_id', 'academy_id']);
    const statusColumn = spFlaPick(columns, ['status', 'state']);
    const createdColumn = spFlaPick(columns, ['created_at', 'createdAt', 'updated_at']);
    const viewColumn = spFlaPick(columns, ['view_count', 'views', 'visitor_count', 'visit_count', 'page_views', 'total_views']);
    if (!idColumn) continue;
    const orderColumn = createdColumn || idColumn;
    const rows = await spFlaAll(c, 'SELECT * FROM ' + table + ' ORDER BY ' + spFlaQ(orderColumn) + ' DESC LIMIT 700');
    for (const row of rows) {
      const id = spFlaValue(row, [idColumn], '');
      const slug = slugColumn ? String(row[slugColumn] || '') : '';
      const key = slug ? 'slug:' + slug : table + ':' + id;
      if (seen.has(key)) continue;
      seen.add(key);
      const groupId = groupColumn ? spFlaValue(row, [groupColumn], '') : '';
      const group = groupMap.get(String(groupId));
      const funnelId = (funnelColumn ? spFlaValue(row, [funnelColumn], '') : '') || spFlaValue(group, ['funnel_id'], '');
      if (!funnelId) continue;
      if (funnelFilter && String(funnelId) !== String(funnelFilter)) continue;
      const funnel = funnelMap.get(String(funnelId));
      const userId = (userColumn ? spFlaValue(row, [userColumn], '') : '') || spFlaValue(funnel, ['user_id', 'owner_id'], '') || spFlaValue(group, ['user_id'], '');
      const user = userMap.get(String(userId));
      pages.push({
        table,
        id,
        slug,
        title: (titleColumn ? spFlaValue(row, [titleColumn], '') : '') || '제목 없음',
        status: statusColumn ? spFlaValue(row, [statusColumn], 'active') : 'active',
        groupId,
        groupName: spFlaValue(group, ['name', 'group_name'], groupId ? '그룹 #' + groupId : '-'),
        funnelId,
        funnelName: spFlaValue(funnel, ['name', 'title', 'funnel_name'], funnelId ? '퍼널 #' + funnelId : '-'),
        ownerId: userId,
        ownerName: spFlaValue(user, ['academy_name', 'academyName', 'business_name', 'name', 'email'], ''),
        directViews: spFlaNum(viewColumn ? row[viewColumn] : 0, 0),
        createdAt: createdColumn ? spFlaValue(row, [createdColumn], '') : '',
        publicUrl: slug ? '/f/' + slug : ''
      });
    }
  }
  return { pages, groupMap, funnelMap, userMap };
}

async function spFlaCountMap(c, table, keyColumn, keys, dateColumn, range, extraWhere = '') {
  const map = new Map();
  const clean = Array.from(new Set(keys.map((key) => String(key || '')).filter(Boolean)));
  if (!clean.length || !keyColumn) return map;
  for (let i = 0; i < clean.length; i += 80) {
    const chunk = clean.slice(i, i + 80);
    const where = [spFlaQ(keyColumn) + ' IN (' + chunk.map(() => '?').join(',') + ')'];
    const binds = chunk.slice();
    spFlaApplyDate(where, binds, dateColumn, range);
    if (extraWhere) where.push(extraWhere);
    const rows = await spFlaAll(c, 'SELECT ' + spFlaQ(keyColumn) + ' as k, COUNT(*) as count FROM ' + table + ' WHERE ' + where.join(' AND ') + ' GROUP BY ' + spFlaQ(keyColumn), binds);
    for (const row of rows) map.set(String(row.k), spFlaNum(row.count, 0));
  }
  return map;
}

function spFlaAddCandidate(page, name, value) {
  if (!page._candidates) page._candidates = {};
  if (!page._candidates[name]) page._candidates[name] = [];
  page._candidates[name].push(spFlaNum(value, 0));
}

async function spFlaAttachViews(c, pages, range) {
  for (const page of pages) spFlaAddCandidate(page, 'views', page.directViews || 0);
  const tables = ['landing_page_views', 'funnel_page_views', 'page_views', 'landing_views', 'analytics_events'];
  for (const table of tables) {
    const columns = await spFlaColumns(c, table);
    if (!columns.length) continue;
    const dateColumn = spFlaPick(columns, ['created_at', 'createdAt', 'visited_at', 'viewed_at', 'timestamp', 'event_time']);
    const typeColumn = spFlaPick(columns, ['event_type', 'type', 'action']);
    const extra = typeColumn ? "LOWER(" + spFlaQ(typeColumn) + ") IN ('page_view','view','landing_view','visit')" : '';
    const landingColumn = spFlaPick(columns, ['landing_page_id', 'page_id']);
    if (landingColumn) {
      const map = await spFlaCountMap(c, table, landingColumn, pages.map((p) => p.id), dateColumn, range, extra);
      for (const page of pages) spFlaAddCandidate(page, 'views', map.get(String(page.id)) || 0);
    }
    const slugColumn = spFlaPick(columns, ['slug', 'page_slug', 'landing_slug']);
    if (slugColumn) {
      const map = await spFlaCountMap(c, table, slugColumn, pages.map((p) => p.slug), dateColumn, range, extra);
      for (const page of pages) spFlaAddCandidate(page, 'views', map.get(String(page.slug)) || 0);
    }
  }
  for (const page of pages) page.views = Math.max.apply(null, (page._candidates && page._candidates.views) || [0]);
}

async function spFlaAttachApplicants(c, pages, range) {
  const tables = ['funnel_applicants', 'landing_applicants', 'funnel_leads', 'landing_form_submissions', 'form_submissions'];
  for (const table of tables) {
    const columns = await spFlaColumns(c, table);
    if (!columns.length) continue;
    const dateColumn = spFlaPick(columns, ['created_at', 'createdAt', 'submitted_at', 'submission_date']);
    const landingColumn = spFlaPick(columns, ['landing_page_id', 'page_id']);
    if (landingColumn) {
      const map = await spFlaCountMap(c, table, landingColumn, pages.map((p) => p.id), dateColumn, range);
      for (const page of pages) spFlaAddCandidate(page, 'applicants', map.get(String(page.id)) || 0);
    }
    const groupColumn = spFlaPick(columns, ['group_id', 'funnel_group_id', 'node_id']);
    if (groupColumn) {
      const map = await spFlaCountMap(c, table, groupColumn, pages.map((p) => p.groupId), dateColumn, range);
      for (const page of pages) spFlaAddCandidate(page, 'applicants', map.get(String(page.groupId)) || 0);
    }
    const funnelColumn = spFlaPick(columns, ['funnel_id']);
    if (funnelColumn) {
      const map = await spFlaCountMap(c, table, funnelColumn, pages.map((p) => p.funnelId), dateColumn, range);
      for (const page of pages) spFlaAddCandidate(page, 'applicants', map.get(String(page.funnelId)) || 0);
    }
  }
  for (const page of pages) page.applicants = Math.max.apply(null, (page._candidates && page._candidates.applicants) || [0]);
}

function spFlaNormalizeSource(value) {
  let raw = String(value || '').trim();
  if (!raw) return '\uc9c1\uc811/\uc54c \uc218 \uc5c6\uc74c';
  try {
    if (/^https?:\/\//i.test(raw)) {
      const url = new URL(raw);
      raw = url.searchParams.get('utm_source') || url.searchParams.get('source') || url.hostname.replace(/^www\./, '');
      if (url.searchParams.get('gclid')) raw = 'google';
      else if (url.searchParams.get('fbclid')) raw = 'facebook';
      else if (url.searchParams.get('igshid')) raw = 'instagram';
      else if (url.searchParams.get('n_media') || url.searchParams.get('n_query')) raw = 'naver';
      else if (url.searchParams.get('kakao_ad') || url.searchParams.get('kakao')) raw = 'kakao';
      else if (url.searchParams.get('daangn') || url.searchParams.get('karrot')) raw = 'danggeun';
    }
  } catch (_) {}
  const lower = raw.toLowerCase();
  if (lower.includes('naver') || lower.includes('n_media') || lower.includes('n_query') || lower === 'n') return '\ub124\uc774\ubc84';
  if (lower.includes('facebook') || lower.includes('fb.') || lower.includes('fbclid') || lower.includes('meta')) return '\ud398\uc774\uc2a4\ubd81';
  if (lower.includes('instagram') || lower.includes('ig.') || lower.includes('igshid') || lower.includes('insta')) return '\uc778\uc2a4\ud0c0\uadf8\ub7a8';
  if (lower.includes('daangn') || lower.includes('danggeun') || lower.includes('karrot') || lower.includes('\ub2f9\uadfc')) return '\ub2f9\uadfc';
  if (lower.includes('kakao') || lower.includes('kakaotalk') || lower.includes('pf.kakao') || lower.includes('talk') || lower.includes('daum')) return '\uce74\uce74\uc624\ud1a1';
  if (lower.includes('google') || lower.includes('gclid')) return '\uad6c\uae00';
  if (lower.includes('youtube') || lower.includes('youtu.be')) return '\uc720\ud29c\ube0c';
  if (lower.includes('sms') || lower.includes('lms') || lower.includes('mms') || lower.includes('\ubb38\uc790')) return '\ubb38\uc790';
  if (lower.includes('direct') || lower.includes('\uc9c1\uc811')) return '\uc9c1\uc811/\uc54c \uc218 \uc5c6\uc74c';
  return raw.slice(0, 44);
}

async function spFlaTrafficCandidateTables(c) {
  const rows = await spFlaAll(c, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  const existing = new Set(rows.map((row) => String(row.name || '')).filter(Boolean));
  const preferred = [
    'landing_traffic', 'landing_page_traffic', 'landing_traffic_logs', 'landing_page_views',
    'funnel_landing_traffic', 'funnel_landing_views', 'funnel_page_views', 'page_views',
    'analytics_events', 'traffic_events', 'visitor_events', 'visit_logs', 'click_logs',
    'funnel_applicants', 'landing_applicants', 'funnel_leads', 'landing_form_submissions',
    'form_submissions'
  ];
  const tableNames = [];
  for (const name of preferred) if (existing.has(name)) tableNames.push(name);
  for (const name of existing) {
    if (tableNames.includes(name)) continue;
    if (/(traffic|visit|visitor|view|analytics|event|click|utm|referrer|referer|applicant|submission|lead|funnel)/i.test(name)) tableNames.push(name);
  }
  return tableNames.slice(0, 32);
}

function spFlaNormKey(value) {
  return String(value || '').toLowerCase().replace(/[\s_\-.()[\]]/g, '');
}

function spFlaMaybeJson(value) {
  if (!value || typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || !/^\{|^\[/.test(text)) return null;
  try { return JSON.parse(text); } catch (_) { return null; }
}

function spFlaTrafficExtract(row) {
  const data = {};
  const wanted = {
    utmsource: 'source', source: 'source', trafficsource: 'source', channel: 'source', origin: 'source', from: 'source',
    utmmedium: 'medium', medium: 'medium', mediatype: 'medium',
    utmcampaign: 'campaign', campaign: 'campaign', campaignname: 'campaign', adcampaign: 'campaign',
    utmcontent: 'content', content: 'content', adcontent: 'content', creative: 'content',
    utmterm: 'term', term: 'term', keyword: 'term', query: 'term', searchterm: 'term',
    referrer: 'referrer', referer: 'referrer', documentreferrer: 'referrer', ref: 'referrer',
    url: 'url', href: 'url', pageurl: 'url', fullurl: 'url', currenturl: 'url', landingurl: 'url', requesturl: 'url',
    path: 'path', pathname: 'path', pagepath: 'path', route: 'path',
    slug: 'slug', pageslug: 'slug', landingslug: 'slug', landingpageslug: 'slug',
    landingpageid: 'landing_page_id', pageid: 'landing_page_id', landingid: 'landing_page_id',
    groupid: 'group_id', funnelgroupid: 'group_id', nodeid: 'group_id',
    funnelid: 'funnel_id', eventtype: 'event_type', type: 'event_type', action: 'event_type'
  };
  const assign = (key, value) => {
    if (value === undefined || value === null || value === '') return;
    const normalized = spFlaNormKey(key);
    const target = wanted[normalized];
    if (target && !data[target]) data[target] = String(value);
    if (!data.url && typeof value === 'string' && /^https?:\/\//i.test(value)) data.url = value;
  };
  const visit = (value, depth) => {
    if (!value || depth > 3) return;
    if (typeof value === 'string') {
      const parsed = spFlaMaybeJson(value);
      if (parsed) visit(parsed, depth + 1);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value.slice(0, 12)) visit(item, depth + 1);
      return;
    }
    if (typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      assign(key, item);
      if (item && typeof item === 'object') visit(item, depth + 1);
      else if (typeof item === 'string') {
        const parsed = spFlaMaybeJson(item);
        if (parsed) visit(parsed, depth + 1);
      }
    }
  };
  visit(row || {}, 0);
  return data;
}

function spFlaUrlInfo(rawUrl) {
  const text = String(rawUrl || '').trim();
  if (!text) return {};
  try {
    const url = new URL(text, 'https://superplace.local');
    return {
      href: url.href,
      hostname: url.hostname.replace(/^www\./, ''),
      path: url.pathname || '',
      source: url.searchParams.get('utm_source') || url.searchParams.get('source') || '',
      medium: url.searchParams.get('utm_medium') || url.searchParams.get('medium') || '',
      campaign: url.searchParams.get('utm_campaign') || url.searchParams.get('campaign') || '',
      content: url.searchParams.get('utm_content') || '',
      term: url.searchParams.get('utm_term') || url.searchParams.get('keyword') || '',
      click: url.searchParams.get('gclid') ? 'google' : (url.searchParams.get('fbclid') ? 'facebook' : (url.searchParams.get('igshid') ? 'instagram' : (url.searchParams.get('n_media') || url.searchParams.get('n_query') ? 'naver' : (url.searchParams.get('kakao_ad') || url.searchParams.get('kakao') ? 'kakao' : (url.searchParams.get('daangn') || url.searchParams.get('karrot') ? 'danggeun' : '')))))
    };
  } catch (_) {
    return { path: text };
  }
}

function spFlaBuildTrafficLabel(fields) {
  const urlInfo = spFlaUrlInfo(fields.url || fields.path || '');
  const refInfo = spFlaUrlInfo(fields.referrer || '');
  let source = fields.source || urlInfo.source || urlInfo.click || '';
  if (!source && fields.referrer) source = refInfo.hostname || fields.referrer;
  if (!source && urlInfo.hostname && urlInfo.hostname !== 'superplace.local') source = urlInfo.hostname;
  const normalized = spFlaNormalizeSource(source || '직접/알 수 없음');
  const medium = fields.medium || urlInfo.medium || '';
  const campaign = fields.campaign || urlInfo.campaign || '';
  const term = fields.term || urlInfo.term || '';
  const pieces = [normalized];
  if (medium && !pieces.includes(medium)) pieces.push(medium.slice(0, 24));
  if (campaign && !pieces.includes(campaign)) pieces.push(campaign.slice(0, 32));
  if (term && pieces.length < 4) pieces.push(term.slice(0, 28));
  return { source: pieces.filter(Boolean).join(' / '), medium, campaign, term, referrer: fields.referrer || '', url: fields.url || fields.path || '' };
}

function spFlaMatchTrafficPages(fields, pages) {
  const exact = new Set();
  const landingId = String(fields.landing_page_id || '');
  const slug = String(fields.slug || '');
  const pathInfo = spFlaUrlInfo(fields.url || fields.path || '');
  const haystack = decodeURIComponent(String((fields.url || '') + ' ' + (fields.path || '') + ' ' + (pathInfo.path || '')).toLowerCase());
  for (const page of pages) {
    if (landingId && String(page.id || '') === landingId) exact.add(page);
    if (slug && String(page.slug || '') === slug) exact.add(page);
    const pageSlug = String(page.slug || '').toLowerCase();
    if (pageSlug && (haystack.includes('/' + pageSlug) || haystack.includes('slug=' + pageSlug) || haystack.includes(pageSlug))) exact.add(page);
  }
  if (exact.size) return Array.from(exact);
  const groupId = String(fields.group_id || '');
  if (groupId) {
    const groupMatches = pages.filter((page) => String(page.groupId || '') === groupId);
    if (groupMatches.length) return groupMatches;
  }
  const funnelId = String(fields.funnel_id || '');
  if (funnelId) return pages.filter((page) => String(page.funnelId || '') === funnelId);
  return [];
}

async function spFlaTrafficSources(c, pages, range) {
  const sourceCounts = new Map();
  const applicantCounts = new Map();
  const detailMap = new Map();
  const pageSource = new Map();
  const tables = await spFlaTrafficCandidateTables(c);

  for (const table of tables) {
    const columns = await spFlaColumns(c, table);
    if (!columns.length) continue;
    const dateColumn = spFlaPick(columns, ['created_at', 'createdAt', 'visited_at', 'viewed_at', 'submitted_at', 'sent_at', 'timestamp', 'event_time']);
    const where = [];
    const binds = [];
    spFlaApplyDate(where, binds, dateColumn, range);
    const sql = 'SELECT * FROM ' + table + (where.length ? ' WHERE ' + where.join(' AND ') : '') + ' ORDER BY ' + spFlaQ(dateColumn || spFlaPick(columns, ['id']) || columns[0]) + ' DESC LIMIT 8000';
    const rows = await spFlaAll(c, sql, binds);
    for (const row of rows) {
      const fields = spFlaTrafficExtract(row);
      const eventType = String(fields.event_type || '').toLowerCase();
      if (/(login|admin|auth|session|password|sms|message)/.test(eventType) && !/(submit|apply|applicant|lead|view|visit|click|page)/.test(eventType)) continue;
      const matchedPages = spFlaMatchTrafficPages(fields, pages);
      if (!matchedPages.length) continue;
      const labelInfo = spFlaBuildTrafficLabel(fields);
      const label = labelInfo.source || '직접/알 수 없음';
      const isApplicant = /(submission|applicant|lead|form)/i.test(table) || /(submit|apply|applicant|lead|complete|conversion)/i.test(eventType);
      const detail = detailMap.get(label) || { source: label, medium: labelInfo.medium || '', campaign: labelInfo.campaign || '', term: labelInfo.term || '', referrer: labelInfo.referrer || '', url: labelInfo.url || '', count: 0, applicants: 0, share: 0 };
      detail.count += matchedPages.length;
      if (isApplicant) detail.applicants += matchedPages.length;
      if (!detail.referrer && labelInfo.referrer) detail.referrer = labelInfo.referrer;
      if (!detail.url && labelInfo.url) detail.url = labelInfo.url;
      detailMap.set(label, detail);
      sourceCounts.set(label, (sourceCounts.get(label) || 0) + matchedPages.length);
      if (isApplicant) applicantCounts.set(label, (applicantCounts.get(label) || 0) + matchedPages.length);
      for (const page of matchedPages) {
        const map = pageSource.get(page.id) || new Map();
        const item = map.get(label) || { source: label, medium: labelInfo.medium || '', campaign: labelInfo.campaign || '', term: labelInfo.term || '', referrer: labelInfo.referrer || '', url: labelInfo.url || '', count: 0, applicants: 0, share: 0 };
        item.count += 1;
        if (isApplicant) item.applicants += 1;
        if (!item.referrer && labelInfo.referrer) item.referrer = labelInfo.referrer;
        if (!item.url && labelInfo.url) item.url = labelInfo.url;
        map.set(label, item);
        pageSource.set(page.id, map);
      }
    }
  }

  const total = Array.from(sourceCounts.values()).reduce((a, b) => a + b, 0) || 1;
  for (const page of pages) {
    const map = pageSource.get(page.id);
    if (!map || !map.size) {
      page.topSource = '직접/알 수 없음';
      page.sources = [];
    } else {
      const entries = Array.from(map.values()).sort((a, b) => b.count - a.count);
      const pageTotal = entries.reduce((sum, item) => sum + spFlaNum(item.count, 0), 0) || 1;
      page.topSource = entries[0].source;
      page.sources = entries.slice(0, 12).map((item) => ({ ...item, share: spFlaNum(item.count, 0) / pageTotal * 100 }));
    }
  }

  return Array.from(detailMap.values()).sort((a, b) => b.count - a.count).slice(0, 20).map((item) => ({
    ...item,
    applicants: applicantCounts.get(item.source) || item.applicants || 0,
    share: spFlaNum(item.count, 0) / total * 100
  }));
}

function spFlaCta(page) {
  const views = spFlaNum(page.views, 0);
  const applicants = spFlaNum(page.applicants, 0);
  const conv = views ? applicants / views * 100 : 0;
  if (!views) return '링크 유입부터 확보하세요';
  if (conv < 2) return '혜택/마감 CTA를 상단에 배치';
  if (conv < 5) return '후기와 상담 CTA를 보강';
  if (applicants >= 30) return 'DB 대상 리마인드 문자 발송';
  return '현재 CTA 유지, 유입 확대';
}

function spFlaRecommendations(summary, pages, sources) {
  const recs = [];
  const best = sources[0];
  if (best) recs.push({ type: 'good', title: '강한 유입 경로 집중', body: best.source + ' 유입이 가장 많습니다. 해당 채널의 광고 문구와 랜딩 CTA를 같은 메시지로 맞추세요.' });
  const weak = pages.filter((p) => spFlaNum(p.views, 0) >= 20 && spFlaNum(p.conversionRate, 0) < 3).slice(0, 3);
  if (weak.length) recs.push({ type: 'warn', title: '조회수 대비 신청률 개선 필요', body: weak.map((p) => p.title).join(', ') + ' 페이지는 조회가 있지만 신청 전환이 낮습니다. 첫 화면의 혜택, 가격, 상담 버튼을 더 직접적으로 보여주세요.' });
  if (spFlaNum(summary.sentSms, 0) + spFlaNum(summary.sentLms, 0) > 0) recs.push({ type: '', title: '광고 문자 발송 기준', body: '실제 발송 기준 SMS ' + spFlaNum(summary.sentSms, 0).toLocaleString('ko-KR') + '건, LMS ' + spFlaNum(summary.sentLms, 0).toLocaleString('ko-KR') + '건이며 총 문자 비용은 ' + spFlaNum(summary.messageCost, 0).toLocaleString('ko-KR') + '원입니다.' });
  if (!recs.length) recs.push({ type: 'warn', title: '분석 데이터 확보 필요', body: '랜딩 링크에 UTM 또는 채널명을 붙이고 광고를 집행하면 유입 경로 분석 정확도가 올라갑니다.' });
  return recs;
}


// real-sms-cost-v2
function spFlaMessageUnitCost(type) {
  const normalized = String(type || '').toUpperCase();
  return normalized.includes('LMS') || normalized.includes('LLM') || normalized.includes('MMS') || normalized.includes('LONG') ? 45 : 25;
}

function spFlaSentStatusWhere(columns) {
  const statusColumn = spFlaPick(columns, ['status', 'send_status', 'result_status']);
  const sentColumn = spFlaPick(columns, ['sent_at', 'sentAt', 'delivered_at', 'completed_at']);
  const clauses = [];
  if (statusColumn) clauses.push("LOWER(COALESCE(" + spFlaQ(statusColumn) + ", '')) IN ('sent','success','succeeded','delivered','complete','completed','ok')");
  if (sentColumn) clauses.push("COALESCE(" + spFlaQ(sentColumn) + ", '') <> ''");
  return clauses.length ? '(' + clauses.join(' OR ') + ')' : '';
}

function spFlaNotExcelWhere(columns) {
  const candidates = ['source', 'send_source', 'origin', 'trigger', 'import_source', 'upload_source', 'batch_type', 'file_name', 'memo', 'note'];
  const clauses = [];
  for (const name of candidates) {
    const column = spFlaPick(columns, [name]);
    if (!column) continue;
    const expr = "LOWER(COALESCE(" + spFlaQ(column) + ", ''))";
    clauses.push(expr + " NOT LIKE '%excel%'");
    clauses.push(expr + " NOT LIKE '%xlsx%'");
    clauses.push(expr + " NOT LIKE '%xls%'");
    clauses.push(expr + " NOT LIKE '%csv%'");
    clauses.push(expr + " NOT LIKE '%import%'");
    clauses.push(expr + " NOT LIKE '%upload%'");
  }
  return clauses;
}

async function spFlaAttachSentSms(c, pages, range) {
  for (const page of pages) {
    page.smsSent = 0;
    page.lmsSent = 0;
    page.smsCost = 0;
    page.lmsCost = 0;
    page.messageCost = 0;
  }
  if (!pages.length) return;

  const pageLookup = new Map();
  const addLookup = (type, value, page) => {
    const key = String(value || '');
    if (!key) return;
    const mapKey = type + ':' + key;
    if (!pageLookup.has(mapKey)) pageLookup.set(mapKey, []);
    pageLookup.get(mapKey).push(page);
  };
  for (const page of pages) {
    addLookup('landing', page.id, page);
    addLookup('group', page.groupId, page);
    addLookup('funnel', page.funnelId, page);
  }

  const tables = ['funnel_sms_logs', 'sms_logs'];
  for (const table of tables) {
    const columns = await spFlaColumns(c, table);
    if (!columns.length) continue;

    const statusWhere = spFlaSentStatusWhere(columns);
    if (!statusWhere) continue;

    const dateColumn = spFlaPick(columns, ['sent_at', 'sentAt', 'delivered_at', 'completed_at', 'created_at', 'createdAt']);
    const msgColumn = spFlaPick(columns, ['msg_type', 'message_type', 'type', 'sms_type']);
    const costColumn = spFlaPick(columns, ['point_cost', 'cost', 'price', 'amount']);
    const landingKeyColumn = spFlaPick(columns, ['landing_page_id', 'page_id']);
    const groupKeyColumn = spFlaPick(columns, ['group_id', 'funnel_group_id']);
    const funnelKeyColumn = spFlaPick(columns, ['funnel_id']);
    const keyOptions = landingKeyColumn
      ? [{ type: 'landing', column: landingKeyColumn }]
      : (groupKeyColumn ? [{ type: 'group', column: groupKeyColumn }] : (funnelKeyColumn ? [{ type: 'funnel', column: funnelKeyColumn }] : []));
    if (!keyOptions.length) continue;

    const commonWhere = [statusWhere, ...spFlaNotExcelWhere(columns)];
    const commonBinds = [];
    spFlaApplyDate(commonWhere, commonBinds, dateColumn, range);

    for (const option of keyOptions) {
      const keys = Array.from(new Set(pages.map((page) => option.type === 'landing' ? page.id : (option.type === 'group' ? page.groupId : page.funnelId)).map((value) => String(value || '')).filter(Boolean)));
      for (let i = 0; i < keys.length; i += 80) {
        const chunk = keys.slice(i, i + 80);
        const where = [spFlaQ(option.column) + ' IN (' + chunk.map(() => '?').join(',') + ')', ...commonWhere];
        const binds = [...chunk, ...commonBinds];
        const selectCost = costColumn ? ', ' + spFlaQ(costColumn) + ' as cost' : ', NULL as cost';
        const selectType = msgColumn ? ', ' + spFlaQ(msgColumn) + ' as msg_type' : ", 'SMS' as msg_type";
        const rows = await spFlaAll(c, 'SELECT ' + spFlaQ(option.column) + ' as k' + selectType + selectCost + ' FROM ' + table + ' WHERE ' + where.join(' AND ') + ' LIMIT 5000', binds);
        for (const row of rows) {
          const matchedPages = pageLookup.get(option.type + ':' + String(row.k || '')) || [];
          for (const page of matchedPages) {
            const type = String(row.msg_type || 'SMS').toUpperCase().includes('L') || String(row.msg_type || '').toUpperCase().includes('MMS') ? 'LMS' : 'SMS';
            const unitCost = spFlaMessageUnitCost(type);
            const cost = unitCost;
            if (type === 'LMS') {
              page.lmsSent += 1;
              page.lmsCost += cost;
            } else {
              page.smsSent += 1;
              page.smsCost += cost;
            }
            page.messageCost += cost;
          }
        }
      }
    }
  }
}

async function spFlaAnalytics(c) {
  const range = spFlaDateRange(c);
  const funnelFilter = String(c.req.query('funnelId') || '').trim();
  const loaded = await spFlaLoadPages(c, range, funnelFilter);
  const pages = loaded.pages;
  await spFlaAttachViews(c, pages, range);
  await spFlaAttachApplicants(c, pages, range);
  await spFlaAttachSentSms(c, pages, range);
  const sources = await spFlaTrafficSources(c, pages, range);
  for (const page of pages) {
    page.conversionRate = page.views ? page.applicants / page.views * 100 : 0;
    page.smsSent = spFlaNum(page.smsSent, 0);
    page.lmsSent = spFlaNum(page.lmsSent, 0);
    page.smsCost = spFlaNum(page.smsCost, 0);
    page.lmsCost = spFlaNum(page.lmsCost, 0);
    page.messageCost = spFlaNum(page.messageCost, 0);
    page.cta = spFlaCta(page);
    delete page._candidates;
  }
  pages.sort((a, b) => (spFlaNum(b.views, 0) + spFlaNum(b.applicants, 0) * 5) - (spFlaNum(a.views, 0) + spFlaNum(a.applicants, 0) * 5));
  const views = pages.reduce((sum, page) => sum + spFlaNum(page.views, 0), 0);
  const applicants = pages.reduce((sum, page) => sum + spFlaNum(page.applicants, 0), 0);
  const sentSms = pages.reduce((sum, page) => sum + spFlaNum(page.smsSent, 0), 0);
  const sentLms = pages.reduce((sum, page) => sum + spFlaNum(page.lmsSent, 0), 0);
  const smsCost = pages.reduce((sum, page) => sum + spFlaNum(page.smsCost, 0), 0);
  const lmsCost = pages.reduce((sum, page) => sum + spFlaNum(page.lmsCost, 0), 0);
  const messageCost = smsCost + lmsCost;
  const summary = {
    views,
    applicants,
    conversionRate: views ? applicants / views * 100 : 0,
    pageCount: pages.length,
    sourceCount: sources.length,
    sentSms,
    sentLms,
    smsCost,
    lmsCost,
    messageCost
  };
  const funnelMap = new Map();
  for (const page of pages) if (page.funnelId) funnelMap.set(String(page.funnelId), { id: page.funnelId, name: page.funnelName || '퍼널 #' + page.funnelId });
  return { success: true, periodLabel: range.label, range, summary, pages, sources, funnels: Array.from(funnelMap.values()), recommendations: spFlaRecommendations(summary, pages, sources) };
}

function spFlaToken() {
  try { return crypto.randomUUID().replace(/-/g, ''); } catch (_) { return String(Date.now()) + Math.random().toString(16).slice(2); }
}

function spFlaEscape(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(ch) {
    if (ch === '&') return '&amp;';
    if (ch === '<') return '&lt;';
    if (ch === '>') return '&gt;';
    if (ch === '"') return '&quot;';
    return '&#39;';
  });
}

function spFlaSharedHtml(report) {
  // shared-report-detail-v2
  const summary = report && report.summary ? report.summary : {};
  const pages = Array.isArray(report && report.pages) ? report.pages.slice(0, 80) : [];
  const sources = Array.isArray(report && report.sources) ? report.sources.slice(0, 12) : [];
  const recommendations = Array.isArray(report && report.recommendations) ? report.recommendations.slice(0, 5) : [];
  const money = (value) => '₩' + spFlaNum(value).toLocaleString('ko-KR');
  const pct = (value) => spFlaNum(value).toFixed(1) + '%';
  const sourceList = (items) => {
    const safeItems = Array.isArray(items) ? items.slice(0, 8) : [];
    if (!safeItems.length) return '<div class="empty-box">유입 경로 데이터 없음</div>';
    return '<div class="source-list">' + safeItems.map((item) => {
      const share = spFlaNum(item.share, 0);
      const width = Math.min(100, Math.max(4, share)).toFixed(1);
      const count = spFlaNum(item.count, 0).toLocaleString('ko-KR');
      const applicantText = spFlaNum(item.applicants, 0) > 0 ? ' · 신청 ' + spFlaNum(item.applicants, 0).toLocaleString('ko-KR') : '';
      return '<div class="source-row"><div><strong>' + spFlaEscape(item.source || '-') + '</strong><span>' + count + '회' + applicantText + '</span></div><em>' + share.toFixed(1) + '%</em><b style="width:' + width + '%"></b></div>';
    }).join('') + '</div>';
  };
  const recommendationCards = recommendations.length ? '<section class="panel"><h2>실행 제안</h2><div class="rec-grid">' + recommendations.map((rec) => '<article class="rec-card"><strong>' + spFlaEscape(rec.title || '-') + '</strong><p>' + spFlaEscape(rec.body || '') + '</p></article>').join('') + '</div></section>' : '';
  const sourcePanel = '<section class="panel"><h2>전체 유입 경로</h2>' + sourceList(sources) + '</section>';
  const landingCards = pages.length ? pages.map((p, index) => {
    const link = p.publicUrl ? '<a class="mini-link" href="' + spFlaEscape(p.publicUrl) + '" target="_blank" rel="noopener">랜딩 열기</a>' : '';
    return '<section class="landing-card"><div class="landing-head"><div><span class="rank">#' + (index + 1) + '</span><h2>' + spFlaEscape(p.title || '제목 없음') + '</h2><p>' + spFlaEscape(p.funnelName || '-') + ' · ' + spFlaEscape(p.groupName || '-') + '</p></div>' + link + '</div><div class="metric-grid"><div class="metric"><span>조회수</span><strong>' + spFlaNum(p.views).toLocaleString('ko-KR') + '</strong></div><div class="metric"><span>신청자</span><strong>' + spFlaNum(p.applicants).toLocaleString('ko-KR') + '</strong></div><div class="metric"><span>전환율</span><strong>' + pct(p.conversionRate) + '</strong></div><div class="metric"><span>주요 유입</span><strong>' + spFlaEscape(p.topSource || '-') + '</strong></div></div><div class="landing-grid"><div><h3>랜딩별 유입 경로</h3>' + sourceList(p.sources) + '</div><div><h3>CTA 및 문자 비용</h3><div class="cta-box"><span>추천 CTA</span><strong>' + spFlaEscape(p.cta || '-') + '</strong></div><div class="cost-grid"><div><span>실제 SMS 발송</span><strong>' + spFlaNum(p.smsSent).toLocaleString('ko-KR') + '건 / ' + money(p.smsCost) + '</strong></div><div><span>실제 LMS 발송</span><strong>' + spFlaNum(p.lmsSent).toLocaleString('ko-KR') + '건 / ' + money(p.lmsCost) + '</strong></div></div></div></div></section>';
  }).join('') : '<section class="panel"><div class="empty-box">분석할 랜딩페이지 데이터가 없습니다.</div></section>';
  return '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>퍼널 랜딩 유입 분석 공유</title><style>*{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Noto Sans KR,sans-serif;background:#f3f6fb;color:#172033}.wrap{max-width:1180px;margin:0 auto;padding:28px}.hero{background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#fff;border-radius:18px;padding:26px;margin-bottom:18px}.hero h1{margin:0 0 8px;font-size:28px}.hero p{margin:0;color:#dbeafe}.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:20px}.summary-card{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:15px}.summary-card span,.metric span,.cost-grid span,.cta-box span{display:block;font-size:12px;color:#64748b;font-weight:800}.summary-card span{color:#bfdbfe}.summary-card strong{display:block;margin-top:6px;font-size:26px}.panel,.landing-card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:18px;margin-bottom:16px;box-shadow:0 6px 20px rgba(15,23,42,.05)}.panel h2,.landing-card h2{margin:0;color:#111827}.rec-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}.rec-card{border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:13px}.rec-card p{margin:7px 0 0;color:#475569;line-height:1.55;font-size:13px}.landing-head{display:flex;gap:14px;justify-content:space-between;align-items:flex-start;margin-bottom:14px}.landing-head p{margin:7px 0 0;color:#64748b;font-size:13px}.rank{display:inline-flex;background:#dbeafe;color:#1d4ed8;border-radius:999px;padding:3px 9px;font-size:12px;font-weight:900;margin-bottom:7px}.mini-link{display:inline-flex;align-items:center;justify-content:center;white-space:nowrap;background:#2563eb;color:#fff;text-decoration:none;border-radius:10px;padding:8px 12px;font-size:13px;font-weight:800}.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}.metric{border:1px solid #e2e8f0;background:#f8fafc;border-radius:12px;padding:12px}.metric strong{display:block;margin-top:6px;font-size:18px;color:#0f172a}.landing-grid{display:grid;grid-template-columns:1.2fr .8fr;gap:14px}.landing-grid h3{font-size:14px;margin:0 0 10px;color:#334155}.source-list{display:flex;flex-direction:column;gap:8px}.source-row{position:relative;overflow:hidden;border:1px solid #e2e8f0;background:#fff;border-radius:12px;padding:10px 12px;display:flex;justify-content:space-between;gap:10px}.source-row strong{display:block;font-size:13px}.source-row span{display:block;font-size:12px;color:#64748b;margin-top:3px}.source-row em{font-style:normal;font-size:12px;font-weight:900;color:#2563eb}.source-row b{position:absolute;left:0;bottom:0;height:3px;background:linear-gradient(90deg,#2563eb,#0ea5e9)}.cta-box{background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:13px;margin-bottom:10px}.cta-box strong{display:block;margin-top:6px;color:#1d4ed8}.cost-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.cost-grid div{background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:12px}.cost-grid strong{display:block;margin-top:5px;color:#c2410c}.empty-box{border:1px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;color:#64748b;background:#f8fafc}@media(max-width:820px){.wrap{padding:16px}.summary-grid,.metric-grid{grid-template-columns:1fr 1fr}.landing-grid{grid-template-columns:1fr}.landing-head{display:block}.mini-link{margin-top:10px}}@media(max-width:520px){.summary-grid,.metric-grid,.cost-grid{grid-template-columns:1fr}.hero h1{font-size:23px}}</style></head><body><main class="wrap"><section class="hero"><h1>퍼널 랜딩 유입 분석 공유</h1><p>' + spFlaEscape(report.periodLabel || '') + '</p><div class="summary-grid"><div class="summary-card"><span>총 조회수</span><strong>' + spFlaNum(summary.views).toLocaleString('ko-KR') + '</strong></div><div class="summary-card"><span>총 신청자</span><strong>' + spFlaNum(summary.applicants).toLocaleString('ko-KR') + '</strong></div><div class="summary-card"><span>평균 전환율</span><strong>' + pct(summary.conversionRate) + '</strong></div><div class="summary-card"><span>문자 실제 비용</span><strong>' + money(spFlaNum(summary.messageCost, 0) || (spFlaNum(summary.smsCost, 0) + spFlaNum(summary.lmsCost, 0))) + '</strong></div></div></section>' + recommendationCards + sourcePanel + landingCards + '</main></body></html>';
}


export { spFlaAnalytics, spFlaRecommendations, spFlaToken, spFlaNum }
