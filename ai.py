import os
import json

from groq import Groq
from dotenv import load_dotenv

load_dotenv()


def generate_ai_plan(tasks, available_minutes):
    """
    Generate a personalized study plan using Groq AI.
    """

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        print("GROQ_API_KEY not found.")
        return None

    try:
        client = Groq(api_key=api_key)

        task_data = []

        for task in tasks:
            task_data.append({
                "title": task["title"],
                "subject": task["subject"],
                "deadline": task["deadline"],
                "estimated_minutes": task["estimated_minutes"],
                "difficulty": task["difficulty"],
                "importance": task["importance"]
            })

        prompt = f"""
You are StudyFlow AI, a practical and realistic study coach.

The student has {available_minutes} minutes available today.

Here are their unfinished tasks:

{json.dumps(task_data, indent=2)}

Create the best possible study plan for the student.

Rules:
1. Prioritize tasks with closer deadlines.
2. Consider importance and difficulty.
3. Never exceed the student's available time.
4. Use focused study blocks between 25 and 45 minutes.
5. Add short breaks when appropriate.
6. Do NOT invent tasks.
7. Use the exact task titles when referring to tasks.
8. If there is not enough time to finish a task, schedule a realistic portion of it.
9. Keep the explanation short and useful.
10. The plan should feel realistic for an actual student.

Return ONLY valid JSON in this exact format:

{{
    "plan": [
        {{
            "task": "Exact task title",
            "subject": "Subject",
            "duration": 30,
            "type": "Study",
            "reason": "Short reason"
        }}
    ],
    "explanation": "Short explanation of the plan."
}}
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        ai_text = response.choices[0].message.content

        result = json.loads(ai_text)

        total_time = sum(
            item.get("duration", 0)
            for item in result.get("plan", [])
        )

        if total_time > available_minutes:
            print("AI plan exceeded available time.")
            return None

        return result

    except json.JSONDecodeError as error:
        print("Groq returned invalid JSON:", error)
        return None

    except Exception as error:
        print("Groq error:", error)
        return None
def generate_ai_replan(
    tasks,
    previous_plan,
    situation,
    available_minutes
):
    """
    Rebuild a study plan when the student falls behind.
    """

    api_key = os.getenv("GROQ_API_KEY")

    if not api_key:
        print("GROQ_API_KEY not found.")
        return None

    try:
        client = Groq(api_key=api_key)

        task_data = []

        for task in tasks:
            task_data.append({
                "title": task["title"],
                "subject": task["subject"],
                "deadline": task["deadline"],
                "estimated_minutes": task["estimated_minutes"],
                "difficulty": task["difficulty"],
                "importance": task["importance"]
            })

        prompt = f"""
You are StudyFlow AI, an adaptive study coach.

The student originally created a study plan,
but something went wrong and they have fallen behind.

STUDENT'S CURRENT SITUATION:
{situation}

TIME REMAINING:
{available_minutes} minutes

UNFINISHED TASKS:
{json.dumps(task_data, indent=2)}

PREVIOUS PLAN:
{json.dumps(previous_plan, indent=2)}

Create a NEW realistic study plan.

Rules:
1. Prioritize tasks with the closest deadlines.
2. Consider importance and difficulty.
3. Protect urgent tasks whenever possible.
4. Do not invent tasks.
5. Use the exact task titles provided.
6. Never exceed the available time.
7. Use focused study blocks between 25 and 45 minutes when possible.
8. If necessary, shorten lower-priority tasks.
9. If a task cannot fit, leave it out rather than exceeding the time.
10. Explain important tradeoffs briefly.
11. The new plan should adapt to what happened.
12. Return ONLY valid JSON.

Return exactly this format:

{{
    "plan": [
        {{
            "task": "Exact task title",
            "subject": "Subject",
            "duration": 30,
            "type": "Study",
            "reason": "Short reason"
        }}
    ],
    "explanation": "Short explanation of what changed and why."
}}
"""

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3
        )

        ai_text = response.choices[0].message.content

        result = json.loads(ai_text)

        total_time = sum(
            item.get("duration", 0)
            for item in result.get("plan", [])
        )

        if total_time > available_minutes:
            print("AI replan exceeded available time.")
            return None

        return result

    except json.JSONDecodeError as error:
        print("Groq returned invalid JSON:", error)
        return None

    except Exception as error:
        print("Groq replan error:", error)
        return None