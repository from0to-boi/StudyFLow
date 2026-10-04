from flask import Flask, render_template, request, jsonify
import sqlite3
from datetime import datetime

from dotenv import load_dotenv

from ai import generate_ai_plan, generate_ai_replan
from planner import build_basic_plan


# =========================================
# CONFIGURATION
# =========================================

load_dotenv()

app = Flask(__name__)

DATABASE = "studyflow.db"


# =========================================
# DATABASE
# =========================================

def get_db():

    conn = sqlite3.connect(DATABASE)

    conn.row_factory = sqlite3.Row

    return conn


def init_db():

    conn = get_db()

    conn.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            subject TEXT NOT NULL,
            deadline TEXT NOT NULL,
            estimated_minutes INTEGER NOT NULL,
            difficulty INTEGER DEFAULT 2,
            importance INTEGER DEFAULT 2,
            completed INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    conn.execute("""
        CREATE TABLE IF NOT EXISTS study_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER,
            started_at TEXT,
            ended_at TEXT,
            duration_minutes INTEGER DEFAULT 0,
            FOREIGN KEY(task_id) REFERENCES tasks(id)
        )
    """)

    conn.commit()

    conn.close()


# =========================================
# PAGES
# =========================================

@app.route("/")
def dashboard():

    return render_template("dashboard.html")


@app.route("/tasks")
def tasks_page():

    return render_template("tasks.html")


@app.route("/planner")
def planner_page():

    return render_template("planner.html")


@app.route("/progress")
def progress_page():

    return render_template("progress.html")


# =========================================
# TASKS API
# =========================================

@app.route("/api/tasks", methods=["GET"])
def get_tasks():

    conn = get_db()

    tasks = conn.execute("""
        SELECT *
        FROM tasks
        ORDER BY completed ASC, deadline ASC
    """).fetchall()

    conn.close()

    return jsonify([
        dict(task)
        for task in tasks
    ])


@app.route("/api/tasks", methods=["POST"])
def add_task():

    data = request.get_json() or {}

    title = data.get("title", "").strip()

    subject = data.get("subject", "").strip()

    deadline = data.get("deadline", "")

    estimated_minutes = data.get(
        "estimated_minutes",
        30
    )

    difficulty = data.get(
        "difficulty",
        2
    )

    importance = data.get(
        "importance",
        2
    )


    if not title or not subject or not deadline:

        return jsonify({
            "error":
                "Please fill in all required fields."
        }), 400


    try:

        estimated_minutes = int(
            estimated_minutes
        )

        difficulty = int(
            difficulty
        )

        importance = int(
            importance
        )

    except (ValueError, TypeError):

        return jsonify({
            "error":
                "Invalid task values."
        }), 400


    if estimated_minutes < 5:

        return jsonify({
            "error":
                "Estimated time must be at least 5 minutes."
        }), 400


    if difficulty not in [1, 2, 3]:

        return jsonify({
            "error":
                "Invalid difficulty."
        }), 400


    if importance not in [1, 2, 3]:

        return jsonify({
            "error":
                "Invalid importance."
        }), 400


    conn = get_db()

    cursor = conn.execute("""
        INSERT INTO tasks (
            title,
            subject,
            deadline,
            estimated_minutes,
            difficulty,
            importance,
            completed,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, 0, ?)
    """, (
        title,
        subject,
        deadline,
        estimated_minutes,
        difficulty,
        importance,
        datetime.now().isoformat()
    ))


    conn.commit()

    task_id = cursor.lastrowid


    task = conn.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
    """, (task_id,)).fetchone()


    conn.close()


    return jsonify(
        dict(task)
    ), 201


@app.route(
    "/api/tasks/<int:task_id>",
    methods=["PATCH"]
)
def update_task(task_id):

    data = request.get_json() or {}

    conn = get_db()


    task = conn.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
    """, (task_id,)).fetchone()


    if not task:

        conn.close()

        return jsonify({
            "error":
                "Task not found."
        }), 404


    completed = data.get(
        "completed",
        task["completed"]
    )


    conn.execute("""
        UPDATE tasks
        SET completed = ?
        WHERE id = ?
    """, (
        int(bool(completed)),
        task_id
    ))


    conn.commit()


    updated_task = conn.execute("""
        SELECT *
        FROM tasks
        WHERE id = ?
    """, (task_id,)).fetchone()


    conn.close()


    return jsonify(
        dict(updated_task)
    )


