from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pydantic import BaseModel, field_validator
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import requests
import os
import re
import json
import uuid
import logging
from datetime import datetime, timedelta

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

API_URL    = "https://api.groq.com/openai/v1/chat/completions"
API_KEY    = os.environ.get("GROQ_API_KEY")
MODEL_NAME = "llama-3.1-8b-instant"

MAX_SESSION_TURNS = 12
SESSION_TTL_HOURS = 2

TRAITS = ["strength", "intelligence", "wisdom", "charisma", "dexterity", "constitution"]

sessions: dict = {}

def _purge_expired():
    """Remove sessions older than SESSION_TTL_HOURS."""
    cutoff = datetime.utcnow() - timedelta(hours=SESSION_TTL_HOURS)
    expired = [sid for sid, s in sessions.items() if s["created_at"] < cutoff]
    for sid in expired:
        del sessions[sid]
    if expired:
        logger.info("Purged %d expired sessions", len(expired))

def get_session(session_id: str) -> dict:
    _purge_expired()
    session = sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please start a new adventure.")
    return session

class StartRequest(BaseModel):
    player_name: str
    original_setting: str
    companion: str = "bunny"

    @field_validator("companion")
    @classmethod
    def companion_known(cls, v):
        v = (v or "bunny").strip().lower()
        allowed = {"bunny", "fox", "cat", "dog", "ghost", "chick"}
        return v if v in allowed else "bunny"

    @field_validator("player_name")
    @classmethod
    def name_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("player_name cannot be empty")
        return v[:32] 

    @field_validator("original_setting")
    @classmethod
    def setting_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("original_setting cannot be empty")
        return v[:300]

class ContinueRequest(BaseModel):
    session_id: str
    chosen_option: str

    @field_validator("chosen_option")
    @classmethod
    def option_not_empty(cls, v):
        v = v.strip()
        if not v:
            raise ValueError("chosen_option cannot be empty")
        return v[:200]

class SummaryRequest(BaseModel):
    session_id: str

def build_system_prompt(original_setting: str, player_name: str, choice_count: int, companion: str = "bunny", plan: dict = None) -> str:
    if choice_count <= 3:
        phase, phase_guidance = "beginning", "Introduce the world and character with warmth and wonder. Establish the setting vividly."
    elif choice_count <= 7:
        phase, phase_guidance = "middle", "Deepen the adventure. Raise stakes, introduce interesting obstacles or companions."
    elif choice_count <= 10:
        phase, phase_guidance = "climax", "Build to the peak moment. Make choices feel weighty and exciting."
    else:
        phase, phase_guidance = "ending", "Bring the story to a satisfying, heartfelt close."

    json_schema = ''
    if phase == "ending":
        json_schema = '''
IMPORTANT: This is the final chapter. Write a warm, conclusive ending paragraph.
Respond with ONLY valid JSON in this exact shape:
{"story": "<ending paragraph>", "choices": [], "is_ending": true}'''
    else:
        json_schema = '''
IMPORTANT: Always respond with ONLY valid JSON in this exact shape — no prose outside it:
{"story": "<60-90 word story segment>", "choices": ["<choice 1 as plain text>", "<choice 2 as plain text>", "<choice 3 as plain text>"], "choice_traits": ["<trait for choice 1>", "<trait for choice 2>", "<trait for choice 3>"], "is_ending": false}

The "choices" array must contain exactly 3 plain strings — NOT objects, NOT {"text": ..., "key": ...}. Just plain text strings.
The "choice_traits" array must contain exactly 3 lowercase trait words, one per choice, in the same order, using only: strength, intelligence, wisdom, charisma, dexterity, constitution.'''

    plan_context = ""
    if plan:
        plan_context = f"""

PRIVATE STORY PLAN (never reveal this to the player — use it to steer the narrative naturally):
- Central hook: {plan.get('hook', '')}
- Possible escalation beats: {'; '.join(plan.get('escalation_beats', []))}
- Central tension to build toward: {plan.get('central_tension', '')}
- Possible ending directions: {'; '.join(plan.get('possible_endings', []))}

Use this plan as a loose compass, not a script. Lean into whichever escalation beats and ending direction the player's choices have made most plausible so far. The ending especially should feel like a natural payoff of this plan, not an arbitrary stop."""

    return f"""You are a warm, imaginative storyteller crafting a cozy pixel-art RPG adventure.

STORY CONTEXT:
- Setting: "{original_setting}"
- Hero: {player_name}
- Hero's companion animal: a {companion} (this {companion} travels with {player_name} throughout the story — feature it naturally and consistently; do NOT substitute, rename, or introduce a different companion animal)
- Phase: {phase}
- Turns taken: {choice_count}
{plan_context}

GUIDANCE: {phase_guidance}

WRITING STYLE:
- Keep story segments to 60-90 words — punchy and immersive.
- Write in second person ("You step forward...", "You notice...")
- Stay fully consistent with all previous story events.

CHOICE DESIGN (critical):
- Each choice must lead to a DIFFERENT next scene, not just a different way of doing the same thing. If choice 1 and choice 2 would plausibly result in the same story beat, rewrite one of them.
- Ground every choice in something concrete from the story segment you just wrote — a specific object, character, exit, or detail you mentioned. Do not invent generic options ("look around", "wait and see") unless nothing else fits.
- Vary the TARGET of the action, not just the tone. Examples of real variation: investigate a different object, talk to a different character, go through a different physical exit, make a decision that closes off one of the others.
- Avoid choices that are reorderings of the same verb-tone triad (bold/cautious/clever) applied to one idea. Each choice should imply a distinct direction the plot could go.

TRAIT MEANINGS (used for choice_traits below):
- strength = brute force/physical power
- intelligence = logic/puzzle-solving
- wisdom = intuition/perception/caution
- charisma = social/persuasion
- dexterity = stealth/agility/quick reflexes
- constitution = endurance/resilience/grit
Each of the 3 choices should map to a DIFFERENT trait where possible.
{json_schema}"""


