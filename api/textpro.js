const fetch = require("node-fetch");
const cheerio = require("cheerio");
const cookie = require("cookie");
const FormData = require("form-data");

function encodeForm(formdata = {}) {
  const encode = encodeURIComponent;
  return Object.keys(formdata)
    .map((key) => {
      let vals = formdata[key];
      const isArray = Array.isArray(vals);
      const keys = encode(key + (isArray ? "[]" : ""));
      if (!isArray) vals = [vals];
      return vals.map(v => keys + "=" + encode(v)).join("&");
    })
    .join("&");
}

async function post(url, formdata = {}, cookies) {
  return await fetch(`${url}?${encodeForm(formdata)}`, {
    method: "GET",
    headers: {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "GoogleBot",
      Cookie: cookies,
    },
  });
}

async function generateTextPro(url, text) {
  if (!/^https:\/\/textpro\.me\/.+\.html$/.test(url)) {
    throw new Error("Please provide a valid TextPro .html URL");
  }

  const pageRes = await fetch(url, {
    headers: { "User-Agent": "GoogleBot" },
  });
  const html = await pageRes.text();

  let cookiesRaw = pageRes.headers.get("set-cookie") || "";
  const cookiesObj = cookiesRaw
    .split(",")
    .map((s) => cookie.parse(s))
    .reduce((a, c) => ({ ...a, ...c }), {});
  const cookies = Object.entries({
    __cfduid: cookiesObj.__cfduid || "",
    PHPSESSID: cookiesObj.PHPSESSID || "",
  })
    .map(([n, v]) => cookie.serialize(n, v))
    .join("; ");

  const $ = cheerio.load(html);
  const token = $('input[name="token"]').attr("value");
  if (!token) throw new Error("Cannot find token on TextPro page");

  const form = new FormData();
  const arr = Array.isArray(text) ? text : [text];
  arr.forEach((t) => form.append("text[]", t));
  form.append("token", token);
  form.append("submit", "Go");
  form.append("build_server", "https://textpro.me");
  form.append("build_server_id", 1);

  const resultPageRes = await fetch(url, {
    method: "POST",
    headers: {
      "User-Agent": "GoogleBot",
      Cookie: cookies,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  });
  const resultPage = await resultPageRes.text();

  const match = /<div.*?id="form_value".*?>(.*?)<\/div>/.exec(resultPage);
  if (!match) {
    return { status: false, error: "Token not acceptable or form failed" };
  }
  const formData = JSON.parse(match[1]);

  const createRes = await post(
    "https://textpro.me/effect/create-image",
    formData,
    cookies
  );
  const createJson = await createRes.json();

  return {
    title: url
      .toLowerCase()
      .replace(/\b[a-z]/g, (c) => c.toUpperCase())
      .split(/textpro.me/i)[1]
      .split(/-[0-9]/i)[0]
      .slice(1)
      .split("-")
      .join(" "),
    path: url,
    result: `https://textpro.me${createJson.fullsize_image}`,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });
  const { url, text } = req.query;
  if (!url || !text) return res.status(400).json({ error: "Missing url or text" });

  try {
    const payload = await generateTextPro(url, text);
    res.status(200).json(payload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
