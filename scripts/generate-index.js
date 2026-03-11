#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const pagesDir = path.join(__dirname, '..', 'pages')
const indexPath = path.join(__dirname, '..', 'index.qmd')

function parseFrontMatter(content) {
  if (!content.startsWith('---')) return {}
  const end = content.indexOf('\n---', 3)
  if (end === -1) return {}
  const yaml = content.slice(3, end + 1)
  const lines = yaml.split(/\r?\n/)
  const data = {}
  // enhanced: handle simple key: value and simple lists (categories: - a\n - b)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/)
    if (m) {
      const k = m[1]
      let v = m[2]
      if (v === '') {
        // possible list following
        const arr = []
        let j = i + 1
        while (j < lines.length) {
          const lm = lines[j].match(/^\s*-\s*(.*)$/)
          if (lm) { arr.push(lm[1].trim()); j++; continue }
          break
        }
        if (arr.length) {
          data[k] = arr
          i = j - 1
          continue
        }
      }
      // strip quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      data[k] = v
    }
  }
  return data
}

function readPages() {
  const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.qmd'))
  const items = []
  for (const f of files) {
    const p = path.join(pagesDir, f)
    const content = fs.readFileSync(p, 'utf8')
    const fm = parseFrontMatter(content)
    const stats = fs.statSync(p)
    const title = fm.title || path.basename(f, '.qmd')
    // created: prefer front-matter date, fallback to filesystem birthtime or mtime
    const created = fm.date || (stats.birthtime && stats.birthtime.toISOString()) || stats.mtime.toISOString()
    const updated = stats.mtime.toISOString()
    const href = `pages/${path.basename(f, '.qmd')}.html`
    const description = fm.description || ''
    const categories = Array.isArray(fm.categories) ? fm.categories : (fm.categories ? [fm.categories] : [])
    let status = fm.status || (fm.draft && (fm.draft === true || fm.draft === 'true') ? 'Draft' : 'Completed')
    // normalize common synonyms
    if (typeof status === 'string' && status.trim().toLowerCase() === 'published') status = 'Completed'
    console.log('PAGE STATUS:', f, '->', status)
    items.push({ title, href, created, updated, description, categories, status, file: f })
  }
  return items
}

function groupByYear(items) {
  const map = {}
  for (const it of items) {
    const year = new Date(it.created).getFullYear() || 'Unknown'
    if (!map[year]) map[year] = []
    map[year].push(it)
  }
  // sort years desc
  const years = Object.keys(map).sort((a,b)=>b-a)
  for (const y of years) {
    map[y].sort((a,b)=> new Date(b.created) - new Date(a.created))
  }
  return { years, map }
}

