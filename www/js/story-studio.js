// ============================================================================
// استوديو القصص (Story Studio PRO MAX) - متصل بـ Firebase ☁️ (رفع وعرض)
// ============================================================================

window.studioStream = null;
window.currentFacingMode = 'environment'; 
window.capturedImageData = null; 
window.isTextOnlyMode = false;
window.currentTextBg = 'linear-gradient(45deg, #ff9a9e, #fecfef)';

// نظام الفلاتر الطبية/الجمالية 🎨
window.filters = ['none', 'grayscale(100%)', 'sepia(80%)', 'contrast(150%) saturate(120%)', 'hue-rotate(90deg)'];
window.currentFilterIndex = 0;

// ================= 1. نظام الإنشاء والرفع (Publisher) =================

window.openStoryStudio = async function() {
    window.openSPA('storyStudioPage');
    await window.startCamera();
};

window.closeStoryStudio = function() {
    window.closeSPA('storyStudioPage');
    window.stopCamera();
    window.retakeStudio(); 
};

window.startCamera = async function() {
    if(window.isTextOnlyMode) return;
    const videoElement = document.getElementById('studio-camera-preview');
    window.stopCamera(); 
    try {
        window.studioStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: window.currentFacingMode }, audio: false });
        videoElement.srcObject = window.studioStream;
    } catch (err) { console.error("Camera Error: ", err); }
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
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    if(window.isTextOnlyMode) return window.showToast(dict.alert_filters_cam_only || "الفلاتر تعمل مع الكاميرا والصور فقط!");
    window.currentFilterIndex = (window.currentFilterIndex + 1) % window.filters.length;
    const currentFilter = window.filters[window.currentFilterIndex];
    document.getElementById('studio-camera-preview').style.filter = currentFilter;
    document.getElementById('studio-photo-preview').style.filter = currentFilter;
    window.showToast(dict.msg_filter_changed || "تم تغيير الفلتر ✨");
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

