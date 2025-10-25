


const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Resend } = require('resend');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;


const resend = new Resend(process.env.RESEND_API_KEY);


app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));


mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://nourforgames_db_user:<password>@cluster0.bexs4jt.mongodb.net/unigo')
  .then(() => {})
  .catch(err => {});


const userSchema = new mongoose.Schema({
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['passenger', 'driver', 'admin'], required: true },
  gender: { type: String, enum: ['male', 'female'], required: true },
  university_id: { type: String, required: true },
  uni_id: { type: String, required: true, unique: true },
  status: { type: String, enum: ['pending_payment', 'pending_verification', 'active', 'suspended', 'banned'], default: 'pending_payment' },
  unicard_balance: { type: Number, default: 0 },
  selfie_url: { type: String, required: true },
  reliability_score: { type: Number, default: 0, min: 0, max: 5 },
  no_shows: { type: Number, default: 0 },
  cancellations_count: { type: Number, default: 0 },
  last_login: Date,
  documents: {
    cni_recto: { type: String, required: true },
    cni_verso: { type: String, required: true },
    student_card: { type: String, required: true },
    payment_receipt: { type: String, required: true },
    
    permit_recto: String,
    permit_verso: String,
    registration_doc: String,
    insurance_doc: String
  },
  
  document_verification: {
    selfie_url: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    cni_recto: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    cni_verso: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    student_card: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    payment_receipt: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    permit_recto: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    permit_verso: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    registration_doc: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    insurance_doc: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
  },
  
  documents_verified: { type: Boolean, default: false },
  documents_verification_notes: String,
  documents_verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  documents_verified_at: Date,
  
  payment_verified: { type: Boolean, default: false },
  payment_verification_notes: String,
  payment_verified_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  payment_verified_at: Date,
  
  subscription_start_date: Date, 
  subscription_end_date: Date, 
  subscription_status: { type: String, enum: ['active', 'expired', 'pending_renewal'], default: 'pending_renewal' },
  subscription_renewal_receipt: String, 
  subscription_renewal_pending: { type: Boolean, default: false }, 
  
  status_reason: String,
  status_updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status_updated_at: Date,
  vehicle_info: {
    make_model: String,
    plate_number: String
  },
  email_verified: { type: Boolean, default: false },
  email_verification_code: String,
  email_verification_expires: Date,
  
  password_reset_code: String,
  password_reset_expires: Date,
  
  rating_average: { type: Number, default: 5, min: 0, max: 5 },
  rating_count: { type: Number, default: 0, min: 0 },
  response_rate: { type: Number, default: 100, min: 0, max: 100 },
  total_trips: { type: Number, default: 0, min: 0 }
}, { timestamps: true });


userSchema.pre('save', function(next) {
  if (this.role === 'driver') {
    
    if (!this.documents.permit_recto) {
      return next(new Error('Driving license (recto) is required for drivers'));
    }
    if (!this.documents.permit_verso) {
      return next(new Error('Driving license (verso) is required for drivers'));
    }
    if (!this.documents.registration_doc) {
      return next(new Error('Vehicle registration document is required for drivers'));
    }
    if (!this.documents.insurance_doc) {
      return next(new Error('Vehicle insurance document is required for drivers'));
    }
    if (!this.vehicle_info.make_model) {
      return next(new Error('Vehicle make and model is required for drivers'));
    }
    if (!this.vehicle_info.plate_number) {
      return next(new Error('Vehicle plate number is required for drivers'));
    }
  }
  next();
});


const generateUniId = async () => {
  let uniId;
  let isUnique = false;
  
  while (!isUnique) {
    
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const letter1 = letters[Math.floor(Math.random() * letters.length)];
    const letter2 = letters[Math.floor(Math.random() * letters.length)];
    
    
    const digits = Math.floor(100 + Math.random() * 900); 
    
    
    uniId = `${letter1}${letter2}-${digits}`;
    
    
    const existingUser = await User.findOne({ uni_id: uniId });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return uniId;
};

const User = mongoose.model('User', userSchema);


const districtSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['quartier', 'gare', 'tram_station', 'university'], required: true },
  city: { type: String, required: true },
  coords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  address: { type: String, required: true },
  description: String,
  is_active: { type: Boolean, default: true },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const District = mongoose.model('District', districtSchema);


const incidentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['safety', 'fraud', 'harassment', 'vehicle_damage', 'payment_issue', 'cancellation_abuse', 'other'], 
    required: true 
  },
  severity: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'critical'], 
    default: 'medium' 
  },
  status: { 
    type: String, 
    enum: ['reported', 'investigating', 'resolved', 'dismissed'], 
    default: 'reported' 
  },
  reported_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  reported_against: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  trip_id: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Trip' 
  },
  evidence: [{
    type: { type: String, enum: ['image', 'video', 'document', 'message'] },
    url: String,
    description: String,
    uploaded_at: { type: Date, default: Date.now }
  }],
  admin_notes: String,
  resolution_notes: String,
  assigned_to: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  },
  resolution_date: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
});

const Incident = mongoose.model('Incident', incidentSchema);


const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  short_name: { type: String, required: true, unique: true },
  description: String,
  city: String,
  country: { type: String, default: 'Morocco' },
  address: String,
  postal_code: String,
  phone: String,
  email: String,
  website: String,
  logo_url: String,
  status: { 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active' 
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  student_count: { type: Number, default: 0 },
  created_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  updated_by: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { timestamps: true });

const University = mongoose.model('University', universitySchema);


const uniCardTransactionSchema = new mongoose.Schema({
  transaction_id: { type: String, required: true, unique: true }, 
  from_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from_uni_id: { type: String, required: true }, 
  to_user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  to_uni_id: { type: String, required: true }, 
  points: { type: Number, required: true, min: 1, max: 10000 },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'], 
    default: 'pending' 
  },
  transaction_type: { 
    type: String, 
    enum: ['transfer', 'refund', 'bonus', 'penalty'], 
    default: 'transfer' 
  },
  description: { type: String, maxlength: 200 },
  reference: { type: String }, 
  
  
  ip_address: { type: String },
  user_agent: { type: String },
  verification_code: { type: String }, 
  
  
  points_before_sender: { type: Number, required: true },
  points_after_sender: { type: Number, required: true },
  points_before_receiver: { type: Number, required: true },
  points_after_receiver: { type: Number, required: true },
  
  
  processed_at: Date,
  failed_at: Date,
  failure_reason: String,
  
  
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  
  metadata: {
    daily_transaction_count: Number,
    total_daily_amount: Number,
    risk_score: { type: Number, min: 0, max: 100, default: 0 }
  }
}, { timestamps: true });


const transactionLimitSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  daily_limit: { type: Number, default: 1000, min: 0 },
  monthly_limit: { type: Number, default: 10000, min: 0 },
  daily_used: { type: Number, default: 0, min: 0 },
  monthly_used: { type: Number, default: 0, min: 0 },
  last_reset_daily: { type: Date, default: Date.now },
  last_reset_monthly: { type: Date, default: Date.now },
  is_suspended: { type: Boolean, default: false },
  suspension_reason: String,
  suspension_until: Date
}, { timestamps: true });


const transactionAuditSchema = new mongoose.Schema({
  transaction_id: { type: mongoose.Schema.Types.ObjectId, ref: 'UniCardTransaction', required: true },
  action: { 
    type: String, 
    enum: ['created', 'processed', 'failed', 'cancelled', 'refunded', 'suspicious_activity'],
    required: true 
  },
  performed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  details: String,
  ip_address: String,
  user_agent: String,
  risk_score: Number
}, { timestamps: true });

const UniCardTransaction = mongoose.model('UniCardTransaction', uniCardTransactionSchema);
const TransactionLimit = mongoose.model('TransactionLimit', transactionLimitSchema);
const TransactionAudit = mongoose.model('TransactionAudit', transactionAuditSchema);


const rechargeRequestSchema = new mongoose.Schema({
  request_id: { type: String, required: true, unique: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user_uni_id: { type: String, required: true },
  points_requested: { type: Number, required: true, min: 100, max: 10000 },
  amount_mad: { type: Number, required: true, min: 10, max: 1000 },
  payment_screenshot: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled'], 
    default: 'pending' 
  },
  admin_notes: String,
  processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processed_at: Date,
  rejection_reason: String,
  bank_account: {
    bank_name: { type: String, default: 'Bank of Africa' },
    account_holder: { type: String, default: 'UNIGO SARL' },
    account_number: { type: String, default: '1234567890123456' },
    rib: { type: String, default: '007-1234567890123456-78' }
  },
  ip_address: String,
  user_agent: String
}, { timestamps: true });

const RechargeRequest = mongoose.model('RechargeRequest', rechargeRequestSchema);


const getDocumentDisplayName = (docType) => {
  const displayNames = {
    'selfie_url': 'selfie',
    'cni_recto': 'CNI (recto)',
    'cni_verso': 'CNI (verso)',
    'student_card': 'carte étudiante',
    'payment_receipt': 'reçu de paiement',
    'permit_recto': 'permis de conduire (recto)',
    'permit_verso': 'permis de conduire (verso)',
    'registration_doc': 'carte grise',
    'insurance_doc': 'assurance'
  };
  return displayNames[docType] || docType;
};


const notificationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { 
    type: String, 
    enum: [
      'message', 'booking', 'payment', 'document_verification', 
      'trip_update', 'cancellation', 'recharge', 'system', 'welcome',
      'trip_started', 'trip_completed'
    ], 
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  link: { type: String }, 
  data: { type: mongoose.Schema.Types.Mixed }, 
  read: { type: Boolean, default: false },
  read_at: { type: Date },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  icon: { type: String }, 
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } 
}, { timestamps: true });


notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, type: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); 

const Notification = mongoose.model('Notification', notificationSchema);


const messageSchema = new mongoose.Schema({
  conversation_id: { type: String, required: true, index: true },
  sender_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message_type: { 
    type: String, 
    enum: ['text', 'image', 'file'], 
    default: 'text' 
  },
  content: { type: String }, 
  file_url: { type: String }, 
  file_name: { type: String }, 
  file_size: { type: Number }, 
  read: { type: Boolean, default: false },
  read_at: { type: Date },
  deleted_by: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });


messageSchema.index({ conversation_id: 1, createdAt: -1 });
messageSchema.index({ sender_id: 1, receiver_id: 1 });
messageSchema.index({ receiver_id: 1, read: 1 });

const Message = mongoose.model('Message', messageSchema);




const tripSchema = new mongoose.Schema({
  trip_id: { type: String, unique: true, required: true },
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  
  departure: {
    type: { type: String, enum: ['university', 'district', 'custom'], required: true },
    university_id: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
    custom_location: { type: String },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  
  arrival: {
    type: { type: String, enum: ['university', 'district', 'custom'], required: true },
    university_id: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
    district_id: { type: mongoose.Schema.Types.ObjectId, ref: 'District' },
    custom_location: { type: String },
    address: { type: String, required: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  
  
  departure_time: { type: Date, required: true },
  arrival_time: { type: Date, required: false },
  return_time: { type: Date, required: false },
  trip_type: { type: String, enum: ['oneway', 'return', 'roundtrip'], default: 'oneway' },
  price_per_seat: { type: Number, required: true, min: 0 },
  total_seats: { type: Number, required: true, min: 1, max: 8 },
  available_seats: { type: Number, required: true, min: 0 },
  tags: [{ type: String }],  
  
  
  preferences: {
    gender_preference: { 
      type: String, 
      enum: ['any', 'male', 'female'], 
      default: 'any' 
    },
    non_smoker: { type: Boolean, default: false },
    music_allowed: { type: Boolean, default: true },
    conversation_allowed: { type: Boolean, default: true },
    luggage_space: { type: Boolean, default: false },
    pet_friendly: { type: Boolean, default: false }
  },
  
  
  status: { 
    type: String, 
    enum: ['scheduled', 'published', 'active', 'completed', 'cancelled'], 
    default: 'scheduled' 
  },
  
  
  description: { type: String, maxlength: 500 },
  vehicle_info: {
    make: { type: String },
    model: { type: String },
    year: { type: Number },
    color: { type: String },
    license_plate: { type: String }
  },
  
  
  distance_km: { type: Number },
  estimated_duration: { type: Number }, 
  route_polyline: { type: String }, 
  radius_km: { type: Number, default: 5 }, 
  
  
  total_bookings: { type: Number, default: 0 },
  completed_bookings: { type: Number, default: 0 },
  cancelled_bookings: { type: Number, default: 0 },
  
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });


const tripBookingSchema = new mongoose.Schema({
  booking_id: { type: String, unique: true, required: true },
  trip_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  passenger_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  driver_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  
  seats_booked: { type: Number, required: true, min: 1 },
  total_price: { type: Number, required: true, min: 0 },
  
  
  payment_method: { 
    type: String, 
    enum: ['unicard', 'cash', 'mixed'], 
    required: true 
  },
  unicard_amount: { type: Number, default: 0 },
  cash_amount: { type: Number, default: 0 },
  payment_status: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded', 'failed'], 
    default: 'pending' 
  },
  payment_transaction_id: { type: String },
  
  
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no_show'], 
    default: 'confirmed' 
  },
  
  
  cancellation: {
    cancelled_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelled_at: { type: Date },
    reason: { type: String },
    refund_amount: { type: Number, default: 0 },
    refund_status: { 
      type: String, 
      enum: ['pending', 'processed', 'denied'], 
      default: 'pending' 
    },
    refund_transaction_id: { type: String }
  },
  
  
  meeting_point: {
    address: { type: String },
    coordinates: {
      lat: { type: Number },
      lng: { type: Number }
    },
    instructions: { type: String }
  },
  
  
  passenger_notes: { type: String, maxlength: 200 },
  driver_notes: { type: String, maxlength: 200 },
  
  
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now }
}, { timestamps: true });


const tripReviewSchema = new mongoose.Schema({
  review_id: { type: String, unique: true, required: true },
  trip_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true },
  reviewer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewed_user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 500 },
  
  
  punctuality: { type: Number, min: 1, max: 5 },
  cleanliness: { type: Number, min: 1, max: 5 },
  communication: { type: Number, min: 1, max: 5 },
  safety: { type: Number, min: 1, max: 5 },
  
  
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  
  
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });


const reliabilityScoreSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  
  
  overall_score: { type: Number, default: 5.0, min: 0, max: 5.0 },
  
  
  total_trips: { type: Number, default: 0 },
  completed_trips: { type: Number, default: 0 },
  cancelled_trips: { type: Number, default: 0 },
  no_show_trips: { type: Number, default: 0 },
  
  
  total_bookings: { type: Number, default: 0 },
  completed_bookings: { type: Number, default: 0 },
  cancelled_bookings: { type: Number, default: 0 },
  no_show_bookings: { type: Number, default: 0 },
  
  
  total_reviews: { type: Number, default: 0 },
  average_rating: { type: Number, default: 5.0, min: 0, max: 5.0 },
  
  
  badges: [{
    type: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    earned_at: { type: Date, default: Date.now },
    level: { type: Number, default: 1 }
  }],
  
  
  penalties: [{
    type: { type: String, required: true },
    reason: { type: String, required: true },
    points_deducted: { type: Number, required: true },
    applied_at: { type: Date, default: Date.now },
    expires_at: { type: Date }
  }],
  
  
  last_updated: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
}, { timestamps: true });


const searchHistorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  search_query: {
    departure: { type: String, required: true },
    arrival: { type: String, required: true },
    departure_time: { type: Date },
    filters: {
      price_min: { type: Number },
      price_max: { type: Number },
      gender_preference: { type: String },
      non_smoker: { type: Boolean },
      distance_radius: { type: Number }
    }
  },
  results_count: { type: Number, default: 0 },
  search_timestamp: { type: Date, default: Date.now }
}, { timestamps: true });


const Trip = mongoose.model('Trip', tripSchema);
const TripBooking = mongoose.model('TripBooking', tripBookingSchema);
const TripReview = mongoose.model('TripReview', tripReviewSchema);
const ReliabilityScore = mongoose.model('ReliabilityScore', reliabilityScoreSchema);
const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);


function getConversationId(userId1, userId2) {
  const ids = [userId1.toString(), userId2.toString()].sort();
  return `${ids[0]}_${ids[1]}`;
}


const generateTransactionId = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `TX-${year}-${timestamp}`;
};

