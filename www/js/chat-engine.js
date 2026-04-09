// ============================================================================
// 🏆 محرك الدردشة (Chat Engine PRO MAX) - النسخة النهائية (الجولة 3)
// ============================================================================

window.activeChatId = null;
window.activeChatListener = null;
window.chatState = {
    lastMessageTime: 0,
    cooldownSeconds: 3,
    replyingTo: null,
    activeContextMenuMsgId: null,
    activeContextMenuText: null,
    activeContextMenuSender: null
};
// ==========================================
// 🏗️ 1. بناء نوافذ التفاعل وزرعها في التطبيق أوتوماتيكياً
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    // استدعاء القاموس
    const lang = localStorage.getItem('app_lang') || 'ar';
    const t = window.translations?.[lang] || {};

    // 1. زرع قائمة الإيموجيات (لا تحتاج ترجمة لكن حافظنا على الهيكل)
    const emojiHTML = `
        <div id="chat-emoji-picker" class="emoji-picker-container" style="display: none;">
            ${['😀','😂','🥰','😍','😎','😢','😡','👍','🙏','🔥','💊','💉'].map(e => `<div class="emoji-item" onclick="window.insertChatEmoji('${e}')">${e}</div>`).join('')}
        </div>`;
    document.body.insertAdjacentHTML('beforeend', emojiHTML);

    // 2. زرع قائمة الخيارات العائمة (تم ربط النصوص بالقاموس 🌍)
    const contextHTML = `
        <div id="chat-context-menu" class="chat-context-menu" style="display: none;">
            <div class="context-menu-reactions">
                <span onclick="window.addChatReaction('❤️')">❤️</span>
                <span onclick="window.addChatReaction('😂')">😂</span>
                <span onclick="window.addChatReaction('😢')">😢</span>
            </div>
            <button class="context-btn" onclick="window.copyChatText()">
                <ion-icon name="copy-outline"></ion-icon> ${t.chat_copy_msg || 'نسخ الرسالة'}
            </button>
            <button class="context-btn" onclick="window.initiateChatReply()">
                <ion-icon name="arrow-undo-outline"></ion-icon> ${t.chat_reply_msg || 'الرد على الرسالة'}
            </button>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', contextHTML);

    // 3. إخفاء القوائم عند الضغط في أي مكان فارغ
    document.addEventListener('click', (e) => {
        if(!e.target.closest('#chat-context-menu') && !e.target.closest('.chat-msg')) {
            const menu = document.getElementById('chat-context-menu');
            if(menu) menu.style.display = 'none';
        }
        if(!e.target.closest('#chat-emoji-picker') && !e.target.closest('[name="happy-outline"]')) {
            const picker = document.getElementById('chat-emoji-picker');
            if(picker) picker.style.display = 'none';
        }
    });
});

window.openGlobalMedicalRoom = function() {
    const lang = localStorage.getItem('app_lang') || 'ar';
    const t = window.translations?.[lang] || {};

    window.activeChatId = "global_medical_room";
    
    const nameEl = document.getElementById('active-chat-name');
    const statusEl = document.getElementById('active-chat-status');
    
    if(nameEl) nameEl.innerText = t.global_room_title || "الغرفة الطبية (عام)";
    if(document.getElementById('active-chat-avatar')) {
        document.getElementById('active-chat-avatar').src = "https://cdn-icons-png.flaticon.com/512/3209/3209074.png"; 
    }
    if(statusEl) statusEl.innerHTML = `🌐 ${t.global_room_status || 'يراها جميع الأطباء والصيادلة'}`;
    
    window.openSPA('chatRoomSlidePage');
    if(typeof listenToChatMessages === 'function') listenToChatMessages();
};
window.openPrivateChat = function(targetUid, targetName, targetAvatar) {
    // جلب القاموس الحالي لضمان ترجمة الحالة
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const myUid = window.auth.currentUser.uid;
    
    // منطق توليد معرف الغرفة الفريد (مقدس لا يلمس)
    window.activeChatId = myUid < targetUid ? `${myUid}_${targetUid}` : `${targetUid}_${myUid}`;
    
    if(document.getElementById('active-chat-name')) document.getElementById('active-chat-name').innerText = targetName;
    if(document.getElementById('active-chat-avatar')) document.getElementById('active-chat-avatar').src = targetAvatar || 'assets/img/profile.png';
    
    // ترجمة حالة الاتصال والأمان
    const statusEl = document.getElementById('active-chat-status');
    if(statusEl) {
        statusEl.innerHTML = `<ion-icon name="ellipse" style="font-size: 8px; margin-left: 3px;"></ion-icon> <span>${dict.chat_status_secure || 'متصل ومحمي 🔒'}</span>`;
    }
    
    window.openSPA('chatRoomSlidePage');
    if(typeof listenToChatMessages === 'function') listenToChatMessages();
};

window.closeChatRoom = function() {
    window.closeSPA('chatRoomSlidePage');
    if(window.activeChatListener) { window.activeChatListener(); window.activeChatListener = null; }
    window.activeChatId = null;
    if(window.cancelChatReply) window.cancelChatReply();
};

// ==========================================
// 🎭 3. التفاعلات والردود والنسخ (Interactions)
// ==========================================
window.toggleEmojiPicker = function(event) {
    event.stopPropagation();
    const picker = document.getElementById('chat-emoji-picker');
    if(picker) picker.style.display = picker.style.display === 'none' ? 'grid' : 'none';
};

window.insertChatEmoji = function(emoji) {
    const input = document.getElementById('chat-input-field');
    if(input) {
        input.value += emoji;
        input.focus();
    }
};

// دالة فتح القائمة العائمة (تم ترويضها لكي لا تبتلع الروابط 🚀)
window.openChatContextMenu = function(event, msgId, text, senderName) {
    // 🛑 مضاد التداخل: تجاهل القائمة إذا كان الهدف عنصراً تفاعلياً
    const t = event.target;
    if (t.closest('a') || t.classList.contains('chat-hashtag') || t.classList.contains('msg-media') || t.closest('.secure-file-card')) {
        return; 
    }

    event.preventDefault();
    event.stopPropagation();
    
    if(!window.chatState) window.chatState = {}; // حماية في حال عدم التعريف
    window.chatState.activeContextMenuMsgId = msgId;
    window.chatState.activeContextMenuText = text;
    window.chatState.activeContextMenuSender = senderName;

    const menu = document.getElementById('chat-context-menu');
    if(menu) {
        menu.style.display = 'flex';
        
        // ضبط موقع القائمة بذكاء لتبقى داخل حدود الرؤية
        let x = event.pageX;
        let y = event.pageY;
        if (x + 160 > window.innerWidth) x = window.innerWidth - 180;
        
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    }
};
window.copyChatText = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const text = window.chatState.activeContextMenuText;
    
    if (text && text !== "undefined") {
        navigator.clipboard.writeText(text);
        window.showToast(dict.alert_copy_success || "تم النسخ بنجاح ✅");
    } else {
        window.showToast(dict.alert_copy_empty || "لا يوجد نص لنسخه!");
    }
    
    const menu = document.getElementById('chat-context-menu');
    if(menu) menu.style.display = 'none';
};

window.initiateChatReply = function() {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    window.chatState.replyingTo = {
        msgId: window.chatState.activeContextMenuMsgId,
        text: window.chatState.activeContextMenuText,
        senderName: window.chatState.activeContextMenuSender
    };
    
    const preview = document.getElementById('chat-reply-preview');
    const previewName = document.getElementById('reply-preview-name');
    const previewText = document.getElementById('reply-preview-text');

    if(previewName) previewName.innerText = window.chatState.replyingTo.senderName;
    if(previewText) {
        // ترجمة تسمية الوسائط في الرد
        previewText.innerText = (window.chatState.replyingTo.text && window.chatState.replyingTo.text !== "undefined") 
            ? window.chatState.replyingTo.text 
            : (dict.chat_label_media || "صورة / ملف 📁");
    }
    
    if(preview) preview.style.display = 'flex';
    
    if(document.getElementById('chat-context-menu')) document.getElementById('chat-context-menu').style.display = 'none';
    if(document.getElementById('chat-input-field')) document.getElementById('chat-input-field').focus();
};

window.cancelChatReply = function() {
    window.chatState.replyingTo = null;
    const preview = document.getElementById('chat-reply-preview');
    if(preview) preview.style.display = 'none';
};

window.addChatReaction = async function(emoji) {
    const msgId = window.chatState.activeContextMenuMsgId;
    const myUid = window.auth.currentUser.uid;
    
    if(document.getElementById('chat-context-menu')) document.getElementById('chat-context-menu').style.display = 'none';
    
    try {
        // تحديث رسالة معينة لإضافة التفاعل إليها (المنطق كما هو)
        await window.db.collection("chats").doc(window.activeChatId)
            .collection("messages").doc(msgId)
            .set({
                reactions: { [myUid]: emoji }
            }, { merge: true });
    } catch(e) { console.error("Reaction Error", e); }
};
// ==========================================
// 🎬 4. العارض السينمائي المطور (زوم + تحميل)
// ==========================================
window.openChatMediaViewer = function(url, isVideo = false) {
    let scale = 1; // للزوم
    const viewerHTML = `
        <div id="chat-pro-viewer" class="chat-media-viewer">
            <div class="viewer-top-bar">
                <button class="viewer-btn" onclick="document.getElementById('chat-pro-viewer').remove()"><ion-icon name="close"></ion-icon></button>
                <button class="viewer-btn" onclick="window.downloadChatMedia('${url}')"><ion-icon name="download"></ion-icon></button>
            </div>
            
            ${isVideo ? `<video src="${url}" controls autoplay style="max-width:90%; max-height:80%; border-radius:10px;"></video>` 
                      : `<img id="viewer-zoom-img" src="${url}" style="max-width:90%; max-height:80%; border-radius:10px; transition: 0.2s;">`}
            
            ${!isVideo ? `
            <div style="position: absolute; bottom: 30px; display: flex; gap: 20px;">
                <button class="viewer-btn" onclick="window.zoomChatMedia(0.2)"><ion-icon name="add"></ion-icon></button>
                <button class="viewer-btn" onclick="window.zoomChatMedia(-0.2)"><ion-icon name="remove"></ion-icon></button>
            </div>` : ''}
        </div>`;
    
    document.body.insertAdjacentHTML('beforeend', viewerHTML);
};

window.zoomChatMedia = function(amount) {
    const img = document.getElementById('viewer-zoom-img');
    if (!img) return;
    
    let currentScale = parseFloat(img.getAttribute('data-scale')) || 1;
    currentScale += amount;
    if (currentScale > 3) currentScale = 3;
    if (currentScale < 0.5) currentScale = 0.5;
    
    img.style.transform = `scale(${currentScale})`;
    img.setAttribute('data-scale', currentScale);
};

window.downloadChatMedia = async function(url) {
    // استدعاء القاموس للرسائل التفاعلية
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    window.showToast(dict.msg_downloading || "جاري التنزيل... ⬇️");
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = "healthmate_media_" + Date.now();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch(e) {
        // رسالة الخطأ عند فشل التنزيل المباشر
        window.showToast(dict.alert_download_fail || "تعذر التنزيل المباشر، جرب الفتح في متصفح جديد ❌");
        window.open(url, '_blank');
    }
};// ==========================================
// 🛡️ 5. محرك الإرسال والفلترة (متعدد اللغات 🌍)
// ==========================================
window.sendGlobalMessage = async function(mediaData = null) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const input = document.getElementById('chat-input-field');
    const text = input.value.trim();
    if (!text && !mediaData) return;

    const now = Date.now();
    const lastTime = window.chatState.lastMessageTime || 0;
    const timeDiff = (now - lastTime) / 1000;
    
    if (timeDiff < window.chatState.cooldownSeconds) {
        const remaining = Math.ceil(window.chatState.cooldownSeconds - timeDiff);
        // استبدال النص بمتغير مترجم يدعم الثواني المتبقية
        const cooldownMsg = (dict.chat_cooldown || "انتظر (${s}s) لتجنب الزحام ⏳").replace('${s}', remaining);
        window.showToast(cooldownMsg);
        return;
    }

    if (text.length > 500) return window.showToast(dict.chat_too_long || "الرسالة طويلة جداً! أقصى حد 500 حرف 📏");

    input.value = ""; 
    window.chatState.lastMessageTime = Date.now(); 
    
    const myUid = window.auth.currentUser.uid;
    const myName = window.currentUserData?.name || dict.default_user_name || "مستخدم";

    try {
        const payload = {
            senderId: myUid,
            senderName: myName,
            text: text,
            media: mediaData,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            replyTo: window.chatState.replyingTo 
        };

        await window.db.collection("chats").doc(window.activeChatId).collection("messages").add(payload);
        window.cancelChatReply(); 

    } catch(e) { 
        window.showToast(dict.chat_send_error || "حدث خطأ أثناء الإرسال ❌"); 
        window.chatState.lastMessageTime = 0; 
    }
};

// ============================================================================
// 🛡️ محرك فلترة النصوص (Parser Engine) - النسخة العالمية 🌍
// ============================================================================
function parseChatMessageText(text) {
    if (!text) return "";
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    let safeText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    
    // الهاشتاجات (تعمل مع كل اللغات بما فيها العربية)
    safeText = safeText.replace(/(^|\s)(#[a-zA-Z\u0600-\u06FF0-9_]+)/g, `$1<span class="chat-hashtag" onclick="event.stopPropagation(); window.searchByHashtag('$2')">$2</span>`);

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const myAppDomain = window.location.hostname; 

    safeText = safeText.replace(urlRegex, function(url) {
        if (url.includes(myAppDomain) || (myAppDomain === '127.0.0.1' && url.includes('localhost'))) {
            try {
                const urlObj = new URL(url);
                const userId = urlObj.searchParams.get('user');
                const postId = urlObj.searchParams.get('post');
                
                if (userId) {
                    return `<span class="trusted-link" style="cursor:pointer; background:var(--primary); color:white;" onclick="event.stopPropagation(); window.goToFromChat('profile', '${userId}')"><ion-icon name="person-circle-outline"></ion-icon> ${dict.view_profile || 'عرض الملف الشخصي'}</span>`;
                } else if (postId) {
                    return `<span class="trusted-link" style="cursor:pointer; background:var(--primary); color:white;" onclick="event.stopPropagation(); window.goToFromChat('post', '${postId}')"><ion-icon name="document-text-outline"></ion-icon> ${dict.view_post || 'عرض المنشور'}</span>`;
                }
            } catch(e) {}
            return `<a href="${url}" class="trusted-link"><ion-icon name="link-outline"></ion-icon> ${dict.internal_link || 'رابط من التطبيق'}</a>`;
        }
        
        const isTrusted = url.includes("youtube.com") || url.includes("youtu.be") || url.includes("facebook.com") || url.includes("pubmed.gov");
        if (isTrusted) {
            return `<a href="${url}" target="_blank" class="trusted-link"><ion-icon name="link-outline"></ion-icon> ${dict.trusted_link || 'رابط موثوق'}</a>`;
        } else {
            // حماية المستخدم من الروابط غير الموثوقة مع رسالة مترجمة
            return `<span class="untrusted-link" onclick="window.showToast('${dict.untrusted_link_warn || 'حُجب لحمايتك 🛡️'}')">[${dict.hidden_link || 'رابط مخفي'}]</span>`;
        }
    });

    return safeText;
}// ============================================================================
// 📡 مستقبل الرسائل ورسام الشاشة (مع التمرير الذكي 🧠)
// ============================================================================
function listenToChatMessages() {
    const area = document.getElementById('chat-messages-area');
    // جلب القاموس الحالي
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    if(!area) return;

    area.innerHTML = `<div style="text-align:center; padding:50px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    if(window.activeChatListener) window.activeChatListener();

    window.activeChatListener = window.db.collection("chats").doc(window.activeChatId).collection("messages")
        .orderBy("timestamp", "asc")
        .onSnapshot(snap => {
            
            // 🛑 السحر هنا: فحص مكان إصبعك قبل تحديث الشاشة
            const isScrolledUp = area.scrollHeight - area.scrollTop > area.clientHeight + 150;

            area.innerHTML = "";
            if (snap.empty) {
                area.innerHTML = `<div style="text-align:center; margin-top:50px; color:var(--text-sub);"><p>${dict.empty_chat || 'لا توجد رسائل بعد. ابدأ المحادثة! 👋'}</p></div>`;
                return;
            }

            const myUid = window.auth.currentUser.uid;
            
            snap.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.senderId === myUid;
                const msgId = doc.id;
                
                let parsedText = typeof parseChatMessageText === 'function' ? parseChatMessageText(msg.text) : msg.text;

                // 🎯 صندوق الرد (مترجم)
                let replyTag = "";
                if (msg.replyTo) {
                    const replyText = (msg.replyTo.text && msg.replyTo.text !== "undefined") ? msg.replyTo.text : (dict.chat_label_media || "صورة/مرفق 📁");
                    replyTag = `
                    <div class="msg-reply-snippet" onclick="window.showToast('${dict.chat_go_to_original || 'سيتم نقلك للرسالة الأصلية 🚀'}')">
                        <strong style="color:var(--primary);">${msg.replyTo.senderName}</strong><br>
                        <span style="font-size:11px;">${replyText}</span>
                    </div>`;
                }

                // 🎯 رسم المرفقات (مترجم)
                let mediaTag = "";
                if(msg.media) {
                    if (msg.media.type === 'image') {
                        mediaTag = `<img src="${msg.media.url}" class="msg-media" onclick="event.stopPropagation(); window.openChatMediaViewer('${msg.media.url}')">`;
                    } else if (msg.media.type === 'video') {
                        mediaTag = `<div style="position:relative;" onclick="event.stopPropagation(); window.openChatMediaViewer('${msg.media.url}', true)"><video src="${msg.media.url}" class="msg-media"></video><ion-icon name="play-circle" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-size:40px; color:white; pointer-events:none;"></ion-icon></div>`;
                    } else if (msg.media.type === 'document') {
                        mediaTag = `
                        <div class="secure-file-card" onclick="event.stopPropagation(); window.open('${msg.media.url}', '_blank')">
                            <ion-icon name="document-text" style="font-size:30px; color:${isMe ? 'white' : '#6366f1'};"></ion-icon>
                            <div style="flex:1; overflow:hidden;">
                                <div style="font-weight:bold; font-size:12px; white-space:nowrap; text-overflow:ellipsis;">${msg.media.fileName || (dict.secure_file_label || 'ملف آمن')}</div>
                                <div style="font-size:10px; opacity:0.8;">${dict.click_to_download || 'اضغط للتحميل ⬇️'}</div>
                            </div>
                        </div>`;
                    }
                }

                // 🎯 رسم التفاعلات
                let reactionTag = "";
                if (msg.reactions) {
                    const uniqueEmojis = [...new Set(Object.values(msg.reactions))];
                    if (uniqueEmojis.length > 0) {
                        reactionTag = `<div class="msg-reactions-badge">${uniqueEmojis.join(' ')}</div>`;
                    }
                }

                // 🔥 فتح البروفايل (مترجم)
                let senderNameTag = "";
                if (window.activeChatId === "global_medical_room" && !isMe) {
                    senderNameTag = `
                    <div onclick="event.stopPropagation(); window.goToFromChat('profile', '${msg.senderId}')" style="display:flex; align-items:center; gap:5px; margin-bottom:5px; cursor:pointer; padding-bottom:3px; border-bottom:1px solid rgba(0,0,0,0.05); z-index:10; position:relative;">
                        <ion-icon name="person-circle" style="font-size:18px; color:var(--primary);"></ion-icon>
                        <strong style="font-size:13px; color:var(--primary);">${msg.senderName || (dict.default_user_name || 'مستخدم')}</strong>
                    </div>`;
                }
                
                const safeTextArg = msg.text ? msg.text.replace(/'/g, "\\'") : '';
                const clickEvent = `onclick="window.openChatContextMenu(event, '${msgId}', '${safeTextArg}', '${msg.senderName}')"`;

                area.innerHTML += `
                    <div class="chat-msg ${isMe ? 'msg-mine' : 'msg-other'}" id="msg-${msgId}" ${clickEvent} style="cursor:pointer; position: relative; margin-bottom: 20px;">
                        ${senderNameTag}
                        ${replyTag}
                        ${mediaTag}
                        ${parsedText ? `<div>${parsedText}</div>` : ''}
                        <span class="msg-time">${window.timeAgo ? window.timeAgo(msg.timestamp) : (dict.time_now || 'الآن')}</span>
                        ${reactionTag}
                    </div>
                `;
            });

            // 🛑 التمرير الذكي
            setTimeout(() => { 
                if (!isScrolledUp) {
                    area.scrollTop = area.scrollHeight; 
                }
            }, 100);
        });
}// دوال الرفع السحابي باقية كما هي لتعمل بسلام
window.handleChatMediaUpload = async function(e) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const f = e.target.files[0]; if(!f) return;
    
    window.showToast(dict.msg_uploading || "جاري الرفع... 🚀");
    
    try { 
        const url = await window.cloudinaryEngine.uploadFile(f); 
        if(url) await window.sendGlobalMessage({ type: f.type.startsWith('image') ? 'image' : 'video', url: url }); 
    } catch(err) {
        console.error("Upload Error:", err);
    } 
    e.target.value = '';
};

