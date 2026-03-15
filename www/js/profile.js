// ============================================================================
// العقل المدبر لملف البروفايل (النسخة السينمائية الخالية من الأخطاء) - حسام PRO
// ============================================================================

let currentViewedId = null;
let profilePostsListener = null;

// 1. الدالة المركزية للفتح وتحديد الهوية
window.openProfileSlide = async function(targetUid) {
    const myUid = window.auth.currentUser.uid;
    currentViewedId = targetUid || myUid;
    const isMe = (currentViewedId === myUid);

    window.openSPA('profileSlidePage');
    resetProfileUI(); // هذا السطر الآن سيخفي أزرار المناوبة كإجراء افتراضي

    const currentLang = localStorage.getItem('app_lang') || 'ar';
    const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : { follow_btn: "متابعة", unfollow_btn: "إلغاء المتابعة", edit_profile_title: "تعديل", msg_btn: "مراسلة" };

    // ================= جلب البيانات الأساسية للبروفايل =================
    let uData = {};
    try {
        const userDoc = await window.db.collection("users").doc(currentViewedId).get();
        if (userDoc.exists) uData = userDoc.data();
    } catch(e) { console.error("Error fetching user data:", e); }
    
    const isPrivate = uData.isPrivate || false;
    const actionArea = document.getElementById('pro-actions');

    // ================= 🚨 الذكاء هنا: إظهار أزرار المناوبة والرادار في بروفايلي فقط! 🚨 =================
    if (isMe) {
        document.getElementById('pro-edit-pic-btn').style.display = 'flex';
        
        // --- إظهار أدوات الطبيب/الصيدلي إذا كان البروفايل لي ---
        if (uData.role === 'doctor' || uData.role === 'pharmacist') {
            const dutySec = document.getElementById('night-duty-section');
            const btn = document.getElementById('night-duty-btn');
            if (dutySec) dutySec.style.display = 'flex';
            
            // ضبط لون زر المناوبة حسب حالتي
            if (uData.isNightDuty === true && btn) {
                btn.innerHTML = dict.stop_duty || 'إيقاف المناوبة 🛑';
                btn.style.background = 'rgba(255, 75, 43, 0.2)';
                btn.style.borderColor = 'var(--red)';
                btn.style.color = 'var(--red)';
            } else if (btn) {
                btn.innerHTML = dict.start_duty || 'تفعيل المناوبة ✅';
                btn.style.background = 'var(--card-bg)';
                btn.style.borderColor = 'var(--border-color)';
                btn.style.color = 'white';
            }
        }
        
        // --- إظهار رادار الأدوية إذا كنت صيدلي وهذا بروفايلي ---
        if (uData.role === 'pharmacist') {
            const radarSec = document.getElementById('pharmacist-radar-section');
            if (radarSec) {
                radarSec.style.display = 'block';
                if (window.listenToMedicineRequests) window.listenToMedicineRequests();
            }
        }

        // أزرار البروفايل الشخصي (تعديل، إعدادات...)
        actionArea.innerHTML = `
            <button class="pro-btn pro-btn-outline" onclick="window.openEditProfileModal()">
                <span data-i18n="edit_profile_title">${dict.edit_profile_title || 'تعديل'}</span>
            </button>
            <button class="pro-btn pro-btn-outline" onclick="window.openSPA('settingsSlidePage')">
                <ion-icon name="settings-outline"></ion-icon> <span>${dict.nav_settings || 'الإعدادات'}</span>
            </button>
            <div style="position: relative; display: flex;">
                <button class="pro-btn pro-btn-outline" style="padding: 0 15px; display: flex; justify-content: center; align-items: center; height: 100%; cursor: pointer;" onclick="event.stopPropagation(); document.getElementById('pro-options-menu').classList.toggle('active')">
                    <ion-icon name="ellipsis-horizontal" style="font-size: 28px;"></ion-icon>
                </button>
                <div id="pro-options-menu" class="options-menu" style="top: 115%; left: 0; width: 220px; z-index: 1001;">
                    <button onclick="window.toggleAccountPrivacy(${isPrivate})">
                        <ion-icon name="${isPrivate ? 'earth-outline' : 'lock-closed-outline'}"></ion-icon> 
                        <span>${isPrivate ? (dict.opt_public_acc || 'جعل الحساب عام 🌍') : (dict.opt_private_acc || 'جعل الحساب خاص 🔒')}</span>
                    </button>
                    <button onclick="window.copyProfileLink('${currentViewedId}')">
                        <ion-icon name="link-outline"></ion-icon> <span>${dict.opt_copy_link || 'نسخ رابط حسابي 📋'}</span>
                    </button>
                </div>
            </div>
        `;
    } else {
        // إذا كان بروفايل شخص آخر، لا نظهر له أزراري السرية!
        document.getElementById('pro-edit-pic-btn').style.display = 'none';
        
        // أزرار التفاعل مع الآخرين
        actionArea.innerHTML = `
            <button id="pro-follow-btn" class="pro-btn pro-btn-primary" onclick="window.toggleFollow()"><span>${dict.follow_btn}</span></button>
            <button class="pro-btn pro-btn-msg" onclick="window.openChatFromProfile()">
                <ion-icon name="mail-outline" style="font-size: 24px;"></ion-icon>
            </button>
            
            <div style="position: relative; display: flex;">
                <button class="pro-btn pro-btn-outline" style="padding: 0 15px; display: flex; justify-content: center; align-items: center; height: 100%; cursor: pointer;"onclick="event.stopPropagation(); document.getElementById('pro-options-menu').classList.toggle('active')">
                    <ion-icon name="ellipsis-horizontal" style="font-size: 28px;"></ion-icon>
                </button>
                <div id="pro-options-menu" class="options-menu" style="top: 115%; left: 0; width: 220px; z-index: 1001;">
                    <button onclick="window.copyProfileLink('${currentViewedId}')">
                        <ion-icon name="link-outline"></ion-icon> <span>${dict.opt_copy_link || 'نسخ رابط الملف 📋'}</span>
                    </button>
                    <button onclick="window.blockUser('${currentViewedId}', '${uData.name?.replace(/'/g, "\\'") || (dict.default_user || 'المستخدم')}')" style="color: var(--danger);">
                        <ion-icon name="ban-outline"></ion-icon> <span>${dict.opt_block_user || 'حظر المستخدم 🚫'}</span>
                    </button>
                </div>
            </div>
        `;
        checkFollowStatus(myUid, currentViewedId, dict);
    }

    await fetchProfileData(currentViewedId);
    setupRealtimeStats(currentViewedId);
    window.switchProTab('tab-posts', document.querySelector('.pro-tab'));
    
    setTimeout(() => {
        if(typeof window.applyLanguage === 'function') window.applyLanguage();
    }, 50);
};

