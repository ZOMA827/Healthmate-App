// ================= دوال قسم الإعدادات (Account Settings) =================

// دالة تغيير اللغة (النسخة الحاسمة 🚀)
window.changeLanguage = function(langCode) {
    // 1. أخذ الكود مباشرة وتحويله لأحرف صغيرة (للحماية)
    const safeLang = langCode.toLowerCase();
    
    // 2. الحفظ في الذاكرة فوراً وبدون أي شروط تعيق العملية
    localStorage.setItem('app_lang', safeLang);
    
    // 3. تطبيق الترجمة على الواجهة برمجياً قبل عمل Reload (لكي لا يحدث وميض)
    if(typeof window.applyLanguage === 'function') {
        window.applyLanguage();
    }
    
    // 4. إعادة تحميل الصفحة بعد جزء من الثانية لتثبيت اللغة في كل الفايربيس
    setTimeout(() => {
        window.location.reload();
    }, 100); 
};

window.openSupportModal = function() {
    document.getElementById('support-modal').style.display = 'flex';
};
window.closeSupportModal = function() {
    document.getElementById('support-modal').style.display = 'none';
};

window.openSupportModal = function() {
    document.getElementById('support-modal').style.display = 'flex';
};
window.closeSupportModal = function() {
    document.getElementById('support-modal').style.display = 'none';
};
// ================= 🎨 محرك النوافذ الذكي (بديلاً عن تنبيهات المتصفح الكئيبة) =================
// هذه الدالة تصنع نوافذ (Alert, Confirm, Prompt) بتصميم زجاجي احترافي
window.uiModal = function(options) {
    return new Promise((resolve) => {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); z-index:99999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s; padding:20px; box-sizing:border-box;";
        
        const box = document.createElement('div');
        box.style.cssText = "background:var(--card-bg, #fff); padding:25px; border-radius:24px; width:100%; max-width:350px; text-align:center; transform:scale(0.8); transition:0.3s; box-shadow:0 15px 35px rgba(0,0,0,0.2);";
        
        let html = `
            <ion-icon name="${options.icon || 'information-circle'}" style="font-size:60px; color:${options.color || 'var(--primary)'}; margin-bottom:10px;"></ion-icon>
            <h3 style="margin:0 0 10px 0; font-family:'Cairo'; color:var(--text-main); font-size:20px;">${options.title}</h3>
            ${options.message ? `<p style="margin:0 0 20px 0; font-family:'Cairo'; color:var(--text-sub); font-size:15px; line-height:1.5;">${options.message}</p>` : ''}
        `;

        // إذا كان نوع النافذة "Prompt" لإدخال نص (مثل الإيميل)
        if (options.type === 'prompt') {
            html += `<input type="${options.inputType || 'text'}" id="ui-modal-input" placeholder="${options.placeholder || ''}" style="width:100%; padding:12px 15px; border-radius:12px; border:1px solid var(--border-app); background:var(--input-bg); color:var(--text-main); font-family:'Cairo'; font-size:16px; outline:none; margin-bottom:20px; box-sizing:border-box; text-align:center;" dir="ltr">`;
        }

        html += `<div style="display:flex; gap:10px;">`;
        
        // زر الإلغاء (يظهر في Prompt و Confirm)
        if (options.type !== 'alert') {
            html += `<button id="ui-btn-cancel" style="flex:1; padding:12px; border-radius:15px; border:none; background:var(--input-bg, #eee); color:var(--text-main); font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${dict.btn_cancel || 'إلغاء'}</button>`;
        }
        
        // زر التأكيد الرئيسي
        html += `<button id="ui-btn-confirm" style="flex:1; padding:12px; border-radius:15px; border:none; background:${options.color || 'var(--primary)'}; color:#fff; font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${options.confirmText || (dict.btn_confirm || 'موافق')}</button>`;
        html += `</div>`;
        
        box.innerHTML = html;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        // أنيميشن الدخول
        setTimeout(() => { overlay.style.opacity = '1'; box.style.transform = 'scale(1)'; }, 10);
        
        // التركيز التلقائي على حقل الإدخال إذا وجد
        if(options.type === 'prompt') setTimeout(() => document.getElementById('ui-modal-input').focus(), 300);

        const closeUI = () => {
            overlay.style.opacity = '0'; box.style.transform = 'scale(0.8)';
            setTimeout(() => overlay.remove(), 300);
        };

        if (document.getElementById('ui-btn-cancel')) {
            document.getElementById('ui-btn-cancel').onclick = () => { closeUI(); resolve(null); };
        }

        document.getElementById('ui-btn-confirm').onclick = () => {
            closeUI();
            if (options.type === 'prompt') {
                resolve(document.getElementById('ui-modal-input').value.trim());
            } else {
                resolve(true); // في حالة Confirm أو Alert
            }
        };
    });
};