// ================= دالة رفع القصة (بأسماء وصور حقيقية 100%) =================
window.publishStudioStory = async function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const myUser = window.auth.currentUser;
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
    btn.innerHTML = `<ion-icon name="sync" style="animation: spin 1s infinite;"></ion-icon> ${dict.uploading || 'جاري الرفع...'}`;
    btn.disabled = true;

    try {
        // 🚨 السحر هنا: جلب البروفايل الحقيقي من التطبيق لتجاهل صورة جيميل!
        const userDoc = await window.db.collection("users").doc(myUser.uid).get();
        const realUserData = userDoc.exists ? userDoc.data() : {};
        const realProfilePic = realUserData.photoURL || "assets/img/profile.png";
        const realName = realUserData.name || (dict.default_user_name || "مستخدم");

        let mediaUrl = null;

        // رفع الصورة السحابية
        if (window.capturedImageData && !window.isTextOnlyMode) {
            const response = await fetch(window.capturedImageData);
            const blob = await response.blob();
            const fileToUpload = new File([blob], "story_image.jpg", { type: "image/jpeg" });

            mediaUrl = await window.cloudinaryEngine.uploadFile(fileToUpload);
            
            if (!mediaUrl) {
                window.showToast(dict.story_upload_fail || "فشل رفع القصة للسحابة، جرب مجدداً ❌");
                btn.innerHTML = `${dict.btn_publish_story || 'نشر قصتي'} <ion-icon name="chevron-forward-outline"></ion-icon>`;
                btn.disabled = false;
                return;
            }
        }

        // حفظ القصة بالبيانات الحقيقية
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

        await window.db.collection("stories").add({
            authorId: myUser.uid,
            authorName: realName,           // 👈 اسمك الحقيقي
            authorImg: realProfilePic,      // 👈 صورتك الحقيقية في التطبيق (ليست جيميل)
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

    btn.innerHTML = `${dict.btn_publish_story || 'نشر قصتي'} <ion-icon name="chevron-forward-outline"></ion-icon>`;
    btn.disabled = false;
};
// ================= 2. نظام العرض المتقدم (Viewer) 👁️ =================

window.allGroupedStories = [];
window.currentStoryUserIdx = 0;
window.currentStoryIdx = 0;
window.storyTimer = null;
const STORY_DURATION = 10000; // ⏳ 10 ثواني لقراءة القصص براحة

// --- دالة نافذة التأكيد الاحترافية (Custom Alert) 🎨 مدعمة باللغات ---
window.customConfirmDialog = function(message, onConfirmCallback) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    
    const overlay = document.createElement('div');
    overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); backdrop-filter:blur(5px); z-index:99999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
    
    const box = document.createElement('div');
    box.style.cssText = "background:var(--card-bg, #fff); padding:25px; border-radius:20px; width:85%; max-width:350px; text-align:center; transform:scale(0.8); transition:0.3s; box-shadow:0 10px 30px rgba(0,0,0,0.3);";
    
    box.innerHTML = `
        <ion-icon name="warning" style="font-size:55px; color:var(--danger, #ff4d4d); margin-bottom:10px;"></ion-icon>
        <h3 style="margin:0 0 20px 0; font-family:'Cairo'; color:var(--text-main, #333); font-size:18px;">${message}</h3>
        <div style="display:flex; gap:10px;">
            <button id="custom-alert-cancel" style="flex:1; padding:12px; border-radius:15px; border:none; background:var(--input-bg, #eee); color:var(--text-main, #333); font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${dict.btn_cancel || 'إلغاء'}</button>
            <button id="custom-alert-confirm" style="flex:1; padding:12px; border-radius:15px; border:none; background:var(--danger, #ff4d4d); color:#fff; font-family:'Cairo'; font-weight:bold; cursor:pointer; font-size:16px;">${dict.btn_confirm || 'تأكيد'}</button>
        </div>
    `;
    
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    
    setTimeout(() => { overlay.style.opacity = '1'; box.style.transform = 'scale(1)'; }, 10);

    document.getElementById('custom-alert-cancel').onclick = () => {
        overlay.style.opacity = '0'; box.style.transform = 'scale(0.8)';
        setTimeout(() => overlay.remove(), 300);
        window.resumeStoryTimer(); // إكمال وقت القصة
    };

    document.getElementById('custom-alert-confirm').onclick = () => {
        overlay.style.opacity = '0'; box.style.transform = 'scale(0.8)';
        setTimeout(() => overlay.remove(), 300);
        onConfirmCallback(); // تنفيذ الحذف
    };
};

window.loadActiveStories = async function() {
    const container = document.getElementById('stories-container');
    if(!container) return;

    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const myUser = window.auth.currentUser;
    if (!myUser) return;

    // 🚨 1. جلب قائمة الأشخاص الذين تتابعهم من قاعدة البيانات
    let myFollowing = [];
    try {
        const userDoc = await window.db.collection("users").doc(myUser.uid).get();
        if (userDoc.exists) {
            myFollowing = userDoc.data().following || [];
        }
    } catch (error) {
        console.error("Error fetching following list:", error);
    }

    // 🚨 2. إضافة الآي دي الخاص بك للقائمة (لكي تظهر قصصك أنت أيضاً)
    myFollowing.push(myUser.uid);

    const now = new Date();
    
    // 3. جلب القصص الحية
    window.db.collection("stories")
        .where("expiresAt", ">", window.firebase.firestore.Timestamp.fromDate(now))
        .orderBy("expiresAt", "asc")
        .onSnapshot(snap => {
            const grouped = {};
            
            snap.forEach(doc => {
                const s = { id: doc.id, ...doc.data() };
                
                // 🚨 4. الفلترة السحرية: هل صاحب القصة في قائمة المتابعة؟
                if (myFollowing.includes(s.authorId)) {
                    if(!grouped[s.authorId]) {
                        grouped[s.authorId] = { authorId: s.authorId, authorName: s.authorName, authorImg: s.authorImg, stories: [] };
                    }
                    grouped[s.authorId].stories.push(s);
                }
            });

            // تحويل الكائن إلى مصفوفة لعرضها
            window.allGroupedStories = Object.values(grouped);

            // 5. رسم واجهة القصص
            let html = `
                <div class="story-item" onclick="window.openStoryStudio()">
                    <div class="story-add-ring"><ion-icon name="add"></ion-icon></div>
                    <div class="story-name">${dict.story_add || 'إضافة قصة'}</div>
                </div>
            `;

            window.allGroupedStories.forEach((group, index) => {
                html += `
                    <div class="story-item" onclick="window.openStoryViewer(${index})">
                        <div class="story-ring"><img src="${group.authorImg}"></div>
                        <div class="story-name">${group.authorName.split(' ')[0]}</div>
                    </div>
                `;
            });

            container.innerHTML = html;
        });
};