// 2. تصفير الواجهة (Reset UI) - تم إضافة إخفاء الأقسام السرية هنا
function resetProfileUI() {
    document.getElementById('pro-name').innerText = "...";
    document.getElementById('pro-pic').src = "assets/img/profile.png";
    document.getElementById('pro-bio').innerText = "";
    document.getElementById('pro-posts-container').innerHTML = "";
    document.getElementById('pro-media-container').innerHTML = "";
    
    // 🚨 تأمين: إخفاء الأزرار السرية كوضع افتراضي قبل فتح أي بروفايل
    const dutySec = document.getElementById('night-duty-section');
    const radarSec = document.getElementById('pharmacist-radar-section');
    if (dutySec) dutySec.style.display = 'none';
    if (radarSec) radarSec.style.display = 'none';

    if(profilePostsListener) profilePostsListener(); 
}

// 3. جلب بيانات فايربيس
async function fetchProfileData(uid) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    try {
        const doc = await window.db.collection("users").doc(uid).get();
        if (doc.exists) {
            const u = doc.data();
            
            // تحديث المعلومات الأساسية
            if(document.getElementById('pro-name')) document.getElementById('pro-name').innerText = u.name || (dict.default_user || "مستخدم");
            if(document.getElementById('pro-pic')) document.getElementById('pro-pic').src = u.photoURL || "assets/img/profile.png";
            if(document.getElementById('pro-role')) document.getElementById('pro-role').innerText = u.role === 'doctor' ? (dict.role_doctor || 'طبيب') : (dict.role_pharmacist || 'صيدلي');
            if(document.getElementById('pro-bio')) document.getElementById('pro-bio').innerText = u.bio || "";
            
            // تحديث قسم (حول / About) - أضفنا الـ IDs والبيانات الناقصة
            if(document.getElementById('pro-about-card')) {
                document.getElementById('pro-about-card').innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; color:var(--text-main);">
                        <ion-icon name="medkit" style="color:var(--primary); font-size:20px;"></ion-icon> 
                        <strong>${dict.lbl_specialty || 'التخصص:'}</strong> 
                        <span id="pro-specialty">${u.specialty || (dict.general_specialty || 'عام')}</span>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; color:var(--text-main);">
                        <ion-icon name="location" style="color:var(--primary); font-size:20px;"></ion-icon> 
                        <strong>${dict.lbl_location || 'العنوان:'}</strong> 
                        <span id="pro-location">${u.locationLink || u.location || (dict.not_specified || 'غير محدد')}</span>
                    </div>
                    
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; color:var(--text-main);">
                        <ion-icon name="call" style="color:var(--primary); font-size:20px;"></ion-icon> 
                        <strong>${dict.lbl_phone || 'الهاتف:'}</strong> 
                        <span id="pro-phone" dir="ltr">${u.phone || '---'}</span>
                    </div>

                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:15px; color:var(--text-main);">
                        <ion-icon name="time" style="color:var(--primary); font-size:20px;"></ion-icon> 
                        <strong>${dict.lbl_hours || 'ساعات العمل:'}</strong> 
                        <span id="pro-hours" dir="ltr">${u.workingHours || '---'}</span>
                    </div>
                `;
            }
        }
    } catch (e) { console.error(e); }
}

// ============================================================================
// 4. الإحصائيات اللحظية (مدرعة ضد تداخل الأرقام - Zombie Listeners Fix)
// ============================================================================

// تعريف متغيرات لحفظ الرادارات
let profileFollowersListener = null;
let profileFollowingListener = null;

function setupRealtimeStats(uid) {
    // 🚨 الجراحة السحرية: إيقاف الرادارات القديمة قبل فتح بروفايل جديد 🚨
    if (profileFollowersListener) profileFollowersListener();
    if (profileFollowingListener) profileFollowingListener();

    // تشغيل رادار المتابعين
    profileFollowersListener = window.db.collection("users").doc(uid).collection("followers").onSnapshot(s => {
        const el = document.getElementById('pro-followers-count');
        if (el) el.innerText = s.size;
    });

    // تشغيل رادار من أتابعهم
    profileFollowingListener = window.db.collection("users").doc(uid).collection("following").onSnapshot(s => {
        const el = document.getElementById('pro-following-count');
        if (el) el.innerText = s.size;
    });

    // إعداد أزرار فتح القوائم
    const followersBtn = document.getElementById('pro-followers-count').parentElement;
    const followingBtn = document.getElementById('pro-following-count').parentElement;
    
    followersBtn.style.cursor = 'pointer';
    followingBtn.style.cursor = 'pointer';

    followersBtn.onclick = () => window.openUsersList(uid, 'followers');
    followingBtn.onclick = () => window.openUsersList(uid, 'following');
}

// 5. محرك المنشورات المتطور (Posts Engine)
window.loadProfilePosts = async function(uid, mode = 'all') {
    const postsContainer = document.getElementById('pro-posts-container');
    const mediaContainer = document.getElementById('pro-media-container');
    const myUid = window.auth.currentUser.uid;
    const isMe = (uid === myUid);
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    if(profilePostsListener) profilePostsListener();

    // ================= [حارس الخصوصية] =================
    if (!isMe) {
        try {
            const targetUserDoc = await window.db.collection("users").doc(uid).get();
            const isPrivate = targetUserDoc.exists ? targetUserDoc.data().isPrivate : false;

            if (isPrivate) {
                const checkFollow = await window.db.collection("users").doc(uid).collection("followers").doc(myUid).get();
                if (!checkFollow.exists) {
                    const lockHtml = `
                        <div style="text-align:center; padding:80px 20px; color:var(--text-main);">
                            <div style="background:var(--input-bg); width:80px; height:80px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 15px;">
                                <ion-icon name="lock-closed" style="font-size:40px; color:var(--text-main);"></ion-icon>
                            </div>
                            <h3 style="margin:0; line-height:1.5;">${dict.msg_private_account || "هذا الحساب خاص 🔒<br><small>قم بمتابعته لرؤية منشوراته</small>"}</h3>
                        </div>`;
                    postsContainer.innerHTML = lockHtml;
                    mediaContainer.innerHTML = lockHtml;
                    document.getElementById('pro-posts-count').innerText = "-";
                    return; 
                }
            }
        } catch (e) { console.error("Privacy Check Error:", e); }
    }
    // ===================================================

    profilePostsListener = window.db.collection("posts").where("authorId", "==", uid).onSnapshot(snap => {
        document.getElementById('pro-posts-count').innerText = snap.size; 
        
        if (snap.empty) {
            postsContainer.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-sub);">${dict.empty_posts || 'لا توجد منشورات'}</div>`;
            mediaContainer.innerHTML = `<div style="text-align:center; padding:50px; color:var(--text-sub);">${dict.empty_posts_media || 'لا توجد وسائط'}</div>`;
            return;
        }

        let postsArray = [];
        snap.forEach(doc => postsArray.push({ id: doc.id, ...doc.data() }));
        postsArray.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        postsContainer.innerHTML = "";
        mediaContainer.innerHTML = "";

        postsArray.forEach(p => {
            const pid = p.id;
            const isLiked = p.likes && p.likes.includes(myUid);
            const commentsDisabled = p.commentsDisabled || false;

            // ================= هندسة الوسائط السينمائية (لتبويب الوسائط والمنشورات) =================
            if (p.mediaUrl) {
                const isVideo = p.mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || p.mediaUrl.includes('video/upload');
                
                // 1. إضافة الوسائط في تبويب "الوسائط" (Grid View)
                let mediaGridTag = "";
                if (isVideo) {
                    mediaGridTag = `
                    <div style="position:relative; width:100%; height:100%; cursor:pointer;" onclick="window.openMediaViewer('${p.mediaUrl}', true)">
                        <video src="${p.mediaUrl}" style="width:100%; height:100%; object-fit:cover; pointer-events:none;" muted></video>
                        <ion-icon name="play-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:40px; color:rgba(255,255,255,0.9); text-shadow:0 2px 5px rgba(0,0,0,0.5); z-index:2;"></ion-icon>
                    </div>`;
                } else {
                    mediaGridTag = `<img src="${p.mediaUrl}" onclick="window.openMediaViewer('${p.mediaUrl}')" style="width:100%; height:100%; object-fit:cover; cursor:pointer;">`;
                }
                mediaContainer.innerHTML += mediaGridTag;
            }

            if (mode === 'media') return;

            const safeContent = encodeURIComponent(p.content || '');

            let menuHTML = isMe ? `
                <button onclick="window.openEditPostModal('${pid}', decodeURIComponent('${safeContent}'))"><ion-icon name="create-outline"></ion-icon> <span>${dict.opt_edit || 'تعديل المنشور'}</span></button>
                <button onclick="window.toggleFeedCommentsStatus('${pid}', ${commentsDisabled})"><ion-icon name="${commentsDisabled ? 'chatbubbles' : 'lock-closed-outline'}"></ion-icon> <span>${commentsDisabled ? (dict.opt_unlock_comments || 'تفعيل التعليقات') : (dict.opt_lock_comments || 'إيقاف التعليقات')}</span></button>
                <button onclick="window.deletePost('${pid}')" style="color:var(--danger);"><ion-icon name="trash-outline"></ion-icon> <span>${dict.opt_deletes || 'حذف المنشور'}</span></button>
            ` : `
                <button onclick="document.getElementById('pro-post-${pid}').style.display='none'"><ion-icon name="eye-off-outline"></ion-icon> <span>${dict.opt_hide || 'إخفاء المنشور'}</span></button>
                <button onclick="window.showToast('${dict.alert_success || 'تم الإرسال'}')"><ion-icon name="flag-outline"></ion-icon> <span>${dict.opt_report || 'إبلاغ عن محتوى'}</span></button>
            `;

            // 2. إضافة الوسائط في تبويب "المنشورات" (Feed View)
            let postMediaHTML = '';
            if (p.mediaUrl) {
                const isVideoPost = p.mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || p.mediaUrl.includes('video/upload');
                if (isVideoPost) {
                    postMediaHTML = `
                    <div style="position:relative; cursor:pointer; margin-top:10px;" onclick="window.openMediaViewer('${p.mediaUrl}', true)">
                        <video class="post-img" style="width:100%; border-radius:0; pointer-events:none; object-fit:cover;">
                            <source src="${p.mediaUrl}">
                        </video>
                        <ion-icon name="play-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:60px; color:rgba(255,255,255,0.9); text-shadow:0 5px 15px rgba(0,0,0,0.5); z-index:2;"></ion-icon>
                    </div>`;
                } else {
                    postMediaHTML = `<img src="${p.mediaUrl}" onclick="window.openMediaViewer('${p.mediaUrl}')" class="post-img" style="cursor:pointer; width:100%; border-radius:0; margin-top:10px; object-fit:cover;">`;
                }
            }

            postsContainer.innerHTML += `
                <div class="post-card" id="pro-post-${pid}">
                    <div class="post-header">
                        <img src="${p.authorImg || 'assets/img/profile.png'}">
                        <div><h4 style="margin:0;">${p.authorName}</h4><small style="color:var(--text-sub);">${window.timeAgo ? window.timeAgo(p.timestamp) : (dict.time_now || 'الآن')}</small></div>
                        <div class="post-options">
                            <ion-icon name="ellipsis-horizontal" onclick="window.toggleProOptionsMenu('${pid}')" style="font-size:20px; padding:5px;"></ion-icon>
                            <div class="options-menu" id="pro-menu-${pid}">${menuHTML}</div>
                        </div>
                    </div>
                    <div class="post-body" style="padding:10px 15px; cursor:pointer;" onclick="window.openSPA('postDetailsSlidePage'); window.openPostDetailsSlide('${pid}')">${window.formatPostContent(p.content)}</div>
                    ${postMediaHTML}
                  <div class="post-stats">
                        <span onclick="window.showLikes('${pid}')" style="cursor:pointer;">👍 <span class="like-counter-${pid}">${p.likes?.length || 0}</span></span>
                        <span>${commentsDisabled ? (dict.comments_locked || 'التعليقات مقفلة 🔒') : (p.commentsCount || 0) + ' ' + (dict.action_comment || 'تعليق')}</span>
                    </div>
                    <div class="post-actions">
                        <button class="action-btn like-btn-${pid} ${isLiked ? 'liked' : ''}" onclick="window.toggleFeedLike('${pid}', this)"><ion-icon name="${isLiked ? 'heart' : 'heart-outline'}"></ion-icon> <span data-i18n="action_like">${dict.action_like || 'أعجبني'}</span></button>
                        <button class="action-btn" onclick="window.openSPA('postDetailsSlidePage'); window.openPostDetailsSlide('${pid}')" ${commentsDisabled ? 'disabled style="opacity:0.5"' : ''}><ion-icon name="chatbubble-outline"></ion-icon> <span data-i18n="action_comment">${dict.action_comment || 'تعليق'}</span></button>
                        <button class="action-btn" onclick="window.sharePostFeed('${pid}')"><ion-icon name="share-social-outline"></ion-icon> <span data-i18n="action_share">${dict.action_share || 'مشاركة'}</span></button>
                    </div>
                </div>
            `;
        });
        
        if(typeof window.applyLanguage === 'function') {
            window.applyLanguage();
        }
    });
};

