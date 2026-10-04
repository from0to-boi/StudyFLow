// =========================================
// STUDYFLOW — DASHBOARD
// =========================================

const totalTasksElement =
    document.getElementById("totalTasks");

const completedTasksElement =
    document.getElementById("completedTasks");

const studyTimeElement =
    document.getElementById("studyTime");

const completionPercentageElement =
    document.getElementById("completionPercentage");

const focusPercentageElement =
    document.getElementById("focusPercentage");

const focusProgressElement =
    document.getElementById("focusProgress");

const priorityTasksElement =
    document.getElementById("priorityTasks");


// =========================================
// LOAD DASHBOARD
// =========================================

async function loadDashboard() {

    try {

        const [stats, tasks] = await Promise.all([
            apiRequest("/api/stats"),
            apiRequest("/api/tasks")
        ]);

        renderStats(stats);
        renderPriorityTasks(tasks);

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );
    }
}


// =========================================
// RENDER STATS
// =========================================

function renderStats(stats) {

    totalTasksElement.textContent =
        stats.total_tasks;

    completedTasksElement.textContent =
        stats.completed_tasks;

    studyTimeElement.textContent =
        formatMinutes(stats.study_minutes);

    completionPercentageElement.textContent =
        `${stats.completion_percentage}%`;

    focusPercentageElement.textContent =
        `${stats.completion_percentage}%`;

    focusProgressElement.style.width =
        `${stats.completion_percentage}%`;
}


// =========================================
// RENDER PRIORITY TASKS
// =========================================

function renderPriorityTasks(tasks) {

    const unfinishedTasks =
        tasks.filter(task =>
            Number(task.completed) !== 1
        );


    if (unfinishedTasks.length === 0) {

        priorityTasksElement.innerHTML = `
            <div class="empty-state">
                <div>

                    <div class="empty-icon">
                        ✓
                    </div>

                    <p>
                        You're all caught up!
                    </p>

                    <p style="
                        margin-top: 5px;
                        color: var(--text-muted);
                        font-size: 10px;
                    ">
                        No unfinished tasks right now.
                    </p>

                </div>
            </div>
        `;

        return;
    }


    // Sort using the same basic priority logic
    // used by StudyFlow's planner.

    unfinishedTasks.sort((a, b) => {

        const priorityA =
            calculateDashboardPriority(a);

        const priorityB =
            calculateDashboardPriority(b);

        return priorityB - priorityA;
    });


    // Only show the top 5 tasks.

    const priorityTasks =
        unfinishedTasks.slice(0, 5);


    priorityTasksElement.innerHTML =
        priorityTasks.map(task => {

            const priority =
                getPriorityClass(task);

            return `
                <div class="task-item">

                    <button
                        class="task-check"
                        onclick="completeDashboardTask(${task.id})"
                        aria-label="Complete task"
                    >
                    </button>

                    <div class="task-main">

                        <div class="task-title">
                            ${escapeHTML(task.title)}
                        </div>

                        <div class="task-meta">

                            <span>
                                ${escapeHTML(task.subject)}
                            </span>

                            <span>•</span>

                            <span>
                                ${formatMinutes(
                                    task.estimated_minutes
                                )}
                            </span>

                            <span>•</span>

                            <span>
                                Due ${formatDeadline(
                                    task.deadline
                                )}
                            </span>

                        </div>

                    </div>

                    <div class="task-right">

                        <span class="priority ${priority}">
                            ${getPriorityLabel(task)}
                        </span>

                    </div>

                </div>
            `;

        }).join("");
}


// =========================================
// DASHBOARD PRIORITY SCORE
// =========================================

function calculateDashboardPriority(task) {

    let score = 0;


    // Importance

    const importance =
        Number(task.importance) || 2;

    score += importance * 20;


    // Difficulty

    const difficulty =
        Number(task.difficulty) || 2;

    score += difficulty * 10;


    // Deadline

    if (task.deadline) {

        const deadline =
            new Date(task.deadline);

        const now =
            new Date();

        const hoursLeft =
            (deadline - now) /
            (1000 * 60 * 60);


        if (hoursLeft <= 0) {
            score += 60;
        }

        else if (hoursLeft <= 24) {
            score += 50;
        }

        else if (hoursLeft <= 48) {
            score += 40;
        }

        else if (hoursLeft <= 72) {
            score += 30;
        }

        else if (hoursLeft <= 168) {
            score += 20;
        }

        else {
            score += 5;
        }
    }


    return score;
}


// =========================================
// COMPLETE TASK FROM DASHBOARD
// =========================================

async function completeDashboardTask(taskId) {

    try {

        await apiRequest(
            `/api/tasks/${taskId}`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    completed: true
                })
            }
        );


        showToast("Task completed ✓");

        await loadDashboard();

    } catch (error) {

        console.error(error);
    }
}


// =========================================
// INITIAL LOAD
// =========================================

loadDashboard();