require("dotenv").config();
const fs = require("fs");
const express = require("express");
const axios = require("axios");
const app = express();
const port = 3000;
app.get("/", async (req, res) => {
  const code = req.query.code;
  try {
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: process.env.REDIRECT_URI,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
        ).toString("base64")}`,
      },
    });
    res.send(response.data.access_token);
  } catch (error) {
    console.error("Error", error);
    res.send("Error");
  }
});

app.get("/auth/zoom", (req, res) => {
  const clientId = process.env.ZOOM_API_KEY;
  const redirect_uri = encodeURIComponent(process.env.REDIRECT_URI);
  const responseType = "code";
  const authorizationUrl = `https://zoom.us/oauth/authorize?response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirect_uri}`;
  res.redirect(authorizationUrl);
});

app.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send("No code provided");
  }
  try {
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.REDIRECT_URI,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    res.redirect(
      `http://localhost:3000/refreshToken?refreshToken=${response.data.refresh_token}`
    );
  } catch (error) {
    console.error("Error:", error);
    res.send("Error obtaining token");
  }
});
app.get("/refreshToken", async (req, res) => {
  try {
    const refresh_token = req.query.refreshToken;
    const response = await axios.post("https://zoom.us/oauth/token", null, {
      params: {
        grant_type: "refresh_token",
        refresh_token,
      },
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.ZOOM_API_KEY}:${process.env.ZOOM_API_SECRET}`
        ).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    let accessToken = fs.writeFileSync("data.txt", response.data.access_token);
    res.redirect("http://localhost:3000/createMeetingAPI");
  } catch (error) {
    console.error("Error", error);
    res.send("Error refreshing token");
  }
});
app.get("/createMeetingAPI", async (req, res) => {
  const token = fs.readFileSync("data.txt", "utf8");
  async function getMeetings() {
    try {
      const response = await axios.get(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = response.data;
      return data;
    } catch (error) {
      console.error("Error", error);
    }
  }
  
  async function createMeeting(
    topic,
    start_time,
    type,
    duration,
    timezone,
    agenda
  ) {
    try {
      const response = await axios.post(
        "https://api.zoom.us/v2/users/me/meetings",
        {
          topic,
          type,
          start_time,
          duration,
          timezone,
          agenda,
          settings: {
            host_video: true,
            participant_video: true,
            join_before_host: false,
            mute_upon_entry: true,
            watermark: false,
            use_pmi: false,
            approval_type: 0,
            audio: "both",
            auto_recording: "none",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const body = response.data;
      return body;
    } catch (error) {
      console.error("Error", error);
    }
  }

  //console.log(

  const meet = await createMeeting(
    "YAZAN IS KING NOW2 new meeting",
    "2024-3-14T11:00:00",
    2,
    45,
    "GMT+3",
    "Team meeting for future videos"
  );
  res.send(meet);

  //);
  //console.log(await getMeetings());
});
app.listen(port, () => {
  console.log("Server running");
});
