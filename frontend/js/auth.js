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

    // Determine role (active button in selector)
    const activeRoleBtn = document.querySelector(".role button.active");
    const role = activeRoleBtn ? activeRoleBtn.textContent.trim().toLowerCase() : "student";

    if (role.includes("examiner")) {
      // Direct mock flow for examiner
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
        // Save student data to localStorage
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

// Role toggle buttons
const roleButtons = document.querySelectorAll(".role button");
roleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    roleButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
});