def build_planning_prompt(original_setting: str, player_name: str, companion: str) -> str:
    """The planning agent: sketches a loose narrative arc for the whole adventure up front."""
    return f"""You are a story architect sketching the skeleton of a cozy pixel-art RPG adventure, BEFORE any prose is written.

STORY SEED:
- Setting: "{original_setting}"
- Hero: {player_name}
- Companion: a {companion}

Design a LOOSE narrative arc — not a rigid script, since the player's choices will shape the details. Provide:
- A central hook or mystery that gives the adventure a throughline (why is this world interesting right now?)
- 2-3 possible escalation beats that could occur in the middle of the story (obstacles, revelations, or complications — phrase these as possibilities, not certainties, since player choices will determine which happen)
- A primary tension or question the story should be building toward resolving by the end
- 2-3 possible shapes the ending could take depending on how the player has acted (NOT full endings, just resolution directions)

Keep this concise — a planning sketch, not prose. This will never be shown to the player directly; it's a private guide for the storyteller.

Respond with ONLY valid JSON in this exact shape:
{{"hook": "<1-2 sentences>", "escalation_beats": ["<beat 1>", "<beat 2>", "<beat 3>"], "central_tension": "<1 sentence>", "possible_endings": ["<direction 1>", "<direction 2>", "<direction 3>"]}}"""


def build_plan_revision_prompt(plan: dict, original_setting: str, player_name: str, recent_choice: str, choice_count: int) -> str:
    """Lightweight check: has the player diverged enough from the plan to warrant revising it?"""
    plan_json = json.dumps(plan)
    return f"""You are reviewing a story plan for a cozy pixel-art RPG adventure to see if it still fits.

ORIGINAL PLAN:
{plan_json}

CONTEXT:
- Setting: "{original_setting}"
- Hero: {player_name}
- Turn: {choice_count}
- Player's most recent choice: "{recent_choice}"

Has the player's choice meaningfully diverged from what this plan assumed (e.g. ignored the central hook, pursued something the plan didn't anticipate, made the planned escalation beats no longer make sense)?

If the plan still fits reasonably well, return it UNCHANGED.
If it needs adjustment, revise only what's necessary — keep the parts that still work, update the parts that don't.

Respond with ONLY valid JSON in this exact shape (same shape as the original plan):
{{"hook": "<1-2 sentences>", "escalation_beats": ["<beat 1>", "<beat 2>", "<beat 3>"], "central_tension": "<1 sentence>", "possible_endings": ["<direction 1>", "<direction 2>", "<direction 3>"]}}"""


