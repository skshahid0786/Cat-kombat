
// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBCLc0MfmOCNMJ4aneEEd4XTPuBZAmWBsE",
  authDomain: "hamster-7e3ad.firebaseapp.com",
  projectId: "hamster-7e3ad",
  storageBucket: "hamster-7e3ad.firebasestorage.app",
  messagingSenderId: "529569458550",
  appId: "1:529569458550:web:62819349604236d3ad3257"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ===== GAME CONSTANTS =====
const profits = { 
  crypto: 5,    // Fish Pond
  lab: 8,       // Goldfish Lake
  turbo: 12     // Whale Spot
};

const unlockPrices = {
  crypto: 1000,
  lab: 5000,
  turbo: 10000
};

const upgradeCosts = {
  crypto: 500,
  lab: 1000,
  turbo: 2000
};

const DAILY_REWARDS = [
  { day: 1, reward: 500, type: 'coins' },
  { day: 2, reward: 1000, type: 'coins' },
  { day: 3, reward: 50, type: 'energy' },
  { day: 4, reward: 2000, type: 'coins' },
  { day: 5, reward: 100, type: 'energy' },
  { day: 6, reward: 5000, type: 'coins' },
  { day: 7, reward: 10000, type: 'coins', bonus: true }
];

// ===== GAME STATE =====
let currentUser = null;
let currentUserDoc = null;
let userData = {
  username: '',
  email: '',
  coins: 1000,
  energy: 500,
  maxEnergy: 500,
  tapsTotal: 0,
  totalEarned: 1000,
  
  // Prestige system
  prestige: {
    lives: 0,
    multiplier: 1
  },
  
  // Ponds
  mines: {
    crypto: { level: 1, unlocked: false },
    lab: { level: 1, unlocked: false },
    turbo: { level: 1, unlocked: false }
  },
  
  // Cosmetics
  cosmetics: {
    glasses: false,
    hat: false,
    cape: false
  },
  
  // Lucky catch
  luckyCatch: {
    active: false,
    endTime: 0
  },
  
  // Daily rewards
  dailyRewards: {
    lastClaimDay: 0,
    streak: 0,
    lastClaimDate: null,
    available: true
  },
  
  // Weekly challenges
  weeklyChallenges: {
    weekStart: null,
    challenges: [
      { id: 'tap', description: 'Tap 1000 times', progress: 0, target: 1000, completed: false, reward: 5000 },
      { id: 'earn', description: 'Earn 10,000 🐟', progress: 0, target: 10000, completed: false, reward: 5000 },
      { id: 'unlock', description: 'Unlock 2 ponds', progress: 0, target: 2, completed: false, reward: 5000 },
      { id: 'upgrade', description: 'Upgrade any pond 5 times', progress: 0, target: 5, completed: false, reward: 5000 }
    ],
    weeklyBonus: false
  },
  
  // Achievements
  achievements: {
    tapMaster: { progress: 0, target: 10000, completed: false, reward: 10000 },
    tapGod: { progress: 0, target: 100000, completed: false, reward: 50000 },
    fishBeginner: { progress: 0, target: 100000, completed: false, reward: 10000 },
    fishExpert: { progress: 0, target: 1000000, completed: false, reward: 50000 },
    fishMaster: { progress: 0, target: 10000000, completed: false, reward: 100000 },
    firstLife: { progress: 0, target: 1, completed: false, reward: 20000 },
    nineLives: { progress: 0, target: 9, completed: false, reward: 100000 },
    fashionista: { progress: 0, target: 3, completed: false, reward: 15000 }
  },
  
  // Daily login tracking
  lastActive: null,
  consecutiveDays: 0,
  totalDaysActive: 0
};

// ===== DOM ELEMENTS =====
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showLoginBtn = document.getElementById('showLoginBtn');
const showSignupBtn = document.getElementById('showSignupBtn');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const signupUsername = document.getElementById('signupUsername');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const displayUsername = document.getElementById('displayUsername');
const coinDisplay = document.getElementById('coinDisplay');
const tapCat = document.getElementById('tapCat');
const prestigeBadge = document.getElementById('prestigeBadge');
const energyValue = document.getElementById('energyValue');
const energyFill = document.getElementById('energyFill');

// ============================================
// PART 2: AUTHENTICATION SYSTEM
// ============================================

// ===== AUTH TOGGLE =====
if (showLoginBtn && showSignupBtn) {
  showLoginBtn.addEventListener('click', () => {
    showLoginBtn.classList.add('active');
    showSignupBtn.classList.remove('active');
    loginForm.classList.remove('hidden');
    signupForm.classList.add('hidden');
    if (loginError) loginError.textContent = '';
  });

  showSignupBtn.addEventListener('click', () => {
    showSignupBtn.classList.add('active');
    showLoginBtn.classList.remove('active');
    signupForm.classList.remove('hidden');
    loginForm.classList.add('hidden');
    if (signupError) signupError.textContent = '';
  });
}

