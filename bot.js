const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// Danh sách FAQ
const faq = {
  "giờ mở cửa": "Chúng tôi mở cửa từ 9h sáng đến 10h tối hàng ngày!",
  "địa chỉ": "Quán của chúng tôi ở 123 Đường ABC, Quận 1, TP.HCM!",
  "menu": "Anh xem menu tại link này nhé: https://mymenu.com",
};

// Trang chủ
app.get("/", (req, res) => {
  res.send("Hello, this is your bot powered by OpenAI!");
});

// Trang điều khoản và quyền riêng tư
app.get("/terms", (req, res) => {
  res.sendFile(path.join(__dirname, "terms.html"));
});

app.get("/privacy", (req, res) => {
  res.sendFile(path.join(__dirname, "Privacy.html"));
});

// Xác thực Webhook
app.get("/webhook", (req, res) => {
  if (req.query["hub.verify_token"] === VERIFY_TOKEN) {
    res.send(req.query["hub.challenge"]);
  } else {
    res.send("Error, wrong validation token");
  }
});

// Xử lý tin nhắn từ người dùng
app.post("/webhook", async (req, res) => {
  let body = req.body;
  if (body.object === "page") {
    body.entry.forEach(async (entry) => {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        let message = webhook_event.message.text?.toLowerCase();

        if (faq[message]) {
          sendMessage(sender_psid, faq[message]);
        } else if (webhook_event.message.quick_reply?.payload === "ASK_CHATGPT") {
          sendMessage(sender_psid, "Anh cứ hỏi, em sẽ nhờ ChatGPT trả lời!");
        } else {
          sendMessage(sender_psid, "Anh cần hỗ trợ chi tiết hơn? Gọi ngay 098xxx hoặc nhấn 'Hỏi ChatGPT'");
          sendQuickReplies(sender_psid);
        }
      }
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Hàm gửi tin nhắn
function sendMessage(sender_psid, response) {
  let request_body = {
    recipient: { id: sender_psid },
    message: { text: response },
  };
  axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body)
    .catch(error => console.error("Error sending message:", error.response.data));
}

// Gửi lựa chọn "Hỏi ChatGPT"
function sendQuickReplies(sender_psid) {
  let request_body = {
    recipient: { id: sender_psid },
    message: {
      text: "Chọn một tùy chọn:",
      quick_replies: [
        { content_type: "text", title: "Hỏi ChatGPT", payload: "ASK_CHATGPT" },
      ],
    },
  };
  axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body)
    .catch(error => console.error("Error sending quick replies:", error.response.data));
}

app.listen(3000, () => console.log("Chatbot is running on port 3000"));
