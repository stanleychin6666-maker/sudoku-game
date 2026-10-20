// 第六階段獨立模組：不修改第五階段數獨規則。
const STATS_KEY='sudoku-stage6-stats-v1', META_KEY='sudoku-stage6-meta-v1';
function taipeiDate(date=new Date()) { return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(date); }
function dateBefore(day){const d=new Date(day+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
function hashSeed(s){let h=2166136261;for(const ch of s){h=Math.imul(h^ch.charCodeAt(0),16777619);}return h>>>0;}
function mulberry32(a){return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function dailyPuzzle(day,difficulty='medium'){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||new Date(day+'T00:00:00Z').toISOString().slice(0,10)!==day)throw Error('無效日期');
 const previous=sudokuRandom;sudokuRandom=mulberry32(hashSeed('TW-daily-v1:'+day+':'+difficulty));
 try{return generatePuzzle(difficulty,{target:40,maxAttempts:12});}finally{sudokuRandom=previous;}
}
function emptyStats(){return {version:1,records:[]};}
function readStats(store){try{const x=JSON.parse(store.getItem(STATS_KEY));return x&&x.version===1&&Array.isArray(x.records)?x:emptyStats();}catch(_){return emptyStats();}}
function recordCompleted(store,id,s,meta,completedAt=new Date()){
 if(!s.finished||!s.won||!isSolvedSession(s)||!id)return false;
 const stats=readStats(store);
 if(stats.records.some(x=>x.id===id))return false;
 const record={id,mode:meta.mode||'normal',day:meta.mode==='daily'?meta.day:null,difficulty:s.game.difficulty,seconds:s.seconds,mistakes:s.mistakes,hints:s.hintCount,completedAt:completedAt.toISOString()};
 stats.records.push(record);store.setItem(STATS_KEY,JSON.stringify(stats));return true;
}
function sortedLeaderboard(records,difficulty){return records.filter(x=>x.difficulty===difficulty).slice().sort((a,b)=>a.seconds-b.seconds||a.mistakes-b.mistakes||a.hints-b.hints||a.completedAt.localeCompare(b.completedAt));}
function statistics(records){const rows=records.filter(x=>x&&Number.isFinite(x.seconds));const byDifficulty={};for(const d of ['easy','medium','hard']){const times=rows.filter(x=>x.difficulty===d).map(x=>x.seconds);byDifficulty[d]={count:times.length,best:times.length?Math.min(...times):null,average:times.length?Math.round(times.reduce((a,b)=>a+b,0)/times.length):null};}return {total:rows.length,mistakes:rows.reduce((a,b)=>a+b.mistakes,0),hints:rows.reduce((a,b)=>a+b.hints,0),byDifficulty,recent:rows.slice().sort((a,b)=>b.completedAt.localeCompare(a.completedAt)).slice(0,10)};}
function dailyStatus(records,day){const days=new Set(records.filter(x=>x.mode==='daily'&&x.day).map(x=>x.day));const completed=days.has(day);let cursor=completed?day:dateBefore(day),streak=0;while(days.has(cursor)){streak++;cursor=dateBefore(cursor);}return {completed,streak};}
function makeGameId(){return 'g-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,12);}
function safeMetaLoad(store){try{const x=JSON.parse(store.getItem(META_KEY));return x&&typeof x.id==='string'&&['normal','daily'].includes(x.mode)?x:null;}catch(_){return null;}}
function writeMeta(store,meta){store.setItem(META_KEY,JSON.stringify(meta));}