window.handleSecureFileUpload = async function(e) {
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    const f = e.target.files[0]; if(!f) return;
    
    window.showToast(dict.msg_scanning_upload || "جاري فحص ورفع الملف... 🔒");
    
    try { 
        const url = await window.cloudinaryEngine.uploadFile(f); 
        if(url) await window.sendGlobalMessage({ type: 'document', url: url, fileName: f.name }); 
    } catch(err) {
        console.error("Secure Upload Error:", err);
    } 
    e.target.value = '';
};

// 🪄 دالة سحرية لفتح البروفايلات والمنشورات فوق الشات (بدون إغلاق الشات وبدون أشباح)
window.goToFromChat = function(action, id) {
    // 1. تحديد الشاشة بناءً على الكود الحقيقي
    let targetSlideId = action === 'profile' ? 'profileSlidePage' : 'postDetailsSlidePage';
    let targetSlide = document.getElementById(targetSlideId);

    // 2. إعطاء الشاشة قوة مطلقة لتظهر فوق الشات
    if (targetSlide) {
        targetSlide.style.zIndex = '10005';
    }

    // 3. فتح البروفايل أو المنشور بشكل طبيعي
    if (action === 'profile' && window.openProfileSlide) window.openProfileSlide(id);
    if (action === 'post' && window.openPostDetailsSlide) window.openPostDetailsSlide(id);

    // 4. زرع مراقب لزر "الرجوع" داخل هذه الشاشة بالتحديد
    setTimeout(() => {
        if (targetSlide) {
            let backBtn = targetSlide.querySelector('.back-btn-circle');
            if (backBtn) {
                const cleanup = () => {
                    setTimeout(() => { 
                        if (targetSlide) targetSlide.style.zIndex = ''; 
                    }, 400);
                    backBtn.removeEventListener('click', cleanup);
                };
                backBtn.addEventListener('click', cleanup);
            }
        }
    }, 500); 
};

