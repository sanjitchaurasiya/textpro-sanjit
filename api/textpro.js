const TextPro = require("@sl-code-lords/text-pro-me");

module.exports = async (req, res) => {
  try {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Only GET requests are allowed." });
    }

    const { url, text } = req.query;

    if (!url || !text) {
      return res.status(400).json({
        error: "Missing 'url' or 'text' query. Example: /api/textpro?url=https://textpro.me/create-glitch-text-effect-online-1026.html&text=Hello",
      });
    }

    const tp = new TextPro();
    let result;

    if (Array.isArray(text)) {
      if (text.length < 2) {
        return res.status(400).json({
          error: "Double-text effects need two text parameters. Use ?text=One&text=Two",
        });
      }
      result = await tp.double_text_create(url, text[0], text[1]);
    } else {
      result = await tp.one_text_create(url, text);
    }

    return res.status(200).json({
      status: true,
      title: result.file_name,
      path: url,
      result: result.url,
    });
  } catch (err) {
    console.error("Function error:", err);
    return res.status(500).json({
      status: false,
      error: err.message || "Unexpected server error",
    });
  }
};
