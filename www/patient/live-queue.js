// ============================================================================
// 👥 محرك الطابور الذكي (Live Queue Engine) - النسخة الأولى
// ============================================================================

window.liveQueueEngine = {
    checkMyQueue: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const user = window.auth?.currentUser || window.firebase.auth().currentUser;
        
        if (!user) return window.showToast(dict.alert_login_required || "يجب تسجيل الدخول أولاً");

        window.showToast(dict.fetching_queue || "جاري الاتصال بعيادة الطبيب... 📡");
        const statusText = document.getElementById('queue-status-text');
        const badge = document.getElementById('queue-number-badge');

        try {
            // نبحث عن موعد المريض اليوم (هنا نفترض أنه حجز موعداً وحالته 'accepted')
            const today = new Date().toISOString().split('T')[0]; // تاريخ اليوم (YYYY-MM-DD)
            
            const myAppSnap = await window.db.collection('appointments')
                .where('patientId', '==', user.uid)
                .where('status', '==', 'accepted')
                // .where('date', '==', today) // يمكنك تفعيلها لاحقاً لفلترة مواعيد اليوم فقط
                .limit(1).get();

            if (myAppSnap.empty) {
                statusText.innerHTML = dict.no_queue_today || "ليس لديك مواعيد مؤكدة اليوم في أي عيادة.";
                badge.innerHTML = "-";
                return;
            }

            const myApp = myAppSnap.docs[0].data();
            const doctorId = myApp.doctorId;
            const myNumber = myApp.queueNumber || 15; // رقم افتراضي للتجربة

            // الآن نسأل الفايربيس: ما هو الرقم الذي يفحصه الطبيب حالياً؟
            // (سنصنع هذا الـ document لاحقاً في لوحة الطبيب)
            const doctorQueueDoc = await window.db.collection('live_queues').doc(doctorId).get();
            let currentServing = 10; // رقم افتراضي للتجربة
            let estimatedTimePerPatient = 15; // 15 دقيقة لكل مريض
            
            if (doctorQueueDoc.exists) {
                currentServing = doctorQueueDoc.data().currentServing || 1;
                estimatedTimePerPatient = doctorQueueDoc.data().timePerPatient || 15;
            }

            // الحسابات الذكية
            const patientsAhead = myNumber - currentServing;
            
            if (patientsAhead < 0) {
                statusText.innerHTML = dict.queue_passed || "لقد فات دورك! يرجى مراجعة الاستقبال.";
                statusText.style.color = "var(--danger)";
                badge.innerHTML = "!";
                badge.style.background = "var(--danger)";
                badge.style.color = "white";
            } else if (patientsAhead === 0) {
                statusText.innerHTML = `<b style="color:var(--success);">${dict.queue_now || "تفضل بالدخول، إنه دورك الآن! 🟢"}</b>`;
                badge.innerHTML = myNumber;
                badge.style.background = "var(--success)";
                window.royalAlert("دورك الآن!", "تفضل بالدخول لغرفة الطبيب.", "checkmark-circle", "var(--success)");
            } else {
                const waitMinutes = patientsAhead * estimatedTimePerPatient;
                statusText.innerHTML = `الطبيب يفحص الرقم <b>${currentServing}</b> الآن.<br>أمامك <b>${patientsAhead}</b> مرضى. الوقت المتوقع: <b>${waitMinutes} دقيقة</b> ⏳`;
                badge.innerHTML = myNumber;
                badge.style.background = "var(--blue)";
            }

        } catch(error) {
            console.error("Queue Error:", error);
            window.showToast(dict.alert_error || "حدث خطأ أثناء جلب بيانات الطابور.");
        }
    }
};