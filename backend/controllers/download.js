const path = require("path");
const os = require("os");   
const { spawn } = require("child_process");

const downloadFromYoutube = async (req, res) => {
    const { videoId , title } = req.query;

    if(!videoId|| !/^[a-zA-Z0-9_-]{11}$/.test(videoId)){
        return res.status(400).json({error:"video Id is required"});
    }

    const safeTitle = (title|| videoId ).replace(/[^a-zA-Z0-9\s-]/g, "").replace(/\s+/g, " ");
    const downloadFolder = path.join(os.homedir(), "Downloads");
    const outputPath = path.join(downloadFolder, `${safeTitle}.mp3`);
    
    console.log("downloading to", outputPath);


    const YTDLprocess = spawn("yt-dlp", [
        "-x",
        "--audio-format",
        "mp3",
        "-o",
        outputPath,
        "--ffmpeg-location",
        "/opt/homebrew/bin/ffmpeg",
        `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    

    YTDLprocess.stderr.on("data", (data) => {
        console.error("yt-dlp error:", data.toString());
    });


    
    YTDLprocess.on("close", (code) => {
        if (code === 0) {
            console.log("Download completed", outputPath);
        } else {
            res.status(500).json({ error: "Download failed" });
        }
    });
};

module.exports = {downloadFromYoutube};