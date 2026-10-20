function validateSudoku(board) {
  if (!Array.isArray(board) || board.length !== 9) return false;
  if (board.some(row => !Array.isArray(row) || row.length !== 9)) return false;
  const validNine = values =>
    values.length === 9 &&
    values.every(n => Number.isInteger(n) && n >= 1 && n <= 9) &&
    new Set(values).size === 9;
  for (let i = 0; i < 9; i++) {
    if (!validNine(board[i])) return false;
    if (!validNine(board.map(row => row[i]))) return false;
  }
  for (let r = 0; r < 9; r += 3) {
    for (let c = 0; c < 9; c += 3) {
      const box = [];
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) box.push(board[r + dr][c + dc]);
      }
      if (!validNine(box)) return false;
    }
  }
  return true;
}

function testSudoku(total = 100) {
  let passed = 0;
  const examples = [];
  for (let i = 0; i < total; i++) {
    try {
      const board = generateSudoku();
      if (validateSudoku(board)) passed++;
      else examples.push({ test: i + 1, reason: '不符合數獨規則', board });
    } catch (error) {
      examples.push({ test: i + 1, reason: String(error) });
    }
  }
  return { total, passed, failed: total - passed, examples };
}

// 第二階段：300 題與故意注入的非法操作測試。
function testStage2(perDifficulty = 100, log = () => {}) {
  const results = {};
  for (const difficulty of Object.keys(HOLE_RANGES)) {
    const failures = [];
    const counts = [];
    const startedAt = Date.now();
    for (let i = 1; i <= perDifficulty; i++) {
      try {
        const game = generatePuzzle(difficulty);
        const { puzzle, solution } = game;
        const holes = blankCount(puzzle);
        const [min, max] = HOLE_RANGES[difficulty];
        const boardBefore = JSON.stringify(puzzle);
        const unique = countSolutions(puzzle, 2);
        const player = cloneBoard(puzzle);
        const clueIndex = puzzle.flat().findIndex(n => n !== 0);
        const row = Math.floor(clueIndex / 9), col = clueIndex % 9;
        const before = player[row][col];
        const accepted = setPlayerCell(puzzle, player, row, col, (before % 9) + 1);
        const holeIndex = puzzle.flat().findIndex(n => n === 0);
        const hr = Math.floor(holeIndex / 9), hc = holeIndex % 9;
        const allowed = setPlayerCell(puzzle, player, hr, hc, solution[hr][hc]);
        const checks = {
          solutionValid: validateSudoku(solution),
          cluesValid: validateClues(puzzle),
          unique: unique === 1,
          holesInRange: holes >= min && holes <= max && holes === game.target,
          immutableClue: !accepted && player[row][col] === before,
          editableBlank: allowed && player[hr][hc] === solution[hr][hc],
          puzzleUnchanged: JSON.stringify(puzzle) === boardBefore,
          originalNumbersMatch: puzzle.every((line, r) => line.every((n, c) => n === 0 || n === solution[r][c]))
        };
        if (!Object.values(checks).every(Boolean)) failures.push({ test: i, checks, holes });
        else counts.push(holes);
      } catch (error) { failures.push({ test: i, error: String(error) }); }
    }
    results[difficulty] = {
      total: perDifficulty, passed: counts.length, failed: failures.length,
      observedHoleRange: counts.length ? [Math.min(...counts), Math.max(...counts)] : null,
      seconds: (Date.now() - startedAt) / 1000, failures
    };
    log(`${DIFFICULTY_LABELS[difficulty]}：通過 ${counts.length}/${perDifficulty}，失敗 ${failures.length}，耗時 ${results[difficulty].seconds}s`);
  }
  // 負面測試：行內重複已知數字，不得判為合法。
  const invalid = generateSudoku();
  invalid[0][1] = invalid[0][0];
  results.negativeTest = !validateClues(invalid) && countSolutions(invalid, 2) === 0;
  results.allPassed = Object.values(results).filter(v => v && typeof v === 'object').every(r => r.failed === 0) && results.negativeTest;
  return results;
}

if (typeof module !== 'undefined' && require.main === module) {
  const results = testStage2(100, console.log);
  console.log('非法盤面拒絕測試：', results.negativeTest ? 'PASS' : 'FAIL');
  if (!results.allPassed) {
    console.error('失敗案例：', JSON.stringify(results, null, 2));
    process.exitCode = 1;
  }
}


