// ================= نظام تفاصيل المنشور والتعليقات - حسام PRO =================

let pdCurrentPostId = null;
let pdReplyToId = null; 
let pdPostListener = null;
let pdCommentsListener = null;
let targetScrollCommentId = null; 
let hasScrolledToComment = false; 

// 1. الدالة الرئيسية لفتح النافذة
window.openPostDetailsSlide = async function(postId, targetCommentId = null) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    pdCurrentPostId = postId;
    targetScrollCommentId = targetCommentId; 
    hasScrolledToComment = false; 

    window.cancelReply(); 
    document.getElementById('pd-comment-input').value = ""; 
    
    const myAvatar = window.auth?.currentUser?.photoURL || 'assets/img/profile.png';
    document.getElementById('pd-my-avatar').src = myAvatar;

    window.openSPA('postDetailsSlidePage');

    if (pdPostListener) pdPostListener();
    pdPostListener = window.db.collection("posts").doc(postId).onSnapshot(doc => {
        const container = document.getElementById('pd-post-container');
        if (!doc.exists) {
            container.innerHTML = `<div style="padding: 50px; text-align: center; color: var(--danger);" data-i18n="post_unavailable">${dict.post_unavailable || 'هذا المنشور غير متوفر.'}</div>`;
            if(typeof window.applyLanguage === 'function') window.applyLanguage();
            return;
        }
        renderSinglePost(doc.id, doc.data(), container);
    });

    if (pdCommentsListener) pdCommentsListener();
    pdCommentsListener = window.db.collection("posts").doc(postId).collection("comments")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
            const commentsContainer = document.getElementById('pd-comments-list');
            
            if (snap.empty) {
                commentsContainer.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-sub);" data-i18n="be_first_comment">${dict.be_first_comment || 'كن أول من يعلق! ✨'}</div>`;
                return;
            }

            let topLevelComments = [];
            let replies = [];

            snap.forEach(doc => {
                const c = { id: doc.id, ...doc.data() };
                if (c.parentId) replies.push(c);
                else topLevelComments.push(c);
            });

            commentsContainer.innerHTML = "";
            
            topLevelComments.forEach(comment => {
                commentsContainer.innerHTML += generateCommentHTML(comment, false, null);
                const commentReplies = replies.filter(r => r.parentId === comment.id);
                commentReplies.forEach(reply => {
                    commentsContainer.innerHTML += generateCommentHTML(reply, true, comment.id);
                });
            });

            if (targetScrollCommentId && !hasScrolledToComment) {
                setTimeout(() => {
                    const targetEl = document.getElementById(`comment-${targetScrollCommentId}`);
                    if (targetEl) {
                        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetEl.style.transition = "background-color 0.5s ease";
                        targetEl.style.backgroundColor = "rgba(var(--primary-rgb), 0.2)";
                        setTimeout(() => targetEl.style.backgroundColor = "transparent", 2000);
                        hasScrolledToComment = true; 
                    }
                }, 500); 
            }
        });
};
// 2. دالة رسم المنشور (مع الترجمة ودعم الشاشة السينمائية وعلامة التوثيق والستايل الفخم للأزرار + إصلاح التوجيه للبروفايل 🚀)
function renderSinglePost(pid, p, container) {
    const myUid = window.auth?.currentUser?.uid;
    const isLiked = p.likes && p.likes.includes(myUid);
    const commentsDisabled = p.commentsDisabled || false;
    document.querySelector('.comment-input-bar').style.display = commentsDisabled ? 'none' : 'flex';

    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    const likeColor = isLiked ? 'var(--danger)' : 'var(--text-sub)';
    const likeIcon = isLiked ? 'heart' : 'heart-outline';

    let mediaHTML = '';
    if (p.mediaUrl) {
        const isVideo = p.mediaUrl.match(/\.(mp4|webm|ogg|mov)/i) || p.mediaUrl.includes('video/upload');
        if (isVideo) {
            mediaHTML = `
            <div style="position:relative; cursor:pointer; margin-top:10px;" onclick="window.openMediaViewer('${p.mediaUrl}', true)">
                <video style="width:100%; max-height:400px; background:black; border-radius:15px; pointer-events:none; object-fit:contain;">
                    <source src="${p.mediaUrl}">
                </video>
                <ion-icon name="play-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:60px; color:rgba(255,255,255,0.9); text-shadow:0 5px 15px rgba(0,0,0,0.5); z-index:2;"></ion-icon>
            </div>`;
        } else {
           mediaHTML = `<img src="${p.mediaUrl}" onclick="window.openMediaViewer('${p.mediaUrl}', '${pid}')" style="width:100%; max-height:400px; object-fit:cover; display:block; cursor:pointer; border-radius:15px; margin-top:10px;">`;
        }
    }

    container.innerHTML = `
        <div style="padding: 15px;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
                <img src="${p.authorImg || 'assets/img/profile.png'}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; cursor:pointer; border: 1px solid rgba(255,255,255,0.1);" onclick="window.openProfileSlide('${p.authorId}')">
                <div style="flex:1;">
                    <h4 style="margin:0; font-size:16px; cursor:pointer; display:flex; align-items:center; gap:4px; color:var(--text-main);" onclick="window.openProfileSlide('${p.authorId}')">
                        ${p.authorRole === 'doctor' ? (dict.dr_prefix || 'د. ') : ''}${p.authorName || (dict.default_user_name || 'مستخدم')}
                        <span class="v-badge-${p.authorId}" style="display:none; color:var(--primary); font-size:17px;"><ion-icon name="checkmark-circle"></ion-icon></span>
                    </h4>
                    <small style="color:var(--text-sub); font-size:12px;">${window.timeAgo ? window.timeAgo(p.timestamp) : (dict.time_now || 'الآن')}</small>
                </div>
            </div>
           <div style="font-size:15px; line-height:1.7; margin-bottom:10px; color:var(--text-main); word-wrap:break-word;">${window.formatPostContent ? window.formatPostContent(p.content) : p.content}</div>
        </div>
        ${mediaHTML}
        
        <div style="padding: 10px 15px; border-bottom: 1px solid var(--border-app);">
            <div style="display:flex; justify-content:space-between; color:var(--text-sub); font-size:13px; margin-bottom:15px; padding: 0 5px;">
                <span onclick="window.showLikes('${pid}')" style="cursor:pointer;">👍 <span class="like-counter-${pid}">${p.likes?.length || 0}</span></span>
                <span>${commentsDisabled ? (dict.comments_locked || 'التعليقات مقفلة 🔒') : (p.commentsCount || 0) + ' ' + (dict.action_comment || 'تعليق')}</span>
            </div>
            
            <div style="display: flex; justify-content: space-around; align-items: center; border-top: 1px solid var(--border-app); padding-top: 10px;">
                <button class="action-btn like-btn-${pid}" onclick="window.toggleFeedLike('${pid}', this)" style="background:none; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Cairo'; font-size:15px; color:${likeColor}; cursor:pointer; transition:0.2s; padding: 8px 15px; border-radius:10px; flex:1;">
                    <ion-icon name="${likeIcon}" style="font-size:20px;"></ion-icon> 
                    <span data-i18n="action_like">${dict.action_like || 'أعجبني'}</span>
                </button>
                
                <button onclick="document.getElementById('pd-comment-input').focus()" ${commentsDisabled ? 'disabled style="opacity:0.4; background:none; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:\'Cairo\'; font-size:15px; color:var(--text-sub); flex:1; padding: 8px 15px;"' : 'style="background:none; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:\'Cairo\'; font-size:15px; color:var(--text-sub); cursor:pointer; transition:0.2s; padding: 8px 15px; border-radius:10px; flex:1;"'}>
                    <ion-icon name="chatbubble-outline" style="font-size:20px;"></ion-icon> 
                    <span data-i18n="action_comment">${dict.action_comment || 'تعليق'}</span>
                </button>
                
                <button onclick="window.sharePostFeed('${pid}')" style="background:none; border:none; display:flex; align-items:center; justify-content:center; gap:8px; font-family:'Cairo'; font-size:15px; color:var(--text-sub); cursor:pointer; transition:0.2s; padding: 8px 15px; border-radius:10px; flex:1;">
                    <ion-icon name="share-social-outline" style="font-size:20px;"></ion-icon> 
                    <span data-i18n="action_share">${dict.action_share || 'مشاركة'}</span>
                </button>
            </div>
        </div>
    `;

    window.verifiedUsersCache = window.verifiedUsersCache || {};
    if (window.verifiedUsersCache[p.authorId]) {
        document.querySelectorAll(`.v-badge-${p.authorId}`).forEach(el => el.style.display = 'inline-flex');
    } else {
        window.db.collection("users").doc(p.authorId).get().then(doc => {
            const isVerified = doc.exists && doc.data().isVerified === true;
            window.verifiedUsersCache[p.authorId] = isVerified;
            if (isVerified) {
                document.querySelectorAll(`.v-badge-${p.authorId}`).forEach(el => el.style.display = 'inline-flex');
            }
        }).catch(e => console.log(e));
    }
} 
// 3. تصميم التعليق (دعم الرد على الردود + اللغات)
function generateCommentHTML(c, isReply, parentCommentId) {
    const myUid = window.auth?.currentUser?.uid;
    const isLiked = c.likes && c.likes.includes(myUid);
    const replyStyle = isReply ? "margin-right: 40px; border-right: 2px solid var(--primary); background: rgba(0,0,0,0.02); border-radius: 10px 0 0 10px;" : "border-bottom: 1px solid var(--border-app);";
    const avatarSize = isReply ? "30px" : "40px";
    
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const textLiked = dict.btn_liked || 'أعجبك';
    const textLike = dict.action_like || 'إعجاب';
    const textReply = dict.btn_reply || 'رد';

    // السحر هنا: إذا كان رداً، فإن الآيدي الأب هو parentCommentId، وإلا فهو آيدي التعليق نفسه
    const targetParentId = isReply ? parentCommentId : c.id;

    return `
        <div id="comment-${c.id}" style="padding: 15px 10px; display:flex; gap:10px; ${replyStyle} border-radius: 8px;">
            <img src="${c.authorImg || 'assets/img/profile.png'}" style="width:${avatarSize}; height:${avatarSize}; border-radius:50%; object-fit:cover; cursor:pointer;" onclick="window.openProfileSlide('${c.authorId}')">
            <div style="flex:1;">
                <div style="background: var(--input-bg); padding: 10px 15px; border-radius: 15px; display:inline-block; max-width: 100%;">
                    <h5 style="margin:0 0 5px 0; font-size:13px; cursor:pointer;" onclick="window.openProfileSlide('${c.authorId}')">${c.authorName || (dict.default_user_name || 'مستخدم')}</h5>
                    <p style="margin:0; font-size:14px; color:var(--text-main); word-wrap: break-word;">${window.formatPostContent(c.text)}</p>
                </div>
                <div style="display:flex; gap:15px; margin-top:5px; font-size:12px; color:var(--text-sub); padding-right:10px;">
                    <span>${window.timeAgo ? window.timeAgo(c.timestamp) : (dict.time_now || 'الآن')}</span>
                    <span style="cursor:pointer; font-weight:bold; color:${isLiked ? 'var(--danger)' : 'var(--text-sub)'}" onclick="window.toggleCommentLike('${c.id}', '${c.authorId}')">${isLiked ? textLiked : textLike} (${c.likes?.length || 0})</span>
                    <span style="cursor:pointer; font-weight:bold;" onclick="window.prepareReply('${targetParentId}', '${c.authorName}')">${textReply}</span>
                </div>
            </div>
        </div>
    `;
}

