'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modules=[['dashboard','Start here','⌂'],['arrays','Arrays','▦'],['strings','Strings','Aa'],['singly','Singly linked list','⤳'],['doubly','Doubly linked list','⇄'],['circular','Circular singly linked list','↻'],['circularDoubly','Circular doubly linked list','⟳'],['stack','Stack','▤'],['practice','Write C','⌘'],['quiz','Knowledge check','◇'],['progress','Progress','◷']];
const descriptions={arrays:'See how values stay in order, one box at a time.',strings:'Put characters in boxes and see where the string ends.',singly:'Follow each pointer. See exactly how a list comes together.',doubly:'Two directions. Every connection has a matching connection.',circular:'Follow the tail back to the head. Learn where traversal stops.',circularDoubly:'A loop in both directions, with no loose ends.',stack:'Last in, first out. Watch every push and pop.'};
let learned;try{learned=JSON.parse(localStorage.getItem('pointer-progress')||'[]');if(!Array.isArray(learned))learned=[]}catch{learned=[]}
let topic='dashboard',values=[12,24,36,48],ids=[0,1,2,3],nextId=4,capacity=8,frames=[],frameIndex=0,timer=null,code='',currentView='visual';

let storageAvailable = true;
const savedExperiments = readSaved('pointer-experiments-v1', {});
const experiments = savedExperiments && typeof savedExperiments === 'object' && !Array.isArray(savedExperiments) ? savedExperiments : {};
let undoHistory = [], guidedStage = -1, allOperations = false, technicalOpen = false;
let operationTime = '—', operationSpace = 'O(1)', lastOperation = '';
let practiceDraft = readSaved('pointer-practice-draft', 'current->next = newNode;\nnewNode->next = current->next;');

const isList=()=>['singly','doubly','circular','circularDoubly'].includes(topic),isDouble=()=>['doubly','circularDoubly'].includes(topic),isCircular=()=>['circular','circularDoubly'].includes(topic);
function notify(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>$('#toast').classList.remove('show'),3200)}
function stop(){clearInterval(timer);timer=null;if($('#play'))$('#play').textContent='Auto play'}
function progress(){const count=modules.slice(1,8).filter(m=>learned.includes(m[0])).length;$('#side-progress').style.width=count/7*100+'%';$('#side-label').textContent=count+' of 7 modules learned';document.querySelectorAll('[data-topic]').forEach(b=>{const mark=b.querySelector('.nav-check');if(mark)mark.textContent=learned.includes(b.dataset.topic)?'✓':''})}
$('#theme').onclick=()=>{document.body.classList.toggle('light');try{localStorage.setItem('pointer-theme',document.body.classList.contains('light')?'light':'dark')}catch{}};try{if(localStorage.getItem('pointer-theme')==='light')document.body.classList.add('light')}catch{}
$('#complete').onclick=()=>{if(!learned.includes(topic))learned.push(topic);try{localStorage.setItem('pointer-progress',JSON.stringify(learned))}catch{}progress();$('#complete').textContent='✓ Learned';notify('Your progress has been saved.')};
const friendlyOperationNames = {traverse:'Visit each value',begin:'Add a value at the beginning',deleteBegin:'Remove the first value',insert:'Insert a value',delete:'Remove a value',reverse:'Reverse the order',compare:'Compare two strings',push:'Push a value',pop:'Pop the top value',peek:'Peek at the top'};
const operationNames={insert:'Insert at position',begin:'Insert at beginning',end:'Insert at end',after:'Insert after a node',delete:'Delete at position',deleteBegin:'Delete beginning',deleteEnd:'Delete end',deleteValue:'Delete by value',search:'Search for a value',traverse:'Traverse forward',backward:'Traverse backward',reverse:'Reverse',update:'Update value',push:'Push',pop:'Pop',peek:'Peek',compare:'Compare strings',copy:'Copy string',empty:'Create empty list'};
function operations(){if(isList())return ['insert','begin','end','after','delete','deleteBegin','deleteEnd','deleteValue','search','traverse',...(isDouble()?['backward']:[]),'reverse','empty'];if(topic==='arrays')return ['insert','begin','end','delete','update','search','traverse'];if(topic==='strings')return ['traverse','reverse','compare','copy'];return ['push','pop','peek']}
function workspace() {
    currentView = 'visual';
    const list = isList();
    const controls = experiments[topic]?.controls || {};
    const available = allOperations ? operations() : beginnerOperations();
    const selected = available.includes(controls.operation) ? controls.operation : defaultOperation();
    const visibleValues = frames.length ? frames[frameIndex].values : values;
    $('#content').innerHTML = `
        <div class="tabs" role="tablist" aria-label="Lesson views">
            <button class="active" data-view="visual" role="tab" aria-selected="true">Playground</button>
            <button data-view="concept" role="tab" aria-selected="false">Understand the idea</button>
            <button data-view="exercise" role="tab" aria-selected="false">Quick question</button>
        </div>
        <div id="view-content">
            <section id="learning-guide" class="learning-guide" aria-label="Your next learning step"></section>
            <div class="workspace ${technicalOpen ? 'show-technical' : ''}">
                <section class="panel diagram-panel">
                    <div class="panel-head"><h2>${list ? 'Follow the connections' : topic === 'strings' ? 'See the characters' : topic === 'stack' ? 'Watch the top of the stack' : 'See your array'}</h2><span class="tag" id="diagram-state">${frames.length ? 'Operation paused' : 'Ready to explore'}</span></div>
                    <div class="legend"><span><i class="dot green"></i>Current step</span>${list ? '<span><i class="dot"></i>Next connection</span>' : ''}${isDouble() ? '<span><i class="dot purple"></i>Previous connection</span>' : ''}</div>
                    <div class="visual" id="visual" data-kind="${topic}"></div>
                    <p class="visual-note selection-help">${list ? 'Click a node to choose its position. Position 0 is the first node.' : topic === 'strings' ? "The \\0 cell marks the end of the string." : topic === 'stack' ? 'The top is the most recently added value.' : 'Position 0 is the first box. Each box holds one value.'}<span class="scroll-help"> Scroll sideways to see more.</span></p>
                    <section class="step-explanation" aria-label="Explanation of the current step" aria-live="polite" aria-atomic="true">
                        <div class="step-kicker" id="step-kicker">Before you begin</div>
                        <h3 id="step-title"></h3><p id="explanation"></p>
                    </section>
                    <div class="playback">
                        <button id="back" aria-label="Previous step">Previous</button>
                        <button id="next" class="primary" aria-label="Next step">Next step</button>
                        <button id="play" title="Advance the steps automatically">Auto play</button>
                        <span class="step-count" id="step-count">Run an operation to begin</span>
                        <details class="playback-options"><summary>Playback options</summary><div>
                            <label for="speed">Time between steps</label><input id="speed" type="range" min="800" max="8000" value="${esc(controls.speed || 2500)}"><span id="speed-label"></span>
                            <button id="replay">Replay these steps</button>
                        </div></details>
                    </div>
                    <div id="next-activity" class="next-activity"></div>
                </section>
                <section class="panel operation-panel">
                    <div class="controls">
                        <h2>Try an operation</h2>
                        <div><label for="operation">What would you like to do?</label><select id="operation">${available.map(op => `<option value="${op}" ${op === selected ? 'selected' : ''}>${allOperations?operationNames[op]:friendlyOperationNames[op]||operationNames[op]}</option>`).join('')}</select></div>
                        <div class="control-grid">
                            <div id="value-field"><label for="value">${topic === 'strings' ? 'Compare with' : 'New value'}</label><input id="value" value="${esc(controls.value ?? (topic === 'strings' ? 'hello' : '18'))}" ${topic === 'strings' ? 'maxlength="30"' : 'type="number" step="1"'}></div>
                            <div id="position-field"><label for="position">Position</label><input id="position" type="number" min="0" value="${esc(controls.position ?? 1)}" step="1"></div>
                        </div>
                        <p class="hint" id="operation-hint"></p><p id="operation-error" class="error-message" role="alert" hidden></p>
                        <button class="primary" id="run">Run operation</button>
                        <button id="all-operations" class="text-button" aria-pressed="${allOperations}">${allOperations ? 'Show beginner operations' : 'Explore all operations'}</button>
                    </div>
                    <details class="custom-data" ${controls.customOpen ? 'open' : ''}><summary>Use your own values</summary><div>
                        <label for="custom">${topic === 'strings' ? 'Text' : 'Numbers separated by commas'}</label>
                        <input id="custom" value="${esc(controls.custom ?? (topic === 'strings' ? visibleValues.join('') : visibleValues.join(', ')))}">
                        ${!list ? `<label for="capacity">${topic === 'strings' ? 'Capacity, including the end marker' : 'Capacity in cells'}</label><input id="capacity" type="number" min="1" max="16" value="${esc(controls.capacity ?? capacity)}">` : ''}
                        <p class="hint">${topic === 'strings' ? 'Use basic English letters, numbers, and punctuation. Leave one extra cell for \\0.' : 'Use up to 10 whole numbers. Replacing the example can be undone.'}</p>
                        <p id="custom-error" class="error-message" role="alert" hidden></p><button id="create">Use these values</button>
                    </div></details>
                    <div class="experiment-actions"><button id="undo">Undo last change</button><button id="reset">Reset example</button><p>Reset restores the example for this lesson. Undo brings your previous values back.</p></div>
                </section>
            </div>
            <details class="technical-details" id="technical" ${technicalOpen ? 'open' : ''}>
                <summary>Explore C code, memory, and complexity <span>Optional detail</span></summary>
                <div class="stat-row"><span>Elements <b id="size"></b></span><span>Time <b id="complexity">${esc(operationTime)}</b></span><span>Extra space <b id="space">${esc(operationSpace)}</b></span></div>
                <div class="below">
                    <section class="panel"><div class="code-header"><span id="code-name">${list ? 'linked_list.c' : topic + '.c'}</span><button id="copy-code">Copy C code</button></div><div class="code-lines" id="code"></div></section>
                    <section class="panel explanation"><h3>Memory inspector</h3><p class="hint">These addresses are simulated. The array model uses 4 bytes per int.</p><div class="callout" id="inspector"></div></section>
                </div>
            </details>
            <details class="lesson-notes"><summary>Key ideas to remember</summary><div class="concept-strip" id="concept-strip"></div></details>
        </div>`;

    $('#operation').onchange = updateOperationFields;
    $('#all-operations').hidden = beginnerOperations().length === operations().length;
    updateOperationFields();
    $('#run').onclick = () => { prepare(false); if (!$('#next').disabled) $('#next').focus(); };
    $('#create').onclick = create;
    $('#reset').onclick = resetExample;
    $('#undo').onclick = undoChange;
    $('#next').onclick = () => step(1);
    $('#back').onclick = () => step(-1);
    $('#play').onclick = play;
    $('#replay').onclick = () => { stop(); if (frames.length) { frameIndex = 0; render(frames[0]); } };
    $('#all-operations').onclick = () => {
        saveExperiment(); allOperations = !allOperations;
        if (allOperations && guidedStage >= 0 && guidedStage < 4) guidedStage = -1;
        saveExperiment(); workspace();
    };
    $('#speed').oninput = () => { $('#speed-label').textContent = (Number($('#speed').value) / 1000).toFixed(1) + ' seconds'; if (timer) { stop(); play(); } saveExperiment(); };
    $('#speed').oninput();
    $('#technical').ontoggle = () => {
        const detail = $('#technical'); if (!detail) return; technicalOpen = detail.open;
        $('.workspace').classList.toggle('show-technical', technicalOpen);
        render(frames.length ? frames[frameIndex] : undefined); saveExperiment();
    };
    $('#copy-code').onclick = async () => { try { await navigator.clipboard.writeText(code); notify('C code copied.'); } catch { notify('Select the code text to copy it.'); } };
    document.querySelectorAll('[data-view]').forEach(b => {
        b.onclick = () => tab(b.dataset.view);
        b.onkeydown = event => {
            const views = ['visual', 'concept', 'exercise']; const index = views.indexOf(b.dataset.view);
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            tab(views[next]); $('[data-view="' + views[next] + '"]').focus();
        };
    });
    for (const selector of ['#value', '#position', '#custom', '#capacity']) {
        const input = $(selector); if (input) input.oninput = saveExperiment;
    }
    $('.custom-data').ontoggle = saveExperiment;
    const restoredCode = code || baseCode();
    setCode(restoredCode);
    if (frames.length) render(frames[frameIndex]); else { render(); intro(); }
    conceptCards(); refreshLearning();
}