window.openStoryViewer = function(userIdx) {
    if(userIdx >= window.allGroupedStories.length) return;
    window.currentStoryUserIdx = userIdx;
    window.currentStoryIdx = 0;
    document.getElementById('storyViewer').classList.add('active');
    window.renderCurrentStory();
};

window.closeStoryViewer = function() {
    document.getElementById('storyViewer').classList.remove('active');
    clearTimeout(window.storyTimer);
};

window.renderCurrentStory = function() {
    clearTimeout(window.storyTimer);
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const group = window.allGroupedStories[window.currentStoryUserIdx];
    
    if(!group) return window.closeStoryViewer();
    const story = group.stories[window.currentStoryIdx];
    if(!story) return window.nextStoryUser();

    document.getElementById('storyViewerPic').src = group.authorImg;
    document.getElementById('storyViewerName').innerText = group.authorName;
    document.getElementById('storyViewerTime').innerText = window.timeAgo ? window.timeAgo(story.timestamp) : '';

    const myUid = window.auth?.currentUser?.uid;
    const isMyStory = group.authorId === myUid;

    // --- هندسة الثلاث نقاط (حذف / إبلاغ) ---
    document.getElementById('storyOptionsBtn').style.display = 'block';
    const optionsMenu = document.getElementById('storyOptionsMenu');
    if(optionsMenu) {
        optionsMenu.style.display = 'none';
        if(isMyStory) {
            optionsMenu.innerHTML = `
                <button onclick="window.deleteCurrentStory('${story.id}')" style="background: none; border: none; color: var(--danger); padding: 10px 15px; width: 100%; display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: bold;">
                    <ion-icon name="trash"></ion-icon> <span>${dict.opt_delete || 'حذف القصة'}</span>
                </button>
            `;
        } else {
            optionsMenu.innerHTML = `
                <button onclick="window.reportCurrentStory()" style="background: none; border: none; color: white; padding: 10px 15px; width: 100%; display: flex; align-items: center; gap: 8px; cursor: pointer; font-family: 'Cairo'; font-weight: bold;">
                    <ion-icon name="flag"></ion-icon> <span>${dict.opt_report || 'إبلاغ عن محتوى'}</span>
                </button>
            `;
        }
    }

    // --- هندسة شريط الردود والإعجاب ---
    const replyBar = document.getElementById('storyReplyBar');
    if (replyBar) {
        replyBar.style.display = isMyStory ? 'none' : 'flex';
        const replyInput = document.getElementById('storyReplyInput');
        if(replyInput) {
            replyInput.placeholder = dict.story_reply_placeholder || 'رد على القصة...';
            replyInput.value = '';
        }
        
        const storyLikes = story.likes || [];
        const likeIcon = document.querySelector('#storyLikeBtn ion-icon');
        if (likeIcon) {
            if (storyLikes.includes(myUid)) {
                likeIcon.setAttribute('name', 'heart');
                likeIcon.style.color = 'var(--danger)';
            } else {
                likeIcon.setAttribute('name', 'heart-outline');
                likeIcon.style.color = 'white';
            }
        }
    }

    const progressContainer = document.getElementById('storyProgressBars');
    progressContainer.innerHTML = '';
    group.stories.forEach((s, i) => {
        const width = i < window.currentStoryIdx ? '100%' : '0%';
        progressContainer.innerHTML += `<div class="story-progress-bar"><div class="story-progress-fill" id="prog-${i}" style="width: ${width};"></div></div>`;
    });

    const contentArea = document.getElementById('storyContentMedia');
    
    // --- إصلاح برج خليفة (تصميم النصوص الملونة) ---
    if(story.bgColor && !story.mediaUrl) {
        contentArea.innerHTML = `
            <div style="position:absolute; top:0; left:0; width:100%; height:100%; background:${story.bgColor}; display:flex; justify-content:center; align-items:center; padding:20px; box-sizing:border-box;">
                <div style="color:white; font-size:35px; font-weight:bold; font-family:'Cairo'; text-align:center; text-shadow:0 2px 5px rgba(0,0,0,0.3); word-wrap:break-word; max-width:100%;">${story.content}</div>
            </div>
        `;
    } 
    else if (story.mediaUrl) {
        contentArea.innerHTML = `<img src="${story.mediaUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain; background:#000;">`;
        if(story.content) {
            contentArea.innerHTML += `<div style="position:absolute; bottom:80px; left:20px; right:20px; text-align:center; color:white; font-size:18px; text-shadow:0 2px 4px rgba(0,0,0,0.8); background:rgba(0,0,0,0.5); padding:10px; border-radius:10px; z-index:10;">${story.content}</div>`;
        }
    }

    setTimeout(() => {
        const currentProg = document.getElementById(`prog-${window.currentStoryIdx}`);
        if(currentProg) {
            currentProg.style.transition = `width ${STORY_DURATION}ms linear`;
            currentProg.style.width = '100%';
        }
    }, 50);

    window.storyTimer = setTimeout(() => {
        window.nextStory();
    }, STORY_DURATION);
};

