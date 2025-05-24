// app.js - Handles Registration & Login
document.addEventListener("DOMContentLoaded", () => {
    // ✅ Registration Form Submission
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();  // Prevents page reload

        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();
        const emergencyContact = document.getElementById('contact-info').value.trim(); // ✅ Emergency contact (phone or email)

        // ✅ Validate input: Must be either a phone number or email
        const isEmail = /\S+@\S+\.\S+/.test(emergencyContact); // Check email format
        const isPhone = /^[0-9]{10,15}$/.test(emergencyContact); // Check phone format

        if (!isEmail && !isPhone) {
            alert("🚨 Please enter a valid emergency contact (phone number or email).");
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, emergencyContact }) // ✅ Send emergency contact
            });

            const data = await response.json();
            console.log("✅ Registration Response:", data);

            if (response.ok) {
                alert("🎉 Registration successful!");
                window.location.href = 'login.html';  // Redirect to login page
            } else {
                alert(`🚨 Error: ${data.message}`);
            }
        } catch (error) {
            console.error("🚨 Registration Failed:", error);
            alert("Failed to register. Please try again.");
        }
    });
}

    // ✅ Login Form Submission
    document.getElementById("login-form").addEventListener("submit", async (e) => {
        e.preventDefault();
    
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
    
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
    
            const data = await response.json();
            console.log("✅ Login Response:", data);
    
            if (response.ok && data.userId) { 
                console.log("🔍 Storing User ID:", data.userId); // ✅ Debugging log
    
                sessionStorage.setItem('userId', data.userId); // ✅ Store user ID in session
            
                // 🚀 Check if the user has emergency contacts
                const contactsResponse = await fetch(`/api/check-contacts?userId=${data.userId}`);
                const contactsData = await contactsResponse.json();
    
                console.log("🔍 Contacts API Response:", contactsData); // ✅ Debugging log
    
                if (contactsResponse.ok) {
                    if (contactsData.hasContacts) {
                        window.location.href = "dashboard.html"; // ✅ Redirect to SOS alerts
                    } else {
                        window.location.href = "setup.html"; // 🚨 If no contacts exist, go to setup first
                    }
                } else {
                    alert("🚨 Error fetching contacts. Try again later.");
                }
            } else {
                alert(`🚨 Error: ${data.message}`);
            }
        } catch (error) {
            console.error("🚨 Login failed:", error);
        }
    });
    
});