const generateRechargeRequestId = () => {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RCH${year}${timestamp}${random}`;
};


const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); 
};

const sendVerificationEmail = async (email, otp, firstName) => {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Unigo <noreply@info.noureddine.site>',
      to: [email],
      subject: 'Vérifiez votre email - Unigo',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 2px;">UNIGO</h1>
            <p style="color: #e5e7eb; margin: 8px 0 0 0; font-size: 14px;">Votre plateforme de covoiturage universitaire</p>
          </div>
          
          <!-- Main Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <div style="background: #f3f4f6; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http:
                  <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Vérification de votre email</h2>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">
                Bonjour ${firstName},<br>
                Bienvenue sur Unigo ! Pour activer votre compte, veuillez utiliser le code de vérification suivant :
              </p>
            </div>
            
            <!-- OTP Code Box -->
            <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center;">
              <h1 style="color: #000000; font-size: 48px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace; font-weight: 700;">${otp}</h1>
            </div>
            
            <!-- Info Box -->
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 8px;">
              <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
                <strong>⏰ Expiration:</strong> Ce code expire dans 10 minutes.<br>
                <strong>🔒 Sécurité:</strong> Si vous n'avez pas demandé ce code, ignorez cet email.
              </p>
            </div>
            
            <!-- Action Button -->
            <div style="text-align: center; margin: 30px 0;">
              <p style="color: #4b5563; font-size: 14px; margin: 0 0 20px 0;">
                Entrez ce code dans la fenêtre de vérification pour compléter votre inscription.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px; text-align: center;">
            <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px;">
              © 2025 Unigo. Tous droits réservés.
            </p>
            <p style="color: #9ca3af; margin: 0; font-size: 11px;">
              Cet email a été envoyé automatiquement, merci de ne pas y répondre.
            </p>
            <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 11px;">
              <a href="mailto:support@unigo.ma" style="color: #2563eb; text-decoration: none;">support@unigo.ma</a>
            </p>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw new Error('Failed to send verification email');
    }

    return data;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};


const createNotification = async (userId, type, title, message, data = {}, priority = 'medium') => {
  try {
    const notification = new Notification({
      user_id: userId,
      type,
      title,
      message,
      data,
      priority,
      icon: getNotificationIcon(type)
    });

    await notification.save();

    
    if (io && typeof io.to === 'function') {
      try {
        io.to(userId.toString()).emit('new_notification', notification);
        ;
      } catch (socketError) {
        ;
      }
    } else {
      ;
    }

    ;
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    
  }
};


const getNotificationIcon = (type) => {
  const icons = {
    welcome: '🎉',
    message: '💬',
    booking: '🚗',
    payment: '💳',
    document_verification: '📄',
    trip_update: '🕐',
    cancellation: '❌',
    recharge: '💰',
    system: '🔧'
  };
  return icons[type] || '🔔';
};

const calculateRiskScore = (transaction, user) => {
  let riskScore = 0;
  
  
  if (transaction.points > 500) riskScore += 20;
  if (transaction.points > 1000) riskScore += 30;
  
  
  if (user.status !== 'active') riskScore += 40;
  if (user.reliability_score < 3) riskScore += 25;
  
  
  const hour = new Date().getHours();
  if (hour < 6 || hour > 23) riskScore += 15;
  
  return Math.min(riskScore, 100);
};

const checkTransactionLimits = async (userId, amount) => {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  let limits = await TransactionLimit.findOne({ user_id: userId });
  
  if (!limits) {
    limits = new TransactionLimit({ user_id: userId });
    await limits.save();
  }
  
  
  if (limits.last_reset_daily < startOfDay) {
    limits.daily_used = 0;
    limits.last_reset_daily = startOfDay;
  }
  
  
  if (limits.last_reset_monthly < startOfMonth) {
    limits.monthly_used = 0;
    limits.last_reset_monthly = startOfMonth;
  }
  
  
  if (limits.is_suspended) {
    throw new Error('Account suspended for transactions');
  }
  
  if (limits.daily_used + amount > limits.daily_limit) {
    throw new Error(`Daily limit exceeded. Remaining: ${limits.daily_limit - limits.daily_used} points`);
  }
  
  if (limits.monthly_used + amount > limits.monthly_limit) {
    throw new Error(`Monthly limit exceeded. Remaining: ${limits.monthly_limit - limits.monthly_used} points`);
  }
  
  return limits;
};

const processTransaction = async (transactionData, req) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      
      const sender = await User.findById(transactionData.from_user).session(session);
      const receiver = await User.findOne({ uni_id: transactionData.to_uni_id }).session(session);
      
      if (!sender) throw new Error('Sender not found');
      if (!receiver) throw new Error('Receiver not found');
      if (sender._id.toString() === receiver._id.toString()) {
        throw new Error('Cannot send points to yourself');
      }
      
      
      const limits = await checkTransactionLimits(sender._id, transactionData.points);
      
      
      if (sender.unicard_balance < transactionData.points) {
        throw new Error('Insufficient balance');
      }
      
      
      const riskScore = calculateRiskScore(transactionData, sender);
      
      
      const originalSenderBalance = sender.unicard_balance;
      const originalReceiverBalance = receiver.unicard_balance;
      
      
      sender.unicard_balance -= transactionData.points;
      receiver.unicard_balance += transactionData.points;
      
      
      limits.daily_used += transactionData.points;
      limits.monthly_used += transactionData.points;
      
      
      const transaction = new UniCardTransaction({
        transaction_id: generateTransactionId(),
        from_user: sender._id,
        from_uni_id: sender.uni_id,
        to_user: receiver._id,
        to_uni_id: receiver.uni_id,
        points: transactionData.points,
        status: 'completed',
        description: transactionData.description || `Transfer to ${receiver.first_name} ${receiver.last_name}`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        points_before_sender: originalSenderBalance,
        points_after_sender: sender.unicard_balance,
        points_before_receiver: originalReceiverBalance,
        points_after_receiver: receiver.unicard_balance,
        processed_at: new Date(),
        created_by: sender._id,
        processed_by: sender._id,
        metadata: {
          daily_transaction_count: limits.daily_used,
          total_daily_amount: limits.daily_used,
          risk_score: riskScore
        }
      });
      
      
      await transaction.save({ session });
      await sender.save({ session });
      await receiver.save({ session });
      await limits.save({ session });
      
      
      await TransactionAudit.create([{
        transaction_id: transaction._id,
        action: 'processed',
        performed_by: sender._id,
        details: `Successfully transferred ${transactionData.points} points`,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('User-Agent'),
        risk_score: riskScore
      }], { session });
    });
    
    return { success: true };
  } catch (error) {
    console.error('Transaction processing error:', error);
    throw error;
  } finally {
    await session.endSession();
  }
};


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  }
});


const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};


const checkSubscriptionStatus = async (req, res, next) => {
  try {
    
    if (req.user.role === 'admin') {
      return next();
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const now = new Date();
    if (user.subscription_end_date && now > user.subscription_end_date) {
      
      if (user.subscription_status !== 'expired') {
        await User.findByIdAndUpdate(req.user.userId, {
          subscription_status: 'expired'
        });
      }

      
      const allowedPaths = [
        '/api/auth/profile',
        '/api/auth/subscription-status',
        '/api/auth/upload-renewal-receipt',
        '/api/notifications'
      ];

      const isAllowed = allowedPaths.some(path => req.path.startsWith(path));
      if (!isAllowed) {
        return res.status(403).json({ 
          error: 'Subscription expired',
          subscription_expired: true,
          message: 'Your subscription has expired. Please renew to continue using the platform.'
        });
      }
    }

    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    next(); 
  }
};


const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.adminUser = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Error verifying admin access' });
  }
};




app.post('/api/auth/register', upload.fields([
  { name: 'selfie', maxCount: 1 },
  { name: 'cni_recto', maxCount: 1 },
  { name: 'cni_verso', maxCount: 1 },
  { name: 'student_card', maxCount: 1 },
  { name: 'permit_recto', maxCount: 1 },
  { name: 'permit_verso', maxCount: 1 },
  { name: 'registration_doc', maxCount: 1 },
  { name: 'insurance_doc', maxCount: 1 },
  { name: 'payment_receipt', maxCount: 1 }
]), async (req, res) => {
  try {
    const { password, ...userData } = req.body;
    
    
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    
    if (userData.role === 'admin') {
    
    const hashedPassword = await bcrypt.hash(password, 10);

    
    if (userData.university_id && !isNaN(userData.university_id)) {
      userData.university_id = userData.university_id.toString();
    }

    
    const documents = {};
    let selfie_url = '';
    
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        if (req.files[key] && req.files[key][0]) {
          if (key === 'selfie') {
            selfie_url = req.files[key][0].filename;
          } else {
            documents[key] = req.files[key][0].filename;
          }
        }
      });
    }

    
    const vehicle_info = {};
    if (userData.role === 'driver') {
      vehicle_info.make_model = userData.make_model;
      vehicle_info.plate_number = userData.plate_number;
    }

      
      const uniId = await generateUniId();

      
    const user = new User({
      ...userData,
      password: hashedPassword,
      selfie_url,
      documents,
        vehicle_info,
        uni_id: uniId,
        status: 'active',
        documents_verified: true,
        payment_verified: true,
        email_verified: true,
        document_verification: {
        selfie_url: 'approved',
        cni_recto: 'approved',
        cni_verso: 'approved',
        student_card: 'approved',
        payment_receipt: 'approved',
        permit_recto: 'approved',
        permit_verso: 'approved',
        registration_doc: 'approved',
        insurance_doc: 'approved'
        }
      });

      await user.save();

      
      const token = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, uni_id: user.uni_id },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      
      const userResponse = user.toObject();
      delete userResponse.password;

      return res.status(201).json({
        message: 'Admin user created successfully',
        token,
        user: userResponse,
        emailVerificationRequired: false
      });
    }

    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    
    const registrationData = {
      ...userData,
      password: await bcrypt.hash(password, 10),
      otp,
      otpExpiry,
      files: req.files,
      createdAt: new Date()
    };

    
    if (!global.pendingRegistrations) {
      global.pendingRegistrations = new Map();
    }
    global.pendingRegistrations.set(userData.email, registrationData);

    // Send verification email (non-blocking)
    sendVerificationEmail(userData.email, otp, userData.first_name)
      .then(() => {
        ;
      })
      .catch((error) => {
        console.error('❌ Failed to send verification email:', error);
        
      });

    
    ;

    res.status(200).json({
      message: 'Registration data saved. Please check your email for verification code.',
      emailVerificationRequired: true,
      email: userData.email
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ error: error.message });
  }
});


app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({ error: 'Email and verification code are required' });
    }

    
    if (!global.pendingRegistrations || !global.pendingRegistrations.has(email)) {
      return res.status(400).json({ error: 'No pending registration found for this email' });
    }

    const registrationData = global.pendingRegistrations.get(email);

    
    if (registrationData.otp !== verificationCode || new Date() > registrationData.otpExpiry) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      
      global.pendingRegistrations.delete(email);
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    
    if (registrationData.university_id && !isNaN(registrationData.university_id)) {
      registrationData.university_id = registrationData.university_id.toString();
    }

    
    const documents = {};
    let selfie_url = '';
    
    if (registrationData.files) {
      Object.keys(registrationData.files).forEach(key => {
        if (registrationData.files[key] && registrationData.files[key][0]) {
          if (key === 'selfie') {
            selfie_url = registrationData.files[key][0].filename;
          } else {
            documents[key] = registrationData.files[key][0].filename;
          }
        }
      });
    }

    
    const vehicle_info = {};
    if (registrationData.role === 'driver') {
      vehicle_info.make_model = registrationData.make_model;
      vehicle_info.plate_number = registrationData.plate_number;
    }

    
    const uniId = await generateUniId();

    
    const user = new User({
      first_name: registrationData.first_name,
      last_name: registrationData.last_name,
      email: registrationData.email,
      password: registrationData.password,
      phone: registrationData.phone,
      role: registrationData.role,
      gender: registrationData.gender,
      university_id: registrationData.university_id,
      selfie_url,
      documents,
      vehicle_info,
      uni_id: uniId,
      email_verified: true,
      documents_verified: false, 
      payment_verified: false, 
      status: 'pending_verification', 
      document_verification: {
        selfie_url: 'pending',
        cni_recto: 'pending',
        cni_verso: 'pending',
        student_card: 'pending',
        payment_receipt: 'pending',
        permit_recto: 'pending',
        permit_verso: 'pending',
        registration_doc: 'pending',
        insurance_doc: 'pending'
      }
    });

    await user.save();

    
    await createNotification(
      user._id,
      'welcome',
      'Bienvenue sur UNIGO! 🎉',
      `Bonjour ${user.first_name}, votre compte a été créé avec succès. Votre profil est en cours de vérification par notre équipe.`,
      { user_id: user._id, role: user.role },
      'high'
    );

    
    global.pendingRegistrations.delete(email);

    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, uni_id: user.uni_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: 'Account created successfully! Welcome to Unigoo.',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/admin/fix-user-documents/:userId', authenticateToken, async (req, res) => {
  try {
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
    if (user.role === 'driver') {
      requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
    }

    
    
    const allApproved = requiredDocs.every(doc => {
      
      const hasDocument = user.documents && user.documents[doc];
      if (!hasDocument) {
        ;
        return true; 
      }
      return user.document_verification && user.document_verification[doc] === 'approved';
    });

    ;
    ;
    ;
    ;
    ;
    ;

    
    if (allApproved && !user.documents_verified) {
      await User.findByIdAndUpdate(user._id, {
        documents_verified: true,
        status: user.payment_verified ? 'active' : 'pending_verification'
      });
      ;
      res.json({ 
        success: true, 
        message: `Fixed user ${user.first_name} ${user.last_name}`,
        documents_verified: true,
        status: user.payment_verified ? 'active' : 'pending_verification'
      });
    } else if (!allApproved && user.documents_verified) {
      await User.findByIdAndUpdate(user._id, {
        documents_verified: false,
        status: 'pending_verification'
      });
      ;
      res.json({ 
        success: true, 
        message: `Reverted user ${user.first_name} ${user.last_name}`,
        documents_verified: false,
        status: 'pending_verification'
      });
    } else {
      ;
      res.json({ 
        success: true, 
        message: `No change needed for user ${user.first_name} ${user.last_name}`,
        documents_verified: user.documents_verified,
        status: user.status
      });
    }

  } catch (error) {
    console.error('Fix user documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/admin/fix-specific-users', authenticateToken, async (req, res) => {
  try {
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const problematicUserIds = [
      '68f444dff3dd16301c4ccb0a', 
      '68f4c83c20de393f26518aa6'  
    ];
    
    let fixedCount = 0;
    const results = [];

    for (const userId of problematicUserIds) {
      const user = await User.findById(userId);
      if (!user) {
        results.push({ userId, status: 'not_found' });
        continue;
      }

      ;
      ;
      ;
      ;

      
      const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
      if (user.role === 'driver') {
        requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
      }

      
      const allApproved = requiredDocs.every(doc => {
        const hasDocument = user.documents && user.documents[doc];
        if (!hasDocument) {
          ;
          return true;
        }
        const verificationStatus = user.document_verification && user.document_verification[doc];
        const isApproved = verificationStatus === 'approved';
        ;
        return isApproved;
      });

      ;

      
      if (allApproved) {
        await User.findByIdAndUpdate(user._id, {
          documents_verified: true,
          status: user.payment_verified ? 'active' : 'pending_verification'
        });
        fixedCount++;
        results.push({ 
          userId, 
          name: `${user.first_name} ${user.last_name}`,
          status: 'fixed',
          documents_verified: true,
          new_status: user.payment_verified ? 'active' : 'pending_verification'
        });
        ;
      } else {
        results.push({ 
          userId, 
          name: `${user.first_name} ${user.last_name}`,
          status: 'not_all_approved',
          reason: 'Not all required documents are approved'
        });
        ;
      }
    }

    res.json({
      message: `Fixed ${fixedCount} out of ${problematicUserIds.length} users`,
      fixedCount,
      results
    });

  } catch (error) {
    console.error('Fix specific users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/admin/fix-document-verification', authenticateToken, async (req, res) => {
  try {
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const users = await User.find({});
    let fixedCount = 0;

    for (const user of users) {
      
      const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
      if (user.role === 'driver') {
        requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
      }

      
      
      const allApproved = requiredDocs.every(doc => {
        
        const hasDocument = user.documents && user.documents[doc];
        if (!hasDocument) {
          return true; 
        }
        return user.document_verification && user.document_verification[doc] === 'approved';
      });

      
      if (allApproved && !user.documents_verified) {
        await User.findByIdAndUpdate(user._id, {
          documents_verified: true,
          status: user.payment_verified ? 'active' : 'pending_verification'
        });
        fixedCount++;
        ;
      } else if (!allApproved && user.documents_verified) {
        await User.findByIdAndUpdate(user._id, {
          documents_verified: false,
          status: 'pending_verification'
        });
        fixedCount++;
        ;
      }
    }

    res.json({
      message: `Document verification status updated for ${fixedCount} users`,
      fixedCount
    });

  } catch (error) {
    console.error('Fix document verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    
    if (!global.pendingRegistrations || !global.pendingRegistrations.has(email)) {
      return res.status(400).json({ error: 'No pending registration found for this email' });
    }

    const registrationData = global.pendingRegistrations.get(email);

    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    
    registrationData.otp = otp;
    registrationData.otpExpiry = otpExpiry;
    global.pendingRegistrations.set(email, registrationData);

    
    try {
      await sendVerificationEmail(email, otp, registrationData.first_name);
      ;
      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      console.error('❌ Failed to resend verification email:', error);
      res.status(500).json({ error: 'Failed to resend verification email' });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    
    user.last_login = new Date();
    await user.save();

    
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role, uni_id: user.uni_id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      message: 'Login successful',
      token,
      user: userResponse
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    
    const user = await User.findOne({ email });
    if (!user) {
      
      return res.json({ message: 'If that email exists, you will receive a password reset code' });
    }

    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); 

    
    user.password_reset_code = otp;
    user.password_reset_expires = otpExpiry;
    await user.save();

    
    try {
      const { data, error } = await resend.emails.send({
        from: 'Unigo <noreply@info.noureddine.site>',
        to: [email],
        subject: 'Réinitialisation de votre mot de passe - Unigo',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 2px;">UNIGO</h1>
              <p style="color: #e5e7eb; margin: 8px 0 0 0; font-size: 14px;">Réinitialisation de mot de passe</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #fef2f2; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http:
                    <path d="M15 7H18C18.5304 7 19.0391 7.21071 19.4142 7.58579C19.7893 7.96086 20 8.46957 20 9V19C20 19.5304 19.7893 20.0391 19.4142 20.4142C19.0391 20.7893 18.5304 21 18 21H6C5.46957 21 4.96086 20.7893 4.58579 20.4142C4.21071 20.0391 4 19.5304 4 19V9C4 8.46957 4.21071 7.96086 4.58579 7.58579C4.96086 7.21071 5.46957 7 6 7H9M9 7V5C9 4.46957 9.21071 3.96086 9.58579 3.58579C9.96086 3.21071 10.4696 3 11 3H13C13.5304 3 14.0391 3.21071 14.4142 3.58579C14.7893 3.96086 15 4.46957 15 5V7M9 7H15M12 15V12" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Réinitialisation de mot de passe</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Bonjour ${user.first_name},<br>
                  Vous avez demandé à réinitialiser votre mot de passe. Utilisez le code suivant :
                </p>
              </div>
              
              <!-- OTP Code Box -->
              <div style="background: #f9fafb; border: 2px solid #e5e7eb; border-radius: 16px; padding: 30px; margin: 30px 0; text-align: center;">
                <h1 style="color: #000000; font-size: 48px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace; font-weight: 700;">${otp}</h1>
              </div>
              
              <!-- Warning Box -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
                  <strong>⏰ Expiration:</strong> Ce code expire dans 10 minutes.<br>
                  <strong>🔒 Sécurité:</strong> Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px;">
                © 2025 Unigo. Tous droits réservés.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </div>
          </div>
        `,
      });

      if (error) {
        console.error('Resend error:', error);
        throw new Error('Failed to send password reset email');
      }

      ;
      res.json({ message: 'If that email exists, you will receive a password reset code' });
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      res.status(500).json({ error: 'Failed to send password reset email' });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: 'Email, code, and new password are required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or code' });
    }
    if (!user.password_reset_code || user.password_reset_code !== code) {
      return res.status(400).json({ error: 'Invalid or expired code' });
    }
    if (!user.password_reset_expires || new Date() > user.password_reset_expires) {
      return res.status(400).json({ error: 'Code has expired. Please request a new one.' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.password_reset_code = undefined;
    user.password_reset_expires = undefined;
    await user.save();

    
    try {
      await resend.emails.send({
        from: 'Unigo <noreply@info.noureddine.site>',
        to: [email],
        subject: 'Mot de passe modifié avec succès - Unigo',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 2px;">UNIGO</h1>
              <p style="color: #e5e7eb; margin: 8px 0 0 0; font-size: 14px;">Confirmation de changement de mot de passe</p>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background: #dcfce7; border-radius: 50%; width: 80px; height: 80px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http:
                    <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <h2 style="color: #1f2937; margin: 0 0 10px 0; font-size: 24px; font-weight: 600;">Mot de passe modifié avec succès</h2>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  Bonjour ${user.first_name},<br>
                  Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
                </p>
              </div>
              
              <!-- Security Notice -->
              <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 30px 0; border-radius: 8px;">
                <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.5;">
                  <strong>🔒 Sécurité:</strong> Si vous n'avez pas effectué cette modification, contactez immédiatement notre support.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #f9fafb; border-top: 1px solid #e5e7eb; padding: 30px; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 12px;">
                © 2025 Unigo. Tous droits réservés.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 11px;">
                <a href="mailto:support@unigo.ma" style="color: #2563eb; text-decoration: none;">support@unigo.ma</a>
              </p>
            </div>
          </div>
        `,
      });
    } catch (error) {
      console.error('Failed to send confirmation email:', error);
    }

    ;
    res.json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const now = new Date();
    if (user.subscription_end_date && now > user.subscription_end_date && user.subscription_status !== 'expired') {
      user.subscription_status = 'expired';
      await user.save();
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/users/by-uni-id/:uniId', authenticateToken, async (req, res) => {
  try {
    const { uniId } = req.params;
    const user = await User.findOne({ uni_id: uniId }).select('first_name last_name uni_id role status');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found with this UNI-ID' });
    }
    
    
    res.json({
      first_name: user.first_name,
      last_name: user.last_name,
      uni_id: user.uni_id,
      role: user.role,
      status: user.status
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.post('/api/auth/upload-document', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { document_type } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    
    const validDocTypes = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt', 'permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc'];
    if (!validDocTypes.includes(document_type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    
    const updateData = {
      [`documents.${document_type}`]: req.file.filename,
      [`document_verification.${document_type}`]: 'pending',
      documents_verification_notes: '',
      documents_verified_at: new Date()
    };

    
    if (document_type === 'selfie_url') {
      updateData.selfie_url = req.file.filename;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'document_verification',
        'Nouveau document téléchargé',
        `${user.first_name} ${user.last_name} a téléchargé un nouveau document (${getDocumentDisplayName(document_type)}).`,
        { user_id: user._id, document_type: document_type },
        'medium'
      );
    }

    
    await createNotification(
      user._id,
      'document_verification',
      'Document téléchargé ✅',
      `Votre document ${getDocumentDisplayName(document_type)} a été téléchargé avec succès et est en cours de vérification.`,
      { document_type: document_type, status: 'uploaded' },
      'medium'
    );

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      document_type: document_type,
      filename: req.file.filename,
      user: updatedUser
    });

  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.post('/api/auth/upload-renewal-receipt', authenticateToken, upload.single('renewal_receipt'), async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Account is banned' });
    }

    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    
    const updateData = {
      subscription_renewal_receipt: req.file.filename,
      subscription_renewal_pending: true,
      'document_verification.payment_receipt': 'pending'
    };

    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    
    const admins = await User.find({ role: 'admin' });
    for (const admin of admins) {
      await createNotification(
        admin._id,
        'payment',
        'Nouvelle demande de renouvellement',
        `${user.first_name} ${user.last_name} (${user.role}) a soumis un reçu de renouvellement.`,
        { user_id: user._id, renewal: true },
        'medium'
      );
    }

    
    await createNotification(
      user._id,
      'payment',
      'Reçu de renouvellement soumis',
      'Votre reçu de renouvellement a été soumis avec succès. Nos administrateurs vont le vérifier sous peu.',
      { renewal: true },
      'high'
    );

    res.json({
      success: true,
      message: 'Renewal receipt uploaded successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Renewal receipt upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/auth/subscription-status', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('subscription_start_date subscription_end_date subscription_status subscription_renewal_pending role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    const now = new Date();
    let isExpired = false;
    let daysRemaining = null;

    if (user.subscription_end_date) {
      isExpired = now > user.subscription_end_date;
      if (!isExpired) {
        const timeDiff = user.subscription_end_date.getTime() - now.getTime();
        daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
      }
    }

    res.json({
      subscription_start_date: user.subscription_start_date,
      subscription_end_date: user.subscription_end_date,
      subscription_status: isExpired ? 'expired' : user.subscription_status,
      subscription_renewal_pending: user.subscription_renewal_pending,
      is_expired: isExpired,
      days_remaining: daysRemaining,
      renewal_period: user.role === 'driver' ? '1 month' : '1 year'
    });
  } catch (error) {
    console.error('Subscription status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, role, status, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    
    if (status && status !== 'all' && !req.query.documents_status && !req.query.payment_status) {
      filter.status = status;
    }
    
    
    if (req.query.documents_status) {
      const docStatus = req.query.documents_status;
      ;
      if (docStatus === 'verified') {
        filter.documents_verified = true;
      } else if (docStatus === 'rejected') {
        filter.documents_verified = false;
        filter.documents_verification_notes = { $ne: '' };
      } else if (docStatus === 'pending_verification') {
        filter.documents_verified = false;
        filter.documents_verification_notes = '';
      }
      ;
    }
    
    
    if (req.query.payment_status) {
      const payStatus = req.query.payment_status;
      ;
      if (payStatus === 'verified') {
        filter.payment_verified = true;
      } else if (payStatus === 'rejected') {
        filter.payment_verified = false;
        filter.payment_verification_notes = { $ne: '' };
      } else if (payStatus === 'pending_payment') {
        filter.payment_verified = false;
        filter.payment_verification_notes = '';
      } else if (payStatus === 'renewal_pending') {
        filter.subscription_renewal_pending = true;
      } else if (payStatus === 'expired') {
        filter.subscription_status = 'expired';
      }
      ;
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const users = await User.find(filter)
      .select('-password')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('university_id', 'name')
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching users' });
  }
});


app.get('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('university_id', 'name')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching user' });
  }
});


app.put('/api/admin/users/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, reason } = req.body;
    
    const validStatuses = ['pending_payment', 'pending_verification', 'active', 'suspended', 'banned'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        status_reason: reason,
        status_updated_by: req.user.userId,
        status_updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/admin/users/:id/verify-document/:docType', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { docType } = req.params;
    const { status, notes } = req.body;
    
    ;
    ;
    
    
    const validDocTypes = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt', 'permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc'];
    if (!validDocTypes.includes(docType)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }
    
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected' });
    }
    
    
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    const updateData = {
      [`document_verification.${docType}`]: status,
      documents_verification_notes: notes || '',
      documents_verified_by: req.user.userId,
      documents_verified_at: new Date()
    };
    
    
    const userToUpdate = await User.findById(req.params.id);
    if (!userToUpdate) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
    if (userToUpdate.role === 'driver') {
      requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
    }
    
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    
    const allApproved = requiredDocs.every(doc => {
      
      const hasDocument = user.documents && user.documents[doc];
      if (!hasDocument) {
        ;
        return true; 
      }
      
      
      const verificationStatus = user.document_verification && user.document_verification[doc];
      const isApproved = verificationStatus === 'approved';
      
      ;
      return isApproved;
    });
    
    ;
    ;
    ;
    ;
    ;
    
    
    if (allApproved && !user.documents_verified) {
      await User.findByIdAndUpdate(req.params.id, { 
        documents_verified: true,
        status: user.payment_verified ? 'active' : 'pending_verification'
      });
      ;
    } else if (!allApproved && user.documents_verified) {
      await User.findByIdAndUpdate(req.params.id, { 
        documents_verified: false,
        status: 'pending_verification'
      });
      ;
    }
    
    
    const updatedUser = await User.findById(req.params.id).select('-password');
    
    
    if (status === 'approved') {
      await createNotification(
        updatedUser._id,
        'document_verification',
        'Document approuvé ✅',
        `Bonjour ${updatedUser.first_name}, votre document ${getDocumentDisplayName(docType)} a été approuvé.`,
        { 
          verification_status: 'approved', 
          document_type: docType,
          verified_by: req.user.userId 
        },
        'medium'
      );
    } else if (status === 'rejected') {
      await createNotification(
        updatedUser._id,
        'document_verification',
        'Document rejeté ❌',
        `Bonjour ${updatedUser.first_name}, votre document ${getDocumentDisplayName(docType)} a été rejeté. Veuillez le télécharger à nouveau.`,
        { 
          verification_status: 'rejected', 
          document_type: docType,
          verified_by: req.user.userId,
          notes: notes 
        },
        'high'
      );
    }
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error verifying individual document:', error);
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/admin/users/:id/verify-documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { documents_status, verification_notes } = req.body;
    
    
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    let newStatus = currentUser.status;
    ;
    ;
    ;
    
    if (documents_status === 'approved') {
      if (currentUser.status === 'pending_verification') {
        
        newStatus = currentUser.payment_verified ? 'active' : 'pending_verification';
        ;
      } else if (currentUser.status === 'pending_payment' && currentUser.payment_verified) {
        
        newStatus = 'active';
        ;
      }
    } else if (documents_status === 'rejected') {
      if (currentUser.status === 'active' || currentUser.status === 'pending_verification') {
        newStatus = 'pending_verification';
        ;
      }
    }
    
    ;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 
        documents_verified: documents_status === 'approved',
        documents_verification_notes: verification_notes,
        documents_verified_by: req.user.userId,
        documents_verified_at: new Date(),
        status: newStatus
      },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (documents_status === 'approved') {
      await createNotification(
        user._id,
        'document_verification',
        'Documents approuvés ✅',
        `Bonjour ${user.first_name}, vos documents ont été vérifiés et approuvés par notre équipe.`,
        { verification_status: 'approved', verified_by: req.user.userId },
        'high'
      );
    } else if (documents_status === 'rejected') {
      await createNotification(
        user._id,
        'document_verification',
        'Documents rejetés ❌',
        `Bonjour ${user.first_name}, vos documents ont été rejetés. Veuillez les soumettre à nouveau.`,
        { verification_status: 'rejected', verified_by: req.user.userId, notes: verification_notes },
        'high'
      );
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/admin/users/:id/verify-payment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { payment_verified, payment_notes } = req.body;
    
    
    const currentUser = await User.findById(req.params.id);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    let newStatus = currentUser.status;
    ;
    ;
    ;
    ;
    
    if (payment_verified) {
      if (currentUser.status === 'pending_payment') {
        
        newStatus = currentUser.documents_verified ? 'active' : 'pending_verification';
        ;
      } else if (currentUser.status === 'pending_verification' && currentUser.documents_verified) {
        
        newStatus = 'active';
        ;
      }
    } else {
      if (currentUser.status === 'pending_verification' || currentUser.status === 'active') {
        newStatus = 'pending_payment';
        ;
      }
    }
    
    ;

    
    
    const updateData = { 
      payment_verified,
      payment_verification_notes: payment_notes,
      payment_verified_by: req.user.userId,
      payment_verified_at: new Date(),
      status: newStatus
    };

    
    if (payment_verified) {
      updateData['document_verification.payment_receipt'] = 'approved';
      ;
      
      
      const now = new Date();
      const isRenewal = currentUser.subscription_renewal_pending;
      
      if (!currentUser.subscription_start_date || isRenewal) {
        
        updateData.subscription_start_date = now;
        
        
        const endDate = new Date(now);
        if (currentUser.role === 'driver') {
          
          endDate.setMonth(endDate.getMonth() + 1);
        } else {
          
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
        updateData.subscription_end_date = endDate;
        updateData.subscription_status = 'active';
        
        if (isRenewal) {
          updateData.subscription_renewal_pending = false;
          updateData.subscription_renewal_receipt = null;
          ;
        } else {
          ;
        }
      }
    } else {
      updateData['document_verification.payment_receipt'] = 'pending';
      ;
      
      
      if (currentUser.subscription_renewal_pending) {
        updateData.subscription_renewal_pending = false;
        ;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    
    if (payment_verified) {
      await createNotification(
        user._id,
        'payment',
        'Paiement vérifié ✅',
        `Bonjour ${user.first_name}, votre paiement a été vérifié et approuvé par notre équipe.`,
        { verification_status: 'approved', verified_by: req.user.userId },
        'high'
      );
    } else {
      await createNotification(
        user._id,
        'payment',
        'Paiement rejeté ❌',
        `Bonjour ${user.first_name}, votre paiement a été rejeté. Veuillez le soumettre à nouveau.`,
        { verification_status: 'rejected', verified_by: req.user.userId, notes: payment_notes },
        'high'
      );
    }

    
    if (payment_verified) {
      const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
      if (user.role === 'driver') {
        requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
      }

      const allApproved = requiredDocs.every(doc => {
        const hasDocument = user.documents && user.documents[doc];
        if (!hasDocument) {
          return true; 
        }
        const verificationStatus = user.document_verification && user.document_verification[doc];
        return verificationStatus === 'approved';
      });

      ;

      
      if (allApproved && !user.documents_verified) {
        await User.findByIdAndUpdate(req.params.id, {
          documents_verified: true,
          status: 'active'
        });
        ;
        
        
        await createNotification(
          user._id,
          'system',
          'Compte activé! 🎉',
          `Félicitations ${user.first_name}! Votre compte UNIGO est maintenant actif. Vous pouvez commencer à utiliser la plateforme.`,
          { account_status: 'active', activated_by: req.user.userId },
          'high'
        );
        
        
        const updatedUser = await User.findById(req.params.id).select('-password');
        return res.json(updatedUser);
      }
    }

    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting user' });
  }
});


app.get('/api/admin/users/:id/documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('documents selfie_url');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ documents: user.documents, selfie_url: user.selfie_url });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' });
  }
});


app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'pending_verification' }),
      User.countDocuments({ status: 'pending_payment' }),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'passenger' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ 
        createdAt: { 
          $gte: new Date(new Date().setDate(new Date().getDate() - 30)) 
        } 
      }),
      Incident.countDocuments(),
      Incident.countDocuments({ status: { $in: ['reported', 'investigating'] } }),
      Incident.countDocuments({ status: 'resolved' }),
      University.countDocuments(),
      University.countDocuments({ status: 'active' })
    ]);

    res.json({
      activeUsers: stats[0],
      pendingVerification: stats[1],
      pendingPayment: stats[2],
      totalDrivers: stats[3],
      totalPassengers: stats[4],
      totalAdmins: stats[5],
      newUsersLast30Days: stats[6],
      totalIncidents: stats[7],
      openIncidents: stats[8],
      resolvedIncidents: stats[9],
      totalUniversities: stats[10],
      activeUniversities: stats[11]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching statistics' });
  }
});




app.get('/api/districts', async (req, res) => {
  try {
    const { type, city, is_active } = req.query;
    const filter = {};
    
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (is_active !== undefined) filter.is_active = is_active === 'true';
    
    const districts = await District.find(filter).populate('created_by', 'first_name last_name').sort({ name: 1 });
    res.json(districts);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching districts' });
  }
});


app.get('/api/districts/:id', async (req, res) => {
  try {
    const district = await District.findById(req.params.id).populate('created_by', 'first_name last_name');
    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }
    res.json(district);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching district' });
  }
});


app.post('/api/districts', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const districtData = {
      ...req.body,
      created_by: req.user.userId
    };
    
    const district = new District(districtData);
    await district.save();
    
    const populatedDistrict = await District.findById(district._id).populate('created_by', 'first_name last_name');
    res.status(201).json(populatedDistrict);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/districts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const updateData = {
      ...req.body,
      updated_by: req.user.userId
    };
    
    const district = await District.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by', 'first_name last_name').populate('updated_by', 'first_name last_name');
    
    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }
    
    res.json(district);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


app.delete('/api/districts/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const district = await District.findByIdAndDelete(req.params.id);
    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }
    res.json({ message: 'District deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting district' });
  }
});


app.use('/uploads', express.static('uploads'));


app.get('/api/health', (req, res) => {
  res.json({ message: 'UNIGO API is running!', timestamp: new Date() });
});


app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});




app.get('/api/admin/incidents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      type, 
      severity, 
      priority,
      search 
    } = req.query

    const filter = {}
    
    if (status && status !== 'all') {
      filter.status = status
    }
    
    if (type && type !== 'all') {
      filter.type = type
    }
    
    if (severity && severity !== 'all') {
      filter.severity = severity
    }
    
    if (priority && priority !== 'all') {
      filter.priority = priority
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const incidents = await Incident.find(filter)
      .populate('reported_by', 'first_name last_name email phone gender reliability_score rating_average total_trips cancellations_count no_shows unicard_balance created_at last_login')
      .populate('reported_against', 'first_name last_name email phone gender reliability_score rating_average total_trips cancellations_count no_shows unicard_balance created_at last_login')
      .populate('assigned_to', 'first_name last_name email')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean()

    const totalIncidents = await Incident.countDocuments(filter)

    res.json({
      incidents,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalIncidents / limit),
        totalIncidents,
        hasNext: page < Math.ceil(totalIncidents / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.get('/api/admin/incidents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const incident = await Incident.findById(req.params.id)
      .populate('reported_by', 'first_name last_name email phone gender reliability_score rating_average total_trips cancellations_count no_shows unicard_balance created_at last_login')
      .populate('reported_against', 'first_name last_name email phone gender reliability_score rating_average total_trips cancellations_count no_shows unicard_balance created_at last_login')
      .populate('assigned_to', 'first_name last_name email')
      .populate('trip_id', 'origin destination departure_time')

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    res.json(incident)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.put('/api/admin/incidents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      status, 
      priority, 
      admin_notes, 
      resolution_notes, 
      assigned_to 
    } = req.body

    const updateData = {
      updated_at: new Date()
    }

    if (status) updateData.status = status
    if (priority) updateData.priority = priority
    if (admin_notes !== undefined) updateData.admin_notes = admin_notes
    if (resolution_notes !== undefined) updateData.resolution_notes = resolution_notes
    if (assigned_to) updateData.assigned_to = assigned_to

    if (status === 'resolved') {
      updateData.resolution_date = new Date()
    }

    const incident = await Incident.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('reported_by', 'first_name last_name email')
    .populate('reported_against', 'first_name last_name email')
    .populate('assigned_to', 'first_name last_name email')

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    res.json(incident)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})


app.delete('/api/admin/incidents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const incident = await Incident.findByIdAndDelete(req.params.id)

    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' })
    }

    res.json({ message: 'Incident deleted successfully' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})




app.post('/api/incidents/report', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      type, 
      severity = 'medium',
      reported_against_user_id,
      trip_id,
      evidence = []
    } = req.body

    
    if (!title || !description || !type) {
      return res.status(400).json({ error: 'Title, description, and type are required' })
    }

    
    let trip = null
    if (trip_id) {
      trip = await Trip.findById(trip_id)
      if (!trip) {
        return res.status(404).json({ error: 'Trip not found' })
      }

      
      const isPassenger = trip.driver_id.toString() !== req.user.userId
      const isDriver = trip.driver_id.toString() === req.user.userId
      
      if (!isPassenger && !isDriver) {
        return res.status(403).json({ error: 'You can only report incidents for trips you participated in' })
      }

      
      let bookingStatus = null
      if (isPassenger) {
        const booking = await TripBooking.findOne({
          trip_id: trip._id,
          passenger_id: req.user.userId
        })
        if (booking) {
          bookingStatus = booking.status
        }
      }

      
      const effectiveStatus = bookingStatus || trip.status
      if (!['completed', 'cancelled'].includes(effectiveStatus)) {
        return res.status(400).json({ 
          error: `You can only report incidents for completed or cancelled trips. Current status: ${effectiveStatus}` 
        })
      }

      
      const tripEndTime = trip.status === 'completed' ? trip.arrival_time : trip.updated_at
      const hoursSinceTripEnd = (new Date() - new Date(tripEndTime)) / (1000 * 60 * 60)
      
      if (hoursSinceTripEnd > 48) {
        return res.status(400).json({ error: 'Incident reporting is only allowed within 48 hours after trip completion' })
      }
    }

    
    let reportedAgainst = null
    if (reported_against_user_id) {
      reportedAgainst = await User.findById(reported_against_user_id)
      if (!reportedAgainst) {
        return res.status(404).json({ error: 'Reported user not found' })
      }
    }

    
    const incident = new Incident({
      title,
      description,
      type,
      severity,
      reported_by: req.user.userId,
      reported_against: reportedAgainst?._id,
      trip_id: trip?._id,
      evidence,
      status: 'reported',
      priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'normal'
    })

    await incident.save()

    
    try {
      const admins = await User.find({ role: 'admin' })
      for (const admin of admins) {
        await createNotification(
          admin._id,
          'system',
          'Nouveau signalement d\'incident',
          `Un incident de type "${type}" a été signalé par ${req.user.first_name} ${req.user.last_name}`,
          {
            incident_id: incident._id,
            reporter_name: `${req.user.first_name} ${req.user.last_name}`,
            incident_type: type,
            severity: severity
          },
          severity === 'critical' ? 'high' : 'medium'
        )
      }
    } catch (notificationError) {
      console.error('Failed to send admin notification:', notificationError)
    }

    res.status(201).json({
      success: true,
      message: 'Incident reported successfully',
      incident: {
        _id: incident._id,
        title: incident.title,
        status: incident.status,
        created_at: incident.created_at
      }
    })

  } catch (error) {
    console.error('Error reporting incident:', error)
    res.status(500).json({ error: 'Failed to report incident' })
  }
})


app.get('/api/incidents/my-reports', authenticateToken, async (req, res) => {
  try {
    const incidents = await Incident.find({ reported_by: req.user.userId })
      .populate('reported_against', 'first_name last_name email')
      .populate('trip_id', 'origin destination departure_time arrival_time')
      .sort({ created_at: -1 })
      .lean()

    res.json({ incidents })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})



app.get('/api/admin/universities', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      city, 
      search 
    } = req.query

    const query = {}
    
    if (status && status !== 'all') {
      query.status = status
    }
    if (city && city !== 'all') {
      query.city = { $regex: city, $options: 'i' }
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { short_name: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ]
    }

    const universities = await University.find(query)
      .populate('created_by', 'first_name last_name email')
      .populate('updated_by', 'first_name last_name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const totalUniversities = await University.countDocuments(query)

    res.json({
      universities,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalUniversities / limit),
        totalUniversities,
        hasNext: page < Math.ceil(totalUniversities / limit),
        hasPrev: page > 1
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.get('/api/admin/universities/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const university = await University.findById(req.params.id)
      .populate('created_by', 'first_name last_name email')
      .populate('updated_by', 'first_name last_name email')

    if (!university) {
      return res.status(404).json({ error: 'Université non trouvée' })
    }

    res.json(university)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.post('/api/admin/universities', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      short_name,
      description,
      city,
      country,
      address,
      postal_code,
      phone,
      email,
      website,
      latitude,
      longitude
    } = req.body

    
    const existingUniversity = await University.findOne({
      $or: [
        { name: name },
        { short_name: short_name }
      ]
    })

    if (existingUniversity) {
      return res.status(400).json({ 
        error: 'Une université avec ce nom ou nom court existe déjà' 
      })
    }

    const universityData = {
      name,
      short_name,
      description,
      city,
      country: country || 'Morocco',
      address,
      postal_code,
      phone,
      email,
      website,
      created_by: req.user.userId,
      status: 'active'
    }

    if (req.file) {
      universityData.logo_url = req.file.filename
    }

    if (latitude && longitude) {
      universityData.coordinates = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    }

    const university = new University(universityData)
    await university.save()

    const populatedUniversity = await University.findById(university._id)
      .populate('created_by', 'first_name last_name email')

    res.status(201).json(populatedUniversity)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.put('/api/admin/universities/:id', authenticateToken, requireAdmin, upload.single('logo'), async (req, res) => {
  try {
    const {
      name,
      short_name,
      description,
      city,
      country,
      address,
      postal_code,
      phone,
      email,
      website,
      status,
      latitude,
      longitude
    } = req.body

    const updateData = {
      name,
      short_name,
      description,
      city,
      country,
      address,
      postal_code,
      phone,
      email,
      website,
      status,
      updated_by: req.user.userId
    }

    if (req.file) {
      updateData.logo_url = req.file.filename
    }

    if (latitude && longitude) {
      updateData.coordinates = {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      }
    }

    const university = await University.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('created_by', 'first_name last_name email')
     .populate('updated_by', 'first_name last_name email')

    if (!university) {
      return res.status(404).json({ error: 'Université non trouvée' })
    }

    res.json(university)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.delete('/api/admin/universities/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    
    const studentCount = await User.countDocuments({ university_id: req.params.id })
    
    if (studentCount > 0) {
      return res.status(400).json({ 
        error: `Impossible de supprimer cette université. ${studentCount} étudiant(s) y sont encore inscrits.` 
      })
    }

    const university = await University.findByIdAndDelete(req.params.id)
    
    if (!university) {
      return res.status(404).json({ error: 'Université non trouvée' })
    }

    res.json({ message: 'Université supprimée avec succès' })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})


app.get('/api/universities', async (req, res) => {
  try {
    const universities = await University.find({ status: 'active' })
      .select('name short_name city')
      .sort({ name: 1 })

    res.json(universities)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})




app.post('/api/transactions/transfer', authenticateToken, async (req, res) => {
  try {
    const { to_uni_id, points, description } = req.body;
    
    
    if (!to_uni_id || !points || points <= 0) {
      return res.status(400).json({ error: 'Invalid transaction data' });
    }
    
    if (points > 10000) {
      return res.status(400).json({ error: 'Maximum transfer amount is 10,000 points' });
    }
    
    
    const sender = await User.findById(req.user.userId);
    if (!sender) {
      return res.status(404).json({ error: 'Sender not found' });
    }
    
    
    if (sender.unicard_balance < points) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    
    const transactionData = {
      from_user: sender._id,
      to_uni_id: to_uni_id.toUpperCase(),
      points: parseInt(points),
      description: description || `Transfer to ${to_uni_id}`
    };
    
    await processTransaction(transactionData, req);
    
    
    const updatedSender = await User.findById(req.user.userId).select('unicard_balance uni_id');
    
    res.json({
      success: true,
      message: 'Points transferred successfully',
      new_balance: updatedSender.unicard_balance,
      transaction_id: transactionData.transaction_id
    });
    
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(400).json({ error: error.message });
  }
});


app.get('/api/transactions/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, type = 'all' } = req.query;
    
    const filter = {
      $or: [
        { from_user: req.user.userId },
        { to_user: req.user.userId }
      ]
    };
    
    if (type !== 'all') {
      filter.transaction_type = type;
    }
    
    const transactions = await UniCardTransaction.find(filter)
      .populate('from_user', 'first_name last_name uni_id')
      .populate('to_user', 'first_name last_name uni_id')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();
    
    const total = await UniCardTransaction.countDocuments(filter);
    
    res.json({
      transactions,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTransactions: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction history' });
  }
});


app.get('/api/transactions/limits', authenticateToken, async (req, res) => {
  try {
    let limits = await TransactionLimit.findOne({ user_id: req.user.userId });
    
    if (!limits) {
      limits = new TransactionLimit({ user_id: req.user.userId });
      await limits.save();
    }
    
    
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    if (limits.last_reset_daily < startOfDay) {
      limits.daily_used = 0;
      limits.last_reset_daily = startOfDay;
    }
    
    if (limits.last_reset_monthly < startOfMonth) {
      limits.monthly_used = 0;
      limits.last_reset_monthly = startOfMonth;
    }
    
    await limits.save();
    
    res.json({
      daily_limit: limits.daily_limit,
      daily_used: limits.daily_used,
      daily_remaining: limits.daily_limit - limits.daily_used,
      monthly_limit: limits.monthly_limit,
      monthly_used: limits.monthly_used,
      monthly_remaining: limits.monthly_limit - limits.monthly_used,
      is_suspended: limits.is_suspended,
      suspension_reason: limits.suspension_reason
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction limits' });
  }
});


app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = await UniCardTransaction.findById(req.params.id)
      .populate('from_user', 'first_name last_name uni_id email')
      .populate('to_user', 'first_name last_name uni_id email')
      .populate('created_by', 'first_name last_name')
      .populate('processed_by', 'first_name last_name');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    
    if (transaction.from_user._id.toString() !== req.user.userId && 
        transaction.to_user._id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching transaction' });
  }
});


app.post('/api/transactions/:id/refund', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const transaction = await UniCardTransaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    
    if (transaction.status !== 'completed') {
      return res.status(400).json({ error: 'Only completed transactions can be refunded' });
    }
    
    
    const refundData = {
      from_user: transaction.to_user,
      to_uni_id: transaction.from_uni_id,
      points: transaction.points,
      description: `Refund: ${reason || 'No reason provided'}`
    };
    
    await processTransaction(refundData, req);
    
    
    transaction.status = 'refunded';
    transaction.processed_at = new Date();
    await transaction.save();
    
    res.json({ success: true, message: 'Transaction refunded successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});




app.post('/api/recharge/request', authenticateToken, upload.single('payment_screenshot'), async (req, res) => {
  try {
    const { points_requested } = req.body;
    const points = parseInt(points_requested);
    
    if (!points || points < 100 || points > 10000) {
      return res.status(400).json({ error: 'Points must be between 100 and 10000' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'Payment screenshot is required' });
    }
    
    
    const user = await User.findById(req.user.userId).select('uni_id');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    
    const amount_mad = points;
    
    const requestData = {
      request_id: generateRechargeRequestId(),
      user_id: req.user.userId,
      user_uni_id: user.uni_id, 
      points_requested: points,
      amount_mad: amount_mad,
      payment_screenshot: req.file.filename,
      ip_address: req.ip || req.connection.remoteAddress,
      user_agent: req.get('User-Agent')
    };
    
    const rechargeRequest = new RechargeRequest(requestData);
    await rechargeRequest.save();
    
    
    await createNotification(
      user._id,
      'recharge',
      'Demande de recharge soumise 📝',
      `Votre demande de recharge de ${points} points a été soumise et est en cours de traitement.`,
      { 
        request_id: rechargeRequest.request_id, 
        points_requested: points,
        amount_mad: amount_mad
      },
      'medium'
    );
    
    res.json({
      success: true,
      message: 'Recharge request submitted successfully',
      request_id: rechargeRequest.request_id,
      amount_mad: amount_mad,
      bank_account: rechargeRequest.bank_account
    });
    
  } catch (error) {
    console.error('Recharge request error:', error);
    res.status(400).json({ error: error.message });
  }
});


app.get('/api/recharge/requests', authenticateToken, async (req, res) => {
  try {
    const requests = await RechargeRequest.find({ user_id: req.user.userId })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    res.json(requests);
  } catch (error) {
    console.error('Get recharge requests error:', error);
    res.status(400).json({ error: error.message });
  }
});


app.get('/api/admin/recharge/requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;
    
    const filter = status !== 'all' ? { status } : {};
    
    const requests = await RechargeRequest.find(filter)
      .populate('user_id', 'first_name last_name email uni_id')
      .populate('processed_by', 'first_name last_name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');
    
    const total = await RechargeRequest.countDocuments(filter);
    
    res.json({
      requests,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get admin recharge requests error:', error);
    res.status(400).json({ error: error.message });
  }
});


app.put('/api/admin/recharge/requests/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const { id } = req.params;
      const { admin_notes } = req.body;
      
      const rechargeRequest = await RechargeRequest.findById(id).session(session);
      if (!rechargeRequest) {
        throw new Error('Recharge request not found');
      }
      
      if (rechargeRequest.status !== 'pending') {
        throw new Error('Request has already been processed');
      }
      
      
      const user = await User.findById(rechargeRequest.user_id).session(session);
      if (!user) {
        throw new Error('User not found');
      }
      
      user.unicard_balance += rechargeRequest.points_requested;
      await user.save({ session });
      
      
      rechargeRequest.status = 'approved';
      rechargeRequest.processed_by = req.user.userId;
      rechargeRequest.processed_at = new Date();
      rechargeRequest.admin_notes = admin_notes;
      await rechargeRequest.save({ session });
      
      
      const transaction = new UniCardTransaction({
        transaction_id: generateTransactionId(),
        from_user: req.user.userId, 
        from_uni_id: 'ADMIN',
        to_user: user._id,
        to_uni_id: user.uni_id,
        points: rechargeRequest.points_requested,
        status: 'completed',
        transaction_type: 'bonus',
        description: `Recharge approved - Request ${rechargeRequest.request_id}`,
        points_before_sender: 0,
        points_after_sender: 0,
        points_before_receiver: user.unicard_balance - rechargeRequest.points_requested,
        points_after_receiver: user.unicard_balance,
        processed_at: new Date(),
        created_by: req.user.userId,
        processed_by: req.user.userId,
        metadata: {
          daily_transaction_count: 0,
          total_daily_amount: 0,
          risk_score: 0
        }
      });
      
      await transaction.save({ session });
      
      
      await createNotification(
        user._id,
        'recharge',
        'Recharge approuvée! 💰',
        `Votre demande de recharge de ${rechargeRequest.points_requested} points a été approuvée. Votre solde a été mis à jour.`,
        { 
          request_id: rechargeRequest.request_id, 
          points_added: rechargeRequest.points_requested,
          new_balance: user.unicard_balance,
          approved_by: req.user.userId
        },
        'high'
      );
    });
    
    res.json({ success: true, message: 'Recharge request approved successfully' });
    
  } catch (error) {
    console.error('Approve recharge request error:', error);
    res.status(400).json({ error: error.message });
  } finally {
    await session.endSession();
  }
});


app.put('/api/admin/recharge/requests/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rejection_reason, admin_notes } = req.body;
    
    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const rechargeRequest = await RechargeRequest.findById(id);
    if (!rechargeRequest) {
      return res.status(404).json({ error: 'Recharge request not found' });
    }
    
    if (rechargeRequest.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been processed' });
    }
    
    rechargeRequest.status = 'rejected';
    rechargeRequest.processed_by = req.user.userId;
    rechargeRequest.processed_at = new Date();
    rechargeRequest.rejection_reason = rejection_reason;
    rechargeRequest.admin_notes = admin_notes;
    
    await rechargeRequest.save();
    
    
    await createNotification(
      rechargeRequest.user_id,
      'recharge',
      'Recharge rejetée ❌',
      `Votre demande de recharge de ${rechargeRequest.points_requested} points a été rejetée. Raison: ${rejection_reason}`,
      { 
        request_id: rechargeRequest.request_id, 
        points_requested: rechargeRequest.points_requested,
        rejection_reason: rejection_reason,
        rejected_by: req.user.userId
      },
      'high'
    );
    
    res.json({ success: true, message: 'Recharge request rejected successfully' });
    
  } catch (error) {
    console.error('Reject recharge request error:', error);
    res.status(400).json({ error: error.message });
  }
});






app.post('/api/messages/send', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { receiver_id, content, message_type = 'text' } = req.body;
    
    if (!receiver_id) {
      return res.status(400).json({ error: 'Receiver ID is required' });
    }

    
    const receiver = await User.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    const conversation_id = getConversationId(req.user.userId, receiver_id);

    const messageData = {
      conversation_id,
      sender_id: req.user.userId,
      receiver_id,
      message_type
    };

    
    if (message_type === 'text') {
      if (!content) {
        return res.status(400).json({ error: 'Message content is required' });
      }
      messageData.content = content;
    }

    
    if (req.file) {
      messageData.file_url = req.file.filename;
      messageData.file_name = req.file.originalname;
      messageData.file_size = req.file.size;
      messageData.message_type = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
    }

    const message = new Message(messageData);
    await message.save();

    
    await message.populate('sender_id', 'first_name last_name email selfie_url uni_id');
    await message.populate('receiver_id', 'first_name last_name email selfie_url uni_id');

    
    const senderName = message.sender_id.first_name;
    const messagePreview = message_type === 'text' ? content : 
                          message_type === 'image' ? '📷 Image' : 
                          message_type === 'file' ? '📎 Fichier' : 'Message';
    
    await createNotification(
      receiver_id,
      'message',
      `Nouveau message de ${senderName}`,
      messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
      { 
        sender_id: req.user.userId,
        sender_name: senderName,
        conversation_id: conversation_id,
        message_id: message._id,
        message_type: message_type,
        link: `/chat/conversation/${conversation_id}` 
      },
      'medium'
    );

    
    io.to(receiver_id).emit('new_message', message);

    res.status(201).json({ success: true, message });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender_id: new mongoose.Types.ObjectId(userId) },
            { receiver_id: new mongoose.Types.ObjectId(userId) }
          ],
          deleted_by: { $ne: new mongoose.Types.ObjectId(userId) }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$conversation_id',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver_id', new mongoose.Types.ObjectId(userId)] },
                    { $eq: ['$read', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      }
    ]);

    
    for (const conv of messages) {
      const otherUserId = conv.lastMessage.sender_id.toString() === userId 
        ? conv.lastMessage.receiver_id 
        : conv.lastMessage.sender_id;
      
      const otherUser = await User.findById(otherUserId).select('first_name last_name email selfie_url uni_id role');
      conv.otherUser = otherUser;
      conv.conversation_id = conv._id; 
    }

    res.json({ success: true, conversations: messages });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.userId;
    const { page = 1, limit = 50 } = req.query;

    const conversation_id = getConversationId(userId, otherUserId);

    const messages = await Message.find({
      conversation_id,
      deleted_by: { $ne: userId }
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sender_id', 'first_name last_name email selfie_url uni_id')
      .populate('receiver_id', 'first_name last_name email selfie_url uni_id');

    
    await Message.updateMany(
      {
        conversation_id,
        receiver_id: userId,
        read: false
      },
      {
        read: true,
        read_at: new Date()
      }
    );

    
    io.to(otherUserId).emit('messages_read', { conversation_id, reader_id: userId });

    const totalMessages = await Message.countDocuments({ conversation_id, deleted_by: { $ne: userId } });

    res.json({
      success: true,
      messages: messages.reverse(), 
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalMessages,
        hasMore: totalMessages > parseInt(page) * parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/api/messages/:messageId/read', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findOneAndUpdate(
      { _id: messageId, receiver_id: req.user.userId },
      { read: true, read_at: new Date() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    
    io.to(message.sender_id.toString()).emit('message_read', { message_id: messageId });

    res.json({ success: true, message });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    
    if (message.sender_id.toString() !== req.user.userId && message.receiver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    
    if (!message.deleted_by.includes(req.user.userId)) {
      message.deleted_by.push(req.user.userId);
      await message.save();
    }

    res.json({ success: true, message: 'Message deleted successfully' });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/messages/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      receiver_id: req.user.userId,
      read: false,
      deleted_by: { $ne: req.user.userId }
    });

    res.json({ success: true, count });

  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/users/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('first_name last_name email selfie_url uni_id role');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, title, message, link, data, priority, icon } = req.body;
    
    const notification = new Notification({
      user_id,
      type,
      title,
      message,
      link,
      data,
      priority: priority || 'medium',
      icon,
      sender_id: req.user.userId
    });
    
    await notification.save();
    await notification.populate('sender_id', 'first_name last_name selfie_url');
    
    
    if (io && typeof io.to === 'function') {
      try {
        io.to(user_id).emit('new_notification', notification);
      } catch (socketError) {
        ;
      }
    }
    
    res.status(201).json({ success: true, notification });
    
  } catch (error) {
    console.error('Create notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unread_only = false } = req.query;
    
    const query = { user_id: req.user.userId };
    if (unread_only === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('sender_id', 'first_name last_name selfie_url');
    
    const totalNotifications = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user_id: req.user.userId,
      read: false
    });
    
    res.json({
      success: true,
      notifications,
      unreadCount,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalNotifications,
        hasMore: totalNotifications > parseInt(page) * parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/notifications/unread/count', authenticateToken, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      user_id: req.user.userId,
      read: false
    });
    
    res.json({ success: true, count });
    
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user_id: req.user.userId },
      { read: true, read_at: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, notification });
    
  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { user_id: req.user.userId, read: false },
      { read: true, read_at: new Date() }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
    
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/notifications/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user_id: req.user.userId
    });
    
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
    
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.delete('/api/notifications/clear-all', authenticateToken, async (req, res) => {
  try {
    await Notification.deleteMany({
      user_id: req.user.userId,
      read: true
    });
    
    res.json({ success: true, message: 'All read notifications cleared' });
    
  } catch (error) {
    console.error('Clear notifications error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});






const onlineUsers = new Map();


io.on('connection', (socket) => {
  ;

  
  socket.on('user_online', (userId) => {
    try {
      ;
      onlineUsers.set(userId, socket.id);
      socket.join(userId); 
      
      
      socket.broadcast.emit('user_status_changed', { userId, status: 'online' });
    } catch (error) {
      console.error('❌ Error in user_online:', error);
    }
  });

  
  socket.on('typing', ({ receiverId, senderId }) => {
    try {
      io.to(receiverId).emit('user_typing', { senderId });
    } catch (error) {
      console.error('❌ Error in typing event:', error);
    }
  });

  
  socket.on('stop_typing', ({ receiverId, senderId }) => {
    try {
      io.to(receiverId).emit('user_stop_typing', { senderId });
    } catch (error) {
      console.error('❌ Error in stop_typing event:', error);
    }
  });

  
  socket.on('disconnect', () => {
    try {
      ;
      
      
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          socket.broadcast.emit('user_status_changed', { userId, status: 'offline' });
          break;
        }
      }
    } catch (error) {
      console.error('❌ Error in disconnect:', error);
    }
  });

  
  socket.on('error', (error) => {
    console.error('❌ Socket error:', error);
  });
});


async function fixDocumentVerificationOnStartup() {
  try {
    ;
    
    const users = await User.find({});
    let fixedCount = 0;

    for (const user of users) {
      
      const requiredDocs = ['selfie_url', 'cni_recto', 'cni_verso', 'student_card', 'payment_receipt'];
      if (user.role === 'driver') {
        requiredDocs.push('permit_recto', 'permit_verso', 'registration_doc', 'insurance_doc');
      }

      
      
      const allApproved = requiredDocs.every(doc => {
        
        const hasDocument = user.documents && user.documents[doc];
        if (!hasDocument) {
          return true; 
        }
        return user.document_verification && user.document_verification[doc] === 'approved';
      });

      
      if (allApproved && !user.documents_verified) {
        await User.findByIdAndUpdate(user._id, {
          documents_verified: true,
          status: user.payment_verified ? 'active' : 'pending_verification'
        });
        fixedCount++;
        ;
      } else if (!allApproved && user.documents_verified) {
        await User.findByIdAndUpdate(user._id, {
          documents_verified: false,
          status: 'pending_verification'
        });
        fixedCount++;
        ;
      }
    }

    if (fixedCount > 0) {
      ;
    }

  } catch (error) {
    console.error('❌ Error fixing document verification:', error);
  }
}




const generateTripId = () => `TRIP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateBookingId = () => `BOOK_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateReviewId = () => `REV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;


const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};




app.post('/api/trips', authenticateToken, async (req, res) => {
  try {
    ;
    ;
    ;
    
    const {
      departure,
      arrival,
      departure_time,
      return_time,
      type = 'oneway',
      price_per_seat,
      total_seats,
      payment_modes = ['cash'],
      tags = [],
      radius_km = 5,
      description = '',
      meeting_point = '',
      estimated_duration = 0,
      distance_km = 0
    } = req.body;

    
    if (!departure || !arrival || !departure_time || !price_per_seat || !total_seats) {
      ;
      return res.status(400).json({ error: 'Missing required fields' });
    }

    
    ;
    const driver = await User.findById(req.user.userId);
    ;
    if (!driver) {
      return res.status(403).json({ error: 'User not found' });
    }
    
    
    
    
    
    

    
    
    
    

    
    let finalDistance = distance_km;
    let finalDuration = estimated_duration;
    
    if (!finalDistance || !finalDuration) {
      finalDistance = calculateDistance(
        departure.coordinates.lat,
        departure.coordinates.lng,
        arrival.coordinates.lat,
        arrival.coordinates.lng
      );
      finalDuration = Math.round(finalDistance * 1.5); 
    }

    
    const tripData = {
      trip_id: generateTripId(),
      driver_id: req.user.userId,
      departure: {
        type: 'custom',
        custom_location: departure.address,
        address: departure.address,
        coordinates: departure.coordinates
      },
      arrival: {
        type: 'custom',
        custom_location: arrival.address,
        address: arrival.address,
        coordinates: arrival.coordinates
      },
      departure_time: new Date(departure_time),
      arrival_time: return_time ? new Date(return_time) : undefined,
      return_time: return_time ? new Date(return_time) : undefined,
      trip_type: type,
      price_per_seat,
      total_seats,
      available_seats: total_seats,
      tags: tags || [],
      radius_km,
      description,
      meeting_point,
      distance_km: Math.round(finalDistance * 100) / 100,
      estimated_duration: finalDuration,
      status: 'published'
    };
    
    ;
    const trip = new Trip(tripData);
    ;
    await trip.save();
    ;

    
    await trip.populate('driver_id', 'first_name last_name phone profile_picture selfie_url reliability_score gender');

    res.status(201).json({
      success: true,
      message: 'Trip created successfully',
      trip
    });

  } catch (error) {
    console.error('Error creating trip:', error);
    res.status(500).json({ error: 'Failed to create trip' });
  }
});


app.get('/api/trips', async (req, res) => {
  try {
    const {
      departure,
      arrival,
      departure_date,
      price_min,
      price_max,
      gender_preference,
      non_smoker,
      distance_radius,
      page = 1,
      limit = 10,
      sort_by = 'departure_time',
      sort_order = 'asc'
    } = req.query;

    
    const filter = {
      status: { $in: ['scheduled', 'published', 'active'] },
      departure_time: { $gte: new Date() } 
    };

    
    if (departure) {
      filter['departure.address'] = { $regex: departure, $options: 'i' };
    }

    
    if (arrival) {
      filter['arrival.address'] = { $regex: arrival, $options: 'i' };
    }

    
    if (departure_date) {
      const startDate = new Date(departure_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      filter.departure_time = {
        $gte: startDate,
        $lt: endDate
      };
    }

    
    if (price_min || price_max) {
      filter.price_per_seat = {};
      if (price_min) filter.price_per_seat.$gte = parseFloat(price_min);
      if (price_max) filter.price_per_seat.$lte = parseFloat(price_max);
    }

    
    if (gender_preference && gender_preference !== 'any') {
      
      if (gender_preference === 'female') {
        filter.tags = { $in: ['female_only'] };
      } else if (gender_preference === 'male') {
        filter.tags = { $nin: ['female_only'] };
      }
    }

    if (non_smoker === 'true') {
      
      if (filter.tags) {
        
        if (filter.tags.$in) {
          filter.tags.$in.push('non_smoke');
        } else {
          filter.tags = { $in: ['non_smoke'] };
        }
      } else {
        filter.tags = { $in: ['non_smoke'] };
      }
    }

    
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    
    const trips = await Trip.find(filter)
      .populate('driver_id', 'first_name last_name phone profile_picture selfie_url reliability_score rating_average rating_count total_trips gender')
      .populate('departure.university_id', 'name')
      .populate('arrival.university_id', 'name')
      .populate('departure.district_id', 'name')
      .populate('arrival.district_id', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Trip.countDocuments(filter);

    res.json({
      success: true,
      trips,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_trips: total,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching trips:', error);
    res.status(500).json({ error: 'Failed to fetch trips' });
  }
});


app.get('/api/trips/driver/:driverId', authenticateToken, async (req, res) => {
  try {
    const { driverId } = req.params;
    
    
    
    
    
    
    

    const trips = await Trip.find({ driver_id: driverId })
      .populate('driver_id', 'first_name last_name profile_picture selfie_url gender')
      .sort({ created_at: -1 });

    res.json(trips);
  } catch (error) {
    console.error('Error fetching driver trips:', error);
    res.status(500).json({ error: 'Failed to fetch driver trips' });
  }
});


app.get('/api/trips/suggestions', async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = [];

    
    if (type === 'all' || type === 'university') {
      const universities = await University.find({
        name: { $regex: q, $options: 'i' }
      }).limit(5);

      suggestions.push(...universities.map(uni => ({
        type: 'university',
        id: uni._id,
        name: uni.name,
        address: uni.address,
        coordinates: uni.coordinates
      })));
    }

    
    if (type === 'all' || type === 'district') {
      const districts = await District.find({
        name: { $regex: q, $options: 'i' }
      }).limit(5);

      suggestions.push(...districts.map(district => ({
        type: 'district',
        id: district._id,
        name: district.name,
        address: district.address,
        coordinates: district.coordinates
      })));
    }

    
    if (type === 'all' || type === 'location') {
      const recentTrips = await Trip.find({
        $or: [
          { 'departure.address': { $regex: q, $options: 'i' } },
          { 'arrival.address': { $regex: q, $options: 'i' } }
        ]
      })
      .select('departure arrival')
      .limit(10);

      const locations = new Set();
      recentTrips.forEach(trip => {
        if (trip.departure.address.toLowerCase().includes(q.toLowerCase())) {
          locations.add(JSON.stringify({
            type: 'custom',
            name: trip.departure.address,
            coordinates: trip.departure.coordinates
          }));
        }
        if (trip.arrival.address.toLowerCase().includes(q.toLowerCase())) {
          locations.add(JSON.stringify({
            type: 'custom',
            name: trip.arrival.address,
            coordinates: trip.arrival.coordinates
          }));
        }
      });

      suggestions.push(...Array.from(locations).map(loc => JSON.parse(loc)));
    }

    res.json({
      success: true,
      suggestions: suggestions.slice(0, 10)
    });

  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});


app.get('/api/trips/:id', async (req, res) => {
  try {
  const trip = await Trip.findById(req.params.id)
      .populate('driver_id', 'first_name last_name phone profile_picture selfie_url reliability_score rating_average rating_count total_trips gender email_verified document_verification')
      .populate('departure.university_id', 'name')
      .populate('arrival.university_id', 'name')
      .populate('departure.district_id', 'name')
      .populate('arrival.district_id', 'name');

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    res.json({
      success: true,
      trip
    });

  } catch (error) {
    console.error('Error fetching trip:', error);
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});


app.put('/api/trips/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    
    if (trip.driver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the trip driver can update the trip' });
    }

    
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update completed or cancelled trip' });
    }

    const updates = req.body;
    delete updates.trip_id;
    delete updates.driver_id;
    delete updates.created_at;

    
    if (updates.departure?.coordinates || updates.arrival?.coordinates) {
      const departureCoords = updates.departure?.coordinates || trip.departure.coordinates;
      const arrivalCoords = updates.arrival?.coordinates || trip.arrival.coordinates;
      
      const distance = calculateDistance(
        departureCoords.lat,
        departureCoords.lng,
        arrivalCoords.lat,
        arrivalCoords.lng
      );
      
      updates.distance_km = Math.round(distance * 100) / 100;
      updates.estimated_duration = Math.round(distance * 1.5);
    }

    Object.assign(trip, updates);
    trip.updated_at = new Date();
    await trip.save();

    res.json({
      success: true,
      message: 'Trip updated successfully',
      trip
    });

  } catch (error) {
    console.error('Error updating trip:', error);
    res.status(500).json({ error: 'Failed to update trip' });
  }
});


app.put('/api/trips/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const trip = await Trip.findById(req.params.id);

    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    
    if (trip.driver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the trip driver can cancel the trip' });
    }

    
    if (trip.status === 'completed' || trip.status === 'cancelled') {
      return res.status(400).json({ error: 'Trip is already completed or cancelled' });
    }

    
    trip.status = 'cancelled';
    trip.updated_at = new Date();
    await trip.save();

    
    const bookings = await TripBooking.find({ 
      trip_id: trip._id, 
      status: 'confirmed' 
    });

    for (const booking of bookings) {
      
      const hoursUntilDeparture = (trip.departure_time - new Date()) / (1000 * 60 * 60);
      let refundPercentage = 0;

      if (hoursUntilDeparture > 24) {
        refundPercentage = 1.0; 
      } else if (hoursUntilDeparture > 1) {
        refundPercentage = 0.5; 
      } else {
        refundPercentage = 0; 
      }

      const refundAmount = booking.total_price * refundPercentage;

      
      booking.status = 'cancelled';
      booking.cancellation = {
        cancelled_by: req.user.userId,
        cancelled_at: new Date(),
        reason: reason || 'Trip cancelled by driver',
        refund_amount: refundAmount,
        refund_status: refundAmount > 0 ? 'pending' : 'denied'
      };
      await booking.save();

      
      if (refundAmount > 0) {
        
        const passenger = await User.findById(booking.passenger_id);
        if (passenger) {
          passenger.unicard_balance += refundAmount;
          await passenger.save();

          
          const refundTransaction = new UniCardTransaction({
            transaction_id: generateTransactionId(),
            from_user: booking.passenger_id, 
            from_uni_id: 'SYSTEM',
            to_user: booking.passenger_id,
            to_uni_id: passenger.uni_id,
            points: refundAmount,
            transaction_type: 'refund',
            description: `Refund for cancelled trip: ${trip.trip_id}`,
            status: 'completed',
            points_before_sender: 0, 
            points_after_sender: 0,
            points_before_receiver: passenger.unicard_balance - refundAmount,
            points_after_receiver: passenger.unicard_balance,
            created_by: booking.passenger_id,
            processed_by: booking.passenger_id,
            processed_at: new Date()
          });
          await refundTransaction.save();

          
          try {
            await createNotification(
              booking.passenger_id,
              'cancellation',
              'Voyage annulé - Remboursement effectué',
              `Votre voyage ${trip.trip_id} a été annulé. Un remboursement de ${refundAmount} points a été ajouté à votre UniCard.`,
              {
                trip_id: trip.trip_id,
                refund_amount: refundAmount,
                cancellation_reason: reason
              },
              'high'
            );
          } catch (notificationError) {
            console.error('Failed to send refund notification:', notificationError);
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Trip cancelled successfully',
      cancelled_bookings: bookings.length
    });

  } catch (error) {
    console.error('Error cancelling trip:', error);
    res.status(500).json({ error: 'Failed to cancel trip' });
  }
});




app.post('/api/trips/:id/book', authenticateToken, async (req, res) => {
  try {
    const { seats_booked, payment_method, unicard_amount, cash_amount, passenger_notes } = req.body;
    const tripId = req.params.id;

    
    if (!seats_booked || !payment_method) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    
    const trip = await Trip.findById(tripId);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    
    if (!['scheduled', 'published', 'active'].includes(trip.status)) {
      return res.status(400).json({ error: 'Trip is not available for booking' });
    }
    if (new Date(trip.departure_time) < new Date()) {
      return res.status(400).json({ error: 'Trip departure time has passed' });
    }

    
    const seatsInt = parseInt(seats_booked, 10);
    if (!Number.isFinite(seatsInt) || seatsInt < 1) {
      return res.status(400).json({ error: 'Invalid seats requested' });
    }
    if (seatsInt > trip.total_seats) {
      return res.status(400).json({ error: 'Requested seats exceed total seats' });
    }
    if (trip.available_seats < seatsInt) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    
    const passenger = await User.findById(req.user.userId);
    if (!passenger || passenger.role !== 'passenger') {
      return res.status(403).json({ error: 'Only passengers can book trips' });
    }

    
    if (!passenger.documents_verified || !passenger.payment_verified) {
      return res.status(403).json({ error: 'Passenger must be verified to book trips' });
    }

    
    const now = new Date();
    if (passenger.subscription_end_date && now > passenger.subscription_end_date) {
      return res.status(403).json({ 
        error: 'Subscription expired',
        subscription_expired: true,
        message: 'Your subscription has expired. Please renew to book trips.'
      });
    }

    
    if (trip.driver_id.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Cannot book your own trip' });
    }

    
    if (trip.tags && trip.tags.includes('female_only')) {
      if (passenger.gender !== 'female') {
        return res.status(403).json({ error: 'This trip is for female passengers only' });
      }
    }

    
    if (!['unicard', 'cash', 'mixed'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    
    const existing = await TripBooking.findOne({ trip_id: trip._id, passenger_id: req.user.userId, status: { $in: ['pending', 'confirmed'] } });
    if (existing) {
      return res.status(400).json({ error: 'You already have a booking for this trip' });
    }

    
    const totalPrice = trip.price_per_seat * seatsInt;

    
    if (payment_method === 'unicard' && unicard_amount !== totalPrice) {
      return res.status(400).json({ error: 'UniCard amount must equal total price' });
    }
    if (payment_method === 'cash' && cash_amount !== totalPrice) {
      return res.status(400).json({ error: 'Cash amount must equal total price' });
    }
    if (payment_method === 'mixed' && (unicard_amount + cash_amount) !== totalPrice) {
      return res.status(400).json({ error: 'Payment amounts must equal total price' });
    }

    
    if (payment_method === 'unicard' || payment_method === 'mixed') {
      if (passenger.unicard_balance < unicard_amount) {
        return res.status(400).json({ error: 'Insufficient UniCard balance' });
      }
    }

    
    const newBookingId = generateBookingId();

    
    const booking = new TripBooking({
      booking_id: newBookingId,
      trip_id: trip._id,
      passenger_id: req.user.userId,
      driver_id: trip.driver_id,
      seats_booked: seatsInt,
      total_price: totalPrice,
      payment_method,
      unicard_amount: unicard_amount || 0,
      cash_amount: cash_amount || 0,
      payment_status: payment_method === 'cash' ? 'pending' : 'paid',
      passenger_notes,
      status: payment_method === 'cash' ? 'pending' : 'confirmed'
    });

    await booking.save();

    
    trip.available_seats -= seatsInt;
    trip.total_bookings += 1;
    await trip.save();

    
    if (payment_method === 'unicard' || payment_method === 'mixed') {
      
      passenger.unicard_balance -= unicard_amount;
      await passenger.save();

      
      const transaction = new UniCardTransaction({
        transaction_id: generateTransactionId(),
        from_user: req.user.userId,
        from_uni_id: passenger.uni_id,
        to_user: trip.driver_id,
        to_uni_id: 'SYSTEM', 
        points: unicard_amount,
        transaction_type: 'transfer',
        description: `Trip booking: ${trip.trip_id}`,
        status: 'completed',
        points_before_sender: passenger.unicard_balance + unicard_amount,
        points_after_sender: passenger.unicard_balance,
        points_before_receiver: 0, 
        points_after_receiver: 0,
        created_by: req.user.userId,
        processed_by: req.user.userId,
        processed_at: new Date()
      });
      await transaction.save();
    }

    
    createNotification(
      trip.driver_id,
      'booking',
      'Nouvelle réservation! 🚗',
      `${passenger.first_name} ${passenger.last_name} a réservé ${seatsInt} place(s) pour votre voyage.`,
      {
        trip_id: trip.trip_id,
        booking_id: booking.booking_id,
        passenger_name: `${passenger.first_name} ${passenger.last_name}`,
        seats_booked: seatsInt,
        total_price: totalPrice
      },
      'medium'
    ).catch(err => console.error('Notification failed:', err));

    res.status(201).json({
      success: true,
      message: 'Trip booked successfully',
      booking
    });

  } catch (error) {
    console.error('Error booking trip:', error);
    res.status(500).json({ error: 'Failed to book trip' });
  }
});


app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = { passenger_id: req.user.userId };
    if (status) {
      filter.status = status;
    }

    const bookings = await TripBooking.find(filter)
      .populate('trip_id', 'trip_id departure arrival departure_time arrival_time price_per_seat')
      .populate('driver_id', 'first_name last_name phone profile_picture gender')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TripBooking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_bookings: total,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});


app.get('/api/driver/bookings', authenticateToken, async (req, res) => {
  try {
    
    const user = await User.findById(req.user.userId).select('role');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { status, page = 1, limit = 10 } = req.query;

    const filter = { driver_id: req.user.userId };
    if (status) filter.status = status;

    const bookings = await TripBooking.find(filter)
      .populate('trip_id', 'trip_id departure arrival departure_time price_per_seat')
      .populate('passenger_id', 'first_name last_name phone profile_picture')
      .sort({ created_at: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await TripBooking.countDocuments(filter);

    res.json({
      success: true,
      bookings,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_bookings: total,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching driver bookings:', error);
    res.status(500).json({ error: 'Failed to fetch driver bookings' });
  }
});


app.put('/api/bookings/:id/driver-update', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body; 

    const booking = await TripBooking.findById(id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    
    if (booking.driver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the driver can manage this booking' });
    }

    const trip = await Trip.findById(booking.trip_id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    if (action === 'confirm') {
      
      if (booking.status !== 'pending') {
        return res.status(400).json({ error: 'Only pending bookings can be confirmed' });
      }
      booking.status = 'confirmed';
      if (booking.payment_method === 'cash') {
        booking.payment_status = 'paid'; 
      }
      await booking.save();

      
      

      
      try {
        await createNotification(
          booking.passenger_id,
          'booking',
          'Réservation confirmée ✅',
          'Votre réservation a été confirmée par le conducteur.',
          { trip_id: trip.trip_id, booking_id: booking.booking_id },
          'medium'
        );
      } catch (notificationError) {
        console.error('Failed to send confirmation notification:', notificationError);
      }

      return res.json({ success: true, message: 'Booking confirmed', booking });
    }

    if (action === 'cancel') {
      if (booking.status !== 'pending' && booking.status !== 'confirmed') {
        return res.status(400).json({ error: 'Booking cannot be cancelled' });
      }

      
      let refundAmount = 0;
      if (booking.unicard_amount > 0) {
        refundAmount = booking.unicard_amount;
        const passenger = await User.findById(booking.passenger_id);
        if (passenger) {
          passenger.unicard_balance += refundAmount;
          await passenger.save();
        }
      }

      
      booking.status = 'cancelled';
      booking.cancellation = {
        cancelled_by: req.user.userId,
        cancelled_at: new Date(),
        reason: reason || 'Cancelled by driver',
        refund_amount: refundAmount,
        refund_status: refundAmount > 0 ? 'processed' : 'denied'
      };
      await booking.save();

      
      trip.available_seats += booking.seats_booked;
      trip.cancelled_bookings = (trip.cancelled_bookings || 0) + 1;
      await trip.save();

      
      try {
        await createNotification(
          booking.passenger_id,
          'cancellation',
          'Réservation annulée',
          `Votre réservation pour le voyage ${trip.trip_id} a été annulée par le conducteur.`,
          { trip_id: trip.trip_id, booking_id: booking.booking_id, refund_amount: refundAmount },
          'high'
        );
      } catch (notificationError) {
        console.error('Failed to send driver cancellation notification:', notificationError);
      }

      return res.json({ success: true, message: 'Booking cancelled', booking });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (error) {
    console.error('Driver booking update error:', error);
    res.status(500).json({ error: 'Failed to update booking' });
  }
});


app.put('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const booking = await TripBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    
    if (booking.passenger_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only the passenger can cancel the booking' });
    }

    
    if (booking.status !== 'confirmed' && booking.status !== 'pending') {
      return res.status(400).json({ error: 'Booking cannot be cancelled' });
    }

    
    const trip = await Trip.findById(booking.trip_id);
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }

    
    const hoursUntilDeparture = (trip.departure_time - new Date()) / (1000 * 60 * 60);
    let refundPercentage = 0;

    if (hoursUntilDeparture > 24) {
      refundPercentage = 1.0; 
    } else if (hoursUntilDeparture > 1) {
      refundPercentage = 0.5; 
    } else {
      refundPercentage = 0; 
    }

    const refundAmount = booking.unicard_amount * refundPercentage;

    
    booking.status = 'cancelled';
    booking.cancellation = {
      cancelled_by: req.user.userId,
      cancelled_at: new Date(),
      reason: reason || 'Cancelled by passenger',
      refund_amount: refundAmount,
      refund_status: refundAmount > 0 ? 'pending' : 'denied'
    };
    await booking.save();

    
    trip.available_seats += booking.seats_booked;
    trip.cancelled_bookings += 1;
    await trip.save();

    
    if (refundAmount > 0) {
      const passenger = await User.findById(booking.passenger_id);
      if (passenger) {
        passenger.unicard_balance += refundAmount;
        await passenger.save();

        
        const refundTransaction = new UniCardTransaction({
          transaction_id: generateTransactionId(),
          from_user: booking.passenger_id, 
          from_uni_id: 'SYSTEM',
          to_user: booking.passenger_id,
          to_uni_id: passenger.uni_id,
          points: refundAmount,
          transaction_type: 'refund',
          description: `Refund for cancelled booking: ${booking.booking_id}`,
          status: 'completed',
          points_before_sender: 0, 
          points_after_sender: 0,
          points_before_receiver: passenger.unicard_balance - refundAmount,
          points_after_receiver: passenger.unicard_balance,
          created_by: booking.passenger_id,
          processed_by: booking.passenger_id,
          processed_at: new Date()
        });
        await refundTransaction.save();
      }
    }

    
    try {
      await createNotification(
        trip.driver_id,
        'cancellation',
        'Réservation annulée',
        `Une réservation pour votre voyage ${trip.trip_id} a été annulée.`,
        {
          trip_id: trip.trip_id,
          booking_id: booking.booking_id,
          seats_freed: booking.seats_booked
        },
        'medium'
      );
    } catch (notificationError) {
      console.error('Failed to send cancellation notification:', notificationError);
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      refund_amount: refundAmount
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});




app.post('/api/trips/search', async (req, res) => {
  try {
    const {
      departure,
      arrival,
      departure_date,
      price_min,
      price_max,
      gender_preference,
      non_smoker,
      distance_radius,
      page = 1,
      limit = 10,
      sort_by = 'departure_time',
      sort_order = 'asc'
    } = req.body;

    
    const filter = {
      status: 'scheduled',
      departure_time: { $gte: new Date() }
    };

    
    if (departure) {
      filter.$or = [
        { 'departure.address': { $regex: departure, $options: 'i' } },
        { 'departure.custom_location': { $regex: departure, $options: 'i' } }
      ];
    }

    if (arrival) {
      const arrivalFilter = [
        { 'arrival.address': { $regex: arrival, $options: 'i' } },
        { 'arrival.custom_location': { $regex: arrival, $options: 'i' } }
      ];
      
      if (filter.$or) {
        filter.$and = [
          { $or: filter.$or },
          { $or: arrivalFilter }
        ];
        delete filter.$or;
      } else {
        filter.$or = arrivalFilter;
      }
    }

    
    if (departure_date) {
      const startDate = new Date(departure_date);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      
      filter.departure_time = {
        $gte: startDate,
        $lt: endDate
      };
    }

    
    if (price_min || price_max) {
      filter.price_per_seat = {};
      if (price_min) filter.price_per_seat.$gte = parseFloat(price_min);
      if (price_max) filter.price_per_seat.$lte = parseFloat(price_max);
    }

    
    if (gender_preference && gender_preference !== 'any') {
      filter['preferences.gender_preference'] = { $in: ['any', gender_preference] };
    }

    if (non_smoker) {
      filter['preferences.non_smoker'] = true;
    }

    
    const sort = {};
    sort[sort_by] = sort_order === 'desc' ? -1 : 1;

    
    const trips = await Trip.find(filter)
      .populate('driver_id', 'first_name last_name phone profile_picture reliability_score gender')
      .populate('departure.university_id', 'name')
      .populate('arrival.university_id', 'name')
      .populate('departure.district_id', 'name')
      .populate('arrival.district_id', 'name')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Trip.countDocuments(filter);

    
    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const searchHistory = new SearchHistory({
          user_id: decoded.userId,
          search_query: {
            departure,
            arrival,
            departure_time: departure_date ? new Date(departure_date) : null,
            filters: {
              price_min,
              price_max,
              gender_preference,
              non_smoker,
              distance_radius
            }
          },
          results_count: total
        });
        await searchHistory.save();
      } catch (error) {
        
      }
    }

    res.json({
      success: true,
      trips,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_trips: total,
        has_next: page * limit < total,
        has_prev: page > 1
      }
    });

  } catch (error) {
    console.error('Error searching trips:', error);
    res.status(500).json({ error: 'Failed to search trips' });
  }
});



app.post('/api/reviews', authenticateToken, async (req, res) => {
  try {
    const { trip_id, reviewed_user_id, rating, comment } = req.body;
    if (!trip_id || !reviewed_user_id || !rating) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const ratingInt = parseInt(rating, 10);
    if (!Number.isFinite(ratingInt) || ratingInt < 1 || ratingInt > 5) {
      return res.status(400).json({ error: 'Invalid rating' });
    }

    const trip = await Trip.findById(trip_id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });

    const isDriver = trip.driver_id.toString() === req.user.userId;
    let isPassenger = false;
    if (!isDriver) {
      const booking = await TripBooking.findOne({ trip_id, passenger_id: req.user.userId, status: { $in: ['confirmed', 'completed', 'cancelled'] } });
      isPassenger = !!booking;
    }
    if (!isDriver && !isPassenger) {
      return res.status(403).json({ error: 'You did not participate in this trip' });
    }

    if (reviewed_user_id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    if (trip.status !== 'completed') {
      return res.status(400).json({ error: 'Trip has not ended yet' });
    }

    const existing = await TripReview.findOne({ trip_id, reviewer_id: req.user.userId, reviewed_user_id });
    if (existing) {
      return res.status(400).json({ error: 'You already reviewed this trip' });
    }

    const review = new TripReview({
      review_id: `REV_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      trip_id,
      reviewer_id: req.user.userId,
      reviewed_user_id,
      rating: ratingInt,
      comment: comment?.slice(0, 500) || ''
    });
    await review.save();

    
    const reviewedUser = await User.findById(reviewed_user_id).select('rating_average rating_count');
    if (reviewedUser) {
      const newCount = (reviewedUser.rating_count || 0) + 1;
      const newAvg = (((reviewedUser.rating_average || 5) * (newCount - 1)) + ratingInt) / newCount;
      reviewedUser.rating_count = newCount;
      reviewedUser.rating_average = Math.round(newAvg * 10) / 10;
      await reviewedUser.save();
    }

    res.status(201).json({ success: true, review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});


app.put('/api/trips/:id/start', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    
    if (trip.driver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only driver can start trip' });
    }
    
    if (!['scheduled', 'published'].includes(trip.status)) {
      return res.status(400).json({ error: 'Only scheduled or published trips can be started' });
    }
    
    
    trip.status = 'active';
    await trip.save();
    
    
    const isAutoStart = req.body.auto_start === true;
    
    
    if (isAutoStart) {
      const driverNotification = new Notification({
        user_id: trip.driver_id,
        type: 'trip_auto_started',
        title: 'Trajet démarré automatiquement',
        message: `Votre trajet "${trip.departure.address} → ${trip.arrival.address}" a été démarré automatiquement!`,
        data: {
          trip_id: trip._id,
          action: 'trip_auto_started'
        }
      });
      await driverNotification.save();
    }
    
    
    const confirmedBookings = await TripBooking.find({ 
      trip_id: id, 
      status: 'confirmed' 
    });
    
    
    const driver = await User.findById(trip.driver_id).select('first_name last_name');
    
    for (const booking of confirmedBookings) {
      const notification = new Notification({
        user_id: booking.passenger_id,
        type: 'trip_started',
        title: 'Trajet commencé',
        message: `Votre trajet avec ${driver.first_name} ${driver.last_name} a commencé!`,
        data: {
          trip_id: trip._id,
          driver_id: trip.driver_id,
          action: 'trip_started'
        }
      });
      await notification.save();
    }
    
    res.json({ success: true, message: 'Trip started successfully' });
  } catch (error) {
    console.error('Start trip error:', error);
    res.status(500).json({ error: 'Failed to start trip' });
  }
});


app.put('/api/trips/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trip.findById(id);
    
    if (!trip) {
      return res.status(404).json({ error: 'Trip not found' });
    }
    
    
    if (trip.driver_id.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Only driver can complete trip' });
    }
    
    if (trip.status !== 'active') {
      return res.status(400).json({ error: 'Only active trips can be completed' });
    }
    
    
    trip.status = 'completed';
    await trip.save();
    
    
    await User.findByIdAndUpdate(trip.driver_id, { $inc: { total_trips: 1 } });
    
    
    const confirmedBookings = await TripBooking.find({ 
      trip_id: id, 
      status: 'confirmed' 
    }).populate('passenger_id', 'first_name last_name');
    
    
    const driver = await User.findById(trip.driver_id).select('first_name last_name');
    
    for (const booking of confirmedBookings) {
      await User.findByIdAndUpdate(booking.passenger_id._id, { $inc: { total_trips: 1 } });
      
      booking.status = 'completed';
      await booking.save();
      
      
      const passengerNotification = new Notification({
        user_id: booking.passenger_id._id,
        type: 'trip_completed',
        title: 'Trajet terminé - Laissez un avis',
        message: `Votre trajet avec ${driver.first_name} ${driver.last_name} est terminé. Laissez un avis pour améliorer la communauté!`,
        data: {
          trip_id: trip._id,
          driver_id: trip.driver_id,
          action: 'review_driver'
        }
      });
      await passengerNotification.save();
    }
    
    
    const driverNotification = new Notification({
      user_id: trip.driver_id,
      type: 'trip_completed',
      title: 'Trajet terminé - Évaluez vos passagers',
      message: `Votre trajet est terminé. Évaluez vos ${confirmedBookings.length} passager(s) pour améliorer la communauté!`,
      data: {
        trip_id: trip._id,
        action: 'review_passengers',
        passenger_count: confirmedBookings.length
      }
    });
    await driverNotification.save();
    
    res.json({ success: true, message: 'Trip completed successfully' });
  } catch (error) {
    console.error('Complete trip error:', error);
    res.status(500).json({ error: 'Failed to complete trip' });
  }
});


app.get('/api/reviews/check/:tripId/:reviewedUserId', authenticateToken, async (req, res) => {
  try {
    const { tripId, reviewedUserId } = req.params;
    
    const existingReview = await TripReview.findOne({
      trip_id: tripId,
      reviewer_id: req.user.userId,
      reviewed_user_id: reviewedUserId
    });
    
    res.json({
      success: true,
      hasReviewed: !!existingReview,
      review: existingReview
    });
  } catch (error) {
    console.error('Check review error:', error);
    res.status(500).json({ error: 'Failed to check review status' });
  }
});


app.get('/api/users/:userId/reviews', async (req, res) => {
  try {
    const { userId } = req.params;
    const reviews = await TripReview.find({ reviewed_user_id: userId })
      .populate('reviewer_id', 'first_name last_name selfie_url profile_picture role')
      .populate('trip_id', 'trip_id departure arrival departure_time');

    
    const allReviews = await TripReview.find({ reviewed_user_id: userId });
    const totalReviews = allReviews.length;
    const avgRating = totalReviews > 0 ? (allReviews.reduce((s, r) => s + r.rating, 0) / totalReviews) : 5;

    const tripsAsDriver = await Trip.countDocuments({ driver_id: userId });
    const tripsAsPassenger = await TripBooking.countDocuments({ passenger_id: userId, status: { $in: ['confirmed', 'completed'] } });
    const tripsCount = tripsAsDriver + tripsAsPassenger;

    const user = await User.findById(userId).select('createdAt rating_average rating_count response_rate total_trips');
    const memberSince = user?.createdAt || new Date();

    res.json({
      success: true,
      reviews,
      totalTrips: user?.total_trips || tripsCount,
      avgRating: Math.round(avgRating * 10) / 10,
      responseRate: user?.response_rate || 100,
      memberSince: memberSince,
      totalReviews: totalReviews
    });
  } catch (error) {
    console.error('Get user reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});


server.listen(PORT, async () => {  
  await fixDocumentVerificationOnStartup();
});

module.exports = app;
