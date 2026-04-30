const db = window.db; 
const auth = window.auth; 
const storage = window.storage;
let currentUserData = null;

// ================= تهيئة المستخدم الأساسية (النسخة المدرعة 🛡️) =================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
            // استخراج اللغة الحالية والقاموس
            const lang = localStorage.getItem('app_lang') || 'ar';
            const t = window.translations[lang];

            currentUserData = userDoc.data();
            const myAvatar = currentUserData.photoURL || 'assets/img/profile.png';
            const userRole = String(currentUserData.role).trim().toLowerCase(); // تنظيف الرتبة

            // --- 1. تحديث صور وأسماء الواجهة ---
            if(document.getElementById('nav-user-img')) document.getElementById('nav-user-img').src = myAvatar;
            if(document.getElementById('creator-img')) document.getElementById('creator-img').src = myAvatar;
            if(document.getElementById('side-user-img')) document.getElementById('side-user-img').src = myAvatar;
            
            // استبدال 'مستخدم' بنص مترجم
            if(document.getElementById('user-name')) document.getElementById('user-name').innerText = currentUserData.name || t.default_user_name;
            
            // استبدال النصوص الصلبة (طبيب/صيدلي) بمفاتيح القاموس
            if(document.getElementById('user-role')) {
                document.getElementById('user-role').innerText = userRole === 'doctor' ? t.role_doctor : t.role_pharmacist;
            }

        // --- 2. حارس المواعيد (للطبيب الموثق فقط 🩺🛡️) ---
            const appointmentsBtn = document.getElementById('nav-appointments-btn');
            if (appointmentsBtn) {
                // يجب أن يكون طبيباً + حسابه موثق (isVerified: true)
                if ((userRole === 'doctor' || userRole === 'طبيب') && currentUserData.isVerified === true) {
                    appointmentsBtn.style.display = 'flex';
                } else {
                    // إذا كان مريضاً، أو صيدلانياً، أو طبيباً متدرباً (غير موثق)، تختفي المواعيد!
                    appointmentsBtn.style.display = 'none';
                }
            }

            // --- 3. حارس الصيدلي (إخفاء قسم استشارات المرضى 🚫) ---
            if (userRole === 'pharmacist' || userRole === 'صيدلي') {
                document.head.insertAdjacentHTML('beforeend', '<style>#lobby-card-patients { display: none !important; opacity: 0 !important; pointer-events: none !important; }</style>');
            }

            // --- 4. تشغيل الأنظمة الفرعية (كما كانت) ---
            if(typeof window.listenToUnreadNotifications === 'function') {
                window.listenToUnreadNotifications();
            }

            if(typeof window.initSmartFeed === 'function') window.initSmartFeed();
           if(document.getElementById('stories-container')) {
    if(typeof window.loadActiveStories === 'function') window.loadActiveStories();
}
        }
    }
});

// ================= دوال الـ SPA المركزية (نظام الطبقات الذكي 🥞) =================
let globalSpaZIndex = 9999; // عداد الطبقات لحماية النوافذ

window.openSPA = function(slideId) {
    const slide = document.getElementById(slideId);
    if(slide) { 
        globalSpaZIndex++; // زيادة الرقم لضمان أن النافذة الجديدة دائماً فوق القديمة
        slide.style.zIndex = globalSpaZIndex; 
        slide.classList.add('active'); 
        document.body.style.overflow = 'hidden'; 
    }
};

window.closeSPA = function(slideId) {
    const slide = document.getElementById(slideId);
    if(slide) { 
        slide.classList.remove('active'); 
        // 🚨 السحر هنا: لا نرجع الشاشة لتعمل Scroll إلا إذا أغلقت كل النوافذ
        if(document.querySelectorAll('.slide-page.active').length === 0) {
            document.body.style.overflow = 'auto'; 
        }
    }
};
window.toggleDropdown = function() {
    const menu = document.getElementById('profileDropdown');
    if (menu) menu.classList.toggle('active');
};

document.addEventListener('click', function(event) {
    const wrapper = document.querySelector('.user-menu-wrapper');
    const menu = document.getElementById('profileDropdown');
    if (wrapper && !wrapper.contains(event.target) && menu) menu.classList.remove('active');
});

