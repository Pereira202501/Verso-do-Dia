const verseTextEl = document.getElementById('verse-text')

// Remove right-side settings UI if present
;(function removeSettingsUI(){
    const ids = ['settings-btn','settings-panel','settings-close','mode-select','theme-toggle']
    ids.forEach(id=>{
        const el = document.getElementById(id)
        if(el && el.parentNode) el.parentNode.removeChild(el)
    })
})()
const verseRefEl = document.getElementById('verse-ref')
const reflectionEl = document.getElementById('verse-reflection')
const copyBtn = document.getElementById('copy-btn')
const shareBtn = document.getElementById('share-btn')
const nextBtn = document.getElementById('next-btn')
const settingsBtn = document.getElementById('settings-btn')
const settingsPanel = document.getElementById('settings-panel')
const settingsClose = document.getElementById('settings-close')
const modeSelect = document.getElementById('mode-select')
const themeToggle = document.getElementById('theme-toggle')
const imageBtn = document.getElementById('image-btn')

let verses = []
let currentIndex = 0
const STORAGE_KEY = 'vdd_settings'

// util: seeded random based on string
function seededHash(str){
  let h = 2166136261 >>> 0
  for(let i=0;i<str.length;i++){
    h ^= str.charCodeAt(i)
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)
  }
  return h >>> 0
}

