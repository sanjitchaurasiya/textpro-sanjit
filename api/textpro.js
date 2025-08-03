const fetch = require("node-fetch");
const cheerio = require("cheerio");
const cookie = require("cookie");
const FormData = require("form-data");

function encodeForm(formdata = {}) {
  let encode = encodeURIComponent;
  return Object.keys(formdata)
    .map((key) => {
      let vals = formdata[key];
      let isArray = Array.isArray(vals);
      let keys = encode(key + (isArray ? "[]" : ""));
      if (!isArray) vals = [vals];
      return vals.map(valq => keys + "=" + encode(valq)).join("&");
    })
    .join("&");
}

async function post(url, formdata = {}, cookies) {
  const body = encodeForm(formdata);
  return await fetch(`${url}?${body}`, {
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
    throw new Error("Enter a valid TextPro URL ending in .html");
  }

  const pageRes = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "GoogleBot" },
  });

  const html = await pageRes.text();
  let cookies = pageRes.headers.get("set-cookie")
    ?.split(",")
    .map((v) => cookie.parse(v))
    .reduce((a, c) => ({ ...a, ...c }), {});

  cookies = Object.entries({
    __cfduid: cookies?.__cfduid || "",
    PHPSESSID: cookies?.PHPSESSID || "",
  }).map(([name, value]) => cookie.serialize(name, value)).join("; ");

  const $ = cheerio.load(html);
  const token = $('input[name="token"]').attr("value");

  const form = new FormData();
  const texts = Array.isArray(text) ? text : [text];
  texts.forEach((t) => form.append("text[]", t));
  form.append("submit", "Go");
  form.append("token", token);
  form.append("build_server", "https://textpro.me");
  form.append("build_server_id", 1);

  const postRes = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "User-Agent": "GoogleBot",
      Cookie: cookies,
      ...form.getHeaders(),
    },
    body: form.getBuffer(),
  });

  const resultPage = await postRes.text();
  const tokenMatch = /<div.*?id="form_value".+?>(.*?)<\/div>/.exec(resultPage);
  if (!tokenMatch) {
    return { status: false, error: "Error! This token is not acceptable!" };
  }

  const imageRes = await post(
    "https://textpro.me/effect/create-image",
    JSON.parse(tokenMatch[1]),
    cookies
  );
  const imageData = await imageRes.json();

  let title = url
    .toLowerCase()
    .replace(/\b[a-z]/g, (l) => l.toUpperCase())
    .split(/https:\/\/textpro.me/i)[1]
    .split(/-[0-9]/i)[0]
    .slice(1)
    .split("-")
    .join(" ");

  return {
    title,
    path: url,
    result: `https://textpro.me${imageData.fullsize_image}`,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Only GET requests are allowed." });
  }

  const { url, text } = req.query;
  if (!url || !text) {
    return res.status(400).json({ error: "Missing 'url' or 'text' query parameters." });
  }

  try {
    const result = await generateTextPro(url, text);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
