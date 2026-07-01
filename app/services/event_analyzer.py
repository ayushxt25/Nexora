"""
Event Analyzer Service
-----------------------
Responsible for extracting themes from a free-text event description.

We use Hugging Face's zero-shot-classification pipeline with DistilBERT.
Zero-shot classification lets us score a description against ANY list of
candidate labels without needing to train or fine-tune a model on those
specific categories first. That's important here because we can't know in
advance every possible type of networking event a user might describe.

The pipeline is instantiated once, at import time, rather than inside the
function. Loading a transformer model is relatively slow (on the order of
seconds), so doing it once at startup means every subsequent API request
is fast -- the cost is paid once when the server starts, not on every call.
"""

import logging
from pathlib import Path
from typing import List, Optional

logger = logging.getLogger(__name__)

_classifier = None
_classifier_load_attempted = False

DEFAULT_THEMES = [
    "artificial intelligence",
    "healthcare",
    "blockchain",
    "education",
    "sustainability",
    "finance",
    "climate change",
    "urban planning",
    "entrepreneurship",
    "cybersecurity",
]


def _has_local_model_cache(model_name: str) -> bool:
    cache_dir = Path.home() / ".cache" / "huggingface" / "hub"
    model_dir = cache_dir / f"models--{model_name.replace('/', '--')}"
    snapshots_dir = model_dir / "snapshots"
    return snapshots_dir.exists() and any(snapshots_dir.iterdir())


def _get_classifier():
    global _classifier, _classifier_load_attempted

    if _classifier is not None:
        return _classifier

    if _classifier_load_attempted:
        return None

    _classifier_load_attempted = True

    if not _has_local_model_cache("typeform/distilbert-base-uncased-mnli"):
        logger.info("Transformer model cache not found; using fallback theme extraction.")
        return None

    try:
        from transformers import pipeline

        _classifier = pipeline(
            "zero-shot-classification",
            model="typeform/distilbert-base-uncased-mnli",
        )
    except Exception as exc:
        logger.warning("Falling back to keyword-based theme extraction: %s", exc)
        _classifier = None

    return _classifier


def _extract_event_themes_fallback(description: str, labels: List[str]) -> List[str]:
    description_lower = description.lower()
    scored_labels = []

    for label in labels:
        label_lower = label.lower()
        score = 0

        for token in label_lower.replace("-", " ").split():
            if token and token in description_lower:
                score += 1

        scored_labels.append((score, label))

    scored_labels.sort(key=lambda item: (-item[0], labels.index(item[1])))

    matched = [label for score, label in scored_labels if score > 0]
    if matched:
        return matched[:3]

    return labels[:3]


def extract_event_themes(
    description: str,
    candidate_labels: Optional[List[str]] = None,
) -> List[str]:
    """
    Extract the top themes from an event description.

    Args:
        description: Free-text description of the networking event.
        candidate_labels: Optional custom list of labels to classify against.
            Defaults to DEFAULT_THEMES if not provided.

    Returns:
        A list of up to 3 theme strings, ordered from most to least relevant.
    """
    labels = candidate_labels if candidate_labels else DEFAULT_THEMES

    if not description or not description.strip():
        return []

    classifier = _get_classifier()
    if classifier is None:
        return _extract_event_themes_fallback(description, labels)

    result = classifier(description, candidate_labels=labels, multi_label=True)

    # result["labels"] is already sorted by descending score by the pipeline.
    top_themes = result["labels"][:3]
    return top_themes
