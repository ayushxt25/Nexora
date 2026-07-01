"""
Tests for app.services.topic_generator.

Like the event analyzer tests, these validate structure (is the output a
list of non-empty strings, of reasonable length?) rather than exact
content, since GPT-2's raw generated text is not perfectly deterministic-
content across environments even with a fixed seed (hardware/library
version differences can shift floating point results slightly).
"""

from app.services.topic_generator import generate_topics


def test_returns_a_list():
    result = generate_topics(["AI", "sustainability"], ["climate change"])
    assert isinstance(result, list)


def test_returns_at_most_three_suggestions():
    result = generate_topics(["AI", "sustainability"], ["climate change"])
    assert len(result) <= 3


def test_suggestions_are_non_empty_strings():
    result = generate_topics(["AI", "sustainability"], ["climate change"])
    for suggestion in result:
        assert isinstance(suggestion, str)
        assert suggestion.strip() != ""


def test_handles_empty_themes_and_interests_gracefully():
    # Should not raise, even with no themes/interests supplied.
    result = generate_topics([], [])
    assert isinstance(result, list)
