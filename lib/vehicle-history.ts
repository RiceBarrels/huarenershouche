// NHTSA free APIs for vehicle history data
// Recalls, Complaints, Safety Ratings — no API key required

export interface RecallItem {
  campaignNumber: string;
  reportDate: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
}

export interface ComplaintItem {
  odiNumber: string;
  dateOfIncident: string;
  dateComplaintFiled: string;
  crash: boolean;
  fire: boolean;
  injuries: number;
  deaths: number;
  components: string;
  summary: string;
}

export interface SafetyRating {
  overallRating: string;
  frontCrashRating: string;
  sideCrashRating: string;
  rolloverRating: string;
  rolloverPossibility: number;
  complaintsCount: number;
  recallsCount: number;
  investigationCount: number;
  frontCrashPicture: string;
  sideCrashPicture: string;
}

export interface VehicleHistory {
  recalls: RecallItem[];
  complaints: ComplaintItem[];
  safetyRating: SafetyRating | null;
}

export async function fetchRecalls(
  make: string,
  model: string,
  year: number
): Promise<RecallItem[]> {
  try {
    const res = await fetch(
      `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((r: any) => ({
      campaignNumber: r.NHTSACampaignNumber || "",
      reportDate: r.ReportReceivedDate || "",
      component: r.Component || "",
      summary: r.Summary || "",
      consequence: r.Consequence || "",
      remedy: r.Remedy || "",
    }));
  } catch {
    return [];
  }
}

export async function fetchComplaints(
  make: string,
  model: string,
  year: number
): Promise<ComplaintItem[]> {
  try {
    const res = await fetch(
      `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${year}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 50).map((c: any) => ({
      odiNumber: c.odiNumber || "",
      dateOfIncident: c.dateOfIncident || "",
      dateComplaintFiled: c.dateComplaintFiled || "",
      crash: c.crash === true || c.crash === "YES",
      fire: c.fire === true || c.fire === "YES",
      injuries: parseInt(c.numberOfInjuries) || 0,
      deaths: parseInt(c.numberOfDeaths) || 0,
      components: c.components || "",
      summary: c.summary || "",
    }));
  } catch {
    return [];
  }
}

export async function fetchSafetyRating(
  make: string,
  model: string,
  year: number
): Promise<SafetyRating | null> {
  try {
    // Step 1: find vehicle IDs
    const listRes = await fetch(
      `https://api.nhtsa.gov/SafetyRatings/modelyear/${year}/make/${encodeURIComponent(make)}/model/${encodeURIComponent(model)}`
    );
    if (!listRes.ok) return null;
    const listData = await listRes.json();
    const vehicles = listData.Results || [];
    if (vehicles.length === 0) return null;

    // Step 2: get rating for first vehicle variant
    const vehicleId = vehicles[0].VehicleId;
    const ratingRes = await fetch(
      `https://api.nhtsa.gov/SafetyRatings/VehicleId/${vehicleId}`
    );
    if (!ratingRes.ok) return null;
    const ratingData = await ratingRes.json();
    const r = ratingData.Results?.[0];
    if (!r) return null;

    return {
      overallRating: r.OverallRating || "",
      frontCrashRating: r.OverallFrontCrashRating || "",
      sideCrashRating: r.OverallSideCrashRating || "",
      rolloverRating: r.RolloverRating || "",
      rolloverPossibility: parseFloat(r.RolloverPossibility) || 0,
      complaintsCount: parseInt(r.ComplaintsCount) || 0,
      recallsCount: parseInt(r.RecallsCount) || 0,
      investigationCount: parseInt(r.InvestigationCount) || 0,
      frontCrashPicture: r.FrontCrashPicture || "",
      sideCrashPicture: r.SideCrashPicture || "",
    };
  } catch {
    return null;
  }
}

export async function fetchVehicleHistory(
  make: string,
  model: string,
  year: number
): Promise<VehicleHistory> {
  const [recalls, complaints, safetyRating] = await Promise.all([
    fetchRecalls(make, model, year),
    fetchComplaints(make, model, year),
    fetchSafetyRating(make, model, year),
  ]);
  return { recalls, complaints, safetyRating };
}
