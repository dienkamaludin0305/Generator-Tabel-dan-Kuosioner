import React, { useState } from 'react';
import {
  Database, ArrowRight, Loader2, Table2, Wand2, UploadCloud, Download,
  ListChecks, Plus, Trash2, LayoutDashboard, ChevronRight, ChevronDown, Info, Sparkles, AlertCircle,
  User, CheckCircle2, Map, Bell, BookOpen, Target, LayoutTemplate, FileSpreadsheet, Save
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import html2pdf from 'html2pdf.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const HourglassLoader = () => (
  <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0b1120]/90 backdrop-blur-md animate-in fade-in duration-300">
    <div className="relative w-20 h-28 flex flex-col items-center mb-10 hourglass-spin drop-shadow-[0_0_15px_rgba(14,165,233,0.5)]">
      {/* Kaca Atas */}
      <div className="w-14 h-12 bg-white/5 border-[3px] border-slate-400/80 border-b-0 rounded-t-[14px] relative overflow-hidden flex justify-center">
        <div className="w-full bg-gradient-to-b from-[#38bdf8] to-[#0ea5e9] absolute bottom-0 left-0 top-sand"></div>
      </div>
      {/* Leher */}
      <div className="w-2.5 h-3 bg-slate-400/80 relative z-10 -my-0.5 rounded-[1px]"></div>
      {/* Kaca Bawah */}
      <div className="w-14 h-12 bg-white/5 border-[3px] border-slate-400/80 border-t-0 rounded-b-[14px] relative overflow-hidden flex justify-center shadow-[inset_0_-10px_15px_rgba(0,0,0,0.2)]">
        <div className="w-full bg-gradient-to-t from-[#0284c7] to-[#0ea5e9] absolute bottom-0 left-0 bottom-sand rounded-b-[10px]"></div>
      </div>
    </div>
    <div className="bg-slate-800/80 border border-slate-700 shadow-2xl px-8 py-3.5 rounded-full flex items-center gap-4">
      <div className="flex space-x-1.5">
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
        <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
      </div>
      <span className="text-white font-black tracking-[0.2em] text-[11px] uppercase">Mengekstrak Dokumen...</span>
    </div>
    <style>{`
      .hourglass-spin {
        animation: spinHourglass 2.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
      }
      .top-sand {
        animation: shrinkSand 2.5s infinite linear;
      }
      .bottom-sand {
        animation: fillSand 2.5s infinite linear;
      }
      @keyframes spinHourglass {
        0%, 75% { transform: rotate(0deg); }
        90%, 100% { transform: rotate(180deg); }
      }
      @keyframes shrinkSand {
        0% { height: 100%; top: 0%; }
        75%, 100% { height: 0%; top: 100%; }
      }
      @keyframes fillSand {
        0% { height: 0%; }
        75%, 100% { height: 100%; }
      }
    `}</style>
  </div>
);