// 6. التبويبات الذكية
window.switchProTab = function(tid, btn) {
    document.querySelectorAll('.pro-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.pro-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tid).classList.add('active');
    
    if (tid === 'tab-posts') window.loadProfilePosts(currentViewedId, 'all');
    if (tid === 'tab-media') window.loadProfilePosts(currentViewedId, 'media');
};

// 7. نظام المتابعة التبادلي
window.toggleFollow = async function() {
    const myUid = window.auth.currentUser.uid;
    const targetUid = currentViewedId;
    const btn = document.getElementById('pro-follow-btn');
    const isFollowing = btn.classList.contains('pro-btn-outline');
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};

    if (isFollowing) {
        await window.db.collection("users").doc(targetUid).collection("followers").doc(myUid).delete();
        await window.db.collection("users").doc(myUid).collection("following").doc(targetUid).delete();
        btn.classList.replace('pro-btn-outline', 'pro-btn-primary');
        btn.querySelector('span').innerText = dict.follow_btn || 'متابعة';
    } else {
        await window.db.collection("users").doc(targetUid).collection("followers").doc(myUid).set({t:Date.now()});
        await window.db.collection("users").doc(myUid).collection("following").doc(targetUid).set({t:Date.now()});
        btn.classList.replace('pro-btn-primary', 'pro-btn-outline');
        btn.querySelector('span').innerText = dict.unfollow_btn || 'إلغاء المتابعة';
        
        if (typeof window.sendNotification === 'function') {
            window.sendNotification(targetUid, 'follow');
        }
    }
};

