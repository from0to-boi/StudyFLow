// =========================================
// STUDYFLOW — TASKS PAGE
// =========================================

const taskForm = document.getElementById("taskForm");
const tasksList = document.getElementById("tasksList");
const taskCount = document.getElementById("taskCount");
const addTaskButton = document.getElementById("addTaskButton");


// =========================================
// LOAD TASKS
// =========================================

async function loadTasks() {

    try {

        const tasks = await apiRequest("/api/tasks");

        renderTasks(tasks);

    } catch (error) {

        console.error(error);

        tasksList.innerHTML = `
            <div class="empty-state">
                <div>
                    <div class="empty-icon">!</div>
                    <p>Could not load your tasks.</p>
                </div>
            </div>
        `;
    }
}


// =========================================
// RENDER TASKS
// =========================================

function renderTasks(tasks) {

    if (!tasks || tasks.length === 0) {

        tasksList.innerHTML = `
            <div class="empty-state">
                <div>
                    <div class="empty-icon">✓</div>
                    <p>No tasks yet.</p>

                    <p style="
                        margin-top: 5px;
                        color: var(--text-muted);
                        font-size: 10px;
                    ">
                        Add your first task above.
                    </p>
                </div>
            </div>
        `;

        updateTaskCount(0, 0);

        return;
    }


    // =====================================
    // SORT TASKS
    // =====================================

    tasks.sort((a, b) => {

        const aCompleted = Number(a.completed) === 1;
        const bCompleted = Number(b.completed) === 1;

        // Completed tasks go to the bottom
        if (aCompleted !== bCompleted) {
            return aCompleted ? 1 : -1;
        }

        // Higher importance first
        if (Number(a.importance) !== Number(b.importance)) {
            return Number(b.importance) - Number(a.importance);
        }

        // Earlier deadline first
        return new Date(a.deadline) - new Date(b.deadline);

    });


    const completedCount = tasks.filter(
        task => Number(task.completed) === 1
    ).length;


    updateTaskCount(tasks.length, completedCount);


    tasksList.innerHTML = tasks.map(task => {

        const completed =
            Number(task.completed) === 1;

        const priority =
            getPriorityClass(task);

        const priorityLabel =
            getPriorityLabel(task);

        const deadlineStatus =
            getDeadlineStatus(task.deadline, completed);


        return `
            <div class="task-item 
                ${completed ? "completed" : ""} 
                ${deadlineStatus.className}"
            >

                <!-- CHECKBOX -->

                <button
                    class="task-check ${completed ? "checked" : ""}"
                    onclick="toggleTask(${task.id}, ${completed})"
                    aria-label="Complete task"
                >
                    ${completed ? "✓" : ""}
                </button>


                <!-- TASK CONTENT -->

                <div class="task-main">

                    <div class="task-title">
                        ${escapeHTML(task.title)}
                    </div>


                    <div class="task-meta">

                        <span class="subject-badge">
                            ${escapeHTML(task.subject)}
                        </span>

                        <span>
                            ${formatMinutes(task.estimated_minutes)}
                        </span>

                        <span>•</span>

                        <span class="deadline-text">
                            ${deadlineStatus.label}
                        </span>

                    </div>

                </div>


                <!-- RIGHT SIDE -->

                <div class="task-right">

                    <span class="priority ${priority}">
                        ${priorityLabel}
                    </span>

                    <button
                        class="task-delete"
                        onclick="deleteTask(${task.id})"
                        aria-label="Delete task"
                        title="Delete task"
                    >
                        ×
                    </button>

                </div>

            </div>
        `;

    }).join("");
}


// =========================================
// TASK COUNT + PROGRESS
// =========================================

function updateTaskCount(total, completed) {

    if (total === 0) {

        taskCount.textContent = "0 tasks";

        return;
    }


    const percentage =
        Math.round((completed / total) * 100);


    taskCount.innerHTML = `
        ${completed}/${total} completed
        <span class="task-progress">
            · ${percentage}%
        </span>
    `;
}


// =========================================
// DEADLINE STATUS
// =========================================

function getDeadlineStatus(deadline, completed) {

    if (completed) {

        return {
            label: "Completed",
            className: "deadline-completed"
        };
    }


    const now = new Date();
    const due = new Date(deadline);

    const difference =
        due.getTime() - now.getTime();


    // Already overdue
    if (difference < 0) {

        return {
            label: "Overdue",
            className: "deadline-overdue"
        };
    }


    // Less than 24 hours
    if (difference <= 24 * 60 * 60 * 1000) {

        return {
            label: "Due soon",
            className: "deadline-soon"
        };
    }


    return {
        label: `Due ${formatDeadline(deadline)}`,
        className: ""
    };
}


// =========================================
// ADD TASK
// =========================================

taskForm.addEventListener("submit", async (event) => {

    event.preventDefault();


    const title =
        document.getElementById("title").value.trim();

    const subject =
        document.getElementById("subject").value.trim();

    const deadline =
        document.getElementById("deadline").value;

    const estimatedMinutes =
        document.getElementById("estimated_minutes").value;

    const difficulty =
        document.getElementById("difficulty").value;

    const importance =
        document.getElementById("importance").value;


    if (!title || !subject || !deadline) {

        showToast("Please fill in all required fields.");

        return;
    }


    addTaskButton.disabled = true;

    addTaskButton.textContent = "Adding...";


    try {

        await apiRequest("/api/tasks", {

            method: "POST",

            body: JSON.stringify({

                title: title,

                subject: subject,

                deadline: deadline,

                estimated_minutes:
                    Number(estimatedMinutes),

                difficulty:
                    Number(difficulty),

                importance:
                    Number(importance)

            })

        });


        showToast("Task added successfully ✓");


        taskForm.reset();


        document.getElementById(
            "estimated_minutes"
        ).value = 30;


        document.getElementById(
            "difficulty"
        ).value = 2;


        document.getElementById(
            "importance"
        ).value = 2;


        await loadTasks();

    } catch (error) {

        console.error(error);

    } finally {

        addTaskButton.disabled = false;

        addTaskButton.textContent = "+ Add Task";
    }

});


// =========================================
// COMPLETE / UNCOMPLETE TASK
// =========================================

async function toggleTask(taskId, completed) {

    try {

        await apiRequest(
            `/api/tasks/${taskId}`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    completed: !completed
                })
            }
        );


        if (!completed) {

            showToast("Task completed ✓");

        } else {

            showToast("Task marked as incomplete.");

        }


        await loadTasks();

    } catch (error) {

        console.error(error);

    }
}


// =========================================
// DELETE TASK
// =========================================

async function deleteTask(taskId) {

    const confirmed =
        confirm("Delete this task?");


    if (!confirmed) {
        return;
    }


    try {

        await apiRequest(
            `/api/tasks/${taskId}`,
            {
                method: "DELETE"
            }
        );


        showToast("Task deleted.");


        await loadTasks();

    } catch (error) {

        console.error(error);

    }
}


// =========================================
// INITIAL LOAD
// =========================================

loadTasks();