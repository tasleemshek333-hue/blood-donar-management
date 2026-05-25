/* ============================================
   BloodLink — Shared JavaScript
   ============================================ */

// ---- Navbar Scroll Effect ----
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (navbar) {
        if (window.scrollY > 20) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    }
});

// ---- Mobile Nav Toggle ----
function toggleNav() {
    const navLinks = document.getElementById('navLinks');
    const toggle = document.getElementById('navToggle');
    if (navLinks) {
        navLinks.classList.toggle('open');
        toggle.classList.toggle('active');
    }
}

// Close mobile nav when clicking a link
document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const nav = document.getElementById('navLinks');
            if (nav) nav.classList.remove('open');
        });
    });
});

// ---- Toast Notification System ----
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">✕</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        toast.style.transition = 'all 0.4s ease';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ---- Scroll Reveal Animation ----
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    reveals.forEach(el => observer.observe(el));
}

document.addEventListener('DOMContentLoaded', initScrollReveal);

// ---- Smooth Scroll for Anchor Links ----
document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (link) {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
});

// ---- Format Date Helper ----
function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// ---- Format Time Ago ----
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(dateStr);
}

// ---- Page Loading Animation ----
document.addEventListener('DOMContentLoaded', () => {
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.4s ease';
    requestAnimationFrame(() => {
        document.body.style.opacity = '1';
    });
});

// ---- Active Nav Link Highlighting ----
document.addEventListener('DOMContentLoaded', () => {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a:not(.nav-cta)');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        } else if (href !== '/' && currentPath.startsWith(href)) {
            link.classList.add('active');
        }
    });
});

/* ==========================================================================
   RedLife Extensions (Liquid Jars Renderer & Screening Quiz)
   ========================================================================== */

// 1. Live Jars reserves loader & renderer
function renderFlasks(bloodGroupStats) {
    const container = document.getElementById("flasks-grid-homepage");
    if (!container) return;
    container.innerHTML = "";

    const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
    const baseLevels = {
        "A+": 68, "A-": 42, "B+": 58, "B-": 28,
        "AB+": 82, "AB-": 18, "O+": 60, "O-": 12
    };

    const statsMap = {};
    if (bloodGroupStats && Array.isArray(bloodGroupStats)) {
        bloodGroupStats.forEach(stat => {
            if (stat._id) statsMap[stat._id] = stat.count;
        });
    }

    bloodTypes.forEach(type => {
        const liveCount = statsMap[type] || 0;
        let level = baseLevels[type] + (liveCount * 6);
        level = Math.min(100, Math.max(10, level)); // Cap level between 10% and 100%

        let statusClass = "healthy";
        if (level < 25) {
            statusClass = "critical";
        } else if (level < 50) {
            statusClass = "low";
        }

        const card = document.createElement("div");
        card.className = `flask-card ${statusClass}`;
        card.innerHTML = `
            <div class="flask-outer">
                <div class="flask-liquid" style="height: ${level}%;"></div>
                <div class="flask-level-text">${level}%</div>
            </div>
            <div class="flask-info">
                <h4>${type}</h4>
                <p class="${statusClass}">${statusClass}</p>
            </div>
        `;
        container.appendChild(card);
    });
}

async function loadLiveReserves() {
    const container = document.getElementById("flasks-grid-homepage");
    if (!container) return;

    try {
        const res = await fetch('/api/donors/stats');
        const data = await res.json();
        if (data.success && data.stats) {
            renderFlasks(data.stats.bloodGroupStats);
        } else {
            renderFlasks([]);
        }
    } catch (err) {
        renderFlasks([]);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadLiveReserves();
});

// 2. Eligibility quiz screening controls
const QUIZ_QUESTIONS = [
    {
        q: "Are you feeling active and healthy today, free from cold, flu, fever, or infectious symptoms?",
        failMessage: "To protect patients and your own health, you must be 100% free of cold/flu symptoms to donate blood today."
    },
    {
        q: "Are you between 18 and 65 years old, and weigh at least 50 kg (110 lbs)?",
        failMessage: "Donors must meet strict age (18-65) and minimum weight (50kg/110lbs) requirements for safety reasons."
    },
    {
        q: "Have you donated whole blood in the last 56 days (8 weeks)?",
        isFlipped: true, // NO is the correct answer
        failMessage: "A minimum interval of 56 days is mandatory between successive whole blood donations to rebuild red cell reserves."
    },
    {
        q: "Have you received any tattoos, body piercings, or minor surgical procedures in the last 6 months?",
        isFlipped: true, // NO is the correct answer
        failMessage: "Tattoos, piercings, and minor surgical procedures impose a temporary 6-month deferral safety period."
    },
    {
        q: "Are you currently pregnant, nursing, or taking prescription antibiotics?",
        isFlipped: true, // NO is the correct answer
        failMessage: "Pregnancy, breastfeeding, and active antibiotic medications require temporary deferrals."
    }
];

let quizCurrentIndex = 0;

function startEligibilityQuiz() {
    document.getElementById("quiz-start-view").classList.add("hidden");
    document.getElementById("quiz-active-view").classList.remove("hidden");
    document.getElementById("quiz-result-view").classList.add("hidden");

    quizCurrentIndex = 0;
    showQuizQuestion();
}

function showQuizQuestion() {
    const q = QUIZ_QUESTIONS[quizCurrentIndex];
    document.getElementById("quiz-step-title").innerText = `Question ${quizCurrentIndex + 1} of ${QUIZ_QUESTIONS.length}`;
    document.getElementById("quiz-question-text").innerText = q.q;

    const progress = ((quizCurrentIndex) / QUIZ_QUESTIONS.length) * 100;
    document.getElementById("quiz-progress-indicator").style.width = `${progress}%`;
}

