// =========================================================
// SMARTVISION PWA
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
// PWA INSTALL
// =========================================================

window.addEventListener(
    "beforeinstallprompt",
    event => {

        event.preventDefault();

        deferredPrompt = event;

        if (installBtn) {

            installBtn.style.display =
                "inline-flex";

        }

    }
);


if (installBtn) {

    installBtn.addEventListener(
        "click",
        async () => {

            if (!deferredPrompt) {

                return;

            }

            deferredPrompt.prompt();

            const result =
                await deferredPrompt.userChoice;

            console.log(
                "PWA install result:",
                result.outcome
            );

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

        if (installBtn) {

            installBtn.style.display =
                "none";

        }

    }
);


// =========================================================
// START CAMERA
// =========================================================

startBtn.addEventListener(
    "click",
    startCamera
);


async function startCamera() {

    try {

        // Stop existing stream

        if (stream) {

            stopExistingStream();

        }


        // Check browser support

        if (
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia
        ) {

            throw new Error(
                "Camera API is not supported by this browser."
            );

        }


        // Request camera

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


        // Connect camera

        camera.srcObject =
            stream;


        // Wait for video

        await camera.play();


        // Show camera

        camera.style.display =
            "block";

        output.style.display =
            "block";

        placeholder.style.display =
            "none";

        cameraOverlay.style.display =
            "flex";


        // State

        running = true;

        processing = false;


        // Buttons

        startBtn.disabled =
            true;

        stopBtn.disabled =
            false;

        switchCameraBtn.disabled =
            false;


        // Status

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


        // Reset FPS

        frameCounter = 0;

        lastFrameTime =
            performance.now();


        // Start detection

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


        alert(message);

    }

}


// =========================================================
// STOP CAMERA
// =========================================================

stopBtn.addEventListener(
    "click",
    stopCamera
);


function stopCamera() {

    running = false;

    processing = false;


    stopExistingStream();


    camera.srcObject =
        null;


    camera.style.display =
        "none";

    output.style.display =
        "none";


    placeholder.style.display =
        "block";

    cameraOverlay.style.display =
        "none";


    // Buttons

    startBtn.disabled =
        false;

    stopBtn.disabled =
        true;

    switchCameraBtn.disabled =
        false;


    // Status

    statusText.textContent =
        "Camera Off";

    statusDot.style.background =
        "#ef4444";


    // Statistics

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


    // Warning

    warningBox.style.display =
        "none";

    warningMessage.textContent =
        "No warning";


    // Stop voice

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
            track => track.stop()
        );


    stream = null;

}


// =========================================================
// SWITCH CAMERA
// =========================================================

switchCameraBtn.addEventListener(
    "click",
    async () => {

        currentFacingMode =
            currentFacingMode === "user"
                ? "environment"
                : "user";


        if (!running) {

            return;

        }


        try {

            stopExistingStream();


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
);


// =========================================================
// PROCESS FRAME
// =========================================================

async function processFrame() {

    if (!running) {

        return;

    }


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


                // Canvas

                canvas.width =
                    width;

                canvas.height =
                    height;


                const ctx =
                    canvas.getContext(
                        "2d",
                        {
                            willReadFrequently: false
                        }
                    );


                // Draw frame

                ctx.drawImage(
                    camera,
                    0,
                    0,
                    width,
                    height
                );


                // Convert to JPEG

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


                // FormData

                const formData =
                    new FormData();


                formData.append(
                    "frame",
                    blob,
                    "frame.jpg"
                );


                // Send to Flask

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


                const data =
                    await response.json();


                // =================================================
                // RESPONSE
                // =================================================

                if (data.success) {


                    // Processed image

                    output.src =
                        "data:image/jpeg;base64," +
                        data.image;


                    // Face

                    faceCount.textContent =
                        data.face_count;


                    // =================================================
                    // PHONE
                    // =================================================

                    if (
                        data.phone_detected
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
                    // SAFETY
                    // =================================================

                    safetyStatus.textContent =
                        data.status;


                    if (
                        data.status ===
                        "WARNING"
                    ) {

                        safetyBox.classList.add(
                            "warning-active"
                        );


                        warningBox.style.display =
                            "block";


                        warningMessage.textContent =
                            data.message;


                        overlayStatus.textContent =
                            "⚠ Phone Detected";


                        playWarning();

                    }
                    else {

                        safetyBox.classList.remove(
                            "warning-active"
                        );


                        warningBox.style.display =
                            "none";


                        warningMessage.textContent =
                            data.message;


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


    if (
        now - lastWarningTime <
        3000
    ) {

        return;

    }


    lastWarningTime =
        now;


    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;

    }


    window.speechSynthesis.cancel();


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