// 第三階段：人工構造衝突案例，確認兩個衝突格都被標記且修正後消失。
function testStage3() {
  const failures = [];
  let passed = 0;
  const check = (name, action) => {
    try { if (!action()) throw new Error('條件不成立'); passed++; }
    catch (error) { failures.push({ name, error: String(error) }); }
  };
  const empty = () => Array.from({length: 9}, () => Array(9).fill(0));
  const eq = (set, items) => set.size === items.length && items.every(x => set.has(x));
  check('橫列重複，標記兩格', () => {
    const b = empty(); b[0][0] = 4; b[0][5] = 4;
    return eq(findConflicts(b), [0, 5]);
  });
  check('直行重複，標記兩格', () => {
    const b = empty(); b[0][0] = 4; b[5][0] = 4;
    return eq(findConflicts(b), [0, 45]);
  });
  check('宮格重複，標記兩格', () => {
    const b = empty(); b[0][0] = 4; b[2][2] = 4;
    return eq(findConflicts(b), [0, 20]);
  });
  check('多組重複，標記所有衝突格', () => {
    const b = empty(); b[0][0] = 1; b[0][1] = 1;
    b[4][4] = 7; b[4][7] = 7;
    return eq(findConflicts(b), [0, 1, 40, 43]);
  });
  check('修正後紅色消失', () => {
    const b = empty(); b[0][0] = 4; b[0][1] = 4;
    const before = findConflicts(b).size === 2;
    b[0][1] = 5;
    return before && findConflicts(b).size === 0;
  });
  check('清除數字後紅色消失', () => {
    const b = empty(); b[0][0] = 4; b[0][1] = 4;
    b[0][1] = 0;
    return findConflicts(b).size === 0;
  });
  check('零不被視為重複', () => findConflicts(empty()).size === 0);
  check('合法完整數獨沒有衝突', () => findConflicts(generateSudoku()).size === 0);
  check('偵測不會修改盤面', () => {
    const b = empty(); b[3][3] = 8; b[3][5] = 8;
    const before = JSON.stringify(b); findConflicts(b);
    return before === JSON.stringify(b);
  });
  check('仍不能修改題目固定數字', () => {
    const puzzle = generateSudoku(), player = cloneBoard(puzzle);
    const original = player[0][0];
    return !setPlayerCell(puzzle, player, 0, 0, 0) && player[0][0] === original;
  });
  return { total: passed + failures.length, passed, failed: failures.length, failures };
}


// 第三階段增補：純邏輯測試。模擬開關切換，確認衝突可見性與盤面不變。
function testToggle() {
  const failures = []; let passed = 0;
  const check = (name, fn) => {
    try { if (!fn()) throw new Error('條件不成立'); passed++; }
    catch (e) { failures.push({ name, error: String(e) }); }
  };
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  board[0][0] = 7; board[0][4] = 7;
  const original = JSON.stringify(board);
  check('開啟時立即顯示兩格衝突', () => visibleConflicts(board, true).size === 2);
  check('關閉時隱藏全部衝突', () => visibleConflicts(board, false).size === 0);
  check('再次開啟時還原原本的衝突', () => visibleConflicts(board, true).has(0) && visibleConflicts(board, true).has(4));
  check('反覆切換不修改玩家填答', () => JSON.stringify(board) === original);
  check('關閉後輸入仍能保持，開啟重查新盤面', () => {
    board[0][4] = 3;
    return visibleConflicts(board, false).size === 0 && visibleConflicts(board, true).size === 0 && board[0][4] === 3;
  });
  check('關閉不干涉實際衝突檢查', () => {
    board[0][4] = 7;
    return visibleConflicts(board, false).size === 0 && findConflicts(board).size === 2;
  });
  return { total: passed + failures.length, passed, failed: failures.length, failures };
}

function testStage4() {
  const failures = []; let passed = 0;
  const check = (name, fn) => { try { if (!fn()) throw new Error('條件不成立'); passed++; } catch(e) { failures.push({name,error:String(e)}); } };
  const solution = generateSudoku();
  const puzzle = cloneBoard(solution); puzzle[0][0] = 0; puzzle[0][1] = 0;
  const board = cloneBoard(puzzle), notes = createNotes();
  const original = JSON.stringify(board);
  check('新增候選數字不更動正式盤面', () => toggleNote(puzzle,board,notes,0,0,2) && notes[0][0].has(2) && JSON.stringify(board)===original);
  check('再次點同數字取消筆記', () => toggleNote(puzzle,board,notes,0,0,2) && !notes[0][0].has(2));
  check('允許多個候選數字', () => toggleNote(puzzle,board,notes,0,0,1) && toggleNote(puzzle,board,notes,0,0,3) && notes[0][0].size===2);
  check('固定題目數字不能加筆記', () => !toggleNote(puzzle,board,notes,1,1,4) && notes[1][1].size===0);
  check('正式答案清除本格筆記', () => enterPlayerAnswer(puzzle,board,notes,0,0,solution[0][0]) && notes[0][0].size===0);
  check('已有正式答案不可加筆記', () => !toggleNote(puzzle,board,notes,0,0,4));
  check('筆記不影響原始題目', () => JSON.stringify(puzzle)===original);
  check('固定數字仍不可修改', () => !enterPlayerAnswer(puzzle,board,notes,1,1,0));
  const oneMissing = cloneBoard(solution); oneMissing[5][6]=0;
  const before = JSON.stringify(oneMissing);
  check('唯一候選提示正確', () => { const h=findLogicalHint(oneMissing); return h.kind==='single' && h.row===5 && h.col===6 && h.number===solution[5][6]; });
  check('提示不更動正式盤面', () => JSON.stringify(oneMissing)===before);
  const invalid = cloneBoard(solution); invalid[0][0]=invalid[0][1];
  check('盤面重複時拒絕給提示', () => findLogicalHint(invalid).kind==='invalid');
  check('已填滿盤面明確告知無提示', () => findLogicalHint(solution).kind==='none');
  check('無空格題目仍然唯一解', () => countSolutions(solution,2)===1);
  check('清除正式答案時不影響其他格筆記', () => { toggleNote(puzzle,board,notes,0,1,7); enterPlayerAnswer(puzzle,board,notes,0,0,0); return board[0][0]===0 && notes[0][1].has(7); });
  return {total:passed+failures.length,passed,failed:failures.length,failures};
}
