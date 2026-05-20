/* ---------- CYBER-GRID BACKGROUND ENGINE ---------- */
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

function initBackground() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    function drawGrid() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = "rgba(0, 234, 255, 0.08)"; // Very subtle cyan
        ctx.lineWidth = 1;

        const spacing = 50;
        const time = Date.now() * 0.001;

        // Draw vertical lines with a slight "flow" animation
        for (let x = 0; x <= canvas.width; x += spacing) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + Math.sin(time + x) * 10, canvas.height);
            ctx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= canvas.height; y += spacing) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y + Math.cos(time + y) * 10);
            ctx.stroke();
        }
        
        requestAnimationFrame(drawGrid);
    }
    drawGrid();
}
initBackground();
window.onresize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };

/* ---------- DYNAMIC DASHBOARD LOGIC (BACKEND CONNECTED) ---------- */
const API_BASE_URL = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", async () => {
    const localData = JSON.parse(localStorage.getItem("studentData") || "{}");
    if (!localData.email) {
        alert("Session expired. Please log in first.");
        window.location.href = "login.html";
        return;
    }

    // Try to fetch latest student data dynamically from the database
    let studentName = localData.name || "User";
    let score = localData.score || 0.0;
    let percentage = localData.percentage || 0.0;
    let detectObject = localData.detect_object || null;

    try {
        const response = await fetch(`${API_BASE_URL}/student/${localData.email}`);
        if (response.ok) {
            const freshData = await response.json();
            
            // Save fresh data back to localStorage
            localStorage.setItem("studentData", JSON.stringify(freshData));
            
            studentName = freshData.name;
            score = freshData.score;
            percentage = freshData.percentage;
            detectObject = freshData.detect_object;
        }
    } catch (err) {
        console.warn("Could not fetch fresh student data from backend, using cached local data instead.", err);
    }

    // 1. Welcome Typing Effect
    const headerElement = document.getElementById("student-name-header");
    if (headerElement) {
        let i = 0;
        const speed = 100;
        headerElement.innerText = "";
        function typeWriter() {
            if (i < studentName.length) {
                headerElement.innerText += studentName.charAt(i);
                i++;
                setTimeout(typeWriter, speed);
            }
        }
        setTimeout(typeWriter, 500);
    }

    // 2. Set Profile Initial
    const profileInitial = document.getElementById("profile-initial");
    if (profileInitial) {
        profileInitial.innerText = studentName.charAt(0).toUpperCase();
    }

    // 3. Populate dynamic stats in stats-grid
    const scoreElem = document.getElementById("stat-score");
    const percentElem = document.getElementById("stat-percentage");
    const proctorElem = document.getElementById("stat-proctor");

    if (scoreElem) scoreElem.innerText = `${Number(score).toFixed(1)} / 100`;
    if (percentElem) percentElem.innerText = `${Number(percentage).toFixed(1)}%`;
    
    if (proctorElem) {
        if (detectObject) {
            proctorElem.innerText = `Anomaly: ${detectObject}`;
            proctorElem.style.color = "#ff4b4b"; // Alert red
        } else {
            proctorElem.innerText = "Verified Secure";
            proctorElem.style.color = "#22c55e"; // Success green
        }
    }

    // Dropdown Toggle Logic
    const trigger = document.getElementById('profileTrigger');
    const menu = document.getElementById('profileMenu');

    if (trigger && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            menu.classList.remove('active');
        });
    }
});

/* ---------- HARDWARE & MODAL LOGIC ---------- */
let activeStream = null;

async function checkHardware(examId) {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('preview');
    const startBtn = document.getElementById('confirmStart');

    if (!modal || !video || !startBtn) return;

    modal.style.display = 'block';

    try {
        activeStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
       
        video.srcObject = activeStream;
        startBtn.disabled = false;
       
        startBtn.onclick = () => {
            if (activeStream) {
                activeStream.getTracks().forEach(track => track.stop());
            }
            modal.style.display = 'none';
            // Redirect to the exam page
            window.location.href = "exam_page.html";
        };

    } catch (err) {
        alert("Access Denied: Camera and Microphone are mandatory for this proctored portal.");
        modal.style.display = 'none';
    }
}

const cancelCheckBtn = document.getElementById('cancelCheck');
if (cancelCheckBtn) {
    cancelCheckBtn.addEventListener('click', () => {
        document.getElementById('cameraModal').style.display = 'none';
        const video = document.getElementById('preview');
        if (video && video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
        }
        if (activeStream) {
            activeStream.getTracks().forEach(t => t.stop());
        }
    });
}

/* ---------- NOTIFICATION SIDEBAR LOGIC ---------- */
const closeNotif = document.getElementById('closeNotif');
const notifTrigger = document.getElementById('notifTrigger');
const notifSidebar = document.getElementById('notifSidebar');
const notifBadge = document.querySelector('.notification-badge');

if (notifTrigger && notifSidebar) {
    notifTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        notifSidebar.classList.add('active');
            
        // Remove the red dot when opened
        if (notifBadge) {
            notifBadge.style.display = 'none';
        }
    });

    // Close Sidebar via X button
    if (closeNotif) {
        closeNotif.addEventListener('click', () => {
            notifSidebar.classList.remove('active');
        });
    }

    // Close Sidebar if clicking outside
    document.addEventListener('click', (e) => {
        if (!notifSidebar.contains(e.target) && e.target !== notifTrigger) {
            notifSidebar.classList.remove('active');
        }
    });
}
