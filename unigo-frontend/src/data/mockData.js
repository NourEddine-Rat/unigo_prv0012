export const universities = [
{ id: 1, name: 'Université Mohammed V', type: 'public', city: 'Rabat', district: 'Agdal', coords: { lat: 33.9716, lng: -6.8498 }, address: 'Avenue des Nations Unies, Agdal' },
{ id: 2, name: 'UIR - Université Internationale de Rabat', type: 'private', city: 'Salé', district: 'Technopolis', coords: { lat: 33.9547, lng: -6.8326 }, address: 'Parc Technopolis, Rocade Rabat-Salé' },
{ id: 3, name: 'INSEA', type: 'public', city: 'Rabat', district: 'Madinat Al Irfane', coords: { lat: 33.9591, lng: -6.8615 }, address: 'BP 6217, Madinat Al Irfane' },
{ id: 4, name: 'ISCAE', type: 'public', city: 'Rabat', district: 'Agdal', coords: { lat: 33.9678, lng: -6.8572 }, address: 'Km 9,5, Avenue Allal El Fassi' },
{ id: 5, name: 'EMI - École Mohammadia d\'Ingénieurs', type: 'public', city: 'Rabat', district: 'Agdal', coords: { lat: 33.9721, lng: -6.8514 }, address: 'Avenue Ibn Sina, BP 765' }
]

export const districts = [
{ id: 101, name: 'Agdal', type: 'quartier', city: 'Rabat', coords: { lat: 33.9716, lng: -6.8498 } },
{ id: 102, name: 'Hassan', type: 'quartier', city: 'Rabat', coords: { lat: 34.0209, lng: -6.8416 } },
{ id: 103, name: 'Hay Riad', type: 'quartier', city: 'Rabat', coords: { lat: 33.9591, lng: -6.8615 } },
{ id: 104, name: 'Technopolis', type: 'quartier', city: 'Salé', coords: { lat: 33.9547, lng: -6.8326 } },
{ id: 105, name: 'Bab Lamrissa', type: 'quartier', city: 'Salé', coords: { lat: 34.0389, lng: -6.8143 } },
{ id: 106, name: 'Témara Plage', type: 'quartier', city: 'Témara', coords: { lat: 33.9280, lng: -6.9063 } },
{ id: 107, name: 'Gare Rabat Ville', type: 'gare', city: 'Rabat', coords: { lat: 34.0142, lng: -6.8325 } },
{ id: 108, name: 'Station Tramway Agdal', type: 'tram_station', city: 'Rabat', coords: { lat: 33.9698, lng: -6.8523 } }
]

export const trips = [
{ id: 1, driver_id: 2, departure_text: 'Agdal, Rabat', departure_coords: { lat: 33.9716, lng: -6.8498 }, arrival_text: 'UIR, Salé', arrival_coords: { lat: 33.9547, lng: -6.8326 }, date_time: '2024-01-20T08:00:00', return_date_time: null, type: 'oneway', price_per_seat: 20, total_seats: 3, available_seats: 2, payment_modes: ['cash', 'unicard'], tags: ['non_smoke'], radius_km: 5, status: 'published', created_at: '2024-01-15T10:00:00' },
{ id: 2, driver_id: 4, departure_text: 'Hassan, Rabat', departure_coords: { lat: 34.0209, lng: -6.8416 }, arrival_text: 'INSEA, Rabat', arrival_coords: { lat: 33.9591, lng: -6.8615 }, date_time: '2024-01-20T09:30:00', return_date_time: null, type: 'oneway', price_per_seat: 15, total_seats: 4, available_seats: 3, payment_modes: ['cash'], tags: ['non_smoke', 'female_only'], radius_km: 3, status: 'published', created_at: '2024-01-15T11:00:00' },
{ id: 3, driver_id: 2, departure_text: 'Hay Riad, Rabat', departure_coords: { lat: 33.9591, lng: -6.8615 }, arrival_text: 'Technopolis, Salé', arrival_coords: { lat: 33.9547, lng: -6.8326 }, date_time: '2024-01-21T07:45:00', return_date_time: '2024-01-21T18:00:00', type: 'roundtrip', price_per_seat: 25, total_seats: 3, available_seats: 1, payment_modes: ['unicard'], tags: ['non_smoke'], radius_km: 10, status: 'published', created_at: '2024-01-16T09:00:00' }
]