// ===== SIGNUP FUNCTION =====
if (signupBtn) {
  signupBtn.addEventListener('click', async () => {
    const username = signupUsername ? signupUsername.value.trim() : '';
    const email = signupEmail ? signupEmail.value.trim() : '';
    const password = signupPassword ? signupPassword.value.trim() : '';
    const confirmPass = signupConfirmPassword ? signupConfirmPassword.value.trim() : '';
    
    if (!username || !email || !password || !confirmPass) {
      if (signupError) signupError.textContent = 'All fields are required!';
      return;
    }
    
    if (password !== confirmPass) {
      if (signupError) signupError.textContent = 'Passwords do not match!';
      return;
    }
    
    if (password.length < 6) {
      if (signupError) signupError.textContent = 'Password must be at least 6 characters!';
      return;
    }
    
    if (!email.includes('@')) {
      if (signupError) signupError.textContent = 'Invalid email!';
      return;
    }
    
    try {
      if (signupError) signupError.textContent = 'Creating account...';
      
      const userCredential = await auth.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      const newUserData = {
        username: username,
        email: email,
        coins: 1000,
        energy: 500,
        maxEnergy: 500,
        tapsTotal: 0,
        totalEarned: 1000,
        prestige: { lives: 0, multiplier: 1 },
        mines: {
          crypto: { level: 1, unlocked: false },
          lab: { level: 1, unlocked: false },
          turbo: { level: 1, unlocked: false }
        },
        cosmetics: { glasses: false, hat: false, cape: false },
        dailyRewards: {
          lastClaimDay: 0,
          streak: 0,
          lastClaimDate: null,
          available: true
        },
        weeklyChallenges: {
          weekStart: Date.now(),
          challenges: [
            { id: 'tap', description: 'Tap 1000 times', progress: 0, target: 1000, completed: false, reward: 5000 },
            { id: 'earn', description: 'Earn 10,000 🐟', progress: 0, target: 10000, completed: false, reward: 5000 },
            { id: 'unlock', description: 'Unlock 2 ponds', progress: 0, target: 2, completed: false, reward: 5000 },
            { id: 'upgrade', description: 'Upgrade any pond 5 times', progress: 0, target: 5, completed: false, reward: 5000 }
          ],
          weeklyBonus: false
        },
        achievements: {
          tapMaster: { progress: 0, target: 10000, completed: false, reward: 10000 },
          tapGod: { progress: 0, target: 100000, completed: false, reward: 50000 },
          fishBeginner: { progress: 0, target: 100000, completed: false, reward: 10000 },
          fishExpert: { progress: 0, target: 1000000, completed: false, reward: 50000 },
          fishMaster: { progress: 0, target: 10000000, completed: false, reward: 100000 },
          firstLife: { progress: 0, target: 1, completed: false, reward: 20000 },
          nineLives: { progress: 0, target: 9, completed: false, reward: 100000 },
          fashionista: { progress: 0, target: 3, completed: false, reward: 15000 }
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('users').doc(user.uid).set(newUserData);
      
      if (signupError) signupError.textContent = 'Account created! Logging in...';
      await loginUser(email, password);
      
    } catch (error) {
      console.error('Signup error:', error);
      if (signupError) signupError.textContent = error.message;
    }
  });
}

// ===== LOGIN FUNCTION =====
if (loginBtn) {
  loginBtn.addEventListener('click', async () => {
    const email = loginEmail ? loginEmail.value.trim() : '';
    const password = loginPassword ? loginPassword.value.trim() : '';
    
    if (!email || !password) {
      if (loginError) loginError.textContent = 'Email and password required!';
      return;
    }
    
    await loginUser(email, password);
  });
}

async function loginUser(email, password) {
  try {
    if (loginError) loginError.textContent = 'Logging in...';
    
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const user = userCredential.user;
    currentUser = user;
    
    const doc = await db.collection('users').doc(user.uid).get();
    
    if (doc.exists) {
      const data = doc.data();
      userData = {
        ...userData,
        ...data,
        username: data.username || email.split('@')[0],
        email: data.email || email
      };
      
      currentUserDoc = doc;
      
      updateUI();
      checkDailyReward();
      checkWeeklyChallenges();
      checkAchievements();
      
      loginScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      
      startAutoMiner();
      startLuckyCatchChecker();
      startDailyTimer();
      
      // Load leaderboard on login with delay
      setTimeout(() => {
        loadLeaderboard();
      }, 500);
      
      if (loginError) loginError.textContent = '';
    }
  } catch (error) {
    console.error('Login error:', error);
    if (loginError) loginError.textContent = error.message;
  }
}

// ===== AUTO-LOGIN CHECK =====
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUser = user;
    
    const doc = await db.collection('users').doc(user.uid).get();
    
    if (doc.exists) {
      const data = doc.data();
      userData = {
        ...userData,
        ...data,
        username: data.username || user.email.split('@')[0],
        email: data.email || user.email
      };
      
      currentUserDoc = doc;
      
      updateUI();
      checkDailyReward();
      checkWeeklyChallenges();
      checkAchievements();
      
      loginScreen.classList.add('hidden');
      mainApp.classList.remove('hidden');
      
      startAutoMiner();
      startLuckyCatchChecker();
      startDailyTimer();
      
      // Load leaderboard on auto-login
      setTimeout(() => {
        loadLeaderboard();
      }, 500);
    }
  }
});

// ============================================
// PART 3: UI, CORE FUNCTIONS & TAB NAVIGATION
// ============================================

// ===== TAB NAVIGATION - FIXED =====
const navItems = document.querySelectorAll('.nav-item');
const panels = {
  cat: document.getElementById('panelCat'),
  ponds: document.getElementById('panelPonds'),
  shop: document.getElementById('panelShop'),
  prestige: document.getElementById('panelPrestige'),
  leaderboard: document.getElementById('panelLeaderboard') || document.getElementById('panelTop'),
  daily: document.getElementById('panelDaily'),
  challenges: document.getElementById('panelChallenges'),
  achievements: document.getElementById('panelAchievements')
};

console.log('Panels found:', panels);