function buildIndex(years, map) {
  const lines = []
  lines.push('---')
  lines.push('title: "Code notebook"')
  lines.push('format: html')
  lines.push('---')
  lines.push('')
  // heading and description removed per user request
  for (const y of years) {
    lines.push(`### ${y}`)
    lines.push('')
    // output an HTML table wrapped in a scrollable container for large lists
    lines.push(`<div class="index-table-wrap">`)
    // columns: icon, title, categories, created, updated, status
    lines.push(`<table class="index-table anytype">`)
    lines.push(`<thead><tr><th data-sort-key="title">Title</th><th data-sort-key="categories">Categories</th><th data-sort-key="created" style="width:130px">Created</th><th data-sort-key="updated" style="width:130px">Updated</th><th data-sort-key="status" style="width:96px">Status</th></tr></thead>`)
    lines.push(`<tbody>`)
    for (const it of map[y]) {
      // escape title (basic) and include link; include data-sort attributes for sorting
      const titleEsc = it.title.replace(/\|/g, '\\|')
      const cats = (it.categories && it.categories.length) ? it.categories.join(', ') : ''
      const created = (it.created||'').slice(0,10)
      const updated = (it.updated||'').slice(0,10)
      let status = (it.status||'').replace(/</g,'&lt;')
      if (!status || status.trim()==='') status = 'Completed'
      if (status.trim().toLowerCase() === 'published') status = 'Completed'
      const statusKey = status.toString().toLowerCase()
      lines.push(`<tr data-file="${it.file}"><td data-sort="${titleEsc.toLowerCase()}"><a href="${it.href}">${titleEsc}</a></td><td data-sort="${cats.toLowerCase()}">${cats}</td><td data-sort="${created}">${created}</td><td data-sort="${updated}">${updated}</td><td class="status" data-sort="${status.toLowerCase()}" data-status="${statusKey}"><span class="badge">${status}</span></td></tr>`)
    }
    lines.push(`</tbody></table>`)
    lines.push(`</div>`)
    lines.push('')
  }
  // small script to toggle shadow when scroll position > 0
  lines.push(`<script>
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('.index-table-wrap').forEach(function(w){
    function update(){ if(w.scrollTop>0) w.classList.add('scrolled'); else w.classList.remove('scrolled'); }
    w.addEventListener('scroll', update);
    update();
  });
});
</script>`)

  // script to handle column sorting and row-actions
  lines.push(`<script>
document.addEventListener('DOMContentLoaded', function(){
  // row-actions click handler (placeholder)
  document.querySelectorAll('.index-table.anytype tbody .row-actions').forEach(a => {
    a.addEventListener('click', function(){
      const tr = this.closest('tr'); alert('Row actions for ' + (tr.dataset.file || tr.querySelector('a')?.innerText))
    })
  })

  // sorting
  document.querySelectorAll('.index-table.anytype').forEach(function(table){
    const thead = table.querySelector('thead')
    let sortState = { col: -1, dir: 1 }
    thead.querySelectorAll('th').forEach(function(th, idx){
      if (!th.dataset.sortKey) return
      th.style.cursor = 'pointer'
      th.addEventListener('click', function(){
        const colIndex = idx
        // toggle direction if same col
        if (sortState.col === colIndex) sortState.dir = -sortState.dir; else { sortState.col = colIndex; sortState.dir = 1 }
        const tbody = table.querySelector('tbody')
        const rows = Array.from(tbody.querySelectorAll('tr'))
        rows.sort(function(a,b){
          const aCell = a.children[colIndex]
          const bCell = b.children[colIndex]
          const aVal = (aCell && (aCell.getAttribute('data-sort') || aCell.textContent)).trim().toLowerCase()
          const bVal = (bCell && (bCell.getAttribute('data-sort') || bCell.textContent)).trim().toLowerCase()
          if (!isNaN(Date.parse(aVal)) && !isNaN(Date.parse(bVal))) {
            return (new Date(aVal) - new Date(bVal)) * sortState.dir
          }
          if (aVal < bVal) return -1 * sortState.dir
          if (aVal > bVal) return 1 * sortState.dir
          return 0
        })
        // re-append
        rows.forEach(r=>tbody.appendChild(r))
        // update header classes
        thead.querySelectorAll('th').forEach(h=>{ h.classList.remove('sorted-asc','sorted-desc') })
        th.classList.add(sortState.dir===1 ? 'sorted-asc' : 'sorted-desc')
      })
    })
    // default sort: created descending (click twice programmatically)
    try {
      const createdTh = Array.from(thead.querySelectorAll('th')).find(t=>t.dataset.sortKey==='created')
      if (createdTh) { createdTh.click(); createdTh.click() }
    } catch(e) { /* ignore in older browsers */ }
  })
})
</script>`)
  lines.push('<!-- Generated by scripts/generate-index.js -->')
  lines.push('')
  return lines.join('\n')
}

function main(){
  const items = readPages()
  const { years, map } = groupByYear(items)
  const content = buildIndex(years, map)
  // normalize any remaining "Published" labels to "Completed" for consistency
  const fixed = content.replace(/data-sort="published"/gi, 'data-sort="completed"').replace(/data-status="published"/gi, 'data-status="completed"').replace(/>Published</g, '>Completed<')
  fs.writeFileSync(indexPath, fixed, 'utf8')
  console.log('Updated index.qmd with', items.length, 'pages across', years.length, 'years')
}

main()
