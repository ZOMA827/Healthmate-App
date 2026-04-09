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
            return window.showToast(dict.alert_upload_required || "يرجى رفع الشهادة وبطاقة الهوية أولاً! ⚠️");
        }

        const btn = document.getElementById('v-submit-btn');
        btn.disabled = true;
        btn.innerText = dict.sending || "جاري الإرسال...";

        try {
            const myUid = window.auth.currentUser.uid;
            
            // جلب بيانات المستخدم مباشرة من قاعدة البيانات (آمن 100%)
            const userDoc = await window.db.collection("users").doc(myUid).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const realName = userData.name || "مجهول";
            const realRole = userData.role || "متدرب";

            // 1. الرفع السحابي
            window.showToast("جاري رفع الوثائق بأمان... 🔒");
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

            // 3. 🚨 التعديل هنا: استخدام uiModal الخاص بـ community.html بدلاً من royalAlert 🚨
            await window.uiModal({
                type: 'alert',
                title: dict.v_success_title || "تم استلام طلبك",
                message: dict.v_success_msg || "سيقوم فريقنا بمراجعة وثائقك خلال 48 ساعة. ستظهر علامة التوثيق فور التأكد. ✅",
                icon: 'shield-checkmark',
                color: 'var(--primary)',
                confirmText: dict.btn_ok || 'موافق'
            });
            
            window.closeSPA('verificationSlidePage');

        } catch(e) {
            console.error(e);
            window.showToast(dict.alert_error || "حدث خطأ أثناء الإرسال ❌");
        } finally {
            btn.disabled = false;
            btn.innerText = dict.btn_submit_v || "إرسال طلب التوثيق";
        }
    }
};