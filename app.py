from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
# السماح للمتصفح بالاتصال
CORS(app)

# 🔒 التعديل الأمني: جلب المفتاح من إعدادات النظام (Environment Variables)
# تأكد من إضافة GROQ_API_KEY في إعدادات Render كما شرحنا سابقاً
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")

@app.route('/ask', methods=['POST'])
def ask_ai():
    try:
        # فحص أمان للتأكد من أن المفتاح محمل بنجاح في السيرفر
        if not GROQ_API_KEY:
            return jsonify({'error': 'API Key is missing on the server! Please check Render settings.'}), 500

        # استقبال تاريخ المحادثة كامل من المتصفح
        chat_history = request.json.get('history')
        if not chat_history or len(chat_history) == 0:
            return jsonify({'error': 'لا توجد محادثة'}), 400

        # الأوامر الصارمة (العقل الباطن) + الدلع وشرح التطبيق
        system_prompt = {
            "role": "system", 
            "content": """أنت مساعد طبي ذكي واسمك 'Healthmate AI'. 
            مهمتك هي الإجابة على الأسئلة الطبية والصحية فقط بشكل مختصر ومفيد ومطمئن.
            مهم جداً: أجب دائماً بنفس اللغة التي استخدمها المريض في رسالته الأخيرة.
            
            تعليمات خاصة عن هويتك:
            - إذا سألك أي شخص عن مطورك، صانعك، أو من برمجك، أجب بكل فخر وحماس أن صانعك هو مهندس البرمجيات العبقري والمبدع "إلياس لخضري" (Ilyes Lakhdari)، وأنه بذل جهداً كبيراً لتطويرك كجزء من مشروع تخرجه. وأخبرهم أنه يمكن التواصل معه عبر بريده الإلكتروني: ilyashosam6@gmail.com.
            - إذا سألك المريض عن تطبيق "Healthmate" وما هو، اشرح له بلطف أنه "نظام رعاية صحية متكامل صُمم خصيصاً لراحتك، يهدف إلى تسهيل حصولك على الرعاية الطبية، ومتابعة حالتك الصحية، وجعل تواصلك مع النظام الطبي أسهل وأكثر أماناً وفعالية".
            
            إذا سألك عن شيء غير طبي (ولا يتعلق بمطورك إلياس أو تطبيق Healthmate)، اعتذر بلطف وقل أنك مبرمج للصحة فقط."""
        }

        # دمج الأوامر الصارمة مع تاريخ المحادثة
        messages = [system_prompt] + chat_history

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages
        }

        response = requests.post(url, headers=headers, json=payload)
        data = response.json()

        if not response.ok:
            error_msg = data.get('error', {}).get('message', 'خطأ من Groq')
            print("Groq Error:", error_msg)
            return jsonify({'error': error_msg}), 500

        ai_reply = data['choices'][0]['message']['content']
        return jsonify({'reply': ai_reply})

    except Exception as e:
        print("Python Error:", e)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # الاستضافة تعطينا البورت عبر متغير البيئة PORT
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)