// ====================================================================================
// 🏞️ محرك الزوم السينمائي والاحترافي (طبق الأصل من فيسبوك)
// ====================================================================================

// --- دالة تحميل الصور المدمجة (مضادة للانهيار) ⬇️ ---
window.downloadViewerImage = async function(url) {
    window.showToast("جاري تنزيل الصورة... ⬇️");
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = "Healthmate_" + Date.now() + ".jpg";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch(e) {
        window.open(url, '_blank'); // خطة بديلة لو فشل التحميل الصامت
    }
};

window.RoyalMediaViewer = (function() {
    
    // عناصر الواجهة
    const elements = {};
    
    // متغيرات حالة الزوم
    let state = {
        isPinching: false,
        initialDistance: 0,
        currentScale: 1,
        initialScale: 1,
        maxScale: 3,
        minScale: 1,
        currentTranslateX: 0,
        currentTranslateY: 0
    };

    // --- 1. دوال اكتشاف المسافة بين الإصبعين ---
    const getDistance = (touches) => {
        return Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
    };

    const getCenter = (touches) => {
        return {
            x: (touches[0].pageX + touches[1].pageX) / 2,
            y: (touches[0].pageY + touches[1].pageY) / 2
        };
    };

    // --- 2. محرك التحديث البصري (طبق الأصل في السينمائية) ---
    const updateTransform = () => {
        elements.image.style.transform = `scale(${state.currentScale}) translate(0px, 0px)`;
    };

    // --- 3. معالجة بداية لمس الأصابع (TouchStart) ---
    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            state.isPinching = true;
            state.initialDistance = getDistance(e.touches);
            state.initialScale = state.currentScale;
            
            // 🚨 تطبيق سحر فيسبوك: إخفاء الواجهة (❌/.../اللايكات) فوراً 🚨
            elements.container.classList.add('zooming');

            // إخفاء قائمة (الثلاث نقاط) إذا كانت مفتوحة عند بدء الزوم
            const dropdown = document.getElementById('viewer-options-dropdown');
            if(dropdown) dropdown.remove();
        }
    };

    // --- 4. معالجة حركة الأصابع (TouchMove) - حساب التكبير بدقة ---
    const handleTouchMove = (e) => {
        if (state.isPinching && e.touches.length === 2) {
            e.preventDefault();
            
            const currentDistance = getDistance(e.touches);
            const scaleFactor = currentDistance / state.initialDistance;
            
            // حساب الزوم الجديد بدقة
            let newScale = state.initialScale * scaleFactor;
            
            // تطبيق الحدود (ما بين 1x إلى 3x)
            newScale = Math.max(state.minScale, Math.min(newScale, state.maxScale));
            
            state.currentScale = newScale;
            updateTransform();
        }
    };

    // --- 5. معالجة نهاية لمس الأصابع (TouchEnd) - إعادة الواجهة ---
    const handleTouchEnd = (e) => {
        if (state.isPinching) {
            // إذا كان الزوم صغيراً جداً، نعيده للوضع الأصلي (1x)
            if (state.currentScale <= 1.1) {
                state.currentScale = 1;
                // إعادة الأزرار (Fading) بضهور ناعم 🚨
                elements.container.classList.remove('zooming');
            }
            updateTransform();
            state.isPinching = false;
        }
    };

    // --- 6. دالة الفتح المركزية ---
    const openViewer = async (imageUrl, postId) => {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const container = document.getElementById('mediaViewer');
        const img = document.getElementById('viewerImage');
        const likesCountEl = document.getElementById('viewerLikesCount');
        const optionsBtn = document.getElementById('viewerOptionsBtn');
        const footer = document.getElementById('viewerFooter');

        if(!container || !img) return;

        // ربط المحرك بالعناصر مرة واحدة
        elements.container = container;
        elements.image = img;
        elements.gestureDetector = document.getElementById('viewerGestureDetector');

        // إعادة ضبط الزوم (تصفير كل شيء)
        state.currentScale = 1;
        updateTransform();
        container.classList.remove('zooming'); // إعادة الواجهة العلوية

        // إزالة أي قائمة خيارات قديمة قد تكون معلقة
        const oldDropdown = document.getElementById('viewer-options-dropdown');
        if(oldDropdown) oldDropdown.remove();

        // تحميل الصورة الجديدة
        img.src = imageUrl;
        window.viewerCurrentPostId = postId;

        // 🚨 برمجة زر الثلاث نقاط (تحميل + إبلاغ) 🚨
        if (optionsBtn) {
            optionsBtn.onclick = (e) => {
                e.stopPropagation(); // لمنع إغلاق العارض بالخطأ
                
                let existingMenu = document.getElementById('viewer-options-dropdown');
                if (existingMenu) {
                    existingMenu.remove(); // إغلاق القائمة إذا كانت مفتوحة مسبقاً
                    return;
                }

                // إنشاء القائمة المنسدلة الأنيقة (سوداء دائماً ومضادة للوضع المشمس 🌑)
                const menuHTML = `
                   <div id="viewer-options-dropdown" style="position:absolute; top:95px; left:20px; background:rgba(25, 25, 28, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); border-radius:12px; padding:5px; box-shadow:0 10px 30px rgba(0,0,0,0.8); z-index:99999; display:flex; flex-direction:column; min-width:180px;">
                        <button onclick="window.downloadViewerImage('${imageUrl}'); document.getElementById('viewer-options-dropdown').remove();" style="background:none; border:none; color:white; padding:12px 15px; text-align:right; font-family:'Cairo'; font-size:15px; display:flex; align-items:center; gap:10px; cursor:pointer; width:100%; transition: 0.2s;">
                            <ion-icon name="download-outline" style="font-size:20px;"></ion-icon> تحميل الصورة
                        </button>
                        <div style="height:1px; background:rgba(255,255,255,0.1); margin:0 10px;"></div>
                        <button onclick="window.showToast('تم إرسال بلاغ للمراجعة 🚩'); document.getElementById('viewer-options-dropdown').remove();" style="background:none; border:none; color:#ff4b4b; padding:12px 15px; text-align:right; font-family:'Cairo'; font-size:15px; display:flex; align-items:center; gap:10px; cursor:pointer; width:100%; transition: 0.2s;">
                            <ion-icon name="flag-outline" style="font-size:20px;"></ion-icon> إبلاغ عن صورة
                        </button>
                    </div>
                `;
                document.getElementById('viewerHeader').insertAdjacentHTML('beforeend', menuHTML);
            };
        }

        // إغلاق قائمة (الثلاث نقاط) عند الضغط في أي مكان فارغ
        container.onclick = (e) => {
            if(!e.target.closest('#viewerOptionsBtn')) {
                const dropdown = document.getElementById('viewer-options-dropdown');
                if(dropdown) dropdown.remove();
            }
        };
        
        // تطبيق الأمان (نظام الطبقات🥞 - لضمان أن العارض فوق البروفايل أو المنشور)
        container.style.display = 'flex';
        window.openSPA('mediaViewer'); 

        // ربط الأصابع بمحرك التكبير (لأول مرة)
        if(!elements.gestureDetector.hasListener) {
            elements.gestureDetector.addEventListener('touchstart', handleTouchStart, { passive: false });
            elements.gestureDetector.addEventListener('touchmove', handleTouchMove, { passive: false });
            elements.gestureDetector.addEventListener('touchend', handleTouchEnd);
            elements.gestureDetector.hasListener = true;
        }

        // 🚨 جلب عدد اللايكات + التعليقات من الفايربيس (ديناميكي) 🚨
        if(postId && typeof postId === 'string' && postId.length > 5) {
            if(footer) footer.style.display = 'flex'; // إظهار الفوتر لأنها صورة منشور
            likesCountEl.innerHTML = `<ion-icon name="sync" style="animation: spin 1s linear infinite;"></ion-icon> جاري التحميل...`; 
            
            try {
                const doc = await window.db.collection("posts").doc(postId).get();
                if (doc.exists) {
                    const pData = doc.data();
                    const likesCount = pData.likes ? pData.likes.length : 0;
                    const commentsCount = pData.commentsCount || 0;
                    
                    // دمج اللايكات والتعليقات في سطر واحد فخم
                    likesCountEl.innerHTML = `
                        <span style="display:inline-flex; align-items:center; gap:4px; margin-left:15px;"><ion-icon name="heart" style="color:var(--danger);"></ion-icon> ${likesCount}</span>
                        <span style="display:inline-flex; align-items:center; gap:4px;"><ion-icon name="chatbubbles"></ion-icon> ${commentsCount}</span>
                    `;
                    
                    // تحديث لون اللايك في العارض حسب حالة المستخدم الحالي
                    const myUid = window.auth.currentUser.uid;
                    const isLiked = pData.likes && pData.likes.includes(myUid);
                    const viewerLikeBtn = document.getElementById('viewerLikeBtn');
                    if (viewerLikeBtn) {
                        viewerLikeBtn.style.color = isLiked ? 'var(--danger)' : 'white';
                        viewerLikeBtn.innerHTML = `<ion-icon name="${isLiked ? 'heart' : 'heart-outline'}"></ion-icon> ${dict.action_like || 'أعجبني'}`;
                        viewerLikeBtn.onclick = () => window.toggleFeedLike(postId, viewerLikeBtn);
                    }
                }
            } catch(e) { console.log(e); }
        } else {
            // الصورة من دردشة ولا يوجد لها بوست (نخفي الفوتر)
            if(footer) footer.style.display = 'none';
        }
    };

  // --- 7. دالة الإغلاق (القاضية والمضادة للتعليق) ---
    const closeViewer = () => {
        const container = document.getElementById('mediaViewer');
        if(container) {
            // إغلاقها من نظام الـ SPA
            window.closeSPA('mediaViewer');
            // 🚨 الضربة القاضية: إخفاء الشاشة تماماً 🚨
            container.style.display = 'none'; 
            container.classList.remove('zooming');
            
            // تنظيف قائمة الثلاث نقاط عند الإغلاق
            const dropdown = document.getElementById('viewer-options-dropdown');
            if(dropdown) dropdown.remove(); 
            
            // تفريغ الصورة لتخفيف الذاكرة
            setTimeout(() => { 
                const img = document.getElementById('viewerImage');
                if(img) img.src = ""; 
            }, 300);
        }
    };

    // الإفصاح عن الدوال العامة لكي يتم استدعاؤها من أي مكان
    return {
        open: openViewer,
        close: closeViewer
    };

})();

// 🚨 تحديث الدوال العالمية لكي يتم استدعاؤها من onclick="..." في الـ HTML 🚨
window.openMediaViewer = window.RoyalMediaViewer.open;
window.closeMediaViewer = window.RoyalMediaViewer.close;