// =========================================
// STUDYFLOW — GLOBAL JAVASCRIPT
// =========================================


// =========================================
// TOAST NOTIFICATIONS
// =========================================

function showToast(message, duration = 3000) {

    const existingToast = document.querySelector(".toast");

    if (existingToast) {
        existingToast.remove();
    }

    const toast = document.createElement("div");

    toast.className = "toast";

    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";

        setTimeout(() => {
            toast.remove();
        }, 200);

    }, duration);
}


// =========================================
// API HELPER
// =========================================

async function apiRequest(url, options = {}) {

    try {

        const response = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        });

        let data = {};

        try {
            data = await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {

            throw new Error(
                data.error || "Something went wrong."
            );

        }

        return data;

    } catch (error) {

        console.error("API Error:", error);

        showToast(error.message);

        throw error;
    }
}


// =========================================
// FORMAT MINUTES
// =========================================

function formatMinutes(minutes) {

    minutes = Number(minutes) || 0;

    if (minutes < 60) {
        return `${minutes}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remaining = minutes % 60;

    if (remaining === 0) {
        return `${hours}h`;
    }

    return `${hours}h ${remaining}m`;
}


// =========================================
// FORMAT DEADLINE
// =========================================

function formatDeadline(deadline) {

    if (!deadline) {
        return "No deadline";
    }

    const date = new Date(deadline);

    if (Number.isNaN(date.getTime())) {
        return deadline;
    }

    return date.toLocaleDateString(
        undefined,
        {
            month: "short",
            day: "numeric"
        }
    );
}


// =========================================
// DEADLINE STATUS
// =========================================

function getDeadlineStatus(deadline) {

    if (!deadline) {
        return "normal";
    }

    const deadlineDate = new Date(deadline);
    const now = new Date();

    const difference =
        deadlineDate.getTime() - now.getTime();

    const hours =
        difference / (1000 * 60 * 60);


    if (hours <= 0) {
        return "high";
    }

    if (hours <= 24) {
        return "high";
    }

    if (hours <= 48) {
        return "medium";
    }

    return "normal";
}


// =========================================
// ESCAPE HTML
// Prevents task titles from injecting HTML
// =========================================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================
// GET PRIORITY CLASS
// =========================================

function getPriorityClass(task) {

    const importance =
        Number(task.importance) || 2;

    const difficulty =
        Number(task.difficulty) || 2;

    const deadlineStatus =
        getDeadlineStatus(task.deadline);


    if (
        importance === 3 ||
        difficulty === 3 ||
        deadlineStatus === "high"
    ) {
        return "high";
    }


    if (
        importance === 2 ||
        difficulty === 2 ||
        deadlineStatus === "medium"
    ) {
        return "medium";
    }


    return "normal";
}


// =========================================
// GET PRIORITY LABEL
// =========================================

function getPriorityLabel(task) {

    const priority =
        getPriorityClass(task);

    if (priority === "high") {
        return "High priority";
    }

    if (priority === "medium") {
        return "Medium priority";
    }

    return "Low priority";
}