javascript
// =========================================================
// SMARTVISION PWA
// YOLO-ONLY VERSION
// =========================================================


// =========================================================
// ELEMENTS
// =========================================================

const phoneStatus =
    document.getElementById("phoneStatus");

const safetyStatus =
    document.getElementById("safetyStatus");

const safetyBox =
    document.getElementById("safetyBox");

const warningBox =
    document.getElementById("warningBox");

const warningMessage =
    document.getElementById("warningMessage");

const camera =
    document.getElementById("camera");

const output =
    document.getElementById("output");

const canvas =
    document.getElementById("canvas");

const startBtn =
    document.getElementById("startBtn");

const stopBtn =
    document.getElementById("stopBtn");

const switchCameraBtn =
    document.getElementById("switchCameraBtn");

const faceCount =
    document.getElementById("faceCount");

const fpsElement =
    document.getElementById("fps");

const detectionStatus =
    document.getElementById("detectionStatus");

const statusDot =
    document.getElementById("statusDot");

const statusText =
    document.getElementById("statusText");

const placeholder =
    document.getElementById("cameraPlaceholder");

const cameraOverlay =
    document.getElementById("cameraOverlay");

const overlayStatus =
    document.getElementById("overlayStatus");

const installBtn =
    document.getElementById("installBtn");


// =========================================================
// VARIABLES
// =========================================================

let stream = null;

let running = false;

let processing = false;


// Current camera

let currentFacingMode = "user";


// FPS

let lastFrameTime =
    performance.now();

let frameCounter = 0;


// Warning sound cooldown

let lastWarningTime = 0;


// PWA install

let deferredPrompt = null;


// =========================================================
// SAFE ELEMENT HELPER
// =========================================================

function elementExists(element) {
    return element !== null &&
           element !== undefined;
}


// =========================================================
// PWA INSTALL
// =========================================================

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredPrompt = event;

        if (elementExists(installBtn)) {

            installBtn.style.display =
                "inline-flex";

        }

    }
);


if (elementExists(installBtn)) {

    installBtn.addEventListener(
        "click",
        async () => {

            if (!deferredPrompt) {
                return;
            }

            try {

                deferredPrompt.prompt();

                const result =
                    await deferredPrompt.userChoice;

                console.log(
                    "PWA install result:",
                    result.outcome
                );

            }
            catch (error) {

                console.error(
                    "PWA install error:",
                    error
                );

            }

            deferredPrompt = null;

            installBtn.style.display =
                "none";

        }
    );

}


window.addEventListener(
    "appinstalled",
    () => {

        console.log(
            "SmartVision installed."
        );

        if (elementExists(installBtn)) {

            installBtn.style.display =
                "none";

        }

    }
);


// =========================================================
// START CAMERA
// =========================================================

if (elementExists(startBtn)) {

    startBtn.addEventListener(
        "click",
        startCamera
    );

}


async function startCamera() {

    try {

        // -------------------------------------------------
        // Stop previous stream
        // -------------------------------------------------

        if (stream) {

            stopExistingStream();

        }


        // -------------------------------------------------
        // Browser support
        // -------------------------------------------------

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API is not supported by this browser."
            );

        }


        // -------------------------------------------------
        // Request camera
        // -------------------------------------------------

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        width: {
                            ideal: 640
                        },

                        height: {
                            ideal: 480
                        },

                        facingMode:
                            currentFacingMode

                    },

                    audio: false

                });


        // -------------------------------------------------
        // Connect stream
        // -------------------------------------------------

        camera.srcObject =
            stream;


        await camera.play();


        // -------------------------------------------------
        // Show camera
        // -------------------------------------------------

        camera.style.display =
            "block";

        output.style.display =
            "block";

        placeholder.style.display =
            "none";

        cameraOverlay.style.display =
            "flex";


        // -------------------------------------------------
        // State
        // -------------------------------------------------

        running = true;

        processing = false;


        // -------------------------------------------------
        // Buttons
        // -------------------------------------------------

        startBtn.disabled =
            true;

        stopBtn.disabled =
            false;

        switchCameraBtn.disabled =
            false;


        // -------------------------------------------------
        // Status
        // -------------------------------------------------

        statusText.textContent =
            "Camera Active";

        statusDot.style.background =
            "#22c55e";


        detectionStatus.textContent =
            "ON";

        detectionStatus.style.color =
            "#16a34a";


        overlayStatus.textContent =
            "AI Monitoring";


        // -------------------------------------------------
        // Reset FPS
        // -------------------------------------------------

        frameCounter = 0;

        lastFrameTime =
            performance.now();


        // -------------------------------------------------
        // Start YOLO detection
        // -------------------------------------------------

        processFrame();

    }
    catch (error) {

        console.error(
            "Camera error:",
            error
        );


        let message =
            "Unable to access camera.";


        if (
            error.name ===
            "NotAllowedError"
        ) {

            message =
                "Camera permission was denied. Please allow camera access.";

        }

        else if (
            error.name ===
            "NotFoundError"
        ) {

            message =
                "No camera was found on this device.";

        }

        else if (
            error.name ===
            "NotReadableError"
        ) {

            message =
                "Camera is already being used by another application.";

        }

        else if (
            error.name ===
            "SecurityError"
        ) {

            message =
                "Camera requires HTTPS or localhost.";

        }

        else if (
            error.message
        ) {

            message =
                error.message;

        }


        alert(message);

    }

}