function create(){stop();clearErrors();const before=structureSnapshot();if(topic==='strings'&&Array.from($('#custom').value).some(c=>c.codePointAt(0)>127)){reportCustomError('Use basic English letters, numbers, and punctuation. Other characters need a different byte representation.');return}let v=topic==='strings'?Array.from($('#custom').value):$('#custom').value.trim()===''?[]:$('#custom').value.split(',').map(s=>Number(s.trim()));if(topic!=='strings'&&$('#custom').value.trim()!==''&&$('#custom').value.split(',').some(s=>!s.trim())){reportCustomError('Each comma-separated entry needs an integer.');return}if(v.length>10||v.some(x=>typeof x==='number'&&(!Number.isInteger(x)||x<-2147483648||x>2147483647))){reportCustomError('Use at most 10 valid C integers.');return}if(!isList()){let c=Number($('#capacity').value);if(!Number.isInteger(c)||c<1||c>16){reportCustomError('Capacity must be between 1 and 16.');return}if(v.length+(topic==='strings'?1:0)>c){reportCustomError(topic==='strings'?'This text needs '+(v.length+1)+' cells, including its \\0 end marker. Increase capacity.':'These '+v.length+' values need more than '+c+' cells. Increase capacity or use fewer values.');return}capacity=c}undoHistory.push(before);undoHistory=undoHistory.slice(-20);values=v;ids=v.map(()=>nextId++);frames=[];frameIndex=0;operationTime='—';operationSpace='O(1)';lastOperation='';render();setCode(baseCode());intro();refreshLearning();notify('Starting values replaced. Undo can restore the previous example.');}
function addr(id){return '0x'+(0x1000+id*0x30).toString(16)}
function render(f){const data=f?f.values:values,ident=f?f.ids:ids,focus=f?.focus??-1;let html='';if(isList()){html='<div class="nodes">';if(!data.length)html+='<span class="empty">head → NULL &nbsp; · &nbsp; tail → NULL</span>';data.forEach((v,i)=>{const naturalNext=i+1<data.length?ident[i+1]:isCircular()?ident[0]:null;const naturalPrev=i>0?ident[i-1]:isCircular()?ident[ident.length-1]:null;const nextId=f?.links&&ident[i] in f.links?f.links[ident[i]]:naturalNext;const prevId=f?.prevLinks&&ident[i] in f.prevLinks?f.prevLinks[ident[i]]:naturalPrev;const next=nextId===null?'NULL':addr(nextId);const prev=prevId===null?'NULL':addr(prevId);html+=`<div class="node-wrap ${i===focus?'focus':''} ${f?.newIndex===i?'new':''}" role="button" tabindex="0" aria-label="Select node ${i}, value ${esc(v)}" data-node="${i}" data-id="${ident[i]}" data-next="${nextId===null?'null':nextId}" data-prev="${prevId===null?'null':prevId}">${i===0?'<div class="pointer-label">'+(data.length===1?'head / tail ↓':'head ↓')+'</div>':i===data.length-1?'<div class="pointer-label">tail ↓</div>':''}<div class="node">${isDouble()?`<span class="ptr prev" title="prev = ${prev}"><small>Prev</small>←</span>`:''}<span><small>Data</small>${esc(v)}</span><span class="ptr" title="next = ${next}"><small>Next</small>↗</span></div><div class="position-label">Position ${i}</div><div class="address">${addr(ident[i])}</div></div>${i<data.length-1?'<div class="arrow">⟶'+(isDouble()?'<small>⟵</small>':'')+'</div>':!isCircular()?'<div class="arrow">⟶</div><span class="null">NULL</span>':''}`});html+='</div>';if(isCircular()&&data.length)html+=`<div class="cycle">${isDouble()?'← head.prev = tail · ':''}tail.next = head ↶</div>`;if(f?.ghost)html+=`<div style="margin:38px auto 0;display:flex;align-items:center;gap:15px;width:max-content"><div class="node-wrap new"><div class="node"><span><small>New node</small>${esc(f.ghost.value)}</span><span class="ptr"><small>Next</small>${esc(technicalOpen?f.ghost.next:f.ghost.next==='?'?'?':f.ghost.next==='NULL'?'NULL':'↗')}</span></div></div><span style="color:var(--green);font:10px monospace">${esc(technicalOpen?f.ghost.label:f.ghost.next==='?'?'Make a new node':'Connect to the next node')}</span></div>`;
}else{html=`<div class="nodes ${topic==='stack'?'stack-nodes':''}">`;let cells=topic==='strings'?[...data,'\\0',...Array(technicalOpen?Math.max(0,capacity-data.length-1):0).fill(null)]:topic==='stack'?data:[...data,...Array(technicalOpen?Math.max(0,capacity-data.length):0).fill(null)];cells.forEach((v,i)=>html+=`<div class="node-wrap ${i===focus?'focus':''}"><div class="node" style="border-radius:6px;${v===null?'opacity:.35':''}"><span><small>${topic==='stack'?'int':i}</small>${v===null?'·':esc(v)}</span></div>${topic==='stack'&&i===data.length-1?'<div class="pointer-label">top →</div>':''}<div class="address">0x${(0x2000+i*(topic==='strings'?1:4)).toString(16)}</div></div>`);if(!cells.length)html+='<span class="empty">'+(topic==='stack'?'No values yet. Push a value to begin.':'No values yet. Insert a value to begin.')+'</span>';html+='</div>'}
$('#visual').innerHTML=html;if(isList())drawPointers(f);$('#size').textContent=(f?.logicalLength??data.length)+(topic==='strings'?' / '+capacity+' bytes':!isList()?' / '+capacity:' nodes');document.querySelectorAll('[data-node]').forEach(n=>{n.onclick=()=>{$('#position').value=n.dataset.node;notify('Position '+n.dataset.node+' selected.');saveExperiment()};n.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();n.onclick()}}});if(f){$('#step-count').textContent=`Step ${frameIndex+1} of ${frames.length}`;$('#step-kicker').textContent='This step';const teaching=technicalOpen?f:beginnerFrame(f);$('#step-title').textContent=teaching.title;$('#explanation').textContent=teaching.text;$('#inspector').textContent=f.inspect||memoryInfo(data,ident,f.logicalLength??data.length);if(isList()&&focus>=0&&ident[focus]!==undefined){const node=$('#visual').querySelector('[data-node="'+focus+'"]');$('#inspector').textContent+=' · current = '+addr(ident[focus])+' · next = '+(node.dataset.next==='null'?'NULL':addr(Number(node.dataset.next)))+(isDouble()?' · prev = '+(node.dataset.prev==='null'?'NULL':addr(Number(node.dataset.prev))):'');}highlight(f.line);$('#back').disabled=frameIndex===0;$('#next').disabled=frameIndex===frames.length-1}refreshLearning();}
function memoryInfo(data,ident,logicalLength=data.length){return isList()?`head = ${data.length?addr(ident[0]):'NULL'} · tail = ${data.length?addr(ident[ident.length-1]):'NULL'} · ${data.length} live allocations`:`length = ${logicalLength} · capacity = ${capacity}${topic==='strings'?' · terminator at index '+data.length:''}`}
function intro() {
    const copy = {
        arrays: ['Values in boxes', 'An array keeps its values in order. Start by visiting each box.'],
        strings: ['Characters in boxes', 'Each box holds a character. The \\0 cell marks where the string ends.'],
        stack: ['Last added, first removed', 'Push adds a value to the top. Pop removes the top value.'],
    };
    const [title, text] = copy[topic] || (isCircular()?['Follow the loop', 'The last node connects back to the first. Visit every node once, then stop when you return to the start.']:['Follow one connection', 'Each box is a node. Its next connection leads to the following node. NULL marks the end. Start by visiting the nodes.']);
    $('#step-kicker').textContent = 'Before you begin'; $('#step-title').textContent = title; $('#explanation').textContent = text;
    $('#inspector').textContent = memoryInfo(values, ids); $('#step-count').textContent = 'Run an operation to begin';
    $('#back').disabled = true; $('#next').disabled = true;
}
function conceptCards(){$('#concept-strip').innerHTML=(isList()?[['Pointers store addresses','The data field stores a value. The next field stores the address of another node.'],[isCircular()?'A loop with a stopping rule':'The end of the chain',isCircular()?'Stop after returning to the starting node. An empty list still has head == NULL.':'The final next pointer is NULL. An empty list has head == NULL.'],[isDouble()?'Keep both links consistent':'Order matters',isDouble()?'If A->next is B, then B->prev must be A. Update both neighbors on insertion and deletion.':'Save the next node before redirecting a link. Otherwise the remaining list becomes unreachable.']]:topic==='strings'?[['One extra byte','The null terminator marks the end. A five-character string needs at least six bytes.'],['Safe input','fgets(buffer, sizeof buffer, stdin) bounds input and appends a terminator on success.'],['Characters vs. strings',"'a' is one character. \"a\" is an array with 'a' and '\\0'."]]:topic==='stack'?[['Last in, first out','Push adds an element at the top. Pop removes the most recently pushed element.'],['Watch the bounds','Check capacity before push. Check top >= 0 before pop or peek.'],['Constant-time operations','Array-based push, pop and peek take O(1) time.']]:[['Contiguous memory','In this model, address[i] = base + i × 4. Real sizeof(int) is implementation-dependent.'],['Capacity vs. length','Capacity is the allocated number of cells. Length counts the cells currently in use.'],['Shifting takes time','Insertion and deletion may move multiple elements. Access by index takes O(1).']]).map(([h,p])=>`<article class="concept"><h3>${h}</h3><p>${esc(p)}</p></article>`).join('')}
function baseCode(){if(isList())return `#include <stdio.h>\n#include <stdlib.h>\n#include <stddef.h>\n\nstruct Node {\n    int data;\n${isDouble()?'    struct Node *prev;\n':''}    struct Node *next;\n};\n\nstruct Node *head = NULL;\nstruct Node *tail = NULL;\n\n/* Each node is allocated with malloc.\n   Free every allocation when it is removed. */`;if(topic==='strings')return '#include <stdio.h>\n#include <string.h>\n\nchar buffer['+capacity+'];\nif (fgets(buffer, sizeof buffer, stdin) != NULL) {\n    buffer[strcspn(buffer, "\\n")] = \'\\0\';\n    printf("%s\\n", buffer);\n}\n/* Statements belong inside main or another function. */';return topic==='stack'?'#define CAPACITY '+capacity+'\nint stack[CAPACITY] = {'+(values.length?values.join(', '):'0')+'};\nint top = '+(values.length-1)+';\n\n/* Push and pop must check bounds first. */':'#include <stddef.h>\n#define CAPACITY '+capacity+'\nint array[CAPACITY] = {'+(values.length?values.join(', '):'0')+'};\nsize_t length = '+values.length+';\n\n/* array[i] lives at base + i * sizeof(int). */'}
function setCode(s){code=s;$('#code-name').textContent=isList()?'linked_list.c':topic+'.c';$('#code').innerHTML=s.split('\n').map((line,i)=>`<div class="code-line" data-line="${i+1}"><span class="line-number">${i+1}</span>${syntax(line)}</div>`).join('')}
function syntax(line){if(line.trim().startsWith('//')||line.trim().startsWith('/*')||line.trim().startsWith('*'))return '<span class="comment">'+esc(line)+'</span>';return esc(line).replace(/\b(struct|int|void|char|size_t|if|else|for|while|do|return|NULL|const)\b/g,'<span class="kw">$1</span>').replace(/\b(malloc|free|printf|fgets|strcmp|memcpy|strlen)\b/g,'<span class="fn">$1</span>')}
function highlight(line){document.querySelectorAll('.code-line').forEach(n=>n.classList.toggle('active',Number(n.dataset.line)===line))}
function step(d){stop();if(!frames.length){prepare(false);return}frameIndex=Math.max(0,Math.min(frames.length-1,frameIndex+d));render(frames[frameIndex])}
function play(){if(timer){stop();return}if(!frames.length)prepare(false);if(!frames.length)return;if(frameIndex===frames.length-1)frameIndex=0;render(frames[frameIndex]);$('#play').textContent='Pause';timer=setInterval(()=>{if(frameIndex>=frames.length-1){stop();return}frameIndex++;render(frames[frameIndex])},Number($('#speed').value))}
function prepare(auto=false){stop();clearErrors();if(frames.length&&frameIndex<frames.length-1){notify('Finish the current steps or undo this operation before running another one.');return}const op=$('#operation').value;let p=Number($('#position').value),v=topic==='strings'?$('#value').value:Number($('#value').value);if(topic!=='strings'&&['insert','begin','end','after','push','update','search','deleteValue'].includes(op)&&(!Number.isInteger(v)||v<-2147483648||v>2147483647||$('#value').value===''))return reportError('Enter a valid C int value.');if(['insert','after','delete','update'].includes(op)&&(!Number.isInteger(p)||$('#position').value===''))return reportError('Enter a whole-number position. Position 0 is the first value.');if(op==='begin')p=0;if(op==='end')p=values.length;if(op==='after'){if(p<0||p>=values.length)return reportError('Select an existing node first.');p++}if(op==='deleteBegin')p=0;if(op==='deleteEnd')p=values.length-1;if(op==='deleteValue')p=values.indexOf(v);if(['insert','begin','end','after'].includes(op)&&(p<0||p>values.length))return reportError('Insertion position must be between 0 and '+values.length+'.');if(['delete','deleteBegin','deleteEnd','deleteValue','update'].includes(op)&&(p<0||p>=values.length))return reportError(op==='deleteValue'?'Value not found.':'Select an existing position.');if(['pop','peek'].includes(op)&&!values.length)return reportError('Stack underflow. There is no element to read.');if(['insert','begin','end','after','push'].includes(op)&&values.length>=10)return reportError('This diagram supports 10 values. Remove one before adding another.');if(['insert','begin','end','after','push'].includes(op)&&!isList()&&values.length>=capacity)return reportError('The buffer is full. Delete a value or increase capacity under Use your own values.');if(topic==='strings'&&op==='compare'&&[...values,...Array.from(v)].some(ch=>ch.codePointAt(0)>127))return reportError('Use ASCII characters for this comparison so each character matches one C byte.');const before=structureSnapshot();lastOperation=op;frames=[];frameIndex=0;const a=values.slice(),id=ids.slice();let links={},prevLinks={};function add(title,text,focus=-1,line=0,extra={}){frames.push({title,text,focus,line,values:a.slice(),ids:id.slice(),logicalLength:topic==='arrays'&&['insert','begin','end'].includes(op)&&title!=='Write the new value'?before.values.length:a.length,links:{...links},prevLinks:{...prevLinks},...extra})}let s='',complexity='O(n)',space='O(1)';
add('Start with the current state','Inspect the original structure before any changes.');
if(isList()){
if(['insert','begin','end','after'].includes(op)){
const d=isDouble(),c=isCircular();s=`/* Assumes the Node definition, head and tail above.\n   Positions are zero-based. Returns 0 on failure. */\nint insert_at(size_t position, int value) {\n    size_t n = 0;\n    struct Node *cur = head;\n    if (cur != NULL) {\n        do { n++; cur = cur->next; }\n        while (cur != ${c?'head':'NULL'});\n    }\n    if (position > n) return 0;\n    struct Node *node = malloc(sizeof *node);\n    if (node == NULL) return 0;\n    node->data = value;\n    if (n == 0) {\n        node->next = ${c?'node':'NULL'};\n${d?'        node->prev = '+(c?'node':'NULL')+';\n':''}        head = tail = node;\n    } else {\n        struct Node *before = ${c?'tail':'NULL'};\n        cur = head;\n        for (size_t i = 0; i < position; i++) {\n            before = cur; cur = cur->next;\n        }\n        node->next = cur;\n${d?'        node->prev = before;\n':''}        if (position == 0) head = node;\n        else before->next = node;\n${d?'        if (cur != NULL) cur->prev = node;\n':''}        if (position == n) tail = node;\n${c?'        tail->next = head;\n'+(d?'        head->prev = tail;\n':''):''}    }\n    return 1;\n}`;
for(let i=0;i<p;i++)add('Find the insertion point',`Advance current to position ${i+1}. Keep the preceding node available.`,i,s.split('\n').findIndex(x=>x.includes('before = cur;'))+1);
const nid=nextId++,successor=p<a.length?addr(id[p]):c&&a.length?addr(id[0]):'NULL';add('Allocate a new node','malloc reserves heap memory. Always check for NULL before writing fields.',-1,s.split('\n').findIndex(x=>x.includes('malloc'))+1,{ghost:{value:v,next:'?',label:'allocation succeeded'}});add('Save the successor first',`Set node->next to ${successor}. The old connection is still intact.`,Math.max(0,p-1),s.split('\n').findIndex(x=>x.includes('node->next = cur'))+1,{ghost:{value:v,next:successor,label:'new connection → '+successor},inspect:`node->next = ${successor}; existing links have not changed`});if(d)add('Set the backward connection',`node->prev points to ${p>0?addr(id[p-1]):c&&id.length?addr(id[id.length-1]):'NULL'}. Neighbor links are updated next.`,p-1,s.split('\n').findIndex(x=>x.includes('node->prev = before'))+1,{ghost:{value:v,next:successor,label:'prev and next initialized'}});const oldPrev=p>0?id[p-1]:c&&id.length?id[id.length-1]:null;if(c&&p===0&&id.length)links[id[id.length-1]]=id[0];if(d&&p<a.length)prevLinks[id[p]]=oldPrev;a.splice(p,0,v);id.splice(p,0,nid);add('Connect the new node',p===0?'Move head to the new node.':'Redirect the predecessor next pointer to the new node.',p,s.split('\n').findIndex(x=>x.includes(a.length===1?'head = tail = node':p===0?'if (position == 0) head':'else before->next'))+1,{newIndex:p});if(d){prevLinks={};add('Repair the neighbor prev pointer','The successor prev now points to the new node. Both directions agree.',p,s.split('\n').findIndex(x=>x.includes('cur->prev'))+1);}if(c){links={};add('Close the circular link','Set tail->next = head'+(d?' and head->prev = tail.':'.')+' Traversal can now return to its starting point.',p,s.split('\n').findIndex(x=>x.includes('tail->next = head'))+1);}add('Insertion complete','All nodes remain reachable. No existing allocation was lost.',p);complexity='O(n)';space='O(1)';
}else if(['delete','deleteBegin','deleteEnd','deleteValue'].includes(op)){
const d=isDouble(),c=isCircular();s=`/* Assumes head, tail and the Node definition. */\nint delete_at(size_t position) {\n    if (head == NULL) return 0;\n    struct Node *victim = head;\n    struct Node *before = ${c?'tail':'NULL'};\n    for (size_t i = 0; i < position; i++) {\n        before = victim; victim = victim->next;\n        if (victim == ${c?'head':'NULL'}) return 0;\n    }\n    if (head == tail) {\n        head = tail = NULL;\n    } else {\n        struct Node *after = victim->next;\n        if (victim == head) head = after;\n        else before->next = after;\n${d?'        if (after != NULL) after->prev = before;\n':''}        if (victim == tail) tail = before;\n${c?'        tail->next = head;\n'+(d?'        head->prev = tail;\n':''):d?'        head->prev = NULL;\n':''}    }\n    free(victim);\n    return 1;\n}`;
for(let i=0;i<=p;i++)add('Locate the node to remove',`Position ${i}${i===p?' is the target. Keep its address until free.':': advance to the next node.'}`,i,7);const victim=addr(id[p]);add('Save the neighboring pointers','Keep the successor address before changing links. Do not free the node yet.',p,s.split('\n').findIndex(x=>x.includes('struct Node *after'))+1,{inspect:`victim = ${victim} · next = ${p+1<id.length?addr(id[p+1]):c?addr(id[0]):'NULL'}`});const removedId=id[p];if(c&&p===0&&id.length>1)links[id[id.length-1]]=removedId;if(d&&p+1<a.length)prevLinks[id[p+1]]=removedId;a.splice(p,1);id.splice(p,1);add('Bypass the victim',a.length?'Update head or predecessor->next so the remaining chain stays reachable.':'Deleting the only node sets both head and tail to NULL.',Math.min(p,a.length-1),s.split('\n').findIndex(x=>x.includes('else before->next'))+1,{inspect:`Detached allocation ${victim} still exists. It is safe to free after repairing the remaining links.`});if(d&&a.length){prevLinks={};add('Repair the backward link','Reconnect the successor prev pointer. Update head->prev when deleting the first node.',Math.min(p,a.length-1),s.split('\n').findIndex(x=>x.includes('after->prev'))+1);}if(c&&a.length){links={};add('Restore the loop','The tail must reference the new head'+(d?', and the head must reference the tail.':'.'),0,s.split('\n').findIndex(x=>x.includes('tail->next = head'))+1);}add('Free the detached allocation',`free(victim) releases ${victim}. Never dereference victim after this line.`, -1,s.split('\n').findIndex(x=>x.includes('free(victim)'))+1);add('Deletion complete','All remaining nodes are linked correctly. The removed allocation has been released.');
}else if(op==='empty'){
s=`void clear_list(void) {\n${isCircular()?'    if (tail != NULL) tail->next = NULL;\n':''}    struct Node *cur = head;\n    while (cur != NULL) {\n        struct Node *next = cur->next;\n        free(cur);\n        cur = next;\n    }\n    head = tail = NULL;\n}`;while(a.length){add('Save next, then free',`Save the next address before freeing ${addr(id[0])}.`,0);a.shift();id.shift();add('Advance to the saved successor','The released node is no longer accessible.',0)}add('The list is empty','head and tail are NULL. Every allocation was freed.');
}else if(op==='reverse'){
s=`void reverse_list(void) {\n    if (head == NULL) return;\n    struct Node *old_head = head;\n    struct Node *prev = ${isCircular()?'tail':'NULL'};\n    struct Node *cur = head;\n    do {\n        struct Node *next = cur->next;\n        cur->next = prev;\n${isDouble()?'        cur->prev = next;\n':''}        prev = cur;\n        cur = next;\n    } while (cur != ${isCircular()?'old_head':'NULL'});\n    head = prev;\n    tail = old_head;\n}`;for(let i=0;i<a.length;i++){links[id[i]]=i?id[i-1]:isCircular()?id[id.length-1]:null;if(isDouble())prevLinks[id[i]]=i+1<id.length?id[i+1]:isCircular()?id[0]:null;add('Reverse one connection',`Save next at ${addr(id[i])}, then set current->next to ${i?addr(id[i-1]):isCircular()?addr(id[id.length-1]):'NULL'}. ${isDouble()?'Swap its prev direction as well.':''}`,i,s.split('\n').findIndex(x=>x.includes('cur->next = prev'))+1,{inspect:'The arrow now shows the reversed pointer. The saved next pointer keeps the unreversed nodes reachable.'});}a.reverse();id.reverse();links={};prevLinks={};add('Move head and tail','The original tail is now head. The original head is now tail.',0,s.split('\n').findIndex(x=>x.includes('head = prev'))+1);
}else{
const backwards=op==='backward',search=op==='search';s=`${search?'struct Node *find(int value)':'void traverse(void)'} {\n    struct Node *cur = ${backwards?'tail':'head'};\n    if (cur == NULL) ${search?'return NULL':'return'};\n    do {\n${search?'        if (cur->data == value) return cur;':'        printf("%d ", cur->data);'}\n        cur = cur->${backwards?'prev':'next'};\n    } while (cur != ${isCircular()?(backwards?'tail':'head'):'NULL'});\n${search?'    return NULL;\n':''}}`;let found=false;const order=a.map((_,i)=>i);if(backwards)order.reverse();for(const i of order){add(search?'Compare the data':'Visit the node',search?`${a[i]} ${a[i]===v?'matches':'does not match'} ${v}.`:`Read ${a[i]}, then follow ${backwards?'prev':'next'}.`,i,5);if(search&&a[i]===v){found=true;break}}add(search?(found?'Value found':'Value not found'):'Traversal complete',search?(found?'Return the address of the matching node.':'Return NULL. Every node was checked.'):(isCircular()?'The pointer returned to the start. do...while visits the start once, including in a one-node ring.':'The pointer reached NULL, so traversal stops.'),-1,7);}
}else if(topic==='arrays'){
if(['insert','begin','end'].includes(op)){s=`/* Requires 0 <= position <= length and length < CAPACITY. */\nif (position <= length && length < CAPACITY) {\n    for (size_t i = length; i > position; i--) {\n        array[i] = array[i - 1];\n    }\n    array[position] = value;\n    length++;\n}`;a.push(null);id.push(nextId++);for(let i=a.length-1;i>p;i--){a[i]=a[i-1];add('Shift right',`Copy index ${i-1} into index ${i}. Work from right to left to avoid overwriting values.`,i,4)}a[p]=v;add('Write the new value',`Store ${v} at index ${p} and increase length.`,p,6);complexity=p===values.length?'O(1)':'O(n)'}else if(op==='delete'){s='if (position < length) {\n    for (size_t i = position; i + 1 < length; i++) {\n        array[i] = array[i + 1];\n    }\n    length--;\n}';for(let i=p;i<a.length-1;i++){a[i]=a[i+1];add('Shift left',`Move index ${i+1} to index ${i}.`,i,3)}a.pop();id.pop();add('Decrease the length','The old final cell is outside the active array.',-1,5)}else if(op==='update'){s='if (position < length) {\n    array[position] = value;\n}';a[p]=v;add('Update the element',`Index ${p} now stores ${v}. Its address stays the same.`,p,2);complexity='O(1)'}else{s=op==='search'?'int found = -1;\nfor (size_t i = 0; i < length; i++) {\n    if (array[i] == value) {\n        found = (int)i;\n        break;\n    }\n}':'for (size_t i = 0; i < length; i++) {\n    printf("%d ", array[i]);\n}';let found=-1;for(let i=0;i<a.length;i++){add(op==='search'?'Compare element':'Read element',`Index ${i} stores ${a[i]}.`,i,op==='search'?3:2);if(op==='search'&&a[i]===v){found=i;break}}add('Operation complete',op==='search'?(found<0?'No matching value. found stays -1.':'Found at index '+found+'.'):'Every active element was visited.')}
}else if(topic==='strings'){
if(op==='reverse'){s='size_t n = strlen(buffer);\nfor (size_t i = 0; i < n / 2; i++) {\n    char temp = buffer[i];\n    buffer[i] = buffer[n - 1 - i];\n    buffer[n - 1 - i] = temp;\n}\n/* The null terminator stays at buffer[n]. */';for(let i=0;i<Math.floor(a.length/2);i++){const j=a.length-1-i;add('Save the left character',`Save '${a[i]}' before swapping indices ${i} and ${j}.`,i,3);[a[i],a[j]]=[a[j],a[i]];add('Swap the pair',`The characters at ${i} and ${j} have exchanged positions.`,j,5)}add('Reverse complete','The null terminator has not moved.')}else if(op==='compare'){s='size_t i = 0;\nwhile (buffer[i] && other[i] && buffer[i] == other[i]) {\n    i++;\n}\nint result = (unsigned char)buffer[i] - (unsigned char)other[i];\n/* Negative, zero or positive indicates ordering. */';const other=Array.from(v);if([...a,...other].some(ch=>ch.codePointAt(0)>127))return reportError('Comparison demo uses ASCII characters to match C byte ordering.');let i=0;while(i<a.length&&i<other.length&&a[i]===other[i]){add('Compare characters',`Index ${i}: '${a[i]}' equals '${other[i]}'. Continue.`,i,2);i++}const diff=(a[i]?.charCodeAt(0)||0)-(other[i]?.charCodeAt(0)||0);add(diff===0?'Strings are equal':'First difference',`At index ${i}, compare ${a[i]||'\\0'} with ${other[i]||'\\0'}. The result is ${diff===0?'zero':diff<0?'negative':'positive'}.`,i,5)}else if(op==='copy'){s='char destination[16];\nsize_t n = strlen(buffer);\nif (n + 1 <= sizeof destination) {\n    memcpy(destination, buffer, n + 1);\n}\n/* Copy the terminator as well as the text. */';space='O(n)';for(let i=0;i<=a.length;i++)add('Copy a byte',`Copy ${i<a.length?"'"+a[i]+"'":'the null terminator'} into destination[${i}].`,i,4);add('Copy complete','The destination contains its own character data and null terminator. The source is unchanged.')}else{s="for (size_t i = 0; buffer[i] != '\\0'; i++) {\n    printf(\"%c\", buffer[i]);\n}";for(let i=0;i<a.length;i++)add('Visit a character',`buffer[${i}] contains '${a[i]}'. It is not the terminator.`,i,2);add('Stop at the terminator',`buffer[${a.length}] is '\\0'. It marks the end and does not count toward strlen.`,a.length,1)}
}else{
complexity='O(1)';if(op==='push'){s='if (top + 1 < CAPACITY) {\n    stack[++top] = value;\n} else {\n    /* Overflow: reject this push. */\n}';a.push(v);id.push(nextId++);add('Advance top and store',`top is now ${a.length-1}. Store ${v} in that cell.`,a.length-1,2)}else if(op==='pop'){s='if (top >= 0) {\n    int value = stack[top--];\n    /* Use value. */\n} else {\n    /* Underflow: no element to pop. */\n}';const old=a.pop();id.pop();add('Remove the top element',`Pop returns ${old}. top is now ${a.length-1}.`,a.length-1,2)}else{s='if (top >= 0) {\n    int value = stack[top];\n    /* Peek leaves top unchanged. */\n}';add('Read without removing',`The top value is ${a[a.length-1]}. Stack length does not change.`,a.length-1,2)}}
if(isList()&&['insert','begin','end','after'].includes(op))s+='\n\n/* Selected operation: insert_at('+p+', '+v+'); */';if(isList()&&['delete','deleteBegin','deleteEnd','deleteValue'].includes(op))s+='\n\n/* Selected operation: delete_at('+p+');'+(op==='deleteValue'?'\n   Position was found by scanning for value '+v+'.':'')+' */';if(JSON.stringify(before.values)!==JSON.stringify(a)||JSON.stringify(before.ids)!==JSON.stringify(id)){undoHistory.push(before);undoHistory=undoHistory.slice(-20)}values=a;ids=id;operationTime=complexity;operationSpace=space;setCode(s);$('#complexity').textContent=complexity;$('#space').textContent=space;render(frames[0]);refreshLearning();if(auto)play();}
const lessons={
singly:['Nodes are separate heap allocations. Accessing position n requires walking the chain.','A specialized insertion at head takes O(1), and insertion at a known tail can take O(1). The generic positional function shown here validates the length first, so its insertion takes O(n).', 'Insert safely by setting newNode->next = current->next before current->next = newNode. Reversing these assignments creates a self-loop and loses the remaining chain.','Deletion saves the successor, reconnects the predecessor, then calls free on the detached node. Reading a freed node is undefined behavior.','An empty list has head == NULL. The only node has next == NULL. Deleting that node sets head and tail to NULL.'],
doubly:['A node stores data, prev and next. Forward traversal follows next; backward traversal starts at tail and follows prev.','To insert between A and B: set node->prev = A; node->next = B; A->next = node; B->prev = node. Both neighbor links must agree.','To remove a middle node: node->prev->next = node->next; node->next->prev = node->prev; then free(node). Check for head and tail before dereferencing neighbors.','At the boundaries, head->prev and tail->next are NULL. A single node is both head and tail.'],
circular:['The final node points back to head. A one-node list points to itself. An empty list still has head == NULL.','Check for an empty list before a do...while traversal. Visit once, advance, and stop when current == head.','Inserting at the beginning changes head and tail->next. Removing head also requires tail->next to reference the new head.','A loop conditioned on current != NULL never ends for a valid circular list. Keep a stable start pointer and stop on return.'],
circularDoubly:['The list forms a ring in both directions. tail->next == head and head->prev == tail.','A one-node ring has both prev and next pointing to itself. The empty state has head and tail equal to NULL.','Insertion updates both pointers on the new node and both neighboring pointers. Changes at either end also update head or tail.','Deleting the only node is a special case. Set both entry pointers to NULL and free the allocation once.'],
arrays:['Elements occupy contiguous storage. C uses zero-based indices. The valid active range is 0 through length - 1.','Index access and update take O(1). Linear search and traversal take O(n). Insertion or deletion in the middle takes O(n) because elements shift.','Capacity is the allocated space. Length is the number of active elements. Never insert when length == capacity.','Insertion shifts right, starting at the end. Deletion shifts left, starting at the removed position. C itself does not check array bounds.'],
strings:["A C string is a char array ending with '\\0'. The terminator occupies a byte but is not counted by strlen.",'fgets limits reads to capacity - 1 and appends a null terminator on success. Check its return value before using the buffer. A newline may remain in the buffer.','Reversing swaps characters before the terminator. Comparing checks characters until a difference or a terminator. Copying requires room for length + 1 bytes.','This classroom uses ASCII characters, where each character occupies one byte. UTF-8 text may use several bytes per displayed character.'],
stack:['An array-based stack tracks its top index. Empty means top == -1. Each push increments top and writes a value.','Pop reads the top value and decrements top. Peek reads it without removing it. These operations take O(1).','If top + 1 == capacity, a push would overflow. If top == -1, a pop or peek would underflow. Check before accessing memory.','A stack is useful for matching brackets, undo history and depth-first traversal. C call frames also behave like a stack.']};
function tab(view){stop();saveExperiment();if(view==='visual'){workspace();return}currentView=view;document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-selected',String(b.dataset.view===view))});if(view==='concept')$('#view-content').innerHTML=`<section class="panel" style="padding:28px"><h2 style="margin-bottom:24px">Understand ${esc(modules.find(m=>m[0]===topic)[1].toLowerCase())}</h2>${lessons[topic].map((p,i)=>`<article style="padding:18px 0;border-top:1px solid var(--line);display:flex;gap:20px"><p style="max-width:800px">${esc(p)}</p></article>`).join('')}<div class="callout">C code in the playground demonstrates operation functions or function-body snippets. Include the required headers and definitions when using them in a complete program.</div></section>`;else exercise(topic)}
const questions=[{topic:'singly',q:'Insert a node after current. Which assignment comes first?',options:['current->next = newNode;','newNode->next = current->next;','free(current);'],answer:1,why:'Save the original successor in newNode->next before redirecting current->next. Otherwise the rest of the chain can be lost.'},{topic:'doubly',q:'A points forward to B. Which backward link must also hold?',options:['A->prev == B','B->prev == A','B->next == A'],answer:1,why:'Every forward connection in a doubly linked list has a matching backward connection.'},{topic:'circular',q:'How does traversal stop in a circular singly linked list?',options:['When current reaches NULL','After returning to the starting node','After the first node'],answer:1,why:'A valid ring does not reach NULL. Stop on returning to the start after visiting at least once.'},{topic:'circularDoubly',q:'What are the links in a one-node circular doubly linked list?',options:['Both links are NULL','Only next points to itself','Both prev and next point to itself'],answer:2,why:'Both directions loop back to the only node. head and tail reference the same allocation.'},{topic:'arrays',q:'Insert into a full array with capacity 8 and length 8. What should happen?',options:['Write to array[8]','Reject the insertion or allocate a larger array','Overwrite array[0]'],answer:1,why:'Valid indices are 0 through 7. Writing array[8] would access beyond the allocated array.'},{topic:'strings',q:'How many bytes does the ASCII string "hello" need at minimum?',options:['5','6','4'],answer:1,why:'Five characters plus one null terminator require six bytes.'},{topic:'stack',q:'Push 12, push 24, then pop. What value is returned?',options:['12','24','No value'],answer:1,why:'A stack removes the most recently pushed value first.'},{topic:'singly',q:'When should a removed node be freed?',options:['Before reading its next field','After saving neighbors and reconnecting the list','Never'],answer:1,why:'Read all required pointers while the allocation is valid. Then detach it and free it exactly once.'}];
const savedQuiz = readSaved('pointer-knowledge-check', {});
let quizIndex = Number.isInteger(savedQuiz.quizIndex) && savedQuiz.quizIndex >= 0 && savedQuiz.quizIndex <= questions.length ? savedQuiz.quizIndex : 0;
let score = Number.isInteger(savedQuiz.score) && savedQuiz.score >= 0 && savedQuiz.score <= questions.length ? savedQuiz.score : 0;
let quizAnswer = Number.isInteger(savedQuiz.quizAnswer) && savedQuiz.quizAnswer >= 0 && savedQuiz.quizAnswer <= 2 ? savedQuiz.quizAnswer : null;
let answered = false;
function saveQuiz() { writeSaved('pointer-knowledge-check', {quizIndex, score, quizAnswer}); }

function exercise(t){const q=questions.find(q=>q.topic===t);$('#view-content').innerHTML=`<section class="panel quiz"><div class="step-kicker">Check your understanding</div><h2 style="margin-bottom:20px">${esc(q.q)}</h2>${q.options.map((o,i)=>`<button data-answer="${i}">${esc(o)}</button>`).join('')}<p id="feedback" style="margin-top:20px" role="status"></p><button id="return-playground">Return to the playground</button></section>`;bindAnswer(q,false);$('#return-playground').onclick=workspace}
function bindAnswer(q, quiz) {
    answered = false;
    function answer(index, countScore) {
        answered = true;
        const correct = index === q.answer;
        if (correct && quiz && countScore) score++;
        document.querySelectorAll('[data-answer]').forEach(button => {
            button.disabled = true;
            if (Number(button.dataset.answer) === q.answer) button.classList.add('correct');
            else if (Number(button.dataset.answer) === index) button.classList.add('wrong');
        });
        $('#feedback').textContent = (correct ? 'Correct. ' : 'The highlighted answer is correct. ') + q.why;
        if (quiz) { quizAnswer = index; $('#next-question').disabled = false; saveQuiz(); }
    }
    document.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => { if (!answered) answer(Number(b.dataset.answer), true); });
    if (quiz && quizAnswer !== null) answer(quizAnswer, false);
}
function auxiliary(){if(topic==='dashboard'){home()}else if(topic==='quiz'){quizRender()}else if(topic==='practice'){$('#content').innerHTML=`<div class="workspace"><section class="panel" style="padding:28px"><div class="step-kicker">Pointer order challenge</div><h2>Repair this insertion</h2><p style="margin:15px 0">The two pointer assignments below are in the wrong order. Rewrite them so the existing successor stays reachable.</p><textarea id="practice-code" aria-label="C pointer assignments" spellcheck="false">current->next = newNode;
newNode->next = current->next;</textarea><button id="check-practice" class="primary" style="margin-top:18px">Check pointer order</button><p id="practice-feedback" role="status" style="margin-top:20px"></p><div class="callout">This checks the order of these two statements. It does not compile or execute arbitrary C.</div></section><section class="panel explanation"><h2>Before you write</h2><p style="margin-top:20px">current holds 24. Its successor holds 36. newNode holds 30.</p><div class="callout">Goal: 24 → 30 → 36<br>First preserve 36's address. Then connect 24 to 30.</div><button id="practice-go" style="margin-top:20px">Test in the playground</button></section></div>`;$('#check-practice').onclick=()=>{const s=$('#practice-code').value.replace(/\s+/g,'');const target='newNode->next=current->next;current->next=newNode;';$('#practice-feedback').textContent=s===target?'Correct. Save the successor first, then connect current to the new node.':'Use exactly the two assignments in the safe order. newNode->next must receive current->next first.'};$('#practice-go').onclick=()=>openTopic('singly')}else{$('#content').innerHTML=`<section class="hero-card"><h2>${modules.slice(1,8).filter(m=>learned.includes(m[0])).length} of 7 modules learned</h2><p>Mark a module as learned after exploring its operations and challenge.</p></section><div class="cards">${modules.slice(1,8).map(([id,l])=>`<article class="panel lesson-card"><span class="tag">${learned.includes(id)?'✓ Learned':'Ready to explore'}</span><h2>${l}</h2><button data-open="${id}">Open lesson</button></article>`).join('')}</div><button id="clear-progress" style="margin-top:22px">Reset learning progress</button>`;document.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>openTopic(b.dataset.open));$('#clear-progress').onclick=()=>{learned=[];try{localStorage.setItem('pointer-progress','[]')}catch{}progress();auxiliary();notify('Learning progress reset.')}}}
function quizRender(){if(quizIndex>=questions.length){$('#content').innerHTML=`<section class="panel quiz"><div class="step-kicker">Quiz complete</div><h2>${score} / ${questions.length} correct</h2><p style="margin:20px 0">Review a playground to practice any concepts you missed.</p><button id="retry">Try again</button></section>`;$('#retry').onclick=()=>{quizIndex=0;score=0;quizAnswer=null;saveQuiz();quizRender()};return}const q=questions[quizIndex];$('#content').innerHTML=`<section class="panel quiz"><div class="step-kicker">Question ${quizIndex+1} of ${questions.length}</div><h2 style="line-height:1.5;margin-bottom:22px">${esc(q.q)}</h2>${q.options.map((o,i)=>`<button data-answer="${i}">${esc(o)}</button>`).join('')}<p id="feedback" role="status" style="margin-top:22px"></p><button id="next-question" disabled>Next question</button></section>`;bindAnswer(q,true);$('#next-question').onclick=()=>{quizIndex++;quizAnswer=null;saveQuiz();quizRender()}}
// Each topic keeps its own experiment, controls, and paused step sequence.
function readSaved(key, fallback) {
    try { const saved = JSON.parse(localStorage.getItem(key)); return saved ?? fallback; } catch { storageAvailable = false; return fallback; }
}
function writeSaved(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { storageAvailable = false; } const status = $('.local-badge'); if (status) status.textContent = storageAvailable ? 'Saved on this device' : 'Saved for this visit'; }
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function validExperiment(s) {
    const structure = a => a && Array.isArray(a.values) && Array.isArray(a.ids) && a.values.length === a.ids.length && a.values.length <= 10 && Number.isInteger(a.capacity) && a.capacity >= 1 && a.capacity <= 16;
    return structure(s) && Number.isInteger(s.nextId) && s.nextId >= 0 && Array.isArray(s.frames) && s.frames.every(structureFrame) && Number.isInteger(s.frameIndex) && s.frameIndex >= 0 && (!s.frames.length || s.frameIndex < s.frames.length);
    function structureFrame(f) { return f && Array.isArray(f.values) && Array.isArray(f.ids) && f.values.length === f.ids.length && f.values.length <= 10; }
}
function structureSnapshot() { return { values: values.slice(), ids: ids.slice(), nextId, capacity }; }
function readControls() {
    if (!$('#operation')) return experiments[topic]?.controls || {};
    return { operation: $('#operation').value, value: $('#value').value, position: $('#position').value, custom: $('#custom').value, capacity: $('#capacity')?.value ?? capacity, speed: $('#speed').value, customOpen: $('.custom-data')?.open || false };
}
function saveExperiment() {
    if (!descriptions[topic]) return;
    experiments[topic] = clone({ ...structureSnapshot(), frames, frameIndex, code, undoHistory, guidedStage, allOperations, technicalOpen, operationTime, operationSpace, lastOperation, controls: readControls() });
    writeSaved('pointer-experiments-v1', experiments);
}
function loadExperiment(id) {
    const saved = experiments[id];
    if (validExperiment(saved)) {
        values = saved.values.slice(); ids = saved.ids.slice(); nextId = saved.nextId; capacity = saved.capacity;
        frames = clone(saved.frames); frameIndex = saved.frameIndex; code = saved.code || '';
        undoHistory = Array.isArray(saved.undoHistory) ? clone(saved.undoHistory).slice(-20) : [];
        guidedStage = Number.isInteger(saved.guidedStage) ? saved.guidedStage : -1;
        allOperations = Boolean(saved.allOperations); technicalOpen = Boolean(saved.technicalOpen);
        operationTime = saved.operationTime || '—'; operationSpace = saved.operationSpace || 'O(1)'; lastOperation = saved.lastOperation || saved.controls?.operation || '';
    } else {
        values = id === 'strings' ? Array.from('hello') : id === 'stack' ? [12, 24, 36] : [12, 24, 36, 48];
        ids = values.map((_, i) => i); nextId = values.length; capacity = id === 'strings' ? 10 : 8;
        frames = []; frameIndex = 0; code = ''; undoHistory = []; guidedStage = -1;
        allOperations = false; technicalOpen = false; operationTime = '—'; operationSpace = 'O(1)'; lastOperation = '';
    }
}
function openTopic(id) {
    stop(); saveExperiment();
    if (topic === 'practice' && $('#practice-code')) { practiceDraft = $('#practice-code').value; writeSaved('pointer-practice-draft', practiceDraft); }
    topic = id; currentView = 'visual';
    if (descriptions[id]) loadExperiment(id);
    nav();
    $('#title').textContent = modules.find(m => m[0] === id)[1];
    $('#subtitle').textContent = descriptions[id] || ({ dashboard: 'Start small. Explore one idea at a time.', practice: 'Write two C statements after exploring insertion.', quiz: 'Check what you know. Each answer includes an explanation.', progress: 'Revisit a lesson or continue with the next structure.' }[id]);
    $('#breadcrumb').textContent = 'Learn / ' + (isList() ? 'Linked lists / ' : '') + modules.find(m => m[0] === id)[1];
    $('#module-number').textContent = 'C programming';
    $('#complete').style.display = descriptions[id] ? '' : 'none';
    $('#complete').textContent = learned.includes(id) ? '✓ Learned' : '✓ Mark as learned';
    if (descriptions[id]) workspace(); else {
        auxiliary();
        if (id === 'practice') {
            $('#practice-code').value = practiceDraft;
            $('#practice-code').oninput = () => { practiceDraft = $('#practice-code').value; writeSaved('pointer-practice-draft', practiceDraft); };
        }
    }
    const status = $('.local-badge'); if (status) status.textContent = storageAvailable ? 'Saved on this device' : 'Saved for this visit';
    window.scrollTo({top:0, behavior:'auto'});
}
function nav() {
    let html = '';
    for (const [id, label, icon] of modules) {
        if (id === 'singly') html += `<details class="list-navigation" ${isList() ? 'open' : ''}><summary>Linked lists</summary>`;
        html += `<button data-topic="${id}" class="${id === topic ? 'active ' : ''}${['singly','doubly','circular','circularDoubly'].includes(id) ? 'sub' : ''}" ${id === topic ? 'aria-current="page"' : ''}><span class="nav-icon" aria-hidden="true">${icon}</span>${label}<span class="nav-check"></span></button>`;
        if (id === 'circularDoubly') html += '</details>';
    }
    $('#nav').innerHTML = html;
    if ($('#topic-picker')) { $('#topic-picker').innerHTML = modules.map(([id,label]) => '<option value="'+id+'" '+(id===topic?'selected':'')+'>'+esc(label)+'</option>').join(''); $('#topic-picker').onchange = () => openTopic($('#topic-picker').value); }
    document.querySelectorAll('[data-topic]').forEach(b => b.onclick = () => openTopic(b.dataset.topic));
    progress();
}
function beginnerOperations() {
    if (isList()) return ['traverse', 'begin', 'deleteBegin'];
    if (topic === 'arrays') return ['traverse', 'insert', 'delete'];
    if (topic === 'strings') return ['traverse', 'reverse', 'compare'];
    return ['push', 'pop', 'peek'];
}
function defaultOperation() { return topic === 'stack' ? 'push' : 'traverse'; }
function updateOperationFields() {
    clearErrors();
    const op = $('#operation').value;
    const needsPosition = ['insert', 'after', 'delete', 'update'].includes(op);
    const needsValue = ['insert', 'begin', 'end', 'after', 'push', 'update', 'search', 'deleteValue', 'compare'].includes(op);
    $('#position-field').hidden = !needsPosition; $('#value-field').hidden = !needsValue;
    $('#position').disabled = !needsPosition; $('#value').disabled = !needsValue;
    $('#value-field label').textContent = ['search', 'deleteValue'].includes(op) ? 'Value to find' : topic === 'strings' ? 'Compare with' : 'New value';
    const tips = { traverse: 'Read each value in order. Nothing is added or removed.', begin: 'Add the new value before the first node.', deleteBegin: 'Remove the first node and reconnect the list.', insert: 'Position 0 is the first box. Insertion at position 1 goes before the second box.', delete: 'Position 0 is the first box. Remove the value at your chosen position.', after: 'Click an existing node. The new value goes immediately after it.', push: 'Add a value to the top of the stack.', pop: 'Remove the value most recently pushed.', peek: 'Read the top value without removing it.', reverse: 'Reverse the order of the values.', compare: 'Compare characters until a difference or the end of a string.', search: 'Look for a value one element at a time.', empty: 'Remove every node and release its allocation. Undo can restore this experiment.' };
    $('#operation-hint').textContent = (tips[op] || 'Inspect this operation one step at a time.') + ' Run it, then use Next step.';
    $('#operation-hint').dataset.original = $('#operation-hint').textContent;
    saveExperiment();
}
function resetExample() {
    stop(); undoHistory.push({ ...structureSnapshot(), frames: clone(frames), frameIndex, code, guidedStage, operationTime, operationSpace, lastOperation, controls: readControls() }); undoHistory = undoHistory.slice(-20);
    values = topic === 'strings' ? Array.from('hello') : topic === 'stack' ? [12,24,36] : topic === 'arrays' && guidedStage >= 0 && guidedStage < 4 ? [12,24,36] : [12,24,36,48];
    ids = values.map((_, i) => i); nextId = values.length; capacity = topic === 'strings' ? 10 : 8;
    frames = []; frameIndex = 0; code = ''; operationTime = '—'; operationSpace = 'O(1)'; lastOperation = '';
    if (guidedStage >= 0 && guidedStage < 4) guidedStage = 0;
    saveExperiment(); experiments[topic].controls = {}; workspace(); saveExperiment(); notify('Example reset. Undo can restore your previous values.');
}
function undoChange() {
    if (!undoHistory.length) return;
    stop(); const previous = undoHistory.pop();
    values = previous.values.slice(); ids = previous.ids.slice(); nextId = previous.nextId; capacity = previous.capacity;
    frames = previous.frames ? clone(previous.frames) : []; frameIndex = previous.frameIndex || 0; code = previous.code || ''; operationTime = previous.operationTime || '—'; operationSpace = previous.operationSpace || 'O(1)'; lastOperation = previous.lastOperation || previous.controls?.operation || '';
    if (Number.isInteger(previous.guidedStage)) guidedStage = previous.guidedStage; else if (guidedStage >= 0 && guidedStage < 4) guidedStage = -1;
    saveExperiment(); experiments[topic].controls = previous.controls || {}; workspace(); saveExperiment(); notify('Previous experiment restored.');
}
function startGuidedLesson() {
    if (experiments.arrays && validExperiment(experiments.arrays) && experiments.arrays.guidedStage >= 0 && experiments.arrays.guidedStage < 4) { openTopic('arrays'); return; }
    saveExperiment(); openTopic('arrays');
    undoHistory.push(structureSnapshot()); undoHistory = undoHistory.slice(-20);
    values = [12,24,36]; ids = [0,1,2]; nextId = 3; capacity = 6;
    frames = []; frameIndex = 0; code = ''; guidedStage = 0; allOperations = false; technicalOpen = false; operationTime = '—'; operationSpace = 'O(1)'; lastOperation = '';
    saveExperiment(); experiments.arrays.controls = {operation: 'traverse', value: '18', position: '1'};
    workspace(); saveExperiment();
}
function runSuggested(op, value = 18, position = 1) {
    if (!beginnerOperations().includes(op)) allOperations = true;
    saveExperiment(); experiments[topic].controls = { ...experiments[topic].controls, operation: op, value: String(value), position: String(position) };
    workspace(); prepare(false); if (!$('#next').disabled) $('#next').focus();
}
function renderGuide() {
    const host = $('#learning-guide'); if (!host) return;
    const active = topic === 'arrays' && guidedStage >= 0 && guidedStage < 4;
    $('.workspace').classList.toggle('guided', active);
    $('#complete').hidden = active;
    if (!active) {
        host.hidden = true; host.innerHTML = ''; return;
    }
    host.hidden = false;
    const finished = frames.length && frameIndex === frames.length - 1;
    const copy = [
        ['Meet your array', 'Positions start at 0. The boxes hold 12, 24, and 36.'],
        ['Visit each value', 'Use Next step to move from one box to the next. Traversal reads values without changing them.'],
        ['Insert a value', 'We will insert 18 at position 1, before 24. Watch the existing values move right to make room.'],
        ['Check what changed', 'You visited the values and inserted one new value. Try this question before moving on.']
    ];
    host.innerHTML = `<div class="guide-heading"><span>Your first lesson</span><span>Part ${guidedStage + 1} of 4</span></div><div class="guide-body"><div><h2>${copy[guidedStage][0]}</h2><p>${copy[guidedStage][1]}</p></div><div class="guide-actions">${guidedStage === 0 ? '<button id="guide-start" class="primary">Visit each value</button>' : guidedStage === 1 && finished ? '<button id="guide-insert" class="primary">Next: insert a value</button>' : guidedStage === 2 && finished ? '<button id="guide-question" class="primary">Answer a question</button>' : guidedStage < 3 ? '<span class="guide-direction">Continue with Next step below.</span>' : ''}<button id="leave-guide" class="text-button">Explore freely</button></div></div>${guidedStage === 3 ? '<div class="guide-question"><h3>After inserting 18 at position 1, what is the order?</h3><div class="guide-answers"><button data-guide-answer="0">18, 12, 24, 36</button><button data-guide-answer="1">12, 18, 24, 36</button><button data-guide-answer="2">12, 24, 18, 36</button></div><p id="guide-feedback" role="status"></p></div>' : ''}`;
    $('#leave-guide').onclick = () => { guidedStage = -1; allOperations = true; saveExperiment(); workspace(); };
    if ($('#guide-start')) $('#guide-start').onclick = () => { guidedStage = 1; runSuggested('traverse'); };
    if ($('#guide-insert')) $('#guide-insert').onclick = () => { guidedStage = 2; runSuggested('insert', 18, 1); };
    if ($('#guide-question')) $('#guide-question').onclick = () => { guidedStage = 3; refreshLearning(); };
    document.querySelectorAll('[data-guide-answer]').forEach(button => button.onclick = () => {
        if (button.dataset.guideAnswer !== '1') { $('#guide-feedback').textContent = 'Position 1 is the second box. The new value goes before 24. Try again.'; button.classList.add('wrong'); return; }
        guidedStage = 4;
        if (!learned.includes('arrays')) learned.push('arrays');
        writeSaved('pointer-progress', learned); progress(); $('#complete').textContent = '✓ Learned';
        saveExperiment(); refreshLearning();
        $('#learning-guide').hidden = false;
        $('#learning-guide').innerHTML = '<div class="guide-body"><div><h2>You have learned your first array operation.</h2><p>18 is now in the second box. Keep experimenting here, or learn how strings use similar boxes for characters.</p></div><div class="guide-actions"><button id="guide-next-lesson" class="primary">Explore strings</button><button id="guide-stay">Keep exploring arrays</button></div></div>';
        $('#guide-next-lesson').onclick = () => openTopic('strings');
        $('#guide-stay').onclick = () => { $('#learning-guide').hidden = true; };
    });
}
function refreshLearning() {
    if (!$('#next-activity')) return;
    const pending = frames.length > 0 && frameIndex < frames.length - 1;
    const finished = frames.length > 0 && !pending;
    $('#run').disabled = pending; $('#create').disabled = pending; $('#operation').disabled = pending;
    const selected = $('#operation').value;
    $('#value').disabled = pending || !['insert','begin','end','after','push','update','search','deleteValue','compare'].includes(selected);
    $('#position').disabled = pending || !['insert','after','delete','update'].includes(selected);
    $('#operation-hint').textContent = pending ? timer ? 'The steps are playing. Pause to inspect a step. Undo cancels this change.' : 'This operation is paused. Use Next step or Auto play. Undo cancels this change.' : $('#operation-hint').dataset.original || 'Choose an operation, then use Next step.';
    $('#complexity').textContent = operationTime; $('#space').textContent = operationSpace;
    $('#undo').disabled = !undoHistory.length; $('#replay').disabled = !frames.length; $('#play').disabled = !frames.length;
    $('#diagram-state').textContent = !frames.length ? 'Ready to explore' : finished ? 'Operation complete' : 'Operation in progress';
    $('.scroll-help').hidden = $('#visual').scrollWidth <= $('#visual').clientWidth + 1;
    const nextHost = $('#next-activity');
    const inGuide = topic === 'arrays' && guidedStage >= 0 && guidedStage < 4;
    nextHost.hidden = !finished || inGuide;
    if (finished && !inGuide) {
        const op = lastOperation || $('#operation').value;
        let nextOp = topic === 'strings' ? (op === 'traverse' ? 'reverse' : 'compare') : topic === 'stack' ? (op === 'push' ? 'pop' : 'push') : ['traverse','search','backward'].includes(op) ? (isList() ? 'begin' : 'insert') : values.length > 0 ? (isList() ? 'deleteBegin' : 'delete') : (isList() ? 'begin' : 'insert');
        if (['begin','insert','push'].includes(nextOp) && (values.length >= 10 || (!isList() && values.length >= capacity))) nextOp = topic === 'stack' ? 'pop' : isList() ? 'deleteBegin' : 'delete';
        nextHost.innerHTML = `<div><strong>What to try next</strong><p>${topic === 'strings' ? nextOp === 'reverse' ? 'Reverse the characters and watch them swap places.' : 'Compare this string with another one.' : topic === 'stack' ? nextOp === 'pop' ? 'Remove the top value. Predict which value will come out.' : 'Add a value to the top.' : nextOp === 'begin' || nextOp === 'insert' ? 'Add a value and watch what changes.' : 'Remove the first value and follow the change.'}</p></div><button id="suggested-action">${friendlyOperationNames[nextOp]||operationNames[nextOp]}</button>`;
        $('#suggested-action').onclick = () => runSuggested(nextOp, topic === 'strings' ? 'hello' : 18, ['insert'].includes(nextOp) ? Math.min(1, values.length) : 0);
    }
    renderGuide(); saveExperiment();
}
function home() {
    const guided = experiments.arrays?.guidedStage;
    const inProgress = guided >= 0 && guided < 4;
    const order = modules.slice(1,8);
    const next = order.find(m => !learned.includes(m[0]));
    $('#content').innerHTML = `<section class="welcome"><div><h2>Start with three values.</h2><p>You do not need to know pointers yet. Follow a short array lesson, then explore other structures at your own pace.</p><div class="welcome-actions"><button id="start-first" class="primary">${inProgress ? 'Continue your first lesson' : 'Start the first lesson'}</button><button id="explore-own">Explore on my own</button></div><p class="hint">Four short parts. You can pause or leave at any time.</p></div><div class="welcome-array" aria-label="Example array with values 12, 24, and 36">${[12,24,36].map((n,i) => `<div><small>Position ${i}</small><strong>${n}</strong></div>`).join('')}</div></section><section class="learning-path"><h2>Your learning path</h2><p>Follow this order, or open any topic that interests you. Your experiments stay where you left them.</p><div class="path-lessons">${order.map(([id,label],i) => `<article><span class="path-number" aria-label="Lesson ${i+1}">${i+1}</span><div><h3>${label}</h3><p>${descriptions[id]}</p></div><span class="lesson-status">${learned.includes(id) ? '✓ Learned' : experiments[id] ? 'Experiment saved' : id === next?.[0] ? 'Suggested next' : ''}</span><button data-home-topic="${id}">${experiments[id] ? 'Continue' : 'Explore'}</button></article>`).join('')}</div></section><section class="practice-links"><div><h3>Quick questions</h3><p>Each topic has a question beside its playground. Use it to check one idea.</p></div><div><h3>Write C</h3><p>Repair pointer assignment order after trying linked-list insertion.</p><button id="home-write">Open the C exercise</button></div><div><h3>Knowledge check</h3><p>Answer eight questions across the structures, with explanations after each answer.</p><button id="home-quiz">Start the knowledge check</button></div></section>`;
    $('#start-first').onclick = startGuidedLesson;
    $('#explore-own').onclick = () => { openTopic('arrays'); guidedStage = -1; saveExperiment(); workspace(); };
    document.querySelectorAll('[data-home-topic]').forEach(b => b.onclick = () => openTopic(b.dataset.homeTopic));
    $('#home-write').onclick = () => openTopic('practice'); $('#home-quiz').onclick = () => openTopic('quiz');
}