async function checkFollowStatus(myUid, targetUid, dict) {
    const doc = await window.db.collection("users").doc(targetUid).collection("followers").doc(myUid).get();
    const btn = document.getElementById('pro-follow-btn');
    if (doc.exists) {
        btn.querySelector('span').innerText = dict.unfollow_btn || 'إلغاء المتابعة';
        btn.classList.replace('pro-btn-primary', 'pro-btn-outline');
    }
}

// 8. تعديل البيانات وحفظها (مضادة لسجن السلايدات 🚀)
window.openEditProfileModal = async function() {
    const modal = document.getElementById('editProfileModal');
    document.body.appendChild(modal); // ☢️ السلاح النووي: اقتلاع النافذة للامام
    modal.style.zIndex = "2147483647"; 
    modal.style.display = 'flex';

    try {
        const doc = await window.db.collection("users").doc(window.auth.currentUser.uid).get();
        if(doc.exists) {
            const u = doc.data();
            document.getElementById('edit-name').value = u.name || "";
            document.getElementById('edit-specialty').value = u.specialty || "";
            document.getElementById('edit-bio').value = u.bio || "";
            document.getElementById('edit-insta').value = u.instaLink || "";
            document.getElementById('edit-phone').value = u.phone || "";
            document.getElementById('edit-working-hours').value = u.workingHours || "";
            document.getElementById('edit-location').value = u.locationLink || u.location || "";
        }
    } catch (e) { console.error(e); }
};



// --- دوال أمان (لضمان عدم الانهيار) ---
window.toggleProOptionsMenu = function(postId) {
    const menu = document.getElementById(`pro-menu-${postId}`);
    const isActive = menu.classList.contains('active');
    
    document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
    if (!isActive) menu.classList.add('active');
};