class GroqError(Exception):
    pass

@retry(
    retry=retry_if_exception_type(GroqError),
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=8),
    reraise=True,
)
def call_groq(messages: list) -> str:
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    body = {
        "model": MODEL_NAME,
        "messages": messages,
        "temperature": 0.85,
        "max_tokens": 500,
        "response_format": {"type": "json_object"},
    }
    try:
        res = requests.post(API_URL, headers=headers, json=body, timeout=30)
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"].strip()
    except requests.exceptions.RequestException as e:
        logger.warning("Groq request failed (will retry): %s", e)
        raise GroqError(str(e))

FALLBACK_CHOICES = [
    "Press on with determination",
    "Pause and think carefully",
    "Try something unexpected",
]

def _extract_choice_text(item) -> str:
    """
    Pull a usable display string out of a choice item, regardless of shape.
    Handles: plain strings, dicts with any key naming convention (text/option/
    label/choice/description/value/...), nested dicts, and lists of strings.
    The goal is to never care what the model decided to call the field —
    just find the longest meaningful string inside it.
    """
    if item is None:
        return ""

    if isinstance(item, str):
        return item.strip()

    if isinstance(item, (int, float, bool)):
        return ""

    if isinstance(item, list):
        candidates = [_extract_choice_text(x) for x in item]
        candidates = [c for c in candidates if c]
        return max(candidates, key=len) if candidates else ""

    if isinstance(item, dict):
        skip_keys = {"key", "id", "index", "value", "icon", "shortcut", "hotkey"}
        candidates = []
        for k, v in item.items():
            if k.lower() in skip_keys:
                continue
            extracted = _extract_choice_text(v)
            if extracted:
                candidates.append(extracted)
        return max(candidates, key=len) if candidates else ""

    return str(item).strip()


def parse_and_validate(raw: str, is_ending: bool) -> dict:
    """Parse JSON response and validate its shape. Raises ValueError on bad output."""
    logger.info("=== RAW LLM RESPONSE ===\n%s\n========================", raw)
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON: {e}")

    story = str(data.get("story", "")).strip()
    if not story:
        raise ValueError("Empty story field")

    leaked_dicts = re.search(r"\{'text':.*\}\s*$", story, re.DOTALL)
    if leaked_dicts:
        logger.warning("Stripping leaked dict-repr text from story field")
        story = story[:leaked_dicts.start()].strip()
    if not story:
        raise ValueError("Story field was empty after stripping leaked choice data")

    if not is_ending:
        choices = data.get("choices", [])
        if not isinstance(choices, list) or len(choices) < 2:
            raise ValueError(f"Expected >=2 choices, got: {choices}")

        normalized = [_extract_choice_text(c) for c in choices]
        normalized = [c for c in normalized if c]

        if len(normalized) < 2:
            raise ValueError(f"Expected >=2 usable choices after normalization, got: {choices}")
        choices = normalized[:3]

        if _choices_too_similar(choices):
            raise ValueError(f"Choices are too similar to each other: {choices}")

        choice_traits = _normalize_traits(data.get("choice_traits", []), len(choices))
    else:
        choices = []
        choice_traits = []

    return {"story": story, "choices": choices, "choice_traits": choice_traits, "is_ending": is_ending}


def _normalize_traits(raw_traits, expected_count: int) -> list:
    """
    Coerce whatever the model returned for choice_traits into a clean list of
    valid trait words, padding/truncating to match the number of choices.
    Never raises — trait tagging is a nice-to-have, not worth failing a turn over.
    """
    if not isinstance(raw_traits, list):
        raw_traits = []

    cleaned = []
    for t in raw_traits:
        text = _extract_choice_text(t).lower().strip()
        match = next((trait for trait in TRAITS if trait.startswith(text[:3]) or text.startswith(trait[:3])), None)
        cleaned.append(match or "wisdom") 

    while len(cleaned) < expected_count:
        cleaned.append(TRAITS[len(cleaned) % len(TRAITS)])

    return cleaned[:expected_count]


