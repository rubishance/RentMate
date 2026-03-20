const https = require('https');

const url = 'https://api.cbs.gov.il/index/data/price?series=120490&format=json&download=false&last=2';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log('Error:', err.message));
