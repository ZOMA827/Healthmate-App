
// ==========================================
// 🚀 محرك التنقل السريع بين الصفحات (Smart Navigator)
// ==========================================
window.goToPage = function(pageUrl) {
    const progressBar = document.getElementById('top-progress-bar');
    
    // إظهار الشريط وتحريكه إلى 70% بسرعة
    progressBar.style.display = 'block';
    setTimeout(() => { progressBar.style.width = '70%'; }, 10);
    
    // بعد أجزاء من الثانية، ننتقل للصفحة ليحدث تفريغ الذاكرة (RAM Clear)
    setTimeout(() => {
        progressBar.style.width = '100%';
        window.location.href = pageUrl;
    }, 350); // 350 ملي ثانية كافية لعمل أنيميشن مريح للعين
};


// إعداد فايربيس (محمي ضد الانقطاع في وضع الأوفلاين 🛡️)
const firebaseConfig = {
    apiKey: "AIzaSyDF6MRRmzfXJBW07Xb_rXVK2hJY_Xtcm6A",
    authDomain: "healthmate-web-3d983.firebaseapp.com",
    projectId: "healthmate-web-3d983",
    storageBucket: "healthmate-web-3d983.firebasestorage.app",
    appId: "1:1005719156245:web:7478909058de336f1b801c"
};

// 🚨 نتحقق أولاً هل مكتبة فايربيس موجودة في الصفحة أم لا؟
if (typeof window.firebase !== 'undefined') {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
}

        // --- دالة سحرية صغيرة لجلب النصوص بناءً على اللغة (لا تحذفها) ---
        window.getLangText = function(key) {
            const lang = localStorage.getItem('app_lang') || 'ar';
            if(window.translations && window.translations[lang] && window.translations[lang][key]) {
                return window.translations[lang][key];
            }
            return key; // في حال لم يجد الكلمة يرجع المفتاح
        };

        // --- 0. دالة تغيير اللغة (تمت إضافتها هنا 🌍) ---
        window.setAppLang = function(lang) {
            localStorage.setItem('app_lang', lang);
            window.showToast(lang === 'ar' ? "جاري تغيير اللغة للعربية 🌍" : lang === 'fr' ? "Changement de langue 🌍" : "Changing language 🌍");
            setTimeout(() => { location.reload(); }, 1000); // تحديث لتطبيق اللغة
        };
    
// --- 1. نظام الـ SPA (النسخة المخففة للميزات المحلية فقط) ---
function openSPA(slideId) {
    const slide = document.getElementById(slideId);
    if(slide) slide.classList.add('active');
    
    // 📄 الميزة الوحيدة المتبقية كسلايد هي الوصفات المحلية (الأوفلاين)
    if(slideId === 'prescriptions-slide') {
        if(typeof loadPrescriptionsLocal === 'function') loadPrescriptionsLocal();
    }
    
    // 📅 (ملاحظة: إذا كانت ميزة "مواعيدي" لا تزال سلايد ولم تنقلها لصفحة مستقلة، اترك هذا الكود)
    if(slideId === 'appointments-slide') {
        if(window.appointmentsEngine) window.appointmentsEngine.init();
    }

    // 🚀 تنويه: (الأطباء، الرادار، الدم، السحابة، الصيدليات، الشات) تم حذف استدعاءاتها من هنا 
    // لأنها أصبحت صفحات مستقلة تعمل بمحركاتها الخاصة!
}

function closeSPA(slideId) {
    const slide = document.getElementById(slideId);
    if(slide) slide.classList.remove('active');
}

function closeSPA(slideId) {
    document.getElementById(slideId).classList.remove('active');
}

        // --- 2. محرك الوصفات الطبية (أوفلاين - LocalStorage) ---
        function savePrescriptionLocal(event) {
            const file = event.target.files[0];
            if(!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Image = e.target.result; // تحويل الصورة لنص مشفر طويل
                
                // جلب المصفوفة القديمة من ذاكرة الهاتف
                let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
                
                // إضافة الصورة الجديدة للمصفوفة
                savedMeds.unshift({ id: Date.now(), img: base64Image });
                
                // حفظ المصفوفة مجدداً في الهاتف
                try {
                    localStorage.setItem('my_prescriptions', JSON.stringify(savedMeds));
                    loadPrescriptionsLocal(); // تحديث العرض
                    window.showToast(window.getLangText('msg_presc_saved'));
                } catch(err) {
                    // استبدال الـ alert بالنافذة الملكية
                    window.royalAlert(window.getLangText('alert_storage_full_title'), window.getLangText('alert_storage_full_msg'), "warning-outline", "#ff4b2b");
                }
            };
            reader.readAsDataURL(file); // بدء التحويل
        }
