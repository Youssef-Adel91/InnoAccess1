// ملف test-paymob.js
const axios = require('axios');

// 🔴 هام: المفتاح اللي User أداهولنا
const API_KEY = "ZXlKaGJHY2lPaUpJVXpVeE1pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SmpiR0Z6Y3lJNklrMWxjbU5vWVc1MElpd2ljSEp2Wm1sc1pWOXdheUk2TVRFeU16RTBOQ3dpYm1GdFpTSTZJbWx1YVhScFlXd2lmUS5tVjNkbmVjcFZYbS1heVppNTVJamZ2T05yQUl6dkQ2WkN2Ri1KYjdsNlE5cUlRbEVpVWdTYUNRR2pvcFBkVFoxWVF4SG1xcmp5emlveFhwZVdCMzh0Zw==";

async function testConnection() {
    console.log("🔄 Testing Paymob Connection...");
    console.log("📝 Using API Key:", API_KEY.substring(0, 30) + "...");
    console.log("");

    try {
        const response = await axios.post('https://accept.paymob.com/api/auth/tokens', {
            api_key: API_KEY
        });

        console.log("✅ SUCCESS! Connection Established.");
        console.log("🔑 Token received (first 20 chars):", response.data.token.substring(0, 20) + "...");
        console.log("");
        console.log("✨ الخبر السعيد: API Key شغال 100%!");
        console.log("🔧 المشكلة يبقى في ملف .env - تأكد من:");
        console.log("   1. مفيش مسافات قبل أو بعد المفتاح");
        console.log("   2. المفتاح محاط بعلامات التنصيص الصحيحة");
        console.log("   3. اعمل restart للسيرفر (Ctrl+C ثم npm run dev)");

    } catch (error) {
        console.log("❌ FAILED! Error detected.");
        console.log("");
        if (error.response) {
            console.log("📊 Status Code:", error.response.status);
            console.log("📄 Response Data:", JSON.stringify(error.response.data, null, 2));
            console.log("");
            if (error.response.status === 401) {
                console.log("🚨 المفتاح غير صحيح أو منتهي الصلاحية!");
                console.log("💡 الحل: روح Paymob Dashboard واطلب API Key جديد");
            }
        } else {
            console.log("⚠️ Network Error:", error.message);
        }
    }
}

testConnection();
