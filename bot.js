const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Endpoint cho trang Điều khoản Dịch vụ
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'));
});

// Endpoint cho trang Chính sách Quyền riêng tư
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'privacy.html'));
});

// Endpoint chính của bot (Home)
app.get('/', (req, res) => {
  res.send('Hello, this is your bot!');
});

// Endpoint webhook cho xác thực từ Facebook (GET)
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === '123ABC') {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');
  }
});

// Endpoint webhook để lắng nghe tin nhắn từ người dùng (POST)
app.post('/webhook', (req, res) => {
  let messaging_events = req.body.entry[0].messaging;
  for (let i = 0; i < messaging_events.length; i++) {
    let event = messaging_events[i];
    let sender = event.sender.id;
    if (event.message && event.message.text) {
      let text = event.message.text;
      sendMessage(sender, text);
    }
  }
  res.sendStatus(200);
});

// Hàm gửi tin nhắn về cho người dùng
function sendMessage(sender, text) {
  let messageData = { text: text };
  request({
    url: 'https://graph.facebook.com/v9.0/me/messages',
    qs: { access_token: 'EACFMGD4YyfMBO6qbMZArBKaY2JBoVjCqclWxnDvTRWuMZA0Ut1JBn41X8p5TVToXZAPAkU1FsCGhZCnpe1lCpTAdT7CuDdRZB9ILegSqPzFWf6MXyV2nQrhyhMyloiTUUy8CuvNNqdK61UtzbhpsQ8WyNPjtKTVZA65NltlZCdkwqRvGgdTJaVo8w6rgLXZClCOgBQZDZD' 
    // Lưu ý: Anh nên lưu token này dưới dạng biến môi trường để bảo mật
  }, {
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: messageData
    }
  }, (error, response, body) => {
    if (error) {
      console.error('Lỗi khi gửi tin nhắn:', error);
    } else if (response.body.error) {
      console.error('Lỗi từ Facebook:', response.body.error);
    }
  });
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
