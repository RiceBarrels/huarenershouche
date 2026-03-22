// NHTSA vPIC VIN Decoder — free, no API key required
// https://vpic.nhtsa.dot.gov/api/

export interface VinResult {
  make: string;
  model: string;
  year: number;
  trim: string;
  bodyClass: string;
  driveType: string;
  fuelType: string;
  transmission: string;
  engineCylinders: string;
  engineDisplacement: string;
  engineHP: string;
  doors: string;
  plantCountry: string;
  vehicleType: string;
  manufacturer: string;
  plantCity: string;
  errorCode: string;
  errorText: string;
  // Additional fields
  engineConfig: string;
  engineKW: string;
  transmissionSpeeds: string;
  seats: string;
  gvwr: string;
  curbWeight: string;
  wheelBase: string;
  bedType: string;
  cabType: string;
  // Safety features
  abs: string;
  esc: string;
  tractionControl: string;
  airbagFront: string;
  airbagSide: string;
  airbagCurtain: string;
  airbagKnee: string;
  backupCamera: string;
  blindSpotMon: string;
  laneDeparture: string;
  forwardCollision: string;
  parkAssist: string;
  adaptiveCruise: string;
  tpms: string;
  autoEmergencyBraking: string;
  // EV fields
  batteryKWh: string;
  chargerLevel: string;
  chargerKW: string;
  evRange: string;
  batteryType: string;
}

