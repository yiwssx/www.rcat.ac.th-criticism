import { useMemo, useRef, useState } from "react";

const MAX_FILE_MB = 1.5;
const MAX_FILES = 3;
const MAX_TOTAL_MB = 5;

const STATUS_CLASS = {
  idle: "mt-5 min-h-6 text-center text-sm font-semibold text-slate-600",
  loading: "mt-5 min-h-6 text-center text-sm font-semibold text-slate-600",
  error: "mt-5 min-h-6 text-center text-sm font-semibold text-rose-600",
  success: "mt-5 min-h-6 text-center text-sm font-semibold text-emerald-600"
};

function getApiUrl() {
  const envUrl = import.meta.env.VITE_API_URL
    ? String(import.meta.env.VITE_API_URL).trim()
    : "";
  const runtimeUrl = window.APP_CONFIG?.API_URL
    ? String(window.APP_CONFIG.API_URL).trim()
    : "";

  return envUrl || runtimeUrl;
}

const API_URL = getApiUrl();
const sanitize = (value) => String(value || "").trim();

function validate(data) {
  if (!data.subject) return { msg: "กรุณาเลือกหัวข้อ", field: "subject" };
  if (data.name.length < 2) return { msg: "กรอกชื่อให้ครบ", field: "name" };

  if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
    return { msg: "อีเมลไม่ถูกต้อง", field: "email" };
  }

  if (!/^[0-9]{9,10}$/.test(data.phone.replace(/\D/g, ""))) {
    return { msg: "เบอร์โทรไม่ถูกต้อง", field: "phone" };
  }

  if (data.complaint.length < 5) {
    return { msg: "รายละเอียดสั้นเกินไป", field: "complaint" };
  }

  return null;
}

async function readFiles(list) {
  if (list.length > MAX_FILES) {
    throw { msg: `แนบได้ไม่เกิน ${MAX_FILES} ไฟล์` };
  }

  let total = 0;
  const results = [];

  for (const file of list) {
    total += file.size;

    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      throw { msg: `ไฟล์ ${file.name} ใหญ่เกินกำหนด` };
    }

    if (total > MAX_TOTAL_MB * 1024 * 1024) {
      throw { msg: "ขนาดไฟล์รวมเกิน 5MB" };
    }

    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") {
          reject(new Error("Invalid file data"));
          return;
        }

        resolve(reader.result.split(",")[1] || "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    results.push({
      fileName: file.name,
      data: base64,
      mimeType: file.type
    });
  }

  return results;
}

async function submitToApi(data) {
  if (!API_URL) {
    throw new Error("Missing API_URL in public/config.js or VITE_API_URL");
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(data)
  });

  const text = await response.text();
  let parsed;

  try {
    parsed = JSON.parse(text);
  } catch (_) {
    throw new Error(`Unexpected API response: ${text.slice(0, 120)}`);
  }

  if (!parsed.ok) {
    throw new Error(parsed.message || "ระบบขัดข้อง");
  }

  return parsed;
}

const defaultForm = {
  subject: "",
  name: "",
  email: "",
  phone: "",
  complaint: ""
};

