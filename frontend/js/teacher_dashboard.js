document.addEventListener("DOMContentLoaded", function () {
    const API_BASE_URL = "http://127.0.0.1:5000";

    // ================= NAVIGATION =================
    const links = document.querySelectorAll(".sidebar a");
    const sections = document.querySelectorAll("main section");

    links.forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();

            const targetId = this.getAttribute("href").substring(1);

            sections.forEach(sec => sec.style.display = "none");

            const target = document.getElementById(targetId);
            if (target) target.style.display = "block";
        });
    });

    // ================= DYNAMIC DATA LOADING (BACKEND) =================
    async function loadBackendStats() {
        try {
            const response = await fetch(`${API_BASE_URL}/students`);
            if (!response.ok) throw new Error("Failed to fetch students data");

            const students = await response.json();
            
            // 1. Calculate General Dashboard Metrics
            const total = students.length;
            const live = students.filter(s => s.score === 0).length; // Active/not finished
            const cheatingCount = students.filter(s => s.detect_object !== null).length;

            document.getElementById("totalStudents").innerText = total;
            document.getElementById("liveStudents").innerText = live || "1"; // Mock default 1 live session
            document.getElementById("cheatingFlags").innerText = cheatingCount;

            // 2. Populate Main Student Progress Table
            const progressBody = document.getElementById("studentTableBody");
            if (progressBody) {
                if (students.length === 0) {
                    progressBody.innerHTML = `<tr><td colspan="4" class="no-data">No data available</td></tr>`;
                } else {
                    let progressHtml = "";
                    students.forEach(st => {
                        const status = st.score > 0 ? "Completed" : "Idle / In Test";
                        const progressPercent = st.score > 0 ? "100%" : "0%";
                        const riskText = st.detect_object ? `HIGH (Detected: ${st.detect_object})` : "LOW";
                        const riskClass = st.detect_object ? "style='color: #ff4b4b; font-weight: bold;'" : "style='color: #22c55e;'";

                        progressHtml += `
                            <tr>
                                <td>${st.name} (${st.email})</td>
                                <td>${status}</td>
                                <td>${progressPercent}</td>
                                <td ${riskClass}>${riskText}</td>
                            </tr>
                        `;
                    });
                    progressBody.innerHTML = progressHtml;
                }
            }

            // 3. Populate Scorecard Stats
            const completedStudents = students.filter(s => s.score > 0);
            const passed = completedStudents.filter(s => s.percentage >= 50).length;
            const failed = completedStudents.filter(s => s.percentage < 50).length;

            let avgScore = 0;
            let highest = 0;
            let lowest = 0;

            if (completedStudents.length > 0) {
                const scores = completedStudents.map(s => s.score);
                avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
                highest = Math.max(...scores);
                lowest = Math.min(...scores);
            }

            // Set Scorecard Card Numbers
            document.getElementById("card-total").innerText = total;
            document.getElementById("card-avg").innerText = `${avgScore.toFixed(1)}%`;
            document.getElementById("card-high").innerText = `${highest.toFixed(1)}%`;
            document.getElementById("card-low").innerText = `${lowest.toFixed(1)}%`;
            document.getElementById("card-passed").innerText = passed;
            document.getElementById("card-failed").innerText = failed;
            document.getElementById("card-flags").innerText = cheatingCount;

            // 4. Populate Scorecard Results Table
            const scoreTableBody = document.querySelector("#scoreTable tbody");
            if (scoreTableBody) {
                if (completedStudents.length === 0) {
                    scoreTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: gray;">No results available yet</td></tr>`;
                } else {
                    let scoreHtml = "";
                    completedStudents.forEach(st => {
                        const status = st.percentage >= 50 ? "PASSED" : "FAILED";
                        const statusClass = st.percentage >= 50 ? "style='color: #22c55e; font-weight: bold;'" : "style='color: #ff4b4b; font-weight: bold;'";
                        const flagText = st.detect_object ? `HIGH (Detected: ${st.detect_object})` : "None";

                        scoreHtml += `
                            <tr>
                                <td>${st.name}</td>
                                <td>AI & Cybersecurity Basics</td>
                                <td>${st.score.toFixed(1)}%</td>
                                <td ${statusClass}>${status}</td>
                                <td>${flagText}</td>
                            </tr>
                        `;
                    });
                    scoreTableBody.innerHTML = scoreHtml;
                }
            }

            // 5. Populate Monitor Grid (Camera feeds)
            const monitorGrid = document.getElementById("monitorGrid");
            if (monitorGrid) {
                if (students.length === 0) {
                    monitorGrid.innerHTML = `<p style="color: gray; grid-column: 1/-1; text-align: center;">No active exam monitors</p>`;
                } else {
                    let monitorHtml = "";
                    students.forEach(st => {
                        const statusBorder = st.detect_object ? "border: 2px solid #ff4b4b; box-shadow: 0 0 10px rgba(255,75,75,0.4);" : "border: 2px solid #22c55e; box-shadow: 0 0 10px rgba(34,197,94,0.4);";
                        const statusText = st.detect_object ? `Cheating Detected: ${st.detect_object}` : "Secure Connection";

                        monitorHtml += `
                            <div class="card" style="padding: 1rem; ${statusBorder} display: flex; flex-direction: column; gap: 0.5rem; text-align: center; background: #1e293b;">
                                <div style="width: 100%; height: 120px; background: #0f172a; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #64748b;">
                                    👤
                                </div>
                                <h4 style="margin: 0; color: #fff;">${st.name}</h4>
                                <span style="font-size: 0.8rem; color: #94a3b8;">${st.email}</span>
                                <span style="font-size: 0.85rem; font-weight: bold; margin-top: auto; color: ${st.detect_object ? '#ff4b4b' : '#22c55e'}">${statusText}</span>
                            </div>
                        `;
                    });
                    monitorGrid.innerHTML = monitorHtml;
                }
            }

        } catch (err) {
            console.error("Error loading backend statistics:", err);
        }
    }

    // Initial load and auto refresh every 5 seconds
    loadBackendStats();
    setInterval(loadBackendStats, 5000);

    // ================= TEST CREATION LOGIC (OFFLINE STORAGE) =================
    let questions = [];
    let questionCount = 1;

    const testTitle = document.getElementById("testTitle");
    const quesText = document.getElementById("quesText");
    const opt1 = document.getElementById("opt1");
    const opt2 = document.getElementById("opt2");
    const opt3 = document.getElementById("opt3");
    const opt4 = document.getElementById("opt4");

    const addBtn = document.getElementById("addQuestionBtn");
    const createBtn = document.getElementById("createTestBtn");

    const quesTitle = document.getElementById("questionTitle");
    const saveStatus = document.getElementById("saveStatus");

    if (addBtn) {
        addBtn.addEventListener("click", function () {
            const q = quesText.value.trim();
            const o1 = opt1.value.trim();
            const o2 = opt2.value.trim();
            const o3 = opt3.value.trim();
            const o4 = opt4.value.trim();

            if (!q || !o1 || !o2 || !o3 || !o4) {
                alert("Fill all fields!");
                return;
            }

            questions.push({
                question: q,
                options: [o1, o2, o3, o4]
            });

            // reset inputs
            quesText.value = "";
            opt1.value = "";
            opt2.value = "";
            opt3.value = "";
            opt4.value = "";

            questionCount++;
            quesTitle.innerText = "Question " + questionCount + ":";

            alert("Question Added Successfully");
        });
    }

    if (createBtn) {
        createBtn.addEventListener("click", function () {
            const title = testTitle.value.trim();

            if (!title) {
                alert("Enter Test Title");
                return;
            }

            if (questions.length === 0) {
                alert("Add at least one question!");
                return;
            }

            const newTest = {
                title: title,
                questions: questions
            };

            let allTests = JSON.parse(localStorage.getItem("tests")) || [];
            allTests.push(newTest);
            localStorage.setItem("tests", JSON.stringify(allTests));

            saveStatus.innerText = "Test Created Successfully!";

            // reset
            questions = [];
            questionCount = 1;
            quesTitle.innerText = "Question 1:";
            testTitle.value = "";

            setTimeout(() => {
                location.reload();
            }, 1000);
        });
    }
});