// Add tab navigation event listeners
if (navItems.length > 0) {
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all nav items
      navItems.forEach(n => n.classList.remove('active'));
      // Add active class to clicked item
      item.classList.add('active');
      
      // Get tab name from data attribute
      const tab = item.dataset.tab;
      console.log('Switching to tab:', tab);
      
      // Hide all panels
      Object.values(panels).forEach(panel => {
        if (panel) panel.classList.remove('active-panel');
      });
      
      // Show selected panel
      if (panels[tab]) {
        panels[tab].classList.add('active-panel');
        
        // Update UI when switching to certain tabs
        if (tab === 'daily') {
          updateDailyUI();
        } else if (tab === 'challenges') {
          updateChallengesUI();
        } else if (tab === 'achievements') {
          updateAchievementsUI();
        } else if (tab === 'leaderboard') {
          console.log('Loading leaderboard for tab:', tab);
          loadLeaderboard();
        }
      } else {
        console.error('Panel not found for tab:', tab);
      }
    });
  });
}

// ===== LEADERBOARD FUNCTION - COMPLETE FIXED =====
async function loadLeaderboard() {
  console.log('Loading leaderboard...');
  
  // Make sure the panel exists
  let leaderboardList = document.getElementById('leaderboardList');
  let yourRank = document.getElementById('yourRank');
  
  if (!leaderboardList) {
    console.log('Leaderboard list not found, creating it...');
    const leaderboardPanel = document.getElementById('panelLeaderboard') || document.getElementById('panelTop');
    
    if (leaderboardPanel) {
      leaderboardPanel.innerHTML = `
        <div class="tap-header">🏆 TOP MASTERS</div>
        <div class="leaderboard-list" id="leaderboardList">
          <div class="leaderboard-item">Loading leaderboard...</div>
        </div>
        <div class="your-rank" id="yourRank"></div>
      `;
      leaderboardList = document.getElementById('leaderboardList');
      yourRank = document.getElementById('yourRank');
    } else {
      console.error('Leaderboard panel not found!');
      return;
    }
  }
  
  try {
    leaderboardList.innerHTML = '<div class="leaderboard-item">Loading leaderboard...</div>';
    
    // Get top 10 users by totalEarned
    const snapshot = await db.collection('users')
      .orderBy('totalEarned', 'desc')
      .limit(10)
      .get();
    
    if (snapshot.empty) {
      leaderboardList.innerHTML = '<div class="leaderboard-item">No players yet! Be the first!</div>';
      return;
    }
    
    let html = '';
    let rank = 1;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const username = data.username || 'Anonymous';
      const totalEarned = data.totalEarned || 0;
      
      // Add crown emoji for top 3
      let rankEmoji = '';
      if (rank === 1) rankEmoji = '👑 ';
      else if (rank === 2) rankEmoji = '🥈 ';
      else if (rank === 3) rankEmoji = '🥉 ';
      
      // Check if this is the current user
      const isCurrentUser = currentUser && doc.id === currentUser.uid;
      const highlightClass = isCurrentUser ? 'current-user' : '';
      
      html += `
        <div class="leaderboard-item ${rank <= 3 ? `top-${rank}` : ''} ${highlightClass}">
          <span>${rankEmoji}${rank}. ${username} ${isCurrentUser ? '(You)' : ''}</span>
          <span>${totalEarned.toLocaleString()} 🐟</span>
        </div>
      `;
      rank++;
    });
    
    leaderboardList.innerHTML = html;
    
    // Show user's rank
    if (currentUser && yourRank) {
      try {
        // Get all users to calculate rank
        const allUsersSnapshot = await db.collection('users')
          .orderBy('totalEarned', 'desc')
          .get();
        
        let userRank = 1;
        let found = false;
        
        allUsersSnapshot.forEach(doc => {
          if (doc.id === currentUser.uid) {
            found = true;
          }
          if (!found) {
            userRank++;
          }
        });
        
        const totalUsers = allUsersSnapshot.size;
        
        yourRank.innerHTML = `🏆 Your Rank: #${userRank} of ${totalUsers}`;
      } catch (rankError) {
        console.error('Error getting rank:', rankError);
        yourRank.innerHTML = `🏆 Your Rank: -- of --`;
      }
    }
  } catch (error) {
    console.error('Leaderboard error:', error);
    leaderboardList.innerHTML = '<div class="leaderboard-item">Error loading leaderboard. Please try again.</div>';
  }
}

// ===== UPDATE UI =====
function updateUI() {
  if (!currentUser) return;
  
  if (displayUsername) displayUsername.textContent = userData.username || 'Cat';
  if (coinDisplay) coinDisplay.textContent = Math.floor(userData.coins).toLocaleString();
  if (energyValue) energyValue.textContent = `${Math.floor(userData.energy)}/${userData.maxEnergy}`;
  if (energyFill) energyFill.style.width = `${(userData.energy / userData.maxEnergy) * 100}%`;
  if (prestigeBadge) prestigeBadge.textContent = `😺 ${userData.prestige?.lives || 0}`;
  
  updatePondUI();
  updateShopButtons();
  updatePrestigeInfo();
}

function updatePondUI() {
  const ponds = ['crypto', 'lab', 'turbo'];
  ponds.forEach((pond, index) => {
    const mineData = userData.mines?.[pond] || { level: 1, unlocked: false };
    const card = document.getElementById(`mine${index + 1}Card`);
    const btn = document.getElementById(`mine${index + 1}`);
    const priceSpan = document.getElementById(`unlockPrice${index + 1}`);
    const levelSpan = document.getElementById(`mineLvl${index + 1}`);
    const profitSpan = document.getElementById(`mineProfit${index + 1}`);
    
    if (card) {
      if (mineData.unlocked) {
        card.classList.remove('locked');
        card.classList.add('unlocked');
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '🎣';
        }
        if (priceSpan) priceSpan.innerHTML = `✅ lvl ${mineData.level}`;
      } else {
        card.classList.add('locked');
        card.classList.remove('unlocked');
        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '🔒';
        }
        if (priceSpan) priceSpan.innerHTML = `🔒 ${unlockPrices[pond].toLocaleString()}`;
      }
      
      if (levelSpan) levelSpan.textContent = mineData.level;
      if (profitSpan) profitSpan.textContent = mineData.level * profits[pond];
    }
  });
}