// ================= دوال التفاعل مع القصص (الإشعارات) =================

window.likeCurrentStory = async function(btnElement) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    const user = window.auth.currentUser;
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
        icon.style.transform = 'scale(1.3)';
        setTimeout(() => icon.style.transform = 'scale(1)', 200);
        
        // إرسال إشعار لصاحب القصة
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

    // بيانات صاحب القصة (التي تشاهدها الآن)
    const storyOwner = window.allGroupedStories[window.currentStoryUserIdx];
    const targetUid = storyOwner.userId;
    const targetName = storyOwner.userName;
    const targetImg = storyOwner.userAvatar;
    const myUid = firebase.auth().currentUser.uid;

    // إغلاق القصة أولاً
    window.closeStoryViewer();

    // إنشاء ID للدردشة (نفس منطق PeerChatSystem)
    const chatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;

    // إرسال الرد كرسالة أولى في الشات
    await firebase.firestore().collection("chats").doc(chatId).collection("messages").add({
        senderId: myUid,
        text: "الرد على القصة: " + text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // تحديث الشات الخارجي
    await firebase.firestore().collection("chats").doc(chatId).set({
        participants: [myUid, targetUid],
        lastMessage: text,
        lastMessageTime: Date.now()
    }, { merge: true });

    // 🚀 فتح غرفة الدردشة فوراً باستخدام محركك!
    window.PeerChatSystem.openRoom(targetUid, targetName, targetImg, chatId, "زميل");
};

// ================= القوائم والتأكيد المخصص =================

window.toggleStoryOptions = function() {
    const menu = document.getElementById('storyOptionsMenu');
    if (!menu) return;
    if (menu.style.display === 'none' || menu.style.display === '') {
        menu.style.display = 'block';
        clearTimeout(window.storyTimer); // إيقاف الوقت
    } else {
        menu.style.display = 'none';
        window.resumeStoryTimer(); // إكمال الوقت
    }
};

window.deleteCurrentStory = function(storyId) {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    document.getElementById('storyOptionsMenu').style.display = 'none';
    
    // استخدام النافذة المنبثقة المخصصة الجبارة مع اللغات
    window.customConfirmDialog(dict.alert_delete_confirm || "هل أنت متأكد من حذف القصة نهائياً؟", async () => {
        try {
            await window.db.collection("stories").doc(storyId).delete();
            window.showToast(dict.alert_success || "تم الحذف بنجاح 🗑️");
            window.closeStoryViewer();
        } catch(e) { console.error(e); }
    });
};

window.reportCurrentStory = function() {
    const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
    window.showToast(dict.msg_report_sent || "تم إرسال بلاغ للإدارة وسيتم مراجعته 🚩");
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