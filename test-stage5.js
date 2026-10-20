function testStage5(){
 const failures=[];let passed=0;
 const check=(name,fn)=>{try{if(!fn())throw new Error('條件不成立');passed++;}catch(e){failures.push({name,error:String(e)});}};
 const sol=generateSudoku(),puzzle=cloneBoard(sol);puzzle[0][0]=0;puzzle[0][1]=0;
 const g={puzzle,solution:sol,difficulty:'easy',removed:30,target:30,attempts:1};
 // 儲存測試採用真正生成的合法唯一解題目，避免測試假題目。
 const real=generatePuzzle('easy',{target:30});
 const blank=[];for(let r=0;r<9;r++)for(let c=0;c<9;c++)if(!real.puzzle[r][c])blank.push([r,c]);
 check('計時器格式',()=>formatTime(125)==='02:05');
 check('新遊戲計時從零開始',()=>createSession(real).seconds===0);
 check('正常計時',()=>{const s=createSession(real);sessionTick(s,5);return s.seconds===5;});
 check('暫停計時不增加',()=>{const s=createSession(real);sessionPause(s);sessionTick(s,15);return s.seconds===0;});
 check('暫停禁止填答與筆記',()=>{const s=createSession(real);const [r,c]=blank[0];sessionPause(s);return !sessionEdit(s,r,c,5)&&!sessionEdit(s,r,c,6,true)&&s.undo.length===0;});
 check('恢復繼續計時',()=>{const s=createSession(real);sessionPause(s);sessionResume(s);sessionTick(s,3);return s.seconds===3;});
 check('正式答案可撤銷並重做',()=>{const s=createSession(real),[r,c]=blank[0],n=real.solution[r][c];sessionEdit(s,r,c,n);const x=sessionUndo(s)&&s.board[r][c]===0;return x&&sessionRedo(s)&&s.board[r][c]===n;});
 check('筆記撤銷重做',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,2,true);const a=sessionUndo(s)&&s.notes[r][c].size===0;return a&&sessionRedo(s)&&s.notes[r][c].has(2)&&s.board[r][c]===0;});
 check('正式答案清除筆記後撤銷可恢復',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,2,true);sessionEdit(s,r,c,real.solution[r][c]);return s.notes[r][c].size===0&&sessionUndo(s)&&s.board[r][c]===0&&s.notes[r][c].has(2);});
 check('新操作清空重做歷史',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,2,true);sessionUndo(s);sessionEdit(s,r,c,3,true);return !sessionRedo(s);});
 check('固定數字不可修改',()=>{const s=createSession(real);const r=real.puzzle.findIndex(row=>row.some(n=>n!==0)),c=real.puzzle[r].findIndex(n=>n!==0);return !sessionEdit(s,r,c,1)&&s.board[r][c]===real.puzzle[r][c];});
 check('錯誤正式答案增加次數',()=>{const s=createSession(real),[r,c]=blank[0],wrong=real.solution[r][c]===9?1:9;sessionEdit(s,r,c,wrong);return s.mistakes===1;});
 check('筆記不算錯誤',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,4,true);return s.mistakes===0;});
 check('三次錯誤後結束禁止輸入',()=>{const s=createSession(real),[r,c]=blank[0],wrong=real.solution[r][c]===9?1:9;sessionEdit(s,r,c,wrong);sessionEdit(s,r,c,0);sessionEdit(s,r,c,wrong);sessionEdit(s,r,c,0);sessionEdit(s,r,c,wrong);return s.finished&&!s.won&&!sessionEdit(s,r,c,0);});
 check('關閉上限後仍累計且不結束',()=>{const s=createSession(real,{limitMistakes:false}),[r,c]=blank[0],wrong=real.solution[r][c]===9?1:9;for(let i=0;i<4;i++){sessionEdit(s,r,c,wrong);sessionEdit(s,r,c,0);}return s.mistakes===4&&!s.finished;});
 check('未填滿不能誤判通關',()=>{const s=createSession(real);finishIfNeeded(s);return !s.finished&&!s.won;});
 check('正確填滿才通關',()=>{const s=createSession(real);for(const [r,c] of blank)sessionEdit(s,r,c,real.solution[r][c]);return s.finished&&s.won&&!s.running;});
 check('通關後計時停止',()=>{const s=createSession(real);for(const [r,c] of blank)sessionEdit(s,r,c,real.solution[r][c]);sessionTick(s,100);return s.seconds===0;});
 check('基本邏輯提示次數統計',()=>{const s=createSession(real);const old=s.hintCount;const h=sessionHint(s);return s.hintCount===old+(['single','hidden'].includes(h.kind)?1:0);});
 check('存檔讀回還原盤面與筆記計時設定',()=>{const s=createSession(real,{limitMistakes:false,autoCheck:false}),[r,c]=blank[0];sessionEdit(s,r,c,4,true);sessionTick(s,62);let obj={};const storage={setItem(k,v){obj[k]=v;},getItem(k){return obj[k]||null;}};saveSession(storage,s);const t=loadSession(storage);return t.seconds===62&&t.notes[r][c].has(4)&&t.board[r][c]===0&&!t.limitMistakes&&!t.autoCheck&&countSolutions(t.game.puzzle,2)===1;});
 check('存檔操作歷史可恢復撤銷',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,3,true);const t=sessionImport(JSON.parse(JSON.stringify(sessionExport(s))));return sessionUndo(t)&&t.notes[r][c].size===0;});
 check('竄改固定數字存檔拒絕',()=>{const s=createSession(real),d=sessionExport(s);const r=real.puzzle.findIndex(row=>row.some(n=>n!==0)),c=real.puzzle[r].findIndex(n=>n!==0);d.board[r][c]=0;try{sessionImport(d);return false;}catch(e){return true;}});
 check('無唯一解存檔拒絕',()=>{const d=sessionExport(createSession(real));d.game.puzzle=Array.from({length:9},()=>Array(9).fill(0));try{sessionImport(d);return false;}catch(e){return true;}});
 check('重新開始獨立重置狀態',()=>{const s=createSession(real),[r,c]=blank[0];sessionEdit(s,r,c,2,true);sessionTick(s,12);const t=createSession(real);return t.seconds===0&&t.mistakes===0&&t.undo.length===0&&t.notes[r][c].size===0;});
 return {total:passed+failures.length,passed,failed:failures.length,failures};
}
