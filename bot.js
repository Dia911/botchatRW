require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PHONE_NUMBER = "+8491381686"; // Số điện thoại hỗ trợ (định dạng quốc tế)

if (!VERIFY_TOKEN) {
  console.error("❌ LỖI: VERIFY_TOKEN chưa được đặt trong .env");
  process.exit(1);
}

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
    res.status(403).send("Error, wrong validation token");
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
        } else {
          sendQuickReplies(sender_psid);
        }
      } else if (webhook_event.postback) {
        let payload = webhook_event.postback.payload;
        if (payload === "CALL_SUPPORT") {
          sendMessage(sender_psid, `Anh vui lòng gọi ${PHONE_NUMBER} để được hỗ trợ!`);
        } else if (payload === "ASK_CHATGPT") {
          sendMessage(sender_psid, "Anh cứ hỏi, em sẽ nhờ ChatGPT trả lời!");
        }
      }
    });
    res.status(200).send("EVENT_RECEIVED");
  } else {
    res.sendStatus(404);
  }
});

// Gửi tin nhắn
function sendMessage(sender_psid, response) {
  let request_body = {
    recipient: { id: sender_psid },
    message: { text: response },
  };
  axios
    .post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body)
    .then(() => console.log(`📩 Gửi tin nhắn đến ${sender_psid}: ${response}`))
    .catch((error) => console.error("❌ LỖI GỬI TIN NHẮN:", error.response?.data || error.message));
}

// Gửi lựa chọn gọi điện hoặc hỏi ChatGPT
function sendQuickReplies(sender_psid) {
  let request_body = {
    recipient: { id: sender_psid },
    message: {
      text: "Anh cần hỗ trợ chi tiết hơn?",
      quick_replies: [
        { content_type: "text", title: "📞 Gọi hỗ trợ", payload: "CALL_SUPPORT" },
        { content_type: "text", title: "Hỏi ChatGPT", payload: "ASK_CHATGPT" },
      ],
    },
  };
  axios
    .post(`https://graph.facebook.com/v12.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, request_body)
    .then(() => console.log(`📩 Gửi quick replies đến ${sender_psid}`))
    .catch((error) => console.error("❌ LỖI GỬI QUICK REPLIES:", error.response?.data || error.message));
}

// Cấu hình nút gọi điện trong menu Messenger
const setupPhoneButton = async () => {
  const url = `https://graph.facebook.com/v12.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`;
  const menuData = {
    persistent_menu: [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          {
            title: "📞 Gọi hỗ trợ",
            type: "phone_number",
            payload: "CALL_SUPPORT",
            phone_number: PHONE_NUMBER,
          },
          {
            title: "📜 Xem menu",
            type: "web_url",
            url: "https://mymenu.com",
          },
        ],
      },
    ],
  };

  try {
    await axios.post(url, menuData);
    console.log("✅ Đã thêm nút gọi điện vào menu!");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật menu:", error.response?.data || error.message);
  }
};

// Chạy server + cài đặt nút gọi điện
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Chatbot is running on port ${PORT}`);
  await setupPhoneButton(); // Gọi hàm setup menu khi server khởi động
});
const request = require("request");

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN; // Lấy từ biến môi trường Railway

const menuData = {
  persistent_menu: [
    {
      locale: "default",
      composer_input_disabled: false,
      call_to_actions: [
        {
          type: "web_url",
          title: "📞 Gọi ngay",
          url: "tel:+8491381686"
        }
      ]
    }
  ]
};

request({
  url: `https://graph.facebook.com/v18.0/me/messenger_profile?access_token=${PAGE_ACCESS_TOKEN}`,
  method: "POST",
  json: true,
  body: menuData
}, (error, response, body) => {
  if (error) {
    console.error("❌ Lỗi khi cập nhật menu:", error);
  } else {
    console.log("✅ Menu cập nhật thành công:", body);
  }
});