function shuffleArray(a, seed){
  const arr = a.slice()
  let random = seed ? seededHash(seed) : Math.floor(Math.random()*4294967295)
  for(let i = arr.length -1; i>0; i--){
    random = (random * 1664525 + 1013904223) >>> 0
    const j = random % (i+1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

async function loadVerses(){
  try{
    const res = await fetch('verses.json')
    if(!res.ok) throw new Error('Fetch retornou status ' + res.status)
    verses = await res.json()
    if(!Array.isArray(verses) || verses.length===0) throw new Error('Nenhum verso encontrado')
    setVerseForToday()
    return
  }catch(err){
    console.warn('Falha ao buscar verses.json, tentando carregar inline...', err)
    // Tentativa de fallback: ler um elemento <script type="application/json" id="verses-data"> no HTML
    try{
      const inline = document.getElementById('verses-data')
      if(inline && inline.textContent.trim()){
        const data = JSON.parse(inline.textContent)
        if(Array.isArray(data) && data.length>0){
          verses = data
          restoreSettings()
          applyModeAndSetVerse()
          return
        }
      }
    }catch(e){
      console.error('Erro ao parsear JSON inline', e)
    }

    // Se ainda não carregou, mostra mensagem mais útil
    verseTextEl.textContent = 'Erro ao carregar versos. Abra via servidor (ex: Live Server) ou permita fetch local.'
    verseRefEl.textContent = ''
    reflectionEl.textContent = ''
    console.error(err)
  }
}

function setVerse(i){
  const v = verses[i]
  verseTextEl.textContent = v.text
  verseRefEl.textContent = v.reference
  reflectionEl.textContent = v.reflection
  currentIndex = i
}

function setVerseForToday(){
  // deprecated: usa cálculo UTC para compatibilidade global
  const dayOfYear = getUTCDayOfYear(new Date())
  const idx = dayOfYear % verses.length
  setVerse(idx)
}

// Settings: rotation | seeded | random | shuffle | yearly
function applyModeAndSetVerse(){
  const settings = getSettings()
  let idx = 0
  if(settings.mode === 'rotation'){
    const dayOfYear = getUTCDayOfYear(new Date())
    idx = dayOfYear % verses.length
    setVerse(idx)
  }else if(settings.mode === 'seeded'){
    // usa data UTC (YYYY-MM-DD) como seed para que seja o mesmo globalmente
    const todayStr = new Date().toISOString().slice(0,10)
    const seed = todayStr
    const h = seededHash(seed)
    idx = h % verses.length
    setVerse(idx)
  }else if(settings.mode === 'random'){
    idx = Math.floor(Math.random()*verses.length)
    setVerse(idx)
  }else if(settings.mode === 'shuffle'){
    // persist an order in localStorage
    let order = localStorage.getItem('vdd_order')
    if(!order){
      const shuffled = shuffleArray(verses, String(Date.now()))
      order = JSON.stringify(shuffled.map(v=>v.reference))
      localStorage.setItem('vdd_order', order)
      localStorage.setItem('vdd_order_index', '0')
    }
    const orderArr = JSON.parse(order)
    let idxPos = parseInt(localStorage.getItem('vdd_order_index')||'0',10)
    if(idxPos >= orderArr.length) idxPos = 0
    const ref = orderArr[idxPos]
    const found = verses.findIndex(v=>v.reference===ref)
    if(found>=0){
      setVerse(found)
      localStorage.setItem('vdd_order_index', String(idxPos+1))
    }else{
      setVerse(0)
    }
  }else if(settings.mode === 'yearly'){
    // map each day of year to an index; if verses < 365, tile them
    const dayOfYear = getUTCDayOfYear(new Date())
    idx = dayOfYear % Math.max(1, Math.min(365, verses.length))
    setVerse(idx % verses.length)
  }else{
    setVerseForToday()
  }
}

// Retorna o dia do ano em UTC (0-based)
function getUTCDayOfYear(d){
  const year = d.getUTCFullYear()
  const start = Date.UTC(year,0,0)
  const now = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return Math.floor((now - start) / 86400000)
}

function getSettings(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY)
    if(raw) return JSON.parse(raw)
  }catch(e){}
  return {mode:'rotation', theme:'dark'}
}

function saveSettings(s){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

function restoreSettings(){
  const s = getSettings()
  if(modeSelect) modeSelect.value = s.mode || 'rotation'
  if(s.theme === 'light') document.body.classList.add('light')
  if(themeToggle) themeToggle.textContent = s.theme === 'light' ? 'Escuro' : 'Claro'
}

copyBtn.addEventListener('click', async () =>{
  const payload = `${verseTextEl.textContent} — ${verseRefEl.textContent}\n\n${reflectionEl.textContent}`
  try{
    await navigator.clipboard.writeText(payload)
    copyBtn.textContent = 'Copiado!'
    setTimeout(()=> copyBtn.textContent='Copiar',1400)
  }catch(e){
    alert('Não foi possível copiar automaticamente. Selecione o texto e copie manualmente.')
  }
})

shareBtn.addEventListener('click', ()=>{
  const text = `${verseTextEl.textContent} — ${verseRefEl.textContent}\n\n${reflectionEl.textContent}`
  const encoded = encodeURIComponent(text)
  const url = `https://api.whatsapp.com/send?text=${encoded}`
  window.open(url,'_blank')
})

if(nextBtn){
  nextBtn.addEventListener('click', ()=>{
    const next = (currentIndex + 1) % verses.length
    setVerse(next)
  })
}

// settings UI
if(settingsBtn && settingsPanel){
  settingsBtn.addEventListener('click', ()=>{
    const visible = settingsPanel.getAttribute('aria-hidden') === 'false'
    settingsPanel.setAttribute('aria-hidden', String(!visible))
  })
}
if(settingsClose && settingsPanel){
  settingsClose.addEventListener('click', ()=>{
    settingsPanel.setAttribute('aria-hidden','true')
  })
}
if(modeSelect){
  modeSelect.addEventListener('change',(e)=>{
    const s = getSettings()
    s.mode = e.target.value
    saveSettings(s)
    applyModeAndSetVerse()
  })
}
if(themeToggle){
  themeToggle.addEventListener('click', ()=>{
    const s = getSettings()
    if(document.body.classList.contains('light')){
      document.body.classList.remove('light')
      s.theme = 'dark'
      themeToggle.textContent = 'Claro'
    }else{
      document.body.classList.add('light')
      s.theme = 'light'
      themeToggle.textContent = 'Escuro'
    }
    saveSettings(s)
  })
}

// Generate PNG image with canvas
if(imageBtn){
  imageBtn.addEventListener('click', ()=>{
    const w = 1200, h = 630
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')
    // background
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || '#071024'
    ctx.fillRect(0,0,w,h)
    // card
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.06
    ctx.fillRect(60,60,w-120,h-120)
    ctx.globalAlpha = 1
    // text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 40px Arial'
    wrapText(ctx, verseTextEl.textContent, 120, 160, w-240, 44)
    ctx.font = 'italic 28px Arial'
    ctx.fillStyle = '#a0e9d3'
    ctx.fillText(verseRefEl.textContent, 120, h-160)
    ctx.font = '20px Arial'
    ctx.fillStyle = '#cfe9df'
    wrapText(ctx, reflectionEl.textContent, 120, h-120, w-240, 28)
    // export
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url; a.download = 'verso.png'
    a.click()
  })
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight){
  const words = text.split(' ')
  let line = ''
  for(let n=0;n<words.length;n++){
    const testLine = line + words[n] + ' '
    const metrics = ctx.measureText(testLine)
    const testWidth = metrics.width
    if(testWidth > maxWidth && n>0){
      ctx.fillText(line, x, y)
      line = words[n] + ' '
      y += lineHeight
    }else{
      line = testLine
    }
  }
  ctx.fillText(line, x, y)
}

// Inicializa
loadVerses()
