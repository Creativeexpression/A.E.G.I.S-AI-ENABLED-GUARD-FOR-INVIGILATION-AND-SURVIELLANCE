const API_BASE_URL = "http://127.0.0.1:5000";
const loginBtn = document.querySelector(".login-btn");

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    const emailInput = document.querySelector("input[type='email']");
    const passwordInput = document.querySelector("input[type='password']");

    if (!emailInput || !passwordInput) {
      alert("Error: Login fields not found.");
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (email === "" || password === "") {
      alert("Please enter both email and password.");
      return;
    }

    const activeRoleBtn = document.querySelector(".role button.active");
    const role = activeRoleBtn ? activeRoleBtn.textContent.trim().toLowerCase() : "student";

    if (role.includes("examiner")) {
      localStorage.setItem("examinerEmail", email);
      alert("Examiner Login Successful (Offline Demo Mode)");
      window.location.href = "teacher_dashboard.html";
      return;
    }

    try {
      loginBtn.disabled = true;
      loginBtn.textContent = "Verifying...";

      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("studentData", JSON.stringify({
          student_id: data.student_id,
          name: data.name,
          email: data.email,
          score: data.score,
          percentage: data.percentage
        }));
        
        alert(`Welcome back, ${data.name}!`);
        window.location.href = "student_dashboard.html";
      } else {
        alert(data.error || "Invalid credentials.");
      }
    } catch (err) {
      console.error("Login Error:", err);
      alert("Failed to connect to the backend server. Please make sure backend is running.");
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = "Login";
    }
  });
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const nameInput = document.querySelector("input[name='name']");
    const emailInput = document.querySelector("input[name='email']");
    const mobileInput = document.querySelector("input[name='mobile']");
    const passwordInput = document.querySelector("input[name='password']");
    const confirmPasswordInput = document.querySelector("input[name='confirm_password']");

    if (!nameInput || !emailInput || !passwordInput || !confirmPasswordInput) {
      alert("Error: Registration form fields not found.");
      return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const mobile = mobileInput ? mobileInput.value.trim() : "";
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all required fields.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    const statusText = document.getElementById("status-text");
    const isVerified = (statusText && (statusText.innerText.includes("Verified") || statusText.innerText.includes("Captured") || statusText.innerText.includes("Success"))) || window.imageCaptured;
    if (!isVerified) {
      alert("Please verify your identity using the webcam first!");
      return;
    }

    const activeRoleBtn = document.querySelector(".role button.active");
    const role = activeRoleBtn ? activeRoleBtn.textContent.trim().toLowerCase() : "student";

    if (role.includes("examiner")) {
      alert("Examiner Registration Successful (Offline Demo Mode)!");
      if (typeof confetti === "function") {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);
      return;
    }

    const submitBtn = document.querySelector(".register-submit");
    try {
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = "Registering...";
      }

      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json();
      if (response.ok) {
        alert("Registration Successful!");
        if (typeof confetti === "function") {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 }
          });
        }
        setTimeout(() => {
          window.location.href = "login.html";
        }, 1500);
      } else {
        alert(data.error || "Registration failed.");
      }
    } catch (err) {
      console.error("Register Error:", err);
      alert("Failed to connect to the backend server. Please make sure the backend is running.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = "Register";
      }
    }
  });
}

const roleButtons = document.querySelectorAll(".role button");
roleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    roleButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
