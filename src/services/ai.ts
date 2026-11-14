/* eslint-disable @typescript-eslint/no-require-imports */
import { AIClassificationResult, AICategory } from '@/types/permit';

/**
 * Service Client pemanggilan Model AI untuk analisis dan klasifikasi
 * permohonan izin praktikum (SRS-AI-01).
 *
 * Mengintegrasikan model machine learning lokal dari bahan repository
 * (src/services/model-ai/sentiment.js & model-edom.json) serta direct prompt-based
 * semantic classifier untuk kategorisasi izin praktikum.
 */

// Model EDOM (Evaluasi Dosen/Komentar Offline) dari panduan repository
let edomPredictor: ((text: string) => { label: string | null; status: string; scores: number[] | null }) | null = null;

try {
  const { createSentimentClassifier } = require('./model-ai/sentiment.js');
  const edomModelData = require('./model-ai/model-edom.json');
  edomPredictor = createSentimentClassifier(edomModelData);
} catch (e) {
  console.warn('EDOM offline model not initialized:', e);
}

const FALLBACK_CATEGORIES: {
  category: AICategory;
  keywords: string[];
  urgency: 'TINGGI' | 'SEDANG' | 'RENDAH';
}[] = [
  {
    category: 'SAKIT',
    keywords: [
      'sakit',
      'demam',
      'flu',
      'opname',
      'rawat',
      'dokter',
      'rumah sakit',
      'pusing',
      'batuk',
      'mual',
      'infeksi',
      'bedrest',
      'klinik',
      'surat dokter',
      'kondisi fisik',
      'sembuh',
    ],
    urgency: 'TINGGI',
  },
  {
    category: 'KEDUKAAN_URGEN',
    keywords: [
      'meninggal',
      'wafat',
      'duka',
      'kedukaan',
      'melayat',
      'jenazah',
      'pemakaman',
      'musibah',
      'bencana',
      'kecelakaan',
      'urgensi keluarga',
      'kritis',
    ],
    urgency: 'TINGGI',
  },
  {
    category: 'TUGAS_AKADEMIK',
    keywords: [
      'lomba',
      'kompetisi',
      'seminar',
      'konferensi',
      'sidang',
      'tugas akhir',
      'kuliah lapangan',
      'studi banding',
      'skripsi',
      'olimpiade',
      'workshop',
      'delegasi kampus',
      'ujian susulan',
    ],
    urgency: 'SEDANG',
  },
  {
    category: 'KEPERLUAN_PRIBADI',
    keywords: [
      'acara keluarga',
      'urusan keluarga',
      'nikahan',
      'menikah',
      'kondangan',
      'mudik',
      'pulang kampung',
      'pribadi',
      'keperluan pribadi',
      'sim',
      'ktp',
      'paspor',
    ],
    urgency: 'RENDAH',
  },
];

/**
 * Heuristik klasifikasi lokal berkinerja tinggi sebagai safety-net
 * jika koneksi API AI eksternal sedang offline atau mengalami rate-limit.
 */
