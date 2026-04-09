// ============================================================================
// 🚀 استوديو وعارض القصص (النسخة المثالية) - خالية من التداخلات
// ============================================================================

window.studioStream = null;
window.currentFacingMode = 'environment'; 
window.capturedImageData = null; 
window.isTextOnlyMode = false;
window.currentTextBg = 'linear-gradient(45deg, #ff9a9e, #fecfef)';
window.filters = ['none', 'grayscale(100%)', 'sepia(80%)', 'contrast(150%) saturate(120%)', 'hue-rotate(90deg)'];
window.currentFilterIndex = 0;

// ================= 1. نظام الإنشاء والرفع (Publisher) =================

window.openStoryStudio = async function() {
    try {
        const studio = document.getElementById('storyStudioPage');
        if(studio) studio.style.display = 'flex';
        await window.startCamera();
    } catch(e) {
        console.error(e);
    }
};

window.closeStoryStudio = function() {
    window.stopCamera();
    if(typeof window.retakeStudio === 'function') window.retakeStudio(); 
    const studio = document.getElementById('storyStudioPage');
    if(studio) studio.style.display = 'none';
};

window.startCamera = async function() {
    if(window.isTextOnlyMode) return;
    const videoElement = document.getElementById('studio-camera-preview');
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    window.stopCamera(); 
    
    try {
        // المحاولة 1: الكاميرا الخلفية
        window.studioStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: window.currentFacingMode }, audio: false });
        if(videoElement) videoElement.srcObject = window.studioStream;
    } catch (err) { 
        console.warn("Back camera not found, trying user camera...", err);
        try {
            // المحاولة 2: أي كاميرا متوفرة
            window.studioStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            if(videoElement) videoElement.srcObject = window.studioStream;
            window.currentFacingMode = 'user'; 
        } catch (fatalErr) {
            // المحاولة 3: لا توجد كاميرا إطلاقاً (كمبيوتر مكتبي)
            console.error("No camera at all:", fatalErr);
            window.showToast(dict.alert_no_camera || "لا توجد كاميرا، تم التحويل لوضع النصوص 📝");
            if (!window.isTextOnlyMode) window.toggleTextStoryMode();
        }
    }
};

window.stopCamera = function() {
    if (window.studioStream) {
        window.studioStream.getTracks().forEach(track => track.stop());
        window.studioStream = null;
    }
};

window.flipCamera = async function() {
    window.currentFacingMode = window.currentFacingMode === 'user' ? 'environment' : 'user';
    await window.startCamera();
};

window.cycleStudioFilter = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    if(window.isTextOnlyMode) return window.showToast(dict.alert_filters_cam_only || "الفلاتر للكاميرا والصور فقط!");
    window.currentFilterIndex = (window.currentFilterIndex + 1) % window.filters.length;
    const currentFilter = window.filters[window.currentFilterIndex];
    document.getElementById('studio-camera-preview').style.filter = currentFilter;
    document.getElementById('studio-photo-preview').style.filter = currentFilter;
};

window.toggleTextStoryMode = function() {
    window.isTextOnlyMode = !window.isTextOnlyMode;
    const bgEl = document.getElementById('studio-text-bg');
    const camEl = document.getElementById('studio-camera-preview');
    const controls = document.getElementById('studio-controls');
    const pubBar = document.getElementById('studio-publish-bar');
    const flipBtn = document.getElementById('studio-flip-btn');

    if (window.isTextOnlyMode) {
        window.stopCamera();
        if(camEl) camEl.style.display = 'none';
        if(controls) controls.style.display = 'none';
        if(flipBtn) flipBtn.style.display = 'none';
        if(bgEl) bgEl.style.display = 'flex';
        if(pubBar) pubBar.style.display = 'flex';
        if(document.getElementById('studio-caption')) document.getElementById('studio-caption').style.display = 'none';
    } else {
        if(bgEl) bgEl.style.display = 'none';
        if(camEl) camEl.style.display = 'block';
        if(controls) controls.style.display = 'flex';
        if(flipBtn) flipBtn.style.display = 'block';
        if(pubBar) pubBar.style.display = 'none';
        if(document.getElementById('studio-caption')) document.getElementById('studio-caption').style.display = 'block';
        window.startCamera();
    }
};