// 4. إرسال التعليق أو الرد
window.submitComment = async function() {
    const user = window.auth?.currentUser;
    if (!user) return;
    
    const input = document.getElementById('pd-comment-input');
    let text = input.value.trim();
    if (!text) return;

    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    // إذا كان المستخدم يرد على "رد"، نقوم بإضافة (Mention) لاسم الشخص
    if (pdReplyToId && document.getElementById('pd-reply-name').innerText) {
        const repliedName = document.getElementById('pd-reply-name').innerText;
        // التأكد أن الاسم لم يتم كتابته بالفعل في الرسالة
        if (!text.startsWith(`@${repliedName}`)) {
            text = `@${repliedName} ` + text;
        }
    }

    const btn = document.getElementById('pd-send-btn');
    btn.style.opacity = '0.5'; btn.disabled = true;

    try {
        const commentData = {
            authorId: user.uid,
            authorName: currentUserData.name || (dict.default_user_name || "مستخدم"),
            authorImg: currentUserData.photoURL || "",
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            likes: [],
            parentId: pdReplyToId 
        };

        const newCommentRef = await window.db.collection("posts").doc(pdCurrentPostId).collection("comments").add(commentData);
        const generatedCommentId = newCommentRef.id;

        await window.db.collection("posts").doc(pdCurrentPostId).update({
            commentsCount: firebase.firestore.FieldValue.increment(1)
        });

        if (typeof window.sendNotification === 'function') {
            if (pdReplyToId) {
                const parentDoc = await window.db.collection("posts").doc(pdCurrentPostId).collection("comments").doc(pdReplyToId).get();
                if(parentDoc.exists && parentDoc.data().authorId !== user.uid) {
                    window.sendNotification(parentDoc.data().authorId, 'reply', { postId: pdCurrentPostId, commentId: generatedCommentId });
                }
            } else {
                const postDoc = await window.db.collection("posts").doc(pdCurrentPostId).get();
                if(postDoc.exists && postDoc.data().authorId !== user.uid) {
                    window.sendNotification(postDoc.data().authorId, 'comment', { postId: pdCurrentPostId, commentId: generatedCommentId });
                }
            }
        }

        input.value = ""; window.cancelReply();
        setTimeout(() => {
            const scrollArea = document.getElementById('pd-scroll-area');
            scrollArea.scrollTop = scrollArea.scrollHeight;
        }, 300);

    } catch (e) { console.error("Comment Error:", e); }
    
    btn.style.opacity = '1'; btn.disabled = false;
};
// 5. تجهيز واجهة الرد
window.prepareReply = function(parentCommentId, authorNameToMention) {
    pdReplyToId = parentCommentId; // دائماً نربط بالتعليق الأب
    document.getElementById('pd-reply-name').innerText = authorNameToMention;
    document.getElementById('pd-reply-badge').style.display = 'block';
    
    const input = document.getElementById('pd-comment-input');
    input.focus();
};
window.cancelReply = function() { 
    pdReplyToId = null; 
    document.getElementById('pd-reply-badge').style.display = 'none'; 
    document.getElementById('pd-reply-name').innerText = "";
};