export const cancellationReasons = [
{ value: 'emergency', label: 'Urgence / Situation d\'urgence' },
{ value: 'schedule_change', label: 'Changement d\'horaire / Planning modifié' },
{ value: 'vehicle_issue', label: 'Problème de véhicule / Panne' },
{ value: 'personal_reasons', label: 'Raisons personnelles' },
{ value: 'other', label: 'Autre raison' }
]

export const reservations = [
{ id: 1, trip_id: 1, passenger_id: 1, seats_booked: 1, status: 'confirmed', payment_mode: 'unicard', unicard_points_used: 20, cancellation_reason: null, cancelled_at: null, created_at: '2024-01-16T14:00:00', updated_at: '2024-01-16T14:05:00' },
{ id: 2, trip_id: 2, passenger_id: 3, seats_booked: 1, status: 'pending', payment_mode: 'cash', unicard_points_used: 0, cancellation_reason: null, cancelled_at: null, created_at: '2024-01-17T10:00:00', updated_at: '2024-01-17T10:00:00' },
{ id: 3, trip_id: 3, passenger_id: 1, seats_booked: 2, status: 'confirmed', payment_mode: 'unicard', unicard_points_used: 50, cancellation_reason: null, cancelled_at: null, created_at: '2024-01-17T15:00:00', updated_at: '2024-01-17T15:10:00' },
{ id: 4, trip_id: 1, passenger_id: 5, seats_booked: 1, status: 'cancelled', payment_mode: 'cash', unicard_points_used: 0, cancellation_reason: 'schedule_change', cancelled_at: '2024-01-18T10:00:00', created_at: '2024-01-15T12:00:00', updated_at: '2024-01-18T10:00:00' }
]

export const mockUsers = [
{ id: 1, first_name: 'Amina', last_name: 'Benali', email: 'passenger@test.com', password: 'password123', phone: '+212 6XX XX XX XX', role: 'passenger', gender: 'female', university_id: 1, status: 'active', unicard_balance: 150, selfie_url: null, created_at: '2024-01-01T10:00:00', updated_at: '2024-01-15T12:00:00', reliability_score: 4.8, no_shows: 0, cancellations_count: 1, last_login: '2024-01-18T08:00:00' },
{ id: 2, first_name: 'Youssef', last_name: 'Alami', email: 'driver@test.com', password: 'password123', phone: '+212 6YY YY YY YY', role: 'driver', gender: 'male', university_id: 2, status: 'active', unicard_balance: 320, selfie_url: null, created_at: '2024-01-02T11:00:00', updated_at: '2024-01-16T09:00:00', reliability_score: 4.9, no_shows: 0, cancellations_count: 0, last_login: '2024-01-19T07:30:00' },
{ id: 3, first_name: 'Sarah', last_name: 'Idrissi', email: 'sarah@test.com', password: 'password123', phone: '+212 6ZZ ZZ ZZ ZZ', role: 'passenger', gender: 'female', university_id: 3, status: 'active', unicard_balance: 80, selfie_url: null, created_at: '2024-01-03T14:00:00', updated_at: '2024-01-17T11:00:00', reliability_score: 4.7, no_shows: 1, cancellations_count: 2, last_login: '2024-01-18T16:00:00' },
{ id: 4, first_name: 'Karim', last_name: 'Tazi', email: 'karim@test.com', password: 'password123', phone: '+212 6AA AA AA AA', role: 'driver', gender: 'male', university_id: 4, status: 'active', unicard_balance: 200, selfie_url: null, created_at: '2024-01-04T09:00:00', updated_at: '2024-01-18T10:00:00', reliability_score: 4.6, no_shows: 0, cancellations_count: 1, last_login: '2024-01-19T08:00:00' },
{ id: 5, first_name: 'Admin', last_name: 'UNIGO', email: 'admin@test.com', password: 'password123', phone: '+212 6BB BB BB BB', role: 'admin', gender: 'male', university_id: 1, status: 'active', unicard_balance: 0, selfie_url: null, created_at: '2024-01-01T08:00:00', updated_at: '2024-01-19T09:00:00', reliability_score: 5.0, no_shows: 0, cancellations_count: 0, last_login: '2024-01-19T09:30:00' },
{ id: 6, first_name: 'Fatima', last_name: 'El Mansouri', email: 'fatima@test.com', password: 'password123', phone: '+212 6CC CC CC CC', role: 'passenger', gender: 'female', university_id: 5, status: 'pending_verification', unicard_balance: 0, selfie_url: null, created_at: '2024-01-18T10:00:00', updated_at: '2024-01-18T10:00:00', reliability_score: 0, no_shows: 0, cancellations_count: 0, last_login: '2024-01-18T10:00:00' }
]