window.toggleDarkMode = function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
};
// ================= 🎨 محرك النوافذ الذكي (UI Modal Engine) =================
window.uiModal = window.uiModal || function(options) {
    return new Promise((resolve) => {
        // استدعاء القاموس الحالي
        const lang = localStorage.getItem('app_lang') || 'ar';
        const t = window.translations?.[lang] || {};

        const overlay = document.createElement('div');
        overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); backdrop-filter:blur(8px); z-index:99999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s; padding:20px; box-sizing:border-box;";
        
        const box = document.createElement('div');
        box.style.cssText = "background:var(--card-bg, #fff); padding:25px; border-radius:24px; width:100%; max-width:350px; text-align:center; transform:scale(0.8); transition:0.3s; box-shadow:0 15px 35px rgba(0,0,0,0.2);";
        
        // جعل العنوان والرسالة يدعمان القاموس تلقائياً
        const modalTitle = t[options.title] || options.title;
        const modalMsg = t[options.message] || options.message;
        const modalPlaceholder = t[options.placeholder] || options.placeholder || '';

        let html = `
            <ion-icon name="${options.icon || 'information-circle'}" style="font-size:60px; color:${options.color || 'var(--primary)'}; margin-bottom:10px;"></ion-icon>
            <h3 style="margin:0 0 10px 0; font-family:'Cairo'; color:var(--text-main); font-size:20px;">${modalTitle}</h3>
            ${options.message ? `<p style="margin:0 0 20px 0; font-family:'Cairo'; color:var(--text-sub); font-size:15px; line-height:1.5;">${modalMsg}</p>` : ''}
        `;

        if (options.type === 'prompt') {
            html += `<input type="${options.inputType || 'text'}" id="ui-modal-input" placeholder="${modalPlaceholder}" style="width:100%; padding:12px 15px; border-radius:12px; border:1px solid var(--border-app); background:var(--input-bg); color:var(--text-main); font-family:'Cairo'; font-size:16px; outline:none; margin-bottom:20px; box-sizing:border-box; text-align:center;" dir="ltr">`;
        }

        html += `<div style="display:flex; gap:10px;">`;
        if (options.type !== 'alert') {
            html += `<button id="ui-btn-cancel" style="flex:1; padding:12px; border-radius:15px; border:none; background:var(--input-bg, #eee); color:var(--text-main); font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${t.btn_cancel || 'إلغاء'}</button>`;
        }
        // زر التأكيد الآن يبحث في القاموس عن confirmText أو يستخدم 'موافق' كـ Fallback
        html += `<button id="ui-btn-confirm" style="flex:1; padding:12px; border-radius:15px; border:none; background:${options.color || 'var(--primary)'}; color:#fff; font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${t[options.confirmText] || options.confirmText || t.btn_ok || 'موافق'}</button>`;
        html += `</div>`;
        
        box.innerHTML = html;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        setTimeout(() => { overlay.style.opacity = '1'; box.style.transform = 'scale(1)'; }, 10);
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
            if (options.type === 'prompt') resolve(document.getElementById('ui-modal-input').value.trim());
            else resolve(true);
        };
    });
};
// ================= نشر المنشورات (النسخة المدرعة للهواتف 📱) =================
window.publishPost = async function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const text = document.getElementById("post-input").value;
    const fileInput = document.getElementById("post-file-upload");
    const file = fileInput ? fileInput.files[0] : null;
    
    if (!text.trim() && !file) return window.showToast(dict.alert_empty_post || "لا يمكن نشر محتوى فارغ!");

    document.getElementById("publish-btn").innerText = dict.publishing || "جاري النشر...";
    document.getElementById("publish-btn").disabled = true;
    let imageUrl = "";

    try {
        if (file) {
            // 🚨 اختبار أمان للهاتف: التأكد أن الملف حقيقي ولم يفرغه الأندرويد
            if (file.size === 0) {
                throw new Error("نظام الأندرويد منع قراءة الملف (حجم الملف 0). تأكد من إعطاء التطبيق صلاحية الوصول للصور.");
            }

            imageUrl = await window.cloudinaryEngine.uploadFile(file);
            
            if (!imageUrl) {
                throw new Error("فشل رفع الصورة للسحابة، تحقق من اتصال الإنترنت.");
            }
        }

        await db.collection("posts").add({
            authorId: auth.currentUser.uid,
            authorName: currentUserData.name,
            authorRole: currentUserData.role,
            authorImg: currentUserData.photoURL || "",
            content: text,
            mediaUrl: imageUrl, 
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [], commentsCount: 0, commentsDisabled: false
        });

        document.getElementById("post-modal").style.display = "none";
        document.getElementById("post-input").value = "";
        if (fileInput) fileInput.value = "";
        
        window.showToast(dict.alert_success || "تم النشر بنجاح!");
        if (typeof window.initSmartFeed === 'function') window.initSmartFeed(); 
    } catch (error) { 
        console.error("Publish Error:", error);
        // 🚨 عرض الخطأ الدقيق على شاشة الهاتف لكي نعرف من المجرم!
        window.royalAlert("خطأ في النشر 📱", error.message || "حدث خطأ غير معروف", "warning", "#ff4d4d");
    } finally {
        document.getElementById("publish-btn").innerText = dict.btn_publish || "نشر الآن";
        document.getElementById("publish-btn").disabled = false;
    }
};

// ================= الاختصارات الذكية للنشر =================
window.openPostModal = function(type) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    document.getElementById('post-modal').style.display = 'flex';
    
    const fileInput = document.getElementById('post-file-upload');
    const fileNameDisplay = document.getElementById('post-file-name');
    
    if(fileInput) {
        fileInput.value = ''; 
        if(fileNameDisplay) fileNameDisplay.innerText = dict.no_file_selected || 'لم يتم اختيار ملف';
        
        if (type === 'image') {
            fileInput.setAttribute('accept', 'image/*'); // تحديد الصور فقط
            fileInput.click(); 
        } else if (type === 'video') {
            fileInput.setAttribute('accept', 'video/*'); // تحديد الفيديو فقط
            fileInput.click(); 
        }
    }
    
    document.getElementById('post-input').focus();
};

// ================= محرك البحث الذكي (Debounced) =================
let searchTimeout;
window.openSearchOverlay = function() { 
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.add('active'); 
    document.body.style.overflow = 'hidden';
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.focus();
};

window.closeSearchOverlay = function() { 
    const overlay = document.getElementById('searchOverlay');
    if (overlay) overlay.classList.remove('active'); 
    document.body.style.overflow = 'auto';
};

