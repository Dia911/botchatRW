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

// Thay đổi nội dung FAQ
const faq = {
  "openlive group": "OpenLive Group là tập đoàn công nghệ chuyên về AI, Web3, truyền thông và thương mại điện tử.",
  "công ty thành viên": `OpenLive Group gồm các công ty thành viên:
    - OBranding: Thương mại điện tử số (e-Voucher, e-Membership).
    - OMedia Studio: Truyền thông và công nghệ hình ảnh Bullet Time.
    - OLabs: AI, Machine Learning, Web3, chuyển đổi số.
    - OProducts: Thiết kế đồ họa, in ấn, quảng cáo.`,
  "sản phẩm dịch vụ": `Các sản phẩm/dịch vụ chính của OpenLive Group:
    - Mobase Exchange: Sàn giao dịch tiền điện tử.
    - Monbase NFT Exchange: Sàn giao dịch NFT.
    - OBranding: Thương mại điện tử số.
    - Mobase Token (MBC): Token BEP20 của hệ sinh thái OpenLive.`,
  "mục tiêu chiến lược": "OpenLive Group hướng đến việc phát triển hệ sinh thái công nghệ, hỗ trợ doanh nghiệp trong thời đại số.",
  "quyền lợi nhà đầu tư": `Nhà đầu tư OpenLive Group nhận được:
    - Chia sẻ doanh thu qua Mobase Token (MBC).
    - Cổ tức hàng năm.
    - Khuyến mãi đầu tư.
    - Ưu đãi đặc biệt từ OBranding.`,
  "cách đầu tư": "Nhà đầu tư có thể mua Mobase Token (MBC) trên XT.com và nạp vào trang web bcc.monbase.com.",
  "thành tựu openlive": `OpenLive Group đã ký kết hợp tác chiến lược với các tập đoàn như SOL International, Velicious Food. 
    - Mở rộng mạng lưới kinh doanh tại Hà Nội.
    - Phát triển nền tảng OBranding cho doanh nghiệp.`,
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

app.listen(PORT, async () => {
  console.log(`🚀 Chatbot is running on port ${PORT}`);
  await setupPhoneButton();
});
