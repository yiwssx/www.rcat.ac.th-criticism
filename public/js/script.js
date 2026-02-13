/* =========================
   CONFIG
========================= */
const API_URL = (window.APP_CONFIG && window.APP_CONFIG.API_URL)
  ? String(window.APP_CONFIG.API_URL).trim()
  : '';
const MAX_FILE_MB = 1.5;
const MAX_FILES = 3;
const MAX_TOTAL_MB = 5;

/* =========================
   DOM
========================= */
const form = document.getElementById('complaintForm');
const btn = document.getElementById('submitBtn');
const card = document.getElementById('formCard');
const statusDiv = document.getElementById('status');

const subjectEl = document.getElementById('subject');
const nameEl = document.getElementById('name');
const emailEl = document.getElementById('email');
const phoneEl = document.getElementById('phone');
const complaintEl = document.getElementById('complaint');
const filesEl = document.getElementById('files');

/* =========================
   UI
========================= */
function setLoading(v) {
  btn.disabled = v;
  card.classList.toggle('opacity-70', v);
  card.classList.toggle('pointer-events-none', v);

  if (v) {
    statusDiv.className = 'mt-5 min-h-6 text-center text-sm font-semibold text-slate-600';
    statusDiv.textContent = 'กำลังส่งข้อมูล...';
  } else {
    statusDiv.textContent = '';
  }
}

function showError(msg, el) {
  statusDiv.className = 'mt-5 min-h-6 text-center text-sm font-semibold text-rose-600';
  statusDiv.textContent = msg;
  if (el) el.focus();
}

function showSuccess(msg) {
  statusDiv.className = 'mt-5 min-h-6 text-center text-sm font-semibold text-emerald-600';
  statusDiv.textContent = msg;
}

/* =========================
   UTILS
========================= */
const v = el => (el.value || '').trim();
const sanitize = s => String(s || '').trim();

/* =========================
   VALIDATION
========================= */
function validate(d) {
  if (!d.subject) throw { msg: 'กรุณาเลือกหัวข้อ', el: subjectEl };

  if (d.name.length < 2) throw { msg: 'กรอกชื่อให้ครบ', el: nameEl };

  if (d.email && !/^\S+@\S+\.\S+$/.test(d.email)) {
    throw { msg: 'อีเมลไม่ถูกต้อง', el: emailEl };
  }

  if (!/^[0-9]{9,10}$/.test(d.phone.replace(/\D/g, ''))) {
    throw { msg: 'เบอร์โทรไม่ถูกต้อง', el: phoneEl };
  }

  if (d.complaint.length < 5) {
    throw { msg: 'รายละเอียดสั้นเกินไป', el: complaintEl };
  }
}

/* =========================
   FILES
========================= */
async function readFiles(list) {
  if (list.length > MAX_FILES) {
    throw { msg: `แนบได้ไม่เกิน ${MAX_FILES} ไฟล์` };
  }

  let total = 0;
  const results = [];

  for (const f of list) {
    total += f.size;

    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      throw { msg: `ไฟล์ ${f.name} ใหญ่เกินกำหนด` };
    }

    if (total > MAX_TOTAL_MB * 1024 * 1024) {
      throw { msg: 'ขนาดไฟล์รวมเกิน 5MB' };
    }

    const base64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(f);
    });

    results.push({
      fileName: f.name,
      data: base64,
      mimeType: f.type
    });
  }

  return results;
}

/* =========================
   API
========================= */
async function submitToApi(data) {
  if (!API_URL) {
    throw new Error('Missing API_URL in config.js');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(data)
  });

  const text = await res.text();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error(`Unexpected API response: ${text.slice(0, 120)}`);
  }

  if (!parsed.ok) {
    throw new Error(parsed.message || 'ระบบขัดข้อง');
  }

  return parsed;
}

/* =========================
   SUBMIT
========================= */
form.addEventListener('submit', async e => {
  e.preventDefault();

  if (btn.disabled) return;

  try {
    setLoading(true);

    const data = {
      subject: sanitize(v(subjectEl)),
      name: sanitize(v(nameEl)),
      email: sanitize(v(emailEl)),
      phone: sanitize(v(phoneEl)),
      complaint: sanitize(v(complaintEl)),
      ua: navigator.userAgent
    };

    validate(data);
    data.files = await readFiles(filesEl.files);

    const result = await submitToApi(data);

    setLoading(false);
    showSuccess(result.message || 'ส่งสำเร็จ');
    form.reset();
  } catch (err) {
    setLoading(false);
    showError(err.msg || err.message || 'ระบบขัดข้อง');
  }
});