window.performAdvancedSearch = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const query = searchInput.value.trim();
    const resultsArea = document.getElementById('searchResultsArea');
    if (!resultsArea) return;
    
    clearTimeout(searchTimeout);

    if (query.length < 2) { 
        resultsArea.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">${dict.search_min_chars || 'اكتب حرفين على الأقل...'}</div>`; 
        return; 
    }
    resultsArea.innerHTML = `<div style="text-align:center; padding:20px; color:var(--primary);">${dict.searching || 'جاري البحث...'}</div>`;

    searchTimeout = setTimeout(async () => {
        try {
            let html = '';
            // بحث المستخدمين
            const usersSnap = await db.collection("users").where("name", ">=", query).where("name", "<=", query + '\uf8ff').limit(5).get();
            if (!usersSnap.empty) {
                html += `<h4 style="color:var(--primary); margin-bottom:10px;">${dict.search_users || 'أطباء ومستخدمين'}</h4>`;
                usersSnap.forEach(doc => {
                    const u = doc.data();
                    html += `<div class="search-item" onclick="window.openProfileSlide('${doc.id}'); window.closeSearchOverlay();"><img src="${u.photoURL || 'assets/img/profile.png'}"><div><h4>${u.name}</h4><p>${u.specialty || dict.general || 'عام'}</p></div></div>`;
                });
            }
            // بحث المنشورات
            const postsSnap = await db.collection("posts").orderBy("timestamp", "desc").limit(30).get();
            const matchedPosts = [];
            postsSnap.forEach(doc => {
                if (doc.data().content && doc.data().content.includes(query)) matchedPosts.push({ id: doc.id, ...doc.data() });
            });
            if (matchedPosts.length > 0) {
                html += `<h4 style="color:var(--primary); margin:20px 0 10px;">${dict.search_posts || 'منشورات مطابقة'}</h4>`;
                matchedPosts.slice(0, 5).forEach(post => {
                    let snippet = post.content.substring(0, 40) + "...";
                    html += `<div class="search-item" onclick="window.openPostDetailsSlide('${post.id}'); window.closeSearchOverlay();"><div><h4>${post.authorName}</h4><p>${snippet}</p></div></div>`;
                });
            }
            resultsArea.innerHTML = html === '' ? `<div style="text-align:center; color:var(--text-sub);">${dict.search_no_results || 'لا توجد نتائج'}</div>` : html;
        } catch (err) { console.error("Search Error:", err); }
    }, 600);
};
// ================= نظام إدارة المنشورات (تعديل وحذف) =================

// 1. دالة الحذف النهائي
window.deletePost = async function(postId) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    // إغلاق قائمة الخيارات المنسدلة أولاً
    document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));

    // رسالة تأكيد زجاجية أنيقة باستخدام القاموس
    const confirmDelete = await window.uiModal({
        type: 'confirm',
        title: dict.opt_delete || 'حذف المنشور',
        message: dict.alert_delete_confirm || "هل أنت متأكد من حذف هذا المنشور نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
        icon: 'trash',
        color: 'var(--danger)',
        confirmText: dict.btn_delete || 'حذف'
    });

    if(confirmDelete) {
        try {
            // أ. حذف المنشور من قاعدة بيانات فايربيس
            await window.db.collection("posts").doc(postId).delete();
            window.showToast(dict.alert_post_deleted || "تم حذف المنشور بنجاح 🗑️");
            
            // ب. تحديث الواجهة فوراً (إخفاء المنشور من الشاشة بدون ريفريش)
            const feedPost = document.getElementById(`feed-post-${postId}`);
            const proPost = document.getElementById(`pro-post-${postId}`);
            if(feedPost) feedPost.remove();
            if(proPost) proPost.remove();
            
            // إذا كان المستخدم داخل شاشة تفاصيل المنشور وقام بحذفه، نخرجه منها
            window.closeSPA('postDetailsSlidePage');
            
        } catch(e) {
            console.error("Delete Error:", e);
            window.showToast(dict.alert_error || "حدث خطأ أثناء الحذف");
        }
    }
};

// دالة فتح نافذة التعديل (مضادة للسلايدات 🚀)
window.openEditPostModal = function(postId, currentContent) {
    // إغلاق قائمة الخيارات أولاً
    document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
    
    // وضع البيانات في النافذة
    document.getElementById('edit-post-id').value = postId;
    document.getElementById('edit-post-input').value = currentContent;
    
    // ☢️ السلاح النووي: رفع الـ Z-index لضمان ظهور النافذة فوق أي SPA
    const modal = document.getElementById('edit-post-modal');
    if (modal) {
        document.body.appendChild(modal);
        modal.style.zIndex = "2147483647";
        modal.style.display = 'flex';
    }
};
// 3. دالة حفظ التعديلات الجديدة في فايربيس
window.saveEditedPost = async function() {
    const postId = document.getElementById('edit-post-id').value;
    const newText = document.getElementById('edit-post-input').value.trim();
    const btn = document.getElementById('save-edit-btn');
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};

    if(!newText) return window.showToast(dict.alert_empty_post || "لا يمكن ترك المنشور فارغاً!");

    // استخدام مفتاح "saving" للزر أثناء المعالجة
    btn.innerText = dict.saving || "جاري الحفظ...";
    btn.disabled = true;

    try {
        // أ. تحديث النص في فايربيس
        await window.db.collection("posts").doc(postId).update({
            content: newText
        });
        
        // ب. إغلاق النافذة وإظهار رسالة نجاح مترجمة
        document.getElementById('edit-post-modal').style.display = 'none';
        window.showToast(dict.alert_post_updated || "تم تعديل المنشور بنجاح ✏️");
        
        // ج. السحر: تحديث النص في الواجهة فوراً مع تمريره على فلتر الروابط!
        const feedPost = document.getElementById(`feed-post-${postId}`);
        if(feedPost) {
            const bodyEl = feedPost.querySelector('.post-body');
            if(bodyEl) bodyEl.innerHTML = window.formatPostContent(newText);
            
            // تحديث زر التعديل نفسه ليحمل النص الجديد في الـ onClick
            const editBtn = feedPost.querySelector(`button[onclick*="openEditPostModal"]`);
            if (editBtn) editBtn.setAttribute('onclick', `window.openEditPostModal('${postId}', \`${newText}\`)`);
        }
        
        const proPost = document.getElementById(`pro-post-${postId}`);
        if(proPost) {
            const bodyEl = proPost.querySelector('.post-body');
            if(bodyEl) bodyEl.innerHTML = window.formatPostContent(newText);
            const editBtn = proPost.querySelector(`button[onclick*="openEditPostModal"]`);
            if (editBtn) editBtn.setAttribute('onclick', `window.openEditPostModal('${postId}', \`${newText}\`)`);
        }
        
    } catch(e) {
        console.error("Edit Error:", e);
        window.showToast(dict.alert_error || "حدث خطأ أثناء التعديل");
    }
    
    // إعادة نص الزر من القاموس بعد الانتهاء
    btn.innerText = dict.btn_save_changes || "حفظ التعديلات";
    btn.disabled = false;
};
// ================= نظام الإشعارات المركزي =================

