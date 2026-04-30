// ============================================================================
// 🏥 محرك إدارة طلبات المواعيد للطبيب (Doctor Apps Engine PRO)
// تم إضافة: نظام "منح رقم الطابور" للمريض عند القبول 🔢
// ============================================================================

window.doctorAppsEngine = {
    init: function() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                // 🚨 الإضافة الجديدة هنا: تشغيل محرك التحكم في الطابور للطبيب 🚨
                this.initQueueControl(user.uid);

                const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};

                firebase.firestore().collection('appointments')
                    .where('doctorId', '==', user.uid)
                    .orderBy('timestamp', 'desc')
                    .onSnapshot((snapshot) => {
                        const listDiv = document.getElementById('doctor-apps-list');
                        const badge = document.getElementById('doc-app-badge');
                        let pendingCount = 0;
                        
                        if (snapshot.empty) {
                            if(listDiv) {
                                listDiv.innerHTML = `
                                    <div style="text-align:center; color:var(--text-sub); padding:50px;">
                                        <ion-icon name="calendar-clear-outline" style="font-size:50px; opacity:0.5;"></ion-icon>
                                        <br>
                                        <span data-i18n="doc_no_appointments">${dict.doc_no_appointments || 'لا توجد طلبات حجز حالياً.'}</span>
                                    </div>`;
                            }
                            if(badge) badge.style.display = 'none';
                            if(typeof window.applyLanguage === 'function') window.applyLanguage();
                            return;
                        }

                        if(listDiv) listDiv.innerHTML = '';
                        
                        snapshot.forEach(doc => {
                            const app = doc.data();
                            if(app.status === 'pending') pendingCount++;
                            if(listDiv) this.renderCard(doc, listDiv);
                        });

                        if(typeof window.applyLanguage === 'function') window.applyLanguage();

                        if(badge) {
                            if(pendingCount > 0) {
                                badge.innerText = pendingCount;
                                badge.style.display = 'flex';
                            } else {
                                badge.style.display = 'none';
                            }
                        }
                    }, (error) => {
                        console.error(dict.error_fetching_apps || "خطأ في جلب المواعيد:", error);
                    });
            }
        });
    },

    renderCard: function(doc, container) {
        const app = doc.data();
        const id = doc.id;
        let actionsHTML = '';

        const currentLang = localStorage.getItem('app_lang') || 'ar';
        const dict = (window.translations && window.translations[currentLang]) ? window.translations[currentLang] : {};

        // 🚨 التعديل السحري هنا: زر القبول يفتح نافذة الطابور
        if(app.status === 'pending') {
            actionsHTML = `
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button onclick="window.doctorAppsEngine.openQueueModal('${id}', '${app.patientName?.replace(/'/g, "\\'")}')" style="flex:1; padding:10px; border-radius:12px; border:none; background:var(--green); color:black; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:5px;">
                        <ion-icon name="checkmark-circle-outline" style="font-size:18px;"></ion-icon> ${dict.doc_app_accept || 'قبول وإعطاء رقم'}
                    </button>
                    <button onclick="window.doctorAppsEngine.updateStatus('${id}', 'rejected')" style="flex:1; padding:10px; border-radius:12px; border:1px solid var(--danger); background:transparent; color:var(--danger); font-weight:bold; cursor:pointer;">
                        ${dict.doc_app_reject || 'رفض ❌'}
                    </button>
                </div>`;
        } else {
            const isAccepted = app.status === 'accepted';
            const statusText = isAccepted ? (dict.doc_app_accepted || 'تم القبول ✅') : (dict.doc_app_rejected || 'تم الرفض ❌');
            const statusColor = isAccepted ? 'var(--green)' : 'var(--danger)';
            const i18nKey = isAccepted ? 'doc_app_accepted' : 'doc_app_rejected';
            
            let queueBadge = isAccepted && app.queueNumber ? `
                <div style="margin-top:10px; padding:10px; border-radius:10px; background: rgba(0, 243, 255, 0.1); border: 1px solid rgba(0, 243, 255, 0.3); display: flex; align-items: center; justify-content: space-between;">
                    <span style="color:var(--text-main); font-size:13px; display:flex; align-items:center; gap:5px;"><ion-icon name="people" style="color:var(--blue);"></ion-icon> ${dict.assigned_queue_num || 'رقم المريض:'}</span>
                    <span style="background:var(--blue); color:#000; font-weight:bold; padding:2px 10px; border-radius:8px; font-size:16px;">${app.queueNumber}</span>
                </div>
            ` : '';

            actionsHTML = `
                <div style="margin-top:10px; padding:8px; border-radius:8px; background:rgba(255,255,255,0.05); text-align:center; color:${statusColor}; font-weight:bold; font-size:13px;" data-i18n="${i18nKey}">${statusText}</div>
                ${queueBadge}
            `;
        }

        const cardHTML = `
            <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 15px; position: relative; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">
                <button onclick="window.doctorAppsEngine.customConfirmDelete('${id}')" style="position: absolute; top: 15px; left: 15px; background: rgba(255, 75, 43, 0.1); border: none; color: var(--danger); width: 35px; height: 35px; border-radius: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.3s;" title="${dict.delete_request || 'حذف الطلب'}">
                    <ion-icon name="trash-outline" style="font-size: 18px;"></ion-icon>
                </button>

                <h4 style="margin:0 0 5px 0; color:white; font-size:16px; display:flex; align-items:center; gap:5px;">
                    <ion-icon name="person-circle-outline" style="color:var(--text-sub); font-size:22px;"></ion-icon>
                    ${app.patientName || 'مجهول'}
                </h4>
                <p style="margin:0 0 10px 0; color:var(--text-sub); font-size:13px; display:flex; align-items:center; gap:5px;">
                    <ion-icon name="calendar-outline"></ion-icon> ${app.date} <span style="color:#555;">|</span> <ion-icon name="time-outline"></ion-icon> ${app.time}
                </p>
                <div style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 10px; font-size: 13px; color: #ddd; margin-right: 40px; border-right: 2px solid var(--border-color);">
                    <strong style="color:var(--orange);">${dict.doc_app_notes || 'ملاحظات:'}</strong> ${app.notes || `<span style="opacity:0.6;">${dict.doc_app_no_notes || 'لا توجد ملاحظات.'}</span>`}
                </div>
                ${actionsHTML}
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardHTML);
    },

    // 🚨 1. نافذة إدخال رقم الطابور الأنيقة 🚨
    openQueueModal: function(appId, patientName) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if(!document.getElementById('doc-queue-modal')) {
            const modalHTML = `
                <div id="doc-queue-modal" class="glass-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; justify-content:center; align-items:center;">
                    <div style="background:#111; border:1px solid var(--green); border-radius:20px; padding:30px; width:85%; max-width:350px; text-align:center; animation: scaleUp 0.3s ease; box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);">
                        <ion-icon name="ticket" style="font-size:50px; color:var(--green); margin-bottom:15px; filter: drop-shadow(0 0 10px var(--green));"></ion-icon>
                        <h3 style="color:white; margin:0 0 10px 0; font-family:'Cairo';">${dict.assign_queue_title || 'منح رقم الطابور'}</h3>
                        <p style="color:var(--text-sub); font-size:13px; margin-bottom:20px; line-height:1.5;" id="queue-modal-desc"></p>
                        
                        <input type="number" id="queue-number-input" placeholder="${dict.queue_num_ph || 'أدخل الرقم هنا (مثال: 5)'}" style="width:100%; padding:15px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:white; font-family:'Cairo'; font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 25px; outline:none;" min="1">

                        <div style="display:flex; gap:10px;">
                            <button id="queue-btn-confirm" style="flex:2; padding:12px; background:var(--green); color:black; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-family:'Cairo'; font-size:15px;">${dict.btn_confirm_accept || 'تأكيد القبول ✔️'}</button>
                            <button onclick="document.getElementById('doc-queue-modal').style.display='none'" style="flex:1; padding:12px; background:transparent; border:1px solid #555; color:#ccc; border-radius:12px; cursor:pointer; font-weight:bold; font-family:'Cairo';">${dict.btn_cancel || 'إلغاء'}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = document.getElementById('doc-queue-modal');
        const desc = document.getElementById('queue-modal-desc');
        const input = document.getElementById('queue-number-input');
        const confirmBtn = document.getElementById('queue-btn-confirm');

        // دمج اسم المريض في الرسالة
        let msg = dict.assign_queue_desc || 'أدخل رقم الدور الذي ترغب في منحه للمريض: <br><strong style="color:white;">{name}</strong>';
        desc.innerHTML = msg.replace('{name}', patientName);
        
        input.value = ''; 
        modal.style.display = 'flex';
        input.focus();

        // 🚨 ربط زر التأكيد بدالة القبول النهائية
        confirmBtn.onclick = () => {
            const qNum = parseInt(input.value);
            if(!qNum || qNum < 1) {
                window.showToast(dict.alert_invalid_queue || "الرجاء إدخال رقم صحيح ⚠️");
                return;
            }
            modal.style.display = 'none';
            this.confirmAcceptWithQueue(appId, qNum);
        };
    },

    // 🚨 2. دالة القبول النهائية التي ترفع الرقم للفايربيس 🚨
    confirmAcceptWithQueue: async function(appId, queueNumber) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        try {
            window.showToast(dict.processing || "جاري معالجة الطلب... ⏳");
            
            // تحديث الطلب ليصبح مقبولاً وإعطائه الرقم
            await firebase.firestore().collection('appointments').doc(appId).update({ 
                status: 'accepted',
                queueNumber: queueNumber 
            });
            
            window.showToast(dict.app_accept_success || 'تم القبول بنجاح، ورقم المريض هو: ' + queueNumber + ' ✅');
        } catch(error) {
            console.error("خطأ في القبول:", error);
            window.showToast(dict.update_error || "حدث خطأ أثناء التحديث");
        }
    },

    // 3. دالة الرفض العادية
    updateStatus: async function(id, newStatus) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        try {
            await firebase.firestore().collection('appointments').doc(id).update({ status: newStatus });
            if(newStatus === 'rejected') {
                window.showToast(dict.app_reject_success || 'تم رفض الموعد ❌');
            }
        } catch(error) {
            console.error("خطأ في تحديث الحالة:", error);
            window.showToast(dict.update_error || "حدث خطأ أثناء التحديث");
        }
    },

    // 4. دالة الحذف بالنافذة الزجاجية (التي برمجناها سابقاً)
    customConfirmDelete: function(id) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        if(!document.getElementById('doc-delete-modal')) {
            const modalHTML = `
                <div id="doc-delete-modal" class="glass-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:99999; justify-content:center; align-items:center;">
                    <div style="background:#111; border:1px solid var(--danger); border-radius:20px; padding:30px; width:85%; max-width:350px; text-align:center; animation: scaleUp 0.3s ease; box-shadow: 0 10px 30px rgba(255,75,43,0.3);">
                        <ion-icon name="trash-outline" style="font-size:50px; color:var(--danger); margin-bottom:15px;"></ion-icon>
                        <h3 style="color:white; margin:0 0 10px 0;">${dict.confirm_del_app_title || 'تأكيد الحذف'}</h3>
                        <p style="color:var(--text-sub); font-size:14px; margin-bottom:25px;">${dict.confirm_del_app_desc || 'هل أنت متأكد من حذف هذا الموعد نهائياً من قائمتك؟'}</p>
                        <div style="display:flex; gap:10px;">
                            <button id="doc-del-yes" style="flex:1; padding:12px; background:var(--danger); color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">${dict.btn_yes_delete || 'نعم، احذف'}</button>
                            <button id="doc-del-no" style="flex:1; padding:12px; background:transparent; border:1px solid #555; color:#ccc; border-radius:10px; cursor:pointer; font-weight:bold;">${dict.btn_cancel || 'إلغاء'}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }

        const modal = document.getElementById('doc-delete-modal');
        modal.style.display = 'flex'; 

        document.getElementById('doc-del-yes').onclick = async () => {
            modal.style.display = 'none';
            try {
                await firebase.firestore().collection('appointments').doc(id).delete();
                window.showToast(dict.delete_success || "تم حذف الموعد من قائمتك 🗑️");
            } catch(error) {
                window.showToast(dict.delete_error || "حدث خطأ أثناء محاولة الحذف ⚠️");
            }
        };

        document.getElementById('doc-del-no').onclick = () => { modal.style.display = 'none'; };
    },

    // ========================================================================
    // 🚨 5. الإضافة الجديدة المطلوبة: التحكم في الطابور الحي بضغطة زر 🚨
    // ========================================================================
    initQueueControl: function(doctorId) {
        this.doctorId = doctorId;
        // مراقبة أو إنشاء مستند الطابور الخاص بالطبيب
        firebase.firestore().collection('live_queues').doc(doctorId)
            .onSnapshot(doc => {
                let currentServing = 1;
                if(doc.exists) {
                    currentServing = doc.data().currentServing || 1;
                } else {
                    // إذا لم يكن موجوداً، ننشئه برقم 1
                    firebase.firestore().collection('live_queues').doc(doctorId).set({ currentServing: 1, timePerPatient: 15 }, { merge: true });
                }
                // بناء أو تحديث واجهة أزرار التحكم
                this.renderQueueControl(currentServing);
            });
    },

    renderQueueControl: function(currentServing) {
        let ctrl = document.getElementById('doctor-queue-control');
        
        // إذا لم يكن صندوق التحكم موجوداً، ننشئه ونضعه فوق قائمة المواعيد
        if(!ctrl) {
            const listDiv = document.getElementById('doctor-apps-list');
            if(!listDiv || !listDiv.parentNode) return;
            ctrl = document.createElement('div');
            ctrl.id = 'doctor-queue-control';
            listDiv.parentNode.insertBefore(ctrl, listDiv);
        }
        
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        // تصميم لوحة التحكم بالأزرار (+ و -)
        ctrl.innerHTML = `
            <div style="background: rgba(0, 243, 255, 0.05); border: 1px solid rgba(0, 243, 255, 0.3); border-radius: 15px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 5px 15px rgba(0,243,255,0.05);">
                <div>
                    <h4 style="margin: 0; color: white; font-family:'Cairo'; display:flex; align-items:center; gap:5px;"><ion-icon name="people" style="color:var(--blue);"></ion-icon> ${dict.live_queue_title || 'إدارة الطابور'}</h4>
                    <p style="margin: 0; color: var(--text-sub); font-size: 12px;">${dict.queue_serving_now || 'الرقم الذي يُفحص الآن'}</p>
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <button onclick="window.doctorAppsEngine.changeServing(-1)" style="background: rgba(255, 255, 255, 0.1); border: none; color: white; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; font-size: 20px; display:flex; justify-content:center; align-items:center; transition:0.2s;"><ion-icon name="remove"></ion-icon></button>
                    
                    <span id="current-serving-display" style="font-size: 24px; font-weight: 900; color: var(--blue); min-width:30px; text-align:center;">${currentServing}</span>
                    
                    <button onclick="window.doctorAppsEngine.changeServing(1)" style="background: var(--blue); border: none; color: black; width: 40px; height: 40px; border-radius: 10px; cursor: pointer; font-size: 20px; font-weight: bold; display:flex; justify-content:center; align-items:center; transition:0.2s;"><ion-icon name="add"></ion-icon></button>
                </div>
            </div>
        `;
    },

    changeServing: async function(increment) {
        if(!this.doctorId) return;
        const docRef = firebase.firestore().collection('live_queues').doc(this.doctorId);
        try {
            const doc = await docRef.get();
            let current = 1;
            if(doc.exists) current = doc.data().currentServing || 1;
            
            let newVal = current + increment;
            if(newVal < 1) newVal = 1; // لا يمكن أن يكون الرقم أقل من 1

            // التحديث في الفايربيس (سينعكس مباشرة عند المرضى المنتظرين)
            await docRef.set({ currentServing: newVal }, { merge: true });
        } catch(e) {
            console.error("خطأ في تحديث الطابور", e);
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    if(window.doctorAppsEngine) {
        window.doctorAppsEngine.init();
    }
});