@app.route(
    "/api/tasks/<int:task_id>",
    methods=["DELETE"]
)
def delete_task(task_id):

    conn = get_db()

    conn.execute("""
        DELETE FROM tasks
        WHERE id = ?
    """, (task_id,))

    conn.commit()

    conn.close()


    return jsonify({
        "success": True
    })


# =========================================
# STATS API
# =========================================

@app.route("/api/stats", methods=["GET"])
def get_stats():

    conn = get_db()


    total_tasks = conn.execute("""
        SELECT COUNT(*)
        FROM tasks
    """).fetchone()[0]


    completed_tasks = conn.execute("""
        SELECT COUNT(*)
        FROM tasks
        WHERE completed = 1
    """).fetchone()[0]


    total_study_time = conn.execute("""
        SELECT COALESCE(
            SUM(duration_minutes),
            0
        )
        FROM study_sessions
    """).fetchone()[0]


    pending_tasks =  total_tasks - completed_tasks


    if total_tasks > 0:

        completion_percentage = round(
            (completed_tasks / total_tasks) * 100
        )

    else:

        completion_percentage = 0


    conn.close()


    return jsonify({

        "total_tasks":
            total_tasks,

        "completed_tasks":
            completed_tasks,

        "pending_tasks":
            pending_tasks,

        "study_minutes":
            total_study_time,

        "completion_percentage":
            completion_percentage
    })


# =========================================
# STUDY SESSIONS API
# =========================================

@app.route(
    "/api/sessions",
    methods=["POST"]
)
def add_session():

    data = request.get_json() or {}

    task_id = data.get("task_id")

    duration = data.get(
        "duration_minutes",
        0
    )


    try:

        duration = int(duration)

    except (ValueError, TypeError):

        return jsonify({
            "error":
                "Invalid duration."
        }), 400


    if duration < 0:

        return jsonify({
            "error":
                "Duration cannot be negative."
        }), 400


    conn = get_db()


    conn.execute("""
        INSERT INTO study_sessions (
            task_id,
            started_at,
            ended_at,
            duration_minutes
        )
        VALUES (?, ?, ?, ?)
    """, (
        task_id,
        data.get("started_at"),
        data.get("ended_at"),
        duration
    ))


    conn.commit()

    conn.close()


    return jsonify({
        "success": True
    }), 201


# =========================================
# 🤖 AI STUDY PLANNER API
# =========================================