// 1. دالة فتح النافذة
window.openNotificationsSlide = function() {
    window.openSPA('notificationsSlidePage'); // فتح السلايد
    window.loadNotifications(); // جلب البيانات
};

// 2. محرك جلب الإشعارات (Real-time)
window.loadNotifications = function() {
    const container = document.getElementById('notifications-container');
    if (!container || !window.auth.currentUser) return;

    const myUid = window.auth.currentUser.uid;
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    window.db.collection("users").doc(myUid).collection("notifications")
        .orderBy("timestamp", "desc").limit(30)
        .onSnapshot(snap => {
            if (snap.empty) {
                container.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-sub);">${dict.noti_empty || 'لا توجد إشعارات حالياً'}</div>`;
                return;
            }

            container.innerHTML = "";
            snap.forEach(doc => {
                const n = doc.data();
                let msg = ""; let icon = ""; let iconClass = "";
                
                // قاموس الإشعارات الذكي (دعم كامل لتعدد اللغات)
                if(n.type === 'follow') { msg = dict.noti_follow || "قام بمتابعتك"; icon = "person-add"; iconClass = "noti-icon-follow"; }
                else if(n.type === 'like_post') { msg = dict.noti_like_post || "أعجب بمنشورك"; icon = "heart"; iconClass = "noti-icon-like"; }
                else if(n.type === 'comment') { msg = dict.noti_comment || "علق على منشورك"; icon = "chatbubble"; iconClass = "noti-icon-comment"; }
                else if(n.type === 'reply') { msg = dict.noti_reply || "رد على تعليقك"; icon = "chatbubbles"; iconClass = "noti-icon-comment"; }
                else if(n.type === 'like_comment') { msg = dict.noti_like_comment || "أعجب بتتعليقك"; icon = "heart-circle"; iconClass = "noti-icon-like"; }
                else if(n.type === 'share_post') { msg = dict.noti_share || "قام بمشاركة منشورك"; icon = "share-social"; iconClass = "noti-icon-follow"; }
                else if(n.type === 'like_story') { msg = dict.noti_like_story || "أعجب بقصتك"; icon = "heart"; iconClass = "noti-icon-like"; }
                else if(n.type === 'reply_story') { msg = n.content || dict.noti_reply_story || "رد على قصتك"; icon = "chatbubbles"; iconClass = "noti-icon-comment"; }
                else { msg = n.content || dict.noti_new || "إشعار جديد"; icon = "notifications"; }

                container.innerHTML += `
                    <div class="noti-item ${n.isRead ? '' : 'unread'}" onclick="window.smartNotiClick('${doc.id}', '${n.type}', '${n.fromId}', '${n.postId || ''}', '${n.commentId || ''}')">
                        <img src="${n.fromImg || 'assets/img/profile.png'}" class="noti-img">
                        <div class="noti-info">
                            <p><strong>${n.fromName}</strong> ${msg}</p>
                            <small>${window.timeAgo ? window.timeAgo(n.timestamp) : (dict.time_now || 'الآن')}</small>
                        </div>
                        <div class="noti-icon-box ${iconClass}"><ion-icon name="${icon}"></ion-icon></div>
                    </div>`;
            });
        });
};
// ================= التوجيه الذكي عند الضغط على الإشعار =================
window.smartNotiClick = async function(nid, type, fromId, postId, commentId) {
    const myUid = window.auth.currentUser.uid;
    // 1. تحديد كمقروء في قاعدة البيانات
    await window.db.collection("users").doc(myUid).collection("notifications").doc(nid).update({ isRead: true });
    
    // إغلاق نافذة الإشعارات للعودة للواجهة الرئيسية
    window.closeSPA('notificationsSlidePage');

    // 2. التوجيه المنطقي حسب نوع الإشعار
    if (type === 'follow') {
        window.openProfileSlide(fromId);
    } 
    else if (type === 'like_post' || type === 'share_post') {
        window.openPostDetailsSlide(postId);
    } 
    else if (type === 'comment' || type === 'reply' || type === 'like_comment') {
        window.openPostDetailsSlide(postId, commentId);
    }
    else if (type === 'like_story' || type === 'reply_story') {
        // توجيه لغرفة الدردشة عند التفاعل مع القصص
        window.openSPA('chatSlidePage');
    }
};