// ============================================================================
// 🔔 1. نظام مراقبة الإشعارات الفوري (النقاط الحمراء وتلوين البطاقات)
// ============================================================================
window.initInboxNotifications = function() {
    if (!window.auth || !window.auth.currentUser) return;
    const myUid = window.auth.currentUser.uid;

    window.db.collection("chats")
        .where("participants", "array-contains", myUid)
        .onSnapshot(snap => {
            let totalUnread = 0;
            let peersUnread = 0;
            let patientsUnread = 0;

            snap.forEach(doc => {
                const chat = doc.data();
                if (doc.id === "global_medical_room") return; // تجاهل الغرفة العامة لكي لا ينزعج الطبيب

                const unreadCount = chat[`unread_${myUid}`] || 0;
                
                if (unreadCount > 0) {
                    totalUnread += unreadCount;
                    
                    // تحديد هوية الطرف الآخر (طبيب أم مريض)
                    const otherUid = chat.participants.find(id => id !== myUid);
                    // جلب الرتبة من بيانات الغرفة المخزنة (أداء أسرع من جلبها من ملف المستخدم)
                    const otherRole = chat.usersData && chat.usersData[otherUid] ? chat.usersData[otherUid].role : 'patient';
                    
                    if (otherRole === 'doctor' || otherRole === 'pharmacist' || otherRole === 'طبيب' || otherRole === 'صيدلي') {
                        peersUnread += unreadCount;
                    } else {
                        patientsUnread += unreadCount;
                    }
                }
            });

            // 1. تحديث أيقونة الهيدر العلوية (النقطة الحمراء العامة)
            const headerBadge = document.getElementById('global-chat-badge');
            if (headerBadge) {
                headerBadge.style.display = totalUnread > 0 ? 'block' : 'none';
                if(totalUnread > 0) headerBadge.innerText = totalUnread > 9 ? "+9" : totalUnread;
            }

            // 2. تحديث بطاقة "زملاء المهنة" في اللوبي
            const peersBadge = document.getElementById('badge-peers');
            const peersCard = document.getElementById('lobby-card-peers');
            if (peersBadge) peersBadge.style.display = peersUnread > 0 ? 'block' : 'none';
            if (peersCard) {
                if (peersUnread > 0) peersCard.classList.add('has-unread');
                else peersCard.classList.remove('has-unread');
            }

            // 3. تحديث بطاقة "الاستشارات / المرضى"
            const patientsBadge = document.getElementById('badge-patients');
            const patientsCard = document.getElementById('lobby-card-patients');
            if (patientsBadge) patientsBadge.style.display = patientsUnread > 0 ? 'block' : 'none';
            if (patientsCard) {
                if (patientsUnread > 0) patientsCard.classList.add('has-unread');
                else patientsCard.classList.remove('has-unread');
            }
        });
};