openTopic('dashboard');
function drawPointers(f){const host=$('#visual');const origin=host.getBoundingClientRect();const nodes=[...host.querySelectorAll('[data-id]')];const rect=n=>{const r=n.querySelector('.node').getBoundingClientRect();return{x:r.left-origin.left+host.scrollLeft,y:r.top-origin.top+host.scrollTop,w:r.width,h:r.height}};const byId=new Map(nodes.map(n=>[n.dataset.id,rect(n)]));let paths='';function edge(r,target,back){const color=back?'#bcabed':'#6dddd0',startX=back?r.x:r.x+r.w,y=r.y+r.h*(back?.7:.4),dest=byId.get(target);let path;if(target==='null'){const end=startX+(back?-24:24);path=`M ${startX} ${y} L ${end} ${y}`;paths+=`<text x="${end+(back?-28:4)}" y="${y+3}" fill="#8a98aa" font-size="9" font-family="monospace">NULL</text>`}else if(!dest){path=`M ${startX} ${y} L ${startX+(back?-26:26)} ${y+24}`;paths+=`<text x="${startX-30}" y="${y+40}" fill="#ff8795" font-size="9" font-family="monospace">${addr(Number(target))}</text>`}else{const endX=back?dest.x+dest.w:dest.x,endY=dest.y+dest.h*(back?.7:.4);if(dest===r||Math.abs(dest.x-r.x)<1){const loopY=r.y-21;path=`M ${startX} ${y} C ${startX+35} ${loopY}, ${r.x-35} ${loopY}, ${endX} ${endY}`}else if((!back&&dest.x>r.x&&dest.x-r.x<r.w+60)||(back&&dest.x<r.x&&r.x-dest.x<r.w+60)){path=`M ${startX} ${y} L ${endX} ${endY}`}else{const route=back?r.y+r.h+37:r.y-22;path=`M ${startX} ${y} C ${startX+(back?-20:20)} ${route}, ${endX+(back?20:-20)} ${route}, ${endX} ${endY}`}}paths+=`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.6" marker-end="url(#${back?'prev':'next'}-arrow)"/>`}
for(const node of nodes){const r=byId.get(node.dataset.id);edge(r,node.dataset.next,false);if(isDouble())edge(r,node.dataset.prev,true)}if(f?.ghost&&f.ghost.next!=='?'){const ghost=host.querySelector('.node-wrap.new');if(ghost){const target=nodes.find(n=>addr(Number(n.dataset.id))===f.ghost.next);if(target){const g=rect(ghost),d=rect(target);paths+=`<path d="M ${g.x+g.w} ${g.y+g.h/2} C ${g.x+g.w+45} ${g.y}, ${d.x-30} ${d.y+d.h+25}, ${d.x} ${d.y+d.h/2}" fill="none" stroke="#f3bd74" stroke-width="2" marker-end="url(#new-arrow)"/>`}}}
const width=Math.max(host.clientWidth,host.scrollWidth),height=Math.max(host.clientHeight,host.scrollHeight);host.insertAdjacentHTML('beforeend',`<svg class="pointer-overlay" width="${width}" height="${height}" aria-hidden="true"><defs>${[['next','#6dddd0'],['prev','#bcabed'],['new','#f3bd74']].map(([name,c])=>`<marker id="${name}-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7" fill="${c}"/></marker>`).join('')}</defs>${paths}</svg>`)}
window.addEventListener('resize',()=>{if($('#visual')&&isList())render(frames.length?frames[frameIndex]:undefined)});