// 3. دالة تحديد كـ "مقروء" من داخل النافذة
window.markNotiAsRead = async function(nid, postId) {
    const myUid = window.auth.currentUser.uid;
    try {
        await window.db.collection("users").doc(myUid).collection("notifications").doc(nid).update({ isRead: true });
        if (postId && postId !== "null") {
            window.openPostDetailsSlide(postId); 
        }
    } catch (e) { console.error(e); }
};

// ================= نظام الإشعارات المستقل والذكي =================
window.sendNotification = async function(targetUid, type, data = {}) {
    const myUser = window.auth.currentUser;
    if (!myUser || myUser.uid === targetUid) return;

    // استدعاء القاموس لضمان إرسال اسم افتراضي مترجم إذا فُقد الاسم
    const lang = localStorage.getItem('app_lang') || 'ar';
    const t = window.translations?.[lang] || {};

    try {
        await window.db.collection("users").doc(targetUid).collection("notifications").add({
            fromId: myUser.uid,
            // استخدام اسم المستخدم من البيانات أو القاموس كخيار أخير
            fromName: currentUserData?.name || myUser.displayName || t.default_user_name || "مستخدم",
            fromImg: myUser.photoURL || currentUserData?.photoURL || "assets/img/profile.png",
            type: type, 
            postId: data.postId || null,
            commentId: data.commentId || null, 
            content: data.content || "",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            isRead: false
        });
    } catch (e) { console.error("Noti Error:", e); }
};
// ================= محرك الإشعارات الاحترافي (صوت + بلاكة + اهتزاز) 📱🔊🔔 =================
window.listenToUnreadNotifications = async function() {
    const myUid = window.auth?.currentUser?.uid;
    const badge = document.getElementById('noti-badge');
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    if(!badge || !myUid) return;

    const LocalNotifications = window.Capacitor?.Plugins?.LocalNotifications;
const Haptics = window.Capacitor?.Plugins?.Haptics;
    
    if (LocalNotifications) {
        // 🚨 1. إنشاء "قناة تنبيه" بأهمية قصوى (مهم جداً للأندرويد) 🚨
        await LocalNotifications.createChannel({
            id: 'healthmate_urgent_v2',
            name: 'تنبيهات هيلث ميت',
            description: 'قناة لإشعارات الرسائل والتفاعلات المهمة',
            importance: 5, // أعلى درجة: يصوني ويخرج Banner من الفوق
            visibility: 1,
            sound: 'default', // استخدام الصوت الافتراضي للهاتف
            vibration: true
        });
        
        await LocalNotifications.requestPermissions();
    }

    window.db.collection("users").doc(myUid).collection("notifications")
        .where("isRead", "==", false)
        .onSnapshot(snap => {
            
            // تحديث العداد (النقطة الحمراء)
            if (snap.size > 0) {
                badge.innerText = snap.size > 9 ? "+9" : snap.size;
                badge.style.display = "flex";
            } else {
                badge.style.display = "none";
            }

            // معالجة الإشعارات الجديدة فقط
            snap.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const n = change.doc.data();
                    
                    // تحضير نص الرسالة
                    let msgBody = dict.noti_new || "لديك إشعار جديد";
                    if(n.type === 'follow') msgBody = dict.noti_follow || "قام بمتابعتك";
                    else if(n.type === 'like_post') msgBody = dict.noti_like_post || "أعجب بمنشورك";
                    else if(n.type === 'comment' || n.type === 'reply') msgBody = dict.noti_comment || "علق على منشورك";
                    else if(n.type === 'msg') msgBody = "أرسل لك رسالة جديدة 💬";

                    try {
                        // 📳 الاهتزاز
                        if (Haptics) await Haptics.vibrate();

                        // 🔔 إرسال التنبيه الفعلي للنظام
                        if (LocalNotifications) {
                            await LocalNotifications.schedule({
                                notifications: [
                                    {
                                        title: n.fromName || "Healthmate",
                                        body: msgBody,
                                        id: Math.floor(Math.random() * 100000), // ID فريد لكل إشعار
                                       channelId: 'healthmate_urgent_v2', // 👈 ربط الإشعار بالقناة التي أنشأناها
                                        schedule: { at: new Date(Date.now() + 200) },
                                        actionTypeId: "",
                                        extra: null
                                    }
                                ]
                            });
                        }
                    } catch (err) { console.log("Notification error:", err); }
                }
            });
        });
};;

// ================= دالة تحديد الكل كمقروء =================
window.markAllNotisAsRead = async function() {
    // استدعاء القاموس بناءً على اللغة المختارة
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth?.currentUser?.uid;
    if (!myUid) return;

    try {
        const unreadSnap = await window.db.collection("users").doc(myUid).collection("notifications")
            .where("isRead", "==", false).get();

        if (unreadSnap.empty) {
            // استخدام مفتاح القاموس للحالة التي تكون فيها الإشعارات مقروءة مسبقاً
            window.showToast(dict.noti_all_read_already || "لا توجد إشعارات جديدة لقراءتها ✔️");
            return;
        }

        const batch = window.db.batch();
        unreadSnap.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
        // استخدام مفتاح القاموس لنجاح العملية
        window.showToast(dict.noti_all_read_success || "تم تحديد الكل كمقروء ✔️");
        
    } catch (error) {
        console.error("خطأ في قراءة الكل:", error);
        // رسالة الخطأ المترجمة
        window.showToast(dict.alert_error || "حدث خطأ، حاول مرة أخرى.");
    }
};
// ================= دوال الخصوصية والحظر الحقيقية (مع اللغات 🌍) =================