// ============================================================================
// 📥 2. رسم صندوق الوارد (الإنبوكس بدون دمار)
// ============================================================================
window.showInboxView = async function(type) {
    const inboxList = document.getElementById('inbox-list');
    if (!inboxList || !window.auth.currentUser) return;

    const myUid = window.auth.currentUser.uid;
    const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
    
    // إخفاء اللوبي وإظهار قائمة الرسائل
    if(document.getElementById('chat-lobby-view')) document.getElementById('chat-lobby-view').style.display = 'none';
    if(document.getElementById('chat-inbox-view')) document.getElementById('chat-inbox-view').style.display = 'block';

    inboxList.innerHTML = `<div style="text-align:center; padding:50px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon></div>`;

    window.db.collection("chats")
        .where("participants", "array-contains", myUid)
        .orderBy("lastMessageTime", "desc")
        .onSnapshot(snap => {
            inboxList.innerHTML = "";
            if (snap.empty) {
                inboxList.innerHTML = `
                    <div style="text-align:center; padding:50px; color:var(--text-sub); opacity:0.6;">
                        <ion-icon name="mail-open-outline" style="font-size:50px;"></ion-icon>
                        <p>${dict.no_previous_messages || 'لا توجد رسائل سابقة.'}</p>
                    </div>`;
                return;
            }

            snap.forEach(doc => {
                const chat = doc.data();
                if (doc.id === "global_medical_room") return;

                const otherUid = chat.participants.find(id => id !== myUid);
                const otherData = chat.usersData ? chat.usersData[otherUid] : {};
                const otherRole = otherData.role || 'patient';
                const unreadCount = chat[`unread_${myUid}`] || 0;

                // تصفية المحادثات حسب النوع (زملاء مهنة أم مرضى)
                const isPeerChat = (otherRole === 'doctor' || otherRole === 'pharmacist' || otherRole === 'طبيب' || otherRole === 'صيدلي');
                if ((type === 'peers' && !isPeerChat) || (type === 'patients' && isPeerChat)) return;

                // رسم الكارت بالتنسيق الجديد مع دعم الترجمة
                const cardHTML = `
                    <div class="inbox-card" onclick="window.markAsRead('${doc.id}'); window.openPrivateChat('${otherUid}', '${(otherData.name || dict.default_user_name || 'مستخدم').replace(/'/g, "\\'")}', '${otherData.photoURL || 'assets/img/profile.png'}')">
                        <img src="${otherData.photoURL || 'assets/img/profile.png'}" class="inbox-avatar">
                        <div class="inbox-info">
                            <div class="inbox-header">
                                <strong>${otherData.name || dict.default_user_name || 'مستخدم'}</strong>
                                <span class="inbox-time">${chat.lastMessageTime ? window.timeAgo(chat.lastMessageTime) : (dict.time_now || 'الآن')}</span>
                            </div>
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <p class="inbox-last-msg">${chat.lastMessage || dict.chat_label_media || 'مرفق 📁'}</p>
                                ${unreadCount > 0 ? `<div class="unread-dot"></div>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                inboxList.insertAdjacentHTML('beforeend', cardHTML);
            });
        });
};