@app.route(
    "/api/plan",
    methods=["POST"]
)
def generate_plan():

    data = request.get_json() or {}


    # -----------------------------------------
    # Validate available time
    # -----------------------------------------

    try:

        available_minutes = int(
            data.get(
                "available_minutes",
                0
            )
        )

    except (ValueError, TypeError):

        return jsonify({
            "error":
                "Invalid available time."
        }), 400


    if available_minutes < 10:

        return jsonify({
            "error":
                "You need at least 10 minutes."
        }), 400


    if available_minutes > 1440:

        return jsonify({
            "error":
                "Available time cannot exceed 24 hours."
        }), 400


    # -----------------------------------------
    # Get unfinished tasks
    # -----------------------------------------

    conn = get_db()


    tasks = conn.execute("""
        SELECT *
        FROM tasks
        WHERE completed = 0
        ORDER BY deadline ASC
    """).fetchall()

    conn.close()

    # Convert SQLite Row objects to normal dictionaries
    tasks = [dict(task) for task in tasks]

    # -----------------------------------------
    # No tasks
    # -----------------------------------------

    if not tasks:

        return jsonify({

            "plan": [],

            "explanation":
                "You have no unfinished tasks. "
                "Enjoy your free time!"
        })


    # -----------------------------------------
    # 🤖 Try Groq AI first
    # -----------------------------------------

    ai_plan = generate_ai_plan(
        tasks,
        available_minutes
    )


    if ai_plan is not None:

        return jsonify({

            "plan":
                ai_plan.get(
                    "plan",
                    []
                ),

            "explanation":
                ai_plan.get(
                    "explanation",
                    "Your plan was created by StudyFlow AI."
                ),

            "source":
                "groq"

        })


    # -----------------------------------------
    # 🛟 AI unavailable → fallback planner
    # -----------------------------------------

    basic_plan = build_basic_plan(
        tasks,
        available_minutes
    )


    return jsonify({

        "plan":
            basic_plan.get(
                "plan",
                []
            ),

        "explanation":
            basic_plan.get(
                "explanation",
                "Your plan was created using StudyFlow's built-in planner."
            ),

        "source":
            "fallback"

    })

# =========================================
# 🔄 AI EMERGENCY REPLANNER API
# =========================================

@app.route("/api/replan", methods=["POST"])
def replan():

    data = request.get_json() or {}

    situation = data.get(
        "situation",
        ""
    ).strip()

    try:

        available_minutes = int(
            data.get(
                "available_minutes",
                0
            )
        )

    except (ValueError, TypeError):

        return jsonify({
            "error":
                "Invalid available time."
        }), 400


    if not situation:

        return jsonify({
            "error":
                "Please explain what happened."
        }), 400


    if available_minutes < 10:

        return jsonify({
            "error":
                "You need at least 10 minutes."
        }), 400


    if available_minutes > 1440:

        return jsonify({
            "error":
                "Available time cannot exceed 24 hours."
        }), 400


    # -----------------------------------------
    # Get unfinished tasks
    # -----------------------------------------

    conn = get_db()

    tasks = conn.execute("""
        SELECT *
        FROM tasks
        WHERE completed = 0
        ORDER BY deadline ASC
    """).fetchall()

    conn.close()


    # Convert SQLite Row → dictionary

    tasks = [
        dict(task)
        for task in tasks
    ]


    # -----------------------------------------
    # No unfinished tasks
    # -----------------------------------------

    if not tasks:

        return jsonify({

            "plan": [],

            "explanation":
                "You have no unfinished tasks left."

        })


    # -----------------------------------------
    # Previous AI plan
    # -----------------------------------------

    previous_plan = data.get(
        "previous_plan",
        []
    )


    # -----------------------------------------
    # 🤖 Ask Groq to rebuild the plan
    # -----------------------------------------

    replanned = generate_ai_replan(

        tasks,

        previous_plan,

        situation,

        available_minutes

    )


    # -----------------------------------------
    # Groq succeeded
    # -----------------------------------------

    if replanned is not None:

        return jsonify({

            "plan":
                replanned.get(
                    "plan",
                    []
                ),

            "explanation":
                replanned.get(
                    "explanation",
                    "Your schedule has been rebuilt."
                ),

            "source":
                "groq"

        })


    # -----------------------------------------
    # 🛟 Groq failed → fallback planner
    # -----------------------------------------

    basic_plan = build_basic_plan(

        tasks,

        available_minutes

    )


    return jsonify({

        "plan":
            basic_plan.get(
                "plan",
                []
            ),

        "explanation":
            basic_plan.get(
                "explanation",
                "Your schedule was rebuilt using "
                "StudyFlow's built-in planner."
            ),

        "source":
            "fallback"

    })

# =========================================
# START SERVER
# =========================================

if __name__ == "__main__":

    init_db()

    app.run(
        debug=True,
        host="127.0.0.1",
        port=5000
    )
