document.getElementById("setup-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const contact = document.getElementById("contact").value.trim();
    const userId = sessionStorage.getItem('userId'); // ✅ Retrieve user ID from session

    if (!userId) {
        console.error("🚨 No User ID found in session!");
        alert("🚨 Please log in before adding contacts.");
        return;
    }

    // ✅ Regular expressions to validate phone numbers & emails
    const phoneRegex = /^\+?[1-9]\d{1,14}$/; // International phone number format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Basic email validation

    if (!phoneRegex.test(contact) && !emailRegex.test(contact)) {
        alert("🚨 Please enter a valid phone number or email!");
        return;
    }

    try {
        const response = await fetch('/api/add-contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, contact }) // ✅ Send user ID & validated contact
        });

        const data = await response.json();
        console.log("✅ Contact Addition Response:", data);

        if (response.ok) {
            alert("✅ Contact added successfully!");
            window.location.href = "dashboard.html"; // ✅ Redirect after adding contact
        } else {
            alert(`🚨 Error: ${data.message}`);
        }
    } catch (error) {
        console.error("🚨 Failed to add contact:", error);
    }
});
