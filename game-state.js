// 第五階段增量模組：不變更 sudoku.js 的唯一解與生成演算法。
const SAVE_KEY = 'sudoku-stage5-save-v1';
function copyNotes(notes) { return notes.map(row => row.map(s => [...s].sort((a,b)=>a-b))); }
function restoreNotes(values) { return values.map(row => row.map(a => new Set(a))); }
function createSession(game, options={}) {
  return {game, board:cloneBoard(game.puzzle), notes:createNotes(), undo:[], redo:[], seconds:0,
    running:true, finished:false, won:false, mistakes:0, maxMistakes:3, limitMistakes:options.limitMistakes ?? true,
    hintCount:0, autoCheck:options.autoCheck ?? true, notesMode:false, selected:null, highlighted:null};
}
function snapshot(s) { return {board:cloneBoard(s.board),notes:copyNotes(s.notes)}; }
function applySnapshot(s,snap) { s.board=cloneBoard(snap.board); s.notes=restoreNotes(snap.notes); }
function validEdit(s,r,c) { return s.running && !s.finished && Number.isInteger(r)&&Number.isInteger(c)&&r>=0&&r<9&&c>=0&&c<9&&s.game.puzzle[r][c]===0; }
function isSolvedSession(s) { return s.board.every((row,r)=>row.every((n,c)=>n!==0&&n===s.game.solution[r][c])); }
function finishIfNeeded(s) {
  if(s.finished) return;
  if(isSolvedSession(s)) { s.finished=true;s.won=true;s.running=false; }
  else if(s.limitMistakes && s.mistakes>=s.maxMistakes) { s.finished=true;s.won=false;s.running=false; }
}
function sessionEdit(s,r,c,n,noteMode=s.notesMode) {
  if(!validEdit(s,r,c)||!Number.isInteger(n)||n<0||n>9) return false;
  if(noteMode&&n!==0) {
    if(s.board[r][c]!==0) return false;
    s.undo.push(snapshot(s));s.redo=[];
    toggleNote(s.game.puzzle,s.board,s.notes,r,c,n);
  } else {
    if(s.board[r][c]===n && !(n!==0&&s.notes[r][c].size)) return false;
    s.undo.push(snapshot(s));s.redo=[];
    enterPlayerAnswer(s.game.puzzle,s.board,s.notes,r,c,n);
    if(n!==0 && n!==s.game.solution[r][c]) s.mistakes++;
  }
  finishIfNeeded(s);return true;
}
function sessionUndo(s) { if(!s.running||s.finished||!s.undo.length) return false; s.redo.push(snapshot(s));applySnapshot(s,s.undo.pop());return true; }
function sessionRedo(s) { if(!s.running||s.finished||!s.redo.length) return false; s.undo.push(snapshot(s));applySnapshot(s,s.redo.pop());return true; }
function sessionPause(s) { if(s.finished||!s.running)return false;s.running=false;return true; }
function sessionResume(s) { if(s.finished||s.running)return false;s.running=true;return true; }
function sessionTick(s,seconds=1) { if(s.running&&!s.finished&&Number.isInteger(seconds)&&seconds>=0) s.seconds+=seconds; }
function sessionHint(s) { if(!s.running||s.finished)return {kind:'inactive',message:'請先繼續遊戲。'};const h=findLogicalHint(s.board);if(h.kind==='single'||h.kind==='hidden')s.hintCount++;return h; }
function formatTime(sec) { return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`; }
function sessionExport(s) {
  return {version:1,game:{puzzle:cloneBoard(s.game.puzzle),solution:cloneBoard(s.game.solution),difficulty:s.game.difficulty,target:s.game.target,removed:s.game.removed,attempts:s.game.attempts},
    board:cloneBoard(s.board),notes:copyNotes(s.notes),undo:s.undo,redo:s.redo,seconds:s.seconds,
    running:s.running,finished:s.finished,won:s.won,mistakes:s.mistakes,maxMistakes:s.maxMistakes,
    limitMistakes:s.limitMistakes,hintCount:s.hintCount,autoCheck:s.autoCheck,notesMode:s.notesMode};
}
function sessionImport(data) {
  if(!data||data.version!==1||!data.game) throw new Error('存檔版本不相容');
  const g=data.game;
  if(!validateClues(g.solution)||blankCount(g.solution)!==0||!validateClues(g.puzzle)||countSolutions(g.puzzle,2)!==1) throw new Error('存檔題目無唯一解');
  if(!HOLE_RANGES[g.difficulty]||blankCount(g.puzzle)<HOLE_RANGES[g.difficulty][0]||blankCount(g.puzzle)>HOLE_RANGES[g.difficulty][1]) throw new Error('難度與空格不符');
  if(g.puzzle.some((row,r)=>row.some((n,c)=>n!==0&&n!==g.solution[r][c])))throw new Error('固定數字與解答不符');
  const checkBoard=b=>Array.isArray(b)&&b.length===9&&b.every((row,r)=>Array.isArray(row)&&row.length===9&&row.every((n,c)=>Number.isInteger(n)&&n>=0&&n<=9&&(g.puzzle[r][c]===0||n===g.puzzle[r][c])));
  const checkNotes=n=>Array.isArray(n)&&n.length===9&&n.every((row,r)=>Array.isArray(row)&&row.length===9&&row.every((a,c)=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(x=>Number.isInteger(x)&&x>=1&&x<=9)&&(g.puzzle[r][c]===0||a.length===0)));
  const checkSnap=x=>x&&checkBoard(x.board)&&checkNotes(x.notes)&&x.notes.every((row,r)=>row.every((a,c)=>x.board[r][c]===0||a.length===0));
  if(!checkBoard(data.board)||!checkNotes(data.notes)||!checkSnap({board:data.board,notes:data.notes}))throw new Error('玩家盤面或筆記無效');
  if(!Array.isArray(data.undo)||!Array.isArray(data.redo)||data.undo.length>1000||data.redo.length>1000||![...data.undo,...data.redo].every(checkSnap))throw new Error('操作記錄無效');
  if(!Number.isSafeInteger(data.seconds)||data.seconds<0||![data.mistakes,data.hintCount].every(x=>Number.isSafeInteger(x)&&x>=0)||data.maxMistakes!==3||typeof data.limitMistakes!=='boolean'||typeof data.autoCheck!=='boolean'||typeof data.notesMode!=='boolean'||typeof data.running!=='boolean'||typeof data.finished!=='boolean'||typeof data.won!=='boolean')throw new Error('存檔設定無效');
  if(data.finished && data.running || data.won!==isSolvedSession({board:data.board,game:g}) || (data.finished&&!data.won && !(data.limitMistakes&&data.mistakes>=3)) || (!data.finished && (data.won||data.limitMistakes&&data.mistakes>=3))) throw new Error('存檔狀態不一致');
  const s=createSession(g);Object.assign(s,{board:cloneBoard(data.board),notes:restoreNotes(data.notes),undo:data.undo,redo:data.redo,seconds:data.seconds,running:data.running,finished:data.finished,won:data.won,mistakes:data.mistakes,maxMistakes:3,limitMistakes:data.limitMistakes,hintCount:data.hintCount,autoCheck:data.autoCheck,notesMode:data.notesMode});return s;
}
function saveSession(store,s){store.setItem(SAVE_KEY,JSON.stringify(sessionExport(s)));}
function loadSession(store){const raw=store.getItem(SAVE_KEY);return raw?sessionImport(JSON.parse(raw)):null;}