// ==========================================
        // 🚀 نظام التنبيهات الطائر (النسخة المحمية ضد الأخطاء)
        // ==========================================
        window.showToast = function(msg) {
            const toast = document.getElementById('toast-msg');
            let text = document.getElementById('toast-text');
            
            if (toast) {
                // إذا لم يجد مكان النص (تم حذفه بالخطأ)، سيقوم بإعادة بنائه فوراً!
                if (!text) {
                    toast.innerHTML = `<ion-icon name="information-circle"></ion-icon> <span id="toast-text">${msg}</span>`;
                } else {
                    text.innerText = msg; // إذا وجده، يكتب الرسالة بشكل طبيعي
                }
                
                toast.classList.add('show');
                setTimeout(() => toast.classList.remove('show'), 3500);
            } else {
                console.log("إشعار: ", msg); // كبديل طوارئ في حال عدم وجود التنبيه إطلاقاً
            }
        };

        // ==========================================
        // 👑 محرك النوافذ الملكي (اغتيال تنبيهات المتصفح)
        // ==========================================
        
        // 1. نافذة التنبيه العادية (بديل alert)
        window.royalAlert = function(title, message, icon = 'information-circle', color = '#00d2ff') {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
                overlay.innerHTML = `
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:30px; border-radius:25px; width:85%; max-width:350px; text-align:center; color:var(--text-main); font-family:'Cairo'; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform:scale(0.8); transition:0.3s;" id="royal-alert-box">
                        <ion-icon name="${icon}" style="font-size:60px; color:${color}; margin-bottom:15px; filter:drop-shadow(0 0 10px ${color}88);"></ion-icon>
                        <h2 style="margin:0 0 10px 0; font-size:20px;">${title}</h2>
                        <p style="color:var(--text-sub); font-size:14px; line-height:1.6; margin-bottom:25px;">${message}</p>
                        <button id="r-ok-btn" style="width:100%; padding:15px; border-radius:15px; border:none; background:${color}; color:#000; font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_ok')}</button>
                    </div>`;
                document.body.appendChild(overlay);
                
                // أنيميشن الدخول
                setTimeout(() => { overlay.style.opacity = '1'; document.getElementById('royal-alert-box').style.transform = 'scale(1)'; }, 10);
                
                document.getElementById('r-ok-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-alert-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(true); }, 300);
                };
            });
        };

        // 2. نافذة التأكيد (بديل confirm)
        window.royalConfirm = function(title, message, icon = 'help-circle', color = '#ff4b2b') {
            return new Promise((resolve) => {
                const overlay = document.createElement('div');
                overlay.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); z-index:999999; display:flex; justify-content:center; align-items:center; opacity:0; transition:0.3s;";
                overlay.innerHTML = `
                    <div style="background:var(--card-bg); border:1px solid var(--border-color); padding:30px; border-radius:25px; width:85%; max-width:350px; text-align:center; color:var(--text-main); font-family:'Cairo'; box-shadow: 0 20px 50px rgba(0,0,0,0.5); transform:scale(0.8); transition:0.3s;" id="royal-confirm-box">
                        <ion-icon name="${icon}" style="font-size:60px; color:${color}; margin-bottom:15px; filter:drop-shadow(0 0 10px ${color}88);"></ion-icon>
                        <h2 style="margin:0 0 10px 0; font-size:20px;">${title}</h2>
                        <p style="color:var(--text-sub); font-size:14px; line-height:1.6; margin-bottom:25px;">${message}</p>
                        <div style="display:flex; gap:10px;">
                            <button id="r-yes-btn" style="flex:1; padding:15px; border-radius:15px; border:none; background:${color}; color:#fff; font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_yes_sure')}</button>
                            <button id="r-no-btn" style="flex:1; padding:15px; border-radius:15px; border:1px solid #444; background:transparent; color:var(--text-main); font-weight:bold; font-family:'Cairo'; font-size:16px; cursor:pointer;">${window.getLangText('btn_cancel')}</button>
                        </div>
                    </div>`;
                document.body.appendChild(overlay);
                
                setTimeout(() => { overlay.style.opacity = '1'; document.getElementById('royal-confirm-box').style.transform = 'scale(1)'; }, 10);
                
                document.getElementById('r-yes-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-confirm-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(true); }, 300);
                };
                document.getElementById('r-no-btn').onclick = () => {
                    overlay.style.opacity = '0'; document.getElementById('royal-confirm-box').style.transform = 'scale(0.8)';
                    setTimeout(() => { overlay.remove(); resolve(false); }, 300);
                };
            });
        };
         

        function loadPrescriptionsLocal() {
            const gallery = document.getElementById('presc-gallery');
            let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
            
            if(savedMeds.length === 0) {
                gallery.innerHTML = `<p style="grid-column: span 2; text-align:center; color: var(--text-sub); margin-top:30px;">${window.getLangText('msg_no_presc_yet')}</p>`;
                return;
            }

            gallery.innerHTML = '';
            savedMeds.forEach(item => {
                gallery.innerHTML += `
                    <div class="presc-item">
                        <img src="${item.img}" onclick="viewFullImage('${item.img}')">
                        <ion-icon name="trash" class="presc-delete" onclick="deletePrescription(${item.id})"></ion-icon>
                    </div>
                `;
            });
        }

        // تحويل الدالة إلى async واستخدام النافذة الملكية
        async function deletePrescription(id) {
            const confirmed = await window.royalConfirm(window.getLangText('confirm_delete_presc_title'), window.getLangText('confirm_delete_presc_msg'), "trash-bin-outline", "#ff4b2b");
            if(confirmed) {
                let savedMeds = JSON.parse(localStorage.getItem('my_prescriptions') || '[]');
                savedMeds = savedMeds.filter(item => item.id !== id); // تصفية الصورة المحذوفة
                localStorage.setItem('my_prescriptions', JSON.stringify(savedMeds));
                loadPrescriptionsLocal();
                window.showToast(window.getLangText('msg_presc_deleted'));
            }
        }

        function viewFullImage(src) {
            document.getElementById('full-image').src = src;
            document.getElementById('image-viewer').style.display = 'flex';
        }
        
        // ==========================================
        // ⚙️ محرك الإعدادات الذكي
        // ==========================================

        // 1. فتح/إغلاق النافذة
        window.toggleSettings = function() {
            const modal = document.getElementById('settings-modal');
            modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        };

        // 2. المظهر (Dark / Light)
        window.toggleTheme = function() {
            const current = document.documentElement.getAttribute('data-theme');
            const target = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', target);
            localStorage.setItem('hm_theme', target);
            window.showToast(target === 'dark' ? window.getLangText('msg_theme_dark') : window.getLangText('msg_theme_light'));
        };
        // تطبيق الثيم المحفوظ عند فتح الصفحة
        document.documentElement.setAttribute('data-theme', localStorage.getItem('hm_theme') || 'dark');

        // 3. تسجيل الخروج (تم الإصلاح 🔧)
        window.patientLogout = async function() {
            const confirm = await window.royalConfirm(window.getLangText('logout_title'), window.getLangText('logout_confirm_msg'), "log-out-outline", "var(--red)");
            if(confirm) {
                firebase.auth().signOut().then(() => {
                    window.location.href = "../index.html";
                });
            }
        }



        // ==========================================