function updateShopButtons() {
  const items = ['glasses', 'hat', 'cape'];
  items.forEach(item => {
    const btn = document.getElementById(`${item}Btn`);
    if (btn) {
      if (userData.cosmetics?.[item]) {
        btn.textContent = '✓ OWNED';
        btn.classList.add('owned');
        btn.disabled = true;
      } else {
        const prices = { glasses: '5K', hat: '10K', cape: '25K' };
        btn.textContent = `${prices[item]} 🐟`;
        btn.classList.remove('owned');
        btn.disabled = false;
      }
    }
  });
}

function updatePrestigeInfo() {
  const livesSpan = document.getElementById('prestigeLives');
  const multiSpan = document.getElementById('prestigeMultiplier');
  const nextSpan = document.getElementById('nextPrestige');
  const progressBar = document.getElementById('prestigeProgress');
  
  if (livesSpan) livesSpan.textContent = userData.prestige?.lives || 0;
  if (multiSpan) multiSpan.textContent = `${userData.prestige?.multiplier || 1}x`;
  
  const nextPrestige = 100000 * Math.pow(2, userData.prestige?.lives || 0);
  if (nextSpan) nextSpan.textContent = `${nextPrestige.toLocaleString()} 🐟`;
  
  const progress = ((userData.totalEarned || 0) / nextPrestige) * 100;
  if (progressBar) progressBar.style.width = `${Math.min(progress, 100)}%`;
}

// ===== FLOATING NUMBERS =====
function createFloatingNumber(value, color = 'gold') {
  const container = document.getElementById('floatingNumbers');
  if (!container) return;
  
  const number = document.createElement('div');
  number.className = 'floating-number';
  number.textContent = typeof value === 'number' ? `+${Math.floor(value)}🐟` : value;
  number.style.left = `${Math.random() * 80 + 10}%`;
  number.style.top = '50%';
  container.appendChild(number);
  
  setTimeout(() => {
    number.remove();
  }, 1500);
}