// ================= نظام قوائم المتابعين وإزالة المتابعين =================
window.openUsersList = async function(uid, type) {
    const myUid = window.auth.currentUser.uid;
    const isMe = (uid === myUid);
    const container = document.getElementById('usersListContainer');
    const title = document.getElementById('usersListTitle');
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};

    // تحديد عنوان النافذة
    title.innerText = type === 'followers' ? (dict.stat_followers || "المتابعون") : (dict.stat_following || "يتابع");
    
    // ☢️ السلاح النووي: نقل النافذة إجبارياً إلى واجهة التطبيق لكسر سجن السلايد
    const modal = document.getElementById('usersListModal');
    document.body.appendChild(modal); 
    modal.style.zIndex = "2147483647"; // أعلى رقم Z-Index في المتصفحات
    modal.style.display = 'flex';
    
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    try {
        const snap = await window.db.collection("users").doc(uid).collection(type).get();
        
        if (snap.empty) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">${dict.empty_list || 'القائمة فارغة.'}</div>`;
            return;
        }

        const userPromises = snap.docs.map(doc => window.db.collection("users").doc(doc.id).get());
        const usersDocs = await Promise.all(userPromises);

        container.innerHTML = "";

        usersDocs.forEach(userDoc => {
            if (!userDoc.exists) return;
            const u = userDoc.data();
            const userId = userDoc.id;

            let actionButton = '';
            if (isMe && type === 'followers') {
                const safeName = u.name ? u.name.replace(/'/g, "\\'") : (dict.default_user || 'مستخدم');
                actionButton = `<button class="pro-btn" style="background: var(--input-bg); color: var(--danger); font-size: 12px; padding: 5px 15px;" onclick="window.removeFollower('${userId}', '${safeName}', this)">${dict.btn_remove || 'إزالة'}</button>`;
            }

            container.innerHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;" onclick="window.openProfileSlide('${userId}'); document.getElementById('usersListModal').style.display='none';">
                        <img src="${u.photoURL || 'assets/img/profile.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover;">
                        <div>
                            <h4 style="margin: 0; font-size: 15px; color: var(--text-main);">${u.name || (dict.default_user || 'مستخدم')}</h4>
                            <p style="margin: 0; font-size: 12px; color: var(--text-sub);">${u.specialty || dict.general_specialty || 'عام'}</p>
                        </div>
                    </div>
                    ${actionButton}
                </div>
            `;
        });

    } catch (error) {
        console.error("خطأ في جلب القائمة:", error);
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">${dict.alert_error || 'حدث خطأ أثناء الجلب.'}</div>`;
    }
};

window.removeFollower = async function(followerUid, followerName, btnElement) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    const confirmRemove = await window.uiModal({
        type: 'confirm',
        title: dict.opt_remove_follower || 'إزالة المتابع',
        message: (dict.alert_remove_follower || `هل أنت متأكد من إزالة "{name}" من قائمة متابعيك؟ لن يتم إشعاره بذلك.`).replace('{name}', followerName),
        icon: 'person-remove',
        color: 'var(--danger)',
        confirmText: dict.btn_remove || 'إزالة'
    });

    if (!confirmRemove) return;

    const myUid = window.auth.currentUser.uid;
    
    btnElement.innerText = dict.removed || "تمت الإزالة";
    btnElement.style.color = "var(--text-sub)";
    btnElement.disabled = true;

    try {
        await window.db.collection("users").doc(myUid).collection("followers").doc(followerUid).delete();
        await window.db.collection("users").doc(followerUid).collection("following").doc(myUid).delete();
        window.showToast(dict.msg_follower_removed || "تم إزالة المتابع بنجاح 🚫");
    } catch (e) {
        window.showToast(dict.alert_error || "حدث خطأ أثناء الإزالة");
        btnElement.innerText = dict.btn_remove || "إزالة";
        btnElement.disabled = false;
    }
};

// ================= نظام الإعدادات والخصوصية =================
window.openSettingsSlide = async function() {
    window.openSPA('settingsSlidePage');
    const myUid = window.auth.currentUser.uid;
    
    try {
        const doc = await window.db.collection("users").doc(myUid).get();
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('toggle-private').checked = data.isPrivate || false;
            document.getElementById('toggle-hide-follows').checked = data.hideFollows || false;
        }
    } catch (e) { console.error("خطأ في جلب الإعدادات:", e); }
};

window.updatePrivacySetting = async function(settingKey, isChecked) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    try {
        await window.db.collection("users").doc(myUid).update({
            [settingKey]: isChecked
        });
        window.showToast(dict.msg_settings_saved || "تم حفظ الإعدادات بنجاح 🔒");
    } catch (e) {
        window.showToast(dict.alert_error || "حدث خطأ أثناء الحفظ");
        document.getElementById(`toggle-${settingKey === 'isPrivate' ? 'private' : 'hide-follows'}`).checked = !isChecked;
    }
};

// ================= دوال التحكم بالبروفايل الحقيقية =================
window.toggleAccountPrivacy = async function(currentStatus) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    const newStatus = !currentStatus; 
    try {
        await window.db.collection("users").doc(myUid).update({ isPrivate: newStatus });
        window.showToast(newStatus ? (dict.msg_private_success || "أصبح حسابك خاصاً 🔒 (لن يرى الغرباء منشوراتك)") : (dict.msg_public_success || "أصبح حسابك عاماً 🌍"));
        document.getElementById('pro-options-menu').classList.remove('active');
        window.openProfileSlide(myUid); 
    } catch(e) { console.error(e); }
};

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

