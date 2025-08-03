const TextPro = require("@sl-code-lords/text-pro-me");

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Only GET requests are allowed." });
    }

    const { url, text } = req.query;

    // Validate query
    if (!url || !text) {
      return res.status(400).json({
        error:
          "Missing required query parameters. Usage: /api/textpro?url=https://textpro.me/create-glitch-text-effect-online-1026.html&text=YourText",
      });
    }

    const tp = new TextPro();
    let result;

    // Handle both single and double text effects
    if (Array.isArray(text)) {
      if (text.length < 2) {
        return res.status(400).json({
          error:
            "Double-text effect requires two text values. Use ?text=One&text=Two",
        });
      }
      result = await tp.double_text_create(url, text[0], text[1]);
    } else {
      result = await tp.one_text_create(url, text);
    }

    // Return result
    return res.status(200).json({
      status: true,
      title: result.file_name,
      path: url,
      result: result.url,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      error: error.message || "Unexpected server error",
    });
  }
};
