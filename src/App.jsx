import React, { useState } from 'react';
import { 
  Database, ArrowRight, Loader2, Table2, Wand2, UploadCloud, Download,
  ListChecks, Plus, Trash2, LayoutDashboard, ChevronRight, Info, Sparkles, AlertCircle,
  User, CheckCircle2, Map, Bell, BookOpen, Target, LayoutTemplate, FileSpreadsheet
} from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export default function App() {
  const [currentStep, setCurrentStep] = useState('roadmap'); 
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  
  const [userProfile, setUserProfile] = useState({
    nama: '', perguruanTinggi: '', prodi: '', fakultas: '', jenjang: 'S1'
  });

  const [researchData, setResearchData] = useState({
    judul: '', babContent: ''
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

  const fillBioDummy = () => {
    setUserProfile({
      nama: 'Andi Rianto', perguruanTinggi: 'Universitas Padjadjaran', prodi: 'Biologi', fakultas: 'MIPA', jenjang: 'S1'
    });
    setResearchData({
      judul: 'Analisis Stratifikasi Vegetasi di Hutan Lindung Gunung Patuha',
      babContent: 'Penelitian ini akan mengukur parameter lingkungan biotik secara langsung.'
    });
  };

  const PROMPT_TEMPLATE = `
Anda adalah seorang Ahli Metodologi Penelitian Lapangan Teknis.
Berdasarkan parameter skripsi di bawah ini:
Judul Skripsi: "{judul}"
Konteks Alat / Tambahan: "{konteks}"
Program Studi Mahasiswa: "{prodi}"

Tugas:
1. Ekstrak dan definisikan Variabel Utama penelitian (X, Y, Z, M jika ada). Jelaskan setiap variabel secara PADAT, LUGAS, dan RINGKAS (Maksimal 2 Kalimat).
2. Rancang "Tabel Tally Sheet" (Observasi Lapangan) YANG DEEP DAN TEKNIS.
3. Parameter harus dikelompokkan hierarkis ke dalam "Dimensi".
4. Setiap parameter WAJIB mencantumkan Satuan / Catatan Validasi teknis di lapangan.
5. Siapkan juga struktur header Tabel Primer dan berikan 3 sampel mock-data pengisian observasi.
6. Untuk SETIAP dimensi dan item parameter, WAJIB definisikan array \`lampiranHeaders\` berisi judul kolom spesifik untuk formulir lampiran. **Jumlah kolom BEBAS** sesuai kerumitan data (misal butuh 5 kolom: ["Titik", "Utara", "Timur", "Selatan", "Barat"]). JANGAN gunakan header generik!
7. Untuk SETIAP dimensi dan parameter, WAJIB definisikan string \`lampiranInstruksi\` yang berfokus HANYA pada SOP cara teknis mengisi tabel, cara mengukur, dan satuan yang digunakan. (contoh: "Hitung sampel menggunakan tally counter dalam satuan individu dan catat distribusinya masing-masing.").

WAJIB KEMBALIKAN HANYA OBJEK JSON MURNI YANG VALID. DILARANG MEMBERIKAN TEKS PENDAHULUAN ATAU BACKTICKS:
{
  "variabel_penelitian": [
    { "jenis": "Variabel X (Independen)", "nama": "Nama Variabel", "penjelasan": "Penjelasan padat." }
  ],
  "observasi": [
    {
      "dimensi": "Dimensi Profil Kanopi",
      "lampiranInstruksi": "Gunakan densiometer pada 4 arah mata angin di setiap plot dan catat persentasenya rata-rata.",
      "lampiranHeaders": ["Lokasi Titik", "Kuadran Utara", "Kuadran Timur", "Kuadran Selatan", "Kuadran Barat", "Catatan Keseluruhan"],
      "items": [
        { "id": "p1", "parameter": "Tutupan Tajuk", "satuan": "%", "lampiranInstruksi": "Bidik densiometer secara tegak lurus searah dada pengamat.", "lampiranHeaders": ["Sektor Titik", "Skor A", "Skor B", "Catatan Khusus"] },
        { "id": "p2", "parameter": "Tinggi Dominan", "satuan": "m", "lampiranInstruksi": "Gunakan clinometer untuk mengukur sudut puncak dan pangkal dari jarak yang ditentukan.", "lampiranHeaders": ["Spesies", "Jarak", "Sudut Puncak", "Sudut Pangkal", "Estimasi (m)"] }
      ]
    }
  ],
  "primerHeaders": [
    { "code": "P1", "desc": "Tutupan Tajuk (%)" },
    { "code": "P2", "desc": "Tinggi Dominan (m)" }
  ],
  "dummyPrimer": [
    { "id": 1, "responden": "Stasiun 1", "P1": 85, "P2": 15 }
  ]
}
`;

  const generateDetailingFallback = (judul = "Analisis Stratifikasi Vegetasi", prodi = "Biologi") => {
    return {
      variabel_penelitian: [
        { jenis: "Struktur Model", nama: `Model Konsep: ${prodi}`, penjelasan: `Variabel secara spesifik diambil dari: ${judul}` },
        { jenis: "Variabel Y (Dependen)", nama: "Fokus Output", penjelasan: "Sistem mengalami kegagalan AI (fallback), variabel ini adalah perwakilan umum." }
      ],
      observasi: [
        {
          dimensi: "Dimensi Observasi Umum",
          lampiranInstruksi: "Lakukan pengamatan secara iteratif di setiap titik stasiun menggunakan pedoman visual standar sebelum mencatat kuantitas spesifik.",
          lampiranHeaders: ["Sektor / Area Pos", "Faktor Lingkungan A", "Faktor Lingkungan B", "Hasil Pengukuran Akumulatif", "Catatan Deskriptif Fenomena"],
          items: [
            { id: "p1", parameter: "Indikator Target Utama 1", satuan: "Skala Validasi / Kategori", lampiranInstruksi: "Identifikasi sampel target sedekat mungkin tanpa merusak struktur dan hitung secara berurutan.", lampiranHeaders: ["Nama Objek Temuan", "Nilai Terukur", "Catatan Tambahan"] },
            { id: "p2", parameter: "Indikator Target Utama 2", satuan: "Skala Validasi / Kategori", lampiranInstruksi: "Lakukan pencatatan frekuensi kemunculan objek tersebut dalam durasi absolut menggunakan tally counter.", lampiranHeaders: ["Subjek/Responden", "Kuantitas", "Keterangan Validasi"] }
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
              "messages": [{"role": "user", "content": promptText}]
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
           const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
           const aiResponse = await model.generateContent(promptText);
           return aiResponse.response.text();
         } catch(geminiError) {
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
    const numPages = Math.min(5, pdf.numPages);
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
          return;
       }
       
       const rawText = text.substring(0, 15000);
       const coverText = text.substring(0, 4000);
       
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
          .replace('{konteks}', currentKonteks)
          .replace('{prodi}', currentProfile.prodi);

      let responseText;
      try {
         responseText = await runAI(prompt);
      } catch(apiErr) {
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
        } catch(parseError) {
          throw new Error("JSON Parse failed. Response was: " + responseText.substring(0, 50));
        }
      } else {
        detail = generateDetailingFallback(currentJudul, currentProfile.prodi);
      }

      const fallback = generateDetailingFallback();
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
      const fallback = generateDetailingFallback(currentJudul, currentProfile.prodi);
      setVariabelData(fallback.variabel_penelitian);
      setObservasiData(fallback.observasi);
      setCheckedLampiranIds([]);
      setIsLampiranGenerated(false);
      setIsGeneratingLampiran(false);
      setPrimerHeaders(fallback.primerHeaders);
      setPrimerRows(fallback.dummyPrimer);
      setTableHeaders(["Lokasi / Target", ...fallback.primerHeaders.map(h => h.code), "Kategori Evaluasi"]);
      syncData(fallback.primerHeaders, fallback.dummyPrimer);
      setError("Data Gagal Diekstrak Penuh (AI Error/Format Berbeda). Ini adalah Mode Fallback yang disesuaikan.");
      setCurrentStep(1);
    } finally {
      setIsLoading(false);
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
    const containerDiv = document.getElementById("lampiranContainer");
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

  // Exact UI Colors
  const chevronColors = ['#f97316', '#0ea5e9', '#a855f7', '#eab308'];
  
  const stepsData = [
    { id: 0, label: 'KONTEKS', title: 'Konteks Penelitian', desc: 'Masukkan parameter riset dan perintahkan AI.', icon: <User className="w-5 h-5"/> },
    { id: 1, label: 'TALLY SHEET', title: 'Tabel Tally Sheet', desc: 'Penjabaran komponen data teknis wajib.', icon: <ListChecks className="w-5 h-5"/> },
    { id: 2, label: 'DATA PRIMER', title: 'Titik Data Primer', desc: 'Kompilasi Digital Rekam Jejak Lapangan.', icon: <Database className="w-5 h-5"/> },
    { id: 3, label: 'ANALISIS BAB 4', title: 'Tabel Analisis Bab 4', desc: 'Rekapitulasi absolut komposit visual.', icon: <Table2 className="w-5 h-5"/> }
  ];

  return (
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
                    <Sparkles className="w-5 h-5 text-yellow-400"/>
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
                     <h2 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">Road Map Topik Penelitian</h2>
                     <p className="text-teal-100 text-[13px] mt-2 font-medium">Rencana tahapan penyusunan drafmu. Selesaikan milestone dari kiri ke kanan.</p>
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
                     )})}
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
                 <button onClick={fillBioDummy} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 active:scale-95 transition-all outline-none">
                   <LayoutDashboard className="w-4 h-4" /> Contoh Dummy
                 </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Peneliti</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Andi Rianto" value={userProfile.nama} onChange={e => setUserProfile({...userProfile, nama: e.target.value})} />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Universitas</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Universitas Padjadjaran" value={userProfile.perguruanTinggi} onChange={e => setUserProfile({...userProfile, perguruanTinggi: e.target.value})} />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fakultas</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Fakultas MIPA" value={userProfile.fakultas} onChange={e => setUserProfile({...userProfile, fakultas: e.target.value})} />
                 </div>
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Program Studi</label>
                   <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-bold text-slate-700 outline-none" placeholder="Biologi Ekologi" value={userProfile.prodi} onChange={e => setUserProfile({...userProfile, prodi: e.target.value})} />
                 </div>
               </div>

               <div className="space-y-6">
                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Judul Topik Observasi</label>
                   <textarea className="w-full p-5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-[#0ea5e9] transition-all font-black text-xl text-slate-800 leading-tight outline-none" rows="2" placeholder="Analisis Morfologi..." value={researchData.judul} onChange={e => setResearchData({...researchData, judul: e.target.value})} />
                 </div>
               </div>

               <div className="flex flex-col md:flex-row gap-4 mt-6">
                 <label className={`flex-1 py-5 rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all border-2 border-dashed ${fileName ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100 hover:border-slate-400'} ${isFileUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                   <input type="file" accept=".pdf,.docx" className="hidden" onChange={handleFileUpload} disabled={isFileUploading || isLoading} />
                   {isFileUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />} 
                   {isFileUploading ? 'MEMBACA DOKUMEN...' : (fileName ? `DOKUMEN: ${fileName.substring(0,25)}...` : 'IMPORT SKRIPSI BAB 1-3 (.PDF/.DOCX)')}
                 </label>
                 
                 <button onClick={handleGenerate} disabled={!researchData.judul || isLoading || isFileUploading} className="flex-1 py-5 bg-[#145d7a] text-white rounded-2xl font-black text-[13px] uppercase tracking-widest shadow-xl shadow-[#145d7a]/20 flex items-center justify-center gap-3 hover:bg-[#11465e] active:scale-[0.98] transition-all disabled:opacity-50 outline-none">
                   {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5"/>}
                   {isLoading ? 'MENGHASILKAN...' : 'Hasilkan Tally Sheet via AI'}
                 </button>
               </div>
            </div>
          )}

          {/* PAGE STEP 1: TALLY SHEET */}
          {currentStep === 1 && (
             <div className="bg-white rounded-[2rem] print:rounded-none shadow-sm print:shadow-none border border-slate-200/60 print:border-none print:bg-transparent overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                 <div>
                   <h3 className="text-2xl font-black text-[#1a2332]">Tabel Tally Sheet Observasi</h3>
                   <p className="text-sm font-semibold text-slate-400 mt-1 max-w-2xl">Penjabaran komponen data teknis yang wajib dibawa dan diisi di Plot lapangan penelitian.</p>
                 </div>
                 <button onClick={() => setCurrentStep(2)} className="bg-[#f97316] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-[#ea580c] transition-all shadow-md shrink-0 outline-none">Lanjut Transkrip Data <ChevronRight className="w-4 h-4"/></button>
               </div>
               
               {variabelData && variabelData.length > 0 && (
                 <div className="px-8 pt-8 pb-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 bg-slate-50/50 border-b border-slate-100 print:hidden">
                   {variabelData.map((v, idx) => (
                      <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm border-t-4 hover:-translate-y-1 transition-transform" style={{borderTopColor: chevronColors[idx % 4]}}>
                         <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.jenis}</div>
                         <h4 className="text-[13px] font-bold text-slate-800 mt-1.5 mb-2 leading-tight">{v.nama}</h4>
                         <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{v.penjelasan}</p>
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
                       <ListChecks className="text-[#38bdf8] w-6 h-6" /> Tabel Tally Sheet (Lembar Observasi Lapangan)
                     </h3>
                     <p className="text-slate-400 italic text-[13px] mt-2 font-medium max-w-4xl">
                       Tabel ini adalah instrumen pengumpulan data teknis yang kelak akan dibawa peneliti ke wilayah {researchData.judul ? `"${researchData.judul.substring(0,60)}"` : 'hutan / wilayah studi'} untuk diisi setiap kali melakukan pencatatan titik stasiun/plot.
                     </p>
                   </div>

                   <div className="mt-8 mb-6">
                     <h4 className="font-bold text-white text-[15px] tracking-wide">
                       Tabel 1: Instrumen Pengukuran Observasi Teknis (Variabel X dan Y)
                     </h4>
                     <div className="text-slate-300 text-[13px] mt-3 flex flex-wrap gap-x-8 gap-y-4 font-normal">
                       <span>Stasiun/Plot Pengamatan : <span className="text-slate-500">________________________</span></span>
                       <span>Koordinat GPS : <span className="text-slate-500">________________________</span></span>
                       <span>Waktu Pengukuran : <span className="text-slate-500">________________________</span></span>
                     </div>
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
                                 <td className="p-4 text-[13px] font-medium text-slate-300 border-r border-slate-800 pr-8">
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
                                      <span className="group-hover:text-white transition-colors leading-tight">{item.parameter}</span>
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
                         onClick={() => {
                            setIsGeneratingLampiran(true);
                            setTimeout(() => {
                               setIsGeneratingLampiran(false);
                               setIsLampiranGenerated(true);
                               setTimeout(() => {
                                   document.getElementById('lampiran-section')?.scrollIntoView({ behavior: 'smooth' });
                               }, 100);
                            }, 1500);
                         }} 
                         disabled={isGeneratingLampiran}
                         className={`bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/30 px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 hover:bg-[#0ea5e9] hover:text-white transition-all shadow-lg shadow-[#0ea5e9]/10 cursor-pointer outline-none ${isGeneratingLampiran ? 'opacity-70 cursor-wait' : 'animate-bounce'}`}
                       >
                         {isGeneratingLampiran ? <Loader2 className="w-5 h-5 animate-spin" /> : <LayoutTemplate className="w-5 h-5"/>}
                         {isGeneratingLampiran ? "SEDANG MENGHASILKAN MATRIKS LAPANGAN..." : `BUAT ${checkedLampiranIds.length} TABEL LAMPIRAN`}
                       </button>
                    </div>
                 )}

                   <div className="mt-8 flex justify-end">
                     <button onClick={() => window.print()} className="bg-slate-700 text-white border border-slate-600 px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-slate-600 hover:text-cyan-200 transition-all outline-none shadow-xl drop-shadow-md">
                        <Download className="w-4 h-4"/> DOWNLOAD/CETAK FORMULIR LAPANGAN (PDF)
                     </button>
                    </div>
                  </div>
                  </div>

                  {/* VIEW 2: LAMPIRAN VIEWPORT */}
                  {(isLampiranGenerated && checkedLampiranIds.length > 0) && (
                    <div id="lampiran-section" className="p-8 bg-[#1a202d] rounded-3xl shadow-xl shadow-slate-900/10 border border-[#0ea5e9]/20 print:border-none print:shadow-none animate-in fade-in slide-in-from-bottom-4 duration-500 print:break-before-page">
                      
                      <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-700/50 print:hidden">
                         <button 
                            onClick={() => {
                               setIsLampiranGenerated(false);
                            }} 
                            className="bg-slate-800/50 hover:bg-slate-700 text-slate-300 hover:text-white px-5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all outline-none"
                         >
                            <ChevronRight className="w-4 h-4 rotate-180"/> KEMBALI KE SETTING TALLY SHEET
                         </button>
                         <button onClick={() => window.print()} className="bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-6 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all outline-none shadow-xl drop-shadow-md">
                            <Download className="w-4 h-4"/> DOWNLOAD/CETAK LAMPIRAN (PDF)
                         </button>
                      </div>

                      <h3 className="text-2xl font-black text-white mb-8 text-center uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        [ DOKUMEN LAMPIRAN KHUSUS OBSERVASI ]
                      </h3>

                    {observasiData.map(group => {
                      const elements = [];
                      
                      if (checkedLampiranIds.includes(group.dimensi)) {
                        const headers = ['No', ...(group.lampiranHeaders || ['Subjek / Objek Pengamatan', 'Hasil Pengukuran', 'Catatan Tambahan'])];
                        const colCount = headers.length;
                        elements.push(
                          <div key={`dim-${group.dimensi}`} className="mt-12 mb-2 overflow-x-auto rounded-2xl border border-slate-700 w-full shadow-2xl print:break-inside-avoid print:break-after-page print:shadow-none print:border-none print:m-0">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                              <thead>
                                <tr>
                                  <th colSpan={colCount} className="bg-[#1e2432] p-5 text-[15px] font-bold text-white border-b border-slate-700 tracking-wide text-center">
                                    Tabel Lampiran Dimensi: {group.dimensi}
                                  </th>
                                </tr>
                                <tr className="bg-[#222836] border-b border-slate-700">
                                  {headers.map((col, cIdx) => (
                                    <th key={cIdx} className={`p-4 text-[12px] uppercase font-bold text-[#0ea5e9] tracking-wide ${cIdx === 0 ? 'w-14 text-center border-r' : 'border-r'} border-slate-700/50`}>
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...Array(19)].map((_, rIdx) => (
                                  <tr key={rIdx} className="bg-[#181d27] border-b border-slate-700 hover:bg-[#1e2432] transition-colors print:h-[13.5mm]">
                                    {[...Array(colCount)].map((_, cIdx) => (
                                      <td key={cIdx} className="p-4 text-[13px] font-medium text-slate-400 border-r border-slate-800 text-center">
                                        {cIdx === 0 ? rIdx + 1 : <div className="w-full flex items-center justify-center h-full"><span className="inline-block border-b-2 border-dotted border-slate-600 w-11/12 translate-y-1">&nbsp;</span></div>}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="mt-4 px-2 pb-4 text-left text-slate-400 print:text-[#333]">
                               <p className="text-[11px] print:text-[10px] font-medium leading-relaxed italic border-l-2 border-[#0ea5e9] print:border-[#333] pl-3">
                                 * <strong>SOP Pengukuran:</strong> <span className={group.lampiranInstruksi ? "text-[#0ea5e9] print:text-[#333]" : ""}>{group.lampiranInstruksi || `Lakukan observasi dan pengisian data untuk dimensi ${group.dimensi} berdasarkan pengukuran di lapangan.`}</span>
                               </p>
                            </div>
                          </div>
                        );
                      }

                      if (group.items) {
                        group.items.filter(item => checkedLampiranIds.includes(item.id)).forEach(item => {
                          const headers = ['No', ...(item.lampiranHeaders || ['Subjek / Objek Target', 'Angka / Nilai Terukur', 'Catatan Kualitatif / Dokumentasi'])];
                          const colCount = headers.length;
                          elements.push(
                            <div key={item.id} className="mt-12 mb-2 overflow-x-auto rounded-2xl border border-slate-700 w-full shadow-2xl print:break-inside-avoid print:break-after-page print:shadow-none print:border-none print:m-0">
                              <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                  <tr>
                                    <th colSpan={colCount} className="bg-[#1e2432] p-5 text-[15px] font-bold text-white border-b border-slate-700 tracking-wide text-center">
                                      Tabel Lampiran Detail Observasi: {item.parameter}
                                    </th>
                                  </tr>
                                  <tr className="bg-[#222836] border-b border-slate-700">
                                    {headers.map((col, cIdx) => (
                                      <th key={cIdx} className={`p-4 text-[12px] uppercase font-bold text-[#0ea5e9] tracking-wide ${cIdx === 0 ? 'w-14 text-center border-r' : 'border-r'} border-slate-700/50`}>
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...Array(19)].map((_, rIdx) => (
                                    <tr key={rIdx} className="bg-[#181d27] border-b border-slate-700 hover:bg-[#1e2432] transition-colors print:h-[13.5mm]">
                                      {[...Array(colCount)].map((_, cIdx) => (
                                        <td key={cIdx} className="p-4 text-[13px] font-medium text-slate-400 border-r border-slate-800 text-center">
                                          {cIdx === 0 ? rIdx + 1 : <div className="w-full flex items-center justify-center h-full"><span className="inline-block border-b-2 border-dotted border-slate-600 w-11/12 translate-y-1">&nbsp;</span></div>}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              <div className="mt-4 px-2 pb-4 text-left text-slate-400 print:text-[#333]">
                                 <p className="text-[11px] print:text-[10px] font-medium leading-relaxed italic border-l-2 border-[#0ea5e9] print:border-[#333] pl-3">
                                   * <strong>SOP Pengukuran:</strong> <span className={item.lampiranInstruksi ? "text-[#0ea5e9] print:text-[#333]" : ""}>{item.lampiranInstruksi || `Lakukan pengukuran untuk parameter ${item.parameter} dan catat nilainya di kolom yang sesuai.`}</span>
                                 </p>
                              </div>
                            </div>
                          );
                        });
                      }
                      
                      return elements;
                    })}

                     {/* Instruksi Pengisian Terkustomisasi Terletak Internal pada Masing-Masing Tabel */}

                     <div className="flex justify-center gap-6 mt-16 mb-12 print:hidden w-full">
                        <button 
                          onClick={() => window.print()} 
                          className="bg-[#0ea5e9]/10 text-[#38bdf8] border border-[#0ea5e9]/30 hover:bg-[#0ea5e9] hover:text-white px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 transition-all outline-none shadow-xl shadow-[#0ea5e9]/10"
                        >
                           <Download className="w-5 h-5"/> EXPORT TABEL KE PDF
                        </button>
                        <button 
                          onClick={exportLampiranToExcel} 
                          className="bg-[#10b981]/10 text-[#34d399] border border-[#10b981]/30 hover:bg-[#10b981] hover:text-white px-8 py-3.5 rounded-xl font-bold text-[12px] uppercase tracking-widest flex items-center gap-3 transition-all outline-none shadow-xl shadow-[#10b981]/10"
                        >
                           <FileSpreadsheet className="w-5 h-5"/> EXPORT KE EXCEL (XLS)
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
                   <h3 className="text-2xl font-black text-[#1a2332]">Input Titik Data Primer</h3>
                   <p className="text-sm font-semibold text-slate-400 mt-1 uppercase tracking-widest">Kompilasi Digital Tally Sheet Hasil Lapangan</p>
                 </div>
                 <button onClick={handleTabUtama} className="bg-[#a855f7] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-md shadow-purple-500/20 hover:bg-purple-600 transition-all outline-none">
                   <ArrowRight className="w-4 h-4"/> Buat Tabel Rekap
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
                     setPrimerRows([...primerRows, { id: newId, responden: `Stasiun ${nextNum < 10 ? '0'+nextNum : nextNum}` }]);
                   }}
                   className="w-full p-6 text-xs font-black text-[#0ea5e9] uppercase tracking-widest border-t border-dashed border-slate-200 hover:bg-slate-50 transition-all outline-none"
                 >
                   <Plus className="w-4 h-4 inline mr-1 -mt-0.5" /> Tambah Record Titik Target
                 </button>
               </div>
             </div>
          )}

          {/* PAGE STEP 3: ANALISIS BAB 4 */}
          {currentStep === 3 && (
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                   <div className="flex items-center gap-3 mb-2">
                      <Table2 className="w-6 h-6 text-[#eab308]" />
                      <h3 className="text-2xl font-black text-[#1a2332]">Tabel Analisis Bab 4</h3>
                   </div>
                   <p className="text-sm font-semibold text-slate-500 mt-2 max-w-2xl">
                     Rekapitulasi absolut data ini digunakan sebagai komposit visual di Tugas Akhir Anda.
                   </p>
                 </div>
                 <button onClick={handleExportSPSS} className="bg-[#145d7a] text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#11465e] transition-all shadow-lg hover:shadow-xl active:scale-95 outline-none shrink-0 border border-[#145d7a]/50">
                    <Download className="w-4 h-4"/> EXPORT SPSS / PLS (.CSV)
                 </button>
               </div>
               <div className="p-8">
                 <table className="w-full text-center border-2 border-[#1a2332] rounded-xl overflow-hidden shadow-sm">
                   <thead className="bg-[#1a2332] text-white">
                     <tr>
                       {tableHeaders.map((h, i) => (
                         <th key={i} className={`p-4 font-black text-[10px] uppercase tracking-widest border-r border-[#2d3a54] ${i === tableHeaders.length-1 ? 'border-r-0 bg-[#eab308]' : ''}`}>{h}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-200">
                     {tableRows.map((row, i) => (
                       <tr key={i} className="hover:bg-slate-50 transition-colors">
                         {row.map((cell, j) => (
                           <td key={j} className={`p-4 text-sm font-bold border-r border-slate-200 ${j >= tableHeaders.length - 1 ? 'text-[#eab308] font-black' : 'text-slate-600'} ${j === row.length-1 ? 'border-r-0' : ''}`}>
                             {cell}
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          )}

        </main>
      </div>
    </div>
  );
}