window.blockUser = async function(targetUid, targetName) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    document.getElementById('pro-options-menu').classList.remove('active');

    const confirmBlock = await window.uiModal({
        type: 'confirm',
        title: dict.opt_block_user || 'حظر المستخدم',
        message: (dict.alert_block_confirm || `هل أنت متأكد من حظر "{name}"؟ لن يتمكن من رؤية بروفايلك أو التفاعل معك.`).replace('{name}', targetName),
        icon: 'ban',
        color: 'var(--danger)',
        confirmText: dict.btn_confirm || 'تأكيد الحظر'
    });

    if (!confirmBlock) return;
    
    const myUid = window.auth.currentUser.uid;
    
    try {
        await window.db.collection("users").doc(myUid).collection("blocked").doc(targetUid).set({ timestamp: Date.now() });
        
        await window.db.collection("users").doc(targetUid).collection("followers").doc(myUid).delete();
        await window.db.collection("users").doc(myUid).collection("following").doc(targetUid).delete();
        await window.db.collection("users").doc(myUid).collection("followers").doc(targetUid).delete();
        await window.db.collection("users").doc(targetUid).collection("following").doc(myUid).delete();

        window.showToast(dict.msg_blocked_success || "تم حظر المستخدم نهائياً 🚫");
        window.closeSPA('profileSlidePage'); 
    } catch(e) { console.error("Block Error:", e); }
};
// ============================================================================
// 📍 1. دالة التقاط موقع الطبيب/الصيدلي (GPS)
// ============================================================================
window.fetchMyGPSLocation = function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    if (!navigator.geolocation) {
        window.showToast(dict.gps_not_supported || "جهازك لا يدعم تحديد الموقع ❌");
        return;
    }

    const statusText = document.getElementById('gps-status-text');
    statusText.innerText = dict.gps_connecting || "جاري الاتصال بالأقمار الصناعية بدقة عالية (انتظر قليلاً)... 🛰️";
    statusText.style.color = "var(--blue)";

    navigator.geolocation.getCurrentPosition(
        (position) => {
            // حفظ الأرقام في الحقول المخفية
            document.getElementById('edit-pro-lat').value = position.coords.latitude;
            document.getElementById('edit-pro-lng').value = position.coords.longitude;
            
            statusText.innerText = dict.gps_success || "تم التقاط إحداثياتك بدقة ممتازة! ✅";
            statusText.style.color = "var(--green)";
            window.showToast(dict.gps_excellent || "موقع ممتاز! اضغط حفظ التغييرات الآن.");
        },
        (error) => {
            console.error(error);
            statusText.innerText = dict.gps_failed || "فشل الالتقاط. يرجى تفعيل الـ GPS في هاتفك.";
            statusText.style.color = "var(--red)";
        },
        // 🟢 إجبار الهاتف على جلب الموقع الدقيق (High Accuracy) وعدم استخدام موقع قديم
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
};

// ============================================================================
// 💾 2. دالة حفظ البروفايل (المدمجة مع حقولك الأصلية)
// ============================================================================
window.saveProfile = async function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const user = firebase.auth().currentUser;
    if (!user) return;

    // جلب القيم من الاستمارة الأصلية الخاصة بك
    const name = document.getElementById('edit-name').value.trim();
    const specialty = document.getElementById('edit-specialty').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const insta = document.getElementById('edit-insta').value.trim();
    const phone = document.getElementById('edit-phone').value.trim();
    const hours = document.getElementById('edit-working-hours').value.trim();
    const locationText = document.getElementById('edit-location').value.trim();
    
    // جلب الإحداثيات المخفية
    const latStr = document.getElementById('edit-pro-lat').value;
    const lngStr = document.getElementById('edit-pro-lng').value;

    if (!name) return window.showToast(dict.name_required || "الاسم مطلوب ⚠️");

    // تجميع كل البيانات في حقيبة واحدة
    let updateData = {
        name: name,
        specialty: specialty,
        bio: bio,
        instaLink: insta,
        phone: phone,
        workingHours: hours,
        locationLink: locationText
    };

    // إذا التقط الطبيب موقعه بنجاح، نضيف الإحداثيات للحقيبة
    if (latStr && lngStr) {
        updateData.latitude = parseFloat(latStr);
        updateData.longitude = parseFloat(lngStr);
    }

    try {
        window.showToast(dict.saving_changes || "جاري حفظ التغييرات... ⏳");
        
        // التحديث الشامل في قاعدة البيانات
        await firebase.firestore().collection('users').doc(user.uid).update(updateData);
        
        window.showToast(dict.profile_updated || "تم تحديث ملفك المهني بنجاح! 🎉");
        document.getElementById('editProfileModal').style.display = 'none';
        
        // 🚨 السطر السحري: اطلب من دالة العرض أن تجلب البيانات الجديدة وتطبعها فوراً! 🚨
        if(typeof fetchProfileData === 'function') {
            fetchProfileData(user.uid);
        }
        
    } catch (error) {
        console.error("خطأ:", error);
        window.showToast(dict.error_saving || "حدث خطأ أثناء الحفظ ❌");
    }
};



// ============================================================================
// 🌙 1. دالة تفعيل/إلغاء المناوبة الليلية (Bulletproof)
// ============================================================================
window.toggleNightDuty = async function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const user = firebase.auth().currentUser;
    if(!user) return;

    const btn = document.getElementById('night-duty-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<ion-icon name="sync" style="animation: spin 1s linear infinite;"></ion-icon>';

    try {
        const docRef = firebase.firestore().collection('users').doc(user.uid);
        
        // 1. قراءة الحالة الحقيقية من السحابة الآن
        const doc = await docRef.get();
        let currentState = false;
        if (doc.exists && doc.data().isNightDuty === true) {
            currentState = true;
        }

        // 2. عكس الحالة (إذا كانت true تصبح false والعكس)
        const newState = !currentState;

        // 3. إرسال الحالة الجديدة لفايربيس
        await docRef.update({
            isNightDuty: newState
        });

        // 4. تحديث شكل الزر فوراً
        if (newState === true) {
            btn.innerHTML = dict.stop_duty || 'إيقاف المناوبة 🛑';
            btn.style.background = 'rgba(255, 75, 43, 0.2)';
            btn.style.borderColor = 'var(--red)';
            btn.style.color = 'var(--red)';
            window.showToast(dict.duty_activated || "أنت الآن في وضع المناوبة! يراك المرضى في الخريطة 🌙");
        } else {
            btn.innerHTML = dict.start_duty || 'تفعيل المناوبة ✅';
            btn.style.background = 'var(--card-bg)';
            btn.style.borderColor = 'var(--border-color)';
            btn.style.color = 'white';
            window.showToast(dict.duty_deactivated || "تم إيقاف المناوبة. لقد اختفيت من خريطة المرضى 🚫");
        }
    } catch(error) {
        console.error(error);
        window.showToast(dict.error_switching || "حدث خطأ أثناء التبديل ❌");
        btn.innerHTML = dict.try_again || 'حاول مجدداً';
    }
};

