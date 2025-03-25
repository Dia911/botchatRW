const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// Đặt port cho server
const port = process.env.PORT || 5000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.get('/', (req, res) => {
  res.send('Hello, this is your bot powered by OpenAI!');
});

// Endpoint cho trang Điều khoản Dịch vụ (Terms)
app.get('/terms', (req, res) => {
  res.sendFile(path.join(__dirname, 'terms.html'), (err) => {
    if (err) {
      console.error('Error sending terms.html:', err);
      res.status(err.status || 500).end();
    }
  });
});

// Endpoint cho trang Chính sách Quyền riêng tư (Privacy)
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'Privacy.html'), (err) => {
    if (err) {
      console.error('Error sending Privacy.html:', err);
      res.status(err.status || 500).end();
    }
  });
});

// Cấu hình webhook (GET) để xác thực
app.get('/webhook', (req, res) => {
  if (req.query['hub.verify_token'] === 'my_secure_token') {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');
  }
});

// Lắng nghe tin nhắn từ người dùng (POST)
app.post('/webhook', async (req, res) => {
  let messaging_events = req.body.entry[0].messaging;
  for (let event of messaging_events) {
    let sender = event.sender.id;
    if (event.message && event.message.text) {
      let userMessage = event.message.text;
      let botReply = await getOpenAIResponse(userMessage);
      sendMessage(sender, botReply);
    }
  }
  res.sendStatus(200);
});

// Hàm gọi OpenAI API để tạo phản hồi
async function getOpenAIResponse(message) {
  try {
    let response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'system', content: 'You are a helpful assistant.' }, { role: 'user', content: message }],
    }, {
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return 'Xin lỗi, tôi không thể trả lời ngay bây giờ.';
  }
}

// Hàm gửi tin nhắn về cho người dùng
function sendMessage(sender, text) {
  let messageData = { text: text };
  request({
    url: 'https://graph.facebook.com/v9.0/me/messages',
    qs: { access_token: process.env.FACEBOOK_PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: {
      recipient: { id: sender },
      message: messageData
    }
  }, (error, response, body) => {
    if (error) {
      console.error('Error sending message:', error);
    } else if (response.body.error) {
      console.error('Facebook API error:', response.body.error);
    }
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