window.markAsRead = async function(chatId) {
    if (!window.auth.currentUser) return;
    const myUid = window.auth.currentUser.uid;
    try { 
        // تصفير عداد غير المقروء لهذا المستخدم في هذه المحادثة
        await window.db.collection("chats").doc(chatId).update({ [`unread_${myUid}`]: 0 }); 
    } catch(e) { console.error("Mark Read Error:", e); }
};
// ============================================================================
// 👨‍⚕️ محرك استشارات الطبيب المستقل (Doctor-Patient Chat Engine PRO)
// ============================================================================
window.DoctorPatientChatSystem = {
    activeChatId: null,
    activePatientId: null,
    listener: null,
    accessListener: null,

    // 1. فتح صندوق الوارد الخاص بالمرضى (بأسماء حقيقية 100%)
    openInbox: function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        window.openSPA('doctor-patient-inbox-slide');
        const myUid = firebase.auth().currentUser.uid;
        const listDiv = document.getElementById('doc-patients-list');
        
        // استخدام القاموس لرسالة التحميل
        listDiv.innerHTML = `<div style="text-align:center; padding:30px;"><ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--blue);"></ion-icon><p style="color:#888; font-size:12px; margin-top:10px;">${dict.fetching_real_names || 'جاري جلب الأسماء الحقيقية...'}</p></div>`;

        // جلب الرسائل
        firebase.firestore().collection("chats")
            .where("participants", "array-contains", myUid)
            .onSnapshot(async snap => {
                let chatsArray = [];
                snap.forEach(doc => {
                    let data = doc.data();
                    data.docId = doc.id;
                    chatsArray.push(data);
                });

                // ترتيب من الأحدث للأقدم
                chatsArray.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

                let htmlContent = "";

                // 🚨 السحر هنا: جلب البيانات الحقيقية من كوليكشن المستخدمين!
                for (let chat of chatsArray) {
                    const patientUid = chat.participants.find(id => id !== myUid);
                    
                    let realName = dict.patient_label || "مريض";
                    let realImg = "assets/img/profile.png";
                    let realRole = "patient";

                    try {
                        // جلب بروفايل المريض الحقيقي من قاعدة البيانات
                        const uDoc = await firebase.firestore().collection("users").doc(patientUid).get();
                        if (uDoc.exists) {
                            realName = uDoc.data().name || (dict.patient_label || "مريض");
                            realImg = uDoc.data().photoURL || "assets/img/profile.png";
                            realRole = uDoc.data().role || "patient";
                        }
                    } catch(e) { console.error(e); }

                    // فلترة: إظهار المرضى فقط
                    if(realRole !== 'patient') continue;

                    // ترجمة حالة الوصول الطبي
                    const accessText = chat.medicalAccess 
                        ? (dict.access_granted || '🔓 سمح بالوصول') 
                        : (dict.access_locked || '🔒 ملف مغلق');

                    htmlContent += `
                        <div class="inbox-card" onclick="window.DoctorPatientChatSystem.openRoom('${patientUid}', '${realName}', '${realImg}', '${chat.docId}')">
                            <img src="${realImg}" class="inbox-avatar">
                            <div class="inbox-info">
                                <div class="inbox-header">
                                    <strong>${realName}</strong>
                                    <span class="inbox-time" style="font-size:12px;">${accessText}</span>
                                </div>
                                <p class="inbox-last-msg">${chat.lastMessage || (dict.new_consultation || 'استشارة جديدة...')}</p>
                            </div>
                        </div>
                    `;
                }
                
                listDiv.innerHTML = htmlContent || `<p style='text-align:center; color:#888;'>${dict.no_consultations || 'لا توجد استشارات حالياً.'}</p>`;
            });
    },
