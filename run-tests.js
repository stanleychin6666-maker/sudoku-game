const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const sandbox = { console, Date, Math, Set, Array, JSON };
vm.createContext(sandbox);
for (const file of ['sudoku.js', 'game-state.js', 'test.js', 'test-stage5.js', 'stage6.js', 'test-stage6.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, file), 'utf8'), sandbox, { filename: file });
}
const results = vm.runInContext('testStage2(100, console.log)', sandbox);
console.log('非法已知數字測試：', results.negativeTest ? 'PASS' : 'FAIL');
const third = vm.runInContext('testStage3()', sandbox);
console.log('第三階段衝突偵測：', `${third.passed}/${third.total}`, third.failed ? JSON.stringify(third.failures) : 'PASS');
const toggle = vm.runInContext('testToggle()', sandbox);
console.log('衝突開關測試：', `${toggle.passed}/${toggle.total}`, toggle.failed ? JSON.stringify(toggle.failures) : 'PASS');
console.log('全部測試：', results.allPassed && third.failed === 0 && toggle.failed === 0 ? 'PASS' : 'FAIL');
if (!results.allPassed || third.failed || toggle.failed) {
  console.error(JSON.stringify(results, null, 2));
  process.exitCode = 1;
}

const fourth = vm.runInContext('testStage4()', sandbox);
console.log('第四階段筆記與提示：', `${fourth.passed}/${fourth.total}`, fourth.failed ? JSON.stringify(fourth.failures) : 'PASS');
if (fourth.failed) process.exitCode = 1;
const fifth = vm.runInContext('testStage5()', sandbox);
console.log('第五階段計時／撤銷／錯誤／通關／存檔：',`${fifth.passed}/${fifth.total}`,fifth.failed?JSON.stringify(fifth.failures):'PASS');
if(fifth.failed)process.exitCode=1;
const sixth=vm.runInContext('testStage6()',sandbox);
console.log('第六階段：',`${sixth.passed}/${sixth.total}`,sixth.failed?JSON.stringify(sixth.failures):'PASS');
if(sixth.failed)process.exitCode=1;
