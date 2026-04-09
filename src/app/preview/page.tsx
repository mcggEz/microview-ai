"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Microscope,
  Download,
} from "lucide-react";

interface PreviewData {
  patient: {
    name: string;
    patient_id: string;
    age: number;
    gender: string;
  };
  test: {
    test_code: string;
    analysis_date: string;
    status: string;
    collection_time?: string;
    technician?: string;
  };
  urinalysis: {
    color: string;
    transparency: string;
    specificGravity: string;
    ph: string;
    protein: string;
    glucose: string;
    rbc: string;
    pusCells: string;
    epithelialCells: string;
    bacteria: string;
    remarks: string;
  };
  calculations: {
    lpf: { fields: number; epithelialCells: number[]; casts: number[]; squamous: number[] };
    hpf: { fields: number; rbc: number[]; wbc: number[]; bacteria: number[] };
    averages: { rbc: number; wbc: number; epithelialCells: number; bacteria: number; casts: number };
    volumetric: { hpfArea: number; totalHpfs: number; mlFactor: number; rbcPerMl: number; wbcPerMl: number };
  } | null;
  lpfDetection: {
    epithelial_cells: number;
    mucus_threads: number;
    casts: number;
    squamous_epithelial: number;
    abnormal_crystals: number;
    confidence: number;
    analysis_notes: string;
  } | null;
  hpfDetection: {
    rbc: number;
    wbc: number;
    epithelial_cells: number;
    crystals: number;
    bacteria: number;
    yeast: number;
    sperm: number;
    parasites: number;
    confidence: number;
    analysis_notes: string;
  } | null;
  lowPowerImages: string[];
  highPowerImages: string[];
  user: { full_name?: string; email?: string } | null;
}

