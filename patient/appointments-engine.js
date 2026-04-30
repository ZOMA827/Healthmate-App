// ============================================================================
// 📅 محرك إدارة المواعيد (Appointments Engine - PRO & FAST)
// 🚨 مدمج معه: نظام "الطابور الذكي" (Live Queue) لتتبع الدور 🚨
// ============================================================================

window.appointmentsEngine = {
    unsubscribe: null, // 🛑 السلاح السري لمنع التكرار واللاغ (Memory Leak)
    queueUnsubscribes: [], // 🛑 مصفوفة لتخزين مستمعي الطابور الحي لتنظيفهم

    init: function() {
        const listDiv = document.getElementById('appointments-list');
        const user = window.firebase ? window.firebase.auth().currentUser : null;
        if (!user) return;
        
        // 🛑 قتل المراقب القديم قبل فتح واحد جديد لتخفيف الضغط على المعالج
        if (this.unsubscribe) {
            this.unsubscribe();
        }

        listDiv.innerHTML = `<div style="text-align:center; padding:40px; color:#666;"><ion-icon name="sync" style="font-size:40px; animation: spin 1s linear infinite;"></ion-icon></div>`;

        // تشغيل مراقب واحد فقط وحفظه في المتغير
        this.unsubscribe = firebase.firestore().collection('appointments')
            .where('patientId', '==', user.uid)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                this.render(snapshot, listDiv);
                // 🚨 تشغيل مراقبة العداد الحي للطابور بعد رسم البطاقات
                this.attachQueueListeners(snapshot);
            }, (error) => {
                console.error("🔥 خطأ في جلب المواعيد:", error);
                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
                listDiv.innerHTML = `<p style="text-align:center; color:var(--red);">${dict.err_fetch_app || 'فشل في جلب المواعيد. تحقق من اتصالك.'}</p>`;
            });
    },

    // 1. رسم البطاقات (مع التصميم الجديد الفخم + العداد الحي)
    render: function(snapshot, container) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding:50px; color:#888;">
                    <ion-icon name="calendar-clear-outline" style="font-size:50px; opacity:0.3;"></ion-icon>
                    <p>${dict.no_appointments_yet || 'ليس لديك أي مواعيد محجوزة بعد.'}</p>
                </div>`;
            return;
        }

        container.innerHTML = '';
        snapshot.forEach(doc => {
            const app = doc.data();
            const appId = doc.id;
            
            let statusClass = 'status-pending';
            let statusText = dict.status_pending || 'قيد الانتظار ⏳';
            let statusColor = '#ffcc00';
            let queueHtml = ''; // 🚨 سلاح الطابور السري

            if (app.status === 'accepted') { 
                statusClass = 'status-accepted'; 
                statusText = dict.status_accepted || 'تم القبول ✅'; 
                statusColor = '#10b981'; // أخضر
                
                // 🚨 إذا تم القبول، نظهر واجهة الطابور الذكي داخل البطاقة مع العداد الحي!
                const qNum = app.queueNumber || '?'; 
                queueHtml = `
                    <div style="background: rgba(0, 243, 255, 0.05); border-top: 1px solid rgba(0, 243, 255, 0.2); padding: 15px; margin-top: 15px; border-radius: 0 0 15px 15px; display: flex; flex-direction: column; gap: 10px;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <div style="background: var(--blue); color: #000; font-weight: 900; font-size: 18px; width: 40px; height: 40px; border-radius: 12px; display: flex; justify-content: center; align-items: center; box-shadow: 0 5px 15px rgba(0, 243, 255, 0.3);">
                                    ${qNum}
                                </div>
                                <div>
                                    <span style="color: var(--text-sub); font-size: 11px;">${dict.your_queue_number || 'رقمك في الطابور'}</span>
                                    <h4 style="margin: 0; color: white; font-size: 14px; font-family:'Cairo';">${dict.live_queue_title || 'الطابور الذكي 📊'}</h4>
                                </div>
                            </div>

                            <div style="display:flex; align-items:center; gap:8px; background: rgba(16, 185, 129, 0.1); padding: 5px 12px; border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.3);">
                                <div style="text-align: right;">
                                    <span style="color: var(--text-sub); font-size: 10px; display:block;">يُفحَص الآن</span>
                                    <span style="color: var(--green); font-size: 16px; font-weight: 900;" id="live-queue-count-${appId}">
                                        <ion-icon name="sync" style="animation: spin 1s linear infinite; font-size: 14px;"></ion-icon>
                                    </span>
                                </div>
                                <ion-icon name="radio-button-on" style="color: var(--green); font-size: 14px; animation: pulse 1.5s infinite;"></ion-icon>
                            </div>
                        </div>

                        <button onclick="window.appointmentsEngine.checkLiveQueue('${app.doctorId}', '${qNum}')" style="background: rgba(0, 243, 255, 0.15); color: var(--blue); border: 1px solid var(--blue); padding: 8px 15px; border-radius: 12px; font-weight: bold; font-family: 'Cairo'; cursor: pointer; display:flex; justify-content:center; align-items:center; gap:5px; transition:0.3s; width: 100%;">
                            <ion-icon name="time-outline" style="font-size: 18px;"></ion-icon> ${dict.track_queue || 'تفاصيل الدور والوقت المتبقي'}
                        </button>
                    </div>
                `;
            }
            if (app.status === 'rejected') { 
                statusClass = 'status-rejected'; 
                statusText = dict.status_rejected || 'تم الرفض ❌'; 
                statusColor = '#ff4d4d'; // أحمر
            }

            // التصميم الجديد: بطاقة زجاجية فخمة (Glassmorphism)
            container.innerHTML += `
                <div class="app-card" id="app-${appId}" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 15px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); overflow: hidden; position: relative;">
                    <div style="position: absolute; right: 0; top: 0; height: 100%; width: 4px; background: ${statusColor};"></div>
                    
                    <div style="padding: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div style="flex: 1;">
                                <h4 style="color:white; margin:0 0 5px 0; font-size:16px; display:flex; align-items:center; gap:5px;">
                                    <ion-icon name="person-circle" style="color:var(--text-sub); font-size:20px;"></ion-icon>
                                    ${dict.dr_prefix || 'د. '}${app.doctorName}
                                </h4>
                                <p style="color:#aaa; font-size:12px; margin:0; display:flex; align-items:center; gap:4px;">
                                    <ion-icon name="calendar-outline"></ion-icon> ${app.date} 
                                    <span style="color:var(--text-sub);">|</span>
                                    <ion-icon name="time-outline"></ion-icon> ${app.time}
                                </p>
                                <span class="status-badge ${statusClass}" style="margin-top:10px; display:inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight:bold; background: ${statusColor}22; color: ${statusColor}; border: 1px solid ${statusColor}44;">
                                    ${statusText}
                                </span>
                            </div>
                            
                            <button class="cancel-app-btn" onclick="window.appointmentsEngine.cancelAppointment('${appId}')" title="${dict.cancel_appointment || 'إلغاء الموعد'}" style="background: rgba(255, 75, 43, 0.1); color: var(--red); border: none; padding: 10px; border-radius: 50%; display: flex; justify-content: center; align-items: center; cursor: pointer; transition:0.3s;">
                                <ion-icon name="trash-outline" style="font-size: 18px;"></ion-icon>
                            </button>
                        </div>
                    </div>
                    
                    ${queueHtml} </div>
            `;
        });
    },

    // 🚨 إضافة جديدة: دالة الاستماع للطابور المباشر (Live Queue Listeners)
    attachQueueListeners: function(snapshot) {
        // تنظيف المراقبين القدامى لمنع تكرار القراءات
        if (this.queueUnsubscribes) {
            this.queueUnsubscribes.forEach(unsub => unsub());
        }
        this.queueUnsubscribes = [];

        snapshot.forEach(doc => {
            const app = doc.data();
            const appId = doc.id;
            
            // إذا كان الموعد مقبولاً، نراقب طابور هذا الطبيب تحديداً
            if (app.status === 'accepted' && app.doctorId) {
                const unsub = firebase.firestore().collection('live_queues').doc(app.doctorId)
                    .onSnapshot(qDoc => {
                        const countEl = document.getElementById(`live-queue-count-${appId}`);
                        if (countEl) {
                            if (qDoc.exists) {
                                countEl.innerText = qDoc.data().currentServing || 1;
                            } else {
                                countEl.innerText = 1;
                            }
                        }
                    });
                this.queueUnsubscribes.push(unsub);
            }
        });
    },

    // 2. دالة إلغاء الموعد (مدرعة)
    cancelAppointment: async function(appId) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        const confirmed = await window.royalConfirm(
            dict.cancel_booking_title || "تراجع عن الحجز", 
            dict.cancel_booking_msg || "هل أنت متأكد أنك تريد إلغاء طلب الموعد هذا؟ لا يمكن التراجع عن هذا الإجراء.", 
            "alert-circle", 
            "#ff4b2b"
        );

        if (confirmed) {
            try {
                window.showToast(dict.deleting_request || "جاري حذف الطلب... ⏳");
                await firebase.firestore().collection('appointments').doc(appId).delete();
                window.showToast(dict.cancel_success || "تم إلغاء الموعد بنجاح 🗑️");
            } catch (error) {
                console.error("خطأ أثناء الحذف:", error);
                window.royalAlert(dict.sorry_title || "عذراً!", dict.cancel_failed || "فشل إلغاء الموعد، حاول مرة أخرى.", "close-circle", "var(--red)");
            }
        }
    },

  // 🚨 3. العقل المدبر لتتبع الطابور بالتفاصيل (النسخة المدرعة ضد أخطاء النصوص) 🚨
    checkLiveQueue: async function(doctorId, myQueueNumber) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if (myQueueNumber === '?') {
            return window.showToast(dict.wait_doctor_queue || "الطبيب لم يحدد رقمك بعد، يرجى الانتظار قليلاً ⏳");
        }

        // حماية إضافية: التأكد من وجود معرف الطبيب
        if (!doctorId || doctorId === 'undefined') {
            return window.showToast("عذراً، معرف الطبيب غير موجود في هذا الموعد ⚠️");
        }

        window.showToast(dict.fetching_queue || "جاري فحص الطابور في عيادة الطبيب... 📡");

        try {
            // استدعاء ملف الطابور الخاص بالطبيب تحديداً (لا يختلط مع أطباء آخرين أبداً)
            const doctorQueueDoc = await firebase.firestore().collection('live_queues').doc(doctorId).get();
            
            let currentServing = 1; 
            let estimatedTimePerPatient = 15; 
            
            if (doctorQueueDoc.exists) {
                currentServing = parseInt(doctorQueueDoc.data().currentServing) || 1;
                estimatedTimePerPatient = parseInt(doctorQueueDoc.data().timePerPatient) || 15;
            }

            // الحسابات الذكية للطابور (تحويل النصوص لأرقام إجبارياً)
            const myNum = parseInt(myQueueNumber);
            const patientsAhead = myNum - currentServing;
            
            if (patientsAhead < 0) {
                // تجاوزه الدور
                window.royalAlert(
                    dict.queue_passed_title || "تجاوزك الدور!", 
                    dict.queue_passed_msg || "لقد فات دورك! يرجى التوجه للاستقبال في العيادة فوراً ⚠️", 
                    "warning-outline", 
                    "var(--red)"
                );
            } else if (patientsAhead === 0) {
                // دوره الآن!
                window.royalAlert(
                    dict.queue_now_title || "دورك الآن!", 
                    dict.queue_now_msg || "تفضل بالدخول لغرفة الطبيب 🟢", 
                    "checkmark-circle", 
                    "var(--green)"
                );
            } else {
                // لا يزال ينتظر (عملية الدمج السحرية المضمونة)
                const waitMinutes = patientsAhead * estimatedTimePerPatient;
                
                // الطريقة الأساسية الافتراضية (تعمل 100% دائماً)
                let finalMsg = `الطبيب يفحص الرقم <b>${currentServing}</b> الآن.<br>أمامك <b>${patientsAhead}</b> مرضى.<br>الوقت المتوقع لانتظارك: <b>${waitMinutes} دقيقة</b> ⏳`;
                
                // إذا كان يستخدم الترجمة، ندمج الأرقام بطريقة Split & Join التي لا تخطئ
                if (dict.queue_status_msg) {
                    finalMsg = dict.queue_status_msg
                        .split('{current}').join(currentServing)
                        .split('{ahead}').join(patientsAhead)
                        .split('{time}').join(waitMinutes);
                }

                window.royalAlert(
                    dict.live_queue_title || "الطابور الذكي 📊", 
                    finalMsg, 
                    "people-outline", 
                    "var(--blue)"
                );
            }

        } catch(error) {
            console.error("Queue Error:", error);
            window.showToast(dict.alert_error || "حدث خطأ أثناء الاتصال بالعيادة.");
        }
    }
};