// تبديل الحساب لخاص/عام
window.toggleAccountPrivacy = async function(currentStatus) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    const newStatus = !currentStatus; 
    try {
        await window.db.collection("users").doc(myUid).update({ isPrivate: newStatus });
        // رسائل نجاح التبديل حسب الحالة الجديدة
        window.showToast(newStatus ? (dict.msg_private_success || "أصبح حسابك خاصاً 🔒") : (dict.msg_public_success || "أصبح حسابك عاماً 🌍"));
        document.getElementById('pro-options-menu').classList.remove('active');
        window.openProfileSlide(myUid); // تحديث الواجهة
    } catch(e) { console.error(e); }
};

// نسخ الرابط
window.copyProfileLink = function(uid) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const url = window.location.origin + window.location.pathname + "?user=" + uid;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
            window.showToast(dict.msg_link_copied || "تم نسخ الرابط بنجاح! 📋");
        });
    }
    document.getElementById('pro-options-menu').classList.remove('active');
};

// حظر مستخدم بالكامل (دمار شامل للعلاقة)
window.blockUser = async function(targetUid, targetName) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    document.getElementById('pro-options-menu').classList.remove('active');
    
    // رسالة تأكيد زجاجية مترجمة
    const confirmBlock = await window.uiModal({
        type: 'confirm',
        title: dict.opt_block || 'حظر المستخدم',
        // دمج اسم المستخدم في الرسالة المترجمة
        message: (dict.alert_block_confirm || `هل أنت متأكد من حظر "${targetName}"؟ لن يتمكن من رؤية بروفايلك أو التفاعل معك.`).replace('${targetName}', targetName),
        icon: 'ban',
        color: 'var(--danger)',
        confirmText: dict.btn_confirm || 'تأكيد الحظر'
    });

    if(!confirmBlock) return;
    
    const myUid = window.auth.currentUser.uid;
    
    try {
        await window.db.collection("users").doc(myUid).collection("blocked").doc(targetUid).set({ timestamp: Date.now() });
        // إلغاء المتابعة من الطرفين (Logic لم يتم تغييره)
        await window.db.collection("users").doc(targetUid).collection("followers").doc(myUid).delete();
        await window.db.collection("users").doc(myUid).collection("following").doc(targetUid).delete();
        await window.db.collection("users").doc(myUid).collection("followers").doc(targetUid).delete();
        await window.db.collection("users").doc(targetUid).collection("following").doc(myUid).delete();

        window.showToast(dict.msg_blocked_success || "تم حظر المستخدم نهائياً 🚫");
        window.closeSPA('profileSlidePage'); // إخراج المستخدم من بروفايل الشخص المحظور
    } catch(e) { console.error("Block Error:", e); }
};// فتح قائمة المحظورين
window.openBlockedUsersModal = async function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    const container = document.getElementById('blocked-users-list');
    document.getElementById('blocked-users-modal').style.display = 'flex';
    
    // أيقونة التحميل (Loading)
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    try {
        const blockedSnap = await window.db.collection("users").doc(myUid).collection("blocked").get();
        if (blockedSnap.empty) {
            // رسالة القائمة الفارغة من القاموس
            container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sub);">${dict.msg_empty_block_list || 'قائمة الحظر فارغة، أنت في سلام! 🕊️'}</div>`;
            return;
        }

        container.innerHTML = "";
        for (let doc of blockedSnap.docs) {
            const blockedUid = doc.id;
            const uDoc = await window.db.collection("users").doc(blockedUid).get();
            if (uDoc.exists) {
                const u = uDoc.data();
                container.innerHTML += `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--input-bg); border-radius:12px; margin-bottom:10px; border:1px solid var(--border-app);">
                        <div style="display:flex; align-items:center; gap:12px;">
                            <img src="${u.photoURL || 'assets/img/profile.png'}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:1px solid var(--border-app);">
                            <strong style="color:var(--text-main); font-size:15px;">${u.name}</strong>
                        </div>
                        <button onclick="window.unblockUser('${blockedUid}', this)" style="background:var(--card-bg); border:1px solid var(--border-app); padding:6px 15px; border-radius:20px; color:var(--text-main); cursor:pointer; font-weight:bold; font-family:'Cairo'; transition:0.2s;">
                            ${dict.btn_unblock || 'إلغاء الحظر'}
                        </button>
                    </div>
                `;
            }
        }
    } catch(e) { console.error(e); }
};