// 🎬 محرك عارض الوسائط السينمائي
// ==========================================

window.closeMediaViewer = function() {
    const modal = document.getElementById('media-viewer-modal');
    if(modal) modal.style.display = 'none';
    
    // إيقاف الفيديو وتفريغ الروابط لتوفير الإنترنت
    const vid = document.getElementById('viewer-video');
    if(vid) {
        vid.pause();
        vid.src = ""; 
    }
    const img = document.getElementById('viewer-img');
    if(img) img.src = "";
};

// ============================================================================
// 🔋 محرك ميزات الأوفلاين الأربعة (Offline Super Engine)
// ============================================================================

window.offlineEngine = {
    // --- 1. جهات الاتصال المخصصة ---
    saveContact: function() {
        const name = document.getElementById('contact-name').value;
        const phone = document.getElementById('contact-phone').value;
        if(!name || !phone) return window.showToast(window.getLangText('msg_enter_name_phone'));
        
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        contacts.push({ id: Date.now(), name, phone });
        localStorage.setItem('hm_contacts', JSON.stringify(contacts));
        
        document.getElementById('contact-name').value = '';
        document.getElementById('contact-phone').value = '';
        this.renderContacts();
        window.showToast(window.getLangText('msg_saved_success'));
    },
    renderContacts: function() {
        const list = document.getElementById('custom-contacts-list');
        if(!list) return;
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        list.innerHTML = contacts.map(c => `
            <div class="hm-list-item">
                <div><h4 style="margin:0;">${c.name}</h4><p style="margin:0; font-size:12px; color:var(--text-sub);">${c.phone}</p></div>
                <a href="tel:${c.phone}" class="hm-btn" style="width:auto; padding:8px 15px; background:var(--green); color:#000; text-decoration:none;"><ion-icon name="call"></ion-icon></a>
                <ion-icon name="trash" style="color:var(--red); font-size:20px; margin-inline-end:10px; cursor:pointer;" onclick="window.offlineEngine.deleteContact(${c.id})"></ion-icon>
            </div>
        `).join('');
    },
    deleteContact: function(id) {
        let contacts = JSON.parse(localStorage.getItem('hm_contacts') || '[]');
        contacts = contacts.filter(c => c.id !== id);
        localStorage.setItem('hm_contacts', JSON.stringify(contacts));
        this.renderContacts();
    },

    // --- 2. حاسبة BMI ---
    calculateBMI: function() {
        const w = parseFloat(document.getElementById('bmi-weight').value);
        const h = parseFloat(document.getElementById('bmi-height').value) / 100;
        const resDiv = document.getElementById('bmi-result');
        
        if(!w || !h) return window.showToast(window.getLangText('msg_enter_weight_height'));
        
        const bmi = (w / (h * h)).toFixed(1);
        let status = "", color = "";
        
        if(bmi < 18.5) { status = window.getLangText('bmi_underweight'); color = "var(--orange)"; }
        else if(bmi < 24.9) { status = window.getLangText('bmi_normal'); color = "var(--green)"; }
        else if(bmi < 29.9) { status = window.getLangText('bmi_overweight'); color = "var(--gold)"; }
        else { status = window.getLangText('bmi_obese'); color = "var(--red)"; }
        
        resDiv.innerHTML = `${window.getLangText('bmi_result_lbl')} ${bmi} <br><span style="color:${color}; font-size:18px;">(${status})</span>`;
    },

    // --- 3. متعقب الماء ---
    drinkWater: function() {
        let count = parseInt(localStorage.getItem('hm_water') || '0');
        if(count >= 8) return window.showToast(window.getLangText('msg_water_goal_reached'));
        
        count++;
        localStorage.setItem('hm_water', count.toString());
        this.renderWater();
        window.showToast(window.getLangText('msg_water_logged'));
    },
    resetWater: function() {
        localStorage.setItem('hm_water', '0');
        this.renderWater();
    },
    renderWater: function() {
        const count = parseInt(localStorage.getItem('hm_water') || '0');
        const fillElem = document.getElementById('water-fill-level');
        const countElem = document.getElementById('water-count');
        if(fillElem && countElem) {
            countElem.innerText = count;
            fillElem.style.height = `${(count / 8) * 100}%`;
        }
    },

    // --- 4. سجل القياسات ---
    saveVital: function() {
        const type = document.getElementById('vital-type');
        const val = document.getElementById('vital-value').value;
        if(!val) return window.showToast(window.getLangText('msg_enter_value'));
        
        const typeText = type.options[type.selectedIndex].text;
        let vitals = JSON.parse(localStorage.getItem('hm_vitals') || '[]');
        
        const date = new Date();
        const dateString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        vitals.unshift({ id: Date.now(), type: typeText, val, date: dateString });
        if(vitals.length > 20) vitals.pop(); // نحتفظ بآخر 20 قراءة فقط
        
        localStorage.setItem('hm_vitals', JSON.stringify(vitals));
        document.getElementById('vital-value').value = '';
        this.renderVitals();
        window.showToast(window.getLangText('msg_vital_logged'));
    },
    renderVitals: function() {
        const list = document.getElementById('vitals-list');
        if(!list) return;
        let vitals = JSON.parse(localStorage.getItem('hm_vitals') || '[]');
        list.innerHTML = vitals.map(v => `
            <div class="hm-list-item" style="padding:10px 15px;">
                <div>
                    <h4 style="margin:0; font-size:14px; color:var(--orange);">${v.type}</h4>
                    <p style="margin:0; font-size:11px; color:var(--text-sub);"><ion-icon name="time-outline"></ion-icon> ${v.date}</p>
                </div>
                <strong style="font-size:16px;">${v.val}</strong>
            </div>
        `).join('');
    }
};

