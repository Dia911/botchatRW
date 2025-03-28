require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());

const { FACEBOOK_PAGE_ACCESS_TOKEN, VERIFY_TOKEN, PHONE_NUMBER, PORT = 3000 } = process.env;

if (!VERIFY_TOKEN) {
  console.error("❌ LỖI: VERIFY_TOKEN chưa được đặt trong .env");
  process.exit(1);
}

const faq = {
  "giờ mở cửa": "Chúng tôi mở cửa từ 9h sáng đến 10h tối hàng ngày!",
  "địa chỉ": "Quán của chúng tôi ở 123 Đường ABC, Quận 1, TP.HCM!",
  "menu": "Anh xem menu tại link này nhé: https://mymenu.com",
};

app.get("/", (req, res) => res.send("Hello, this is your bot powered by OpenAI!"));
app.get("/terms", (req, res) => res.sendFile(path.join(__dirname, "terms.html")));
app.get("/privacy", (req, res) => res.sendFile(path.join(__dirname, "Privacy.html")));

app.get("/webhook", (req, res) => {
  req.query["hub.verify_token"] === VERIFY_TOKEN
    ? res.send(req.query["hub.challenge"])
    : res.status(403).send("Error, wrong validation token");
});

app.post("/webhook", async (req, res) => {
  if (req.body.object === "page") {
    req.body.entry.forEach(async (entry) => {
      let webhook_event = entry.messaging[0];
      let sender_psid = webhook_event.sender.id;

      if (webhook_event.message) {
        let message = webhook_event.message.text?.toLowerCase();
        sendMessage(sender_psid, faq[message] || "Anh cần hỗ trợ chi tiết hơn?", true);
      } else if (webhook_event.postback) {
        let payload = webhook_event.postback.payload;
        let response = payload === "CALL_SUPPORT" ? `Anh vui lòng gọi ${PHONE_NUMBER} để được hỗ trợ!` : "Anh cứ hỏi, em sẽ nhờ ChatGPT trả lời!";
        sendMessage(sender_psid, response);
      }
    });
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

function sendMessage(sender_psid, response, withQuickReplies = false) {
  let request_body = {
    recipient: { id: sender_psid },
    message: { text: response },
  };
  if (withQuickReplies) {
    request_body.message.quick_replies = [
      { content_type: "text", title: "📞 Gọi hỗ trợ", payload: "CALL_SUPPORT" },
      { content_type: "text", title: "Hỏi ChatGPT", payload: "ASK_CHATGPT" },
    ];
  }
  axios.post(`https://graph.facebook.com/v12.0/me/messages?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`, request_body)
    .then(() => console.log(`📩 Gửi tin nhắn đến ${sender_psid}: ${response}`))
    .catch((error) => console.error("❌ LỖI GỬI TIN NHẮN:", error.response?.data || error.message));
}

async function setupPhoneButton() {
  try {
    await axios.post(`https://graph.facebook.com/v12.0/me/messenger_profile?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`, {
      persistent_menu: [
        {
          locale: "default",
          composer_input_disabled: false,
          call_to_actions: [
            { title: "📞 Gọi hỗ trợ", type: "phone_number", payload: "CALL_SUPPORT", phone_number: PHONE_NUMBER },
            { title: "📜 Xem menu", type: "web_url", url: "https://mymenu.com" },
          ],
        },
      ],
    });
    console.log("✅ Đã thêm nút gọi điện vào menu!");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật menu:", error.response?.data || error.message);
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Chatbot is running on port ${PORT}`);
  await setupPhoneButton();
});