export default function App() {
  const [formData, setFormData] = useState(defaultForm);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "idle", message: "" });

  const subjectRef = useRef(null);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const complaintRef = useRef(null);
  const filesRef = useRef(null);

  const logoSrc = useMemo(
    () => `${import.meta.env.BASE_URL}assets/rcat-logo.jpg`,
    []
  );

  const refsByField = {
    subject: subjectRef,
    name: nameRef,
    email: emailRef,
    phone: phoneRef,
    complaint: complaintRef,
    files: filesRef
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = (event) => {
    setFiles(Array.from(event.target.files || []));
  };

  const setError = (message, field) => {
    setStatus({ type: "error", message });

    if (field && refsByField[field]?.current) {
      refsByField[field].current.focus();
    }
  };

  const resetForm = () => {
    setFormData(defaultForm);
    setFiles([]);
    if (filesRef.current) filesRef.current.value = "";
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    try {
      setLoading(true);
      setStatus({ type: "loading", message: "กำลังส่งข้อมูล..." });

      const data = {
        subject: sanitize(formData.subject),
        name: sanitize(formData.name),
        email: sanitize(formData.email),
        phone: sanitize(formData.phone),
        complaint: sanitize(formData.complaint),
        ua: navigator.userAgent
      };

      const issue = validate(data);
      if (issue) throw issue;

      data.files = await readFiles(files);
      const result = await submitToApi(data);

      setStatus({ type: "success", message: result.message || "ส่งสำเร็จ" });
      resetForm();
    } catch (error) {
      setError(error.msg || error.message || "ระบบขัดข้อง", error.field);
    } finally {
      setLoading(false);
    }
  };

  const cardClass = loading
    ? "form-shell rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-300/50 backdrop-blur transition md:p-8 opacity-70 pointer-events-none"
    : "form-shell rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-slate-300/50 backdrop-blur transition md:p-8";

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 [font-family:'Sarabun',sans-serif]">
      <div className="relative isolate min-h-screen w-full overflow-hidden px-4 py-10">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-300/50 blur-3xl"></div>
        <div className="pointer-events-none absolute -bottom-20 right-0 h-60 w-60 rounded-full bg-cyan-300/50 blur-3xl"></div>

        <main className="relative mx-auto w-full max-w-2xl">
          <section id="formCard" className={cardClass}>
            <div className="mb-8 text-center">
              <img
                src={logoSrc}
                alt="RCAT Logo"
                className="mx-auto mb-4 h-20 w-auto rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200"
              />
              <p className="text-m font-medium text-slate-500">
                วิทยาลัยเกษตรและเทคโนโลยีร้อยเอ็ด
              </p>
              <p className="text-sm font-medium text-slate-500">
                Roi-et College of Agriculture and Technology
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                แบบฟอร์มแจ้งเรื่องร้องเรียน
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                กรอกข้อมูลให้ครบถ้วน ระบบจะส่งเรื่องให้ผู้ดูแลทันที
              </p>
            </div>

            <form className="space-y-4" onSubmit={onSubmit}>
              <div>
                <label
                  htmlFor="subject"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  หัวข้อร้องเรียน
                </label>
                <select
                  ref={subjectRef}
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="">-- เลือกหัวข้อที่ร้องเรียน --</option>
                  <option value="การเรียนการสอน">การเรียนการสอน</option>
                  <option value="ครู/บุคลากร">ครู/บุคลากร</option>
                  <option value="อาคารสถานที่">อาคารสถานที่</option>
                  <option value="ระบบไอที">ระบบไอที</option>
                  <option value="การเงิน/พัสดุ">การเงิน/พัสดุ</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="name"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  ชื่อ-นามสกุล
                </label>
                <input
                  ref={nameRef}
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="เช่น สมชาย ใจดี"
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    อีเมล (ถ้ามี)
                  </label>
                  <input
                    ref={emailRef}
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@example.com"
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="phone"
                    className="mb-1 block text-sm font-semibold text-slate-700"
                  >
                    เบอร์โทร
                  </label>
                  <input
                    ref={phoneRef}
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="08xxxxxxxx"
                    required
                    className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="complaint"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  รายละเอียดเรื่องร้องเรียน
                </label>
                <textarea
                  ref={complaintRef}
                  id="complaint"
                  name="complaint"
                  rows={4}
                  value={formData.complaint}
                  onChange={handleChange}
                  placeholder="ระบุเหตุการณ์ สถานที่ และรายละเอียดที่เกี่ยวข้อง"
                  required
                  className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-700 focus:ring-4 focus:ring-blue-100"
                ></textarea>
              </div>

              <div>
                <label
                  htmlFor="files"
                  className="mb-1 block text-sm font-semibold text-slate-700"
                >
                  แนบไฟล์ (ภาพ/PDF)
                </label>
                <input
                  ref={filesRef}
                  id="files"
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFiles}
                  className="block w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600 file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:border-blue-300"
                />
                <p className="mt-1 text-xs text-slate-500">
                  แนบได้สูงสุด 3 ไฟล์ ขนาดรวมไม่เกิน 5MB
                </p>
              </div>

              <button
                id="submitBtn"
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-300/40 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:shadow-none"
              >
                {loading ? "กำลังส่ง..." : "ส่งเรื่องร้องเรียน"}
              </button>
            </form>

            <div id="status" className={STATUS_CLASS[status.type]}>
              {status.message}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