// ===== LUCKY CATCH =====
function activateLuckyCatch() {
  userData.luckyCatch.active = true;
  userData.luckyCatch.endTime = Date.now() + 10000;
  
  const luckyCatch = document.getElementById('luckyCatch');
  if (luckyCatch) luckyCatch.classList.remove('hidden');
  
  const timer = setInterval(() => {
    const remaining = Math.max(0, userData.luckyCatch.endTime - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    
    const luckyTimer = document.getElementById('luckyTimer');
    if (luckyTimer) luckyTimer.textContent = `${seconds}s`;
    
    if (remaining <= 0) {
      userData.luckyCatch.active = false;
      if (luckyCatch) luckyCatch.classList.add('hidden');
      clearInterval(timer);
    }
  }, 100);
}

function startLuckyCatchChecker() {
  setInterval(() => {
    if (userData.luckyCatch.active && Date.now() > userData.luckyCatch.endTime) {
      userData.luckyCatch.active = false;
      const luckyCatch = document.getElementById('luckyCatch');
      if (luckyCatch) luckyCatch.classList.add('hidden');
    }
  }, 100);
}

// ===== TAP FUNCTION =====
if (tapCat) {
  tapCat.addEventListener('click', () => {
    if (!currentUser) return;
    if (userData.energy < 1) {
      alert('⚡ No energy!');
      return;
    }
    
    let tapValue = 1 * (userData.prestige?.multiplier || 1);
    
    if (userData.luckyCatch?.active) {
      tapValue *= 10;
    }
    
    userData.coins += tapValue;
    userData.totalEarned += tapValue;
    userData.energy -= 1;
    userData.tapsTotal = (userData.tapsTotal || 0) + 1;
    
    if (userData.weeklyChallenges) {
      updateChallengeProgress('tap', 1);
      updateChallengeProgress('earn', tapValue);
    }
    
    checkAchievements();
    createFloatingNumber(tapValue);
    
    if (Math.random() < 0.01 && !userData.luckyCatch?.active) {
      activateLuckyCatch();
    }
    
    tapCat.style.transform = 'scale(0.9) rotate(-2deg)';
    setTimeout(() => {
      tapCat.style.transform = '';
    }, 100);
    
    updateUI();
    saveUserData();
  });
}

// ===== SAVE USER DATA =====
async function saveUserData() {
  if (!currentUser) return;
  
  try {
    await db.collection('users').doc(currentUser.uid).set({
      ...userData,
      lastActive: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Save error:', error);
  }
}

// ============================================
// PART 4: MINING, RETENTION SYSTEMS & PANEL CREATION - FIXED
// ============================================

// ===== POND FUNCTIONS =====
if (document.getElementById('mine1Card')) {
  document.getElementById('mine1Card').addEventListener('click', () => unlockPond('crypto'));
}
if (document.getElementById('mine2Card')) {
  document.getElementById('mine2Card').addEventListener('click', () => unlockPond('lab'));
}
if (document.getElementById('mine3Card')) {
  document.getElementById('mine3Card').addEventListener('click', () => unlockPond('turbo'));
}

function unlockPond(pond) {
  if (!currentUser) return;
  
  if (!userData.mines) userData.mines = {};
  if (!userData.mines[pond]) userData.mines[pond] = { level: 1, unlocked: false };
  
  const price = unlockPrices[pond];
  
  if (userData.mines[pond].unlocked) {
    minePond(pond);
    return;
  }
  
  if (userData.coins < price) {
    alert(`❌ Need ${price.toLocaleString()} 🐟 to unlock!`);
    return;
  }
  
  userData.coins -= price;
  userData.mines[pond].unlocked = true;
  
  if (userData.weeklyChallenges) {
    const unlockedCount = Object.values(userData.mines).filter(m => m?.unlocked).length;
    updateChallengeProgress('unlock', unlockedCount);
  }
  
  createFloatingNumber(-price);
  updateUI();
  saveUserData();
  alert(`🎉 ${pond.toUpperCase()} UNLOCKED!`);
  checkAchievements();
}

function minePond(pond) {
  if (!currentUser) return;
  if (userData.energy < 10) {
    alert('❌ Need 10 energy to mine!');
    return;
  }
  
  const level = userData.mines[pond]?.level || 1;
  let reward = level * profits[pond] * (userData.prestige?.multiplier || 1);
  
  if (userData.luckyCatch?.active) {
    reward *= 10;
  }
  
  userData.coins += reward;
  userData.totalEarned += reward;
  userData.energy -= 10;
  userData.tapsTotal = (userData.tapsTotal || 0) + 1;
  
  if (userData.weeklyChallenges) {
    updateChallengeProgress('earn', reward);
  }
  
  createFloatingNumber(reward);
  
  if (Math.random() < 0.01 && !userData.luckyCatch?.active) {
    activateLuckyCatch();
  }
  
  const mineBtn = document.getElementById(`mine${pond === 'crypto' ? '1' : pond === 'lab' ? '2' : '3'}`);
  if (mineBtn) {
    mineBtn.style.transform = 'scale(0.8)';
    setTimeout(() => {
      mineBtn.style.transform = '';
    }, 100);
  }
  
  updateUI();
  saveUserData();
  checkAchievements();
}

// ===== UPGRADE FUNCTIONS =====
function upgradePond(pond) {
  if (!currentUser) return;
  
  if (!userData.mines[pond]?.unlocked) {
    alert(`❌ Unlock the ${pond} first!`);
    return;
  }
  
  const cost = upgradeCosts[pond] * Math.pow(1.5, userData.mines[pond].level - 1);
  
  if (userData.coins < cost) {
    alert(`❌ Need ${Math.floor(cost).toLocaleString()} 🐟 to upgrade!`);
    return;
  }
  
  userData.coins -= cost;
  userData.mines[pond].level += 1;
  
  if (userData.weeklyChallenges) {
    updateChallengeProgress('upgrade', 1);
  }
  
  createFloatingNumber(-cost);
  updateUI();
  saveUserData();
  
  alert(`⬆️ ${pond.toUpperCase()} upgraded to level ${userData.mines[pond].level}!`);
  checkAchievements();
}

// ===== SHOP FUNCTIONS =====
if (document.getElementById('glassesBtn')) {
  document.getElementById('glassesBtn').addEventListener('click', () => buyItem('glasses', 5000));
}
if (document.getElementById('hatBtn')) {
  document.getElementById('hatBtn').addEventListener('click', () => buyItem('hat', 10000));
}
if (document.getElementById('capeBtn')) {
  document.getElementById('capeBtn').addEventListener('click', () => buyItem('cape', 25000));
}

function buyItem(item, price) {
  if (!currentUser) return;
  
  if (!userData.cosmetics) userData.cosmetics = {};
  
  if (userData.cosmetics[item]) {
    alert('Already owned!');
    return;
  }
  
  if (userData.coins < price) {
    alert(`❌ Need ${price.toLocaleString()} 🐟!`);
    return;
  }
  
  userData.coins -= price;
  userData.cosmetics[item] = true;
  
  createFloatingNumber(-price);
  updateUI();
  saveUserData();
  alert(`🎉 ${item} purchased!`);
  checkAchievements();
}

// ===== PRESTIGE FUNCTION =====
if (document.getElementById('prestigeBtn')) {
  document.getElementById('prestigeBtn').addEventListener('click', () => {
    if (!currentUser) return;
    
    if (!userData.prestige) userData.prestige = { lives: 0, multiplier: 1 };
    
    const nextPrestige = 100000 * Math.pow(2, userData.prestige.lives);
    
    if (userData.totalEarned < nextPrestige) {
      alert(`❌ Need ${nextPrestige.toLocaleString()} total fish!`);
      return;
    }
    
    if (userData.prestige.lives >= 9) {
      alert('🌟 MAX LIVES REACHED!');
      return;
    }
    
    const confirmed = confirm('Prestige will reset your progress but give 2x multiplier! Continue?');
    
    if (confirmed) {
      userData.prestige.lives += 1;
      userData.prestige.multiplier *= 2;
      userData.coins = 1000;
      userData.totalEarned = 1000;
      userData.mines = {
        crypto: { level: 1, unlocked: false },
        lab: { level: 1, unlocked: false },
        turbo: { level: 1, unlocked: false }
      };
      userData.cosmetics = { glasses: false, hat: false, cape: false };
      
      updateUI();
      saveUserData();
      alert(`🌟 PRESTIGE ${userData.prestige.lives}! Multiplier: ${userData.prestige.multiplier}x`);
      checkAchievements();
    }
  });
}

// ===== AUTO MINER =====
function startAutoMiner() {
  setInterval(() => {
    if (!currentUser || !mainApp || mainApp.classList.contains('hidden')) return;
    
    let totalMined = 0;
    
    if (userData.mines) {
      Object.keys(userData.mines).forEach(pond => {
        if (userData.mines[pond]?.unlocked) {
          const level = userData.mines[pond]?.level || 1;
          const baseProfit = profits[pond] || 5;
          totalMined += (level * baseProfit) / 10;
        }
      });
    }
    
    if (totalMined > 0) {
      totalMined *= (userData.prestige?.multiplier || 1);
      userData.coins += totalMined;
      userData.totalEarned += totalMined;
      
      if (Math.random() < 0.1) updateUI();
      if (userData.weeklyChallenges && Math.random() < 0.1) {
        updateChallengeProgress('earn', totalMined);
      }
    }
    
    if (userData.energy < userData.maxEnergy) {
      userData.energy = Math.min(userData.energy + 1, userData.maxEnergy);
      if (Math.random() < 0.1) updateUI();
    }
    
    if (Math.random() < 0.02) saveUserData();
  }, 1000);
}

// ===== DAILY REWARDS =====
function checkDailyReward() {
  if (!currentUser) return;
  
  const today = new Date().toDateString();
  const lastClaim = userData.dailyRewards.lastClaimDate;
  
  if (!lastClaim) {
    userData.dailyRewards.available = true;
    userData.dailyRewards.streak = 1;
    userData.dailyRewards.lastClaimDay = 0;
  } else if (lastClaim !== today) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (new Date(lastClaim).toDateString() === yesterday.toDateString()) {
      userData.dailyRewards.streak = Math.min(userData.dailyRewards.streak + 1, 7);
    } else {
      userData.dailyRewards.streak = 1;
    }
    
    userData.dailyRewards.available = true;
    userData.dailyRewards.lastClaimDay = (userData.dailyRewards.lastClaimDay + 1) % 7;
  }
  
  updateDailyUI();
}

function claimDailyReward() {
  if (!currentUser) return;
  if (!userData.dailyRewards.available) {
    alert('Already claimed today! Come back tomorrow!');
    return;
  }
  
  const dayIndex = userData.dailyRewards.streak - 1;
  const reward = DAILY_REWARDS[dayIndex];
  
  if (reward.type === 'coins') {
    userData.coins += reward.reward;
    createFloatingNumber(reward.reward, 'gold');
  } else if (reward.type === 'energy') {
    userData.energy = Math.min(userData.energy + reward.reward, userData.maxEnergy);
  }
  
  userData.dailyRewards.lastClaimDate = new Date().toDateString();
  userData.dailyRewards.available = false;
  
  if (userData.dailyRewards.streak === 7) {
    userData.weeklyChallenges.weeklyBonus = true;
    userData.coins += 20000;
    createFloatingNumber(20000, 'rainbow');
    alert('🎉 WEEKLY BONUS! +20,000 🐟');
  }
  
  userData.consecutiveDays = Math.max(userData.consecutiveDays, userData.dailyRewards.streak);
  userData.totalDaysActive += 1;
  
  updateDailyUI();
  saveUserData();
  celebrateDailyReward();
}

// Add claim daily button listener
if (document.getElementById('claimDailyBtn')) {
  document.getElementById('claimDailyBtn').addEventListener('click', claimDailyReward);
}

function updateDailyUI() {
  const streak = userData.dailyRewards.streak;
  const grid = document.getElementById('dailyGrid');
  if (!grid) return;
  
  const currentStreakEl = document.getElementById('currentStreak');
  if (currentStreakEl) currentStreakEl.textContent = streak;
  
  let html = '';
  for (let i = 0; i < 7; i++) {
    const day = i + 1;
    const reward = DAILY_REWARDS[i];
    const isCompleted = i < streak;
    const isCurrent = i === streak - 1 && userData.dailyRewards.available;
    
    html += `
      <div class="daily-box ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}">
        <div class="day">Day ${day}</div>
        <div class="reward">${reward.reward} ${reward.type === 'coins' ? '🐟' : '⚡'}</div>
        ${isCompleted ? '<div class="check">✓</div>' : ''}
      </div>
    `;
  }
  
  grid.innerHTML = html;
  
  const bonusBar = document.getElementById('bonusBar');
  if (bonusBar) {
    const bonusPercent = (streak / 7) * 100;
    bonusBar.style.width = `${bonusPercent}%`;
  }
}

function celebrateDailyReward() {
  for (let i = 0; i < 50; i++) {
    setTimeout(() => {
      createFloatingNumber('✨', 'rainbow');
    }, i * 50);
  }
}

function startDailyTimer() {
  setInterval(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    const nextReset = document.getElementById('nextReset');
    if (nextReset) {
      nextReset.textContent = `Next reset in: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
  }, 1000);
}

// ===== WEEKLY CHALLENGES =====
function checkWeeklyChallenges() {
  const now = Date.now();
  const weekInMs = 7 * 24 * 60 * 60 * 1000;
  
  if (!userData.weeklyChallenges.weekStart || 
      now - userData.weeklyChallenges.weekStart > weekInMs) {
    resetWeeklyChallenges();
  }
}

function resetWeeklyChallenges() {
  userData.weeklyChallenges = {
    weekStart: Date.now(),
    challenges: [
      { id: 'tap', description: 'Tap 1000 times', progress: 0, target: 1000, completed: false, reward: 5000 },
      { id: 'earn', description: 'Earn 10,000 🐟', progress: 0, target: 10000, completed: false, reward: 5000 },
      { id: 'unlock', description: 'Unlock 2 ponds', progress: 0, target: 2, completed: false, reward: 5000 },
      { id: 'upgrade', description: 'Upgrade any pond 5 times', progress: 0, target: 5, completed: false, reward: 5000 }
    ],
    weeklyBonus: false
  };
}

function updateChallengeProgress(challengeId, amount) {
  const challenge = userData.weeklyChallenges.challenges.find(c => c.id === challengeId);
  if (!challenge || challenge.completed) return;
  
  challenge.progress = Math.min(challenge.progress + amount, challenge.target);
  
  if (challenge.progress >= challenge.target && !challenge.completed) {
    claimChallengeReward(challenge);
  }
  
  updateChallengesUI();
}

function claimChallengeReward(challenge) {
  challenge.completed = true;
  userData.coins += challenge.reward;
  createFloatingNumber(challenge.reward, 'gold');
  
  const allCompleted = userData.weeklyChallenges.challenges.every(c => c.completed);
  if (allCompleted && !userData.weeklyChallenges.weeklyBonus) {
    userData.weeklyChallenges.weeklyBonus = true;
    userData.coins += 20000;
    createFloatingNumber(20000, 'rainbow');
    alert('🎉 ALL CHALLENGES COMPLETE! +20,000 🐟');
  }
}

function updateChallengesUI() {
  const list = document.getElementById('challengesList');
  if (!list) return;
  
  let html = '';
  userData.weeklyChallenges.challenges.forEach(challenge => {
    const percent = (challenge.progress / challenge.target) * 100;
    html += `
      <div class="challenge-card ${challenge.completed ? 'completed' : ''}">
        <div class="challenge-info">
          <span class="challenge-desc">${challenge.description}</span>
          <span class="challenge-progress">${challenge.progress}/${challenge.target}</span>
        </div>
        <div class="challenge-bar-bg">
          <div class="challenge-bar-fill" style="width: ${percent}%"></div>
        </div>
        <div class="challenge-reward">🎁 ${challenge.reward} 🐟</div>
        ${challenge.completed ? '<div class="challenge-check">✓</div>' : ''}
      </div>
    `;
  });
  
  list.innerHTML = html;
}

// ===== ACHIEVEMENTS =====
function checkAchievements() {
  const achievements = userData.achievements;
  
  achievements.tapMaster.progress = userData.tapsTotal;
  if (userData.tapsTotal >= 10000 && !achievements.tapMaster.completed) {
    completeAchievement('tapMaster');
  }
  
  achievements.tapGod.progress = userData.tapsTotal;
  if (userData.tapsTotal >= 100000 && !achievements.tapGod.completed) {
    completeAchievement('tapGod');
  }
  
  achievements.fishBeginner.progress = userData.totalEarned;
  if (userData.totalEarned >= 100000 && !achievements.fishBeginner.completed) {
    completeAchievement('fishBeginner');
  }
  
  achievements.fishExpert.progress = userData.totalEarned;
  if (userData.totalEarned >= 1000000 && !achievements.fishExpert.completed) {
    completeAchievement('fishExpert');
  }
  
  achievements.fishMaster.progress = userData.totalEarned;
  if (userData.totalEarned >= 10000000 && !achievements.fishMaster.completed) {
    completeAchievement('fishMaster');
  }
  
  achievements.firstLife.progress = userData.prestige.lives;
  if (userData.prestige.lives >= 1 && !achievements.firstLife.completed) {
    completeAchievement('firstLife');
  }
  
  achievements.nineLives.progress = userData.prestige.lives;
  if (userData.prestige.lives >= 9 && !achievements.nineLives.completed) {
    completeAchievement('nineLives');
  }
  
  const ownedCosmetics = Object.values(userData.cosmetics).filter(v => v).length;
  achievements.fashionista.progress = ownedCosmetics;
  if (ownedCosmetics >= 3 && !achievements.fashionista.completed) {
    completeAchievement('fashionista');
  }
  
  updateAchievementsUI();
}

function completeAchievement(achievementId) {
  const achievement = userData.achievements[achievementId];
  if (!achievement || achievement.completed) return;
  
  achievement.completed = true;
  userData.coins += achievement.reward;
  
  createFloatingNumber(achievement.reward, 'rainbow');
  alert(`🏆 ACHIEVEMENT UNLOCKED! +${achievement.reward} 🐟`);
}

function updateAchievementsUI() {
  const grid = document.getElementById('achievementsGrid');
  if (!grid) return;
  
  const achievements = userData.achievements;
  const achievementNames = {
    tapMaster: '🐱 Tap Master',
    tapGod: '👑 Tap God',
    fishBeginner: '🐟 Fish Beginner',
    fishExpert: '🎣 Fish Expert',
    fishMaster: '🐋 Fish Master',
    firstLife: '🌟 First Life',
    nineLives: '🐱 Nine Lives',
    fashionista: '👗 Fashionista'
  };
  
  let html = '';
  let completedCount = 0;
  
  Object.keys(achievements).forEach(key => {
    const ach = achievements[key];
    if (ach.completed) completedCount++;
    
    const percent = (ach.progress / ach.target) * 100;
    html += `
      <div class="achievement-card ${ach.completed ? 'completed' : ''}">
        <div class="achievement-icon">${achievementNames[key]?.split(' ')[0] || '🏆'}</div>
        <div class="achievement-info">
          <div class="achievement-name">${achievementNames[key] || key}</div>
          <div class="achievement-progress">${ach.progress}/${ach.target}</div>
          <div class="achievement-bar-bg">
            <div class="achievement-bar-fill" style="width: ${percent}%"></div>
          </div>
          <div class="achievement-reward">🎁 ${ach.reward} 🐟</div>
        </div>
      </div>
    `;
  });
  
  grid.innerHTML = html;
  
  const achievementCount = document.getElementById('achievementCount');
  const totalAchievements = document.getElementById('totalAchievements');
  
  if (achievementCount) achievementCount.textContent = completedCount;
  if (totalAchievements) totalAchievements.textContent = Object.keys(achievements).length;
}

// ===== ADD ALL PANELS - COMPLETE FIXED =====
function addAllPanels() {
  const contentArea = document.getElementById('contentArea');
  if (!contentArea) return;
  
  // Add Leaderboard Panel - Use 'panelLeaderboard' ID to match data-tab="leaderboard"
  if (!document.getElementById('panelLeaderboard') && !document.getElementById('panelTop')) {
    const leaderboardDiv = document.createElement('div');
    leaderboardDiv.id = 'panelLeaderboard';
    leaderboardDiv.className = 'tab-panel';
    leaderboardDiv.innerHTML = `
      <div class="tap-header">🏆 TOP MASTERS</div>
      <div class="leaderboard-list" id="leaderboardList">
        <div class="leaderboard-item">Loading leaderboard...</div>
      </div>
      <div class="your-rank" id="yourRank"></div>
    `;
    contentArea.appendChild(leaderboardDiv);
    console.log('Created leaderboard panel with ID: panelLeaderboard');
    
    // Update the panels object
    panels.leaderboard = leaderboardDiv;
  }
  
  // Add Daily Panel
  if (!document.getElementById('panelDaily')) {
    const dailyDiv = document.createElement('div');
    dailyDiv.id = 'panelDaily';
    dailyDiv.className = 'tab-panel';
    dailyDiv.innerHTML = `
      <div class="tap-header">📅 DAILY REWARDS</div>
      <div class="streak-counter" id="streakCounter">
        <div class="streak-flame">🔥</div>
        <div class="streak-days">Day <span id="currentStreak">0</span></div>
      </div>
      <div class="daily-grid" id="dailyGrid"></div>
      <button class="claim-daily-btn" id="claimDailyBtn">CLAIM REWARD</button>
      <div class="next-reset" id="nextReset">Next reset in: --:--:--</div>
      <div class="weekly-bonus" id="weeklyBonus">
        <h3>🎁 WEEKLY BONUS</h3>
        <p>Claim all 7 days for a MEGA reward!</p>
        <div class="bonus-progress">
          <div class="bonus-bar" id="bonusBar" style="width: 0%"></div>
        </div>
      </div>
    `;
    contentArea.appendChild(dailyDiv);
    panels.daily = dailyDiv;
  }
  
  // Add Challenges Panel
  if (!document.getElementById('panelChallenges')) {
    const challengesDiv = document.createElement('div');
    challengesDiv.id = 'panelChallenges';
    challengesDiv.className = 'tab-panel';
    challengesDiv.innerHTML = `
      <div class="tap-header">🎯 WEEKLY CHALLENGES</div>
      <div class="challenges-list" id="challengesList"></div>
      <div class="challenge-reset">Resets in: 7 days</div>
    `;
    contentArea.appendChild(challengesDiv);
    panels.challenges = challengesDiv;
  }
  
  // Add Achievements Panel
  if (!document.getElementById('panelAchievements')) {
    const achievementsDiv = document.createElement('div');
    achievementsDiv.id = 'panelAchievements';
    achievementsDiv.className = 'tab-panel';
    achievementsDiv.innerHTML = `
      <div class="tap-header">🏆 ACHIEVEMENTS</div>
      <div class="achievement-stats">
        <span>Completed: <span id="achievementCount">0</span>/<span id="totalAchievements">8</span></span>
      </div>
      <div class="achievements-grid" id="achievementsGrid"></div>
    `;
    contentArea.appendChild(achievementsDiv);
    panels.achievements = achievementsDiv;
  }
  
  // Add upgrade buttons to ponds panel with proper styling
  const pondsPanel = document.getElementById('panelPonds');
  if (pondsPanel && !document.getElementById('upgradeCryptoBtn')) {
    const upgradeSection = document.createElement('div');
    upgradeSection.className = 'upgrade-section';
    upgradeSection.innerHTML = `
      <div class="tap-header">⬆️ UPGRADE PONDS</div>
      <div class="upgrade-grid">
        <div class="upgrade-item">
          <span>🐟 Fish Pond</span>
          <button class="upgrade-btn" id="upgradeCryptoBtn">Upgrade</button>
        </div>
        <div class="upgrade-item">
          <span>🐠 Goldfish Lake</span>
          <button class="upgrade-btn" id="upgradeLabBtn">Upgrade</button>
        </div>
        <div class="upgrade-item">
          <span>🐋 Whale Spot</span>
          <button class="upgrade-btn" id="upgradeTurboBtn">Upgrade</button>
        </div>
      </div>
    `;
    pondsPanel.appendChild(upgradeSection);
    
    // Add event listeners for upgrade buttons
    document.getElementById('upgradeCryptoBtn').addEventListener('click', () => upgradePond('crypto'));
    document.getElementById('upgradeLabBtn').addEventListener('click', () => upgradePond('lab'));
    document.getElementById('upgradeTurboBtn').addEventListener('click', () => upgradePond('turbo'));
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  console.log('✅ Cat Kombat loaded with leaderboard and styled upgrades!');
  
  // Add all panels
  addAllPanels();
  
  // Make sure login screen is visible
  if (loginScreen) loginScreen.classList.remove('hidden');
  if (mainApp) mainApp.classList.add('hidden');
  
  // Set default active tab
  const defaultTab = document.querySelector('[data-tab="cat"]');
  if (defaultTab) {
    defaultTab.classList.add('active');
    if (panels.cat) panels.cat.classList.add('active-panel');
  }
});