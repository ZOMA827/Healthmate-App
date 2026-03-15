// ============================================================================
// محرك المصادقة الملكي (Master Auth Engine) - حقيقي وفعال
// ============================================================================

const auth_fb = window.firebase.auth();
const db = window.firebase.firestore();

// --- نظام النوافذ الزجاجية الملكي (مترجم 🌍) ---
window.royalAlert = async function(title, message, icon = 'information-circle', color = '#fff') {
    // جلب القاموس لترجمة زر التأكيد
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];

    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); backdrop-filter:blur(15px); z-index:99999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.4s;";
        
        // تم استبدال "موافق" بـ dict.btn_confirm
        overlay.innerHTML = `
            <div style="background:#0a0a0a; border:1px solid #222; padding:40px; border-radius:30px; width:85%; max-width:380px; text-align:center; color:white; font-family:'Cairo';">
                <ion-icon name="${icon}" style="font-size:70px; color:${color}; margin-bottom:20px;"></ion-icon>
                <h2 style="margin:0 0 15px 0;">${title}</h2>
                <p style="color:#888; line-height:1.6; margin-bottom:30px;">${message}</p>
                <button id="r-modal-btn" style="width:100%; padding:18px; border-radius:15px; border:none; background:white; color:black; font-weight:900; cursor:pointer;">
                    ${dict.btn_confirm || 'موافق'}
                </button>
            </div>`;
            
        document.body.appendChild(overlay);
        setTimeout(() => overlay.style.opacity = '1', 10);
        document.getElementById('r-modal-btn').onclick = () => {
            overlay.style.opacity = '0';
            setTimeout(() => { overlay.remove(); resolve(true); }, 400);
        };
    });
};

// --- التوجيه الذكي (جاهز ولا يحتاج تعديل ✅) ---
async function handleRedirection(uid) {
    try {
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            const role = doc.data().role;
            if (role === 'doctor' || role === 'pharmacist') {
                window.location.href = "community.html";
            } else {
                window.location.href = "patient/patient_dash.html";
            }
        }
    } catch (e) { console.error(e); }
}

// --- العمليات الرئيسية ---
window.authHandler = {
    // 1. الدخول بالبريد
    login: async () => {
        const email = document.getElementById('l-email').value.trim();
        const pass = document.getElementById('l-pass').value.trim();
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];

        // تم توحيد مفتاح "ملأ الحقول"
        if (!email || !pass) return window.showToast(dict.alert_fill_fields || "يرجى ملأ الحقول");

        try {
            const res = await auth_fb.signInWithEmailAndPassword(email, pass);
            if (!res.user.emailVerified) {
                // استخدام مفاتيح القاموس للتنبيهات
                await window.royalAlert(
                    dict.auth_verify_title || "تفعيل الحساب", 
                    dict.auth_verify_msg || "يرجى الضغط على الرابط المرسل لبريدك الإلكتروني أولاً ✅", 
                    "mail-outline", 
                    "#ffcc00"
                );
                await auth_fb.signOut();
                return;
            }
            handleRedirection(res.user.uid);
        } catch (err) {
            // استخدام مفاتيح القاموس للخطأ
            await window.royalAlert(
                dict.alert_error_title || "خطأ", 
                dict.auth_login_error || "تأكد من صحة البريد أو كلمة المرور", 
                "close-circle", 
                "#ff4d4d"
            );
        }
    },

    // 2. التسجيل بالبريد
    register: async () => {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
        const role = document.getElementById('reg-role').value;
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const pass = document.getElementById('reg-pass').value.trim();

        if (!role || !name || !email || !pass) return window.showToast(dict.alert_fill_fields || "املأ جميع الحقول");

        try {
            const res = await auth_fb.createUserWithEmailAndPassword(email, pass);
            await res.user.sendEmailVerification();
            await db.collection("users").doc(res.user.uid).set({
                uid: res.user.uid, 
                name, 
                email, 
                role, 
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });

            // رسالة النجاح من القاموس
            await window.royalAlert(
                dict.alert_success_title || "تم بنجاح", 
                dict.auth_reg_success_msg || "أرسلنا رابط تفعيل لبريدك الإلكتروني، يرجى تفعيله للدخول 🎉", 
                "checkmark-done", 
                "#43e97b"
            );
            
            await auth_fb.signOut();
            window.switchAuth('login-container');
        } catch (err) { 
            window.showToast(err.message); 
        }
    },

    // 3. الدخول عبر جوجل (يعمل في الويب والموبايل بذكاء 💻📱)
    googleLogin: async () => {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];

        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                // 📱 وضع الموبايل: فتح شاشة جوجل الأصلية من أسفل الشاشة
                const { FirebaseAuthentication } = window.Capacitor.Plugins;
                const result = await FirebaseAuthentication.signInWithGoogle({
    clientId: "1005719156245-48p83iuk4ubhihn26ikl5b90f463c2es.apps.googleusercontent.com"
});

                // تحويل بيانات الدخول للهاتف ليفهمها فايربيس
                const credential = window.firebase.auth.GoogleAuthProvider.credential(result.credential.idToken);
                const userCred = await auth_fb.signInWithCredential(credential);
                
                const doc = await db.collection("users").doc(userCred.user.uid).get();
                if (doc.exists) {
                    handleRedirection(userCred.user.uid);
                } else {
                    window.showToast(dict.auth_no_account_err || "ليس لديك حساب! يرجى إنشاء حساب أولاً.");
                    await userCred.user.delete(); 
                    await auth_fb.signOut();
                }
            } else {
                // 💻 وضع الويب: فتح نافذة منبثقة عادية
                const provider = new window.firebase.auth.GoogleAuthProvider();
                const res = await auth_fb.signInWithPopup(provider);
                const doc = await db.collection("users").doc(res.user.uid).get();
                if (doc.exists) {
                    handleRedirection(res.user.uid);
                } else {
                    window.showToast(dict.auth_no_account_err || "ليس لديك حساب! يرجى إنشاء حساب أولاً.");
                    await res.user.delete(); 
                    await auth_fb.signOut();
                }
            }
        } catch (e) { 
            console.error("Google Login Error: ", e);
           window.royalAlert("رد نظام جوجل 🤖", e.message || JSON.stringify(e), "alert-circle", "#ff4b2b");
        }
    },

    // 4. التسجيل عبر جوجل (يعمل في الويب والموبايل بذكاء 💻📱)
    googleSignup: async () => {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
        
        const role = document.getElementById('reg-role').value;
        if (!role) {
            window.showToast(dict.auth_select_role_err || "⚠️ الرجاء تحديد هويتك أولاً!");
            return; 
        }

        try {
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                // 📱 وضع الموبايل
                const { FirebaseAuthentication } = window.Capacitor.Plugins;
              const result = await FirebaseAuthentication.signInWithGoogle({
    clientId: "1005719156245-48p83iuk4ubhihn26ikl5b90f463c2es.apps.googleusercontent.com"
});
                
                const credential = window.firebase.auth.GoogleAuthProvider.credential(result.credential.idToken);
                const userCred = await auth_fb.signInWithCredential(credential);

                const doc = await db.collection("users").doc(userCred.user.uid).get();
                if (doc.exists) {
                    handleRedirection(userCred.user.uid); // لديه حساب مسبقاً
                } else {
                    // تسجيل مستخدم جديد
                    await db.collection("users").doc(userCred.user.uid).set({
                        uid: userCred.user.uid, 
                        name: userCred.user.displayName, 
                        email: userCred.user.email, 
                        role: role, 
                        isPrivate: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    window.showToast(dict.auth_reg_success || "تم إنشاء الحساب بنجاح ✅");
                    handleRedirection(userCred.user.uid);
                }
            } else {
                // 💻 وضع الويب
                const provider = new window.firebase.auth.GoogleAuthProvider();
                const res = await auth_fb.signInWithPopup(provider);
                const doc = await db.collection("users").doc(res.user.uid).get();
                if (doc.exists) {
                    handleRedirection(res.user.uid);
                } else {
                    await db.collection("users").doc(res.user.uid).set({
                        uid: res.user.uid, 
                        name: res.user.displayName, 
                        email: res.user.email, 
                        role: role, 
                        isPrivate: false,
                        createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
                    });
                    window.showToast(dict.auth_reg_success || "تم إنشاء الحساب بنجاح ✅");
                    handleRedirection(res.user.uid);
                }
            }
        } catch (e) { 
            console.error("Google Signup Error: ", e);
            window.showToast(dict.alert_network_error || "تم إلغاء التسجيل أو حدث خطأ");
        }
    }
};