// ============================================================================
// 📡 2. دالة استماع الصيدلي لطلبات الأدوية
// ============================================================================
window.listenToMedicineRequests = function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const listDiv = document.getElementById('pharmacist-med-requests');
    if(!listDiv) return;

    // استماع مباشر (Real-time) للطلبات التي حالتها 'searching'
    firebase.firestore().collection('medicine_requests')
        .where('status', '==', 'searching')
        .orderBy('timestamp', 'desc')
        .onSnapshot(snap => {
            listDiv.innerHTML = '';
            if (snap.empty) {
                listDiv.innerHTML = `<p style="color:var(--text-sub); font-size:13px; text-align:center;">${dict.no_med_reqs || 'لا يوجد مرضى يبحثون عن أدوية في الوقت الحالي.'}</p>`;
                return;
            }

            snap.forEach(doc => {
                const req = doc.data();
                const reqId = doc.id;
                
                listDiv.innerHTML += `
                    <div style="background: rgba(183, 148, 244, 0.1); border: 1px dashed var(--purple); padding: 15px; border-radius: 12px;">
                        <h4 style="margin: 0 0 5px 0; color: white; font-size: 15px;">💊 ${dict.patient_looking_for || 'المريض يبحث عن:'} <span style="color:var(--purple);">${req.medName}</span></h4>
                        <p style="margin: 0 0 10px 0; font-size: 11px; color: #aaa;">${dict.is_med_available || 'هل هذا الدواء متوفر في صيدليتك الآن؟'}</p>
                        
                        <button class="hm-btn" style="background: var(--green); color: black; margin: 0; padding: 10px; font-size: 13px;" onclick="window.iHaveThisMed('${reqId}', '${req.medName?.replace(/'/g, "\\'")}')">
                            <ion-icon name="checkmark-circle"></ion-icon> ${dict.yes_available || 'نعم، متوفر عندي'}
                        </button>
                    </div>
                `;
            });
        });
};

