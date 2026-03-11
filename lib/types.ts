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
  seller_name: string;
  phone: string | null;
  features: string[];
  status: "active" | "sold" | "pending" | "removed";
  views_count: number;
  favorites_count: number;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  profiles?: { account_type: "private" | "dealer" };
}

export interface DbProfile {
  id: string;
  username: string;
  phone: string | null;
  avatar_url: string | null;
  location: string | null;
  preferred_language: string;
  account_type: "private" | "dealer";
  created_at: string;
  updated_at: string;
}

export interface DbDealerStore {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  phone: string | null;
  created_at: string;
}

export interface DbConversation {
  id: string;
  car_id: string;
  buyer_id: string;
  seller_id: string;
  last_message_at: string;
  created_at: string;
  // Joined
  cars?: { id: string; title_zh: string; image_url: string | null; price: number };
  buyer_profile?: { username: string; avatar_url: string | null };
  seller_profile?: { username: string; avatar_url: string | null };
}

export interface DbMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface DbComment {
  id: string;
  car_id: string;
  user_id: string;
  content: string;
  created_at: string;
  // Joined
  profiles?: { username: string; avatar_url: string | null };
}