// 6. الإعجاب بتعليق
window.toggleCommentLike = async function(commentId, commentAuthorId) {
    const myUid = window.auth?.currentUser?.uid;
    if (!myUid) return;

    try {
        const commentRef = window.db.collection("posts").doc(pdCurrentPostId).collection("comments").doc(commentId);
        const doc = await commentRef.get();
        if(!doc.exists) return;
        
        if (doc.data().likes?.includes(myUid)) {
            await commentRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(myUid) });
        } else {
            await commentRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(myUid) });
            if (commentAuthorId !== myUid && typeof window.sendNotification === 'function') {
                window.sendNotification(commentAuthorId, 'like_comment', { postId: pdCurrentPostId, commentId: commentId });
            }
        }
    } catch (e) { console.error(e); }
};

// ================= محرك تحليل النصوص الذكي =================
window.formatPostContent = function(text) {
    if (!text) return "";
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // تلوين الإشارات (Mentions) للأشخاص في الردود
    const mentionRegex = /@([^\s]+)/g;
    safeText = safeText.replace(mentionRegex, `<span style="color: var(--primary); font-weight: bold;">@$1</span>`);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return safeText.replace(urlRegex, function(url) {
        if (url.includes('?post=')) {
            const extractedPostId = url.split('?post=')[1].split('&')[0];
            return `<a href="javascript:void(0)" onclick="event.stopPropagation(); window.openPostDetailsSlide('${extractedPostId}')" style="color: var(--primary); font-weight: bold; text-decoration: none; background: rgba(var(--primary-rgb), 0.1); padding: 2px 8px; border-radius: 10px; display: inline-flex; align-items: center; gap: 4px;">
                        <ion-icon name="link-outline"></ion-icon> ${dict.view_post_link || 'عرض المنشور'}
                    </a>`;
        }
        return `<a href="${url}" target="_blank" onclick="event.stopPropagation();" style="color: var(--primary); text-decoration: underline; font-weight: 600;">${url}</a>`;
    });
};

