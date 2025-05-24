// 🚨 SOS Alert Functionality
document.getElementById("sos-button").addEventListener("click", async () => {
    console.log("🚨 SOS Button Clicked!");

    const sosButton = document.getElementById("sos-button");
    const statusText = document.getElementById("sos-status");

    sosButton.disabled = true; // 🚀 Prevent multiple clicks
    statusText.textContent = "🚀 Sending SOS alert...";

    const userId = sessionStorage.getItem('userId');
    if (!userId) {
        alert("🚨 User ID not found! Please log in again.");
        sosButton.disabled = false;
        statusText.textContent = "Waiting for SOS alert...";
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const location = `https://ditu.amap.com/?p=${longitude},${latitude}`;

            sessionStorage.setItem('latitude', latitude);
            sessionStorage.setItem('longitude', longitude);

            // ✅ Generate direct emergency contact link
            const contactLink = `${window.location.origin}/dashboard.html?emergency=1`;

            const message = `🚨 Emergency Alert! Help needed!\n📍 My Location: Latitude ${latitude}, Longitude ${longitude}\n🌍 Amap Link: ${location}\n🔗 Emergency contacts, please share your location here: ${contactLink}`;

            console.log("🔍 Sending SOS request with:", { userId, location });

            try {
                const response = await fetch('/api/send-sos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId, latitude, longitude, location, message })
                });

                const data = await response.json();
                console.log("✅ SOS Alert Sent:", data);

                if (response.ok) {
                    alert("✅ SOS Alert Sent!");
                    statusText.textContent = "✅ SOS Alert Sent!";
                } else {
                    alert(`🚨 Error: ${data.message}`);
                    statusText.textContent = "❌ Failed to send SOS alert!";
                }
            } catch (error) {
                console.error("🚨 SOS Alert Failed:", error);
                statusText.textContent = "❌ Error sending SOS!";
            }
        },
        (error) => {
            console.error("🚨 Location Error:", error);
            alert("🚨 Unable to get location. Please enable GPS.");
            sosButton.disabled = false;
            statusText.textContent = "❌ Location error!";
        }
    );
});
// ✅ Send Emergency Contact Location Every 5 Seconds
setInterval(async () => {
    navigator.geolocation.getCurrentPosition(async (position) => {
        const contactLatitude = position.coords.latitude;
        const contactLongitude = position.coords.longitude;

        console.log("📍 Sending location update:", contactLatitude, contactLongitude);

        const userId = sessionStorage.getItem("userId"); // ✅ The emergency contact's user ID

        if (!userId) {
            console.error("🚨 Missing user ID!");
            return;
        }

        try {
            const response = await fetch("/api/update-contact-location", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contactLatitude, contactLongitude, userId }) // ✅ Send live location to backend
            });

            console.log("✅ Location updated:", await response.json());

        } catch (error) {
            console.error("🚨 Failed to update location:", error);
        }
    });
}, 5000); // ✅ Updates location every 5 seconds

// 📍 Emergency Contact Shares Their Location AFTER Receiving SOS
document.getElementById("share-location-button").addEventListener("click", async () => {
    console.log("📍 Emergency Contact Sending Location!");

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const contactLatitude = position.coords.latitude;
            const contactLongitude = position.coords.longitude;
            const contactLocation = `https://ditu.amap.com/?p=${contactLongitude},${contactLatitude}`;

            const userId = sessionStorage.getItem("userId"); // ✅ Get the logged-in user's ID

            if (!userId) {
                alert("🚨 Missing user ID! Cannot send location.");
                return;
            }

            console.log("🔍 Sending location to user's emergency contact:", userId);

            try {
                const response = await fetch("/api/send-contact-location", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ contactLatitude, contactLongitude, contactLocation, userId }) // ✅ Send userId
                });

                const data = await response.json();
                console.log("✅ Emergency Contact Location Sent:", data);

                if (response.ok) {
                    alert("✅ Location Sent to User's Emergency Contact!");
                    showMap(sessionStorage.getItem("latitude"), sessionStorage.getItem("longitude"), contactLatitude, contactLongitude);
                } else {
                    alert(`🚨 Error: ${data.message}`);
                }
            } catch (error) {
                console.error("🚨 Failed to send location:", error);
            }
        },
        (error) => {
            console.error("🚨 Error fetching location:", error);
            alert("🚨 Unable to get location. Please enable GPS.");
        }
    );
});


// 🌍 Ensure Share Location Button is Visible for Both User & Emergency Contact
const urlParams = new URLSearchParams(window.location.search);
const isEmergencyContact = urlParams.get("emergency");
document.getElementById("share-location-button").style.display = "block"; // ✅ Now visible for all


// 🔧 Fix: Manage Emergency Contacts Button
document.getElementById("manage-contacts").addEventListener("click", () => {
    console.log("📞 Navigating to Emergency Contact Setup!");
    window.location.href = "setup.html";
});

// 🌍 Show User's Location on Map **Right Away**
function showUserLocation() {
    const latitude = sessionStorage.getItem('latitude');
    const longitude = sessionStorage.getItem('longitude');

    if (!latitude || !longitude) {
        document.getElementById("location-text").textContent = "❌ Location unavailable.";
        return;
    }

    document.getElementById("location-text").textContent = `📍 Your Location: Latitude ${latitude}, Longitude ${longitude}`;

    const map = new AMap.Map("map-container", {
        zoom: 15,
        center: [longitude, latitude]
    });

    new AMap.Marker({
        position: [longitude, latitude],
        map: map,
        label: {
            content: "<div style='color: red; font-weight: bold;'>🚨 Your Location</div>",
            offset: new AMap.Pixel(10, 10)
        }
    });
}

// **Auto-Show User Location**
window.onload = showUserLocation;