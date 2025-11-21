import OpenAI from "openai";

function promptForKind(kind) {
  if (kind === "deep") {
    return `You are The Oracle of 11Eleven.

Write ONE sentence that feels like a deeper emotional realization.
Be clear, grounded, and human. Avoid mystical language or clichés.
Tone: bold, honest, specific. Output exactly one sentence.`;
  }

  if (kind === "1111") {
    return `You are The Oracle of 11Eleven.

Write ONE sentence as a timely 11:11 insight with a sense of clarity and alignment.
Stay grounded, human, and avoid mystical clichés.
Keep it concise and emotionally honest. One sentence only.`;
  }

  // Default: early access
  return `You are The Oracle of 11Eleven.

Write ONE sentence that gives an early, clear insight.
Be warm, grounded, and avoid mystical clichés.
Keep it concise and human. One sentence only.`;
}

export async function generateProphecyCard(kind = "early") {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      prophecyText: "Missing API key.",
      imageUrl: null,
      cardUrl: null,
    };
  }

  const openai = new OpenAI({ apiKey });
  const prompt = promptForKind(kind);

  try {
    const completion = await openai.responses.create({
      model: "gpt-5.1",
      input: prompt,
    });

    const prophecyText =
      completion.output_text?.trim() ||
      completion.response_text?.trim() ||
      completion?.data?.[0]?.text?.trim() ||
      "The signal wavered—try again.";

    return {
      prophecyText,
      imageUrl: null,
      cardUrl: null,
    };
  } catch (err) {
    console.error("Creator prophecy error:", err);
    return {
      prophecyText: "The message blurred… try again.",
      imageUrl: null,
      cardUrl: null,
    };
  }
}
