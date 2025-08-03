const TextPro = require("@sl-code-lords/text-pro-me");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET allowed" });
  }

  const { url, text } = req.query;
  if (!url || !text) {
    return res.status(400).json({
      error: "Provide url and text. Example: ?url=https://textpro.me/...&text=Hello"
    });
  }

  try {
    const tp = new TextPro();
    let result;

    if (Array.isArray(text)) {
      if (text.length < 2) {
        return res.status(400).json({
          error: "Double-text requires two text values: &text=One&text=Two"
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
      result: result.url
    });
  } catch (err) {
    console.error("Function crashed:", err);
    return res.status(500).json({
      status: false,
      error: err.message || "Internal server error"
    });
  }
};