// تشغيل الوظائف عند فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.offlineEngine.renderContacts();
    window.offlineEngine.renderWater();
    window.offlineEngine.renderVitals();
});
// ==========================================
// 👤 محرك جلب بيانات المريض الحقيقية (أونلاين)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // التأكد من وجود الفايربيس لتجنب الأخطاء
    if (typeof window.firebase !== 'undefined') {
        
        firebase.auth().onAuthStateChanged((user) => {
            const nameElement = document.getElementById('patient-name');
            
            if (user && nameElement) {
                // 1. إذا كان مسجلاً بحساب جوجل (الاسم موجود جاهز)
                if (user.displayName) {
                    nameElement.innerText = user.displayName;
                } 
                // 2. إذا كان مسجلاً بالبريد وكلمة السر (نجلب الاسم من Firestore)
                else {
                    firebase.firestore().collection('users').doc(user.uid).get()
                        .then((doc) => {
                            if (doc.exists && doc.data().name) {
                                nameElement.innerText = doc.data().name;
                            } else {
                                // كبديل إذا لم يجد اسماً
                                nameElement.innerText = window.getLangText('online_patient') || "مريض (أونلاين)";
                            }
                        }).catch(() => {
                            nameElement.innerText = "مريض";
                        });
                }
            } 
            else if (!user) {
                // 🚨 أمان إضافي: إذا كان غير مسجل دخول وانتهت الجلسة، اطرده لصفحة الدخول
                window.location.href = "../index.html";
            }
        });
    }
});