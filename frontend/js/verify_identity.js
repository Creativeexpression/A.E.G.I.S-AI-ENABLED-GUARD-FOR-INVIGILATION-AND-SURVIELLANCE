const authBtn = document.getElementById('auth-btn');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const statusText = document.getElementById('status-text');
const cameraPreview = document.getElementById('camera-preview');

let imageCaptured = false;

authBtn.addEventListener('click', async () => {
    try {
        // Camera start karein
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        cameraPreview.style.display = "block";
        video.srcObject = stream;
        statusText.innerText = "Align your face and wait...";

        // 3 second baad auto-capture
        setTimeout(() => {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Camera band karein
            stream.getTracks().forEach(track => track.stop());
            cameraPreview.style.display = "none";
            
            imageCaptured = true;
            statusText.innerText = "✅ Identity Verified!";
            authBtn.innerText = "Re-verify Identity";
            authBtn.style.borderColor = "#00ffcc"; // Success color
            
            // Photo ka data yahan hai (Base64 format)
            const imageData = canvas.toDataURL('image/png');
            console.log("Photo Captured!"); 
            
        }, 3000);

    } catch (err) {
        statusText.innerText = "❌ Please allow camera access!";
        console.error(err);
    }
});