// ================= العمليات الحقيقية بفايربيس =================

// 1. إعادة تعيين كلمة المرور
window.resetUserPassword = async function() {
    const user = window.auth.currentUser;
    if (!user) return;
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    // تأكيد قبل الإرسال
    const confirm = await window.uiModal({
        type: 'confirm',
        title: dict.reset_pwd_title || 'إعادة تعيين كلمة المرور',
        message: `${dict.reset_pwd_msg || 'سنقوم بإرسال رابط تغيير كلمة المرور إلى بريدك:'} <br><strong dir="ltr">${user.email}</strong>`,
        icon: 'key-outline',
        confirmText: dict.btn_send_link || 'إرسال الرابط'
    });

    if(!confirm) return;

    try {
        await window.auth.sendPasswordResetEmail(user.email);
        window.uiModal({ type: 'alert', title: dict.msg_sent_title || 'تم الإرسال!', message: dict.msg_check_inbox || 'تفقد صندوق الوارد في بريدك الإلكتروني لتغيير كلمة المرور.', icon: 'checkmark-circle', color: 'var(--success)' });
    } catch (error) {
        window.uiModal({ type: 'alert', title: dict.error_title || 'خطأ', message: dict.error_try_again || 'حدث خطأ، يرجى المحاولة لاحقاً.', icon: 'close-circle', color: 'var(--danger)' });
    }
};

// 2. تغيير البريد الإلكتروني
window.changeUserEmail = async function() {
    const user = window.auth.currentUser;
    if (!user) return;
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    // استخدام الـ Prompt الأنيق بدلاً من prompt() المتصفح
    const newEmail = await window.uiModal({
        type: 'prompt',
        inputType: 'email',
        title: dict.update_email_title || 'تحديث البريد الإلكتروني',
        message: dict.update_email_msg || 'أدخل عنوان البريد الإلكتروني الجديد الذي ترغب بربطه بحسابك:',
        placeholder: dict.placeholder_new_email || 'new-email@example.com',
        icon: 'mail-outline',
        confirmText: dict.btn_update || 'تحديث'
    });

    if (!newEmail || newEmail === user.email) return;

    try {
        await user.updateEmail(newEmail);
        await window.db.collection("users").doc(user.uid).update({ email: newEmail });
        window.uiModal({ type: 'alert', title: dict.update_success_title || 'تم التحديث بنجاح!', message: `${dict.update_email_success_msg || 'أصبح بريدك الجديد هو:'} <br><strong dir="ltr">${newEmail}</strong>`, icon: 'checkmark-circle', color: 'var(--success)' });
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            window.uiModal({ type: 'alert', title: dict.security_alert_title || 'إجراء أمني 🔒', message: dict.security_relogin_email || 'لأسباب أمنية، يرجى تسجيل الخروج والدخول مجدداً لكي تتمكن من تغيير بريدك الإلكتروني.', icon: 'shield-checkmark', color: '#f59e0b' });
        } else {
            window.uiModal({ type: 'alert', title: dict.error_title || 'خطأ', message: error.message, icon: 'close-circle', color: 'var(--danger)' });
        }
    }
};

// 3. حذف الحساب نهائياً
window.deleteUserAccount = async function() {
    const user = window.auth.currentUser;
    if (!user) return;
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    // استخدام Confirm مرعب للتحذير من الحذف
    const confirmDelete = await window.uiModal({
        type: 'confirm',
        title: dict.delete_account_title || 'حذف الحساب نهائياً ⚠️',
        message: dict.delete_account_msg || 'هل أنت متأكد من حذف حسابك؟ سيتم مسح جميع بياناتك، منشوراتك، وقصصك بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.',
        icon: 'warning',
        color: 'var(--danger)',
        confirmText: dict.btn_yes_delete || 'نعم، احذف حسابي'
    });

    if (!confirmDelete) return;

    try {
        await window.db.collection("users").doc(user.uid).delete();
        await user.delete();
        window.location.href = "login.html"; // الطرد لصفحة تسجيل الدخول
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            window.uiModal({ type: 'alert', title: dict.security_alert_title || 'إجراء أمني 🔒', message: dict.security_relogin_delete || 'لأسباب أمنية، يرجى تسجيل الخروج والدخول مجدداً لكي تتمكن من حذف حسابك.', icon: 'shield-checkmark', color: '#f59e0b' });
        } else {
            window.uiModal({ type: 'alert', title: dict.error_title || 'خطأ', message: dict.error_delete_failed || 'حدث خطأ أثناء محاولة الحذف.', icon: 'close-circle', color: 'var(--danger)' });
        }
    }
};