// --- 5. نسيت كلمة السر (مترجم 🌍) ---
window.handleForgotPass = async function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    const email = document.getElementById('l-email').value.trim();
    
    if (!email) {
        return window.showToast(dict.auth_email_required || "اكتب إيميلك في خانة البريد أولاً");
    }

    try {
        await auth_fb.sendPasswordResetEmail(email);
        // 🚨 ترجمة نافذة استعادة الوصول
        await window.royalAlert(
            dict.auth_reset_title || "استعادة الوصول", 
            dict.auth_reset_success_msg || "تم إرسال رابط تغيير كلمة المرور لبريدك الإلكتروني بنجاح 📧", 
            "send-outline"
        );
    } catch (e) { 
        window.showToast(dict.auth_email_not_found || "البريد غير مسجل لدينا"); 
    }
};
// =========================================================
// 🚀 رادار الدخول التلقائي ومعالجة عودة جوجل (Auto-Login)
// =========================================================
auth_fb.onAuthStateChanged(async (user) => {
    const splashScreen = document.getElementById('royal-splash');

    if (user) {
        // إذا كان مسجلاً: نتركه في شاشة التحميل (لا نخفيها) ونقوم بتوجيهه للوحة التحكم فوراً
        const pendingRole = localStorage.getItem('pending_role');
        if (pendingRole) {
            await db.collection("users").doc(user.uid).set({
                uid: user.uid, 
                name: user.displayName || 'مستخدم جوجل', 
                email: user.email, 
                role: pendingRole, 
                isPrivate: false,
                createdAt: window.firebase.firestore.FieldValue.serverTimestamp()
            });
            localStorage.removeItem('pending_role');
        }
        handleRedirection(user.uid);
    } else {
        // إذا لم يكن مسجلاً (زائر جديد أو مسجل خروج): نخفي شاشة التحميل ببطء ليظهر له فورم الدخول
        if (splashScreen) {
            splashScreen.style.opacity = '0';
            setTimeout(() => splashScreen.style.display = 'none', 500); // إخفاء كامل بعد نصف ثانية
        }
    }
});

// معالجة النتيجة بعد العودة من صفحة جوجل
auth_fb.getRedirectResult().then(async (result) => {
    if (result.user) {
        // نجح الدخول، والرادار أعلاه سيتكفل بالباقي
    }
}).catch((error) => {
    console.error("Google Auth Error:", error);
});