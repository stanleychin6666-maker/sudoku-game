let sudokuRandom = Math.random;
function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(sudokuRandom() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isValidPlacement(board, row, col, number) {
  for (let i = 0; i < 9; i++) {
    if (board[row][i] === number || board[i][col] === number) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (board[r][c] === number) return false;
    }
  }
  return true;
}

function generateSudoku() {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  function fill(position) {
    if (position === 81) return true;
    const row = Math.floor(position / 9);
    const col = position % 9;
    for (const number of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (!isValidPlacement(board, row, col, number)) continue;
      board[row][col] = number;
      if (fill(position + 1)) return true;
      board[row][col] = 0;
    }
    return false;
  }
  if (!fill(0)) throw new Error('完整數獨生成失敗');
  return board;
}

// 第二階段新增：難度標籤與空格範圍分開，未來可替換為真正的難度評分。
const HOLE_RANGES = Object.freeze({ easy: [30, 35], medium: [36, 45], hard: [46, 55] });
const DIFFICULTY_LABELS = Object.freeze({ easy: '簡單', medium: '中等', hard: '困難' });
const cloneBoard = board => board.map(row => [...row]);
const blankCount = board => board.flat().filter(n => n === 0).length;

// 列、欄、宮格不能有重複的已知數字；允許空格 0。
function validateClues(board) {
  if (!Array.isArray(board) || board.length !== 9 || board.some(row => !Array.isArray(row) || row.length !== 9)) return false;
  if (board.some(row => row.some(n => !Number.isInteger(n) || n < 0 || n > 9))) return false;
  const unique = values => {
    const filled = values.filter(n => n !== 0);
    return filled.length === new Set(filled).size;
  };
  for (let i = 0; i < 9; i++) {
    if (!unique(board[i]) || !unique(board.map(row => row[i]))) return false;
  }
  for (let r = 0; r < 9; r += 3) for (let c = 0; c < 9; c += 3) {
    const values = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) values.push(board[r + dr][c + dc]);
    if (!unique(values)) return false;
  }
  return true;
}

// 最多找 limit 個解，通常設定為 2：找到第二解即停止。
// 不會修改傳入的盤面。MRV 優先選候選數最少的空格以提升速度。
function countSolutions(puzzle, limit = 2) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit 必須為正整數');
  if (!validateClues(puzzle)) return 0;
  const board = cloneBoard(puzzle);
  let solutions = 0;
  function search() {
    if (solutions >= limit) return;
    let bestR = -1, bestC = -1, bestCandidates = null;
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
      if (board[r][c] !== 0) continue;
      const used = new Set();
      for (let k = 0; k < 9; k++) { used.add(board[r][k]); used.add(board[k][c]); }
      const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (let i = br; i < br + 3; i++) for (let j = bc; j < bc + 3; j++) used.add(board[i][j]);
      const candidates = [];
      for (let n = 1; n <= 9; n++) if (!used.has(n)) candidates.push(n);
      if (candidates.length === 0) return;
      if (bestCandidates === null || candidates.length < bestCandidates.length) {
        bestCandidates = candidates; bestR = r; bestC = c;
      }
    }
    if (bestCandidates === null) { solutions++; return; }
    for (const n of bestCandidates) {
      board[bestR][bestC] = n;
      search();
      board[bestR][bestC] = 0;
      if (solutions >= limit) return;
    }
  }
  search();
  return solutions;
}

// 每次挖空就檢查唯一解。若未達目標，必須明確回報失敗。
function generatePuzzle(difficulty, options = {}) {
  const range = HOLE_RANGES[difficulty];
  if (!range) throw new Error('無效的難度選項');
  const target = options.target ?? (range[0] + Math.floor(sudokuRandom() * (range[1] - range[0] + 1)));
  const maxAttempts = options.maxAttempts ?? 8;
  if (!Number.isInteger(target) || target < range[0] || target > range[1]) throw new RangeError('目標空格數超出難度範圍');
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1) throw new RangeError('maxAttempts 必須為正整數');
  let mostRemoved = 0;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const solution = generateSudoku(); // 沿用第一階段
    const puzzle = cloneBoard(solution);
    let removed = 0;
    const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
    for (const index of positions) {
      if (removed === target) break;
      const r = Math.floor(index / 9), c = index % 9;
      const previous = puzzle[r][c];
      puzzle[r][c] = 0;
      if (countSolutions(puzzle, 2) === 1) removed++;
      else puzzle[r][c] = previous; // 超過一個解，恢復原數字
    }
    mostRemoved = Math.max(mostRemoved, removed);
    if (removed === target) return { puzzle, solution, difficulty, target, removed, attempts: attempt };
  }
  throw new Error(`未達目標：需要挖空 ${target} 格，最多只完成 ${mostRemoved} 格（嘗試 ${maxAttempts} 次），未降低唯一解標準。`);
}

// 僅允許玩家修改原始題目中的空格。回傳 boolean 表示是否成功。
function setPlayerCell(puzzle, playerBoard, row, col, number) {
  if (!validateClues(puzzle)) throw new Error('題目不合法');
  if (!Array.isArray(playerBoard) || playerBoard.length !== 9 || playerBoard.some(line => !Array.isArray(line) || line.length !== 9)) throw new Error('玩家盤面尺寸錯誤');
  if (![row, col].every(n => Number.isInteger(n) && n >= 0 && n < 9)) return false;
  if (!Number.isInteger(number) || number < 0 || number > 9) return false;
  if (puzzle[row][col] !== 0) return false;
  playerBoard[row][col] = number;
  return true;
}