// =========================================================
// STOP CAMERA
// =========================================================

if (elementExists(stopBtn)) {

    stopBtn.addEventListener(
        "click",
        stopCamera
    );

}


function stopCamera() {

    running = false;

    processing = false;


    stopExistingStream();


    camera.srcObject =
        null;


    // -------------------------------------------------
    // Hide camera
    // -------------------------------------------------

    camera.style.display =
        "none";

    output.style.display =
        "none";

    placeholder.style.display =
        "block";

    cameraOverlay.style.display =
        "none";


    // -------------------------------------------------
    // Buttons
    // -------------------------------------------------

    startBtn.disabled =
        false;

    stopBtn.disabled =
        true;

    switchCameraBtn.disabled =
        false;


    // -------------------------------------------------
    // Status
    // -------------------------------------------------

    statusText.textContent =
        "Camera Off";

    statusDot.style.background =
        "#ef4444";


    // -------------------------------------------------
    // Statistics
    // -------------------------------------------------

    faceCount.textContent =
        "0";


    phoneStatus.textContent =
        "None";

    phoneStatus.style.color =
        "";


    safetyStatus.textContent =
        "OFF";


    safetyBox.classList.remove(
        "warning-active"
    );


    fpsElement.textContent =
        "0";


    detectionStatus.textContent =
        "OFF";

    detectionStatus.style.color =
        "";


    // -------------------------------------------------
    // Warning
    // -------------------------------------------------

    warningBox.style.display =
        "none";


    warningMessage.textContent =
        "No warning";


    overlayStatus.textContent =
        "AI Monitoring";


    // -------------------------------------------------
    // Stop voice
    // -------------------------------------------------

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();

    }

}


// =========================================================
// STOP EXISTING STREAM
// =========================================================

function stopExistingStream() {

    if (!stream) {
        return;
    }


    stream
        .getTracks()
        .forEach(
            track => {

                track.stop();

            }
        );


    stream = null;

}


// =========================================================
// SWITCH CAMERA
// =========================================================

if (elementExists(switchCameraBtn)) {

    switchCameraBtn.addEventListener(
        "click",
        switchCamera
    );

}


async function switchCamera() {

    currentFacingMode =
        currentFacingMode === "user"
            ? "environment"
            : "user";


    if (!running) {
        return;
    }


    try {

        // Stop old camera

        stopExistingStream();


        // Open new camera

        stream =
            await navigator.mediaDevices
                .getUserMedia({

                    video: {

                        width: {
                            ideal: 640
                        },

                        height: {
                            ideal: 480
                        },

                        facingMode:
                            currentFacingMode

                    },

                    audio: false

                });


        camera.srcObject =
            stream;


        await camera.play();


        console.log(
            "Camera switched to:",
            currentFacingMode
        );

    }
    catch (error) {

        console.error(
            "Camera switch error:",
            error
        );


        alert(
            "Could not switch camera."
        );

    }

}


// =========================================================
// PROCESS FRAME
// =========================================================