// ================= محرك الوقت =================
window.timeAgo = function(timestamp) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    if (!timestamp) return dict.time_now || 'الآن'; 

    let date;
    if (typeof timestamp.toDate === 'function') {
        date = timestamp.toDate();
    } else if (timestamp.seconds) {
        date = new Date(timestamp.seconds * 1000);
    } else {
        date = new Date(timestamp);
    }

    const now = new Date();
    let seconds = Math.floor((now - date) / 1000);

    if (seconds < 0) return dict.time_now || 'الآن';

    const lang = localStorage.getItem('app_lang') || 'ar';

    if (seconds < 60) return lang === 'ar' ? (dict.time_now || 'الآن') : (dict.time_just_now || 'Just now');

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        if (lang !== 'ar') return (dict.time_m_ago || '${n}m ago').replace('${n}', minutes);
        if (minutes === 1) return dict.time_1_min || 'منذ دقيقة';
        if (minutes === 2) return dict.time_2_mins || 'منذ دقيقتين';
        if (minutes >= 3 && minutes <= 10) return (dict.time_3_10_mins || 'منذ ${n} دقائق').replace('${n}', minutes);
        return (dict.time_mins_ago || 'منذ ${n} دقيقة').replace('${n}', minutes);
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        if (lang !== 'ar') return (dict.time_h_ago || '${n}h ago').replace('${n}', hours);
        if (hours === 1) return dict.time_1_hour || 'منذ ساعة';
        if (hours === 2) return dict.time_2_hours || 'منذ ساعتين';
        if (hours >= 3 && hours <= 10) return (dict.time_3_10_hours || 'منذ ${n} ساعات').replace('${n}', hours);
        return (dict.time_hours_ago || 'منذ ${n} ساعة').replace('${n}', hours);
    }

    const days = Math.floor(hours / 24);
    if (days < 30) {
        if (lang !== 'ar') return (dict.time_d_ago || '${n}d ago').replace('${n}', days);
        if (days === 1) return dict.time_1_day || 'منذ يوم';
        if (days === 2) return dict.time_2_days || 'منذ يومين';
        if (days >= 3 && days <= 10) return (dict.time_3_10_days || 'منذ ${n} أيام').replace('${n}', days);
        return (dict.time_days_ago || 'منذ ${n} يوم').replace('${n}', days);
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
        if (lang !== 'ar') return (dict.time_mo_ago || '${n}mo ago').replace('${n}', months);
        if (months === 1) return dict.time_1_month || 'منذ شهر';
        if (months === 2) return dict.time_2_months || 'منذ شهرين';
        if (months >= 3 && months <= 10) return (dict.time_3_10_months || 'منذ ${n} أشهر').replace('${n}', months);
        return (dict.time_months_ago || 'منذ ${n} شهر').replace('${n}', months);
    }

    const years = Math.floor(months / 12);
    if (lang !== 'ar') return (dict.time_y_ago || '${n}y ago').replace('${n}', years);
    if (years === 1) return dict.time_1_year || 'منذ سنة';
    if (years === 2) return dict.time_2_years || 'منذ سنتين';
    if (years >= 3 && years <= 10) return (dict.time_3_10_years || 'منذ ${n} سنوات').replace('${n}', years);
    return (dict.time_years_ago || 'منذ ${n} سنة').replace('${n}', years);
};