function classifyWithLocalNLP(text: string): AIClassificationResult {
  const normalized = text.toLowerCase();
  let matchedCategory: AICategory = 'LAINNYA';
  let urgencyLevel: 'TINGGI' | 'SEDANG' | 'RENDAH' = 'SEDANG';
  let maxScore = 0;

  for (const item of FALLBACK_CATEGORIES) {
    let score = 0;
    for (const kw of item.keywords) {
      if (normalized.includes(kw)) {
        score += 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      matchedCategory = item.category;
      urgencyLevel = item.urgency;
    }
  }

  // Gunakan prediksi model EDOM jika ada untuk memperkaya analisis sentimen/tone
  let edomSentimentSuffix = '';
  if (edomPredictor) {
    try {
      const edomResult = edomPredictor(text);
      if (edomResult.label) {
        edomSentimentSuffix = ` (Tone sentimen: ${edomResult.label})`;
      }
    } catch {
      // Abaikan jika token tidak terdeteksi
    }
  }

  const confidence = maxScore > 0 ? Math.min(0.75 + maxScore * 0.08, 0.96) : 0.65;
  const shortSnippet =
    text.length > 70 ? `${text.slice(0, 67)}...` : text;

  const categoryLabels: Record<AICategory, string> = {
    SAKIT: 'indikasi gangguan kesehatan',
    KEDUKAAN_URGEN: 'situasi darurat/kedukaan keluarga',
    TUGAS_AKADEMIK: 'kegiatan akademik representatif',
    KEPERLUAN_PRIBADI: 'urusan pribadi atau keluarga',
    LAINNYA: 'alasan umum yang memerlukan tinjauan asisten',
  };

  return {
    category: matchedCategory,
    confidence: Number(confidence.toFixed(2)),
    urgencyLevel,
    summary: `Terdeteksi ${categoryLabels[matchedCategory]}: "${shortSnippet}".${edomSentimentSuffix}`,
    rawResponse: 'local-semantic-engine',
  };
}

/**
 * Fungsi utama untuk mengklasifikasikan alasan izin praktikum.
 * Memanggil API model AI jika konfigurasi API KEY tersedia,
 * dan menggunakan graceful fallback jika timeout/offline.
 */
export async function classifyPermitReason(
  reasonText: string,
  options?: { apiKey?: string; endpoint?: string }
): Promise<AIClassificationResult> {
  const trimmed = reasonText.trim();
  if (!trimmed) {
    return {
      category: 'LAINNYA',
      confidence: 0,
      urgencyLevel: 'RENDAH',
      summary: 'Alasan tidak diisi atau kosong.',
    };
  }

  // Jika ada API Key Gemini / LLM yang diberikan via environment atau options
  const apiKey = options?.apiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

  if (apiKey) {
    try {
      const endpoint =
        options?.endpoint ||
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const systemPrompt = [
        'Kamu adalah sistem AI penilai izin praktikum mahasiswa. Analisis teks alasan izin berikut dan kembalikan HANYA format JSON valid tanpa tanda backtick markdown:',
        '{',
        '  "category": "SAKIT" | "KEDUKAAN_URGEN" | "TUGAS_AKADEMIK" | "KEPERLUAN_PRIBADI" | "LAINNYA",',
        '  "confidence": 0.95,',
        '  "urgencyLevel": "TINGGI" | "SEDANG" | "RENDAH",',
        '  "summary": "Ringkasan penjelasan alasan dalam 1 kalimat bahasa Indonesia formal"',
        '}',
        '',
        `Alasan praktikan: "${trimmed}"`,
      ].join('\n');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        }),
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        const rawText =
          json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

        // Bersihkan formatting markdown jika model menambahkan
        const cleaned = rawText
          .replace(/^```json/i, '')
          .replace(/^```/, '')
          .replace(/```$/, '')
          .trim();

        const parsed = JSON.parse(cleaned);

        const validCategories: AICategory[] = [
          'SAKIT',
          'KEDUKAAN_URGEN',
          'TUGAS_AKADEMIK',
          'KEPERLUAN_PRIBADI',
          'LAINNYA',
        ];

        const validUrgency: ('TINGGI' | 'SEDANG' | 'RENDAH')[] = [
          'TINGGI',
          'SEDANG',
          'RENDAH',
        ];

        const category: AICategory = validCategories.includes(parsed.category)
          ? parsed.category
          : 'LAINNYA';

        const urgencyLevel = validUrgency.includes(parsed.urgencyLevel)
          ? parsed.urgencyLevel
          : 'SEDANG';

        return {
          category,
          confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.85)),
          urgencyLevel,
          summary: parsed.summary || 'Analisis AI berhasil diproses.',
          rawResponse: rawText,
        };
      }
    } catch (apiError) {
      // Graceful degradation: Log peringatan dan lanjut menggunakan local NLP classifier
      console.warn('API model AI timeout/offline, falling back to local NLP engine:', apiError);
    }
  }

  // Fallback lokal yang cepat, andal, dan zero-downtime
  return classifyWithLocalNLP(trimmed);
}