_STOPWORDS = {
    "a", "an", "the", "to", "you", "your", "and", "or", "of", "in", "on",
    "with", "for", "it", "this", "that", "into", "at", "as", "is", "be",
}

def _choices_too_similar(choices: list, threshold: float = 0.6) -> bool:
    """
    Rough heuristic: compare word overlap between every pair of choices,
    ignoring stopwords. If any pair shares too many of the same meaningful
    words, the choices are likely paraphrases of the same action rather
    than genuinely different options (e.g. "boldly open the door" vs
    "cautiously open the door" vs "creatively open the door").
    """
    def keywords(text: str) -> set:
        words = re.findall(r"[a-z']+", text.lower())
        return {w for w in words if w not in _STOPWORDS and len(w) > 2}

    keyword_sets = [keywords(c) for c in choices]
    for i in range(len(keyword_sets)):
        for j in range(i + 1, len(keyword_sets)):
            a, b = keyword_sets[i], keyword_sets[j]
            if not a or not b:
                continue
            overlap = len(a & b) / min(len(a), len(b))
            if overlap >= threshold:
                return True
    return False

def call_llm_with_validation(messages: list, is_ending: bool, retries: int = 2) -> dict:
    """Call LLM and validate output, retrying on bad structure."""
    last_err = None
    for attempt in range(retries + 1):
        try:
            raw = call_groq(messages)
            return parse_and_validate(raw, is_ending)
        except ValueError as e:
            last_err = e
            logger.warning("Validation failed (attempt %d/%d): %s", attempt + 1, retries + 1, e)

    logger.error("All validation attempts failed: %s", last_err)
    try:
        data = json.loads(call_groq(messages))
        story = str(data.get("story", "The adventure continues…")).strip()
    except Exception:
        story = "The adventure continues…"
    fallback_traits = _normalize_traits([], len(FALLBACK_CHOICES)) if not is_ending else []
    return {"story": story, "choices": FALLBACK_CHOICES if not is_ending else [], "choice_traits": fallback_traits, "is_ending": is_ending}

PLAN_KEYS = ("hook", "escalation_beats", "central_tension", "possible_endings")
DEFAULT_PLAN = {
    "hook": "Something unusual is stirring in this world, waiting to be discovered.",
    "escalation_beats": ["A challenge tests the hero", "An ally or rival appears", "A hidden truth comes to light"],
    "central_tension": "Whether the hero can rise to meet what this adventure asks of them.",
    "possible_endings": ["A triumphant resolution", "A bittersweet but meaningful close", "A quiet, peaceful ending"],
}

def _validate_plan(data: dict) -> dict:
    """Ensure a plan dict has all required keys in reasonable shape. Raises ValueError if unusable."""
    if not isinstance(data, dict):
        raise ValueError("Plan is not a dict")

    hook = str(data.get("hook", "")).strip()
    tension = str(data.get("central_tension", "")).strip()
    if not hook or not tension:
        raise ValueError("Plan missing hook or central_tension")

    beats = data.get("escalation_beats", [])
    endings = data.get("possible_endings", [])
    if not isinstance(beats, list) or not isinstance(endings, list):
        raise ValueError("Plan beats/endings not lists")

    beats = [_extract_choice_text(b) for b in beats]
    beats = [b for b in beats if b][:4]
    endings = [_extract_choice_text(e) for e in endings]
    endings = [e for e in endings if e][:4]

    if len(beats) < 1 or len(endings) < 1:
        raise ValueError("Plan has no usable beats or endings")

    return {"hook": hook, "escalation_beats": beats, "central_tension": tension, "possible_endings": endings}