// 2. الدخول لغرفة المريض
    openRoom: function(patientUid, patientName, patientImg, chatId) {
        this.activeChatId = chatId;
        this.activePatientId = patientUid;

        const nameEl = document.getElementById('d-chat-name');
        const imgEl = document.getElementById('d-chat-avatar');

        if(nameEl) nameEl.innerText = patientName;
        if(imgEl) imgEl.src = patientImg;
        
        window.openSPA('doctor-patient-chat-room');

        this.listenToMessages();
        this.watchMedicalAccess();
    },

    // 3. إغلاق الغرفة
    closeRoom: function() {
        if(this.listener) this.listener();
        if(this.accessListener) this.accessListener();
        this.activeChatId = null;
        this.activePatientId = null;
        window.closeSPA('doctor-patient-chat-room');
    },

    // 4. مراقبة إذن المريض (هل سمح لي برؤية ملفه؟)
    watchMedicalAccess: function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const btnOpenCloud = document.getElementById('d-view-cloud-btn');
        const lockedText = document.getElementById('d-locked-cloud');

        this.accessListener = firebase.firestore().collection("chats").doc(this.activeChatId).onSnapshot(doc => {
            if(!doc.exists) return;
            const hasAccess = doc.data().medicalAccess === true;
            
            // تحديث نص "الملف مغلق" من القاموس إذا كان العنصر موجوداً
            if(lockedText) {
                lockedText.innerHTML = `<ion-icon name="lock-closed"></ion-icon> ${dict.medical_access_locked || 'الملف الطبي مغلق حالياً'}`;
            }

            // إذا وافق المريض -> أظهر الزر الأخضر. إذا رفض -> أظهر القفل الأحمر.
            if(hasAccess) {
                if(btnOpenCloud) btnOpenCloud.style.display = 'flex';
                if(lockedText) lockedText.style.display = 'none';
            } else {
                if(btnOpenCloud) btnOpenCloud.style.display = 'none';
                if(lockedText) lockedText.style.display = 'flex';
            }
        });
    },// 5. 🚀 الحدث الأسطوري: فتح ملف المريض السحابي!
    viewPatientCloud: function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        if(!this.activePatientId) return;
        
        // 1. تشغيل محركك الأصلي وتمرير ID المريض
        if (window.cloudFolderEngine && typeof window.cloudFolderEngine.init === 'function') {
            window.cloudFolderEngine.init(this.activePatientId);
            
            // 🚨 هنا نضع ID الشاشة في الـ HTML وليس قاعدة البيانات!
            window.openSPA('patient-cloud-slide'); 
            
            window.showToast(dict.patient_cloud_opened || "تم فتح ملف المريض بصلاحية القراءة فقط 📁");
        } else {
            window.showToast(dict.cloud_engine_not_found || "لم يتم العثور على محرك السحابة ⚠️");
        }
    },

    // 6. استماع الرسائل (نفس نظام المريض تماماً)
    listenToMessages: function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const myUid = firebase.auth().currentUser.uid;
        const area = document.getElementById('d-chat-messages');
        
        if(area) {
            area.innerHTML = `<p style="text-align:center; color:#888;">${dict.loading || 'جاري التحميل...'}</p>`;
        }

        this.listener = firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages")
            .orderBy("timestamp", "asc")
            .onSnapshot(snap => {
                if(!area) return;
                area.innerHTML = "";
                snap.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.senderId === myUid;
                    
                    // استخدام التوقيت المحلي من القاموس أو الافتراضي
                    const time = msg.timestamp 
                        ? new Date(msg.timestamp.toDate()).toLocaleTimeString(localStorage.getItem('app_lang') === 'en' ? 'en-US' : 'ar-EG', {hour:'2-digit', minute:'2-digit'}) 
                        : (dict.time_now || 'الآن');

                    let mediaHtml = '';
                    if(msg.mediaUrl) {
                        mediaHtml = `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:10px; margin-bottom:5px; cursor:pointer;" onclick="window.openMediaViewer('${msg.mediaUrl}')">`;
                    }

                    area.innerHTML += `
                        <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 75%; background: ${isMe ? 'var(--blue)' : '#222'}; color: ${isMe ? '#000' : '#fff'}; padding: 10px 15px; border-radius: ${isMe ? '15px 15px 0 15px' : '15px 15px 15px 0'}; position: relative; display: flex; flex-direction: column; margin-bottom: 10px;">
                            ${mediaHtml}
                            <div style="font-size: 14px; line-height: 1.5; word-wrap: break-word;">${msg.text || ''}</div>
                            <div style="font-size: 10px; text-align: ${isMe ? 'left' : 'right'}; opacity: 0.7; margin-top: 5px;">${time}</div>
                        </div>
                    `;
                });
                setTimeout(() => { area.scrollTop = area.scrollHeight; }, 100);
            });
    },