// Font metrics can change node widths after the first paint. Redraw arrows once fonts settle.
if (document.fonts) document.fonts.ready.then(() => {
    if ($('#visual')) render(frames.length ? frames[frameIndex] : undefined);
});

$('.brand').onclick = event => { event.preventDefault(); openTopic('dashboard'); };
window.addEventListener('pagehide', saveExperiment);

function clearErrors() {
    for (const selector of ['#operation-error', '#custom-error']) { const element = $(selector); if (element) { element.hidden = true; element.textContent = ''; } }
}
function reportError(message) {
    const target = $('#operation-error');
    if (target) { target.textContent = message; target.hidden = false; } else notify(message);
}
function reportCustomError(message) {
    const target = $('#custom-error');
    if (target) { target.textContent = message; target.hidden = false; } else notify(message);
}

function beginnerFrame(frame) {
    const language = {
        'Start with the current state': ['Ready for the first step', 'Nothing has changed yet. Use Next step to see what happens.'],
        'Allocate a new node': ['Make a new node', 'Create a new box for the value. Keep the existing connections unchanged.'],
        'Find the insertion point': ['Find the position', 'Visit the nodes in order until you reach the position for the new value.'],
        'Save the successor first': ['Connect the new node to the next one', 'First connect the new box to the node that currently comes next. Keep the original connection in place until this is done.'],
        'Set the backward connection': ['Connect to the previous node', 'Give the new node a connection back to its previous neighbor.'],
        'Connect the new node': ['Connect the previous node to the new one', 'Redirect the previous connection to the new node. If the new node is first, move the head marker to it.'],
        'Repair the neighbor prev pointer': ['Match the backward connection', 'Make the next node point back to the new one. The two neighbors now agree in both directions.'],
        'Close the circular link': ['Keep the loop connected', 'Connect the last node back to the first. A circular list stays connected in a loop.'],
        'Insertion complete': ['The new value is in place', 'The new node is connected, and the other values remain reachable.'],
        'Locate the node to remove': ['Find the node to remove', 'Visit the nodes until you reach the selected value. Keep its connections intact for now.'],
        'Save the neighboring pointers': ['Remember the neighbors', 'Remember the node after the one you are removing. You will need that connection to keep the list together.'],
        'Bypass the victim': ['Connect around the removed node', frame.values.length ? 'Connect the remaining nodes around the one being removed. The removed node is now detached.' : 'The list is now empty. There is no first or last node.'],
        'Repair the backward link': ['Match the remaining connections', 'Connect the remaining neighbors in both directions.'],
        'Restore the loop': ['Connect the last node to the first', 'Update the connection at the end so the remaining nodes still form a loop.'],
        'Free the detached allocation': ['Release the removed node', "Release the removed node's memory after fixing the connections. That node must not be used again."],
        'Reverse one connection': ['Turn one connection around', "Remember the next node first. Then redirect this node's connection toward the node before it."],
        'Move head and tail': ['Move the first and last markers', 'The node that was last is now first. The node that was first is now last.'],
        'Save next, then free': ['Remember the next node, then remove this one', 'Keep the next connection before releasing the current node.'],
        'Advance to the saved successor': ['Move to the next node', 'Continue from the saved connection. The removed node is no longer used.'],
    };
    const wording = language[frame.title];
    if (wording) return {title:wording[0],text:wording[1]};
    if (frame.title==='Read element') return {title:'Read this value',text:'Position '+frame.focus+' holds '+frame.values[frame.focus]+'. Nothing is changed.'};
    if (frame.title==='Visit a character') return {title:'Visit a character',text:'Position '+frame.focus+' holds '+frame.values[frame.focus]+'. Visit the next character.'};
    if (frame.title==='Stop at the terminator') return {title:'Stop at the end marker',text:'The \\0 cell marks where the characters end. It does not count as part of the text length.'};
    if (frame.title==='Write the new value') return {title:'Put the new value in place',text:'Position '+frame.focus+' now holds '+frame.values[frame.focus]+'. The array has '+frame.values.length+' values.'};
    return {title:frame.title,text:frame.text.replace(/\bindex\b/gi,word=>word[0]==='I'?'Position':'position')};
}
