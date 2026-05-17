document.addEventListener("DOMContentLoaded", function () {

    const preview = document.getElementById("testPreview");

    if (!preview) {
        console.log("Error: testPreview div not found in HTML!");
        return;
    }

    // ✅ FIRST get data
    const data = localStorage.getItem("tests");

    // ✅ THEN check
    if (!data) {
        preview.innerHTML = "<p>No tests available</p>";
        return;
    }

    // ✅ THEN parse
    const tests = JSON.parse(data);

    let html = "";

    tests.forEach((test, i) => {
        html += '<h3>Test ' + (i + 1) + ': ' + test.title + '</h3>';

        test.questions.forEach((q, j) => {
            html += '<p><b>Q' + (j + 1) + ':</b> ' + q.question + '</p><ul>';

            q.options.forEach((opt) => {
                html += '<li>' + opt + '</li>';
            });

            html += '</ul>';
        });

        html += '<hr>';
    });

    preview.innerHTML = html;

});

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

    // ================= TEST LOGIC =================
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

    // 👉 ADD QUESTION
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

    // 👉 CREATE TEST
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

    // ================= LOAD DATA =================
    const data = localStorage.getItem("tests");

    if (data) {
        console.log("Saved Tests:", JSON.parse(data));
    }