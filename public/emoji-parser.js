/* BYGENCY 전역 이모지 → 고퀄 SVG(Twemoji) 자동 교체 (React 외 정적/함수 HTML용).
   표시(DOM 텍스트)만 이미지로 바꾸며, 입력창·코드·스크립트·[data-no-emoji] 등은 건드리지 않는다. */
(function () {
  if (window.__bgEmojiParser) return
  window.__bgEmojiParser = true
  var RE = /(\p{Extended_Pictographic})(️)?(‍\p{Extended_Pictographic}(️)?)*/gu
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, SELECT: 1, OPTION: 1, CODE: 1, PRE: 1, NOSCRIPT: 1, SVG: 1, CANVAS: 1, VIDEO: 1 }
  function fn(e) {
    return Array.from(e).map(function (c) { return c.codePointAt(0) }).filter(function (c) { return c !== 0xfe0f }).map(function (c) { return c.toString(16) }).join('-')
  }
  function skip(el) {
    for (var n = el; n; n = n.parentElement) {
      if (SKIP[n.tagName]) return true
      if (n.isContentEditable) return true
      if (n.hasAttribute && n.hasAttribute('data-no-emoji')) return true
      if (n.classList && n.classList.contains('bg-emoji')) return true
    }
    return false
  }
  function img(e) {
    var i = document.createElement('img')
    i.className = 'bg-emoji'
    i.src = '/emoji/' + fn(e) + '.svg'
    i.alt = e
    i.setAttribute('draggable', 'false')
    i.style.cssText = 'display:inline-block;height:1em;width:1em;vertical-align:-.125em;margin:0 .05em 0 .1em;object-fit:contain'
    i.addEventListener('error', function () { i.replaceWith(document.createTextNode(e)) }, { once: true })
    return i
  }
  function proc(node) {
    var t = node.nodeValue
    if (!t) return
    RE.lastIndex = 0
    if (!RE.test(t)) return
    if (skip(node.parentElement)) return
    RE.lastIndex = 0
    var f = document.createDocumentFragment(), last = 0, m
    while ((m = RE.exec(t))) {
      var e = m[0]
      if (m.index > last) f.appendChild(document.createTextNode(t.slice(last, m.index)))
      f.appendChild(img(e))
      last = m.index + e.length
    }
    if (last < t.length) f.appendChild(document.createTextNode(t.slice(last)))
    node.replaceWith(f)
  }
  function walk(root) {
    if (!root) return
    if (root.nodeType === 3) { proc(root); return }
    if (root.nodeType !== 1 || skip(root)) return
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), a = [], c
    while ((c = w.nextNode())) if (c.nodeValue && c.nodeValue.trim()) a.push(c)
    a.forEach(proc)
  }
  function start() {
    walk(document.body)
    try {
      new MutationObserver(function (recs) {
        recs.forEach(function (r) {
          if (r.type === 'characterData') walk(r.target)
          else r.addedNodes.forEach(walk)
        })
      }).observe(document.body, { childList: true, subtree: true, characterData: true })
    } catch (e) { /* noop */ }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