window.changeTextBg = function(colors) {
    window.currentTextBg = `linear-gradient(45deg, ${colors})`;
    document.getElementById('studio-text-bg').style.background = window.currentTextBg;
};

window.captureStudioPhoto = function() {
    const video = document.getElementById('studio-camera-preview');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1920;
    const ctx = canvas.getContext('2d');
    ctx.filter = window.filters[window.currentFilterIndex];
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    window.capturedImageData = canvas.toDataURL('image/jpeg', 0.8);
    window.showPreviewState(window.capturedImageData);
};

window.handleStudioGallery = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        window.capturedImageData = e.target.result;
        window.showPreviewState(window.capturedImageData);
    };
    reader.readAsDataURL(file);
};

window.showPreviewState = function(imgSrc) {
    window.stopCamera(); 
    document.getElementById('studio-camera-preview').style.display = 'none';
    document.getElementById('studio-controls').style.display = 'none';
    const previewImg = document.getElementById('studio-photo-preview');
    previewImg.src = imgSrc;
    previewImg.style.display = 'block';
    document.getElementById('studio-publish-bar').style.display = 'flex';
};

window.retakeStudio = async function() {
    window.capturedImageData = null;
    window.isTextOnlyMode = false;
    window.currentFilterIndex = 0;
    
    if(document.getElementById('studio-camera-preview')) document.getElementById('studio-camera-preview').style.filter = 'none';
    if(document.getElementById('studio-photo-preview')) {
        document.getElementById('studio-photo-preview').style.filter = 'none';
        document.getElementById('studio-photo-preview').style.display = 'none';
    }
    if(document.getElementById('studio-text-bg')) document.getElementById('studio-text-bg').style.display = 'none';
    if(document.getElementById('studio-publish-bar')) document.getElementById('studio-publish-bar').style.display = 'none';
    if(document.getElementById('studio-caption')) {
        document.getElementById('studio-caption').style.display = 'block';
        document.getElementById('studio-caption').value = '';
    }
    if(document.getElementById('studio-text-only-input')) document.getElementById('studio-text-only-input').value = '';
    
    if(document.getElementById('studio-camera-preview')) document.getElementById('studio-camera-preview').style.display = 'block';
    if(document.getElementById('studio-controls')) document.getElementById('studio-controls').style.display = 'flex';
    if(document.getElementById('studio-flip-btn')) document.getElementById('studio-flip-btn').style.display = 'block';
    if(document.getElementById('studio-gallery-upload')) document.getElementById('studio-gallery-upload').value = ''; 
    
    await window.startCamera();
};

window.publishStudioStory = async function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    const myUser = window.auth?.currentUser;
    if (!myUser) return;

    let finalCaption = "";
    let finalBg = null;

    if (window.isTextOnlyMode) {
        finalCaption = document.getElementById('studio-text-only-input').value.trim();
        if (!finalCaption) return window.showToast(dict.alert_empty_story || "لا يمكن نشر قصة فارغة!");
        finalBg = window.currentTextBg;
    } else {
        if (!window.capturedImageData) return;
        finalCaption = document.getElementById('studio-caption').value.trim();
    }

    const btn = document.getElementById('btn-publish-story-final');
    btn.innerHTML = `<ion-icon name="sync" style="animation: spin 1s infinite;"></ion-icon> <span data-i18n="uploading">${dict.uploading || 'جاري الرفع...'}</span>`;
    btn.disabled = true;

    try {
        const userDoc = await window.db.collection("users").doc(myUser.uid).get();
        const realUserData = userDoc.exists ? userDoc.data() : {};
        let mediaUrl = null;

        if (window.capturedImageData && !window.isTextOnlyMode) {
            const response = await fetch(window.capturedImageData);
            const blob = await response.blob();
            const fileToUpload = new File([blob], "story_image.jpg", { type: "image/jpeg" });
            mediaUrl = await window.cloudinaryEngine.uploadFile(fileToUpload);
        }

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await window.db.collection("stories").add({
            authorId: myUser.uid,
            authorName: realUserData.name || (dict.default_user_name || "مستخدم"),           
            authorImg: realUserData.photoURL || "assets/img/profile.png",      
            mediaUrl: mediaUrl,
            content: finalCaption,
            bgColor: finalBg, 
            timestamp: window.firebase.firestore.FieldValue.serverTimestamp(),
            expiresAt: window.firebase.firestore.Timestamp.fromDate(expiresAt), 
            views: [],
            likes: [] 
        });

        window.showToast(dict.msg_story_published || "تم نشر قصتك بنجاح! 🎉");
        window.closeStoryStudio();

    } catch (error) {
        console.error("Story Upload Error:", error);
        window.showToast(dict.alert_error || "حدث خطأ أثناء رفع القصة.");
    }
    btn.innerHTML = `<span data-i18n="btn_publish_story">${dict.btn_publish_story || 'نشر قصتي'}</span> <ion-icon name="chevron-forward-outline"></ion-icon>`;
    btn.disabled = false;
};