function handleQuizAnswer(answer) {
    const q = QUIZ_QUESTIONS[quizCurrentIndex];
    const isFailed = q.isFlipped ? (answer === true) : (answer === false);

    if (isFailed) {
        showQuizFailure(q.failMessage);
        return;
    }

    quizCurrentIndex++;

    if (quizCurrentIndex >= QUIZ_QUESTIONS.length) {
        showQuizSuccess();
    } else {
        showQuizQuestion();
    }
}

function showQuizSuccess() {
    document.getElementById("quiz-active-view").classList.add("hidden");
    const resultView = document.getElementById("quiz-result-view");
    resultView.classList.remove("hidden");

    document.getElementById("quiz-progress-indicator").style.width = "100%";

    resultView.innerHTML = `
        <div class="quiz-result-header">
            <div class="quiz-result-icon success">
                ✓
            </div>
            <h4 class="card-title" style="font-size: 1.3rem; text-align: center; margin-top: 10px;">Screening Passed!</h4>
        </div>
        <p class="card-text text-center" style="margin: 10px 0 20px 0; color: var(--text-secondary); line-height: 1.5;">Excellent! You satisfy all core health screening guidelines. You are fully eligible to donate blood today.</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
            <a href="/register" class="btn btn-primary" style="padding: 10px 24px; font-size: 0.9rem; border-radius: 100px;">
                🩸 Register as Donor
            </a>
            <button class="btn btn-secondary" onclick="cancelQuiz()" style="padding: 10px 24px; font-size: 0.9rem; border-radius: 100px;">
                Done
            </button>
        </div>
    `;

    showToast("Screening Passed! You are eligible to donate today.", "success");
}

function showQuizFailure(failMessage) {
    document.getElementById("quiz-active-view").classList.add("hidden");
    const resultView = document.getElementById("quiz-result-view");
    resultView.classList.remove("hidden");

    resultView.innerHTML = `
        <div class="quiz-result-header">
            <div class="quiz-result-icon fail">
                ✕
            </div>
            <h4 class="card-title" style="font-size: 1.3rem; text-align: center; margin-top: 10px; color: var(--primary);">Screening Deferred</h4>
        </div>
        <p class="card-text text-center" style="margin: 10px 0 20px 0; color: var(--text-secondary); line-height: 1.5;">${failMessage}</p>
        <p class="card-text text-center" style="margin-bottom: 20px; font-size: 0.85rem; color: var(--text-muted);">For your safety, we advise against donating blood today. Thank you for your care—your health comes first!</p>
        <button class="btn btn-secondary" onclick="cancelQuiz()" style="padding: 10px 24px; font-size: 0.9rem; border-radius: 100px; width: 100%;">
            ✕ Close & Try Again
        </button>
    `;

    showToast("Screening Deferred. You do not meet requirements today.", "warning");
}

function cancelQuiz() {
    document.getElementById("quiz-start-view").classList.remove("hidden");
    document.getElementById("quiz-active-view").classList.add("hidden");
    document.getElementById("quiz-result-view").classList.add("hidden");
}

// ---- Dynamic Navbar and Redirection for Logged In Sessions ----
async function checkNavbarSession() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.user) {
                const role = data.user.role;
                const currentPath = window.location.pathname;
                
                // Redirect logged-in users away from the generic guest pages to their respective dashboards
                if (currentPath === '/' || currentPath === '/index.html') {
                    if (role === 'donor') {
                        window.location.href = '/dashboard-donor';
                        return;
                    } else if (role === 'requester') {
                        window.location.href = '/dashboard-requester';
                        return;
                    } else if (role === 'admin') {
                        window.location.href = '/dashboard-admin';
                        return;
                    }
                }
                
                const navLogo = document.querySelector('.nav-logo');
                if (navLogo) {
                    if (role === 'donor') {
                        navLogo.setAttribute('href', '/dashboard-donor');
                    } else if (role === 'requester') {
                        navLogo.setAttribute('href', '/dashboard-requester');
                    } else if (role === 'admin') {
                        navLogo.setAttribute('href', '/dashboard-admin');
                    }
                }
                
                const navLinks = document.getElementById('navLinks');
                if (navLinks) {
                    if (role === 'donor') {
                        navLinks.innerHTML = `
                            <a href="/search" class="${currentPath === '/search' ? 'active' : ''}">Find Donors</a>
                            <a href="/emergency" class="${currentPath === '/emergency' ? 'active' : ''}">Emergency Alert</a>
                            <button onclick="handleLogout()" class="nav-cta" style="background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; cursor: pointer; border-radius: 8px; padding: 8px 16px; font-size: 0.85rem; font-weight: 600;">🚪 Logout</button>
                        `;
                    } else if (role === 'requester') {
                        navLinks.innerHTML = `
                            <a href="/search" class="${currentPath === '/search' ? 'active' : ''}">Find Donors</a>
                            <button onclick="handleLogout()" class="nav-cta" style="background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; cursor: pointer; border-radius: 8px; padding: 8px 16px; font-size: 0.85rem; font-weight: 600;">🚪 Logout</button>
                        `;
                    } else if (role === 'admin') {
                        navLinks.innerHTML = `
                            <button onclick="handleLogout()" class="nav-cta" style="background: rgba(231,76,60,0.15); border: 1px solid rgba(231,76,60,0.3); color: #e74c3c; cursor: pointer; border-radius: 8px; padding: 8px 16px; font-size: 0.85rem; font-weight: 600;">🚪 Logout</button>
                        `;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Navbar session check failed:', e);
    }
}

// Global handleLogout to ensure logout buttons on all pages function correctly
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (e) {
        window.location.href = '/login';
    }
}

document.addEventListener('DOMContentLoaded', checkNavbarSession);