// ============================================================================
// ✅ دالة إخبار المريض بأن الدواء متوفر (تصميم VIP للصيدلي)
// ============================================================================
window.iHaveThisMed = async function(reqId, medName) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const user = firebase.auth().currentUser;
    if(!user) return;

    // 1. بناء نافذة التأكيد الزجاجية (Glassmorphism) برمجياً
    const overlay = document.createElement('div');
    overlay.id = "vip-confirm-overlay";
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(10px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";

    overlay.innerHTML = `
        <div style="background: linear-gradient(145deg, var(--card-bg), #2a2a40); border: 1px solid var(--purple); border-radius: 25px; padding: 30px; width: 90%; max-width: 400px; text-align: center; box-shadow: 0 20px 50px rgba(183,148,244,0.3); transform: translateY(50px); transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);" id="vip-confirm-box">
            
            <ion-icon name="checkmark-circle" style="font-size: 70px; color: var(--green); margin-bottom: 15px; filter: drop-shadow(0 0 15px rgba(66,230,149,0.5));"></ion-icon>
            
            <h3 style="color: white; margin: 0 0 10px 0; font-family: 'Cairo'; font-size: 20px;">${dict.confirm_med_avail || 'تأكيد توفر الدواء 💊'}</h3>
            <p style="color: var(--text-sub); font-size: 14px; margin-bottom: 25px; line-height: 1.6;">${(dict.are_you_sure_med || `هل أنت متأكد أن دواء <b style="color:var(--purple); font-size:16px;">({med})</b> متوفر لديك الآن؟<br>سيتم إرسال موقع صيدليتك للمريض فوراً للقدوم.`).replace('{med}', medName)}</p>
            
            <div style="display: flex; gap: 15px;">
                <button id="btn-vip-yes" style="flex: 2; background: var(--green); color: black; border: none; padding: 12px; border-radius: 15px; font-family: 'Cairo'; font-weight: bold; cursor: pointer; font-size: 15px; display:flex; justify-content:center; align-items:center; gap:5px;">
                    <ion-icon name="send"></ion-icon> ${dict.yes_available_btn || 'نعم، متوفر'}
                </button>
                <button id="btn-vip-no" style="flex: 1; background: transparent; color: var(--red); border: 1px solid var(--red); padding: 12px; border-radius: 15px; font-family: 'Cairo'; font-weight: bold; cursor: pointer;">${dict.btn_cancel || 'إلغاء'}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // 2. أنيميشن الدخول السلس
    setTimeout(() => {
        overlay.style.opacity = "1";
        document.getElementById('vip-confirm-box').style.transform = "translateY(0)";
    }, 10);

    // 3. برمجة زر "إلغاء"
    document.getElementById('btn-vip-no').onclick = () => {
        overlay.style.opacity = "0";
        setTimeout(() => overlay.remove(), 300);
    };

   // 4. برمجة زر "نعم، متوفر" (هنا يحدث السحر والاتصال بفايربيس)
    document.getElementById('btn-vip-yes').onclick = async () => {
        const btn = document.getElementById('btn-vip-yes');
        btn.innerHTML = `<ion-icon name="sync" style="animation: spin 1s linear infinite;"></ion-icon> ${dict.sending || 'جاري الإرسال...'}`;
        btn.style.opacity = "0.8";

        try {
            // جلب بيانات الصيدلية من الفايربيس (الاسم + الإحداثيات)
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            const pData = doc.exists ? doc.data() : {};
            const pharmName = pData.name || (dict.unknown_pharmacy || "صيدلية غير معروفة");
            
            // 🚨 السطران الجديدان: سحب إحداثيات الصيدلي 🚨
            const lat = pData.latitude || 0;
            const lng = pData.longitude || 0;

            // تحديث حالة الطلب وإرفاق موقع الصيدلية لكي يطير إليه المريض بالخريطة!
            await firebase.firestore().collection('medicine_requests').doc(reqId).update({
                status: 'found',
                foundAtInfo: `${dict.pharmacy_prefix || 'صيدلية'} ${pharmName}`,
                foundLat: lat, // 📍 إرسال خط العرض
                foundLng: lng  // 📍 إرسال خط الطول
            });

            // 5. أنيميشن النجاح (احتفال صغير للصيدلي)
            document.getElementById('vip-confirm-box').innerHTML = `
                <ion-icon name="rocket" style="font-size: 80px; color: var(--purple); animation: bounce 1s infinite;"></ion-icon>
                <h2 style="color: white; margin-top: 20px; font-family: 'Cairo';">${dict.noti_sent_rocket || 'تم إرسال الإشعار! 🚀'}</h2>
                <p style="color: var(--green); font-size: 14px;">${dict.patient_on_way || 'المريض في طريقه إليك الآن.'}</p>
            `;

            // إخفاء النافذة بعد ثانيتين
            setTimeout(() => {
                overlay.style.opacity = "0";
                setTimeout(() => overlay.remove(), 300);
            }, 2500);

        } catch(error) {
            console.error(error);
            btn.innerHTML = `${dict.error_occurred || 'حدث خطأ'} ❌`;
            btn.style.background = "var(--red)";
            btn.style.color = "white";
        }
    };
};

// ⚡ تشغيل رادار الصيدلي بمجرد فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    // ننتظر قليلاً حتى يتعرف الفايربيس على المستخدم
    setTimeout(() => {
        if(window.listenToMedicineRequests) window.listenToMedicineRequests();
    }, 1500);
});

// ============================================================================
// 🚀 دالة التوجيه الذكي من البروفايل إلى الشات (Smart Chat Router)
// ============================================================================
window.openChatFromProfile = async function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const myUid = window.auth.currentUser.uid;
    const targetUid = currentViewedId; // الـ ID الخاص بصاحب البروفايل

    if (myUid === targetUid) return; // لا يمكنك مراسلة نفسك!

    window.showToast(dict.opening_secure_room || "جاري فتح الغرفة الآمنة... ⏳");

    try {
        // 1. جلب بياناتي وبياناته لتحديد نوع الغرفة
        const myDoc = await window.db.collection("users").doc(myUid).get();
        const targetDoc = await window.db.collection("users").doc(targetUid).get();

        if (!targetDoc.exists) return window.showToast(dict.user_not_found || "المستخدم غير موجود ❌");

        const myRole = myDoc.data().role || 'patient';
        const targetData = targetDoc.data();
        const targetRole = targetData.role || 'patient';
        const targetName = targetData.name || (dict.default_user || "مستخدم");
        const targetImg = targetData.photoURL || 'assets/img/profile.png';

        // 2. صناعة ID الغرفة الموحد (الرقم الأصغر أولاً لكي يكون ثابتاً دائماً)
        const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;

        // 3. تجهيز الغرفة في قاعدة البيانات إذا كانت هذه أول محادثة بينكما!
        const chatRef = window.db.collection("chats").doc(chatId);
        const chatSnap = await chatRef.get();
        
        if (!chatSnap.exists) {
            await chatRef.set({
                participants: [myUid, targetUid],
                usersData: {
                    [myUid]: { name: myDoc.data().name || (dict.me || "أنا"), role: myRole, photoURL: myDoc.data().photoURL || "" },
                    [targetUid]: { name: targetName, role: targetRole, photoURL: targetImg }
                },
                lastMessage: dict.start_new_chat || "بدء محادثة جديدة...",
                lastMessageTime: Date.now(),
                medicalAccess: false
            });
        }

        // 4. إغلاق شاشة البروفايل لكي لا تظل عالقة في الخلفية
        window.closeSPA('profileSlidePage');

        // ================= 5. التوجيه الذكي حسب الرتبة =================
        
        const myRoleIsMedical = (myRole === 'doctor' || myRole === 'pharmacist');
        const targetRoleIsMedical = (targetRole === 'doctor' || targetRole === 'pharmacist');

        if (myRoleIsMedical && targetRoleIsMedical) {
            // 🤝 طبيب/صيدلي يراسل طبيب/صيدلي --> (غرفة الزملاء)
            const roleLabel = targetRole === 'pharmacist' ? (dict.pharmacist || 'صيدلي') : (dict.doctor || 'طبيب');
            if (window.PeerChatSystem) {
                window.PeerChatSystem.openRoom(targetUid, targetName, targetImg, chatId, roleLabel);
            }
        } 
        else if (myRole === 'doctor' && targetRole === 'patient') {
            // 🩺 طبيب يراسل مريض --> (غرفة استشارات المرضى مع زر الملف السحابي)
            if (window.DoctorPatientChatSystem) {
                window.DoctorPatientChatSystem.openRoom(targetUid, targetName, targetImg, chatId);
            }
        } 
        else {
            // 👤 مريض يراسل طبيب أو مريض يراسل مريض --> (الغرفة العادية للمرضى)
            if (typeof window.openPrivateChat === 'function') {
                window.openPrivateChat(targetUid, targetName, targetImg);
            } else {
                window.showToast(dict.patient_engine_offline || "عذراً، محرك المريض غير متصل حالياً ⚠️");
            }
        }

    } catch(error) {
        console.error("Error routing to chat:", error);
        window.showToast(dict.error_opening_chat || "حدث خطأ أثناء محاولة فتح المحادثة ❌");
    }
};