// 7. إرسال رسالة
    sendMessage: async function() {
        if(!this.activeChatId) return;
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const input = document.getElementById('d-chat-input');
        const text = input.value.trim();
        if(text === "") return;

        input.value = ""; 

        try {
            await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add({
                senderId: firebase.auth().currentUser.uid,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                lastMessage: text,
                lastMessageTime: Date.now()
            });
        } catch (e) { 
            console.error(e); 
            window.showToast(dict.send_error || "حدث خطأ أثناء الإرسال ❌");
        }
    },

    // 8. إرسال صورة (Base64)
    uploadMedia: async function(event) {
        if(!this.activeChatId) return;
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const file = event.target.files[0];
        if (!file) return;

        window.showToast(dict.sending_msg || "جاري الإرسال... 🚀");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            try {
                await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add({
                    senderId: firebase.auth().currentUser.uid,
                    text: "",
                    mediaUrl: e.target.result,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                    lastMessage: dict.last_msg_photo || "صورة 🖼️",
                    lastMessageTime: Date.now()
                });
            } catch (err) { 
                window.showToast(dict.img_too_big || "حجم الصورة كبير جداً ❌"); 
            }
            event.target.value = '';
        };
    }
};
// ============================================================================
// 🤝 محرك دردشة الزملاء المستقل (Peer-to-Peer Chat Engine PRO)
// ============================================================================

window.PeerChatSystem = {
    activeChatId: null,
    listener: null,

    // 1. فتح صندوق الوارد للزملاء (بأسماء ورتب حقيقية)
    openInbox: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        window.openSPA('peer-inbox-slide');
        const myUid = firebase.auth().currentUser.uid;
        const listDiv = document.getElementById('peer-list-container');
        
        listDiv.innerHTML = `
            <div style="text-align:center; padding:30px;">
                <ion-icon name="sync" style="animation: spin 1s infinite; font-size:30px; color:var(--primary);"></ion-icon>
                <p style="color:#888; font-size:12px; margin-top:10px;">${dict.fetching_names || 'جاري جلب الأسماء الحقيقية...'}</p>
            </div>`;

        firebase.firestore().collection("chats")
            .where("participants", "array-contains", myUid)
            .onSnapshot(async snap => {
                let chatsArray = [];
                snap.forEach(doc => {
                    let data = doc.data();
                    data.docId = doc.id;
                    chatsArray.push(data);
                });

                chatsArray.sort((a, b) => (b.lastMessageTime || 0) - (a.lastMessageTime || 0));

                let htmlContent = "";

                // 🚨 جلب بيانات الزملاء الحقيقية!
                for (let chat of chatsArray) {
                    const otherUid = chat.participants.find(id => id !== myUid);
                    
                    let realName = dict.peer_default_name || "زميل";
                    let realImg = "assets/img/profile.png";
                    let realRole = "doctor";

                    try {
                        const uDoc = await firebase.firestore().collection("users").doc(otherUid).get();
                        if (uDoc.exists) {
                            realName = uDoc.data().name || realName;
                            realImg = uDoc.data().photoURL || "assets/img/profile.png";
                            realRole = uDoc.data().role || "doctor";
                        }
                    } catch(e) {}

                    // 🚨 فلترة: إظهار الأطباء والصيادلة فقط
                    if(realRole === 'patient') continue; 

                    const roleName = realRole === 'pharmacist' ? (dict.role_pharmacist || 'صيدلي') : (dict.role_doctor || 'طبيب');

                    htmlContent += `
                        <div class="inbox-card" onclick="window.PeerChatSystem.openRoom('${otherUid}', '${realName.replace(/'/g, "\\'")}', '${realImg}', '${chat.docId}', '${roleName}')">
                            <img src="${realImg}" class="inbox-avatar" style="border-color: var(--primary);">
                            <div class="inbox-info">
                                <div class="inbox-header">
                                    <strong>${dict.dr_prefix || 'د.'} ${realName}</strong>
                                    <span class="inbox-time" style="font-size:12px; color:var(--primary);">${roleName}</span>
                                </div>
                                <p class="inbox-last-msg">${chat.lastMessage || (dict.start_conversation || 'بدء المحادثة...')}</p>
                            </div>
                        </div>
                    `;
                }
                
                listDiv.innerHTML = htmlContent || `<p style='text-align:center; color:#888; padding: 40px;'>${dict.no_peer_conversations || 'لا توجد محادثات مع زملاء حتى الآن.'}</p>`;
            });
    },
