function testStage6(){let passed=0,failed=[];function ok(name,test){try{if(!test())throw Error('assertion failed');passed++;}catch(e){failed.push(name+': '+e.message);}}
 const fake=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
 const a=dailyPuzzle('2026-10-20'),b=dailyPuzzle('2026-10-20'),c=dailyPuzzle('2026-10-21');
 ok('每日題目唯一解',()=>countSolutions(a.puzzle,2)===1&&validateClues(a.puzzle));
 ok('同日期可重現',()=>JSON.stringify(a.puzzle)===JSON.stringify(b.puzzle));
 ok('跨日期不同',()=>JSON.stringify(a.puzzle)!==JSON.stringify(c.puzzle));
 ok('亂數來源恢復',()=>sudokuRandom===Math.random);
 ok('台灣午夜時區',()=>taipeiDate(new Date('2026-10-19T16:05:00Z'))==='2026-10-20');
 const store=fake(),s=createSession(a);s.board=cloneBoard(a.solution);finishIfNeeded(s);s.seconds=180;s.hintCount=2;s.mistakes=1;
 ok('完成紀錄新增',()=>recordCompleted(store,'gameA',s,{mode:'daily',day:'2026-10-20'}));
 ok('同遊戲重複防護',()=>!recordCompleted(store,'gameA',s,{mode:'daily',day:'2026-10-20'})&&readStats(store).records.length===1);
 ok('失敗局不能上榜',()=>{const x=createSession(a);x.finished=true;x.won=false;return !recordCompleted(store,'fail',x,{mode:'normal'});});
 ok('未完成不能上榜',()=>!recordCompleted(store,'incomplete',createSession(a),{mode:'normal'}));
 ok('成績刷新保存',()=>readStats(store).records.length===1);
 ok('完成總場與平均',()=>statistics(readStats(store).records).total===1&&statistics(readStats(store).records).byDifficulty.medium.average===180);
 ok('連續天數',()=>{for(const day of ['2026-10-18','2026-10-19'])recordCompleted(store,'daily:'+day,s,{mode:'daily',day});return dailyStatus(readStats(store).records,'2026-10-20').streak===3;});
 ok('排行榜排序條件',()=>{const rows=[{difficulty:'easy',seconds:100,mistakes:2,hints:0,completedAt:'2026-01-01'},{difficulty:'easy',seconds:100,mistakes:1,hints:3,completedAt:'2026-01-02'},{difficulty:'easy',seconds:100,mistakes:1,hints:1,completedAt:'2026-01-03'},{difficulty:'easy',seconds:99,mistakes:10,hints:10,completedAt:'2026-01-04'}];return sortedLeaderboard(rows,'easy').map(x=>x.completedAt).join(',')==='2026-01-04,2026-01-03,2026-01-02,2026-01-01';});
 ok('紀錄只保留最近十場',()=>statistics(Array.from({length:15},(_,i)=>({id:String(i),difficulty:'easy',seconds:i,mistakes:0,hints:0,completedAt:`2026-10-${String(i+1).padStart(2,'0')}`}))).recent.length===10);
 return {passed,total:passed+failed.length,failed:failed.length,failures:failed};}