def generate_plan(original_setting: str, player_name: str, companion: str) -> dict:
    """Planning agent: sketch a loose narrative arc. Falls back to a generic plan on failure."""
    messages = [{"role": "system", "content": build_planning_prompt(original_setting, player_name, companion)}]
    try:
        raw = call_groq(messages)
        logger.info("=== PLAN GENERATED ===\n%s\n=======================", raw)
        return _validate_plan(json.loads(raw))
    except (GroqError, json.JSONDecodeError, ValueError) as e:
        logger.warning("Plan generation failed, using default plan: %s", e)
        return dict(DEFAULT_PLAN)


def revise_plan_if_needed(session: dict, chosen_option: str) -> dict:
    """Planning-revision agent: check if the plan still fits, lightly revise if not. Never raises."""
    current_plan = session.get("plan") or dict(DEFAULT_PLAN)
    messages = [{"role": "system", "content": build_plan_revision_prompt(
        current_plan, session["original_setting"], session["player_name"], chosen_option, session["choice_count"]
    )}]
    try:
        raw = call_groq(messages)
        logger.info("=== PLAN REVISION CHECK ===\n%s\n============================", raw)
        return _validate_plan(json.loads(raw))
    except (GroqError, json.JSONDecodeError, ValueError) as e:
        logger.warning("Plan revision failed, keeping existing plan: %s", e)
        return current_plan


def build_messages(session: dict, chosen_option: str = None) -> list:
    is_ending = session["choice_count"] >= MAX_SESSION_TURNS
    messages = [{"role": "system", "content": build_system_prompt(
        session["original_setting"], session["player_name"], session["choice_count"],
        session.get("companion", "bunny"), session.get("plan"),
    )}]

    for entry in session["history"][-4:]:
        messages.append({"role": "assistant", "content": json.dumps({"story": entry["story"], "choices": [], "is_ending": False})})
        if entry.get("chosen_option"):
            messages.append({"role": "user", "content": f"Player chose: {entry['chosen_option']}"})

    if chosen_option:
        messages.append({"role": "user", "content": f"Player chose: {chosen_option}. Continue the story."})
    else:
        messages.append({"role": "user", "content": (
            f"Begin a cozy adventure story for {session['player_name']} "
            f"in: {session['original_setting']}. Set the scene warmly and provide three interesting first choices."
        )})

    return messages, is_ending

@app.post("/story/start")
@limiter.limit("10/minute")
async def start_story(req: StartRequest, request: Request):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    session_id = str(uuid.uuid4())

    plan = generate_plan(req.original_setting, req.player_name, req.companion)

    session = {
        "player_name": req.player_name,
        "original_setting": req.original_setting,
        "companion": req.companion,
        "history": [],
        "choice_count": 0,
        "created_at": datetime.utcnow(),
        "plan": plan,
        "trait_tally": {t: 0 for t in TRAITS},
    }

    messages, is_ending = build_messages(session)
    result = call_llm_with_validation(messages, is_ending)

    session["history"].append({
        "story": result["story"],
        "chosen_option": "",
        "offered_choices": result["choices"],
        "offered_traits": result["choice_traits"],
    })
    sessions[session_id] = session

    logger.info("Started session %s for player '%s'", session_id, req.player_name)
    return {
        "story": result["story"],
        "choices": result["choices"],
        "is_ending": result["is_ending"],
        "session_id": session_id,
    }