// 2. الدخول لغرفة الزميل
    openRoom: function(targetUid, targetName, targetImg, chatId, roleName) {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        this.activeChatId = chatId;

        // دمج بادئة الطبيب المترجمة مع الاسم
        document.getElementById('peer-chat-name').innerText = (dict.dr_prefix || "د. ") + targetName;
        document.getElementById('peer-chat-role').innerText = roleName;
        document.getElementById('peer-chat-avatar').src = targetImg;
        
        window.openSPA('peer-chat-room');
        this.listenToMessages();
    },

    // 3. إغلاق الغرفة
    closeRoom: function() {
        if(this.listener) this.listener();
        this.activeChatId = null;
        window.closeSPA('peer-chat-room');
    },

    // 4. استماع الرسائل (مع دعم عارض الصور الخاص بك)
    listenToMessages: function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const myUid = firebase.auth().currentUser.uid;
        const area = document.getElementById('peer-chat-messages');
        
        if(area) {
            area.innerHTML = `<p style="text-align:center; color:#888;">${dict.loading || 'جاري التحميل...'}</p>`;
        }

        this.listener = firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages")
            .orderBy("timestamp", "asc")
            .onSnapshot(snap => {
                if(!area) return;
                area.innerHTML = "";
                snap.forEach(doc => {
                    const msg = doc.data();
                    const isMe = msg.senderId === myUid;
                    
                    // تحويل التوقيت بناءً على لغة التطبيق
                    const timeLocale = localStorage.getItem('app_lang') === 'en' ? 'en-US' : 'ar-EG';
                    const time = msg.timestamp 
                        ? new Date(msg.timestamp.toDate()).toLocaleTimeString(timeLocale, {hour:'2-digit', minute:'2-digit'}) 
                        : (dict.time_now || 'الآن');

                    let mediaHtml = '';
                    if(msg.mediaUrl) {
                        mediaHtml = `<img src="${msg.mediaUrl}" style="max-width:100%; border-radius:10px; margin-bottom:5px; cursor:pointer;" onclick="window.openMediaViewer('${msg.mediaUrl}')">`;
                    }

                    area.innerHTML += `
                        <div style="align-self: ${isMe ? 'flex-end' : 'flex-start'}; max-width: 75%; background: ${isMe ? 'var(--primary)' : 'var(--card-bg)'}; color: ${isMe ? '#fff' : 'var(--text-main)'}; padding: 10px 15px; border-radius: ${isMe ? '15px 15px 0 15px' : '15px 15px 15px 0'}; position: relative; border: 1px solid ${isMe ? 'transparent' : 'var(--border-app)'}; margin-bottom: 10px; display: flex; flex-direction: column;">
                            ${mediaHtml}
                            <div style="font-size: 14px; line-height: 1.5; word-wrap: break-word;">${msg.text || ''}</div>
                            <div style="font-size: 10px; text-align: ${isMe ? 'left' : 'right'}; opacity: 0.7; margin-top: 5px;">${time}</div>
                        </div>
                    `;
                });
                setTimeout(() => { area.scrollTop = area.scrollHeight; }, 100);
            });
    },// 5. إرسال رسالة
    sendMessage: async function() {
        if(!this.activeChatId) return;
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const input = document.getElementById('peer-chat-input');
        const text = input.value.trim();
        if(text === "") return;

        input.value = ""; 

        try {
            await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add({
                senderId: firebase.auth().currentUser.uid,
                text: text,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                lastMessage: text,
                lastMessageTime: Date.now()
            });
        } catch (e) { console.error(e); }
    },

    // 6. إرسال المرفقات (صور/روشتات)
    uploadMedia: async function(event) {
        if(!this.activeChatId) return;
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const file = event.target.files[0];
        if (!file) return;

        window.showToast(dict.sending_msg || "جاري الإرسال... 🚀");
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (e) => {
            try {
                await firebase.firestore().collection("chats").doc(this.activeChatId).collection("messages").add({
                    senderId: firebase.auth().currentUser.uid,
                    text: "",
                    mediaUrl: e.target.result,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
                await firebase.firestore().collection("chats").doc(this.activeChatId).update({
                    lastMessage: dict.medical_attachment || "مرفق طبي 🖼️",
                    lastMessageTime: Date.now()
                });
            } catch (err) { window.showToast(dict.upload_fail || "فشل الرفع ❌"); }
            event.target.value = '';
        };
    }
};
// ============================================================================
// ☁️ محرك الملفات السحابية (Cloud Folder Engine)
// ============================================================================

window.cloudFolderEngine = {
    // تشغيل المحرك وجلب ملفات المريض
    init: function(targetPatientId = null) {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const listDiv = document.getElementById('cloud-files-list');
        const currentUser = window.firebase.auth().currentUser;
        
        if (!currentUser) return;

        const uidToFetch = targetPatientId || currentUser.uid;
        const isDoctorViewing = (targetPatientId !== null && targetPatientId !== currentUser.uid);

        const uploadButtons = document.getElementById('cloud-upload-buttons');
        if (uploadButtons) uploadButtons.style.display = isDoctorViewing ? 'none' : 'flex';

        // أيقونة التحميل
        listDiv.innerHTML = `<div style="text-align:center; padding:30px; color:#888;"><ion-icon name="sync" style="animation: spin 1s linear infinite; font-size: 30px;"></ion-icon></div>`;

        // 🚨 التعديل المطلوب: تم سحب orderBy لاختبار الفايربيس (يبقى كما هو)
        window.firebase.firestore().collection('cloud_medical_files')
            .where('patientId', '==', uidToFetch)
            .onSnapshot(snap => {
                listDiv.innerHTML = '';
                if (snap.empty) {
                    // رسائل الحالة الفارغة المترجمة
                    const emptyMsg = isDoctorViewing 
                        ? (dict.cloud_empty_doctor || 'المريض لم يقم برفع أي ملفات طبية بعد.') 
                        : (dict.cloud_empty_patient || 'ملفك السحابي فارغ. ابدأ برفع تحاليلك الآن!');
                    
                    listDiv.innerHTML = `
                        <div style="text-align:center; padding:30px; color:var(--text-sub); opacity: 0.6;">
                            <ion-icon name="cloud-offline-outline" style="font-size: 60px;"></ion-icon>
                            <p>${emptyMsg}</p>
                        </div>`;
                    return;
                }

                snap.forEach(doc => {
                    const file = doc.data();
                    const fileId = doc.id;
                    const dateLocale = localStorage.getItem('app_lang') === 'en' ? 'en-US' : 'ar-EG';
                    const date = file.timestamp ? file.timestamp.toDate().toLocaleDateString(dateLocale) : (dict.time_now || 'الآن');

                    const deleteBtn = isDoctorViewing ? '' : `<ion-icon name="trash" style="color: var(--red); font-size: 22px; padding: 10px; cursor: pointer;" onclick="window.cloudFolderEngine.deleteFile('${fileId}')"></ion-icon>`;

                    listDiv.innerHTML += `
                        <div class="cloud-file-card" style="background:var(--card-bg); padding:10px; border-radius:12px; border:1px solid var(--border-app); text-align:center;">
                            <img src="${file.fileUrl}" onclick="window.cloudFolderEngine.openFile('${file.fileUrl}', true)" style="width:100%; height:100px; object-fit:cover; border-radius:8px; cursor:pointer;">
                            <div class="cloud-file-info" style="margin-top:10px;">
                                <h4 style="margin:0; font-size:14px; color:var(--text-main);">${file.type}</h4>
                                <p style="margin:5px 0 0; font-size:11px; color:var(--text-sub);"><ion-icon name="calendar-outline"></ion-icon> ${date}</p>
                            </div>
                            ${deleteBtn}
                        </div>
                    `;
                });
            }, error => {
                console.error("Firebase Error:", error);
                listDiv.innerHTML = `<p style="color:var(--red); text-align:center;">${dict.firebase_error || 'حدث خطأ في الفايربيس!'}</p>`;
            });
    },

    // دالة فتح الملف عند الضغط عليه
    openFile: function(url, isImage) {
        if (isImage) {
            if (typeof window.openChatMediaViewer === 'function') {
                window.openChatMediaViewer(url);
            } else if (typeof window.openMediaViewer === 'function') {
                window.openMediaViewer(url);
            } else {
                window.open(url, '_blank');
            }
        } else {
            window.open(url, '_blank');
        }
    }
};