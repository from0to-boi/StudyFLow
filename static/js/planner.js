// =========================================
// STUDYFLOW — AI PLANNER + EMERGENCY REPLANNER
// =========================================


// =========================================
// AI PLANNER ELEMENTS
// =========================================

const plannerForm = document.getElementById("plannerForm");
const availableMinutesInput =
    document.getElementById("availableMinutes");

const generatePlanButton =
    document.getElementById("generatePlanButton");

const planList =
    document.getElementById("planList");

const planTotalTime =
    document.getElementById("planTotalTime");

const aiExplanationCard =
    document.getElementById("aiExplanationCard");

const aiExplanation =
    document.getElementById("aiExplanation");


// =========================================
// STORE THE CURRENT AI PLAN
// =========================================

// We need this when the student clicks
// "I'm behind" so the backend knows
// what the original plan looked like.

let currentPlan = [];


// =========================================
// GENERATE ORIGINAL PLAN
// =========================================

plannerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const availableMinutes =
        Number(availableMinutesInput.value);

    if (!availableMinutes || availableMinutes < 10) {

        showToast(
            "Please enter at least 10 minutes."
        );

        return;
    }

    generatePlanButton.disabled = true;

    generatePlanButton.textContent =
        "✦ Planning...";


    planList.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>

            <p>
                StudyFlow AI is analyzing your workload...
            </p>
        </div>
    `;


    aiExplanationCard.style.display =
        "none";


    try {

        const result = await apiRequest(
            "/api/plan",
            {
                method: "POST",

                body: JSON.stringify({
                    available_minutes:
                        availableMinutes
                })
            }
        );


        // Save the plan so the emergency
        // replanner can use it later.

        currentPlan =
            result.plan || [];


        renderPlan(result);


    } catch (error) {

        console.error(error);


        planList.innerHTML = `
            <div class="empty-state">
                <div>

                    <div class="empty-icon">
                        !
                    </div>

                    <p>
                        We couldn't generate your plan.
                    </p>

                    <p style="
                        margin-top: 6px;
                        color: var(--text-muted);
                        font-size: 10px;
                    ">
                        Make sure you have added some
                        unfinished tasks.
                    </p>

                </div>
            </div>
        `;

    } finally {

        generatePlanButton.disabled =
            false;

        generatePlanButton.textContent =
            "✦ Generate Plan";
    }

});


// =========================================
// RENDER ORIGINAL PLAN
// =========================================

function renderPlan(result) {

    const plan =
        result.plan || [];

    const explanation =
        result.explanation || "";


    currentPlan = plan;


    if (plan.length === 0) {

        planList.innerHTML = `
            <div class="empty-state">
                <div>

                    <div class="empty-icon">
                        ✓
                    </div>

                    <p>
                        You don't have any unfinished tasks.
                    </p>

                    <p style="
                        margin-top: 6px;
                        color: var(--text-muted);
                        font-size: 10px;
                    ">
                        You're all caught up.
                        Enjoy your free time!
                    </p>

                </div>
            </div>
        `;

        planTotalTime.textContent =
            "0 min";

        return;
    }


    const totalTime =
        plan.reduce(
            (total, item) =>
                total + Number(
                    item.duration || 0
                ),
            0
        );


    planTotalTime.textContent =
        formatMinutes(totalTime);


    if (explanation) {

        aiExplanation.textContent =
            explanation;

        aiExplanationCard.style.display =
            "block";
    }


    planList.innerHTML =
        plan.map(
            (item, index) => {

                const isBreak =
                    item.type === "break";


                if (isBreak) {

                    return `
                        <div class="plan-item plan-break">

                            <div class="plan-number">
                                ${index + 1}
                            </div>

                            <div class="plan-content">

                                <div class="plan-title">
                                    ☕
                                    ${escapeHTML(
                                        item.task
                                    )}
                                </div>

                                <div class="plan-meta">
                                    ${escapeHTML(
                                        item.reason ||
                                        "Take a short break."
                                    )}
                                </div>

                            </div>

                            <div class="plan-duration">
                                ${formatMinutes(
                                    item.duration
                                )}
                            </div>

                        </div>
                    `;
                }


                return `
                    <div class="plan-item">

                        <div class="plan-number">
                            ${index + 1}
                        </div>

                        <div class="plan-content">

                            <div class="plan-title">
                                ${escapeHTML(
                                    item.task
                                )}
                            </div>

                            <div class="plan-meta">

                                <span>
                                    ${escapeHTML(
                                        item.subject
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        item.reason ||
                                        "Focus on this task."
                                    )}
                                </span>

                            </div>

                        </div>

                        <div class="plan-duration">
                            ${formatMinutes(
                                item.duration
                            )}
                        </div>

                    </div>
                `;
            }
        ).join("");

}


// =========================================
// EMERGENCY REPLANNER ELEMENTS
// =========================================

const replannerStart =
    document.getElementById(
        "replannerStart"
    );

const showReplannerButton =
    document.getElementById(
        "showReplannerButton"
    );

const replannerFormContainer =
    document.getElementById(
        "replannerFormContainer"
    );

const replanSituation =
    document.getElementById(
        "replanSituation"
    );

const replanMinutes =
    document.getElementById(
        "replanMinutes"
    );

const replanButton =
    document.getElementById(
        "replanButton"
    );

const cancelReplanButton =
    document.getElementById(
        "cancelReplanButton"
    );

const replannerLoading =
    document.getElementById(
        "replannerLoading"
    );

const replannerResult =
    document.getElementById(
        "replannerResult"
    );

const replanExplanation =
    document.getElementById(
        "replanExplanation"
    );

const replanList =
    document.getElementById(
        "replanList"
    );

const replanTotalTime =
    document.getElementById(
        "replanTotalTime"
    );

const newReplanButton =
    document.getElementById(
        "newReplanButton"
    );


// =========================================
// SHOW REPLANNER FORM
// =========================================

showReplannerButton.addEventListener(
    "click",
    () => {

        replannerStart.style.display =
            "none";

        replannerFormContainer.style.display =
            "block";

        replannerResult.style.display =
            "none";

        replanSituation.focus();

    }
);


// =========================================
// CANCEL REPLANNER
// =========================================

cancelReplanButton.addEventListener(
    "click",
    () => {

        replannerFormContainer.style.display =
            "none";

        replannerStart.style.display =
            "block";

        replanSituation.value = "";

    }
);


// =========================================
// GENERATE NEW PLAN
// =========================================

replanButton.addEventListener(
    "click",
    async () => {

        const situation =
            replanSituation.value.trim();

        const minutes =
            Number(replanMinutes.value);


        // -----------------------------
        // VALIDATION
        // -----------------------------

        if (!situation) {

            showToast(
                "Tell StudyFlow what happened."
            );

            replanSituation.focus();

            return;
        }


        if (!minutes || minutes < 10) {

            showToast(
                "Please enter at least 10 minutes."
            );

            replanMinutes.focus();

            return;
        }


        if (currentPlan.length === 0) {

            showToast(
                "Generate a study plan first."
            );

            return;
        }


        // -----------------------------
        // LOADING STATE
        // -----------------------------

        replanButton.disabled =
            true;

        cancelReplanButton.disabled =
            true;


        replannerFormContainer.style.display =
            "none";

        replannerLoading.style.display =
            "block";

        replannerResult.style.display =
            "none";


        try {

            // -----------------------------
            // SEND TO FLASK
            // -----------------------------

            const result =
                await apiRequest(
                    "/api/replan",
                    {
                        method: "POST",

                        body: JSON.stringify({

                            situation:
                                situation,

                            available_minutes:
                                minutes,

                            previous_plan:
                                currentPlan

                        })
                    }
                );


            // -----------------------------
            // SAVE NEW PLAN
            // -----------------------------

            currentPlan =
                result.plan || [];


            // -----------------------------
            // DISPLAY RESULT
            // -----------------------------

            renderReplannedPlan(
                result
            );


        } catch (error) {

            console.error(
                "Replanner error:",
                error
            );


            showToast(
                "We couldn't rebuild your plan."
            );


            replannerFormContainer.style.display =
                "block";

        } finally {

            replanButton.disabled =
                false;

            cancelReplanButton.disabled =
                false;

            replannerLoading.style.display =
                "none";
        }

    }
);


// =========================================
// RENDER REPLANNED PLAN
// =========================================

function renderReplannedPlan(result) {

    const plan =
        result.plan || [];

    const explanation =
        result.explanation || "";


    // -----------------------------
    // EXPLANATION
    // -----------------------------

    replanExplanation.textContent =
        explanation;


    // -----------------------------
    // EMPTY PLAN
    // -----------------------------

    if (plan.length === 0) {

        replanList.innerHTML = `
            <div class="empty-state">

                <div>

                    <div class="empty-icon">
                        !
                    </div>

                    <p>
                        There isn't enough time
                        for any of your tasks.
                    </p>

                </div>

            </div>
        `;

        replanTotalTime.textContent =
            "0 min";

        replannerResult.style.display =
            "block";

        return;
    }


    // -----------------------------
    // TOTAL TIME
    // -----------------------------

    const totalTime =
        plan.reduce(
            (total, item) =>
                total +
                Number(
                    item.duration || 0
                ),
            0
        );


    replanTotalTime.textContent =
        formatMinutes(totalTime);


    // -----------------------------
    // RENDER ITEMS
    // -----------------------------

    replanList.innerHTML =
        plan.map(
            (item, index) => {

                const isBreak =
                    item.type === "break";


                if (isBreak) {

                    return `
                        <div class="plan-item plan-break">

                            <div class="plan-number">
                                ${index + 1}
                            </div>

                            <div class="plan-content">

                                <div class="plan-title">
                                    ☕
                                    ${escapeHTML(
                                        item.task
                                    )}
                                </div>

                                <div class="plan-meta">
                                    ${escapeHTML(
                                        item.reason ||
                                        "Take a short break."
                                    )}
                                </div>

                            </div>

                            <div class="plan-duration">
                                ${formatMinutes(
                                    item.duration
                                )}
                            </div>

                        </div>
                    `;
                }


                return `
                    <div class="plan-item">

                        <div class="plan-number">
                            ${index + 1}
                        </div>

                        <div class="plan-content">

                            <div class="plan-title">
                                ${escapeHTML(
                                    item.task
                                )}
                            </div>

                            <div class="plan-meta">

                                <span>
                                    ${escapeHTML(
                                        item.subject
                                    )}
                                </span>

                                <span>•</span>

                                <span>
                                    ${escapeHTML(
                                        item.reason ||
                                        "Prioritized for you."
                                    )}
                                </span>

                            </div>

                        </div>

                        <div class="plan-duration">
                            ${formatMinutes(
                                item.duration
                            )}
                        </div>

                    </div>
                `;
            }
        ).join("");


    // -----------------------------
    // SHOW RESULT
    // -----------------------------

    replannerResult.style.display =
        "block";

}


// =========================================
// REPLAN AGAIN
// =========================================

newReplanButton.addEventListener(
    "click",
    () => {

        replannerResult.style.display =
            "none";

        replannerFormContainer.style.display =
            "block";

        replanSituation.value = "";

        replanSituation.focus();

    }
);


// =========================================
// HELPER
// =========================================

function setPlannerTime(minutes) {

    availableMinutesInput.value =
        minutes;

    availableMinutesInput.focus();

}


// =========================================
// INITIAL UI
// =========================================

planTotalTime.textContent =
    "0 min";