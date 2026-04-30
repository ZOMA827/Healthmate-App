// ============================================================================
// 🛡️ محرك التوثيق الرسمي (Healthmate Verification Engine)
// ============================================================================

window.verificationEngine = {
    selectedFiles: { certificate: null, idCard: null },

    handleFileUpload: function(event, type) {
        const file = event.target.files[0];
        if(!file) return;
        this.selectedFiles[type] = file;
        
        const statusEl = document.getElementById(`status-${type}`);
        statusEl.innerHTML = `<ion-icon name="checkmark-done-circle" style="color:var(--success);"></ion-icon> تم اختيار الملف`;
    },

  submitRequest: async function() {
        const dict = window.translations[localStorage.getItem('app_lang') || 'ar'] || {};
        const { certificate, idCard } = this.selectedFiles;
        const info = document.getElementById('v-extra-info').value.trim();

        if(!certificate || !idCard) {
            return window.showToast(dict.verify_err_files || "يرجى إرفاق بطاقة التعريف وشهادة الممارسة أولاً.");
        }

        const btn = document.getElementById('v-submit-btn');
        const originalText = btn.innerHTML; // حفظ النص الأصلي للزر
        btn.disabled = true;
        btn.innerHTML = `<ion-icon name="sync" style="animation: spin 1s infinite;"></ion-icon> ${dict.saving || "جاري الإرسال..."}`;

        try {
            const myUid = window.auth.currentUser.uid;
            
            // جلب بيانات المستخدم مباشرة من قاعدة البيانات (آمن 100%)
            const userDoc = await window.db.collection("users").doc(myUid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const realName = userData.name || "مجهول";
            const realRole = userData.role || "متدرب";

            // 1. الرفع السحابي
            window.showToast(dict.saving || "جاري رفع الوثائق بأمان... 🔒");
            const certUrl = await window.cloudinaryEngine.uploadFile(certificate);
            const idUrl = await window.cloudinaryEngine.uploadFile(idCard);

            // 2. إرسال الطلب لمجموعة خاصة
            await window.db.collection("verification_requests").doc(myUid).set({
                uid: myUid,
                userName: realName,
                userRole: realRole,
                certificateUrl: certUrl,
                idCardUrl: idUrl,
                extraInfo: info,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // 🚨 3. الحل هنا: تفكيك لغم الـ Z-index وإغلاق الصفحة أولاً 🚨
            const vPage = document.getElementById('verificationSlidePage');
            if(vPage) {
                vPage.style.removeProperty('z-index');
                vPage.style.setProperty('z-index', '10005', 'important'); // إعادة الطبقة لوضعها الطبيعي
            }
            
            if(typeof window.closeSPA === 'function') {
                window.closeSPA('verificationSlidePage'); // إغلاق السلايد
            }

            // 4. إظهار رسالة النجاح المعربة بعد إغلاق الصفحة بـ 300 ملي ثانية
            setTimeout(async () => {
                await window.uiModal({
                    type: 'alert',
                    title: dict.verify_success_title || "تم الإرسال!",
                    message: dict.verify_success_msg || "تم إرسال وثائقك بنجاح. سيقوم فريقنا بمراجعتها وتوثيق حسابك في أقرب وقت ممكن.",
                    icon: 'shield-checkmark',
                    color: 'var(--primary)',
                    confirmText: dict.btn_ok || 'موافق'
                });
            }, 300);

        } catch(e) {
            console.error(e);
            window.showToast(dict.alert_error || "حدث خطأ أثناء الإرسال ❌");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText; // استرجاع النص الأصلي
        }
    }
};