async function processFrame() {

    if (!running) {
        return;
    }


    // -------------------------------------------------
    // Make sure video is ready
    // -------------------------------------------------

    if (
        camera.readyState >=
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

        if (!processing) {

            processing = true;


            try {

                const width =
                    camera.videoWidth;

                const height =
                    camera.videoHeight;


                // -------------------------------------------------
                // Invalid video size
                // -------------------------------------------------

                if (
                    width === 0 ||
                    height === 0
                ) {

                    processing = false;

                    setTimeout(
                        processFrame,
                        100
                    );

                    return;

                }


                // -------------------------------------------------
                // Canvas
                // -------------------------------------------------

                canvas.width =
                    width;

                canvas.height =
                    height;


                const ctx =
                    canvas.getContext(
                        "2d"
                    );


                // -------------------------------------------------
                // Draw camera frame
                // -------------------------------------------------

                ctx.drawImage(
                    camera,
                    0,
                    0,
                    width,
                    height
                );


                // -------------------------------------------------
                // Convert frame to JPEG
                // -------------------------------------------------

                const blob =
                    await new Promise(
                        resolve => {

                            canvas.toBlob(
                                resolve,
                                "image/jpeg",
                                0.65
                            );

                        }
                    );


                if (!blob) {

                    throw new Error(
                        "Could not create image."
                    );

                }


                // -------------------------------------------------
                // FormData
                // -------------------------------------------------

                const formData =
                    new FormData();


                formData.append(
                    "frame",
                    blob,
                    "frame.jpg"
                );


                // -------------------------------------------------
                // Send to Flask
                // -------------------------------------------------

                const response =
                    await fetch(
                        "/detect",
                        {

                            method: "POST",

                            body: formData

                        }
                    );


                if (!response.ok) {

                    throw new Error(
                        `Server error: ${response.status}`
                    );

                }


                // -------------------------------------------------
                // JSON response
                // -------------------------------------------------

                const data =
                    await response.json();


                // =================================================
                // YOLO RESPONSE
                // =================================================

                if (data.success) {


                    // -------------------------------------------------
                    // Processed image
                    // -------------------------------------------------

                    if (data.image) {

                        output.src =
                            "data:image/jpeg;base64," +
                            data.image;

                    }


                    // =================================================
                    // FACE COUNT
                    // =================================================
                    // Kept for frontend compatibility.
                    // YOLO-only backend may return 0.
                    // =================================================

                    if (
                        data.face_count !== undefined
                    ) {

                        faceCount.textContent =
                            data.face_count;

                    }
                    else {

                        faceCount.textContent =
                            "0";

                    }


                    // =================================================
                    // PHONE DETECTION
                    // =================================================

                    if (
                        data.phone_detected === true
                    ) {

                        phoneStatus.textContent =
                            "Detected";

                        phoneStatus.style.color =
                            "#dc2626";

                    }
                    else {

                        phoneStatus.textContent =
                            "None";

                        phoneStatus.style.color =
                            "#16a34a";

                    }


                    // =================================================
                    // SAFETY STATUS
                    // =================================================

                    const status =
                        data.status || "SAFE";


                    safetyStatus.textContent =
                        status;


                    if (
                        status === "WARNING"
                    ) {

                        // Warning UI

                        safetyBox.classList.add(
                            "warning-active"
                        );


                        warningBox.style.display =
                            "block";


                        warningMessage.textContent =
                            data.message ||
                            "Mobile phone detected.";


                        overlayStatus.textContent =
                            "⚠ Phone Detected";


                        // Voice warning

                        playWarning();

                    }
                    else {

                        safetyBox.classList.remove(
                            "warning-active"
                        );


                        warningBox.style.display =
                            "none";


                        warningMessage.textContent =
                            data.message ||
                            "No warning";


                        overlayStatus.textContent =
                            "✓ Monitoring";

                    }


                    // =================================================
                    // FPS
                    // =================================================

                    frameCounter++;


                    const currentTime =
                        performance.now();


                    const elapsed =
                        currentTime -
                        lastFrameTime;


                    if (
                        elapsed >= 1000
                    ) {

                        fpsElement.textContent =
                            frameCounter;


                        frameCounter = 0;


                        lastFrameTime =
                            currentTime;

                    }

                }
                else {

                    console.error(
                        "Backend:",
                        data.message
                    );

                }

            }
            catch (error) {

                console.error(
                    "Detection error:",
                    error
                );

            }
            finally {

                processing = false;

            }

        }

    }


    // -------------------------------------------------
    // Continue detection
    // -------------------------------------------------

    if (running) {

        setTimeout(
            processFrame,
            80
        );

    }

}


// =========================================================
// WARNING VOICE
// =========================================================

function playWarning() {

    const now =
        Date.now();


    // -------------------------------------------------
    // Cooldown
    // -------------------------------------------------

    if (
        now - lastWarningTime <
        3000
    ) {

        return;

    }


    lastWarningTime =
        now;


    // -------------------------------------------------
    // Browser support
    // -------------------------------------------------

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;

    }


    // Stop previous speech

    window.speechSynthesis.cancel();


    // -------------------------------------------------
    // Warning message
    // -------------------------------------------------

    const speech =
        new SpeechSynthesisUtterance(
            "Warning. Mobile phone detected."
        );


    speech.rate =
        1;

    speech.pitch =
        1;

    speech.volume =
        1;


    window.speechSynthesis.speak(
        speech
    );

}


// =========================================================
// PAGE EXIT
// =========================================================

window.addEventListener(
    "beforeunload",
    () => {

        stopExistingStream();

    }
);


// =========================================================
// PAGE VISIBILITY
// =========================================================
// Stop processing when user leaves the page.
// Camera stream remains safely released.
// =========================================================

document.addEventListener(
    "visibilitychange",
    () => {

        if (
            document.hidden &&
            running
        ) {

            console.log(
                "Page hidden."
            );

        }

    }
);

