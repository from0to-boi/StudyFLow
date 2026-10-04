from datetime import datetime
import math


def priority_score(task):
    """
    Calculate how urgently a task should be studied.

    Higher score = higher priority.
    """

    score = 0

    # -------------------------
    # IMPORTANCE
    # -------------------------

    importance = int(task.get("importance", 2))

    if importance == 3:
        score += 30
    elif importance == 2:
        score += 20
    else:
        score += 10

    # -------------------------
    # DIFFICULTY
    # -------------------------

    difficulty = int(task.get("difficulty", 2))

    if difficulty == 3:
        score += 20
    elif difficulty == 2:
        score += 12
    else:
        score += 6

    # -------------------------
    # DEADLINE
    # -------------------------

    deadline = task.get("deadline")

    if deadline:

        try:
            deadline_date = datetime.fromisoformat(deadline)

            now = datetime.now()

            hours_left = (
                deadline_date - now
            ).total_seconds() / 3600

            if hours_left <= 0:
                score += 50

            elif hours_left <= 24:
                score += 45

            elif hours_left <= 48:
                score += 35

            elif hours_left <= 72:
                score += 25

            elif hours_left <= 7 * 24:
                score += 15

            else:
                score += 5

        except (ValueError, TypeError):
            pass

    # -------------------------
    # ESTIMATED TIME
    # -------------------------

    estimated = int(
        task.get("estimated_minutes", 30)
    )

    # Slightly prioritize longer tasks
    if estimated >= 120:
        score += 10

    elif estimated >= 60:
        score += 7

    elif estimated >= 30:
        score += 4

    return score


def build_basic_plan(tasks, available_minutes):
    """
    Creates a study plan without AI.

    This is our fallback if Gemini is unavailable.
    """

    if not tasks:
        return {
            "plan": [],
            "explanation": "You have no unfinished tasks. Enjoy your free time!"
        }

    # -------------------------
    # SORT TASKS BY PRIORITY
    # -------------------------

    sorted_tasks = sorted(
        tasks,
        key=priority_score,
        reverse=True
    )

    available_minutes = int(available_minutes)

    plan = []
    remaining_time = available_minutes

    # -------------------------
    # BUILD STUDY BLOCKS
    # -------------------------

    for task in sorted_tasks:

        if remaining_time <= 0:
            break

        estimated = int(
            task.get("estimated_minutes", 30)
        )

        # Maximum study block = 45 min
        duration = min(
            estimated,
            45,
            remaining_time
        )

        if duration <= 0:
            continue

        plan.append({
            "task": task["title"],
            "subject": task["subject"],
            "duration": duration,
            "type": "study",
            "reason": get_priority_reason(task)
        })

        remaining_time -= duration

        # -------------------------
        # ADD BREAK
        # -------------------------

        if remaining_time >= 10:

            plan.append({
                "task": "Short break",
                "subject": "Break",
                "duration": 10,
                "type": "break",
                "reason": "Take a short break to reset your focus."
            })

            remaining_time -= 10

    # -------------------------
    # EXPLANATION
    # -------------------------

    if plan:

        explanation = (
            "Your plan prioritizes tasks based on "
            "deadline, importance, and difficulty. "
            "Study blocks are kept short so the schedule "
            "stays realistic."
        )

    else:

        explanation = (
            "There isn't enough available time to create "
            "a useful study block."
        )

    return {
        "plan": plan,
        "explanation": explanation
    }


def get_priority_reason(task):
    """
    Generate a simple explanation for why
    a task was prioritized.
    """

    reasons = []

    importance = int(
        task.get("importance", 2)
    )

    difficulty = int(
        task.get("difficulty", 2)
    )

    if importance == 3:
        reasons.append("high importance")

    if difficulty == 3:
        reasons.append("high difficulty")

    deadline = task.get("deadline")

    if deadline:

        try:

            deadline_date = datetime.fromisoformat(
                deadline
            )

            hours_left = (
                deadline_date - datetime.now()
            ).total_seconds() / 3600

            if hours_left <= 24:
                reasons.append("deadline is very close")

            elif hours_left <= 48:
                reasons.append("deadline is approaching")

        except (ValueError, TypeError):
            pass

    if not reasons:
        return "This task was selected based on your current workload."

    return "Prioritized because of " + ", ".join(reasons) + "."


def estimate_required_time(tasks):
    """
    Returns the total estimated study time
    for all unfinished tasks.
    """

    total = 0

    for task in tasks:

        if not task.get("completed", 0):

            total += int(
                task.get("estimated_minutes", 0)
            )

    return total