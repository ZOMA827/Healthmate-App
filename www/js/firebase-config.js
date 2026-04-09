const firebaseConfig = {
    apiKey: "AIzaSyDF6MRRmzfXJBW07Xb_rXVK2hJY_Xtcm6A",
    authDomain: "healthmate-web-3d983.firebaseapp.com",
    projectId: "healthmate-web-3d983",
    storageBucket: "healthmate-web-3d983.firebasestorage.app",
    appId: "1:1005719156245:web:7478909058de336f1b801c"
};

// 1. تهيئة فايربيس
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// 2. البقاء متصلاً للأبد (LOCAL Persistence) - مدرع للموبايل
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
      console.log("تم تثبيت الجلسة في الهاتف 🔒");
  })
  .catch((error) => {
      console.error("خطأ في حفظ الجلسة:", error);
  });

// 3. تفعيل الأوفلاين (مرة واحدة فقط وبدون زحمة التبويبات لسرعة الموبايل)
firebase.firestore().enablePersistence()
  .catch((err) => {
      console.log("Offline cache status:", err.code);
  });

// 4. تعريف المتغيرات العالمية (مرة واحدة وبشكل منظم)
window.db = firebase.firestore();
window.auth = firebase.auth();
window.storage = firebase.storage();

// ==========================================
// 🛠️ الدوال المساعدة (ShowToast & TimeAgo)
// ==========================================

window.showToast = function(message) {
    const toast = document.getElementById('toast-msg');
    if(toast) {
        toast.innerText = message;
        toast.style.display = 'flex'; // تأكد من استخدامه مع Flex لتوسيط النص
        toast.classList.add('show');
        setTimeout(() => { 
            toast.classList.remove('show');
            setTimeout(()=> { toast.style.display = 'none'; }, 500);
        }, 3000);
    }
};

window.timeAgo = function(timestamp) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    if (!timestamp) return dict.time_now || "الآن";
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffMinutes <= 0 || diffMinutes === 59 || diffMinutes === 60) {
        return dict.time_now || "الآن";
    }
    
    if (diffMinutes < 60) {
        return (dict.time_mins_ago || "منذ ${n} دقيقة").replace('${n}', diffMinutes);
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
        return (dict.time_hours_ago || "منذ ${n} ساعة").replace('${n}', diffHours);
    }
    
    const diffDays = Math.floor(diffHours / 24);
    return (dict.time_days_ago || "منذ ${n} يوم").replace('${n}', diffDays);
};
// ============================================================================
// 🚀 تيربو الأوفلاين: القضاء على تجميد الـ 60 ثانية في الفايربيس
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. مراقبة انقطاع الإنترنت
    window.addEventListener('offline', () => {
        if(window.db) {
            window.db.disableNetwork().then(() => {
                console.log("تم تفعيل وضع الطيران ⚡ (قراءة من الذاكرة فوراً)");
            });
        }
    });

    // 2. مراقبة عودة الإنترنت
    window.addEventListener('online', () => {
        if(window.db) {
            window.db.enableNetwork().then(() => {
                console.log("تمت استعادة الاتصال بالسحابة 🌐");
            });
        }
    });

    // 3. التحقق فور فتح التطبيق
    if (!navigator.onLine && window.db) {
        window.db.disableNetwork();
    }
});