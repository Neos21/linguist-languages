const fs    = require('node:fs').promises;
const https = require('node:https');
const path  = require('node:path');

const languagesYamlUrl = 'https://raw.githubusercontent.com/github/linguist/master/lib/linguist/languages.yml';
const languagesYamlFilePath = path.resolve(__dirname, '../src/assets/languages.yaml');

/**
 * リクエストする
 * 
 * @param {string} url URL
 * @return {Promise<string>} レスポンス
 */
const request = (url) => new Promise((resolve, reject) => {
  const req = https.request(url, {}, (res) => {
    let data = '';
    res.setEncoding('utf8')
      .on('data' , (chunk) => { data += chunk; })
      .on('end'  , ()      => { resolve(data); });
  }).on('error'  , (error) => { reject(error); })
    .on('timeout', ()      => { req.destroy(); reject('Request Timeout'); })
    .setTimeout(5000)
    .end();
});

(async () => {
  console.log('Fetch Languages YAML');
  
  const yaml = await request(languagesYamlUrl);
  await fs.writeFile(languagesYamlFilePath, yaml, 'utf8');
  
  console.log('Finished');
})();