// ================= 2. نظام العرض المتقدم (Viewer) =================

window.allGroupedStories = [];
window.currentStoryUserIdx = 0;
window.currentStoryIdx = 0;
window.storyTimer = null;
const STORY_DURATION = 10000; 

// ============================================================================
// 🚀 محرك جلب القصص الذكي (النسخة الانسيابية المصححة خالية من الأخطاء 100%)
// ============================================================================

window.loadActiveStories = function() {
    const container = document.getElementById('stories-container');
    if(!container) return;

    firebase.auth().onAuthStateChanged(async (myUser) => {
        if (!myUser) return;
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];

        let myFollowing = [];
        let myRealAppPic = 'assets/img/profile.png';

        try {
            const userDoc = await window.db.collection("users").doc(myUser.uid).get();
            if (userDoc.exists) {
                myRealAppPic = userDoc.data().photoURL || 'assets/img/profile.png';
            }

            const followingSnap = await window.db.collection("users").doc(myUser.uid).collection("following").get();
            followingSnap.forEach(doc => {
                myFollowing.push(doc.id);
            });

        } catch (error) { 
            console.error("Error fetching user data:", error); 
        }

        myFollowing.push(myUser.uid); 

        const now = new Date();
        
        window.db.collection("stories")
            .where("expiresAt", ">", window.firebase.firestore.Timestamp.fromDate(now))
            .onSnapshot(snap => {
                const grouped = {};
                
                snap.forEach(doc => {
                    const s = { id: doc.id, ...doc.data() };
                    
                    if (s.authorId && myFollowing.includes(s.authorId)) {
                        if(!grouped[s.authorId]) {
                            grouped[s.authorId] = { 
                                authorId: s.authorId, 
                                authorName: s.authorName || (dict.default_user_name || "مستخدم"), 
                                authorImg: s.authorImg || "assets/img/profile.png", 
                                stories: [] 
                            };
                        }
                        grouped[s.authorId].stories.push(s);
                    }
                });

                window.allGroupedStories = Object.values(grouped);
                
                window.allGroupedStories.forEach(group => {
                    group.stories.sort((a, b) => {
                        let dA = a.timestamp && a.timestamp.toDate ? a.timestamp.toDate() : new Date(0);
                        let dB = b.timestamp && b.timestamp.toDate ? b.timestamp.toDate() : new Date(0);
                        return dA - dB;
                    });
                });

                window.allGroupedStories.sort((a, b) => {
                    if (a.authorId === myUser.uid) return -1;
                    if (b.authorId === myUser.uid) return 1;
                    
                    let lastA = a.stories[a.stories.length - 1];
                    let lastB = b.stories[b.stories.length - 1];
                    let timeA = lastA.timestamp && lastA.timestamp.toDate ? lastA.timestamp.toDate() : new Date(0);
                    let timeB = lastB.timestamp && lastB.timestamp.toDate ? lastB.timestamp.toDate() : new Date(0);
                    return timeB - timeA; 
                });

                // 1. رسم زر إضافة قصة (التصميم الانسيابي)
                let html = `
                    <div class="story-item" onclick="window.openStoryStudio()">
                        <div class="story-add-squircle"><ion-icon name="add"></ion-icon></div>
                        <div class="story-name" data-i18n="story_add">${dict.story_add || 'إضافة قصة'}</div>
                    </div>
                `;

                // 2. رسم قصص المستخدمين الآخرين
                window.allGroupedStories.forEach((group, index) => {
                    const isMe = (group.authorId === myUser.uid);
                    const displayName = isMe ? (dict.your_story || "قصتك") : (group.authorName ? group.authorName.split(' ')[0] : (dict.default_user_name || "مستخدم"));
                    const safeImg = group.authorImg || "assets/img/profile.png";
                    
                    // استخدام المتغيرات الصحيحة: index للمكان، safeImg للصورة، displayName للاسم
                    html += `
                        <div class="story-item" onclick="window.openStoryViewer(${index})">
                            <div class="story-squircle">
                                <img src="${safeImg}">
                            </div>
                            <div class="story-name">${displayName}</div>
                        </div>
                    `;
                });

                container.innerHTML = html;
            }, error => {
                console.error("Firebase Stories Listener Error:", error);
            });
    });
};

