const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Email Service
const emailService = require('./services/emailService');

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = process.env.JWT_SECRET || 'industry-lens-secret-key-2024';
const TMDB_API_KEY = process.env.TMDB_API_KEY || ''; // Get free key at themoviedb.org
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// TMDB HELPER FUNCTIONS
// ============================================

// Search TMDB for a person by name
async function searchTMDBPerson(name) {
  if (!TMDB_API_KEY) return null;
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(name)}`
    );
    const data = await response.json();
    return data.results?.[0] || null;
  } catch (err) {
    console.error('TMDB search error:', err);
    return null;
  }
}

// Get person details from TMDB
async function getTMDBPerson(tmdbId) {
  if (!TMDB_API_KEY || !tmdbId) return null;
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/person/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=combined_credits`
    );
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('TMDB person error:', err);
    return null;
  }
}

// Extract IMDB ID from IMDB URL
function extractImdbId(url) {
  if (!url) return null;
  const match = url.match(/nm\d+/);
  return match ? match[0] : null;
}

// Find TMDB person by IMDB ID
async function findTMDBByImdbId(imdbId) {
  if (!TMDB_API_KEY || !imdbId) return null;
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`
    );
    const data = await response.json();
    return data.person_results?.[0] || null;
  } catch (err) {
    console.error('TMDB find error:', err);
    return null;
  }
}

// ============================================
// IN-MEMORY DATABASE (Replace with real DB in production)
// ============================================

const db = {
  users: [
    {
      id: 'test-user-001',
      email: 'test@industrylens.com',
      password: '$2a$10$X7oHjJ5X5N5X5N5X5N5X5uqFqFqFqFqFqFqFqFqFqFqFqFqFqFq', // "testpass123"
      username: 'TestUser',
      role: 'user',
      createdAt: '2024-01-01T00:00:00Z',
      isBlocked: false,
      agreedToTerms: true,
      bio: 'Testing account for Industry Lens',
      reviewCount: 3
    },
    {
      id: 'admin-001',
      email: 'admin@industrylens.com',
      password: '$2a$10$X7oHjJ5X5N5X5N5X5N5X5uqFqFqFqFqFqFqFqFqFqFqFqFqFqFq',
      username: 'Admin',
      role: 'admin',
      createdAt: '2024-01-01T00:00:00Z',
      isBlocked: false,
      agreedToTerms: true,
      bio: 'Administrator account',
      reviewCount: 0
    }
  ],
  
  professionals: [
    {
      id: 'prof-001',
      name: 'Sarah Mitchell',
      department: 'Director',
      imdbLink: 'https://www.imdb.com/name/nm0000001',
      photoUrl: 'https://image.tmdb.org/t/p/w500/btTdmkgIvOi0FFip1uj1lKzmnLH.jpg',
      averageRating: 4.2,
      totalReviews: 12,
      createdAt: '2024-01-15T00:00:00Z',
      verifiedImdb: true,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      tmdbId: 525,
      credits: [
        { id: 1, title: 'The Last Sunset', type: 'movie', year: '2023', role: 'Director', posterPath: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg' },
        { id: 2, title: 'Echoes in Time', type: 'movie', year: '2021', role: 'Director', posterPath: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg' },
        { id: 3, title: 'Breaking Dawn', type: 'tv', year: '2020', role: 'Director', posterPath: 'https://image.tmdb.org/t/p/w500/j6kLxFVgU4EaJEWXhXQnWR19vEF.jpg' },
        { id: 4, title: 'City of Dreams', type: 'movie', year: '2019', role: 'Director', posterPath: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg' }
      ],
      addedBy: 'admin'
    },
    {
      id: 'prof-002',
      name: 'Marcus Chen',
      department: 'Producer',
      imdbLink: 'https://www.imdb.com/name/nm0000002',
      photoUrl: 'https://image.tmdb.org/t/p/w500/4D0PpNI0kmP58hgrwGC3wCjxhnm.jpg',
      averageRating: 3.8,
      totalReviews: 8,
      createdAt: '2024-02-01T00:00:00Z',
      verifiedImdb: true,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      tmdbId: 7467,
      credits: [
        { id: 5, title: 'Midnight Express', type: 'movie', year: '2022', role: 'Producer', posterPath: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg' },
        { id: 6, title: 'The Silent Hour', type: 'movie', year: '2021', role: 'Executive Producer', posterPath: 'https://image.tmdb.org/t/p/w500/qNBAXBIQlnOThrVvA6mA2B5ber.jpg' }
      ],
      addedBy: 'admin'
    },
    {
      id: 'prof-003',
      name: 'Jessica Torres',
      department: 'Actor',
      imdbLink: null,
      photoUrl: null,
      averageRating: 4.7,
      totalReviews: 23,
      createdAt: '2024-02-15T00:00:00Z',
      verifiedImdb: false,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      credits: [],
      addedBy: 'user'
    },
    {
      id: 'prof-004',
      name: 'David Kim',
      department: 'Cinematographer',
      imdbLink: 'https://www.imdb.com/name/nm0000004',
      photoUrl: 'https://image.tmdb.org/t/p/w500/2daC5DeXqwkFND0xxutbnSVKN6c.jpg',
      averageRating: 4.5,
      totalReviews: 6,
      createdAt: '2024-03-01T00:00:00Z',
      verifiedImdb: true,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      tmdbId: 1136,
      credits: [
        { id: 7, title: 'Luminance', type: 'movie', year: '2023', role: 'Cinematographer', posterPath: 'https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg' },
        { id: 8, title: 'Shadows', type: 'movie', year: '2022', role: 'Director of Photography', posterPath: 'https://image.tmdb.org/t/p/w500/fiVW06jE7z9YnO4trhaMEdclSiC.jpg' },
        { id: 9, title: 'The Frame', type: 'tv', year: '2021', role: 'Cinematographer', posterPath: 'https://image.tmdb.org/t/p/w500/9Jmd1OumCjaXDkpllbSGi2EpJvl.jpg' }
      ],
      addedBy: 'admin'
    },
    {
      id: 'prof-005',
      name: 'Amanda Blake',
      department: 'Make-up Artist',
      imdbLink: null,
      photoUrl: null,
      averageRating: 2.1,
      totalReviews: 15,
      createdAt: '2024-03-15T00:00:00Z',
      verifiedImdb: false,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      credits: [],
      addedBy: 'user'
    },
    {
      id: 'prof-006',
      name: 'Robert Hughes',
      department: 'Sound Engineer',
      imdbLink: 'https://www.imdb.com/name/nm0000006',
      photoUrl: 'https://image.tmdb.org/t/p/w500/rLSUjr725ez1cK7SKVxC9udO03Y.jpg',
      averageRating: 4.9,
      totalReviews: 31,
      createdAt: '2024-04-01T00:00:00Z',
      verifiedImdb: true,
      reviewsDisabled: false,
      reviewsDisabledReason: null,
      tmdbId: 12835,
      credits: [
        { id: 10, title: 'Resonance', type: 'movie', year: '2023', role: 'Sound Designer', posterPath: 'https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DG0WM.jpg' },
        { id: 11, title: 'The Pulse', type: 'movie', year: '2022', role: 'Sound Engineer', posterPath: 'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg' },
        { id: 12, title: 'Harmonic', type: 'tv', year: '2021', role: 'Audio Director', posterPath: 'https://image.tmdb.org/t/p/w500/j6kLxFVgU4EaJEWXhXQnWR19vEF.jpg' },
        { id: 13, title: 'Frequency', type: 'movie', year: '2020', role: 'Sound Designer', posterPath: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg' },
        { id: 14, title: 'Bass Drop', type: 'movie', year: '2019', role: 'Sound Mixer', posterPath: 'https://image.tmdb.org/t/p/w500/aKuFiU82s5ISJpGZp7YkIr3kCUd.jpg' }
      ],
      addedBy: 'admin'
    }
  ],
  
  reviews: [
    {
      id: 'rev-001',
      professionalId: 'prof-001',
      userId: 'test-user-001',
      rating: 5,
      title: 'Exceptional Director to Work With',
      content: 'Sarah is one of the most professional directors I\'ve had the pleasure of working with. She communicates clearly, respects everyone on set, and creates an environment where creativity thrives.',
      projectContext: 'Feature Film - "Midnight Sun"',
      workingRelationship: 'Co-worker',
      createdAt: '2024-06-15T10:30:00Z',
      updatedAt: '2024-06-15T10:30:00Z',
      status: 'approved',
      helpfulCount: 24,
      flagCount: 0
    },
    {
      id: 'rev-002',
      professionalId: 'prof-002',
      userId: 'test-user-001',
      rating: 3,
      title: 'Mixed Experience',
      content: 'Marcus has strong industry connections and can get projects greenlit, but communication could be improved. Payments were sometimes delayed.',
      projectContext: 'TV Series - "Echo Chamber"',
      workingRelationship: 'Contractor',
      createdAt: '2024-07-20T14:45:00Z',
      updatedAt: '2024-07-20T14:45:00Z',
      status: 'approved',
      helpfulCount: 18,
      flagCount: 1
    },
    {
      id: 'rev-003',
      professionalId: 'prof-005',
      userId: 'test-user-001',
      rating: 1,
      title: 'Unprofessional Conduct',
      content: 'Unfortunately, my experience was extremely negative. Amanda was consistently late, unprepared, and dismissive of feedback. Would not recommend.',
      projectContext: 'Commercial Shoot',
      workingRelationship: 'Co-worker',
      createdAt: '2024-08-10T09:15:00Z',
      updatedAt: '2024-08-10T09:15:00Z',
      status: 'approved',
      helpfulCount: 45,
      flagCount: 2
    },
    {
      id: 'rev-004',
      professionalId: 'prof-003',
      userId: 'test-user-001',
      rating: 5,
      title: 'A True Professional',
      content: 'Jessica brings 100% to every scene. Always prepared, kind to crew members, and incredibly talented.',
      projectContext: 'Independent Film',
      workingRelationship: 'Director',
      createdAt: '2024-09-05T16:20:00Z',
      updatedAt: '2024-09-05T16:20:00Z',
      status: 'pending',
      helpfulCount: 0,
      flagCount: 0
    }
  ],
  
  flags: [
    {
      id: 'flag-001',
      reviewId: 'rev-003',
      userId: 'user-other',
      reason: 'Potentially defamatory content',
      createdAt: '2024-08-11T12:00:00Z',
      status: 'pending'
    }
  ],
  
  notifications: [],
  
  denialReasons: [
    { id: 'tos-violation', label: 'Violates Terms of Service' },
    { id: 'defamatory', label: 'Contains potentially defamatory content' },
    { id: 'confidential', label: 'Contains confidential/proprietary information' },
    { id: 'hearsay', label: 'Based on hearsay, not first-hand experience' },
    { id: 'insufficient', label: 'Insufficient detail or context' },
    { id: 'harassment', label: 'Contains harassment or personal attacks' },
    { id: 'false-claims', label: 'Contains unverifiable claims' },
    { id: 'spam', label: 'Spam or promotional content' },
    { id: 'other', label: 'Other (see details)' }
  ],
  
  departments: [
    'Actor', 'Director', 'Producer', 'Executive Producer', 
    'Cinematographer', 'Writer', 'Editor', 'Composer',
    'Production Designer', 'Costume Designer', 'Make-up Artist',
    'Hair Stylist', 'Sound Engineer', 'Sound Designer', 'VFX Artist',
    'Stunt Coordinator', 'Casting Director', 'Line Producer',
    'Unit Production Manager', 'First Assistant Director',
    'Second Assistant Director', 'Grip', 'Gaffer', 'Best Boy',
    'Script Supervisor', 'Location Manager', 'Set Decorator',
    'Prop Master', 'Wardrobe Supervisor', 'Colorist',
    'Post-Production Supervisor', 'Music Supervisor', 'Foley Artist',
    'Other'
  ]
};

// ============================================
// AUTH MIDDLEWARE
// ============================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// AUTH ROUTES
// ============================================

// Test Login - Quick access for testing
app.post('/api/auth/test-login', (req, res) => {
  const testUser = db.users.find(u => u.id === 'test-user-001');
  const token = jwt.sign(
    { id: testUser.id, email: testUser.email, role: testUser.role, username: testUser.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    token,
    user: {
      id: testUser.id,
      email: testUser.email,
      username: testUser.username,
      role: testUser.role,
      bio: testUser.bio,
      reviewCount: testUser.reviewCount
    }
  });
});

// Admin Test Login
app.post('/api/auth/admin-test-login', (req, res) => {
  const adminUser = db.users.find(u => u.role === 'admin');
  const token = jwt.sign(
    { id: adminUser.id, email: adminUser.email, role: adminUser.role, username: adminUser.username },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  res.json({
    token,
    user: {
      id: adminUser.id,
      email: adminUser.email,
      username: adminUser.username,
      role: adminUser.role
    }
  });
});

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, username, agreedToTerms } = req.body;
    
    if (!agreedToTerms) {
      return res.status(400).json({ error: 'You must agree to the Terms and Conditions' });
    }
    
    if (db.users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    if (db.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already taken' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      password: hashedPassword,
      username,
      role: 'user',
      createdAt: new Date().toISOString(),
      isBlocked: false,
      agreedToTerms: true,
      bio: '',
      reviewCount: 0
    };
    
    db.users.push(newUser);
    
    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(newUser).catch(err => 
      console.error('Failed to send welcome email:', err)
    );
    
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, username: newUser.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        bio: newUser.bio,
        reviewCount: newUser.reviewCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ error: 'Account has been suspended' });
    }
    
    // For demo purposes, accept any password for test accounts
    const validPassword = user.id.startsWith('test') || user.id.startsWith('admin') 
      ? true 
      : await bcrypt.compare(password, user.password);
      
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        bio: user.bio,
        reviewCount: user.reviewCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    bio: user.bio,
    reviewCount: user.reviewCount,
    createdAt: user.createdAt
  });
});

// ============================================
// PROFESSIONAL ROUTES
// ============================================

// Search professionals
app.get('/api/professionals/search', (req, res) => {
  const { q, department } = req.query;
  let results = [...db.professionals];
  
  if (q) {
    const query = q.toLowerCase();
    results = results.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.imdbLink && p.imdbLink.toLowerCase().includes(query))
    );
  }
  
  if (department && department !== 'all') {
    results = results.filter(p => p.department === department);
  }
  
  res.json(results);
});

// Get all departments
app.get('/api/departments', (req, res) => {
  res.json(db.departments);
});

// Get professional by ID
app.get('/api/professionals/:id', (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  // Get reviews for this professional (anonymous - don't expose author names)
  const reviews = db.reviews
    .filter(r => r.professionalId === professional.id && r.status === 'approved')
    .map(r => ({
      ...r,
      author: 'Anonymous Reviewer', // Reviews are anonymous to protect reviewers
      userId: undefined // Don't expose user ID publicly
    }));
  
  // Calculate rating distribution
  const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach(r => {
    ratingDistribution[r.rating]++;
  });
  
  res.json({
    ...professional,
    reviews,
    ratingDistribution,
    totalReviews: reviews.length
  });
});

// Create new professional profile
app.post('/api/professionals', authenticateToken, (req, res) => {
  const { name, department, imdbLink } = req.body;
  
  // Check for duplicates
  const existing = db.professionals.find(p => 
    p.name.toLowerCase() === name.toLowerCase() && p.department === department
  );
  
  if (existing) {
    return res.json(existing); // Return existing if found
  }
  
  const newProfessional = {
    id: uuidv4(),
    name,
    department,
    imdbLink: imdbLink || null,
    photoUrl: null,
    averageRating: 0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    verifiedImdb: false,
    reviewsDisabled: false,
    reviewsDisabledReason: null
  };
  
  db.professionals.push(newProfessional);
  res.status(201).json(newProfessional);
});

// ============================================
// REVIEW ROUTES
// ============================================

// Get reviews for current user
app.get('/api/reviews/my-reviews', authenticateToken, (req, res) => {
  const reviews = db.reviews
    .filter(r => r.userId === req.user.id)
    .map(r => ({
      ...r,
      professional: db.professionals.find(p => p.id === r.professionalId)
    }));
  res.json(reviews);
});

// Check if user has already reviewed a professional
app.get('/api/reviews/check/:professionalId', authenticateToken, (req, res) => {
  const { professionalId } = req.params;
  
  const existingReview = db.reviews.find(
    r => r.professionalId === professionalId && r.userId === req.user.id
  );
  
  if (existingReview) {
    res.json({ 
      hasReviewed: true, 
      reviewId: existingReview.id,
      status: existingReview.status
    });
  } else {
    res.json({ hasReviewed: false });
  }
});

// Create review
app.post('/api/reviews', authenticateToken, (req, res) => {
  const { professionalId, rating, title, content, projectContext, workingRelationship } = req.body;
  
  // Check if reviews are disabled for this professional
  const professional = db.professionals.find(p => p.id === professionalId);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  if (professional.reviewsDisabled) {
    return res.status(403).json({ error: 'Reviews are currently disabled for this professional' });
  }
  
  // Check if user already reviewed this professional
  const existingReview = db.reviews.find(
    r => r.professionalId === professionalId && r.userId === req.user.id
  );
  
  if (existingReview) {
    return res.status(400).json({ error: 'You have already reviewed this professional' });
  }
  
  const newReview = {
    id: uuidv4(),
    professionalId,
    userId: req.user.id,
    rating,
    title,
    content,
    projectContext: projectContext || null,
    workingRelationship: workingRelationship || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'pending', // Requires admin approval
    helpfulCount: 0,
    flagCount: 0
  };
  
  db.reviews.push(newReview);
  
  // Update user review count
  const user = db.users.find(u => u.id === req.user.id);
  if (user) user.reviewCount++;
  
  res.status(201).json(newReview);
});

// Update review
app.put('/api/reviews/:id', authenticateToken, (req, res) => {
  const review = db.reviews.find(r => r.id === req.params.id);
  
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to edit this review' });
  }
  
  const { rating, title, content, projectContext, workingRelationship } = req.body;
  
  review.rating = rating ?? review.rating;
  review.title = title ?? review.title;
  review.content = content ?? review.content;
  review.projectContext = projectContext ?? review.projectContext;
  review.workingRelationship = workingRelationship ?? review.workingRelationship;
  review.updatedAt = new Date().toISOString();
  review.status = 'pending'; // Re-submit for review
  
  res.json(review);
});

// Delete review
app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
  const reviewIndex = db.reviews.findIndex(r => r.id === req.params.id);
  
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  const review = db.reviews[reviewIndex];
  
  if (review.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized to delete this review' });
  }
  
  db.reviews.splice(reviewIndex, 1);
  
  // Update user review count
  const user = db.users.find(u => u.id === review.userId);
  if (user) user.reviewCount = Math.max(0, user.reviewCount - 1);
  
  // Update professional stats
  const professional = db.professionals.find(p => p.id === review.professionalId);
  if (professional) {
    const remainingReviews = db.reviews.filter(
      r => r.professionalId === professional.id && r.status === 'approved'
    );
    professional.totalReviews = remainingReviews.length;
    professional.averageRating = remainingReviews.length > 0
      ? remainingReviews.reduce((sum, r) => sum + r.rating, 0) / remainingReviews.length
      : 0;
  }
  
  res.json({ message: 'Review deleted' });
});

// Mark review as helpful
app.post('/api/reviews/:id/helpful', authenticateToken, (req, res) => {
  const review = db.reviews.find(r => r.id === req.params.id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  review.helpfulCount++;
  res.json({ helpfulCount: review.helpfulCount });
});

// Flag review
app.post('/api/reviews/:id/flag', authenticateToken, (req, res) => {
  const review = db.reviews.find(r => r.id === req.params.id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  const { reason } = req.body;
  
  const flag = {
    id: uuidv4(),
    reviewId: review.id,
    userId: req.user.id,
    reason,
    createdAt: new Date().toISOString(),
    status: 'pending'
  };
  
  db.flags.push(flag);
  review.flagCount++;
  
  res.json({ message: 'Review flagged for review' });
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

// Get user's notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
  const notifications = db.notifications
    .filter(n => n.userId === req.user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifications);
});

// Get unread notification count
app.get('/api/notifications/unread-count', authenticateToken, (req, res) => {
  const count = db.notifications.filter(
    n => n.userId === req.user.id && !n.read
  ).length;
  res.json({ count });
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, (req, res) => {
  const notification = db.notifications.find(
    n => n.id === req.params.id && n.userId === req.user.id
  );
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  notification.read = true;
  res.json(notification);
});

// Mark all notifications as read
app.put('/api/notifications/read-all', authenticateToken, (req, res) => {
  db.notifications
    .filter(n => n.userId === req.user.id)
    .forEach(n => n.read = true);
  res.json({ message: 'All notifications marked as read' });
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, (req, res) => {
  const index = db.notifications.findIndex(
    n => n.id === req.params.id && n.userId === req.user.id
  );
  if (index === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  db.notifications.splice(index, 1);
  res.json({ message: 'Notification deleted' });
});

// ============================================
// ADMIN ROUTES
// ============================================

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, requireAdmin, (req, res) => {
  const users = db.users.map(u => ({
    id: u.id,
    email: u.email,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    isBlocked: u.isBlocked,
    reviewCount: u.reviewCount
  }));
  res.json(users);
});

// Create user (admin)
app.post('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  const { email, password, username, role } = req.body;
  
  if (db.users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Email already exists' });
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    username,
    role: role || 'user',
    createdAt: new Date().toISOString(),
    isBlocked: false,
    agreedToTerms: true,
    bio: '',
    reviewCount: 0
  };
  
  db.users.push(newUser);
  res.status(201).json({
    id: newUser.id,
    email: newUser.email,
    username: newUser.username,
    role: newUser.role
  });
});

// Block/Unblock user (admin)
app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  user.isBlocked = !user.isBlocked;
  res.json({ isBlocked: user.isBlocked });
});

// Delete user (admin)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const index = db.users.findIndex(u => u.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Don't allow deleting the last admin
  const user = db.users[index];
  if (user.role === 'admin') {
    const adminCount = db.users.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last admin' });
    }
  }
  
  db.users.splice(index, 1);
  
  // Also delete user's reviews
  db.reviews = db.reviews.filter(r => r.userId !== req.params.id);
  
  res.json({ message: 'User deleted' });
});

// Get all reviews for moderation (admin)
app.get('/api/admin/reviews', authenticateToken, requireAdmin, (req, res) => {
  const { status } = req.query;
  let reviews = db.reviews.map(r => ({
    ...r,
    author: db.users.find(u => u.id === r.userId)?.username || 'Unknown',
    professional: db.professionals.find(p => p.id === r.professionalId)
  }));
  
  if (status && status !== 'all') {
    reviews = reviews.filter(r => r.status === status);
  }
  
  res.json(reviews);
});

// Approve/Reject review (admin)
app.put('/api/admin/reviews/:id/status', authenticateToken, requireAdmin, (req, res) => {
  const review = db.reviews.find(r => r.id === req.params.id);
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  const { status, denialReason, denialDetails } = req.body;
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  
  const previousStatus = review.status;
  review.status = status;
  
  // Store denial info on the review
  if (status === 'rejected') {
    review.denialReason = denialReason || null;
    review.denialDetails = denialDetails || null;
  } else {
    review.denialReason = null;
    review.denialDetails = null;
  }
  
  // Update professional stats if approving
  if (status === 'approved') {
    const professional = db.professionals.find(p => p.id === review.professionalId);
    if (professional) {
      const approvedReviews = db.reviews.filter(
        r => r.professionalId === professional.id && r.status === 'approved'
      );
      professional.totalReviews = approvedReviews.length;
      professional.averageRating = approvedReviews.length > 0
        ? approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length
        : 0;
    }
  }
  
  // Create notification for the user (only if status changed from pending)
  if (previousStatus === 'pending' && (status === 'approved' || status === 'rejected')) {
    const professional = db.professionals.find(p => p.id === review.professionalId);
    const professionalName = professional?.name || 'Unknown Professional';
    const user = db.users.find(u => u.id === review.userId);
    
    const notification = {
      id: uuidv4(),
      userId: review.userId,
      type: status === 'approved' ? 'review_approved' : 'review_rejected',
      title: status === 'approved' 
        ? 'Review Approved!' 
        : 'Review Not Approved',
      message: status === 'approved'
        ? `Your review of ${professionalName} has been approved and is now visible to others.`
        : `Your review of ${professionalName} has been denied.`,
      reviewId: review.id,
      professionalId: review.professionalId,
      professionalName,
      denialReason: status === 'rejected' ? denialReason : null,
      denialDetails: status === 'rejected' ? denialDetails : null,
      read: false,
      createdAt: new Date().toISOString()
    };
    
    db.notifications.push(notification);
    
    // Send email notification (non-blocking)
    if (user && professional) {
      if (status === 'approved') {
        emailService.sendReviewApprovedEmail(user, review, professional).catch(err =>
          console.error('Failed to send approval email:', err)
        );
      } else {
        emailService.sendReviewRejectedEmail(user, review, professional, denialReason, denialDetails).catch(err =>
          console.error('Failed to send rejection email:', err)
        );
      }
    }
  }
  
  res.json(review);
});

// Get denial reasons (admin)
app.get('/api/admin/denial-reasons', authenticateToken, requireAdmin, (req, res) => {
  res.json(db.denialReasons);
});

// ============================================
// ADMIN - PROFESSIONAL MANAGEMENT
// ============================================

// Get all professionals for admin
app.get('/api/admin/professionals', authenticateToken, requireAdmin, (req, res) => {
  const professionals = db.professionals.map(p => ({
    ...p,
    reviewCount: db.reviews.filter(r => r.professionalId === p.id).length,
    pendingReviews: db.reviews.filter(r => r.professionalId === p.id && r.status === 'pending').length
  }));
  res.json(professionals);
});

// Get single professional with all reviews (admin)
app.get('/api/admin/professionals/:id', authenticateToken, requireAdmin, (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  const reviews = db.reviews
    .filter(r => r.professionalId === professional.id)
    .map(r => ({
      ...r,
      author: db.users.find(u => u.id === r.userId)?.username || 'Unknown User',
      authorEmail: db.users.find(u => u.id === r.userId)?.email || ''
    }));
  
  res.json({
    ...professional,
    reviews
  });
});

// Update professional details (admin)
app.put('/api/admin/professionals/:id', authenticateToken, requireAdmin, (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  const { name, department, imdbLink, reviewsDisabled, reviewsDisabledReason } = req.body;
  
  if (name !== undefined) professional.name = name;
  if (department !== undefined) professional.department = department;
  if (imdbLink !== undefined) {
    professional.imdbLink = imdbLink || null;
    professional.verifiedImdb = !!imdbLink;
  }
  if (reviewsDisabled !== undefined) {
    professional.reviewsDisabled = reviewsDisabled;
    professional.reviewsDisabledReason = reviewsDisabled ? (reviewsDisabledReason || 'Reviews temporarily disabled') : null;
  }
  
  res.json(professional);
});

// Toggle reviews for professional (admin)
app.put('/api/admin/professionals/:id/toggle-reviews', authenticateToken, requireAdmin, (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  const { disabled, reason } = req.body;
  professional.reviewsDisabled = disabled;
  professional.reviewsDisabledReason = disabled ? (reason || 'Reviews temporarily disabled by administrator') : null;
  
  res.json(professional);
});

// Create professional (admin) - with optional TMDB data import
app.post('/api/admin/professionals', authenticateToken, requireAdmin, async (req, res) => {
  const { name, department, imdbLink, verified } = req.body;
  
  if (!name || !department) {
    return res.status(400).json({ error: 'Name and department are required' });
  }
  
  // Check for duplicates
  const existing = db.professionals.find(p => 
    p.name.toLowerCase() === name.toLowerCase() && p.department === department
  );
  
  if (existing) {
    return res.status(400).json({ error: 'A professional with this name and department already exists' });
  }
  
  let photoUrl = null;
  let tmdbId = null;
  let credits = [];
  
  // Try to fetch TMDB data
  if (imdbLink) {
    const imdbId = extractImdbId(imdbLink);
    if (imdbId) {
      const tmdbPerson = await findTMDBByImdbId(imdbId);
      if (tmdbPerson) {
        tmdbId = tmdbPerson.id;
        photoUrl = tmdbPerson.profile_path ? `${TMDB_IMAGE_BASE}${tmdbPerson.profile_path}` : null;
        
        // Get full details including credits
        const fullData = await getTMDBPerson(tmdbPerson.id);
        if (fullData?.combined_credits) {
          credits = [...(fullData.combined_credits.cast || []), ...(fullData.combined_credits.crew || [])]
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 20)
            .map(c => ({
              id: c.id,
              title: c.title || c.name,
              type: c.media_type,
              year: (c.release_date || c.first_air_date || '').split('-')[0],
              role: c.character || c.job,
              posterPath: c.poster_path ? `${TMDB_IMAGE_BASE}${c.poster_path}` : null
            }));
        }
      }
    }
  } else if (name) {
    // Try to find by name if no IMDB link
    const tmdbPerson = await searchTMDBPerson(name);
    if (tmdbPerson) {
      tmdbId = tmdbPerson.id;
      photoUrl = tmdbPerson.profile_path ? `${TMDB_IMAGE_BASE}${tmdbPerson.profile_path}` : null;
    }
  }
  
  const newProfessional = {
    id: uuidv4(),
    name,
    department,
    imdbLink: imdbLink || null,
    photoUrl,
    tmdbId,
    credits,
    averageRating: 0,
    totalReviews: 0,
    createdAt: new Date().toISOString(),
    verifiedImdb: !!verified,
    reviewsDisabled: false,
    reviewsDisabledReason: null,
    addedBy: 'admin'
  };
  
  db.professionals.push(newProfessional);
  res.status(201).json(newProfessional);
});

// Verify professional (admin)
app.put('/api/admin/professionals/:id/verify', authenticateToken, requireAdmin, async (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  // If they have an IMDB link, try to verify and fetch data
  if (professional.imdbLink) {
    const imdbId = extractImdbId(professional.imdbLink);
    if (imdbId) {
      const tmdbPerson = await findTMDBByImdbId(imdbId);
      if (tmdbPerson) {
        professional.tmdbId = tmdbPerson.id;
        professional.photoUrl = tmdbPerson.profile_path ? `${TMDB_IMAGE_BASE}${tmdbPerson.profile_path}` : professional.photoUrl;
        
        // Get full details including credits
        const fullData = await getTMDBPerson(tmdbPerson.id);
        if (fullData?.combined_credits) {
          professional.credits = [...(fullData.combined_credits.cast || []), ...(fullData.combined_credits.crew || [])]
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 20)
            .map(c => ({
              id: c.id,
              title: c.title || c.name,
              type: c.media_type,
              year: (c.release_date || c.first_air_date || '').split('-')[0],
              role: c.character || c.job,
              posterPath: c.poster_path ? `${TMDB_IMAGE_BASE}${c.poster_path}` : null
            }));
        }
      }
    }
  }
  
  professional.verifiedImdb = true;
  res.json(professional);
});

// Refresh TMDB data for professional (admin)
app.post('/api/admin/professionals/:id/refresh-tmdb', authenticateToken, requireAdmin, async (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  let tmdbPerson = null;
  
  // Try IMDB ID first
  if (professional.imdbLink) {
    const imdbId = extractImdbId(professional.imdbLink);
    if (imdbId) {
      tmdbPerson = await findTMDBByImdbId(imdbId);
    }
  }
  
  // Fall back to name search
  if (!tmdbPerson) {
    tmdbPerson = await searchTMDBPerson(professional.name);
  }
  
  if (!tmdbPerson) {
    return res.status(404).json({ error: 'Could not find matching person on TMDB' });
  }
  
  professional.tmdbId = tmdbPerson.id;
  professional.photoUrl = tmdbPerson.profile_path ? `${TMDB_IMAGE_BASE}${tmdbPerson.profile_path}` : professional.photoUrl;
  
  // Get full details including credits
  const fullData = await getTMDBPerson(tmdbPerson.id);
  if (fullData?.combined_credits) {
    professional.credits = [...(fullData.combined_credits.cast || []), ...(fullData.combined_credits.crew || [])]
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 20)
      .map(c => ({
        id: c.id,
        title: c.title || c.name,
        type: c.media_type,
        year: (c.release_date || c.first_air_date || '').split('-')[0],
        role: c.character || c.job,
        posterPath: c.poster_path ? `${TMDB_IMAGE_BASE}${c.poster_path}` : null
      }));
  }
  
  res.json(professional);
});

// ============================================
// ADMIN - USER MANAGEMENT (ENHANCED)
// ============================================

// Get single user with details (admin)
app.get('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const reviews = db.reviews
    .filter(r => r.userId === user.id)
    .map(r => ({
      ...r,
      professional: db.professionals.find(p => p.id === r.professionalId)
    }));
  
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    isBlocked: user.isBlocked,
    bio: user.bio,
    reviewCount: user.reviewCount,
    reviews
  });
});

// Update user details (admin)
app.put('/api/admin/users/:id', authenticateToken, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { email, username, bio, role } = req.body;
  
  // Check email uniqueness
  if (email && email !== user.email) {
    if (db.users.find(u => u.email === email && u.id !== user.id)) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    user.email = email;
  }
  
  // Check username uniqueness
  if (username && username !== user.username) {
    if (db.users.find(u => u.username === username && u.id !== user.id)) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    user.username = username;
  }
  
  if (bio !== undefined) user.bio = bio;
  if (role !== undefined) user.role = role;
  
  res.json({
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role,
    bio: user.bio,
    isBlocked: user.isBlocked,
    reviewCount: user.reviewCount
  });
});

// Send password reset email
app.post('/api/admin/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Generate a reset token
  const resetToken = uuidv4();
  const resetExpires = new Date(Date.now() + 3600000); // 1 hour
  
  // Store reset token (in production, use a proper database)
  user.resetToken = resetToken;
  user.resetTokenExpires = resetExpires.toISOString();
  
  // Send the email
  const result = await emailService.sendPasswordResetEmail(user, resetToken);
  
  if (result.success) {
    res.json({ 
      message: `Password reset email sent to ${user.email}`,
      previewUrl: result.previewUrl // Only in development mode
    });
  } else {
    res.status(500).json({ 
      error: 'Failed to send email',
      details: result.error
    });
  }
});

// Get user's reviews for admin management
app.get('/api/admin/users/:id/reviews', authenticateToken, requireAdmin, (req, res) => {
  const user = db.users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const reviews = db.reviews
    .filter(r => r.userId === user.id)
    .map(r => ({
      ...r,
      professional: db.professionals.find(p => p.id === r.professionalId)
    }));
  
  res.json(reviews);
});

// Add IMDB link to professional (admin)
app.put('/api/admin/professionals/:id/imdb', authenticateToken, requireAdmin, (req, res) => {
  const professional = db.professionals.find(p => p.id === req.params.id);
  if (!professional) {
    return res.status(404).json({ error: 'Professional not found' });
  }
  
  const { imdbLink } = req.body;
  professional.imdbLink = imdbLink;
  professional.verifiedImdb = true;
  
  res.json(professional);
});

// Get flagged reviews (admin)
app.get('/api/admin/flags', authenticateToken, requireAdmin, (req, res) => {
  const flags = db.flags.map(f => ({
    ...f,
    review: db.reviews.find(r => r.id === f.reviewId),
    reporter: db.users.find(u => u.id === f.userId)?.username || 'Unknown'
  }));
  res.json(flags);
});

// Resolve flag (admin)
app.put('/api/admin/flags/:id', authenticateToken, requireAdmin, (req, res) => {
  const flag = db.flags.find(f => f.id === req.params.id);
  if (!flag) {
    return res.status(404).json({ error: 'Flag not found' });
  }
  
  const { status, action } = req.body;
  flag.status = status;
  
  // If removing the review
  if (action === 'remove') {
    const reviewIndex = db.reviews.findIndex(r => r.id === flag.reviewId);
    if (reviewIndex !== -1) {
      db.reviews.splice(reviewIndex, 1);
    }
  }
  
  res.json(flag);
});

// Get admin dashboard stats
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => {
  const stats = {
    totalUsers: db.users.length,
    totalProfessionals: db.professionals.length,
    totalReviews: db.reviews.length,
    pendingReviews: db.reviews.filter(r => r.status === 'pending').length,
    pendingFlags: db.flags.filter(f => f.status === 'pending').length,
    recentActivity: {
      newUsers: db.users.filter(u => {
        const created = new Date(u.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created > weekAgo;
      }).length,
      newReviews: db.reviews.filter(r => {
        const created = new Date(r.createdAt);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return created > weekAgo;
      }).length
    }
  };
  res.json(stats);
});

// ============================================
// TERMS AND CONDITIONS
// ============================================

// ============================================
// PROJECT ROUTES (TMDB Integration)
// ============================================

// Get project details and match with our professionals
app.get('/api/projects/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  
  if (!TMDB_API_KEY) {
    return res.status(503).json({ 
      error: 'TMDB API not configured',
      message: 'Project details require TMDB API key. Get one free at themoviedb.org'
    });
  }
  
  try {
    // Fetch project details from TMDB
    const endpoint = type === 'movie' 
      ? `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`
      : `${TMDB_BASE_URL}/tv/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
    
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const data = await response.json();
    
    // Get cast and crew from TMDB
    const tmdbCast = data.credits?.cast || [];
    const tmdbCrew = data.credits?.crew || [];
    
    // Match with professionals on our site by name (case-insensitive)
    const castOnSite = [];
    const crewOnSite = [];
    
    tmdbCast.forEach(person => {
      const match = db.professionals.find(p => 
        p.name.toLowerCase() === person.name.toLowerCase()
      );
      if (match) {
        castOnSite.push({
          id: match.id,
          name: match.name,
          department: match.department,
          role: person.character || 'Actor',
          photoUrl: match.photoUrl,
          averageRating: match.averageRating,
          totalReviews: match.totalReviews,
          verifiedImdb: match.verifiedImdb
        });
      }
    });
    
    tmdbCrew.forEach(person => {
      const match = db.professionals.find(p => 
        p.name.toLowerCase() === person.name.toLowerCase()
      );
      if (match && !crewOnSite.find(c => c.id === match.id)) {
        crewOnSite.push({
          id: match.id,
          name: match.name,
          department: match.department,
          role: person.job || person.department,
          photoUrl: match.photoUrl,
          averageRating: match.averageRating,
          totalReviews: match.totalReviews,
          verifiedImdb: match.verifiedImdb
        });
      }
    });
    
    res.json({
      id: data.id,
      title: data.title || data.name,
      type,
      overview: data.overview,
      posterPath: data.poster_path ? `${TMDB_IMAGE_BASE}${data.poster_path}` : null,
      backdropPath: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : null,
      releaseDate: data.release_date || data.first_air_date,
      voteAverage: data.vote_average || 0,
      genres: (data.genres || []).map(g => g.name),
      imdbId: data.imdb_id || null,
      castOnSite,
      crewOnSite
    });
  } catch (err) {
    console.error('TMDB fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

app.get('/api/terms', (req, res) => {
  res.json({
    lastUpdated: '2024-12-01',
    content: `INDUSTRY LENS - TERMS AND CONDITIONS

IMPORTANT: Please read these Terms and Conditions carefully before using Industry Lens.

1. ACCEPTANCE OF TERMS
By accessing or using Industry Lens ("the Platform"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use the Platform.

2. PURPOSE OF THE PLATFORM
Industry Lens is a platform for entertainment industry professionals to share their genuine work experiences with other professionals. The Platform is designed to:
- Provide a space for professionals to share honest, first-hand experiences
- Help industry members make informed decisions about potential collaborators
- Promote professional standards within the entertainment industry

We do NOT:
- Edit, curate, or write reviews on behalf of users
- Financially benefit from specific reviews or ratings
- Endorse or verify the accuracy of any review content

3. ANONYMOUS REVIEWS
All reviews on Industry Lens are displayed anonymously. Your username and personal information will NOT be visible to other users when viewing your reviews.

However, you understand that:
- Your identity is known to Industry Lens administrators for moderation purposes
- In the event of legal action, your identity may be disclosed pursuant to valid legal process
- Anonymity does not protect you from legal liability for defamatory or unlawful content
- We may be required to disclose user information in response to subpoenas, court orders, or other legal requirements

Anonymity is provided to encourage honest feedback while protecting reviewers from retaliation. It is NOT a shield for posting false, defamatory, or malicious content.

4. USER RESPONSIBILITIES AND PROHIBITED CONTENT

3.1 TRUTHFULNESS AND ACCURACY
You are solely responsible for the accuracy and truthfulness of any content you post. You MUST:
- Only post reviews based on your genuine, first-hand experiences
- Ensure all statements are factually accurate and truthful
- Not post content you know or suspect to be false

3.2 DEFAMATION AND LEGAL LIABILITY
CRITICAL: You may be held personally liable for any defamatory content you post.

Defamatory content includes:
- False statements of fact presented as truth
- Statements that harm someone's reputation based on falsehoods
- Unverified rumors or hearsay presented as fact

You understand that:
- Industry Lens will not defend or indemnify you against defamation claims
- You are solely responsible for any legal consequences of your posts
- False statements can result in civil lawsuits and significant damages

3.3 CONFIDENTIAL AND PROPRIETARY INFORMATION
You may NOT disclose:
- Trade secrets or proprietary business information
- Information protected by non-disclosure agreements (NDAs)
- Confidential production details, budgets, or contracts
- Any information that would violate contractual obligations
- Unreleased project details or insider information

You are solely responsible for ensuring your reviews do not breach any confidentiality agreements you have signed.

3.4 PROHIBITED CONTENT
You may NOT post:
- False statements of fact about any person
- Unverified allegations of illegal conduct
- Personal information not relevant to professional conduct
- Content based on hearsay rather than first-hand experience
- Discriminatory content based on protected characteristics
- Threats, harassment, or intimidation
- Promotional or spam content

5. CONTENT MODERATION

4.1 Our Approach
Industry Lens maintains a strict hands-off approach to review content:
- We do not write, edit, or modify review substance
- We only add supplementary information (such as IMDB links) to connect profiles
- We remove content that violates these terms

4.2 Removal of Content
We may remove content that:
- Is reported and determined to be potentially defamatory
- Violates our prohibited content guidelines
- Is subject to a valid legal complaint
- Contains verifiably false statements of fact

6. NO WARRANTY OF ACCURACY
We make no representations about the accuracy, reliability, or truthfulness of any user-generated content. Reviews represent individual user experiences and opinions, not endorsed facts.

7. LIMITATION OF LIABILITY
Industry Lens, its owners, operators, and affiliates shall not be liable for:
- Any content posted by users
- Any decisions made based on Platform content
- Any disputes between users
- Any legal claims arising from user-posted content

8. INDEMNIFICATION
You agree to indemnify and hold harmless Industry Lens against any claims, damages, or expenses arising from:
- Your use of the Platform
- Content you post
- Your violation of these Terms
- Any legal claims related to your reviews

9. ACCOUNT TERMINATION
We may suspend or terminate accounts that:
- Violate these Terms
- Post defamatory content
- Engage in harassment or abuse
- Are subject to legal complaints

10. DISPUTE RESOLUTION
Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.

11. CHANGES TO TERMS
We may update these Terms at any time. Continued use of the Platform constitutes acceptance of updated Terms.

12. CONTACT
For questions about these Terms, content removal requests, or legal inquiries, contact: legal@industrylens.example.com

BY USING THIS PLATFORM, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS AND CONDITIONS.`
  });
});

// Test email endpoint (development only)
app.post('/api/test-email', authenticateToken, requireAdmin, async (req, res) => {
  const { type } = req.body;
  const testUser = { email: req.user.email || 'test@example.com', username: req.user.username || 'TestUser' };
  const testProfessional = { id: 'test', name: 'Test Professional' };
  const testReview = { title: 'Test Review', content: 'This is a test review content.' };
  
  let result;
  switch (type) {
    case 'welcome':
      result = await emailService.sendWelcomeEmail(testUser);
      break;
    case 'approved':
      result = await emailService.sendReviewApprovedEmail(testUser, testReview, testProfessional);
      break;
    case 'rejected':
      result = await emailService.sendReviewRejectedEmail(testUser, testReview, testProfessional, 'Test Reason', 'Test details');
      break;
    case 'reset':
      result = await emailService.sendPasswordResetEmail(testUser, 'test-token-123');
      break;
    default:
      return res.status(400).json({ error: 'Invalid email type. Use: welcome, approved, rejected, or reset' });
  }
  
  res.json({
    success: result.success,
    message: result.success ? 'Test email sent!' : 'Failed to send email',
    previewUrl: result.previewUrl,
    error: result.error
  });
});

// Start server
app.listen(PORT, async () => {
  // Initialize email service
  await emailService.initialize();
  console.log(`🎬 Industry Lens API running on port ${PORT}`);
  console.log(`   Test login available at POST /api/auth/test-login`);
  console.log(`   Admin login available at POST /api/auth/admin-test-login`);
});

