const fs   = require('node:fs').promises;
const path = require('node:path');

const srcAssetsDirectoryPath = path.resolve(__dirname, '../src/assets');
const dstAssetsDirectoryPath = path.resolve(__dirname, '../docs/assets');
const assetFileNames = ['languages.yaml', 'learned.yaml'];

/**
 * プロンプトでユーザ入力を受け付ける
 * 
 * https://qiita.com/suin/items/f18a7dd291d1e1319f44
 * 
 * @param {string} questionText 質問文
 * @return {Promise<string>} ユーザが入力した文字列・改行や空白は除去しておく
 */
const readText = async (questionText) => {
  process.stdout.write(`${questionText ? questionText + ' ' : ''}> `);
  process.stdin.resume();
  let text;
  try {
    text = await new Promise(resolve => process.stdin.once('data', resolve));
  }
  finally {
    process.stdin.pause();
  }
  return text.toString().trim();
};

(async () => {
  console.log('Sync Assets');
  
  for(let assetFileName of assetFileNames) {
    if(await readText(`[${assetFileName}] src To dst?`) === 'y') {
      await fs.copyFile(path.resolve(srcAssetsDirectoryPath, assetFileName), path.resolve(dstAssetsDirectoryPath, assetFileName));
      console.log('  Copied src To dst!');
    }
    else if(await readText(`[${assetFileName}] dst To src?`) === 'y') {
      await fs.copyFile(path.resolve(dstAssetsDirectoryPath, assetFileName), path.resolve(srcAssetsDirectoryPath, assetFileName));
      console.log('  Copied dst To src!');
    }
    else {
      console.log('  Skipped');
    }
  }
  
  console.log('Finished');
})();