export const payments = [
{ id: 1, user_id: 1, type: 'subscription', method: 'bank_transfer', amount: 99, currency: 'MAD', receipt_url: '/uploads/receipt1.pdf', status: 'verified', created_at: '2024-01-01T10:00:00' },
{ id: 2, user_id: 2, type: 'subscription', method: 'bank_transfer', amount: 99, currency: 'MAD', receipt_url: '/uploads/receipt2.pdf', status: 'verified', created_at: '2024-01-02T11:00:00' },
{ id: 3, user_id: 6, type: 'subscription', method: 'bank_transfer', amount: 99, currency: 'MAD', receipt_url: '/uploads/receipt6.pdf', status: 'pending', created_at: '2024-01-18T10:30:00' },
{ id: 4, user_id: 1, type: 'unicard_topup', method: 'bank_transfer', amount: 200, currency: 'MAD', receipt_url: '/uploads/topup1.pdf', status: 'verified', created_at: '2024-01-10T15:00:00' }
]

export const unicardTransactions = [
{ id: 1, from_user: 1, to_user: 2, points: 20, status: 'completed', created_at: '2024-01-16T14:05:00' },
{ id: 2, from_user: 1, to_user: 4, points: 50, status: 'completed', created_at: '2024-01-17T15:10:00' },
{ id: 3, from_user: 3, to_user: 2, points: 15, status: 'completed', created_at: '2024-01-17T10:30:00' }
]

export const incidents = [
{ id: 1, user_id: 3, type: 'no_show', details: 'Le conducteur ne s\'est pas présenté au point de rendez-vous', evidence_urls: [], status: 'investigating', assigned_to: 5, created_at: '2024-01-18T09:00:00' },
{ id: 2, user_id: 1, type: 'payment_dispute', details: 'Paiement effectué mais non reconnu par le conducteur', evidence_urls: ['/uploads/evidence1.jpg'], status: 'open', assigned_to: null, created_at: '2024-01-19T10:00:00' }
]

export const messages = [
{ id: 1, reservation_id: 1, sender_id: 1, text: 'Bonjour, je confirme ma réservation pour demain matin', created_at: '2024-01-16T14:10:00' },
{ id: 2, reservation_id: 1, sender_id: 2, text: 'Parfait ! Rendez-vous à 8h devant l\'université', created_at: '2024-01-16T14:15:00' },
{ id: 3, reservation_id: 1, sender_id: 1, text: 'D\'accord, à demain !', created_at: '2024-01-16T14:20:00' },
{ id: 4, reservation_id: 2, sender_id: 3, text: 'Bonjour, est-ce que vous pouvez me prendre à la gare ?', created_at: '2024-01-17T10:05:00' },
{ id: 5, reservation_id: 3, sender_id: 1, text: 'Bonjour, je réserve 2 places pour l\'aller-retour', created_at: '2024-01-17T15:05:00' },
{ id: 6, reservation_id: 3, sender_id: 2, text: 'Réservation confirmée ! On se retrouve à Hay Riad', created_at: '2024-01-17T15:12:00' }
]