window.openStoryViewer = function(userIdx) {
    if(userIdx >= window.allGroupedStories.length) return;
    window.currentStoryUserIdx = userIdx;
    window.currentStoryIdx = 0;
    
    const sv = document.getElementById('storyViewer');
    if(sv) sv.style.display = 'flex';
    window.renderCurrentStory();
};

window.closeStoryViewer = function() {
    const sv = document.getElementById('storyViewer');
    if(sv) sv.style.display = 'none';
    clearTimeout(window.storyTimer);
};

window.renderCurrentStory = function() {
    clearTimeout(window.storyTimer);
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    const group = window.allGroupedStories[window.currentStoryUserIdx];
    if(!group) return window.closeStoryViewer();
    const story = group.stories[window.currentStoryIdx];
    if(!story) return window.nextStoryUser();

    document.getElementById('storyViewerPic').src = group.authorImg;
    document.getElementById('storyViewerName').innerText = group.authorName;
    document.getElementById('storyViewerTime').innerText = window.timeAgo ? window.timeAgo(story.timestamp) : (dict.time_now || 'الآن');

    window.db.collection("users").doc(group.authorId).get().then(doc => {
        const isVerified = doc.exists && doc.data().isVerified === true;
        const badgeEl = document.getElementById('storyVerifiedBadge');
        if(badgeEl) badgeEl.style.display = isVerified ? 'inline-block' : 'none';
    });

    const myUid = window.auth?.currentUser?.uid;
    const isMyStory = (group.authorId === myUid);

    document.getElementById('storyOptionsBtn').style.display = 'block';
    const optionsMenu = document.getElementById('storyOptionsMenu');
    if(optionsMenu) {
        optionsMenu.style.display = 'none';
        if(isMyStory) {
            optionsMenu.innerHTML = `<button onclick="window.deleteCurrentStory('${story.id}')" style="background:none; border:none; color:var(--danger); padding:10px; width:100%; text-align:right; font-family:'Cairo'; cursor:pointer;"><ion-icon name="trash"></ion-icon> <span data-i18n="opt_delete">${dict.opt_delete || 'حذف القصة'}</span></button>`;
        } else {
            optionsMenu.innerHTML = `<button onclick="window.reportCurrentStory()" style="background:none; border:none; color:white; padding:10px; width:100%; text-align:right; font-family:'Cairo'; cursor:pointer;"><ion-icon name="flag"></ion-icon> <span data-i18n="opt_report">${dict.opt_report || 'إبلاغ عن محتوى'}</span></button>`;
        }
    }

    const replyBar = document.getElementById('storyReplyBar');
    const ownerBar = document.getElementById('storyOwnerBar');

    if (isMyStory) {
        if(replyBar) replyBar.style.display = 'none';
        if(ownerBar) {
            ownerBar.style.display = 'flex';
            const likesCountEl = document.getElementById('story-likes-count');
            if(likesCountEl) {
                likesCountEl.innerText = (story.likes && story.likes.length) ? story.likes.length : 0;
            }
        }
    } else {
        if(ownerBar) ownerBar.style.display = 'none';
        if (replyBar) {
            replyBar.style.display = 'flex';
            const replyInput = document.getElementById('storyReplyInput');
            if(replyInput) {
                replyInput.placeholder = dict.story_reply_placeholder || 'إرسال رسالة...';
                replyInput.value = '';
            }
            
            const likeIcon = document.querySelector('#storyLikeBtn ion-icon');
            if (likeIcon) {
                if ((story.likes || []).includes(myUid)) {
                    likeIcon.setAttribute('name', 'heart');
                    likeIcon.style.color = 'var(--danger)';
                } else {
                    likeIcon.setAttribute('name', 'heart-outline');
                    likeIcon.style.color = 'white';
                }
            }
        }
    }

    const progressContainer = document.getElementById('storyProgressBars');
    progressContainer.innerHTML = '';
    group.stories.forEach((s, i) => {
        const width = i < window.currentStoryIdx ? '100%' : '0%';
        progressContainer.innerHTML += `<div style="flex:1; height:3px; background:rgba(255,255,255,0.3); border-radius:3px; overflow:hidden;"><div id="prog-${i}" style="width:${width}; height:100%; background:white;"></div></div>`;
    });

    const contentArea = document.getElementById('storyContentMedia');
    if(story.bgColor && !story.mediaUrl) {
        contentArea.innerHTML = `<div style="position:absolute; top:0; left:0; width:100%; height:100%; background:${story.bgColor}; display:flex; justify-content:center; align-items:center; padding:20px;"><div style="color:white; font-size:35px; font-weight:bold; font-family:'Cairo'; text-align:center;">${story.content}</div></div>`;
    } else if (story.mediaUrl) {
        let html = `<img src="${story.mediaUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:#000;">`;
        if(story.content) html += `<div style="position:absolute; bottom:90px; left:20px; right:20px; text-align:center; color:white; font-size:18px; background:rgba(0,0,0,0.5); padding:10px; border-radius:10px;">${story.content}</div>`;
        contentArea.innerHTML = html;
    }

    setTimeout(() => {
        const currentProg = document.getElementById(`prog-${window.currentStoryIdx}`);
        if(currentProg) {
            currentProg.style.transition = `width ${STORY_DURATION}ms linear`;
            currentProg.style.width = '100%';
        }
    }, 50);

    window.storyTimer = setTimeout(() => { window.nextStory(); }, STORY_DURATION);
};