// 第三階段新增：找出行、列、九宮格中所有重複數字所在的位置。
// 回傳 Set，元素為 row * 9 + col；0 視為空格，不會標紅。
// 此函式只讀取玩家盤面，不會修改題目、解答或唯一解判斷邏輯。
function findConflicts(board) {
  if (!Array.isArray(board) || board.length !== 9 ||
      board.some(row => !Array.isArray(row) || row.length !== 9 ||
        row.some(n => !Number.isInteger(n) || n < 0 || n > 9))) {
    throw new Error('玩家盤面不合法：必須是 9×9，且數字介於 0～9');
  }
  const conflicts = new Set();
  const checkGroup = positions => {
    const seen = new Map();
    for (const [r, c] of positions) {
      const n = board[r][c];
      if (n === 0) continue;
      if (!seen.has(n)) seen.set(n, []);
      seen.get(n).push(r * 9 + c);
    }
    for (const positionsForNumber of seen.values()) {
      if (positionsForNumber.length > 1) {
        for (const index of positionsForNumber) conflicts.add(index);
      }
    }
  };
  for (let r = 0; r < 9; r++) checkGroup(Array.from({ length: 9 }, (_, c) => [r, c]));
  for (let c = 0; c < 9; c++) checkGroup(Array.from({ length: 9 }, (_, r) => [r, c]));
  for (let br = 0; br < 9; br += 3) {
    for (let bc = 0; bc < 9; bc += 3) {
      const positions = [];
      for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) {
        positions.push([br + dr, bc + dc]);
      }
      checkGroup(positions);
    }
  }
  return conflicts;
}


// 第三階段增補：切換僅影響顯示，不修改盤面或唯一解驗證。
function visibleConflicts(board, enabled) {
  return enabled ? findConflicts(board) : new Set();
}


// 第四階段：筆記和正式盤面分離；每格是一個 Set。
function createNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
}
function toggleNote(puzzle, board, notes, row, col, number) {
  if (!Number.isInteger(row) || row < 0 || row > 8 || !Number.isInteger(col) || col < 0 || col > 8 ||
      !Number.isInteger(number) || number < 1 || number > 9) return false;
  if (puzzle[row][col] !== 0 || board[row][col] !== 0) return false;
  const cell = notes[row][col];
  if (cell.has(number)) cell.delete(number); else cell.add(number);
  return true;
}
function enterPlayerAnswer(puzzle, board, notes, row, col, number) {
  if (!setPlayerCell(puzzle, board, row, col, number)) return false;
  if (number !== 0) notes[row][col].clear();
  return true;
}
function candidatesFor(board, row, col) {
  if (board[row][col] !== 0) return [];
  const used = new Set();
  for (let i = 0; i < 9; i++) { used.add(board[row][i]); used.add(board[i][col]); }
  const br = Math.floor(row / 3) * 3, bc = Math.floor(col / 3) * 3;
  for (let r = br; r < br + 3; r++) for (let c = bc; c < bc + 3; c++) used.add(board[r][c]);
  return Array.from({ length: 9 }, (_, i) => i + 1).filter(n => !used.has(n));
}
// 只用玩家當前盤面的邏輯：唯一候選（naked single）、區域唯一位置（hidden single）。
// 不讀取 solution，不修改 board；發現衝突或死格時拒絕提供推斷。
function findLogicalHint(board) {
  if (!validateClues(board)) return { kind: 'invalid', message: '目前盤面存在重複數字，請先修正衝突。' };
  const cands = Array.from({ length: 9 }, (_, r) => Array.from({ length: 9 }, (_, c) => candidatesFor(board, r, c)));
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (board[r][c] === 0 && cands[r][c].length === 0) return { kind: 'invalid', message: '目前有空格沒有任何合法候選數字，請先檢查填答。' };
  }
  for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) {
    if (cands[r][c].length === 1) return { kind: 'single', row:r, col:c, number:cands[r][c][0], message:`第 ${r+1} 列、第 ${c+1} 行只剩下 ${cands[r][c][0]} 這一個合法候選數字。` };
  }
  const groups = [];
  for (let r = 0; r < 9; r++) groups.push({ name:`第 ${r+1} 列`, positions:Array.from({length:9},(_,c)=>[r,c]) });
  for (let c = 0; c < 9; c++) groups.push({ name:`第 ${c+1} 行`, positions:Array.from({length:9},(_,r)=>[r,c]) });
  for (let br = 0; br < 9; br += 3) for (let bc = 0; bc < 9; bc += 3) {
    const positions = [];
    for (let dr = 0; dr < 3; dr++) for (let dc = 0; dc < 3; dc++) positions.push([br+dr,bc+dc]);
    groups.push({ name:`第 ${br/3+1} 排、第 ${bc/3+1} 個九宮格`, positions });
  }
  for (const group of groups) for (let n = 1; n <= 9; n++) {
    const locations = group.positions.filter(([r,c])=>cands[r][c].includes(n));
    if (locations.length === 1) {
      const [row,col] = locations[0];
      return {kind:'hidden',row,col,number:n,message:`${group.name}中，數字 ${n} 只能放在第 ${row+1} 列、第 ${col+1} 行。`};
    }
  }
  return {kind:'none',message:'目前找不到「唯一候選」或「區域唯一位置」的基本邏輯提示；未使用答案直接猜測。'};
}
