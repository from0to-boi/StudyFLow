// =========================================
// STUDYFLOW — PROGRESS PAGE
// =========================================

const progressCompletion =
    document.getElementById("progressCompletion");

const progressCompleted =
    document.getElementById("progressCompleted");

const progressRemaining =
    document.getElementById("progressRemaining");

const progressStudyTime =
    document.getElementById("progressStudyTime");

const overallPercentage =
    document.getElementById("overallPercentage");

const overallProgressBar =
    document.getElementById("overallProgressBar");

const progressMessage =
    document.getElementById("progressMessage");

const subjectBreakdown =
    document.getElementById("subjectBreakdown");

const motivationText =
    document.getElementById("motivationText");


// =========================================
// LOAD PROGRESS
// =========================================

async function loadProgress() {

    try {

        const [stats, tasks] = await Promise.all([
            apiRequest("/api/stats"),
            apiRequest("/api/tasks")
        ]);

        renderProgressStats(stats);
        renderSubjectBreakdown(tasks);
        renderProgressMessage(stats);
        renderMotivation(stats);

    } catch (error) {

        console.error(
            "Progress loading error:",
            error
        );
    }
}


// =========================================
// RENDER STATS
// =========================================

function renderProgressStats(stats) {

    const percentage =
        Number(stats.completion_percentage) || 0;

    progressCompletion.textContent =
        `${percentage}%`;

    progressCompleted.textContent =
        stats.completed_tasks;

    progressRemaining.textContent =
        stats.pending_tasks;

    progressStudyTime.textContent =
        formatMinutes(stats.study_minutes);

    overallPercentage.textContent =
        `${percentage}%`;

    overallProgressBar.style.width =
        `${percentage}%`;
}


// =========================================
// PROGRESS MESSAGE
// =========================================

function renderProgressMessage(stats) {

    const percentage =
        Number(stats.completion_percentage) || 0;


    if (stats.total_tasks === 0) {

        progressMessage.textContent =
            "Add your first task to start tracking your progress.";

        return;
    }


    if (percentage === 100) {

        progressMessage.textContent =
            "Perfect. You completed everything. 🔥";

        return;
    }


    if (percentage >= 75) {

        progressMessage.textContent =
            "You're almost there. Finish strong!";

        return;
    }


    if (percentage >= 50) {

        progressMessage.textContent =
            "You're making solid progress. Keep the momentum going.";

        return;
    }


    if (percentage > 0) {

        progressMessage.textContent =
            "Good start. Every completed task moves you forward.";

        return;
    }


    progressMessage.textContent =
        "Start completing tasks to track your progress.";
}


// =========================================
// SUBJECT BREAKDOWN
// =========================================

function renderSubjectBreakdown(tasks) {

    if (!tasks || tasks.length === 0) {

        subjectBreakdown.innerHTML = `
            <div class="empty-state">
                <div>

                    <div class="empty-icon">
                        ↗
                    </div>

                    <p>
                        No subject data yet.
                    </p>

                    <p style="
                        margin-top: 5px;
                        color: var(--text-muted);
                        font-size: 10px;
                    ">
                        Add some tasks to see your breakdown.
                    </p>

                </div>
            </div>
        `;

        return;
    }


    // -----------------------------------------
    // Group tasks by subject
    // -----------------------------------------

    const subjects = {};


    tasks.forEach(task => {

        const subject =
            task.subject || "Other";


        if (!subjects[subject]) {

            subjects[subject] = {
                total: 0,
                completed: 0,
                minutes: 0
            };
        }


        subjects[subject].total++;

        subjects[subject].minutes +=
            Number(task.estimated_minutes) || 0;


        if (Number(task.completed) === 1) {
            subjects[subject].completed++;
        }

    });


    // -----------------------------------------
    // Sort by number of tasks
    // -----------------------------------------

    const sortedSubjects =
        Object.entries(subjects)
            .sort((a, b) =>
                b[1].total - a[1].total
            );


    // -----------------------------------------
    // Render
    // -----------------------------------------

    subjectBreakdown.innerHTML =
        sortedSubjects.map(
            ([subject, data]) => {

                const percentage =
                    data.total > 0
                        ? Math.round(
                            (data.completed /
                                data.total) * 100
                        )
                        : 0;


                return `
                    <div class="subject-progress">

                        <div class="subject-progress-top">

                            <div>
                                <strong>
                                    ${escapeHTML(subject)}
                                </strong>

                                <span>
                                    ${data.completed}
                                    /
                                    ${data.total}
                                    completed
                                </span>
                            </div>

                            <strong>
                                ${percentage}%
                            </strong>

                        </div>


                        <div class="progress-bar">

                            <div
                                class="progress-fill"
                                style="width: ${percentage}%"
                            ></div>

                        </div>


                        <div class="subject-progress-meta">

                            <span>
                                ${formatMinutes(data.minutes)}
                                planned
                            </span>

                        </div>

                    </div>
                `;

            }
        ).join("");
}


// =========================================
// MOTIVATION
// =========================================

function renderMotivation(stats) {

    const percentage =
        Number(stats.completion_percentage) || 0;


    if (stats.total_tasks === 0) {

        motivationText.textContent =
            "Add a few tasks and StudyFlow will start tracking your progress.";

        return;
    }


    if (percentage === 100) {

        motivationText.textContent =
            "You finished everything. That's consistency. Take a break and come back ready for the next challenge.";

        return;
    }


    if (percentage >= 75) {

        motivationText.textContent =
            "You're in the final stretch. Don't let the last few tasks slow you down.";

        return;
    }


    if (percentage >= 50) {

        motivationText.textContent =
            "Halfway there. Keep showing up and let the small wins stack up.";

        return;
    }


    if (percentage > 0) {

        motivationText.textContent =
            "You've already started. Keep going — progress comes from finishing one task at a time.";

        return;
    }


    motivationText.textContent =
        "Every completed task is progress. Start with the highest-priority task and build momentum.";
}


// =========================================
// INITIAL LOAD
// =========================================

loadProgress();