window.likeCurrentStory = async function(btnElement) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    const user = window.auth?.currentUser;
    if (!user) return;
    const group = window.allGroupedStories[window.currentStoryUserIdx];
    const story = group.stories[window.currentStoryIdx];
    const icon = btnElement.querySelector('ion-icon');
    
    const isCurrentlyLiked = icon.getAttribute('name') === 'heart';
    if (isCurrentlyLiked) {
        icon.setAttribute('name', 'heart-outline');
        icon.style.color = 'white';
    } else {
        icon.setAttribute('name', 'heart');
        icon.style.color = 'var(--danger)';
        if (typeof window.sendNotification === 'function') {
            window.sendNotification(group.authorId, 'like_story', { content: dict.noti_like_story || "أعجب بقصتك ❤️" });
        }
    }

    try {
        const storyRef = window.db.collection("stories").doc(story.id);
        if (isCurrentlyLiked) {
            await storyRef.update({ likes: window.firebase.firestore.FieldValue.arrayRemove(user.uid) });
        } else {
            await storyRef.update({ likes: window.firebase.firestore.FieldValue.arrayUnion(user.uid) });
        }
    } catch(e) { console.error(e); }
};

window.replyToStory = async function() {
    const replyInput = document.getElementById('storyReplyInput');
    const text = replyInput.value.trim();
    if(!text) return;

    const storyOwner = window.allGroupedStories[window.currentStoryUserIdx];
    const myUid = window.auth.currentUser.uid;
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];

    window.closeStoryViewer();
    const chatId = myUid < storyOwner.authorId ? `${myUid}_${storyOwner.authorId}` : `${storyOwner.authorId}_${myUid}`;

    await window.db.collection("chats").doc(chatId).collection("messages").add({
        senderId: myUid,
        text: (dict.story_reply_prefix || "الرد على القصة: ") + text,
        timestamp: window.firebase.firestore.FieldValue.serverTimestamp()
    });

    if(window.PeerChatSystem) {
        window.PeerChatSystem.openRoom(storyOwner.authorId, storyOwner.authorName, storyOwner.authorImg, chatId, "زميل");
    }
};

window.sendQuickStoryReaction = function(emoji) {
    const input = document.getElementById('storyReplyInput');
    if(input) { input.value = emoji; window.replyToStory(); }
};

window.toggleStoryOptions = function() {
    const menu = document.getElementById('storyOptionsMenu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        clearTimeout(window.storyTimer); 
    } else {
        menu.style.display = 'none';
        window.resumeStoryTimer(); 
    }
};

