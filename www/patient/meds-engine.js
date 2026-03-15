// ============================================================================
// محرك تذكير الأدوية الاحترافي (Pro Medication Engine) 💊
// تم التحديث لدعم إشعارات الموبايل الحقيقية (Native Push Notifications)
// ============================================================================

window.medEngine = {
    selectedSlots: [],

    // 1. اختيار الفترات (صباح، ظهر، مساء)
    toggleSlot: function(slot) {
        const btn = document.getElementById('btn-' + slot);
        const timeInputRow = document.getElementById('row-' + slot);

        if (this.selectedSlots.includes(slot)) {
            this.selectedSlots = this.selectedSlots.filter(s => s !== slot);
            btn.classList.remove('active');
            timeInputRow.style.display = 'none';
        } else {
            this.selectedSlots.push(slot);
            btn.classList.add('active');
            timeInputRow.style.display = 'flex';
        }
    },

    // 2. طلب صلاحية الإشعارات من المستخدم (مُحدث للهاتف والويب)
    requestNotificationPermission: async function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        // 📱 إذا كان يعمل كتطبيق هاتف حقيقي (Capacitor)
        if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
            const permStatus = await window.Capacitor.Plugins.LocalNotifications.requestPermissions();
            if (permStatus.display !== 'granted') {
                window.showToast(dict.warn_no_notif_perm || "⚠️ يرجى تفعيل الإشعارات من إعدادات الهاتف لضمان وصول التذكير.");
            }
        } 
        // 🌐 إذا كان يعمل على متصفح الويب
        else if ("Notification" in window && Notification.permission !== "granted") {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                window.showToast(dict.warn_no_notif_perm || "⚠️ لن تصلك الإشعارات وأنت خارج التطبيق لأنك لم تمنح الصلاحية.");
            }
        }
    },

    // 3. حفظ الدواء وجدولة الإشعار
    saveMed: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const name = document.getElementById('med-name').value.trim();
        const meal = document.getElementById('med-meal').value;

        if (!name || this.selectedSlots.length === 0) {
            window.showToast(dict.err_med_name_slot || "يرجى إدخال اسم الدواء واختيار فترة واحدة على الأقل!");
            return;
        }

        let slotDetails = [];
        for (let s of this.selectedSlots) {
            const timeVal = document.getElementById('time-' + s).value;
            if(!timeVal) {
                const periodName = s === 'morning' ? (dict.morning || 'صباح') : (s === 'noon' ? (dict.noon || 'ظهر') : (dict.evening || 'مساء'));
                const msg = (dict.err_select_time || "يرجى تحديد الوقت لفترة الـ {period}!").replace('{period}', periodName);
                window.showToast(msg);
                return;
            }
            slotDetails.push({
                period: s === 'morning' ? (dict.morning_emoji || 'صباحاً 🌅') : (s === 'noon' ? (dict.noon_emoji || 'ظهراً ☀️') : (dict.evening_emoji || 'مساءً 🌙')),
                time: timeVal,
                id: Math.floor(Math.random() * 100000) // ID فريد لبرمجة الإشعار
            });
        }

        const newMed = { id: Date.now(), name, meal, slots: slotDetails };
        
        let meds = JSON.parse(localStorage.getItem('hm_meds_v2') || '[]');
        meds.push(newMed);
        localStorage.setItem('hm_meds_v2', JSON.stringify(meds));

        // طلب الصلاحية وبرمجة الإشعار
        this.requestNotificationPermission().then(() => {
            this.scheduleNativeNotifications(newMed);
        });

        // تصفير الفورم
        document.getElementById('med-name').value = '';
        this.selectedSlots = [];
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.time-row').forEach(r => r.style.display = 'none');
        document.getElementById('add-med-form').classList.remove('show');
        
        window.showToast(dict.med_saved_success || "تم حفظ التذكير بنجاح ✅");
        this.renderMeds();
    },

    // 4. عرض الأدوية
    renderMeds: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const list = document.getElementById('meds-list');
        if(!list) return;

        let meds = JSON.parse(localStorage.getItem('hm_meds_v2') || '[]');
        
        if (meds.length === 0) {
            list.innerHTML = `<p style="text-align:center; color:#888;">${dict.no_meds_added || 'لم تقم بإضافة أي أدوية بعد.'}</p>`;
            return;
        }

        list.innerHTML = '';
        meds.forEach(med => {
            const timesLabel = med.slots.map(s => `<span style="background:#222; padding:3px 8px; border-radius:10px; font-size:12px; margin-left:5px;">${s.time} ${s.period}</span>`).join('');
            
            let mealText = ""; let badgeClass = "";
            if(med.meal === 'before') { mealText = dict.meal_before || "قبل الأكل"; badgeClass = "badge-before"; }
            if(med.meal === 'after') { mealText = dict.meal_after || "بعد الأكل"; badgeClass = "badge-after"; }
            if(med.meal === 'during') { mealText = dict.meal_during || "وسط الأكل"; badgeClass = "badge-during"; }
            if(med.meal === 'any') { mealText = dict.meal_any || "بدون أكل / أي وقت"; badgeClass = "badge-any"; }

            list.innerHTML += `
                <div class="med-card" style="flex-direction: column; align-items: flex-start;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin:0; font-size:18px; color:white;">${med.name}</h4>
                        <ion-icon name="trash" class="med-delete" onclick="window.medEngine.deleteMed(${med.id})"></ion-icon>
                    </div>
                    <div style="margin-bottom: 10px;">${timesLabel}</div>
                    <span class="meal-badge ${badgeClass}">${mealText}</span>
                </div>
            `;
        });
    },

    // 5. مسح دواء
    deleteMed: async function(id) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const confirmed = await window.royalConfirm(
            dict.del_med_title || "حذف التذكير", 
            dict.del_med_msg || "هل تريد حذف هذا التذكير نهائياً؟", 
            "trash-outline", 
            "#ff4b2b"
        );
        
        if(confirmed) {
            let meds = JSON.parse(localStorage.getItem('hm_meds_v2') || '[]');
            
            // 📱 إلغاء إشعارات الهاتف المبرمجة لهذا الدواء قبل حذفه
            if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
                const medToDelete = meds.find(m => m.id === id);
                if(medToDelete) {
                    const idsToCancel = medToDelete.slots.map(s => ({ id: s.id }));
                    await window.Capacitor.Plugins.LocalNotifications.cancel({ notifications: idsToCancel });
                }
            }

            meds = meds.filter(m => m.id !== id);
            localStorage.setItem('hm_meds_v2', JSON.stringify(meds));
            this.renderMeds();
            window.showToast(dict.med_deleted_success || "تم حذف التذكير 🗑️");
        }
    },

    // ==========================================
    // 🧠 النواة المحدثة: جدولة الإشعارات الحقيقية
    // ==========================================
    
    // 6. برمجة الإشعارات لتتكرر يومياً على الهاتف (Capacitor Native)
    scheduleNativeNotifications: async function(med) {
        if (window.Capacitor && window.Capacitor.Plugins.LocalNotifications) {
            const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
            
            let mealText = "";
            if(med.meal === 'before') mealText = dict.meal_before || "قبل الأكل";
            if(med.meal === 'after') mealText = dict.meal_after || "بعد الأكل";
            if(med.meal === 'during') mealText = dict.meal_during || "وسط الأكل";
            if(med.meal === 'any') mealText = dict.meal_any || "بدون أكل";

            for (const slot of med.slots) {
                const [hour, minute] = slot.time.split(':');
                const bodyText = (dict.med_time_now || "حان الآن موعد جرعة الـ {period}!\nالتعليمات: {meal}").replace('{period}', slot.period).replace('{meal}', mealText);

                await window.Capacitor.Plugins.LocalNotifications.schedule({
                    notifications: [
                        {
                            title: (dict.med_reminder_title || "🔔 تذكير الدواء: ") + med.name,
                            body: bodyText,
                            id: slot.id,
                            schedule: { 
                                on: { hour: parseInt(hour), minute: parseInt(minute) }, // يتكرر يومياً في هذا الوقت
                                allowWhileIdle: true // يعمل حتى لو الهاتف في وضع السكون
                            },
                            sound: "default",
                            smallIcon: "ic_stat_icon_config_sample" // يمكنك تخصيص أيقونة أندرويد لاحقاً
                        }
                    ]
                });
            }
        }
    },

    // 7. الرادار (يعمل الآن كنسخة احتياطية للويب ولعرض النافذة الملكية إذا كان التطبيق مفتوحاً)
    startRadar: function() {
        setInterval(() => {
            let meds = JSON.parse(localStorage.getItem('hm_meds_v2') || '[]');
            if (meds.length === 0) return;

            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
            const currentSeconds = now.getSeconds();

            if (currentSeconds === 0) {
                meds.forEach(med => {
                    med.slots.forEach(slot => {
                        if (slot.time === currentTime) {
                            this.triggerWebFallbackNotification(med, slot);
                        }
                    });
                });
            }
        }, 1000);
    },

    // 8. النافذة الملكية عند فتح التطبيق
    triggerWebFallbackNotification: function(med, slot) {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const title = (dict.med_reminder_title || "🔔 تذكير الدواء: ") + med.name;
        
        let mealText = "";
        if(med.meal === 'before') mealText = dict.meal_before || "قبل الأكل";
        if(med.meal === 'after') mealText = dict.meal_after || "بعد الأكل";
        if(med.meal === 'during') mealText = dict.meal_during || "وسط الأكل";
        if(med.meal === 'any') mealText = dict.meal_any || "بدون أكل";

        const bodyText = (dict.med_time_now || "حان الآن موعد جرعة الـ {period}!\nالتعليمات: {meal}").replace('{period}', slot.period).replace('{meal}', mealText);

        // إظهار النافذة الملكية داخل التطبيق (سواء كنا ويب أو موبايل)
        window.royalAlert(title, bodyText, "notifications-outline", "#42e695");
        if("vibrate" in navigator) navigator.vibrate([500, 250, 500, 250, 500, 250, 1000]);
    }
};

