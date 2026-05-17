const loginBtn = document.querySelector(".login-btn");

loginBtn.addEventListener("click", () => {

  const username = document.querySelector("input[type='text']").value;
  const password = document.querySelector("input[type='password']").value;

  if(username === "" || password === ""){
    alert("Please enter username and password");
    return;
  }

  alert("Login Successful");

});


const roleButtons = document.querySelectorAll(".role button");

roleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    roleButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  if(btn.textContent === "Examiner"){
    window.location.href = "examiner_login.html"; 
  } else if(btn.textContent === "examiner"){ 
    window.location.href = "examiner_login.html"; 
  }
  });
});


loginBtn.addEventListener("click", () => {

  const username = document.querySelector("input[type='text']").value;
  const password = document.querySelector("input[type='password']").value;

  if(username === "" || password === ""){
    alert("Please enter username and password");
    return;
  }

  localStorage.setItem("studentName", username);
  window.location.href = "student_dashboard.html"; 
  
  alert("Login Successful"); 
});


  localStorage.setItem("studentName", username);
  window.location.href = "student_dashboard.html";
  
  alert("Login Successful");


