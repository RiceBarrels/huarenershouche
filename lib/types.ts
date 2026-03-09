export interface DbCar {
  id: string;
  seller_id: string;
  title: string;
  title_zh: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  price: number;
  mileage: number;
  location: string;
  location_zh: string;
  lat: number | null;
  lng: number | null;
  image_url: string | null;
  images: string[];
  fuel_type: string;
  transmission: string;
  exterior_color: string | null;
  interior_color: string | null;
  drivetrain: string | null;
  vin: string | null;
  description: string | null;
  description_zh: string | null;
  seller_type: "dealer" | "private";
  seller_name: string;
  phone: string | null;
  features: string[];
  status: "active" | "sold" | "pending" | "removed";
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbProfile {
  id: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  location: string | null;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}
