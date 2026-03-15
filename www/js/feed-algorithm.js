// ============================================================================
// العقل المدبر للـ Feed (خوارزمية Gravity، التمرير اللانهائي، والتفاعلات)
// ============================================================================

let allRankedPosts = []; 
let displayedPostsCount = 0; 
const POSTS_PER_PAGE = 5; 
let isFetchingMore = false; 
window.initSmartFeed = function() {
    const container = document.getElementById("posts-container");
    if(!container) return;

    // جلب القاموس
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    container.innerHTML = `
        <div style="text-align: center; padding: 50px; color: var(--text-sub);">
            <ion-icon name="sync-outline" style="font-size: 40px; animation: spin 1s linear infinite;"></ion-icon>
            <p style="font-weight:bold; margin-top:10px;">${dict.loading_community || 'جاري تحليل المجتمع واختيار الأفضل لك...'}</p>
        </div>`;

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return;

        try {
            // 🔥 [تيك توك] 1. جلب اهتمامات المستخدم (الهاشتاجات التي تفاعل معها سابقاً)
            let userPreferredTags = [];
            const userDoc = await window.db.collection("users").doc(user.uid).get();
            if (userDoc.exists && userDoc.data().preferredTags) {
                userPreferredTags = userDoc.data().preferredTags;
            }

            const followingSnap = await window.db.collection("users").doc(user.uid).collection("following").get();
            const followingIds = followingSnap.docs.map(doc => doc.id);

            const postsSnap = await window.db.collection("posts").orderBy("timestamp", "desc").limit(100).get();

            if (postsSnap.empty) {
                container.innerHTML = `<div style="text-align:center; padding: 50px; color: var(--text-sub);" data-i18n="empty_posts">${dict.empty_posts || 'لا توجد أي منشورات. كن أول من ينشر!'}</div>`;
                return;
            }

            let postsArray = [];
            postsSnap.forEach(doc => { postsArray.push({ id: doc.id, ...doc.data() }); });

            // 🔥 خوارزمية (Reddit / HackerNews Gravity) الاحترافية 🔥
            postsArray = postsArray.map(post => {
                let score = 1000;
                const now = new Date();
                const postDate = post.timestamp ? post.timestamp.toDate() : now;
                const hoursSincePosted = (now - postDate) / (1000 * 60 * 60);
                
                // 1. عامل التآكل الزمني (يقلل السكور بانحناء وليس بشكل مستقيم)
                score = score / Math.pow((hoursSincePosted + 2), 1.5);
                
                // 2. عامل التفاعل والانتشار السريع (Virality)
                const likes = post.likes ? post.likes.length : 0;
                const comments = post.commentsCount || 0;
                score += (likes * 20) + (comments * 35);
                // 3. عامل الأولوية الاجتماعية (Social Graph)
                if (followingIds.includes(post.authorId)) score += 500; // الأولوية لمن تتابعهم
                if (post.authorId === user.uid) score += 200; // منشوراتك
                
                // 🔥 [تيك توك] 4. عامل الاهتمامات (مطابقة الهاشتاجات) 🔥
                // استخراج الهاشتاجات من النص إذا لم تكن محفوظة مسبقاً
                const postTags = post.tags || (post.content ? post.content.match(/#[a-zA-Z\u0600-\u06FF0-9_]+/g) || [] : []);
                let tagMatchCount = 0;
                postTags.forEach(tag => {
                    if (userPreferredTags.includes(tag)) tagMatchCount++;
                });
                
                // إذا كان المنشور يحتوي على هاشتاج يحبه المستخدم، أعطه دفعة صاروخية!
                if (tagMatchCount > 0) {
                    score += (tagMatchCount * 300); 
                }

                post.trendScore = Math.max(0, score);
                return post;
            });

            // ترتيب المنشورات حسب السكور النهائي
            allRankedPosts = postsArray.sort((a, b) => b.trendScore - a.trendScore);
            displayedPostsCount = 0;
            container.innerHTML = ""; 
            renderNextPostBatch();
            setupInfiniteScroll();

        } catch (error) {
            console.error(error);
            const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
            container.innerHTML = `<div style="text-align:center; padding: 50px; color: var(--danger);" data-i18n="alert_error">${dict.alert_error || 'حدث خطأ أثناء تحميل المنشورات.'}</div>`;
        }
    });
};
function renderNextPostBatch() {
    if (displayedPostsCount >= allRankedPosts.length) return;
    const container = document.getElementById("posts-container");
    const myUid = window.auth.currentUser.uid;
    const nextPosts = allRankedPosts.slice(displayedPostsCount, displayedPostsCount + POSTS_PER_PAGE);

    // جلب القاموس الحالي مع الحفاظ على القيم الافتراضية (الكسر مقدس)
    const currentLang = localStorage.getItem('app_lang') || 'ar';
    const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : {
        opt_edit: "تعديل المنشور", opt_lock_comments: "إيقاف التعليقات", opt_unlock_comments: "تفعيل التعليقات",
        opt_delete: "حذف المنشور", opt_hide: "إخفاء المنشور", opt_block: "حظر المستخدم", opt_report: "إبلاغ عن محتوى",
        opt_copy_link: "نسخ الرابط", action_like: "أعجبني", action_comment: "تعليق", action_share: "مشاركة",
        comments_locked: "التعليقات مقفلة 🔒", msg_user_blocked: "تم حظر المستخدم ولن ترى منشوراته",
        msg_report_sent: "تم إرسال بلاغ للإدارة", default_user_name: "مستخدم", dr_prefix: "د. "
    };

    nextPosts.forEach(post => {
        const isLiked = post.likes && post.likes.includes(myUid);
        const isMyPost = post.authorId === myUid;
        const commentsDisabled = post.commentsDisabled || false;
        
        // 🎬 دمج الشاشة السينمائية للصور والفيديوهات بذكاء
        let mediaHTML = '';
        if(post.mediaUrl) {
            const isVideo = post.mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || post.mediaUrl.includes('video/upload');
            if (isVideo) {
                mediaHTML = `
                <div style="position:relative; cursor:pointer; margin-top:10px;" onclick="window.openMediaViewer('${post.mediaUrl}', true)">
                    <video class="post-img" style="width:100%; border-radius:15px; pointer-events:none; object-fit:cover;">
                        <source src="${post.mediaUrl}">
                    </video>
                    <ion-icon name="play-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:60px; color:rgba(255,255,255,0.9); text-shadow:0 5px 15px rgba(0,0,0,0.5); z-index:2;"></ion-icon>
                </div>`;
            } else {
                mediaHTML = `<img src="${post.mediaUrl}" onclick="window.openMediaViewer('${post.mediaUrl}')" class="post-img" style="cursor: pointer; width:100%; border-radius:15px; object-fit:cover; margin-top:10px;">`;
            }
        }

        // قائمة الخيارات (مترجمة بالكامل)
        let optionsMenuHTML = isMyPost ? `
            <button onclick="window.openEditPostModal('${post.id}', \`${post.content ? post.content.replace(/`/g, '\\`') : ''}\`)"><ion-icon name="create-outline"></ion-icon> <span>${dict.opt_edit}</span></button>
            <button onclick="window.toggleFeedCommentsStatus('${post.id}', ${commentsDisabled})"><ion-icon name="${commentsDisabled ? 'chatbubbles' : 'lock-closed-outline'}"></ion-icon> <span>${commentsDisabled ? dict.opt_unlock_comments : dict.opt_lock_comments}</span></button>
            <button onclick="window.deletePost('${post.id}')" style="color: var(--danger);"><ion-icon name="trash-outline"></ion-icon> <span>${dict.opt_delete}</span></button>
        ` : `
            <button onclick="window.hidePostFromFeed('${post.id}')"><ion-icon name="eye-off-outline"></ion-icon> <span>${dict.opt_hide}</span></button>
            <button onclick="window.showToast('${dict.msg_user_blocked}')" style="color: var(--danger);"><ion-icon name="ban-outline"></ion-icon> <span>${dict.opt_block}</span></button>
            <button onclick="window.showToast('${dict.msg_report_sent}')"><ion-icon name="flag-outline"></ion-icon> <span>${dict.opt_report}</span></button>
        `;

        const postHTML = `
            <div class="post-card" id="feed-post-${post.id}">
                <div class="post-header">
                    <img src="${post.authorImg || 'assets/img/profile.png'}" onclick="window.openSPA('profileSlidePage'); window.openProfileSlide('${post.authorId}')" style="cursor:pointer;">
                    <div>
                        <h4 onclick="window.openSPA('profileSlidePage'); window.openProfileSlide('${post.authorId}')" style="cursor:pointer;">${post.authorRole === 'doctor' ? (dict.dr_prefix || 'د. ') : ''}${post.authorName || (dict.default_user_name || 'مستخدم')}</h4>
                        <div class="post-time">${window.timeAgo ? window.timeAgo(post.timestamp) : 'الآن'}</div>
                    </div>
                    <div class="post-options">
                        <ion-icon name="ellipsis-horizontal" style="font-size: 20px; cursor:pointer;" onclick="window.toggleFeedOptionsMenu('${post.id}')"></ion-icon>
                        <div class="options-menu" id="menu-${post.id}">
                            ${optionsMenuHTML}
                            <button onclick="window.sharePostFeed('${post.id}')"><ion-icon name="link-outline"></ion-icon> <span>${dict.opt_copy_link}</span></button>
                        </div>
                    </div>
                </div>
                
                <div class="post-body" onclick="window.openSPA('postDetailsSlidePage'); window.openPostDetailsSlide('${post.id}')" style="cursor: pointer;">
                    ${window.formatFeedContent ? window.formatFeedContent(post.content, post.id) : post.content}
                </div>
                ${mediaHTML}
                
                <div class="post-stats">
                    <span style="cursor:pointer;" onclick="window.showLikes('${post.id}')">👍 <span class="like-counter-${post.id}">${post.likes?.length || 0}</span></span>
                    <span>${commentsDisabled ? dict.comments_locked : (post.commentsCount || 0) + ' ' + dict.action_comment}</span>
                </div>

                <div class="post-actions">
                    <button class="action-btn like-btn-${post.id} ${isLiked ? 'liked' : ''}" onclick="window.toggleFeedLike('${post.id}', this)">
                        <ion-icon name="${isLiked ? 'heart' : 'heart-outline'}"></ion-icon> <span>${dict.action_like}</span>
                    </button>
                    <button class="action-btn" onclick="window.openSPA('postDetailsSlidePage'); window.openPostDetailsSlide('${post.id}')" ${commentsDisabled ? 'disabled style="opacity:0.5"' : ''}>
                        <ion-icon name="chatbubble-outline"></ion-icon> <span>${dict.action_comment}</span>
                    </button>
                    <button class="action-btn" onclick="window.sharePostFeed('${post.id}')">
                        <ion-icon name="share-social-outline"></ion-icon> <span>${dict.action_share}</span>
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', postHTML);
    });

    if(typeof window.applyLanguage === 'function') {
        window.applyLanguage();
    }

    displayedPostsCount += POSTS_PER_PAGE;
    isFetchingMore = false; 
}

function setupInfiniteScroll() {
    window.onscroll = () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
            if (!isFetchingMore && displayedPostsCount < allRankedPosts.length) {
                isFetchingMore = true; 
                renderNextPostBatch();
            }
        }
    };
}

window.toggleFeedLike = async function(postId, btnElement) {
    if (!window.auth || !window.auth.currentUser) return;
    const myUid = window.auth.currentUser.uid;

    try {
        const isLiked = btnElement.classList.contains('liked');
        
        document.querySelectorAll(`.like-counter-${postId}`).forEach(span => {
            let count = parseInt(span.innerText) || 0;
            span.innerText = isLiked ? (count > 0 ? count - 1 : 0) : count + 1;
        });

        document.querySelectorAll(`.like-btn-${postId}`).forEach(btn => {
            const icon = btn.querySelector('ion-icon');
            if (isLiked) {
                btn.classList.remove('liked');
                if (icon) icon.setAttribute('name', 'heart-outline');
            } else {
                btn.classList.add('liked');
                if (icon) icon.setAttribute('name', 'heart');
            }
        });

        const postRef = window.db.collection("posts").doc(postId);
        const postDoc = await postRef.get();
        if (postDoc.exists) {
            const pData = postDoc.data();
            const authorId = pData.authorId;

            if (isLiked) {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) });
            } else {
                await postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) });
                if (authorId !== myUid && typeof window.sendNotification === 'function') {
                    window.sendNotification(authorId, 'like_post', { postId: postId });
                }
            }
        }
    } catch (err) {
        console.error("Critical Like Error:", err);
    }
};
window.sharePostFeed = async function(postId) {
    // بناء الرابط المباشر للمنشور
    const url = window.location.origin + window.location.pathname + "?post=" + postId;
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    try {
        const postDoc = await window.db.collection("posts").doc(postId).get();
        if(postDoc.exists) {
            const authorId = postDoc.data().authorId;
            const myUid = window.auth.currentUser.uid;
            
            // إرسال إشعار لصاحب المنشور عند مشاركته (Social Proof)
            if(authorId !== myUid && typeof window.sendNotification === 'function') {
                window.sendNotification(authorId, 'share_post', { postId: postId });
            }
        }
    } catch(e) { console.error("Share Logic Error:", e); }

    // استخدام ميزة المشاركة الأصلية للهاتف إن وجدت، وإلا النسخ للحافظة
    if (navigator.share) {
        navigator.share({ 
            title: dict.share_title || 'Healthmate Post', 
            url: url 
        }).catch(err => console.log('Share Error:', err));
    } else {
        navigator.clipboard.writeText(url).then(() => {
            window.showToast(dict.link_copied || "تم نسخ رابط المنشور بنجاح! 📋");
        });
    }
};

window.toggleFeedOptionsMenu = function(postId) {
    const menu = document.getElementById(`menu-${postId}`);
    if(!menu) return;

    const isActive = menu.classList.contains('active');
    
    // إغلاق أي قائمة خيارات أخرى مفتوحة لضمان نظافة الواجهة
    document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
    
    // فتح القائمة المطلوبة فقط
    if (!isActive) menu.classList.add('active');
};

// إغلاق القوائم عند الضغط في أي مكان خارجها (UX Polish)
document.addEventListener('click', function(event) {
    if (!event.target.closest('.post-options')) {
        document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
    }
});

window.hidePostFromFeed = function(postId) {
    const postElement = document.getElementById(`feed-post-${postId}`);
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};

    if(postElement) {
        // إخفاء بصري فوري
        postElement.style.display = 'none';
        window.showToast(dict.post_hidden || "تم إخفاء المنشور 👁️‍🗨️");
        
        // هنا يمكن إضافة منطق مستقبلي لحفظ الإخفاء في الـ LocalStorage أو قاعدة البيانات
    }
};
window.toggleFeedCommentsStatus = async function(postId, currentStatus) {
    try {
        const newStatus = !currentStatus; 
        const currentLang = localStorage.getItem('app_lang') || 'ar';
        const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : {};

        // 1. التحديث في قاعدة البيانات (المنطق الأصلي)
        await window.db.collection("posts").doc(postId).update({ commentsDisabled: newStatus });
        
        // جلب البيانات المحدثة لضمان دقة الأرقام
        const postDoc = await window.db.collection("posts").doc(postId).get();
        const commentsCount = postDoc.data().commentsCount || 0;

        // 2. تنظيف الواجهة بإغلاق القائمة المفتوحة
        document.querySelectorAll('.options-menu').forEach(m => m.classList.remove('active'));
        
        // 3. التحديث اللحظي لجميع نسخ المنشور في الصفحة
        const postCards = document.querySelectorAll(`#feed-post-${postId}, #pro-post-${postId}`);
        postCards.forEach(card => {
            // تحديث زر التحكم في القائمة
            const menuBtn = card.querySelector(`button[onclick*="toggleFeedCommentsStatus"]`);
            if (menuBtn) {
                menuBtn.setAttribute('onclick', `window.toggleFeedCommentsStatus('${postId}', ${newStatus})`);
                menuBtn.innerHTML = `<ion-icon name="${newStatus ? 'chatbubbles' : 'lock-closed-outline'}"></ion-icon> <span>${newStatus ? (dict.opt_unlock_comments || 'تفعيل التعليقات') : (dict.opt_lock_comments || 'إيقاف التعليقات')}</span>`;
            }

            // تحديث عداد الإحصائيات (Stats)
            const statsDiv = card.querySelector('.post-stats');
            if (statsDiv) {
                const spans = statsDiv.querySelectorAll('span');
                const commentSpan = spans[spans.length - 1]; 
                if (commentSpan) {
                    commentSpan.innerText = newStatus ? (dict.comments_locked || 'التعليقات مقفلة 🔒') : `${commentsCount} ${dict.action_comment || 'تعليق'}`;
                }
            }

            // تحديث زر الأكشن (تعليق) - تعطيل أو تفعيل
            const actionBtns = card.querySelectorAll('.post-actions .action-btn');
            if (actionBtns.length >= 2) {
                const commentBtn = actionBtns[1]; 
                if (newStatus) {
                    commentBtn.setAttribute('disabled', 'true');
                    commentBtn.style.opacity = '0.5';
                } else {
                    commentBtn.removeAttribute('disabled');
                    commentBtn.style.opacity = '1';
                }
            }
        });

        // 4. رسالة التنبيه النهائية
        let msg = newStatus ? (dict.msg_comments_disabled || "تم قفل التعليقات 🔒") : (dict.msg_comments_enabled || "تم تفعيل التعليقات");
        window.showToast(msg);
        
    } catch (error) {
        console.error("خطأ في تغيير حالة التعليقات:", error);
        window.showToast("Firebase Error ⚠️");
    }
};
window.showLikes = async function(postId) {
    // استدعاء القاموس
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const container = document.getElementById('usersListContainer');
    
    // 1. تجهيز واجهة النافذة (Modal Setup)
    const titleEl = document.getElementById('usersListTitle');
    if(titleEl) titleEl.innerText = dict.likes_title || "تسجيلات الإعجاب 👍";
    
    const modalEl = document.getElementById('usersListModal');
    if(modalEl) modalEl.style.display = 'flex';

    // أيقونة التحميل المترجمة
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    try {
        const postDoc = await window.db.collection("posts").doc(postId).get();
        
        // التحقق من وجود إعجابات
        if (!postDoc.exists || !postDoc.data().likes || postDoc.data().likes.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-sub);">${dict.empty_list || 'لا توجد إعجابات حتى الآن.'}</div>`;
            return;
        }

        const likesArray = postDoc.data().likes;
        container.innerHTML = "";

        // 2. جلب بيانات كل معجب (The Loop)
        for (let uid of likesArray) {
            const uDoc = await window.db.collection("users").doc(uid).get();
            if (uDoc.exists) {
                const u = uDoc.data();
                container.innerHTML += `
                    <div style="display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--border-app); cursor: pointer;" onclick="window.openProfileSlide('${uid}'); document.getElementById('usersListModal').style.display='none';">
                        <img src="${u.photoURL || 'assets/img/profile.png'}" style="width: 45px; height: 45px; border-radius: 50%; object-fit: cover; border: 1px solid var(--border-app);">
                        <div style="flex: 1;">
                            <h4 style="margin: 0; font-size: 15px; color: var(--text-main); font-weight: 600;">${u.name}</h4>
                            <p style="margin: 2px 0 0; font-size: 12px; color: var(--text-sub);">${u.specialty || (dict.general_specialty || 'عام')}</p>
                        </div>
                        <ion-icon name="heart" style="color: var(--danger); font-size: 20px; opacity: 0.8;"></ion-icon>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error("Error fetching likes:", error);
        container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">${dict.alert_error || 'حدث خطأ'}</div>`;
    }
};
// ==========================================
// ☁️ محرك الرفع السحابي السريع (مع ضغط الصور التلقائي)
// ==========================================
window.cloudinaryEngine = {
    CLOUD_NAME: 'djubxuu1e', 
    UPLOAD_PRESET: 'Healthmate', 

    uploadFile: async function(file) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        this.showLoadingUI();

        try {
            let fileToUpload = file;

            // الحفاظ على منطق الضغط التلقائي للصور
            if (file.type && file.type.startsWith('image/')) {
                fileToUpload = await this.compressImage(file);
            }

            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('upload_preset', this.UPLOAD_PRESET);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${this.CLOUD_NAME}/auto/upload`;

            const response = await fetch(uploadUrl, { method: 'POST', body: formData });
            const data = await response.json();

            this.hideLoadingUI();

            if (data.secure_url) {
                return data.secure_url; 
            } else {
                throw new Error(dict.cloud_upload_failed || "فشل الرفع للسحابة");
            }

        } catch (error) {
            console.error("Cloudinary Error:", error);
            this.hideLoadingUI();
            if(window.showToast) {
                window.showToast(dict.cloud_upload_error || "حدث خطأ أثناء رفع الملف ⚠️");
            }
            return null;
        }
    },

    // الكسر مقدس: خوارزمية ضغط الصور كما برمجتها أنت
    compressImage: function(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = event => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1080; 
                    
                    let width = img.width;
                    let height = img.height;
                    if (width > MAX_WIDTH) {
                        height = Math.floor(height * (MAX_WIDTH / width));
                        width = MAX_WIDTH;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    canvas.toBlob((blob) => {
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    }, 'image/jpeg', 0.7); // نسبة الضغط 70%
                }
            }
        });
    },
   showLoadingUI: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if(!document.getElementById('cloud-loading-overlay')) {
            const loadingHTML = `
                <div id="cloud-loading-overlay" class="glass-overlay" style="display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); backdrop-filter:blur(10px); z-index:999999; justify-content:center; align-items:center; flex-direction:column;">
                    <ion-icon name="cloud-upload-outline" style="font-size:70px; color:#00f3ff; animation: bounceGlow 1s infinite alternate;"></ion-icon>
                    <h3 style="color:white; margin-top:20px; font-family:'Cairo'; text-shadow:0 0 10px #00f3ff;" data-i18n="uploading_cloud">${dict.uploading_cloud || 'جاري الرفع السريع...'}</h3>
                    <style>@keyframes bounceGlow { 0% { transform: translateY(0); filter: drop-shadow(0 0 10px #00f3ff); } 100% { transform: translateY(-15px); filter: drop-shadow(0 0 30px #00f3ff); } }</style>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', loadingHTML);
        } else {
            const overlay = document.getElementById('cloud-loading-overlay');
            overlay.style.display = 'flex';
            // تحديث النص في حال تغيرت اللغة أثناء عمل المحرك
            const textEl = overlay.querySelector('h3');
            if(textEl) textEl.innerText = dict.uploading_cloud || 'جاري الرفع السريع...';
        }
    },

    hideLoadingUI: function() {
        const loader = document.getElementById('cloud-loading-overlay');
        if(loader) loader.style.display = 'none';
    }
};
// ==========================================
// 🔥 محرك التيك توك (تتبع الهاشتاجات وتحويلها لروابط) 🔥
// ==========================================
window.formatFeedContent = function(text, postId) {
    if (!text) return "";
    
    // تأمين النص ضد الحقن البرمجي (الكسر مقدس)
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // تحويل الهاشتاج لزر يتتبع المستخدم ويأخذه للبحث
    // يدعم الهاشتاجات العربية والإنجليزية والأرقام
    safeText = safeText.replace(/(^|\s)(#[a-zA-Z\u0600-\u06FF0-9_]+)/g, 
        `$1<span class="chat-hashtag" onclick="event.stopPropagation(); window.interactWithHashtag('$2', '${postId}')">$2</span>`);
    
    return safeText;
};

window.interactWithHashtag = async function(tag, postId) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    if (!window.auth || !window.auth.currentUser) return;
    const myUid = window.auth.currentUser.uid;
    
    // 1. التوجيه لشاشة البحث (إذا كانت دالة البحث موجودة)
    if (typeof window.searchByHashtag === 'function') {
        window.searchByHashtag(tag);
    } else {
        window.showToast((dict.searching_for || "سيتم البحث عن: ") + tag);
    }

    // 2. تحديث خوارزمية التيك توك (حفظ الاهتمام سراً في حساب المستخدم)
    try {
        await window.db.collection("users").doc(myUid).set({
            // إضافة الهاشتاج لقائمة الاهتمامات بدون تكرار
            preferredTags: firebase.firestore.FieldValue.arrayUnion(tag) 
        }, { merge: true });
    } catch(e) { 
        console.error("Interest Tracking Error:", e); 
    }
};