export default function PreviewPage() {
  const router = useRouter();
  const [data, setData] = useState<PreviewData | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("previewReportData");
    if (!raw) {
      router.push("/report");
      return;
    }
    try {
      setData(JSON.parse(raw));
    } catch {
      router.push("/report");
    }
  }, [router]);

  const handlePrint = () => {
    window.print();
  };

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  const { patient, test, urinalysis, calculations, lpfDetection, hpfDetection, lowPowerImages, highPowerImages, user } = data;
  const reportDate = new Date(test.analysis_date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      {/* Top action bar - hidden on print */}
      <div className="print:hidden sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[850px] mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Report
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-semibold rounded-lg hover:bg-black transition-colors shadow-md"
            >
              <Printer className="h-4 w-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* PDF-like page */}
      <div className="min-h-screen bg-gray-200 print:bg-white py-8 print:py-0">
        <div
          ref={printRef}
          className="bg-white max-w-[850px] mx-auto shadow-xl print:shadow-none print:max-w-none"
          style={{ minHeight: "11in" }}
        >
          {/* Page content with padding */}
          <div className="px-12 py-10 print:px-10 print:py-8">

            {/* Header / Letterhead */}
            <div className="text-center border-b-2 border-gray-900 pb-4 mb-6">
              <div className="flex items-center justify-center gap-3 mb-1">
                <Microscope className="h-8 w-8 text-gray-800 print:text-black" />
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  MicroView AI
                </h1>
              </div>
              <p className="text-xs text-gray-500 tracking-widest uppercase">
                Automated Microscopy Urinalysis Report
              </p>
            </div>

            {/* Patient & Test Info */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
              <div className="space-y-1.5">
                <InfoRow label="Patient Name" value={patient.name} />
                <InfoRow label="Patient ID" value={patient.patient_id} />
                <InfoRow label="Age / Gender" value={`${patient.age} / ${capitalize(patient.gender)}`} />
              </div>
              <div className="space-y-1.5">
                <InfoRow label="Test Code" value={test.test_code} />
                <InfoRow label="Date of Analysis" value={reportDate} />
                <InfoRow label="Medical Technologist" value={test.technician || user?.full_name || "—"} />
                <InfoRow label="Status" value={capitalize(test.status)} />
              </div>
            </div>

            {/* Physical / Chemical Examination */}
            <SectionTitle title="Physical & Chemical Examination" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-6 text-sm">
              <InfoRow label="Color" value={urinalysis.color || "—"} />
              <InfoRow label="Transparency" value={urinalysis.transparency || "—"} />
              <InfoRow label="Specific Gravity" value={urinalysis.specificGravity || "—"} />
              <InfoRow label="pH" value={urinalysis.ph || "—"} />
              <InfoRow label="Protein" value={urinalysis.protein || "—"} />
              <InfoRow label="Glucose" value={urinalysis.glucose || "—"} />
            </div>

            {/* Microscopic Examination */}
            <SectionTitle title="Microscopic Examination" />
            <div className="grid grid-cols-2 gap-x-8 mb-6">
              {/* LPF Column */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 bg-gray-50 px-2 py-1 rounded">
                  Low Power Field (10x)
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    <TableRow label="Epithelial Cells" value={lpfDetection ? String(lpfDetection.epithelial_cells) : urinalysis.epithelialCells || "—"} />
                    <TableRow label="Mucus Threads" value={lpfDetection ? String(lpfDetection.mucus_threads) : "—"} />
                    <TableRow label="Casts" value={lpfDetection ? String(lpfDetection.casts) : "—"} />
                    <TableRow label="Squamous Epithelial" value={lpfDetection ? String(lpfDetection.squamous_epithelial) : "—"} />
                    <TableRow label="Abnormal Crystals" value={lpfDetection ? String(lpfDetection.abnormal_crystals) : "—"} />
                  </tbody>
                </table>
                {lpfDetection?.analysis_notes && !lpfDetection.analysis_notes.includes("pending") && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700 border border-blue-100">
                    <span className="font-semibold text-blue-800">AI Note: </span>
                    {lpfDetection.analysis_notes}
                  </div>
                )}
              </div>

              {/* HPF Column */}
              <div>
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 bg-gray-50 px-2 py-1 rounded">
                  High Power Field (40x)
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    <TableRow label="Red Blood Cells (RBC)" value={hpfDetection ? String(hpfDetection.rbc) : urinalysis.rbc || "—"} />
                    <TableRow label="White Blood Cells (WBC)" value={hpfDetection ? String(hpfDetection.wbc) : urinalysis.pusCells || "—"} />
                    <TableRow label="Epithelial Cells" value={hpfDetection ? String(hpfDetection.epithelial_cells) : "—"} />
                    <TableRow label="Crystals" value={hpfDetection ? String(hpfDetection.crystals) : "—"} />
                    <TableRow label="Bacteria" value={hpfDetection ? String(hpfDetection.bacteria) : urinalysis.bacteria || "—"} />
                    <TableRow label="Yeast" value={hpfDetection ? String(hpfDetection.yeast) : "—"} />
                    <TableRow label="Sperm" value={hpfDetection ? String(hpfDetection.sperm) : "—"} />
                    <TableRow label="Parasites" value={hpfDetection ? String(hpfDetection.parasites) : "—"} />
                  </tbody>
                </table>
                {hpfDetection?.analysis_notes && !hpfDetection.analysis_notes.includes("pending") && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-gray-700 border border-blue-100">
                    <span className="font-semibold text-blue-800">AI Note: </span>
                    {hpfDetection.analysis_notes}
                  </div>
                )}
              </div>
            </div>

            {/* Summary Dropdown Values */}
            <SectionTitle title="Urinalysis Summary" />
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm">
              <InfoRow label="RBC" value={urinalysis.rbc || "—"} unit="/HPF" />
              <InfoRow label="Pus Cells (WBC)" value={urinalysis.pusCells || "—"} unit="/HPF" />
              <InfoRow label="Epithelial Cells" value={urinalysis.epithelialCells || "—"} unit="/LPF" />
              <InfoRow label="Bacteria" value={urinalysis.bacteria || "—"} unit="/HPF" />
            </div>

            {/* Volumetric Computation */}
            {calculations && (
              <>
                <SectionTitle title="Volumetric Computation" />
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Total RBC</div>
                    <div className="text-xl font-bold text-gray-900">
                      {calculations.volumetric.rbcPerMl.toLocaleString()}
                      <span className="text-xs font-normal text-gray-500 ml-1">/mL</span>
                    </div>
                  </div>
                  <div className="border border-gray-200 rounded-lg p-3">
                    <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Total WBC</div>
                    <div className="text-xl font-bold text-gray-900">
                      {calculations.volumetric.wbcPerMl.toLocaleString()}
                      <span className="text-xs font-normal text-gray-500 ml-1">/mL</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-400 mb-6 italic">
                  Based on {calculations.hpf.fields} HPF fields examined. HPF area: {calculations.volumetric.hpfArea.toFixed(4)} mm².
                  mL factor: {calculations.volumetric.mlFactor.toLocaleString()}.
                </div>
              </>
            )}

            {/* Microscopy Image Fields */}
            {(lowPowerImages.length > 0 || highPowerImages.length > 0) && (
              <>
                <SectionTitle title="Microscopy Fields Captured" />
                {lowPowerImages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">Low Power Fields ({lowPowerImages.length})</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {lowPowerImages.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded border border-gray-200 overflow-hidden bg-black">
                          <img src={src} alt={`LPF ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-medium">
                            LPF {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {highPowerImages.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-bold text-gray-600 uppercase mb-2">High Power Fields ({highPowerImages.length})</h4>
                    <div className="grid grid-cols-5 gap-2">
                      {highPowerImages.map((src, idx) => (
                        <div key={idx} className="relative aspect-square rounded border border-gray-200 overflow-hidden bg-black">
                          <img src={src} alt={`HPF ${idx + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5 font-medium">
                            HPF {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Remarks */}
            {urinalysis.remarks && (
              <>
                <SectionTitle title="Remarks" />
                <p className="text-sm text-gray-700 mb-6 whitespace-pre-wrap">
                  {urinalysis.remarks}
                </p>
              </>
            )}

            {/* Signature Line */}
            <div className="mt-12 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-16">
                <div className="text-center">
                  <div className="border-b border-gray-900 mb-1 h-8" />
                  <p className="text-xs font-semibold text-gray-700">
                    {test.technician || user?.full_name || "Medical Technologist"}
                  </p>
                  <p className="text-[10px] text-gray-500">Licensed Medical Technologist</p>
                </div>
                <div className="text-center">
                  <div className="border-b border-gray-900 mb-1 h-8" />
                  <p className="text-xs font-semibold text-gray-700">Pathologist</p>
                  <p className="text-[10px] text-gray-500">Date Signed</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t border-gray-100 text-center">
              <p className="text-[9px] text-gray-400">
                This report was generated with AI-assisted analysis (YOLO + Gemini) by MicroView AI. Results should be verified by a licensed medical professional.
              </p>
              <p className="text-[9px] text-gray-400 mt-1">
                Report generated on {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 0.5in;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}

/* Helper Components */

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-300 pb-1 mb-3">
      {title}
    </h3>
  );
}

function InfoRow({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex justify-between items-baseline py-0.5">
      <span className="text-gray-600 text-sm">{label}</span>
      <span className="font-medium text-gray-900 text-sm">
        {value}
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function TableRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-gray-100">
      <td className="py-1.5 text-gray-600 pr-4">{label}</td>
      <td className="py-1.5 font-medium text-gray-900 text-right">{value}</td>
    </tr>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}