window.deleteCurrentStory = async function(storyId) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    document.getElementById('storyOptionsMenu').style.display = 'none';
    if(confirm(dict.alert_delete_confirm || "هل أنت متأكد من حذف القصة؟")) {
        try {
            await window.db.collection("stories").doc(storyId).delete();
            window.showToast(dict.alert_success || "تم الحذف بنجاح 🗑️");
            window.closeStoryViewer();
        } catch(e) { console.error(e); }
    } else {
        window.resumeStoryTimer();
    }
};

window.reportCurrentStory = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    window.showToast(dict.msg_report_sent || "تم إرسال بلاغ للإدارة 🚩");
    document.getElementById('storyOptionsMenu').style.display = 'none';
    window.resumeStoryTimer();
};

window.resumeStoryTimer = function() {
    window.storyTimer = setTimeout(window.nextStory, STORY_DURATION / 2);
};

window.nextStory = function() {
    const group = window.allGroupedStories[window.currentStoryUserIdx];
    if(window.currentStoryIdx < group.stories.length - 1) {
        window.currentStoryIdx++;
        window.renderCurrentStory();
    } else {
        window.nextStoryUser();
    }
};

window.prevStory = function() {
    if(window.currentStoryIdx > 0) {
        window.currentStoryIdx--;
        window.renderCurrentStory();
    } else if (window.currentStoryUserIdx > 0) {
        window.currentStoryUserIdx--;
        window.currentStoryIdx = window.allGroupedStories[window.currentStoryUserIdx].stories.length - 1;
        window.renderCurrentStory();
    } else {
        window.currentStoryIdx = 0;
        window.renderCurrentStory(); 
    }
};

window.nextStoryUser = function() {
    if(window.currentStoryUserIdx < window.allGroupedStories.length - 1) {
        window.currentStoryUserIdx++;
        window.currentStoryIdx = 0;
        window.renderCurrentStory();
    } else {
        window.closeStoryViewer();
    }
};

window.viewStoryLikes = async function() {
    const group = window.allGroupedStories[window.currentStoryUserIdx];
    const story = group.stories[window.currentStoryIdx];
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'];
    
    if(!story.likes || story.likes.length === 0) {
        return window.showToast(dict.msg_no_likes || "لا توجد إعجابات على هذه القصة بعد 💔");
    }

    clearTimeout(window.storyTimer);

    const modal = document.getElementById('usersListModal');
    const title = document.getElementById('usersListTitle');
    const container = document.getElementById('usersListContainer');
    
   // 🚨 التعديل الجراحي هنا: إجبار النافذة على الظهور فوق القصة 🚨
    modal.style.zIndex = "2000000"; 
    
    title.innerText = dict.likes_title || "الإعجابات ❤️";
    container.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--danger);"></ion-icon></div>`;
    modal.style.display = 'flex';
    try {
        let html = '';
        for(let uid of story.likes) {
            const uDoc = await window.db.collection("users").doc(uid).get();
            if(uDoc.exists) {
                const u = uDoc.data();
                html += `
                    <div style="display:flex; align-items:center; gap:15px; padding:12px; background:var(--input-bg); border-radius:15px; margin-bottom:10px; cursor:pointer; border:1px solid var(--border-app);" 
                         onclick="document.getElementById('usersListModal').style.display='none'; window.closeStoryViewer(); window.openProfileSlide('${uid}');">
                        <img src="${u.photoURL || 'assets/img/profile.png'}" style="width:45px; height:45px; border-radius:50%; object-fit:cover; border:1px solid var(--border-app);">
                        <strong style="color:var(--text-main); font-size:15px; font-family:'Cairo';">${u.name}</strong>
                    </div>
                `;
            }
        }
        container.innerHTML = html;
    } catch(e) {
        console.error(e);
        container.innerHTML = `<div style="text-align: center; color: var(--danger);">${dict.alert_error || 'حدث خطأ في جلب البيانات'}</div>`;
    }

    const closeBtn = modal.querySelector('.modal-header ion-icon');
    const oldClick = closeBtn.onclick;
    closeBtn.onclick = function() {
        modal.style.display = 'none';
        window.resumeStoryTimer(); 
        closeBtn.onclick = oldClick; 
    };
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (typeof window.loadActiveStories === 'function') {
            window.loadActiveStories();
        }
    }, 2500);
});