export async function decodeVin(vin: string): Promise<VinResult | null> {
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  if (cleaned.length !== 17) return null;

  try {
    // Use both endpoints: DecodeVinValues (flat) + DecodeVin (detailed) as fallback
    const [flatRes, detailRes] = await Promise.all([
      fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/${cleaned}?format=json`
      ),
      fetch(
        `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVin/${cleaned}?format=json`
      ),
    ]);

    // Parse flat endpoint
    let flat: Record<string, string> = {};
    if (flatRes.ok) {
      const data = await flatRes.json();
      flat = data.Results?.[0] || {};
    }

    // Parse detailed endpoint for supplementary data
    const detail: Record<string, string> = {};
    if (detailRes.ok) {
      const data = await detailRes.json();
      const items = data.Results || [];
      for (const item of items) {
        const val = item.Value?.trim();
        if (val && val !== "Not Applicable") {
          detail[item.Variable] = val;
        }
      }
    }

    // Merge: prefer flat values, fall back to detail
    const make =
      flat.Make ||
      detail["Make"] ||
      detail["Manufacturer Name"]?.replace(/ (MOTOR )?(COMPANY|GROUP|INC|LLC|CORP)\.?$/i, "") ||
      "";
    const model = flat.Model || detail["Model"] || "";
    const year = parseInt(flat.ModelYear || detail["Model Year"] || "0") || 0;
    const vehicleType = flat.VehicleType || detail["Vehicle Type"] || "";

    // If we have no year AND no vehicleType, it truly failed
    if (!year && !vehicleType && !make) return null;

    const v = (key: string, detailKey?: string) =>
      flat[key] || detail[detailKey || key] || "";

    return {
      make,
      model,
      year,
      trim: flat.Trim || detail["Trim"] || "",
      bodyClass: flat.BodyClass || detail["Body Class"] || "",
      driveType: flat.DriveType || detail["Drive Type"] || "",
      fuelType: flat.FuelTypePrimary || detail["Fuel Type - Primary"] || "",
      transmission: flat.TransmissionStyle || detail["Transmission Style"] || "",
      engineCylinders: flat.EngineCylinders || detail["Engine Number of Cylinders"] || "",
      engineDisplacement: flat.DisplacementL || detail["Displacement (L)"] || "",
      engineHP: flat.EngineHP || detail["Engine Brake (hp) From"] || "",
      doors: flat.Doors || detail["Doors"] || "",
      plantCountry: flat.PlantCountry || detail["Plant Country"] || "",
      vehicleType,
      manufacturer: detail["Manufacturer Name"] || make,
      plantCity: flat.PlantCity || detail["Plant City"] || "",
      errorCode: flat.ErrorCode || detail["Error Code"] || "0",
      errorText: flat.ErrorText || detail["Error Text"] || "",
      // Additional
      engineConfig: v("EngineConfiguration", "Engine Configuration"),
      engineKW: v("EngineKW", "Engine Power (kW)"),
      transmissionSpeeds: v("TransmissionSpeeds", "Transmission Speeds"),
      seats: v("Seats", "Number of Seats"),
      gvwr: v("GVWR", "Gross Vehicle Weight Rating From"),
      curbWeight: v("CurbWeightLB", "Curb Weight (lbs)"),
      wheelBase: v("WheelBaseShort", "Wheel Base (inches) From"),
      bedType: v("BedType", "Bed Type"),
      cabType: v("CabType", "Cab Type"),
      // Safety
      abs: v("ABS", "Anti-lock Braking System (ABS)"),
      esc: v("ESC", "Electronic Stability Control (ESC)"),
      tractionControl: v("TractionControl", "Traction Control"),
      airbagFront: v("AirBagLocFront", "Front Air Bag Locations"),
      airbagSide: v("AirBagLocSide", "Side Air Bag Locations"),
      airbagCurtain: v("AirBagLocCurtain", "Curtain Air Bag Locations"),
      airbagKnee: v("AirBagLocKnee", "Knee Air Bag Locations"),
      backupCamera: v("RearVisibilitySystem", "Rear Visibility System"),
      blindSpotMon: v("BlindSpotMon", "Blind Spot Monitoring"),
      laneDeparture: v("LaneDepartureWarning", "Lane Departure Warning (LDW)"),
      forwardCollision: v("ForwardCollisionWarning", "Forward Collision Warning (FCW)"),
      parkAssist: v("ParkAssist", "Park Assist"),
      adaptiveCruise: v("AdaptiveCruiseControl", "Adaptive Cruise Control (ACC)"),
      tpms: v("TPMS", "Tire Pressure Monitoring System (TPMS) Type"),
      autoEmergencyBraking: v("AutomaticEmergencyBraking", "Automatic Emergency Braking (AEB)"),
      // EV
      batteryKWh: v("BatteryKWh", "Battery Energy (kWh) From"),
      chargerLevel: v("ChargerLevel", "Charger Level"),
      chargerKW: v("ChargerPowerKW", "Charger Power (kW)"),
      evRange: v("ElectrificationLevel", "Electrification Level"),
      batteryType: v("BatteryType", "Battery Type"),
    };
  } catch {
    return null;
  }
}

/**
 * Validate VIN format (basic check)
 */
export function isValidVinFormat(vin: string): boolean {
  const cleaned = vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
  return cleaned.length === 17;
}

/**
 * Check if decoded result has meaningful data
 */
export function hasVinData(result: VinResult): boolean {
  return !!(result.make || result.year || result.vehicleType);
}

/**
 * Check if VIN decoded data matches the car listing
 */
export function verifyVinMatch(
  vinData: VinResult,
  car: { make: string; year: number; model: string }
): { matched: boolean; mismatches: string[] } {
  const mismatches: string[] = [];

  if (vinData.make) {
    const vinMake = vinData.make.toLowerCase();
    const carMake = car.make.toLowerCase();
    // Fuzzy match: check if one contains the other (handles "HARLEY-DAVIDSON" vs "Harley-Davidson")
    if (!vinMake.includes(carMake) && !carMake.includes(vinMake)) {
      mismatches.push(`品牌不匹配: 列表为 ${car.make}, VIN为 ${vinData.make}`);
    }
  }
  if (vinData.year && car.year !== vinData.year) {
    mismatches.push(`年份不匹配: 列表为 ${car.year}, VIN为 ${vinData.year}`);
  }
  if (
    vinData.model &&
    !car.model.toLowerCase().includes(vinData.model.toLowerCase()) &&
    !vinData.model.toLowerCase().includes(car.model.toLowerCase())
  ) {
    mismatches.push(`车型不匹配: 列表为 ${car.model}, VIN为 ${vinData.model}`);
  }

  return { matched: mismatches.length === 0, mismatches };
}