// إلغاء الحظر
window.unblockUser = async function(targetUid, btnElement) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    
    // نص حالة "جاري المعالجة" من القاموس
    btnElement.innerText = dict.msg_unblocking || "جاري الفك...";
    btnElement.disabled = true;
    
    try {
        await window.db.collection("users").doc(myUid).collection("blocked").doc(targetUid).delete();
        // رسالة نجاح العملية
        window.showToast(dict.msg_unblocked_success || "تم إلغاء الحظر بنجاح ✅");
        
        const itemDiv = btnElement.parentElement;
        itemDiv.style.opacity = '0';
        setTimeout(() => itemDiv.remove(), 300); // إخفاء بأنميشن
        
        setTimeout(() => {
            const list = document.getElementById('blocked-users-list');
            if (list.children.length === 0) {
                list.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-sub);">${dict.msg_empty_block_list || 'قائمة الحظر فارغة، أنت في سلام! 🕊️'}</div>`;
            }
        }, 350);
    } catch(e) { console.error(e); }
};
// حارس إغلاق القوائم المنسدلة عند الضغط في أي مكان بالشاشة
document.addEventListener('click', function(event) {
    const proMenu = document.getElementById('pro-options-menu');
    if (proMenu && proMenu.classList.contains('active')) {
        proMenu.classList.remove('active');
    }
});
// ==========================================
// 🖼️ تحديث صورة الملف الشخصي (النسخة النووية ☢️)
// ==========================================
window.updateProfilePic = async function(event) {
    // جلب القاموس الحالي
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    console.log("1. بدء عملية تحديث الصورة...");
    const file = event.target.files[0];
    if (!file) return;

    const myUid = window.auth?.currentUser?.uid || firebase.auth().currentUser?.uid;
    if (!myUid) {
        window.showToast(dict.alert_login_required || "يجب تسجيل الدخول أولاً ⚠️");
        return;
    }

    try {
        window.showToast(dict.msg_updating_profile || "جاري الرفع وتحديث بياناتك... ⏳");
        const btn = event.target;
        btn.disabled = true;

        console.log("2. جاري الرفع لسحابة Cloudinary...");
        const newPhotoUrl = await window.cloudinaryEngine.uploadFile(file);

        if (!newPhotoUrl) {
            console.error("فشل الحصول على رابط السحابة");
            window.showToast(dict.alert_upload_fail || "فشل رفع الصورة، جرب مجدداً ❌");
            btn.disabled = false;
            return;
        }
        console.log("3. تم الرفع بنجاح! الرابط:", newPhotoUrl);

        console.log("4. تحديث ملف المستخدم الأساسي...");
        await window.db.collection("users").doc(myUid).update({
            photoURL: newPhotoUrl
        });

        console.log("5. تحديث المنشورات السابقة...");
        const postsSnap = await window.db.collection("posts").where("authorId", "==", myUid).get();
        
        if (!postsSnap.empty) {
            console.log(`تم العثور على ${postsSnap.size} منشور لتحديث صورته.`);
            const batch = window.db.batch();
            postsSnap.forEach(doc => {
                batch.update(doc.ref, { authorImg: newPhotoUrl });
            });
            await batch.commit();
            console.log("6. تم تحديث جميع المنشورات بنجاح!");
        } else {
            console.log("لا توجد منشورات سابقة لهذا المستخدم.");
        }

        window.showToast(dict.msg_update_success_reload || "تم التحديث بنجاح! 🔄 جاري إعادة تحميل الصفحة...");
        
        // 🔥 الضربة القاضية: إعادة تحميل الصفحة فوراً لتطبيق التغييرات رغماً عن المتصفح!
        setTimeout(() => {
            window.location.reload();
        }, 1500);

    } catch (error) {
        console.error("Profile Pic Update Error:", error);
        window.showToast(dict.alert_update_error || "حدث خطأ أثناء تحديث الصورة ⚠️");
    }
};// ================= دالة تسجيل الخروج الاحترافية =================
window.logoutUser = async function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    // استخدام النافذة الزجاجية للتأكد (مترجمة بالكامل)
    const confirmed = await window.uiModal({
        type: 'confirm',
        title: dict.nav_logout || 'تسجيل الخروج',
        message: dict.logout_confirm_msg || 'هل أنت متأكد أنك تريد تسجيل الخروج من حسابك؟',
        icon: 'log-out-outline',
        color: 'var(--danger)',
        confirmText: dict.btn_confirm || 'تأكيد'
    });

    if (confirmed) {
        try {
            // النداء الصحيح لمكتبة فايربيس
            await window.firebase.auth().signOut();
            // الانتقال إلى صفحة الاندكس
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error:", error);
            window.showToast(dict.logout_error || "حدث خطأ أثناء تسجيل الخروج");
        }
    }
};
// ============================================================================
// العقل المدبر للدردشة (Chat Engine PRO) - حسام
// ============================================================================

let activeChatId = null;
let activeChatListener = null;

