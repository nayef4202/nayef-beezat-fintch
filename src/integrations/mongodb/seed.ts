/**
 * Seed script for MongoDB Atlas
 * Populates the 'beezat' database with model portfolios, Islamic asset allocations,
 * and risk assessment questions.
 */

import { getMongoDb } from "./db";

export const BEEZAT_MODEL_PORTFOLIOS = [
  {
    code: "conservative",
    name_ar: "المحافظة (منخفضة المخاطر)",
    description_ar:
      "محفظة إسلامية تركز على الحفاظ على رأس المال مع دخل ثابت من الصكوك، مناسبة لمن يبدأ أول مرة أو يحتاج فلوسه خلال سنوات قليلة.",
    risk_level: 1,
    min_score: 0,
    max_score: 24,
    expected_return: 4.5,
    volatility: 4.0,
    sort_order: 1,
    allocations: [
      { ticker: "SPSK", asset_name_ar: "صندوق الصكوك العالمية", asset_class_ar: "صكوك", target_weight: 60.0 },
      { ticker: "ISDW", asset_name_ar: "أسهم عالمية إسلامية", asset_class_ar: "أسهم", target_weight: 25.0 },
      { ticker: "ISDE", asset_name_ar: "أسهم أسواق ناشئة إسلامية", asset_class_ar: "أسهم", target_weight: 5.0 },
      { ticker: "SGLD", asset_name_ar: "الذهب المدعوم فعلياً", asset_class_ar: "ذهب", target_weight: 10.0 },
    ],
  },
  {
    code: "moderate",
    name_ar: "المتوازنة",
    description_ar: "توازن بين النمو والاستقرار: أسهم عالمية متوافقة مع الشريعة مع نسبة جيدة من الصكوك.",
    risk_level: 2,
    min_score: 25,
    max_score: 44,
    expected_return: 6.5,
    volatility: 8.0,
    sort_order: 2,
    allocations: [
      { ticker: "SPSK", asset_name_ar: "صندوق الصكوك العالمية", asset_class_ar: "صكوك", target_weight: 40.0 },
      { ticker: "ISDW", asset_name_ar: "أسهم عالمية إسلامية", asset_class_ar: "أسهم", target_weight: 40.0 },
      { ticker: "ISDE", asset_name_ar: "أسهم أسواق ناشئة إسلامية", asset_class_ar: "أسهم", target_weight: 10.0 },
      { ticker: "SGLD", asset_name_ar: "الذهب المدعوم فعلياً", asset_class_ar: "ذهب", target_weight: 10.0 },
    ],
  },
  {
    code: "growth",
    name_ar: "النمو",
    description_ar:
      "تركيز أكبر على الأسهم العالمية الإسلامية لنمو رأس المال على المدى الطويل مع تقلبات متوسطة إلى مرتفعة.",
    risk_level: 3,
    min_score: 45,
    max_score: 64,
    expected_return: 8.5,
    volatility: 13.0,
    sort_order: 3,
    allocations: [
      { ticker: "SPSK", asset_name_ar: "صندوق الصكوك العالمية", asset_class_ar: "صكوك", target_weight: 20.0 },
      { ticker: "ISDW", asset_name_ar: "أسهم عالمية إسلامية", asset_class_ar: "أسهم", target_weight: 55.0 },
      { ticker: "ISDE", asset_name_ar: "أسهم أسواق ناشئة إسلامية", asset_class_ar: "أسهم", target_weight: 17.0 },
      { ticker: "SGLD", asset_name_ar: "الذهب المدعوم فعلياً", asset_class_ar: "ذهب", target_weight: 8.0 },
    ],
  },
  {
    code: "aggressive",
    name_ar: "النمو العالي",
    description_ar: "أعلى نسبة أسهم وأسواق ناشئة، مناسبة لمن يتحمل تذبذب كبير ويستثمر لأكثر من عشر سنوات.",
    risk_level: 4,
    min_score: 65,
    max_score: 100,
    expected_return: 10.5,
    volatility: 18.0,
    sort_order: 4,
    allocations: [
      { ticker: "SPSK", asset_name_ar: "صندوق الصكوك العالمية", asset_class_ar: "صكوك", target_weight: 5.0 },
      { ticker: "ISDW", asset_name_ar: "أسهم عالمية إسلامية", asset_class_ar: "أسهم", target_weight: 65.0 },
      { ticker: "ISDE", asset_name_ar: "أسهم أسواق ناشئة إسلامية", asset_class_ar: "أسهم", target_weight: 25.0 },
      { ticker: "SGLD", asset_name_ar: "الذهب المدعوم فعلياً", asset_class_ar: "ذهب", target_weight: 5.0 },
    ],
  },
];

export const BEEZAT_ISLAMIC_ASSETS = [
  {
    ticker: "SPSK",
    name_ar: "صندوق الصكوك العالمية (SP Funds)",
    asset_class: "صكوك سيادية واستثمارية",
    sharia_screened: true,
    currency: "USD",
  },
  {
    ticker: "ISDW",
    name_ar: "صندوق الأسهم العالمية المتوافقة مع الشريعة (iShares MSCI World Islamic)",
    asset_class: "أسهم عالمية نقية",
    sharia_screened: true,
    currency: "USD",
  },
  {
    ticker: "ISDE",
    name_ar: "صندوق الأسواق الناشئة الإسلامية (iShares MSCI EM Islamic)",
    asset_class: "أسهم أسواق ناشئة",
    sharia_screened: true,
    currency: "USD",
  },
  {
    ticker: "SGLD",
    name_ar: "الذهب المادي المدعوم فعلياً (Invesco Physical Gold)",
    asset_class: "سلع ومعادن ثمينة",
    sharia_screened: true,
    currency: "USD",
  },
];

/**
 * Inserts default Beezat platform data into MongoDB Atlas
 */
export async function seedBeezatMongoData() {
  const db = await getMongoDb("beezat");

  // 1. Model portfolios
  const portfoliosCol = db.collection("model_portfolios");
  for (const p of BEEZAT_MODEL_PORTFOLIOS) {
    await portfoliosCol.updateOne({ code: p.code }, { $set: p }, { upsert: true });
  }

  // 2. Islamic assets
  const assetsCol = db.collection("islamic_assets");
  for (const a of BEEZAT_ISLAMIC_ASSETS) {
    await assetsCol.updateOne({ ticker: a.ticker }, { $set: a }, { upsert: true });
  }

  // 3. Platform info metadata
  const configCol = db.collection("platform_config");
  await configCol.updateOne(
    { key: "platform_info" },
    {
      $set: {
        key: "platform_info",
        name: "Beezat - بيزات للاستثمار الإسلامي الذكي",
        currency: "KWD",
        updated_at: new Date(),
        version: "1.0.0",
      },
    },
    { upsert: true },
  );

  return {
    success: true,
    message: "تم بذر وتحديث بيانات بيزات في MongoDB Atlas بنجاح!",
    portfoliosCount: BEEZAT_MODEL_PORTFOLIOS.length,
    assetsCount: BEEZAT_ISLAMIC_ASSETS.length,
  };
}