export default function App() {
  const [currentStep, setCurrentStep] = useState('roadmap');
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [sekunderFileName, setSekunderFileName] = useState('');
  const [isSekunderUploading, setIsSekunderUploading] = useState(false);
  const [sekunderContent, setSekunderContent] = useState('');
  const [error, setError] = useState('');

  const [userProfile, setUserProfile] = useState({
    nama: '', perguruanTinggi: '', prodi: '', fakultas: '', jenjang: 'S1'
  });

  const [researchData, setResearchData] = useState({
    judul: '', babContent: '', teknik: 'Observasi (Pengamatan)', metodologi: 'Kuantitatif Deskriptif', skalaKuesioner: 'Skala Likert (5 Poin: SS-STS)'
  });

  const [variabelData, setVariabelData] = useState([]);
  const [observasiData, setObservasiData] = useState([]);
  const [checkedLampiranIds, setCheckedLampiranIds] = useState([]);
  const [isLampiranGenerated, setIsLampiranGenerated] = useState(false);
  const [isGeneratingLampiran, setIsGeneratingLampiran] = useState(false);
  const [primerHeaders, setPrimerHeaders] = useState([]);
  const [primerRows, setPrimerRows] = useState([]);
  const [tableHeaders, setTableHeaders] = useState([]);
  const [tableRows, setTableRows] = useState([]);
  const [questionCounts, setQuestionCounts] = useState({});
  const [selectedDesign, setSelectedDesign] = useState({});

  const fillBioDummy = () => {
    setUserProfile({
      nama: 'Andi Rianto', perguruanTinggi: 'Universitas Padjadjaran', prodi: 'Biologi', fakultas: 'MIPA', jenjang: 'S1'
    });
    setResearchData({
      judul: 'Analisis Kemampuan Literasi Baca Berbasis Digital',
      babContent: 'Penelitian ini akan mengukur sampel parameter secara langsung pada responden siswa.',
      metodologi: 'Kuantitatif Deskriptif',
      teknik: 'Kuesioner (Angket)',
      skalaKuesioner: 'Skala Likert (5 Poin: SS-STS)'
    });
  };

  const getFormatJsonTemplate = (teknik) => {
    const isWawancara = teknik.toLowerCase().includes('wawancara');
    const isKuesioner = teknik.toLowerCase().includes('kuesioner');
    
    let itemExample = "";
    if (isKuesioner) {
      itemExample = `        { "id": "p1", "parameter": "Definisi Indikator Super Kuat (X1)", "satuan": "Poin Skala", "lampiranInstruksi": "SOP Teknis responden" }`;
    } else if (isWawancara) {
      itemExample = `        { "id": "p1", "parameter": "Definisi Indikator Spesifik (X1)", "satuan": "Kualitatif", "lampiranInstruksi": "Probing mendalam eksplorasi" }`;
    } else {
      itemExample = `        { "id": "p1", "parameter": "Faktor Ukur Utama", "satuan": "Validitas Angka", "lampiranInstruksi": "Catat metrik lapangan", "lampiranHeaders": ["Lokasi Titik", "Utara", "Timur", "Catatan"] }`;
    }

    return `{
  "variabel_penelitian": [
    { "jenis": "Variabel Utama", "nama": "Nama Variabel", "penjelasan": "Penjelasan padat." }
  ],
  "observasi": [
    {
      "dimensi": "Dimensi 1",
      "lampiranInstruksi": "SOP Instruksi...",
      ${(!isKuesioner && !isWawancara) ? '"lampiranHeaders": ["Lokasi Titik", "Utara", "Timur", "Catatan"],' : ''}
      "items": [
${itemExample}
      ]
    }
  ],
  "primerHeaders": [
    { "code": "P1", "desc": "Indikator 1" },
    { "code": "P2", "desc": "Indikator 2" }
  ],
  "dummyPrimer": [
    { "id": 1, "responden": "Target 01", "P1": 85, "P2": 15 },
    { "id": 2, "responden": "Target 02", "P1": 80, "P2": 12 },
    { "id": 3, "responden": "Target 03", "P1": 70, "P2": 10 }
    // ... LANJUTKAN HINGGA 5 DATA SAMPEL SAJA ...
  ]
}`;
  };

  const PROMPT_TEMPLATE = `
PERAN ANDA (ROLE-BASED AI):
Anda adalah seorang "Ahli Metodologi Utama" yang berspesialisasi secara eksklusif pada Jenis Metodologi "{metodologi}" dengan penerapan eksekusi lapangan melalui Teknik "{teknik}" dalam bidang keilmuan {prodi}. 

KAIDAH MUTLAK METODOLOGI ("{metodologi}"):
- JIKA "{metodologi}" KUALITATIF: Anda WAJIB bersikap sebagai empiris kualitatif yang mengacu ketat pada model Miles, Huberman, & Saldana. Fokus utama hasil Anda adalah triangulasi, probing mendalam, fenomena subjektif, dan transkripsi. Dilarang menggunakan metrik angka murni.
- JIKA "{metodologi}" KUANTITATIF/EKSPERIMEN: Anda WAJIB bersikap sebagai statistikawan kaku. Fokus utama hasil Anda adalah angka pasti, validitas & reliabilitas, eksperimen berulang, galat, N-Gain, dan observasi faktual eksak (bebas dari asumsi subjektif).
- JIKA R&D/MIXED: Kombinasikan tahap eksplorasi dan tahap pengujian produk.

Sebagai ahli dari teknik "{teknik}", rancangan instrumen apa pun yang Anda tulis harus mencerminkan identitas teknik tersebut secara absolut dan mustahil dibantah oleh penguji skripsi mana pun.

Berdasarkan parameter skripsi di bawah ini:
Judul Skripsi: "{judul}"
Jenis Metodologi: "{metodologi}"
Teknik Pengambilan Data: "{teknik}"
Format Skala (Khusus Kuesioner): "{skala}"
Konteks Alat / Tambahan: "{konteks}"
Program Studi Mahasiswa: "{prodi}"

Tugas:
1. Ekstrak dan definisikan Variabel Utama penelitian (X, Y, Z, M jika ada). Jelaskan setiap variabel secara PADAT, LUGAS, dan RINGKAS.
2. Rancang instrumen spesifik secara TEKNIS dan MENDALAM yang merupakan derivasi/turunan langsung dari Variabel tersebut untuk menjawab rumusan masalah. Desain instrumen harus SANGAT MENGIKUTI pola Teknik Pengambilan Data ("{teknik}"):
   - Jika Wawancara: Hasilkan daftar pertanyaan wawancara mendalam yang SANGAT SPESIFIK membahas masing-masing Variabel. BUKAN pertanyaan generik! Gunakan teknik 5W+1H dan Probing. JANGAN HASILKAN FORMAT TABEL UNTUK WAWANCARA.
   - Jika Kuesioner: Operasionalisasikan kerangka variabel menjadi indikator dengan SANGAT MENDALAM. Tipe Skala: {skala}.
   - Jika Studi Dokumentasi: Hasilkan daftar kebutuhan arsip/dokumen legal formal dan poin ekstraksinya.
   - Jika Eksperimen: WAJIB pecah menjadi 2 Dimensi Utama Eksperimen dengan format kolom SUPER SPESIFIK dan MENDALAM untuk Program Studi {prodi} tanpa campur aduk bidang lain:
     * Dimensi 1: "Tabel Tabulasi Data Utama Eksperimen". Tiap Item di dalamnya WAJIB menggunakan array \`lampiranHeaders\` PERSIS seperti ini: ["ID Subjek", "Kovariat / Blok (Syarat RAK & ANAKOVA)", "Perlakuan (Syarat RAL, Faktorial, Uji Beda)", "Baseline/Pre-Test", "Final/Post-Test", "Selisih Gain Score", "Catatan Galat Percobaan"]. Hasilkan turunan item parameter sesuai rincian Klasifikasi Variabel penelitian (Bebas, Terikat).
     * Dimensi 2: "Tabel Log Observasi Harian (Dimensi Kontekstual)". Tiap Item di dalamnya WAJIB menggunakan array \`lampiranHeaders\` PERSIS seperti ini: ["Sesi/Hari", "Waktu/Timestamp", "Variabel Kontrol (Kondisi Lingkungan)", "Log Aktivitas/Intervensi", "Faktor Pengganggu (Noise)", "Tindakan Koreksi"]. Hasilkan turunan item parameter terkait Variabel Kontrol dan faktor pengganggu potensial.
     Tiap parameter harus menyertakan Satuan Ukur yang 100% valid secara sains untuk prodi {prodi} (Misal Kedokteran=mmHg, Teknik=Joule, atau Pendidikan=Skor Poin). Terapkan secara penuh kaidah Randomization dan Validitas!
   - Jika Observasi: Hasilkan susunan parameter pengamatan fisik lapangan, kuadran, dsb.
3. Instrumen/Parameter harus dikelompokkan hierarkis ke dalam "Dimensi" yang mencerminkan Variabel Studi.
4. Setiap item/parameter WAJIB mencantumkan Satuan ukur / Skala / Tolok Ukur Validasi / Target Subjek.
5. Siapkan struktur header Tabel Primer dan WAJIB hasilkan 7 sampel mock-data skenario lapangan yang distribusinya logis, nyata, dan bervariasi pada bagian dummyPrimer.
6. SANGAT PENTING: PADA TAHAP INI, JANGAN PERNAH MENGHASILKAN ARRAY \`pernyataan\` ATAU \`pertanyaan\` KE DALAM JSON DI BAWAH ITEMS! CUKUP PEMECAHAN HINGGA LEVEL PARAMETER/INDIKATOR SAJA! Desain draft isi kuesioner/wawancara akan dilakukan di tahap berbeda agar JSON tidak terpotong (truncated).
   - UNTUK METODE KUESIONER/WAWANCARA: JANGAN buat \`lampiranHeaders\` di dalam items observasi. Dilarang!
   - UNTUK METODE EKSPERIMEN/OBSERVASI LAIN: WAJIB buat \`lampiranHeaders\` berisi judul kolom spesifik tabel harian.

WAJIB KEMBALIKAN HANYA OBJEK JSON MURNI YANG VALID. DILARANG MEMBERIKAN TEKS PENDAHULUAN ATAU BACKTICKS:
{format_json}
`;

  const generateDetailingFallback = (judul = "Analisis Stratifikasi Vegetasi", prodi = "Biologi", teknik = "Observasi", skala = "") => {
    const isK = teknik.toLowerCase().includes('kuesioner');
    const isG = skala.toLowerCase().includes('guttman');
    
    return {
      variabel_penelitian: [
        { jenis: "Struktur Model", nama: `Model Konsep: ${prodi}`, penjelasan: `Variabel secara spesifik diambil dari: ${judul}` },
        { jenis: "Variabel Y (Dependen)", nama: "Fokus Output", penjelasan: "Sistem mengalami kegagalan AI (fallback), variabel ini adalah perwakilan umum." }
      ],
      observasi: [
        {
          dimensi: isK ? `Dimensi Konstruk Kuesioner (Skala ${isG ? 'Guttman' : 'Likert'})` : "Dimensi Observasi Umum",
          lampiranInstruksi: isK ? `SOP Kuesioner: Pastikan responden memahami bahwa skala yang dipakai adalah ${isG ? 'Ya / Tidak' : 'SS / S / N / TS / STS'} sebelum mereka memberikan jawaban. Jamin Anonimitas.` : "SOP Pengambilan Data: Lakukan pengukuran/pengisian instrumen secara cermat berdasarkan parameter yang ditetapkan.",
          items: [
            { id: "p1", parameter: isK ? `Indikator Konstruk 1: Sikap Positif Responden` : "Indikator Target Utama 1", satuan: isK ? (isG ? "Biner" : "Poin Ordinal") : "Skala Validasi / Kategori", lampiranInstruksi: isK ? "Jangan memberi arahan yang bias kepada responden." : "Identifikasi sampel target sedekat mungkin.", pernyataan: isK ? [{teks: "Guru membimbing materi dengan sangat jelas.", sifat: "Favorable", skor: "SS=5..."}, {teks: "Banyak penjelasan yang berbelit-belit.", sifat: "Unfavorable", skor: "SS=1..."}] : [], pertanyaan: ["Terkait indikator ini, bagaimana dampaknya secara praktis?", "Solusi apa yang bisa ditawarkan untuk mengoptimalkan indikator ini?"] },
            { id: "p2", parameter: isK ? `Indikator Konstruk 2: Evaluasi Faktor Hambatan` : "Indikator Target Utama 2", satuan: isK ? (isG ? "Biner" : "Poin Ordinal") : "Skala Validasi / Kategori", lampiranInstruksi: isK ? "Jelaskan definisi istilah sulit jika responden bingung." : "Lakukan pencatatan frekuensi kemunculan.", pernyataan: isK ? [{teks: "Alat K3 yang tersedia sudah kedaluwarsa.", sifat: "Unfavorable", skor: "SS=1..."}, {teks: "Lingkungan kerja kondusif.", sifat: "Favorable", skor: "SS=5..."}] : [], pertanyaan: ["Bagaimana fluktuasi target memengaruhi kinerja Anda?", "Faktor dominan apa yang menghambat proses terkait indikator ini?"] }
          ]
        }
      ],
      primerHeaders: [
        { code: "P1", desc: "Indikator 1" },
        { code: "P2", desc: "Indikator 2" }
      ],
      dummyPrimer: [
        { id: 1, responden: "Target 01", P1: 85, P2: 15 },
        { id: 2, responden: "Target 02", P1: 75, P2: 12 },
        { id: 3, responden: "Target 03", P1: 90, P2: 18 }
      ]
    };
  };

  const runAI = async (promptText) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    const orKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    const fetchFromOpenRouter = async () => {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${orKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:5176"
        },
        body: JSON.stringify({
          "model": "google/gemini-2.5-flash",
          "response_format": { "type": "json_object" },
          "max_tokens": 8192,
          "messages": [{ "role": "user", "content": promptText }]
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "OpenRouter Request Failed");
      if (!data.choices || !data.choices[0]) throw new Error("Format output OpenRouter tidak valid.");
      return data.choices[0].message.content;
    };

    if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
          model: "gemini-2.5-flash",
          generationConfig: { 
            responseMimeType: "application/json",
            maxOutputTokens: 8192
          }
        });
        const aiResponse = await model.generateContent(promptText);
        return aiResponse.response.text();
      } catch (geminiError) {
        console.warn("Gemini Failed, attempting OpenRouter...", geminiError);
        if (orKey && orKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
          return await fetchFromOpenRouter();
        } else {
          throw geminiError;
        }
      }
    } else if (orKey && orKey !== 'YOUR_OPENROUTER_API_KEY_HERE') {
      return await fetchFromOpenRouter();
    }
    throw new Error("No API Keys configured");
  };

  const extractPdfText = async (arrayBuffer) => {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let fullText = '';
    const numPages = Math.min(100, pdf.numPages);
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + ' \n';
    }
    return fullText;
  };

  const extractDocxText = async (arrayBuffer) => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsFileUploading(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(buffer);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        text = await extractDocxText(buffer);
      } else {
        setError("Format file tidak didukung. Mohon unggah PDF atau DOCX.");
        setIsFileUploading(false);
      }

      const rawText = text.substring(0, 300000);
      const coverText = text.substring(0, 5000);

      let identityData = {};
      try {
        setIsFileUploading(true);
        setError('');
        const idPrompt = `Ekstrak data profil peneliti berdasarkan teks halaman awal skripsi berikut. Lakukan tebakan logis dari nama, instansi, dsb. JIKA TIDAK DITEMUKAN SAMA SEKALI, biarkan sebagai teks kosong "".
Khusus untuk "prodi", JIKA tidak tertulis secara eksplisit, Anda WAJIB MENEBAK DAN MENYIMPULKAN program studinya yang paling masuk akal (misal: "Ilmu Komunikasi", "Manajemen", "Pendidikan Biologi") berdasarkan konteks Judul dan Fakultasnya. Jangan biarkan "prodi" kosong!

WAJIB KEMBALIKAN HANYA OBJEK JSON MURNI TANPA BACKTICKS:
{
  "judul": "Judul skripsi utama",
  "nama": "Nama mahasiswa/peneliti",
  "perguruanTinggi": "Nama universitas/institut",
  "fakultas": "Hanya nama fakultasnya",
  "prodi": "Program Studi / Jurusan (Wajib ada hasil tebakan logis)"
}

Teks:
${coverText}`;
        const idResponseText = await runAI(idPrompt);
        const jsonMatch = idResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          identityData = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error("AI Error:", e);
        setError(`Peringatan AI (${e.message}): Data akan diisi dari nama file. Mohon ketik manual jika ada bagian kosong sebelum melanjutkan.`);
      }

      const extractedJudul = identityData.judul && identityData.judul.length > 5 ? identityData.judul : "";

      const newProfile = {
        ...userProfile,
        nama: identityData.nama || userProfile.nama || "",
        perguruanTinggi: identityData.perguruanTinggi || identityData.universitas || userProfile.perguruanTinggi || "",
        fakultas: identityData.fakultas || userProfile.fakultas || "",
        prodi: identityData.prodi || userProfile.prodi || ""
      };
      setUserProfile(newProfile);

      const overrideData = {
        babContent: rawText,
        judul: extractedJudul || researchData.judul || file.name.replace(/\.[^/.]+$/, "")
      };
      setResearchData({ ...researchData, ...overrideData });

      // File extraction & AI profiling complete. Wait for user to manually trigger Tally Sheet generation.
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file. Dokumen mungkin korup atau terenkripsi.");
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleSekunderUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsSekunderUploading(true);
    setSekunderFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      let text = '';
      if (file.name.toLowerCase().endsWith('.pdf')) {
        text = await extractPdfText(buffer);
      } else if (file.name.toLowerCase().endsWith('.docx')) {
        text = await extractDocxText(buffer);
      } else {
        setError("Format file referensi sekunder tidak didukung. Mohon unggah PDF atau DOCX.");
        setIsSekunderUploading(false);
        return;
      }
      setSekunderContent(text.substring(0, 300000));
      setError('');
    } catch (err) {
      console.error(err);
      setError("Gagal mengekstrak teks file referensi sekunder.");
    } finally {
      setIsSekunderUploading(false);
    }
  };

  const handleGenerate = async (overrideData = null, overrideProfile = null) => {
    const currentJudul = overrideData && overrideData.judul ? overrideData.judul : researchData.judul;
    const currentKonteks = overrideData && overrideData.babContent ? overrideData.babContent : researchData.babContent;
    const currentProfile = overrideProfile || userProfile;

    if (!currentProfile.prodi) {
      setError("Gagal: Mohon ketikkan 'Program Studi' Anda terlebih dahulu agar AI dapat memahami landasan metodologinya.");
      return;
    }
    if (!currentJudul) {
      setError("Gagal: Judul penelitian harus diisi atau unggah dokumen terlebih dahulu.");
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let detail;
      const prompt = PROMPT_TEMPLATE
        .replace('{judul}', currentJudul)
        .replace('{metodologi}', researchData.metodologi || 'Kuantitatif Deskriptif')
        .replace('{teknik}', researchData.teknik || 'Observasi (Pengamatan)')
        .replace('{skala}', researchData.skalaKuesioner || 'Skala Likert (5 Poin: SS-STS)')
        .replace('{konteks}', currentKonteks)
        .replace('{prodi}', currentProfile.prodi)
        .replace('{format_json}', getFormatJsonTemplate(researchData.teknik || 'Observasi (Pengamatan)'));

      let responseText;
      try {
        responseText = await Promise.race([
          runAI(prompt),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 90 detik: Proses ekstraksi dokumen komprehensif sedang berlangsung, mohon coba lagi.")), 90000))
        ]);
      } catch (apiErr) {
        throw apiErr;
      }

      if (responseText) {
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            detail = JSON.parse(jsonMatch[0]);
          } else {
            const cleanedJSON = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
            detail = JSON.parse(cleanedJSON);
          }
        } catch (parseError) {
          throw new Error("JSON Parse failed. Response was: " + responseText.substring(0, 50));
        }
      } else {
        detail = generateDetailingFallback(currentJudul, currentProfile.prodi, researchData.teknik || 'Observasi', researchData.skalaKuesioner || '');
      }

      const fallback = generateDetailingFallback(currentJudul, currentProfile.prodi, researchData.teknik || 'Observasi', researchData.skalaKuesioner || '');
      setVariabelData(detail.variabel_penelitian || fallback.variabel_penelitian);
      setObservasiData(detail.observasi || fallback.observasi);
      setCheckedLampiranIds([]);
      setIsLampiranGenerated(false);
      setIsGeneratingLampiran(false);
      setPrimerHeaders(detail.primerHeaders || fallback.primerHeaders);
      setPrimerRows(detail.dummyPrimer || fallback.dummyPrimer);
      setTableHeaders(["Lokasi / Target", ...((detail.primerHeaders || fallback.primerHeaders).map(h => h.code)), "Kompleksitas"]);
      syncData(detail.primerHeaders || fallback.primerHeaders, detail.dummyPrimer || fallback.dummyPrimer);
      setCurrentStep(1);
    } catch (e) {
      console.error(e);
      setError("Ekstraksi AI Tidak Sempurna (Error parsing/timeout). Menampilkan Kerangka Dummy/Fallback untuk Anda. " + e.message);
      const fallback = generateDetailingFallback(currentJudul, currentProfile.prodi, researchData.teknik || 'Observasi', researchData.skalaKuesioner || '');
      setVariabelData(fallback.variabel_penelitian);
      setObservasiData(fallback.observasi);
      setCheckedLampiranIds([]);
      setIsLampiranGenerated(false);
      setIsGeneratingLampiran(false);
      setPrimerHeaders(fallback.primerHeaders);
      setPrimerRows(fallback.dummyPrimer);
      setTableHeaders(["Lokasi / Target", ...fallback.primerHeaders.map(h => h.code), "Kategori Evaluasi"]);
      syncData(fallback.primerHeaders, fallback.dummyPrimer);
      setCurrentStep(1);
    } finally {
      setIsLoading(false);
    }
  };

  const generateLampiranAI = async () => {
    setIsGeneratingLampiran(true);
    setError('');
    
    const selectedItems = [];
    observasiData.forEach(dim => {
      dim.items?.forEach(item => {
        if (checkedLampiranIds.includes(item.id)) {
          selectedItems.push({
            parameter: item.parameter,
            id: item.id,
            count: parseInt(questionCounts[item.id] || "5", 10)
          });
        }
      });
    });

    const isWawancara = researchData.teknik.toLowerCase().includes('wawancara');
    
    if (selectedItems.length === 0) {
      setIsGeneratingLampiran(false);
      return;
    }

    const secPrompt = `
Anda adalah ahli penelitian. Berdasarkan parameter:
Judul: "${researchData.judul}"
Teknik: "${researchData.teknik}"
Skala: "${researchData.skalaKuesioner}"

Tugas: Hasilkan PENYATAAN/PERTANYAAN secara mendalam. WAJIB patuhi batasan JUMLAH (count) untuk tiap item!
${selectedItems.map((si, idx) => `Item [ID: ${si.id}] "${si.parameter}" -> Buat TEPAT ${si.count} ${isWawancara ? 'pertanyaan' : 'pernyataan'}.`).join('\n')}

KEMBALIKAN HANYA JSON DENGAN FORMAT:
[
  {
    "id": "id item",
    ${isWawancara ? `"pertanyaan": ["tanya 1", ...]` : `"pernyataan": [{"teks": "...", "sifat": "Favorable", "skor": "SS=5..."}, ...]`}
  }
]
`;

    try {
      const response = await Promise.race([
        runAI(secPrompt),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout 90 detik saat generate ekstensi lampiran. Data terlalu kompleks.")), 90000))
      ]);
      const cleanJson = response.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      let generatedList;
      try {
        generatedList = JSON.parse(cleanJson);
      } catch (parseErr) {
        console.error("Parse Error:", cleanJson);
        throw new Error("Format JSON gagal diparsing (AI Timeout/Syntax). Silakan coba lagi.");
      }
      
      const newData = [...observasiData];
      newData.forEach(dim => {
        if (dim.items) {
          dim.items.forEach(item => {
            if (Array.isArray(generatedList)) {
              const match = generatedList.find(g => g.id === item.id);
              if (match) {
                if (isWawancara) item.pertanyaan = match.pertanyaan;
                else item.pernyataan = match.pernyataan;
              }
            }
          });
        }
      });
      setObservasiData(newData);
      setIsLampiranGenerated(true);
      setTimeout(() => { document.getElementById('lampiran-section')?.scrollIntoView({ behavior: 'smooth' }); }, 100);
    } catch(err) {
      console.error(err);
      setError("Lampiran Gagal: " + err.message);
    } finally {
      setIsGeneratingLampiran(false);
    }
  };


  const syncData = (headers = primerHeaders, rows = primerRows) => {
    const newUtama = rows.map(p => {
      const vals = headers.map(h => Number(p[h.code] || 0));
      const valText = vals.map(v => typeof v === 'number' ? v.toLocaleString('id-ID') : v);
      return [p.responden, ...valText, "Valid"];
    });
    setTableRows(newUtama);
  };

  const handleTabUtama = () => {
    syncData();
    setCurrentStep(3);
  }

  const handleExportSPSS = () => {
    if (tableRows.length === 0) return;
    const escapeCsv = (str) => {
      if (str === null || str === undefined) return '';
      return `"${String(str).replace(/"/g, '""')}"`;
    };
    const headerRow = tableHeaders.map(escapeCsv).join(',');
    const dataRows = tableRows.map(row => row.map(escapeCsv).join(','));
    const csvContent = [headerRow, ...dataRows].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const safeJudul = researchData.judul ? researchData.judul.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_') : 'Dataset';
    link.setAttribute("download", `Data_SPSS_${safeJudul}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportLampiranToExcel = () => {
    const containerDiv = document.getElementById("lampiran-section");
    if (!containerDiv) return;

    const tables = containerDiv.querySelectorAll("table");
    if (tables.length === 0) return;

    const workbook = XLSX.utils.book_new();

    tables.forEach((table, index) => {
      let title = `Catatan_Lampiran_${index + 1}`;
      const firstTh = table.querySelector("thead tr th");
      if (firstTh && firstTh.colSpan > 1) {
        title = firstTh.innerText.replace(/Tabel Lampiran(.)+:/i, "").trim().substring(0, 31);
        title = title.replace(/[\\\/\?\*\[\]]/g, ''); // Sheet names cannot have special chars
      }

      const worksheet = XLSX.utils.table_to_sheet(table);
      XLSX.utils.book_append_sheet(workbook, worksheet, title || `Sektor_${index + 1}`);
    });

    XLSX.writeFile(workbook, "Tabel_Lampiran_Observasi.xlsx");
  };

  const handleExportPDF = (elementId, filename) => {
    const el = document.getElementById(elementId);
    if (!el) {
      setError("Elemen tidak ditemukan untuk diexport PDF.");
      return;
    }
    
    setIsLoading(true);
    const opt = {
      margin:       0.3,
      filename:     filename || 'Laporan_Analisis.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'landscape' },
      pagebreak:    { mode: 'avoid-all' }
    };

    html2pdf().set(opt).from(el).toPdf().get('pdf').then((pdf) => {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = opt.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).then(() => {
      setIsLoading(false);
    }).catch(err => {
      console.error(err);
      setError("Gagal Export PDF: " + err.message);
      setIsLoading(false);
    });
  };

  const handleExportBab4Excel = () => {
    try {
      const wb = XLSX.utils.book_new();
      const wsBab4 = XLSX.utils.aoa_to_sheet([tableHeaders, ...tableRows]);
      XLSX.utils.book_append_sheet(wb, wsBab4, "Tabel Utama");
      XLSX.writeFile(wb, "Data_Analisis_Bab_4.xlsx");
    } catch(err) {
      setError("Gagal Export Excel Bab 4: " + err.message);
    }
  };

  // Exact UI Colors
  const chevronColors = ['#f97316', '#0ea5e9', '#a855f7', '#eab308'];

  const stepsData = [
    { id: 0, label: 'KONTEKS', title: 'Konteks Penelitian', desc: 'Masukkan parameter riset dan perintahkan AI.', icon: <User className="w-5 h-5" /> },
    { id: 1, label: 'TALLY SHEET', title: 'Tabel Tally Sheet', desc: 'Penjabaran komponen data teknis wajib.', icon: <ListChecks className="w-5 h-5" /> },
    { id: 2, label: 'DATA PRIMER', title: 'Data Primer', desc: 'Kompilasi Digital Rekam Jejak Lapangan.', icon: <Database className="w-5 h-5" /> },
    { id: 4, label: 'DATA SEKUNDER', title: 'Data Sekunder', desc: 'Import file referensi sekunder.', icon: <BookOpen className="w-5 h-5" /> },
    { id: 3, label: 'TABEL UTAMA', title: 'Tabel Utama', desc: 'Rekapitulasi absolut komposit visual.', icon: <Table2 className="w-5 h-5" /> }
  ];
  const activeTeknik = researchData.teknik || 'Observasi (Pengamatan)';
  const mainTeknik = activeTeknik.split(' ')[0];

  const getHeaderTitle = (teknik) => {
    const t = (teknik || 'Observasi').toLowerCase();
    if (t.includes('wawancara')) return 'Pedoman Wawancara';
    if (t.includes('kuesioner')) return 'Instrumen Kuesioner/Angket';
    if (t.includes('dokumentasi')) return 'Ekstraksi Data Dokumentasi';
    if (t.includes('eksperimen')) return 'Logbook Perlakuan Eksperimen';
    return 'Tabel Tally Sheet Observasi';
  };

  const getTableTitle = (teknik) => {
    const t = (teknik || 'Observasi').toLowerCase();
    if (t.includes('wawancara')) return 'Tabel 1: Matriks Indikator & Target Wawancara';
    if (t.includes('kuesioner')) return 'Tabel 1: Kisi-kisi Instrumen Kuesioner';
    if (t.includes('dokumentasi')) return 'Tabel 1: Kebutuhan Target Studi Dokumentasi';
    if (t.includes('eksperimen')) return 'Tabel 1: Metrik Observasi Data Eksperimen';
    return 'Tabel 1: Instrumen Pengambilan Data Observasi Teknis';
  };

  return (
    <>
      {(isLoading || isGeneratingLampiran || isFileUploading || isSekunderUploading) && <HourglassLoader />}
      <div className="flex min-h-screen font-sans text-slate-800 relative z-0">
      {/* Background Grid Layer Matching Screenshot */}
      <div className="absolute inset-0 z-0 bg-[#eff4f8] print:hidden">
        <div className="w-full h-full opacity-30 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:1.5rem_1.5rem]"></div>
      </div>

      {/* SIDEBAR EXACT MATCH */}
      <aside className="w-64 bg-[#192231] text-slate-300 flex flex-col fixed left-0 top-0 bottom-0 shadow-2xl z-50 print:hidden">
        <div className="px-6 py-6 border-b border-transparent">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 border-2 border-white rounded-md flex items-center justify-center font-black text-white text-lg">
              D
            </div>
            <div className="font-extrabold text-xl tracking-wide text-white">Dosbing<span className="text-cyan-400">.ai</span></div>
          </div>

          <div className="mt-8 bg-[#111827] rounded-2xl p-4 flex items-center gap-3 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#f97316] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              {userProfile.nama ? userProfile.nama.charAt(0).toUpperCase() : 'P'}
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{userProfile.nama || 'Pengguna'}</p>
              <div className="mt-1 bg-[#d97706] text-white text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded flex items-center justify-center w-max">
                PREMIUM
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2">
          <nav className="space-y-1">
            <div className="px-4">
              <button
                onClick={() => setCurrentStep('roadmap')}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold rounded-xl shadow-md transition-all ${currentStep === 'roadmap' ? 'bg-[#2563eb] text-white' : 'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white'}`}
              >
                <div className="flex items-center gap-3">
                  <Map className="w-4 h-4" /> Road Map
                </div>
                {currentStep === 'roadmap' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
              </button>
            </div>

            <div className="pt-4 space-y-1">
              {stepsData.map((item) => {
                const isCurrent = currentStep === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentStep(item.id)}
                    className={`w-full flex items-center gap-4 px-8 py-3.5 text-xs font-semibold transition-all shadow-none outline-none ${isCurrent ? 'bg-white/10 text-white border-l-4 border-cyan-400' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border-l-4 border-transparent'}`}
                  >
                    <span className={isCurrent ? 'opacity-100 text-cyan-400' : 'opacity-80'}>{item.icon}</span>
                    <span className="tracking-wide">{item.title}</span>
                  </button>
                )
              })}
            </div>
          </nav>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="ml-64 print:ml-0 flex-1 flex flex-col relative z-10 w-full min-h-screen print:bg-white text-black">

        {/* HEADER EXACT MATCH */}
        <header className="h-20 bg-white/40 flex items-center justify-end px-8 z-40 sticky top-0 print:hidden">
          <div className="flex items-center gap-8">
            <div className="relative cursor-pointer hover:opacity-80">
              <Bell className="w-5 h-5 text-slate-600" />
              <div className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-600 border-[1.5px] border-white rounded-full flex items-center justify-center text-[9px] font-black text-white">3</div>
            </div>
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-[#f97316] flex items-center justify-center text-white font-bold text-sm shadow-sm">
                {userProfile.nama ? userProfile.nama.charAt(0).toUpperCase() : 'P'}
              </div>
              <div className="leading-tight">
                <p className="text-[13px] font-black text-slate-800">{userProfile.nama || 'Pengguna'}</p>
                <p className="text-[10px] font-black text-blue-700 tracking-wide mt-0.5">PREMIUM</p>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <main className="p-8 pb-20 print:p-0 w-full max-w-[1200px] mx-auto overflow-x-hidden pt-4 print:pt-0 relative">

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex gap-3 text-sm font-black border border-red-200 mb-6 drop-shadow-sm absolute top-4 left-8 right-8 z-50">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          {/* ROAD MAP PAGE */}
          {currentStep === 'roadmap' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-[#155b6a] rounded-2xl p-5 md:px-8 mb-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <h2 className="text-sm font-black text-white uppercase tracking-widest">
                    SELAMAT DATANG, {userProfile.nama ? userProfile.nama.toUpperCase() : 'ADMIN'}! 👋
                  </h2>
                </div>
                <p className="text-teal-100 font-semibold text-xs md:border-l md:border-teal-600 md:pl-4 italic relative">
                  "menyerah sekarang berarti membuang semua perjuangan semester lalu."
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 absolute -right-4 top-1/2 -translate-y-1/2 hidden md:block"></span>
                </p>
              </div>

              <div className="bg-[#145d7a] rounded-[2rem] p-8 mb-10 shadow-xl overflow-hidden relative">
                <div className="text-center mb-12 mt-2">
                  <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">Generator Data Penelitian</h2>
                  <p className="text-teal-100 text-[13px] mt-2 font-medium">Rencana tahapan penyusunan data penelitianmu. Selesaikan milestone dari kiri ke kanan.</p>
                </div>

                <div className="flex justify-between items-start w-[110%] -ml-[5%] relative pb-4">
                  {stepsData.map((st, i) => {
                    return (
                      <div key={st.id} className="relative flex-1 flex flex-col items-center">
                        <div className="w-[110%] relative h-[42px] flex justify-center z-10 font-black text-white cursor-pointer hover:brightness-110 transition-all border-y-[6px] border-transparent"
                          onClick={() => setCurrentStep(st.id)}
                          style={{ zIndex: 10 - i }}>
                          <div
                            className="w-full h-full flex items-center justify-center shadow-lg"
                            style={{ backgroundColor: chevronColors[i % 4], clipPath: i === 0 ? 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%)' : i === stepsData.length - 1 ? 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 15px 50%)' : 'polygon(0% 0%, calc(100% - 15px) 0%, 100% 50%, calc(100% - 15px) 100%, 0% 100%, 15px 50%)', paddingLeft: i > 0 ? '15px' : '0', marginLeft: i > 0 ? '-10px' : '0' }}
                          >
                            <span className="text-[10px] uppercase font-black tracking-widest opacity-90 drop-shadow-md">{st.label}</span>
                          </div>
                        </div>

                        <div className="w-0.5 h-4 bg-white/40 my-1"></div>

                        <div className="relative flex flex-col items-center justify-center mb-1 w-20 h-[60px]">
                          <svg className="absolute inset-0 w-full h-full drop-shadow-md" viewBox="0 0 100 100">
                            <path d="M 20 80 A 40 40 0 0 1 80 80" fill="none" stroke={chevronColors[i % 4]} strokeWidth="5" strokeLinecap="round" />
                          </svg>
                          <div className="w-11 h-11 rounded-full border-4 border-white bg-white flex items-center justify-center z-10 shadow-[0_2px_10px_rgba(0,0,0,0.3)] mt-2" style={{ color: chevronColors[i % 4] }}>
                            {st.icon}
                          </div>
                        </div>

                        <div className="w-0.5 h-6 bg-white/20 mb-2"></div>

                        <div className="bg-white rounded-[1.2rem] p-4 w-[160px] text-center shadow-lg border-b-4 relative overflow-hidden" style={{ borderBottomColor: chevronColors[i % 4] }}>
                          <h4 className="text-[#1a2332] font-black text-xs tracking-tight uppercase px-2">{st.title}</h4>
                          <p className="text-[9px] font-semibold text-slate-400 mt-2 leading-relaxed">{st.desc}</p>
                          <div className="w-8 h-[3px] rounded-full mx-auto mt-4" style={{ backgroundColor: chevronColors[i % 4], opacity: 0.5 }}></div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PAGE STEP 0: IDENTIFIKASI */}
          {currentStep === 0 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-10 space-y-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6">
                <div>
                  <h3 className="text-2xl font-black text-[#1a2332] tracking-tight">Konteks Penelitian</h3>
                  <p className="text-slate-400 font-bold text-sm mt-1">Masukkan parameter riset dan perintahkan AI untuk membangun struktur spesifik.</p>
                </div>

              </div>

              <div className="mb-6">
                <label className={`w-full py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-dashed ${fileName ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400'} ${isFileUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={isFileUploading || isLoading} />
                  {isFileUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                  {isFileUploading ? 'MEMBACA DOKUMEN...' : (fileName ? `DOKUMEN: ${fileName.substring(0, 25)}...` : 'IMPORT SKRIPSI BAB 1-3 (.PDF/.DOCX)')}
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Peneliti</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Andi Rianto" value={userProfile.nama} onChange={e => setUserProfile({ ...userProfile, nama: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universitas</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Universitas Padjadjaran" value={userProfile.perguruanTinggi} onChange={e => setUserProfile({ ...userProfile, perguruanTinggi: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fakultas</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Fakultas MIPA" value={userProfile.fakultas} onChange={e => setUserProfile({ ...userProfile, fakultas: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Studi</label>
                  <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Biologi Ekologi" value={userProfile.prodi} onChange={e => setUserProfile({ ...userProfile, prodi: e.target.value })} />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Topik Penelitian</label>
                  <textarea className="w-full p-5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-black text-xl text-slate-800 leading-tight outline-none" rows="2" placeholder="Analisis Morfologi..." value={researchData.judul} onChange={e => setResearchData({ ...researchData, judul: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center pr-2">
                      <span>Jenis Metodologi</span>
                      <span className="text-red-500 normal-case italic font-bold text-[9px] tracking-normal">*wajib diisi</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-800 outline-none appearance-none cursor-pointer shadow-sm"
                        value={researchData.metodologi || 'Kuantitatif Deskriptif'}
                        onChange={e => setResearchData({ ...researchData, metodologi: e.target.value })}
                      >
                        <option value="Kuantitatif Deskriptif">Kuantitatif Deskriptif</option>
                        <option value="Kuantitatif Korelasional">Kuantitatif Korelasional</option>
                        <option value="Kuantitatif Eksperimen">Kuantitatif Eksperimen</option>
                        <option value="Kualitatif Deskriptif">Kualitatif Deskriptif</option>
                        <option value="Kualitatif Fenomenologi">Kualitatif Fenomenologi</option>
                        <option value="Kualitatif Studi Kasus">Kualitatif Studi Kasus</option>
                        <option value="Mix Methods (Kuantitatif & Kualitatif)">Mix Methods (Campuran)</option>
                        <option value="R&D (Research and Development)">R&D (Research & Development)</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between items-center pr-2">
                      <span>Teknik Pengambilan Data</span>
                      <span className="text-red-500 normal-case italic font-bold text-[9px] tracking-normal">*wajib diisi</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full p-5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-800 outline-none appearance-none cursor-pointer shadow-sm"
                        value={researchData.teknik || 'Observasi (Pengamatan)'}
                        onChange={e => setResearchData({ ...researchData, teknik: e.target.value })}
                      >
                        <option value="Observasi (Pengamatan)">Observasi (Pengamatan)</option>
                        <option value="Wawancara (Interview)">Wawancara (Interview)</option>
                        <option value="Kuesioner (Angket)">Kuesioner (Angket)</option>
                        <option value="Studi Dokumentasi">Studi Dokumentasi</option>
                        <option value="Eksperimen">Eksperimen</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {researchData.teknik?.includes('Kuesioner') && (
                  <div className="space-y-3 pt-2">
                    <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 flex items-center gap-2">Mekanisme Skala Pengukuran</label>
                    <div className="relative">
                      <select
                        className="w-full p-5 bg-indigo-50/50 border border-indigo-100 rounded-xl focus:ring-2 focus:ring-indigo-400 transition-all font-bold text-indigo-800 outline-none appearance-none cursor-pointer shadow-sm"
                        value={researchData.skalaKuesioner || 'Skala Likert (5 Poin: SS-STS)'}
                        onChange={e => setResearchData({ ...researchData, skalaKuesioner: e.target.value })}
                      >
                        <option value="Skala Likert (5 Poin: SS-STS)">Skala Likert (5 Poin: Sangat Setuju - Sangat Tidak Setuju)</option>
                        <option value="Skala Guttman (Ya - Tidak)">Skala Guttman (Jawaban Tegas: Ya / Tidak)</option>
                      </select>
                      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-400 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button onClick={handleGenerate} disabled={!researchData.judul || isLoading || isFileUploading} className="w-full py-5 bg-[#145d7a] text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-[#145d7a]/20 flex items-center justify-center gap-3 hover:bg-[#11465e] active:scale-[0.98] transition-all disabled:opacity-50 outline-none">
                  {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />}
                  {isLoading ? 'MENGHASILKAN... (Mengekstrak Dokumen Utuh, Mohon Tunggu)' : 'Hasilkan Instrumen via AI'}
                </button>
              </div>
            </div>
          )}

          {/* PAGE STEP 1: TALLY SHEET */}
          {currentStep === 1 && (
            <div id="tally-sheet-main" className="bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none border border-slate-200/60 print:border-none print:bg-transparent overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                  <h3 className="text-2xl font-black text-[#1a2332]">{getHeaderTitle(researchData.teknik)}</h3>
                  <p className="text-sm font-semibold text-slate-400 mt-1 max-w-2xl">Penjabaran komponen data teknis yang wajib dibawa dan direkam di lapangan penelitian.</p>
                </div>
                <button onClick={() => setCurrentStep(2)} className="bg-[#f97316] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#ea580c] transition-all shadow-md shrink-0 outline-none">Lanjut Transkrip Data <ChevronRight className="w-4 h-4" /></button>
              </div>

              {variabelData && variabelData.length > 0 && (
                <div className="px-8 pt-8 pb-4 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 border-b border-slate-100 print:hidden">
                  {variabelData.map((v, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm border-t-[5px] hover:-translate-y-1 transition-transform flex flex-col justify-center" style={{ borderTopColor: chevronColors[idx % 4] }}>
                      <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{v.jenis}</div>
                      <h4 className="text-[16px] font-bold text-slate-800 mt-1.5 mb-2 leading-tight">{v.nama}</h4>
                      <p className="text-[13px] text-slate-500 leading-relaxed font-medium">{v.penjelasan}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-8 pb-8 pt-6 print:p-0">

                {/* Lembar Observasi Lapangan (VIEW 1 - Tally Sheet Configuration) */}
                <div className={isLampiranGenerated ? "hidden print:block" : "block"}>
                  <div className="p-8 bg-[#181d27] rounded-3xl shadow-xl shadow-slate-900/10 border border-slate-700">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ListChecks className="text-[#38bdf8] w-6 h-6" /> {getHeaderTitle(researchData.teknik)} Target
                      </h3>
                      <p className="text-slate-400 italic text-[13px] mt-2 font-medium max-w-4xl">
                        Tabel ini adalah instrumen pengumpulan data teknis yang kelak akan diproses oleh peneliti untuk studi {researchData.judul ? `"${researchData.judul}"` : 'lapangan/studi'} dalam setiap eksekusi pengambilan data.
                      </p>
                    </div>

                    <div className="mt-8 mb-6">
                      <h4 className="font-bold text-white text-[15px] tracking-wide">
                        {getTableTitle(researchData.teknik)} (Variabel Penelitian)
                      </h4>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-700 mt-6">
                      <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                          <tr className="bg-[#222836] border-b border-slate-600">
                            <th className="p-4 text-[13px] font-bold text-white w-14 text-center border-r border-slate-700/50">No</th>
                            <th className="p-4 text-[13px] font-bold text-white border-r border-slate-700/50">Parameter Ukur / Indikator (X)</th>
                            <th className="p-4 text-[13px] font-bold text-white w-48 text-center border-r border-slate-700/50">Nilai / Angka Pengukuran</th>
                            <th className="p-4 text-[13px] font-bold text-white w-56">Satuan / Catatan Validasi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {observasiData.map((group, gIdx) => (
                            <React.Fragment key={gIdx}>
                              <tr className="bg-[#1e2432] border-b border-slate-700/60 hover:bg-[#252c3c] transition-colors">
                                <td className="p-0 border-r border-slate-700/50 w-14 align-middle">
                                  <label className="w-full h-full flex items-center justify-center cursor-pointer min-h-[55px]">
                                    <input
                                      type="checkbox"
                                      className="shrink-0 w-4 h-4 rounded border-slate-500 bg-[#1e2432] text-[#0ea5e9] focus:ring-[#0ea5e9] hover:ring-[#38bdf8] cursor-pointer outline-none transition-all cursor-alias"
                                      checked={checkedLampiranIds.includes(group.dimensi)}
                                      onChange={(e) => {
                                        setIsLampiranGenerated(false);
                                        const childIds = group.items ? group.items.map(item => item.id) : [];
                                        if (e.target.checked) {
                                          const newSet = new Set([...checkedLampiranIds, group.dimensi, ...childIds]);
                                          setCheckedLampiranIds(Array.from(newSet));
                                        } else {
                                          setCheckedLampiranIds(checkedLampiranIds.filter(id => id !== group.dimensi && !childIds.includes(id)));
                                        }
                                      }}
                                    />
                                  </label>
                                </td>
                                <td className="p-4 text-[15px] font-bold text-[#38bdf8] border-r border-slate-700/50">
                                  <div className="flex items-center gap-3">
                                    <span className="text-white font-black bg-slate-700/50 px-2 py-0.5 rounded border border-slate-600/50 tracking-wider shadow-inner">{String.fromCharCode(65 + gIdx)}</span>
                                    <span>{group.dimensi}</span>
                                  </div>
                                </td>
                                <td className="p-4 border-r border-slate-700/50"></td>
                                <td className="p-4"></td>
                              </tr>
                              {group.items && group.items.map((item, iIdx) => (
                                <tr key={item.id} className="bg-[#181d27] border-b border-slate-800 hover:bg-[#1e2432] transition-colors">
                                  <td className="p-4 text-[13px] font-medium text-slate-400 text-center border-r border-slate-800">{iIdx + 1}</td>
                                  <td className="p-4 text-[13px] font-medium text-slate-300 border-r border-slate-800 pr-4">
                                    <label className="flex items-start gap-4 cursor-pointer group w-full">
                                      <input
                                        type="checkbox"
                                        className="mt-[3px] shrink-0 w-4 h-4 rounded border-slate-600 bg-[#222836] text-[#0ea5e9] focus:ring-[#0ea5e9] cursor-pointer"
                                        checked={checkedLampiranIds.includes(item.id)}
                                        onChange={(e) => {
                                          setIsLampiranGenerated(false);
                                          if (e.target.checked) setCheckedLampiranIds([...checkedLampiranIds, item.id]);
                                          else setCheckedLampiranIds(checkedLampiranIds.filter(id => id !== item.id));
                                        }}
                                      />
                                      <div className="flex-1">
                                        <span className="group-hover:text-white transition-colors leading-tight inline-block mb-2">{item.parameter}</span>
                                        {checkedLampiranIds.includes(item.id) && (
                                          <div className="flex items-center gap-2 mt-1 bg-[#1e2432] p-2 rounded-lg border border-slate-700/50 relative slide-in-from-top-2 animate-in duration-200">
                                            <span className="text-slate-400 text-[11px] uppercase tracking-wider">{((researchData.teknik || '').toLowerCase().includes('wawancara') || (researchData.teknik || '').toLowerCase().includes('kuesioner')) ? 'Jumlah Pertanyaan:' : 'Jumlah Baris:'}</span>
                                            <div className="flex items-center gap-1.5">
                                              <input 
                                                type="number" 
                                                min="1" 
                                                max="30"
                                                className="w-16 h-7 bg-[#11151c] text-white border border-slate-600 rounded px-2 py-0.5 text-[12px] font-bold focus:ring-1 focus:ring-[#0ea5e9] outline-none" 
                                                placeholder="10"
                                                value={questionCounts[item.id] || ''}
                                                onChange={(e) => setQuestionCounts({...questionCounts, [item.id]: e.target.value})}
                                                onClick={(e) => e.stopPropagation()}
                                              />
                                              <span className="text-red-500 text-[10px] italic font-semibold lowercase">*isi</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </label>
                                  </td>
                                  <td className="p-4 text-center border-r border-slate-800">
                                    <span className="inline-block border-b-2 border-dotted border-slate-600 w-28">&nbsp;</span>
                                  </td>
                                  <td className="p-4 text-[13px] font-medium text-[#0ea5e9] italic">
                                    {item.satuan}
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {(!isLampiranGenerated && checkedLampiranIds.length > 0) && (
                      <div className="mt-8 flex justify-center print:hidden">
                        <button
                          onClick={generateLampiranAI}
                          disabled={isGeneratingLampiran}
                          className={`bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/30 px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-[#0ea5e9] hover:text-white transition-all shadow-lg shadow-[#0ea5e9]/10 cursor-pointer outline-none ${isGeneratingLampiran ? 'opacity-70 cursor-wait' : 'animate-bounce'}`}
                        >
                          {isGeneratingLampiran ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutTemplate className="w-5 h-5" />}
                          {isGeneratingLampiran ? "SEDANG MENGHASILKAN MATRIKS LAPANGAN..." : `BUAT ${checkedLampiranIds.length} TABEL LAMPIRAN`}
                        </button>
                      </div>
                    )}

                    <div className="mt-8 flex justify-end">
                      <button onClick={() => handleExportPDF('tally-sheet-main', 'Formulir_Lapangan.pdf')} className="bg-slate-700 text-white border border-slate-600 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-600 hover:text-cyan-200 transition-all outline-none shadow-xl drop-shadow-md">
                        <Download className="w-4 h-4" /> DOWNLOAD/CETAK FORMULIR LAPANGAN (PDF)
                      </button>
                    </div>
                  </div>
                </div>

                {/* VIEW 2: LAMPIRAN VIEWPORT */}
                {(isLampiranGenerated && checkedLampiranIds.length > 0) && (
                  <div id="lampiran-section" className="p-8 bg-[#efe9e6] rounded-3xl shadow-xl shadow-slate-900/10 border border-[#0ea5e9]/20 print:border-none print:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500 print:break-before-page">

                    <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-300 print:hidden">
                      <button
                        onClick={() => {
                          setIsLampiranGenerated(false);
                        }}
                        className="bg-white/60 hover:bg-white text-slate-600 hover:text-slate-800 border border-slate-300 px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all outline-none"
                      >
                        <ChevronRight className="w-4 h-4 rotate-180" /> KEMBALI KE SETTING TALLY SHEET
                      </button>
                      <button onClick={() => handleExportPDF('lampiran-section', 'Lampiran.pdf')} className="bg-[#0ea5e9]/10 text-[#0284c7] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all outline-none shadow-xl drop-shadow-md">
                        <Download className="w-4 h-4" /> DOWNLOAD/CETAK LAMPIRAN (PDF)
                      </button>
                    </div>

                    <h3 className="text-2xl font-black text-[#2d2825] mb-8 text-center uppercase tracking-widest drop-shadow-sm">
                      [ DOKUMEN LAMPIRAN KHUSUS {researchData.teknik.toUpperCase()} ]
                    </h3>

                    {observasiData.map(group => {
                      const elements = [];

                      if (checkedLampiranIds.includes(group.dimensi)) {
                        const isWawancara = mainTeknik.toLowerCase().includes('wawancara');

                        if (isWawancara || mainTeknik.toLowerCase() === 'kuesioner') {
                          elements.push(
                            <div key={`dim-${group.dimensi}`} className="mt-12 mb-2 p-6 rounded-2xl border-2 border-dashed border-slate-300 bg-white print:bg-transparent print:break-inside-avoid print:shadow-none print:border-none print:m-0">
                              <h4 className="text-[16px] font-black text-[#0369a1] text-center tracking-widest uppercase">
                                {isWawancara ? 'Topik Utama Wawancara: ' : 'Dimensi Variabel Kuesioner: '} {group.dimensi}
                              </h4>
                            </div>
                          );
                        } else {
                          const fallbackGroupHeaders = mainTeknik.toLowerCase() === 'kuesioner' ? (researchData.skalaKuesioner?.includes('Guttman') ? ['Pernyataan Sub-Variabel', 'Ya', 'Tidak'] : ['Pernyataan Sub-Variabel', 'SS', 'S', 'N', 'TS', 'STS']) : activeTeknik.toLowerCase().includes('dokumentasi') ? ['Kode Arsip', 'Nama Dokumen Resmi', 'Kutipan Data Otentik', 'Interpretasi / Makna', 'Satuan Ukur / Tipe', 'Relasi Indikator / Triangulasi'] : ['Subjek / Objek Pengamatan', 'Hasil Pengukuran', 'Catatan Tambahan'];
                          const headers = ['No', ...(activeTeknik.toLowerCase().includes('dokumentasi') ? fallbackGroupHeaders : (group.lampiranHeaders || fallbackGroupHeaders))];
                          const colCount = headers.length;
                          elements.push(
                            <div key={`dim-${group.dimensi}`} className="mt-12 mb-2 overflow-x-auto rounded-2xl border border-slate-300 w-full shadow-lg print:break-inside-avoid print:break-after-page print:shadow-none print:border-none print:m-0">
                              <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                  <tr>
                                    <th colSpan={colCount} contentEditable="true" suppressContentEditableWarning={true} className="bg-white p-5 text-[15px] font-bold text-[#2d2825] border-b border-slate-300 tracking-wide text-center outline-none focus:bg-slate-50 transition-colors">
                                      Tabel Lampiran Dimensi: {group.dimensi} {selectedDesign[group.dimensi] && <span className="text-[#0ea5e9]">[{selectedDesign[group.dimensi]}]</span>} <span className="text-[9px] text-[#0369a1] opacity-70 ml-1 underline font-normal cursor-pointer hover:opacity-100">(edit)</span>
                                    </th>
                                  </tr>
                                  <tr className="bg-[#f8f5f3] border-b border-slate-300">
                                    {headers.map((col, cIdx) => (
                                      <th key={cIdx} contentEditable="true" suppressContentEditableWarning={true} className={`p-4 text-[12px] uppercase font-bold text-[#0369a1] tracking-wide ${cIdx === 0 ? 'w-14 text-center border-r' : 'border-r'} border-slate-300 outline-none focus:bg-blue-50 transition-colors cursor-text`}>
                                        {col} <span className="text-[9px] opacity-60 ml-1 normal-case font-medium lowercase">(edit)</span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {([...Array(19)].map(() => null)).map((stmt, rIdx) => (
                                    <tr key={rIdx} className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors print:h-[13.5mm]">
                                      {[...Array(colCount)].map((_, cIdx) => (
                                        <td key={cIdx} contentEditable="true" suppressContentEditableWarning={true} className="p-4 text-[13px] font-medium text-slate-600 border-r border-slate-300 text-center outline-none focus:bg-slate-50 transition-colors cursor-text">
                                          {cIdx === 0 ? rIdx + 1 : <div className="w-full flex items-center justify-center h-full"><span className="inline-block border-b-2 border-dotted border-slate-400 w-11/12 translate-y-1">&nbsp;</span></div>}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="mt-4 px-2 pb-4 bg-white pt-4 rounded-b-2xl">
                                <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                                  <div className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
                                    <p className="text-[11px] print:text-[10px] font-medium leading-relaxed italic border-l-2 border-[#0ea5e9] print:border-[#333] pl-3 text-slate-600 print:text-[#333] text-left">
                                      * <strong>SOP Teknis:</strong> <span className={group.lampiranInstruksi ? "text-[#0369a1] print:text-[#333]" : ""}>{group.lampiranInstruksi || (mainTeknik.toLowerCase() === 'eksperimen' ? `Jalankan protokol pengkondisian dan amati respons pada dimensi ${group.dimensi} secara terkontrol.` : `Lakukan eksekusi ${mainTeknik.toLowerCase()} data untuk dimensi ${group.dimensi}.`)}</span>
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto shrink-0">
                                    {activeTeknik.toLowerCase().includes('dokumentasi') && (
                                      <button onClick={() => alert("Smart Assistant [SN-Dikti]: Pastikan kutipan dokumen ini tidak bertentangan dengan hasil observasi atau transkrip wawancara di lapangan! Lakukan *cross-checking* (Triangulasi) pada kolom paling kanan di tabel ini agar dosen pembimbing Anda memahami bahwa Anda tidak sekadar mengarang kaitan antar variabel.")} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 print:hidden focus:outline-none shrink-0 border border-amber-300">
                                        <Info className="w-3.5 h-3.5" /> Triangulasi Validitas
                                      </button>
                                    )}
                                    <button onClick={(e) => { e.currentTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Tersimpan'; e.currentTarget.classList.replace('bg-[#145d7a]','bg-[#10b981]'); e.currentTarget.classList.replace('border-[#145d7a]/50','border-[#10b981]/50'); }} className="bg-[#145d7a] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 print:hidden focus:outline-none shrink-0 border border-[#145d7a]/50">
                                      <Save className="w-3.5 h-3.5" /> Simpan
                                    </button>
                                  </div>
                                </div>
                              </div>
                              {activeTeknik.toLowerCase().includes('dokumentasi') && (
                                <details className="mt-2 mb-4 mx-4 bg-amber-50/50 print:bg-transparent border border-amber-200/60 print:border-[#bbb] rounded-xl shadow-sm print:shadow-none break-inside-avoid group cursor-pointer transition-all">
                                  <summary className="px-5 py-3 outline-none flex flex-col justify-center list-none [&::-webkit-details-marker]:hidden">
                                    <div className="flex items-center justify-between w-full border-amber-200/50 print:border-[#bbb] group-open:border-b group-open:pb-2 group-open:mb-2 transition-all">
                                      <h5 className="text-[11px] print:text-[10px] font-black text-amber-800 print:text-black tracking-wider uppercase flex items-center gap-1.5 focus:outline-none">
                                        <AlertCircle className="w-3.5 h-3.5" /> Pedoman Kualitas Dokumen (The 4-A Validity Test)
                                      </h5>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] text-amber-600/80 italic font-medium group-open:hidden uppercase">Klik untuk melihat pedoman</span>
                                        <ChevronDown className="w-4 h-4 text-amber-700 transition-transform duration-300 group-open:-rotate-180" />
                                      </div>
                                    </div>
                                  </summary>
                                  <div className="px-5 pb-4 pt-1 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-3 leading-relaxed w-full cursor-default">
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0">
                                      <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">Filter kualitas tabel matriks ekstraksi ini menggunakan parameter akademik Kemendikbudristek:</p>
                                      <ul className="list-disc pl-5 space-y-1.5 mt-1 print:pl-4">
                                        <li><strong>Authenticity (Keaslian):</strong> Dokumen yang dipindahkan ke matriks ini harus merupakan naskah asli atau salinan sah, bukan arsip yang tidak diakui instansi (hindari plagiarisme/<em>forgery</em>).</li>
                                        <li><strong>Authority (Otoritas Kredibel):</strong> Bukti tertulis diterbitkan secara sah (SK Rektor, Peraturan Menteri, Laporan TTD, dst). Jangan mengutip entitas sekunder tanpa landasan.</li>
                                        <li><strong>Accuracy (Akurasi Tinggi):</strong> Anda harus membaca cermat sebelum mengekstraksi data. Kutipan Tidak boleh memiliki benturan/kesalahan internal dengan bab-bab sebelumnya.</li>
                                        <li><strong>Adjacency (Keterkinian Data):</strong> Pastikan lokus subjek & tahun dokumen masih sangat relevan (<em>recent</em>) sebagai pendukung landasan teori Anda di Bab 1 & 2.</li>
                                      </ul>
                                    </div>
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0 mt-3 border-t border-dashed">
                                      <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">SOP Prosedur Analisis Data Dokumentasi:</p>
                                      <ul className="list-decimal pl-5 space-y-1.5 mt-1 print:pl-4 font-medium text-slate-800">
                                        <li><strong className="text-amber-800">1. Analisis Deskriptif:</strong> Identifikasi frekuensi kemunculan kata kunci, regulasi, atau temuan dominan pada kolom 'Kutipan Data Otentik'.</li>
                                        <li><strong className="text-amber-800">2. Reduksi Data:</strong> Filter dokumen redundan, fokuskan pengkodean pada kolom 'Relasi Indikator' untuk mereduksi kompleksitas subjek.</li>
                                        <li><strong className="text-amber-800">3. Interpretasi & Pembahasan:</strong> Gunakan kolom 'Makna' untuk menautkan temuan dokumen dengan teori di Bab 2. Lakukan evaluasi akhir di kolom 'Triangulasi'.</li>
                                        <li><strong className="text-amber-800">4. Penarikan Kesimpulan:</strong> Rangkum seluruh relasi dokumen hasil reduksi untuk menjawab rumusan masalah secara komprehensif.</li>
                                      </ul>
                                    </div>
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0 mt-3 border-t border-dashed">
                                      <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">Alur Mekanisme Triangulasi Multi-Instrumen:</p>
                                      <ol className="list-decimal pl-5 space-y-1.5 mt-1 print:pl-4 font-medium text-slate-700">
                                        <li>Pilih opsi <strong className="text-amber-800">Wawancara</strong> dari menu <em>Teknik Pengambilan Data</em>, lalu klik <strong className="text-amber-800">Hasilkan Instrumen</strong> untuk menyusun daftar pertanyaan primer.</li>
                                        <li>Kemudian, pilih kembali <strong className="text-amber-800">Studi Dokumentasi</strong> dan klik *Generate* untuk menyusun Matriks Ekstraksi khusus dokumen ini.</li>
                                        <li>Gunakan kolom <strong className="text-amber-800">Relasi Indikator / Triangulasi</strong> pada tabel dokumen secara aktif untuk menyilangkan hasil dokumen dengan pernyataan narasumber dari tebel Wawancara sebelumnya!</li>
                                      </ol>
                                    </div>
                                  </div>
                                </details>
                              )}
                              {mainTeknik.toLowerCase() === 'eksperimen' && (
                                <details className="mt-2 mb-4 mx-4 bg-blue-50/50 print:bg-transparent border border-blue-200/60 print:border-[#bbb] rounded-xl shadow-sm print:shadow-none break-inside-avoid group cursor-pointer transition-all">
                                  <summary className="px-5 py-3 outline-none flex flex-col justify-center list-none [&::-webkit-details-marker]:hidden">
                                    <div className="flex flex-wrap items-center justify-between w-full border-blue-200/50 print:border-[#bbb] group-open:border-b group-open:pb-2 group-open:mb-2 transition-all">
                                      <div className="flex items-center gap-2">
                                        <h5 className="text-[11px] print:text-[10px] font-black text-[#0c4a6e] print:text-black tracking-wider uppercase">Pedoman Instrumen Eksperimen</h5>
                                        <span className="text-[9px] text-[#0c4a6e]/80 italic font-medium group-open:hidden uppercase ml-2">Klik untuk melihat pedoman</span>
                                        <ChevronDown className="w-4 h-4 text-[#0c4a6e] transition-transform duration-300 group-open:-rotate-180" />
                                      </div>
                                      <div className="flex gap-1.5 print:hidden">
                                        <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [group.dimensi]: 'RAL'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[group.dimensi] === 'RAL' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih RAL</button>
                                        <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [group.dimensi]: 'RAK'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[group.dimensi] === 'RAK' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih RAK</button>
                                        <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [group.dimensi]: 'ANAKOVA'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[group.dimensi] === 'ANAKOVA' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih ANAKOVA</button>
                                      </div>
                                    </div>
                                  </summary>
                                  <div className="px-5 pb-4 pt-1 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-3 leading-relaxed w-full cursor-default">
                                    {(!selectedDesign[group.dimensi] || selectedDesign[group.dimensi] === 'RAL') && (
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                      <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                        <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">1</span> 
                                        Rancangan Acak Lengkap (RAL) 
                                        <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Asumsi Lingkungan Homogen</span>
                                      </div>
                                      <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                        <li><strong>Langkah 1:</strong> Input identitas seluruh unit percobaan ke kolom <strong className="text-slate-800">SUBJEK / OBJEK TARGET</strong> setelah pengacakan penuh dilakukan.</li>
                                        <li><strong>Langkah 2:</strong> Catat hasil murni dari intervensi parameter ke kolom <strong className="text-slate-800">ANGKA / NILAI TERUKUR</strong> sebagai nilai efek Perlakuan.</li>
                                        <li><strong>Langkah 3:</strong> Input setiap anomali teknis lapangan ke kolom <strong className="text-slate-800">CATATAN KUALITATIF</strong> sebagai parameter argumen pembentuk Galat mutlak.</li>
                                      </ul>
                                    </div>
                                    )}

                                    {(!selectedDesign[group.dimensi] || selectedDesign[group.dimensi] === 'RAK') && (
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                      <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                        <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">2</span> 
                                        Rancangan Acak Kelompok (RAK)
                                        <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Asumsi Lingkungan Heterogen</span>
                                      </div>
                                      <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                        <li><strong>Langkah 1:</strong> Manfaatkan fitur <em>(edit)</em> header untuk merevisi nama kolom, atau tambahkan kode grup eksplisit pada <strong>SUBJEK / OBJEK TARGET</strong> guna menetapkannya sebagai parameter <em>Kelompok/Blok</em> spesifik.</li>
                                        <li><strong>Langkah 2:</strong> Isi hasil pengukuran pada kolom <strong className="text-slate-800">ANGKA / NILAI TERUKUR</strong>, pastikan eksekusi dirandomisasi terpisah secara spesifik di dalam tiap blok/kelompok.</li>
                                        <li><strong>Langkah 3:</strong> Gunakan kolom <strong className="text-slate-800">CATATAN KUALITATIF</strong> untuk merinci varians lingkungan pada blok tersebut agar tidak menyimpang lalu terhitung sebagai galat bebas.</li>
                                      </ul>
                                    </div>
                                    )}

                                    {(!selectedDesign[group.dimensi] || selectedDesign[group.dimensi] === 'ANAKOVA') && (
                                    <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                      <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                        <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">3</span> 
                                        Analisis Kovariat (ANAKOVA)
                                        <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Integrasi Reduksi Galat</span>
                                      </div>
                                      <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                        <li><strong>Langkah 1:</strong> Manfaatkan tombol <em>(edit)</em> header untuk mendedikasikan pengukuran pra-intervensi (<strong className="text-slate-900 print:text-black">Kovariat</strong>) sebelum instrumen perlakuan utama/parameter dilaksanakan pada subjek.</li>
                                        <li><strong>Langkah 2:</strong> Segera setelah intervensi selesai, rekam parameter hasil akhir efek eksperimen (RAL/RAK) pada kolom <strong>ANGKA / NILAI TERUKUR</strong>.</li>
                                        <li><strong>Langkah 3:</strong> Beri keterangan kausalitas tambahan di <strong>CATATAN KUALITATIF</strong>; data di instrumen pengumpulan ini akan diregresi silang pada eksekusi komparasi Bab 4 nanti.</li>
                                      </ul>
                                    </div>
                                    )}
                                    <div className="mt-3 bg-[#f0f9ff] print:bg-transparent p-3 rounded-lg border border-[#bae6fd] print:border-none print:p-0">
                                      <div className="font-bold text-[#0369a1] print:text-black mb-1.5 flex items-center gap-1.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                                        Tips Tabulasi Pra-Software Statistik (SPSS/JASP/R):
                                      </div>
                                      <ul className="list-disc pl-5 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-1">
                                        <li>Tabel di atas bersifat <em className="text-[#0369a1]">editable</em> (dapat diketik langsung). Manfaatkan fitur ini untuk langsung menyusun <strong>Coding Angka</strong> secara *real-time* sebelum di-ekspor ke Excel.</li>
                                        <li>Isi baris observasi di kolom <strong>SUBJEK / OBJEK TARGET</strong> murni dengan representasi numerik (contoh: isi angka '1' untuk Perlakuan A, '2' untuk Perlakuan B) alih-alih merangkum teks naratif.</li>
                                        <li>Pastikan kolom <strong>ANGKA / NILAI TERUKUR</strong> murni terisi angka (tanpa label/satuan seperti 'kg' atau 'meter') agar dataset lampiran Anda 100% siap saat di-impor ke aplikasi uji hipotesis.</li>
                                      </ul>
                                    </div>
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        }
                      }

                      if (group.items) {
                        group.items.filter(item => checkedLampiranIds.includes(item.id)).forEach(item => {
                          // Strict Check For Wawancara List vs Regular Table (Do not fallback to item.pertanyaan for non-wawancara)
                          const isWawancara = mainTeknik.toLowerCase().includes('wawancara');

                          if (isWawancara) {
                            const listCount = parseInt(questionCounts[item.id] || "5", 10);
                            const pertanyaanList = item.pertanyaan || [...Array(listCount)].map((_, i) => `(Tulis pertanyaan wawancara ${i + 1} untuk ${item.parameter})`);

                            elements.push(
                              <div key={item.id} className="mt-12 mb-2 p-8 rounded-2xl border border-slate-200 w-full shadow-lg bg-white print:bg-transparent print:break-inside-avoid print:break-after-page print:shadow-none print:border-none print:p-0 print:m-0">
                                <h4 className="text-[16px] font-bold text-slate-800 print:text-black border-b border-slate-200 pb-4 mb-6">
                                  Draf Pertanyaan Wawancara: <span className="text-[#0ea5e9] uppercase tracking-wide">{item.parameter}</span>
                                </h4>
                                <ul className="space-y-6">
                                  {pertanyaanList.map((tanya, qIdx) => (
                                    <li key={qIdx} className="flex gap-4 items-start">
                                      <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/10 flex items-center justify-center text-[#0ea5e9] font-bold shrink-0">{qIdx + 1}</div>
                                      <div className="flex-1">
                                        <p className="text-[14px] text-slate-700 print:text-[#333] font-medium leading-relaxed">{tanya}</p>
                                        <div contentEditable="true" suppressContentEditableWarning={true} className="mt-3 w-full border-b-2 border-dotted border-slate-300 print:border-[#bbb] min-h-[2rem] outline-none focus:border-solid focus:border-[#0ea5e9] focus:bg-[#f0f9ff] transition-all cursor-text text-sm font-medium text-slate-800 p-1"></div>
                                        <div contentEditable="true" suppressContentEditableWarning={true} className="w-full border-b-2 border-dotted border-slate-300 print:border-[#bbb] min-h-[2rem] outline-none focus:border-solid focus:border-[#0ea5e9] focus:bg-[#f0f9ff] transition-all cursor-text text-sm font-medium text-slate-800 p-1"></div>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                                <div className="mt-8 pt-6 px-4 text-left border-t border-slate-200 print:border-[#bbb]">
                                  <p className="text-[12px] font-medium leading-relaxed italic border-l-2 border-[#0ea5e9] pl-3 text-slate-500 print:text-[#333]">
                                    * <strong>Tips & SOP Probing:</strong> <span className={item.lampiranInstruksi ? "text-[#0ea5e9] print:text-[#333]" : ""}>{item.lampiranInstruksi || "Gali inti fenomena dengan prinsip 5W 1H tanpa mengarahkan subjek ke jawaban bias."}</span>
                                  </p>
                                </div>
                              </div>
                            );
                          } else {
                            const fallbackItemHeaders = mainTeknik.toLowerCase() === 'kuesioner' ? (researchData.skalaKuesioner?.includes('Guttman') ? ['Item Pernyataan Indikator', 'Ya', 'Tidak'] : ['Item Pernyataan Indikator', 'SS', 'S', 'N', 'TS', 'STS']) : activeTeknik.toLowerCase().includes('dokumentasi') ? ['Kode Arsip', 'Nama Dokumen Resmi', 'Kutipan Data Otentik', 'Interpretasi / Makna', 'Satuan Ukur / Tipe', 'Relasi Indikator / Triangulasi'] : ['Subjek / Objek Target', 'Angka / Nilai Terukur', 'Catatan Kualitatif / Dokumentasi'];
                            const headers = ['No', ...(activeTeknik.toLowerCase().includes('dokumentasi') ? fallbackItemHeaders : (item.lampiranHeaders || fallbackItemHeaders))];
                            const colCount = headers.length;
                            elements.push(
                              <div key={item.id} className="mt-12 mb-2 overflow-x-auto rounded-2xl border border-slate-300 w-full shadow-lg print:break-inside-avoid print:break-after-page print:shadow-none print:border-none print:m-0">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                  <thead>
                                    <tr>
                                      <th colSpan={colCount} contentEditable="true" suppressContentEditableWarning={true} className="bg-white p-5 text-[15px] font-bold text-[#2d2825] border-b border-slate-300 tracking-wide text-center outline-none focus:bg-slate-50 transition-colors">
                                        {mainTeknik.toLowerCase() === 'kuesioner' ? 'Tabel Draf Pernyataan Indikator: ' : 'Tabel Lampiran Detail Observasi: '} {item.parameter} {selectedDesign[item.id] && <span className="text-[#0ea5e9]">[{selectedDesign[item.id]}]</span>} <span className="text-[9px] text-[#0369a1] opacity-70 ml-1 underline font-normal cursor-pointer hover:opacity-100">(edit)</span>
                                      </th>
                                    </tr>
                                    <tr className="bg-[#f8f5f3] border-b border-slate-300">
                                      {headers.map((col, cIdx) => (
                                        <th key={cIdx} contentEditable="true" suppressContentEditableWarning={true} className={`p-4 text-[12px] uppercase font-bold text-[#0369a1] tracking-wide ${cIdx === 0 ? 'w-14 text-center border-r' : 'border-r'} border-slate-300 outline-none focus:bg-blue-50 transition-colors cursor-text`}>
                                          {col} <span className="text-[9px] opacity-60 ml-1 normal-case font-medium lowercase">(edit)</span>
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                      {(mainTeknik.toLowerCase() === 'kuesioner' && item.pernyataan ? item.pernyataan : [...Array(parseInt(questionCounts[item.id] || "10", 10))].map(() => null)).map((stmt, rIdx) => (
                                        <tr key={rIdx} className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors print:h-[13.5mm]">
                                          {[...Array(colCount)].map((_, cIdx) => (
                                            <td key={cIdx} contentEditable="true" suppressContentEditableWarning={true} className={`p-4 text-[13px] font-medium ${cIdx === 1 && stmt ? 'text-[#2d2825] text-left' : 'text-slate-600 text-center'} border-r border-slate-300 outline-none focus:bg-slate-50 transition-colors cursor-text`}>
                                              {cIdx === 0 ? rIdx + 1 : (cIdx === 1 && stmt) ? (
                                                <div className="leading-relaxed">
                                                  {typeof stmt === 'object' ? (
                                                    <div>
                                                      <p>{stmt.teks}</p>
                                                      <div contentEditable="false" className="flex gap-2 mt-2 font-bold mb-1 print:hidden select-none">
                                                        <span 
                                                          className={`text-[9px] px-2 py-0.5 rounded uppercase tracking-wider border cursor-pointer transition-colors ${stmt.sifat?.toUpperCase() === 'UNFAVORABLE' ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100' : 'bg-[#eef2ff] text-[#4f46e5] border-[#c7d2fe] hover:bg-indigo-100'}`}
                                                          onClick={(e) => {
                                                            const tr = e.currentTarget.closest('tr');
                                                            const cols = tr.querySelectorAll('td');
                                                            
                                                            // Determine maximum clickable index based on total columns
                                                            const maxIdx = cols.length - 1; // 3 for Guttman, 6 for Likert
                                                            
                                                            // Read current source label to know if Favorable/Unfavorable
                                                            const currSifat = e.currentTarget.innerText.toUpperCase();
                                                            
                                                            // Read current cycle index from dataset, default to 1 (before click 1)
                                                            let cycleIdx = parseInt(e.currentTarget.dataset.cycle) || 1;
                                                            
                                                            // Calculate target column index based on cycle.
                                                            // For Likert: 2 -> 3 -> 4 -> 5 -> 6 -> 2
                                                            // For Guttman: 2 -> 3 -> 2
                                                            let targetCol = cycleIdx + 1;
                                                            if (targetCol > maxIdx) {
                                                              targetCol = 2; // reset to first choice
                                                              cycleIdx = 1;
                                                            } else {
                                                              cycleIdx++;
                                                            }
                                                            
                                                            // Determine numerical score based on scale and target column
                                                            let scoreVal = '✔';
                                                            if (maxIdx === 6) { // Likert
                                                              if (currSifat === 'FAVORABLE') {
                                                                const scores = { 2: '5', 3: '4', 4: '3', 5: '2', 6: '1' };
                                                                scoreVal = scores[targetCol] || '✔';
                                                              } else {
                                                                const scores = { 2: '1', 3: '2', 4: '3', 5: '4', 6: '5' };
                                                                scoreVal = scores[targetCol] || '✔';
                                                              }
                                                            } else if (maxIdx === 3) { // Guttman
                                                              if (currSifat === 'FAVORABLE') {
                                                                const scores = { 2: '1', 3: '0' };
                                                                scoreVal = scores[targetCol] || '✔';
                                                              } else {
                                                                const scores = { 2: '0', 3: '1' };
                                                                scoreVal = scores[targetCol] || '✔';
                                                              }
                                                            }
                                                            
                                                            // Update dataset for next click
                                                            e.currentTarget.dataset.cycle = cycleIdx;

                                                            // Bersihkan semua isian di kolom skor
                                                            for(let i = 2; i < cols.length; i++) {
                                                              const inner = cols[i].querySelector('div');
                                                              if(inner) {
                                                                inner.innerHTML = '&nbsp;';
                                                                inner.classList.remove('text-[#10b981]', 'scale-125', 'font-black');
                                                              }
                                                            }

                                                            // Centang kolom target dengan angka skor
                                                            const targetInner = cols[targetCol]?.querySelector('div');
                                                            if (targetInner) {
                                                              targetInner.innerHTML = scoreVal;
                                                              targetInner.classList.add('text-[#10b981]', 'scale-125', 'font-black', 'transition-transform');
                                                            }
                                                          }}
                                                        >
                                                          {stmt.sifat}
                                                        </span>
                                                        <span className="text-[9px] bg-[#fdf4ff] text-[#c026d3] px-2 py-0.5 rounded uppercase tracking-wider border border-[#f5d0fe]">{stmt.skor}</span>
                                                      </div>
                                                    </div>
                                                  ) : (stmt.teks || stmt)}
                                                </div>
                                              ) : (
                                                <div className="w-11/12 mx-auto flex items-center justify-center min-h-[24px] border-b-2 border-dotted border-slate-400 text-base font-black text-[#0ea5e9] outline-none transition-all focus:border-solid focus:border-[#0ea5e9] focus:bg-[#f0f9ff] cursor-text pb-0.5">&nbsp;</div>
                                              )}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                                <div className="mt-4 px-2 pb-4 bg-white pt-4 rounded-b-2xl">
                                  <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
                                    <div className="flex flex-col gap-1.5 w-full md:w-auto flex-1">
                                      <p className="text-[11px] print:text-[10px] font-medium leading-relaxed italic border-l-2 border-[#0ea5e9] print:border-[#333] pl-3 text-slate-600 print:text-[#333] text-left">
                                        * <strong>SOP Teknis:</strong> <span className={item.lampiranInstruksi ? "text-[#0ea5e9] print:text-[#333]" : ""}>{item.lampiranInstruksi || (mainTeknik.toLowerCase() === 'eksperimen' ? `Terapkan protokol eksperimen dan catat hasil pengukuran secara objektif dan terukur untuk parameter ${item.parameter}.` : `Lakukan eksekusi secara mendalam untuk parameter ${item.parameter}.`)}</span>
                                      </p>
                                      {mainTeknik.toLowerCase() === 'kuesioner' && (
                                        <p className="text-[10px] print:text-[9.5px] font-medium border-l-2 border-indigo-400 print:border-[#333] pl-3 text-slate-500 print:text-[#333] text-left py-0.5">
                                          <strong className="text-indigo-600">Info Skoring:</strong> <strong>Favorable</strong> (Pernyataan Positif/Mendukung) &mdash; <strong>Unfavorable</strong> (Pernyataan Negatif/Tidak Mendukung). <em className="text-slate-400">*Klik tombol di atas untuk tes simulasi</em>
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-start md:justify-end gap-2 w-full md:w-auto shrink-0">
                                      {activeTeknik.toLowerCase().includes('dokumentasi') && (
                                        <button onClick={() => alert("Smart Assistant [SN-Dikti]: Pastikan kutipan dokumen ini tidak bertentangan dengan hasil observasi atau transkrip wawancara di lapangan! Lakukan *cross-checking* (Triangulasi) pada kolom paling kanan di tabel ini agar dosen pembimbing Anda memahami bahwa Anda tidak sekadar mengarang kaitan antar variabel.")} className="bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 print:hidden focus:outline-none shrink-0 border border-amber-300">
                                          <Info className="w-3.5 h-3.5" /> Triangulasi Validitas
                                        </button>
                                      )}
                                      <button onClick={(e) => { e.currentTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Tersimpan'; e.currentTarget.classList.replace('bg-[#145d7a]','bg-[#10b981]'); e.currentTarget.classList.replace('border-[#145d7a]/50','border-[#10b981]/50'); }} className="bg-[#145d7a] hover:opacity-90 text-white px-5 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 print:hidden focus:outline-none shrink-0 border border-[#145d7a]/50">
                                        <Save className="w-3.5 h-3.5" /> Simpan
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                {activeTeknik.toLowerCase().includes('dokumentasi') && (
                                  <details className="mt-2 mb-4 mx-4 bg-amber-50/50 print:bg-transparent border border-amber-200/60 print:border-[#bbb] rounded-xl shadow-sm print:shadow-none break-inside-avoid group cursor-pointer transition-all">
                                    <summary className="px-5 py-3 outline-none flex flex-col justify-center list-none [&::-webkit-details-marker]:hidden">
                                      <div className="flex items-center justify-between w-full border-amber-200/50 print:border-[#bbb] group-open:border-b group-open:pb-2 group-open:mb-2 transition-all">
                                        <h5 className="text-[11px] print:text-[10px] font-black text-amber-800 print:text-black tracking-wider uppercase flex items-center gap-1.5 focus:outline-none">
                                          <AlertCircle className="w-3.5 h-3.5" /> Pedoman Kualitas Dokumen (The 4-A Validity Test)
                                        </h5>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[9px] text-amber-600/80 italic font-medium group-open:hidden uppercase">Klik untuk melihat pedoman</span>
                                          <ChevronDown className="w-4 h-4 text-amber-700 transition-transform duration-300 group-open:-rotate-180" />
                                        </div>
                                      </div>
                                    </summary>
                                    <div className="px-5 pb-4 pt-1 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-3 leading-relaxed w-full cursor-default">
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0">
                                        <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">Filter kualitas tabel matriks ekstraksi ini menggunakan parameter akademik Kemendikbudristek:</p>
                                        <ul className="list-disc pl-5 space-y-1.5 mt-1 print:pl-4">
                                          <li><strong>Authenticity (Keaslian):</strong> Dokumen yang dipindahkan ke matriks ini harus merupakan naskah asli atau salinan sah, bukan arsip yang tidak diakui instansi (hindari plagiarisme/<em>forgery</em>).</li>
                                          <li><strong>Authority (Otoritas Kredibel):</strong> Bukti tertulis diterbitkan secara sah (SK Rektor, Peraturan Menteri, Laporan TTD, dst). Jangan mengutip entitas sekunder tanpa landasan.</li>
                                          <li><strong>Accuracy (Akurasi Tinggi):</strong> Anda harus membaca cermat sebelum mengekstraksi data. Kutipan Tidak boleh memiliki benturan/kesalahan internal dengan bab-bab sebelumnya.</li>
                                          <li><strong>Adjacency (Keterkinian Data):</strong> Pastikan lokus subjek & tahun dokumen masih sangat relevan (<em>recent</em>) sebagai pendukung landasan teori Anda di Bab 1 & 2.</li>
                                        </ul>
                                      </div>
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0 mt-3 border-t border-dashed">
                                        <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">SOP Prosedur Analisis Data Dokumentasi:</p>
                                        <ul className="list-decimal pl-5 space-y-1.5 mt-1 print:pl-4 font-medium text-slate-800">
                                          <li><strong className="text-amber-800">1. Analisis Deskriptif:</strong> Identifikasi frekuensi kemunculan kata kunci, regulasi, atau temuan dominan pada kolom 'Kutipan Data Otentik'.</li>
                                          <li><strong className="text-amber-800">2. Reduksi Data:</strong> Filter dokumen redundan, fokuskan pengkodean pada kolom 'Relasi Indikator' untuk mereduksi kompleksitas subjek.</li>
                                          <li><strong className="text-amber-800">3. Interpretasi & Pembahasan:</strong> Gunakan kolom 'Makna' untuk menautkan temuan dokumen dengan teori di Bab 2. Lakukan evaluasi akhir di kolom 'Triangulasi'.</li>
                                          <li><strong className="text-amber-800">4. Penarikan Kesimpulan:</strong> Rangkum seluruh relasi dokumen hasil reduksi untuk menjawab rumusan masalah secara komprehensif.</li>
                                        </ul>
                                      </div>
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-amber-100 print:border-none print:p-0 mt-3 border-t border-dashed">
                                        <p className="font-bold italic mb-2 text-amber-900 border-l-2 border-amber-400 pl-2">Alur Mekanisme Triangulasi Multi-Instrumen:</p>
                                        <ol className="list-decimal pl-5 space-y-1.5 mt-1 print:pl-4 font-medium text-slate-700">
                                          <li>Pilih opsi <strong className="text-amber-800">Wawancara</strong> dari menu <em>Teknik Pengambilan Data</em>, lalu klik <strong className="text-amber-800">Hasilkan Instrumen</strong> untuk menyusun daftar pertanyaan primer.</li>
                                          <li>Kemudian, pilih kembali <strong className="text-amber-800">Studi Dokumentasi</strong> dan klik *Generate* untuk menyusun Matriks Ekstraksi khusus dokumen ini.</li>
                                          <li>Gunakan kolom <strong className="text-amber-800">Relasi Indikator / Triangulasi</strong> pada tabel dokumen secara aktif untuk menyilangkan hasil dokumen dengan pernyataan narasumber dari tebel Wawancara sebelumnya!</li>
                                        </ol>
                                      </div>
                                    </div>
                                  </details>
                                )}
                                {mainTeknik.toLowerCase() === 'eksperimen' && (
                                  <details className="mt-2 mb-4 mx-4 bg-blue-50/50 print:bg-transparent border border-blue-200/60 print:border-[#bbb] rounded-xl shadow-sm print:shadow-none break-inside-avoid group cursor-pointer transition-all">
                                    <summary className="px-5 py-3 outline-none flex flex-col justify-center list-none [&::-webkit-details-marker]:hidden">
                                      <div className="flex flex-wrap items-center justify-between w-full border-blue-200/50 print:border-[#bbb] group-open:border-b group-open:pb-2 group-open:mb-2 transition-all">
                                        <div className="flex items-center gap-2">
                                          <h5 className="text-[11px] print:text-[10px] font-black text-[#0c4a6e] print:text-black tracking-wider uppercase">Pedoman Instrumen Eksperimen</h5>
                                          <span className="text-[9px] text-[#0c4a6e]/80 italic font-medium group-open:hidden uppercase ml-2">Klik untuk melihat pedoman</span>
                                          <ChevronDown className="w-4 h-4 text-[#0c4a6e] transition-transform duration-300 group-open:-rotate-180" />
                                        </div>
                                        <div className="flex gap-1.5 print:hidden">
                                          <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [item.id]: 'RAL'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[item.id] === 'RAL' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih RAL</button>
                                          <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [item.id]: 'RAK'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[item.id] === 'RAK' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih RAK</button>
                                          <button onClick={(e) => { e.preventDefault(); setSelectedDesign(prev => ({...prev, [item.id]: 'ANAKOVA'}))}} className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase transition hover:opacity-80 ${selectedDesign[item.id] === 'ANAKOVA' ? 'bg-blue-600 text-white border border-blue-600' : 'bg-white text-slate-500 border border-slate-300'}`}>Pilih ANAKOVA</button>
                                        </div>
                                      </div>
                                    </summary>
                                    <div className="px-5 pb-4 pt-1 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-3 leading-relaxed w-full cursor-default">
                                      {(!selectedDesign[item.id] || selectedDesign[item.id] === 'RAL') && (
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                        <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                          <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">1</span> 
                                          Rancangan Acak Lengkap (RAL) 
                                          <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Asumsi Lingkungan Homogen</span>
                                        </div>
                                        <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                          <li><strong>Langkah 1:</strong> Input identitas seluruh unit percobaan ke kolom <strong className="text-slate-800">SUBJEK / OBJEK TARGET</strong> setelah pengacakan penuh dilakukan.</li>
                                          <li><strong>Langkah 2:</strong> Catat hasil murni dari intervensi parameter ke kolom <strong className="text-slate-800">ANGKA / NILAI TERUKUR</strong> sebagai nilai efek Perlakuan.</li>
                                          <li><strong>Langkah 3:</strong> Input setiap anomali teknis lapangan ke kolom <strong className="text-slate-800">CATATAN KUALITATIF</strong> sebagai parameter argumen pembentuk Galat mutlak.</li>
                                        </ul>
                                      </div>
                                      )}

                                      {(!selectedDesign[item.id] || selectedDesign[item.id] === 'RAK') && (
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                        <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                          <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">2</span> 
                                          Rancangan Acak Kelompok (RAK)
                                          <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Asumsi Lingkungan Heterogen</span>
                                        </div>
                                        <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                          <li><strong>Langkah 1:</strong> Manfaatkan fitur <em>(edit)</em> header untuk merevisi nama kolom, atau tambahkan kode grup eksplisit pada <strong>SUBJEK / OBJEK TARGET</strong> guna menetapkannya sebagai parameter <em>Kelompok/Blok</em> spesifik.</li>
                                          <li><strong>Langkah 2:</strong> Isi hasil pengukuran pada kolom <strong className="text-slate-800">ANGKA / NILAI TERUKUR</strong>, pastikan eksekusi dirandomisasi terpisah secara spesifik di dalam tiap blok/kelompok.</li>
                                          <li><strong>Langkah 3:</strong> Gunakan kolom <strong className="text-slate-800">CATATAN KUALITATIF</strong> untuk merinci varians lingkungan pada blok tersebut agar tidak menyimpang lalu terhitung sebagai galat bebas.</li>
                                        </ul>
                                      </div>
                                      )}

                                      {(!selectedDesign[item.id] || selectedDesign[item.id] === 'ANAKOVA') && (
                                      <div className="bg-white/50 print:bg-transparent p-2.5 rounded border border-blue-100 print:border-none print:p-0">
                                        <div className="font-black text-[#0c4a6e] print:text-black uppercase text-[10px] mb-1.5 flex items-center gap-1.5 flex-wrap">
                                          <span className="bg-blue-600 text-white print:bg-black px-1.5 py-0.5 rounded text-[9px] print:text-white mt-[-1px]">3</span> 
                                          Analisis Kovariat (ANAKOVA)
                                          <span className="normal-case font-medium text-slate-500 print:text-[#333] italic">- Integrasi Reduksi Galat</span>
                                        </div>
                                        <ul className="list-decimal pl-5 space-y-1 mt-1 print:pl-4">
                                          <li><strong>Langkah 1:</strong> Manfaatkan tombol <em>(edit)</em> header untuk mendedikasikan pengukuran pra-intervensi (<strong className="text-slate-900 print:text-black">Kovariat</strong>) sebelum instrumen perlakuan utama/parameter dilaksanakan pada subjek.</li>
                                          <li><strong>Langkah 2:</strong> Segera setelah intervensi selesai, rekam parameter hasil akhir efek eksperimen (RAL/RAK) pada kolom <strong>ANGKA / NILAI TERUKUR</strong>.</li>
                                          <li><strong>Langkah 3:</strong> Beri keterangan kausalitas tambahan di <strong>CATATAN KUALITATIF</strong>; data di instrumen pengumpulan ini akan diregresi silang pada eksekusi komparasi Bab 4 nanti.</li>
                                        </ul>
                                      </div>
                                      )}
                                      <div className="mt-3 bg-[#f0f9ff] print:bg-transparent p-3 rounded-lg border border-[#bae6fd] print:border-none print:p-0">
                                        <div className="font-bold text-[#0369a1] print:text-black mb-1.5 flex items-center gap-1.5">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lightbulb"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1.3.5 2.6 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>
                                          Tips Tabulasi Pra-Software Statistik (SPSS/JASP/R):
                                        </div>
                                        <ul className="list-disc pl-5 text-[10px] print:text-[9.5px] text-slate-700 print:text-[#333] space-y-1">
                                          <li>Tabel di atas bersifat <em className="text-[#0369a1]">editable</em> (dapat diketik langsung). Manfaatkan fitur ini untuk langsung menyusun <strong>Coding Angka</strong> secara *real-time* sebelum di-ekspor ke Excel.</li>
                                          <li>Isi baris observasi di kolom <strong>SUBJEK / OBJEK TARGET</strong> murni dengan representasi numerik (contoh: isi angka '1' untuk Perlakuan A, '2' untuk Perlakuan B) alih-alih merangkum teks naratif.</li>
                                          <li>Pastikan kolom <strong>ANGKA / NILAI TERUKUR</strong> murni terisi angka (tanpa label/satuan seperti 'kg' atau 'meter') agar dataset lampiran Anda 100% siap saat di-impor ke aplikasi uji hipotesis.</li>
                                        </ul>
                                      </div>
                                    </div>
                                  </details>
                                )}
                              </div>
                            );
                          }
                        });
                      }

                      return elements;
                    })}

                    {/* Instruksi Pengisian Terkustomisasi Terletak Internal pada Masing-Masing Tabel */}

                    <div className="flex justify-center gap-6 mt-16 mb-12 print:hidden w-full">
                      <button
                        onClick={() => handleExportPDF('lampiran-section', 'Tally_Sheet.pdf')}
                        className="bg-white text-[#0284c7] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 transition-all outline-none shadow-xl shadow-slate-200"
                      >
                        <Download className="w-5 h-5" /> EXPORT TABEL KE PDF
                      </button>
                      <button
                        onClick={exportLampiranToExcel}
                        className="bg-white text-[#047857] border border-[#10b981]/30 hover:bg-[#10b981] hover:text-white px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 transition-all outline-none shadow-xl shadow-slate-200"
                      >
                        <FileSpreadsheet className="w-5 h-5" /> EXPORT KE EXCEL (XLSX)
                      </button>
                    </div>

                  </div>
                )}

              </div>
            </div>
          )}

          {/* PAGE STEP 2: DATA PRIMER */}
          {currentStep === 2 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-black text-[#1a2332]">Input Data Primer</h3>
                  <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">Kompilasi Digital Tally Sheet Hasil Lapangan</p>
                </div>
                <button onClick={handleTabUtama} className="bg-[#a855f7] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md shadow-purple-500/20 hover:bg-purple-600 transition-all outline-none">
                  <ArrowRight className="w-4 h-4" /> Buat Tabel Rekap
                </button>
              </div>
              <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-center">
                  <thead className="bg-slate-800 text-slate-200">
                    <tr>
                      <th className="p-5 font-black text-[10px] uppercase tracking-widest border-r border-slate-700 w-48">Stasiun Titik Uji</th>
                      {primerHeaders.map((h, index) => (
                        <th key={h.code} className="p-4 font-black text-[10px] uppercase tracking-widest border-r border-slate-700 min-w-[140px]" style={{ backgroundColor: chevronColors[index % 4] + '20' }}>
                          <div className="flex flex-col gap-1 items-center">
                            <span className="bg-white text-slate-900 py-1 px-3 rounded-md shadow-sm font-black text-xs">{h.code}</span>
                            <span className="text-[9px] font-bold mt-1 text-slate-300 leading-tight block">{h.desc}</span>
                          </div>
                        </th>
                      ))}
                      <th className="p-5 font-black text-[10px] uppercase tracking-widest">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {primerRows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 border-r border-slate-100 bg-slate-50/50">
                          <input className="w-full text-center font-bold text-slate-600 bg-transparent outline-none focus:text-indigo-600 focus:bg-white rounded-lg px-2 py-2" value={row.responden} onChange={e => {
                            const n = [...primerRows]; n[idx].responden = e.target.value; setPrimerRows(n);
                          }} />
                        </td>
                        {primerHeaders.map((h, iCol) => (
                          <td key={h.code} className="p-3 border-r border-slate-50">
                            <input
                              className="w-full p-3 bg-slate-50 text-center font-black text-xl outline-none focus:ring-2 rounded-xl transition-all font-mono border-white shadow-inner"
                              style={{ color: chevronColors[iCol % 4] }}
                              value={row[h.code] !== undefined ? row[h.code] : ''}
                              onChange={e => {
                                const val = e.target.value;
                                const n = [...primerRows];
                                n[idx][h.code] = val;
                                setPrimerRows(n);
                              }}
                            />
                          </td>
                        ))}
                        <td className="p-4">
                          <button onClick={() => setPrimerRows(primerRows.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  onClick={() => {
                    const newId = Date.now();
                    const nextNum = primerRows.length + 1;
                    setPrimerRows([...primerRows, { id: newId, responden: `Stasiun ${nextNum < 10 ? '0' + nextNum : nextNum}` }]);
                  }}
                  className="w-full p-6 text-xs font-black text-[#0ea5e9] uppercase tracking-widest border-t border-dashed border-slate-200 hover:bg-slate-50 transition-all outline-none"
                >
                  <Plus className="w-4 h-4 inline mr-1 -mt-0.5" /> Tambah Record Titik Target
                </button>
              </div>
            </div>
          )}

          {/* PAGE STEP 3: TABEL UTAMA */}
          {currentStep === 3 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Table2 className="w-6 h-6 text-[#eab308]" />
                    <h3 className="text-2xl font-black text-[#1a2332]">Tabel Utama</h3>
                  </div>
                  <p className="text-sm font-semibold text-slate-500 mt-2 max-w-2xl">
                    Rekapitulasi absolut data ini digunakan sebagai komposit visual di Tugas Akhir Anda.
                  </p>
                </div>
                <div className="flex gap-3 shrink-0 flex-wrap justify-end">
                  <button onClick={() => handleExportPDF('tabelBab4', 'Tabel_Analisis_Bab_4.pdf')} className="bg-[#0ea5e9]/10 text-[#0ea5e9] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm outline-none">
                    <Download className="w-4 h-4" /> EXPORT PDF
                  </button>
                  <button onClick={handleExportBab4Excel} className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 hover:bg-[#10b981] hover:text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm outline-none">
                    <FileSpreadsheet className="w-4 h-4" /> EXPORT EXCEL
                  </button>
                  <button onClick={handleExportSPSS} className="bg-[#145d7a] text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#11465e] transition-all shadow-lg hover:shadow-xl active:scale-95 outline-none shrink-0 border border-[#145d7a]/50">
                    <Database className="w-4 h-4" /> SPSS / PLS (.CSV)
                  </button>
                </div>
              </div>
              <div className="p-8" id="tabelBab4">
                <table className="w-full text-center border-2 border-[#1a2332] rounded-xl overflow-hidden shadow-sm">
                  <thead className="bg-[#1a2332] text-white">
                    <tr>
                      {tableHeaders.map((h, i) => (
                        <th key={i} contentEditable="true" suppressContentEditableWarning={true} className={`p-4 font-black text-[10px] uppercase tracking-widest border-r border-[#2d3a54] outline-none focus:bg-slate-700 transition-colors cursor-text ${i === tableHeaders.length - 1 ? 'border-r-0 bg-[#eab308]' : ''}`}>
                          {h} <span className="text-[8px] opacity-50 ml-1 normal-case font-medium lowercase">(edit)</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {tableRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {row.map((cell, j) => (
                          <td key={j} contentEditable="true" suppressContentEditableWarning={true} className={`p-4 text-sm font-bold border-r border-slate-200 outline-none focus:bg-slate-50 transition-colors cursor-text ${j >= tableHeaders.length - 1 ? 'text-[#eab308] font-black' : 'text-slate-600'} ${j === row.length - 1 ? 'border-r-0' : ''}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-6 flex justify-end print:hidden">
                  <button onClick={(e) => { e.currentTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> Tersimpan'; e.currentTarget.classList.replace('bg-[#eab308]','bg-[#10b981]');  }} className="bg-[#eab308] hover:opacity-90 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center gap-2 focus:outline-none">
                    <Save className="w-4 h-4" /> Simpan Tabel Utama
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PAGE STEP 4: DATA SEKUNDER */}
          {currentStep === 4 && (
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-10 space-y-8 relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 pb-6 relative text-left">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="w-6 h-6 text-[#10b981]" />
                    <h3 className="text-2xl font-black text-[#1a2332] tracking-tight">Data Sekunder</h3>
                  </div>
                  <p className="text-slate-600 font-medium text-sm max-w-3xl leading-relaxed mt-3 p-4 bg-emerald-50 border border-emerald-100 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#10b981]"></div>
                    <Info className="w-4 h-4 text-emerald-600 inline mr-2 -mt-0.5" />
                    <strong>Data yang diperoleh secara tidak langsung,</strong> biasanya berupa data yang sudah dikumpulkan oleh pihak lain (misalnya data Badan Pusat Statistik, dokumen perusahaan, atau literatur terdahulu).
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className={`w-full py-16 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-sm flex flex-col items-center justify-center gap-4 cursor-pointer transition-all border-2 border-dashed ${isSekunderUploading ? 'opacity-50 pointer-events-none bg-slate-50 border-slate-300' : (sekunderFileName ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-50 border-[#10b981]/50 text-[#10b981] hover:bg-[#10b981]/10 hover:border-[#10b981]')} `}>
                  <input type="file" accept=".pdf,.docx" className="hidden" disabled={isSekunderUploading || isLoading} onChange={handleSekunderUpload} />
                  {isSekunderUploading ? <Loader2 className="w-10 h-10 animate-spin" /> : <UploadCloud className="w-10 h-10" />}
                  {isSekunderUploading ? 'MENGEKSTRAKSI LITERATUR...' : (sekunderFileName ? `DOKUMEN SEKUNDER: ${sekunderFileName.substring(0, 30)}...` : 'IMPORT SUMBER DATA (PDF/DOCX)')}
                  <span className="text-[11px] font-medium text-slate-500 normal-case tracking-normal">Lampirkan arsip data yang telah terekam (BPS, Laporan Profil Jurnal, Rekam Medis, dsb).</span>
                </label>
              </div>

              <div className="flex justify-end mt-8 pt-6 border-t border-slate-100">
                 <button onClick={() => setCurrentStep('roadmap')} className="bg-[#1a2332] text-white px-8 py-3.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95 outline-none">
                    SELESAI <CheckCircle2 className="w-4 h-4" />
                 </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
    </>
  );
}