// ============================================================================
// 🗺️ دالة التوجيه للدردشة (النسخة المعصومة من الخطأ 💯 - مع حماية التوثيق 🛡️)
// ============================================================================
window.openChatSystem = async function() {
    // 1. فتح الشاشة فوراً
    window.openSPA('chatSlidePage');

    const user = window.firebase.auth().currentUser;
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};

    if (!user) return window.showToast(dict.alert_login_required || "يجب تسجيل الدخول 🔒");

    try {
        // 2. جلب البيانات والرتبة مباشرة من قاعدة البيانات
        const docSnap = await window.firebase.firestore().collection("users").doc(user.uid).get();
        const userData = docSnap.exists ? docSnap.data() : {};
        
        const role = userData.role ? String(userData.role).trim().toLowerCase() : 'patient';
        const isVerified = userData.isVerified === true; // 🛡️ جلب حالة التوثيق

        const isPharmacist = (role === 'pharmacist' || role === 'صيدلي');
        const isDoctor = (role === 'doctor' || role === 'طبيب');

        const lobbyView = document.getElementById('chat-lobby-view');
        const inboxView = document.getElementById('chat-inbox-view');
        const patientsCard = document.getElementById('lobby-card-patients');

        // 3. التوجيه الصارم بناءً على الرتبة والتوثيق
        if (isDoctor || isPharmacist) {
            if (lobbyView) lobbyView.style.display = 'block';
            if (inboxView) inboxView.style.display = 'none';

            if (patientsCard) {
                // 🚨 الجراحة هنا: إظهار البطاقة للطبيب بشرط أن يكون موثقاً 🚨
                if (isDoctor && isVerified) {
                    patientsCard.style.display = 'flex'; // إظهار للطبيب الموثق فقط 😎
                } else {
                    patientsCard.style.display = 'none'; // طرد الصيدلي والطبيب المتدرب (غير الموثق) 🚫
                }
            }
        } else {
            // المريض العادي
            if (lobbyView) lobbyView.style.display = 'none';
            if (inboxView) inboxView.style.display = 'block';
            if (window.showInboxView) window.showInboxView();
        }
    } catch(e) {
        console.error("خطأ في توجيه الدردشة:", e);
    }
};
// 2. عرض صندوق الوارد (للمرضى أو للأطباء إذا اختاروها)
window.showInboxView = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    if(document.getElementById('chat-lobby-view')) document.getElementById('chat-lobby-view').style.display = 'none';
    if(document.getElementById('chat-inbox-view')) document.getElementById('chat-inbox-view').style.display = 'block';
    
    const myUid = window.auth.currentUser.uid;
    const inboxContainer = document.getElementById('inbox-list');
    if (!inboxContainer) return;

    inboxContainer.innerHTML = `<div style="text-align:center; padding:40px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    // جلب المحادثات (نظام الديمو كما هو)
    window.db.collection("users").limit(15).get().then(snap => {
        inboxContainer.innerHTML = "";
        snap.forEach(doc => {
            if(doc.id === myUid) return;
            const u = doc.data();
            
            // ترجمة الرتبة ديناميكياً
            const roleKey = u.role === 'doctor' ? dict.role_doctor : (u.role === 'pharmacist' ? dict.role_pharmacist : dict.role_patient);
            
            inboxContainer.innerHTML += `
                <div class="inbox-item" onclick="window.openPrivateChat('${doc.id}', '${u.name.replace(/'/g, "\\'")}', '${u.photoURL || 'assets/img/profile.png'}')">
                    <img src="${u.photoURL || 'assets/img/profile.png'}">
                    <div class="inbox-details">
                        <h4>${u.name}</h4>
                        <p>${roleKey || u.role} • ${dict.click_to_chat || 'انقر للمراسلة'}</p>
                    </div>
                    <ion-icon name="chevron-back-outline" style="color:var(--text-sub);"></ion-icon>
                </div>
            `;
        });
    });
};

// 3. فتح الغرفة الطبية العامة (Global Room)
window.openGlobalMedicalRoom = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    activeChatId = "global_medical_room";
    
    const chatName = document.getElementById('active-chat-name');
    const chatStatus = document.getElementById('active-chat-status');
    
    if(chatName) chatName.innerText = dict.global_medical_room_title || "الغرفة الطبية (عام)";
    if(document.getElementById('active-chat-avatar')) {
        document.getElementById('active-chat-avatar').src = "https://cdn-icons-png.flaticon.com/512/3209/3209074.png";
    }
    if(chatStatus) chatStatus.innerHTML = `🌐 ${dict.global_room_status || 'يراها جميع الأطباء والصيادلة'}`;
    
    window.openSPA('chatRoomSlidePage');
    if(typeof listenToChatMessages === 'function') listenToChatMessages();
};


window.initFeedPTR = function() {
    const feedSection = document.getElementById('main-feed-area');
    const ptrIndicator = document.getElementById('feed-ptr-indicator');
    const icon = document.getElementById('ptr-icon');
    if(!feedSection || !ptrIndicator) return;

    let touchStartY = 0;
    let ptrDistance = 0;
    const ptrThreshold = 120; // المسافة المطلوبة لتأكيد التحديث

    feedSection.addEventListener('touchstart', (e) => {
        // نضع هامش 5 بكسل لأن شاشات الموبايل أحيانا لا تصل لـ 0 بالضبط
        if (feedSection.scrollTop <= 5) {
            touchStartY = e.touches[0].clientY;
            ptrIndicator.style.transition = 'none';
        } else {
            touchStartY = 0;
        }
    }, { passive: true });

    feedSection.addEventListener('touchmove', (e) => {
        if (touchStartY > 0 && feedSection.scrollTop <= 5) {
            const currentY = e.touches[0].clientY;
            ptrDistance = currentY - touchStartY;
            
            // 🛑 السحر هنا: المنطقة الميتة (لا يتفاعل الدوران والنزول إلا إذا سحبت بقوة أكثر من 40 بكسل)
            if (ptrDistance > 40 && ptrDistance < 250) {
                ptrIndicator.style.top = `${ptrDistance - 60}px`;
                ptrIndicator.style.opacity = 1;
                icon.style.transform = `rotate(${ptrDistance * 2}deg)`;
                
                if (ptrDistance >= ptrThreshold) {
                    icon.style.color = "var(--success, #10b981)";
                } else {
                    icon.style.color = "var(--primary, #00f3ff)";
                }
            }
        }
    }, { passive: true });

    feedSection.addEventListener('touchend', () => {
        if (touchStartY > 0 && ptrDistance > 40) {
            ptrIndicator.style.transition = 'top 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s';
            
            if (ptrDistance >= ptrThreshold) {
                ptrIndicator.style.top = '30px'; // وضعية التحديث
                icon.style.animation = 'spin 1s linear infinite';
                
                setTimeout(() => {
                    window.location.reload(); 
                }, 500);
            } else {
                // إخفاء فوري إذا سحب قليلاً وترك الشاشة
                ptrIndicator.style.top = '-70px';
                ptrIndicator.style.opacity = '0';
            }
        }
        
        // تصفير القيم للعملية القادمة
        touchStartY = 0;
        ptrDistance = 0;
    });
};