// ============================================================================
// 🧠 محرك صندوق الوارد الذكي (Smart Inbox Engine)
// ============================================================================

window.showInboxView = async function(inboxType = 'all') {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

    // 1. إخفاء اللوبي وإظهار الإنبوكس
    document.getElementById('chat-lobby-view').style.display = 'none';
    document.getElementById('chat-inbox-view').style.display = 'block';

    // 2. تغيير عنوان الشاشة بناءً على الزر الذي ضغطت عليه
    const inboxTitle = document.getElementById('inbox-title');
    if(inboxTitle) {
        inboxTitle.innerText = inboxType === 'patients' ? (dict.inbox_title_patients || "استشارات المرضى") : (inboxType === 'peers' ? (dict.inbox_title_peers || "زملاء المهنة (خاص)") : (dict.inbox_title_recent || "الرسائل الأخيرة"));
    }

    const inboxContainer = document.getElementById('inbox-list');
    inboxContainer.innerHTML = `<div style="text-align:center; padding:50px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:40px; color:var(--primary);"></ion-icon><p style="color:var(--text-sub); margin-top:10px;">${dict.fetching_messages || 'جاري جلب الرسائل...'}</p></div>`;

    const myUid = window.auth.currentUser.uid;

    try {
        // 3. جلب جميع الغرف التي أنت عضو فيها (السر هنا: array-contains)
        const chatsSnap = await window.db.collection("chats")
            .where("participants", "array-contains", myUid)
            .get();

        if (chatsSnap.empty) {
            inboxContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--text-sub);">
                    <ion-icon name="chatbubbles-outline" style="font-size: 60px; opacity: 0.5; margin-bottom: 10px;"></ion-icon>
                    <p>${dict.no_chats_yet || 'لا توجد محادثات حتى الآن.'}</p>
                </div>`;
            return;
        }

        let chatList = [];

        // 4. معالجة وتصفية الغرف (المرضى في جهة، والزملاء في جهة)
        for (let doc of chatsSnap.docs) {
            const chatData = doc.data();
            const otherUid = chatData.participants.find(id => id !== myUid);
            if (!otherUid) continue;

            // جلب بيانات الشخص الآخر لمعرفة مهنته (طبيب أم مريض؟)
            const userDoc = await window.db.collection("users").doc(otherUid).get();
            if (!userDoc.exists) continue;
            const uData = userDoc.data();
            const uRole = uData.role || 'patient';

            // 🛑 الفلترة السحرية:
            if (inboxType === 'patients' && uRole !== 'patient') continue;
            if (inboxType === 'peers' && (uRole !== 'doctor' && uRole !== 'pharmacist')) continue;

            chatList.push({
                id: doc.id,
                otherUid: otherUid,
                uData: uData,
                lastMessage: chatData.lastMessage || '',
                lastMessageTime: chatData.lastMessageTime?.toMillis() || 0,
                lastSenderId: chatData.lastSenderId
            });
        }

        // 5. ترتيب المحادثات من الأحدث للأقدم (محلياً لتجنب خطأ الـ Index في فايربيس)
        chatList.sort((a, b) => b.lastMessageTime - a.lastMessageTime);

        // 6. رسم المحادثات في الشاشة
        let inboxHTML = "";
        chatList.forEach(chat => {
            const timeStr = window.timeAgo ? window.timeAgo(chat.lastMessageTime) : "";
            // إذا كان آخر مرسل ليس أنت، نجعل الخط عريضاً (كأنها رسالة غير مقروءة)
            const isUnread = chat.lastSenderId !== myUid; 

            inboxHTML += `
                <div class="inbox-item" onclick="window.openPrivateChat('${chat.otherUid}', '${chat.uData.name?.replace(/'/g, "\\'") || (dict.default_user_name || 'مستخدم')}', '${chat.uData.photoURL || 'assets/img/profile.png'}')">
                    <img src="${chat.uData.photoURL || 'assets/img/profile.png'}">
                    <div class="inbox-details">
                        <div style="display:flex; justify-content:space-between; align-items:baseline;">
                            <h4>${chat.uData.name || (dict.default_user_name || 'مستخدم')}</h4>
                            <span style="font-size:11px; color:var(--text-sub);">${timeStr}</span>
                        </div>
                        <p style="font-weight: ${isUnread ? 'bold' : 'normal'}; color: ${isUnread ? 'var(--primary)' : 'var(--text-sub)'};">
                            ${chat.lastSenderId === myUid ? (dict.you_prefix || 'أنت: ') : ''}${chat.lastMessage || (dict.attachment_label || 'مرفق 📁')}
                        </p>
                    </div>
                </div>
            `;
        });

        if (inboxHTML === "") {
            inboxContainer.innerHTML = `
                <div style="text-align: center; padding: 50px; color: var(--text-sub);">
                    <ion-icon name="mail-open-outline" style="font-size: 60px; opacity: 0.5; margin-bottom: 10px;"></ion-icon>
                    <p>${dict.empty_inbox_section || 'صندوق الوارد فارغ في هذا القسم.'}</p>
                </div>`;
        } else {
            inboxContainer.innerHTML = inboxHTML;
        }

    } catch (error) {
        console.error("Inbox Error:", error);
        inboxContainer.innerHTML = `<div style="text-align:center; padding:20px; color:var(--danger);">${dict.error_loading_messages || 'حدث خطأ أثناء تحميل الرسائل.'}</div>`;
    }
};

window.formatFeedContent = window.formatPostContent;
// ============================================================================
// 🔍 محرك الهاشتاجات المطور (النسخة التي لا تقهر 🛡️)
// ============================================================================
window.searchByHashtag = function(tag) {
    // 1. استخدام دالتك الأصلية لفتح شاشة البحث (لضمان تشغيل أي ستايلات مرتبطة بها)
    if (typeof window.openSearchOverlay === 'function') {
        window.openSearchOverlay();
    } else {
        // إذا لم يجد الدالة، يفتحها يدوياً كخطة بديلة
        const overlay = document.getElementById('searchOverlay');
        if(overlay) overlay.classList.add('active');
    }

    // 2. الوصول لمربع البحث
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = tag; // وضع الهاشتاج
        
        // 3. إجبار النظام على "الاستيقاظ" والبحث
        // ننتظر 300 مللي ثانية لكي تكتمل أنيميشن الفتح ثم نبحث
        setTimeout(() => {
            searchInput.focus(); // وضع المؤشر داخل المربع
            
            // تشغيل دالة البحث الخاصة بك
            if (typeof window.performAdvancedSearch === 'function') {
                window.performAdvancedSearch();
            } else {
                // محاولة أخيرة: إرسال حدث "Enter" وهمي للمربع
                const event = new Event('keyup');
                searchInput.dispatchEvent(event);
            }
        }, 300);
    }
};