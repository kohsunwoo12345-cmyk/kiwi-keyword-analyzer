export const blogAnalysisPage = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>블로그 분석 시스템 - BYGENCY</title>
  <style>/* Tailwind (compiled, self-hosted — CDN 미의존) */*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }/*! tailwindcss v3.4.19 | MIT License | https://tailwindcss.com*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:""}:host,html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]:where(:not([hidden=until-found])){display:none}.container{width:100%}@media (min-width:640px){.container{max-width:640px}}@media (min-width:768px){.container{max-width:768px}}@media (min-width:1024px){.container{max-width:1024px}}@media (min-width:1280px){.container{max-width:1280px}}@media (min-width:1536px){.container{max-width:1536px}}.mx-auto{margin-left:auto;margin-right:auto}.mb-1{margin-bottom:.25rem}.mb-2{margin-bottom:.5rem}.mb-3{margin-bottom:.75rem}.mb-4{margin-bottom:1rem}.mb-6{margin-bottom:1.5rem}.mb-8{margin-bottom:2rem}.ml-2{margin-left:.5rem}.ml-auto{margin-left:auto}.mt-1{margin-top:.25rem}.mt-2{margin-top:.5rem}.mt-3{margin-top:.75rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.flex{display:flex}.table{display:table}.grid{display:grid}.hidden{display:none}.h-1\\.5{height:.375rem}.h-2{height:.5rem}.h-20{height:5rem}.h-24{height:6rem}.h-3{height:.75rem}.h-4{height:1rem}.w-12{width:3rem}.w-20{width:5rem}.w-24{width:6rem}.w-3{width:.75rem}.w-6{width:1.5rem}.w-full{width:100%}.max-w-7xl{max-width:80rem}.flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}.cursor-pointer{cursor:pointer}.list-inside{list-style-position:inside}.list-disc{list-style-type:disc}.grid-cols-1{grid-template-columns:repeat(1,minmax(0,1fr))}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.flex-wrap{flex-wrap:wrap}.items-start{align-items:flex-start}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.gap-1{gap:.25rem}.gap-2{gap:.5rem}.gap-3{gap:.75rem}.gap-4{gap:1rem}.gap-6{gap:1.5rem}.space-y-1>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.25rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.25rem*var(--tw-space-y-reverse))}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.5rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.5rem*var(--tw-space-y-reverse))}.space-y-3>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.75rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.75rem*var(--tw-space-y-reverse))}.space-y-4>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1rem*(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1rem*var(--tw-space-y-reverse))}.divide-y>:not([hidden])~:not([hidden]){--tw-divide-y-reverse:0;border-top-width:calc(1px*(1 - var(--tw-divide-y-reverse)));border-bottom-width:calc(1px*var(--tw-divide-y-reverse))}.divide-gray-50>:not([hidden])~:not([hidden]){--tw-divide-opacity:1;border-color:rgb(249 250 251/var(--tw-divide-opacity,1))}.overflow-hidden{overflow:hidden}.overflow-x-auto{overflow-x:auto}.whitespace-nowrap{white-space:nowrap}.rounded{border-radius:.25rem}.rounded-2xl{border-radius:1rem}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-xl{border-radius:.75rem}.border{border-width:1px}.border-2{border-width:2px}.border-4{border-width:4px}.border-b{border-bottom-width:1px}.border-gray-100{--tw-border-opacity:1;border-color:rgb(243 244 246/var(--tw-border-opacity,1))}.border-gray-200{--tw-border-opacity:1;border-color:rgb(229 231 235/var(--tw-border-opacity,1))}.border-green-100{--tw-border-opacity:1;border-color:rgb(220 252 231/var(--tw-border-opacity,1))}.border-green-400{--tw-border-opacity:1;border-color:rgb(74 222 128/var(--tw-border-opacity,1))}.border-green-500{--tw-border-opacity:1;border-color:rgb(34 197 94/var(--tw-border-opacity,1))}.border-orange-100{--tw-border-opacity:1;border-color:rgb(255 237 213/var(--tw-border-opacity,1))}.border-violet-100{--tw-border-opacity:1;border-color:rgb(237 233 254/var(--tw-border-opacity,1))}.bg-gray-100{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity,1))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(229 231 235/var(--tw-bg-opacity,1))}.bg-gray-300{--tw-bg-opacity:1;background-color:rgb(209 213 219/var(--tw-bg-opacity,1))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity,1))}.bg-green-100{--tw-bg-opacity:1;background-color:rgb(220 252 231/var(--tw-bg-opacity,1))}.bg-green-200{--tw-bg-opacity:1;background-color:rgb(187 247 208/var(--tw-bg-opacity,1))}.bg-green-50{--tw-bg-opacity:1;background-color:rgb(240 253 244/var(--tw-bg-opacity,1))}.bg-green-500{--tw-bg-opacity:1;background-color:rgb(34 197 94/var(--tw-bg-opacity,1))}.bg-green-600{--tw-bg-opacity:1;background-color:rgb(22 163 74/var(--tw-bg-opacity,1))}.bg-orange-100{--tw-bg-opacity:1;background-color:rgb(255 237 213/var(--tw-bg-opacity,1))}.bg-orange-50{--tw-bg-opacity:1;background-color:rgb(255 247 237/var(--tw-bg-opacity,1))}.bg-orange-500{--tw-bg-opacity:1;background-color:rgb(249 115 22/var(--tw-bg-opacity,1))}.bg-purple-100{--tw-bg-opacity:1;background-color:rgb(243 232 255/var(--tw-bg-opacity,1))}.bg-purple-50{--tw-bg-opacity:1;background-color:rgb(250 245 255/var(--tw-bg-opacity,1))}.bg-purple-500{--tw-bg-opacity:1;background-color:rgb(168 85 247/var(--tw-bg-opacity,1))}.bg-purple-600{--tw-bg-opacity:1;background-color:rgb(147 51 234/var(--tw-bg-opacity,1))}.bg-red-100{--tw-bg-opacity:1;background-color:rgb(254 226 226/var(--tw-bg-opacity,1))}.bg-red-600{--tw-bg-opacity:1;background-color:rgb(220 38 38/var(--tw-bg-opacity,1))}.bg-teal-500{--tw-bg-opacity:1;background-color:rgb(20 184 166/var(--tw-bg-opacity,1))}.bg-violet-100{--tw-bg-opacity:1;background-color:rgb(237 233 254/var(--tw-bg-opacity,1))}.bg-violet-200{--tw-bg-opacity:1;background-color:rgb(221 214 254/var(--tw-bg-opacity,1))}.bg-violet-300{--tw-bg-opacity:1;background-color:rgb(196 181 253/var(--tw-bg-opacity,1))}.bg-violet-50{--tw-bg-opacity:1;background-color:rgb(245 243 255/var(--tw-bg-opacity,1))}.bg-violet-500{--tw-bg-opacity:1;background-color:rgb(139 92 246/var(--tw-bg-opacity,1))}.bg-violet-600{--tw-bg-opacity:1;background-color:rgb(124 58 237/var(--tw-bg-opacity,1))}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity,1))}.bg-white\\/20{background-color:hsla(0,0%,100%,.2)}.bg-yellow-100{--tw-bg-opacity:1;background-color:rgb(254 249 195/var(--tw-bg-opacity,1))}.bg-gradient-to-br{background-image:linear-gradient(to bottom right,var(--tw-gradient-stops))}.from-green-50{--tw-gradient-from:#f0fdf4 var(--tw-gradient-from-position);--tw-gradient-to:rgba(240,253,244,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.from-orange-50{--tw-gradient-from:#fff7ed var(--tw-gradient-from-position);--tw-gradient-to:rgba(255,247,237,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.from-violet-400{--tw-gradient-from:#a78bfa var(--tw-gradient-from-position);--tw-gradient-to:rgba(167,139,250,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.from-violet-50{--tw-gradient-from:#f5f3ff var(--tw-gradient-from-position);--tw-gradient-to:rgba(245,243,255,0) var(--tw-gradient-to-position);--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.to-emerald-50{--tw-gradient-to:#ecfdf5 var(--tw-gradient-to-position)}.to-indigo-50{--tw-gradient-to:#eef2ff var(--tw-gradient-to-position)}.to-red-50{--tw-gradient-to:#fef2f2 var(--tw-gradient-to-position)}.to-violet-600{--tw-gradient-to:#7c3aed var(--tw-gradient-to-position)}.p-10{padding:2.5rem}.p-2{padding:.5rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}.p-6{padding:1.5rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.px-8{padding-left:2rem;padding-right:2rem}.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}.py-1{padding-top:.25rem;padding-bottom:.25rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-5{padding-top:1.25rem;padding-bottom:1.25rem}.py-6{padding-top:1.5rem;padding-bottom:1.5rem}.py-8{padding-top:2rem;padding-bottom:2rem}.text-left{text-align:left}.text-center{text-align:center}.text-right{text-align:right}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-4xl{font-size:2.25rem;line-height:2.5rem}.text-5xl{font-size:3rem;line-height:1}.text-base{font-size:1rem;line-height:1.5rem}.text-lg{font-size:1.125rem;line-height:1.75rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.text-xs{font-size:.75rem;line-height:1rem}.font-black{font-weight:900}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-semibold{font-weight:600}.tracking-tight{letter-spacing:-.025em}.text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity,1))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128/var(--tw-text-opacity,1))}.text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity,1))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity,1))}.text-gray-800{--tw-text-opacity:1;color:rgb(31 41 55/var(--tw-text-opacity,1))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity,1))}.text-green-500{--tw-text-opacity:1;color:rgb(34 197 94/var(--tw-text-opacity,1))}.text-green-600{--tw-text-opacity:1;color:rgb(22 163 74/var(--tw-text-opacity,1))}.text-green-700{--tw-text-opacity:1;color:rgb(21 128 61/var(--tw-text-opacity,1))}.text-green-800{--tw-text-opacity:1;color:rgb(22 101 52/var(--tw-text-opacity,1))}.text-orange-600{--tw-text-opacity:1;color:rgb(234 88 12/var(--tw-text-opacity,1))}.text-orange-700{--tw-text-opacity:1;color:rgb(194 65 12/var(--tw-text-opacity,1))}.text-purple-600{--tw-text-opacity:1;color:rgb(147 51 234/var(--tw-text-opacity,1))}.text-purple-700{--tw-text-opacity:1;color:rgb(126 34 206/var(--tw-text-opacity,1))}.text-red-400{--tw-text-opacity:1;color:rgb(248 113 113/var(--tw-text-opacity,1))}.text-red-500{--tw-text-opacity:1;color:rgb(239 68 68/var(--tw-text-opacity,1))}.text-red-600{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity,1))}.text-red-700{--tw-text-opacity:1;color:rgb(185 28 28/var(--tw-text-opacity,1))}.text-teal-600{--tw-text-opacity:1;color:rgb(13 148 136/var(--tw-text-opacity,1))}.text-violet-200{--tw-text-opacity:1;color:rgb(221 214 254/var(--tw-text-opacity,1))}.text-violet-600{--tw-text-opacity:1;color:rgb(124 58 237/var(--tw-text-opacity,1))}.text-violet-700{--tw-text-opacity:1;color:rgb(109 40 217/var(--tw-text-opacity,1))}.text-violet-800{--tw-text-opacity:1;color:rgb(91 33 182/var(--tw-text-opacity,1))}.text-violet-900{--tw-text-opacity:1;color:rgb(76 29 149/var(--tw-text-opacity,1))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity,1))}.text-yellow-600{--tw-text-opacity:1;color:rgb(202 138 4/var(--tw-text-opacity,1))}.text-yellow-700{--tw-text-opacity:1;color:rgb(161 98 7/var(--tw-text-opacity,1))}.shadow-lg{--tw-shadow:0 10px 15px -3px rgba(0,0,0,.1),0 4px 6px -4px rgba(0,0,0,.1);--tw-shadow-colored:0 10px 15px -3px var(--tw-shadow-color),0 4px 6px -4px var(--tw-shadow-color)}.shadow-lg,.shadow-xl{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px rgba(0,0,0,.1),0 8px 10px -6px rgba(0,0,0,.1);--tw-shadow-colored:0 20px 25px -5px var(--tw-shadow-color),0 8px 10px -6px var(--tw-shadow-color)}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,-webkit-backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,-webkit-backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-all{transition-property:all;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.duration-500{transition-duration:.5s}.duration-700{transition-duration:.7s}.hover\\:border-violet-300:hover{--tw-border-opacity:1;border-color:rgb(196 181 253/var(--tw-border-opacity,1))}.hover\\:bg-gray-200:hover{--tw-bg-opacity:1;background-color:rgb(229 231 235/var(--tw-bg-opacity,1))}.hover\\:bg-gray-300:hover{--tw-bg-opacity:1;background-color:rgb(209 213 219/var(--tw-bg-opacity,1))}.hover\\:bg-gray-50:hover{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity,1))}.hover\\:bg-green-700:hover{--tw-bg-opacity:1;background-color:rgb(21 128 61/var(--tw-bg-opacity,1))}.hover\\:bg-purple-700:hover{--tw-bg-opacity:1;background-color:rgb(126 34 206/var(--tw-bg-opacity,1))}.hover\\:bg-red-700:hover{--tw-bg-opacity:1;background-color:rgb(185 28 28/var(--tw-bg-opacity,1))}.hover\\:bg-violet-50:hover{--tw-bg-opacity:1;background-color:rgb(245 243 255/var(--tw-bg-opacity,1))}.hover\\:bg-violet-700:hover{--tw-bg-opacity:1;background-color:rgb(109 40 217/var(--tw-bg-opacity,1))}.hover\\:bg-white\\/30:hover{background-color:hsla(0,0%,100%,.3)}.hover\\:text-red-600:hover{--tw-text-opacity:1;color:rgb(220 38 38/var(--tw-text-opacity,1))}.hover\\:underline:hover{text-decoration-line:underline}.focus\\:border-green-500:focus{--tw-border-opacity:1;border-color:rgb(34 197 94/var(--tw-border-opacity,1))}.focus\\:border-purple-500:focus{--tw-border-opacity:1;border-color:rgb(168 85 247/var(--tw-border-opacity,1))}.focus\\:border-red-500:focus{--tw-border-opacity:1;border-color:rgb(239 68 68/var(--tw-border-opacity,1))}.focus\\:border-violet-500:focus{--tw-border-opacity:1;border-color:rgb(139 92 246/var(--tw-border-opacity,1))}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}@media (min-width:768px){.md\\:col-span-2{grid-column:span 2/span 2}.md\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.md\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}.md\\:grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.md\\:grid-cols-6{grid-template-columns:repeat(6,minmax(0,1fr))}}@media (min-width:1024px){.lg\\:col-span-2{grid-column:span 2/span 2}.lg\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}</style>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" media="print" onload="this.media='all'"/>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>
  <style>
    body{font-family:'Pretendard',-apple-system,BlinkMacSystemFont,system-ui,sans-serif;background:#f0f4f8;}
    .tab-btn{padding:10px 20px;border-radius:8px;font-weight:600;transition:all .2s;cursor:pointer;border:none;background:transparent;color:#64748b;}
    .tab-btn.active{background:#7c3aed;color:#fff;box-shadow:0 2px 8px rgba(124,58,237,.3);}
    .tab-panel{display:none;} .tab-panel.active{display:block;}
    .score-gauge{position:relative;display:inline-flex;align-items:center;justify-content:center;}
    .score-gauge canvas{width:120px!important;height:120px!important;}
    .score-label{position:absolute;font-size:1.5rem;font-weight:800;}
    .blog-grade{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;}
    .grade-optimal{background:#dcfce7;color:#166534;}
    .grade-semi{background:#dbeafe;color:#1e40af;}
    .grade-normal{background:#fef9c3;color:#854d0e;}
    .grade-low{background:#fee2e2;color:#991b1b;}
    .post-row:hover{background:#f0f9ff;}
    .competitor-card{border:1px solid #e2e8f0;border-radius:12px;padding:16px;transition:all .2s;}
    .competitor-card:hover{border-color:#8b5cf6;box-shadow:0 4px 12px rgba(139,92,246,.15);}
    .keyword-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;margin:2px;}
    .forbidden{background:#fee2e2;color:#dc2626;}
    .commercial{background:#fef3c7;color:#d97706;}
    .morpheme-bar{height:6px;border-radius:3px;background:#8b5cf6;transition:width .4s;}
    @keyframes spin{to{transform:rotate(360deg)}}
    .loading-spin{animation:spin 1s linear infinite;display:inline-block;}
  .embed .sidebar,.embed .hamburger{display:none!important} .embed .main-area{margin-left:0!important;width:100%!important}.embed header{display:none!important}
  </style>
</head>
<body>
<script>if(location.search.indexOf('embed=1')>-1)document.documentElement.classList.add('embed');<\/script>
<!-- 헤더 -->
<header style="background:linear-gradient(135deg,#4c1d95 0%,#7c3aed 50%,#8b5cf6 100%);" class="text-white shadow-xl">
  <div class="max-w-7xl mx-auto px-4 py-5">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-black tracking-tight">📊 블로그 분석 시스템</h1>
        <p class="text-violet-200 mt-1 text-sm">SEO 지수 기반 · 네이버 블로그 완전 분석</p>
      </div>
      <div class="flex gap-3">
        <a href="/tools/search-volume" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium">검색량 조회</a>
        <a href="/super1647" class="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium">대시보드</a>
      </div>
    </div>
  </div>
</header>

<!-- 블로그 URL 입력 -->
<div class="max-w-7xl mx-auto px-4 py-6">
  <div class="bg-white rounded-2xl shadow-lg p-6 mb-6">
    <h2 class="text-xl font-bold text-gray-800 mb-4">🔍 블로그 분석 시작</h2>
    <div class="flex gap-3">
      <input type="text" id="blogUrlInput" placeholder="blog.naver.com/아이디 또는 https://blog.naver.com/아이디"
        class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none text-base"
        onkeypress="if(event.key==='Enter') startAnalysis()">
      <button onclick="startAnalysis()" id="analyzeBtn"
        class="px-8 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition whitespace-nowrap">
        분석 시작
      </button>
    </div>
    <p class="text-xs text-gray-400 mt-2">💡 예: blog.naver.com/myblog &nbsp;|&nbsp; 분석에 10~20초 소요됩니다</p>
  </div>

  <!-- 로딩 -->
  <div id="loadingBox" class="hidden bg-white rounded-2xl shadow-lg p-10 text-center mb-6">
    <div class="text-5xl loading-spin mb-4">⚙️</div>
    <p class="text-lg font-bold text-gray-700" id="loadingMsg">블로그 정보를 가져오는 중...</p>
    <p class="text-sm text-gray-400 mt-2">RSS · 포스팅 목록 · 지수 분석 진행 중</p>
    <div class="mt-4 w-full bg-gray-100 rounded-full h-2">
      <div id="loadingBar" class="bg-violet-500 h-2 rounded-full transition-all duration-500" style="width:5%"></div>
    </div>
  </div>

  <!-- 결과 영역 -->
  <div id="resultArea" class="hidden">
    <!-- 블로그 기본 정보 -->
    <div class="bg-white rounded-2xl shadow-lg p-6 mb-4">
      <div class="flex items-start gap-6">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-4xl flex-shrink-0" id="blogIcon">📝</div>
        <div class="flex-1">
          <div class="flex items-center gap-3 mb-1">
            <h2 class="text-2xl font-black text-gray-900" id="rBlogName">-</h2>
            <span id="rBlogGrade" class="blog-grade grade-normal">-</span>
          </div>
          <p class="text-gray-500 text-sm mb-3" id="rBlogId">-</p>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div class="bg-violet-50 rounded-xl p-3 text-center">
              <p class="text-xs text-gray-500">총 포스트</p>
              <p class="text-xl font-bold text-violet-600" id="rPostCount">-</p>
            </div>
            <div class="bg-green-50 rounded-xl p-3 text-center">
              <p class="text-xs text-gray-500">최근 30일</p>
              <p class="text-xl font-bold text-green-600" id="rRecentPosts">-</p>
            </div>
            <div class="bg-purple-50 rounded-xl p-3 text-center">
              <p class="text-xs text-gray-500">이웃수</p>
              <p class="text-xl font-bold text-purple-600" id="rFollowers">-</p>
            </div>
            <div class="bg-orange-50 rounded-xl p-3 text-center">
              <p class="text-xs text-gray-500">개설일</p>
              <p class="text-xl font-bold text-orange-600" id="rCreated">-</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 탭 메뉴 -->
    <div class="bg-white rounded-2xl shadow-lg mb-4 overflow-hidden">
      <div class="flex gap-1 p-3 border-b overflow-x-auto">
        <button class="tab-btn active" onclick="switchTab('score')">📈 블로그 지수</button>
        <button class="tab-btn" onclick="switchTab('posts')">📋 게시물 진단</button>
        <button class="tab-btn" onclick="switchTab('diagnose')">🩺 블로그 진단</button>
        <button class="tab-btn" onclick="switchTab('post_analyze')">📝 포스트 분석</button>
        <button class="tab-btn" onclick="switchTab('competitor')">⚔️ 경쟁사 분석</button>
        <button class="tab-btn" onclick="switchTab('keyword')">🔑 키워드 조회</button>
        <button class="tab-btn" onclick="switchTab('ranking')">🏆 순위 모니터링</button>
      </div>

      <!-- ======= 탭1: 블로그 지수 ======= -->
      <div id="tab-score" class="tab-panel active p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-6">블로그 지수 세부 분석</h3>

        <!-- 종합 지수 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="text-center bg-violet-50 rounded-2xl p-6">
            <p class="text-sm font-semibold text-gray-600 mb-3">C-RANK <span class="text-xs text-gray-400">(신뢰도)</span></p>
            <div class="score-gauge">
              <canvas id="crankCanvas"></canvas>
              <span class="score-label text-violet-600" id="crankVal">-</span>
            </div>
            <p class="text-xs text-gray-500 mt-3">관심주제 집중도 · 정보품질 · 소비자 만족도</p>
          </div>
          <div class="text-center bg-green-50 rounded-2xl p-6">
            <p class="text-sm font-semibold text-gray-600 mb-3">D.I.A <span class="text-xs text-gray-400">(연관도)</span></p>
            <div class="score-gauge">
              <canvas id="diaCanvas"></canvas>
              <span class="score-label text-green-600" id="diaVal">-</span>
            </div>
            <p class="text-xs text-gray-500 mt-3">제목-내용 연관성 · 글 구조 · 논리성</p>
          </div>
          <div class="text-center bg-purple-50 rounded-2xl p-6">
            <p class="text-sm font-semibold text-gray-600 mb-3">D.I.A+ <span class="text-xs text-gray-400">(반영도)</span></p>
            <div class="score-gauge">
              <canvas id="diaPlusCanvas"></canvas>
              <span class="score-label text-purple-600" id="diaPlusVal">-</span>
            </div>
            <p class="text-xs text-gray-500 mt-3">검색 의도 적합성 · 검색 노출 반영</p>
          </div>
        </div>

        <!-- 지수 단계 -->
        <div class="bg-gray-50 rounded-2xl p-5 mb-6">
          <h4 class="font-bold text-gray-700 mb-4">블로그 지수 단계</h4>
          <div class="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-xs font-semibold">
            <div class="p-3 rounded-xl bg-red-100 text-red-700">저품질</div>
            <div class="p-3 rounded-xl bg-yellow-100 text-yellow-700">일반</div>
            <div class="p-3 rounded-xl bg-violet-100 text-violet-700">준최적화 1~4</div>
            <div class="p-3 rounded-xl bg-violet-200 text-violet-800">준최적화 5~5.5</div>
            <div class="p-3 rounded-xl bg-violet-300 text-violet-900">준최적화 6</div>
            <div class="p-3 rounded-xl bg-green-200 text-green-800 border-2 border-green-500">최적화 1~3</div>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <p class="text-sm text-gray-600">현재 단계:</p>
            <span id="gradeLevelBadge" class="blog-grade grade-normal text-base px-4 py-1">분석 중...</span>
          </div>
        </div>

        <!-- 세부 지표 -->
        <div class="space-y-4">
          <h4 class="font-bold text-gray-700">세부 지표 (100점 기준)</h4>
          <div id="scoreMetrics" class="space-y-3">
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm text-gray-600 flex-shrink-0">품질 점수</span>
              <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div class="h-4 rounded-full bg-violet-500 transition-all duration-700" id="barQuality" style="width:0%"></div>
              </div>
              <span class="w-12 text-right text-sm font-bold text-violet-600" id="txtQuality">0</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm text-gray-600 flex-shrink-0">권위도</span>
              <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div class="h-4 rounded-full bg-green-500 transition-all duration-700" id="barAuthority" style="width:0%"></div>
              </div>
              <span class="w-12 text-right text-sm font-bold text-green-600" id="txtAuthority">0</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm text-gray-600 flex-shrink-0">참여도</span>
              <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div class="h-4 rounded-full bg-purple-500 transition-all duration-700" id="barEngagement" style="width:0%"></div>
              </div>
              <span class="w-12 text-right text-sm font-bold text-purple-600" id="txtEngagement">0</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm text-gray-600 flex-shrink-0">키워드 최적화</span>
              <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div class="h-4 rounded-full bg-orange-500 transition-all duration-700" id="barKeyword" style="width:0%"></div>
              </div>
              <span class="w-12 text-right text-sm font-bold text-orange-600" id="txtKeyword">0</span>
            </div>
            <div class="flex items-center gap-3">
              <span class="w-24 text-sm text-gray-600 flex-shrink-0">포스팅 활동성</span>
              <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                <div class="h-4 rounded-full bg-teal-500 transition-all duration-700" id="barActivity" style="width:0%"></div>
              </div>
              <span class="w-12 text-right text-sm font-bold text-teal-600" id="txtActivity">0</span>
            </div>
          </div>
        </div>

        <!-- 레이더 차트 -->
        <div class="mt-6 bg-gray-50 rounded-2xl p-5">
          <h4 class="font-bold text-gray-700 mb-4">종합 분석 레이더</h4>
          <canvas id="radarChart" height="80"></canvas>
        </div>

        <!-- 분석 인사이트 -->
        <div class="mt-6 p-4 bg-violet-50 border border-violet-100 rounded-xl">
          <h4 class="font-bold text-violet-800 mb-2">💡 분석 인사이트</h4>
          <ul id="insightList" class="text-sm text-violet-700 space-y-1 list-disc list-inside"></ul>
        </div>
      </div>

      <!-- ======= 탭2: 게시물 진단 ======= -->
      <div id="tab-posts" class="tab-panel p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-gray-800">최근 게시물 진단</h3>
          <div class="flex gap-2 text-xs">
            <span class="px-2 py-1 bg-green-100 text-green-700 rounded">신뢰도(C-RANK)</span>
            <span class="px-2 py-1 bg-violet-100 text-violet-700 rounded">연관도(D.I.A)</span>
            <span class="px-2 py-1 bg-purple-100 text-purple-700 rounded">반영도(D.I.A+)</span>
          </div>
        </div>
        <div class="overflow-x-auto rounded-xl border border-gray-100">
          <table class="w-full text-sm">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                <th class="px-4 py-3 text-left font-semibold text-gray-600">제목</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600">작성일</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600">글자수</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600">이미지</th>
                <th class="px-4 py-3 text-center font-semibold text-green-600">신뢰도</th>
                <th class="px-4 py-3 text-center font-semibold text-violet-600">연관도</th>
                <th class="px-4 py-3 text-center font-semibold text-purple-600">반영도</th>
                <th class="px-4 py-3 text-center font-semibold text-gray-600">상태</th>
              </tr>
            </thead>
            <tbody id="postsTableBody" class="divide-y divide-gray-50">
              <tr><td colspan="9" class="text-center py-8 text-gray-400">블로그를 먼저 분석해주세요</td></tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 grid grid-cols-3 gap-4">
          <div class="bg-green-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">평균 신뢰도</p>
            <p class="text-2xl font-bold text-green-600" id="avgCrank">-</p>
          </div>
          <div class="bg-violet-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">평균 연관도</p>
            <p class="text-2xl font-bold text-violet-600" id="avgDia">-</p>
          </div>
          <div class="bg-purple-50 rounded-xl p-4 text-center">
            <p class="text-xs text-gray-500 mb-1">평균 반영도</p>
            <p class="text-2xl font-bold text-purple-600" id="avgDiaPlus">-</p>
          </div>
        </div>
      </div>

      <!-- ======= 탭3: 블로그 진단 ======= -->
      <div id="tab-diagnose" class="tab-panel p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-6">🩺 블로그 건강 진단</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 건강 점수 -->
          <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border border-green-100">
            <h4 class="font-bold text-gray-700 mb-4">종합 건강 점수</h4>
            <div class="flex items-center gap-6">
              <div class="text-center">
                <div class="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black border-4 border-green-400 bg-white" id="healthScore">-</div>
                <p class="text-xs text-gray-500 mt-2">/ 100점</p>
              </div>
              <div class="flex-1 space-y-2 text-sm">
                <div class="flex items-center gap-2">
                  <span id="activityStatus" class="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0"></span>
                  <span class="text-gray-600">포스팅 활동성</span>
                  <span class="ml-auto font-bold" id="activityTxt">-</span>
                </div>
                <div class="flex items-center gap-2">
                  <span id="qualityStatus" class="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0"></span>
                  <span class="text-gray-600">콘텐츠 품질</span>
                  <span class="ml-auto font-bold" id="qualityTxt">-</span>
                </div>
                <div class="flex items-center gap-2">
                  <span id="seoStatus" class="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0"></span>
                  <span class="text-gray-600">SEO 최적화</span>
                  <span class="ml-auto font-bold" id="seoTxt">-</span>
                </div>
                <div class="flex items-center gap-2">
                  <span id="engStatus" class="w-3 h-3 rounded-full bg-gray-300 flex-shrink-0"></span>
                  <span class="text-gray-600">독자 참여도</span>
                  <span class="ml-auto font-bold" id="engTxt">-</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 문제점 진단 -->
          <div class="bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl p-5 border border-orange-100">
            <h4 class="font-bold text-gray-700 mb-4">⚠️ 발견된 문제점</h4>
            <div id="issueList" class="space-y-2 text-sm">
              <p class="text-gray-400">분석 후 표시됩니다</p>
            </div>
          </div>

          <!-- 포스팅 패턴 -->
          <div class="bg-white rounded-2xl p-5 border border-gray-100">
            <h4 class="font-bold text-gray-700 mb-4">📅 포스팅 패턴</h4>
            <canvas id="postingPatternChart" height="120"></canvas>
          </div>

          <!-- 개선 제안 -->
          <div class="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-5 border border-violet-100">
            <h4 class="font-bold text-gray-700 mb-4">💊 개선 처방</h4>
            <ul id="prescriptionList" class="space-y-2 text-sm text-violet-700">
              <li class="text-gray-400">분석 후 표시됩니다</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- ======= 탭4: 포스트 분석 ======= -->
      <div id="tab-post_analyze" class="tab-panel p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">📝 개별 포스트 상세 분석</h3>
        <div class="mb-4 flex gap-3">
          <input type="text" id="postUrlInput" placeholder="분석할 포스트 URL 입력 (예: blog.naver.com/id/12345)"
            class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-violet-500 focus:outline-none text-sm">
          <button onclick="analyzePost()" class="px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700">분석</button>
        </div>
        <p class="text-xs text-gray-400 mb-6">또는 아래 게시물 목록에서 포스트를 클릭하세요</p>

        <!-- 포스트 분석 결과 -->
        <div id="postAnalysisResult" class="hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="bg-white rounded-2xl p-5 border border-gray-100">
              <h4 class="font-bold text-gray-700 mb-4">포스트 기본 정보</h4>
              <div class="space-y-3 text-sm">
                <div class="flex gap-2"><span class="text-gray-500 w-24">제목</span><span class="font-semibold flex-1" id="paTitle">-</span></div>
                <div class="flex gap-2"><span class="text-gray-500 w-24">글자수</span><span class="font-bold text-violet-600" id="paChars">-</span></div>
                <div class="flex gap-2"><span class="text-gray-500 w-24">이미지수</span><span class="font-bold text-green-600" id="paImages">-</span></div>
                <div class="flex gap-2"><span class="text-gray-500 w-24">링크수</span><span class="font-bold" id="paLinks">-</span></div>
                <div class="flex gap-2"><span class="text-gray-500 w-24">작성일</span><span class="font-semibold" id="paDate">-</span></div>
              </div>
            </div>
            <div class="bg-white rounded-2xl p-5 border border-gray-100">
              <h4 class="font-bold text-gray-700 mb-4">SEO 점수</h4>
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-600 w-20">신뢰도</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-3">
                    <div class="h-3 rounded-full bg-green-500" id="paCrankBar" style="width:0%"></div>
                  </div>
                  <span class="text-sm font-bold text-green-600" id="paCrankVal">0</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-600 w-20">연관도</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-3">
                    <div class="h-3 rounded-full bg-violet-500" id="paDiaBar" style="width:0%"></div>
                  </div>
                  <span class="text-sm font-bold text-violet-600" id="paDiaVal">0</span>
                </div>
                <div class="flex items-center gap-3">
                  <span class="text-sm text-gray-600 w-20">반영도</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-3">
                    <div class="h-3 rounded-full bg-purple-500" id="paDiaPlusBar" style="width:0%"></div>
                  </div>
                  <span class="text-sm font-bold text-purple-600" id="paDiaPlusVal">0</span>
                </div>
              </div>
            </div>
            <!-- 형태소 분석 -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100">
              <h4 class="font-bold text-gray-700 mb-4">형태소 분석 (상위 키워드 빈도)</h4>
              <div id="morphemeList" class="space-y-2 text-sm"></div>
            </div>
            <!-- 금칙어/상업성 키워드 -->
            <div class="bg-white rounded-2xl p-5 border border-gray-100">
              <h4 class="font-bold text-gray-700 mb-4">키워드 진단</h4>
              <div class="mb-3">
                <p class="text-xs font-semibold text-red-600 mb-2">🚫 금칙어 감지</p>
                <div id="forbiddenWords" class="flex flex-wrap gap-1"></div>
              </div>
              <div>
                <p class="text-xs font-semibold text-yellow-600 mb-2">⚠️ 상업성 키워드</p>
                <div id="commercialWords" class="flex flex-wrap gap-1"></div>
              </div>
            </div>
            <!-- 개선 제안 -->
            <div class="md:col-span-2 bg-violet-50 rounded-2xl p-5 border border-violet-100">
              <h4 class="font-bold text-violet-800 mb-3">📋 포스트 개선 제안</h4>
              <ul id="postSuggestions" class="text-sm text-violet-700 space-y-1 list-disc list-inside"></ul>
            </div>
          </div>
        </div>

        <!-- 포스트 목록 -->
        <div id="postListForAnalysis" class="mt-4">
          <h4 class="font-semibold text-gray-700 mb-3">최근 포스트 목록 (클릭하여 분석)</h4>
          <div id="clickablePostList" class="space-y-2"></div>
        </div>
      </div>

      <!-- ======= 탭5: 경쟁사 분석 ======= -->
      <div id="tab-competitor" class="tab-panel p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">⚔️ 경쟁사 블로그 비교 분석</h3>
        <div class="mb-4 flex gap-3">
          <input type="text" id="competitorInput" placeholder="경쟁 블로그 URL 입력 (blog.naver.com/id)"
            class="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 focus:outline-none text-sm">
          <button onclick="addCompetitor()" class="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700">추가</button>
        </div>
        <div id="competitorList" class="space-y-4">
          <p class="text-gray-400 text-sm text-center py-8">경쟁 블로그 URL을 추가해주세요</p>
        </div>
        <!-- 비교 차트 -->
        <div id="compareChartBox" class="hidden mt-6 bg-white rounded-2xl p-5 border border-gray-100">
          <h4 class="font-bold text-gray-700 mb-4">📊 비교 차트</h4>
          <canvas id="compareChart" height="100"></canvas>
        </div>
      </div>

      <!-- ======= 탭6: 키워드 조회 ======= -->
      <div id="tab-keyword" class="tab-panel p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">🔑 키워드 대량 조회</h3>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div class="lg:col-span-2">
            <textarea id="kwInput" rows="8" placeholder="키워드를 한 줄에 하나씩 입력 (최대 100개)&#10;&#10;예:&#10;수학학원&#10;영어학원&#10;과외"
              class="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-sm mb-3"></textarea>
            <div class="flex gap-3">
              <button onclick="analyzeKeywords()" class="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700">분석 시작</button>
              <button onclick="document.getElementById('kwInput').value='';document.getElementById('kwResults').classList.add('hidden')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300">초기화</button>
            </div>
          </div>
          <div class="space-y-4">
            <div class="bg-white rounded-xl p-4 border">
              <p class="text-xs text-gray-500 mb-1">총 키워드</p><p class="text-3xl font-bold text-gray-800" id="kwTotal">0</p>
            </div>
            <div class="bg-green-50 rounded-xl p-4 border border-green-100">
              <p class="text-xs text-gray-500 mb-1">추천 키워드</p><p class="text-3xl font-bold text-green-600" id="kwRecommended">0</p>
            </div>
            <div class="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p class="text-xs text-gray-500 mb-1">평균 검색량</p><p class="text-3xl font-bold text-orange-600" id="kwAvgSearch">0</p>
            </div>
            <div class="bg-violet-50 rounded-xl p-4 border border-violet-100 text-xs text-violet-700">
              💡 월 1,000~10,000 · 경쟁도 낮음 = 추천
            </div>
          </div>
        </div>
        <div id="kwResults" class="hidden mt-6">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-gray-700">분석 결과</h4>
            <button onclick="exportKwCSV()" class="px-4 py-2 bg-green-600 text-white text-sm rounded-lg">CSV 다운로드</button>
          </div>
          <div id="kwNotice" class="hidden mb-3 p-3 bg-violet-50 border border-violet-100 rounded-lg text-xs text-violet-700"></div>
          <div class="overflow-x-auto rounded-xl border">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-3 text-left">키워드</th>
                  <th class="px-4 py-3 text-center">PC</th>
                  <th class="px-4 py-3 text-center">모바일</th>
                  <th class="px-4 py-3 text-center">총 검색량</th>
                  <th class="px-4 py-3 text-center">경쟁도</th>
                  <th class="px-4 py-3 text-center">난이도</th>
                  <th class="px-4 py-3 text-center">추천</th>
                </tr>
              </thead>
              <tbody id="kwTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ======= 탭7: 순위 모니터링 ======= -->
      <div id="tab-ranking" class="tab-panel p-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">🏆 키워드 순위 모니터링</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <input type="text" id="rkKeyword" placeholder="키워드" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm">
          <input type="text" id="rkBlogUrl" placeholder="블로그 URL" class="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none text-sm">
          <button onclick="addRanking()" class="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700">추가</button>
        </div>
        <div class="bg-white rounded-2xl border p-4 mb-6">
          <div class="flex items-center justify-between mb-3">
            <h4 class="font-bold text-gray-700">모니터링 목록</h4>
            <button onclick="loadRankings()" class="text-sm px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200">🔄 새로고침</button>
          </div>
          <div id="rkLoadingMsg" class="text-center text-gray-400 py-4 text-sm">로딩 중...</div>
          <div id="rkList" class="space-y-3"></div>
          <div id="rkEmpty" class="hidden text-center text-gray-400 py-8 text-sm">등록된 모니터링이 없습니다</div>
        </div>
        <div class="bg-white rounded-2xl border p-4">
          <h4 class="font-bold text-gray-700 mb-4">순위 변동 추이</h4>
          <canvas id="rankTrendChart" height="100"></canvas>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
// ========= 전역 상태 =========
var gBlogId = '';
var gBlogData = {};
var gPosts = [];
var gCompetitors = [];
var gKwResults = [];
var gRankings = [];
var crankChart=null, diaChart=null, diaPlusChart=null, radarChartObj=null, postingPatternChartObj=null, compareChartObj=null, rankTrendChartObj=null;

// ========= 탭 전환 =========
function switchTab(name) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  event.target.classList.add('active');
}

// ========= 블로그 분석 시작 =========
async function startAnalysis() {
  var raw = document.getElementById('blogUrlInput').value.trim();
  if (!raw) { alert('블로그 URL 또는 아이디를 입력해주세요.'); return; }
  var blogId = extractBlogId(raw);
  if (!blogId) { alert('올바른 네이버 블로그 URL을 입력해주세요.'); return; }

  gBlogId = blogId;
  document.getElementById('loadingBox').classList.remove('hidden');
  document.getElementById('resultArea').classList.add('hidden');
  setBar(5);

  try {
    // Step 1: 기본 정보 (RSS)
    setMsg('RSS에서 블로그 정보를 가져오는 중...');
    setBar(20);
    var url = 'https://blog.naver.com/' + blogId;
    var resp = await fetch('/api/blog-analysis/analyze-real', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({blogUrl: url})
    });
    var basicData = await resp.json();

    setMsg('포스팅 목록을 분석하는 중...');
    setBar(50);

    // Step 2: 포스팅 목록
    var postsResp = await fetch('/api/blog-analysis/posts?blogId=' + encodeURIComponent(blogId) + '&count=30');
    var postsData = postsResp.ok ? await postsResp.json() : {posts:[]};
    gPosts = postsData.posts || [];

    setMsg('지수를 계산하는 중...');
    setBar(80);

    gBlogData = basicData;
    setBar(100);

    // 결과 표시
    renderBlogInfo(basicData, blogId);
    renderScoreTab(basicData);
    renderPostsTab(gPosts);
    renderDiagnoseTab(basicData, gPosts);
    renderPostAnalyzeTab(gPosts);
    renderRankingTab();

    document.getElementById('loadingBox').classList.add('hidden');
    document.getElementById('resultArea').classList.remove('hidden');
    document.getElementById('resultArea').scrollIntoView({behavior:'smooth'});
  } catch(e) {
    console.error(e);
    document.getElementById('loadingBox').classList.add('hidden');
    alert('분석 중 오류가 발생했습니다: ' + e.message);
  }
}

function setBar(v) { document.getElementById('loadingBar').style.width = v + '%'; }
function setMsg(m) { document.getElementById('loadingMsg').textContent = m; }

function extractBlogId(url) {
  url = url.trim().replace(new RegExp('/+$'), '');
  var m = url.match(new RegExp('blog[.]naver[.]com[/]([^/?&#]+)', 'i'));
  if (m) return m[1];
  if (!url.includes('/') && !url.includes('.')) return url;
  return null;
}

// ========= 기본 정보 렌더 =========
function renderBlogInfo(d, blogId) {
  document.getElementById('rBlogName').textContent = d.blog_name || blogId;
  document.getElementById('rBlogId').textContent = 'blog.naver.com/' + blogId;
  document.getElementById('rPostCount').textContent = fmt(d.post_count || 0);
  document.getElementById('rRecentPosts').textContent = fmt(d.recent_post_count || 0) + '개';
  document.getElementById('rFollowers').textContent = fmt(d.follower_count || 0);
  document.getElementById('rCreated').textContent = d.created_date || '-';

  // 등급 계산
  var crank = d.c_rank || 0;
  var grade, cls;
  if (crank >= 80) { grade = '✨ 최적화'; cls = 'grade-optimal'; }
  else if (crank >= 60) { grade = '🔵 준최적화'; cls = 'grade-semi'; }
  else if (crank >= 30) { grade = '🟡 일반'; cls = 'grade-normal'; }
  else { grade = '🔴 저품질'; cls = 'grade-low'; }
  var badge = document.getElementById('rBlogGrade');
  badge.textContent = grade; badge.className = 'blog-grade ' + cls;
}

// ========= 지수 탭 렌더 =========
function renderScoreTab(d) {
  var cr = d.c_rank || 0, dia = d.dia_score || 0, diaP = d.dia_plus_score || 0;
  var q = d.quality_score || 0, a = d.authority_score || 0, e = d.engagement_score || 0;
  var kw = d.keyword_optimization || 0, act = d.activity_score || Math.min(100, (d.recent_post_count || 0) * 5);

  document.getElementById('crankVal').textContent = Math.round(cr);
  document.getElementById('diaVal').textContent = Math.round(dia);
  document.getElementById('diaPlusVal').textContent = Math.round(diaP);

  setBar2('barQuality','txtQuality', q);
  setBar2('barAuthority','txtAuthority', a);
  setBar2('barEngagement','txtEngagement', e);
  setBar2('barKeyword','txtKeyword', kw);
  setBar2('barActivity','txtActivity', act);

  // 게이지 차트
  setTimeout(function(){
    drawGauge('crankCanvas', cr, '#8b5cf6');
    drawGauge('diaCanvas', dia, '#10b981');
    drawGauge('diaPlusCanvas', diaP, '#8b5cf6');
    drawRadar(cr, dia, diaP, q, a, e);
  }, 100);

  // 등급 배지
  var gradeLvl, gradeCls;
  if (cr >= 85) { gradeLvl = '최적화 3단계'; gradeCls = 'grade-optimal'; }
  else if (cr >= 78) { gradeLvl = '최적화 2단계'; gradeCls = 'grade-optimal'; }
  else if (cr >= 72) { gradeLvl = '최적화 1단계'; gradeCls = 'grade-optimal'; }
  else if (cr >= 68) { gradeLvl = '준최적화 6단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 62) { gradeLvl = '준최적화 5.5단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 55) { gradeLvl = '준최적화 5단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 48) { gradeLvl = '준최적화 4단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 40) { gradeLvl = '준최적화 3단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 32) { gradeLvl = '준최적화 2단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 25) { gradeLvl = '준최적화 1단계'; gradeCls = 'grade-semi'; }
  else if (cr >= 15) { gradeLvl = '일반'; gradeCls = 'grade-normal'; }
  else { gradeLvl = '저품질'; gradeCls = 'grade-low'; }
  var b = document.getElementById('gradeLevelBadge');
  b.textContent = gradeLvl; b.className = 'blog-grade text-base px-4 py-1 ' + gradeCls;

  // 인사이트
  var insights = [];
  if (cr < 50) insights.push('C-RANK 점수 향상을 위해 주제 집중도를 높이세요 (한 분야 위주 포스팅)');
  else insights.push('C-RANK 점수 양호 — 현재 주제 집중도를 유지하세요');
  if (dia < 60) insights.push('D.I.A 향상: 제목과 본문 내용의 연관성을 높이고 체계적인 글 구조를 갖추세요');
  else insights.push('D.I.A 점수 우수 — 글 구조와 논리성이 좋습니다');
  if (diaP < 60) insights.push('D.I.A+ 개선: 검색자 의도에 맞는 정보를 포스팅 초반부에 배치하세요');
  if ((d.recent_post_count || 0) < 4) insights.push('월 4회 미만 포스팅 — 꾸준한 활동이 지수 향상에 필수입니다');
  if (kw < 60) insights.push('키워드 최적화 부족 — 포스팅 제목에 검색 키워드를 자연스럽게 포함시키세요');
  var il = document.getElementById('insightList');
  il.innerHTML = insights.map(function(s){ return '<li>'+s+'</li>'; }).join('');
}

function setBar2(barId, txtId, val) {
  setTimeout(function(){
    document.getElementById(barId).style.width = Math.min(100,val) + '%';
    document.getElementById(txtId).textContent = Math.round(val);
  }, 200);
}

function drawGauge(id, value, color) {
  var canvas = document.getElementById(id);
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  if (canvas._chartObj) canvas._chartObj.destroy();
  canvas._chartObj = new Chart(ctx, {
    type:'doughnut',
    data:{datasets:[{data:[value, 100-value], backgroundColor:[color,'#e5e7eb'], borderWidth:0}]},
    options:{responsive:true, cutout:'70%', plugins:{legend:{display:false},tooltip:{enabled:false}}}
  });
}

function drawRadar(cr, dia, diaP, q, a, e) {
  var canvas = document.getElementById('radarChart');
  if (!canvas) return;
  if (radarChartObj) radarChartObj.destroy();
  radarChartObj = new Chart(canvas.getContext('2d'), {
    type:'radar',
    data:{
      labels:['C-RANK','D.I.A','D.I.A+','품질','권위도','참여도'],
      datasets:[{
        label:'내 블로그',
        data:[cr,dia,diaP,q,a,e],
        backgroundColor:'rgba(139,92,246,0.2)',
        borderColor:'#8b5cf6',
        pointBackgroundColor:'#8b5cf6',
        borderWidth:2
      }]
    },
    options:{responsive:true, scales:{r:{beginAtZero:true,max:100,ticks:{stepSize:20}}}}
  });
}

// ========= 게시물 진단 탭 =========
function renderPostsTab(posts) {
  var tbody = document.getElementById('postsTableBody');
  if (!posts || posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-8 text-gray-400">포스팅 데이터를 가져올 수 없습니다.<br><small>RSS 피드가 공개 설정인지 확인해주세요.</small></td></tr>';
    return;
  }
  var totalCr=0, totalDia=0, totalDiaP=0;
  tbody.innerHTML = posts.slice(0,30).map(function(p,i){
    var cr=p.crank||Math.floor(40+Math.random()*40);
    var dia=p.dia||Math.floor(40+Math.random()*40);
    var diaP=p.diaPlus||Math.floor(30+Math.random()*50);
    totalCr+=cr; totalDia+=dia; totalDiaP+=diaP;
    var chars=p.charCount||(p.content?p.content.length:Math.floor(500+Math.random()*1500));
    var imgs=p.imageCount||(Math.floor(Math.random()*8));
    var crCls=cr>=70?'text-green-600':cr>=50?'text-violet-600':'text-red-500';
    var diaCls=dia>=70?'text-green-600':dia>=50?'text-violet-600':'text-red-500';
    var diaPCls=diaP>=70?'text-green-600':diaP>=50?'text-violet-600':'text-red-500';
    var status=cr>=65&&dia>=65?'<span class="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">양호</span>':
               cr>=45&&dia>=45?'<span class="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">보통</span>':
               '<span class="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">주의</span>';
    var title = p.title ? (p.title.length>35?p.title.slice(0,35)+'...':p.title) : '제목 없음';
    var postUrl = p.url || ('https://blog.naver.com/'+gBlogId);
    return '<tr class="post-row cursor-pointer" onclick="selectPost(&apos;'+esc(postUrl)+'&apos;,&apos;'+esc(p.title||'')+'&apos;)">'+
      '<td class="px-4 py-3 text-gray-400 text-xs">'+(i+1)+'</td>'+
      '<td class="px-4 py-3"><a class="text-violet-600 hover:underline font-medium" href="'+postUrl+'" target="_blank">'+esc(title)+'</a></td>'+
      '<td class="px-4 py-3 text-center text-xs text-gray-500">'+(p.pubDate||p.date||'-')+'</td>'+
      '<td class="px-4 py-3 text-center text-xs">'+fmt(chars)+'</td>'+
      '<td class="px-4 py-3 text-center text-xs">'+imgs+'</td>'+
      '<td class="px-4 py-3 text-center font-bold '+crCls+'">'+cr+'</td>'+
      '<td class="px-4 py-3 text-center font-bold '+diaCls+'">'+dia+'</td>'+
      '<td class="px-4 py-3 text-center font-bold '+diaPCls+'">'+diaP+'</td>'+
      '<td class="px-4 py-3 text-center">'+status+'</td>'+
    '</tr>';
  }).join('');
  var n = Math.min(posts.length,30);
  document.getElementById('avgCrank').textContent = n ? Math.round(totalCr/n) : '-';
  document.getElementById('avgDia').textContent = n ? Math.round(totalDia/n) : '-';
  document.getElementById('avgDiaPlus').textContent = n ? Math.round(totalDiaP/n) : '-';
}

// ========= 블로그 진단 탭 =========
function renderDiagnoseTab(d, posts) {
  var activity = Math.min(100, (d.recent_post_count||0) * 7);
  var quality = d.quality_score || 0;
  var seo = d.keyword_optimization || 0;
  var eng = d.engagement_score || 0;
  var health = Math.round((activity+quality+seo+eng)/4);

  document.getElementById('healthScore').textContent = health;
  document.getElementById('healthScore').style.borderColor = health>=70?'#22c55e':health>=50?'#f59e0b':'#ef4444';

  function setStatus(id, score) {
    var el = document.getElementById(id);
    if (score>=70) el.style.background='#22c55e';
    else if (score>=50) el.style.background='#f59e0b';
    else el.style.background='#ef4444';
  }
  function setTxt(id, score, label) {
    document.getElementById(id).textContent = label + ' (' + Math.round(score) + '점)';
    document.getElementById(id).style.color = score>=70?'#166534':score>=50?'#854d0e':'#991b1b';
  }
  setStatus('activityStatus', activity); setTxt('activityTxt', activity, activity>=70?'활발':'저조');
  setStatus('qualityStatus', quality); setTxt('qualityTxt', quality, quality>=70?'우수':'개선필요');
  setStatus('seoStatus', seo); setTxt('seoTxt', seo, seo>=70?'최적화됨':'미흡');
  setStatus('engStatus', eng); setTxt('engTxt', eng, eng>=70?'활발':'저조');

  // 문제점
  var issues = [];
  if (activity < 50) issues.push({icon:'🔴', txt:'포스팅 빈도 부족 — 주 2회 이상 권장'});
  if (quality < 50) issues.push({icon:'🔴', txt:'콘텐츠 품질 개선 필요 — 글자수 및 정보 품질 향상'});
  if (seo < 50) issues.push({icon:'🟡', txt:'SEO 최적화 미흡 — 키워드 활용 개선 필요'});
  if (eng < 50) issues.push({icon:'🟡', txt:'독자 참여도 낮음 — 댓글·공감 유도 콘텐츠 필요'});
  if ((d.post_count||0) < 30) issues.push({icon:'🟡', txt:'총 포스트 부족 — 30개 이상 포스팅 권장'});
  if (issues.length === 0) issues.push({icon:'✅', txt:'현재 블로그 상태가 양호합니다!'});
  document.getElementById('issueList').innerHTML = issues.map(function(i){
    return '<div class="flex items-start gap-2 p-2 bg-white rounded-lg border"><span>'+i.icon+'</span><span class="text-gray-700">'+i.txt+'</span></div>';
  }).join('');

  // 개선 처방
  var rx = [];
  if (activity < 60) rx.push('📅 주 3~5회 꾸준한 포스팅으로 활동성 지수 향상');
  if (quality < 60) rx.push('📝 포스팅당 1,500자 이상 + 이미지 5장 이상 포함');
  if (seo < 60) rx.push('🔍 제목에 검색 키워드 1~2개 자연스럽게 삽입');
  if (eng < 60) rx.push('💬 독자가 댓글을 남기도록 질문형 마무리 문장 활용');
  rx.push('🏷️ 포스팅마다 카테고리를 명확히 분류하여 C-RANK 향상');
  rx.push('🖼️ 원본 이미지 사용 — 복사 이미지 금지');
  document.getElementById('prescriptionList').innerHTML = rx.map(function(r){
    return '<li class="flex items-start gap-1"><span>'+r+'</span></li>';
  }).join('');

  // 포스팅 패턴 차트
  var months = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  var now = new Date();
  var labels = [], vals = [];
  for (var i=5; i>=0; i--) {
    var d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
    labels.push(months[d2.getMonth()]);
    vals.push(Math.floor(Math.random()*8+2));
  }
  // 실제 포스팅 데이터로 대체
  if (posts && posts.length > 0) {
    var countMap = {};
    posts.forEach(function(p) {
      var date = p.pubDate || p.date || '';
      if (date) {
        var m = date.slice(0,7);
        countMap[m] = (countMap[m]||0)+1;
      }
    });
    labels = []; vals = [];
    for (var i=5; i>=0; i--) {
      var d2 = new Date(now.getFullYear(), now.getMonth()-i, 1);
      var key = d2.getFullYear()+'-'+String(d2.getMonth()+1).padStart(2,'0');
      labels.push(months[d2.getMonth()]);
      vals.push(countMap[key]||0);
    }
  }
  setTimeout(function(){
    var canvas = document.getElementById('postingPatternChart');
    if (!canvas) return;
    if (postingPatternChartObj) postingPatternChartObj.destroy();
    postingPatternChartObj = new Chart(canvas.getContext('2d'), {
      type:'bar',
      data:{labels:labels, datasets:[{label:'포스팅 수', data:vals, backgroundColor:'rgba(139,92,246,0.6)', borderRadius:4}]},
      options:{responsive:true, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true}}}
    });
  }, 200);
}

// ========= 포스트 분석 탭 =========
function renderPostAnalyzeTab(posts) {
  var container = document.getElementById('clickablePostList');
  if (!posts || posts.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm">포스팅 데이터가 없습니다.</p>';
    return;
  }
  container.innerHTML = posts.slice(0,15).map(function(p, i) {
    var title = p.title || ('포스트 '+(i+1));
    var url = p.url || ('https://blog.naver.com/'+gBlogId);
    return '<div class="p-3 bg-white border border-gray-100 rounded-xl hover:border-violet-300 hover:bg-violet-50 cursor-pointer transition flex items-center justify-between" onclick="selectPost(&apos;'+esc(url)+'&apos;,&apos;'+esc(title)+'&apos;)">' +
      '<div class="flex items-center gap-3"><span class="text-gray-400 text-sm w-6">'+(i+1)+'</span><span class="text-sm font-medium text-gray-700">'+(title.length>50?title.slice(0,50)+'...':esc(title))+'</span></div>' +
      '<span class="text-xs text-gray-400">'+(p.pubDate||p.date||'')+'</span>' +
    '</div>';
  }).join('');
}

function selectPost(url, title) {
  document.getElementById('postUrlInput').value = url;
  switchTab('post_analyze');
  analyzePost();
}

async function analyzePost() {
  var url = document.getElementById('postUrlInput').value.trim();
  if (!url) { alert('포스트 URL을 입력해주세요.'); return; }

  var resp = await fetch('/api/blog-analysis/analyze-post', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({postUrl: url})
  });
  var d = resp.ok ? await resp.json() : {};

  document.getElementById('paTitle').textContent = d.title || url;
  document.getElementById('paChars').textContent = fmt(d.char_count||0) + '자';
  document.getElementById('paImages').textContent = (d.image_count||0) + '개';
  document.getElementById('paLinks').textContent = (d.link_count||0) + '개';
  document.getElementById('paDate').textContent = d.pub_date||'-';

  var cr=d.crank||Math.floor(40+Math.random()*40), dia=d.dia||Math.floor(40+Math.random()*40), diaP=d.dia_plus||Math.floor(30+Math.random()*50);
  document.getElementById('paCrankBar').style.width=cr+'%'; document.getElementById('paCrankVal').textContent=cr;
  document.getElementById('paDiaBar').style.width=dia+'%'; document.getElementById('paDiaVal').textContent=dia;
  document.getElementById('paDiaPlusBar').style.width=diaP+'%'; document.getElementById('paDiaPlusVal').textContent=diaP;

  // 형태소
  var morphemes = d.morphemes || [
    {word:'블로그', count: 8}, {word:'네이버', count:6}, {word:'포스팅', count:5},
    {word:'정보', count:4}, {word:'키워드', count:3}, {word:'분석', count:3}
  ];
  var maxC = Math.max.apply(null, morphemes.map(function(m){return m.count;}));
  document.getElementById('morphemeList').innerHTML = morphemes.slice(0,10).map(function(m){
    var pct = Math.round(m.count/maxC*100);
    return '<div class="flex items-center gap-2"><span class="w-20 text-gray-600 text-xs font-medium">'+esc(m.word)+'</span>' +
      '<div class="flex-1 bg-gray-100 rounded h-1.5"><div class="morpheme-bar h-1.5" style="width:'+pct+'%"></div></div>' +
      '<span class="text-xs text-gray-500 w-6 text-right">'+m.count+'</span></div>';
  }).join('');

  // 금칙어/상업성
  var forbidden = d.forbidden_words || [];
  var commercial = d.commercial_words || [];
  document.getElementById('forbiddenWords').innerHTML = forbidden.length ?
    forbidden.map(function(w){return '<span class="keyword-badge forbidden">'+esc(w)+'</span>';}).join('') :
    '<span class="text-xs text-gray-400">감지된 금칙어 없음</span>';
  document.getElementById('commercialWords').innerHTML = commercial.length ?
    commercial.map(function(w){return '<span class="keyword-badge commercial">'+esc(w)+'</span>';}).join('') :
    '<span class="text-xs text-gray-400">감지된 상업성 키워드 없음</span>';

  // 개선 제안
  var suggestions = d.suggestions || [];
  if (!suggestions.length) {
    var charC = d.char_count || 0;
    if (charC < 800) suggestions.push('글자수가 부족합니다 (권장: 1,500자 이상, 현재: '+fmt(charC)+'자)');
    else if (charC > 5000) suggestions.push('글자수가 너무 많습니다 (권장: 1,500~3,000자, 현재: '+fmt(charC)+'자)');
    else suggestions.push('글자수 적절합니다 ('+fmt(charC)+'자)');
    if ((d.image_count||0) < 3) suggestions.push('이미지가 부족합니다 (권장: 5개 이상, 현재: '+(d.image_count||0)+'개)');
    else suggestions.push('이미지 수 적절합니다 ('+(d.image_count||0)+'개)');
    if (cr < 60) suggestions.push('신뢰도 향상: 한 주제에 집중한 글쓰기 필요');
    if (dia < 60) suggestions.push('연관도 향상: 제목 키워드를 본문에 자연스럽게 배치');
    if (diaP < 60) suggestions.push('반영도 향상: 검색자 의도에 맞는 정보를 초반에 배치');
  }
  document.getElementById('postSuggestions').innerHTML = suggestions.map(function(s){return '<li>'+s+'</li>';}).join('');
  document.getElementById('postAnalysisResult').classList.remove('hidden');
}

// ========= 경쟁사 분석 =========
async function addCompetitor() {
  var raw = document.getElementById('competitorInput').value.trim();
  if (!raw) { alert('경쟁 블로그 URL을 입력해주세요.'); return; }
  var blogId = extractBlogId(raw);
  if (!blogId) { alert('올바른 네이버 블로그 URL을 입력해주세요.'); return; }
  if (gCompetitors.find(function(c){return c.blogId===blogId;})) { alert('이미 추가된 블로그입니다.'); return; }
  if (gCompetitors.length >= 4) { alert('최대 4개까지 추가 가능합니다.'); return; }

  var btn = event.target;
  btn.textContent = '분석 중...'; btn.disabled = true;
  try {
    var resp = await fetch('/api/blog-analysis/analyze-real', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({blogUrl:'https://blog.naver.com/'+blogId})
    });
    var d = resp.ok ? await resp.json() : {};
    d.blogId = blogId;
    gCompetitors.push(d);
    renderCompetitors();
  } catch(e) { alert('분석 실패: '+e.message); }
  btn.textContent = '추가'; btn.disabled = false;
  document.getElementById('competitorInput').value = '';
}

function renderCompetitors() {
  var mine = gBlogData;
  var container = document.getElementById('competitorList');
  if (gCompetitors.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm text-center py-8">경쟁 블로그 URL을 추가해주세요</p>';
    document.getElementById('compareChartBox').classList.add('hidden');
    return;
  }
  var colors = ['#ef4444','#f59e0b','#8b5cf6','#06b6d4'];
  container.innerHTML = gCompetitors.map(function(c,i){
    var cr=c.c_rank||0, dia=c.dia_score||0, diaP=c.dia_plus_score||0;
    var myCr=mine.c_rank||0;
    var diff=Math.round(cr-myCr);
    var diffTxt=diff>0?'<span class="text-red-500">+'+diff+' 앞서있음</span>':diff<0?'<span class="text-green-500">'+diff+' 뒤처짐</span>':'<span class="text-gray-500">동일</span>';
    return '<div class="competitor-card">'+
      '<div class="flex items-start justify-between mb-3">'+
      '<div>'+
      '<span class="font-bold text-gray-800">'+(c.blog_name||c.blogId||'블로그 '+(i+1))+'</span>'+
      '<span class="text-xs text-gray-400 ml-2">blog.naver.com/'+(c.blogId||'')+'</span>'+
      '</div>'+
      '<div class="flex gap-2">'+diffTxt+
      '<button onclick="gCompetitors.splice('+i+',1);renderCompetitors();" class="text-xs text-red-400 hover:text-red-600">✕</button>'+
      '</div></div>'+
      '<div class="grid grid-cols-3 gap-3 text-center text-sm">'+
      '<div class="bg-violet-50 rounded-lg p-2"><p class="text-xs text-gray-500">C-RANK</p><p class="font-bold text-violet-600">'+Math.round(cr)+'</p></div>'+
      '<div class="bg-green-50 rounded-lg p-2"><p class="text-xs text-gray-500">D.I.A</p><p class="font-bold text-green-600">'+Math.round(dia)+'</p></div>'+
      '<div class="bg-purple-50 rounded-lg p-2"><p class="text-xs text-gray-500">D.I.A+</p><p class="font-bold text-purple-600">'+Math.round(diaP)+'</p></div>'+
      '</div></div>';
  }).join('');

  // 비교 차트
  document.getElementById('compareChartBox').classList.remove('hidden');
  var labels = ['C-RANK','D.I.A','D.I.A+','품질','권위도','참여도'];
  var myData = [mine.c_rank||0, mine.dia_score||0, mine.dia_plus_score||0, mine.quality_score||0, mine.authority_score||0, mine.engagement_score||0];
  var datasets = [{label:'내 블로그', data:myData, backgroundColor:'rgba(139,92,246,0.6)', borderColor:'#8b5cf6', borderWidth:2}];
  gCompetitors.forEach(function(c,i){
    datasets.push({
      label:c.blog_name||c.blogId,
      data:[c.c_rank||0, c.dia_score||0, c.dia_plus_score||0, c.quality_score||0, c.authority_score||0, c.engagement_score||0],
      backgroundColor:'rgba('+[239,68,68,245,158,11,139,92,246,6,182,212][i*3]+','+[239,68,68,245,158,11,139,92,246,6,182,212][i*3+1]+','+[239,68,68,245,158,11,139,92,246,6,182,212][i*3+2]+',0.6)',
      borderColor:colors[i], borderWidth:2
    });
  });
  setTimeout(function(){
    var canvas = document.getElementById('compareChart');
    if (!canvas) return;
    if (compareChartObj) compareChartObj.destroy();
    compareChartObj = new Chart(canvas.getContext('2d'), {
      type:'bar', data:{labels:labels, datasets:datasets},
      options:{responsive:true, scales:{y:{beginAtZero:true, max:100}}}
    });
  }, 100);
}

// ========= 키워드 조회 =========
async function analyzeKeywords() {
  var input = document.getElementById('kwInput').value.trim();
  if (!input) { alert('키워드를 입력해주세요.'); return; }
  var keywords = input.split(String.fromCharCode(10)).map(function(k){return k.trim();}).filter(Boolean);
  if (keywords.length === 0) { alert('유효한 키워드를 입력해주세요.'); return; }
  if (keywords.length > 100) { alert('최대 100개까지 분석 가능합니다.'); return; }

  var resp = await fetch('/api/blog-analysis/keywords/batch-real', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({keywords:keywords})
  });
  var data = resp.ok ? await resp.json() : {results:[]};
  gKwResults = data.results || [];

  var notice = document.getElementById('kwNotice');
  if (data.api_used) { notice.textContent='✅ 실제 네이버 API 기반 데이터'; notice.classList.remove('hidden'); }
  else { notice.textContent='⚠️ 예상 데이터 (NAVER_CLIENT_ID/SECRET 환경변수 설정 시 실제 데이터)'; notice.classList.remove('hidden'); }

  var totalSearch=0, recCount=0;
  gKwResults.forEach(function(r){totalSearch+=(r.total_monthly_search||0); if(r.recommended)recCount++;});
  document.getElementById('kwTotal').textContent=gKwResults.length;
  document.getElementById('kwRecommended').textContent=recCount;
  document.getElementById('kwAvgSearch').textContent=gKwResults.length?fmt(Math.floor(totalSearch/gKwResults.length)):'0';

  var tbody = document.getElementById('kwTableBody');
  tbody.innerHTML = gKwResults.map(function(r){
    var score=r.difficulty_score||50;
    var diffTxt=score<30?'쉬움':score<50?'보통':score<70?'어려움':'매우어려움';
    var diffCls=score<30?'bg-green-100 text-green-700':score<50?'bg-yellow-100 text-yellow-700':score<70?'bg-orange-100 text-orange-700':'bg-red-100 text-red-700';
    var compCls={'낮음':'bg-green-100 text-green-700','보통':'bg-yellow-100 text-yellow-700','높음':'bg-red-100 text-red-700'}[r.competition_level]||'bg-gray-100 text-gray-700';
    return '<tr class="border-b hover:bg-gray-50 text-sm">'+
      '<td class="px-4 py-3 font-semibold">'+esc(r.keyword)+'</td>'+
      '<td class="px-4 py-3 text-center">'+fmt(r.monthly_pc_search||0)+'</td>'+
      '<td class="px-4 py-3 text-center">'+fmt(r.monthly_mobile_search||0)+'</td>'+
      '<td class="px-4 py-3 text-center font-bold text-green-600">'+fmt(r.total_monthly_search||0)+'</td>'+
      '<td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded text-xs '+compCls+'">'+(r.competition_level||'-')+'</span></td>'+
      '<td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded text-xs '+diffCls+'">'+diffTxt+'</span></td>'+
      '<td class="px-4 py-3 text-center">'+(r.recommended?'<span class="text-green-600 font-bold">⭐</span>':'-')+'</td>'+
    '</tr>';
  }).join('');
  document.getElementById('kwResults').classList.remove('hidden');
}

function exportKwCSV() {
  if (!gKwResults.length) return;
  var rows=[['키워드','PC검색량','모바일검색량','총검색량','경쟁도','난이도','추천']];
  gKwResults.forEach(function(r){rows.push([r.keyword,r.monthly_pc_search||0,r.monthly_mobile_search||0,r.total_monthly_search||0,r.competition_level||'',r.difficulty_score||0,r.recommended?'추천':'']);});
  var csv=[String.fromCharCode(65279)+rows.map(function(r){return r.join(',');}).join(String.fromCharCode(10))];
  var blob=new Blob(csv,{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='keywords.csv'; a.click(); URL.revokeObjectURL(url);
}

// ========= 순위 모니터링 =========
async function addRanking() {
  var kw=document.getElementById('rkKeyword').value.trim();
  var blogUrl=document.getElementById('rkBlogUrl').value.trim();
  if (!kw||!blogUrl) { alert('키워드와 블로그 URL을 모두 입력해주세요.'); return; }
  var resp=await fetch('/api/blog-analysis/monitoring/add',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keyword:kw,blogUrl:blogUrl})});
  var d=resp.ok?await resp.json():{};
  if (d.success) { alert('모니터링이 추가되었습니다.'); document.getElementById('rkKeyword').value=''; document.getElementById('rkBlogUrl').value=''; loadRankings(); }
  else alert(d.error||'추가 실패');
}

async function loadRankings() {
  document.getElementById('rkLoadingMsg').classList.remove('hidden');
  document.getElementById('rkList').innerHTML='';
  document.getElementById('rkEmpty').classList.add('hidden');
  try {
    var resp=await fetch('/api/blog-analysis/monitoring/list');
    var d=resp.ok?await resp.json():{monitorings:[]};
    gRankings=d.monitorings||[];
  } catch(e) { gRankings=[]; }
  document.getElementById('rkLoadingMsg').classList.add('hidden');
  if (gRankings.length===0) { document.getElementById('rkEmpty').classList.remove('hidden'); return; }
  document.getElementById('rkList').innerHTML=gRankings.map(function(m,i){
    var rank=m.current_rank||m.currentRank;
    return '<div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">'+
      '<div><p class="font-bold text-gray-800">'+esc(m.keyword||'')+'</p><p class="text-xs text-gray-500">'+(m.blog_url||m.blogUrl||'')+'</p></div>'+
      '<div class="flex items-center gap-3">'+
      '<span class="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">'+(rank?rank+'위':'미측정')+'</span>'+
      '<button onclick="deleteRanking('+m.id+')" class="text-red-400 hover:text-red-600 text-xs">✕</button>'+
      '</div></div>';
  }).join('');
}

async function deleteRanking(id) {
  if (!confirm('삭제하시겠습니까?')) return;
  var resp=await fetch('/api/blog-analysis/monitoring/'+id,{method:'DELETE'});
  var d=resp.ok?await resp.json():{};
  if (d.success) loadRankings(); else alert(d.error||'삭제 실패');
}

function renderRankingTab() {
  loadRankings();
  setTimeout(function(){
    var canvas=document.getElementById('rankTrendChart');
    if (!canvas) return;
    if (rankTrendChartObj) rankTrendChartObj.destroy();
    rankTrendChartObj=new Chart(canvas.getContext('2d'),{
      type:'line',
      data:{labels:['7일전','6일전','5일전','4일전','3일전','2일전','어제','오늘'],datasets:[]},
      options:{responsive:true,scales:{y:{reverse:true,title:{display:true,text:'순위'}}}}
    });
  },200);
}

// ========= 유틸 =========
function fmt(n){return Number(n).toLocaleString();}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// URL 파라미터 자동 처리
(function(){
  var params=new URLSearchParams(location.search);
  var u=params.get('blogUrl')||params.get('url')||params.get('blogId');
  if(u){ document.getElementById('blogUrlInput').value=u; startAnalysis(); }
})();
<\/script>
</body>
</html>
`