// تشغيل المحرك
window.medEngine.renderMeds();
window.medEngine.startRadar();

// ============================================================================
// محرك الهوية الطبية (Medical ID Engine) 🪪
// ============================================================================

window.medIdEngine = {
    // 1. فتح وإغلاق فورم التعديل (مع أنيميشن)
    toggleEdit: function() {
        const form = document.getElementById('edit-id-form');
        if (form.style.display === 'none' || form.style.display === '') {
            form.style.display = 'flex';
            this.loadDataIntoForm(); // تعبئة الفورم بالبيانات القديمة إن وجدت
        } else {
            form.style.display = 'none';
        }
    },

    // 2. حفظ البيانات في الهاتف (Offline)
    saveData: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        
        // جمع البيانات من الفورم
        const data = {
            name: document.getElementById('input-id-name').value.trim() || (dict.unregistered || 'غير مسجل'),
            blood: document.getElementById('input-id-blood').value || (dict.not_specified || '--'),
            allergies: document.getElementById('input-id-allergies').value.trim() || (dict.none_found || 'لا يوجد'),
            chronic: document.getElementById('input-id-chronic').value.trim() || (dict.none_found || 'لا يوجد'),
            contact: document.getElementById('input-id-contact').value.trim() || (dict.not_specified || '--')
        };

        // حفظها في ذاكرة المتصفح
        localStorage.setItem('hm_medical_id', JSON.stringify(data));
        
        // إغلاق الفورم وتحديث البطاقة
        document.getElementById('edit-id-form').style.display = 'none';
        this.renderCard();
        
        // إظهار تنبيه النجاح
        window.showToast(dict.medical_id_updated || "تم تحديث هويتك الطبية بنجاح 🪪");
    },

    // 3. جلب البيانات ووضعها داخل الفورم عند فتحه
    loadDataIntoForm: function() {
        const dict = (window.translations && window.translations[localStorage.getItem('app_lang') || 'ar']) || {};
        const data = JSON.parse(localStorage.getItem('hm_medical_id') || '{}');
        
        const defaultUnreg = dict.unregistered || 'غير مسجل';
        const defaultNone = dict.none_found || 'لا يوجد';
        const defaultNotSpec = dict.not_specified || '--';

        document.getElementById('input-id-name').value = (data.name && data.name !== defaultUnreg && data.name !== 'غير مسجل') ? data.name : '';
        document.getElementById('input-id-blood').value = (data.blood && data.blood !== defaultNotSpec && data.blood !== '--') ? data.blood : '';
        document.getElementById('input-id-allergies').value = (data.allergies && data.allergies !== defaultNone && data.allergies !== 'لا يوجد') ? data.allergies : '';
        document.getElementById('input-id-chronic').value = (data.chronic && data.chronic !== defaultNone && data.chronic !== 'لا يوجد') ? data.chronic : '';
        document.getElementById('input-id-contact').value = (data.contact && data.contact !== defaultNotSpec && data.contact !== '--') ? data.contact : '';
    },

    // 4. رسم البطاقة وتحديث النصوص فيها
    renderCard: function() {
        const data = JSON.parse(localStorage.getItem('hm_medical_id') || null);
        
        if (!data) return; // إذا لم يقم المريض بإنشاء هوية بعد، نترك القيم الافتراضية

        document.getElementById('display-id-name').innerText = data.name;
        document.getElementById('display-id-blood').innerText = data.blood;
        document.getElementById('display-id-allergies').innerText = data.allergies;
        document.getElementById('display-id-chronic').innerText = data.chronic;
        document.getElementById('display-id-contact').innerText = data.contact;
    }
};

// تشغيل دالة رسم البطاقة تلقائياً عند تحميل الملف (ليقرأ البيانات المحفوظة سابقاً)
window.medIdEngine.renderCard();