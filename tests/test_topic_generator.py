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


def test_generate_topics_uses_max_new_tokens(monkeypatch):
    captured = {}

    def fake_generator(prompt, **kwargs):
        captured["kwargs"] = kwargs
        return [{"generated_text": f"{prompt}\n1. Ask about their current priorities"}]

    monkeypatch.setattr("app.services.topic_generator._get_generator", lambda: fake_generator)

    result = generate_topics(["AI"], ["robotics"])

    assert result
    assert "max_new_tokens" in captured["kwargs"]
    assert captured["kwargs"]["max_new_tokens"] == 80
    assert "max_length" not in captured["kwargs"]


def test_generate_topics_falls_back_on_exact_max_length_value_error(monkeypatch):
    def fake_generator(prompt, **kwargs):
        raise ValueError("Input length of input_ids is 80, but `max_length` is set to 80.")

    monkeypatch.setattr("app.services.topic_generator._get_generator", lambda: fake_generator)

    result = generate_topics(["AI"], ["robotics"])

    assert isinstance(result, list)
    assert len(result) == 3
    assert all(isinstance(item, str) and item.strip() for item in result)
