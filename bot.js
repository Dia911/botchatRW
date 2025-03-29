require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public"))); // 🔹 Cấu hình phục vụ file tĩnh

const { FACEBOOK_PAGE_ACCESS_TOKEN, VERIFY_TOKEN, PHONE_NUMBER, PORT = 3000 } = process.env;

if (!VERIFY_TOKEN) {
  console.error("❌ LỖI: VERIFY_TOKEN chưa được đặt trong .env");
  process.exit(1);
}

// Thông tin FAQ cho chatbot
const faq = {
  "openlive group": "OpenLive Group là tập đoàn công nghệ chuyên về AI, Web3, truyền thông và thương mại điện tử.",
  "công ty thành viên": `Các công ty thành viên:
    - OBranding: Thương mại điện tử số.
    - OMedia Studio: Truyền thông AI.
    - OLabs: AI, Machine Learning, Web3.`,
  "sản phẩm dịch vụ": "Mobase Exchange, Monbase NFT, OBranding, Mobase Token (MBC).",
  "mục tiêu chiến lược": "Hướng đến phát triển hệ sinh thái công nghệ AI, Web3.",
  "quyền lợi nhà đầu tư": "Chia sẻ doanh thu, cổ tức hàng năm, ưu đãi đặc biệt.",
  "cách đầu tư": "Mua Mobase Token (MBC) trên XT.com và nạp vào hệ sinh thái.",
  "thành tựu openlive": "Hợp tác với SOL International, mở rộng mạng lưới kinh doanh.",
};

// 📌 Route chính
app.get("/", (req, res) => res.send("🚀 Chatbot OpenLive đang hoạt động!"));
app.get("/terms", (req, res) => res.sendFile(path.join(__dirname, "terms.html")));
app.get("/privacy", (req, res) => res.sendFile(path.join(__dirname, "Privacy.html")));

// ✅ Webhook Facebook Messenger
app.get("/webhook", (req, res) => {
  req.query["hub.verify_token"] === VERIFY_TOKEN
    ? res.send(req.query["hub.challenge"])
    : res.status(403).send("❌ Sai mã VERIFY_TOKEN");
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

// 📩 Gửi tin nhắn đến người dùng
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

// 🔹 Cập nhật Menu của chatbot
async function setupPhoneButton() {
  try {
    await axios.post(`https://graph.facebook.com/v12.0/me/messenger_profile?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`, {
      persistent_menu: [
        {
          locale: "default",
          composer_input_disabled: false,
          call_to_actions: [
            { title: "📞 Gọi hỗ trợ", type: "phone_number", payload: "CALL_SUPPORT", phone_number: PHONE_NUMBER },
            { title: "📜 Xem thêm", type: "web_url", url: "https://openlivegroup.com" },
          ],
        },
      ],
    });
    console.log("✅ Đã thêm nút gọi điện vào menu!");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật menu:", error.response?.data || error.message);
  }
}

// 🚀 Khởi chạy server
app.listen(PORT, async () => {
  console.log(`🚀 Chatbot đang chạy tại cổng ${PORT}`);
  await setupPhoneButton();
});