@app.post("/story/continue")
@limiter.limit("30/minute")
async def continue_story(req: ContinueRequest, request: Request):
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    session = get_session(req.session_id)

    if session["choice_count"] >= MAX_SESSION_TURNS:
        raise HTTPException(status_code=400, detail="Story has already ended.")

    session["choice_count"] += 1

    chosen_trait = None
    if session["history"]:
        last_entry = session["history"][-1]
        last_entry["chosen_option"] = req.chosen_option

        prev_choices = last_entry.get("offered_choices") or []
        prev_traits = last_entry.get("offered_traits") or []
        if req.chosen_option in prev_choices:
            idx = prev_choices.index(req.chosen_option)
        else:
            normalized_target = req.chosen_option.strip().lower()
            normalized_choices = [c.strip().lower() for c in prev_choices]
            idx = normalized_choices.index(normalized_target) if normalized_target in normalized_choices else -1
        if 0 <= idx < len(prev_traits):
            chosen_trait = prev_traits[idx]
        last_entry["chosen_trait"] = chosen_trait

        if chosen_trait and chosen_trait in session["trait_tally"]:
            session["trait_tally"][chosen_trait] += 1

    is_phase_transition = session["choice_count"] in (4, 8, 11)
    if is_phase_transition:
        session["plan"] = revise_plan_if_needed(session, req.chosen_option)

    messages, is_ending = build_messages(session, req.chosen_option)
    result = call_llm_with_validation(messages, is_ending)

    session["history"].append({
        "story": result["story"],
        "chosen_option": "",
        "offered_choices": result["choices"],
        "offered_traits": result["choice_traits"],
    })
    logger.info("Session %s turn %d — is_ending=%s, chosen_trait=%s",
                req.session_id, session["choice_count"], is_ending, chosen_trait)

    return {
        "story": result["story"],
        "choices": result["choices"],
        "is_ending": result["is_ending"],
        "session_id": req.session_id,
    }


@app.post("/story/summary")
@limiter.limit("10/minute")
async def story_summary(req: SummaryRequest, request: Request):
    """Generate a shareable summary of the full adventure."""
    if not API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")

    session = get_session(req.session_id)
    history = session["history"]

    if len(history) < 2:
        raise HTTPException(status_code=400, detail="Story too short to summarize.")

    choices_made = [
        entry["chosen_option"]
        for entry in history
        if entry.get("chosen_option")
    ]
    timeline = "\n".join(f"{i+1}. {c}" for i, c in enumerate(choices_made))

    trait_tally = session.get("trait_tally", {})
    ranked_traits = sorted(
        ((t, c) for t, c in trait_tally.items() if c > 0),
        key=lambda x: x[1], reverse=True
    )
    trait_summary = ", ".join(f"{t} ({c}x)" for t, c in ranked_traits) or "a balanced mix of approaches"
    dominant_trait = ranked_traits[0][0] if ranked_traits else None

    plan = session.get("plan") or {}
    plan_context = (
        f"The adventure was originally built around this hook: {plan.get('hook', '')}\n"
        f"Central tension: {plan.get('central_tension', '')}\n"
    ) if plan else ""

    messages = [
        {"role": "system", "content": (
            "You write warm, evocative adventure briefs — not a dry list of events, but a short narrative "
            "reflection on the journey and what it revealed about the hero's character. 3-4 sentences. "
            "Respond with ONLY valid JSON: "
            '{"title": "<a short evocative title>", "summary": "<3-4 sentence brief of the adventure>", '
            '"emoji": "<1-2 fitting emojis>", "trait_note": "<1 sentence about what the hero\'s choices revealed about their dominant trait, if any>"}'
        )},
        {"role": "user", "content": (
            f"Write a brief of this adventure:\n"
            f"Hero: {session['player_name']}\n"
            f"Companion: a {session.get('companion', 'bunny')}\n"
            f"World: {session['original_setting']}\n"
            f"{plan_context}"
            f"Choices made, in order:\n{timeline}\n"
            f"Trait tally across the journey: {trait_summary}\n"
            f"Dominant trait: {dominant_trait or 'none particularly dominant'}"
        )},
    ]

    raw = call_groq(messages)
    logger.info("Summary raw response: %s", raw)

    try:
        data = json.loads(raw)
        return {
            "title":      str(data.get("title",      "A Grand Adventure")).strip(),
            "summary":    str(data.get("summary",     "A tale well told.")).strip(),
            "emoji":      str(data.get("emoji",       "✨")).strip(),
            "trait_note": str(data.get("trait_note",  "")).strip(),
            "trait_tally": trait_tally,
            "dominant_trait": dominant_trait,
            "player_name": session["player_name"],
            "turns": session["choice_count"],
        }
    except (json.JSONDecodeError, KeyError) as e:
        logger.error("Summary parse error: %s", e)
        raise HTTPException(status_code=502, detail="Could not generate summary. Please try again.")


@app.get("/health")
async def health():
    return {"status": "ok", "active_sessions": len(sessions)}